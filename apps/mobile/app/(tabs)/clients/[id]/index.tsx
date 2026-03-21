import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const PRIMARY = '#3B4ECC';
const NAVY = '#121845';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// ─── Types ────────────────────────────────────────────────

interface CaseRef {
  id: string; internalRef: string; title: string;
  caseType: string; status: string; openDate: string;
}
interface ClientDetail {
  id: string; firstName: string; lastName: string;
  email: string; phone: string | null; address: string | null;
  portalEnabled: boolean; preferredLang: string;
  createdAt: string; updatedAt: string;
  cases: Array<{ caseId: string; case: CaseRef }>;
  _count: { cases: number; documents: number };
}

// ─── Helpers ──────────────────────────────────────────────

const AVATAR_PALETTE = [
  PRIMARY, '#7C3AED', '#059669', '#D97706',
  '#E11D48', '#4F46E5', '#0D9488', '#EA580C',
];

function avatarColor(id: string) {
  const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const CASE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  INTAKE:        { bg: '#F3F4F6', text: '#6B7280' },
  ACTIVE:        { bg: '#EEF1FB', text: PRIMARY },
  PENDING_COURT: { bg: '#FEF3C7', text: '#D97706' },
  JUDGMENT:      { bg: '#FED7AA', text: '#EA580C' },
  APPEAL:        { bg: '#EDE9FE', text: '#7C3AED' },
  CLOSED:        { bg: '#D1FAE5', text: '#059669' },
};

const CASE_STATUS_LABELS: Record<string, string> = {
  INTAKE: 'Intake', ACTIVE: 'Active', PENDING_COURT: 'Pending Court',
  JUDGMENT: 'Judgment', APPEAL: 'Appeal', CLOSED: 'Closed',
};

const CASE_TYPE_LABELS: Record<string, string> = {
  EVICTION: 'Eviction', NON_PAYMENT: 'Non-Payment',
  LEASE_DISPUTE: 'Lease Dispute', HABITABILITY: 'Habitability', OTHER: 'Other',
};

const LANG_LABELS: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', zh: 'Chinese', ar: 'Arabic',
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('access_token') : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Component ────────────────────────────────────────────

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchClient = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiFetch<ClientDetail>(`/clients/${id}`);
      setClient(data);
    } catch {
      // handled below
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  const handlePortalToggle = async () => {
    if (!client) return;
    setPortalLoading(true);
    try {
      const action = client.portalEnabled ? 'disable' : 'enable';
      const updated = await apiFetch<ClientDetail>(`/clients/${id}/portal/${action}`, { method: 'POST' });
      setClient(updated);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message ?? 'Could not update portal access');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Client?',
      `Remove ${client?.firstName} ${client?.lastName} from your firm?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await apiFetch(`/clients/${id}`, { method: 'DELETE' });
              router.back();
            } catch (e: unknown) {
              Alert.alert('Error', (e as Error).message ?? 'Could not delete client');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Client</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Not Found</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingCenter}>
          <Text style={styles.errorLabel}>Client could not be loaded</Text>
        </View>
      </SafeAreaView>
    );
  }

  const color = avatarColor(client.id);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {client.firstName} {client.lastName}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: color }]}>
            <Text style={styles.avatarText}>
              {getInitials(client.firstName, client.lastName)}
            </Text>
          </View>
          <Text style={styles.profileName}>{client.firstName} {client.lastName}</Text>

          {/* Status badges */}
          <View style={styles.badgeRow}>
            {client.portalEnabled && (
              <View style={styles.portalBadge}>
                <Feather name="shield" size={9} color={PRIMARY} />
                <Text style={styles.portalBadgeText}>Portal Active</Text>
              </View>
            )}
            <View style={[
              styles.statusBadge,
              client._count.cases > 0 ? styles.activeBadge : styles.newBadge,
            ]}>
              <Text style={[
                styles.statusBadgeText,
                client._count.cases > 0 ? styles.activeText : styles.newText,
              ]}>
                {client._count.cases > 0 ? 'Active' : 'New'}
              </Text>
            </View>
          </View>

          {/* Contact row */}
          <View style={styles.contactRow}>
            <TouchableOpacity
              style={styles.contactAction}
              onPress={() => Linking.openURL(`mailto:${client.email}`)}
            >
              <Feather name="mail" size={16} color={PRIMARY} />
              <Text style={styles.contactActionText}>Email</Text>
            </TouchableOpacity>
            {client.phone && (
              <TouchableOpacity
                style={styles.contactAction}
                onPress={() => Linking.openURL(`tel:${client.phone}`)}
              >
                <Feather name="phone" size={16} color={PRIMARY} />
                <Text style={styles.contactActionText}>Call</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.contactAction,
                client.portalEnabled ? styles.contactActionWarning : styles.contactActionBlue,
              ]}
              onPress={handlePortalToggle}
              disabled={portalLoading}
            >
              <Feather
                name={client.portalEnabled ? 'shield-off' : 'shield'}
                size={16}
                color={client.portalEnabled ? '#D97706' : PRIMARY}
              />
              <Text style={[
                styles.contactActionText,
                client.portalEnabled ? styles.warningText : {},
              ]}>
                {portalLoading ? '…' : client.portalEnabled ? 'Revoke' : 'Portal'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { icon: 'briefcase', label: 'Cases', value: client._count.cases },
            { icon: 'file-text', label: 'Documents', value: client._count.documents },
            { icon: 'globe', label: 'Language', value: LANG_LABELS[client.preferredLang] ?? client.preferredLang },
          ].map(({ icon, label, value }) => (
            <View key={label} style={styles.statCard}>
              <Feather name={icon as any} size={14} color={PRIMARY} />
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Contact info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Details</Text>
          {[
            { icon: 'mail', label: 'Email', value: client.email },
            { icon: 'phone', label: 'Phone', value: client.phone },
            { icon: 'map-pin', label: 'Address', value: client.address },
            { icon: 'calendar', label: 'Client Since', value: formatDate(client.createdAt) },
          ].map(({ icon, label, value }) => value ? (
            <View key={label} style={styles.infoRow}>
              <Feather name={icon as any} size={13} color="#9CA3AF" style={{ width: 20 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </View>
            </View>
          ) : null)}
        </View>

        {/* Cases */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cases ({client._count.cases})</Text>
          {client.cases.length === 0 ? (
            <Text style={styles.emptyText}>No cases linked to this client</Text>
          ) : (
            client.cases.map(({ case: c }) => {
              const statusStyle = CASE_STATUS_COLORS[c.status] ?? { bg: '#F3F4F6', text: '#6B7280' };
              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.caseRow}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/cases/${c.id}` as never)}
                >
                  <View style={styles.caseIconWrap}>
                    <Feather name="briefcase" size={14} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.caseTitle} numberOfLines={1}>{c.title}</Text>
                    <Text style={styles.caseMeta}>
                      {c.internalRef} · {CASE_TYPE_LABELS[c.caseType] ?? c.caseType}
                    </Text>
                  </View>
                  <View style={[styles.caseStatusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.caseStatusText, { color: statusStyle.text }]}>
                      {CASE_STATUS_LABELS[c.status] ?? c.status}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={14} color="#D1D5DB" />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: NAVY },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontWeight: '700', fontSize: 15, marginHorizontal: 8 },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6FA' },
  errorLabel: { color: '#9CA3AF', fontSize: 14 },

  scroll: { flex: 1, backgroundColor: '#F4F6FA' },

  profileCard: { backgroundColor: NAVY, paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 26 },
  profileName: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  portalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(59,78,204,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  portalBadgeText: { fontSize: 10, fontWeight: '700', color: '#93A8F0' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeBadge: { backgroundColor: 'rgba(5,150,105,0.25)' },
  newBadge: { backgroundColor: 'rgba(255,255,255,0.1)' },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  activeText: { color: '#6EE7B7' },
  newText: { color: '#8A9AC0' },

  contactRow: { flexDirection: 'row', gap: 8 },
  contactAction: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 10, alignItems: 'center', gap: 4 },
  contactActionBlue: {},
  contactActionWarning: { backgroundColor: 'rgba(217,119,6,0.15)' },
  contactActionText: { fontSize: 11, fontWeight: '600', color: '#93A8F0' },
  warningText: { color: '#FCD34D' },

  statsRow: { flexDirection: 'row', gap: 8, margin: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase' },

  section: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  infoLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  infoValue: { fontSize: 13, color: '#374151', fontWeight: '500', marginTop: 1 },

  caseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  caseIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EEF1FB', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  caseTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  caseMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  caseStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  caseStatusText: { fontSize: 10, fontWeight: '700' },
});
