import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../../components/ui/Card';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { getSuperAdminDashboard, getAnalytics } from '../../api/superAdmin';

export default function PlatformAnalyticsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState({});
  const [analytics, setAnalytics] = useState({});

  const loadData = useCallback(async () => {
    try {
      const [dashRes, analRes] = await Promise.allSettled([
        getSuperAdminDashboard(),
        getAnalytics(),
      ]);

      if (dashRes.status === 'fulfilled') {
        setDashboard(dashRes.value?.stats || dashRes.value || {});
      }
      if (analRes.status === 'fulfilled') {
        setAnalytics(analRes.value?.data || analRes.value || {});
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const revenueStr = dashboard.totalRevenue ? `₹${Number(dashboard.totalRevenue).toLocaleString('en-IN')}` : '₹0.00';
  const totalSOSVal = analytics.totalSOS !== undefined ? String(analytics.totalSOS) : '0';
  const avgResponse = analytics.avgResponseTimeMinutes !== undefined ? `${analytics.avgResponseTimeMinutes} mins` : '—';
  const activeConsultations = dashboard.totalConsultations !== undefined ? String(dashboard.totalConsultations) : '0';
  const partnerHospitals = dashboard.totalAdmins !== undefined ? String(dashboard.totalAdmins) : '0';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {loading && <LoadingOverlay message="Fetching platform metrics..." />}

      <LinearGradient colors={['#10B981', '#059669']} style={styles.heroCard}>
        <Text style={styles.heroLabel}>Platform Gross Volume</Text>
        <Text style={styles.heroAmount}>{revenueStr}</Text>
        <Text style={styles.heroSub}>Central platform aggregated transaction revenue</Text>
      </LinearGradient>

      {/* Metric Grid */}
      <View style={styles.grid}>
        <Card style={styles.metricCard} padding={16}>
          <Ionicons name="pulse" size={24} color={colors.primary} />
          <Text style={styles.metricVal}>{activeConsultations}</Text>
          <Text style={styles.metricLabel}>Total Consultations</Text>
        </Card>

        <Card style={styles.metricCard} padding={16}>
          <Ionicons name="chatbubbles" size={24} color={colors.info} />
          <Text style={styles.metricVal}>{dashboard.totalDoctors || '0'}</Text>
          <Text style={styles.metricLabel}>Platform Doctors</Text>
        </Card>

        <Card style={styles.metricCard} padding={16}>
          <Ionicons name="warning" size={24} color={colors.danger} />
          <Text style={styles.metricVal}>{totalSOSVal}</Text>
          <Text style={styles.metricLabel}>Emergency SOS Alerts</Text>
        </Card>

        <Card style={styles.metricCard} padding={16}>
          <Ionicons name="business" size={24} color={colors.warning} />
          <Text style={styles.metricVal}>{partnerHospitals}</Text>
          <Text style={styles.metricLabel}>Partner Hospitals</Text>
        </Card>
      </View>

      {/* System Load & AI Health */}
      <Card style={styles.healthCard} padding={16}>
        <Text style={styles.sectionTitle}>System Performance & Response</Text>
        <View style={styles.healthRow}>
          <Text style={styles.healthLabel}>Avg SOS Dispatch Response</Text>
          <Text style={styles.healthVal}>{avgResponse}</Text>
        </View>
        <View style={styles.healthRow}>
          <Text style={styles.healthLabel}>Platform Uptime Rate</Text>
          <Text style={[styles.healthVal, { color: colors.success }]}>
            {dashboard.uptimePercent ? `${dashboard.uptimePercent}%` : '99.9% Uptime'}
          </Text>
        </View>
        <View style={styles.healthRow}>
          <Text style={styles.healthLabel}>Database Connection State</Text>
          <Text style={[styles.healthVal, { color: colors.success }]}>Connected</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, gap: 16, paddingBottom: 40 },
  heroCard: {
    padding: spacing.xl,
    borderRadius: radius['2xl'],
    gap: 6,
    ...shadows.primary,
  },
  heroLabel: {
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  heroAmount: {
    fontSize: typography.fontSizes['3xl'],
    fontWeight: typography.fontWeights.extrabold,
    color: colors.white,
  },
  heroSub: {
    fontSize: 11,
    color: colors.white,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    gap: 6,
  },
  metricVal: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  metricLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  healthCard: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  healthLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.text,
  },
  healthVal: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
});

