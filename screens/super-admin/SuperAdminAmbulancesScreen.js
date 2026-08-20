import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { getAmbulances } from '../../api/admin';

export default function SuperAdminAmbulancesScreen({ navigation }) {
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getAmbulances();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.ambulances) ? data.ambulances : [];
      setFleet(list);
    } catch (_) {
      setFleet([]);
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

  // Stats calculation
  const totalFleet = fleet.length;
  const availableCount = fleet.filter(a => a.status === 'active' || a.status === 'available').length;
  const onDutyCount = fleet.filter(a => a.status === 'dispatched' || a.status === 'on_duty' || a.status === 'busy').length;
  const maintenanceCount = fleet.filter(a => a.status === 'maintenance' || a.status === 'inactive').length;

  // Filter fleet
  const filteredFleet = fleet.filter(item => {
    const driver = (item.driverName || item.driver || '').toLowerCase();
    const plate = (item.vehicleNo || '').toLowerCase();
    const query = search.toLowerCase();
    return driver.includes(query) || plate.includes(query);
  });

  const renderItem = ({ item }) => {
    const isAvailable = item.status === 'active' || item.status === 'available';
    const isMaintenance = item.status === 'maintenance' || item.status === 'inactive';
    const statusVariant = isAvailable ? 'success' : isMaintenance ? 'danger' : 'warning';
    
    const hospitalName = item.hospitalName || item.hospital?.fullName || 'Unknown Admin';
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '01/06/2026';
    const shiftText = item.shift || 'Morning Shift';
    const shiftIcon = shiftText.toLowerCase().includes('night') ? 'moon' : 'sunny';

    return (
      <Card style={styles.ambulanceCard} padding={16}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.carIconBox}>
              <Ionicons name="car-sport" size={20} color="#1E3A8A" />
            </View>
            <Text style={styles.plateNo}>{item.vehicleNo}</Text>
          </View>
          <View style={styles.badgeColumn}>
            <Badge label={item.status.toUpperCase()} variant={statusVariant} />
            <View style={styles.shiftBadge}>
              <Ionicons name={shiftIcon} size={10} color="#B45309" />
              <Text style={styles.shiftText}>{shiftText}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.detailsGrid}>
          <View style={styles.gridRow}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} style={styles.gridIcon} />
            <View style={styles.gridValGroup}>
              <Text style={styles.gridLabel}>DRIVER</Text>
              <Text style={styles.gridVal}>{item.driverName || item.driver || 'Farhan Tolkar'}</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <Ionicons name="call-outline" size={14} color={colors.textMuted} style={styles.gridIcon} />
            <View style={styles.gridValGroup}>
              <Text style={styles.gridLabel}>PHONE</Text>
              <Text style={styles.gridVal}>{item.phone || item.driverPhone || '9987343323'}</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <Ionicons name="card-outline" size={14} color={colors.textMuted} style={styles.gridIcon} />
            <View style={styles.gridValGroup}>
              <Text style={styles.gridLabel}>DRIVING LICENSE</Text>
              <Text style={styles.gridVal}>{item.licenseNumber || item.driverLicense || '123456789'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.footerAdmin}>
            <Ionicons name="shield-outline" size={12} color={colors.textMuted} />
            <Text style={styles.footerAdminText}>{hospitalName}</Text>
          </View>
          <Text style={styles.footerDate}>{dateStr}</Text>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      {loading && <LoadingOverlay message="Loading ambulance fleet..." />}
      
      {/* Scrollable Header + KPIs + Search + List */}
      <FlatList
        data={filteredFleet}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.topSection}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Ambulance Fleet Overview</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live Updates</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Read-only real-time view of all registered ambulances.</Text>

            {/* KPI Stat Cards */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiRow}>
                <Card style={[styles.kpiCard, styles.kpiTotal]} padding={12}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="car-sport" size={16} color="#4F46E5" />
                  </View>
                  <View style={styles.kpiInfo}>
                    <Text style={styles.kpiLabel}>Total Fleet</Text>
                    <Text style={styles.kpiVal}>{totalFleet}</Text>
                  </View>
                </Card>

                <Card style={[styles.kpiCard, styles.kpiAvailable]} padding={12}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="car-sport" size={16} color="#10B981" />
                  </View>
                  <View style={styles.kpiInfo}>
                    <Text style={styles.kpiLabel}>Available</Text>
                    <Text style={styles.kpiVal}>{availableCount}</Text>
                  </View>
                </Card>
              </View>

              <View style={styles.kpiRow}>
                <Card style={[styles.kpiCard, styles.kpiOnDuty]} padding={12}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#FFFBEB' }]}>
                    <Ionicons name="car-sport" size={16} color="#D97706" />
                  </View>
                  <View style={styles.kpiInfo}>
                    <Text style={styles.kpiLabel}>On Duty</Text>
                    <Text style={styles.kpiVal}>{onDutyCount}</Text>
                  </View>
                </Card>

                <Card style={[styles.kpiCard, styles.kpiMaintenance]} padding={12}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="car-sport" size={16} color="#EF4444" />
                  </View>
                  <View style={styles.kpiInfo}>
                    <Text style={styles.kpiLabel}>Maintenance</Text>
                    <Text style={styles.kpiVal}>{maintenanceCount}</Text>
                  </View>
                </Card>
              </View>
            </View>

            {/* Search Input Box */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Search by driver name or plate..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading && <EmptyState icon="car-outline" title="No Ambulances Found" message="No registered vehicles match your search." />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topSection: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: '#0F172A',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: '#065F46',
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  kpiGrid: {
    gap: 10,
    marginTop: 8,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.xs,
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiInfo: {
    gap: 2,
  },
  kpiLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  kpiVal: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.text,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    marginTop: 8,
    ...shadows.xs,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
  },
  list: {
    paddingBottom: 40,
  },
  ambulanceCard: {
    marginHorizontal: spacing.base,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  carIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateNo: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    gap: 4,
  },
  shiftText: {
    fontSize: 9,
    fontWeight: typography.fontWeights.bold,
    color: '#B45309',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  detailsGrid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gridIcon: {
    width: 16,
    textAlign: 'center',
  },
  gridValGroup: {
    gap: 2,
  },
  gridLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.bold,
  },
  gridVal: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerAdmin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerAdminText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semibold,
  },
  footerDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
