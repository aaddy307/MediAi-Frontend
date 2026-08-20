import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMedicines, createOrder } from '../../api/medicines';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';

const CATEGORIES = ['All', 'Pain Relief', 'Antibiotics', 'Vitamins', 'Cardiovascular', 'Diabetes', 'Allergy'];

function MedicineCard({ medicine, quantity, onChangeQty, onAdd }) {
  const availableStock = medicine.quantity !== undefined ? medicine.quantity : (medicine.stock || 0);
  const inStock = availableStock > 0;
  const dosageText = medicine.mg ? `${medicine.mg}` : (medicine.dosage || '');
  const formText = medicine.unit || medicine.category || medicine.form || '';
  const metaText = [dosageText, formText].filter(Boolean).join(' · ') || 'Dispensary Item';

  return (
    <Card style={styles.medCard} padding={14}>
      <View style={styles.medHeader}>
        <View style={styles.medIconBg}>
          <Ionicons name="medical" size={22} color={colors.primary} />
        </View>
        <View style={styles.medInfo}>
          <Text style={styles.medName}>{medicine.name}</Text>
          <Text style={styles.medGeneric}>{medicine.genericName || 'Certified Medicine'}</Text>
          <Text style={styles.medDosage}>{metaText}</Text>
        </View>
        <Badge
          label={inStock ? `In Stock (${availableStock})` : 'Out of Stock'}
          variant={inStock ? 'success' : 'danger'}
          size="xs"
        />
      </View>
      <View style={styles.medFooter}>
        <Text style={styles.medPrice}>₹{medicine.price ? Number(medicine.price).toFixed(2) : '—'}</Text>
        {inStock && (
          <View style={styles.qtyRow}>
            <TouchableOpacity onPress={() => onChangeQty(Math.max(1, quantity - 1))} style={styles.qtyBtn}>
              <Ionicons name="remove" size={16} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity onPress={() => onChangeQty(Math.min(availableStock, quantity + 1))} style={styles.qtyBtn}>
              <Ionicons name="add" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Card>
  );
}

export default function MedicineStoreScreen({ navigation }) {
  const [medicines, setMedicines] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState({}); // { medicineId: quantity }
  const [qtys, setQtys] = useState({}); // { medicineId: qty before adding }
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Checkout modal state
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getMedicines();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.medicines) ? data.medicines : [];
      setMedicines(list);
      setFiltered(list);
      const initQtys = {};
      list.forEach((m) => { initQtys[m._id] = 1; });
      setQtys(initQtys);
    } catch (_) {
      setMedicines([]);
      setFiltered([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let result = Array.isArray(medicines) ? [...medicines] : [];
    if (category !== 'All') {
      result = result.filter((m) => 
        (m.category && m.category.toLowerCase() === category.toLowerCase()) ||
        (m.unit && m.unit.toLowerCase() === category.toLowerCase())
      );
    }
    if (search) {
      result = result.filter((m) => 
        (m.name && m.name.toLowerCase().includes(search.toLowerCase())) ||
        (m.genericName && m.genericName.toLowerCase().includes(search.toLowerCase()))
      );
    }
    setFiltered(result);
  }, [search, category, medicines]);

  const addToCart = (medId) => {
    setCart((prev) => ({
      ...prev,
      [medId]: (prev[medId] || 0) + (qtys[medId] || 1),
    }));
  };

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const list = Array.isArray(medicines) ? medicines : [];
    const med = list.find((m) => m._id === id);
    return sum + (med?.price || 0) * qty;
  }, 0);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // Step 1: open checkout modal
  const openCheckout = () => {
    if (cartCount === 0) return;
    setCheckoutVisible(true);
  };

  // Step 2: submit order with deliveryAddress
  const confirmOrder = async () => {
    const address = deliveryAddress.trim();
    if (!address) {
      Alert.alert('Address Required', 'Please enter your delivery address before placing the order.');
      return;
    }
    setCheckoutVisible(false);
    setOrdering(true);
    try {
      const list = Array.isArray(medicines) ? medicines : [];
      const items = Object.entries(cart).map(([medicineId, quantity]) => {
        const med = list.find((m) => m._id === medicineId);
        return {
          medicineId,
          medicineName: med?.name || 'Medicine',
          quantity,
        };
      });
      await createOrder({ items, deliveryAddress: address });
      setCart({});
      setDeliveryAddress('');
      Alert.alert(
        'Order Placed! 🎉',
        `Your pharmacy delivery order (₹${cartTotal.toFixed(2)}) has been submitted to the hospital dispensary.\n\nDelivery to: ${address}`
      );
    } catch (err) {
      // Surface the real backend error message so issues are visible
      const msg = err?.response?.data?.message || err?.message || 'Could not place order. Please try again.';
      Alert.alert('Order Failed', msg);
    } finally {
      setOrdering(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      {(loading || ordering) && <LoadingOverlay message={ordering ? 'Placing order…' : 'Loading…'} />}

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search medicines…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Reminders banner */}
      <TouchableOpacity
        style={styles.remindersBanner}
        onPress={() => navigation.navigate('MedicineReminders')}
        activeOpacity={0.85}
      >
        <View style={styles.remindersBannerLeft}>
          <View style={styles.remIconBox}>
            <Ionicons name="alarm" size={18} color="#8B5CF6" />
          </View>
          <View>
            <Text style={styles.remBannerTitle}>Medicine Reminders & Schedule</Text>
            <Text style={styles.remBannerSub}>Track doses and set intake alerts</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#8B5CF6" />
      </TouchableOpacity>

      {/* Categories */}
      <FlatList
        data={CATEGORIES}
        horizontal
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        style={styles.catList}
        contentContainerStyle={styles.catRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catChip, category === item && styles.catChipActive]}
            onPress={() => setCategory(item)}
            activeOpacity={0.8}
          >
            <Text style={[styles.catText, category === item && styles.catTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Medicine list */}
      <FlatList
        data={filtered}
        keyExtractor={(m) => m._id}
        renderItem={({ item }) => (
          <MedicineCard
            medicine={item}
            quantity={qtys[item._id] || 1}
            onChangeQty={(q) => setQtys((prev) => ({ ...prev, [item._id]: q }))}
            onAdd={() => addToCart(item._id)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="medkit-outline" title="No medicines found" />}
      />

      {/* Cart bar — opens checkout modal */}
      {cartCount > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={openCheckout} activeOpacity={0.9}>
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartCount}</Text>
          </View>
          <Text style={styles.cartText}>Place Order</Text>
          <Text style={styles.cartTotal}>₹{cartTotal.toFixed(2)}</Text>
        </TouchableOpacity>
      )}

      {/* Checkout modal — collects delivery address before sending to backend */}
      <Modal
        visible={checkoutVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckoutVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.checkoutCard}>
            <View style={styles.checkoutHeader}>
              <Ionicons name="bag-check-outline" size={22} color={colors.primary} />
              <Text style={styles.checkoutTitle}>Confirm Order</Text>
              <TouchableOpacity onPress={() => setCheckoutVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Order summary */}
            <View style={styles.checkoutSummary}>
              <Text style={styles.summaryLabel}>Items in cart</Text>
              <Text style={styles.summaryValue}>{cartCount} item{cartCount > 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.checkoutSummary}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: '700' }]}>₹{cartTotal.toFixed(2)}</Text>
            </View>

            {/* Delivery address */}
            <Text style={styles.addressLabel}>Delivery Address *</Text>
            <TextInput
              style={styles.addressInput}
              placeholder="e.g. House 12, Street 4, Lahore"
              placeholderTextColor={colors.textMuted}
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Actions */}
            <View style={styles.checkoutActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCheckoutVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={confirmOrder}
              >
                <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                <Text style={styles.confirmBtnText}>Place Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.base,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    gap: 8,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text,
    fontSize: typography.fontSizes.base,
  },
  catList: {
    flexGrow: 0,
    maxHeight: 52,
    marginBottom: spacing.xs,
  },
  catRow: {
    paddingHorizontal: spacing.base,
    paddingVertical: 4,
    alignItems: 'center',
    flexDirection: 'row',
  },
  catChip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.primary,
  },
  catText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  catTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
  list: { padding: spacing.base, gap: 12, paddingBottom: 100 },
  medCard: {},
  medHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
  medIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medInfo: { flex: 1, gap: 2 },
  medName: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.text },
  medGeneric: { fontSize: typography.fontSizes.xs, color: colors.textMuted },
  medDosage: { fontSize: typography.fontSizes.xs, color: colors.textSecondary },
  medFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  medPrice: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: colors.primary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.text, minWidth: 20, textAlign: 'center' },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginLeft: 4,
  },
  addBtnText: { color: colors.white, fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.bold },
  cartBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 16,
    ...shadows.primary,
  },
  cartBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cartBadgeText: { color: colors.white, fontSize: 12, fontWeight: typography.fontWeights.bold },
  cartText: { flex: 1, color: colors.white, fontWeight: typography.fontWeights.bold, fontSize: typography.fontSizes.base },
  cartTotal: { color: colors.white, fontWeight: typography.fontWeights.extrabold, fontSize: typography.fontSizes.md },
  remindersBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: radius.lg,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  remindersBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  remIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remBannerTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: '#4C1D95',
  },
  remBannerSub: {
    fontSize: typography.fontSizes.xs,
    color: '#6D28D9',
  },
  // Checkout modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  checkoutCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: 24,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  checkoutTitle: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  checkoutSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    fontWeight: typography.fontWeights.semibold,
  },
  addressLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: -6,
  },
  addressInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: typography.fontSizes.sm,
    minHeight: 72,
  },
  checkoutActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.primary,
  },
  confirmBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
});
