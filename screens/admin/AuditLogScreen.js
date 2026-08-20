import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuditLogs } from '../../api/admin';
import { colors, typography, spacing, radius } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';

const ACTION_ICON = {
  login: 'log-in-outline',
  logout: 'log-out-outline',
  create: 'add-circle-outline',
  update: 'create-outline',
  delete: 'trash-outline',
  approve: 'checkmark-circle-outline',
  reject: 'close-circle-outline',
};

export default function AuditLogScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (pageNum = 1) => {
    try {
      const data = await getAuditLogs({ page: pageNum, limit: 20 });
      const newLogs = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.logs) ? data.logs : [];
      if (pageNum === 1) setLogs(newLogs);
      else setLogs((prev) => [...prev, ...newLogs]);
      setHasMore(newLogs.length === 20);
    } catch (_) {
      if (pageNum === 1) setLogs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(1); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await load(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    load(nextPage);
  };

  const SEVERITY_VARIANT = { high: 'danger', medium: 'warning', low: 'success', info: 'info' };

  return (
    <FlatList
      data={logs}
      keyExtractor={(log) => log._id}
      style={styles.screen}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Card style={styles.logCard} padding={14}>
          <View style={styles.logRow}>
            <View style={[styles.logIcon, { backgroundColor: (item.severity === 'high' ? colors.danger : colors.primary) + '22' }]}>
              <Ionicons
                name={ACTION_ICON[item.action] || 'ellipse'}
                size={18}
                color={item.severity === 'high' ? colors.danger : colors.primary}
              />
            </View>
            <View style={styles.logInfo}>
              <Text style={styles.logAction}>{item.action}</Text>
              <Text style={styles.logUser}>{item.user?.name || 'System'} · {item.user?.role}</Text>
              <Text style={styles.logTime}>{new Date(item.createdAt).toLocaleString()}</Text>
              {item.details && (
                <Text style={styles.logDetails} numberOfLines={2}>{typeof item.details === 'string' ? item.details : JSON.stringify(item.details)}</Text>
              )}
            </View>
            <Badge label={item.severity || 'info'} variant={SEVERITY_VARIANT[item.severity] || 'info'} size="xs" />
          </View>
        </Card>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={!loading && <EmptyState icon="list-outline" title="No audit logs found" />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.base, gap: 10, paddingBottom: 40 },
  logCard: {},
  logRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  logIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logInfo: { flex: 1, gap: 2 },
  logAction: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.text, textTransform: 'capitalize' },
  logUser: { fontSize: typography.fontSizes.xs, color: colors.primary, fontWeight: typography.fontWeights.medium },
  logTime: { fontSize: typography.fontSizes.xs, color: colors.textMuted },
  logDetails: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 4, lineHeight: 16 },
});
