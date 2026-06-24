import { Link } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';

const FEATURES = [
  { icon: '🤖', title: 'AI Question Generation', desc: 'Turn text, images, or PDFs into exam-ready questions with answers & explanations in seconds.' },
  { icon: '🌐', title: 'Bilingual (Hindi + English)', desc: 'Every question supports side-by-side Hindi & English — perfect for Indian competitive exams.' },
  { icon: '🧪', title: 'Powerful Test Engine', desc: 'Test & per-question timers, pause/resume, auto-submit, and full-screen anti-cheat proctoring.' },
  { icon: '📊', title: 'Deep Analytics', desc: 'Subject, topic, and difficulty-wise breakdowns with beautiful charts to track progress.' },
  { icon: '🏅', title: 'Verifiable Certificates', desc: 'Auto-issued PDF certificates with QR verification and unique certificate IDs.' },
  { icon: '🧩', title: '13 Question Types', desc: 'MCQ, numerical, match-the-following, assertion-reason, coding, subjective & more.' },
];

const EXAMS = ['GATE', 'UPSC', 'SSC', 'Banking', 'CAT', 'NEET', 'JEE', 'Government'];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-mesh dark:bg-slate-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
          <Link to="/register" className="btn-primary text-sm">Get started</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 text-center lg:pt-20">
        <span className="badge mx-auto mb-5 bg-white/70 text-brand-700 shadow-card dark:bg-slate-900/70 dark:text-brand-300">
          ✨ AI-Powered Assessment Platform
        </span>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
          Build, take, and analyse exams with{' '}
          <span className="bg-brand-gradient bg-clip-text text-transparent">intelligent AI</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          TestASK AI is an enterprise-grade online examination system for GATE, UPSC, SSC,
          Banking, CAT, NEET & JEE — with AI question generation, bilingual support,
          proctoring, analytics, and verifiable certificates.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className="btn-primary px-6 py-3 text-base">Start free →</Link>
          <Link to="/login" className="btn-secondary px-6 py-3 text-base">Sign in</Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {EXAMS.map((e) => (
            <span key={e} className="badge bg-white/60 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">{e}</span>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card animate-slide-up p-6">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-2xl dark:bg-slate-800">{f.icon}</div>
              <h3 className="mb-1.5 text-lg font-bold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
        © {new Date().getFullYear()} TestASK AI — Intelligent Assessment Platform · Built with ❤️ for educators.
      </footer>
    </div>
  );
}
