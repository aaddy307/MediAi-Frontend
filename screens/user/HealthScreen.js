import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getVitals, logVitals } from '../../api/vitals';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { LinearGradient } from 'expo-linear-gradient';

const VITALS_CONFIG = [
  { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', icon: 'heart', color: '#EF4444', min: 40, max: 180, defaultVal: 72 },
  { key: 'systolicBP', label: 'Systolic BP', unit: 'mmHg', icon: 'fitness', color: '#0D9488', min: 80, max: 200, defaultVal: 120 },
  { key: 'diastolicBP', label: 'Diastolic BP', unit: 'mmHg', icon: 'pulse', color: '#6366F1', min: 50, max: 130, defaultVal: 80 },
  { key: 'temperature', label: 'Temperature', unit: '°F', icon: 'thermometer', color: '#F59E0B', min: 95, max: 105, defaultVal: 98.6 },
  { key: 'oxygenLevel', label: 'SpO₂', unit: '%', icon: 'water', color: '#06B6D4', min: 85, max: 100, defaultVal: 98 },
  { key: 'weight', label: 'Weight', unit: 'kg', icon: 'barbell', color: '#10B981', min: 30, max: 200, defaultVal: 68 },
];

function VitalsTrendGraph({ data, config }) {
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.slice(-8);
  }, [data]);

  const values = points.map((p) => Number(p.value) || 0);
  const minVal = values.length > 0 ? Math.min(...values, config.min) : config.min;
  const maxVal = values.length > 0 ? Math.max(...values, config.max) : config.max;
  const range = maxVal - minVal || 1;

  return (
    <View style={styles.graphContainer}>
      {points.length === 0 ? (
        <View style={styles.graphEmpty}>
          <Ionicons name="stats-chart-outline" size={32} color={colors.border} />
          <Text style={styles.graphEmptyText}>No readings logged yet for this vital</Text>
        </View>
      ) : (
        <View style={styles.barsRow}>
          {points.map((pt, idx) => {
            const val = Number(pt.value) || 0;
            const pct = Math.min(100, Math.max(15, ((val - minVal) / range) * 85 + 15));
            const isLast = idx === points.length - 1;

            return (
              <View key={idx} style={styles.barCol}>
                <Text style={[styles.barValText, isLast && { color: config.color, fontWeight: '700' }]}>
                  {val}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${pct}%`,
                        backgroundColor: isLast ? config.color : config.color + '66',
                        borderTopLeftRadius: 6,
                        borderTopRightRadius: 6,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barDateText, isLast && { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                  {pt.date}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function HealthScreen() {
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [form, setForm] = useState({});
  const [logging, setLogging] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeChart, setActiveChart] = useState('heartRate');

  const load = useCallback(async () => {
    try {
      const data = await getVitals({ days: 14 });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.vitals)
        ? data.vitals
        : [];
      setVitalsHistory(list);
    } catch (_) {
      setVitalsHistory([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleLog = async () => {
    const payload = {};
    VITALS_CONFIG.forEach((v) => {
      if (form[v.key]) payload[v.key] = parseFloat(form[v.key]);
    });

    if (Object.keys(payload).length === 0) {
      Alert.alert('Empty log', 'Please enter at least one vital sign reading.');
      return;
    }

    setLogging(true);
    try {
      await logVitals(payload);
      setForm({});
      setShowForm(false);
      await load();
      Alert.alert('Success', 'Vitals logged successfully.');
    } catch {
      Alert.alert('Error', 'Could not log vitals. Please try again.');
    } finally {
      setLogging(false);
    }
  };

  const activeConfig = VITALS_CONFIG.find((v) => v.key === activeChart) || VITALS_CONFIG[0];

  const graphPoints = useMemo(() => {
    const list = Array.isArray(vitalsHistory) ? vitalsHistory : [];
    return [...list]
      .reverse()
      .filter((v) => v[activeChart] !== undefined && v[activeChart] !== null)
      .map((v) => ({
        value: v[activeChart],
        date: new Date(v.createdAt || v.recordedAt || Date.now()).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
      }));
  }, [vitalsHistory, activeChart]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Interactive Trend Graph */}
      <Card style={styles.chartCard} padding={16}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleRow}>
            <Ionicons name={activeConfig.icon} size={18} color={activeConfig.color} />
            <Text style={styles.chartTitle}>{activeConfig.label} History</Text>
          </View>
          <View style={[styles.unitBadge, { backgroundColor: activeConfig.color + '18' }]}>
            <Text style={[styles.chartUnit, { color: activeConfig.color }]}>{activeConfig.unit}</Text>
          </View>
        </View>

        <VitalsTrendGraph data={graphPoints} config={activeConfig} />

        {/* Vital Selector Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, maxHeight: 46, marginTop: 12 }}
          contentContainerStyle={styles.vitalSelectorRow}
        >
          {VITALS_CONFIG.map((v) => {
            const isSelected = activeChart === v.key;
            return (
              <TouchableOpacity
                key={v.key}
                style={[
                  styles.vitalChip,
                  isSelected && {
                    backgroundColor: v.color + '18',
                    borderColor: v.color,
                  },
                ]}
                onPress={() => setActiveChart(v.key)}
                activeOpacity={0.75}
              >
                <Ionicons name={v.icon} size={14} color={isSelected ? v.color : colors.textMuted} />
                <Text style={[styles.vitalChipText, isSelected && { color: v.color, fontWeight: '700' }]}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Card>

      {/* Latest Readings Summary Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Latest Health Indicators</Text>
        <View style={styles.vitalsGrid}>
          {VITALS_CONFIG.map((v) => {
            const latestObj = vitalsHistory.find((item) => item[v.key] !== undefined && item[v.key] !== null);
            const latestVal = latestObj ? latestObj[v.key] : '—';

            return (
              <Card key={v.key} style={[styles.vCard, { borderLeftColor: v.color }]} padding={12}>
                <View style={styles.vCardHeader}>
                  <Ionicons name={v.icon} size={16} color={v.color} />
                  <Text style={styles.vLabel} numberOfLines={1}>
                    {v.label}
                  </Text>
                </View>
                <View style={styles.vValueRow}>
                  <Text style={styles.vValue}>{latestVal}</Text>
                  <Text style={styles.vUnit}>{v.unit}</Text>
                </View>
              </Card>
            );
          })}
        </View>
      </View>

      {/* Log New Vitals Form or Action */}
      {showForm ? (
        <Card style={styles.section} padding={16}>
          <Text style={styles.sectionTitle}>Log New Readings</Text>
          <View style={styles.formGrid}>
            {VITALS_CONFIG.map((v) => (
              <Input
                key={v.key}
                label={`${v.label} (${v.unit})`}
                placeholder={`e.g. ${v.defaultVal}`}
                value={form[v.key] || ''}
                onChangeText={(val) => setForm((f) => ({ ...f, [v.key]: val }))}
                keyboardType="numeric"
                leftIcon={<Ionicons name={v.icon} size={16} color={v.color} />}
              />
            ))}
          </View>
          <View style={styles.formButtons}>
            <Button title="Cancel" variant="secondary" onPress={() => setShowForm(false)} style={{ flex: 1 }} />
            <Button title="Save Readings" onPress={handleLog} loading={logging} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <TouchableOpacity style={styles.logActionBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
          <LinearGradient colors={gradients.primary} style={styles.logActionGrad}>
            <Ionicons name="add-circle" size={18} color={colors.white} />
            <Text style={styles.logActionText}>+ Log New Vitals</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, gap: spacing.lg, paddingBottom: 40 },
  chartCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  unitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  chartUnit: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  graphContainer: {
    height: 160,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    justifyContent: 'center',
  },
  graphEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  graphEmptyText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },
  barTrack: {
    width: 22,
    height: 100,
    backgroundColor: colors.borderLight,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginVertical: 4,
  },
  barFill: {
    width: '100%',
  },
  barValText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  barDateText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  vitalSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  vitalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 34,
  },
  vitalChipText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vCard: {
    width: '48%',
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  vCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  vLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
    flex: 1,
  },
  vValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  vValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  vUnit: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  formGrid: { gap: 6, marginVertical: 8 },
  formButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  logActionBtn: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.primary,
  },
  logActionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.xl,
  },
  logActionText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
});
