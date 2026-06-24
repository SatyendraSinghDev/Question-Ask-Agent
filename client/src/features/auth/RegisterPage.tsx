import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, PasswordInput } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useRegisterMutation } from './authApi';
import { getApiError } from '../../lib/axios';
import { AuthShell } from './LoginPage';

const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Add an uppercase letter')
      .regex(/[a-z]/, 'Add a lowercase letter')
      .regex(/[0-9]/, 'Add a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [registerUser, { isLoading }] = useRegisterMutation();

  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
      }).unwrap();
      toast.push('Account created! Please sign in.', 'success');
      navigate('/login');
    } catch (err) {
      toast.push(getApiError(err), 'error');
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Start your exam preparation journey">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Full name" placeholder="Priya Sharma" error={errors.name?.message} {...field('name')} />
        <Input label="Email" type="email" placeholder="you@example.com" autoComplete="email" error={errors.email?.message} {...field('email')} />
        <PasswordInput label="Password" placeholder="••••••••" autoComplete="new-password" error={errors.password?.message} {...field('password')} />
        <PasswordInput label="Confirm password" placeholder="••••••••" autoComplete="new-password" error={errors.confirmPassword?.message} {...field('confirmPassword')} />
        <Button type="submit" loading={isLoading} className="w-full">Create account</Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="link">Sign in</Link>
      </p>
    </AuthShell>
  );
}
