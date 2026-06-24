import jwt, { type JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import type { AuthTokens } from '../types/index.js';
import { UserRole } from '../types/enums.js';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;          // user id
  role: UserRole;
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  tokenId: string;
  type: 'refresh';
}

export function signAccessToken(user: { id: string; role: UserRole; email: string }): string {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, type: 'access' },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn as never },
  );
}

export function signRefreshToken(userId: string): { token: string; tokenId: string } {
  const tokenId = uuidv4();
  const token = jwt.sign({ sub: userId, tokenId, type: 'refresh' }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn as never,
  });
  return { token, tokenId };
}

export function signTokens(user: { id: string; role: UserRole; email: string }): AuthTokens & { tokenId: string } {
  const access = signAccessToken(user);
  const { token: refresh, tokenId } = signRefreshToken(user.id);
  return { accessToken: access, refreshToken: refresh, tokenId };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.secret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload;
}
