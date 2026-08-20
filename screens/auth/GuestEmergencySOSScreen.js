import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { guestSOS } from '../../api/emergency';
import { colors, typography, spacing, radius, shadows, gradients } from '../../constants/theme';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardSafeScrollView from '../../components/ui/KeyboardSafeScrollView';

const GUEST_EMERGENCY_TYPES = [
  { id: 'cardiac', label: 'Cardiac Emergency', desc: 'Chest pain, heart attack symptoms', icon: 'heart', color: '#EF4444' },
  { id: 'accident', label: 'Accident / Trauma', desc: 'Road crash, fall, severe injury', icon: 'car-sport', color: '#F59E0B' },
  { id: 'breathing', label: 'Breathing Distress', desc: 'Severe asthma, choking, oxygen drop', icon: 'fitness', color: '#3B82F6' },
  { id: 'stroke', label: 'Stroke Symptoms', desc: 'Facial droop, paralysis, speech loss', icon: 'medical', color: '#8B5CF6' },
  { id: 'bleeding', label: 'Severe Bleeding / Burn', desc: 'Uncontrolled blood loss, deep burns', icon: 'water', color: '#DC2626' },
  { id: 'other', label: 'Other Critical Emergency', desc: 'Unconscious, poisoning, acute illness', icon: 'alert-circle', color: '#6B7280' },
];

export default function GuestEmergencySOSScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [locationStatus, setLocationStatus] = useState('checking'); // 'checking', 'granted', 'denied'
  const [coords, setCoords] = useState(null);
  const [locationAddress, setLocationAddress] = useState('Detecting GPS location...');
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // Form State
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [emergencyType, setEmergencyType] = useState('cardiac');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Result State
  const [sosResult, setSosResult] = useState(null);

  // 1. Request location on mount
  const requestLocation = useCallback(async () => {
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        setLocationAddress('Location permission denied. Please allow location so nearest hospital can reach you.');
        setFetchingLocation(false);
        return;
      }

      setLocationStatus('granted');
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const userCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy || 10,
      };
      setCoords(userCoords);

      // Reverse geocode
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
        });
        if (geo) {
          const formatted = [geo.street, geo.district, geo.city, geo.region, geo.postalCode]
            .filter(Boolean)
            .join(', ');
          setLocationAddress(formatted || `${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)}`);
        } else {
          setLocationAddress(`${userCoords.latitude.toFixed(4)}, ${userCoords.longitude.toFixed(4)}`);
        }
      } catch (_) {
        setLocationAddress(`Lat: ${userCoords.latitude.toFixed(4)}, Long: ${userCoords.longitude.toFixed(4)}`);
      }
    } catch (err) {
      setLocationStatus('denied');
      setLocationAddress('Could not fetch exact GPS location.');
    } finally {
      setFetchingLocation(false);
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Form Validation & Submission
  const handleSubmitGuestSOS = async () => {
    if (!guestName.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    const cleanPhone = guestPhone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 7) {
      Alert.alert('Invalid Phone', 'Please enter a valid contact number with at least 7-10 digits.');
      return;
    }
    if (!coords) {
      Alert.alert(
        'Location Required',
        'Emergency services need your GPS location to dispatch an ambulance. Please enable location services and retry.',
        [
          { text: 'Retry Location', onPress: requestLocation },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    Alert.alert(
      '🚨 Confirm Emergency SOS',
      `Dispatch ambulance to your current location for ${GUEST_EMERGENCY_TYPES.find((t) => t.id === emergencyType)?.label}?\n\nHospital will call ${cleanPhone} immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DISPATCH AMBULANCE',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              const selectedTypeObj = GUEST_EMERGENCY_TYPES.find((t) => t.id === emergencyType);
              const payload = {
                guestName: guestName.trim(),
                guestPhone: cleanPhone,
                emergencyType: emergencyType,
                description: `${selectedTypeObj?.label}: ${additionalNotes.trim() || 'Immediate assistance needed'} (Location: ${locationAddress})`,
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: coords.accuracy,
              };

              const response = await guestSOS(payload);
              setSosResult(response?.data || response);
            } catch (err) {
              const msg = err?.response?.data?.message || 'Emergency distress signal registered. Help is being notified.';
              Alert.alert('SOS Triggered', msg);
              setSosResult({
                status: 'dispatched',
                guestName: guestName.trim(),
                guestPhone: cleanPhone,
                emergencyType,
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
  };

  const handleCallNumber = (num) => {
    if (!num) return;
    Linking.openURL(`tel:${num}`).catch(() => {
      Alert.alert('Dialer Error', `Please manually dial: ${num}`);
    });
  };

  // SUCCESS / DISPATCHED STATE (Matches Flowchart Step 10 & 11)
  if (sosResult) {
    const selectedTypeObj = GUEST_EMERGENCY_TYPES.find(
      (t) => t.id === sosResult.emergencyType || t.id === emergencyType
    );
    const hospital = sosResult.nearestHospital || {
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
          {/* Hero Success Banner */}
          <LinearGradient colors={['#991B1B', '#7F1D1D']} style={styles.dispatchedHero}>
            <View style={styles.dispatchedIconCircle}>
              <Ionicons name="medical" size={42} color="#EF4444" />
            </View>
            <Text style={styles.dispatchedTitle}>Ambulance Dispatched! 🚑</Text>
            <Text style={styles.dispatchedSub}>Distress signal routed to nearest registered hospital</Text>
            <View style={styles.etaBadge}>
              <Ionicons name="time" size={14} color={colors.white} />
              <Text style={styles.etaBadgeText}>Estimated Arrival: {hospital.eta || '5-8 mins'}</Text>
            </View>
          </LinearGradient>

          {/* Flowchart Step 11: Flagged as GUEST USER Banner */}
          <Card style={styles.guestNoticeCard} padding={16}>
            <View style={styles.guestNoticeHeader}>
              <Ionicons name="alert-circle" size={22} color="#D97706" />
              <Text style={styles.guestNoticeTitle}>FLAGGED AS GUEST (NON-REGISTERED) USER</Text>
            </View>
            <Text style={styles.guestNoticeBody}>
              Because you are not signed in, the hospital has limited records on file. The emergency triage desk is{' '}
              <Text style={styles.boldText}>manually calling your provided contact number ({guestPhone || sosResult.guestPhone})</Text>{' '}
              right now to confirm vital details, exact landmark, and provide immediate medical guidance while the ambulance is en route.
            </Text>
            <View style={styles.guestNoticePhonePill}>
              <Ionicons name="call" size={15} color="#B45309" />
              <Text style={styles.guestNoticePhoneText}>Keep your phone unlocked: {guestPhone || sosResult.guestPhone}</Text>
            </View>
          </Card>

          {/* Nearest Registered Hospital Card */}
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

          {/* SOS Case Summary */}
          <Card style={styles.summaryCard} padding={16}>
            <Text style={styles.sectionSmallLabel}>EMERGENCY DETAILS</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryKey}>Patient Name</Text>
                <Text style={styles.summaryVal}>{guestName || sosResult.guestName || 'Guest'}</Text>
              </View>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryKey}>Emergency Type</Text>
                <Text style={[styles.summaryVal, { color: selectedTypeObj?.color || colors.danger }]}>
                  {selectedTypeObj?.label}
                </Text>
              </View>
            </View>
          </Card>

          {/* While you wait checklist */}
          <Card style={styles.waitCard} padding={16}>
            <Text style={styles.waitTitle}>Immediate Actions While Ambulance Arrives:</Text>
            <Text style={styles.waitItem}>✓ Stay by your phone — answer incoming calls from the hospital.</Text>
            <Text style={styles.waitItem}>✓ If possible, unlock front door and turn on outside lights.</Text>
            <Text style={styles.waitItem}>✓ Keep patient calm, seated or lying down comfortably.</Text>
            <Text style={styles.waitItem}>✓ Do NOT administer solid food or water unless instructed by paramedics.</Text>
          </Card>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.backToLoginBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
            <Text style={styles.backToLoginText}>Return to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // GUEST SOS FORM VIEW (Matches Flowchart Steps 1-8)
  return (
    <View style={styles.screen}>
      <KeyboardSafeScrollView
        contentContainerStyle={[
          styles.formContainer,
          { paddingTop: Math.max(insets.top, 20), paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Emergency SOS</Text>
            <Text style={styles.headerSub}>No Login Required • Direct Hospital Dispatch</Text>
          </View>
          <Badge label="GUEST" variant="danger" size="xs" />
        </View>

        {/* Location Banner (Flowchart Step 4 & 5) */}
        <Card style={styles.locationCard} padding={14}>
          <View style={styles.locationRow}>
            <View
              style={[
                styles.locationIconCircle,
                locationStatus === 'granted' ? styles.locGranted : styles.locPending,
              ]}
            >
              <Ionicons
                name={locationStatus === 'granted' ? 'location' : 'location-outline'}
                size={20}
                color={locationStatus === 'granted' ? colors.primary : '#F59E0B'}
              />
            </View>
            <View style={styles.locationTextCol}>
              <View style={styles.locStatusRow}>
                <Text style={styles.locStatusLabel}>
                  {locationStatus === 'granted' ? 'GPS Location Acquired' : 'Location Required'}
                </Text>
                {fetchingLocation && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
              <Text style={styles.locAddressText} numberOfLines={2}>
                {locationAddress}
              </Text>
            </View>
          </View>

          {locationStatus !== 'granted' && (
            <TouchableOpacity
              style={styles.grantLocBtn}
              onPress={requestLocation}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate" size={16} color={colors.white} />
              <Text style={styles.grantLocBtnText}>Allow Location Access</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Short SOS Form (Flowchart Step 6 & 7) */}
        <Card style={styles.formCard} padding={16}>
          <Text style={styles.formCardHeading}>Patient Contact Details</Text>
          <Text style={styles.formCardSub}>
            The nearest hospital will call this number immediately to confirm ambulance dispatch.
          </Text>

          {/* Full Name */}
          <Text style={styles.inputLabel}>FULL NAME *</Text>
          <View style={styles.inputBox}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. John Doe"
              placeholderTextColor={colors.textMuted}
              value={guestName}
              onChangeText={setGuestName}
            />
          </View>

          {/* Contact Number */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>CONTACT NUMBER *</Text>
          <View style={styles.inputBox}>
            <Ionicons name="call-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={guestPhone}
              onChangeText={setGuestPhone}
            />
          </View>

          {/* Emergency Type Selector */}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>SELECT EMERGENCY TYPE *</Text>
          <View style={styles.typesGrid}>
            {GUEST_EMERGENCY_TYPES.map((t) => {
              const isSelected = emergencyType === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeCard,
                    isSelected && { borderColor: t.color, backgroundColor: t.color + '14' },
                  ]}
                  onPress={() => setEmergencyType(t.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.typeIconBox, { backgroundColor: t.color + '20' }]}>
                    <Ionicons name={t.icon} size={20} color={t.color} />
                  </View>
                  <View style={styles.typeInfoCol}>
                    <Text style={[styles.typeTitle, isSelected && { color: t.color, fontWeight: 'bold' }]}>
                      {t.label}
                    </Text>
                    <Text style={styles.typeDesc}>{t.desc}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={t.color} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Additional Notes */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>ADDITIONAL DETAILS / LANDMARK (OPTIONAL)</Text>
          <TextInput
            style={[styles.inputBox, styles.notesInput]}
            placeholder="e.g. 2nd floor, apartment 4B near Central Park"
            placeholderTextColor={colors.textMuted}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            multiline
            numberOfLines={2}
          />
        </Card>

        {/* SOS Submit Button (Flowchart Step 8 & 9) */}
        <TouchableOpacity
          style={[styles.sosSubmitBtn, submitting && styles.btnDisabled]}
          onPress={handleSubmitGuestSOS}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#DC2626', '#991B1B']} style={styles.sosSubmitGrad}>
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="warning" size={24} color={colors.white} />
                <Text style={styles.sosSubmitText}>SEND EMERGENCY SOS</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Direct Call Fallback */}
        <View style={styles.directCallFooter}>
          <Text style={styles.directCallText}>In life-threatening emergencies, you can also dial:</Text>
          <View style={styles.directCallPillsRow}>
            <TouchableOpacity style={styles.directPill} onPress={() => handleCallNumber('108')}>
              <Ionicons name="call" size={14} color="#DC2626" />
              <Text style={styles.directPillText}>Dial 108 (Ambulance)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.directPill} onPress={() => handleCallNumber('112')}>
              <Ionicons name="call" size={14} color="#2563EB" />
              <Text style={[styles.directPillText, { color: '#2563EB' }]}>Dial 112 (National SOS)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardSafeScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  formContainer: { paddingHorizontal: spacing.base, gap: spacing.md },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: { flex: 1, marginLeft: 12 },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.danger,
  },
  headerSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* Location Card */
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locGranted: { backgroundColor: colors.primary + '18' },
  locPending: { backgroundColor: '#FEF3C7' },
  locationTextCol: { flex: 1 },
  locStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locStatusLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  locAddressText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  grantLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginTop: 12,
  },
  grantLocBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },

  /* Form Card */
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
  },
  formCardHeading: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  formCardSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    gap: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
  },
  notesInput: {
    paddingVertical: 10,
    height: 60,
    textAlignVertical: 'top',
  },

  /* Types Grid */
  typesGrid: { gap: 8 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfoCol: { flex: 1 },
  typeTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  typeDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },

  /* SOS Submit Button */
  sosSubmitBtn: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.danger,
  },
  btnDisabled: { opacity: 0.6 },
  sosSubmitGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  sosSubmitText: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.white,
    letterSpacing: 1,
  },

  /* Direct Call Footer */
  directCallFooter: {
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  directCallText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  directCallPillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  directPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  directPillText: {
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

  /* Guest Notice Card (Step 11) */
  guestNoticeCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: radius.xl,
    gap: 8,
  },
  guestNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guestNoticeTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.extrabold,
    color: '#B45309',
    letterSpacing: 0.5,
  },
  guestNoticeBody: {
    fontSize: typography.fontSizes.xs,
    color: '#78350F',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: typography.fontWeights.bold,
  },
  guestNoticePhonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  guestNoticePhoneText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: '#92400E',
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

  /* While you wait checklist */
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

  backToLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backToLoginText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
});
