import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { getDoctorAppointments } from '../../api/appointments';

export default function DoctorEarningsScreen({ navigation }) {
  const [timeframe, setTimeframe] = useState('month'); // 'week' | 'month' | 'year'
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getDoctorAppointments({ status: 'completed' });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.appointments)
        ? data.appointments
        : [];
      setAppointments(list);
    } catch (err) {
      console.log('Error loading earnings:', err.message);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Filter appointments by timeframe
  const now = new Date();
  const filtered = appointments.filter((apt) => {
    const d = new Date(apt.date || apt.createdAt);
    if (timeframe === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    } else if (timeframe === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } else {
      return d.getFullYear() === now.getFullYear();
    }
  });

  // Compute stats from real data
  const totalRevenue = filtered.reduce((sum, apt) => sum + (apt.amount || 0), 0);
  const completedCount = filtered.length;
  const avgPerConsultation = completedCount > 0 ? totalRevenue / completedCount : 0;

  // Breakdown by consultation type
  const breakdown = filtered.reduce((acc, apt) => {
    const type = (apt.consultationType || '').toLowerCase();
    if (type.includes('video')) acc.video += apt.amount || 0;
    else if (type.includes('voice')) acc.voice += apt.amount || 0;
    else acc.chat += apt.amount || 0;
    return acc;
  }, { chat: 0, voice: 0, video: 0 });

  // Recent 10 transactions
  const recentTransactions = [...filtered]
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
    .slice(0, 10);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {loading && <LoadingOverlay message="Loading earnings..." />}

      {/* Earnings Hero Banner */}
      <LinearGradient colors={gradients.primary} style={styles.heroCard}>
        <Text style={styles.heroLabel}>
          Total Earnings ({timeframe === 'week' ? 'This Week' : timeframe === 'month' ? 'This Month' : 'This Year'})
        </Text>
        <Text style={styles.heroAmount}>₹{totalRevenue.toFixed(2)}</Text>
        <View style={styles.heroRow}>
          <View style={styles.heroItem}>
            <Text style={styles.heroItemVal}>{completedCount}</Text>
            <Text style={styles.heroItemSub}>Consultations</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroItem}>
            <Text style={styles.heroItemVal}>₹{avgPerConsultation.toFixed(0)}</Text>
            <Text style={styles.heroItemSub}>Avg / Session</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Timeframe Selector */}
      <View style={styles.tabsRow}>
        {['week', 'month', 'year'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, timeframe === t && styles.tabActive]}
            onPress={() => setTimeframe(t)}
          >
            <Text style={[styles.tabText, timeframe === t && styles.tabTextActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Revenue Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Breakdown</Text>
        <View style={styles.breakdownGrid}>
          <Card style={styles.breakdownCard} padding={14}>
            <Ionicons name="chatbubbles" size={22} color={colors.primary} />
            <Text style={styles.breakdownVal}>₹{breakdown.chat.toFixed(0)}</Text>
            <Text style={styles.breakdownLabel}>Chat Sessions</Text>
          </Card>
          <Card style={styles.breakdownCard} padding={14}>
            <Ionicons name="call" size={22} color={colors.success} />
            <Text style={styles.breakdownVal}>₹{breakdown.voice.toFixed(0)}</Text>
            <Text style={styles.breakdownLabel}>Voice Consults</Text>
          </Card>
          <Card style={styles.breakdownCard} padding={14}>
            <Ionicons name="videocam" size={22} color={colors.info} />
            <Text style={styles.breakdownVal}>₹{breakdown.video.toFixed(0)}</Text>
            <Text style={styles.breakdownLabel}>Video Consults</Text>
          </Card>
        </View>
      </View>

      {/* Recent Payout / Activity History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Consultation Payouts</Text>
        {recentTransactions.length === 0 && !loading ? (
          <EmptyState
            icon="wallet-outline"
            title="No Completed Consultations"
            message={`No completed consultations found for this ${timeframe}.`}
          />
        ) : (
          <View style={styles.txList}>
            {recentTransactions.map((tx) => {
              const patientName = tx.patient?.fullName || 'Patient';
              const typeLabel = tx.consultationType || 'Consultation';
              const typeIcon = typeLabel.toLowerCase().includes('video')
                ? 'videocam'
                : typeLabel.toLowerCase().includes('voice')
                ? 'call'
                : 'chatbubbles';
              return (
                <Card key={tx._id} style={styles.txCard} padding={14}>
                  <View style={styles.txLeft}>
                    <View style={styles.txIcon}>
                      <Ionicons name={typeIcon} size={18} color={colors.success} />
                    </View>
                    <View>
                      <Text style={styles.txName}>{patientName}</Text>
                      <Text style={styles.txType}>{typeLabel} · {formatDate(tx.date || tx.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={styles.txAmount}>₹{(tx.amount || 0).toFixed(2)}</Text>
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, gap: 18, paddingBottom: 40 },
  heroCard: {
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    gap: 8,
    ...shadows.primary,
  },
  heroLabel: {
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: typography.fontWeights.medium,
  },
  heroAmount: {
    fontSize: typography.fontSizes['3xl'],
    fontWeight: typography.fontWeights.extrabold,
    color: colors.white,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 12,
  },
  heroItem: { flex: 1 },
  heroItemVal: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  heroItemSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  heroDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
  },
  tabsRow: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.bold,
  },
  tabTextActive: { color: colors.primary },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownGrid: { flexDirection: 'row', gap: 8 },
  breakdownCard: { flex: 1, alignItems: 'center', gap: 6 },
  breakdownVal: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  breakdownLabel: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  txList: { gap: 8 },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  txType: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  txAmount: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.success,
  },
});
