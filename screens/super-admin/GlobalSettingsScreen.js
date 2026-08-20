import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { colors, typography, spacing, radius } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { getPlatformSettings, updatePlatformSettings } from '../../api/superAdmin';

export default function GlobalSettingsScreen({ navigation }) {
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // States
  const [activeModel, setActiveModel] = useState('Groq (Qwen 27B / Llama 3.3)');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [guestSOSEnabled, setGuestSOSEnabled] = useState(true);
  const [autoAmbulanceDispatch, setAutoAmbulanceDispatch] = useState(true);

  // Proposed options
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationSMS, setNotificationSMS] = useState(true);
  const [notificationPush, setNotificationPush] = useState(true);
  const [autoApproveDoctors, setAutoApproveDoctors] = useState(false);
  const [autoApproveHospitals, setAutoApproveHospitals] = useState(false);
  const [sosRadiusKm, setSosRadiusKm] = useState('15');
  const [dataRetentionDays, setDataRetentionDays] = useState('90');
  const [helpDeskContact, setHelpDeskContact] = useState('support@mediai.health');

  const loadSettings = useCallback(async () => {
    try {
      const res = await getPlatformSettings();
      const s = res?.data || res || {};
      if (s.activeModel) setActiveModel(s.activeModel);
      if (s.maintenanceMode !== undefined) setMaintenanceMode(s.maintenanceMode);
      if (s.guestSOSEnabled !== undefined) setGuestSOSEnabled(s.guestSOSEnabled);
      if (s.autoAmbulanceDispatch !== undefined) setAutoAmbulanceDispatch(s.autoAmbulanceDispatch);
      if (s.notificationEmail !== undefined) setNotificationEmail(s.notificationEmail);
      if (s.notificationSMS !== undefined) setNotificationSMS(s.notificationSMS);
      if (s.notificationPush !== undefined) setNotificationPush(s.notificationPush);
      if (s.autoApproveDoctors !== undefined) setAutoApproveDoctors(s.autoApproveDoctors);
      if (s.autoApproveHospitals !== undefined) setAutoApproveHospitals(s.autoApproveHospitals);
      if (s.sosRadiusKm !== undefined) setSosRadiusKm(String(s.sosRadiusKm));
      if (s.dataRetentionDays !== undefined) setDataRetentionDays(String(s.dataRetentionDays));
      if (s.helpDeskContact !== undefined) setHelpDeskContact(s.helpDeskContact);
    } catch (_) {
      Alert.alert('Error', 'Could not load global settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        activeModel,
        maintenanceMode,
        guestSOSEnabled,
        autoAmbulanceDispatch,
        notificationEmail,
        notificationSMS,
        notificationPush,
        autoApproveDoctors,
        autoApproveHospitals,
        sosRadiusKm: Number(sosRadiusKm) || 15,
        dataRetentionDays: Number(dataRetentionDays) || 90,
        helpDeskContact,
      };
      await updatePlatformSettings(payload);
      Alert.alert('Settings Saved', 'Global platform parameters successfully saved to cluster.');
    } catch (_) {
      Alert.alert('Error', 'Could not save global settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {loading && <LoadingOverlay message="Fetching global settings..." />}

      {/* AI Model Architecture Selection */}
      <Card style={styles.card} padding={16}>
        <Text style={styles.sectionTitle}>Primary AI Inference Model</Text>
        <View style={styles.modelList}>
          {['Groq (Qwen 27B / Llama 3.3)', 'xAI Grok (Grok-Beta)', 'OpenAI GPT-4o'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modelRow, activeModel === m && styles.modelRowActive]}
              onPress={() => setActiveModel(m)}
            >
              <Ionicons
                name={activeModel === m ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={activeModel === m ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.modelText, activeModel === m && styles.modelTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Global Safety Flags */}
      <Card style={styles.card} padding={16}>
        <Text style={styles.sectionTitle}>Platform Safety & SOS Rules</Text>

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Guest SOS Triggers</Text>
            <Text style={styles.toggleSub}>Allow unauthenticated users to trigger immediate emergency alerts</Text>
          </View>
          <Switch
            value={guestSOSEnabled}
            onValueChange={setGuestSOSEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Auto-Dispatch Ambulance</Text>
            <Text style={styles.toggleSub}>Automatically alert closest facility fleet on High Risk detection</Text>
          </View>
          <Switch
            value={autoAmbulanceDispatch}
            onValueChange={setAutoAmbulanceDispatch}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Maintenance Mode</Text>
            <Text style={styles.toggleSub}>Lock platform for scheduled infrastructure updates</Text>
          </View>
          <Switch
            value={maintenanceMode}
            onValueChange={setMaintenanceMode}
            trackColor={{ false: colors.border, true: colors.danger }}
            thumbColor={colors.white}
          />
        </View>
      </Card>

      {/* Auto-Approval Preferences */}
      <Card style={styles.card} padding={16}>
        <Text style={styles.sectionTitle}>Onboarding Auto-Approvals</Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Auto-Approve Doctors</Text>
            <Text style={styles.toggleSub}>Bypass super-admin verification for newly registered medical practitioners</Text>
          </View>
          <Switch
            value={autoApproveDoctors}
            onValueChange={setAutoApproveDoctors}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Auto-Approve Hospitals</Text>
            <Text style={styles.toggleSub}>Bypass verification for newly registered hospital administrator accounts</Text>
          </View>
          <Switch
            value={autoApproveHospitals}
            onValueChange={setAutoApproveHospitals}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </Card>

      {/* Notification Preferences */}
      <Card style={styles.card} padding={16}>
        <Text style={styles.sectionTitle}>Notification Dispatch Channels</Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Email Alerts</Text>
            <Text style={styles.toggleSub}>Send system transaction emails and audit updates</Text>
          </View>
          <Switch
            value={notificationEmail}
            onValueChange={setNotificationEmail}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>SMS Verification Gateway</Text>
            <Text style={styles.toggleSub}>Send OTP and high-priority SOS notifications via Twilio SMS</Text>
          </View>
          <Switch
            value={notificationSMS}
            onValueChange={setNotificationSMS}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Mobile Push Notifications</Text>
            <Text style={styles.toggleSub}>Dispatch push alerts via Expo Notification Service</Text>
          </View>
          <Switch
            value={notificationPush}
            onValueChange={setNotificationPush}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </Card>

      {/* Platform Tuning Parameters */}
      <Card style={styles.card} padding={16}>
        <Text style={styles.sectionTitle}>System Tuning & Parameters</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Emergency SOS Radius (KM)</Text>
          <TextInput
            style={styles.input}
            value={sosRadiusKm}
            onChangeText={setSosRadiusKm}
            keyboardType="numeric"
            placeholder="15"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Data Retention Limit (Days)</Text>
          <TextInput
            style={styles.input}
            value={dataRetentionDays}
            onChangeText={setDataRetentionDays}
            keyboardType="numeric"
            placeholder="90"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Help Desk Contact Email</Text>
          <TextInput
            style={styles.input}
            value={helpDeskContact}
            onChangeText={setHelpDeskContact}
            keyboardType="email-address"
            placeholder="support@mediai.health"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        <Button title="Save Global Config" onPress={handleSave} loading={saving} style={{ marginTop: 8 }} />
      </Card>

      {/* Sign Out */}
      <Card style={styles.card} padding={16}>
        <TouchableOpacity style={styles.logoutRow} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out of Super Admin</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, gap: 16, paddingBottom: 40 },
  card: { gap: 12 },
  sectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  modelList: { gap: 8 },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  modelRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  modelText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  modelTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleInfo: { flex: 1, paddingRight: 12 },
  toggleTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  toggleSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  field: { gap: 6, marginBottom: 8 },
  label: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  logoutText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.danger,
  },
});

