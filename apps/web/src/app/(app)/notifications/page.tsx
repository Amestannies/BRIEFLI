'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  BellOff,
  CheckCheck,
  Calendar,
  Building2,
  MessageCircle,
  FileText,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  Settings,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; label: string; category: string }
> = {
  EVENT_REMINDER: {
    icon: Calendar,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    label: 'Event Reminder',
    category: 'Calendar',
  },
  ECOURTS_DOCKET_UPDATE: {
    icon: Building2,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    label: 'eCourts Update',
    category: 'eCourts',
  },
  PORTAL_MESSAGE: {
    icon: MessageCircle,
    color: 'text-green-600',
    bg: 'bg-green-100',
    label: 'Client Message',
    category: 'Client Portal',
  },
  CLIENT_DOCUMENT_UPLOADED: {
    icon: FileText,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    label: 'Document Uploaded',
    category: 'Client Portal',
  },
  DOCUMENT_UPLOADED: {
    icon: FileText,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    label: 'Document Uploaded',
    category: 'Documents',
  },
  INVOICE_PAID: {
    icon: DollarSign,
    color: 'text-green-600',
    bg: 'bg-green-100',
    label: 'Invoice Paid',
    category: 'Billing',
  },
  INVOICE_OVERDUE: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-100',
    label: 'Invoice Overdue',
    category: 'Billing',
  },
  MILESTONE_OVERDUE: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-100',
    label: 'Milestone Overdue',
    category: 'Cases',
  },
  NOTARIZATION_COMPLETE: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-100',
    label: 'Notarization Complete',
    category: 'Documents',
  },
};

const FALLBACK_CONFIG = {
  icon: Bell,
  color: 'text-gray-500',
  bg: 'bg-gray-100',
  label: 'Notification',
  category: 'General',
};

const CATEGORIES = ['All', 'Calendar', 'eCourts', 'Client Portal', 'Billing', 'Cases', 'Documents'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotificationRow({
  notif,
  onMarkRead,
}: {
  notif: Notification;
  onMarkRead: (id: string) => void;
}) {
  const router = useRouter();
  const config = TYPE_CONFIG[notif.type] ?? FALLBACK_CONFIG;
  const Icon = config.icon;

  function handleClick() {
    if (!notif.isRead) onMarkRead(notif.id);
    if (notif.link) router.push(notif.link);
  }

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-start gap-4 px-5 py-4 transition-colors border-b border-border last:border-0
        ${notif.isRead ? 'bg-white' : 'bg-blue-50/40'}
        ${notif.link ? 'cursor-pointer hover:bg-gray-50' : ''}
      `}
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${config.bg}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={`text-[10px] font-bold uppercase tracking-wide ${config.color}`}>
                {config.label}
              </span>
              {!notif.isRead && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B4ECC] flex-shrink-0" />
              )}
            </div>
            <p className={`text-sm font-medium leading-snug ${notif.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
              {notif.title}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
              {notif.body}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-gray-400 whitespace-nowrap flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(notif.createdAt)}
            </span>
            {notif.link && (
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Notification[]>('/notifications');
      setNotifications(res.data);
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`).catch(() => null);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  async function markAllRead() {
    setMarkingAll(true);
    await api.patch('/notifications/read-all').catch(() => null);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setMarkingAll(false);
  }

  // Filter by category
  const filtered = notifications.filter((n) => {
    if (activeCategory === 'All') return true;
    const config = TYPE_CONFIG[n.type] ?? FALLBACK_CONFIG;
    return config.category === activeCategory;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Category counts
  const categoryCounts: Record<string, number> = { All: notifications.filter(n => !n.isRead).length };
  notifications.forEach((n) => {
    const cat = (TYPE_CONFIG[n.type] ?? FALLBACK_CONFIG).category;
    if (!n.isRead) categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  });

  return (
    <div className="max-w-3xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Notification Center
            {unreadCount > 0 && (
              <span className="text-sm font-semibold bg-[#3B4ECC] text-white rounded-full px-2.5 py-0.5">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All your eCourts, calendar, client, and billing alerts in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#3B4ECC] border border-[#3B4ECC]/30 rounded-lg hover:bg-[#3B4ECC]/5 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
          <Link
            href="/settings/notifications"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 border border-border rounded-lg hover:bg-gray-50 transition-colors"
            title="Notification settings"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </Link>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => {
          const count = categoryCounts[cat] ?? 0;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-[#3B4ECC] text-white'
                  : 'bg-white border border-border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#3B4ECC]/10 text-[#3B4ECC]'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-2.5 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {activeCategory === 'All' ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <BellOff className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">All caught up</p>
                <p className="text-xs text-gray-400 max-w-xs">
                  No notifications yet. eCourts updates, calendar reminders, client messages, and billing alerts will appear here.
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <Inbox className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">No {activeCategory} notifications</p>
                <p className="text-xs text-gray-400">Nothing in this category yet.</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Unread section */}
            {filtered.some((n) => !n.isRead) && (
              <>
                <div className="px-5 py-2 bg-gray-50 border-b border-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Unread</p>
                </div>
                {filtered.filter((n) => !n.isRead).map((notif) => (
                  <NotificationRow key={notif.id} notif={notif} onMarkRead={markRead} />
                ))}
              </>
            )}

            {/* Read section */}
            {filtered.some((n) => n.isRead) && (
              <>
                <div className="px-5 py-2 bg-gray-50 border-b border-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Earlier</p>
                </div>
                {filtered.filter((n) => n.isRead).map((notif) => (
                  <NotificationRow key={notif.id} notif={notif} onMarkRead={markRead} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Showing {filtered.length} notification{filtered.length !== 1 ? 's' : ''} · Last 50 total
        </p>
      )}
    </div>
  );
}
