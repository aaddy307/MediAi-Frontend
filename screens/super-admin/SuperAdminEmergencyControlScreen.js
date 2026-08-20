import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { getAllEmergencies, updateEmergencyStatus } from '../../api/superAdmin';
import { connectSocket } from '../../realtime/socket';

export default function SuperAdminEmergencyControlScreen({ navigation }) {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getAllEmergencies();
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

  useEffect(() => {
    const socket = connectSocket();

    socket.on('emergency_alert', (newEmergency) => {
      setEmergencies((prev) => {
        const exists = prev.some((e) => e._id === newEmergency._id);
        if (exists) {
          return prev.map((e) => e._id === newEmergency._id ? newEmergency : e);
        }
        return [newEmergency, ...prev];
      });
      Alert.alert(
        '🚨 NEW EMERGENCY SOS ALERT!',
        `Incoming SOS request:\nType: ${newEmergency.emergencyType.toUpperCase()}\nFrom: ${newEmergency.guestName || newEmergency.patient?.fullName || 'Anonymous Patient'}`
      );
    });

    return () => {
      socket.off('emergency_alert');
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleEscalate = (item) => {
    const isCritical = item.status === 'dispatched' || item.riskLevel === 'Critical';
    const action = isCritical ? 'Resolve SOS' : 'Escalate Priority';

    Alert.alert(
      isCritical ? 'Resolve Incident' : 'Escalate Incident',
      isCritical ? `Mark emergency incident ${item._id} as resolved?` : `Escalate emergency incident ${item._id} priority and dispatch?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isCritical ? 'Resolve' : 'Escalate',
          style: isCritical ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const nextStatus = isCritical ? 'resolved' : 'dispatched';
              await updateEmergencyStatus(item._id, nextStatus);
              setEmergencies((prev) =>
                prev.map((e) => (e._id === item._id ? { ...e, status: nextStatus, riskLevel: 'Critical' } : e))
              );
              Alert.alert('Updated', `Incident marked as ${nextStatus}.`);
            } catch (_) {
              Alert.alert('Error', 'Could not update emergency case status.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isPending = item.status === 'pending';
    const isDispatched = item.status === 'dispatched';
    const patientName = item.guestName || item.patient?.fullName || 'Anonymous Patient';
    const phone = item.guestPhone || item.patient?.phone || 'No phone on file';
    const timeText = item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : 'Active SOS';

    return (
      <Card style={[styles.card, (isPending || isDispatched) && styles.criticalBorder]} padding={16}>
        <View style={styles.topRow}>
          <View style={styles.idBox}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <Text style={styles.idText}>SOS-{item._id.substring(item._id.length - 6).toUpperCase()}</Text>
          </View>
          <Badge
            label={item.status.toUpperCase()}
            variant={isPending ? 'danger' : isDispatched ? 'warning' : 'success'}
          />
        </View>

        <Text style={styles.patientText}>{patientName}</Text>
        <Text style={styles.descText}>{item.description || item.symptoms || `Emergency SOS Alert (${item.emergencyType})`}</Text>
        <Text style={styles.facilityText}>Assigned Facility: {item.assignedHospital || 'Awaiting dispatch assignment'}</Text>

        <View style={styles.metaBox}>
          <View style={styles.metaLine}>
            <Ionicons name="location" size={12} color={colors.danger} />
            <Text style={styles.metaText}>
              {item.latitude && item.longitude ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}` : 'Location Pinpointed'}
            </Text>
          </View>
          <View style={styles.metaLine}>
            <Ionicons name="call" size={12} color={colors.primary} />
            <Text style={styles.metaText}>{phone}</Text>
          </View>
          <View style={styles.metaLine}>
            <Ionicons name="time" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{timeText}</Text>
          </View>
        </View>

        {item.status !== 'resolved' && (
          <TouchableOpacity style={styles.escalateBtn} onPress={() => handleEscalate(item)}>
            <Ionicons name={item.status === 'dispatched' ? 'checkmark-done' : 'flash'} size={14} color={colors.white} />
            <Text style={styles.btnText}>
              {item.status === 'dispatched' ? 'Mark Incident Resolved' : 'Escalate & Dispatch Ambulance'}
            </Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      {loading && <LoadingOverlay message="Loading emergency console..." />}
      <LinearGradient colors={gradients.danger} style={styles.headerBanner}>
        <Text style={styles.bannerTitle}>Central Emergency Control</Text>
        <Text style={styles.bannerSub}>Centralized platform SOS telemetry & dispatch control</Text>
      </LinearGradient>

      <FlatList
        data={emergencies}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.danger} />}
        ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title="No Active Emergencies" message="Central emergency log is empty." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerBanner: {
    padding: spacing.base,
    paddingTop: spacing.xl,
    gap: 2,
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
  },
  card: { gap: 10 },
  criticalBorder: {
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  idText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.danger,
  },
  patientText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  descText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  facilityText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  metaBox: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: radius.md,
    gap: 6,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  escalateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 6,
    ...shadows.danger,
  },
  btnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
});

