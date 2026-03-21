'use client';

import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, ChevronLeft, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface BillingPrefs {
  defaultRate: string;
  taxRate: string;
  currency: string;
  replyTo?: string | null;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

export default function BillingPrefsPage() {
  const [prefs, setPrefs] = useState<BillingPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [defaultRate, setDefaultRate] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [replyTo, setReplyTo] = useState('');

  useEffect(() => {
    api.get<BillingPrefs>('/billing/settings').then((r) => {
      setPrefs(r.data);
      setDefaultRate(r.data.defaultRate ?? '0');
      setTaxRate((parseFloat(r.data.taxRate ?? '0') * 100).toFixed(2));
      setCurrency(r.data.currency ?? 'USD');
      setReplyTo(r.data.replyTo ?? '');
    }).catch(() => {
      // Settings may not exist yet — use defaults
      setDefaultRate('0');
      setTaxRate('0');
      setCurrency('USD');
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true); setError(null); setSuccess(false);
    try {
      await api.patch('/billing/settings', {
        defaultRate: parseFloat(defaultRate) || 0,
        taxRate: (parseFloat(taxRate) || 0) / 100,
        currency,
        replyTo: replyTo.trim() || null,
      });
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
    return <div className="max-w-2xl space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="bg-white border border-border rounded-xl p-6 animate-pulse h-20" />)}</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Preferences</h1>
          <p className="text-sm text-gray-500">Defaults applied to new time entries and invoices.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3.5 text-sm text-green-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> Billing preferences saved.
        </div>
      )}

      <div className="bg-white border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#3B4ECC]" /> Rate & Tax Defaults
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Default Hourly Rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" min="0" step="0.01" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Used when logging time without a custom rate.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tax Rate</label>
            <div className="relative">
              <input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)}
                className="w-full pr-8 pl-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Applied automatically to new invoices.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC] bg-white">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Invoice Reply-To Email <span className="font-normal text-gray-400">(optional)</span></label>
          <input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)}
            placeholder="billing@yourfirm.com"
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
          <p className="text-xs text-gray-400 mt-1">Clients can reply to invoice emails at this address.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3faa] disabled:opacity-50 transition-colors">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
