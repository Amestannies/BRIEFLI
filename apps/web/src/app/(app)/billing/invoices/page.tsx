'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileText, Send, DollarSign, X, Check, ChevronDown } from 'lucide-react';
import {
  useInvoices, createInvoice,
  type InvoiceStatus, type InvoiceLineItem, type CreateInvoiceInput,
} from '@/hooks/useBilling';
import { api } from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: InvoiceStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'VIEWED', label: 'Viewed' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'VOID', label: 'Void' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT:   { bg: 'bg-gray-100',   text: 'text-gray-600' },
  SENT:    { bg: 'bg-blue-50',    text: 'text-blue-700' },
  VIEWED:  { bg: 'bg-purple-50',  text: 'text-purple-700' },
  PAID:    { bg: 'bg-green-50',   text: 'text-green-700' },
  OVERDUE: { bg: 'bg-red-50',     text: 'text-red-700' },
  VOID:    { bg: 'bg-gray-100',   text: 'text-gray-400' },
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface CaseOption { id: string; title: string; internalRef: string; }
interface ClientOption { id: string; firstName: string; lastName: string; email: string; }

function useCaseOptions() {
  const [cases, setCases] = useState<CaseOption[]>([]);
  useEffect(() => { api.get<CaseOption[]>('/cases?limit=100').then((r: { data: CaseOption[] }) => setCases(r.data)).catch(() => {}); }, []);
  return cases;
}

function useClientOptions() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  useEffect(() => { api.get<ClientOption[]>('/clients?limit=100').then((r: { data: ClientOption[] }) => setClients(r.data)).catch(() => {}); }, []);
  return clients;
}

// ─── Create Invoice Panel ─────────────────────────────────────────────────────

interface CreatePanelProps {
  cases: CaseOption[];
  clients: ClientOption[];
  onSaved: (id: string) => void;
  onClose: () => void;
}

function CreateInvoicePanel({ cases, clients, onSaved, onClose }: CreatePanelProps) {
  const [caseId, setCaseId] = useState('');
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ desc: string; qty: string; unit: string }>>([
    { desc: '', qty: '1', unit: '0' },
  ]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const subtotal = lines.reduce((acc, l) => acc + parseFloat(l.qty || '0') * parseFloat(l.unit || '0'), 0);
  const tax = 0;
  const total = subtotal + tax;

  function addLine() { setLines([...lines, { desc: '', qty: '1', unit: '0' }]); }
  function removeLine(i: number) { if (lines.length > 1) setLines(lines.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, field: keyof typeof lines[0], val: string) {
    setLines(lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  }

  async function handleSave() {
    if (!caseId || !clientId) { setErr('Case and client are required'); return; }
    if (lines.some((l) => !l.desc.trim())) { setErr('All line items must have a description'); return; }
    if (total <= 0) { setErr('Invoice total must be greater than 0'); return; }
    setSaving(true);
    setErr('');
    try {
      const lineItems: InvoiceLineItem[] = lines.map((l) => ({
        description: l.desc,
        quantity: parseFloat(l.qty),
        unitPrice: parseFloat(l.unit),
        total: parseFloat(l.qty) * parseFloat(l.unit),
      }));
      const inv = await createInvoice({ caseId, clientId, lineItems, subtotal, tax, total, dueDate, notes: notes || undefined });
      onSaved(inv.id);
    } catch {
      setErr('Failed to create invoice');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-[#121845]">New Invoice</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {err && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Case *</label>
              <select value={caseId} onChange={(e) => setCaseId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]">
                <option value="">Select case…</option>
                {cases.map((c) => <option key={c.id} value={c.id}>{c.internalRef}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Client *</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]">
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Items</label>
              <button onClick={addLine} className="text-xs text-[#3B4ECC] font-medium hover:underline">+ Add Line</button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input
                    value={line.desc}
                    onChange={(e) => updateLine(i, 'desc', e.target.value)}
                    placeholder="Description"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
                  />
                  <input
                    value={line.qty}
                    onChange={(e) => updateLine(i, 'qty', e.target.value)}
                    placeholder="Qty"
                    type="number" min="0.1" step="0.1"
                    className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
                  />
                  <input
                    value={line.unit}
                    onChange={(e) => updateLine(i, 'unit', e.target.value)}
                    placeholder="Rate"
                    type="number" min="0"
                    className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
                  />
                  <span className="w-20 text-sm text-right pt-2 font-medium text-gray-700">
                    {fmt(parseFloat(line.qty || '0') * parseFloat(line.unit || '0'))}
                  </span>
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(i)} className="p-2 text-gray-300 hover:text-red-400">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax</span><span>{fmt(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#121845] border-t border-gray-200 pt-2 mt-2">
              <span>Total</span><span>{fmt(total)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Payment terms, thank you note…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]" />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || total <= 0}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3db0] disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const cases = useCaseOptions();
  const clients = useClientOptions();

  const { invoices, loading, error, refetch } = useInvoices(
    statusFilter ? { status: statusFilter } : {}
  );

  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const clientName = inv.client ? `${inv.client.firstName} ${inv.client.lastName}`.toLowerCase() : '';
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      clientName.includes(q) ||
      (inv.case?.title.toLowerCase().includes(q) ?? false)
    );
  });

  const totalOutstanding = filtered.filter((i) => ['SENT', 'VIEWED', 'OVERDUE'].includes(i.status)).reduce((acc, i) => acc + Number(i.total), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#121845]" style={{ fontFamily: 'Playfair Display, serif' }}>Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
            {totalOutstanding > 0 && ` · ${fmt(totalOutstanding)} outstanding`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3db0] transition-colors"
        >
          <Plus size={15} /> New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value as InvoiceStatus | '')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                statusFilter === opt.value ? 'bg-[#3B4ECC] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4">{error}</div>
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse border-b border-gray-50">
              <div className="w-8 h-8 rounded-full bg-gray-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-100 rounded w-40" />
                <div className="h-3 bg-gray-50 rounded w-28" />
              </div>
              <div className="w-16 h-6 bg-gray-100 rounded-full" />
              <div className="w-20 h-4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-12 h-12 bg-[#EEF1FB] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={22} className="text-[#3B4ECC]" />
          </div>
          <p className="text-gray-500 text-sm">No invoices found.</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 text-[#3B4ECC] text-sm font-medium hover:underline">
            + Create first invoice
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <span>Invoice</span>
            <span>Client / Case</span>
            <span>Due</span>
            <span>Status</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="divide-y divide-gray-50">
            {filtered.map((inv) => {
              const sc = STATUS_COLORS[inv.status] ?? STATUS_COLORS['DRAFT']!;
              const isOverdue = inv.status !== 'PAID' && inv.status !== 'VOID' && new Date(inv.dueDate) < new Date();
              return (
                <div
                  key={inv.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/billing/invoices/${inv.id}`)}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">{fmtDate(inv.createdAt)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">
                      {inv.client ? `${inv.client.firstName} ${inv.client.lastName}` : '—'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{inv.case?.internalRef ?? '—'}</p>
                  </div>
                  <span className={`text-xs font-medium ${isOverdue && inv.status !== 'PAID' ? 'text-red-600' : 'text-gray-500'}`}>
                    {fmtDate(inv.dueDate)}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                    {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                  </span>
                  <span className="text-sm font-bold text-gray-900 text-right">{fmt(Number(inv.total))}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateInvoicePanel
          cases={cases}
          clients={clients}
          onSaved={(id) => { setShowCreate(false); router.push(`/billing/invoices/${id}`); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
