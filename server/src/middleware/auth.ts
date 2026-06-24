import type { NextFunction, Response } from 'express';
import { User } from '../models/User.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';
import { ADMIN_ROLES, STAFF_ROLES, UserRole } from '../types/enums.js';
import type { AuthedRequest, AuthPrincipal } from '../types/index.js';

/**
 * Verifies the `Authorization: Bearer <access>` header, loads the user,
 * and attaches `req.principal`. Throws 401 when missing/invalid/inactive.
 */
export async function authenticate(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Missing or malformed Authorization header');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired access token');
    }

    const user = await User.findById(payload.sub).select('_id role email isActive').lean().exec();
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Account not found or deactivated');
    }

    const principal: AuthPrincipal = {
      userId: String(user._id),
      role: user.role,
      email: user.email,
      tokenId: payload.jti ?? '',
    };
    req.principal = principal;
    next();
  } catch (err) {
    next(err);
  }
}

/** Optional auth — attaches principal if a valid token is present, else continues. */
export async function optionalAuthenticate(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub).select('_id role email isActive').lean().exec();
      if (user?.isActive) {
        req.principal = {
          userId: String(user._id),
          role: user.role,
          email: user.email,
          tokenId: payload.jti ?? '',
        };
      }
    } catch {
      /* swallow — optional */
    }
  }
  next();
}

/** Guards a route to specific roles. Combine with `authenticate`. */
export function authorize(...roles: UserRole[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    if (!req.principal) return next(ApiError.unauthorized());
    if (roles.length > 0 && !roles.includes(req.principal.role)) {
      return next(ApiError.forbidden('Your role does not permit this action'));
    }
    next();
  };
}

/** Convenience guards. */
export const requireStaff = authorize(...STAFF_ROLES);
export const requireAdmin = authorize(...ADMIN_ROLES);
export const requireSuperAdmin = authorize(UserRole.SUPER_ADMIN);
export const requireStudent = authorize(UserRole.STUDENT);
