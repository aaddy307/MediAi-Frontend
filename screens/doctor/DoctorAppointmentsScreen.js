import React, { useState, useEffect, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDoctorAppointments, updateAppointment } from '../../api/appointments';
import { initChat } from '../../api/chats';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import Button from '../../components/ui/Button';

const STATUS_BADGES = {
  pending: 'warning',
  pending_reschedule_by_patient: 'warning',
  pending_reschedule_by_doctor: 'warning',
  confirmed: 'success',
  scheduled: 'success',
  completed: 'muted',
  cancelled: 'danger',
};

const QUICK_TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:30 AM',
  '02:00 PM',
  '03:30 PM',
  '04:30 PM',
  '05:30 PM',
  '06:30 PM',
];

export default function DoctorAppointmentsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 28 : 14);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'confirmed' | 'completed'

  // Reschedule Modal State
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = filter === 'all' ? {} : { status: filter };
      const data = await getDoctorAppointments(params);
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.appointments) ? data.appointments : [];
      setAppointments(list);
    } catch (err) {
      console.log('Error loading doctor appointments:', err.message);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleApprove = async (id, patientName) => {
    const doApprove = async () => {
      setSavingAction(true);
      try {
        await updateAppointment(id, { status: 'confirmed' });
        setAppointments((prev) =>
          prev.map((a) => (a._id === id ? { ...a, status: 'confirmed' } : a))
        );
        if (Platform.OS === 'web') {
          window.alert(`Appointment with ${patientName} has been approved and confirmed.`);
        } else {
          Alert.alert('Appointment Confirmed', `Appointment with ${patientName} has been approved.`);
        }
        await load();
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Could not approve appointment.';
        if (Platform.OS === 'web') {
          window.alert(`Error: ${msg}`);
        } else {
          Alert.alert('Error', msg);
        }
      } finally {
        setSavingAction(false);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Approve appointment for ${patientName}?`)) {
        await doApprove();
      }
    } else {
      Alert.alert('Approve Appointment', `Approve appointment request for ${patientName}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve & Confirm', onPress: doApprove },
      ]);
    }
  };

  const handleOpenRescheduleModal = (item) => {
    const d = new Date(item.date);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setSelectedTime(item.time || '10:00 AM');
    setRescheduleNote('');
    setRescheduleModal(item);
  };

  const handleSubmitReschedule = async () => {
    if (!rescheduleModal || !selectedDate || !selectedTime) {
      if (Platform.OS === 'web') window.alert('Please select both a date and a time.');
      else Alert.alert('Missing Info', 'Please select both a date and a time.');
      return;
    }
    setSavingAction(true);
    try {
      await updateAppointment(rescheduleModal._id, {
        date: new Date(selectedDate).toISOString(),
        time: selectedTime,
        notes: rescheduleNote.trim() || undefined,
        status: 'pending_reschedule_by_doctor',
      });
      setRescheduleModal(null);
      if (Platform.OS === 'web') {
        window.alert('Reschedule proposal sent to patient.');
      } else {
        Alert.alert('Reschedule Sent', 'The patient has been notified of your proposed time.');
      }
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit reschedule proposal.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSavingAction(false);
    }
  };

  const handleCancel = async (id, patientName) => {
    const doCancel = async () => {
      setSavingAction(true);
      try {
        await updateAppointment(id, { status: 'cancelled' });
        setAppointments((prev) =>
          prev.map((a) => (a._id === id ? { ...a, status: 'cancelled' } : a))
        );
        if (Platform.OS === 'web') {
          window.alert('Appointment cancelled.');
        } else {
          Alert.alert('Cancelled', 'Appointment has been cancelled.');
        }
        await load();
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Could not cancel appointment.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Error', msg);
      } finally {
        setSavingAction(false);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Decline / Cancel appointment with ${patientName}?`)) {
        await doCancel();
      }
    } else {
      Alert.alert('Cancel Appointment', `Decline or cancel appointment with ${patientName}?`, [
        { text: 'Go Back', style: 'cancel' },
        { text: 'Decline / Cancel', style: 'destructive', onPress: doCancel },
      ]);
    }
  };

  const handleStartConsultation = async (item) => {
    try {
      const patientId = item.patient?._id || item.patient;
      const chatRes = await initChat(patientId, 'User');
      const chat = chatRes?.data || chatRes;
      const consultType = (item.consultationType || '').toLowerCase();
      const initialCall = consultType.includes('video') ? 'video' : consultType.includes('voice') ? 'voice' : null;
      navigation.navigate('ChatRoom', { chat, initialCall });
    } catch (err) {
      Alert.alert('Consultation', 'Starting chat consultation with patient...');
    }
  };

  const handleComplete = async (id) => {
    const doComplete = async () => {
      setSavingAction(true);
      try {
        await updateAppointment(id, { status: 'completed' });
        setAppointments((prev) =>
          prev.map((a) => (a._id === id ? { ...a, status: 'completed' } : a))
        );
        await load();
      } catch (err) {
        Alert.alert('Error', 'Failed to mark as completed');
      } finally {
        setSavingAction(false);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Mark this consultation as completed?')) {
        await doComplete();
      }
    } else {
      Alert.alert('Complete Session', 'Mark this consultation as completed?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: doComplete },
      ]);
    }
  };

  const renderItem = ({ item }) => {
    const patientName = item.patient?.fullName || 'Patient';
    const dateObj = new Date(item.date);
    const amount = item.amount || item.fee || 499;
    const isPending = item.status === 'pending' || item.status === 'pending_reschedule_by_patient';
    const isDoctorReschedule = item.status === 'pending_reschedule_by_doctor';
    const isConfirmed = item.status === 'confirmed' || item.status === 'scheduled';
    const isVideo = (item.consultationType || '').toLowerCase().includes('video');
    const isVoice = (item.consultationType || '').toLowerCase().includes('voice');
    const typeIcon = isVideo ? 'videocam' : isVoice ? 'call' : 'chatbubbles';

    return (
      <Card style={styles.apptCard} padding={16}>
        <View style={styles.cardHeader}>
          <View style={styles.dateBox}>
            <Text style={styles.dateDay}>{dateObj.getDate()}</Text>
            <Text style={styles.dateMonth}>{dateObj.toLocaleString('default', { month: 'short' })}</Text>
          </View>
          <View style={styles.patientDetails}>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.timeText}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} /> {item.time || dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <View style={styles.consultTypeRow}>
              <Ionicons name={typeIcon} size={13} color={colors.primary} />
              <Text style={styles.consultType}>{item.consultationType || 'General Consultation'} • ₹{amount}</Text>
            </View>
          </View>
          <Badge
            label={item.status === 'pending_reschedule_by_doctor' ? 'Rescheduled by you' : item.status === 'pending_reschedule_by_patient' ? 'Patient proposed' : item.status}
            variant={STATUS_BADGES[item.status] || 'muted'}
            dot
          />
        </View>

        {item.reason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Chief Complaint / Reason:</Text>
            <Text style={styles.reasonContent} numberOfLines={2}>{item.reason}</Text>
          </View>
        ) : null}

        {item.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes / Proposal:</Text>
            <Text style={styles.notesContent}>{item.notes}</Text>
          </View>
        ) : null}

        {/* PENDING APPROVAL ACTIONS */}
        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.approveBtn]}
              onPress={() => handleApprove(item._id, patientName)}
            >
              <Ionicons name="checkmark-circle" size={15} color={colors.white} />
              <Text style={styles.btnText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.rescheduleBtn]}
              onPress={() => handleOpenRescheduleModal(item)}
            >
              <Ionicons name="calendar-outline" size={15} color={colors.primary} />
              <Text style={[styles.btnText, { color: colors.primary }]}>Reschedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={() => handleCancel(item._id, patientName)}
            >
              <Ionicons name="close-circle" size={15} color={colors.danger} />
              <Text style={[styles.btnText, { color: colors.danger }]}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RESCHEDULED BY DOCTOR (Waiting for patient) */}
        {isDoctorReschedule && (
          <View style={styles.actions}>
            <View style={styles.waitingBanner}>
              <Ionicons name="time" size={14} color="#D97706" />
              <Text style={styles.waitingText}>Waiting for patient to accept proposed timing</Text>
            </View>
            <TouchableOpacity
              style={[styles.btn, styles.rescheduleBtn, { flex: 0, paddingHorizontal: 12 }]}
              onPress={() => handleOpenRescheduleModal(item)}
            >
              <Text style={[styles.btnText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CONFIRMED / SCHEDULED ACTIONS */}
        {isConfirmed && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.consultBtn]}
              onPress={() => handleStartConsultation(item)}
            >
              <Ionicons name={typeIcon} size={15} color={colors.white} />
              <Text style={styles.btnText}>Start Consultation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.completeBtn]}
              onPress={() => handleComplete(item._id)}
            >
              <Ionicons name="checkmark" size={15} color={colors.white} />
              <Text style={styles.btnText}>Complete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, { flex: 0, paddingHorizontal: 12 }]}
              onPress={() => handleCancel(item._id, patientName)}
            >
              <Ionicons name="close" size={15} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      {loading && <LoadingOverlay message="Loading appointments..." />}
      {savingAction && <LoadingOverlay message="Updating schedule..." />}

      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Text style={styles.title}>Appointments & Approvals</Text>
        <View style={styles.filterRow}>
          {['all', 'pending', 'confirmed', 'completed'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, filter === tab && styles.filterTabActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>
                {tab === 'all' ? 'ALL' : tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={appointments}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="calendar-outline"
              title="No Appointments"
              message={`No ${filter !== 'all' ? filter : ''} appointments found in this category.`}
            />
          )
        }
      />

      {/* RESCHEDULE MODAL */}
      <Modal
        visible={!!rescheduleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setRescheduleModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reschedule Appointment</Text>
                <Text style={styles.modalSub}>Patient: {rescheduleModal?.patient?.fullName}</Text>
              </View>
              <TouchableOpacity onPress={() => setRescheduleModal(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Date Input */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Time Slots */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Select Suggested Time Slot</Text>
              <View style={styles.slotsGrid}>
                {QUICK_TIME_SLOTS.map((slot) => {
                  const isSelected = selectedTime === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.slotChip, isSelected && styles.slotChipActive]}
                      onPress={() => setSelectedTime(slot)}
                    >
                      <Text style={[styles.slotChipText, isSelected && styles.slotChipTextActive]}>{slot}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={[styles.textInput, { marginTop: 8 }]}
                value={selectedTime}
                onChangeText={setSelectedTime}
                placeholder="Or custom time (e.g. 03:00 PM)"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Optional Note */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Note for Patient (Optional)</Text>
              <TextInput
                style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                value={rescheduleNote}
                onChangeText={setRescheduleNote}
                placeholder="e.g. In surgery during previous slot, please join at 2 PM"
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Send Reschedule Proposal"
                onPress={handleSubmitReschedule}
                loading={savingAction}
              />
            </View>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
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
    gap: 12,
    paddingBottom: 40,
  },
  apptCard: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateBox: {
    width: 48,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  dateDay: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  dateMonth: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  patientDetails: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  timeText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  consultTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  consultType: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  reasonBox: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    marginBottom: 2,
  },
  reasonContent: {
    fontSize: typography.fontSizes.xs,
    color: colors.text,
  },
  notesBox: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: '#92400E',
    marginBottom: 2,
  },
  notesContent: {
    fontSize: typography.fontSizes.xs,
    color: '#78350F',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    alignItems: 'center',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: radius.lg,
    gap: 5,
  },
  approveBtn: {
    backgroundColor: colors.success,
  },
  rescheduleBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cancelBtn: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger + '44',
  },
  consultBtn: {
    backgroundColor: colors.primary,
  },
  completeBtn: {
    backgroundColor: colors.success,
  },
  btnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  waitingBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waitingText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: typography.fontWeights.medium,
    flex: 1,
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
  modalSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: typography.fontSizes.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  slotChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotChipText: {
    fontSize: 11,
    color: colors.text,
  },
  slotChipTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
  modalActions: {
    marginTop: 8,
  },
});
