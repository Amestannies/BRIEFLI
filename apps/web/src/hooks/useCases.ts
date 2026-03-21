'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Case, Milestone, PaginatedResponse } from '@briefli/shared';

// ─── Types ────────────────────────────────────────────────

export interface CaseWithRelations extends Case {
  users: Array<{
    userId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
      avatarUrl: string | null;
    };
  }>;
  clients: Array<{
    clientId: string;
    client: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
  }>;
  milestones: Milestone[];
  _count: {
    documents: number;
    timeEntries: number;
    events: number;
  };
}

export interface CaseNote {
  id: string;
  caseId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface CaseFilters {
  status?: string;
  caseType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── useCases (list) ──────────────────────────────────────

export function useCases(filters: CaseFilters = {}) {
  const [data, setData] = useState<CaseWithRelations[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.caseType) params.set('caseType', filters.caseType);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const res = await api.get<PaginatedResponse<CaseWithRelations>>(
        `/cases?${params.toString()}`
      );
      setData(res.data.data);
      setMeta(res.data.meta);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message ?? 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.caseType, filters.search, filters.page, filters.limit]); // eslint-disable-line

  useEffect(() => { fetch(); }, [fetch]);

  return { data, meta, loading, error, refetch: fetch };
}

// ─── useCase (single) ─────────────────────────────────────

export function useCase(id: string) {
  const [data, setData] = useState<CaseWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<CaseWithRelations>(`/cases/${id}`);
      setData(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message ?? 'Case not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── useMilestones ────────────────────────────────────────

export function useMilestones(caseId: string) {
  const [data, setData] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!caseId) return;
    try {
      const res = await api.get<Milestone[]>(`/cases/${caseId}/milestones`);
      setData(res.data);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { fetch(); }, [fetch]);

  const complete = async (milestoneId: string) => {
    await api.post(`/cases/${caseId}/milestones/${milestoneId}/complete`);
    await fetch();
  };

  return { data, loading, complete, refetch: fetch };
}

// ─── useNotes ─────────────────────────────────────────────

export function useNotes(caseId: string) {
  const [data, setData] = useState<CaseNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!caseId) return;
    try {
      const res = await api.get<CaseNote[]>(`/cases/${caseId}/notes`);
      setData(res.data);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addNote = async (body: string) => {
    await api.post(`/cases/${caseId}/notes`, { body });
    await fetch();
  };

  return { data, loading, addNote, refetch: fetch };
}

// ─── Mutation helpers ─────────────────────────────────────

export async function createCase(body: Record<string, unknown>) {
  const res = await api.post<Case>('/cases', body);
  return res.data;
}

export async function updateCase(id: string, body: Record<string, unknown>) {
  const res = await api.patch<Case>(`/cases/${id}`, body);
  return res.data;
}

export async function deleteCase(id: string) {
  await api.delete(`/cases/${id}`);
}
