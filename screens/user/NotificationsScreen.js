import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../../constants/theme';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Appointment Confirmed',
      message: 'Your appointment with Dr. John Smith is confirmed for tomorrow at 10:00 AM.',
      type: 'appointment',
      time: '20 mins ago',
      read: false,
    },
    {
      id: '2',
      title: 'Medicine Reminder',
      message: 'Time to take Amoxicillin (500mg) after meals.',
      type: 'medicine',
      time: '2 hours ago',
      read: false,
    },
    {
      id: '3',
      title: 'New Medical Report Available',
      message: 'Your diagnostic health summary has been reviewed and verified by your doctor.',
      type: 'report',
      time: '1 day ago',
      read: true,
    },
  ]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'appointment':
        return { name: 'calendar', color: colors.primary, bg: colors.primaryGlow };
      case 'medicine':
        return { name: 'medical', color: colors.success, bg: colors.successLight };
      case 'report':
        return { name: 'document-text', color: colors.accent, bg: colors.accentLight };
      default:
        return { name: 'notifications', color: colors.info, bg: colors.infoLight };
    }
  };

  const renderItem = ({ item }) => {
    const iconConfig = getIcon(item.type);

    return (
      <Card style={[styles.card, !item.read && styles.unreadCard]} padding={14}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: iconConfig.bg }]}>
            <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
          </View>
          <View style={styles.content}>
            <View style={styles.topLine}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
            <Text style={styles.itemMessage} numberOfLines={2}>{item.message}</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markReadText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="notifications-outline" title="No Notifications" message="You have no unread notifications." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  markReadText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  list: {
    padding: spacing.base,
    gap: 10,
  },
  card: {
    backgroundColor: colors.surface,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  timeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  itemMessage: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
