'use client';

import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Minus, ArrowRight, Clock,
  AlertCircle, Plus, FileText, Users, Calendar,
  Scale, MessageSquare, Upload, CheckCircle2, Circle,
} from 'lucide-react';
import { cn } from '@briefli/ui';

/* ── Data ─────────────────────────────────────────────── */
const STATS = [
  { label: 'Active Cases', value: '24', trend: '+3', trendDir: 'up' as const, trendLabel: 'from last month', accent: 'text-primary', bg: 'bg-primary/8' },
  { label: 'Pending Hearings', value: '7', trend: '+1', trendDir: 'up' as const, trendLabel: 'this week', accent: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Unbilled Hours', value: '42.5', trend: '0', trendDir: 'flat' as const, trendLabel: 'no change', accent: 'text-violet-600', bg: 'bg-violet-50' },
  { label: 'Monthly Revenue', value: '$18,400', trend: '+12%', trendDir: 'up' as const, trendLabel: 'vs last month', accent: 'text-emerald-600', bg: 'bg-emerald-50' },
];

const RECENT_CASES = [
  { id: '1', title: 'Johnson v. Park Ave Properties', client: 'Marcus Johnson', status: 'Active', stage: 'Discovery', updated: '2h ago' },
  { id: '2', title: 'Rivera v. Sunset Apartments', client: 'Elena Rivera', status: 'Active', stage: 'Hearing', updated: 'Yesterday' },
  { id: '3', title: 'Chen v. Oakwood Realty', client: 'Wei Chen', status: 'Active', stage: 'Filing', updated: '2d ago' },
  { id: '4', title: 'Williams v. Metro Housing LLC', client: 'Darius Williams', status: 'Pending', stage: 'Intake', updated: '3d ago' },
  { id: '5', title: 'Garcia v. Hillside Properties', client: 'Sofia Garcia', status: 'Active', stage: 'Negotiation', updated: '4d ago' },
];

const UPCOMING_DEADLINES = [
  { id: '1', title: 'File Answer — Johnson v. Park Ave', date: 'Today, 5:00 PM', type: 'Deadline', urgent: true },
  { id: '2', title: 'Hearing — Rivera v. Sunset', date: 'Tomorrow, 9:30 AM', type: 'Hearing', urgent: true },
  { id: '3', title: 'Discovery Due — Chen v. Oakwood', date: 'Mar 22, 2026', type: 'Deadline', urgent: false },
  { id: '4', title: 'Client Meeting — Williams', date: 'Mar 24, 2026', type: 'Meeting', urgent: false },
  { id: '5', title: 'Motion Filing — Garcia v. Hillside', date: 'Mar 25, 2026', type: 'Filing', urgent: false },
];

const ACTIVITY = [
  { id: '1', icon: FileText, color: 'text-primary bg-primary/10', text: 'Answer filed in Johnson v. Park Ave', time: '1h ago' },
  { id: '2', icon: MessageSquare, color: 'text-violet-600 bg-violet-50', text: 'Client message from Elena Rivera', time: '3h ago' },
  { id: '3', icon: Upload, color: 'text-emerald-600 bg-emerald-50', text: 'Document uploaded: Lease Agreement — Chen', time: '5h ago' },
  { id: '4', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', text: 'Milestone completed: Initial Intake — Williams', time: 'Yesterday' },
  { id: '5', icon: Calendar, color: 'text-amber-600 bg-amber-50', text: 'Hearing scheduled: Rivera v. Sunset — Mar 21', time: 'Yesterday' },
  { id: '6', icon: Users, color: 'text-primary bg-primary/10', text: 'New client added: Sofia Garcia', time: '2d ago' },
];

const PIPELINE = [
  { stage: 'Intake', count: 4, color: 'bg-gray-400' },
  { stage: 'Filing', count: 6, color: 'bg-primary' },
  { stage: 'Discovery', count: 5, color: 'bg-violet-500' },
  { stage: 'Hearing', count: 7, color: 'bg-amber-500' },
  { stage: 'Negotiation', count: 3, color: 'bg-emerald-500' },
  { stage: 'Closed', count: 12, color: 'bg-gray-300' },
];

const QUICK_ACTIONS = [
  { label: 'New Case', href: '/cases/new', icon: Scale, color: 'bg-primary/10 text-primary hover:bg-primary hover:text-white' },
  { label: 'Add Client', href: '/clients', icon: Users, color: 'bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white' },
  { label: 'Log Time', href: '/billing/time-entries', icon: Clock, color: 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white' },
  { label: 'Add Event', href: '/calendar', icon: Calendar, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white' },
];

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Closed: 'bg-gray-100 text-gray-600',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  Deadline: 'bg-red-100 text-red-700',
  Hearing: 'bg-primary/10 text-primary',
  Meeting: 'bg-violet-100 text-violet-700',
  Filing: 'bg-amber-100 text-amber-700',
};

function TrendIcon({ dir }: { dir: 'up' | 'down' | 'flat' }) {
  if (dir === 'up') return <TrendingUp className="w-3.5 h-3.5" />;
  if (dir === 'down') return <TrendingDown className="w-3.5 h-3.5" />;
  return <Minus className="w-3.5 h-3.5" />;
}

/* ── Page ─────────────────────────────────────────────── */
export default function DashboardPage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const total = PIPELINE.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-7 max-w-7xl mx-auto">

      {/* Header + Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground leading-tight" style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}>
            {greeting}, Counselor.
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {QUICK_ACTIONS.map(({ label, href, icon: Icon, color }) => (
            <Link key={label} href={href} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150', color)}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{stat.label}</p>
            <p className={cn('text-3xl font-bold mb-3', stat.accent)}>{stat.value}</p>
            <div className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', stat.bg, stat.accent)}>
              <TrendIcon dir={stat.trendDir} />
              <span>{stat.trend} {stat.trendLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}>
            Case Pipeline
          </h2>
          <span className="text-xs text-muted-foreground">{total} total cases</span>
        </div>
        <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-4">
          {PIPELINE.map(({ stage, count, color }) => (
            <div key={stage} className={cn('rounded-full transition-all', color)} style={{ width: `${(count / total) * 100}%` }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {PIPELINE.map(({ stage, count, color }) => (
            <div key={stage} className="flex items-center gap-1.5">
              <div className={cn('w-2.5 h-2.5 rounded-full', color)} />
              <span className="text-xs text-muted-foreground">{stage}</span>
              <span className="text-xs font-semibold text-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Three-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Cases */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}>Recent Cases</h2>
            <Link href="/cases" className="text-xs text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {RECENT_CASES.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/50 transition-colors group">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Scale className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.client} · {c.updated}</p>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5', STATUS_COLORS[c.status])}>
                  {c.stage}
                </span>
              </Link>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-border bg-muted/20">
            <Link href="/cases/new" className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
              <Plus className="w-3.5 h-3.5" /> New case
            </Link>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}>Upcoming Deadlines</h2>
            <Link href="/calendar" className="text-xs text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Calendar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {UPCOMING_DEADLINES.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                <div className={cn('mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center', item.urgent ? 'bg-red-100' : 'bg-muted')}>
                  {item.urgent
                    ? <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className={cn('text-xs mt-0.5', item.urgent ? 'text-red-600 font-medium' : 'text-muted-foreground')}>{item.date}</p>
                </div>
                <span className={cn('flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full', EVENT_TYPE_COLORS[item.type])}>
                  {item.type}
                </span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-border bg-muted/20">
            <Link href="/calendar" className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
              <Plus className="w-3.5 h-3.5" /> Add event
            </Link>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}>Activity Feed</h2>
          </div>
          <div className="divide-y divide-border">
            {ACTIVITY.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3 relative">
                  {/* Connecting line */}
                  {i < ACTIVITY.length - 1 && (
                    <div className="absolute left-[2.35rem] top-10 bottom-0 w-px bg-border" />
                  )}
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10', item.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-border bg-muted/20">
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
              <Circle className="w-3.5 h-3.5" /> Load more
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
