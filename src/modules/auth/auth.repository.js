export function createAuthRepository(prisma) {
  return {
    createSession({ userId, tokenHash, expiresAt, ip, userAgent, organizationId = null }) {
      return prisma.auth_session.create({
        data: {
          user_id: userId,
          organization_id: organizationId === null ? null : BigInt(organizationId),
          refresh_token_hash: tokenHash,
          expires_at: expiresAt,
          ip_address: ip || null,
          user_agent: userAgent ? userAgent.slice(0, 400) : null,
        },
        select: { session_id: true },
      });
    },

    findSessionByHash(tokenHash) {
      return prisma.auth_session.findUnique({
        where: { refresh_token_hash: tokenHash },
        select: {
          session_id: true,
          expires_at: true,
          revoked_at: true,
          organization_id: true,
          app_user: { select: { public_id: true } },
        },
      });
    },

    /** The organization this sign-in works in (NULL = all, super admin only). */
    setSessionOrganization(sessionId, organizationId) {
      return prisma.auth_session.update({
        where: { session_id: sessionId },
        data: { organization_id: organizationId === null ? null : BigInt(organizationId) },
      });
    },

    /**
     * Revokes the session once. Returns `{ count }`: 0 means another request already used this
     * refresh token, which is how concurrent rotation is detected.
     */
    revokeSession(sessionId) {
      return prisma.auth_session.updateMany({
        where: { session_id: sessionId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    },
  };
}
