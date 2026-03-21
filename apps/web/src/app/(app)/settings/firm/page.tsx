'use client';

import { useState, useEffect, useRef } from 'react';
import { Building2, Save, Upload, X, CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface FirmData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  timezone: string;
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
];

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

export default function FirmSettingsPage() {
  const [firm, setFirm] = useState<FirmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [primaryColor, setPrimaryColor] = useState('#3B4ECC');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<FirmData>('/firms/me').then((r) => {
      setFirm(r.data);
      setName(r.data.name);
      setTimezone(r.data.timezone ?? 'America/New_York');
      setPrimaryColor(r.data.primaryColor ?? '#3B4ECC');
      setLogoPreview(r.data.logoUrl ?? null);
    }).catch(() => setError('Failed to load firm settings'))
      .finally(() => setLoading(false));
  }, []);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Logo must be under 2 MB'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!name.trim()) { setError('Firm name is required'); return; }
    setSaving(true); setError(null); setSuccess(false);
    try {
      let logoUrl = firm?.logoUrl;
      if (logoFile) {
        // Upload logo to S3 via presigned URL (reuse document upload flow)
        const presignRes = await api.post<{ uploadUrl: string; key: string }>('/documents/upload-url', {
          fileName: logoFile.name,
          mimeType: logoFile.type,
          folder: 'FIRM_ASSETS',
        });
        await fetch(presignRes.data.uploadUrl, {
          method: 'PUT',
          body: logoFile,
          headers: { 'Content-Type': logoFile.type },
        });
        const confirmRes = await api.post<{ url: string }>('/documents/confirm', { key: presignRes.data.key, fileName: logoFile.name, mimeType: logoFile.type, fileSize: logoFile.size, folder: 'FIRM_ASSETS' });
        logoUrl = confirmRes.data.url;
      }
      await api.patch('/firms/me', { name: name.trim(), timezone, primaryColor, ...(logoUrl ? { logoUrl } : {}) });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-6 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Firm Profile</h1>
          <p className="text-sm text-gray-500">Update your firm's public information and branding.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3.5 text-sm text-green-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Firm settings saved successfully.
        </div>
      )}

      {/* Logo */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Firm Logo</h2>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-xl bg-gray-100 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoPreview
              ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              : <Building2 className="w-8 h-8 text-gray-400" />}
          </div>
          <div className="space-y-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" /> Upload logo
            </button>
            {logoFile && (
              <button
                onClick={() => { setLogoFile(null); setLogoPreview(firm?.logoUrl ?? null); }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            )}
            <p className="text-xs text-gray-400">PNG, JPG up to 2 MB. Recommended 200×200px.</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Basic Information</h2>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Firm Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Harrison & Cole LLP"
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Firm Slug</label>
          <input
            type="text"
            value={firm?.slug ?? ''}
            disabled
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Used in your portal URL. Contact support to change.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC] bg-white"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Plan</label>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-semibold bg-[#3B4ECC]/10 text-[#3B4ECC] rounded-full">
              {PLAN_LABELS[firm?.plan ?? 'STARTER'] ?? firm?.plan}
            </span>
            <a href="#" className="text-xs text-[#3B4ECC] hover:underline">Upgrade →</a>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Branding</h2>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Primary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-32 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC] font-mono uppercase"
            />
            <button onClick={() => setPrimaryColor('#3B4ECC')} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Reset</button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Used on invoices and the client portal.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3faa] disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
