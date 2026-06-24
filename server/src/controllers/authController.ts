import type { Response } from 'express';
import type { AuthedRequest } from '../types/index.js';
import { asyncHandler } from '../middleware/error.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as authService from '../services/authService.js';

export const register = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = req.body as { name: string; email: string; password: string; phone?: string };
  const result = await authService.register(body);
  return sendSuccess({ res, status: 201, data: result.user, meta: { verifyUrl: result.verifyUrl } });
});

export const login = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const { user, tokens } = await authService.login(email, password);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  return sendSuccess({ res, data: { user, tokens } });
});

export const refresh = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const refreshToken = (req.body.refreshToken as string) || req.cookies?.refreshToken;
  const tokens = await authService.refreshSession(refreshToken);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  return sendSuccess({ res, data: tokens });
});

export const logout = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.principal) return sendSuccess({ res, data: { ok: true } });
  const refreshToken = req.body?.refreshToken ?? req.cookies?.refreshToken;
  await authService.logout(req.principal.userId, refreshToken);
  clearAuthCookies(res);
  return sendSuccess({ res, data: { ok: true } });
});

export const me = asyncHandler(async (req: AuthedRequest, res: Response) => {
  return sendSuccess({ res, data: req.principal });
});

export const forgotPassword = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { email } = req.body as { email: string };
  const result = await authService.requestPasswordReset(email);
  return sendSuccess({ res, data: result });
});

export const resetPassword = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { token, password } = req.body as { token: string; password: string };
  const result = await authService.resetPassword(token, password);
  return sendSuccess({ res, data: result });
});

export const verifyEmail = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { token } = req.body as { token: string };
  const result = await authService.verifyEmail(token);
  return sendSuccess({ res, data: result });
});

export const resendVerification = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { email } = req.body as { email: string };
  const result = await authService.resendVerification(email);
  return sendSuccess({ res, data: result });
});

// ── Cookie helpers (access = short, refresh = httpOnly) ──

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
}
