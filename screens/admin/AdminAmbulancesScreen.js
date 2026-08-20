import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function AdminAmbulancesScreen({ navigation }) {
  const [fleet, setFleet] = useState([
    { id: '1', vehicleNo: 'AMB-104', type: 'Advanced Life Support (ALS)', status: 'available', driver: 'Marcus Vance', phone: '+1 (555) 123-4567', location: 'Station Bay 1' },
    { id: '2', vehicleNo: 'AMB-108', type: 'Basic Life Support (BLS)', status: 'dispatched', driver: 'Liam Reynolds', phone: '+1 (555) 987-6543', location: 'En Route to Sector 4' },
    { id: '3', vehicleNo: 'AMB-201', type: 'Cardiac Response Unit', status: 'available', driver: 'Elena Rostova', phone: '+1 (555) 456-7890', location: 'Station Bay 3' },
    { id: '4', vehicleNo: 'AMB-305', type: 'Neonatal Transport', status: 'maintenance', driver: 'David Miller', phone: '+1 (555) 321-6549', location: 'Service Center' },
  ]);

  const toggleStatus = (id) => {
    setFleet((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const next = v.status === 'available' ? 'dispatched' : 'available';
          return { ...v, status: next };
        }
        return v;
      })
    );
  };

  const renderVehicle = ({ item }) => {
    const isAvail = item.status === 'available';
    const isDispatched = item.status === 'dispatched';

    return (
      <Card style={styles.card} padding={16}>
        <View style={styles.cardTop}>
          <View style={styles.vehIconBox}>
            <Ionicons name="car-sport" size={22} color={colors.primary} />
          </View>
          <View style={styles.vehInfo}>
            <Text style={styles.vehNo}>{item.vehicleNo}</Text>
            <Text style={styles.vehType}>{item.type}</Text>
          </View>
          <Badge
            label={item.status.toUpperCase()}
            variant={isAvail ? 'success' : isDispatched ? 'warning' : 'muted'}
            dot
          />
        </View>

        <View style={styles.driverBox}>
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>Driver: {item.driver} ({item.phone})</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="navigate-outline" size={14} color={colors.primary} />
            <Text style={styles.metaText}>Current: {item.location}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.toggleBtn} onPress={() => toggleStatus(item.id)}>
          <Text style={styles.toggleText}>
            Toggle Status: {isAvail ? 'Set to Dispatched' : 'Set to Available'}
          </Text>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Ambulance Fleet</Text>
        <Text style={styles.subtitle}>Hospital emergency transport and driver dispatch tracking</Text>
      </View>

      <FlatList
        data={fleet}
        keyExtractor={(item) => item.id}
        renderItem={renderVehicle}
        contentContainerStyle={styles.list}
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
    gap: 12,
  },
  card: { gap: 10 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehIconBox: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehInfo: { flex: 1 },
  vehNo: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  vehType: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  driverBox: {
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
  toggleBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
});
