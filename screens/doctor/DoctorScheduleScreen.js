import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DoctorScheduleScreen({ navigation }) {
  const [schedule, setSchedule] = useState({
    Monday: { active: true, start: '09:00 AM', end: '05:00 PM' },
    Tuesday: { active: true, start: '09:00 AM', end: '05:00 PM' },
    Wednesday: { active: true, start: '09:00 AM', end: '05:00 PM' },
    Thursday: { active: true, start: '09:00 AM', end: '05:00 PM' },
    Friday: { active: true, start: '09:00 AM', end: '05:00 PM' },
    Saturday: { active: false, start: '10:00 AM', end: '02:00 PM' },
    Sunday: { active: false, start: '10:00 AM', end: '02:00 PM' },
  });
  const [isAcceptingConsultations, setIsAcceptingConsultations] = useState(true);
  const [slotDuration, setSlotDuration] = useState('30 mins');
  const [saving, setSaving] = useState(false);

  const toggleDay = (day) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], active: !prev[day].active },
    }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Schedule Updated', 'Your availability preferences have been saved successfully.');
    }, 600);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {/* Header status toggle */}
      <Card style={styles.statusCard} padding={16}>
        <View style={styles.statusRow}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Accepting Consultations</Text>
            <Text style={styles.statusSub}>Allow patients to book slots & start chat sessions</Text>
          </View>
          <Switch
            value={isAcceptingConsultations}
            onValueChange={setIsAcceptingConsultations}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </Card>

      {/* Slot Duration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Default Slot Duration</Text>
        <View style={styles.durationsRow}>
          {['15 mins', '30 mins', '45 mins', '60 mins'].map((dur) => (
            <TouchableOpacity
              key={dur}
              style={[styles.durPill, slotDuration === dur && styles.durPillActive]}
              onPress={() => setSlotDuration(dur)}
            >
              <Text style={[styles.durText, slotDuration === dur && styles.durTextActive]}>{dur}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Weekly Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Availability</Text>
        <View style={styles.daysList}>
          {DAYS.map((day) => {
            const config = schedule[day];
            return (
              <Card key={day} style={[styles.dayCard, !config.active && styles.dayCardInactive]} padding={14}>
                <View style={styles.dayTop}>
                  <View style={styles.dayLabelRow}>
                    <Switch
                      value={config.active}
                      onValueChange={() => toggleDay(day)}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.white}
                    />
                    <Text style={[styles.dayName, !config.active && styles.dayNameInactive]}>{day}</Text>
                  </View>
                  <Text style={[styles.statusBadge, config.active ? styles.badgeActive : styles.badgeInactive]}>
                    {config.active ? 'Available' : 'Off'}
                  </Text>
                </View>

                {config.active && (
                  <View style={styles.hoursRow}>
                    <View style={styles.timeBox}>
                      <Ionicons name="time-outline" size={14} color={colors.primary} />
                      <Text style={styles.timeVal}>{config.start}</Text>
                    </View>
                    <Text style={styles.toText}>to</Text>
                    <View style={styles.timeBox}>
                      <Ionicons name="time-outline" size={14} color={colors.primary} />
                      <Text style={styles.timeVal}>{config.end}</Text>
                    </View>
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      </View>

      <Button title="Save Working Schedule" onPress={handleSave} loading={saving} style={{ marginTop: 12 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, gap: 18, paddingBottom: 40 },
  statusCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: { flex: 1, paddingRight: 12 },
  statusTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  statusSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durPillActive: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  durText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  durTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  daysList: {
    gap: 8,
  },
  dayCard: {
    gap: 10,
  },
  dayCardInactive: {
    opacity: 0.6,
  },
  dayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  dayNameInactive: {
    color: colors.textMuted,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeActive: {
    backgroundColor: colors.successLight,
    color: colors.success,
  },
  badgeInactive: {
    backgroundColor: colors.surfaceHigh,
    color: colors.textMuted,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  timeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeVal: {
    fontSize: typography.fontSizes.xs,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  toText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
});
