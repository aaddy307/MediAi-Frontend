import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllTickets, replyToTicket, closeTicket } from '../../api/admin';
import { colors, typography, spacing, radius } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function SupportTicketsScreen() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getAllTickets({ status: 'open' });
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.tickets) ? data.tickets : [];
      setTickets(list);
    } catch (_) {
      setTickets([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleReply = async (ticketId) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await replyToTicket(ticketId, replyText.trim());
      setReplyingTo(null);
      setReplyText('');
      Alert.alert('Replied', 'Your reply has been sent.');
    } catch {
      Alert.alert('Error', 'Could not send reply.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = (id) => {
    Alert.alert('Close Ticket', 'Mark this ticket as resolved?', [
      { text: 'Cancel' },
      {
        text: 'Close',
        onPress: async () => {
          try {
            await closeTicket(id);
            setTickets((prev) => prev.filter((t) => t._id !== id));
          } catch {
            Alert.alert('Error', 'Could not close ticket.');
          }
        },
      },
    ]);
  };

  return (
    <FlatList
      data={tickets}
      keyExtractor={(t) => t._id}
      style={styles.screen}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={!loading && <EmptyState icon="help-circle-outline" title="No open tickets" />}
      renderItem={({ item }) => (
        <Card style={styles.ticketCard} padding={16}>
          <View style={styles.ticketHeader}>
            <View style={styles.ticketMeta}>
              <Text style={styles.ticketSubject}>{item.subject}</Text>
              <Text style={styles.ticketUser}>{item.user?.name} · {new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Badge label={item.priority || 'normal'} variant={item.priority === 'high' ? 'danger' : 'warning'} size="xs" />
          </View>
          <Text style={styles.ticketBody} numberOfLines={3}>{item.message}</Text>
          {replyingTo === item._id ? (
            <View style={styles.replyBox}>
              <Input
                placeholder="Type your reply…"
                value={replyText}
                onChangeText={setReplyText}
                multiline
                numberOfLines={3}
              />
              <View style={styles.replyBtns}>
                <Button title="Cancel" variant="secondary" size="sm" onPress={() => setReplyingTo(null)} style={{ flex: 1 }} />
                <Button title="Send Reply" size="sm" onPress={() => handleReply(item._id)} loading={sending} style={{ flex: 1 }} />
              </View>
            </View>
          ) : (
            <View style={styles.ticketActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setReplyingTo(item._id)}>
                <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                <Text style={styles.actionBtnText}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.closeBtn]} onPress={() => handleClose(item._id)}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                <Text style={[styles.actionBtnText, { color: colors.success }]}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.base, gap: 12, paddingBottom: 40 },
  ticketCard: {},
  ticketHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  ticketMeta: { flex: 1 },
  ticketSubject: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.text },
  ticketUser: { fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  ticketBody: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: 10 },
  replyBox: { gap: 10 },
  replyBtns: { flexDirection: 'row', gap: 10 },
  ticketActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: colors.primary + '55',
  },
  closeBtn: {
    backgroundColor: colors.successLight,
    borderColor: colors.success + '55',
  },
  actionBtnText: { fontSize: typography.fontSizes.xs, color: colors.primary, fontWeight: typography.fontWeights.semibold },
});
