import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import KeyboardSafeScrollView from '../../components/ui/KeyboardSafeScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function DoctorSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 20);
  const { user, logout } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName || user?.name || '');
  const [specialization, setSpecialization] = useState('Cardiologist');
  const [fee, setFee] = useState('50');
  const [bio, setBio] = useState('Board certified specialist with over 8 years of clinical experience.');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Settings Saved', 'Doctor profile and consultation preferences updated.');
    }, 600);
  };

  return (
    <KeyboardSafeScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: topPadding }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Card style={styles.card} padding={16}>
        <Text style={styles.cardTitle}>Professional Information</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Doctor Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Dr. Full Name"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Medical Specialization</Text>
          <TextInput
            style={styles.input}
            value={specialization}
            onChangeText={setSpecialization}
            placeholder="e.g. Cardiology"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Consultation Fee ($ USD)</Text>
          <TextInput
            style={styles.input}
            value={fee}
            onChangeText={setFee}
            keyboardType="numeric"
            placeholder="50"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Professional Bio & Credentials</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            placeholder="Tell patients about your expertise..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Button title="Save Profile Settings" onPress={handleSave} loading={saving} style={{ marginTop: 10 }} />
      </Card>

      {/* Account actions */}
      <Card style={styles.card} padding={16}>
        <Text style={styles.cardTitle}>Account Security</Text>
        <TouchableOpacity style={styles.actionRow} onPress={() => Alert.alert('Change Password', 'Password change link sent to your registered email.')}>
          <Ionicons name="key-outline" size={20} color={colors.primary} />
          <Text style={styles.actionText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={logout}>
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
  card: { gap: 12 },
  cardTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
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
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
});
