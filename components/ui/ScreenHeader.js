import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../constants/theme';

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  rightIcon,
  onRightAction,
  transparent = false,
  light = false,
  style,
}) {
  const insets = useSafeAreaInsets();
  const iconColor = light ? colors.white : colors.text;

  return (
    <View
      style={[
        styles.header,
        !transparent && styles.solidHeader,
        { paddingTop: insets.top + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) },
        style,
      ]}
    >
      <View style={styles.row}>
        {/* Left: back button or spacer */}
        <View style={styles.side}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={24} color={iconColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center: title */}
        <View style={styles.center}>
          <Text style={[styles.title, light && { color: colors.white }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right: action button or spacer */}
        <View style={[styles.side, styles.sideRight]}>
          {(rightIcon || rightAction) && (
            <TouchableOpacity
              onPress={onRightAction}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {rightIcon ? (
                <Ionicons name={rightIcon} size={22} color={iconColor} />
              ) : (
                <Text style={styles.rightActionText}>{rightAction}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  solidHeader: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    minHeight: 44,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  iconBtn: {
    padding: 4,
  },
  rightActionText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
});
