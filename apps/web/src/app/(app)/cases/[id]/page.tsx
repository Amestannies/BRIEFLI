'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Scale, MapPin, Building2, User2, Users, Gavel,
  FileText, Clock, CalendarDays, CheckCircle2, Circle,
  ChevronRight, MoreHorizontal, Send, Plus, AlertCircle,
  Briefcase, Phone, Mail, Edit3, Trash2,
} from 'lucide-react';
import { cn } from '@briefli/ui';
import { useCase, useMilestones, useNotes, updateCase, deleteCase } from '@/hooks/useCases';
import { CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@briefli/shared';
import { DocumentVault } from '@/components/documents/document-vault';

// ─── Helpers ──────────────────────────────────────────────

const STATUS_COLORS: Record<string, { pill: string; dot: string }> = {
  INTAKE:        { pill: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  ACTIVE:        { pill: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  PENDING_COURT: { pill: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  JUDGMENT:      { pill: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  APPEAL:        { pill: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  CLOSED:        { pill: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
};

const ALL_STATUSES = ['INTAKE', 'ACTIVE', 'PENDING_COURT', 'JUDGMENT', 'APPEAL', 'CLOSED'];

function formatDate(iso: string | null | undefined, fallback = '—') {
  if (!iso) return fallback;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDate(iso);
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

// ─── Tab definition ───────────────────────────────────────

const TABS = ['Overview', 'Milestones', 'Timeline', 'Documents', 'Billing', 'Calendar'] as const;
type Tab = typeof TABS[number];

// ─── Main component ───────────────────────────────────────

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: caseData, loading, error, refetch } = useCase(id);
  const { data: milestones, loading: milestonesLoading, complete: completeMilestone } = useMilestones(id);
  const { data: notes, loading: notesLoading, addNote } = useNotes(id);
  const [newNote, setNewNote] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // ── Status update ─────────────────────────────────────
  const handleStatusChange = async (newStatus: string) => {
    if (!caseData) return;
    setStatusUpdating(true);
    try {
      await updateCase(id, { status: newStatus });
      await refetch();
    } finally {
      setStatusUpdating(false);
      setEditingStatus(false);
    }
  };

  // ── Delete case ───────────────────────────────────────
  const handleDelete = async () => {
    await deleteCase(id);
    router.push('/cases');
  };

  // ── Add note ──────────────────────────────────────────
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setNoteSubmitting(true);
    try {
      await addNote(newNote.trim());
      setNewNote('');
    } finally {
      setNoteSubmitting(false);
    }
  };

  // ── Loading state ─────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-24 bg-muted rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-5 py-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Could not load case</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[caseData.status] ?? STATUS_COLORS['INTAKE']!;
  const completedMilestones = milestones.filter(m => m.completedAt).length;
  const progressPct = milestones.length ? Math.round((completedMilestones / milestones.length) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Back */}
      <Link
        href="/cases"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All Cases
      </Link>

      {/* Case header */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Scale className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {caseData.internalRef}
                </span>
                {caseData.caseNumber && (
                  <span className="text-xs text-muted-foreground">Court #{caseData.caseNumber}</span>
                )}
              </div>
              <h1
                className="text-2xl font-bold text-foreground leading-tight"
                style={{ fontFamily: 'var(--font-serif, "Playfair Display", Georgia, serif)' }}
              >
                {caseData.title}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {CASE_TYPE_LABELS[caseData.caseType] ?? caseData.caseType}
                {caseData.court && ` · ${caseData.court}`}
              </p>
            </div>
          </div>

          {/* Status + Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => setEditingStatus(!editingStatus)}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all',
                  statusStyle.pill,
                  'hover:ring-2 hover:ring-offset-1 hover:ring-current/30',
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                {CASE_STATUS_LABELS[caseData.status] ?? caseData.status}
              </button>
              {editingStatus && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg py-1 z-10 min-w-[160px]">
                  {ALL_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={statusUpdating}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-muted transition-colors',
                        s === caseData.status && 'font-semibold text-primary',
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_COLORS[s]?.dot)} />
                      {CASE_STATUS_LABELS[s] ?? s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
              title="Delete case"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border">
          {[
            { icon: FileText, label: 'Documents', value: caseData._count.documents },
            { icon: Clock, label: 'Time Entries', value: caseData._count.timeEntries },
            { icon: CalendarDays, label: 'Events', value: caseData._count.events },
            { icon: CheckCircle2, label: 'Milestones', value: `${completedMilestones}/${milestones.length}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-muted p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeTab === tab
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Case details + milestones progress */}
          <div className="lg:col-span-2 space-y-5">

            {/* Case Details */}
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Case Details
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {[
                  { label: 'Internal Ref', value: caseData.internalRef, icon: Scale },
                  { label: 'Case Type', value: CASE_TYPE_LABELS[caseData.caseType], icon: FileText },
                  { label: 'Court', value: caseData.court, icon: Building2 },
                  { label: 'Judge', value: caseData.judge, icon: Gavel },
                  { label: 'Property', value: caseData.propertyAddress, icon: MapPin },
                  { label: 'Opposing Counsel', value: caseData.opposingCounsel, icon: User2 },
                  { label: 'Opened', value: formatDate(caseData.openDate), icon: CalendarDays },
                  { label: 'Expected Close', value: formatDate(caseData.expectedCloseDate), icon: CalendarDays },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                      <Icon className="w-3 h-3" /> {label}
                    </p>
                    <p className={cn('text-sm font-medium', !value && 'text-muted-foreground')}>
                      {value || '—'}
                    </p>
                  </div>
                ))}
              </div>
              {caseData.description && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground leading-relaxed">{caseData.description}</p>
                </div>
              )}
            </div>

            {/* Milestone progress preview */}
            {milestones.length > 0 && (
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" /> Milestones
                  </h2>
                  <button
                    onClick={() => setActiveTab('Milestones')}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{completedMilestones} of {milestones.length} complete</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-3">
                  {milestones.slice(0, 5).map(m => (
                    <div key={m.id} className="flex items-center gap-2.5">
                      {m.completedAt ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={cn(
                        'text-sm',
                        m.completedAt ? 'line-through text-muted-foreground' : 'text-foreground',
                      )}>
                        {m.title}
                      </span>
                      {m.dueDate && !m.completedAt && (
                        <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Due {formatDate(m.dueDate)}
                        </span>
                      )}
                    </div>
                  ))}
                  {milestones.length > 5 && (
                    <p className="text-xs text-muted-foreground pl-6">
                      +{milestones.length - 5} more milestones
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Team + Clients */}
          <div className="space-y-5">

            {/* Team */}
            <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Team
              </h2>
              {caseData.users.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members assigned</p>
              ) : (
                <div className="space-y-3">
                  {caseData.users.map(({ user }) => (
                    <div key={user.id} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {user.role?.toLowerCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clients */}
            <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <User2 className="w-4 h-4 text-primary" /> Client
              </h2>
              {caseData.clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No client linked</p>
              ) : (
                <div className="space-y-4">
                  {caseData.clients.map(({ client }) => (
                    <div key={client.id}>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-[11px] font-semibold flex-shrink-0">
                          {getInitials(client.firstName, client.lastName)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {client.firstName} {client.lastName}
                          </p>
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-[10px] text-primary hover:underline"
                          >
                            View profile →
                          </Link>
                        </div>
                      </div>
                      <div className="space-y-1 pl-1">
                        {client.email && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" /> {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" /> {client.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
              <h2 className="font-semibold text-foreground mb-3 text-sm">Quick Links</h2>
              {[
                { label: 'View Documents', icon: FileText, tab: 'Documents' as Tab },
                { label: 'Log Time / Billing', icon: Clock, tab: 'Billing' as Tab },
                { label: 'Calendar Events', icon: CalendarDays, tab: 'Calendar' as Tab },
              ].map(({ label, icon: Icon, tab }) => (
                <button
                  key={label}
                  onClick={() => setActiveTab(tab)}
                  className="w-full flex items-center justify-between text-sm text-foreground hover:text-primary py-2 border-b border-border last:border-0 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" /> {label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Milestones Tab */}
      {activeTab === 'Milestones' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-foreground">Milestones</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedMilestones} of {milestones.length} complete · {progressPct}%
              </p>
            </div>
            <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {milestonesLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {milestones.map((m, idx) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all',
                    m.completedAt
                      ? 'bg-emerald-50 border-emerald-100'
                      : 'bg-card border-border hover:border-primary/30',
                  )}
                >
                  <button
                    onClick={() => !m.completedAt && completeMilestone(m.id)}
                    disabled={!!m.completedAt}
                    className="flex-shrink-0 transition-transform hover:scale-110 disabled:cursor-default"
                    title={m.completedAt ? 'Completed' : 'Mark complete'}
                  >
                    {m.completedAt ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/40 hover:text-primary transition-colors" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      'text-sm font-medium',
                      m.completedAt ? 'line-through text-muted-foreground' : 'text-foreground',
                    )}>
                      {idx + 1}. {m.title}
                    </span>
                    {m.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {m.completedAt && (
                      <span className="text-[10px] text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                        Done {formatDate(m.completedAt)}
                      </span>
                    )}
                    {m.dueDate && !m.completedAt && (
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                        new Date(m.dueDate) < new Date()
                          ? 'text-destructive bg-destructive/10'
                          : 'text-muted-foreground bg-muted',
                      )}>
                        Due {formatDate(m.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {milestones.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No milestones yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'Timeline' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-foreground mb-5">Case Timeline</h2>

          {/* Add note */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note, update, or internal memo…"
                rows={2}
                className="input-field resize-none text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote();
                }}
              />
            </div>
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || noteSubmitting}
              className={cn(
                'flex-shrink-0 self-end flex items-center gap-1.5 bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-medium',
                'transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <Send className="w-3.5 h-3.5" />
              {noteSubmitting ? 'Posting…' : 'Post'}
            </button>
          </div>

          {/* Notes list */}
          {notesLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-10">
              <Edit3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notes yet. Add the first update above.</p>
            </div>
          ) : (
            <div className="relative space-y-4">
              {/* Connecting line */}
              <div className="absolute left-5 top-4 bottom-4 w-px bg-border" />
              {notes.map(note => (
                <div key={note.id} className="flex gap-4 relative">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 z-10">
                    <User2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 bg-muted/40 rounded-xl p-3.5">
                    <p className="text-sm text-foreground leading-relaxed">{note.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">{timeAgo(note.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documents tab */}
      {activeTab === 'Documents' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <DocumentVault caseId={id} compact />
        </div>
      )}

      {/* Stub tabs */}
      {(activeTab === 'Billing' || activeTab === 'Calendar') && (
        <div className="bg-card border border-border rounded-2xl shadow-sm p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            {activeTab === 'Billing' && <Clock className="w-6 h-6 text-primary" />}
            {activeTab === 'Calendar' && <CalendarDays className="w-6 h-6 text-primary" />}
          </div>
          <h3 className="font-semibold text-foreground mb-1">{activeTab}</h3>
          <p className="text-sm text-muted-foreground">
            {activeTab} management is coming soon as part of the full feature rollout.
          </p>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-border">
            <h3 className="font-bold text-foreground mb-2">Delete case?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              This will soft-delete <strong>{caseData.title}</strong>. This action can be reversed by your administrator.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 border border-border rounded-xl py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-destructive text-white rounded-xl py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
