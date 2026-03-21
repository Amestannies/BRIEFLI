'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: 'COURT_HEARING' | 'DEADLINE' | 'MEETING' | 'DEPOSITION' | 'TASK';
  startTime: string;
  endTime: string;
  location?: string;
  isAllDay: boolean;
  caseId?: string;
  source: 'manual' | 'google' | 'outlook' | 'ecourts';
  case?: { id: string; title: string; internalRef: string } | null;
}

export interface EcourtNotification {
  id: string;
  title: string;
  body: string;
  court?: string;
  docketNumber?: string;
  eventDate?: string;
  category?: string;
  importedToCalendar: boolean;
  createdAt: string;
}

export interface IntegrationStatus {
  google: { connected: boolean };
  outlook: { connected: boolean };
  ecourts: { connected: boolean; username?: string; lastSync?: string };
}

export interface CalendarEventFilters {
  start?: string;
  end?: string;
  eventType?: string;
  source?: string;
  caseId?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

export const EVENT_TYPE_COLORS: Record<
  CalendarEvent['eventType'],
  { bg: string; text: string; dot: string; border: string }
> = {
  COURT_HEARING: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' },
  DEADLINE: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200' },
  MEETING: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200' },
  DEPOSITION: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', border: 'border-purple-200' },
  TASK: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400', border: 'border-gray-200' },
};

export const SOURCE_LABELS: Record<CalendarEvent['source'], string> = {
  manual: 'Manual',
  google: 'Google',
  outlook: 'Outlook',
  ecourts: 'NY eCourts',
};

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Returns all calendar days for the grid representing the given month.
 * Pads with days from the previous and next month so the first day starts on Sunday.
 */
export function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Pad start: days from previous month to fill week from Sunday
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.unshift(new Date(year, month, -i));
  }
  days.reverse();

  // Days in current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Pad end: days from next month to fill remaining week slots
  const remaining = 42 - days.length; // 6 rows × 7 cols
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useCalendarEvents(filters: CalendarEventFilters) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filters.start) params.start = filters.start;
      if (filters.end) params.end = filters.end;
      if (filters.eventType) params.eventType = filters.eventType;
      if (filters.source) params.source = filters.source;
      if (filters.caseId) params.caseId = filters.caseId;

      const res = await api.get<CalendarEvent[]>('/calendar/events', { params });
      setEvents(res.data);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [filters.start, filters.end, filters.eventType, filters.source, filters.caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

export function useUpcomingEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcoming = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<CalendarEvent[]>('/calendar/upcoming');
      setEvents(res.data);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to load upcoming events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpcoming();
  }, [fetchUpcoming]);

  return { events, loading, error, refetch: fetchUpcoming };
}

export function useIntegrationStatus() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<IntegrationStatus>('/calendar/integrations/status');
      setStatus(res.data);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to load integration status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { status, loading, error, refetch };
}

export function useEcourtsNotifications() {
  const [notifications, setNotifications] = useState<EcourtNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<EcourtNotification[]>('/ecourts/notifications');
      setNotifications(res.data);
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to load eCourts notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { notifications, loading, error, refetch: fetchNotifications };
}

export function useCalendarMutations() {
  const createEvent = useCallback(async (data: Omit<CalendarEvent, 'id' | 'source' | 'case'>): Promise<CalendarEvent> => {
    const res = await api.post<CalendarEvent>('/calendar/events', data);
    return res.data;
  }, []);

  const updateEvent = useCallback(async (id: string, data: Partial<Omit<CalendarEvent, 'id'>>): Promise<CalendarEvent> => {
    const res = await api.patch<CalendarEvent>(`/calendar/events/${id}`, data);
    return res.data;
  }, []);

  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/calendar/events/${id}`);
  }, []);

  const syncGoogle = useCallback(async (): Promise<{ synced: number }> => {
    const res = await api.post<{ synced: number }>('/calendar/google/sync');
    return res.data;
  }, []);

  const syncOutlook = useCallback(async (): Promise<{ synced: number }> => {
    const res = await api.post<{ synced: number }>('/calendar/outlook/sync');
    return res.data;
  }, []);

  const connectGoogle = useCallback(async (): Promise<void> => {
    const res = await api.post<{ url: string }>('/calendar/google/connect');
    if (res.data?.url) {
      window.open(res.data.url, '_blank');
    }
  }, []);

  const connectOutlook = useCallback(async (): Promise<void> => {
    const res = await api.post<{ url: string }>('/calendar/outlook/connect');
    if (res.data?.url) {
      window.open(res.data.url, '_blank');
    }
  }, []);

  const disconnectGoogle = useCallback(async (): Promise<void> => {
    await api.post('/calendar/google/disconnect');
  }, []);

  const disconnectOutlook = useCallback(async (): Promise<void> => {
    await api.post('/calendar/outlook/disconnect');
  }, []);

  const storeEcourtsCredentials = useCallback(async (username: string, password: string): Promise<void> => {
    await api.post('/ecourts/credentials', { username, password });
  }, []);

  const removeEcourtsCredentials = useCallback(async (): Promise<void> => {
    await api.delete('/ecourts/credentials');
  }, []);

  const syncEcourts = useCallback(async (): Promise<{ fetched: number; newNotifications: number; calendarEventsCreated: number }> => {
    const res = await api.post<{ fetched: number; newNotifications: number; calendarEventsCreated: number }>(
      '/ecourts/notifications/sync'
    );
    return res.data;
  }, []);

  const importEcourtsNotification = useCallback(async (id: string): Promise<void> => {
    await api.post(`/ecourts/notifications/${id}/import`);
  }, []);

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    syncGoogle,
    syncOutlook,
    connectGoogle,
    connectOutlook,
    disconnectGoogle,
    disconnectOutlook,
    storeEcourtsCredentials,
    removeEcourtsCredentials,
    syncEcourts,
    importEcourtsNotification,
  };
}
