'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Filter, Scale, ChevronRight,
  Calendar, Clock, User, RefreshCw, AlertCircle,
} from 'lucide-react';
import { cn } from '@briefli/ui';
import { useCases } from '@/hooks/useCases';
import { CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@briefli/shared';

// ─── Display helpers ──────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  INTAKE: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-blue-100 text-blue-700',
  PENDING_COURT: 'bg-amber-100 text-amber-700',
  JUDGMENT: 'bg-orange-100 text-orange-700',
  APPEAL: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-emerald-100 text-emerald-700',
};

const STATUSES = ['All', 'INTAKE', 'ACTIVE', 'PENDING_COURT', 'JUDGMENT', 'APPEAL', 'CLOSED'];
const TYPES = ['All Types', 'EVICTION', 'NON_PAYMENT', 'LEASE_DISPUTE', 'HABITABILITY', 'OTHER'];

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

// ─── Component ────────────────────────────────────────────

export default function CasesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
    (window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(() => {
      setDebouncedSearch(val);
    }, 300);
  };

  const filters = useMemo(() => ({
    ...(statusFilter !== 'All' && { status: statusFilter }),
    ...(typeFilter !== 'All Types' && { caseType: typeFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
  }), [statusFilter, typeFilter, debouncedSearch]);

  const { data: cases, meta, loading, error, refetch } = useCases(filters);

  const activeCount = cases.filter(c => c.status !== 'CLOSED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
          >
            Cases
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? 'Loading…' : `${activeCount} active · ${meta.total} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <Link
            href="/cases/new"
            className="inline-flex items-center gap-2 bg-primary text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> New Case
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by case title, reference, or address…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>

        {/* Status + Type filters */}
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1 flex-shrink-0" />
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-all',
                statusFilter === s
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-secondary',
              )}
            >
              {s === 'All' ? 'All' : CASE_STATUS_LABELS[s] ?? s}
            </button>
          ))}
          <div className="ml-auto flex-shrink-0">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="All Types">All Types</option>
              {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={refetch} className="ml-auto underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Cases Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          <div className="col-span-4">Case</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Opened</div>
          <div className="col-span-1">Attorney</div>
          <div className="col-span-1" />
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 animate-pulse items-center">
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="col-span-2 h-3 bg-muted rounded w-20" />
                <div className="col-span-2 h-5 bg-muted rounded-full w-16" />
                <div className="col-span-2 h-3 bg-muted rounded w-20" />
                <div className="col-span-1 h-7 w-7 bg-muted rounded-full" />
                <div className="col-span-1" />
              </div>
            ))}
          </div>
        )}

        {/* Rows */}
        {!loading && cases.length === 0 && (
          <div className="py-16 text-center">
            <Scale className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              {error ? 'Could not load cases' : 'No cases match your filters'}
            </p>
            <button
              onClick={() => { setSearch(''); setStatusFilter('All'); setTypeFilter('All Types'); setDebouncedSearch(''); }}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && cases.length > 0 && (
          <div className="divide-y divide-border">
            {cases.map((c) => {
              const firstClient = c.clients?.[0]?.client;
              const firstUser = c.users?.[0]?.user;
              return (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group items-center"
                >
                  {/* Case name */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Scale className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {c.title}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {firstClient ? (
                          <>
                            <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-muted-foreground truncate">
                              {firstClient.firstName} {firstClient.lastName}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground font-mono">{c.internalRef}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Type */}
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">
                      {CASE_TYPE_LABELS[c.caseType] ?? c.caseType}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-full',
                      STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600',
                    )}>
                      {CASE_STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </div>

                  {/* Opened date */}
                  <div className="col-span-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{formatDate(c.openDate)}</span>
                  </div>

                  {/* Attorney */}
                  <div className="col-span-1">
                    {firstUser ? (
                      <div
                        className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-semibold"
                        title={`${firstUser.firstName} ${firstUser.lastName}`}
                      >
                        {getInitials(firstUser.firstName, firstUser.lastName)}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Chevron */}
                  <div className="col-span-1 flex items-center justify-end">
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {loading ? 'Loading…' : `${cases.length} of ${meta.total} cases`}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Live data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
