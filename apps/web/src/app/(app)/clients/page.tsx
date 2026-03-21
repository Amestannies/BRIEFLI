'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Mail, Phone, Briefcase, MapPin,
  ChevronRight, Users, RefreshCw, AlertCircle,
  LayoutGrid, List,
} from 'lucide-react';
import { cn } from '@briefli/ui';
import { useClients } from '@/hooks/useClients';

// ─── Avatar color palette (deterministic by id) ──────────

const AVATAR_COLORS = [
  'bg-primary',        // blue
  'bg-violet-500',     // violet
  'bg-emerald-500',    // green
  'bg-amber-500',      // amber
  'bg-rose-500',       // rose
  'bg-indigo-500',     // indigo
  'bg-teal-500',       // teal
  'bg-orange-500',     // orange
];

function avatarColor(id: string) {
  const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

// ─── New Client slide-over form ───────────────────────────

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateClientSchema, type CreateClientInput } from '@briefli/shared';
import { createClient } from '@/hooks/useClients';

function NewClientPanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(CreateClientSchema),
    defaultValues: { preferredLang: 'en' },
  });

  const onSubmit = async (data: CreateClientInput) => {
    setServerError(null);
    try {
      await createClient(data as unknown as Record<string, unknown>);
      onCreated();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setServerError(e.response?.data?.error?.message ?? 'Failed to create client');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-lg"
              style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
            >
              New Client
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Add a client to your firm</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                First Name <span className="text-destructive">*</span>
              </label>
              <input
                {...register('firstName')}
                type="text"
                placeholder="Jane"
                className={cn('input-field', errors.firstName && 'border-destructive')}
              />
              {errors.firstName && (
                <p className="text-destructive text-xs mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Last Name <span className="text-destructive">*</span>
              </label>
              <input
                {...register('lastName')}
                type="text"
                placeholder="Smith"
                className={cn('input-field', errors.lastName && 'border-destructive')}
              />
              {errors.lastName && (
                <p className="text-destructive text-xs mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email Address <span className="text-destructive">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="jane@example.com"
              className={cn('input-field', errors.email && 'border-destructive')}
            />
            {errors.email && (
              <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="(212) 555-0100"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Address</label>
            <input
              {...register('address')}
              type="text"
              placeholder="123 Main St, New York, NY 10001"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Preferred Language</label>
            <select {...register('preferredLang')} className="input-field">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="zh">Chinese</option>
              <option value="ar">Arabic</option>
            </select>
          </div>

          {serverError && (
            <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3">
              {serverError}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-border rounded-full py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            form="new-client-form"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className={cn(
              'flex-1 bg-primary text-white rounded-full py-2.5 text-sm font-semibold',
              'transition-all hover:opacity-90 disabled:opacity-60',
            )}
          >
            {isSubmitting ? 'Creating…' : 'Create Client'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showNewPanel, setShowNewPanel] = useState(false);

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as unknown as { _cst?: ReturnType<typeof setTimeout> })._cst);
    (window as unknown as { _cst?: ReturnType<typeof setTimeout> })._cst = setTimeout(() => {
      setDebouncedSearch(val);
    }, 300);
  };

  const filters = useMemo(() => ({
    ...(debouncedSearch && { search: debouncedSearch }),
  }), [debouncedSearch]);

  const { data: clients, meta, loading, error, refetch } = useClients(filters);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
          >
            Clients
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? 'Loading…' : `${meta.total} total clients`}
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
          <button
            onClick={() => setShowNewPanel(true)}
            className="inline-flex items-center gap-2 bg-primary text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> New Client
          </button>
        </div>
      </div>

      {/* Search + View toggle */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 flex-shrink-0">
          <button
            onClick={() => setView('grid')}
            className={cn(
              'p-2 rounded-md transition-colors',
              view === 'grid' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground',
            )}
            title="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              'p-2 rounded-md transition-colors',
              view === 'list' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground',
            )}
            title="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={refetch} className="ml-auto underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className={cn(
          view === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-2',
        )}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid view */}
      {!loading && view === 'grid' && clients.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group block"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0',
                  avatarColor(client.id),
                )}>
                  {getInitials(client.firstName, client.lastName)}
                </div>
                <div className="flex items-center gap-2">
                  {client.portalEnabled && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Portal
                    </span>
                  )}
                  {client._count.cases > 0 ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      New
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-sm font-semibold text-foreground mb-0.5 group-hover:text-primary transition-colors">
                {client.firstName} {client.lastName}
              </h3>

              <div className="space-y-1.5 mt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Briefcase className="w-3 h-3" />
                  <span>{client._count.cases} {client._count.cases === 1 ? 'case' : 'cases'}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && view === 'list' && clients.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            <div className="col-span-3">Client</div>
            <div className="col-span-3">Contact</div>
            <div className="col-span-3">Address</div>
            <div className="col-span-2">Cases</div>
            <div className="col-span-1" />
          </div>
          <div className="divide-y divide-border">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group items-center"
              >
                <div className="col-span-3 flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0',
                    avatarColor(client.id),
                  )}>
                    {getInitials(client.firstName, client.lastName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {client.firstName} {client.lastName}
                    </p>
                    {client.portalEnabled && (
                      <span className="text-[10px] font-semibold text-blue-600">Portal enabled</span>
                    )}
                  </div>
                </div>
                <div className="col-span-3 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />{client.phone}
                    </div>
                  )}
                </div>
                <div className="col-span-3 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                  {client.address ? (
                    <><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{client.address}</span></>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </div>
                <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Briefcase className="w-3 h-3" />
                  {client._count.cases} {client._count.cases === 1 ? 'case' : 'cases'}
                </div>
                <div className="col-span-1 flex justify-end">
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">{clients.length} of {meta.total} clients</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && clients.length === 0 && !error && (
        <div className="bg-card border border-border rounded-xl py-16 text-center shadow-sm">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {debouncedSearch ? 'No clients match your search' : 'No clients yet'}
          </p>
          {debouncedSearch ? (
            <button
              onClick={() => { setSearch(''); setDebouncedSearch(''); }}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Clear search
            </button>
          ) : (
            <button
              onClick={() => setShowNewPanel(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add your first client
            </button>
          )}
        </div>
      )}

      {/* New client panel */}
      {showNewPanel && (
        <NewClientPanel
          onClose={() => setShowNewPanel(false)}
          onCreated={refetch}
        />
      )}
    </div>
  );
}
