import crypto from 'crypto';

let secret = process.env.JWT_SECRET;
if (!secret) {
  if (process.env.NODE_ENV === 'production') {
    secret = crypto.randomBytes(32).toString('hex');
    console.warn('[Security Warning] JWT_SECRET environment variable is not configured in production! Generated secure ephemeral runtime secret.');
  } else {
    secret = 'supersecret2026_dev_only';
  }
}

export const JWT_SECRET = secret;
export const ADMIN_KEY = process.env.ADMIN_KEY || '';
