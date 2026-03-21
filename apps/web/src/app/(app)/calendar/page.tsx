'use client';

import { useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  RefreshCw,
  Link2,
  Unlink,
  Calendar,
  AlertCircle,
  ExternalLink,
  Clock,
  GripVertical,
  Building2,
} from 'lucide-react';
import {
  useCalendarEvents,
  useIntegrationStatus,
  useEcourtsNotifications,
  useCalendarMutations,
  getMonthDays,
  EVENT_TYPE_COLORS,
  type CalendarEvent,
  type EcourtNotification,
  type IntegrationStatus,
} from '@/hooks/useCalendar';

// ─── Utility helpers ────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const EVENT_TYPE_OPTIONS: CalendarEvent['eventType'][] = [
  'COURT_HEARING','DEADLINE','MEETING','DEPOSITION','TASK',
];
const EVENT_TYPE_LABELS: Record<CalendarEvent['eventType'], string> = {
  COURT_HEARING: 'Court Hearing',
  DEADLINE: 'Deadline',
  MEETING: 'Meeting',
  DEPOSITION: 'Deposition',
  TASK: 'Task',
};

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + 1);
  return d;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(new Date(e.startTime), day));
}

/** Shift an event's start/end to a new date, preserving time-of-day and duration */
function shiftEventToDate(event: CalendarEvent, newDate: Date): { startTime: string; endTime: string } {
  const oldStart = new Date(event.startTime);
  const oldEnd   = new Date(event.endTime);
  const duration = oldEnd.getTime() - oldStart.getTime();

  const newStart = new Date(newDate);
  newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), oldStart.getSeconds(), 0);
  const newEnd = new Date(newStart.getTime() + duration);
  return { startTime: newStart.toISOString(), endTime: newEnd.toISOString() };
}

// ─── Event Chip (draggable) ──────────────────────────────────────────────────────

function EventChip({
  event,
  onClick,
  onDragStart,
  isDragTarget,
}: {
  event: CalendarEvent;
  onClick: (e: CalendarEvent) => void;
  onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
  isDragTarget?: boolean;
}) {
  const colors = EVENT_TYPE_COLORS[event.eventType]!;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, event)}
      onClick={(ev) => { ev.stopPropagation(); onClick(event); }}
      className={`
        w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium cursor-grab active:cursor-grabbing
        ${colors.bg} ${colors.text} border ${colors.border}
        hover:opacity-80 transition-opacity select-none
        ${isDragTarget ? 'opacity-40' : ''}
      `}
      title={event.title}
    >
      <span className="flex items-center gap-1">
        <GripVertical className="w-2.5 h-2.5 opacity-40 flex-shrink-0" />
        <span className="truncate">{event.title}</span>
      </span>
    </div>
  );
}

// ─── Month View ──────────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  events,
  onDayClick,
  onEventClick,
  onNavigate,
  onEventDrop,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onNavigate: (dir: -1 | 1) => void;
  onEventDrop: (eventId: string, newDate: Date) => void;
}) {
  const today  = new Date();
  const year   = currentDate.getFullYear();
  const month  = currentDate.getMonth();
  const days   = getMonthDays(year, month);

  const draggedEventRef = useRef<CalendarEvent | null>(null);
  const [dragOverKey, setDragOverKey]  = useState<string | null>(null);
  const [draggingId,  setDraggingId]   = useState<string | null>(null);

  function handleDragStart(e: React.DragEvent, event: CalendarEvent) {
    draggedEventRef.current = event;
    setDraggingId(event.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  }

  function handleDragEnd() {
    draggedEventRef.current = null;
    setDraggingId(null);
    setDragOverKey(null);
  }

  function handleDragOver(e: React.DragEvent, key: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverKey(key);
  }

  function handleDragLeave(e: React.DragEvent, key: string) {
    // Only clear if leaving the cell itself (not a child element)
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverKey((prev) => (prev === key ? null : prev));
    }
  }

  function handleDrop(e: React.DragEvent, day: Date) {
    e.preventDefault();
    setDragOverKey(null);
    const ev = draggedEventRef.current;
    if (!ev) return;
    // Don't drop on same day
    if (isSameDay(new Date(ev.startTime), day)) return;
    onEventDrop(ev.id, day);
    draggedEventRef.current = null;
    setDraggingId(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <button
          onClick={() => onNavigate(-1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          onClick={() => onNavigate(1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1 flex-shrink-0">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 flex-1 border-t border-l border-border">
        {days.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday        = isSameDay(day, today);
          const dayEvents      = eventsForDay(events, day);
          const overflowCount  = dayEvents.length > 3 ? dayEvents.length - 3 : 0;
          const visibleEvents  = dayEvents.slice(0, 3);
          const dayKey         = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const isDropTarget   = dragOverKey === dayKey;

          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              onDragOver={(e) => handleDragOver(e, dayKey)}
              onDragLeave={(e) => handleDragLeave(e, dayKey)}
              onDrop={(e) => handleDrop(e, day)}
              className={`
                border-r border-b border-border min-h-[90px] p-1 cursor-pointer transition-colors
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${isDropTarget
                  ? 'bg-[#3B4ECC]/8 ring-2 ring-inset ring-[#3B4ECC]/40'
                  : 'hover:bg-gray-50'}
              `}
            >
              <div className="flex items-center justify-end mb-1">
                <span
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-[#3B4ECC] text-white font-semibold' : 'text-gray-700'
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {visibleEvents.map((ev) => (
                  <EventChip
                    key={ev.id}
                    event={ev}
                    onClick={onEventClick}
                    onDragStart={handleDragStart}
                    isDragTarget={draggingId === ev.id}
                  />
                ))}
                {overflowCount > 0 && (
                  <p className="text-xs text-gray-500 pl-1">+{overflowCount} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drag hint */}
      {draggingId && (
        <p className="text-center text-xs text-[#3B4ECC] mt-2 flex-shrink-0 animate-pulse">
          Drop on any day to reschedule
        </p>
      )}
    </div>
  );
}

// ─── Week View ───────────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  events,
  onEventClick,
  onNavigate,
  onEventDrop,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onNavigate: (dir: -1 | 1) => void;
  onEventDrop: (eventId: string, newDate: Date) => void;
}) {
  const monday   = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const weekStart = weekDays[0]!;
  const weekEnd   = weekDays[6]!;
  const today     = new Date();

  const draggedEventRef = useRef<CalendarEvent | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggingId,  setDraggingId]  = useState<string | null>(null);

  function handleDragStart(e: React.DragEvent, event: CalendarEvent) {
    draggedEventRef.current = event;
    setDraggingId(event.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  }

  function handleDragEnd() {
    draggedEventRef.current = null;
    setDraggingId(null);
    setDragOverKey(null);
  }

  function handleDragOver(e: React.DragEvent, key: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverKey(key);
  }

  function handleDragLeave(e: React.DragEvent, key: string) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverKey((prev) => (prev === key ? null : prev));
    }
  }

  function handleDrop(e: React.DragEvent, day: Date) {
    e.preventDefault();
    setDragOverKey(null);
    const ev = draggedEventRef.current;
    if (!ev) return;
    if (isSameDay(new Date(ev.startTime), day)) return;
    onEventDrop(ev.id, day);
    draggedEventRef.current = null;
    setDraggingId(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Week nav */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <button
          onClick={() => onNavigate(-1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          {MONTH_NAMES[weekStart.getMonth()]} {weekStart.getDate()} –{' '}
          {weekEnd.getMonth() !== weekStart.getMonth()
            ? `${MONTH_NAMES[weekEnd.getMonth()]} `
            : ''}
          {weekEnd.getDate()}, {weekEnd.getFullYear()}
        </h2>
        <button
          onClick={() => onNavigate(1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day column headers */}
      <div className="grid grid-cols-7 border-t border-l border-border flex-shrink-0">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className="border-r border-b border-border p-2 text-center">
              <p className="text-xs text-gray-500 font-medium">{DAY_NAMES[(i + 1) % 7]}</p>
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold mt-0.5 ${
                  isToday ? 'bg-[#3B4ECC] text-white' : 'text-gray-800'
                }`}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Event columns */}
      <div className="grid grid-cols-7 border-l border-border flex-1 overflow-y-auto">
        {weekDays.map((day, i) => {
          const dayKey    = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const dayEvents = eventsForDay(events, day);
          const isDropTarget = dragOverKey === dayKey;

          return (
            <div
              key={i}
              onDragOver={(e) => handleDragOver(e, dayKey)}
              onDragLeave={(e) => handleDragLeave(e, dayKey)}
              onDrop={(e) => handleDrop(e, day)}
              className={`border-r border-b border-border p-1 min-h-[200px] transition-colors ${
                isDropTarget ? 'bg-[#3B4ECC]/8 ring-2 ring-inset ring-[#3B4ECC]/40' : ''
              }`}
            >
              <div className="space-y-1">
                {dayEvents.map((ev) => {
                  const colors = EVENT_TYPE_COLORS[ev.eventType]!;
                  return (
                    <div
                      key={ev.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, ev)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onEventClick(ev)}
                      className={`
                        p-1.5 rounded border-l-2 ${colors.border} ${colors.bg}
                        cursor-grab active:cursor-grabbing select-none
                        hover:opacity-80 transition-opacity
                        ${draggingId === ev.id ? 'opacity-40' : ''}
                      `}
                    >
                      <p className={`text-xs font-semibold truncate ${colors.text}`}>{ev.title}</p>
                      {!ev.isAllDay && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(ev.startTime)}
                        </p>
                      )}
                      {ev.case && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{ev.case.title}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {draggingId && (
        <p className="text-center text-xs text-[#3B4ECC] mt-2 flex-shrink-0 animate-pulse">
          Drop on any day column to reschedule
        </p>
      )}
    </div>
  );
}

// ─── Create Event Panel ──────────────────────────────────────────────────────────

interface CreateEventFormData {
  title: string;
  eventType: CalendarEvent['eventType'];
  date: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  description: string;
  location: string;
  caseId: string;
}

function CreateEventPanel({
  defaultDate,
  onClose,
  onCreate,
}: {
  defaultDate: Date | null;
  onClose: () => void;
  onCreate: () => void;
}) {
  const { createEvent } = useCalendarMutations();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [form, setForm] = useState<CreateEventFormData>({
    title: '',
    eventType: 'MEETING',
    date: defaultDate ? toDateInputValue(defaultDate) : toDateInputValue(new Date()),
    startTime: '09:00',
    endTime: '10:00',
    isAllDay: false,
    description: '',
    location: '',
    caseId: '',
  });

  function set<K extends keyof CreateEventFormData>(key: K, value: CreateEventFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const startISO = form.isAllDay
        ? new Date(`${form.date}T00:00:00`).toISOString()
        : new Date(`${form.date}T${form.startTime}:00`).toISOString();
      const endISO = form.isAllDay
        ? new Date(`${form.date}T23:59:59`).toISOString()
        : new Date(`${form.date}T${form.endTime}:00`).toISOString();

      await createEvent({
        title: form.title,
        eventType: form.eventType,
        startTime: startISO,
        endTime: endISO,
        isAllDay: form.isAllDay,
        description: form.description || undefined,
        location: form.location || undefined,
        caseId: form.caseId || undefined,
      });
      onCreate();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to create event');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">New Event</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Event title"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Event Type</label>
            <select
              value={form.eventType}
              onChange={(e) => set('eventType', e.target.value as CalendarEvent['eventType'])}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC] bg-white"
            >
              {EVENT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAllDay"
              checked={form.isAllDay}
              onChange={(e) => set('isAllDay', e.target.checked)}
              className="rounded border-border text-[#3B4ECC]"
            />
            <label htmlFor="isAllDay" className="text-sm text-gray-700">All day event</label>
          </div>

          {!form.isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => set('startTime', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">End Time</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => set('endTime', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Optional — e.g. Queens Civil Court, 89-17 Sutphin Blvd"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Notes, docket number, etc."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Case ID <span className="font-normal text-gray-400">(optional)</span></label>
            <input
              type="text"
              value={form.caseId}
              onChange={(e) => set('caseId', e.target.value)}
              placeholder="Link to a case"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
            />
          </div>
        </div>

        <div className="flex-shrink-0 flex gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3faa] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Event Detail Popup ──────────────────────────────────────────────────────────

function EventDetailPopup({
  event,
  onClose,
  onDeleted,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { deleteEvent } = useCalendarMutations();
  const [deleting, setDeleting] = useState(false);
  const colors = EVENT_TYPE_COLORS[event.eventType]!;

  async function handleDelete() {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    setDeleting(true);
    try { await deleteEvent(event.id); onDeleted(); }
    finally { setDeleting(false); }
  }

  const sourceLabel: Record<CalendarEvent['source'], string> = {
    manual: 'Manual', google: 'Google Calendar', outlook: 'Microsoft Outlook', ecourts: 'NY eCourts',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-gray-50">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
            {EVENT_TYPE_LABELS[event.eventType]}
          </span>
          <div className="flex items-center gap-2">
            {event.source !== 'manual' && (
              <span className="text-xs text-gray-400">{sourceLabel[event.source]}</span>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <h3 className="text-base font-semibold text-gray-900">{event.title}</h3>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>
              {event.isAllDay
                ? `${formatDate(event.startTime)} · All day`
                : `${formatDate(event.startTime)}, ${formatTime(event.startTime)} – ${formatTime(event.endTime)}`}
            </span>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{event.location}</span>
            </div>
          )}

          {event.case && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>
                {event.case.title}
                {event.case.internalRef && <span className="text-gray-400 ml-1">({event.case.internalRef})</span>}
              </span>
            </div>
          )}

          {event.description && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-gray-50">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── eCourts Notification Row ────────────────────────────────────────────────────

const ECOURT_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  HEARING: { bg: 'bg-red-100',    text: 'text-red-700'    },
  DEADLINE:{ bg: 'bg-amber-100',  text: 'text-amber-700'  },
  ORDER:   { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  FILING:  { bg: 'bg-purple-100', text: 'text-purple-700' },
  NOTICE:  { bg: 'bg-gray-100',   text: 'text-gray-600'   },
};

function EcourtsNotificationRow({
  notification,
  onImport,
}: {
  notification: EcourtNotification;
  onImport: (id: string) => Promise<void>;
}) {
  const [importing, setImporting] = useState(false);
  const [imported, setImported]   = useState(notification.importedToCalendar);
  const catColors = notification.category
    ? (ECOURT_CATEGORY_COLORS[notification.category] ?? { bg: 'bg-gray-100', text: 'text-gray-600' })
    : { bg: 'bg-gray-100', text: 'text-gray-600' };

  async function handleImport() {
    setImporting(true);
    try { await onImport(notification.id); setImported(true); }
    finally { setImporting(false); }
  }

  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-white">
      <div className="flex-1 min-w-0">
        {notification.category && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${catColors.bg} ${catColors.text}`}>
            {notification.category}
          </span>
        )}
        <p className="text-xs font-medium text-gray-900 mt-1 truncate">{notification.title}</p>
        <div className="flex flex-wrap gap-x-2 mt-0.5">
          {notification.docketNumber && (
            <span className="text-[10px] text-gray-400">#{notification.docketNumber}</span>
          )}
          {notification.court && (
            <span className="text-[10px] text-gray-400">{notification.court}</span>
          )}
          {notification.eventDate && (
            <span className="text-[10px] text-gray-400">{formatDate(notification.eventDate)}</span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 pt-0.5">
        {imported ? (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600">
            <Check className="w-3 h-3" /> Added
          </span>
        ) : (
          <button
            onClick={handleImport}
            disabled={importing}
            className="text-[10px] font-semibold text-[#3B4ECC] hover:underline disabled:opacity-50 flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" />
            {importing ? '...' : 'Add'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Integration Panel — compact accordion cards ─────────────────────────────────

function IntegrationPanel({
  integrationStatus,
  onStatusRefetch,
}: {
  integrationStatus: IntegrationStatus | null;
  onStatusRefetch: () => void;
}) {
  const {
    syncGoogle, syncOutlook, connectGoogle, connectOutlook,
    disconnectGoogle, disconnectOutlook,
    storeEcourtsCredentials, removeEcourtsCredentials, syncEcourts,
    importEcourtsNotification,
  } = useCalendarMutations();
  const { notifications, refetch: refetchNotifications } = useEcourtsNotifications();

  // Google
  const [googleSyncing,      setGoogleSyncing]      = useState(false);
  const [googleSyncResult,   setGoogleSyncResult]   = useState<number | null>(null);
  const [googleConnecting,   setGoogleConnecting]   = useState(false);
  const [googleDisconnecting,setGoogleDisconnecting]= useState(false);
  const [googleOpen,         setGoogleOpen]         = useState(false);

  // Outlook
  const [outlookSyncing,      setOutlookSyncing]      = useState(false);
  const [outlookSyncResult,   setOutlookSyncResult]   = useState<number | null>(null);
  const [outlookConnecting,   setOutlookConnecting]   = useState(false);
  const [outlookDisconnecting,setOutlookDisconnecting]= useState(false);
  const [outlookOpen,         setOutlookOpen]         = useState(false);

  // eCourts
  const [ecourtsOpen,        setEcourtsOpen]        = useState(true);
  const [ecourtsUsername,    setEcourtsUsername]    = useState('');
  const [ecourtsPassword,    setEcourtsPassword]    = useState('');
  const [ecourtsCredSaving,  setEcourtsCredSaving]  = useState(false);
  const [ecourtsCredError,   setEcourtsCredError]   = useState<string | null>(null);
  const [ecourtsRemoving,    setEcourtsRemoving]    = useState(false);
  const [ecourtsSyncing,     setEcourtsSyncing]     = useState(false);
  const [ecourtsSyncResult,  setEcourtsSyncResult]  = useState<{ fetched: number; newNotifications: number; calendarEventsCreated: number } | null>(null);

  async function handleGoogleSync() {
    setGoogleSyncing(true); setGoogleSyncResult(null);
    try { const r = await syncGoogle(); setGoogleSyncResult(r.synced); }
    finally { setGoogleSyncing(false); }
  }
  async function handleGoogleConnect() {
    setGoogleConnecting(true);
    try { await connectGoogle(); } finally { setGoogleConnecting(false); }
  }
  async function handleGoogleDisconnect() {
    if (!window.confirm('Disconnect Google Calendar?')) return;
    setGoogleDisconnecting(true);
    try { await disconnectGoogle(); onStatusRefetch(); } finally { setGoogleDisconnecting(false); }
  }

  async function handleOutlookSync() {
    setOutlookSyncing(true); setOutlookSyncResult(null);
    try { const r = await syncOutlook(); setOutlookSyncResult(r.synced); }
    finally { setOutlookSyncing(false); }
  }
  async function handleOutlookConnect() {
    setOutlookConnecting(true);
    try { await connectOutlook(); } finally { setOutlookConnecting(false); }
  }
  async function handleOutlookDisconnect() {
    if (!window.confirm('Disconnect Microsoft Outlook?')) return;
    setOutlookDisconnecting(true);
    try { await disconnectOutlook(); onStatusRefetch(); } finally { setOutlookDisconnecting(false); }
  }

  async function handleEcourtsCredSave() {
    if (!ecourtsUsername.trim() || !ecourtsPassword.trim()) {
      setEcourtsCredError('Username and password are required'); return;
    }
    setEcourtsCredSaving(true); setEcourtsCredError(null);
    try { await storeEcourtsCredentials(ecourtsUsername, ecourtsPassword); onStatusRefetch(); }
    catch (err) { const e = err as { message?: string }; setEcourtsCredError(e.message ?? 'Failed to save'); }
    finally { setEcourtsCredSaving(false); }
  }
  async function handleEcourtsRemove() {
    if (!window.confirm('Remove NY eCourts credentials?')) return;
    setEcourtsRemoving(true);
    try { await removeEcourtsCredentials(); onStatusRefetch(); } finally { setEcourtsRemoving(false); }
  }
  async function handleEcourtsSync() {
    setEcourtsSyncing(true); setEcourtsSyncResult(null);
    try { const r = await syncEcourts(); setEcourtsSyncResult(r); refetchNotifications(); }
    finally { setEcourtsSyncing(false); }
  }

  const googleConnected  = integrationStatus?.google?.connected  ?? false;
  const outlookConnected = integrationStatus?.outlook?.connected ?? false;
  const ecourtsConnected = integrationStatus?.ecourts?.connected ?? false;

  return (
    <div className="space-y-2">

      {/* ── Google Calendar ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setGoogleOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors"
        >
          {/* Google icon-ish coloured G */}
          <span className="w-5 h-5 rounded-full bg-white border border-border flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-black text-blue-600">G</span>
          </span>
          <span className="text-xs font-semibold text-gray-800 flex-1 text-left">Google Calendar</span>
          {googleConnected
            ? <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
            : <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />}
          <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${googleOpen ? 'rotate-90' : ''}`} />
        </button>

        {googleOpen && (
          <div className="px-3 pb-3 border-t border-border/60 pt-2.5 space-y-2">
            {googleConnected ? (
              <>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleGoogleSync}
                    disabled={googleSyncing}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#3B4ECC] border border-[#3B4ECC]/30 rounded-lg hover:bg-[#3B4ECC]/5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${googleSyncing ? 'animate-spin' : ''}`} />
                    {googleSyncing ? 'Syncing…' : 'Sync'}
                  </button>
                  <button
                    onClick={handleGoogleDisconnect}
                    disabled={googleDisconnecting}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-gray-500 border border-border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Unlink className="w-3 h-3" /> Disconnect
                  </button>
                </div>
                {googleSyncResult !== null && (
                  <p className="text-[11px] text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> {googleSyncResult} events synced
                  </p>
                )}
              </>
            ) : (
              <button
                onClick={handleGoogleConnect}
                disabled={googleConnecting}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3faa] disabled:opacity-50 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                {googleConnecting ? 'Opening…' : 'Connect'}
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Microsoft Outlook ───────────────────────────────────────────────── */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setOutlookOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors"
        >
          <span className="w-5 h-5 rounded-full bg-white border border-border flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-black text-blue-700">M</span>
          </span>
          <span className="text-xs font-semibold text-gray-800 flex-1 text-left">Microsoft Outlook</span>
          {outlookConnected
            ? <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
            : <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />}
          <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${outlookOpen ? 'rotate-90' : ''}`} />
        </button>

        {outlookOpen && (
          <div className="px-3 pb-3 border-t border-border/60 pt-2.5 space-y-2">
            {outlookConnected ? (
              <>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleOutlookSync}
                    disabled={outlookSyncing}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#3B4ECC] border border-[#3B4ECC]/30 rounded-lg hover:bg-[#3B4ECC]/5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${outlookSyncing ? 'animate-spin' : ''}`} />
                    {outlookSyncing ? 'Syncing…' : 'Sync'}
                  </button>
                  <button
                    onClick={handleOutlookDisconnect}
                    disabled={outlookDisconnecting}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-gray-500 border border-border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Unlink className="w-3 h-3" /> Disconnect
                  </button>
                </div>
                {outlookSyncResult !== null && (
                  <p className="text-[11px] text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> {outlookSyncResult} events synced
                  </p>
                )}
              </>
            ) : (
              <button
                onClick={handleOutlookConnect}
                disabled={outlookConnecting}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3faa] disabled:opacity-50 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                {outlookConnecting ? 'Opening…' : 'Connect'}
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── NY eCourts — Landlord Tenant (Queens) ───────────────────────────── */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setEcourtsOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors"
        >
          <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-gray-800 leading-none">NY eCourts</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">Landlord Tenant · Queens</p>
          </div>
          {ecourtsConnected
            ? <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
            : <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />}
          <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${ecourtsOpen ? 'rotate-90' : ''}`} />
        </button>

        {ecourtsOpen && (
          <div className="px-3 pb-3 border-t border-border/60 pt-2.5 space-y-2.5">
            {ecourtsConnected ? (
              <>
                {integrationStatus?.ecourts?.username && (
                  <p className="text-[11px] text-gray-500">
                    Signed in as <span className="font-semibold text-gray-700">{integrationStatus.ecourts.username}</span>
                  </p>
                )}
                {integrationStatus?.ecourts?.lastSync && (
                  <p className="text-[10px] text-gray-400">Last synced {formatDate(integrationStatus.ecourts.lastSync)}</p>
                )}
                <div className="flex gap-1.5">
                  <button
                    onClick={handleEcourtsSync}
                    disabled={ecourtsSyncing}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#3B4ECC] border border-[#3B4ECC]/30 rounded-lg hover:bg-[#3B4ECC]/5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${ecourtsSyncing ? 'animate-spin' : ''}`} />
                    {ecourtsSyncing ? 'Fetching…' : 'Sync'}
                  </button>
                  <button
                    onClick={handleEcourtsRemove}
                    disabled={ecourtsRemoving}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-gray-500 border border-border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Unlink className="w-3 h-3" /> Sign out
                  </button>
                </div>
                {ecourtsSyncResult && (
                  <p className="text-[11px] text-green-600 flex items-start gap-1">
                    <Check className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {ecourtsSyncResult.newNotifications} new · {ecourtsSyncResult.calendarEventsCreated} added to calendar
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Sign in with your NY eCourts account to automatically pull hearing dates and
                  landlord-tenant court notifications for Queens into your calendar.
                </p>
                {ecourtsCredError && (
                  <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
                    {ecourtsCredError}
                  </p>
                )}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={ecourtsUsername}
                    onChange={(e) => setEcourtsUsername(e.target.value)}
                    placeholder="NY eCourts username"
                    className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
                  />
                  <input
                    type="password"
                    value={ecourtsPassword}
                    onChange={(e) => setEcourtsPassword(e.target.value)}
                    placeholder="Password"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEcourtsCredSave(); }}
                    className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B4ECC]/20 focus:border-[#3B4ECC]"
                  />
                  <button
                    onClick={handleEcourtsCredSave}
                    disabled={ecourtsCredSaving}
                    className="w-full px-3 py-1.5 text-xs font-semibold text-white bg-[#3B4ECC] rounded-lg hover:bg-[#2d3faa] disabled:opacity-50 transition-colors"
                  >
                    {ecourtsCredSaving ? 'Saving…' : 'Sign In to NY eCourts'}
                  </button>
                </div>
              </>
            )}

            {/* Notifications list */}
            {notifications.length > 0 && (
              <div className="pt-2 border-t border-border/60 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Court Notifications
                </p>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {notifications.map((n) => (
                    <EcourtsNotificationRow
                      key={n.id}
                      notification={n}
                      onImport={importEcourtsNotification}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inner page ──────────────────────────────────────────────────────────────────

function CalendarPageInner() {
  const searchParams = useSearchParams();
  const googleConnectedParam  = searchParams.get('googleConnected')  === 'true';
  const outlookConnectedParam = searchParams.get('outlookConnected') === 'true';

  const [viewMode,          setViewMode]          = useState<'month' | 'week'>('month');
  const [currentDate,       setCurrentDate]       = useState<Date>(new Date());
  const [showCreatePanel,   setShowCreatePanel]   = useState(false);
  const [selectedEvent,     setSelectedEvent]     = useState<CalendarEvent | null>(null);
  const [createDefaultDate, setCreateDefaultDate] = useState<Date | null>(null);
  const [dropSuccess,       setDropSuccess]       = useState<string | null>(null);

  const { status: integrationStatus, refetch: refetchIntegration } = useIntegrationStatus();
  const { updateEvent } = useCalendarMutations();

  // Compute fetch range
  const fetchRange = useCallback((): { start: string; end: string } => {
    if (viewMode === 'month') {
      return {
        start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString(),
        end:   new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString(),
      };
    }
    const d   = new Date(currentDate);
    const day = d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() - day + 1);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59);
    return { start: mon.toISOString(), end: sun.toISOString() };
  }, [currentDate, viewMode]);

  const [filters, setFilters] = useState(() => fetchRange());
  // Update filters when date/view changes
  const filtersRef = useRef(filters);
  const newRange = fetchRange();
  if (newRange.start !== filtersRef.current.start || newRange.end !== filtersRef.current.end) {
    filtersRef.current = newRange;
    setFilters(newRange);
  }

  const { events, refetch: refetchEvents } = useCalendarEvents(filters);

  function navigate(dir: -1 | 1) {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      viewMode === 'month' ? d.setMonth(d.getMonth() + dir) : d.setDate(d.getDate() + dir * 7);
      return d;
    });
  }

  function handleDayClick(date: Date) {
    setCreateDefaultDate(date);
    setShowCreatePanel(true);
  }

  // ─── Drag-and-drop reschedule ──────────────────────────────────────────────
  async function handleEventDrop(eventId: string, newDate: Date) {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    const { startTime, endTime } = shiftEventToDate(event, newDate);
    try {
      await updateEvent(eventId, { startTime, endTime });
      refetchEvents();
      setDropSuccess(
        `"${event.title}" moved to ${newDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      );
      setTimeout(() => setDropSuccess(null), 3000);
    } catch {
      // silently ignore — event stays in place
    }
  }

  return (
    <div className="space-y-4">
      {/* OAuth success banners */}
      {googleConnectedParam && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          Google Calendar connected successfully!
        </div>
      )}
      {outlookConnectedParam && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          Microsoft Outlook connected successfully!
        </div>
      )}
      {dropSuccess && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-[#3B4ECC] font-medium">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          {dropSuccess}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'month' ? 'bg-[#3B4ECC] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'week' ? 'bg-[#3B4ECC] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
          </div>
          <button
            onClick={() => { setCreateDefaultDate(null); setShowCreatePanel(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#3B4ECC] text-white text-sm font-medium rounded-lg hover:bg-[#2d3faa] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-4 items-start">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0 bg-white border border-border rounded-xl p-4 overflow-hidden">
          {viewMode === 'month' ? (
            <MonthView
              currentDate={currentDate}
              events={events}
              onDayClick={handleDayClick}
              onEventClick={setSelectedEvent}
              onNavigate={navigate}
              onEventDrop={handleEventDrop}
            />
          ) : (
            <WeekView
              currentDate={currentDate}
              events={events}
              onEventClick={setSelectedEvent}
              onNavigate={navigate}
              onEventDrop={handleEventDrop}
            />
          )}
        </div>

        {/* Integration sidebar */}
        <div className="w-72 flex-shrink-0">
          <IntegrationPanel
            integrationStatus={integrationStatus}
            onStatusRefetch={refetchIntegration}
          />
        </div>
      </div>

      {/* Panels / modals */}
      {showCreatePanel && (
        <CreateEventPanel
          defaultDate={createDefaultDate}
          onClose={() => { setShowCreatePanel(false); setCreateDefaultDate(null); }}
          onCreate={() => { setShowCreatePanel(false); setCreateDefaultDate(null); refetchEvents(); }}
        />
      )}
      {selectedEvent && (
        <EventDetailPopup
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDeleted={() => { setSelectedEvent(null); refetchEvents(); }}
        />
      )}
    </div>
  );
}

// ─── Page export ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <div className="bg-white border border-border rounded-xl p-8 flex items-center justify-center h-[500px] text-gray-400 text-sm">
          Loading calendar…
        </div>
      </div>
    }>
      <CalendarPageInner />
    </Suspense>
  );
}
