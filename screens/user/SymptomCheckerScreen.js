import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkSymptoms } from '../../api/ai';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import storage from '../../utils/storage';

const STORAGE_KEY = 'mediai_symptom_history';

const SEVERITY_COLORS = {
  low: 'success',
  moderate: 'warning',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const QUICK_SYMPTOMS = [
  'Headache', 'Fever', 'Cough', 'Fatigue', 'Chest pain',
  'Shortness of breath', 'Nausea', 'Dizziness', 'Skin rash / burn',
];

function AIMessage({ message, navigation }) {
  const payload = message?.data || message;
  const followUp = payload?.followUpQuestion;
  const isQuestionOnly = Boolean(followUp && !payload?.possibleCondition && !payload?.riskLevel);

  if (isQuestionOnly) {
    return (
      <View style={styles.aiQuestionBubble}>
        <View style={styles.aiQuestionHeader}>
          <LinearGradient colors={gradients.primary} style={styles.aiSmallAvatar}>
            <Ionicons name="medical" size={12} color={colors.white} />
          </LinearGradient>
          <Text style={styles.aiQuestionName}>MediAI Assistant</Text>
        </View>
        <Text style={styles.aiQuestionText}>{followUp}</Text>
      </View>
    );
  }

  const summary = payload?.possibleCondition || payload?.summary || payload?.preventionAdvice || followUp || '';
  const severity = (payload?.riskLevel || payload?.severity || 'low').toLowerCase();
  const isHighRisk = severity === 'high' || severity === 'critical';
  
  let recommendations = [];
  if (Array.isArray(payload?.recommendations)) {
    recommendations = payload.recommendations;
  } else if (payload?.preventionAdvice) {
    recommendations = [payload.preventionAdvice];
  }

  let specialists = [];
  if (Array.isArray(payload?.specialists)) {
    specialists = payload.specialists;
  } else if (payload?.recommendedSpecialization) {
    specialists = [payload.recommendedSpecialization];
  }

  const recommendedDoctors = Array.isArray(payload?.recommendedDoctors) ? payload.recommendedDoctors : [];

  const handleBookDoctor = (doc) => {
    if (navigation) {
      navigation.navigate('BookAppointment', { doctor: doc });
    }
  };

  const handleUrgentConnect = () => {
    if (navigation) {
      if (recommendedDoctors.length > 0) {
        navigation.navigate('BookAppointment', { doctor: recommendedDoctors[0], isUrgent: true });
      } else {
        navigation.navigate('Doctors', { urgent: true });
      }
    }
  };

  return (
    <View style={styles.aiMessage}>
      {/* AI Header & Risk Badge */}
      <View style={styles.aiHeader}>
        <LinearGradient colors={gradients.primary} style={styles.aiAvatar}>
          <Ionicons name="medical" size={16} color={colors.white} />
        </LinearGradient>
        <Text style={styles.aiName}>MediAI Clinical Assessment</Text>
        {severity && (
          <Badge
            label={`${severity.toUpperCase()} RISK`}
            variant={SEVERITY_COLORS[severity] || 'muted'}
            size="xs"
            dot
          />
        )}
      </View>

      {/* High Risk Urgent Emergency Banner */}
      {isHighRisk && (
        <View style={styles.urgentBanner}>
          <View style={styles.urgentHeader}>
            <Ionicons name="warning" size={20} color="#DC2626" />
            <Text style={styles.urgentTitle}>Urgent Medical Attention Recommended</Text>
          </View>
          <Text style={styles.urgentSub}>
            Your symptoms indicate elevated risk factors. We strongly recommend immediate clinical consultation or emergency dispatch.
          </Text>
          <TouchableOpacity style={styles.urgentBtn} onPress={handleUrgentConnect} activeOpacity={0.85}>
            <LinearGradient colors={['#DC2626', '#B91C1C']} style={styles.urgentBtnGrad}>
              <Ionicons name="flash" size={16} color={colors.white} />
              <Text style={styles.urgentBtnText}>Fast-Track Urgent Doctor Connect</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Probable Cause / Summary */}
      {summary ? <Text style={styles.aiSummary}>{summary}</Text> : null}

      {/* Safe Self-Care Guidance & Recommendations */}
      {Array.isArray(recommendations) && recommendations.length > 0 && (
        <View style={styles.recSection}>
          <Text style={styles.recTitle}>Clinical Self-Care & Guidance:</Text>
          {recommendations.map((r, i) => (
            <View key={i} style={styles.recItem}>
              <Ionicons name="checkmark-circle" size={15} color={colors.success} />
              <Text style={styles.recText}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommended Specialist Category */}
      {Array.isArray(specialists) && specialists.length > 0 && (
        <View style={styles.specSection}>
          <Text style={styles.recTitle}>Recommended Specialist:</Text>
          <View style={styles.specRow}>
            {specialists.map((s, i) => (
              <View key={i} style={styles.specChip}>
                <Ionicons name="ribbon-outline" size={13} color={colors.primary} />
                <Text style={styles.specChipText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Doctor Matching (Post AI-Assessment) */}
      {recommendedDoctors.length > 0 && (
        <View style={styles.docMatchingSection}>
          <Text style={styles.recTitle}>Matched Certified Specialists:</Text>
          {recommendedDoctors.slice(0, 3).map((doc) => (
            <Card key={doc._id} style={styles.matchedDocCard} padding={12}>
              <Avatar name={doc.fullName || doc.name || 'Doctor'} uri={doc.avatar} size="md" borderColor={colors.primary} />
              <View style={styles.matchedDocInfo}>
                <Text style={styles.matchedDocName}>Dr. {doc.fullName || doc.name || 'Doctor'}</Text>
                <Text style={styles.matchedDocSpec}>{doc.specialization || 'Specialist'}</Text>
                <Text style={styles.matchedDocExp}>
                  {doc.yearsOfExperience ? `${doc.yearsOfExperience} yrs exp` : 'Verified Doctor'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.bookDocBtn}
                onPress={() => handleBookDoctor(doc)}
                activeOpacity={0.8}
              >
                <Text style={styles.bookDocBtnText}>Book Slot</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      )}

      {/* Non-High Risk Direct Doctor Action */}
      {!isHighRisk && recommendedDoctors.length === 0 && (
        <TouchableOpacity
          style={styles.generalBookBtn}
          onPress={() => navigation?.navigate('Doctors')}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={styles.generalBookText}>Consult a Certified Specialist →</Text>
        </TouchableOpacity>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimerBox}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
        <Text style={styles.disclaimer}>
          Preliminary AI clinical intake only. Always consult a qualified physician for final diagnosis and prescription.
        </Text>
      </View>
    </View>
  );
}

export default function SymptomCheckerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 28 : 14);
  const bottomPadding = Math.max(insets.bottom, 12);

  const [symptoms, setSymptoms] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadHistory();
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const loadHistory = async () => {
    try {
      const raw = await storage.getItem(STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) setHistoryList(list);
      }
    } catch (_) {}
  };

  const saveToHistory = async (sessionMessages, lastAiResult) => {
    try {
      const firstUserMsg = sessionMessages.find((m) => m.type === 'user');
      const title = firstUserMsg ? firstUserMsg.text : 'Symptom Check';
      const aiData = lastAiResult?.data || lastAiResult || {};
      const newSession = {
        id: 'sess_' + Date.now(),
        date: new Date().toISOString(),
        title: title.length > 40 ? title.substring(0, 40) + '…' : title,
        riskLevel: aiData?.riskLevel || 'Low',
        possibleCondition: aiData?.possibleCondition || aiData?.summary || 'General Assessment',
        messages: sessionMessages,
      };

      const updated = [newSession, ...historyList.filter((s) => s.id !== newSession.id)].slice(0, 20);
      setHistoryList(updated);
      await storage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri,
      });
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to capture symptom/injury photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri,
      });
    }
  };

  const handleSubmit = useCallback(async (customText) => {
    const textToSend = typeof customText === 'string' ? customText : symptoms;
    if ((!textToSend || !textToSend.trim()) && !selectedImage) return;

    const userMsg = {
      type: 'user',
      text: textToSend.trim(),
      image: selectedImage?.uri || null,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setSymptoms('');
    const imagePayload = selectedImage?.base64 || null;
    setSelectedImage(null);
    setLoading(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Build conversation history array for backend branching AI
      const apiHistory = messages.map((m) => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.type === 'user' ? m.text : (m.data?.followUpQuestion || m.data?.possibleCondition || m.data?.summary || JSON.stringify(m.data)),
      }));

      const result = await checkSymptoms(textToSend.trim(), apiHistory, undefined, imagePayload);
      const completeSession = [...newMessages, { type: 'ai', data: result }];
      setMessages(completeSession);
      await saveToHistory(completeSession, result);
    } catch (err) {
      console.log('Symptom check error:', err.response?.data || err.message);
      const fallbackResult = {
        possibleCondition: 'Clinical Evaluation & Doctor Consultation Recommended',
        riskLevel: 'Medium',
        preventionAdvice: 'Please keep the affected area clean and protected with a sterile dressing. Avoid applying home remedies or extreme temperatures.',
        recommendations: [
          'Keep the area clean and loosely covered with sterile gauze',
          'Do not apply ice, oils, or pop blisters',
          'Consult a verified doctor for a detailed clinical examination',
        ],
      };
      setMessages((prev) => [
        ...prev,
        {
          type: 'ai',
          data: fallbackResult,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [symptoms, selectedImage, messages, historyList]);

  const handleReset = () => {
    setMessages([]);
    setSymptoms('');
    setSelectedImage(null);
  };

  return (
    <View style={styles.screen}>
      {/* Top Header Bar */}
      <View style={[styles.topHeader, { paddingTop: topPadding }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.headerLogoImage}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerTitle}>AI Symptom Checker</Text>
            <Text style={styles.headerSubtitle}>Conversational clinical triage</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => {
              loadHistory();
              setHistoryModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.historyText}>History</Text>
          </TouchableOpacity>

          {messages.length > 0 && (
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.resetText}>New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content: scrollable messages + fixed input pushed up by keyboard */}
      <View style={[styles.contentContainer, { paddingBottom: keyboardHeight > 0 ? keyboardHeight : bottomPadding }]}>
        {/* Messages Stream */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {messages.length === 0 && (
            <Card style={styles.welcomeCard} padding={20}>
              <LinearGradient colors={gradients.primary} style={styles.welcomeIcon}>
                <Ionicons name="medical" size={30} color={colors.white} />
              </LinearGradient>
              <Text style={styles.welcomeTitle}>Describe What You Feel</Text>
              <Text style={styles.welcomeText}>
                Our AI doctor will ask a few clarifying questions, examine any photos of burns, rashes or injuries, and match you with the right specialist.
              </Text>
              <View style={styles.quickSection}>
                <Text style={styles.quickHeader}>Common Symptoms:</Text>
                <View style={styles.quickRow}>
                  {QUICK_SYMPTOMS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.quickChip}
                      onPress={() => handleSubmit(s)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                      <Text style={styles.quickChipText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Card>
          )}

          {messages.map((msg, i) =>
            msg.type === 'user' ? (
              <View key={i} style={styles.userMessage}>
                {msg.image ? (
                  <Image source={{ uri: msg.image }} style={styles.userAttachedImage} resizeMode="cover" />
                ) : null}
                {msg.text ? <Text style={styles.userMessageText}>{msg.text}</Text> : null}
              </View>
            ) : (
              <AIMessage key={i} message={msg.data} navigation={navigation} />
            )
          )}

          {loading && (
            <Card style={styles.loadingCard} padding={14}>
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.loadingTitle}>Analyzing Clinical Context…</Text>
                  <Text style={styles.loadingSub}>Evaluating symptom history & medical specialist matching</Text>
                </View>
              </View>
            </Card>
          )}
        </ScrollView>

        {/* Attached Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreviewThumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.imagePreviewTitle}>Photo Attached</Text>
              <Text style={styles.imagePreviewSub}>Ready to analyze injury / rash / burn / medicine</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removeImageBtn}>
              <Ionicons name="close-circle" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.mediaBtn} onPress={handlePickImage} activeOpacity={0.7}>
            <Ionicons name="image-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaBtn} onPress={handleTakePhoto} activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={selectedImage ? 'Add notes for the image (optional)…' : 'Describe symptoms (e.g. skin rash, chest pain)…'}
            placeholderTextColor={colors.textMuted}
            value={symptoms}
            onChangeText={setSymptoms}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!symptoms.trim() && !selectedImage || loading) && styles.sendBtnDisabled]}
            onPress={() => handleSubmit()}
            disabled={(!symptoms.trim() && !selectedImage) || loading}
            activeOpacity={0.8}
          >
            <LinearGradient colors={gradients.primary} style={styles.sendBtnGrad}>
              <Ionicons name="send" size={18} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* History Modal */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="time" size={20} color={colors.primary} />
                <Text style={styles.modalTitle}>Previous Assessments</Text>
              </View>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {historyList.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Ionicons name="document-text-outline" size={44} color={colors.border} />
                <Text style={styles.emptyHistoryTitle}>No Previous Checks</Text>
              </View>
            ) : (
              <FlatList
                data={historyList}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 12, gap: 10 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.historyCard}
                    onPress={() => {
                      if (item.messages) setMessages(item.messages);
                      setHistoryModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.historyTitle}>{item.title}</Text>
                    <Text style={styles.historyCondition}>{item.possibleCondition}</Text>
                    <View style={styles.historyFooter}>
                      <Text style={styles.historyDate}>
                        {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={styles.viewLinkText}>View Consultation →</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogoImage: { width: 36, height: 36 },
  headerTitle: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: colors.text },
  headerSubtitle: { fontSize: typography.fontSizes.xs, color: colors.textMuted },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryGlow,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.primary + '33',
  },
  historyText: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.semibold, color: colors.primary },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  resetText: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.semibold, color: colors.textSecondary },
  contentContainer: { flex: 1 },
  messages: { flex: 1 },
  messagesContent: { padding: spacing.base, gap: 14, paddingBottom: 24 },
  welcomeCard: { alignItems: 'center', marginTop: spacing.sm, borderWidth: 1.5, borderColor: colors.border, ...shadows.sm },
  welcomeIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, ...shadows.primary },
  welcomeTitle: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: colors.text, marginBottom: 4 },
  welcomeText: { fontSize: typography.fontSizes.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.md },
  quickSection: { width: '100%', borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md },
  quickHeader: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.semibold, color: colors.textSecondary, marginBottom: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  quickChipText: { fontSize: typography.fontSizes.xs, color: colors.text, fontWeight: typography.fontWeights.medium },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    borderBottomRightRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: '84%',
    gap: 6,
    ...shadows.primary,
  },
  userAttachedImage: { width: 180, height: 120, borderRadius: radius.md, marginBottom: 4 },
  userMessageText: { color: colors.white, fontSize: typography.fontSizes.base, lineHeight: 22, fontWeight: typography.fontWeights.medium },

  aiQuestionBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderTopLeftRadius: radius.sm,
    padding: 14,
    maxWidth: '88%',
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
    ...shadows.sm,
  },
  aiQuestionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiSmallAvatar: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  aiQuestionName: { fontSize: 11, fontWeight: typography.fontWeights.bold, color: colors.primary },
  aiQuestionText: { fontSize: typography.fontSizes.base, color: colors.text, lineHeight: 22 },

  aiMessage: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderTopLeftRadius: radius.sm,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 12,
    ...shadows.sm,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  aiAvatar: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  aiName: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.primary, flex: 1 },
  aiSummary: { fontSize: typography.fontSizes.base, color: colors.text, lineHeight: 22 },
  
  urgentBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: radius.lg,
    padding: 12,
    gap: 8,
  },
  urgentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urgentTitle: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: '#DC2626' },
  urgentSub: { fontSize: typography.fontSizes.xs, color: '#7F1D1D', lineHeight: 18 },
  urgentBtn: { borderRadius: radius.md, overflow: 'hidden' },
  urgentBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: radius.md },
  urgentBtnText: { color: colors.white, fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.bold },

  recSection: { gap: 8 },
  recTitle: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.textSecondary },
  recItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  recText: { fontSize: typography.fontSizes.sm, color: colors.text, flex: 1, lineHeight: 20 },
  specSection: { gap: 8 },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryGlow,
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  specChipText: { fontSize: typography.fontSizes.xs, color: colors.primaryDark, fontWeight: typography.fontWeights.semibold },
  
  docMatchingSection: { gap: 8, marginTop: 4 },
  matchedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchedDocInfo: { flex: 1 },
  matchedDocName: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.text },
  matchedDocSpec: { fontSize: typography.fontSizes.xs, color: colors.primary, fontWeight: typography.fontWeights.medium },
  matchedDocExp: { fontSize: 11, color: colors.textMuted },
  bookDocBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
  },
  bookDocBtnText: { fontSize: 11, fontWeight: typography.fontWeights.bold, color: colors.white },

  generalBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: colors.primaryGlow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  generalBookText: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.bold, color: colors.primary },

  disclaimerBox: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderLight },
  disclaimer: { fontSize: 11, color: colors.textMuted, lineHeight: 16, flex: 1 },
  loadingCard: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, ...shadows.sm },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loadingTitle: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.primary },
  loadingSub: { fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 2 },

  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  imagePreviewThumb: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  imagePreviewTitle: { fontSize: 12, fontWeight: typography.fontWeights.bold, color: colors.text },
  imagePreviewSub: { fontSize: 10, color: colors.textMuted },
  removeImageBtn: { padding: 4 },

  inputArea: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  mediaBtn: { padding: 8, borderRadius: radius.full, backgroundColor: colors.background },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: typography.fontSizes.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    maxHeight: 90,
  },
  sendBtn: { borderRadius: 20 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnGrad: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', ...shadows.primary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], maxHeight: '75%', minHeight: 350, padding: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.text },
  closeBtn: { padding: 6, borderRadius: radius.full, backgroundColor: colors.background },
  historyCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 14, borderWidth: 1.5, borderColor: colors.border, gap: 6, ...shadows.sm },
  historyTitle: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.text },
  historyCondition: { fontSize: typography.fontSizes.xs, color: colors.textSecondary },
  historyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderLight },
  historyDate: { fontSize: 11, color: colors.textMuted },
  viewLinkText: { fontSize: 11, fontWeight: typography.fontWeights.bold, color: colors.primary },
  emptyHistory: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, gap: 8 },
  emptyHistoryTitle: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.text },
});
