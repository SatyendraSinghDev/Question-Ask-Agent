import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { signTokens, verifyRefreshToken } from '../utils/jwt.js';
import { issueOpaqueToken, normalizeEmail } from '../utils/tokens.js';
import { env } from '../config/env.js';
import { sendActionEmail } from './emailService.js';
import { UserRole } from '../types/enums.js';
import type { AuthTokens } from '../types/index.js';

const VERIFICATION_TTL_MIN = 24 * 60;
const RESET_TTL_MIN = 30;

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  phone?: string;
}

export async function register(input: RegisterInput): Promise<{
  user: { id: string; name: string; email: string; role: UserRole };
  verifyUrl: string;
}> {
  const email = normalizeEmail(input.email);
  const existing = await User.findOne({ email }).lean();
  if (existing) throw ApiError.conflict('An account with this email already exists');

  // Only existing admins can mint staff accounts; public registration = students.
  const role = input.role && input.role !== UserRole.STUDENT ? UserRole.STUDENT : UserRole.STUDENT;

  const token = issueOpaqueToken();
  const user = await User.create({
    name: input.name,
    email,
    password: input.password,
    role,
    phone: input.phone,
    isEmailVerified: false,
    emailVerificationToken: token,
    emailVerificationExpires: new Date(Date.now() + VERIFICATION_TTL_MIN * 60 * 1000),
  });

  const verifyUrl = `${env.appUrl}/auth/verify-email?token=${token}`;
  await sendActionEmail({
    to: email,
    name: user.name,
    action: 'verify-email',
    url: verifyUrl,
  }).catch(() => undefined); // never fail registration on email error

  return { user: { id: String(user._id), name: user.name, email: user.email, role: user.role }, verifyUrl };
}

export async function login(email: string, password: string): Promise<{
  user: Record<string, unknown>;
  tokens: AuthTokens & { tokenId: string };
}> {
  const user = await User.findOne({ email: normalizeEmail(email) }).select('+password +refreshTokens');
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid email or password');

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  user.lastLoginAt = new Date();
  const tokens = signTokens({ id: String(user._id), role: user.role, email: user.email });
  user.registerRefreshToken(tokens.tokenId, expiryToDate(env.jwt.refreshExpiresIn));
  await user.save();

  const { password: _pw, ...safe } = user.toJSON();
  return { user: safe, tokens };
}

export async function refreshSession(refreshToken: string): Promise<AuthTokens> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }
  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user) throw ApiError.unauthorized('Invalid refresh token');
  if (!user.isRefreshTokenValid(payload.tokenId)) {
    // Possible token reuse — revoke entire family
    user.refreshTokens = [] as never;
    await user.save();
    throw ApiError.unauthorized('Refresh token revoked');
  }

  // Rotate: revoke old, issue new
  user.revokeRefreshToken(payload.tokenId);
  const access = signTokens({ id: String(user._id), role: user.role, email: user.email });
  user.registerRefreshToken(access.tokenId, expiryToDate(env.jwt.refreshExpiresIn));
  await user.save();
  return { accessToken: access.accessToken, refreshToken: access.refreshToken };
}

export async function logout(userId: string, refreshToken?: string): Promise<void> {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      user.revokeRefreshToken(payload.tokenId);
    } catch {
      /* ignore */
    }
  } else {
    user.refreshTokens = [] as never;
  }
  await user.save();
}

export async function requestPasswordReset(email: string): Promise<{ sent: boolean }> {
  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user) return { sent: true }; // do not leak existence

  const token = issueOpaqueToken();
  user.passwordResetToken = token;
  user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000);
  await user.save();

  const url = `${env.appUrl}/auth/reset-password?token=${token}`;
  await sendActionEmail({ to: user.email, name: user.name, action: 'reset-password', url }).catch(() => undefined);
  return { sent: true };
}

export async function resetPassword(token: string, newPassword: string): Promise<{ ok: true }> {
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  }).select('+password +passwordResetToken +passwordResetExpires');
  if (!user) throw ApiError.badRequest('Reset token is invalid or expired');

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = [] as never; // force re-login everywhere
  await user.save();
  return { ok: true };
}

export async function verifyEmail(token: string): Promise<{ ok: true }> {
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  });
  if (!user) throw ApiError.badRequest('Verification token is invalid or expired');
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  return { ok: true };
}

export async function resendVerification(email: string): Promise<{ sent: boolean }> {
  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user || user.isEmailVerified) return { sent: true };
  const token = issueOpaqueToken();
  user.emailVerificationToken = token;
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TTL_MIN * 60 * 1000);
  await user.save();
  const url = `${env.appUrl}/auth/verify-email?token=${token}`;
  await sendActionEmail({ to: user.email, name: user.name, action: 'verify-email', url }).catch(() => undefined);
  return { sent: true };
}

function expiryToDate(expiresIn: string): Date {
  // Parse "7d" / "15m" / "3600s"
  const m = /^(\d+)([dhms])$/.exec(expiresIn.trim());
  if (!m) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const n = Number(m[1]);
  const mult = { d: 86400, h: 3600, m: 60, s: 1 }[m[2]] ?? 1;
  return new Date(Date.now() + n * mult * 1000);
}
