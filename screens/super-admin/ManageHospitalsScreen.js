import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllAdmins, suspendAdmin, approveHospital, rejectHospital } from '../../api/superAdmin';
import { colors, typography, spacing, radius } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';

export default function ManageHospitalsScreen({ navigation }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);

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

  const hospitalDocs = [
    { label: 'Registration Certificate', url: selectedHospital?.hospitalRegistrationCertificate },
    { label: 'NABH Certificate', url: selectedHospital?.nabhCertificate },
    { label: 'GST Certificate', url: selectedHospital?.gstCertificate },
    { label: 'Authorized Representative ID', url: selectedHospital?.authorizedRepGovId },
    { label: 'Legal Entity Proof', url: selectedHospital?.legalEntityProof },
    { label: 'Authorization Proof', url: selectedHospital?.authorizationProof },
    { label: 'Address Proof', url: selectedHospital?.hospitalAddressProof },
  ].filter(d => d.url);

  const handleOpenDoc = (url) => {
    const uri = resolveDocUrl(url);
    if (uri) {
      Linking.openURL(uri).catch(() => {
        Alert.alert('Error', 'Could not open document link.');
      });
    }
  };

  const load = useCallback(async () => {
    try {
      const data = await getAllAdmins();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.admins) ? data.admins : [];
      setHospitals(list);
    } catch (_) {
      setHospitals([]);
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
    Alert.alert('Approve Hospital', `Approve registration for ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await approveHospital(id);
            setHospitals((prev) =>
              prev.map((h) => (h._id === id ? { ...h, verificationStatus: 'approved', isVerified: true, isActive: true } : h))
            );
            Alert.alert('Success', 'Hospital account approved.');
          } catch (_) {
            Alert.alert('Error', 'Could not approve hospital.');
          }
        },
      },
    ]);
  };

  const handleReject = async (id, name) => {
    Alert.alert('Reject Hospital', `Reject registration for ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await rejectHospital(id, 'Rejection by super admin console.');
            setHospitals((prev) =>
              prev.map((h) => (h._id === id ? { ...h, verificationStatus: 'rejected', isVerified: false } : h))
            );
            Alert.alert('Success', 'Hospital account rejected.');
          } catch (_) {
            Alert.alert('Error', 'Could not reject hospital.');
          }
        },
      },
    ]);
  };

  const handleToggleSuspend = (id, name, isActive) => {
    const isCurrentlySuspended = isActive === false;
    const action = isCurrentlySuspended ? 'Re-activate' : 'Suspend';
    Alert.alert(`${action} Hospital`, `${action} account for ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        style: isCurrentlySuspended ? 'default' : 'destructive',
        onPress: async () => {
          try {
            await suspendAdmin(id);
            setHospitals((prev) =>
              prev.map((h) => (h._id === id ? { ...h, isActive: isCurrentlySuspended } : h))
            );
            Alert.alert('Status Updated', `Hospital status set to ${isCurrentlySuspended ? 'Active' : 'Suspended'}.`);
          } catch (_) {
            Alert.alert('Error', 'Could not update hospital status.');
          }
        },
      },
    ]);
  };

  const renderHospital = ({ item }) => {
    const isSuspended = item.isActive === false;
    const isPending = item.verificationStatus === 'pending';

    return (
      <Card style={styles.card} padding={16}>
        <TouchableOpacity style={styles.cardTop} onPress={() => setSelectedHospital(item)} activeOpacity={0.7}>
          <View style={styles.iconBox}>
            <Ionicons name="business" size={22} color={colors.primary} />
          </View>
          <View style={styles.info}>
            <Text style={styles.hospName}>{item.hospitalName || item.fullName || 'Hospital Admin'}</Text>
            <Text style={styles.hospEmail}>{item.email}</Text>
            <Text style={styles.hospPhone}>{item.hospitalContactNumber || 'Phone on file'}</Text>
          </View>
          <View style={{ gap: 6, alignItems: 'flex-end' }}>
            <Badge
              label={isSuspended ? 'SUSPENDED' : (item.verificationStatus || 'approved').toUpperCase()}
              variant={isSuspended ? 'danger' : (isPending ? 'warning' : 'success')}
              dot
            />
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          {isPending ? (
            <View style={styles.pendingActions}>
              <TouchableOpacity
                style={[styles.btn, styles.rejectBtn]}
                onPress={() => handleReject(item._id, item.hospitalName || item.fullName || 'Hospital')}
              >
                <Ionicons name="close-circle-outline" size={14} color={colors.danger} />
                <Text style={[styles.btnText, { color: colors.danger }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.approveBtn]}
                onPress={() => handleApprove(item._id, item.hospitalName || item.fullName || 'Hospital')}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                <Text style={[styles.btnText, { color: colors.success }]}>Approve</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.btn, isSuspended ? styles.reactivateBtn : styles.suspendBtn]}
              onPress={() => handleToggleSuspend(item._id, item.hospitalName || item.fullName || 'Hospital', item.isActive)}
            >
              <Ionicons
                name={isSuspended ? 'checkmark-circle-outline' : 'ban-outline'}
                size={14}
                color={isSuspended ? colors.success : colors.danger}
              />
              <Text style={[styles.btnText, { color: isSuspended ? colors.success : colors.danger }]}>
                {isSuspended ? 'Reactivate Account' : 'Suspend Entity'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      {loading && <LoadingOverlay message="Loading registered hospitals..." />}
      <View style={styles.header}>
        <Text style={styles.title}>Manage Hospitals</Text>
        <Text style={styles.subtitle}>Onboard and supervise hospital administrator accounts</Text>
      </View>

      <FlatList
        data={hospitals}
        keyExtractor={(item) => item._id}
        renderItem={renderHospital}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={<EmptyState icon="business-outline" title="No Hospitals" message="No registered hospitals found." />}
      />

      {/* Hospital Details Modal */}
      <Modal
        visible={!!selectedHospital}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedHospital(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hospital Details</Text>
              <TouchableOpacity onPress={() => setSelectedHospital(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="business" size={32} color={colors.primary} />
                </View>
                <Text style={styles.modalHospName}>{selectedHospital?.hospitalName || 'Network Hospital'}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Badge
                    label={selectedHospital?.isActive === false ? 'SUSPENDED' : (selectedHospital?.verificationStatus || 'approved').toUpperCase()}
                    variant={selectedHospital?.isActive === false ? 'danger' : (selectedHospital?.verificationStatus === 'pending' ? 'warning' : 'success')}
                  />
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Hospital Information</Text>
                <View style={styles.modalGrid}>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Admin Full Name</Text>
                    <Text style={styles.modalVal}>{selectedHospital?.fullName || '—'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Registered Number</Text>
                    <Text style={styles.modalVal}>{selectedHospital?.hospitalRegistrationNumber || '—'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Organization PAN</Text>
                    <Text style={styles.modalVal}>{selectedHospital?.organizationPan || '—'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Registered On</Text>
                    <Text style={styles.modalVal}>
                      {selectedHospital?.createdAt ? new Date(selectedHospital.createdAt).toLocaleDateString('en-IN') : '—'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Contact Details</Text>
                <View style={styles.modalGrid}>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Contact Email</Text>
                    <Text style={styles.modalVal}>{selectedHospital?.email || '—'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Contact Phone</Text>
                    <Text style={styles.modalVal}>{selectedHospital?.hospitalContactNumber || '—'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Location Parameters</Text>
                <View style={styles.modalGrid}>
                  <View style={[styles.modalCol, { width: '100%' }]}>
                    <Text style={styles.modalLabel}>Google Map Navigation Link</Text>
                    <Text style={[styles.modalVal, { color: colors.info }]}>{selectedHospital?.hospitalMapLink || 'Not provided'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Latitude</Text>
                    <Text style={styles.modalVal}>{selectedHospital?.location?.latitude || '—'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Longitude</Text>
                    <Text style={styles.modalVal}>{selectedHospital?.location?.longitude || '—'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Submitted Verification Documents</Text>
                <View style={styles.docsList}>
                  {hospitalDocs.map((docItem, idx) => {
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
                  {hospitalDocs.length === 0 && (
                    <Text style={styles.noDocsText}>No verification documents uploaded.</Text>
                  )}
                </View>
              </View>
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
  },
  card: { gap: 10 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  hospName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  hospEmail: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  hospPhone: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 6,
  },
  suspendBtn: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger + '44',
  },
  reactivateBtn: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success + '44',
  },
  btnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success + '44',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger + '44',
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
  modalHeaderRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHospName: {
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
});

