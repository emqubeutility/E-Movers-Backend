import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const PASSWORD_PATTERN = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,72}$';
export const PASSWORD_HINT =
  'Password must be 8-72 characters and include an uppercase letter, a lowercase letter, a number and a symbol';

export function hashPassword(plain) {
  return bcrypt.hash(plain, env.bcryptRounds);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
