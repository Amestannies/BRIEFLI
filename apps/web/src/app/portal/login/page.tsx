'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { BriefcaseLogo } from '@/components/ui/logo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// ─── Inner component (needs useSearchParams) ─────────────────────────────────
function PortalLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken]         = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Auto-fill + auto-submit when the attorney shares the direct URL
  useEffect(() => {
    const prefill = searchParams.get('prefill') ?? searchParams.get('token');
    if (prefill) {
      setToken(prefill);
      setAutoLoading(true);
      submitToken(prefill).finally(() => setAutoLoading(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitToken = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) { setError('Please enter your access code.'); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/portal/auth?token=${encodeURIComponent(trimmed)}`);

      if (!res.ok) {
        let message = 'Invalid access code. Please try again.';
        try { const body = await res.json() as { message?: string }; if (body.message) message = body.message; } catch { /* ignore */ }
        setError(message);
        return;
      }

      // Persist for client-side reads (sessionStorage) AND for the middleware (cookie)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('portal_token', trimmed);
        document.cookie = `portal_session=${trimmed}; path=/; SameSite=Strict`;
      }

      router.push(`/portal?token=${encodeURIComponent(trimmed)}`);
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); submitToken(token); };

  const busy = loading || autoLoading;

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — navy brand panel ────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#121845] flex-col relative overflow-hidden">
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: 'linear-gradient(135deg, rgba(59,78,204,0.4) 0%, transparent 60%, rgba(18,24,69,0.8) 100%)' }}
        />
        {/* Dot-grid texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-12 text-center">
          <div className="mb-6">
            <BriefcaseLogo size={72} className="text-white mx-auto" />
          </div>

          <h1
            className="text-5xl font-bold text-white mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
          >
            Briefli
          </h1>

          <p className="text-lg text-blue-200 max-w-xs leading-relaxed mb-2">
            Your secure client portal.
          </p>
          <p className="text-sm text-blue-300/70 max-w-xs leading-relaxed">
            View your cases, documents, invoices, and message your attorney — all in one place.
          </p>
        </div>

        {/* Bottom tag */}
        <div className="relative z-10 px-12 pb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm text-blue-100">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Access code provided by your attorney</span>
          </div>
        </div>
      </div>

      {/* ── Right panel — access-code form ───────────────────────────── */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
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
              {autoLoading ? 'Signing you in…' : 'Client Portal'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {autoLoading
                ? 'Verifying your access link, please wait.'
                : 'Enter the access code your attorney sent you.'}
            </p>
          </div>

          {/* Auto-loading spinner */}
          {autoLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}

          {/* Form */}
          {!autoLoading && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 bg-destructive/5 border border-destructive/20 text-destructive rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{error}</p>
                    <p className="text-xs opacity-80 mt-0.5">Contact your attorney if you need a new code.</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Access Code
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your access code here"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={busy}
                    className="input-field pr-11 font-mono disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(v => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || !token.trim()}
                className="w-full bg-primary text-primary-foreground rounded-full py-2.5 px-4 text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                  </span>
                ) : (
                  'Access My Portal →'
                )}
              </button>
            </form>
          )}

          {/* Footer links */}
          {!autoLoading && (
            <div className="mt-6 space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                Are you an attorney?{' '}
                <Link href="/login" className="text-primary font-medium hover:underline">
                  Sign in here
                </Link>
              </p>
              <p className="text-xs text-muted-foreground">
                Don't have a code?{' '}
                <span className="text-foreground">Contact your attorney to request access.</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page export ─────────────────────────────────────────────────────────────
export default function PortalLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <PortalLoginInner />
    </Suspense>
  );
}
