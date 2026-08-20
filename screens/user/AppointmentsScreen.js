import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppointments, cancelAppointment, updateAppointment } from '../../api/appointments';
import { initChat } from '../../api/chats';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import LoadingOverlay from '../../components/ui/LoadingOverlay';

const STATUS_BADGE = {
  pending: 'warning',
  scheduled: 'success',
  confirmed: 'success',
  completed: 'muted',
  cancelled: 'danger',
  pending_reschedule_by_doctor: 'warning',
  pending_reschedule_by_patient: 'warning',
};

const RESCHEDULE_TIMES = [
  '09:00 AM',
  '10:30 AM',
  '11:30 AM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
  '06:30 PM',
];
const FILTER_TABS = ['all', 'upcoming', 'completed', 'cancelled'];

function AppointmentCard({ item, onCancel, onPay, onAcceptReschedule, onReschedule, onJoinConsultation }) {
  const date = new Date(item.date || item.appointmentDate || Date.now());
  const docName = item.doctor?.fullName || item.doctor?.name || 'Doctor';
  const docSpec = item.doctor?.specialization || item.doctor?.specialty || 'General Practice';
  const fee = item.amount || item.doctor?.consultationFee || 499;
  const isPaid = item.paymentStatus === 'paid';
  const isDoctorReschedule = item.status === 'pending_reschedule_by_doctor';
  const isPatientReschedule = item.status === 'pending_reschedule_by_patient';
  const isApproved = item.status === 'scheduled' || item.status === 'confirmed';
  const isPending = item.status === 'pending';
  const isVideo = (item.consultationType || '').toLowerCase().includes('video');
  const isVoice = (item.consultationType || '').toLowerCase().includes('voice');
  const typeIcon = isVideo ? 'videocam' : isVoice ? 'call' : 'chatbubbles';

  return (
    <Card style={styles.apptCard} padding={16}>
      <View style={styles.apptRow}>
        <Avatar name={docName} uri={item.doctor?.avatar} size="lg" borderColor={colors.primary} />
        <View style={styles.apptInfo}>
          <Text style={styles.doctorName}>Dr. {docName}</Text>
          <Text style={styles.specialty}>{docSpec}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.timeText}>
              {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {item.time || '10:00 AM'}
            </Text>
          </View>
          <View style={styles.typeRow}>
            <Ionicons name={typeIcon} size={12} color={colors.primary} />
            <Text style={styles.typeText}>{item.consultationType || 'Chat Consultation'}</Text>
          </View>
        </View>
        <Badge
          label={
            isDoctorReschedule
              ? 'Doctor Rescheduled'
              : isPatientReschedule
              ? 'Reschedule Pending'
              : isPending
              ? 'Pending Approval'
              : isApproved
              ? 'Confirmed'
              : item.status
          }
          variant={STATUS_BADGE[item.status] || 'muted'}
          dot
        />
      </View>

      {/* Doctor Proposed Reschedule Banner */}
      {isDoctorReschedule && (
        <View style={styles.rescheduleBanner}>
          <Ionicons name="alert-circle" size={20} color="#D97706" />
          <View style={{ flex: 1 }}>
            <Text style={styles.rescheduleTitle}>Doctor Suggested New Timing</Text>
            <Text style={styles.rescheduleSub}>
              New Slot: {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {item.time}
            </Text>
            {item.notes ? (
              <Text style={styles.rescheduleNote}>Note: "{item.notes}"</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.acceptRescheduleBtn}
            onPress={() => onAcceptReschedule(item._id)}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptRescheduleText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Waiting for Doctor Approval Banner */}
      {isPending && (
        <View style={styles.pendingNotice}>
          <Ionicons name="hourglass-outline" size={16} color={colors.warning} />
          <Text style={styles.pendingNoticeText}>
            Awaiting confirmation from Dr. {docName}. You will be notified once confirmed.
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {/* Join Consultation Button (Available when confirmed) */}
        {isApproved && (
          <TouchableOpacity
            style={[styles.btn, styles.joinBtn]}
            onPress={() => onJoinConsultation(item)}
            activeOpacity={0.8}
          >
            <Ionicons name={typeIcon} size={15} color={colors.white} />
            <Text style={styles.joinBtnText}>Join Consultation</Text>
          </TouchableOpacity>
        )}

        {/* Reschedule Button */}
        {item.status !== 'completed' && item.status !== 'cancelled' && (
          <TouchableOpacity
            style={[styles.btn, styles.rescheduleBtn]}
            onPress={() => onReschedule(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={styles.rescheduleBtnText}>Reschedule</Text>
          </TouchableOpacity>
        )}

        {/* Cancel Appointment */}
        {item.status !== 'completed' && item.status !== 'cancelled' && (
          <TouchableOpacity
            style={[styles.btn, styles.cancelBtn]}
            onPress={() => onCancel(item._id)}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

export default function AppointmentsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 28 : 14);
  const bottomPadding = Math.max(insets.bottom, 14);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  // Reschedule Modal
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [selectedNewDate, setSelectedNewDate] = useState('');
  const [selectedNewTime, setSelectedNewTime] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getAppointments();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.appointments) ? data.appointments : [];
      setAppointments(list);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener('focus', () => {
      load();
    });
    return unsubscribe;
  }, [navigation, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCancel = async (id) => {
    const doCancel = async () => {
      setSavingAction(true);
      try {
        await cancelAppointment(id);
        if (Platform.OS === 'web') window.alert('Appointment cancelled.');
        else Alert.alert('Cancelled', 'Your appointment request has been cancelled.');
        await load();
      } catch {
        if (Platform.OS === 'web') window.alert('Could not cancel appointment.');
        else Alert.alert('Error', 'Could not cancel appointment.');
      } finally {
        setSavingAction(false);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Are you sure you want to cancel this appointment?')) {
        await doCancel();
      }
    } else {
      Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment request?', [
        { text: 'Keep Appointment', style: 'cancel' },
        { text: 'Cancel Appointment', style: 'destructive', onPress: doCancel },
      ]);
    }
  };

  const handleAcceptReschedule = async (id) => {
    setSavingAction(true);
    try {
      await updateAppointment(id, { status: 'confirmed' });
      if (Platform.OS === 'web') window.alert('Rescheduled time accepted! Your appointment is now confirmed.');
      else Alert.alert('Appointment Confirmed', 'You have accepted the doctor’s suggested timing.');
      await load();
    } catch {
      if (Platform.OS === 'web') window.alert('Could not accept reschedule.');
      else Alert.alert('Error', 'Could not accept reschedule.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleOpenRescheduleModal = (item) => {
    const d = new Date(item.date);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedNewDate(dateStr);
    setSelectedNewTime(item.time || '10:00 AM');
    setRescheduleModal(item);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleModal || !selectedNewDate || !selectedNewTime) return;
    setSavingAction(true);
    try {
      await updateAppointment(rescheduleModal._id, {
        date: new Date(selectedNewDate).toISOString(),
        time: selectedNewTime,
        status: 'pending_reschedule_by_patient',
      });
      setRescheduleModal(null);
      if (Platform.OS === 'web') window.alert('Your doctor has been notified of your requested time change.');
      else Alert.alert('Reschedule Requested', 'Your doctor has been notified of your requested time change.');
      await load();
    } catch {
      if (Platform.OS === 'web') window.alert('Could not propose new time.');
      else Alert.alert('Error', 'Could not propose new time.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleJoinConsultation = async (item) => {
    try {
      const doctorId = item.doctor?._id || item.doctor;
      const chatRes = await initChat(doctorId, 'Doctor');
      const chat = chatRes?.data || chatRes;
      const consultType = (item.consultationType || '').toLowerCase();
      const initialCall = consultType.includes('video') ? 'video' : consultType.includes('voice') ? 'voice' : null;
      
      navigation.navigate('Chat', {
        screen: 'ChatRoom',
        params: {
          chat,
          initialCall,
          appointmentId: item._id,
        },
      });
    } catch {
      navigation.navigate('Chat', {
        screen: 'ChatListMain',
      });
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'pending' || a.status.includes('reschedule');
    if (filter === 'completed') return a.status === 'completed';
    if (filter === 'cancelled') return a.status === 'cancelled';
    return true;
  });

  return (
    <View style={[styles.screen, { paddingBottom: bottomPadding }]}>
      {loading && <LoadingOverlay message="Loading appointments…" />}
      {savingAction && <LoadingOverlay message="Updating appointment…" />}

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>My Appointments</Text>
            <Text style={styles.subTitle}>Manage doctor visits and consultations</Text>
          </View>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => navigation.navigate('BookAppointment')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={gradients.primary} style={styles.bookBtnGrad}>
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.bookBtnText}>Book New</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, filter === tab && styles.filterTabActive]}
              onPress={() => setFilter(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <AppointmentCard
            item={item}
            onCancel={handleCancel}
            onAcceptReschedule={handleAcceptReschedule}
            onReschedule={handleOpenRescheduleModal}
            onJoinConsultation={handleJoinConsultation}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="calendar-outline"
              title="No Appointments"
              message={`You have no ${filter !== 'all' ? filter : ''} appointments. Book a certified specialist anytime.`}
            />
          )
        }
      />

      {/* Reschedule Modal */}
      <Modal
        visible={!!rescheduleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setRescheduleModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Propose New Time Slot</Text>
              <TouchableOpacity onPress={() => setRescheduleModal(null)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                value={selectedNewDate}
                onChangeText={setSelectedNewDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Select Preferred Time</Text>
              <View style={styles.timesGrid}>
                {RESCHEDULE_TIMES.map((time) => {
                  const isSelected = selectedNewTime === time;
                  return (
                    <TouchableOpacity
                      key={time}
                      style={[styles.timeChip, isSelected && styles.timeChipActive]}
                      onPress={() => setSelectedNewTime(time)}
                    >
                      <Text style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}>{time}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={[styles.modalInput, { marginTop: 8 }]}
                value={selectedNewTime}
                onChangeText={setSelectedNewTime}
                placeholder="Or custom time (e.g. 04:00 PM)"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Button
              title="Send Reschedule Request"
              onPress={handleConfirmReschedule}
              loading={savingAction}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subTitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  bookBtn: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  bookBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  bookBtnText: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  list: {
    padding: spacing.base,
    gap: 14,
    paddingBottom: 40,
  },
  apptCard: {
    gap: 12,
  },
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  apptInfo: {
    flex: 1,
    gap: 2,
  },
  doctorName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  specialty: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  typeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  rescheduleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: radius.md,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  rescheduleTitle: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: '#92400E',
  },
  rescheduleSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  rescheduleNote: {
    fontSize: 11,
    color: '#78350F',
    fontStyle: 'italic',
    marginTop: 2,
  },
  acceptRescheduleBtn: {
    backgroundColor: colors.success,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  acceptRescheduleText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: radius.md,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: radius.lg,
    gap: 6,
  },
  joinBtn: {
    backgroundColor: colors.primary,
  },
  joinBtnText: {
    color: colors.white,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  rescheduleBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  rescheduleBtnText: {
    color: colors.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  cancelBtn: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger + '44',
  },
  cancelBtnText: {
    color: colors.danger,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing.xl,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  modalField: {
    gap: 6,
  },
  modalLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  modalInput: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: typography.fontSizes.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeChipText: {
    fontSize: 11,
    color: colors.text,
  },
  timeChipTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
});
