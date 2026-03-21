'use client';

import { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertCircle, ChevronLeft, Smartphone, Lock, LogOut } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface UserMFA {
  mfaEnabled: boolean;
  email: string;
}

export default function SecurityPage() {
  const [user, setUser] = useState<UserMFA | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaSetupUrl, setMfaSetupUrl] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<UserMFA>('/users/me').then((r) => setUser(r.data))
      .catch(() => setError('Failed to load security settings'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSetupMFA() {
    setMfaLoading(true); setError(null);
    try {
      const res = await api.post<{ qrCode: string; secret: string }>('/auth/mfa/setup');
      setMfaSetupUrl(res.data.qrCode);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to set up 2FA');
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleVerifyMFA() {
    if (!mfaCode.trim()) { setError('Enter the 6-digit code'); return; }
    setMfaLoading(true); setError(null);
    try {
      await api.post('/auth/mfa/verify', { code: mfaCode });
      setUser((u) => u ? { ...u, mfaEnabled: true } : u);
      setMfaSetupUrl(null);
      setMfaCode('');
      setSuccess('Two-factor authentication enabled.');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Invalid code. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  }

  async function handleDisableMFA() {
    if (!window.confirm('Disable two-factor authentication? This reduces your account security.')) return;
    setMfaLoading(true); setError(null);
    try {
      await api.post('/auth/mfa/disable');
      setUser((u) => u ? { ...u, mfaEnabled: false } : u);
      setSuccess('Two-factor authentication disabled.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to disable 2FA');
    } finally {
      setMfaLoading(false);
    }
  }

  if (loading) {
    return <div className="max-w-2xl space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="bg-white border border-border rounded-xl p-6 animate-pulse h-24" />)}</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security</h1>
          <p className="text-sm text-gray-500">Protect your account with two-factor authentication.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3.5 text-sm text-green-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* 2FA */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Two-Factor Authentication</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Use an authenticator app (Google Authenticator, Authy) to add a second layer of security.
              </p>
            </div>
          </div>
          <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${user?.mfaEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {!user?.mfaEnabled && !mfaSetupUrl && (
          <button onClick={handleSetupMFA} disabled={mfaLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3faa] disabled:opacity-50 transition-colors">
            <Shield className="w-4 h-4" />
            {mfaLoading ? 'Setting up…' : 'Enable 2FA'}
          </button>
        )}

        {mfaSetupUrl && (
          <div className="space-y-4 pt-2 border-t border-border">
            <p className="text-sm text-gray-700 font-medium">Scan this QR code with your authenticator app:</p>
            <div className="flex justify-center">
              <img src={mfaSetupUrl} alt="2FA QR Code" className="w-44 h-44 border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Enter the 6-digit code to confirm</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC] font-mono tracking-widest text-center"
                />
                <button onClick={handleVerifyMFA} disabled={mfaLoading || mfaCode.length !== 6}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3faa] disabled:opacity-50 transition-colors">
                  {mfaLoading ? 'Verifying…' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        )}

        {user?.mfaEnabled && (
          <button onClick={handleDisableMFA} disabled={mfaLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
            <Lock className="w-4 h-4" />
            {mfaLoading ? 'Disabling…' : 'Disable 2FA'}
          </button>
        )}
      </div>

      {/* Account */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Account</h2>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-gray-900">Signed in as</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <Link href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-border rounded-lg hover:bg-gray-50 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </Link>
        </div>
      </div>

      {/* Security tips */}
      <div className="bg-[#F4F6FA] rounded-xl p-5 space-y-2">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Security Tips</p>
        {[
          'Use a unique password not shared with other services.',
          'Enable 2FA for maximum account security.',
          'Never share your access credentials with anyone.',
          'Check connected integrations regularly under Calendar settings.',
        ].map((tip) => (
          <div key={tip} className="flex items-start gap-2 text-xs text-gray-500">
            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
            {tip}
          </div>
        ))}
      </div>
    </div>
  );
}
