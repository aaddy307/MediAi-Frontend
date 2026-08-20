import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUsers, updateUserStatus } from '../../api/admin';
import { colors, typography, spacing, radius } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';

export default function UserManagementScreen() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getUsers();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.users) ? data.users : [];
      setUsers(list);
    } catch (_) {
      setUsers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleToggleStatus = (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    Alert.alert(
      `${newStatus === 'active' ? 'Activate' : 'Suspend'} User`,
      `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'suspend'} ${user.name}?`,
      [
        { text: 'Cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'suspended' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateUserStatus(user._id, newStatus);
              setUsers((prev) =>
                prev.map((u) => u._id === user._id ? { ...u, status: newStatus } : u)
              );
            } catch {
              Alert.alert('Error', 'Could not update user status.');
            }
          },
        },
      ]
    );
  };

  const filtered = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.screen}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(u) => u._id}
        renderItem={({ item }) => (
          <Card style={styles.userCard} padding={14}>
            <View style={styles.userRow}>
              <Avatar name={item.name} uri={item.avatar} size="md" />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <View style={styles.userMeta}>
                  <Badge label={item.role} variant="muted" size="xs" />
                  <Badge
                    label={item.status || 'active'}
                    variant={item.status === 'suspended' ? 'danger' : 'success'}
                    size="xs"
                    dot
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toggleBtn, item.status === 'suspended' && styles.toggleBtnActive]}
                onPress={() => handleToggleStatus(item)}
              >
                <Ionicons
                  name={item.status === 'suspended' ? 'checkmark-circle' : 'ban'}
                  size={20}
                  color={item.status === 'suspended' ? colors.success : colors.danger}
                />
              </TouchableOpacity>
            </View>
          </Card>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={!loading && <EmptyState icon="people-outline" title="No users found" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: colors.text, fontSize: typography.fontSizes.base },
  list: { padding: spacing.base, gap: 12, paddingBottom: 40 },
  userCard: {},
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userInfo: { flex: 1, gap: 3 },
  userName: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.text },
  userEmail: { fontSize: typography.fontSizes.xs, color: colors.textMuted },
  userMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  toggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: { backgroundColor: colors.successLight },
});
