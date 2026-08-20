import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllPlatformUsers, approveDoctor, rejectDoctor, approveHospital, rejectHospital } from '../../api/superAdmin';
import { colors, typography, spacing, radius } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';

export default function PlatformUsersScreen({ navigation, route }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(route.params?.initialRole || 'all'); // 'all' | 'patient' | 'doctor' | 'admin'
  
  React.useEffect(() => {
    if (route.params?.initialRole) {
      setRoleFilter(route.params.initialRole);
    }
  }, [route.params?.initialRole]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const resolveDocUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    let base = 'http://localhost:5000';
    if (typeof window !== 'undefined' && window.location) {
      const host = window.location.hostname || 'localhost';
      base = `http://${host}:5000`;
    } else if (process.env.EXPO_PUBLIC_API_URL) {
      base = process.env.EXPO_PUBLIC_API_URL;
    }
    let path = url;
    if (!path.startsWith('/uploads') && !path.startsWith('uploads/')) {
      path = `/uploads/${path.startsWith('/') ? path.substring(1) : path}`;
    } else {
      path = path.startsWith('/') ? path : `/${path}`;
    }
    return `${base}${path}`;
  };

  const userDocs = [
    // Doctor docs
    ...(selectedUser?.role === 'doctor' ? [
      { label: 'Medical License Proof', url: selectedUser?.medicalLicenseProof },
      { label: 'Degree Certificate', url: selectedUser?.degreeCertificate },
      { label: 'Government ID', url: selectedUser?.governmentId },
    ] : []),
    // Admin docs
    ...(selectedUser?.role === 'admin' ? [
      { label: 'Registration Certificate', url: selectedUser?.hospitalRegistrationCertificate },
      { label: 'NABH Certificate', url: selectedUser?.nabhCertificate },
      { label: 'GST Certificate', url: selectedUser?.gstCertificate },
      { label: 'Authorized Representative ID', url: selectedUser?.authorizedRepGovId },
      { label: 'Legal Entity Proof', url: selectedUser?.legalEntityProof },
      { label: 'Authorization Proof', url: selectedUser?.authorizationProof },
      { label: 'Address Proof', url: selectedUser?.hospitalAddressProof },
    ] : []),
    // Patient docs
    ...(selectedUser?.role === 'patient' && Array.isArray(selectedUser?.documents) ? selectedUser.documents.map(d => ({
      label: d.title || 'Medical Document',
      url: d.url
    })) : [])
  ].filter(d => d.url);

  const handleOpenDoc = (url) => {
    const uri = resolveDocUrl(url);
    if (uri) {
      Linking.openURL(uri).catch(() => {
        Alert.alert('Error', 'Could not open document link.');
      });
    }
  };

  const handleApprove = async (id, name, role) => {
    const doApprove = async () => {
      try {
        if (role === 'doctor') {
          await approveDoctor(id);
        } else {
          await approveHospital(id);
        }
        if (Platform.OS === 'web') {
          window.alert('Account approved successfully');
        } else {
          Alert.alert('Success', 'Account approved successfully');
        }
        setSelectedUser(null);
        load();
      } catch {
        if (Platform.OS === 'web') {
          window.alert('Could not approve account.');
        } else {
          Alert.alert('Error', 'Could not approve account.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Are you sure you want to approve ${name}?`)) {
        await doApprove();
      }
    } else {
      Alert.alert('Approve Account', `Are you sure you want to approve ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: doApprove },
      ]);
    }
  };

  const handleReject = async (id, name, role) => {
    const doReject = async () => {
      try {
        if (role === 'doctor') {
          await rejectDoctor(id, 'Application rejected by super admin.');
        } else {
          await rejectHospital(id, 'Application rejected by super admin.');
        }
        if (Platform.OS === 'web') {
          window.alert('Account rejected successfully');
        } else {
          Alert.alert('Success', 'Account rejected successfully');
        }
        setSelectedUser(null);
        load();
      } catch {
        if (Platform.OS === 'web') {
          window.alert('Could not reject account.');
        } else {
          Alert.alert('Error', 'Could not reject account.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Are you sure you want to reject ${name}?`)) {
        await doReject();
      }
    } else {
      Alert.alert('Reject Account', `Are you sure you want to reject ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: doReject },
      ]);
    }
  };

  const load = useCallback(async () => {
    try {
      const data = await getAllPlatformUsers();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.users) ? data.users : [];
      setUsers(list);
    } catch (err) {
      console.log('Error loading platform users:', err.message);
      setUsers([]);
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

  const filteredUsers = (Array.isArray(users) ? users : []).filter((u) => {
    const name = (u.fullName || u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    if (roleFilter === 'all') return matchesSearch;
    return matchesSearch && u.role === roleFilter;
  });

  const renderUser = ({ item }) => {
    const name = item.fullName || item.name || 'User';
    const role = item.role || 'patient';
    const roleVariant = role === 'doctor' ? 'info' : role === 'admin' ? 'accent' : 'success';

    return (
      <Card style={styles.card} padding={14}>
        <TouchableOpacity style={styles.userRow} onPress={() => setSelectedUser(item)} activeOpacity={0.7}>
          <Avatar name={name} size="md" />
          <View style={styles.userInfo}>
            <View style={styles.nameLine}>
              <Text style={styles.userName}>{name}</Text>
              <Badge label={role.toUpperCase()} variant={roleVariant} />
            </View>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      {loading && <LoadingOverlay message="Loading platform users..." />}

      <View style={styles.header}>
        <Text style={styles.title}>Platform Users</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Search by name or email..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterRow}>
          {['all', 'patient', 'doctor', 'admin'].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.tab, roleFilter === r && styles.tabActive]}
              onPress={() => setRoleFilter(r)}
            >
              <Text style={[styles.tabText, roleFilter === r && styles.tabTextActive]}>
                {r.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id || item.email}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && <EmptyState icon="people-outline" title="No Users Found" message="No platform users found." />
        }
      />

      {/* User Details Modal */}
      <Modal
        visible={!!selectedUser}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Account Details</Text>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalAvatarRow}>
                <Avatar name={selectedUser?.fullName || selectedUser?.name || 'User'} size="xl" />
                <Text style={styles.modalUserName}>{selectedUser?.fullName || selectedUser?.name || 'User'}</Text>
                <Badge
                  label={(selectedUser?.role || 'patient').toUpperCase()}
                  variant={selectedUser?.role === 'doctor' ? 'info' : selectedUser?.role === 'admin' ? 'accent' : 'success'}
                />
              </View>

              {/* Patient Details */}
              {(selectedUser?.role === 'patient' || !selectedUser?.role) && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Patient Information</Text>
                  <View style={styles.modalGrid}>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>Gender</Text>
                      <Text style={styles.modalVal}>{selectedUser?.gender || 'Not specified'}</Text>
                    </View>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>Date of Birth</Text>
                      <Text style={styles.modalVal}>
                        {selectedUser?.dob ? new Date(selectedUser.dob).toLocaleDateString('en-IN') : 'Not specified'}
                      </Text>
                    </View>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>Blood Group</Text>
                      <Text style={styles.modalVal}>{selectedUser?.bloodGroup || 'Not specified'}</Text>
                    </View>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>Account Status</Text>
                      <Text style={styles.modalVal}>{selectedUser?.isActive !== false ? 'Active' : 'Suspended'}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Patient Emergency Contact Details */}
              {(selectedUser?.role === 'patient' || !selectedUser?.role) && selectedUser?.emergencyContact && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Emergency Contact</Text>
                  <View style={styles.modalGrid}>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>Contact Name</Text>
                      <Text style={styles.modalVal}>{selectedUser?.emergencyContact?.name || '—'}</Text>
                    </View>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>Relationship</Text>
                      <Text style={styles.modalVal}>{selectedUser?.emergencyContact?.relationship || '—'}</Text>
                    </View>
                    <View style={[styles.modalCol, { width: '100%' }]}>
                      <Text style={styles.modalLabel}>Emergency Phone</Text>
                      <Text style={styles.modalVal}>{selectedUser?.emergencyContact?.phone || '—'}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Doctor Details */}
              {selectedUser?.role === 'doctor' && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Doctor Credentials</Text>
                  <View style={styles.modalGrid}>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>Specialization</Text>
                      <Text style={styles.modalVal}>{selectedUser?.specialization || '—'}</Text>
                    </View>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>License Number</Text>
                      <Text style={styles.modalVal}>{selectedUser?.licenseNumber || '—'}</Text>
                    </View>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>Experience</Text>
                      <Text style={styles.modalVal}>{selectedUser?.yearsOfExperience ? `${selectedUser.yearsOfExperience} Years` : '—'}</Text>
                    </View>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>Hospital Name</Text>
                      <Text style={styles.modalVal}>{selectedUser?.hospitalName || '—'}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Admin details */}
              {selectedUser?.role === 'admin' && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Hospital Association</Text>
                  <View style={styles.modalGrid}>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>Hospital Name</Text>
                      <Text style={styles.modalVal}>{selectedUser?.hospitalName || '—'}</Text>
                    </View>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>Registration Number</Text>
                      <Text style={styles.modalVal}>{selectedUser?.hospitalRegistrationNumber || '—'}</Text>
                    </View>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>Verification Status</Text>
                      <Text style={styles.modalVal}>{(selectedUser?.verificationStatus || 'approved').toUpperCase()}</Text>
                    </View>
                    <View style={styles.modalCol}>
                      <Text style={styles.modalLabel}>Account Status</Text>
                      <Text style={styles.modalVal}>{selectedUser?.isActive !== false ? 'Active' : 'Suspended'}</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>General Contact Details</Text>
                <View style={styles.modalGrid}>
                  <View style={[styles.modalCol, { width: '100%' }]}>
                    <Text style={styles.modalLabel}>Email Address</Text>
                    <Text style={styles.modalVal}>{selectedUser?.email || '—'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Phone Number</Text>
                    <Text style={styles.modalVal}>{selectedUser?.phone || '—'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Registered On</Text>
                    <Text style={styles.modalVal}>
                      {selectedUser?.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('en-IN') : '—'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Submitted Verification Documents</Text>
                <View style={styles.docsList}>
                  {userDocs.map((docItem, idx) => {
                    return (
                      <View key={idx} style={styles.docImgCard}>
                        <View style={styles.docInfoRow}>
                          <Ionicons name="document-text" size={16} color={colors.primary} />
                          <Text style={styles.docImgLabel}>{docItem.label}</Text>
                        </View>
                        <TouchableOpacity style={styles.viewDocBtn} onPress={() => handleOpenDoc(docItem.url)}>
                          <Ionicons name="eye-outline" size={14} color="#059669" />
                          <Text style={styles.viewDocText}>Click to view</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  {userDocs.length === 0 && (
                    <Text style={styles.noDocsText}>No verification documents uploaded.</Text>
                  )}
                </View>
              </View>

              {selectedUser?.verificationStatus === 'pending' && (selectedUser?.role === 'doctor' || selectedUser?.role === 'admin') && (
                <View style={styles.docActions}>
                  <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(selectedUser._id, selectedUser.fullName || selectedUser.name, selectedUser.role)}>
                    <Ionicons name="close-circle" size={16} color="#991B1B" />
                    <Text style={[styles.actionBtnText, styles.rejectText]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(selectedUser._id, selectedUser.fullName || selectedUser.name, selectedUser.role)}>
                    <Ionicons name="checkmark-circle" size={16} color="#065F46" />
                    <Text style={[styles.actionBtnText, styles.approveText]}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 12,
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
    gap: 8,
  },
  card: {
    backgroundColor: colors.surface,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfo: { flex: 1, gap: 2 },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  userEmail: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing.base,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  modalScroll: {
    gap: 16,
    paddingBottom: 24,
  },
  modalAvatarRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalUserName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  modalSection: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  modalSectionTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modalCol: {
    width: '46%',
    gap: 4,
  },
  modalLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  modalVal: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  docsList: {
    gap: 10,
    marginTop: 8,
  },
  docImgCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  docInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  docImgLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    gap: 6,
  },
  viewDocText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: '#065F46',
  },
  noDocsText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  docActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  approveBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rejectBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  approveText: {
    color: '#065F46',
  },
  rejectText: {
    color: '#991B1B',
  },
  actionBtnText: { fontWeight: typography.fontWeights.bold, fontSize: typography.fontSizes.sm },
});

