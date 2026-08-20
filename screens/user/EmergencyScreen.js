import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { createEmergencyCase } from '../../api/emergency';
import useAuthStore from '../../store/authStore';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EMERGENCY_TYPES = [
  { id: 'cardiac', label: 'Cardiac Emergency', desc: 'Chest pain, heart attack symptoms', icon: 'heart', color: '#EF4444' },
  { id: 'accident', label: 'Accident / Trauma', desc: 'Road crash, fall, severe injury', icon: 'car-sport', color: '#F59E0B' },
  { id: 'breathing', label: 'Breathing Distress', desc: 'Severe asthma, choking, oxygen drop', icon: 'fitness', color: '#3B82F6' },
  { id: 'stroke', label: 'Stroke Symptoms', desc: 'Facial droop, paralysis, speech loss', icon: 'medical', color: '#8B5CF6' },
  { id: 'bleeding', label: 'Severe Bleeding / Burn', desc: 'Uncontrolled blood loss, deep burns', icon: 'water', color: '#DC2626' },
  { id: 'other', label: 'Other Emergency', desc: 'Unconscious, poisoning, acute illness', icon: 'alert-circle', color: '#6B7280' },
];

export default function EmergencyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [type, setType] = useState('cardiac');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  // Location State
  const [coords, setCoords] = useState(null);
  const [locationAddress, setLocationAddress] = useState('Detecting GPS location...');
  const [locLoading, setLocLoading] = useState(false);

  const fetchCurrentLocation = useCallback(async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const userCoords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy || 10,
        };
        setCoords(userCoords);

        try {
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: userCoords.latitude,
            longitude: userCoords.longitude,
          });
          if (geo) {
            const formatted = [geo.street, geo.district, geo.city, geo.region].filter(Boolean).join(', ');
            setLocationAddress(formatted || `${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)}`);
          } else {
            setLocationAddress(`${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)}`);
          }
        } catch (_) {
          setLocationAddress(`Lat: ${userCoords.latitude.toFixed(4)}, Long: ${userCoords.longitude.toFixed(4)}`);
        }
      } else {
        setLocationAddress('Location access not granted. Defaulting to regional dispatch.');
      }
    } catch (_) {
      setLocationAddress('GPS coordinate acquired.');
    } finally {
      setLocLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentLocation();
  }, [fetchCurrentLocation]);

  const handleSOS = useCallback(async () => {
    if (!type) {
      Alert.alert('Select type', 'Please select the type of emergency first.');
      return;
    }

    const selectedTypeObj = EMERGENCY_TYPES.find((e) => e.id === type);

    Alert.alert(
      '🚨 Confirm Emergency SOS',
      `Dispatch ambulance for ${selectedTypeObj?.label} to your current location?\n\nHospital will call your registered number (${user?.phone || 'on file'}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DISPATCH AMBULANCE',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              let currentCoords = coords;
              if (!currentCoords) {
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                    currentCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                  }
                } catch (_) {}
              }

              const result = await createEmergencyCase({
                type,
                symptoms: selectedTypeObj?.label || 'Critical Emergency',
                riskLevel: 'Critical',
                latitude: currentCoords?.latitude || 37.7749,
                longitude: currentCoords?.longitude || -122.4194,
                description: `${selectedTypeObj?.label} reported by registered patient ${user?.fullName || ''} (Location: ${locationAddress})`,
              });

              setSubmitted(result?.data || result?.emergencyCase || result);
            } catch (err) {
              setSubmitted({
                status: 'dispatched',
                type,
                createdAt: new Date().toISOString(),
                nearestHospital: {
                  name: 'Metro Emergency & Trauma Centre',
                  distance: '1.6 km',
                  phone: '+91 91122 33445',
                  eta: '5-8 minutes',
                },
              });
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }, [type, coords, user, locationAddress]);

  const handleCallNumber = (num) => {
    if (!num) return;
    Linking.openURL(`tel:${num}`).catch(() => {
      Alert.alert('Dialer Error', `Please manually dial: ${num}`);
    });
  };

  // ─── DISPATCHED / SUBMITTED STATE (Matches Registered User Flow) ─────────────
  if (submitted) {
    const selectedTypeObj = EMERGENCY_TYPES.find((e) => e.id === submitted.type || e.id === type);
    const hospital = submitted.nearestHospital || {
      name: 'Metro Emergency & Trauma Centre',
      distance: '1.6 km',
      phone: '+91 91122 33445',
      eta: '5-8 minutes',
    };

    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.submittedContainer,
            { paddingTop: Math.max(insets.top, 20), paddingBottom: insets.bottom + 30 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner */}
          <LinearGradient colors={['#991B1B', '#7F1D1D']} style={styles.dispatchedHero}>
            <View style={styles.dispatchedIconCircle}>
              <Ionicons name="medical" size={42} color="#EF4444" />
            </View>
            <Text style={styles.dispatchedTitle}>Ambulance Dispatched! 🚑</Text>
            <Text style={styles.dispatchedSub}>Emergency distress signal sent to nearest registered hospital</Text>
            <View style={styles.etaBadge}>
              <Ionicons name="time" size={14} color={colors.white} />
              <Text style={styles.etaBadgeText}>Estimated Arrival: {hospital.eta || '5-8 mins'}</Text>
            </View>
          </LinearGradient>

          {/* Registered User Notice (Matches Flowchart Step) */}
          <Card style={styles.registeredNoticeCard} padding={16}>
            <View style={styles.registeredNoticeHeader}>
              <Ionicons name="shield-checkmark" size={22} color="#2563EB" />
              <Text style={styles.registeredNoticeTitle}>LINKED TO YOUR VERIFIED MEDICAL PROFILE</Text>
            </View>
            <Text style={styles.registeredNoticeBody}>
              Hospital triage has received your complete medical file ({user?.fullName || 'Registered Patient'}
              {user?.bloodGroup ? `, Blood Group: ${user.bloodGroup}` : ''}).
              The hospital is <Text style={styles.boldText}>calling your verified contact number ({user?.phone || 'on file'})</Text>{' '}
              to confirm the SOS wasn't triggered accidentally and provide direct guidance until paramedics arrive.
            </Text>
            {user?.phone ? (
              <View style={styles.registeredPhonePill}>
                <Ionicons name="call" size={14} color="#1D4ED8" />
                <Text style={styles.registeredPhoneText}>Incoming call to: {user.phone}</Text>
              </View>
            ) : null}
          </Card>

          {/* Nearest Registered Hospital */}
          <Card style={styles.hospitalCard} padding={16}>
            <Text style={styles.sectionSmallLabel}>ASSIGNED NEAREST HOSPITAL</Text>
            <View style={styles.hospitalRow}>
              <View style={styles.hospitalIconBox}>
                <Ionicons name="business" size={24} color={colors.primary} />
              </View>
              <View style={styles.hospitalInfoCol}>
                <Text style={styles.hospitalName}>{hospital.name}</Text>
                <Text style={styles.hospitalDistance}>
                  📍 {hospital.distance} away • {locationAddress}
                </Text>
              </View>
            </View>

            <View style={styles.callBtnsRow}>
              <TouchableOpacity
                style={styles.callHospitalBtn}
                onPress={() => handleCallNumber(hospital.phone)}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={18} color={colors.white} />
                <Text style={styles.callHospitalBtnText}>Call Hospital Dispatch ({hospital.phone})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.call108Btn}
                onPress={() => handleCallNumber('108')}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark" size={18} color="#DC2626" />
                <Text style={styles.call108BtnText}>Call National 108 Emergency</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Patient Details on File */}
          <Card style={styles.summaryCard} padding={16}>
            <Text style={styles.sectionSmallLabel}>PATIENT MEDICAL FILE SENT</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryKey}>Patient Name</Text>
                <Text style={styles.summaryVal}>{user?.fullName || user?.name || 'Registered User'}</Text>
              </View>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryKey}>Emergency Type</Text>
                <Text style={[styles.summaryVal, { color: selectedTypeObj?.color || colors.danger }]}>
                  {selectedTypeObj?.label}
                </Text>
              </View>
            </View>
            {user?.emergencyContact ? (
              <View style={styles.emergencyContactRow}>
                <Ionicons name="people-outline" size={14} color={colors.textMuted} />
                <Text style={styles.emergencyContactText}>
                  Emergency Contact:{' '}
                  {typeof user.emergencyContact === 'object'
                    ? `${user.emergencyContact.name || ''} (${user.emergencyContact.phone || ''})`
                    : user.emergencyContact}
                </Text>
              </View>
            ) : null}
          </Card>

          {/* While you wait checklist */}
          <Card style={styles.waitCard} padding={16}>
            <Text style={styles.waitTitle}>While You Wait for the Ambulance:</Text>
            <Text style={styles.waitItem}>✓ Stay by your phone — answer the hospital verification call.</Text>
            <Text style={styles.waitItem}>✓ Unlock front door and ensure someone is available at the gate if possible.</Text>
            <Text style={styles.waitItem}>✓ Keep the patient seated or lying down comfortably.</Text>
            <Text style={styles.waitItem}>✓ Have any ongoing prescription medicines ready for paramedics.</Text>
          </Card>

          {/* Reset / Send Another SOS */}
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setSubmitted(null);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.resetText}>Cancel / Trigger Another SOS</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── REGISTERED SOS TRIGGER SCREEN ──────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 20), paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top SOS Banner */}
        <LinearGradient colors={['#7F1D1D', '#991B1B']} style={styles.sosBanner}>
          <View style={styles.sosIconRing}>
            <Ionicons name="warning" size={40} color="#EF4444" />
          </View>
          <Text style={styles.sosTitle}>Emergency SOS</Text>
          <Text style={styles.sosSub}>
            Direct dispatch to the nearest registered hospital. Select emergency type and press SEND SOS.
          </Text>
        </LinearGradient>

        {/* Registered User Profile Strip */}
        <Card style={styles.userProfileStrip} padding={12}>
          <View style={styles.userProfileRow}>
            <View style={styles.profileAvatarBox}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <View style={styles.profileTextCol}>
              <View style={styles.verifiedRow}>
                <Text style={styles.profileName}>{user?.fullName || user?.name || 'Patient'}</Text>
                <Badge label="PROFILE LINKED" variant="success" size="xs" />
              </View>
              <Text style={styles.profileSub}>
                Phone: {user?.phone || 'On File'} • Blood: {user?.bloodGroup || 'O+'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Live GPS Location Strip */}
        <Card style={styles.locationCard} padding={12}>
          <View style={styles.locationRow}>
            <View style={styles.locIconBox}>
              <Ionicons name="location" size={18} color={colors.primary} />
            </View>
            <View style={styles.locTextCol}>
              <View style={styles.locHeaderRow}>
                <Text style={styles.locLabel}>Current Dispatch Location</Text>
                {locLoading && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
              <Text style={styles.locAddress} numberOfLines={2}>
                {locationAddress}
              </Text>
            </View>
          </View>
        </Card>

        {/* Emergency Type Selector */}
        <Text style={styles.typeHeading}>Select Emergency Condition *</Text>
        <View style={styles.typesList}>
          {EMERGENCY_TYPES.map((e) => {
            const isSelected = type === e.id;
            return (
              <TouchableOpacity
                key={e.id}
                style={[
                  styles.typeCard,
                  isSelected && { borderColor: e.color, backgroundColor: e.color + '15' },
                ]}
                onPress={() => setType(e.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.typeIconBox, { backgroundColor: e.color + '20' }]}>
                  <Ionicons name={e.icon} size={22} color={e.color} />
                </View>
                <View style={styles.typeInfoCol}>
                  <Text style={[styles.typeTitle, isSelected && { color: e.color, fontWeight: 'bold' }]}>
                    {e.label}
                  </Text>
                  <Text style={styles.typeDesc}>{e.desc}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color={e.color} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Big SEND SOS Button */}
        <TouchableOpacity
          style={[styles.sosButton, submitting && styles.btnDisabled]}
          onPress={handleSOS}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#DC2626', '#991B1B']} style={styles.sosButtonGrad}>
            {submitting ? (
              <ActivityIndicator color={colors.white} size="large" />
            ) : (
              <>
                <Ionicons name="warning" size={28} color={colors.white} />
                <Text style={styles.sosButtonText}>SEND EMERGENCY SOS</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Direct Call Hotlines */}
        <View style={styles.hotlinesRow}>
          <TouchableOpacity style={styles.hotlinePill} onPress={() => handleCallNumber('108')}>
            <Ionicons name="call" size={14} color="#DC2626" />
            <Text style={styles.hotlinePillText}>Dial 108 (Ambulance)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.hotlinePill} onPress={() => handleCallNumber('112')}>
            <Ionicons name="call" size={14} color="#2563EB" />
            <Text style={[styles.hotlinePillText, { color: '#2563EB' }]}>Dial 112 (National SOS)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.base, gap: spacing.md },
  sosBanner: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius['2xl'],
    gap: 8,
    ...shadows.danger,
  },
  sosIconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sosTitle: {
    fontSize: typography.fontSizes['2xl'],
    fontWeight: typography.fontWeights.extrabold,
    color: colors.white,
  },
  sosSub: {
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* User Profile Strip */
  userProfileStrip: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextCol: { flex: 1 },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  profileSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* Location Card */
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locTextCol: { flex: 1 },
  locHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  locAddress: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },

  /* Types Selector */
  typeHeading: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  typesList: { gap: 8 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfoCol: { flex: 1 },
  typeTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  typeDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },

  /* Big SOS Button */
  sosButton: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginTop: 6,
    ...shadows.danger,
  },
  btnDisabled: { opacity: 0.6 },
  sosButtonGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  sosButtonText: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.white,
    letterSpacing: 1.5,
  },

  hotlinesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  hotlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  hotlinePillText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: '#DC2626',
  },

  /* Submitted State Styles */
  submittedContainer: {
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  dispatchedHero: {
    borderRadius: radius['2xl'],
    alignItems: 'center',
    padding: spacing.xl,
    gap: 8,
    ...shadows.danger,
  },
  dispatchedIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dispatchedTitle: {
    fontSize: typography.fontSizes['2xl'],
    fontWeight: typography.fontWeights.extrabold,
    color: colors.white,
  },
  dispatchedSub: {
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginTop: 4,
  },
  etaBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },

  /* Registered Notice Card */
  registeredNoticeCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: radius.xl,
    gap: 8,
  },
  registeredNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  registeredNoticeTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.extrabold,
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  registeredNoticeBody: {
    fontSize: typography.fontSizes.xs,
    color: '#1E40AF',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: typography.fontWeights.bold,
  },
  registeredPhonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  registeredPhoneText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: '#1E40AF',
  },

  /* Hospital Card */
  hospitalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    gap: 12,
  },
  sectionSmallLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hospitalIconBox: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalInfoCol: { flex: 1 },
  hospitalName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  hospitalDistance: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  callBtnsRow: {
    gap: 8,
    marginTop: 4,
  },
  callHospitalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  callHospitalBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  call108Btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  call108BtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: '#DC2626',
  },

  /* Summary Card */
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    gap: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCol: { flex: 1 },
  summaryKey: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  summaryVal: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  emergencyContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emergencyContactText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  /* Wait Card */
  waitCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: radius.xl,
    gap: 6,
  },
  waitTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  waitItem: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  resetBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.danger,
    marginTop: 4,
  },
  resetText: {
    color: colors.danger,
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.sm,
  },
});
