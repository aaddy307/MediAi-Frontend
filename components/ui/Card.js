import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadows, gradients } from '../../constants/theme';

export default function Card({
  children,
  style,
  gradient = false,
  glowColor,
  padding = 16,
  borderRadius = radius.lg,
  variant = 'default', // 'default' | 'elevated' | 'outlined'
}) {
  const containerStyle = [
    styles.base,
    { borderRadius, padding },
    variant === 'outlined' && styles.outlined,
    variant === 'elevated' && shadows.md,
    glowColor && { borderColor: glowColor, borderWidth: 1 },
    style,
  ];

  if (gradient) {
    return (
      <LinearGradient
        colors={gradients.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={containerStyle}
      >
        {children}
      </LinearGradient>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlined: {
    backgroundColor: colors.transparent,
    borderColor: colors.borderLight,
    borderWidth: 1.5,
  },
});
