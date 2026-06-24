import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { Button, Input, PasswordInput } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useLoginMutation } from './authApi';
import { getApiError } from '../../lib/axios';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [login, { isLoading }] = useLoginMutation();
  const from = (location.state as { from?: string })?.from ?? '/app';

  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values).unwrap();
      toast.push('Welcome back!', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      toast.push(getApiError(err), 'error');
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your TestASK AI account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Email" type="email" placeholder="you@example.com" autoComplete="email" error={errors.email?.message} {...field('email')} />
        <PasswordInput label="Password" placeholder="••••••••" autoComplete="current-password" error={errors.password?.message} {...field('password')} />
        <Button type="submit" loading={isLoading} className="w-full">Sign in</Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        No account?{' '}
        <Link to="/register" className="link">Create one</Link>
      </p>

      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-slate-800/50">
        Demo admin → <code className="font-mono">admin@testask.ai</code> / <code className="font-mono">Admin@123</code>
      </div>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden bg-brand-gradient lg:block">
        <div className="absolute inset-0 bg-mesh opacity-30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo showText={false} size={44} />
          <div>
            <h2 className="text-3xl font-bold leading-tight">Intelligent Assessment, end to end.</h2>
            <p className="mt-3 max-w-md text-white/80">
              From AI question generation to verifiable certificates — everything you need to run
              world-class examinations.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {['AI Generate', 'Bilingual', 'Proctoring', 'Analytics', 'Certificates'].map((t) => (
                <span key={t} className="badge bg-white/15 text-white backdrop-blur">{t}</span>
              ))}
            </div>
          </div>
          <p className="text-sm text-white/70">© {new Date().getFullYear()} TestASK AI</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
