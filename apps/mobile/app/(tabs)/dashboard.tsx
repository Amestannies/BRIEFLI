import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const PRIMARY = '#3B4ECC';
const NAVY = '#121845';

const STATS = [
  { label: 'Active Cases', value: '24', trend: '+3', color: PRIMARY, bg: '#EEF1FB' },
  { label: 'Hearings', value: '7', trend: '+1', color: '#D97706', bg: '#FEF3C7' },
  { label: 'Unbilled Hrs', value: '42.5', trend: '0', color: '#7C3AED', bg: '#EDE9FE' },
  { label: 'Revenue', value: '$18.4k', trend: '+12%', color: '#059669', bg: '#D1FAE5' },
];

const RECENT_CASES = [
  { id: '1', title: 'Johnson v. Park Ave', client: 'Marcus Johnson', stage: 'Discovery', urgent: true },
  { id: '2', title: 'Rivera v. Sunset Apts', client: 'Elena Rivera', stage: 'Hearing', urgent: true },
  { id: '3', title: 'Chen v. Oakwood Realty', client: 'Wei Chen', stage: 'Filing', urgent: false },
  { id: '4', title: 'Garcia v. Hillside', client: 'Sofia Garcia', stage: 'Negotiation', urgent: false },
];

const DEADLINES = [
  { id: '1', title: 'File Answer — Johnson', time: 'Today, 5:00 PM', urgent: true },
  { id: '2', title: 'Hearing — Rivera', time: 'Tomorrow, 9:30 AM', urgent: true },
  { id: '3', title: 'Discovery — Chen', time: 'Mar 22, 2026', urgent: false },
];

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  Discovery: { bg: '#EDE9FE', text: '#7C3AED' },
  Hearing: { bg: '#FEF3C7', text: '#D97706' },
  Filing: { bg: '#EEF1FB', text: PRIMARY },
  Negotiation: { bg: '#D1FAE5', text: '#059669' },
  Intake: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function DashboardScreen() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>{greeting},</Text>
          <Text style={styles.headerTitle}>Counselor.</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Feather name="search" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]}>
            <View style={styles.notifDot} />
            <Feather name="bell" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {STATS.map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statTrend, { color: s.color }]}>{s.trend}</Text>
            </View>
          ))}
        </View>

        {/* Recent Cases */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Cases</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>

          {RECENT_CASES.map((c) => {
            const stageStyle = STAGE_COLORS[c.stage] ?? { bg: '#F3F4F6', text: '#6B7280' };
            return (
              <TouchableOpacity key={c.id} style={styles.caseRow} activeOpacity={0.7}>
                <View style={styles.caseIcon}>
                  <Feather name="briefcase" size={14} color={PRIMARY} />
                </View>
                <View style={styles.caseInfo}>
                  <Text style={styles.caseTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.caseClient}>{c.client}</Text>
                </View>
                <View style={[styles.stageBadge, { backgroundColor: stageStyle.bg }]}>
                  <Text style={[styles.stageText, { color: stageStyle.text }]}>{c.stage}</Text>
                </View>
                <Feather name="chevron-right" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.addRow}>
            <Feather name="plus" size={14} color={PRIMARY} />
            <Text style={styles.addText}>New case</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Deadlines */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>Calendar</Text>
            </TouchableOpacity>
          </View>

          {DEADLINES.map((d) => (
            <View key={d.id} style={styles.deadlineRow}>
              <View style={[styles.deadlineIcon, { backgroundColor: d.urgent ? '#FEE2E2' : '#F3F4F6' }]}>
                <Feather name={d.urgent ? 'alert-circle' : 'clock'} size={14} color={d.urgent ? '#DC2626' : '#6B7280'} />
              </View>
              <View style={styles.deadlineInfo}>
                <Text style={styles.deadlineTitle} numberOfLines={1}>{d.title}</Text>
                <Text style={[styles.deadlineTime, { color: d.urgent ? '#DC2626' : '#9CA3AF' }]}>{d.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsGrid}>
          {[
            { label: 'New Case', icon: 'briefcase', color: PRIMARY, bg: '#EEF1FB' },
            { label: 'Log Time', icon: 'clock', color: '#D97706', bg: '#FEF3C7' },
            { label: 'Add Client', icon: 'user-plus', color: '#7C3AED', bg: '#EDE9FE' },
            { label: 'New Invoice', icon: 'file-text', color: '#059669', bg: '#D1FAE5' },
          ].map(({ label, icon, color, bg }) => (
            <TouchableOpacity key={label} style={[styles.quickAction, { backgroundColor: bg }]} activeOpacity={0.7}>
              <Feather name={icon as any} size={20} color={color} />
              <Text style={[styles.quickActionText, { color }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  scroll: { flex: 1, backgroundColor: '#F4F6FA' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: NAVY },
  headerGreeting: { fontSize: 13, color: '#8A9AC0', fontWeight: '500' },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', zIndex: 1 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statCard: { width: '47.5%', borderRadius: 14, padding: 14 },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 26, fontWeight: '700', marginBottom: 2 },
  statTrend: { fontSize: 11, fontWeight: '600' },

  // Section
  section: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sectionLink: { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  // Cases
  caseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  caseIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF1FB', alignItems: 'center', justifyContent: 'center' },
  caseInfo: { flex: 1, minWidth: 0 },
  caseTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  caseClient: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  stageBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 },
  stageText: { fontSize: 10, fontWeight: '700' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  addText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  // Deadlines
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  deadlineIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  deadlineInfo: { flex: 1 },
  deadlineTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  deadlineTime: { fontSize: 11, marginTop: 1, fontWeight: '500' },

  // Quick actions
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 8, marginBottom: 8 },
  quickAction: { width: '47.5%', borderRadius: 14, padding: 16, alignItems: 'center', gap: 8 },
  quickActionText: { fontSize: 12, fontWeight: '700' },
});
