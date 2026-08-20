import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getChats } from '../../api/chats';
import { getAppointments } from '../../api/appointments';
import useSocket from '../../hooks/useSocket';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const CONSULT_OPTIONS = [
  {
    id: 'chat',
    title: 'Chat Consultation',
    desc: 'Encrypted text messaging, image sharing & digital prescription',
    fee: '₹299',
    icon: 'chatbubbles',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  {
    id: 'voice',
    title: 'Voice Call',
    desc: 'Crystal-clear HD audio call consultation with doctor',
    fee: '₹499',
    icon: 'call',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  {
    id: 'video',
    title: 'Video Call',
    desc: 'Face-to-face HD video & audio consultation with doctor',
    fee: '₹799',
    icon: 'videocam',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
];

export default function ChatListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selectedFormat, setSelectedFormat] = useState('chat'); // 'chat' | 'voice' | 'video'
  const [chats, setChats] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [chatData, apptData] = await Promise.allSettled([
        getChats(),
        getAppointments({ upcoming: 1 }),
      ]);

      if (chatData.status === 'fulfilled') {
        const raw = chatData.value;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.chats) ? raw.chats : [];
        setChats(list);
      }

      if (apptData.status === 'fulfilled') {
        const raw = apptData.value;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.appointments) ? raw.appointments : [];
        setAppointments(list);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time socket message update
  useSocket({
    newMessage: (msg) => {
      setChats((prev) =>
        prev.map((c) =>
          c._id === msg.chatId
            ? { ...c, lastMessage: msg, unreadCount: (c.unreadCount || 0) + 1 }
            : c
        )
      );
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStartConsultation = (typeId) => {
    setSelectedFormat(typeId);
    if (typeId === 'chat') {
      if (chats.length > 0) {
        navigation.navigate('ChatRoom', { chat: chats[0] });
      } else {
        navigation.navigate('Doctors');
      }
    } else if (typeId === 'voice') {
      Alert.alert(
        'Start Voice Consultation 📞',
        'Connecting secure encrypted voice channel with doctor...',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Connect Call',
            onPress: () => {
              if (chats.length > 0) {
                navigation.navigate('ChatRoom', { chat: chats[0], initialCall: 'voice' });
              } else {
                navigation.navigate('Doctors');
              }
            },
          },
        ]
      );
    } else if (typeId === 'video') {
      Alert.alert(
        'Start Video Consultation 📹',
        'Entering high-definition face-to-face video consultation room...',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enter Video Room',
            onPress: () => {
              if (chats.length > 0) {
                navigation.navigate('ChatRoom', { chat: chats[0], initialCall: 'video' });
              } else {
                navigation.navigate('Doctors');
              }
            },
          },
        ]
      );
    }
  };

  const activeOption = CONSULT_OPTIONS.find((o) => o.id === selectedFormat) || CONSULT_OPTIONS[0];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 20), paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Consultations</Text>
            <Text style={styles.headerSub}>Select your preferred consultation format</Text>
          </View>
          <View style={styles.secureBadge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
            <Text style={styles.secureBadgeText}>Encrypted & HIPAA Compliant</Text>
          </View>
        </View>

        {/* 3 Dedicated Consultation Format Cards */}
        <View style={styles.consultOptionsGrid}>
          {CONSULT_OPTIONS.map((opt) => {
            const isSelected = selectedFormat === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.consultCard,
                  isSelected && { borderColor: opt.color, backgroundColor: opt.bg },
                ]}
                onPress={() => handleStartConsultation(opt.id)}
                activeOpacity={0.85}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.iconBox, { backgroundColor: opt.color + '18' }]}>
                    <Ionicons name={opt.icon} size={22} color={opt.color} />
                  </View>
                  <View style={styles.topRightRow}>
                    <View style={[styles.feeTag, { backgroundColor: opt.color + '20', borderColor: opt.color + '40' }]}>
                      <Text style={[styles.feeTagText, { color: opt.color }]}>{opt.fee}</Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={isSelected ? opt.color : colors.border}
                    />
                  </View>
                </View>
                <Text style={[styles.cardTitle, isSelected && { color: opt.color, fontWeight: 'bold' }]}>
                  {opt.title}
                </Text>
                <Text style={styles.cardDesc}>{opt.desc}</Text>

                <View style={[styles.startPill, { backgroundColor: opt.color + '15' }]}>
                  <Text style={[styles.startPillText, { color: opt.color }]}>
                    {opt.id === 'chat' ? `Open Chat (${opt.fee})` : opt.id === 'voice' ? `Start Voice Call (${opt.fee})` : `Start Video Call (${opt.fee})`}
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={opt.color} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Active Doctors & Recent Sessions Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>
            {selectedFormat === 'chat'
              ? 'Active Chat Consultations'
              : selectedFormat === 'voice'
              ? 'Voice Consultation Channel'
              : 'Video Consultation Room'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Doctors')}>
            <Text style={styles.viewAllText}>+ New Consultation</Text>
          </TouchableOpacity>
        </View>

        {chats.length > 0 ? (
          <View style={styles.chatList}>
            {chats.map((chatItem) => {
              const other = chatItem.doctor || chatItem.patient || {};
              const otherName = other.fullName || other.name || 'Doctor Specialist';
              const lastMsg =
                chatItem.lastMessage?.content ||
                (chatItem.messages && chatItem.messages[chatItem.messages.length - 1]?.content) ||
                'Tap to enter consultation';
              const time = chatItem.lastMessage?.createdAt
                ? new Date(chatItem.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <Card key={chatItem._id} style={styles.sessionCard} padding={14}>
                  <TouchableOpacity
                    style={styles.sessionRow}
                    onPress={() => navigation.navigate('ChatRoom', { chat: chatItem })}
                    activeOpacity={0.8}
                  >
                    <Avatar name={otherName} uri={other.avatar} size="md" />
                    <View style={styles.sessionInfoCol}>
                      <View style={styles.sessionHeaderRow}>
                        <Text style={styles.sessionDocName}>Dr. {otherName}</Text>
                        <Text style={styles.sessionTime}>{time}</Text>
                      </View>
                      <Text style={styles.sessionMsg} numberOfLines={1}>
                        {lastMsg}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* 3 Quick Direct Action Buttons per Doctor */}
                  <View style={styles.directActionsRow}>
                    <TouchableOpacity
                      style={[styles.directBtn, selectedFormat === 'chat' && styles.directBtnActive]}
                      onPress={() => navigation.navigate('ChatRoom', { chat: chatItem })}
                    >
                      <Ionicons name="chatbubbles" size={14} color={selectedFormat === 'chat' ? colors.white : '#059669'} />
                      <Text style={[styles.directBtnText, selectedFormat === 'chat' && styles.directBtnTextActive]}>
                        Chat
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.directBtn, selectedFormat === 'voice' && styles.directBtnVoiceActive]}
                      onPress={() => handleStartConsultation('voice')}
                    >
                      <Ionicons name="call" size={14} color={selectedFormat === 'voice' ? colors.white : '#2563EB'} />
                      <Text style={[styles.directBtnText, selectedFormat === 'voice' && styles.directBtnTextActive]}>
                        Voice Call
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.directBtn, selectedFormat === 'video' && styles.directBtnVideoActive]}
                      onPress={() => handleStartConsultation('video')}
                    >
                      <Ionicons name="videocam" size={14} color={selectedFormat === 'video' ? colors.white : '#7C3AED'} />
                      <Text style={[styles.directBtnText, selectedFormat === 'video' && styles.directBtnTextActive]}>
                        Video Call
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </View>
        ) : (
          <Card style={styles.emptyCard} padding={20}>
            <View style={[styles.emptyIconCircle, { backgroundColor: activeOption.color + '15' }]}>
              <Ionicons name={activeOption.icon} size={32} color={activeOption.color} />
            </View>
            <Text style={styles.emptyTitle}>Ready for {activeOption.title}</Text>
            <Text style={styles.emptySub}>
              Connect with verified doctors for {activeOption.title.toLowerCase()}, medical advice, and instant digital prescriptions.
            </Text>
            <TouchableOpacity
              style={[styles.bookDoctorBtn, { backgroundColor: activeOption.color }]}
              onPress={() => navigation.navigate('Doctors')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={18} color={colors.white} />
              <Text style={styles.bookDoctorBtnText}>Find Doctor & Start {activeOption.title}</Text>
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.base, gap: spacing.md },
  header: {
    gap: 8,
    marginBottom: 4,
  },
  headerTitleCol: {},
  headerTitle: {
    fontSize: typography.fontSizes['2xl'],
    fontWeight: typography.fontWeights.extrabold,
    color: colors.text,
  },
  headerSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryGlow,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  secureBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },

  /* 3 Consultation Options */
  consultOptionsGrid: {
    gap: 10,
  },
  consultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
    ...shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  feeTagText: {
    fontSize: 10.5,
    fontWeight: typography.fontWeights.extrabold,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  cardDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
  startPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: 4,
  },
  startPillText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionHeading: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewAllText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },

  /* Chat List */
  chatList: {
    gap: 10,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    gap: 10,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionInfoCol: { flex: 1 },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDocName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sessionTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  sessionMsg: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  directActionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
  },
  directBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  directBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  directBtnVoiceActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  directBtnVideoActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  directBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  directBtnTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    alignItems: 'center',
    gap: 10,
    textAlign: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  emptySub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  bookDoctorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.xl,
    marginTop: 6,
    width: '100%',
  },
  bookDoctorBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
});
