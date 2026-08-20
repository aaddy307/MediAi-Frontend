import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getAppointments } from '../../api/appointments';
import { getLatestVitals } from '../../api/vitals';
import { getReminders } from '../../api/medicines';
import { getMe } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';

const QUICK_ACTIONS = [
  { id: '1', label: 'Symptom Checker', icon: 'pulse', color: '#0D9488', screen: 'Symptom' },
  { id: '2', label: 'Find Doctors', icon: 'people', color: '#3B82F6', screen: 'Doctors' },
  { id: '3', label: 'Emergency SOS', icon: 'warning', color: '#EF4444', screen: 'Emergency' },
  { id: '4', label: 'Medicine Reminders', icon: 'alarm', color: '#8B5CF6', screen: 'MedicineReminders' },
  { id: '5', label: 'Medicine Store', icon: 'medkit', color: '#10B981', screen: 'MedicineStore' },
  { id: '6', label: 'Health Records', icon: 'fitness', color: '#F59E0B', screen: 'Health' },
  { id: '7', label: 'My Reports', icon: 'document-text', color: '#6366F1', screen: 'Reports' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : 12);
  const bottomPadding = insets.bottom + 32;

  const user = useAuthStore((s) => s.user);
  const [nextAppt, setNextAppt] = useState(null);
  const [vitals, setVitals] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const displayName = user?.fullName || user?.name || 'there';
  const firstName = displayName.trim().split(' ')[0] || 'there';

  const load = useCallback(async () => {
    try {
      try {
        const meRes = await getMe();
        const meData = meRes?.data || meRes?.user || meRes;
        if (meData && meData._id) {
          useAuthStore.setState({ user: meData });
        }
      } catch (_) {}

      const [apptData, vitalsData, remData] = await Promise.allSettled([
        getAppointments({ upcoming: 1, limit: 1 }),
        getLatestVitals(),
        getReminders(),
      ]);
      if (apptData.status === 'fulfilled') {
        const val = apptData.value;
        const first = Array.isArray(val) ? val[0] : val?.appointments?.[0] || val?.data?.[0] || null;
        setNextAppt(first);
      }
      if (vitalsData.status === 'fulfilled') setVitals(vitalsData.value?.vitals || vitalsData.value?.data || vitalsData.value || null);
      if (remData.status === 'fulfilled') {
        const list = remData.value?.data || remData.value?.reminders || (Array.isArray(remData.value) ? remData.value : []);
        setReminders(list);
      }
    } catch (_) {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const activePendingReminders = (reminders || []).filter(
    (rem) => rem.status !== 'taken' && rem.status !== 'skipped'
  );

  return (
    <View style={styles.screen}>
      {/* Sticky Top Profile Header */}
      <View style={[styles.stickyHeader, { paddingTop: topPadding }]}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{firstName} 👋</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
          <Avatar name={displayName} uri={user?.avatar} size="md" borderColor={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Primary Path Selection (Section 1 in Logic.md) */}
        <View style={styles.pathSection}>
        {/* Path A: AI Symptom Checker */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Symptom')}
          activeOpacity={0.9}
          style={styles.pathCardWrapper}
        >
          <LinearGradient colors={gradients.primary} style={styles.pathCardGrad}>
            <View style={styles.pathCardHeader}>
              <View style={styles.pathIconBox}>
                <Ionicons name="pulse" size={24} color={colors.white} />
              </View>
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>PATH A • AI TRIAGE</Text>
              </View>
            </View>
            <Text style={styles.pathTitle}>AI Symptom Checker</Text>
            <Text style={styles.pathSub}>
              Describe your symptoms for an instant clinical risk evaluation and specialist recommendation.
            </Text>
            <View style={styles.pathBtnRow}>
              <Text style={styles.pathBtnText}>Start Check</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.white} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Path B: Skip AI, Book Doctor Directly */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Doctors')}
          activeOpacity={0.9}
          style={styles.pathCardWrapper}
        >
          <Card style={styles.pathCardWhite} padding={16}>
            <View style={styles.pathCardHeader}>
              <View style={[styles.pathIconBox, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="person-add" size={22} color={colors.primary} />
              </View>
              <View style={[styles.badgePill, { backgroundColor: colors.borderLight }]}>
                <Text style={[styles.badgePillText, { color: colors.textSecondary }]}>PATH B • DIRECT</Text>
              </View>
            </View>
            <Text style={styles.pathTitleDark}>Book a Doctor Directly</Text>
            <Text style={styles.pathSubDark}>
              Skip the AI questionnaire. Browse certified specialists, view available calendar slots, or request instant consultation.
            </Text>
            <View style={styles.pathBtnRowDark}>
              <Text style={styles.pathBtnTextDark}>Browse Doctors</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </View>
          </Card>
        </TouchableOpacity>
      </View>

      {/* Next Appointment Banner */}
      {nextAppt ? (
        <TouchableOpacity
          onPress={() => navigation.navigate('Appointments')}
          activeOpacity={0.85}
        >
          <Card style={styles.apptBanner} padding={14}>
            <Ionicons name="calendar" size={22} color={colors.primary} />
            <View style={styles.apptBannerText}>
              <Text style={styles.apptBannerLabel}>Upcoming Appointment</Text>
              <Text style={styles.apptBannerTitle}>
                Dr. {nextAppt.doctor?.fullName || nextAppt.doctor?.name || 'Doctor'} · {new Date(nextAppt.date).toLocaleDateString()} at {nextAppt.time}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Card>
        </TouchableOpacity>
      ) : null}

      {/* Vitals Strip */}
      {vitals && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Vitals</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Health')}>
              <Text style={styles.seeAll}>View all →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.vitalsRow}>
              {[
                { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', icon: 'heart', color: '#EF4444' },
                { key: 'systolicBP', label: 'Systolic BP', unit: 'mmHg', icon: 'fitness', color: '#0D9488' },
                { key: 'temperature', label: 'Temperature', unit: '°F', icon: 'thermometer', color: '#F59E0B' },
                { key: 'oxygenLevel', label: 'SpO₂', unit: '%', icon: 'water', color: '#06B6D4' },
              ].map((v) => vitals[v.key] ? (
                <Card key={v.key} style={[styles.vitalCard, { borderLeftColor: v.color }]} padding={12}>
                  <Ionicons name={v.icon} size={16} color={v.color} />
                  <Text style={styles.vitalValue}>{vitals[v.key]} <Text style={styles.vitalUnit}>{v.unit}</Text></Text>
                  <Text style={styles.vitalLabel}>{v.label}</Text>
                </Card>
              ) : null)}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Medicine Reminders Strip (Only active un-taken reminders) */}
      {activePendingReminders.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderTitleRow}>
              <Ionicons name="alarm-outline" size={18} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Medication Schedule</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('MedicineReminders')}>
              <Text style={styles.seeAll}>Manage →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.medScroll}>
            {activePendingReminders.slice(0, 6).map((rem) => {
              return (
                <TouchableOpacity
                  key={rem._id || Math.random().toString()}
                  onPress={() => navigation.navigate('MedicineReminders')}
                  activeOpacity={0.85}
                >
                  <Card style={styles.medRemCard} padding={12}>
                    <View style={styles.medRemTop}>
                      <Ionicons
                        name="medical"
                        size={16}
                        color={colors.primary}
                      />
                      <Text style={styles.medRemTime}>{rem.time || 'Daily'}</Text>
                    </View>
                    <Text style={styles.medRemName} numberOfLines={1}>
                      {rem.medicineName}
                    </Text>
                    <Text style={styles.medRemPeriod} numberOfLines={1}>
                      {rem.date ? (rem.date === new Date().toISOString().split('T')[0] ? 'Today' : rem.date) + ' · ' : ''}{rem.period || 'General'}
                    </Text>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Quick Actions Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Services</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionTile}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '18' }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
    zIndex: 10,
  },
  scrollView: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.lg, paddingBottom: 40 },
  greeting: { fontSize: typography.fontSizes.sm, color: colors.textMuted, fontWeight: typography.fontWeights.medium },
  userName: { fontSize: typography.fontSizes['2xl'], fontWeight: typography.fontWeights.bold, color: colors.text },
  
  /* Primary Paths Section */
  pathSection: { gap: 12 },
  pathCardWrapper: {
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    ...shadows.md,
  },
  pathCardGrad: {
    padding: spacing.lg,
    borderRadius: radius['2xl'],
    gap: 8,
  },
  pathCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pathIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  pathTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  pathSub: {
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  pathBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  pathBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },

  pathCardWhite: {
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 8,
  },
  pathTitleDark: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  pathSubDark: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
  pathBtnRowDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  pathBtnTextDark: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },

  apptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.primary + '33',
    backgroundColor: colors.primaryGlow,
  },
  apptBannerText: { flex: 1 },
  apptBannerLabel: { fontSize: 11, color: colors.primaryDark, fontWeight: typography.fontWeights.bold },
  apptBannerTitle: { fontSize: typography.fontSizes.sm, color: colors.text, fontWeight: typography.fontWeights.semibold, marginTop: 2 },

  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.text },
  seeAll: { fontSize: typography.fontSizes.xs, color: colors.primary, fontWeight: typography.fontWeights.bold },
  
  vitalsRow: { flexDirection: 'row', gap: 10 },
  vitalCard: { width: 130, borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border },
  vitalValue: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: colors.text, marginVertical: 4 },
  vitalUnit: { fontSize: 11, color: colors.textMuted, fontWeight: typography.fontWeights.normal },
  vitalLabel: { fontSize: 11, color: colors.textMuted },

  medScroll: { gap: 10, paddingVertical: 2 },
  medRemCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  medRemCardTaken: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  medRemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  medRemTime: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  medRemName: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  medRemNameTaken: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  medRemPeriod: {
    fontSize: 10,
    color: colors.textMuted,
  },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionTile: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  actionIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, color: colors.text, fontWeight: typography.fontWeights.semibold, textAlign: 'center' },
});
