import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../../store/authStore';
import { getAdminDashboard, getAuditLogs } from '../../api/admin';
import { colors, typography, spacing, radius, gradients, shadows } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const { width: SCREEN_W } = Dimensions.get('window');

const STAT_CARDS = [
  { key: 'totalUsers', label: 'Total Users', icon: 'people', color: colors.primary, screen: 'UserManagement' },
  { key: 'appointmentsToday', label: "Today's Appts", icon: 'calendar', color: colors.info, screen: 'AdminAppointments' },
  { key: 'openEmergencies', label: 'Open Emergencies', icon: 'warning', color: colors.danger, screen: 'AdminEmergency' },
  { key: 'pendingOrders', label: 'Pending Orders', icon: 'medical', color: colors.warning, screen: 'AdminPharmacy' },
];

export default function AdminHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : 12);
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [dashRes, logRes] = await Promise.allSettled([
      getAdminDashboard(),
      getAuditLogs({ limit: 5 }),
    ]);
    if (dashRes.status === 'fulfilled') setStats(dashRes.value?.data || dashRes.value?.stats || dashRes.value || {});
    if (logRes.status === 'fulfilled') setAuditLogs(logRes.value?.data || logRes.value?.logs || logRes.value || []);
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener('focus', () => {
      load();
    });
    return unsubscribe;
  }, [navigation, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const pieData = [
    { name: 'Patients', population: stats.patients || 0, color: colors.primary, legendFontColor: colors.textSecondary },
    { name: 'Doctors', population: stats.doctors || 0, color: colors.success, legendFontColor: colors.textSecondary },
    { name: 'Admins', population: stats.admins || 0, color: colors.warning, legendFontColor: colors.textSecondary },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Hero */}
      <LinearGradient colors={gradients.hero} style={[styles.hero, { paddingTop: topPadding + spacing.sm }]}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroGreeting}>Admin Panel</Text>
            <Text style={styles.heroName}>{user?.name}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {STAT_CARDS.map((s) => {
            const CardComponent = (
              <Card key={s.key} style={[styles.statCard, { borderColor: s.color + '44' }]} padding={14}>
                <Ionicons name={s.icon} size={22} color={s.color} />
                <Text style={[styles.statValue, { color: s.color }]}>
                  {stats[s.key] ?? '—'}
                </Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </Card>
            );
            return (
              <TouchableOpacity
                key={s.key}
                style={styles.statWrapper}
                onPress={() => navigation.navigate(s.screen)}
                activeOpacity={0.8}
              >
                {CardComponent}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {[
            { label: 'Doctors', subtitle: 'Verification', icon: 'medkit', screen: 'AdminDoctors', color: colors.primary },
            { label: 'Appointments', subtitle: 'Facility', icon: 'calendar', screen: 'AdminAppointments', color: colors.info },
            { label: 'Emergency', subtitle: 'Live Monitor', icon: 'warning', screen: 'AdminEmergency', color: colors.danger },
            { label: 'Pharmacy', subtitle: 'Orders', icon: 'cube', screen: 'AdminPharmacy', color: colors.success },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.quickCard}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
              <Text style={styles.quickSub}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* User distribution chart */}
      {(stats.patients || stats.doctors) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Distribution</Text>
          <Card padding={16}>
            <PieChart
              data={pieData}
              width={SCREEN_W - 64}
              height={160}
              chartConfig={{
                color: () => colors.primary,
                labelColor: () => colors.textSecondary,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </Card>
        </View>
      ) : null}

      {/* Recent audit logs */}
      {auditLogs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AuditLog')}>
              <Text style={styles.seeAll}>View all →</Text>
            </TouchableOpacity>
          </View>
          {auditLogs.map((log) => (
            <Card key={log._id} style={styles.logItem} padding={12}>
              <View style={styles.logRow}>
                <View style={[styles.logDot, { backgroundColor: log.severity === 'high' ? colors.danger : colors.primary }]} />
                <View style={styles.logInfo}>
                  <Text style={styles.logAction}>{log.action}</Text>
                  <Text style={styles.logMeta}>{log.user?.name || 'System'} · {new Date(log.createdAt).toLocaleTimeString()}</Text>
                </View>
                <Badge label={log.severity || 'info'} variant={log.severity === 'high' ? 'danger' : 'info'} size="xs" />
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  hero: {
    padding: spacing.base,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.xl,
    gap: 20,
  },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroGreeting: { fontSize: typography.fontSizes.sm, color: colors.textMuted },
  heroName: { fontSize: typography.fontSizes['2xl'], fontWeight: typography.fontWeights.extrabold, color: colors.text },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statWrapper: { width: '48%', marginBottom: 12 },
  statCard: { width: '100%', alignItems: 'center', gap: 6 },
  statValue: { fontSize: typography.fontSizes['2xl'], fontWeight: typography.fontWeights.extrabold },
  statLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  section: { padding: spacing.base, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: colors.text },
  seeAll: { fontSize: typography.fontSizes.sm, color: colors.primary, fontWeight: typography.fontWeights.medium },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickLabel: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  quickSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  logItem: {},
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logInfo: { flex: 1 },
  logAction: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.medium, color: colors.text },
  logMeta: { fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 2 },
});
