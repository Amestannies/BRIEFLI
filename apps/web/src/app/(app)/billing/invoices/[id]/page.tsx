'use client';

import { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Send, CreditCard, Ban, CheckCircle2, Clock, FileText,
  Mail, Phone, AlertCircle, ExternalLink, Loader2, Building2,
} from 'lucide-react';
import {
  useInvoice, sendInvoice, voidInvoice, createStripeCheckout,
  type InvoiceLineItem,
} from '@/hooks/useBilling';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; icon: typeof CheckCircle2 }> = {
  DRAFT:   { bg: 'bg-gray-50',    text: 'text-gray-600',   border: 'border-gray-200', label: 'Draft',   icon: FileText },
  SENT:    { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-100', label: 'Sent',    icon: Send },
  VIEWED:  { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-100', label: 'Viewed', icon: Clock },
  PAID:    { bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-100', label: 'Paid',   icon: CheckCircle2 },
  OVERDUE: { bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-100',   label: 'Overdue', icon: AlertCircle },
  VOID:    { bg: 'bg-gray-100',   text: 'text-gray-400',   border: 'border-gray-200',  label: 'Void',   icon: Ban },
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { invoice, loading, error, refetch } = useInvoice(id);

  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [voidingInvoice, setVoidingInvoice] = useState(false);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Handle return from Stripe
  useEffect(() => {
    if (searchParams.get('paid') === 'true') {
      setSuccessBanner('Payment received! Invoice marked as paid.');
      refetch();
    } else if (searchParams.get('cancelled') === 'true') {
      setSuccessBanner('');
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend() {
    setSendingInvoice(true);
    setActionError('');
    try {
      await sendInvoice(id);
      setSuccessBanner('Invoice marked as sent.');
      refetch();
    } catch { setActionError('Failed to send invoice'); }
    finally { setSendingInvoice(false); }
  }

  async function handleVoid() {
    setVoidingInvoice(true);
    setActionError('');
    try {
      await voidInvoice(id);
      setShowVoidConfirm(false);
      setSuccessBanner('Invoice voided.');
      refetch();
    } catch { setActionError('Failed to void invoice'); }
    finally { setVoidingInvoice(false); }
  }

  async function handleStripeCheckout() {
    setCreatingCheckout(true);
    setActionError('');
    try {
      const { url } = await createStripeCheckout(id);
      window.open(url, '_blank');
      refetch();
    } catch { setActionError('Failed to create payment link'); }
    finally { setCreatingCheckout(false); }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-48" />
        <div className="bg-white rounded-2xl border h-96" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
        <p className="text-gray-500">{error ?? 'Invoice not found'}</p>
        <Link href="/billing/invoices" className="mt-4 inline-block text-sm text-[#3B4ECC] hover:underline">← Back to invoices</Link>
      </div>
    );
  }

  const sc = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG['DRAFT']!;
  const StatusIcon = sc.icon;
  const isOverdue = !['PAID', 'VOID'].includes(invoice.status) && new Date(invoice.dueDate) < new Date();
  const lineItems = invoice.lineItems as InvoiceLineItem[];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/billing/invoices')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Back to Invoices
        </button>
        <div className="flex items-center gap-2">
          {/* Actions based on status */}
          {invoice.status === 'DRAFT' && (
            <button onClick={handleSend} disabled={sendingInvoice} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3db0] disabled:opacity-50 transition-colors">
              {sendingInvoice ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Mark as Sent
            </button>
          )}
          {['DRAFT', 'SENT', 'VIEWED', 'OVERDUE'].includes(invoice.status) && (
            <button onClick={handleStripeCheckout} disabled={creatingCheckout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#121845] rounded-lg hover:bg-[#1a2460] disabled:opacity-50 transition-colors">
              {creatingCheckout ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
              {invoice.stripePaymentId ? 'New Payment Link' : 'Get Payment Link'}
              <ExternalLink size={12} />
            </button>
          )}
          {!['PAID', 'VOID'].includes(invoice.status) && (
            <button onClick={() => setShowVoidConfirm(true)} className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Ban size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Success banner */}
      {successBanner && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-700">{successBanner}</p>
          <button onClick={() => setSuccessBanner('')} className="ml-auto text-green-400 hover:text-green-600">
            <Ban size={14} />
          </button>
        </div>
      )}

      {/* Action error */}
      {actionError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      )}

      {/* Invoice card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Invoice header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-[#121845]" style={{ fontFamily: 'Playfair Display, serif' }}>
                {invoice.invoiceNumber}
              </h1>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                <StatusIcon size={12} />
                {sc.label}
                {isOverdue && invoice.status !== 'PAID' && (
                  <span className="ml-1 text-red-600">(Overdue)</span>
                )}
              </span>
            </div>
            <p className="text-sm text-gray-500">Created {fmtDate(invoice.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-[#121845]">{fmt(Number(invoice.total))}</p>
            <p className={`text-sm mt-1 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
              Due {fmtDate(invoice.dueDate)}
            </p>
            {invoice.paidAt && (
              <p className="text-xs text-green-600 mt-1">Paid {fmtDate(invoice.paidAt)}</p>
            )}
          </div>
        </div>

        {/* Billing parties */}
        <div className="grid grid-cols-2 gap-6 px-8 py-6 border-b border-gray-50">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">From</p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#121845] rounded-lg flex items-center justify-center">
                <Building2 size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Your Firm</p>
                <p className="text-xs text-gray-400">Legal Services</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bill To</p>
            {invoice.client ? (
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {invoice.client.firstName} {invoice.client.lastName}
                </p>
                {invoice.client.email && (
                  <div className="flex items-center gap-1 mt-1">
                    <Mail size={11} className="text-gray-400" />
                    <a href={`mailto:${invoice.client.email}`} className="text-xs text-gray-500 hover:text-[#3B4ECC]">
                      {invoice.client.email}
                    </a>
                  </div>
                )}
                {invoice.client.phone && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone size={11} className="text-gray-400" />
                    <a href={`tel:${invoice.client.phone}`} className="text-xs text-gray-500 hover:text-[#3B4ECC]">
                      {invoice.client.phone}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Client not found</p>
            )}
          </div>
        </div>

        {/* Case ref */}
        {invoice.case && (
          <div className="px-8 py-4 bg-[#EEF1FB]/40 border-b border-gray-50 flex items-center gap-3">
            <FileText size={15} className="text-[#3B4ECC]" />
            <span className="text-sm text-gray-600">
              Matter: <Link href={`/cases/${invoice.caseId}`} className="font-semibold text-[#3B4ECC] hover:underline">
                {invoice.case.internalRef} — {invoice.case.title}
              </Link>
            </span>
          </div>
        )}

        {/* Line items */}
        <div className="px-8 py-6">
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="text-left pb-3">Description</th>
                <th className="text-right pb-3 w-20">Qty</th>
                <th className="text-right pb-3 w-28">Unit Price</th>
                <th className="text-right pb-3 w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="py-3 text-sm text-gray-700">{item.description}</td>
                  <td className="py-3 text-sm text-right text-gray-600">{item.quantity}</td>
                  <td className="py-3 text-sm text-right text-gray-600">{fmt(item.unitPrice)}</td>
                  <td className="py-3 text-sm font-semibold text-right text-gray-900">{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>{fmt(Number(invoice.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax</span><span>{fmt(Number(invoice.tax))}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#121845] border-t border-gray-200 pt-2">
                <span>Total</span><span>{fmt(Number(invoice.total))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="px-8 py-5 border-t border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Stripe info */}
        {invoice.stripePaymentId && invoice.status !== 'PAID' && (
          <div className="px-8 py-4 bg-[#EEF1FB]/40 border-t border-gray-50 flex items-center gap-2">
            <CreditCard size={14} className="text-[#3B4ECC]" />
            <p className="text-xs text-gray-500">
              A Stripe payment link has been generated for this invoice. The client can pay securely online.
            </p>
          </div>
        )}
      </div>

      {/* Void confirm modal */}
      {showVoidConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ban size={22} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-center text-[#121845] mb-2">Void Invoice?</h3>
            <p className="text-sm text-center text-gray-500 mb-6">
              This will mark invoice {invoice.invoiceNumber} as void. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowVoidConfirm(false)} className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleVoid} disabled={voidingInvoice} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {voidingInvoice ? 'Voiding…' : 'Void Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
