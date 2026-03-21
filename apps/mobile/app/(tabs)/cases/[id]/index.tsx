import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const PRIMARY = '#3B4ECC';
const NAVY = '#121845';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// ─── Types ────────────────────────────────────────────────

interface CaseUser {
  user: { id: string; firstName: string; lastName: string; role: string };
}
interface CaseClient {
  client: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
}
interface Milestone {
  id: string; title: string; order: number;
  dueDate: string | null; completedAt: string | null;
}
interface CaseNote {
  id: string; body: string; createdAt: string;
}
interface CaseDetail {
  id: string; internalRef: string; title: string; caseType: string;
  status: string; court: string | null; judge: string | null;
  propertyAddress: string | null; opposingCounsel: string | null;
  description: string | null; openDate: string;
  expectedCloseDate: string | null;
  users: CaseUser[];
  clients: CaseClient[];
  milestones: Milestone[];
  _count: { documents: number; timeEntries: number; events: number };
}

// ─── Helpers ──────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  INTAKE:        { bg: '#F3F4F6', text: '#6B7280' },
  ACTIVE:        { bg: '#EEF1FB', text: PRIMARY },
  PENDING_COURT: { bg: '#FEF3C7', text: '#D97706' },
  JUDGMENT:      { bg: '#FED7AA', text: '#EA580C' },
  APPEAL:        { bg: '#EDE9FE', text: '#7C3AED' },
  CLOSED:        { bg: '#D1FAE5', text: '#059669' },
};

const STATUS_LABELS: Record<string, string> = {
  INTAKE: 'Intake', ACTIVE: 'Active', PENDING_COURT: 'Pending Court',
  JUDGMENT: 'Judgment', APPEAL: 'Appeal', CLOSED: 'Closed',
};

const TYPE_LABELS: Record<string, string> = {
  EVICTION: 'Eviction', NON_PAYMENT: 'Non-Payment',
  LEASE_DISPUTE: 'Lease Dispute', HABITABILITY: 'Habitability', OTHER: 'Other',
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
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

// ─── Component ────────────────────────────────────────────

type Tab = 'Overview' | 'Milestones' | 'Timeline';

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('Overview');
  const [newNote, setNewNote] = useState('');
  const [notePosting, setNotePosting] = useState(false);

  const fetchCase = useCallback(async () => {
    if (!id) return;
    try {
      const token = typeof window !== 'undefined'
        ? sessionStorage.getItem('access_token')
        : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [caseRes, msRes, notesRes] = await Promise.all([
        fetch(`${API_URL}/cases/${id}`, { headers }),
        fetch(`${API_URL}/cases/${id}/milestones`, { headers }),
        fetch(`${API_URL}/cases/${id}/notes`, { headers }),
      ]);

      if (caseRes.ok) setCaseData(await caseRes.json());
      if (msRes.ok) setMilestones(await msRes.json());
      if (notesRes.ok) setNotes(await notesRes.json());
    } catch {
      // handled below
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const completeMilestone = async (milestoneId: string) => {
    try {
      const token = typeof window !== 'undefined'
        ? sessionStorage.getItem('access_token') : null;
      await fetch(`${API_URL}/cases/${id}/milestones/${milestoneId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      await fetchCase();
    } catch {
      Alert.alert('Error', 'Could not complete milestone');
    }
  };

  const postNote = async () => {
    if (!newNote.trim()) return;
    setNotePosting(true);
    try {
      const token = typeof window !== 'undefined'
        ? sessionStorage.getItem('access_token') : null;
      await fetch(`${API_URL}/cases/${id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ body: newNote.trim() }),
      });
      setNewNote('');
      await fetchCase();
    } catch {
      Alert.alert('Error', 'Could not post note');
    } finally {
      setNotePosting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Case Detail</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!caseData) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Case Not Found</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingCenter}>
          <Text style={styles.errorText}>Case could not be loaded</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS_COLORS[caseData.status] ?? STATUS_COLORS.INTAKE;
  const completedCount = milestones.filter(m => m.completedAt).length;
  const progressPct = milestones.length ? completedCount / milestones.length : 0;
  const firstClient = caseData.clients?.[0]?.client;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{caseData.internalRef}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Case title bar */}
      <View style={styles.titleBar}>
        <View style={styles.titleRow}>
          <Text style={styles.caseTitle} numberOfLines={2}>{caseData.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {STATUS_LABELS[caseData.status] ?? caseData.status}
            </Text>
          </View>
        </View>
        <Text style={styles.caseSubtitle}>
          {TYPE_LABELS[caseData.caseType] ?? caseData.caseType}
          {caseData.court ? ` · ${caseData.court}` : ''}
        </Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { icon: 'file-text', label: 'Docs', value: caseData._count.documents },
            { icon: 'clock', label: 'Time', value: caseData._count.timeEntries },
            { icon: 'calendar', label: 'Events', value: caseData._count.events },
            { icon: 'check-circle', label: 'Done', value: `${completedCount}/${milestones.length}` },
          ].map(({ icon, label, value }) => (
            <View key={label} style={styles.statItem}>
              <Feather name={icon as any} size={12} color="#8A9AC0" />
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['Overview', 'Milestones', 'Timeline'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* OVERVIEW */}
        {tab === 'Overview' && (
          <View style={styles.section}>

            {/* Case details */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Case Details</Text>
              {[
                { label: 'Reference', value: caseData.internalRef },
                { label: 'Property', value: caseData.propertyAddress },
                { label: 'Judge', value: caseData.judge },
                { label: 'Opposing Counsel', value: caseData.opposingCounsel },
                { label: 'Opened', value: formatDate(caseData.openDate) },
                { label: 'Expected Close', value: formatDate(caseData.expectedCloseDate) },
              ].map(({ label, value }) => value ? (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{value}</Text>
                </View>
              ) : null)}
              {caseData.description && (
                <View style={styles.descriptionBox}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.descriptionText}>{caseData.description}</Text>
                </View>
              )}
            </View>

            {/* Client */}
            {firstClient && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Client</Text>
                <View style={styles.personRow}>
                  <View style={[styles.avatar, { backgroundColor: '#7C3AED' }]}>
                    <Text style={styles.avatarText}>
                      {firstClient.firstName[0]}{firstClient.lastName[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{firstClient.firstName} {firstClient.lastName}</Text>
                    {firstClient.email && (
                      <Text style={styles.personDetail}>{firstClient.email}</Text>
                    )}
                    {firstClient.phone && (
                      <Text style={styles.personDetail}>{firstClient.phone}</Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Team */}
            {caseData.users.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Team</Text>
                {caseData.users.map(({ user }) => (
                  <View key={user.id} style={styles.personRow}>
                    <View style={[styles.avatar, { backgroundColor: PRIMARY }]}>
                      <Text style={styles.avatarText}>
                        {user.firstName[0]}{user.lastName[0]}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.personName}>{user.firstName} {user.lastName}</Text>
                      <Text style={styles.personDetail}>{user.role?.toLowerCase()}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* MILESTONES */}
        {tab === 'Milestones' && (
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.milestoneHeader}>
                <Text style={styles.cardTitle}>Milestones</Text>
                <Text style={styles.milestoneProgress}>
                  {completedCount}/{milestones.length} · {Math.round(progressPct * 100)}%
                </Text>
              </View>
              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct * 100}%` as any }]} />
              </View>
              {milestones.map((m, idx) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.milestoneRow, m.completedAt && styles.milestoneRowDone]}
                  onPress={() => !m.completedAt && completeMilestone(m.id)}
                  activeOpacity={m.completedAt ? 1 : 0.7}
                >
                  <View style={[styles.milestoneCheck, m.completedAt && styles.milestoneCheckDone]}>
                    {m.completedAt && <Feather name="check" size={10} color="#059669" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.milestoneTitle, !!m.completedAt && styles.milestoneTitleDone]}>
                      {idx + 1}. {m.title}
                    </Text>
                    {m.dueDate && !m.completedAt && (
                      <Text style={styles.milestoneDue}>Due {formatDate(m.dueDate)}</Text>
                    )}
                    {m.completedAt && (
                      <Text style={styles.milestoneCompletedAt}>Completed {formatDate(m.completedAt)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
              {milestones.length === 0 && (
                <Text style={styles.emptyText}>No milestones yet</Text>
              )}
            </View>
          </View>
        )}

        {/* TIMELINE */}
        {tab === 'Timeline' && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Timeline</Text>

              {/* Add note */}
              <View style={styles.noteInputRow}>
                <TextInput
                  style={styles.noteInput}
                  value={newNote}
                  onChangeText={setNewNote}
                  placeholder="Add a note or update…"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={2}
                />
                <TouchableOpacity
                  onPress={postNote}
                  disabled={!newNote.trim() || notePosting}
                  style={[styles.postBtn, (!newNote.trim() || notePosting) && styles.postBtnDisabled]}
                >
                  <Feather name="send" size={14} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Notes */}
              {notes.length === 0 ? (
                <Text style={styles.emptyText}>No notes yet</Text>
              ) : (
                notes.map(note => (
                  <View key={note.id} style={styles.noteRow}>
                    <View style={styles.noteAvatar}>
                      <Feather name="user" size={12} color={PRIMARY} />
                    </View>
                    <View style={styles.noteBubble}>
                      <Text style={styles.noteBody}>{note.body}</Text>
                      <Text style={styles.noteTime}>{timeAgo(note.createdAt)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6FA' },
  errorText: { color: '#9CA3AF', fontSize: 14 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: NAVY },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontWeight: '700', fontSize: 14, marginHorizontal: 8 },

  titleBar: { backgroundColor: NAVY, paddingHorizontal: 20, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
  caseTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700', lineHeight: 23 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexShrink: 0 },
  statusText: { fontSize: 11, fontWeight: '700' },
  caseSubtitle: { color: '#8A9AC0', fontSize: 12, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 4 },
  statItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingVertical: 8, alignItems: 'center', gap: 3 },
  statValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statLabel: { color: '#8A9AC0', fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },

  tabBar: { flexDirection: 'row', backgroundColor: '#F4F6FA', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: PRIMARY },

  scroll: { flex: 1, backgroundColor: '#F4F6FA' },
  section: { padding: 16, gap: 12 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', flex: 1 },
  detailValue: { fontSize: 13, color: '#374151', fontWeight: '500', flex: 2, textAlign: 'right' },
  descriptionBox: { paddingTop: 8 },
  descriptionText: { fontSize: 13, color: '#374151', lineHeight: 18, marginTop: 4 },

  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  personName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  personDetail: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  milestoneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  milestoneProgress: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  progressTrack: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden', marginVertical: 4 },
  progressFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 3 },
  milestoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  milestoneRowDone: { opacity: 0.7 },
  milestoneCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  milestoneCheckDone: { borderColor: '#059669', backgroundColor: '#D1FAE5' },
  milestoneTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  milestoneTitleDone: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  milestoneDue: { fontSize: 11, color: '#D97706', marginTop: 2 },
  milestoneCompletedAt: { fontSize: 11, color: '#059669', marginTop: 2 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },

  noteInputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 8 },
  noteInput: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#111827', backgroundColor: '#F9FAFB', minHeight: 44 },
  postBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  postBtnDisabled: { opacity: 0.4 },
  noteRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  noteAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF1FB', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  noteBubble: { flex: 1, backgroundColor: '#F4F6FA', borderRadius: 12, padding: 10 },
  noteBody: { fontSize: 13, color: '#374151', lineHeight: 18 },
  noteTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
});
