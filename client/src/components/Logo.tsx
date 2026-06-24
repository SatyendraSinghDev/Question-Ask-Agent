import clsx from 'clsx';

/** Inline SVG logo so it works without asset loading. */
export function Logo({ className, showText = true, size = 36 }: { className?: string; showText?: boolean; size?: number }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="TestASK AI">
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6366F1" />
            <stop offset="0.55" stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#logoGrad)" />
        <path
          d="M22 22 C22 15 29 13 34 13 C41 13 45 16.5 45 22 C45 27 41 29.5 37.5 31.5 C35.4 32.7 34.5 34 34.5 36.5"
          fill="none"
          stroke="#fff"
          strokeWidth="4.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="34.5" cy="44" r="3.2" fill="#FACC15" />
        <circle cx="50" cy="48" r="2.8" fill="#FACC15" />
        <circle cx="14" cy="46" r="2" fill="#fff" />
      </svg>
      {showText && (
        <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
          Test<span className="text-brand-600 dark:text-brand-400">ASK</span>
          <span className="text-accent-500"> AI</span>
        </span>
      )}
    </span>
  );
}
