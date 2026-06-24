import { forwardRef, useState } from 'react';
import clsx from 'clsx';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { Difficulty, QuestionStatus, TestStatus } from '../types';

// ── Button ──
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  className,
  loading,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={clsx(
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary',
        variant === 'ghost' && 'btn-ghost',
        variant === 'danger' && 'btn-danger',
        className,
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ── Input (forwardRef so React Hook Form's register() can track the value) ──
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }>(
  function Input({ label, error, className, ...rest }, ref) {
    return (
      <label className="block">
        {label && <span className="label">{label}</span>}
        <input
          ref={ref}
          className={clsx('input', error && 'border-red-400 focus:border-red-500 focus:ring-red-500/30', className)}
          {...rest}
        />
        {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
      </label>
    );
  },
);

// ── Password input with show/hide eye toggle ──
export const PasswordInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
>(function PasswordInput({ label, error, className, type = 'password', ...rest }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={clsx('input pr-11', error && 'border-red-400 focus:border-red-500 focus:ring-red-500/30', className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
        >
          {visible ? (
            // eye-off icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            // eye icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
});

// ── Card ──
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('card p-5', className)}>{children}</div>;
}

// ── Stat tile ──
export function Stat({ label, value, icon, accent = 'brand' }: { label: string; value: ReactNode; icon?: ReactNode; accent?: 'brand' | 'accent' | 'violet' | 'green' | 'red' }) {
  const colors: Record<string, string> = {
    brand: 'from-brand-500 to-brand-600',
    accent: 'from-accent-500 to-accent-600',
    violet: 'from-violet-500 to-violet-600',
    green: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
  };
  return (
    <Card className="flex items-center gap-4">
      {icon && (
        <span className={clsx('grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br text-white', colors[accent])}>
          {icon}
        </span>
      )}
      <span>
        <span className="block text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
        <span className="block text-sm text-slate-500 dark:text-slate-400">{label}</span>
      </span>
    </Card>
  );
}

// ── Badges ──
export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const map: Record<Difficulty, string> = {
    [Difficulty.EASY]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    [Difficulty.MEDIUM]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    [Difficulty.HARD]: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return <span className={clsx('badge capitalize', map[difficulty])}>{difficulty}</span>;
}

export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
  const map: Record<QuestionStatus, string> = {
    [QuestionStatus.DRAFT]: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    [QuestionStatus.PENDING_REVIEW]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    [QuestionStatus.APPROVED]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    [QuestionStatus.REJECTED]: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    [QuestionStatus.ARCHIVED]: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };
  return <span className={clsx('badge', map[status])}>{status.replace(/_/g, ' ')}</span>;
}

export function TestStatusBadge({ status }: { status: TestStatus }) {
  const map: Record<TestStatus, string> = {
    [TestStatus.DRAFT]: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    [TestStatus.SCHEDULED]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    [TestStatus.LIVE]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    [TestStatus.COMPLETED]: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    [TestStatus.ARCHIVED]: 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
  };
  return <span className={clsx('badge', map[status])}>{status}</span>;
}

// ── Spinner / Empty / Toast ──
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx('h-5 w-5 animate-spin text-brand-500', className)} viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-3xl dark:bg-slate-800">📭</div>
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
    </div>
  );
}
