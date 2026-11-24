import { UnauthorizedError } from '../utils/errors.js';

/** preHandler: requires a valid access token and exposes its claims as request.user. */
export async function authenticate(request) {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}
