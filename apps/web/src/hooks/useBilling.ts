'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'VOID';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface InvoiceCase {
  id: string;
  title: string;
  internalRef: string;
  status?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  firmId: string;
  caseId: string;
  clientId: string;
  status: InvoiceStatus;
  subtotal: string;
  tax: string;
  total: string;
  dueDate: string;
  paidAt: string | null;
  stripePaymentId: string | null;
  lineItems: InvoiceLineItem[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  case: InvoiceCase | null;
  client: InvoiceClient | null;
}

export interface TimeEntryUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface TimeEntryCase {
  id: string;
  title: string;
  internalRef: string;
}

export interface TimeEntry {
  id: string;
  firmId: string;
  caseId: string;
  userId: string;
  description: string;
  durationMinutes: number;
  hourlyRate: string;
  isBillable: boolean;
  invoiceId: string | null;
  date: string;
  createdAt: string;
  user: TimeEntryUser;
  case: TimeEntryCase | null;
}

export interface BillingSummary {
  outstanding: { total: number; count: number };
  paidThisMonth: { total: number; count: number };
  unbilledHours: number;
  unbilledValue: number;
  overdueInvoices: Array<{
    id: string;
    invoiceNumber: string;
    total: string;
    dueDate: string;
    clientId: string;
  }>;
}

export interface TimeEntryFilters {
  caseId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  billable?: 'true' | 'false';
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  clientId?: string;
}

export interface CreateTimeEntryInput {
  caseId: string;
  description: string;
  durationMinutes: number;
  hourlyRate: number;
  isBillable?: boolean;
  date: string; // ISO string
}

export interface CreateInvoiceInput {
  caseId: string;
  clientId: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax?: number;
  total: number;
  dueDate: string; // ISO string
  notes?: string;
}

// ─── Billing Summary ──────────────────────────────────────────────────────────

export function useBillingSummary() {
  const [data, setData] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<BillingSummary>('/billing/summary');
      setData(res.data);
    } catch {
      setError('Failed to load billing summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Time Entries ─────────────────────────────────────────────────────────────

export function useTimeEntries(filters: TimeEntryFilters = {}) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get<TimeEntry[]>(`/time-entries?${params.toString()}`);
      setEntries(res.data);
    } catch {
      setError('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetch(); }, [fetch]);

  return { entries, loading, error, refetch: fetch };
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export function useInvoices(filters: InvoiceFilters = {}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get<Invoice[]>(`/invoices?${params.toString()}`);
      setInvoices(res.data);
    } catch {
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetch(); }, [fetch]);

  return { invoices, loading, error, refetch: fetch };
}

export function useInvoice(id: string) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Invoice>(`/invoices/${id}`);
      setInvoice(res.data);
    } catch {
      setError('Invoice not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { invoice, loading, error, refetch: fetch };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createTimeEntry(data: CreateTimeEntryInput): Promise<TimeEntry> {
  const res = await api.post<TimeEntry>('/time-entries', data);
  return res.data;
}

export async function updateTimeEntry(id: string, data: Partial<CreateTimeEntryInput>): Promise<TimeEntry> {
  const res = await api.patch<TimeEntry>(`/time-entries/${id}`, data);
  return res.data;
}

export async function deleteTimeEntry(id: string): Promise<void> {
  await api.delete(`/time-entries/${id}`);
}

export async function createInvoice(data: CreateInvoiceInput): Promise<Invoice> {
  const res = await api.post<Invoice>('/invoices', data);
  return res.data;
}

export async function updateInvoice(id: string, data: Partial<CreateInvoiceInput>): Promise<Invoice> {
  const res = await api.patch<Invoice>(`/invoices/${id}`, data);
  return res.data;
}

export async function sendInvoice(id: string): Promise<Invoice> {
  const res = await api.post<Invoice>(`/invoices/${id}/send`);
  return res.data;
}

export async function voidInvoice(id: string): Promise<Invoice> {
  const res = await api.post<Invoice>(`/invoices/${id}/void`);
  return res.data;
}

export async function createStripeCheckout(id: string): Promise<{ url: string }> {
  const res = await api.post<{ url: string }>(`/invoices/${id}/stripe/checkout`);
  return res.data;
}
