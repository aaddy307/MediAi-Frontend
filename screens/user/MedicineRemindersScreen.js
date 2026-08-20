import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  ScrollView,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  updateReminderStatus,
} from '../../api/medicines';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MEAL_TIMING_OPTIONS = [
  { id: 'After Meal', label: 'After Meal', desc: 'Take after eating food', icon: 'restaurant-outline' },
  { id: 'Before Meal', label: 'Before Meal', desc: 'Take 30 mins before food', icon: 'time-outline' },
  { id: 'Empty Stomach', label: 'Empty Stomach', desc: 'Take upon waking up', icon: 'sunny-outline' },
  { id: 'Bedtime', label: 'Before Bed', desc: 'Take before sleeping', icon: 'moon-outline' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return 'Today';
  const today = getTodayDateStr();
  if (dateStr === today) return 'Today';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch (_) {}
  return dateStr;
};

const formatDateFull = (dateStr) => {
  if (!dateStr) return 'Today';
  const today = getTodayDateStr();
  if (dateStr === today) return 'Today';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch (_) {}
  return dateStr;
};

const formatTimeString = (h, m, mer) => {
  const normalizedHour = h < 1 ? 12 : h > 12 ? (h % 12 || 12) : h;
  const hh = normalizedHour < 10 ? `0${normalizedHour}` : `${normalizedHour}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${hh}:${mm} ${mer}`;
};

// Check if today matches any date in the reminder's selectedDates
const isReminderActiveToday = (reminder, currentDate) => {
  const todayStr = currentDate.toISOString().split('T')[0];
  const dates = reminder.selectedDates && reminder.selectedDates.length > 0
    ? reminder.selectedDates
    : (reminder.date ? [reminder.date] : []);

  return dates.includes(todayStr);
};

// Get Date object for today's scheduled intake time
const getTodayScheduledTime = (timeStr, currentDate) => {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  const d = new Date(currentDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

export default function MedicineRemindersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'pending', 'taken'

  // Global Mute Toggle (Silences voice but shows notification popups)
  const [globalVoiceMuted, setGlobalVoiceMuted] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [medicineName, setMedicineName] = useState('');
  const [selectedDates, setSelectedDates] = useState([getTodayDateStr()]);
  const [period, setPeriod] = useState('After Meal');
  const [instructions, setInstructions] = useState('');
  const [voiceMuted, setVoiceMuted] = useState(false); // Per-reminder mute
  const [saving, setSaving] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);

  // Time Picker Stepper State (Strictly 1..12 and 00..55 AM/PM)
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [meridian, setMeridian] = useState('AM');

  // Calendar Modal State
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Set of reminders already announced at scheduled time for a specific day
  const announcedRemindersRef = useRef(new Set());

  // Voice Announcement Helper
  const playVoiceAnnouncement = useCallback((medName, timeStr) => {
    try {
      Speech.stop();
      const textToSpeak = `It's time to take your medicine: ${medName || 'your prescribed medicine'}.`;
      Speech.speak(textToSpeak, {
        language: 'en',
        rate: 0.92,
        pitch: 1.0,
        onDone: () => setSpeakingId(null),
        onError: () => setSpeakingId(null),
      });
    } catch (err) {
      console.warn('Text-to-speech error:', err);
    }
  }, []);

  const handleCardVoicePlay = (item) => {
    setSpeakingId(item._id);
    playVoiceAnnouncement(item.medicineName, item.time);
  };

  const loadReminders = useCallback(async () => {
    try {
      const res = await getReminders();
      const list = res?.data || res?.reminders || (Array.isArray(res) ? res : []);
      setReminders(list);
    } catch (err) {
      console.warn('Error loading medicine reminders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
    return () => {
      try {
        Speech.stop();
      } catch (_) {}
    };
  }, [loadReminders]);

  // Active timer: Check every 5 seconds if scheduled medicine time has arrived on today's selected date
  useEffect(() => {
    const interval = setInterval(() => {
      if (!reminders || reminders.length === 0) return;
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      reminders.forEach((rem) => {
        if (rem.status === 'skipped') return;

        // Check if today is one of the selected dates for this reminder
        if (!isReminderActiveToday(rem, now)) return;

        const scheduledToday = getTodayScheduledTime(rem.time, now);
        if (!scheduledToday) return;

        const diffMs = now.getTime() - scheduledToday.getTime();
        // Trigger within 60 seconds after scheduled time today
        if (diffMs >= 0 && diffMs < 60000) {
          const reminderKey = `${rem._id}_${todayStr}_${scheduledToday.getHours()}:${scheduledToday.getMinutes()}`;
          if (!announcedRemindersRef.current.has(reminderKey)) {
            announcedRemindersRef.current.add(reminderKey);

            // Check if voice is muted (either globally or per reminder)
            const isMuted = globalVoiceMuted || rem.voiceMuted;

            if (!isMuted) {
              // Play voice alert when NOT muted
              playVoiceAnnouncement(rem.medicineName, rem.time);
            }

            // Notification message popup ALWAYS comes on screen even if voice is muted!
            Alert.alert(
              isMuted ? 'Medicine Reminder (Muted) 💊' : 'Medicine Reminder 💊',
              `It's time to take your medicine: ${rem.medicineName} (${rem.period || 'Dosage'})`,
              [
                {
                  text: 'Mark as Taken',
                  onPress: () => handleStatusChange(rem._id, 'taken'),
                },
                {
                  text: 'Dismiss',
                  style: 'cancel',
                },
              ]
            );
          }
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [reminders, playVoiceAnnouncement, globalVoiceMuted]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReminders();
  };

  const parseExistingTime = (timeStr) => {
    if (!timeStr) return { h: 8, m: 0, mer: 'AM' };
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return { h: 8, m: 0, mer: 'AM' };

    let rawH = parseInt(match[1], 10) || 8;
    const m = parseInt(match[2], 10) || 0;
    let mer = match[3]?.toUpperCase();

    if (!mer) {
      // 24-hour format
      if (rawH >= 12) {
        mer = 'PM';
        rawH = rawH > 12 ? rawH - 12 : 12;
      } else {
        mer = 'AM';
        rawH = rawH === 0 ? 12 : rawH;
      }
    } else {
      if (rawH > 12) rawH = rawH - 12;
      if (rawH === 0) rawH = 12;
    }

    return {
      h: rawH,
      m: m,
      mer: mer || 'AM',
    };
  };

  const openAddModal = () => {
    setEditingReminder(null);
    setMedicineName('');
    setSelectedDates([getTodayDateStr()]);
    setVoiceMuted(false);
    setHour(8);
    setMinute(0);
    setMeridian('AM');
    setPeriod('After Meal');
    setInstructions('');
    setModalVisible(true);
  };

  const openEditModal = (rem) => {
    setEditingReminder(rem);
    setMedicineName(rem.medicineName || '');
    const dates = rem.selectedDates && rem.selectedDates.length > 0
      ? rem.selectedDates
      : (rem.date ? [rem.date] : [getTodayDateStr()]);
    setSelectedDates(dates);
    setVoiceMuted(!!rem.voiceMuted);
    const parsed = parseExistingTime(rem.time);
    setHour(parsed.h);
    setMinute(parsed.m);
    setMeridian(parsed.mer);
    setPeriod(rem.period || 'After Meal');
    setInstructions(rem.instructions || '');
    setModalVisible(true);
  };

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

  // Calendar helpers
  const toggleDateSelection = (dateStr) => {
    setSelectedDates((prev) => {
      if (prev.includes(dateStr)) {
        const next = prev.filter((d) => d !== dateStr);
        return next;
      } else {
        return [...prev, dateStr].sort();
      }
    });
  };

  const removeSingleDate = (dateStr) => {
    setSelectedDates((prev) => prev.filter((d) => d !== dateStr));
  };

  const selectNextNDays = (n) => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < n; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    setSelectedDates(dates);
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

  // Toggle Mute Per Reminder
  const toggleReminderMute = async (rem) => {
    try {
      const newMuted = !rem.voiceMuted;
      setReminders((prev) =>
        prev.map((r) => (r._id === rem._id ? { ...r, voiceMuted: newMuted } : r))
      );
      await updateReminder(rem._id, { voiceMuted: newMuted });
    } catch (_) {
      loadReminders();
    }
  };

  // Build Calendar grid
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const todayStr = getTodayDateStr();

  const calDaysGrid = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calDaysGrid.push({ key: `pad-${i}`, isEmpty: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(calMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${calYear}-${monthStr}-${dayStr}`;
    const isPast = dateStr < todayStr;
    const isToday = dateStr === todayStr;
    const isSelected = selectedDates.includes(dateStr);

    calDaysGrid.push({
      key: dateStr,
      day,
      dateStr,
      isPast,
      isToday,
      isSelected,
    });
  }

  const handleSave = async () => {
    if (!medicineName.trim()) {
      Alert.alert('Required', 'Please enter a medicine name.');
      return;
    }
    if (selectedDates.length === 0) {
      Alert.alert('Required', 'Please select at least 1 date from the calendar.');
      return;
    }

    const calculatedTime = formatTimeString(hour, minute, meridian);
    const sortedDates = [...selectedDates].sort();
    const primaryDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];

    setSaving(true);
    try {
      const payload = {
        medicineName: medicineName.trim(),
        date: primaryDate,
        selectedDates: sortedDates,
        time: calculatedTime,
        duration: `${sortedDates.length} ${sortedDates.length === 1 ? 'Day' : 'Days'}`,
        endDate: endDate,
        period: period.trim(),
        instructions: instructions.trim(),
        voiceMuted: voiceMuted,
      };

      if (editingReminder?._id) {
        await updateReminder(editingReminder._id, payload);
        Alert.alert('Updated', 'Medicine reminder updated successfully.');
      } else {
        await createReminder(payload);
        Alert.alert('Success', 'Medicine reminder scheduled successfully.');
      }

      setModalVisible(false);
      loadReminders();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      // Optimistic update
      setReminders((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: newStatus } : r))
      );
      await updateReminderStatus(id, newStatus);
    } catch (err) {
      Alert.alert('Error', 'Failed to update reminder status.');
      loadReminders();
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert(
      'Delete Reminder',
      `Are you sure you want to delete the reminder for "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setReminders((prev) => prev.filter((r) => r._id !== id));
              await deleteReminder(id);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete reminder.');
              loadReminders();
            }
          },
        },
      ]
    );
  };

  // Stats
  const totalCount = reminders.length;
  const takenCount = reminders.filter((r) => r.status === 'taken').length;
  const pendingCount = reminders.filter((r) => r.status === 'pending' || !r.status).length;
  const todayCount = reminders.filter((r) => isReminderActiveToday(r, new Date())).length;
  const adherenceRate = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  // Filtered List
  const filteredReminders = reminders.filter((r) => {
    if (filter === 'today') return isReminderActiveToday(r, new Date());
    if (filter === 'pending') return r.status === 'pending' || !r.status;
    if (filter === 'taken') return r.status === 'taken';
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'taken':
        return <Badge label="Taken" variant="success" size="xs" />;
      case 'skipped':
        return <Badge label="Skipped" variant="danger" size="xs" />;
      case 'snoozed':
        return <Badge label="Snoozed" variant="warning" size="xs" />;
      default:
        return <Badge label="Active" variant="primary" size="xs" />;
    }
  };

  const currentTimeFormatted = formatTimeString(hour, minute, meridian);

  return (
    <View style={styles.screen}>
      {saving && <LoadingOverlay message="Saving reminder..." />}

      <FlatList
        data={filteredReminders}
        keyExtractor={(item) => item._id || Math.random().toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Adherence Card */}
            <Card style={styles.summaryCard} padding={16}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryTextCol}>
                  <Text style={styles.summaryTitle}>Today's Adherence</Text>
                  <Text style={styles.summarySubtitle}>
                    {takenCount} of {totalCount} doses taken
                  </Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${adherenceRate}%` }]} />
                  </View>
                </View>
                <View style={styles.adherenceCircle}>
                  <Text style={styles.adherencePercent}>{adherenceRate}%</Text>
                  <Text style={styles.adherenceLabel}>Completed</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <View style={[styles.statDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.statLabel}>Pending: </Text>
                  <Text style={styles.statVal}>{pendingCount}</Text>
                </View>
                <View style={styles.statBox}>
                  <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.statLabel}>Taken: </Text>
                  <Text style={styles.statVal}>{takenCount}</Text>
                </View>
                <View style={styles.statBox}>
                  <View style={[styles.statDot, { backgroundColor: '#6366F1' }]} />
                  <Text style={styles.statLabel}>Active Today: </Text>
                  <Text style={styles.statVal}>{todayCount}</Text>
                </View>
              </View>
            </Card>

            {/* Quick Actions & Global Sound Mute Row */}
            <View style={styles.topActionsRow}>
              <Text style={styles.sectionHeading}>My Doses</Text>
              
              <View style={styles.topRightBtnsRow}>
                {/* Global Sound Mute Button */}
                <TouchableOpacity
                  style={[styles.globalSoundBtn, globalVoiceMuted && styles.globalSoundBtnMuted]}
                  onPress={() => setGlobalVoiceMuted((m) => !m)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={globalVoiceMuted ? 'volume-mute' : 'volume-high'}
                    size={15}
                    color={globalVoiceMuted ? '#EF4444' : colors.primary}
                  />
                  <Text style={[styles.globalSoundBtnText, globalVoiceMuted && styles.globalSoundBtnTextMuted]}>
                    {globalVoiceMuted ? 'Voice Muted' : 'Voice On'}
                  </Text>
                </TouchableOpacity>

                {/* Add Reminder Button */}
                <TouchableOpacity style={styles.addDoseBtn} onPress={openAddModal} activeOpacity={0.8}>
                  <Ionicons name="add-circle" size={18} color={colors.white} />
                  <Text style={styles.addDoseBtnText}>Add Reminder</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {[
                { id: 'all', label: `All (${totalCount})` },
                { id: 'today', label: `Today (${todayCount})` },
                { id: 'pending', label: `Pending (${pendingCount})` },
                { id: 'taken', label: `Taken (${takenCount})` },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.filterChip, filter === tab.id && styles.filterChipActive]}
                  onPress={() => setFilter(tab.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, filter === tab.id && styles.filterChipTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => {
          const isTaken = item.status === 'taken';
          const isSpeaking = speakingId === item._id;
          const datesCount = item.selectedDates?.length || (item.date ? 1 : 0);
          const firstDateStr = item.selectedDates?.[0] || item.date;

          return (
            <Card style={[styles.reminderCard, isTaken && styles.reminderCardTaken]} padding={16}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconBox}>
                  <Ionicons
                    name={isTaken ? 'checkmark-done-circle' : 'medical'}
                    size={22}
                    color={isTaken ? '#10B981' : colors.primary}
                  />
                </View>

                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.medName, isTaken && styles.medNameTaken]}>{item.medicineName}</Text>
                    {getStatusBadge(item.status)}
                  </View>

                  <View style={styles.metaRow}>
                    {/* Date badge */}
                    <View style={styles.dateBadge}>
                      <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                      <Text style={styles.dateBadgeText}>
                        {datesCount > 1
                          ? `${datesCount} Dates (${formatDateShort(firstDateStr)}...)`
                          : formatDateFull(firstDateStr)}
                      </Text>
                    </View>

                    {/* Time */}
                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.timeText}>{item.time || 'Anytime'}</Text>
                      {item.period ? (
                        <>
                          <Text style={styles.dotSeparator}>•</Text>
                          <Text style={styles.periodText}>{item.period}</Text>
                        </>
                      ) : null}
                    </View>

                    {/* Voice Mute Status Badge */}
                    {item.voiceMuted ? (
                      <View style={styles.muteBadge}>
                        <Ionicons name="volume-mute" size={11} color="#EF4444" />
                        <Text style={styles.muteBadgeText}>Muted</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Dates Preview Chips */}
                  {item.selectedDates && item.selectedDates.length > 1 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardDateChipsRow}>
                      {item.selectedDates.slice(0, 6).map((d) => (
                        <View key={d} style={styles.cardDateChip}>
                          <Text style={styles.cardDateChipText}>{formatDateShort(d)}</Text>
                        </View>
                      ))}
                      {item.selectedDates.length > 6 ? (
                        <View style={styles.cardDateChipMore}>
                          <Text style={styles.cardDateChipMoreText}>+{item.selectedDates.length - 6} more</Text>
                        </View>
                      ) : null}
                    </ScrollView>
                  ) : null}

                  {item.instructions ? (
                    <Text style={styles.instructionsText}>
                      <Ionicons name="information-circle-outline" size={12} color={colors.textMuted} />{' '}
                      {item.instructions}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.cardActions}>
                <View style={styles.leftActionsRow}>
                  {!isTaken ? (
                    <TouchableOpacity
                      style={styles.takeBtn}
                      onPress={() => handleStatusChange(item._id, 'taken')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
                      <Text style={styles.takeBtnText}>Mark as Taken</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.undoBtn}
                      onPress={() => handleStatusChange(item._id, 'pending')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="refresh-outline" size={14} color={colors.textMuted} />
                      <Text style={styles.undoBtnText}>Undo</Text>
                    </TouchableOpacity>
                  )}

                  {/* Voice Notification / Play Button */}
                  <TouchableOpacity
                    style={[styles.voiceBtn, isSpeaking && styles.voiceBtnActive]}
                    onPress={() => handleCardVoicePlay(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
                      size={15}
                      color={isSpeaking ? colors.white : colors.primary}
                    />
                    <Text style={[styles.voiceBtnText, isSpeaking && styles.voiceBtnTextActive]}>
                      {isSpeaking ? 'Playing...' : 'Voice'}
                    </Text>
                  </TouchableOpacity>

                  {/* Quick Card-Level Mute / Unmute Button */}
                  <TouchableOpacity
                    style={[styles.cardMuteBtn, item.voiceMuted && styles.cardMuteBtnActive]}
                    onPress={() => toggleReminderMute(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={item.voiceMuted ? 'volume-mute' : 'volume-high-outline'}
                      size={14}
                      color={item.voiceMuted ? '#EF4444' : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.rightActionsRow}>
                  {!isTaken && (
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handleStatusChange(item._id, 'skipped')}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionIconBtn} onPress={() => openEditModal(item)}>
                    <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleDelete(item._id, item.medicineName)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="alarm-outline"
              title="No reminders found"
              message="Keep track of your daily medicines and doses on time."
              action={
                <Button
                  title="Create Reminder"
                  onPress={openAddModal}
                />
              }
            />
          )
        }
      />

      {/* Main Add / Edit Reminder Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReminder ? 'Edit Reminder' : 'New Medicine Reminder'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* Medicine Name */}
              <Text style={styles.fieldLabel}>Medicine Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Paracetamol 500mg"
                placeholderTextColor={colors.textMuted}
                value={medicineName}
                onChangeText={setMedicineName}
              />

              {/* Calendar Picker Button */}
              <View style={styles.dateHeaderRow}>
                <Text style={styles.fieldLabel}>Reminder Dates *</Text>
                <Text style={styles.dateCountBadgeText}>
                  {selectedDates.length} {selectedDates.length === 1 ? 'Day' : 'Days'} Selected
                </Text>
              </View>

              <TouchableOpacity
                style={styles.openCalendarBtn}
                onPress={() => setCalendarModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.calendarBtnLeft}>
                  <View style={styles.calendarIconCircle}>
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.calendarBtnTextCol}>
                    <Text style={styles.calendarBtnTitle}>
                      {selectedDates.length === 0
                        ? 'Tap to Select Dates'
                        : `${selectedDates.length} ${selectedDates.length === 1 ? 'Date' : 'Dates'} Selected`}
                    </Text>
                    <Text style={styles.calendarBtnSub}>
                      {selectedDates.length === 0
                        ? 'Open calendar to select medicine dates'
                        : selectedDates.slice(0, 3).map((d) => formatDateShort(d)).join(', ') +
                          (selectedDates.length > 3 ? ` +${selectedDates.length - 3} more` : '')}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Selected Dates Horizontal Chips with Unselect cross (×) */}
              {selectedDates.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.selectedDatesScroll}
                >
                  {selectedDates.map((d) => (
                    <View key={d} style={styles.selectedDatePill}>
                      <Text style={styles.selectedDatePillText}>{formatDateShort(d)}</Text>
                      <TouchableOpacity
                        onPress={() => removeSingleDate(d)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={styles.pillCloseBtn}
                      >
                        <Ionicons name="close" size={13} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : null}

              {/* Reminder Time (Common for all selected dates) */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Reminder Time (Common For All Dates)</Text>
              <View style={styles.timeAdjusterCard}>
                <View style={styles.timeDisplayBlock}>
                  <Text style={styles.timeAdjusterHeader}>Time of Intake</Text>
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

              {/* Voice Notification & Mute Setting */}
              <View style={styles.muteToggleCard}>
                <View style={styles.muteToggleLeft}>
                  <View style={[styles.muteIconBox, voiceMuted && styles.muteIconBoxMuted]}>
                    <Ionicons
                      name={voiceMuted ? 'volume-mute' : 'volume-high'}
                      size={18}
                      color={voiceMuted ? '#EF4444' : '#8B5CF6'}
                    />
                  </View>
                  <View style={styles.muteToggleTextCol}>
                    <Text style={styles.muteToggleTitle}>
                      {voiceMuted ? 'Voice Notification Muted' : 'Voice Notification Enabled'}
                    </Text>
                    <Text style={styles.muteToggleSub}>
                      {voiceMuted
                        ? 'Voice speech will be muted. Notification pop-up message will still appear on time.'
                        : 'App will speak aloud: "It\'s time to take your medicine" along with the on-screen alert.'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={!voiceMuted}
                  onValueChange={(val) => setVoiceMuted(!val)}
                  trackColor={{ false: '#E2E8F0', true: colors.primary + '60' }}
                  thumbColor={!voiceMuted ? colors.primary : '#94A3B8'}
                />
              </View>

              {/* Meal Timing Section (Clean Medical Presets) */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Meal Timing</Text>
              <View style={styles.mealTimingGrid}>
                {MEAL_TIMING_OPTIONS.map((opt) => {
                  const isSelected =
                    period === opt.id ||
                    (period === 'After Food' && opt.id === 'After Meal') ||
                    (period === 'Before Food' && opt.id === 'Before Meal');

                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.mealTimingCard, isSelected && styles.mealTimingCardActive]}
                      onPress={() => setPeriod(opt.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.mealTimingTopRow}>
                        <Ionicons
                          name={opt.icon}
                          size={15}
                          color={isSelected ? colors.white : colors.primary}
                        />
                        <Text style={[styles.mealTimingTitle, isSelected && styles.mealTimingTextActive]}>
                          {opt.label}
                        </Text>
                      </View>
                      <Text style={[styles.mealTimingDesc, isSelected && styles.mealTimingDescActive]}>
                        {opt.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>{editingReminder ? 'Update' : 'Set Reminder'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

            {/* Quick Helper Chips */}
            <View style={styles.calQuickRow}>
              <TouchableOpacity
                style={styles.calQuickChip}
                onPress={() => setSelectedDates([getTodayDateStr()])}
              >
                <Text style={styles.calQuickChipText}>Today Only</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calQuickChip}
                onPress={() => selectNextNDays(7)}
              >
                <Text style={styles.calQuickChipText}>+7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calQuickChip}
                onPress={() => selectNextNDays(14)}
              >
                <Text style={styles.calQuickChipText}>+14 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calQuickChip}
                onPress={() => setSelectedDates([])}
              >
                <Text style={[styles.calQuickChipText, { color: '#EF4444' }]}>Clear</Text>
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
                    ]}
                    onPress={() => toggleDateSelection(item.dateStr)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.calCellText,
                        item.isSelected && styles.calCellTextSelected,
                        item.isToday && !item.isSelected && styles.calCellTextToday,
                      ]}
                    >
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer Summary & Confirm */}
            <View style={styles.calFooter}>
              <Text style={styles.calFooterCount}>
                {selectedDates.length} {selectedDates.length === 1 ? 'date' : 'dates'} selected
              </Text>
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
  listContent: { padding: spacing.base },
  headerContainer: { marginBottom: spacing.md },

  summaryCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTextCol: { flex: 1, paddingRight: 12 },
  summaryTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  summarySubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  adherenceCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  adherencePercent: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  adherenceLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontSize: typography.fontSizes.xs, color: colors.textMuted },
  statVal: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.bold, color: colors.text },

  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  sectionHeading: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  topRightBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  globalSoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  globalSoundBtnMuted: {
    borderColor: '#EF4444' + '50',
    backgroundColor: '#FEF2F2',
  },
  globalSoundBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  globalSoundBtnTextMuted: {
    color: '#EF4444',
  },
  addDoseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  addDoseBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.white,
  },

  filterScroll: { gap: 8, paddingVertical: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeights.semibold,
  },

  reminderCard: {
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  reminderCardTaken: {
    opacity: 0.8,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  medName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    flex: 1,
    paddingRight: 8,
  },
  medNameTaken: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  muteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  muteBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: '#EF4444',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  dotSeparator: { color: colors.textMuted, fontSize: 10 },
  periodText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  cardDateChipsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  cardDateChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  cardDateChipText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  cardDateChipMore: {
    backgroundColor: colors.primary + '14',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  cardDateChipMoreText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  instructionsText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 6,
  },

  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  leftActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  takeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  takeBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.white,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  undoBtnText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  voiceBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#7C3AED',
  },
  voiceBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  voiceBtnTextActive: {
    color: colors.white,
  },
  cardMuteBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMuteBtnActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBtn: {
    padding: 4,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    maxHeight: '94%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalContent: {
    paddingBottom: 28,
  },
  fieldLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  dateCountBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },

  /* Open Calendar Button */
  openCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    borderRadius: radius.xl,
    padding: 12,
    marginBottom: 8,
  },
  calendarBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  calendarIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarBtnTextCol: {
    flex: 1,
  },
  calendarBtnTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  calendarBtnSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  selectedDatesScroll: {
    gap: 6,
    paddingVertical: 2,
    marginBottom: 8,
  },
  selectedDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  selectedDatePillText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  pillCloseBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
  },
  textArea: {
    height: 65,
    textAlignVertical: 'top',
  },

  /* Interactive Time Stepper */
  timeAdjusterCard: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 14,
    gap: 12,
    marginBottom: 8,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
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

  /* Mute Toggle Card in Modal */
  muteToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  muteToggleLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  muteIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  muteIconBoxMuted: {
    backgroundColor: '#FEE2E2',
  },
  muteToggleTextCol: {
    flex: 1,
  },
  muteToggleTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  muteToggleSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 14,
  },

  /* Meal Timing Grid */
  mealTimingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  mealTimingCard: {
    width: '48%',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 10,
    gap: 2,
  },
  mealTimingCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mealTimingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealTimingTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  mealTimingDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  mealTimingTextActive: {
    color: colors.white,
  },
  mealTimingDescActive: {
    color: 'rgba(255,255,255,0.85)',
  },

  /* Dosage Instructions & Suggestions */
  instructionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  instructionHelp: {
    fontSize: 10,
    color: colors.textMuted,
  },
  suggestionChipsScroll: {
    gap: 6,
    paddingVertical: 2,
    marginBottom: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  suggestionChipText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },

  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
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
  calQuickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: 4,
  },
  calQuickChip: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  calQuickChipText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
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
