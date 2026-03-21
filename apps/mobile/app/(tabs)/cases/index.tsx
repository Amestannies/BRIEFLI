import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PRIMARY = '#3B4ECC';
const NAVY = '#121845';

const CASES = [
  { id: '1', title: 'Johnson v. Park Ave Properties', client: 'Marcus Johnson', type: 'Eviction', stage: 'Discovery', status: 'Active', date: 'Mar 21, 2026' },
  { id: '2', title: 'Rivera v. Sunset Apartments', client: 'Elena Rivera', type: 'Lease Dispute', stage: 'Hearing', status: 'Active', date: 'Mar 21, 2026' },
  { id: '3', title: 'Chen v. Oakwood Realty', client: 'Wei Chen', type: 'Non-Payment', stage: 'Filing', status: 'Active', date: 'Mar 22, 2026' },
  { id: '4', title: 'Williams v. Metro Housing', client: 'Darius Williams', type: 'Eviction', stage: 'Intake', status: 'Pending', date: 'Mar 24, 2026' },
  { id: '5', title: 'Garcia v. Hillside Properties', client: 'Sofia Garcia', type: 'Habitability', stage: 'Negotiation', status: 'Active', date: 'Mar 25, 2026' },
  { id: '6', title: 'Patel v. Downtown Realty', client: 'Priya Patel', type: 'Non-Payment', stage: 'Discovery', status: 'Active', date: 'Mar 28, 2026' },
];

const STAGES = ['All', 'Intake', 'Filing', 'Discovery', 'Hearing', 'Negotiation'];

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  Discovery: { bg: '#EDE9FE', text: '#7C3AED' },
  Hearing: { bg: '#FEF3C7', text: '#D97706' },
  Filing: { bg: '#EEF1FB', text: PRIMARY },
  Negotiation: { bg: '#D1FAE5', text: '#059669' },
  Intake: { bg: '#F3F4F6', text: '#6B7280' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Active: { bg: '#D1FAE5', text: '#059669' },
  Pending: { bg: '#FEF3C7', text: '#D97706' },
  Closed: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function CasesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('All');

  const filtered = CASES.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.client.toLowerCase().includes(search.toLowerCase());
    const matchStage = stage === 'All' || c.stage === stage;
    return matchSearch && matchStage;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Cases</Text>
          <Text style={styles.headerSub}>{CASES.filter(c => c.status !== 'Closed').length} active</Text>
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>New Case</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search cases or clients..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Stage filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filters}>
        {STAGES.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setStage(s)}
            style={[styles.filterChip, stage === s && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, stage === s && styles.filterTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Cases list */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.map((c) => {
          const stageStyle = STAGE_COLORS[c.stage] ?? { bg: '#F3F4F6', text: '#6B7280' };
          const statusStyle = STATUS_COLORS[c.status] ?? { bg: '#F3F4F6', text: '#6B7280' };
          return (
            <TouchableOpacity key={c.id} style={styles.caseCard} activeOpacity={0.7} onPress={() => router.push(`/cases/${c.id}` as never)}>
              <View style={styles.caseCardTop}>
                <View style={styles.caseIconWrap}>
                  <Feather name="briefcase" size={16} color={PRIMARY} />
                </View>
                <View style={styles.caseInfo}>
                  <Text style={styles.caseTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.caseClient}>{c.client} · {c.type}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#D1D5DB" />
              </View>
              <View style={styles.caseCardBottom}>
                <View style={[styles.badge, { backgroundColor: stageStyle.bg }]}>
                  <Text style={[styles.badgeText, { color: stageStyle.text }]}>{c.stage}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.badgeText, { color: statusStyle.text }]}>{c.status}</Text>
                </View>
                <View style={styles.dateRow}>
                  <Feather name="calendar" size={10} color="#9CA3AF" />
                  <Text style={styles.dateText}>{c.date}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Feather name="briefcase" size={32} color="#D1D5DB" />
            <Text style={styles.emptyText}>No cases match your filters</Text>
            <TouchableOpacity onPress={() => { setSearch(''); setStage('All'); }}>
              <Text style={styles.emptyLink}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
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

  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#111827' },

  filtersScroll: { maxHeight: 44 },
  filters: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#fff' },

  list: { flex: 1, backgroundColor: '#F4F6FA', paddingTop: 8 },

  caseCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  caseCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  caseIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF1FB', alignItems: 'center', justifyContent: 'center' },
  caseInfo: { flex: 1, minWidth: 0 },
  caseTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  caseClient: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  caseCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  dateText: { fontSize: 11, color: '#9CA3AF' },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  emptyLink: { fontSize: 13, color: PRIMARY, fontWeight: '600' },
});
