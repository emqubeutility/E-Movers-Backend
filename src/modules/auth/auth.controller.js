import { env } from '../../config/env.js';
import { success } from '../../utils/response.js';

export const REFRESH_COOKIE = 'refresh_token';
const COOKIE_PATH = '/api/v1/auth';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? 'none' : 'lax',
    path: COOKIE_PATH,
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60,
  };
}

function contextOf(request) {
  return { ip: request.ip, userAgent: request.headers['user-agent'] };
}

/** The refresh token only ever travels in an httpOnly cookie, never in the JSON body. */
function sendSession(reply, session, message, statusCode = 200) {
  reply.setCookie(REFRESH_COOKIE, session.refreshToken, cookieOptions());
  return reply
    .status(statusCode)
    .send(success({ accessToken: session.accessToken, user: session.user }, message));
}

export function createAuthController(authService) {
  return {
    async login(request, reply) {
      const session = await authService.login(request.body, contextOf(request));
      return sendSession(reply, session, 'Signed in');
    },

    async switchOrganization(request) {
      const session = await authService.switchOrganization(
        request.user,
        request.body.organizationId,
        request.cookies[REFRESH_COOKIE],
      );
      return success(
        { accessToken: session.accessToken, user: session.user },
        'Organization switched',
      );
    },

    async refresh(request, reply) {
      const session = await authService.refresh(
        request.cookies[REFRESH_COOKIE],
        contextOf(request),
      );
      return sendSession(reply, session, 'Token refreshed');
    },

    async logout(request, reply) {
      await authService.logout(request.cookies[REFRESH_COOKIE]);
      reply.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
      return success(null, 'Signed out');
    },
  };
}
