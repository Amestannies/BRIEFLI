import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const PRIMARY = '#3B4ECC';
const NAVY = '#121845';

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = 'COURT_HEARING' | 'DEADLINE' | 'MEETING' | 'DEPOSITION' | 'TASK';
type EventSource = 'manual' | 'google' | 'outlook' | 'ecourts';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: EventType;
  startTime: string;
  endTime: string;
  location?: string;
  isAllDay: boolean;
  source: EventSource;
  case?: { id: string; title: string; internalRef: string } | null;
}

interface CreateEventForm {
  title: string;
  eventType: EventType;
  date: string;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  location: string;
  description: string;
  caseId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EVENT_TYPE_OPTIONS: EventType[] = ['COURT_HEARING', 'DEADLINE', 'MEETING', 'DEPOSITION', 'TASK'];
const EVENT_TYPE_LABELS: Record<EventType, string> = {
  COURT_HEARING: 'Court Hearing',
  DEADLINE: 'Deadline',
  MEETING: 'Meeting',
  DEPOSITION: 'Deposition',
  TASK: 'Task',
};

const EVENT_COLORS: Record<EventType, { color: string; bg: string }> = {
  COURT_HEARING: { color: '#DC2626', bg: '#FEE2E2' },
  DEADLINE:      { color: '#D97706', bg: '#FEF3C7' },
  MEETING:       { color: PRIMARY,   bg: '#EEF1FB' },
  DEPOSITION:    { color: '#7C3AED', bg: '#EDE9FE' },
  TASK:          { color: '#6B7280', bg: '#F3F4F6' },
};

function getEventIcon(type: EventType): string {
  switch (type) {
    case 'COURT_HEARING': return 'mic';
    case 'DEADLINE':      return 'alert-circle';
    case 'MEETING':       return 'users';
    case 'DEPOSITION':    return 'file-text';
    case 'TASK':          return 'check-square';
  }
}

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const today = new Date();
  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [selected, setSelected] = useState(today.getDate());

  const [events, setEvents]   = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Create event modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [form, setForm] = useState<CreateEventForm>({
    title: '', eventType: 'MEETING',
    date: todayDateString(),
    startHour: '09', startMinute: '00',
    endHour: '10',   endMinute: '00',
    location: '', description: '', caseId: '',
  });

  // Event detail modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch events for current month ────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(year, month, 1).toISOString();
      const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const data = await apiFetch<CalendarEvent[]>(`/calendar/events?start=${start}&end=${end}`);
      setEvents(data ?? []);
    } catch {
      // silently fail — show empty state
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ─── Navigation ────────────────────────────────────────────────────────────

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelected(1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelected(1);
  };

  // ─── Derived data ──────────────────────────────────────────────────────────

  const cells = buildCalendarCells(year, month);

  const eventDays = new Set(
    events.map(e => {
      const d = new Date(e.startTime);
      if (d.getFullYear() === year && d.getMonth() === month) return d.getDate();
      return null;
    }).filter(Boolean) as number[]
  );

  const dayEvents = events.filter(e => {
    const d = new Date(e.startTime);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === selected;
  });

  // Upcoming: events in the next 30 days sorted
  const upcomingEvents = [...events]
    .filter(e => new Date(e.startTime) >= today)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 10);

  // ─── Create event ──────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!form.title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    setCreating(true);
    try {
      const startTime = new Date(`${form.date}T${form.startHour}:${form.startMinute}:00`).toISOString();
      const endTime   = new Date(`${form.date}T${form.endHour}:${form.endMinute}:00`).toISOString();
      await apiFetch('/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.trim(),
          eventType: form.eventType,
          startTime, endTime,
          location: form.location.trim() || undefined,
          description: form.description.trim() || undefined,
          caseId: form.caseId.trim() || undefined,
          isAllDay: false,
          attendeeIds: [],
        }),
      });
      setShowCreate(false);
      setForm({
        title: '', eventType: 'MEETING',
        date: todayDateString(),
        startHour: '09', startMinute: '00',
        endHour: '10', endMinute: '00',
        location: '', description: '', caseId: '',
      });
      fetchEvents();
    } catch {
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  // ─── Delete event ──────────────────────────────────────────────────────────

  function handleDelete(event: CalendarEvent) {
    Alert.alert('Delete Event', `Delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await apiFetch(`/calendar/events/${event.id}`, { method: 'DELETE' });
            setSelectedEvent(null);
            fetchEvents();
          } catch {
            Alert.alert('Error', 'Failed to delete event.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Calendar</Text>
          <Text style={styles.headerSub}>{upcomingEvents.length} upcoming events</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add Event</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Month navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Feather name="chevron-left" size={20} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Feather name="chevron-right" size={20} color={NAVY} />
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        <View style={styles.calCard}>
          {loading && (
            <View style={styles.calLoader}>
              <ActivityIndicator size="small" color={PRIMARY} />
            </View>
          )}
          <View style={styles.dayHeaders}>
            {DAYS.map(d => (
              <Text key={d} style={styles.dayHeader}>{d}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e${i}`} style={styles.cell} />;
              const isSelected = day === selected;
              const hasEvent = eventDays.has(day);
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <TouchableOpacity
                  key={`d${day}`}
                  style={[styles.cell, isSelected && styles.cellSelected, isToday && !isSelected && styles.cellToday]}
                  onPress={() => setSelected(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cellText, isSelected && styles.cellSelectedText, isToday && !isSelected && styles.cellTodayText]}>
                    {day}
                  </Text>
                  {hasEvent && (
                    <View style={[styles.dot, isSelected && styles.dotSelected]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected day */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{MONTHS[month]} {selected}</Text>
          {loading ? (
            <ActivityIndicator size="small" color={PRIMARY} style={{ marginVertical: 16 }} />
          ) : dayEvents.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="calendar" size={28} color="#D1D5DB" />
              <Text style={styles.emptyText}>No events this day</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowCreate(true)}>
                <Feather name="plus" size={14} color={PRIMARY} />
                <Text style={styles.emptyAddText}>Add Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            dayEvents.map(event => {
              const colors = EVENT_COLORS[event.eventType];
              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => setSelectedEvent(event)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.eventIcon, { backgroundColor: colors.bg }]}>
                    <Feather name={getEventIcon(event.eventType) as any} size={16} color={colors.color} />
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                    {event.case && (
                      <Text style={styles.eventClient} numberOfLines={1}>{event.case.title}</Text>
                    )}
                    {event.location && (
                      <Text style={styles.eventLocation} numberOfLines={1}>
                        <Feather name="map-pin" size={10} color="#9CA3AF" /> {event.location}
                      </Text>
                    )}
                  </View>
                  <View style={styles.eventMeta}>
                    {!event.isAllDay && (
                      <Text style={styles.eventTime}>{formatTime(event.startTime)}</Text>
                    )}
                    <View style={[styles.typeBadge, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: colors.color }]}>
                        {EVENT_TYPE_LABELS[event.eventType]}
                      </Text>
                    </View>
                    {event.source === 'ecourts' && (
                      <View style={styles.sourceBadge}>
                        <Text style={styles.sourceText}>eCourts</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {upcomingEvents.map(event => {
              const colors = EVENT_COLORS[event.eventType];
              const d = new Date(event.startTime);
              return (
                <TouchableOpacity
                  key={event.id}
                  style={styles.upcomingRow}
                  onPress={() => {
                    setYear(d.getFullYear());
                    setMonth(d.getMonth());
                    setSelected(d.getDate());
                    setSelectedEvent(event);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.upcomingIconWrap, { backgroundColor: colors.bg }]}>
                    <Feather name={getEventIcon(event.eventType) as any} size={14} color={colors.color} />
                  </View>
                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={styles.upcomingMeta}>
                      {SHORT_MONTHS[d.getMonth()]} {d.getDate()}
                      {!event.isAllDay ? ` · ${formatTime(event.startTime)}` : ' · All day'}
                    </Text>
                  </View>
                  <View style={[styles.typeBadge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: colors.color }]}>
                      {EVENT_TYPE_LABELS[event.eventType]}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Create Event Modal ─────────────────────────────────────────────── */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Event</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Feather name="x" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Event title"
              value={form.title}
              onChangeText={t => setForm(f => ({ ...f, title: t }))}
            />

            {/* Event type */}
            <Text style={styles.label}>Event Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {EVENT_TYPE_OPTIONS.map(type => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setForm(f => ({ ...f, eventType: type }))}
                  style={[
                    styles.typePill,
                    form.eventType === type && { backgroundColor: PRIMARY, borderColor: PRIMARY },
                  ]}
                >
                  <Text style={[styles.typePillText, form.eventType === type && { color: '#fff' }]}>
                    {EVENT_TYPE_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Date */}
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={form.date}
              onChangeText={t => setForm(f => ({ ...f, date: t }))}
            />

            {/* Times */}
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Start Time</Text>
                <View style={styles.timeRow}>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    placeholder="09" maxLength={2} keyboardType="numeric"
                    value={form.startHour}
                    onChangeText={t => setForm(f => ({ ...f, startHour: t }))}
                  />
                  <Text style={styles.timeColon}>:</Text>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    placeholder="00" maxLength={2} keyboardType="numeric"
                    value={form.startMinute}
                    onChangeText={t => setForm(f => ({ ...f, startMinute: t }))}
                  />
                </View>
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>End Time</Text>
                <View style={styles.timeRow}>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    placeholder="10" maxLength={2} keyboardType="numeric"
                    value={form.endHour}
                    onChangeText={t => setForm(f => ({ ...f, endHour: t }))}
                  />
                  <Text style={styles.timeColon}>:</Text>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    placeholder="00" maxLength={2} keyboardType="numeric"
                    value={form.endMinute}
                    onChangeText={t => setForm(f => ({ ...f, endMinute: t }))}
                  />
                </View>
              </View>
            </View>

            {/* Location */}
            <Text style={styles.label}>Location (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Courtroom 4, Morris County"
              value={form.location}
              onChangeText={t => setForm(f => ({ ...f, location: t }))}
            />

            {/* Description */}
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Notes or description"
              value={form.description}
              onChangeText={t => setForm(f => ({ ...f, description: t }))}
              multiline numberOfLines={3}
            />

            {/* Case ID */}
            <Text style={styles.label}>Case ID (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Case ID to link"
              value={form.caseId}
              onChangeText={t => setForm(f => ({ ...f, caseId: t }))}
            />

            <TouchableOpacity
              style={[styles.saveBtn, creating && styles.saveBtnDisabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnText}>Create Event</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Event Detail Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (() => {
          const colors = EVENT_COLORS[selectedEvent.eventType];
          return (
            <SafeAreaView style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={[styles.eventTypeTag, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.eventTypeTagText, { color: colors.color }]}>
                    {EVENT_TYPE_LABELS[selectedEvent.eventType]}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                  <Feather name="x" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                <Text style={styles.detailTitle}>{selectedEvent.title}</Text>

                <View style={styles.detailRow}>
                  <Feather name="clock" size={14} color="#9CA3AF" />
                  <Text style={styles.detailText}>
                    {selectedEvent.isAllDay
                      ? 'All day'
                      : `${formatTime(selectedEvent.startTime)} – ${formatTime(selectedEvent.endTime)}`
                    }
                  </Text>
                </View>

                {selectedEvent.location && (
                  <View style={styles.detailRow}>
                    <Feather name="map-pin" size={14} color="#9CA3AF" />
                    <Text style={styles.detailText}>{selectedEvent.location}</Text>
                  </View>
                )}

                {selectedEvent.case && (
                  <View style={styles.detailRow}>
                    <Feather name="briefcase" size={14} color="#9CA3AF" />
                    <Text style={styles.detailText}>
                      {selectedEvent.case.title}{selectedEvent.case.internalRef ? ` (${selectedEvent.case.internalRef})` : ''}
                    </Text>
                  </View>
                )}

                {selectedEvent.source !== 'manual' && (
                  <View style={styles.detailRow}>
                    <Feather name="link" size={14} color="#9CA3AF" />
                    <Text style={styles.detailText}>
                      Source: {selectedEvent.source === 'ecourts' ? 'eCourts NJ' :
                               selectedEvent.source === 'google' ? 'Google Calendar' :
                               'Microsoft Outlook'}
                    </Text>
                  </View>
                )}

                {selectedEvent.description && (
                  <View style={styles.descBlock}>
                    <Text style={styles.descLabel}>Description</Text>
                    <Text style={styles.descText}>{selectedEvent.description}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(selectedEvent)}
                  disabled={deleting}
                >
                  {deleting
                    ? <ActivityIndicator size="small" color="#DC2626" />
                    : <>
                        <Feather name="trash-2" size={15} color="#DC2626" />
                        <Text style={styles.deleteBtnText}>Delete Event</Text>
                      </>
                  }
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          );
        })()}
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: NAVY },
  scroll: { flex: 1, backgroundColor: '#F4F6FA' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: NAVY,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 12, color: '#8A9AC0', marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },

  calCard: {
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 12,
  },
  calLoader: { position: 'absolute', top: 8, right: 12, zIndex: 1 },
  dayHeaders: { flexDirection: 'row', marginBottom: 6 },
  dayHeader:  { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cellSelected:  { backgroundColor: PRIMARY },
  cellToday:     { borderWidth: 1.5, borderColor: PRIMARY },
  cellText:      { fontSize: 13, fontWeight: '500', color: '#374151' },
  cellSelectedText: { color: '#fff', fontWeight: '700' },
  cellTodayText:    { color: PRIMARY, fontWeight: '700' },
  dot:        { width: 4, height: 4, borderRadius: 2, backgroundColor: PRIMARY, marginTop: 1 },
  dotSelected: { backgroundColor: '#fff' },

  section: {
    marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 16,
    padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },

  empty: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  emptyAddText: { fontSize: 13, color: PRIMARY, fontWeight: '600' },

  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  eventIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  eventInfo: { flex: 1 },
  eventTitle:    { fontSize: 13, fontWeight: '700', color: '#111827' },
  eventClient:   { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  eventLocation: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  eventMeta: { alignItems: 'flex-end', gap: 3 },
  eventTime: { fontSize: 12, fontWeight: '600', color: '#374151' },

  typeBadge:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  sourceBadge:   { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#FEF3C7' },
  sourceText:    { fontSize: 9, fontWeight: '700', color: '#D97706' },

  upcomingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  upcomingIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  upcomingInfo:  { flex: 1 },
  upcomingTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  upcomingMeta:  { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // Modal
  modal:       { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody:  { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#111827', marginBottom: 14, backgroundColor: '#FAFAFA',
  },
  textarea: { height: 72, textAlignVertical: 'top' },

  row:       { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  timeRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInput: { flex: 1, textAlign: 'center', marginBottom: 0 },
  timeColon: { fontSize: 18, fontWeight: '600', color: '#374151' },

  typePill: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, backgroundColor: '#fff',
  },
  typePillText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Detail modal
  eventTypeTag:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  eventTypeTagText: { fontSize: 12, fontWeight: '700' },
  detailTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  detailRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  detailText:  { fontSize: 14, color: '#374151', flex: 1 },
  descBlock:   { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  descLabel:   { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 4 },
  descText:    { fontSize: 14, color: '#374151', lineHeight: 20 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 24, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2',
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
});
