import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import KeyboardSafeScrollView from '../../components/ui/KeyboardSafeScrollView';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { updateProfile, updateAvatar, getMe } from '../../api/auth';
import { getMyTransactions } from '../../api/transactions';
import { getMyTickets, createTicket } from '../../api/support';
import useAuthStore from '../../store/authStore';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

const getFieldValue = (userObj, key) => {
  if (!userObj) return '—';
  if (key === 'fullName' || key === 'name') return userObj.fullName || userObj.name || '—';
  if (key === 'phone') return (userObj.phone && typeof userObj.phone === 'string' && userObj.phone.trim()) ? userObj.phone.trim() : '—';
  if (key === 'bloodGroup' || key === 'bloodType') return userObj.bloodGroup || userObj.bloodType || '—';
  if (key === 'age') return userObj.age ? `${userObj.age} years` : '—';
  if (key === 'sex') return userObj.sex ? (userObj.sex.charAt(0).toUpperCase() + userObj.sex.slice(1)) : '—';
  if (key === 'allergies') {
    if (Array.isArray(userObj.allergies) && userObj.allergies.length > 0) return userObj.allergies.join(', ');
    if (typeof userObj.allergies === 'string' && userObj.allergies.trim()) return userObj.allergies;
    return 'None';
  }
  if (key === 'emergencyContact') {
    if (typeof userObj.emergencyContact === 'object' && userObj.emergencyContact?.name) {
      const p = userObj.emergencyContact.phone ? ` (${userObj.emergencyContact.phone})` : '';
      return `${userObj.emergencyContact.name}${p}`.trim();
    }
    if (typeof userObj.emergencyContact === 'string' && userObj.emergencyContact.trim()) return userObj.emergencyContact;
    return '—';
  }
  if (key === 'currentMedications') {
    if (Array.isArray(userObj.currentMedications) && userObj.currentMedications.length > 0) return userObj.currentMedications.join(', ');
    if (typeof userObj.currentMedications === 'string' && userObj.currentMedications.trim()) return userObj.currentMedications;
    return 'None';
  }
  if (key === 'previousDiseaseHistory') {
    if (Array.isArray(userObj.previousDiseaseHistory) && userObj.previousDiseaseHistory.length > 0) return userObj.previousDiseaseHistory.join(', ');
    if (typeof userObj.previousDiseaseHistory === 'string' && userObj.previousDiseaseHistory.trim()) return userObj.previousDiseaseHistory;
    return 'None';
  }
  if (key === 'familyDiseaseHistory') {
    if (Array.isArray(userObj.familyDiseaseHistory) && userObj.familyDiseaseHistory.length > 0) return userObj.familyDiseaseHistory.join(', ');
    if (typeof userObj.familyDiseaseHistory === 'string' && userObj.familyDiseaseHistory.trim()) return userObj.familyDiseaseHistory;
    return 'None';
  }
  return userObj[key] || '—';
};

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : 12);
  const bottomPadding = insets.bottom + 32;

  const { user, logout, login } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const initForm = (userData) => {
    const u = userData || user || {};
    setForm({
      fullName: u.fullName || u.name || '',
      phone: u.phone || '',
      bloodGroup: u.bloodGroup || u.bloodType || '',
      age: u.age ? String(u.age) : '',
      allergies: Array.isArray(u.allergies) ? u.allergies.join(', ') : (u.allergies || ''),
      emergencyContactName: typeof u.emergencyContact === 'object' ? u.emergencyContact?.name || '' : (u.emergencyContact || ''),
      emergencyContactPhone: typeof u.emergencyContact === 'object' ? u.emergencyContact?.phone || '' : '',
      currentMedications: Array.isArray(u.currentMedications) ? u.currentMedications.join(', ') : (u.currentMedications || ''),
      previousDiseaseHistory: Array.isArray(u.previousDiseaseHistory) ? u.previousDiseaseHistory.join(', ') : (u.previousDiseaseHistory || ''),
      familyDiseaseHistory: Array.isArray(u.familyDiseaseHistory) ? u.familyDiseaseHistory.join(', ') : (u.familyDiseaseHistory || ''),
      avatar: u.avatar || '',
      avatarAsset: null,
    });
  };

  const load = useCallback(async () => {
    try {
      const meRes = await getMe();
      const meData = meRes?.data || meRes?.user || meRes;
      if (meData && meData._id) {
        useAuthStore.setState({ user: meData });
        initForm(meData);
      }
    } catch (_) {}

    const [txRes, ticketRes] = await Promise.allSettled([
      getMyTransactions({ limit: 3 }),
      getMyTickets(),
    ]);
    if (txRes.status === 'fulfilled') {
      const val = txRes.value;
      const list = Array.isArray(val) ? val : Array.isArray(val?.data) ? val.data : Array.isArray(val?.transactions) ? val.transactions : [];
      setTransactions(list);
    }
    if (ticketRes.status === 'fulfilled') {
      const val = ticketRes.value;
      const list = Array.isArray(val) ? val : Array.isArray(val?.data) ? val.data : Array.isArray(val?.tickets) ? val.tickets : [];
      setTickets(list);
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

  const startEditing = () => {
    initForm(user);
    setEditing(true);
  };

  const handlePickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      setForm((f) => ({ ...f, avatar: asset.uri, avatarAsset: asset }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let updatedAvatar = user?.avatar;

      // 1. If a new photo was selected, upload it via multipart form data
      if (form.avatarAsset || (form.avatar && form.avatar !== user?.avatar)) {
        try {
          const formData = new FormData();
          if (Platform.OS === 'web') {
            const resp = await fetch(form.avatar);
            const blob = await resp.blob();
            formData.append('avatar', blob, 'avatar.jpg');
          } else {
            formData.append('avatar', {
              uri: form.avatar,
              name: 'avatar.jpg',
              type: 'image/jpeg',
            });
          }
          const avatarRes = await updateAvatar(formData);
          if (avatarRes?.data?.avatar || avatarRes?.avatar) {
            updatedAvatar = avatarRes?.data?.avatar || avatarRes?.avatar;
          }
        } catch (avatarError) {
          console.warn('Avatar upload warning:', avatarError);
        }
      }

      // 2. Update profile fields
      const payload = {
        fullName: form.fullName,
        avatar: updatedAvatar,
        phone: form.phone,
        bloodGroup: form.bloodGroup,
        age: form.age ? parseInt(form.age, 10) : undefined,
        allergies: typeof form.allergies === 'string'
          ? form.allergies.split(',').map((s) => s.trim()).filter(Boolean)
          : form.allergies,
        currentMedications: typeof form.currentMedications === 'string'
          ? form.currentMedications.split(',').map((s) => s.trim()).filter(Boolean)
          : form.currentMedications,
        previousDiseaseHistory: typeof form.previousDiseaseHistory === 'string'
          ? form.previousDiseaseHistory.split(',').map((s) => s.trim()).filter(Boolean)
          : form.previousDiseaseHistory,
        familyDiseaseHistory: typeof form.familyDiseaseHistory === 'string'
          ? form.familyDiseaseHistory.split(',').map((s) => s.trim()).filter(Boolean)
          : form.familyDiseaseHistory,
        emergencyContact: {
          name: form.emergencyContactName || '',
          phone: form.emergencyContactPhone || '',
        },
      };

      const updated = await updateProfile(payload);
      const updatedUser = updated?.data || updated?.user || { ...user, ...payload, avatar: updatedAvatar };
      
      const currentToken = useAuthStore.getState().token;
      await login(currentToken, updatedUser);
      useAuthStore.setState({ user: updatedUser });
      setEditing(false);
      Alert.alert('Success', 'Profile and photo updated successfully.');
    } catch {
      Alert.alert('Error', 'Could not update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (confirmed) logout();
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ]);
    }
  };

  const handleNewTicket = () => {
    Alert.prompt
      ? Alert.prompt('New Support Ticket', 'Enter your issue description:', async (text) => {
          if (text) {
            try {
              await createTicket({ subject: text, message: text });
              Alert.alert('Ticket Submitted', 'Our support team has received your ticket.');
              load();
            } catch (_) {}
          }
        })
      : Alert.alert('Support Desk', 'Our support team is available 24/7 at support@mediai.health');
  };

  return (
    <KeyboardSafeScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickPhoto} disabled={!editing} activeOpacity={0.85}>
          <Avatar
            name={user?.fullName || user?.name || 'User'}
            uri={editing ? form.avatar || user?.avatar : user?.avatar}
            size="2xl"
            borderColor={colors.primary}
          />
          {editing && (
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={18} color={colors.white} />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.userName}>{user?.fullName || user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleChip}>
          <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
          <Text style={styles.roleText}>
            {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Patient'}
          </Text>
        </View>
      </View>

      {/* Personal & Medical Information Card */}
      <Card style={styles.section} padding={16}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          {!editing ? (
            <TouchableOpacity onPress={startEditing}>
              <Text style={styles.editBtn}>Edit</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {editing ? (
          <View style={styles.editForm}>
            <Input
              label="Full Name"
              value={form.fullName || ''}
              onChangeText={(val) => setForm((prev) => ({ ...prev, fullName: val }))}
              leftIcon={<Ionicons name="person-outline" size={16} color={colors.textMuted} />}
            />

            <Input
              label="Phone Number"
              placeholder="+1 555 123 4567"
              value={form.phone || ''}
              onChangeText={(val) => setForm((prev) => ({ ...prev, phone: val }))}
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="call-outline" size={16} color={colors.textMuted} />}
            />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Blood Group"
                  placeholder="e.g. A+, O+, B-"
                  value={form.bloodGroup || ''}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, bloodGroup: val }))}
                  leftIcon={<Ionicons name="water-outline" size={16} color={colors.textMuted} />}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Age"
                  placeholder="e.g. 28"
                  value={form.age || ''}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, age: val }))}
                  keyboardType="numeric"
                  leftIcon={<Ionicons name="calendar-outline" size={16} color={colors.textMuted} />}
                />
              </View>
            </View>

            <Input
              label="Allergies"
              placeholder="e.g. Peanuts, Penicillin (comma separated)"
              value={form.allergies || ''}
              onChangeText={(val) => setForm((prev) => ({ ...prev, allergies: val }))}
              leftIcon={<Ionicons name="alert-circle-outline" size={16} color={colors.textMuted} />}
            />

            <Input
              label="Emergency Contact Name"
              placeholder="e.g. Jane Doe"
              value={form.emergencyContactName || ''}
              onChangeText={(val) => setForm((prev) => ({ ...prev, emergencyContactName: val }))}
              leftIcon={<Ionicons name="heart-outline" size={16} color={colors.textMuted} />}
            />

            <Input
              label="Emergency Contact Phone"
              placeholder="e.g. +1 555 987 6543"
              value={form.emergencyContactPhone || ''}
              onChangeText={(val) => setForm((prev) => ({ ...prev, emergencyContactPhone: val }))}
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="call-outline" size={16} color={colors.textMuted} />}
            />

            {user?.role === 'patient' && (
              <>
                <Input
                  label="Current Medications"
                  placeholder="e.g. Vitamin D, Aspirin"
                  value={form.currentMedications || ''}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, currentMedications: val }))}
                  leftIcon={<Ionicons name="medkit-outline" size={16} color={colors.textMuted} />}
                />

                <Input
                  label="Previous Disease History"
                  placeholder="e.g. Asthma, Hypertension"
                  value={form.previousDiseaseHistory || ''}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, previousDiseaseHistory: val }))}
                  leftIcon={<Ionicons name="fitness-outline" size={16} color={colors.textMuted} />}
                />

                <Input
                  label="Family Disease History"
                  placeholder="e.g. Diabetes"
                  value={form.familyDiseaseHistory || ''}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, familyDiseaseHistory: val }))}
                  leftIcon={<Ionicons name="people-outline" size={16} color={colors.textMuted} />}
                />
              </>
            )}

            <View style={styles.editBtns}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  initForm(user);
                  setEditing(false);
                }}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Changes"
                onPress={handleSave}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.infoFields}>
            <View style={styles.fieldRow}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <Text style={styles.fieldValue}>{getFieldValue(user, 'fullName')}</Text>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <Text style={styles.fieldValue}>{getFieldValue(user, 'phone')}</Text>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <Ionicons name="water-outline" size={18} color={colors.primary} />
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Blood Type</Text>
                <Text style={styles.fieldValue}>{getFieldValue(user, 'bloodGroup')}</Text>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Age</Text>
                <Text style={styles.fieldValue}>{getFieldValue(user, 'age')}</Text>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.primary} />
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Allergies</Text>
                <Text style={styles.fieldValue}>{getFieldValue(user, 'allergies')}</Text>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <Ionicons name="heart-outline" size={18} color={colors.primary} />
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Emergency Contact</Text>
                <Text style={styles.fieldValue}>{getFieldValue(user, 'emergencyContact')}</Text>
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* Medical Background Card (Patient View Mode) */}
      {user?.role === 'patient' && !editing && (
        <Card style={styles.section} padding={16}>
          <Text style={styles.sectionTitle}>Medical Background</Text>

          <View style={styles.fieldRow}>
            <Ionicons name="medkit-outline" size={18} color={colors.primary} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Current Medications</Text>
              <Text style={styles.fieldValue}>{getFieldValue(user, 'currentMedications')}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Ionicons name="fitness-outline" size={18} color={colors.primary} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Previous Disease History</Text>
              <Text style={styles.fieldValue}>{getFieldValue(user, 'previousDiseaseHistory')}</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Family Disease History</Text>
              <Text style={styles.fieldValue}>{getFieldValue(user, 'familyDiseaseHistory')}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.remindersLinkBtn}
            onPress={() => navigation.navigate('MedicineReminders')}
            activeOpacity={0.8}
          >
            <View style={styles.remindersLinkLeft}>
              <Ionicons name="alarm-outline" size={16} color={colors.primary} />
              <Text style={styles.remindersLinkText}>Manage Medicine Reminders</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </Card>
      )}

      {/* Recent Transactions */}
      {Array.isArray(transactions) && transactions.length > 0 && !editing && (
        <Card style={styles.section} padding={16}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          {transactions.map((tx) => (
            <View key={tx._id} style={styles.txRow}>
              <Ionicons name="receipt-outline" size={16} color={colors.textMuted} />
              <View style={styles.txInfo}>
                <Text style={styles.txLabel}>{tx.description || tx.type || 'Payment'}</Text>
                <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
              </View>
              <Badge
                label={`₹${typeof tx.amount === 'number' ? tx.amount.toFixed(2) : tx.amount || 0}`}
                variant={tx.status === 'completed' ? 'success' : 'warning'}
              />
            </View>
          ))}
        </Card>
      )}

      {/* Support Tickets */}
      {!editing && (
        <Card style={styles.section} padding={16}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Support Tickets</Text>
            <TouchableOpacity onPress={handleNewTicket}>
              <Text style={styles.editBtn}>+ New</Text>
            </TouchableOpacity>
          </View>
          {!Array.isArray(tickets) || tickets.length === 0 ? (
            <Text style={styles.emptyText}>No open tickets</Text>
          ) : (
            tickets.map((t) => (
              <View key={t._id} style={styles.ticketRow}>
                <Ionicons name="help-circle-outline" size={16} color={colors.textMuted} />
                <Text style={styles.ticketLabel} numberOfLines={1}>
                  {t.title || t.subject || 'Support Ticket'}
                </Text>
                <Badge label={t.status || 'open'} variant={t.status === 'open' ? 'warning' : 'success'} size="xs" />
              </View>
            ))
          )}
        </Card>
      )}

      {/* Logout Button */}
      {!editing && (
        <Button title="Log Out" variant="danger" onPress={handleLogout} style={{ marginTop: 8 }} />
      )}
    </KeyboardSafeScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: spacing['3xl'] },
  avatarSection: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.base },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 6,
  },
  userName: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  userEmail: { fontSize: typography.fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  roleText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  section: { marginBottom: spacing.base },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  editBtn: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  editForm: { gap: 4 },
  rowInputs: { flexDirection: 'row', gap: 12 },
  infoFields: { gap: 2 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  fieldValue: { fontSize: typography.fontSizes.sm, color: colors.text, fontWeight: typography.fontWeights.medium },
  editBtns: { flexDirection: 'row', gap: spacing.base, marginTop: spacing.md },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txInfo: { flex: 1 },
  txLabel: { fontSize: typography.fontSizes.sm, color: colors.text },
  txDate: { fontSize: 11, color: colors.textMuted },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ticketLabel: { flex: 1, fontSize: typography.fontSizes.sm, color: colors.text },
  emptyText: { fontSize: typography.fontSizes.sm, color: colors.textMuted, textAlign: 'center', marginVertical: 8 },
  remindersLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  remindersLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remindersLinkText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
});
