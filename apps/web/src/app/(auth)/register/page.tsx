'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { RegisterSchema, type RegisterInput } from '@briefli/shared';
import { cn } from '@briefli/ui';
import { api } from '@/lib/api';
import { BriefcaseLogo } from '@/components/ui/logo';
import { CheckCircle2 } from 'lucide-react';

const FEATURES = [
  'Unlimited case management',
  'Automated billing & invoicing',
  'Client portal included',
  'eCourts integration',
  'Real-time deadline tracking',
];

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    try {
      await api.post('/auth/register', data);
      router.push('/login?registered=1');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message ?? 'Registration failed');
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

          <p className="text-lg text-blue-200 max-w-xs leading-relaxed mb-8">
            Start managing your cases with clarity and confidence.
          </p>
          <div className="space-y-3 text-left w-full max-w-xs">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-blue-100">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom trust signal */}
        <div className="relative z-10 px-12 pb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm text-blue-100">
            <span className="text-base">⚖️</span>
            <span>Trusted by 500+ attorneys across the US</span>
          </div>
        </div>
      </div>

      {/* Right panel — register form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <BriefcaseLogo size={40} className="text-primary" />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1
              className="text-4xl font-bold text-foreground leading-tight mb-2"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
            >
              Create your firm.
            </h1>
            <p className="text-muted-foreground text-sm">Get started — it&apos;s free</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Firm Name
              </label>
              <input
                {...register('firmName')}
                type="text"
                className="input-field"
                placeholder="Acme Law Group"
                autoComplete="organization"
              />
              {errors.firmName && (
                <p className="text-destructive text-xs mt-1">{errors.firmName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  First Name
                </label>
                <input
                  {...register('firstName')}
                  type="text"
                  className="input-field"
                  placeholder="Jane"
                  autoComplete="given-name"
                />
                {errors.firstName && (
                  <p className="text-destructive text-xs mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Last Name
                </label>
                <input
                  {...register('lastName')}
                  type="text"
                  className="input-field"
                  placeholder="Smith"
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <p className="text-destructive text-xs mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                className="input-field"
                placeholder="jane@lawfirm.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                className="input-field"
                placeholder="••••••••"
                autoComplete="new-password"
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
              {isSubmitting ? 'Creating account...' : 'Create account →'}
            </button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
