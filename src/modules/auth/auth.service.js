import { env } from '../../config/env.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { isSuperAdmin } from '../../utils/roles.js';
import { verifyPassword } from '../../utils/password.js';
import { addDays, addMinutes, generateRefreshToken, hashToken } from '../../utils/tokens.js';
import { organizationIdsOf, toUserDto } from '../user/user.service.js';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const INVALID_CREDENTIALS = 'Invalid user name or password';

export function createAuthService({ userRepository, authRepository, signAccessToken }) {
  function assertCanSignIn(account) {
    if (account.can_login === false) {
      throw new ForbiddenError(
        'Login is restricted for this account. Please contact your administrator.',
      );
    }
    if (account.can_sign_in === false) {
      throw new ForbiddenError(
        'This person has no login account. Please contact your administrator.',
      );
    }
    if (account.locked_until && account.locked_until > new Date()) {
      throw new ForbiddenError(
        'Too many wrong passwords. This account is locked for 15 minutes, please try again later.',
      );
    }
  }

  async function registerFailure(account) {
    const failedCount = account.failed_login_count + 1;
    const lockedUntil =
      failedCount >= MAX_FAILED_LOGINS ? addMinutes(new Date(), LOCK_MINUTES) : null;
    await userRepository.recordLoginFailure(account.user_id, { failedCount, lockedUntil });
  }

  const superAdmin = (account) => isSuperAdmin({ role: account.role.role_code });

  /** The token for the account working in `organizationId` (null = all, super admin only). */
  function tokenFor(account, organizationId) {
    const accessToken = signAccessToken({
      sub: account.public_id,
      uid: account.user_id.toString(),
      role: account.role.role_code,
      org: organizationId === null ? null : String(organizationId),
      orgs: organizationIdsOf(account).map(String),
      code: account.username,
    });
    // The signed-in person sees the organization they are working in as their organization.
    return { accessToken, user: { ...toUserDto(account), organizationId } };
  }

  /** Where a sign-in starts: the person's home organization; a super admin the head office. */
  async function startOrganization(account) {
    if (superAdmin(account)) {
      const headOfficeId = await userRepository.findHeadOfficeId();
      return headOfficeId === null ? null : Number(headOfficeId);
    }
    return organizationIdsOf(account)[0] ?? null;
  }

  /** May the account work in this organization? A super admin: any, or all (null). */
  async function mayUse(account, organizationId) {
    if (superAdmin(account)) {
      return (
        organizationId === null || (await userRepository.countOrganizations([organizationId])) === 1
      );
    }
    return organizationId !== null && organizationIdsOf(account).includes(organizationId);
  }

  async function openSession(account, context, organizationId) {
    const refreshToken = generateRefreshToken();
    await authRepository.createSession({
      userId: account.user_id,
      tokenHash: hashToken(refreshToken),
      expiresAt: addDays(new Date(), env.refreshTokenTtlDays),
      ip: context.ip,
      userAgent: context.userAgent,
      organizationId,
    });
    return { refreshToken, ...tokenFor(account, organizationId) };
  }

  return {
    async login({ username, password }, context) {
      const account = await userRepository.findAuthByUsername(username.trim());
      // Same message for unknown code and wrong password, so accounts cannot be enumerated.
      if (!account || account.deleted_at) throw new UnauthorizedError(INVALID_CREDENTIALS);

      if (!(await verifyPassword(password, account.password_hash))) {
        await registerFailure(account);
        throw new UnauthorizedError(INVALID_CREDENTIALS);
      }
      // Only reveal that the account is inactive/locked once the correct password proved ownership.
      assertCanSignIn(account);
      await userRepository.recordLoginSuccess(account.user_id, context.ip);
      return openSession(account, context, await startOrganization(account));
    },

    /** Rotation: every refresh revokes the presented token and issues a new one. */
    async refresh(refreshToken, context) {
      if (!refreshToken) throw new UnauthorizedError('Session expired, please sign in again');
      const session = await authRepository.findSessionByHash(hashToken(refreshToken));
      const usable = session && !session.revoked_at && session.expires_at > new Date();
      if (!usable) throw new UnauthorizedError('Session expired, please sign in again');

      const account = await userRepository.findAuthById(session.app_user.public_id);
      if (!account) throw new UnauthorizedError('Session expired, please sign in again');
      assertCanSignIn(account);

      // Only the request that wins this conditional update may rotate; a replayed token gets 401.
      const { count } = await authRepository.revokeSession(session.session_id);
      if (count === 0) throw new UnauthorizedError('Session expired, please sign in again');
      // Keep working in the same organization, unless the person lost access to it.
      const kept =
        session.organization_id === null || session.organization_id === undefined
          ? null
          : Number(session.organization_id);
      const organizationId = (await mayUse(account, kept))
        ? kept
        : await startOrganization(account);
      return openSession(account, context, organizationId);
    },

    /** Works in another organization for the rest of this sign-in; returns a fresh token. */
    async switchOrganization(actor, organizationId, refreshToken) {
      const account = await userRepository.findAuthById(actor.sub);
      if (!account) throw new UnauthorizedError('Session expired, please sign in again');
      if (!(await mayUse(account, organizationId))) {
        if (superAdmin(account)) throw new NotFoundError('Organization not found');
        throw new ForbiddenError('You do not belong to that organization');
      }
      // Remembered on the sign-in session so a token refresh keeps it.
      const session = refreshToken
        ? await authRepository.findSessionByHash(hashToken(refreshToken))
        : null;
      if (session && !session.revoked_at) {
        await authRepository.setSessionOrganization(session.session_id, organizationId);
      }
      return tokenFor(account, organizationId);
    },

    async logout(refreshToken) {
      if (!refreshToken) return;
      const session = await authRepository.findSessionByHash(hashToken(refreshToken));
      if (session) await authRepository.revokeSession(session.session_id);
    },
  };
}
