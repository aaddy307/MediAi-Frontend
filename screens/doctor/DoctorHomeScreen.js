import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { getAppointments, updateAppointment } from '../../api/appointments';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATUS_BADGE = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'danger',
};

function AppointmentQueueItem({ appt, onConfirm, onComplete }) {
  const time = new Date(appt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <Card style={styles.queueItem} padding={14}>
      <View style={styles.queueRow}>
        <Avatar name={appt.patient?.name} uri={appt.patient?.avatar} size="sm" />
        <View style={styles.queueInfo}>
          <Text style={styles.patientName}>{appt.patient?.name || 'Patient'}</Text>
          <Text style={styles.apptTime}>
            <Ionicons name="time-outline" size={12} /> {time}
          </Text>
          {appt.notes && <Text style={styles.apptNotes} numberOfLines={1}>{appt.notes}</Text>}
        </View>
        <Badge label={appt.status} variant={STATUS_BADGE[appt.status] || 'muted'} dot />
      </View>
      {appt.status === 'pending' && (
        <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(appt._id)}>
          <Ionicons name="checkmark" size={14} color={colors.white} />
          <Text style={styles.confirmBtnText}>Confirm</Text>
        </TouchableOpacity>
      )}
      {appt.status === 'confirmed' && (
        <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.success }]} onPress={() => onComplete(appt._id)}>
          <Ionicons name="checkmark-done" size={14} color={colors.white} />
          <Text style={styles.confirmBtnText}>Mark Complete</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

export default function DoctorHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : 12);
  const bottomPadding = insets.bottom + 32;

  const { user, logout } = useAuthStore();
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getAppointments({ doctor: 'me', today: 1 });
      const list = Array.isArray(data) ? data : Array.isArray(data?.appointments) ? data.appointments : Array.isArray(data?.data) ? data.data : [];
      setAppointments(list);
      setStats({
        total: list.length,
        pending: list.filter((a) => a.status === 'pending').length,
        completed: list.filter((a) => a.status === 'completed').length,
      });
    } catch (_) {
      setAppointments([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleConfirm = async (id) => {
    try {
      await updateAppointment(id, { status: 'confirmed' });
      setAppointments((prev) => prev.map((a) => a._id === id ? { ...a, status: 'confirmed' } : a));
    } catch (_) {}
  };

  const handleComplete = async (id) => {
    try {
      await updateAppointment(id, { status: 'completed' });
      setAppointments((prev) => prev.map((a) => a._id === id ? { ...a, status: 'completed' } : a));
    } catch (_) {}
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Hero */}
      <LinearGradient colors={gradients.hero} style={styles.hero}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroGreeting}>Good day,</Text>
            <Text style={styles.heroName}>Dr. {user?.name?.split(' ')[0] || user?.fullName?.split(' ')[0] || ''} 👨‍⚕️</Text>
          </View>
          <View style={styles.headerRight}>
            <Avatar name={user?.name || user?.fullName} uri={user?.avatar} size="md" borderColor={colors.primary} />
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'web') {
                  const confirmed = window.confirm('Are you sure you want to sign out of your doctor account?');
                  if (confirmed) logout();
                } else {
                  const { Alert } = require('react-native');
                  Alert.alert('Sign Out', 'Are you sure you want to sign out of your doctor account?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', style: 'destructive', onPress: logout },
                  ]);
                }
              }}
              style={styles.logoutBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: "Today's\nTotal", value: stats.total, icon: 'calendar', color: colors.primary },
            { label: 'Pending\nAppts', value: stats.pending, icon: 'time', color: colors.warning },
            { label: 'Completed\nToday', value: stats.completed, icon: 'checkmark-circle', color: colors.success },
          ].map((s, i) => (
            <LinearGradient key={i} colors={gradients.card} style={styles.statCard}>
              <Ionicons name={s.icon} size={20} color={s.color} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </LinearGradient>
          ))}
        </View>
      </LinearGradient>

      {/* Quick Tools Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Doctor Management Tools</Text>
        <View style={styles.toolsGrid}>
          {[
            { id: 'queue', label: 'Patient\nQueue', icon: 'people-circle', color: colors.primary, screen: 'DoctorPatientQueue' },
            { id: 'schedule', label: 'Working\nSchedule', icon: 'time', color: colors.info, screen: 'DoctorSchedule' },
            { id: 'reports', label: 'Medical\nReports', icon: 'document-text', color: colors.accent, screen: 'DoctorReports' },
            { id: 'earnings', label: 'Earnings\n& Payouts', icon: 'wallet', color: colors.success, screen: 'DoctorEarnings' },
            { id: 'scan', label: 'Emergency\nScanner', icon: 'scan-circle', color: colors.danger, screen: 'DoctorEmergencyScan' },
            { id: 'notifications', label: 'Alerts &\nNotifs', icon: 'notifications', color: colors.warning, screen: 'DoctorNotifications' },
          ].map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.toolCard}
              onPress={() => navigation.navigate(tool.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.toolIconBox, { backgroundColor: tool.color + '22' }]}>
                <Ionicons name={tool.icon} size={22} color={tool.color} />
              </View>
              <Text style={styles.toolLabel}>{tool.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Today's queue */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Queue</Text>
          <TouchableOpacity onPress={() => navigation.navigate('DoctorAppointments')}>
            <Text style={styles.seeAll}>View all →</Text>
          </TouchableOpacity>
        </View>
        {appointments.length === 0 ? (
          <Card style={styles.emptyCard} padding={24}>
            <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No appointments today</Text>
          </Card>
        ) : (
          appointments.slice(0, 5).map((appt) => (
            <AppointmentQueueItem
              key={appt._id}
              appt={appt}
              onConfirm={handleConfirm}
              onComplete={handleComplete}
            />
          ))
        )}
      </View>
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
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGreeting: { fontSize: typography.fontSizes.sm, color: colors.textMuted },
  heroName: {
    fontSize: typography.fontSizes['2xl'],
    fontWeight: typography.fontWeights.extrabold,
    color: colors.text,
  },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: radius.xl,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: typography.fontSizes['2xl'],
    fontWeight: typography.fontWeights.extrabold,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
  section: { padding: spacing.base, gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  seeAll: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  queueItem: {},
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  queueInfo: { flex: 1 },
  patientName: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.text },
  apptTime: { fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  apptNotes: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    marginTop: 10,
  },
  confirmBtnText: { color: colors.white, fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.bold },
  emptyCard: { alignItems: 'center', gap: 10 },
  emptyText: { fontSize: typography.fontSizes.sm, color: colors.textMuted },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toolCard: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  toolIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
});
