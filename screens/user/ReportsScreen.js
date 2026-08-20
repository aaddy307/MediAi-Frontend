import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
  Platform,
  Modal,
  Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getReports, uploadReport, deleteReport } from '../../api/reports';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';

const TYPE_ICONS = {
  pdf: 'document-text',
  image: 'image',
  lab: 'flask',
  radiology: 'scan-circle',
  default: 'document',
};

function resolveFileUrl(rawUrl) {
  if (!rawUrl) return null;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  const host =
    Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : '192.168.41.130';
  const clean = rawUrl.startsWith('/') ? rawUrl.slice(1) : rawUrl;
  return `http://${host}:5000/${clean}`;
}

function ReportCard({ report, onDelete, onView }) {
  const isImage = report.fileType === 'image' || report.type === 'image';
  const isPdf = report.fileType === 'pdf' || report.type === 'pdf';
  const icon = isPdf ? 'document-text' : isImage ? 'image' : 'document';
  const title = report.title || report.name || report.fileName || 'Medical Document';

  return (
    <Card style={styles.reportCard} padding={14}>
      <View style={styles.reportRow}>
        <View style={[styles.reportIcon, isPdf ? styles.pdfIconBg : styles.imgIconBg]}>
          <Ionicons
            name={icon}
            size={24}
            color={isPdf ? '#DC2626' : colors.primary}
          />
        </View>
        <View style={styles.reportInfo}>
          <Text style={styles.reportName} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.badgeRow}>
            <Badge
              label={isPdf ? 'PDF DOCUMENT' : 'IMAGE'}
              variant={isPdf ? 'danger' : 'primary'}
              size="xs"
            />
            <Text style={styles.reportDate}>
              {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          {report.summary && report.summary !== 'Medical Document' && (
            <Text style={styles.reportDesc} numberOfLines={1}>
              {report.summary}
            </Text>
          )}
        </View>
        <View style={styles.reportActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onView} activeOpacity={0.7}>
            <Ionicons name="eye-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 16);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [previewModal, setPreviewModal] = useState(null); // image url to preview

  const load = useCallback(async () => {
    try {
      const data = await getReports();
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.reports) ? data.reports : [];
      setReports(list);
    } catch (_) {
      setReports([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const originalName = asset.name || '';
      const ext = (originalName.split('.').pop() || '').toLowerCase();
      const mime = (asset.mimeType || '').toLowerCase();

      const isPdf = mime.includes('pdf') || ext === 'pdf';
      const isImage = mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

      // Strict validation: Only Images and PDFs allowed
      if (!isPdf && !isImage) {
        Alert.alert(
          'Invalid Format',
          'Only PDF documents and Images (JPG, PNG, WEBP) are allowed. Please select a valid medical file.'
        );
        return;
      }

      setUploading(true);

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob();
        formData.append('file', blob, originalName || (isPdf ? 'report.pdf' : 'report.jpg'));
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: originalName || (isPdf ? 'report.pdf' : 'report.jpg'),
          type: asset.mimeType || (isPdf ? 'application/pdf' : 'image/jpeg'),
        });
      }
      formData.append('name', originalName || 'Medical Report');

      await uploadReport(formData);
      Alert.alert('Upload Successful 🎉', 'Your medical document has been securely saved to your health vault.');
      await load();
    } catch (err) {
      console.log('Upload report error:', err.response?.data || err.message);
      Alert.alert(
        'Upload Failed',
        err.response?.data?.message || err.message || 'Could not upload report. Please check the file and try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Report', 'Are you sure you want to remove this medical document from your vault?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReport(id);
            setReports((prev) => prev.filter((r) => r._id !== id));
          } catch {
            Alert.alert('Error', 'Could not delete report.');
          }
        },
      },
    ]);
  };

  const handleView = (url) => {
    if (!url) {
      Alert.alert('Error', 'File link is not available.');
      return;
    }
    const fullUrl = resolveFileUrl(url);
    const ext = (fullUrl.split('.').pop() || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      setPreviewModal(fullUrl);
    } else {
      Linking.openURL(fullUrl).catch(() =>
        Alert.alert('Open File', `Could not open file directly. File URL:\n${fullUrl}`)
      );
    }
  };

  return (
    <View style={styles.screen}>
      {uploading && <LoadingOverlay message="Uploading medical document…" />}

      {/* Info notice bar */}
      <View style={styles.infoBanner}>
        <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
        <Text style={styles.infoBannerText}>
          Allowed formats: <Text style={{ fontWeight: '700' }}>PDF, JPG, PNG, WEBP</Text>. Stored securely.
        </Text>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(r) => r._id}
        renderItem={({ item }) => (
          <ReportCard
            report={item}
            onDelete={() => handleDelete(item._id)}
            onView={() => handleView(item.fileUrl)}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 30 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload} activeOpacity={0.85}>
            <LinearGradient colors={gradients.primary} style={styles.uploadBtnGrad}>
              <Ionicons name="cloud-upload" size={20} color={colors.white} />
              <Text style={styles.uploadBtnText}>+ Upload Report (PDF / Image)</Text>
            </LinearGradient>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="document-text-outline"
              title="No Reports Uploaded"
              message="Upload your prescriptions, lab tests, or scan results (PDF / JPG / PNG) to keep them organized."
              actionLabel="Upload Medical Document"
              onAction={handleUpload}
            />
          )
        }
      />

      {/* Image Preview Modal */}
      <Modal visible={Boolean(previewModal)} transparent animationType="fade" onRequestClose={() => setPreviewModal(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setPreviewModal(null)}>
            <Ionicons name="close-circle" size={32} color={colors.white} />
          </TouchableOpacity>
          {previewModal ? (
            <Image source={{ uri: previewModal }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoBannerText: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, flex: 1 },

  list: { padding: spacing.base, gap: 12 },
  uploadBtn: { borderRadius: radius.xl, overflow: 'hidden', marginBottom: 12, ...shadows.primary },
  uploadBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.xl,
  },
  uploadBtnText: { color: colors.white, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold },

  reportCard: { borderWidth: 1.5, borderColor: colors.border, ...shadows.sm },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfIconBg: { backgroundColor: '#FEE2E2' },
  imgIconBg: { backgroundColor: colors.primaryGlow },

  reportInfo: { flex: 1, gap: 3 },
  reportName: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.text },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  reportDate: { fontSize: 11, color: colors.textMuted },
  reportDesc: { fontSize: typography.fontSizes.xs, color: colors.textSecondary },

  reportActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteBtn: { borderColor: colors.danger + '33' },

  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  closePreviewBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  previewImage: { width: '100%', height: '80%', borderRadius: radius.lg },
});
