'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DollarSign, Clock, AlertCircle, TrendingUp, ChevronRight, FileText, Plus } from 'lucide-react';
import { useBillingSummary, useInvoices, useTimeEntries, type Invoice, type TimeEntry } from '@/hooks/useBilling';

const INVOICE_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:   { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Draft' },
  SENT:    { bg: 'bg-blue-50',    text: 'text-blue-700',   label: 'Sent' },
  VIEWED:  { bg: 'bg-purple-50',  text: 'text-purple-700', label: 'Viewed' },
  PAID:    { bg: 'bg-green-50',   text: 'text-green-700',  label: 'Paid' },
  OVERDUE: { bg: 'bg-red-50',     text: 'text-red-700',    label: 'Overdue' },
  VOID:    { bg: 'bg-gray-100',   text: 'text-gray-400',   label: 'Void' },
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

export default function BillingOverviewPage() {
  const router = useRouter();
  const { data: summary, loading: sumLoading } = useBillingSummary();
  const { invoices, loading: invLoading } = useInvoices();
  const { entries, loading: entLoading } = useTimeEntries();

  const recentInvoices = invoices.slice(0, 5);
  const recentEntries = entries.slice(0, 5);

  const summaryCards = [
    {
      label: 'Outstanding',
      value: sumLoading ? '—' : fmt(summary?.outstanding.total ?? 0),
      sub: `${summary?.outstanding.count ?? 0} invoice${(summary?.outstanding.count ?? 0) !== 1 ? 's' : ''}`,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Paid This Month',
      value: sumLoading ? '—' : fmt(summary?.paidThisMonth.total ?? 0),
      sub: `${summary?.paidThisMonth.count ?? 0} invoice${(summary?.paidThisMonth.count ?? 0) !== 1 ? 's' : ''}`,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Unbilled Hours',
      value: sumLoading ? '—' : `${summary?.unbilledHours ?? 0}h`,
      sub: sumLoading ? '' : fmt(summary?.unbilledValue ?? 0),
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Total Invoices',
      value: sumLoading ? '—' : String(invoices.length),
      sub: 'all time',
      icon: FileText,
      color: 'text-[#3B4ECC]',
      bg: 'bg-[#EEF1FB]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#121845]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Billing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/billing/time-entries"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#3B4ECC] bg-[#EEF1FB] rounded-lg hover:bg-[#dde3fa] transition-colors"
          >
            <Clock size={15} />
            Log Time
          </Link>
          <Link
            href="/billing/invoices/new"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3db0] transition-colors"
          >
            <Plus size={15} />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${card.bg} mb-3`}>
              <card.icon size={18} className={card.color} />
            </div>
            <p className="text-2xl font-bold text-[#121845]">{card.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
            {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Overdue Alert */}
      {!sumLoading && (summary?.overdueInvoices.length ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-semibold">{summary!.overdueInvoices.length} invoice{summary!.overdueInvoices.length > 1 ? 's' : ''} overdue</span>
            {' '}— review and follow up to maintain cash flow.
          </p>
          <Link href="/billing/invoices?status=OVERDUE" className="ml-auto text-sm font-medium text-red-700 hover:underline">
            View
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-[#121845]">Recent Invoices</h2>
            <Link href="/billing/invoices" className="text-xs text-[#3B4ECC] font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>

          {invLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-50 rounded w-1/2" />
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-16" />
                </div>
              ))}
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">No invoices yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentInvoices.map((inv) => {
                const sc = INVOICE_STATUS_COLORS[inv.status] ?? INVOICE_STATUS_COLORS['DRAFT']!;
                return (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/billing/invoices/${inv.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {inv.client ? `${inv.client.firstName} ${inv.client.lastName}` : 'Unknown client'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{inv.invoiceNumber} · {inv.case?.title ?? 'No case'}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    <span className="text-sm font-bold text-gray-900 shrink-0">{fmt(Number(inv.total))}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Time Entries */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-[#121845]">Recent Time Entries</h2>
            <Link href="/billing/time-entries" className="text-xs text-[#3B4ECC] font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight size={13} />
            </Link>
          </div>

          {entLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-50 rounded w-1/2" />
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-12" />
                </div>
              ))}
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">No time entries yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentEntries.map((entry) => {
                const hrs = (entry.durationMinutes / 60).toFixed(1);
                const total = ((entry.durationMinutes / 60) * Number(entry.hourlyRate)).toFixed(2);
                return (
                  <div key={entry.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${entry.invoiceId ? 'bg-green-50' : 'bg-[#EEF1FB]'}`}>
                      <Clock size={14} className={entry.invoiceId ? 'text-green-600' : 'text-[#3B4ECC]'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{entry.description}</p>
                      <p className="text-xs text-gray-400 truncate">{entry.case?.internalRef ?? ''} · {entry.user.firstName} {entry.user.lastName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{fmt(Number(total))}</p>
                      <p className="text-xs text-gray-400">{hrs}h</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { href: '/billing/invoices/new', label: 'Create Invoice', icon: FileText, color: 'text-[#3B4ECC]', bg: 'bg-[#EEF1FB]' },
          { href: '/billing/time-entries', label: 'Log Time', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { href: '/billing/reports', label: 'Reports', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border border-gray-100 hover:border-[#3B4ECC]/30 hover:shadow-md transition-all"
          >
            <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center`}>
              <a.icon size={20} className={a.color} />
            </div>
            <span className="text-sm font-semibold text-gray-700">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
