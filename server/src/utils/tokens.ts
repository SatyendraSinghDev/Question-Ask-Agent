import { randomBytes } from 'crypto';

/** Random opaque token used for email verification & password reset. */
export function issueOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** Normalise email to lowercase & trim. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
