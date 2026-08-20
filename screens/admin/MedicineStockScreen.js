import React, { useEffect, useState, useCallback } from 'react';
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
import { getMedicineStock, adjustMedicineStock } from '../../api/admin';
import { colors, typography, spacing, radius } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';

function StockCard({ item, onRestock }) {
  // Backend schema field is `quantity`; `lowStockThreshold` is the reorder level
  const stockQty = item.quantity !== undefined ? item.quantity : (item.stock ?? 0);
  const isLow = stockQty <= (item.lowStockThreshold || item.reorderLevel || 10);
  return (
    <Card style={styles.stockCard} padding={14}>
      <View style={styles.stockRow}>
        <View style={[styles.stockIcon, { backgroundColor: (isLow ? colors.danger : colors.primary) + '22' }]}>
          <Ionicons name="medical" size={20} color={isLow ? colors.danger : colors.primary} />
        </View>
        <View style={styles.stockInfo}>
          <Text style={styles.stockName}>{item.name}</Text>
          <Text style={styles.stockMeta}>{item.category} · {item.form}</Text>
          <View style={styles.stockLevel}>
            <Text style={[styles.stockQty, { color: isLow ? colors.danger : colors.success }]}>
              {stockQty} units
            </Text>
            {isLow && <Badge label="Low Stock" variant="danger" size="xs" dot />}
          </View>
        </View>
        <View style={styles.stockActions}>
          <Text style={styles.stockPrice}>${item.price?.toFixed(2) || '—'}</Text>
          <TouchableOpacity style={styles.restockBtn} onPress={() => onRestock(item)}>
            <Ionicons name="add-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

export default function MedicineStockScreen() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getMedicineStock();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.stock) ? data.stock : [];
      setStock(list);
    } catch (_) {
      setStock([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRestock = (item) => {
    Alert.prompt(
      'Restock',
      `How many units to add to "${item.name}"?`,
      async (input) => {
        const qty = parseInt(input);
        if (!qty || isNaN(qty) || qty <= 0) return;
        try {
          // PATCH /api/medicine-stock/:id/stock with { adjustment, type: 'add' }
          await adjustMedicineStock(item._id, qty);
          setStock((prev) =>
            prev.map((s) => {
              if (s._id !== item._id) return s;
              const current = s.quantity !== undefined ? s.quantity : (s.stock ?? 0);
              return { ...s, quantity: current + qty };
            })
          );
        } catch (err) {
          const msg = err?.response?.data?.message || err?.message || 'Could not update stock.';
          Alert.alert('Error', msg);
        }
      },
      'plain-text',
      '',
      'numeric'
    );
  };

  return (
    <FlatList
      data={stock}
      keyExtractor={(s) => s._id}
      style={styles.screen}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <StockCard item={item} onRestock={handleRestock} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={!loading && <EmptyState icon="medkit-outline" title="No stock records" />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.base, gap: 12, paddingBottom: 40 },
  stockCard: {},
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stockIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stockInfo: { flex: 1, gap: 3 },
  stockName: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.text },
  stockMeta: { fontSize: typography.fontSizes.xs, color: colors.textMuted },
  stockLevel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  stockQty: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold },
  stockActions: { alignItems: 'flex-end', gap: 4 },
  stockPrice: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, fontWeight: typography.fontWeights.medium },
  restockBtn: { padding: 4 },
});
