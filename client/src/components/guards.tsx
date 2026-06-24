import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { UserRole } from '../types';

/** Blocks unauthenticated users; redirects to /login preserving intent. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

/** Blocks users whose role is not in `roles`; sends others to their dashboard. */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const role = useAppSelector((s) => s.auth.role);
  if (!role || !roles.includes(role)) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
