import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { login as loginApi } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import { colors, typography, spacing, radius, gradients, shadows } from '../../constants/theme';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const storeLogin = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await loginApi(email.trim(), password);
      const userObj = data.user || {
        _id: data._id,
        fullName: data.fullName,
        name: data.fullName || data.name || email.split('@')[0],
        email: data.email,
        role: data.role,
      };
      await storeLogin(data.token, userObj);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Please check your credentials and try again.';
      if (msg.includes('Not approved YET')) {
        Alert.alert(
          'Approval Status',
          'Not approved YET\n\nYour account has been submitted and is awaiting administrator / hospital approval before you can access the panel.'
        );
      } else {
        Alert.alert('Login failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      Alert.alert('Biometric unavailable', 'Your device does not support biometric login or no biometrics are enrolled.');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to MediAI',
      fallbackLabel: 'Use password',
    });
    if (result.success) {
      // Biometric success — re-use stored credentials (token already in SecureStore via loadToken)
      Alert.alert('Biometric Login', 'Use this after a successful password login to auto-login with biometrics.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={gradients.hero} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Brand */}
          <View style={styles.brandSection}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>MediAI</Text>
            <Text style={styles.tagline}>Healthcare Assistance When You Need It Most</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in to your account</Text>

            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />}
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotWrapper}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={{ marginTop: 8 }}
            />

            {/* Biometric */}
            <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric}>
              <Ionicons name="finger-print" size={22} color={colors.primary} />
              <Text style={styles.biometricText}>Use Biometric Login</Text>
            </TouchableOpacity>
          </View>

          {/* Footer links */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerText}>
                Don't have an account?{' '}
                <Text style={styles.footerLink}>Register</Text>
              </Text>
            </TouchableOpacity>

            {/* Emergency SOS Button (No Login Required) */}
            <TouchableOpacity
              onPress={() => navigation.navigate('GuestEmergencySOS')}
              style={styles.sosButton}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.sosButtonGrad}>
                <Ionicons name="warning" size={18} color={colors.white} />
                <Text style={styles.sosText}>EMERGENCY SOS (No Login Required)</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('EmergencyScan')}
              style={styles.scanLink}
            >
              <Ionicons name="camera-outline" size={14} color={colors.textMuted} />
              <Text style={styles.scanLinkText}>Face Recognition Emergency Scan</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing['2xl'],
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoImage: {
    width: 90,
    height: 90,
    marginBottom: 8,
  },
  brandName: {
    fontSize: typography.fontSizes['3xl'],
    fontWeight: typography.fontWeights.extrabold,
    color: colors.primaryDark,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  cardTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  forgotWrapper: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  forgotText: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryGlow,
  },
  biometricText: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.base,
  },
  footerText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  sosButton: {
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.danger,
    marginTop: 4,
  },
  sosButtonGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  sosText: {
    color: colors.white,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.extrabold,
    letterSpacing: 0.5,
  },
  scanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  scanLinkText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
