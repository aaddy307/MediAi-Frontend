import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDoctorPatients } from '../../api/appointments';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';

export default function DoctorPatientsScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getDoctorPatients();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.patients) ? data.patients : [];
      setPatients(list);
    } catch (err) {
      console.log('Error loading doctor patients:', err.message);
      setPatients([]);
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

  const filteredPatients = (Array.isArray(patients) ? patients : []).filter((p) => {
    const name = (p.fullName || p.name || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  const renderPatient = ({ item }) => {
    const name = item.fullName || item.name || 'Patient';
    const bloodGroup = item.bloodGroup || '—';
    const age = item.age ? `${item.age} yrs` : '';

    return (
      <Card style={styles.patientCard} padding={16}>
        <View style={styles.patientRow}>
          <Avatar name={name} size="lg" />
          <View style={styles.patientDetails}>
            <Text style={styles.patientName}>{name}</Text>
            <Text style={styles.patientEmail}>{item.email}</Text>
            <View style={styles.tagsRow}>
              {item.bloodGroup && (
                <View style={styles.miniTag}>
                  <Ionicons name="water" size={10} color={colors.danger} />
                  <Text style={styles.miniTagText}>{item.bloodGroup}</Text>
                </View>
              )}
              {age ? (
                <View style={styles.miniTag}>
                  <Ionicons name="person" size={10} color={colors.info} />
                  <Text style={styles.miniTagText}>{age}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {item.allergies?.length > 0 && (
          <View style={styles.allergySection}>
            <Text style={styles.allergyLabel}>Allergies:</Text>
            <Text style={styles.allergyText}>{item.allergies.join(', ')}</Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      {loading && <LoadingOverlay message="Loading patients directory..." />}

      <View style={styles.header}>
        <Text style={styles.title}>My Patients</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item._id || item.email}
        renderItem={renderPatient}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="people-outline"
              title="No Patients Found"
              message={search ? 'No patients matching your search criteria.' : 'Patients who book with you will appear here.'}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.fontSizes.sm,
  },
  list: {
    padding: spacing.base,
    gap: 12,
    paddingBottom: 40,
  },
  patientCard: {
    gap: 10,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  patientDetails: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  patientEmail: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  miniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  miniTagText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  allergySection: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: radius.md,
    gap: 6,
  },
  allergyLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.danger,
  },
  allergyText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
});
