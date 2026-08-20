import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Platform,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getChatMessages, markChatRead, uploadChatAttachment, sendMessage as sendRestMsg } from '../../api/chats';
import useAuthStore from '../../store/authStore';
import useSocket from '../../hooks/useSocket';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Avatar from '../../components/ui/Avatar';

function MessageBubble({ msg, isMine }) {
  const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const isSystem = msg.isSystem || msg.type === 'system';

  if (isSystem) {
    return (
      <View style={styles.systemBubble}>
        <Ionicons
          name={msg.content?.includes('Video') ? 'videocam' : msg.content?.includes('Voice') ? 'call' : 'information-circle'}
          size={14}
          color={colors.primary}
        />
        <Text style={styles.systemMsgText}>{msg.content}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
      {msg.attachmentUrl ? (
        <Image source={{ uri: msg.attachmentUrl }} style={styles.attachedImg} resizeMode="cover" />
      ) : null}
      {msg.content ? (
        <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{msg.content}</Text>
      ) : null}
      <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>{time}</Text>
    </View>
  );
}

export default function ChatScreen({ route, navigation }) {
  const chatParam = route.params?.chat || {};
  const initialCall = route.params?.initialCall || null;
  const { user } = useAuthStore();

  const [chat, setChat] = useState(chatParam);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const listRef = useRef(null);
  const typingTimer = useRef(null);

  // Active Call State (Voice / Video consultation room)
  const [activeCall, setActiveCall] = useState(initialCall); // 'voice' | 'video' | null
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [cameraFacing, setCameraFacing] = useState('front'); // 'front' | 'back'
  const callTimerRef = useRef(null);

  const other = chat.participants?.find((p) => (p._id || p) !== user?._id) || chat.doctor || chat.patient || {};
  const otherName = other.fullName || other.name || (user?.role === 'doctor' ? 'Patient' : 'Doctor');

  // Handle Call Timer
  useEffect(() => {
    if (activeCall) {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [activeCall]);

  const formatCallTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const load = useCallback(async () => {
    try {
      if (!chat?._id) return;
      const data = await getChatMessages(chat._id);
      const raw = data?.data?.messages || data?.messages || data?.data || data;
      const msgs = Array.isArray(raw) ? raw : [];
      setMessages([...msgs].reverse());
      await markChatRead(chat._id);
    } catch {
      setMessages([]);
    }
  }, [chat?._id]);

  useEffect(() => {
    load();
  }, [load]);

  const { emit } = useSocket({
    receiveMessage: (msg) => {
      if (msg.chatId === chat._id || msg.chat === chat._id) {
        setMessages((prev) => [msg, ...prev]);
        setOtherTyping(false);
      }
    },
    typing: ({ chatId, userId }) => {
      if (chatId === chat._id && userId !== user?._id) setOtherTyping(true);
    },
    stopTyping: ({ chatId }) => {
      if (chatId === chat._id) setOtherTyping(false);
    },
    callEnded: () => {
      handleEndCall(false);
    },
  });

  useEffect(() => {
    if (chat?._id) {
      emit('joinChat', { chatId: chat._id });
      return () => emit('leaveChat', { chatId: chat._id });
    }
  }, [chat?._id, emit]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !chat?._id) return;
    const msg = {
      _id: Date.now().toString(),
      chatId: chat._id,
      sender: user?._id,
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    emit('sendMessage', { chatId: chat._id, content: trimmed });
    setMessages((prev) => [msg, ...prev]);
    setText('');
    emit('stopTyping', { chatId: chat._id });

    try {
      await sendRestMsg(chat._id, trimmed);
    } catch (_) {}
  };

  const handleTyping = (val) => {
    setText(val);
    if (chat?._id) {
      emit('typing', { chatId: chat._id, userId: user?._id });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        emit('stopTyping', { chatId: chat._id });
      }, 1500);
    }
  };

  const handleAttachment = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('file', { uri: asset.uri, name: 'attachment.jpg', type: 'image/jpeg' });
    try {
      const data = await uploadChatAttachment(formData);
      if (chat?._id) {
        emit('sendMessage', { chatId: chat._id, attachmentUrl: data.url });
        const msg = {
          _id: Date.now().toString(),
          chatId: chat._id,
          sender: user?._id,
          attachmentUrl: data.url,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [msg, ...prev]);
      }
    } catch {
      Alert.alert('Error', 'Could not upload attachment.');
    }
  };

  const handleStartCall = (type) => {
    setActiveCall(type);
    setIsMuted(false);
    setIsVideoEnabled(true);
    setIsSpeaker(true);
    if (chat?._id) {
      emit('callUser', {
        chatId: chat._id,
        from: user?._id,
        name: user?.fullName || 'User',
        isVideo: type === 'video',
        callerModel: user?.role === 'doctor' ? 'Doctor' : 'User',
        roomToCall: `chat_${chat._id}`,
      });
    }
  };

  const handleEndCall = async (shouldEmit = true) => {
    const durationStr = formatCallTime(callDuration);
    const callTypeStr = activeCall === 'video' ? '📹 Video Consultation' : '📞 Voice Consultation';
    const summaryMsg = `${callTypeStr} ended • Duration: ${durationStr}`;

    if (shouldEmit && chat?._id) {
      emit('endCall', { to: `chat_${chat._id}` });
      try {
        await sendRestMsg(chat._id, summaryMsg);
      } catch (_) {}
    }

    const sysMsg = {
      _id: Date.now().toString(),
      chatId: chat?._id,
      content: summaryMsg,
      isSystem: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [sysMsg, ...prev]);
    setActiveCall(null);
  };

  return (
    <View style={[styles.screen, { paddingBottom: keyboardHeight }]}>
      {/* Consultation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Avatar name={otherName} uri={other.avatar} size="sm" online={true} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {user?.role === 'doctor' ? otherName : `Dr. ${otherName}`}
          </Text>
          {otherTyping ? (
            <Text style={styles.typingText}>typing…</Text>
          ) : (
            <Text style={styles.headerStatus}>
              {user?.role === 'doctor' ? 'Verified Patient' : other.specialization || 'Online Consultation'}
            </Text>
          )}
        </View>

        {/* Call Action Buttons */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => handleStartCall('voice')}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: '#EDE9FE' }]}
            onPress={() => handleStartCall('video')}
            activeOpacity={0.7}
          >
            <Ionicons name="videocam" size={18} color="#7C3AED" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Feed */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m._id || String(Math.random())}
        renderItem={({ item }) => (
          <MessageBubble msg={item} isMine={item.sender === user?._id || item.senderId === user?._id} />
        )}
        inverted
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      {/* Input Area */}
      <View style={styles.inputArea}>
        <TouchableOpacity style={styles.attachBtn} onPress={handleAttachment} activeOpacity={0.7}>
          <Ionicons name="attach" size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message or clinical note…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={handleTyping}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
          activeOpacity={0.8}
        >
          <LinearGradient colors={gradients.primary} style={styles.sendGrad}>
            <Ionicons name="send" size={17} color={colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ========================================================================= */}
      {/* ACTIVE CALL CONSULTATION OVERLAY (Voice / Video)                         */}
      {/* ========================================================================= */}
      <Modal
        visible={!!activeCall}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => handleEndCall(true)}
      >
        <View style={styles.callScreen}>
          {activeCall === 'video' ? (
            // VIDEO CONSULTATION VIEW
            <View style={styles.videoRoom}>
              {/* Remote Stream Mock / Avatar Stream */}
              <View style={styles.remoteVideoContainer}>
                {isVideoEnabled ? (
                  <View style={styles.activeVideoPlaceholder}>
                    <Avatar name={otherName} uri={other.avatar} size="xl" />
                    <Text style={styles.videoStreamName}>
                      {user?.role === 'doctor' ? otherName : `Dr. ${otherName}`} (Live HD Stream)
                    </Text>
                    <View style={styles.encryptedBadge}>
                      <Ionicons name="lock-closed" size={11} color={colors.success} />
                      <Text style={styles.encryptedText}>End-to-End Encrypted HD Video</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.videoOffPlaceholder}>
                    <Ionicons name="videocam-off" size={48} color={colors.textMuted} />
                    <Text style={styles.videoOffText}>Camera Paused</Text>
                  </View>
                )}
              </View>

              {/* Local Video Pip Preview */}
              <View style={styles.pipContainer}>
                <View style={styles.pipVideoBox}>
                  <Ionicons name="person" size={28} color={colors.white} />
                  <Text style={styles.pipLabel}>You ({cameraFacing})</Text>
                </View>
              </View>

              {/* Top Banner */}
              <View style={styles.callTopBar}>
                <View style={styles.callTimerBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.callTimerText}>{formatCallTime(callDuration)}</Text>
                </View>
                <TouchableOpacity style={styles.minimizeBtn} onPress={() => setActiveCall(null)}>
                  <Ionicons name="chevron-down" size={22} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // VOICE CONSULTATION VIEW
            <View style={styles.voiceRoom}>
              <View style={styles.callTopBar}>
                <View style={styles.callTimerBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.callTimerText}>{formatCallTime(callDuration)}</Text>
                </View>
              </View>

              <View style={styles.voiceCenter}>
                <View style={styles.voicePulseRing}>
                  <Avatar name={otherName} uri={other.avatar} size="xl" />
                </View>
                <Text style={styles.voiceCallerName}>
                  {user?.role === 'doctor' ? otherName : `Dr. ${otherName}`}
                </Text>
                <Text style={styles.voiceStatusText}>Encrypted HD Voice Consultation</Text>
                <View style={styles.waveformContainer}>
                  {[18, 32, 45, 28, 48, 22, 38, 14, 40, 26].map((h, i) => (
                    <View key={i} style={[styles.waveBar, { height: h }]} />
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Call Controls Toolbar */}
          <View style={styles.callControlsRow}>
            {/* Mute Mic Toggle */}
            <TouchableOpacity
              style={[styles.callControlBtn, isMuted && styles.callControlBtnActive]}
              onPress={() => setIsMuted(!isMuted)}
              activeOpacity={0.8}
            >
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color={colors.white} />
              <Text style={styles.controlBtnLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            {/* Video Camera Toggle (Video Call Only) */}
            {activeCall === 'video' && (
              <TouchableOpacity
                style={[styles.callControlBtn, !isVideoEnabled && styles.callControlBtnActive]}
                onPress={() => setIsVideoEnabled(!isVideoEnabled)}
                activeOpacity={0.8}
              >
                <Ionicons name={isVideoEnabled ? 'videocam' : 'videocam-off'} size={24} color={colors.white} />
                <Text style={styles.controlBtnLabel}>{isVideoEnabled ? 'Cam Off' : 'Cam On'}</Text>
              </TouchableOpacity>
            )}

            {/* Flip Camera (Video Call Only) */}
            {activeCall === 'video' && (
              <TouchableOpacity
                style={styles.callControlBtn}
                onPress={() => setCameraFacing(cameraFacing === 'front' ? 'back' : 'front')}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-reverse" size={24} color={colors.white} />
                <Text style={styles.controlBtnLabel}>Flip</Text>
              </TouchableOpacity>
            )}

            {/* Speaker Toggle (Voice Call Only) */}
            {activeCall === 'voice' && (
              <TouchableOpacity
                style={[styles.callControlBtn, isSpeaker && { backgroundColor: colors.primary }]}
                onPress={() => setIsSpeaker(!isSpeaker)}
                activeOpacity={0.8}
              >
                <Ionicons name={isSpeaker ? 'volume-high' : 'volume-mute'} size={24} color={colors.white} />
                <Text style={styles.controlBtnLabel}>Speaker</Text>
              </TouchableOpacity>
            )}

            {/* End Call Button */}
            <TouchableOpacity
              style={styles.endCallBtn}
              onPress={() => handleEndCall(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={28} color={colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
              <Text style={styles.endCallLabel}>End Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    padding: 4,
    marginRight: -4,
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  headerStatus: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  typingText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: spacing.md,
    gap: 8,
    paddingBottom: 12,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.xl,
    padding: 12,
    gap: 4,
    marginVertical: 2,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
    ...shadows.primary,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  msgText: {
    fontSize: typography.fontSizes.base,
    color: colors.text,
    lineHeight: 22,
  },
  msgTextMine: { color: colors.white },
  msgTime: {
    fontSize: 10,
    color: colors.textMuted,
    alignSelf: 'flex-end',
  },
  msgTimeMine: { color: 'rgba(255,255,255,0.7)' },
  attachedImg: {
    width: 200,
    height: 150,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  systemBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    gap: 6,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  systemMsgText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  inputArea: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'flex-end',
  },
  attachBtn: {
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: typography.fontSizes.base,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 100,
  },
  sendBtn: { borderRadius: 20 },
  sendBtnDisabled: { opacity: 0.4 },
  sendGrad: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CALL OVERLAY STYLES
  callScreen: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
  },
  videoRoom: {
    flex: 1,
    position: 'relative',
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeVideoPlaceholder: {
    alignItems: 'center',
    gap: 14,
  },
  videoStreamName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
  },
  encryptedText: {
    fontSize: 11,
    color: colors.success,
  },
  videoOffPlaceholder: {
    alignItems: 'center',
    gap: 10,
  },
  videoOffText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.base,
  },
  pipContainer: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 100,
    height: 140,
    borderRadius: radius.lg,
    backgroundColor: '#334155',
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  pipVideoBox: {
    alignItems: 'center',
    gap: 4,
  },
  pipLabel: {
    fontSize: 10,
    color: colors.white,
    fontWeight: typography.fontWeights.medium,
  },
  callTopBar: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  callTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  callTimerText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  minimizeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceRoom: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceCenter: {
    alignItems: 'center',
    gap: 16,
  },
  voicePulseRing: {
    padding: 12,
    borderRadius: 80,
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  voiceCallerName: {
    fontSize: 22,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  voiceStatusText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    height: 50,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  callControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#090D16',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  callControlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E293B',
    gap: 2,
  },
  callControlBtnActive: {
    backgroundColor: colors.danger,
  },
  controlBtnLabel: {
    fontSize: 9,
    color: colors.white,
    fontWeight: typography.fontWeights.semibold,
  },
  endCallBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.danger,
    gap: 2,
    ...shadows.lg,
  },
  endCallLabel: {
    fontSize: 9,
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
});
