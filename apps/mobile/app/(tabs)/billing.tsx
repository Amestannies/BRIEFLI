import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar,
  Modal, TextInput, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PRIMARY = '#3B4ECC';
const NAVY = '#121845';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: string;
  dueDate: string;
  client: { firstName: string; lastName: string } | null;
  case: { title: string; internalRef: string } | null;
}

interface TimeEntry {
  id: string;
  description: string;
  durationMinutes: number;
  hourlyRate: string;
  isBillable: boolean;
  invoiceId: string | null;
  date: string;
  user: { firstName: string; lastName: string };
  case: { title: string; internalRef: string } | null;
}

interface BillingSummary {
  outstanding: { total: number; count: number };
  paidThisMonth: { total: number; count: number };
  unbilledHours: number;
  unbilledValue: number;
}

interface CaseOption { id: string; title: string; internalRef: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PAID:    { bg: '#D1FAE5', text: '#059669' },
  SENT:    { bg: '#EEF1FB', text: PRIMARY },
  VIEWED:  { bg: '#EDE9FE', text: '#7C3AED' },
  OVERDUE: { bg: '#FEE2E2', text: '#DC2626' },
  DRAFT:   { bg: '#F3F4F6', text: '#6B7280' },
  VOID:    { bg: '#F3F4F6', text: '#9CA3AF' },
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

const TABS = ['Invoices', 'Time'];

// ─── Log Time Modal ───────────────────────────────────────────────────────────

interface LogTimeModalProps {
  visible: boolean;
  cases: CaseOption[];
  prefillMinutes?: number;
  prefillCaseId?: string;
  onSaved: () => void;
  onClose: () => void;
}

function LogTimeModal({ visible, cases, prefillMinutes, prefillCaseId, onSaved, onClose }: LogTimeModalProps) {
  const [caseId, setCaseId] = useState(prefillCaseId ?? '');
  const [desc, setDesc] = useState('');
  const [hours, setHours] = useState(prefillMinutes ? String(Math.floor(prefillMinutes / 60)) : '0');
  const [mins, setMins] = useState(prefillMinutes ? String(prefillMinutes % 60) : '30');
  const [rate, setRate] = useState('290');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [caseSearch, setCaseSearch] = useState('');
  const [showCasePicker, setShowCasePicker] = useState(false);

  const selectedCase = cases.find((c) => c.id === caseId);
  const filteredCases = cases.filter((c) =>
    c.title.toLowerCase().includes(caseSearch.toLowerCase()) ||
    c.internalRef.toLowerCase().includes(caseSearch.toLowerCase())
  );

  async function handleSave() {
    if (!caseId || !desc.trim()) { Alert.alert('Required', 'Please select a case and add a description'); return; }
    const durationMinutes = parseInt(hours) * 60 + parseInt(mins);
    if (durationMinutes <= 0) { Alert.alert('Invalid duration', 'Duration must be greater than 0'); return; }
    setSaving(true);
    try {
      await apiFetch('/time-entries', {
        method: 'POST',
        body: JSON.stringify({ caseId, description: desc, durationMinutes, hourlyRate: Number(rate), isBillable: true, date }),
      });
      onSaved();
      // reset
      setDesc(''); setCaseId(''); setHours('0'); setMins('30');
    } catch {
      Alert.alert('Error', 'Failed to save time entry');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Log Time</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={modalStyles.body}>
          {/* Case picker */}
          <Text style={modalStyles.label}>CASE *</Text>
          <TouchableOpacity style={modalStyles.input} onPress={() => setShowCasePicker(true)}>
            <Text style={{ color: caseId ? '#111827' : '#9CA3AF', fontSize: 15 }}>
              {selectedCase ? `${selectedCase.internalRef} — ${selectedCase.title}` : 'Select a case…'}
            </Text>
            <Feather name="chevron-down" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <Text style={modalStyles.label}>DESCRIPTION *</Text>
          <TextInput
            style={[modalStyles.input, modalStyles.textArea]}
            value={desc}
            onChangeText={setDesc}
            placeholder="What did you work on?"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.label}>HOURS</Text>
              <TextInput style={modalStyles.input} value={hours} onChangeText={setHours} keyboardType="numeric"
                placeholder="0" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.label}>MINUTES</Text>
              <TextInput style={modalStyles.input} value={mins} onChangeText={setMins} keyboardType="numeric"
                placeholder="30" placeholderTextColor="#9CA3AF" />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.label}>HOURLY RATE ($)</Text>
              <TextInput style={modalStyles.input} value={rate} onChangeText={setRate} keyboardType="numeric"
                placeholder="290" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.label}>DATE</Text>
              <TextInput style={modalStyles.input} value={date} onChangeText={setDate}
                placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />
            </View>
          </View>

          {caseId && desc && (
            <View style={modalStyles.totalPreview}>
              <Text style={modalStyles.totalLabel}>Estimated Total</Text>
              <Text style={modalStyles.totalValue}>
                {fmt(((parseInt(hours || '0') * 60 + parseInt(mins || '0')) / 60) * Number(rate))}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={modalStyles.footer}>
          <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
            <Text style={modalStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[modalStyles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={modalStyles.saveText}>Save Entry</Text>}
          </TouchableOpacity>
        </View>

        {/* Case picker modal */}
        <Modal visible={showCasePicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCasePicker(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={[modalStyles.header, { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }]}>
              <Text style={modalStyles.title}>Select Case</Text>
              <TouchableOpacity onPress={() => setShowCasePicker(false)}>
                <Feather name="x" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 12 }}>
              <TextInput
                style={[modalStyles.input, { marginBottom: 0 }]}
                value={caseSearch}
                onChangeText={setCaseSearch}
                placeholder="Search cases…"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <FlatList
              data={filteredCases}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}
                  onPress={() => { setCaseId(item.id); setShowCasePicker(false); setCaseSearch(''); }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{item.internalRef}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{item.title}</Text>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: NAVY },
  body: { padding: 16, gap: 4 },
  label: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  input: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#fff', marginBottom: 4 },
  textArea: { minHeight: 80, alignItems: 'flex-start', paddingTop: 10 },
  totalPreview: { backgroundColor: '#EEF1FB', borderRadius: 14, padding: 16, marginTop: 16 },
  totalLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  totalValue: { fontSize: 24, fontWeight: '700', color: PRIMARY },
  footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BillingScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('Invoices');
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogTime, setShowLogTime] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);

  // Live timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, invs, ents, cs] = await Promise.allSettled([
        apiFetch<BillingSummary>('/billing/summary'),
        apiFetch<Invoice[]>('/invoices'),
        apiFetch<TimeEntry[]>('/time-entries'),
        apiFetch<CaseOption[]>('/cases?limit=100'),
      ]);
      if (sum.status === 'fulfilled') setSummary(sum.value);
      if (invs.status === 'fulfilled') setInvoices(invs.value);
      if (ents.status === 'fulfilled') setEntries(ents.value);
      if (cs.status === 'fulfilled') setCases(cs.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  function stopTimer() {
    setTimerRunning(false);
    if (timerSeconds > 0) setShowLogTime(true);
    else setTimerSeconds(0);
  }

  const summaryCards = [
    { label: 'Outstanding', value: summary ? fmt(summary.outstanding.total) : '—', color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle' as const },
    { label: 'Paid This Month', value: summary ? fmt(summary.paidThisMonth.total) : '—', color: '#059669', bg: '#D1FAE5', icon: 'trending-up' as const },
    { label: 'Unbilled Hrs', value: summary ? `${summary.unbilledHours}h` : '—', color: '#7C3AED', bg: '#EDE9FE', icon: 'clock' as const },
    { label: 'Invoices', value: String(invoices.length), color: PRIMARY, bg: '#EEF1FB', icon: 'file-text' as const },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Billing</Text>
          <Text style={styles.headerSub}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]} onPress={() => setShowLogTime(true)}>
            <Feather name="clock" size={14} color="#fff" />
            <Text style={styles.headerBtnText}>Log Time</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowNewInvoice(true)}>
            <Feather name="plus" size={14} color="#fff" />
            <Text style={styles.addBtnText}>Invoice</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Summary cards */}
        {loading ? (
          <View style={styles.summaryGrid}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={[styles.summaryCard, { backgroundColor: '#F3F4F6' }]} />
            ))}
          </View>
        ) : (
          <View style={styles.summaryGrid}>
            {summaryCards.map((s) => (
              <View key={s.label} style={[styles.summaryCard, { backgroundColor: s.bg }]}>
                <View style={styles.summaryTop}>
                  <Feather name={s.icon} size={14} color={s.color} />
                  <Text style={[styles.summaryLabel, { color: s.color }]}>{s.label}</Text>
                </View>
                <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Live Timer */}
        <View style={styles.timerCard}>
          <View style={styles.timerHeader}>
            <Text style={styles.timerLabel}>Live Timer</Text>
            {timerRunning && (
              <View style={styles.recordingBadge}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording</Text>
              </View>
            )}
          </View>
          <Text style={styles.timerDisplay}>{fmtTimer(timerSeconds)}</Text>
          <TouchableOpacity
            style={[styles.timerBtn, { backgroundColor: timerRunning ? '#DC2626' : PRIMARY }]}
            onPress={() => timerRunning ? stopTimer() : setTimerRunning(true)}
          >
            <Feather name={timerRunning ? 'square' : 'play'} size={16} color="#fff" />
            <Text style={styles.timerBtnText}>{timerRunning ? 'Stop & Log' : 'Start Timer'}</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Invoices tab */}
        {tab === 'Invoices' && (
          <View style={styles.section}>
            {loading ? (
              <ActivityIndicator color={PRIMARY} style={{ marginVertical: 24 }} />
            ) : invoices.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Feather name="file-text" size={32} color="#D1D5DB" style={{ marginBottom: 8 }} />
                <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No invoices yet</Text>
              </View>
            ) : (
              invoices.slice(0, 10).map((inv, idx) => {
                const sc = STATUS_COLORS[inv.status] ?? { bg: '#F3F4F6', text: '#6B7280' };
                const clientName = inv.client ? `${inv.client.firstName} ${inv.client.lastName}` : 'Unknown';
                return (
                  <TouchableOpacity
                    key={inv.id}
                    style={[styles.invoiceRow, idx < invoices.length - 1 && styles.rowBorder]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.avatar, { backgroundColor: PRIMARY }]}>
                      <Text style={styles.avatarText}>
                        {clientName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.invoiceInfo}>
                      <View style={styles.invoiceTop}>
                        <Text style={styles.invoiceClient}>{clientName}</Text>
                        <Text style={styles.invoiceAmount}>{fmt(Number(inv.total))}</Text>
                      </View>
                      <View style={styles.invoiceBottom}>
                        <Text style={styles.invoiceMatter} numberOfLines={1}>{inv.case?.title ?? '—'}</Text>
                        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.badgeText, { color: sc.text }]}>
                            {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.invoiceDate}>{inv.invoiceNumber} · Due {fmtDate(inv.dueDate)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* Time tab */}
        {tab === 'Time' && (
          <View style={styles.section}>
            <View style={styles.timeHeader}>
              <Text style={styles.sectionTitle}>Recent Time Entries</Text>
              <TouchableOpacity style={styles.logBtn} onPress={() => setShowLogTime(true)}>
                <Feather name="plus" size={12} color={PRIMARY} />
                <Text style={styles.logBtnText}>Log Time</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <ActivityIndicator color={PRIMARY} style={{ marginVertical: 24 }} />
            ) : entries.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Feather name="clock" size={32} color="#D1D5DB" style={{ marginBottom: 8 }} />
                <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No time entries yet</Text>
              </View>
            ) : (
              entries.slice(0, 10).map((entry, idx) => {
                const hrs = (entry.durationMinutes / 60).toFixed(1);
                const total = ((entry.durationMinutes / 60) * Number(entry.hourlyRate)).toFixed(2);
                return (
                  <View key={entry.id} style={[styles.timeRow, idx < entries.length - 1 && styles.rowBorder]}>
                    <View style={[styles.timeIconWrap, { backgroundColor: entry.invoiceId ? '#D1FAE5' : '#EEF1FB' }]}>
                      <Feather name="clock" size={14} color={entry.invoiceId ? '#059669' : PRIMARY} />
                    </View>
                    <View style={styles.timeInfo}>
                      <Text style={styles.timeDesc} numberOfLines={1}>{entry.description}</Text>
                      <Text style={styles.timeMatter}>
                        {entry.case?.internalRef ?? ''} · {entry.user.firstName} {entry.user.lastName} · {fmtDate(entry.date)}
                      </Text>
                    </View>
                    <View style={styles.timeRight}>
                      <Text style={styles.timeTotal}>{fmt(Number(total))}</Text>
                      <Text style={styles.timeHours}>{hrs}h</Text>
                      {entry.isBillable && !entry.invoiceId && <View style={styles.unbilledDot} />}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Log Time Modal */}
      <LogTimeModal
        visible={showLogTime}
        cases={cases}
        prefillMinutes={timerSeconds > 0 ? Math.ceil(timerSeconds / 60) : undefined}
        onSaved={() => { setShowLogTime(false); setTimerSeconds(0); loadData(); }}
        onClose={() => { setShowLogTime(false); setTimerSeconds(0); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  scroll: { flex: 1, backgroundColor: '#F4F6FA' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: NAVY },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#8A9AC0', marginTop: 2 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  headerBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  summaryCard: { width: '47.5%', borderRadius: 14, padding: 14, minHeight: 72 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  summaryLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 22, fontWeight: '700' },

  timerCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, alignItems: 'center' },
  timerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 },
  timerLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  recordingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  recordingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DC2626' },
  recordingText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  timerDisplay: { fontSize: 40, fontWeight: '700', color: NAVY, fontVariant: ['tabular-nums'], marginVertical: 8 },
  timerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24, marginTop: 4 },
  timerBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, padding: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: PRIMARY },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },

  section: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },

  invoiceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  invoiceInfo: { flex: 1, gap: 3 },
  invoiceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceClient: { fontSize: 14, fontWeight: '700', color: '#111827' },
  invoiceAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  invoiceBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invoiceMatter: { fontSize: 12, color: '#9CA3AF', flex: 1, marginRight: 8 },
  invoiceDate: { fontSize: 11, color: '#9CA3AF' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  timeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logBtnText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  timeIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  timeInfo: { flex: 1 },
  timeDesc: { fontSize: 13, fontWeight: '600', color: '#111827' },
  timeMatter: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  timeRight: { alignItems: 'flex-end', gap: 2 },
  timeTotal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  timeHours: { fontSize: 11, color: '#9CA3AF' },
  unbilledDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY, marginTop: 2 },
});
