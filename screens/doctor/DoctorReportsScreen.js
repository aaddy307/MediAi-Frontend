import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDoctorReports, createDraftReport, updateReportStatus } from '../../api/reports';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import LoadingOverlay from '../../components/ui/LoadingOverlay';

export default function DoctorReportsScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newPrescription, setNewPrescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getDoctorReports();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.reports) ? data.reports : [];
      setReports(list);
    } catch (err) {
      console.log('Error loading doctor reports:', err.message);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleApproveReport = async (id) => {
    try {
      await updateReportStatus(id, 'Approved');
      setReports((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: 'Approved' } : r))
      );
      Alert.alert('Report Approved', 'Medical report is verified and visible to the patient.');
    } catch (err) {
      Alert.alert('Error', 'Failed to approve report');
    }
  };

  const handleCreateReport = async () => {
    if (!newTitle.trim() || !newSummary.trim()) {
      Alert.alert('Missing Details', 'Please provide a title and medical summary.');
      return;
    }
    setSubmitting(true);
    try {
      await createDraftReport({
        title: newTitle.trim(),
        summary: newSummary.trim(),
        prescription: newPrescription.trim(),
      });
      setModalVisible(false);
      setNewTitle('');
      setNewSummary('');
      setNewPrescription('');
      load();
      Alert.alert('Report Created', 'Draft report created successfully.');
    } catch (err) {
      Alert.alert('Error', 'Could not create report');
    } finally {
      setSubmitting(false);
    }
  };

  const renderReport = ({ item }) => {
    const isApproved = item.status === 'Approved' || item.status === 'Sent to Patient';

    return (
      <Card style={styles.card} padding={16}>
        <View style={styles.cardTop}>
          <View style={styles.reportIcon}>
            <Ionicons name="document-text" size={20} color={colors.primary} />
          </View>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>{item.title}</Text>
            <Text style={styles.patientName}>
              Patient: {item.patient?.fullName || item.patient?.name || 'Patient'}
            </Text>
          </View>
          <Badge
            label={item.status || 'Draft'}
            variant={isApproved ? 'success' : 'warning'}
            dot
          />
        </View>

        <Text style={styles.summaryText} numberOfLines={3}>
          {item.summary}
        </Text>

        {item.prescription ? (
          <View style={styles.rxBox}>
            <Text style={styles.rxLabel}>Prescription Notes:</Text>
            <Text style={styles.rxContent}>{item.prescription}</Text>
          </View>
        ) : null}

        {!isApproved && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => handleApproveReport(item._id)}
            >
              <Ionicons name="shield-checkmark" size={14} color={colors.white} />
              <Text style={styles.approveText}>Verify & Send to Patient</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.screen}>
      {loading && <LoadingOverlay message="Loading reports..." />}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Medical Reports</Text>
          <Text style={styles.subtitle}>Review, verify, and draft health records</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item._id}
        renderItem={renderReport}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="document-text-outline"
              title="No Reports"
              message="No medical reports created yet."
            />
          )
        }
      />

      {/* Modal for drafting new report */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Card style={styles.modalCard} padding={20}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Draft Medical Report</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Report Title (e.g. Blood Test Analysis)"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Clinical Summary & Findings..."
              placeholderTextColor={colors.textMuted}
              value={newSummary}
              onChangeText={setNewSummary}
              multiline
              numberOfLines={4}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Prescription & Dosage Guidance..."
              placeholderTextColor={colors.textMuted}
              value={newPrescription}
              onChangeText={setNewPrescription}
              multiline
              numberOfLines={3}
            />

            <Button
              title="Create Report Draft"
              onPress={handleCreateReport}
              loading={submitting}
              style={{ marginTop: 10 }}
            />
          </Card>
        </KeyboardAvoidingView>
      </Modal>
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
  subtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primary,
  },
  list: {
    padding: spacing.base,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportHeader: {
    flex: 1,
  },
  reportTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  patientName: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  rxBox: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  rxLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  rxContent: {
    fontSize: typography.fontSizes.xs,
    color: colors.text,
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 6,
  },
  approveText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.base,
  },
  modalCard: {
    gap: 14,
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
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: typography.fontSizes.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});
