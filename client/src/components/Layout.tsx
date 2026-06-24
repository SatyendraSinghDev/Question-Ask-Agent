import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { useLogoutMutation } from '../features/auth/authApi';
import { useAppSelector } from '../app/hooks';
import { UserRole } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: UserRole[];
}

const NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: '📊' },
  { to: '/app/tests', label: 'Tests', icon: '📝' },
  { to: '/app/question-bank', label: 'Question Bank', icon: '🗂️', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EXAMINER] },
  { to: '/app/ai-generate', label: 'AI Generate', icon: '🤖', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  { to: '/app/results', label: 'Results', icon: '📈' },
  { to: '/app/certificates', label: 'Certificates', icon: '🏅' },
  { to: '/app/admin', label: 'Admin', icon: '⚙️', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
];

export function Layout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();
  const user = useAppSelector((s) => s.auth.user);
  const role = useAppSelector((s) => s.auth.role);

  const items = NAV.filter((n) => !n.roles || (role && n.roles.includes(role)));

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-mesh dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white/80 backdrop-blur transition-transform dark:border-slate-800 dark:bg-slate-900/80',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1 px-3 py-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-gradient text-white shadow-glow'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="mb-2 flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name}</p>
              <p className="truncate text-xs capitalize text-slate-500">{role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={onLogout} className="btn-secondary w-full justify-center text-sm">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/70 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 lg:px-8">
          <button className="btn-ghost h-9 w-9 !p-0 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">
              Welcome back, <strong className="text-slate-700 dark:text-slate-200">{user?.name?.split(' ')[0]}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
