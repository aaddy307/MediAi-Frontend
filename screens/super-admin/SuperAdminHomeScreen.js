import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  Image,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { getSuperAdminDashboard, getPendingDoctors, approveDoctor, rejectDoctor } from '../../api/superAdmin';
import useAuthStore from '../../store/authStore';
import { colors, typography, spacing, radius, gradients, shadows } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';

export default function SuperAdminHomeScreen({ navigation }) {
  const { top: topPadding } = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const [dashboard, setDashboard] = useState({});
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

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

  const doctorDocs = [
    { label: 'Medical License Proof', url: selectedDoctor?.medicalLicenseProof },
    { label: 'Degree Certificate', url: selectedDoctor?.degreeCertificate },
    { label: 'Government ID', url: selectedDoctor?.governmentId },
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
    const [dashRes, doctorsRes] = await Promise.allSettled([
      getSuperAdminDashboard(),
      getPendingDoctors(),
    ]);
    if (dashRes.status === 'fulfilled') {
      const payload = dashRes.value;
      setDashboard(payload?.data || payload || {});
    }
    if (doctorsRes.status === 'fulfilled') {
      const val = doctorsRes.value;
      const list = Array.isArray(val) ? val : Array.isArray(val?.data) ? val.data : Array.isArray(val?.doctors) ? val.doctors : [];
      setPendingDoctors(list);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleApprove = async (id, name) => {
    const doApprove = async () => {
      try {
        await approveDoctor(id);
        setPendingDoctors((prev) => prev.filter((d) => d._id !== id));
        if (Platform.OS === 'web') {
          window.alert(`Dr. ${name} is now approved.`);
        }
      } catch {
        if (Platform.OS === 'web') {
          window.alert('Could not approve doctor.');
        } else {
          Alert.alert('Error', 'Could not approve doctor.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Approve Dr. ${name}?`)) {
        await doApprove();
      }
    } else {
      Alert.alert('Approve Doctor', `Approve Dr. ${name}?`, [
        { text: 'Cancel' },
        { text: 'Approve', onPress: doApprove },
      ]);
    }
  };

  const handleReject = async (id, name) => {
    const doReject = async () => {
      try {
        await rejectDoctor(id, 'Application rejected by super admin.');
        setPendingDoctors((prev) => prev.filter((d) => d._id !== id));
        if (Platform.OS === 'web') {
          window.alert(`Dr. ${name} rejected.`);
        }
      } catch {
        if (Platform.OS === 'web') {
          window.alert('Could not reject doctor.');
        } else {
          Alert.alert('Error', 'Could not reject doctor.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Reject Dr. ${name}?`)) {
        await doReject();
      }
    } else {
      Alert.alert('Reject Doctor', `Reject Dr. ${name}?`, [
        { text: 'Cancel' },
        { text: 'Reject', style: 'destructive', onPress: doReject },
      ]);
    }
  };

  const SYSTEM_STATS = [
    { 
      label: 'Total Users', 
      value: dashboard.totalUsers, 
      icon: 'people', 
      color: colors.primary,
      onPress: () => navigation.navigate('PlatformUsers', { initialRole: 'patient' })
    },
    { 
      label: 'Total Doctors', 
      value: dashboard.totalDoctors, 
      icon: 'medkit', 
      color: colors.success,
      onPress: () => navigation.navigate('PlatformUsers', { initialRole: 'doctor' })
    },
    { 
      label: 'Uptime', 
      value: '99.9%', 
      icon: 'pulse', 
      color: colors.info 
    },
    { 
      label: 'Revenue', 
      value: dashboard.revenue !== undefined ? `₹${Number(dashboard.revenue).toLocaleString('en-IN')}` : '₹0', 
      icon: 'cash', 
      color: colors.warning,
      onPress: () => navigation.navigate('PlatformAnalytics')
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <LinearGradient colors={['#064E3B', '#022C22']} style={[styles.hero, { paddingTop: topPadding + spacing.sm, paddingBottom: 60 }]}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroSub}>SUPER ADMIN CONSOLE</Text>
            <Text style={styles.heroName}>{user?.name}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Modern Dashboard Stats Overlay */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          {SYSTEM_STATS.map((s, i) => {
            const CardComponent = (
              <Card key={i} style={styles.statCard} padding={12}>
                <View style={[styles.statIconBox, { backgroundColor: s.color + '15' }]}>
                  <Ionicons name={s.icon} size={16} color={s.color} />
                </View>
                <Text style={styles.statValue}>{s.value ?? '—'}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </Card>
            );
            if (s.onPress) {
              return (
                <TouchableOpacity key={i} onPress={s.onPress} activeOpacity={0.8} style={styles.statWrapper}>
                  {CardComponent}
                </TouchableOpacity>
              );
            }
            return (
              <View key={i} style={styles.statWrapper}>
                {CardComponent}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Doctor Approvals</Text>
          {pendingDoctors.length > 0 && (
            <Badge label={String(pendingDoctors.length)} variant="warning" />
          )}
        </View>
        {(!Array.isArray(pendingDoctors) || pendingDoctors.length === 0) ? (
          <Card padding={24} style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            <Text style={styles.emptyText}>All caught up! No pending approvals.</Text>
          </Card>
        ) : (
          pendingDoctors.map((doc) => {
            const docName = doc.fullName || doc.name || 'Doctor';
            const cleanDocName = docName.replace(/^(dr\.\s*|dr\s+)+/i, '');
            const docSpec = doc.specialization || doc.specialty || 'General Practice';
            return (
              <Card key={doc._id} style={styles.doctorCard} padding={16}>
                <TouchableOpacity style={styles.docRow} onPress={() => setSelectedDoctor(doc)} activeOpacity={0.7}>
                  <Avatar name={cleanDocName} uri={doc.avatar} size="md" />
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>Dr. {cleanDocName}</Text>
                    <View style={styles.specContainer}>
                      <Ionicons name="medical" size={10} color={colors.primary} />
                      <Text style={styles.docSpec}>{docSpec.toUpperCase()}</Text>
                    </View>
                    <View style={styles.emailRow}>
                      <Ionicons name="mail-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.docEmail}>{doc.email}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ alignSelf: 'center' }} />
                </TouchableOpacity>
                <View style={styles.docActions}>
                  <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(doc._id, cleanDocName)}>
                    <Ionicons name="close-circle" size={16} color="#991B1B" />
                    <Text style={[styles.actionBtnText, styles.rejectText]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(doc._id, cleanDocName)}>
                    <Ionicons name="checkmark-circle" size={16} color="#065F46" />
                    <Text style={[styles.actionBtnText, styles.approveText]}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </View>

      {/* Global Management Modules */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Global Management Console</Text>
        <View style={styles.navGrid}>
          {[
            { label: 'Global Ambulance Fleet', icon: 'car-sport', screen: 'AmbulanceFleet', color: colors.primary },
            { label: 'Platform Analytics & Growth', icon: 'analytics', screen: 'PlatformAnalytics', color: colors.accent },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.navCard}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.navIcon, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.navLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Doctor Details Modal */}
      <Modal
        visible={!!selectedDoctor}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDoctor(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Doctor Details</Text>
              <TouchableOpacity onPress={() => setSelectedDoctor(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalAvatarRow}>
                <Avatar name={selectedDoctor?.fullName || selectedDoctor?.name} uri={selectedDoctor?.avatar} size="xl" />
                <Text style={styles.modalDocName}>Dr. {selectedDoctor?.fullName || selectedDoctor?.name}</Text>
                <Badge label={selectedDoctor?.specialization} variant="info" />
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Professional Info</Text>
                <View style={styles.modalGrid}>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>License Number</Text>
                    <Text style={styles.modalVal}>{selectedDoctor?.licenseNumber || '—'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Experience</Text>
                    <Text style={styles.modalVal}>{selectedDoctor?.yearsOfExperience ? `${selectedDoctor.yearsOfExperience} Years` : '—'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Hospital Name</Text>
                    <Text style={styles.modalVal}>{selectedDoctor?.hospitalName || '—'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Clinic Address</Text>
                    <Text style={styles.modalVal}>{selectedDoctor?.clinicAddress || '—'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Contact Details</Text>
                <View style={styles.modalGrid}>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Email Address</Text>
                    <Text style={styles.modalVal}>{selectedDoctor?.email || '—'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Phone Number</Text>
                    <Text style={styles.modalVal}>{selectedDoctor?.phone || '—'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Consultation Fees</Text>
                <View style={styles.modalGrid}>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Video Fee</Text>
                    <Text style={styles.modalVal}>₹{selectedDoctor?.videoFee || '799'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Voice Fee</Text>
                    <Text style={styles.modalVal}>₹{selectedDoctor?.voiceFee || '499'}</Text>
                  </View>
                  <View style={styles.modalCol}>
                    <Text style={styles.modalLabel}>Chat Fee</Text>
                    <Text style={styles.modalVal}>₹{selectedDoctor?.chatFee || '299'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Submitted Verification Documents</Text>
                <View style={styles.docsList}>
                  {doctorDocs.map((docItem, idx) => {
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
                  {doctorDocs.length === 0 && (
                    <Text style={styles.noDocsText}>No verification documents uploaded.</Text>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  hero: { padding: spacing.base, paddingTop: spacing['3xl'], paddingBottom: 60, gap: 20 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroSub: { fontSize: 10, color: 'rgba(255, 255, 255, 0.7)', fontWeight: typography.fontWeights.bold, letterSpacing: 1.5 },
  heroName: { fontSize: typography.fontSizes['2xl'], fontWeight: typography.fontWeights.extrabold, color: colors.white },
  logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.15)', alignItems: 'center', justifyContent: 'center' },
  statsContainer: { paddingHorizontal: spacing.base, marginTop: -40, marginBottom: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statWrapper: { width: '48%', marginBottom: 12 },
  statCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 6, ...shadows.sm },
  statIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.extrabold, color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: typography.fontWeights.medium },
  section: { padding: spacing.base, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: colors.text },
  emptyCard: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: typography.fontSizes.sm, color: colors.textMuted, textAlign: 'center' },
  doctorCard: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, ...shadows.xs, marginBottom: 8 },
  docRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 12 },
  docInfo: { flex: 1, gap: 4 },
  docName: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.text },
  specContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  docSpec: { fontSize: 10, color: colors.primary, fontWeight: typography.fontWeights.bold, letterSpacing: 0.5 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  docEmail: { fontSize: typography.fontSizes.xs, color: colors.textMuted },
  docActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
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
  navGrid: { gap: 10 },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  navIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navLabel: { flex: 1, fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.semibold, color: colors.text },
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
  modalDocName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
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
