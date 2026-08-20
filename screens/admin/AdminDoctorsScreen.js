import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAdminDoctors, verifyDoctor } from '../../api/admin';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';

export default function AdminDoctorsScreen({ navigation }) {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'approved'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getAdminDoctors();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.doctors) ? data.doctors : [];
      setDoctors(list);
    } catch (err) {
      console.log('Error loading admin doctors:', err.message);
      setDoctors([]);
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

  const handleApprove = async (id, name) => {
    const doApprove = async () => {
      try {
        await verifyDoctor(id, 'approved');
        setDoctors((prev) =>
          prev.map((d) => (d._id === id ? { ...d, verificationStatus: 'approved' } : d))
        );
        if (Platform.OS === 'web') {
          window.alert(`Dr. ${name} is now approved.`);
        } else {
          Alert.alert('Approved', `Dr. ${name} is now approved.`);
        }
        load();
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Could not approve doctor.';
        if (Platform.OS === 'web') {
          window.alert(`Approval Failed: ${msg}`);
        } else {
          Alert.alert('Approval Failed', msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Approve credentials for Dr. ${name}?`)) {
        await doApprove();
      }
    } else {
      Alert.alert('Approve Doctor', `Approve credentials for Dr. ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: doApprove },
      ]);
    }
  };

  const handleReject = async (id, name) => {
    const doReject = async (reason) => {
      try {
        await verifyDoctor(id, 'rejected', reason || 'Incomplete credentials or license mismatch');
        setDoctors((prev) =>
          prev.map((d) => (d._id === id ? { ...d, verificationStatus: 'rejected' } : d))
        );
        if (Platform.OS === 'web') {
          window.alert(`Verification rejected for Dr. ${name}.`);
        } else {
          Alert.alert('Rejected', `Verification rejected for Dr. ${name}.`);
        }
        load();
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Could not reject doctor.';
        if (Platform.OS === 'web') {
          window.alert(`Reject Failed: ${msg}`);
        } else {
          Alert.alert('Reject Failed', msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Reject verification request for Dr. ${name}?`)) {
        await doReject();
      }
    } else {
      Alert.alert('Reject Application', `Reject verification request for Dr. ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => doReject() },
      ]);
    }
  };

  const filteredDoctors = doctors.filter((d) => {
    const name = (d.fullName || d.name || '').toLowerCase();
    const spec = (d.specialization || d.specialty || '').toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase()) || spec.includes(search.toLowerCase());
    if (filter === 'all') return matchesSearch;
    const status = d.verificationStatus || 'approved';
    return matchesSearch && status === filter;
  });

  const renderDoctor = ({ item }) => {
    const name = item.fullName || item.name || 'Doctor';
    const status = item.verificationStatus || 'approved';
    const isPending = status === 'pending';

    return (
      <Card style={styles.card} padding={16}>
        <View style={styles.cardTop}>
          <Avatar name={name} uri={item.avatar} size="lg" online={item.accountStatus === 'active'} />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.docName}>Dr. {name}</Text>
              <Badge
                label={status}
                variant={status === 'approved' ? 'success' : status === 'pending' ? 'warning' : 'danger'}
                dot
              />
            </View>
            <Text style={styles.specText}>{item.specialization || item.specialty || 'General Practitioner'}</Text>
            <Text style={styles.subInfo}>{item.hospitalName || item.email}</Text>
          </View>
        </View>

        {item.licenseNumber && (
          <View style={styles.licenseRow}>
            <Ionicons name="ribbon-outline" size={14} color={colors.primary} />
            <Text style={styles.licenseText}>License: {item.licenseNumber}</Text>
          </View>
        )}

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item._id, name)}>
              <Ionicons name="checkmark-circle" size={16} color={colors.white} />
              <Text style={styles.btnText}>Approve Doctor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item._id, name)}>
              <Ionicons name="close-circle" size={16} color={colors.danger} />
              <Text style={[styles.btnText, { color: colors.danger }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      {loading && <LoadingOverlay message="Loading doctor directory..." />}

      <View style={styles.header}>
        <Text style={styles.title}>Doctors & Verification</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Search doctors or specialty..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterRow}>
          {['all', 'pending', 'approved'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, filter === t && styles.tabActive]}
              onPress={() => setFilter(t)}
            >
              <Text style={[styles.tabText, filter === t && styles.tabTextActive]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredDoctors}
        keyExtractor={(item) => item._id}
        renderItem={renderDoctor}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && <EmptyState icon="medkit-outline" title="No Doctors Found" message="No doctors found matching criteria." />
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
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: typography.fontSizes.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.bold,
  },
  tabTextActive: {
    color: colors.primary,
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
    gap: 12,
  },
  info: { flex: 1, gap: 2 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  specText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  subInfo: {
    fontSize: 11,
    color: colors.textMuted,
  },
  licenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: radius.sm,
  },
  licenseText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 6,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 6,
  },
  btnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
});
