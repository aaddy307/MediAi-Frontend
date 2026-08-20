import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAdminAppointments } from '../../api/admin';
import { colors, typography, spacing, radius } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';

export default function AdminAppointmentsScreen({ navigation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getAdminAppointments();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.appointments) ? data.appointments : [];
      setAppointments(list);
    } catch (err) {
      console.log('Error loading admin appointments:', err.message);
      setAppointments([]);
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

  const renderItem = ({ item }) => {
    const doctorName = item.doctor?.fullName || item.doctor?.name || 'Assigned Doctor';
    const patientName = item.patient?.fullName || item.patient?.name || 'Patient';
    const date = new Date(item.date).toLocaleDateString();

    return (
      <Card style={styles.card} padding={16}>
        <View style={styles.topRow}>
          <View style={styles.doctorInfo}>
            <Text style={styles.docName}>Dr. {doctorName}</Text>
            <Text style={styles.patientName}>Patient: {patientName}</Text>
          </View>
          <Badge
            label={item.status || 'pending'}
            variant={item.status === 'completed' ? 'success' : item.status === 'confirmed' ? 'info' : 'warning'}
            dot
          />
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.time || '10:00 AM'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="medkit-outline" size={12} color={colors.primary} />
            <Text style={styles.metaText}>{item.consultationType || 'General'}</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      {loading && <LoadingOverlay message="Loading facility appointments..." />}

      <View style={styles.header}>
        <Text style={styles.title}>Facility Appointments</Text>
        <Text style={styles.subtitle}>Hospital-wide appointment schedule and oversight</Text>
      </View>

      <FlatList
        data={appointments}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && <EmptyState icon="calendar-outline" title="No Appointments" message="No appointments scheduled." />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
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
  list: {
    padding: spacing.base,
    gap: 10,
  },
  card: {
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  doctorInfo: { flex: 1 },
  docName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  patientName: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
