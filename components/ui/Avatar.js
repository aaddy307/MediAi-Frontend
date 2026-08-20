import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../../constants/theme';

function getInitials(name = '') {
  if (!name || typeof name !== 'string' || !name.trim()) return '';
  const words = name.trim().split(' ').filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function resolveAvatarUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') return null;
  const trimmed = rawUri.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const host =
    Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : '192.168.41.130';
  const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  if (cleanPath.startsWith('uploads/')) {
    return `http://${host}:5000/${cleanPath}`;
  }
  return `http://${host}:5000/uploads/${cleanPath}`;
}

const SIZES = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 60,
  xl: 80,
  '2xl': 100,
};

export default function Avatar({
  name,
  uri,
  size = 'md',
  style,
  online,
  borderColor,
}) {
  const [imageError, setImageError] = useState(false);
  const resolvedUri = resolveAvatarUri(uri);

  useEffect(() => {
    setImageError(false);
  }, [uri]);

  const dimension = SIZES[size] || size;
  const fontSize = dimension * 0.38;
  const borderRadius = dimension / 2;

  const containerStyle = [
    styles.container,
    {
      width: dimension,
      height: dimension,
      borderRadius,
      borderWidth: borderColor ? 2 : 0,
      borderColor: borderColor || colors.transparent,
    },
    style,
  ];

  const initials = getInitials(name);
  const showImage = Boolean(resolvedUri && !imageError);

  return (
    <View style={styles.wrapper}>
      {showImage ? (
        <Image
          source={{ uri: resolvedUri }}
          style={[containerStyle, { overflow: 'hidden' }]}
          onError={() => setImageError(true)}
        />
      ) : (
        <LinearGradient
          colors={['#0D9488', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={containerStyle}
        >
          {initials ? (
            <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
          ) : (
            <Ionicons name="person" size={dimension * 0.5} color={colors.white} />
          )}
        </LinearGradient>
      )}
      {online !== undefined && (
        <View
          style={[
            styles.onlineIndicator,
            { backgroundColor: online ? colors.success : colors.textMuted },
            {
              width: dimension * 0.25,
              height: dimension * 0.25,
              borderRadius: dimension * 0.125,
              bottom: 1,
              right: 1,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
    letterSpacing: 0.5,
  },
  onlineIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
