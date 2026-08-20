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
import { getAllOrders, updateOrderStatus } from '../../api/admin';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';

const STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'info' },
  out_for_delivery: { label: 'Out for Delivery', variant: 'info' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

export default function AdminPharmacyOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getAllOrders();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.orders) ? data.orders : [];
      setOrders(list);
    } catch (err) {
      console.log('Error loading pharmacy orders:', err.message);
      setOrders([]);
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

  const handleUpdateStatus = (id, newStatus) => {
    Alert.alert('Update Order Status', `Advance this delivery order to "${newStatus}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await updateOrderStatus(id, newStatus);
            setOrders((prev) =>
              prev.map((o) => (o._id === id ? { ...o, status: newStatus } : o))
            );
          } catch (err) {
            Alert.alert('Error', 'Failed to update order status');
          }
        },
      },
    ]);
  };

  const renderOrder = ({ item }) => {
    const status = (item.status || 'pending').toLowerCase();
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const patientName = item.patient?.fullName || item.patient?.name || 'Patient';
    const totalAmount = item.totalAmount ? `₹${item.totalAmount}` : '₹25.00';

    return (
      <Card style={styles.card} padding={16}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.orderId}>Order #{item._id?.slice(-6).toUpperCase() || 'RX-102'}</Text>
            <Text style={styles.patientName}>{patientName}</Text>
          </View>
          <Badge label={config.label} variant={config.variant} dot />
        </View>

        <View style={styles.detailsBox}>
          <Text style={styles.itemsText}>
            {item.items?.map((i) => `${i.medicineName || i.name || 'Medicine'} (x${i.quantity || 1})`).join(', ') || 'Prescribed Medications (x2)'}
          </Text>
          <Text style={styles.amountText}>{totalAmount}</Text>
        </View>

        {status !== 'delivered' && status !== 'cancelled' && (
          <View style={styles.actions}>
            {status === 'pending' && (
              <TouchableOpacity
                style={[styles.btn, styles.dispatchBtn]}
                onPress={() => handleUpdateStatus(item._id, 'out_for_delivery')}
              >
                <Ionicons name="cube-outline" size={14} color={colors.white} />
                <Text style={styles.btnText}>Mark Dispatched</Text>
              </TouchableOpacity>
            )}

            {status === 'out_for_delivery' && (
              <TouchableOpacity
                style={[styles.btn, styles.deliverBtn]}
                onPress={() => handleUpdateStatus(item._id, 'delivered')}
              >
                <Ionicons name="checkmark-done" size={14} color={colors.white} />
                <Text style={styles.btnText}>Confirm Delivered</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={() => handleUpdateStatus(item._id, 'cancelled')}
            >
              <Text style={[styles.btnText, { color: colors.danger }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      {loading && <LoadingOverlay message="Loading pharmacy orders..." />}

      <View style={styles.header}>
        <Text style={styles.title}>Pharmacy Delivery Orders</Text>
        <Text style={styles.subtitle}>Fulfill and dispatch patient prescription orders</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && <EmptyState icon="cart-outline" title="No Orders" message="No pending pharmacy delivery orders." />
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
    gap: 12,
    paddingBottom: 40,
  },
  card: { gap: 10 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderId: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  patientName: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  detailsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: radius.md,
  },
  itemsText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    flex: 1,
    paddingRight: 8,
  },
  amountText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.success,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 6,
  },
  dispatchBtn: {
    backgroundColor: colors.info,
  },
  deliverBtn: {
    backgroundColor: colors.success,
  },
  cancelBtn: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger + '44',
  },
  btnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
});
