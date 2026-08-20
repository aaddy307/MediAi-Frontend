import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { colors, typography, spacing, radius, gradients, shadows } from '../../constants/theme';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Missing info', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await client.post('/api/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={gradients.hero} style={styles.flex}>
        <View style={styles.container}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backBtn, { top: Math.max(insets.top, 20) + 8 }]}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>

          {sent ? (
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Ionicons name="mail-open" size={40} color={colors.success} />
              </View>
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successMsg}>
                We've sent a password reset link to{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>
              <Button
                title="Back to Login"
                variant="ghost"
                onPress={() => navigation.navigate('Login')}
                style={{ marginTop: 24 }}
              />
            </View>
          ) : (
            <View style={styles.card}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a link to reset your password.
              </Text>

              <Input
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />}
              />

              <Button
                title="Send Reset Link"
                onPress={handleSubmit}
                loading={loading}
                style={{ marginTop: 8 }}
              />

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.backToLogin}
              >
                <Ionicons name="arrow-back" size={14} color={colors.textMuted} />
                <Text style={styles.backToLoginText}> Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing['2xl'],
  },
  backBtn: {
    position: 'absolute',
    top: spacing['2xl'] + 16,
    left: spacing.base,
    zIndex: 10,
    padding: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    ...shadows.md,
  },
  logoImage: {
    width: 70,
    height: 70,
    marginBottom: spacing.base,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.base,
  },
  backToLoginText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },
  successCard: {
    backgroundColor: colors.card,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.successLight,
    alignItems: 'center',
    ...shadows.md,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  successTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  successMsg: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailHighlight: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
});
