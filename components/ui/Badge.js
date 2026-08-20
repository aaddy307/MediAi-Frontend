import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typography } from '../../constants/theme';

const VARIANTS = {
  primary: { bg: colors.primaryGlow, text: colors.primary },
  success: { bg: colors.successLight, text: colors.success },
  danger: { bg: colors.dangerLight, text: colors.danger },
  warning: { bg: colors.warningLight, text: colors.warning },
  info: { bg: colors.infoLight, text: colors.info },
  muted: { bg: colors.surfaceHigh, text: colors.textSecondary },
};

export default function Badge({
  label,
  variant = 'primary',
  size = 'sm', // 'xs' | 'sm' | 'md'
  dot = false,
  style,
}) {
  const { bg, text } = VARIANTS[variant] || VARIANTS.muted;
  const fontSize = size === 'xs' ? 10 : size === 'sm' ? 11 : 13;
  const py = size === 'xs' ? 2 : size === 'sm' ? 3 : 5;
  const px = size === 'xs' ? 6 : size === 'sm' ? 8 : 12;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, paddingVertical: py, paddingHorizontal: px },
        style,
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: text }]} />}
      <Text style={[styles.label, { color: text, fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  label: {
    fontWeight: typography.fontWeights.semibold,
    letterSpacing: 0.2,
  },
});
