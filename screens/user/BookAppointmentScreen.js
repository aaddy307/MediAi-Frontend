import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import KeyboardSafeScrollView from '../../components/ui/KeyboardSafeScrollView';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDoctors } from '../../api/doctors';
import { createAppointment } from '../../api/appointments';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingOverlay from '../../components/ui/LoadingOverlay';

const CONSULT_TYPES = [
  {
    id: 'chat',
    label: 'Chat Consultation',
    icon: 'chatbubbles',
    desc: 'Real-time encrypted text chat, image sharing & digital prescription',
  },
  {
    id: 'voice',
    label: 'Voice Call',
    icon: 'call',
    desc: 'Crystal-clear HD audio call consultation with doctor',
  },
  {
    id: 'video',
    label: 'Video Call',
    icon: 'videocam',
    desc: 'Face-to-face HD audio/video consultation with doctor',
  },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const formatTimeString = (h, m, mer) => {
  const normalizedHour = h < 1 ? 12 : h > 12 ? (h % 12 || 12) : h;
  const hh = normalizedHour < 10 ? `0${normalizedHour}` : `${normalizedHour}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${hh}:${mm} ${mer}`;
};

const formatDateFull = (d) => {
  if (!d) return 'Today';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

function getDatesStartingFrom(startDate, n = 14) {
  const start = new Date(startDate || new Date());
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function BookAppointmentScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const preselectedDoctor = route?.params?.doctor;
  const isUrgent = route?.params?.isUrgent || false;

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(preselectedDoctor || null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateStripStart, setDateStripStart] = useState(new Date());
  const [consultType, setConsultType] = useState('chat');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(true);

  const dateScrollRef = React.useRef(null);

  // Time Stepper State (Strictly 1..12 and 00..55 AM/PM)
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);
  const [meridian, setMeridian] = useState('AM');

  // Calendar Modal State
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const dates = getDatesStartingFrom(dateStripStart, 14);
  const currentTimeFormatted = formatTimeString(hour, minute, meridian);

  useEffect(() => {
    async function load() {
      try {
        const data = await getDoctors();
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.doctors) ? data.doctors : [];
        setDoctors(list);
        if (!selectedDoctor && list.length > 0) {
          setSelectedDoctor(list[0]);
        }
      } catch (err) {
        console.log('Error loading doctors in BookAppointment:', err.message);
      } finally {
        setDoctorsLoading(false);
      }
    }
    load();
  }, []);

  const handleHourChange = (delta) => {
    setHour((prev) => {
      let next = prev + delta;
      if (next > 12) next = 1;
      if (next < 1) next = 12;
      return next;
    });
  };

  const handleMinuteChange = (delta) => {
    setMinute((prev) => {
      let next = prev + delta;
      if (next >= 60) next = 0;
      if (next < 0) next = 55;
      return next;
    });
  };

  // Calendar Helpers
  const handleOpenCalendar = () => {
    if (selectedDate) {
      setCalMonth(selectedDate.getMonth());
      setCalYear(selectedDate.getFullYear());
    }
    setCalendarModalVisible(true);
  };

  const handleCalPrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleCalNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleCalendarPickDate = (year, month, day) => {
    const newDate = new Date(year, month, day);
    setSelectedDate(newDate);
    setDateStripStart(newDate);
    setCalendarModalVisible(false);
    setTimeout(() => {
      dateScrollRef.current?.scrollTo({ x: 0, animated: true });
    }, 100);
  };

  // Build Calendar grid for current month
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calDaysGrid = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calDaysGrid.push({ key: `pad-${i}`, isEmpty: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(calYear, calMonth, day);
    const isPast = cellDate < today;
    const isToday = cellDate.toDateString() === today.toDateString();
    const isSelected = selectedDate && cellDate.toDateString() === selectedDate.toDateString();

    calDaysGrid.push({
      key: `day-${day}`,
      day,
      cellDate,
      isPast,
      isToday,
      isSelected,
    });
  }

  const handleBook = async () => {
    if (!selectedDoctor) {
      Alert.alert('Doctor Required', 'Please choose a certified doctor to consult.');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Date Required', 'Please select your preferred appointment date.');
      return;
    }

    setLoading(true);
    try {
      const typeLabel =
        consultType === 'video'
          ? 'Video Call'
          : consultType === 'voice'
          ? 'Voice Call'
          : 'Chat';

      const payload = {
        doctor: selectedDoctor._id,
        doctorId: selectedDoctor._id,
        appointmentDate: selectedDate.toISOString(),
        date: selectedDate.toISOString(),
        time: currentTimeFormatted,
        consultationType: typeLabel,
        isUrgent,
        amount: currentFee,
        fee: currentFee,
        reason: notes.trim() || (isUrgent ? 'Urgent Medical Consultation' : 'General Consultation'),
        notes: notes.trim() || 'Medical Consultation',
      };

      await createAppointment(payload);
      Alert.alert(
        'Appointment Request Sent! 🩺',
        `Your request has been submitted to Dr. ${selectedDoctor.fullName || selectedDoctor.name || 'Doctor'} for ${formatDateFull(selectedDate)} at ${currentTimeFormatted}.\n\nConsultation format: ${typeLabel}.`,
        [
          {
            text: 'View Appointments',
            onPress: () => navigation.navigate('Appointments'),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Booking Notice', err.response?.data?.message || err.message || 'Could not schedule appointment.');
    } finally {
      setLoading(false);
    }
  };

  const getFormatFee = (typeId) => {
    const base = selectedDoctor?.consultationFee || 499;
    if (typeId === 'chat') return selectedDoctor?.chatFee || Math.round(base * 0.6) || 299;
    if (typeId === 'voice') return selectedDoctor?.voiceFee || base || 499;
    if (typeId === 'video') return selectedDoctor?.videoFee || Math.round(base * 1.5) || 799;
    return base;
  };

  const currentFee = getFormatFee(consultType);
  const consultFormatLabel =
    consultType === 'video'
      ? 'Video Consultation'
      : consultType === 'voice'
      ? 'Voice Consultation'
      : 'Chat Consultation';

  return (
    <View style={styles.screen}>
      {loading && <LoadingOverlay message="Scheduling your consultation…" />}

      <KeyboardSafeScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Urgent Alert Banner */}
        {isUrgent && (
          <View style={styles.urgentBanner}>
            <LinearGradient colors={['#DC2626', '#B91C1C']} style={styles.urgentIcon}>
              <Ionicons name="flash" size={16} color={colors.white} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.urgentTitle}>Urgent Medical Booking</Text>
              <Text style={styles.urgentSub}>
                Prioritized queue based on your symptom triage risk level.
              </Text>
            </View>
          </View>
        )}

        {/* 1. SELECT SPECIALIST */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>1. Select Certified Specialist</Text>
          <Text style={styles.sectionSub}>Choose your primary physician or specialist</Text>
        </View>

        {doctorsLoading ? (
          <Text style={styles.loadingText}>Loading doctors…</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.doctorScroll}
            contentContainerStyle={styles.doctorScrollContent}
          >
            {(Array.isArray(doctors) ? doctors : []).map((doc) => {
              const docName = doc.fullName || doc.name || 'Doctor';
              const docSpec = doc.specialization || 'General Practice';
              const isSelected = selectedDoctor?._id === doc._id;

              return (
                <TouchableOpacity
                  key={doc._id}
                  style={[styles.doctorCard, isSelected && styles.doctorCardSelected]}
                  onPress={() => setSelectedDoctor(doc)}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <View style={styles.selectedCheckBadge}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    </View>
                  )}
                  <Avatar name={docName} uri={doc.avatar} size="lg" borderColor={isSelected ? colors.primary : undefined} />
                  <Text style={[styles.docNameText, isSelected && styles.docNameSelected]} numberOfLines={1}>
                    Dr. {docName}
                  </Text>
                  <Text style={styles.docSpecText} numberOfLines={1}>
                    {docSpec}
                  </Text>
                  <View style={styles.docFeeBadge}>
                    <Text style={styles.docFeeText}>From ₹{doc.chatFee || 299}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* 2. CONSULTATION FORMAT (Individual Pricing for Chat / Voice / Video) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>2. Consultation Format & Pricing</Text>
          <Text style={styles.sectionSub}>Select format (different fee applies per mode)</Text>
        </View>
        <View style={styles.consultTypeRow}>
          {CONSULT_TYPES.map((type) => {
            const isSelected = consultType === type.id;
            const feeForType = getFormatFee(type.id);
            return (
              <TouchableOpacity
                key={type.id}
                style={[styles.consultTypeCard, isSelected && styles.consultTypeSelected]}
                onPress={() => setConsultType(type.id)}
                activeOpacity={0.8}
              >
                <View style={styles.consultHeader}>
                  <LinearGradient
                    colors={isSelected ? gradients.primary : [colors.borderLight, colors.borderLight]}
                    style={styles.consultIconBox}
                  >
                    <Ionicons
                      name={type.icon}
                      size={18}
                      color={isSelected ? colors.white : colors.textSecondary}
                    />
                  </LinearGradient>
                  {isSelected ? (
                    <Ionicons name="radio-button-on" size={18} color={colors.primary} />
                  ) : (
                    <Ionicons name="radio-button-off" size={18} color={colors.border} />
                  )}
                </View>
                <Text style={[styles.consultTypeTitle, isSelected && styles.consultTypeTitleSelected]}>
                  {type.label}
                </Text>
                <Text style={styles.consultTypeDesc} numberOfLines={2}>{type.desc}</Text>
                
                {/* Individual Price Badge */}
                <View style={[styles.formatPriceBadge, isSelected && styles.formatPriceBadgeActive]}>
                  <Text style={[styles.formatPriceText, isSelected && styles.formatPriceTextActive]}>
                    ₹{feeForType}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. SELECT DATE WITH INTERACTIVE CALENDAR */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>3. Select Appointment Date</Text>
            <Text style={styles.sectionSub}>{formatDateFull(selectedDate)}</Text>
          </View>
          <TouchableOpacity
            style={styles.openCalendarBtn}
            onPress={handleOpenCalendar}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={15} color={colors.primary} />
            <Text style={styles.openCalendarBtnText}>Open Calendar</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Date Strip */}
        <ScrollView
          ref={dateScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
          contentContainerStyle={styles.dateScrollContent}
        >
          {dates.map((d, i) => {
            const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString();
            const dayName = d.toLocaleString('default', { weekday: 'short' });
            const dayNum = d.getDate();

            return (
              <TouchableOpacity
                key={i}
                style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                onPress={() => setSelectedDate(d)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayName, isSelected && styles.dateTextSelected]}>{dayName}</Text>
                <Text style={[styles.dayNum, isSelected && styles.dateTextSelected]}>{dayNum}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. SELECT TIME WITH INTERACTIVE STEPPER */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>4. Select Consultation Time</Text>
          <Text style={styles.sectionSub}>Adjust exact hour and minute</Text>
        </View>

        {/* Interactive Time Stepper Card */}
        <View style={styles.timeAdjusterCard}>
          <View style={styles.timeDisplayBlock}>
            <Text style={styles.timeAdjusterHeader}>Selected Time Slot</Text>
            <Text style={styles.timeSelectedBig}>{currentTimeFormatted}</Text>
          </View>

          <View style={styles.steppersRow}>
            {/* Hour Stepper (1 to 12) */}
            <View style={styles.stepperCol}>
              <Text style={styles.stepperLabel}>HOUR</Text>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleHourChange(-1)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>
                  {(hour < 1 ? 12 : hour > 12 ? hour % 12 || 12 : hour) < 10
                    ? `0${hour < 1 ? 12 : hour > 12 ? hour % 12 || 12 : hour}`
                    : hour}
                </Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleHourChange(1)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.timeColon}>:</Text>

            {/* Minute Stepper (0 to 55 by 5 mins) */}
            <View style={styles.stepperCol}>
              <Text style={styles.stepperLabel}>MIN</Text>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleMinuteChange(-5)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{minute < 10 ? `0${minute}` : minute}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => handleMinuteChange(5)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* AM / PM Toggle */}
            <View style={styles.meridianCol}>
              <TouchableOpacity
                style={[styles.meridianChip, meridian === 'AM' && styles.meridianChipActive]}
                onPress={() => setMeridian('AM')}
                activeOpacity={0.8}
              >
                <Text style={[styles.meridianText, meridian === 'AM' && styles.meridianTextActive]}>
                  AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.meridianChip, meridian === 'PM' && styles.meridianChipActive]}
                onPress={() => setMeridian('PM')}
                activeOpacity={0.8}
              >
                <Text style={[styles.meridianText, meridian === 'PM' && styles.meridianTextActive]}>
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 5. NOTES & SYMPTOMS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>5. Symptoms & Notes (Optional)</Text>
          <Text style={styles.sectionSub}>Add any details, past prescriptions or questions</Text>
        </View>
        <Card style={styles.notesCard} padding={12}>
          <TextInput
            style={styles.notesInput}
            placeholder="Describe any symptoms, burns, pain duration, or questions for the doctor…"
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </Card>

        {/* Summary & Policy Box */}
        <Card style={styles.policyCard} padding={14}>
          <View style={styles.policyHeader}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={styles.policyTitle}>MediAI Verified Booking</Text>
          </View>
          <Text style={styles.policyText}>
            • Fee of <Text style={{ fontWeight: '700', color: colors.text }}>₹{currentFee}</Text> applies for {consultFormatLabel}.
            {'\n'}• Slot will be confirmed by Dr. {selectedDoctor?.fullName || selectedDoctor?.name || 'Specialist'} for {formatDateFull(selectedDate)} at {currentTimeFormatted}.
            {'\n'}• Full free rescheduling permitted up to 2 hours prior.
          </Text>
        </Card>

        {/* Big Action Button */}
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleBook}
          activeOpacity={0.85}
        >
          <LinearGradient colors={gradients.primary} style={styles.confirmBtnGrad}>
            <Ionicons
              name={consultType === 'video' ? 'videocam' : consultType === 'voice' ? 'call' : 'chatbubbles'}
              size={20}
              color={colors.white}
            />
            <Text style={styles.confirmBtnText}>
              Confirm & Book {consultFormatLabel} (₹{currentFee})
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </KeyboardSafeScrollView>

      {/* Interactive Calendar Selection Modal */}
      <Modal
        visible={calendarModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCalendarModalVisible(false)}
      >
        <View style={styles.calModalOverlay}>
          <View style={styles.calModalCard}>
            {/* Header: Month / Year & Navigation */}
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={handleCalPrevMonth} style={styles.calNavBtn}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.calMonthTitle}>
                {MONTH_NAMES[calMonth]} {calYear}
              </Text>
              <TouchableOpacity onPress={handleCalNextMonth} style={styles.calNavBtn}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Day of Week Headers */}
            <View style={styles.calDayHeadersRow}>
              {DAY_HEADERS.map((dh) => (
                <Text key={dh} style={styles.calDayHeaderCell}>
                  {dh}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calGrid}>
              {calDaysGrid.map((item) => {
                if (item.isEmpty) {
                  return <View key={item.key} style={styles.calCellEmpty} />;
                }

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.calCell,
                      item.isSelected && styles.calCellSelected,
                      item.isToday && !item.isSelected && styles.calCellToday,
                      item.isPast && styles.calCellPast,
                    ]}
                    onPress={() => {
                      if (!item.isPast) {
                        handleCalendarPickDate(calYear, calMonth, item.day);
                      }
                    }}
                    disabled={item.isPast}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.calCellText,
                        item.isSelected && styles.calCellTextSelected,
                        item.isToday && !item.isSelected && styles.calCellTextToday,
                        item.isPast && styles.calCellTextPast,
                      ]}
                    >
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer */}
            <View style={styles.calFooter}>
              <Text style={styles.calFooterCount}>Selected: {formatDateFull(selectedDate)}</Text>
              <TouchableOpacity
                style={styles.calDoneBtn}
                onPress={() => setCalendarModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.calDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, gap: 14 },
  
  sectionHeader: { marginTop: 4 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.text },
  sectionSub: { fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  loadingText: { fontSize: typography.fontSizes.sm, color: colors.textMuted, marginVertical: 10 },

  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: radius.xl,
    ...shadows.sm,
  },
  urgentIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  urgentTitle: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: '#DC2626' },
  urgentSub: { fontSize: typography.fontSizes.xs, color: '#991B1B', marginTop: 1 },

  doctorScroll: {
    marginHorizontal: -spacing.base,
  },
  doctorScrollContent: {
    paddingLeft: spacing.base,
    paddingRight: spacing.base + 12,
    paddingVertical: 4,
  },
  doctorCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 4,
    position: 'relative',
    ...shadows.sm,
  },
  doctorCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
    ...shadows.md,
  },
  selectedCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
  docNameText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    marginTop: 6,
  },
  docNameSelected: { color: colors.primaryDark },
  docSpecText: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  docFeeBadge: {
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 4,
  },
  docFeeText: { fontSize: 11, fontWeight: typography.fontWeights.bold, color: colors.primaryDark },

  /* Consultation Format - 3 Options */
  consultTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  consultTypeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 4,
    ...shadows.sm,
  },
  consultTypeSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
    ...shadows.md,
  },
  consultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  consultIconBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  consultTypeTitle: { fontSize: 11, fontWeight: typography.fontWeights.bold, color: colors.text, marginTop: 2 },
  consultTypeTitleSelected: { color: colors.primaryDark },
  consultTypeDesc: { fontSize: 9.5, color: colors.textMuted, lineHeight: 13 },
  formatPriceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: 2,
  },
  formatPriceBadgeActive: {
    backgroundColor: colors.primary,
  },
  formatPriceText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primaryDark,
  },
  formatPriceTextActive: {
    color: colors.white,
  },

  /* Open Calendar Button */
  openCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '35',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  openCalendarBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },

  dateScroll: {
    marginHorizontal: -spacing.base,
  },
  dateScrollContent: {
    paddingLeft: spacing.base,
    paddingRight: spacing.base + 12,
    paddingVertical: 4,
  },
  dateChip: {
    width: 60,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    gap: 4,
    ...shadows.sm,
  },
  dateChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.primary,
  },
  dayName: { fontSize: 11, color: colors.textMuted, fontWeight: typography.fontWeights.medium },
  dayNum: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.text },
  dateTextSelected: { color: colors.white },

  /* Time Stepper */
  timeAdjusterCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 14,
    gap: 12,
    ...shadows.sm,
  },
  timeDisplayBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  timeAdjusterHeader: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  timeSelectedBig: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.primary,
  },
  steppersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stepperCol: {
    alignItems: 'center',
    gap: 4,
  },
  stepperLabel: {
    fontSize: 9,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 6,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.text,
    minWidth: 26,
    textAlign: 'center',
  },
  timeColon: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    marginTop: 14,
  },
  meridianCol: {
    flexDirection: 'column',
    gap: 4,
    marginLeft: 6,
    marginTop: 14,
  },
  meridianChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meridianChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  meridianText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
  },
  meridianTextActive: {
    color: colors.white,
  },

  notesCard: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.sm },
  notesInput: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  policyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
    ...shadows.sm,
  },
  policyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  policyTitle: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.bold, color: colors.primary },
  policyText: { fontSize: 11, color: colors.textSecondary, lineHeight: 18 },

  confirmBtn: { borderRadius: radius.xl, overflow: 'hidden', marginTop: 4, ...shadows.primary },
  confirmBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: radius.xl,
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },

  /* Calendar Modal */
  calModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  calModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing.lg,
    ...shadows.lg,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  calMonthTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayHeadersRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calDayHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCellEmpty: {
    width: '14.28%',
    height: 36,
  },
  calCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    marginVertical: 1,
  },
  calCellSelected: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  calCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
  },
  calCellPast: {
    opacity: 0.35,
  },
  calCellText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  calCellTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
  calCellTextToday: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  calCellTextPast: {
    color: colors.textMuted,
  },
  calFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  calFooterCount: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.semibold,
  },
  calDoneBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  calDoneBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
});
