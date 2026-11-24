import { createHash, randomBytes } from 'node:crypto';

export function generateRefreshToken() {
  return randomBytes(48).toString('base64url');
}

/** Only the hash is stored, so a database leak does not expose usable tokens. */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}
