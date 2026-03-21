import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, StatusBar, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PRIMARY = '#3B4ECC';
const NAVY = '#121845';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// ─── Types ────────────────────────────────────────────────

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  portalEnabled: boolean;
  preferredLang: string;
  createdAt: string;
  _count: { cases: number; documents: number };
}

interface PaginationMeta {
  total: number; page: number; limit: number; totalPages: number;
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

// ─── New Client Modal ─────────────────────────────────────

function NewClientModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFirstName(''); setLastName(''); setEmail('');
    setPhone(''); setAddress(''); setError(null);
  };

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('First name, last name, and email are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/clients', {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, email, phone: phone || undefined, address: address || undefined }),
      });
      reset();
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Client</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} style={styles.modalCloseBtn}>
              <Feather name="x" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>First Name *</Text>
                <TextInput
                  style={styles.field}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Jane"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Last Name *</Text>
                <TextInput
                  style={styles.field}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Smith"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Email *</Text>
            <TextInput
              style={styles.field}
              value={email}
              onChangeText={setEmail}
              placeholder="jane@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.field}
              value={phone}
              onChangeText={setPhone}
              placeholder="(212) 555-0100"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              style={styles.field}
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main St, New York, NY"
              placeholderTextColor="#9CA3AF"
            />

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={() => { reset(); onClose(); }}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              style={[styles.createBtn, loading && styles.btnDisabled]}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.createBtnText}>Create Client</Text>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────

export default function ClientsScreen() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      const result = await apiFetch<{ data: Client[]; meta: PaginationMeta }>(
        `/clients?${params.toString()}`
      );
      setClients(result.data);
      setMeta(result.meta);
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Clients</Text>
          <Text style={styles.headerSub}>
            {loading ? '…' : `${meta.total} total`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowNewModal(true)}
        >
          <Feather name="user-plus" size={14} color="#fff" />
          <Text style={styles.addBtnText}>Add Client</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients…"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={14} color="#DC2626" />
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={fetchClients}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      )}

      {/* Client list */}
      {!loading && (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {clients.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="users" size={32} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {debouncedSearch ? 'No clients found' : 'No clients yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {debouncedSearch
                  ? 'Try a different search'
                  : 'Add your first client to get started'
                }
              </Text>
              {!debouncedSearch && (
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => setShowNewModal(true)}
                >
                  <Text style={styles.emptyActionText}>Add Client</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            clients.map((client) => {
              const color = avatarColor(client.id);
              return (
                <TouchableOpacity
                  key={client.id}
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/clients/${client.id}` as never)}
                >
                  <View style={[styles.avatar, { backgroundColor: color }]}>
                    <Text style={styles.avatarText}>
                      {getInitials(client.firstName, client.lastName)}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.clientName}>
                        {client.firstName} {client.lastName}
                      </Text>
                      <View style={styles.badgeRow}>
                        {client.portalEnabled && (
                          <View style={styles.portalBadge}>
                            <Text style={styles.portalBadgeText}>Portal</Text>
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
                    </View>

                    <View style={styles.detailRow}>
                      <Feather name="mail" size={11} color="#9CA3AF" />
                      <Text style={styles.detailText} numberOfLines={1}>{client.email}</Text>
                    </View>
                    {client.phone && (
                      <View style={styles.detailRow}>
                        <Feather name="phone" size={11} color="#9CA3AF" />
                        <Text style={styles.detailText}>{client.phone}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Feather name="briefcase" size={11} color="#9CA3AF" />
                      <Text style={styles.detailText}>
                        {client._count.cases} {client._count.cases === 1 ? 'case' : 'cases'}
                      </Text>
                    </View>
                  </View>

                  <Feather name="chevron-right" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* New client modal */}
      <NewClientModal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={fetchClients}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: NAVY },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#8A9AC0', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#111827' },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FEE2E2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  errorBannerText: { flex: 1, fontSize: 12, color: '#DC2626' },
  retryText: { fontSize: 12, color: '#DC2626', fontWeight: '700' },

  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6FA' },

  list: { flex: 1, backgroundColor: '#F4F6FA', paddingTop: 4 },

  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cardInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  clientName: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  badgeRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  portalBadge: { backgroundColor: '#EEF1FB', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  portalBadgeText: { fontSize: 9, fontWeight: '700', color: PRIMARY },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  activeBadge: { backgroundColor: '#D1FAE5' },
  newBadge: { backgroundColor: '#F3F4F6' },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  activeText: { color: '#059669' },
  newText: { color: '#6B7280' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { fontSize: 12, color: '#9CA3AF', flex: 1 },

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  emptyAction: { marginTop: 8, backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  emptyActionText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Modal
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  field: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#FAFAFA' },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginTop: 12 },
  errorText: { fontSize: 13, color: '#DC2626' },
  modalFooter: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 24, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  createBtn: { flex: 1, backgroundColor: PRIMARY, borderRadius: 24, paddingVertical: 12, alignItems: 'center' },
  createBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
});
