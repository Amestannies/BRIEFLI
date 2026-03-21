'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { LoginSchema, type LoginInput } from '@briefli/shared';
import { cn } from '@briefli/ui';
import { api } from '@/lib/api';
import { BriefcaseLogo } from '@/components/ui/logo';
import { CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered') === '1';
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    try {
      const res = await api.post<{ data: { accessToken: string } }>('/auth/login', data);
      const token =
        res.data?.data?.accessToken ??
        (res.data as unknown as { accessToken: string })?.accessToken;
      if (token) {
        sessionStorage.setItem('access_token', token);
        document.cookie = `access_token=${token}; path=/; SameSite=Strict`;
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message ?? 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — navy brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#121845] flex-col relative overflow-hidden">
        {/* Subtle diagonal gradient overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'linear-gradient(135deg, rgba(59,78,204,0.4) 0%, transparent 60%, rgba(18,24,69,0.8) 100%)',
          }}
        />
        {/* Decorative grid dots */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-12 text-center">
          {/* Animated logo */}
          <div className="mb-6">
            <BriefcaseLogo size={72} className="text-white mx-auto" />
          </div>

          <h1
            className="text-5xl font-bold text-white mb-4 leading-tight animate-fade-up"
            style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
          >
            Briefli
          </h1>

          <p className="text-lg text-blue-200 max-w-xs leading-relaxed animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Modern legal practice management for the cases that matter.
          </p>
        </div>

        {/* Bottom trust signal */}
        <div className="relative z-10 px-12 pb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm text-blue-100">
            <span className="text-base">⚖️</span>
            <span>Trusted by 500+ attorneys across the US</span>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <BriefcaseLogo size={40} className="text-primary" />
          </div>

          {/* Registered success banner */}
          {registered && (
            <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-6 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Account created! Sign in to get started.</span>
            </div>
          )}

          {/* Heading */}
          <div className="mb-8">
            <h1
              className="text-4xl font-bold text-foreground leading-tight mb-2"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
            >
              Welcome back.
            </h1>
            <p className="text-muted-foreground text-sm">Sign in to your workspace</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                className="input-field"
                placeholder="you@lawfirm.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">Password</label>
                <a
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <input
                {...register('password')}
                type="password"
                className="input-field"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'w-full bg-primary text-primary-foreground rounded-full py-2.5 px-4 text-sm font-semibold',
                'transition-all duration-150 hover:opacity-90 active:scale-[0.98]',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Briefli?{' '}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Create your firm
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
