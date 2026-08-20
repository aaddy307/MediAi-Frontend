import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import KeyboardSafeScrollView from '../../components/ui/KeyboardSafeScrollView';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../../store/authStore';
import { colors, typography, spacing, radius } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function AdminSettingsScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const [hospitalName, setHospitalName] = useState('Metro Health Central Hospital');
  const [contact, setContact] = useState('+1 (555) 000-8899');
  const [address, setAddress] = useState('450 Medical Arts Plaza, Metro City');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Settings Updated', 'Hospital profile and facility rules updated.');
    }, 600);
  };

  const navigateTo = (screen) => {
    navigation.navigate(screen);
  };

  return (
    <KeyboardSafeScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Operations & Fleet */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operations & Fleet</Text>
        <View style={styles.navGrid}>
          {[
            { label: 'Ambulance Fleet', icon: 'car-sport', screen: 'AdminAmbulances', color: colors.primary },
            { label: 'Financial Transactions', icon: 'wallet', screen: 'AdminTransactions', color: colors.success },
            { label: 'Medicine Stock Inventory', icon: 'medical', screen: 'MedicineStockMgmt', color: colors.warning },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.navCard}
              onPress={() => navigateTo(item.screen)}
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

      {/* People & Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>People & Support</Text>
        <View style={styles.navGrid}>
          {[
            { label: 'Staff & Patient Users', icon: 'people', screen: 'UserManagement', color: colors.primary },
            { label: 'Support Tickets', icon: 'help-circle', screen: 'SupportTickets', color: colors.warning },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.navCard}
              onPress={() => navigateTo(item.screen)}
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

      {/* Security & Compliance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security & Compliance</Text>
        <View style={styles.navGrid}>
          {[
            { label: 'Security Audit Logs', icon: 'shield-checkmark', screen: 'AuditLog', color: colors.info },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.navCard}
              onPress={() => navigateTo(item.screen)}
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

      {/* Hospital Facility Profile */}
      <Card style={styles.card} padding={16}>
        <Text style={styles.cardTitle}>Hospital Facility Profile</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Facility Name</Text>
          <TextInput
            style={styles.input}
            value={hospitalName}
            onChangeText={setHospitalName}
            placeholder="Hospital Name"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Emergency Dispatch Line</Text>
          <TextInput
            style={styles.input}
            value={contact}
            onChangeText={setContact}
            placeholder="Phone Number"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Physical Address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Hospital Address"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Button title="Save Facility Profile" onPress={handleSave} loading={saving} style={{ marginTop: 8 }} />
      </Card>

      {/* Account Security */}
      <Card style={styles.card} padding={16}>
        <Text style={styles.cardTitle}>Account Security</Text>
        <TouchableOpacity style={styles.actionRow} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>
    </KeyboardSafeScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, gap: 16, paddingBottom: 40 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  navGrid: { gap: 10 },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  card: { gap: 12 },
  cardTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  field: { gap: 6 },
  label: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: typography.fontSizes.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
});
