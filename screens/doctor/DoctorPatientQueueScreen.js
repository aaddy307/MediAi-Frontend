import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDoctorAppointments, updateAppointment } from '../../api/appointments';
import { initChat } from '../../api/chats';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import LoadingOverlay from '../../components/ui/LoadingOverlay';

export default function DoctorPatientQueueScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : 12);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      const data = await getDoctorAppointments({ status: 'confirmed' });
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.appointments) ? data.appointments : [];
      setQueue(list);
    } catch (err) {
      console.log('Error loading patient queue:', err.message);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQueue();
    setRefreshing(false);
  };

  const handleStartConsultation = async (item) => {
    try {
      const patientId = item.patient?._id || item.patient;
      const chatRes = await initChat(patientId, 'User');
      const chat = chatRes?.data || chatRes;
      navigation.navigate('ChatRoom', { chat });
    } catch (err) {
      Alert.alert('Consultation', 'Starting chat consultation with patient...');
    }
  };

  const handleComplete = async (item) => {
    Alert.alert('Complete Session', 'Mark this patient consultation as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            await updateAppointment(item._id, { status: 'completed' });
            setQueue((prev) => prev.filter((p) => p._id !== item._id));
          } catch (err) {
            Alert.alert('Error', 'Failed to update appointment status');
          }
        },
      },
    ]);
  };

  const renderQueueItem = ({ item, index }) => {
    const patientName = item.patient?.fullName || item.patient?.name || `Patient #${index + 1}`;
    const time = item.time || new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <Card style={styles.queueCard} padding={16}>
        <View style={styles.topRow}>
          <View style={styles.tokenBadge}>
            <Text style={styles.tokenText}>#{index + 1}</Text>
          </View>
          <Avatar name={patientName} size="md" />
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.reasonText} numberOfLines={1}>
              {item.reason || item.consultationType || 'General Consultation'}
            </Text>
            <View style={styles.timeTag}>
              <Ionicons name="time-outline" size={12} color={colors.primary} />
              <Text style={styles.timeLabel}>{time}</Text>
            </View>
          </View>
          <Badge label={index === 0 ? 'Next Up' : 'Waiting'} variant={index === 0 ? 'success' : 'warning'} dot />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.consultBtn}
            onPress={() => handleStartConsultation(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles-outline" size={16} color={colors.white} />
            <Text style={styles.consultBtnText}>Start Consultation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => handleComplete(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      {loading && <LoadingOverlay message="Loading patient queue..." />}

      <View style={[styles.header, { paddingTop: topPadding + spacing.sm }]}>
        <View>
          <Text style={styles.title}>Patient Queue</Text>
          <Text style={styles.subtitle}>
            {queue.length} {queue.length === 1 ? 'patient' : 'patients'} in waiting room
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshIcon} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item) => item._id}
        renderItem={renderQueueItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="people-outline"
              title="Queue is Empty"
              message="No patients currently in the waiting queue."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  refreshIcon: {
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: colors.primaryGlow,
  },
  list: {
    padding: spacing.base,
    gap: 12,
    paddingBottom: 40,
  },
  queueCard: {
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tokenText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  patientInfo: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  reasonText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeLabel: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  consultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.lg,
    gap: 8,
    ...shadows.primary,
  },
  consultBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  doneBtn: {
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
  },
});
