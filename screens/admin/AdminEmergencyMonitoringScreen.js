import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAdminEmergencies, updateAdminEmergencyStatus } from '../../api/admin';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';

export default function AdminEmergencyMonitoringScreen({ navigation }) {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getAdminEmergencies();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.emergencies) ? data.emergencies : [];
      setEmergencies(list);
    } catch (_) {
      setEmergencies([]);
    } finally {
      setLoading(false);
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

  const handleDispatchAmbulance = (item) => {
    const name = item.guestName || item.patientName || item.patient?.fullName || 'Anonymous';
    Alert.alert('Dispatch Ambulance', `Dispatch rapid emergency response for ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dispatch Now',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateAdminEmergencyStatus(item._id, 'dispatched');
            setEmergencies((prev) =>
              prev.map((e) => (e._id === item._id ? { ...e, status: 'dispatched' } : e))
            );
            Alert.alert('Ambulance Dispatched', 'Unit dispatched with high-priority sirens.');
          } catch (_) {
            Alert.alert('Error', 'Could not update status in the database.');
          }
        },
      },
    ]);
  };

  const handleResolve = (item) => {
    Alert.alert('Resolve Incident', 'Mark emergency incident as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: async () => {
          try {
            await updateAdminEmergencyStatus(item._id, 'resolved');
            setEmergencies((prev) =>
              prev.map((e) => (e._id === item._id ? { ...e, status: 'resolved' } : e))
            );
            Alert.alert('Resolved', 'Emergency incident marked as resolved and logged.');
          } catch (_) {
            Alert.alert('Error', 'Could not update status in the database.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const isPending = item.status === 'pending';
    const isDispatched = item.status === 'dispatched';

    const name = item.guestName || item.patientName || item.patient?.fullName || 'Emergency Incident';
    return (
      <Card style={[styles.card, isPending && styles.criticalCard]} padding={16}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusDot, { backgroundColor: isPending ? colors.danger : colors.info }]} />
            <Text style={styles.patientName}>{name}</Text>
          </View>
          <Badge
            label={item.status.toUpperCase()}
            variant={isPending ? 'danger' : isDispatched ? 'info' : 'success'}
          />
        </View>

        <View style={styles.metaBox}>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.danger} />
            <Text style={styles.metaText}>{item.location || 'Location pinpointed'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.time || 'Active incident'}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {isPending && (
            <TouchableOpacity style={styles.dispatchBtn} onPress={() => handleDispatchAmbulance(item)}>
              <Ionicons name="car-sport" size={16} color={colors.white} />
              <Text style={styles.btnText}>Dispatch Nearest Ambulance</Text>
            </TouchableOpacity>
          )}

          {isDispatched && (
            <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResolve(item)}>
              <Ionicons name="checkmark-circle" size={16} color={colors.white} />
              <Text style={styles.btnText}>Mark Incident Resolved</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={gradients.danger} style={styles.topBanner}>
        <View style={styles.topRow}>
          <Ionicons name="warning" size={24} color={colors.white} />
          <Text style={styles.bannerTitle}>Emergency Command Monitor</Text>
        </View>
        <Text style={styles.bannerSub}>Live telemetry & immediate ambulance fleet dispatch</Text>
      </LinearGradient>

      <FlatList
        data={emergencies}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.danger} />}
        ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title="No Active Emergencies" message="All clear in the facility sector." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBanner: {
    padding: spacing.base,
    paddingTop: spacing.xl,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.white,
  },
  bannerSub: {
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  list: {
    padding: spacing.base,
    gap: 12,
    paddingBottom: 40,
  },
  card: { gap: 10 },
  criticalCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  patientName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  metaBox: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: radius.md,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  dispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 8,
    ...shadows.danger,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 8,
  },
  btnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
});
