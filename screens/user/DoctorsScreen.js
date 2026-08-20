import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDoctors } from '../../api/doctors';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SPECIALTIES = ['All', 'General', 'Cardiology', 'Neurology', 'Pediatrics', 'Dermatology', 'Orthopedics', 'Radiology'];

function DoctorCard({ doctor, onPress }) {
  const name = doctor.fullName || doctor.name || 'Doctor';
  const specialty = doctor.specialization || doctor.specialty || 'General Practice';
  const exp = doctor.yearsOfExperience || doctor.experience || 5;
  const fee = doctor.consultationFee || doctor.fee || 40;
  const rating = doctor.rating || 4.8;
  const available = doctor.onlineStatus === 'available' || doctor.isAvailable !== false;
  const chatFee = doctor.chatFee || Math.round(fee * 0.6) || 299;
  const voiceFee = doctor.voiceFee || fee || 499;
  const videoFee = doctor.videoFee || Math.round(fee * 1.5) || 799;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.docCard} padding={16}>
        <View style={styles.docRow}>
          <Avatar name={name} uri={doctor.avatar} size="lg" online={available} />
          <View style={styles.docInfo}>
            <View style={styles.docNameRow}>
              <Text style={styles.docName}>Dr. {name}</Text>
              {available && <Badge label="Available" variant="success" size="xs" />}
            </View>
            <Text style={styles.docSpecialty}>{specialty}</Text>
            <Text style={styles.docExp}>{exp} yrs exp · {doctor.hospitalName || 'MediAI Hospital'}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({doctor.reviewCount || 12} reviews)</Text>
            </View>
          </View>
        </View>

        {/* Individual Format Pricing Strip */}
        <View style={styles.formatFeesRow}>
          <View style={styles.feeBadge}>
            <Ionicons name="chatbubbles" size={12} color="#059669" />
            <Text style={styles.feeBadgeText}>Chat: ₹{chatFee}</Text>
          </View>
          <View style={styles.feeBadge}>
            <Ionicons name="call" size={12} color="#2563EB" />
            <Text style={styles.feeBadgeText}>Voice: ₹{voiceFee}</Text>
          </View>
          <View style={styles.feeBadge}>
            <Ionicons name="videocam" size={12} color="#7C3AED" />
            <Text style={styles.feeBadgeText}>Video: ₹{videoFee}</Text>
          </View>
        </View>

        <View style={styles.docFooter}>
          <View style={styles.feeRow}>
            <Text style={styles.feeText}>
              From <Text style={{ fontWeight: '800', color: colors.primary }}>₹{chatFee}</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={onPress}>
            <Text style={styles.bookBtnText}>Book Appointment</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function DoctorsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [doctors, setDoctors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getDoctors();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.doctors) ? data.doctors : [];
      setDoctors(list);
      setFiltered(list);
    } catch (_) {
      setDoctors([]);
      setFiltered([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let result = Array.isArray(doctors) ? [...doctors] : [];
    if (specialty !== 'All') {
      result = result.filter((d) => {
        const docSpec = (d.specialization || d.specialty || '').toLowerCase();
        return docSpec.includes(specialty.toLowerCase());
      });
    }
    if (search) {
      result = result.filter((d) => {
        const docName = (d.fullName || d.name || '').toLowerCase();
        return docName.includes(search.toLowerCase());
      });
    }
    setFiltered(result);
  }, [search, specialty, doctors]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search doctors by name…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Specialty filter */}
      <FlatList
        data={SPECIALTIES}
        horizontal
        keyExtractor={(s) => s}
        showsHorizontalScrollIndicator={false}
        style={styles.specialtiesList}
        contentContainerStyle={styles.specialtiesRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.specChip, specialty === item && styles.specChipActive]}
            onPress={() => setSpecialty(item)}
            activeOpacity={0.8}
          >
            <Text style={[styles.specText, specialty === item && styles.specTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filtered}
        keyExtractor={(d) => d._id}
        renderItem={({ item }) => (
          <DoctorCard
            doctor={item}
            onPress={() => navigation.navigate('BookAppointment', { doctor: item })}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="person-outline"
              title="No doctors found"
              message="Try adjusting your search or filter."
            />
          )
        }
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
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    gap: 8,
    ...shadows.sm,
  },
  searchIcon: { marginRight: 2 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text,
    fontSize: typography.fontSizes.base,
  },
  specialtiesList: {
    flexGrow: 0,
    maxHeight: 52,
    marginBottom: spacing.xs,
  },
  specialtiesRow: {
    paddingHorizontal: spacing.base,
    paddingVertical: 4,
    alignItems: 'center',
    flexDirection: 'row',
  },
  specChip: {
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
  specChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.primary,
  },
  specText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  specTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
  list: { padding: spacing.base, gap: 12, paddingBottom: 40 },
  docCard: {},
  docRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  docInfo: { flex: 1, gap: 3 },
  docNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  docName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  docSpecialty: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  docExp: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    fontSize: typography.fontSizes.xs,
    color: colors.warning,
    fontWeight: typography.fontWeights.bold,
  },
  reviewCount: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  formatFeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  feeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.md,
  },
  feeBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  docFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feeText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  bookBtn: {
    backgroundColor: colors.primaryGlow,
    borderRadius: radius.lg,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  bookBtnText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
});
