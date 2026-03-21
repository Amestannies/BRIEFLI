'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Client, PaginatedResponse } from '@briefli/shared';

// ─── Types ────────────────────────────────────────────────

export interface CaseRef {
  id: string;
  internalRef: string;
  title: string;
  caseType: string;
  status: string;
  openDate: string;
  expectedCloseDate: string | null;
}

export interface ClientWithRelations extends Client {
  _count: {
    cases: number;
    documents: number;
  };
}

export interface ClientDetail extends Client {
  cases: Array<{
    caseId: string;
    case: CaseRef;
  }>;
  _count: {
    cases: number;
    documents: number;
  };
}

export interface ClientFilters {
  search?: string;
  page?: number;
  limit?: number;
}

// ─── useClients (list) ────────────────────────────────────

export function useClients(filters: ClientFilters = {}) {
  const [data, setData] = useState<ClientWithRelations[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const res = await api.get<PaginatedResponse<ClientWithRelations>>(
        `/clients?${params.toString()}`
      );
      setData(res.data.data);
      setMeta(res.data.meta);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message ?? 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.page, filters.limit]); // eslint-disable-line

  useEffect(() => { fetch(); }, [fetch]);

  return { data, meta, loading, error, refetch: fetch };
}

// ─── useClient (single) ───────────────────────────────────

export function useClient(id: string) {
  const [data, setData] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ClientDetail>(`/clients/${id}`);
      setData(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message ?? 'Client not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Mutations ────────────────────────────────────────────

export async function createClient(body: Record<string, unknown>) {
  const res = await api.post<Client>('/clients', body);
  return res.data;
}

export async function updateClient(id: string, body: Record<string, unknown>) {
  const res = await api.patch<Client>(`/clients/${id}`, body);
  return res.data;
}

export async function deleteClient(id: string) {
  await api.delete(`/clients/${id}`);
}

export async function enablePortal(id: string) {
  const res = await api.post<{ portalToken: string; portalUrl: string }>(`/portal/clients/${id}/enable`);
  return res.data;
}

export async function disablePortal(id: string) {
  const res = await api.post<Client>(`/portal/clients/${id}/disable`);
  return res.data;
}
