import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { register as registerPatientApi, registerDoctor, registerHospital, updateAvatar, getApprovedHospitals } from '../../api/auth';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';
import Input from '../../components/ui/Input';

const ROLES = [
  { id: 'patient', title: 'Patient', icon: 'person-outline' },
  { id: 'doctor', title: 'Doctor', icon: 'medkit-outline' },
  { id: 'hospital', title: 'Hospital', icon: 'business-outline' },
];

const SEX_OPTIONS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const SPECIALIZATIONS = [
  'General Practice',
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Pediatrics',
  'Orthopedics',
  'Psychiatry',
  'Ophthalmology',
  'ENT / Otolaryngology',
  'Gastroenterology',
  'Pulmonology',
  'Oncology',
  'Gynecology & Obstetrics',
  'Urology',
  'Endocrinology',
  'Nephrology',
];

export default function RegisterScreen({ navigation }) {
  const [selectedRole, setSelectedRole] = useState('patient');

  // Common Basic Details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Patient Specific
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [previousDiseaseHistory, setPreviousDiseaseHistory] = useState('');
  const [familyDiseaseHistory, setFamilyDiseaseHistory] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Doctor Specific Details
  const [specialization, setSpecialization] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [clinicHospitalName, setClinicHospitalName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [isHospitalAssociated, setIsHospitalAssociated] = useState(false);
  const [associatedHospital, setAssociatedHospital] = useState(null);
  const [hospitalsList, setHospitalsList] = useState([]);

  useEffect(() => {
    getApprovedHospitals()
      .then((res) => {
        setHospitalsList(res?.data || res || []);
      })
      .catch((err) => {
        console.log('Failed to fetch approved hospitals:', err.message);
      });
  }, []);

  // Doctor Verification Documents
  const [govIdDoc, setGovIdDoc] = useState(null);
  const [degreeDoc, setDegreeDoc] = useState(null);
  const [licenseDoc, setLicenseDoc] = useState(null);

  // Hospital Specific Details
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalContactNumber, setHospitalContactNumber] = useState('');
  const [hospitalMapLink, setHospitalMapLink] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [hospitalRegistrationNumber, setHospitalRegistrationNumber] = useState('');
  const [organizationPan, setOrganizationPan] = useState('');

  // Hospital Verification Documents
  const [hospitalRegCert, setHospitalRegCert] = useState(null);
  const [legalEntityProof, setLegalEntityProof] = useState(null);
  const [authorizedRepGovId, setAuthorizedRepGovId] = useState(null);
  const [authorizationProof, setAuthorizationProof] = useState(null);
  const [hospitalAddressProof, setHospitalAddressProof] = useState(null);
  const [nabhCertificate, setNabhCertificate] = useState(null);
  const [gstCertificate, setGstCertificate] = useState(null);

  // Modals
  const [pickerModal, setPickerModal] = useState(null); // 'sex' | 'blood' | 'specialization' | 'hospital' | null
  const [loading, setLoading] = useState(false);
  const storeLogin = useAuthStore((s) => s.login);

  // Document / Photo Pickers
  const handlePickDoc = async (setter) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setter(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async (setter) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Permission', 'Please allow camera access to capture a document or photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setter(result.assets[0].uri);
    }
  };

  const handleRegister = async () => {
    // ─────────────────────────────────────────────────────────────────────────────
    // 1. PATIENT REGISTRATION
    // ─────────────────────────────────────────────────────────────────────────────
    if (selectedRole === 'patient') {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (!firstName.trim() || !lastName.trim()) {
        Alert.alert('Missing Name', 'Please provide both first and last name.');
        return;
      }
      if (!email.trim()) {
        Alert.alert('Missing Email', 'Please provide your email address.');
        return;
      }
      if (!password) {
        Alert.alert('Missing Password', 'Please create a password.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Password and Confirm Password do not match.');
        return;
      }
      if (!emergencyContactName.trim() || !emergencyContactPhone.trim()) {
        Alert.alert('Emergency Contact Required', 'Please provide an Emergency Contact Name and Phone number.');
        return;
      }

      setLoading(true);
      try {
        const payload = {
          fullName,
          name: fullName,
          email: email.trim().toLowerCase(),
          password,
          role: 'patient',
          age: age ? parseInt(age) : undefined,
          sex: sex ? sex.toLowerCase() : undefined,
          bloodGroup: bloodGroup || undefined,
          allergies: allergies ? allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
          currentMedications: currentMedications ? currentMedications.split(',').map((s) => s.trim()).filter(Boolean) : [],
          previousDiseaseHistory: previousDiseaseHistory ? previousDiseaseHistory.split(',').map((s) => s.trim()).filter(Boolean) : [],
          familyDiseaseHistory: familyDiseaseHistory ? familyDiseaseHistory.split(',').map((s) => s.trim()).filter(Boolean) : [],
          emergencyContact: {
            name: emergencyContactName.trim(),
            phone: emergencyContactPhone.trim(),
          },
          avatar: profilePhoto || '',
        };

        const res = await registerPatientApi(payload);
        if (res?.token) {
          let updatedAvatar = res.user?.avatar || res.avatar || profilePhoto;
          if (profilePhoto) {
            try {
              const formData = new FormData();
              if (Platform.OS === 'web') {
                const blob = await (await fetch(profilePhoto)).blob();
                formData.append('avatar', blob, 'avatar.jpg');
              } else {
                formData.append('avatar', {
                  uri: profilePhoto,
                  name: 'avatar.jpg',
                  type: 'image/jpeg',
                });
              }
              const avatarRes = await client.patch('/api/auth/avatar', formData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                  Authorization: `Bearer ${res.token}`,
                },
              }).then((r) => r.data);
              if (avatarRes?.avatar || avatarRes?.user?.avatar) {
                updatedAvatar = avatarRes.avatar || avatarRes.user.avatar;
              }
            } catch (avatarErr) {
              console.log('Avatar upload during registration note:', avatarErr.message);
            }
          }

          const userObj = {
            ...(res.user || res),
            _id: res.user?._id || res._id,
            fullName,
            email: email.trim(),
            role: 'patient',
            avatar: updatedAvatar,
          };
          await storeLogin(res.token, userObj);
        } else {
          Alert.alert('Account Created! 🎉', 'Welcome to MediAI! Please sign in with your credentials.', [
            { text: 'Sign In', onPress: () => navigation.navigate('Login') },
          ]);
        }
      } catch (err) {
        Alert.alert('Registration Error', err.response?.data?.message || err.message || 'Could not complete registration.');
      } finally {
        setLoading(false);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. DOCTOR REGISTRATION
    // ─────────────────────────────────────────────────────────────────────────────
    else if (selectedRole === 'doctor') {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (!firstName.trim() || !lastName.trim()) {
        Alert.alert('Missing Name', 'Please provide both first and last name.');
        return;
      }
      if (!email.trim()) {
        Alert.alert('Missing Email', 'Please provide your email address.');
        return;
      }
      if (!password) {
        Alert.alert('Missing Password', 'Please create a password.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Password and Confirm Password do not match.');
        return;
      }
      if (!specialization.trim()) {
        Alert.alert('Specialization Required', 'Please select your medical specialization.');
        return;
      }
      if (!yearsOfExperience.trim()) {
        Alert.alert('Experience Required', 'Please enter your years of experience.');
        return;
      }
      if (!licenseNumber.trim()) {
        Alert.alert('License Required', 'Please enter your medical license number.');
        return;
      }
      if (!phone.trim()) {
        Alert.alert('Phone Required', 'Please enter your phone number.');
        return;
      }
      if (isHospitalAssociated && !associatedHospital) {
        Alert.alert('Hospital Selection Required', 'Please select the hospital you are associated with.');
        return;
      }
      if (!clinicHospitalName.trim()) {
        Alert.alert('Clinic / Hospital Required', 'Please enter your hospital or clinic name.');
        return;
      }
      if (!clinicAddress.trim()) {
        Alert.alert('Clinic Address Required', 'Please enter your clinic address.');
        return;
      }
      if (!govIdDoc || !degreeDoc || !licenseDoc) {
        Alert.alert('Verification Documents Required', 'Please upload your Government ID, Medical Degree, and Medical License Proof.');
        return;
      }

      setLoading(true);
      try {
        const res = await registerDoctor({
          fullName,
          email: email.trim().toLowerCase(),
          password,
          specialization: specialization.trim(),
          yearsOfExperience: parseInt(yearsOfExperience) || 1,
          licenseNumber: licenseNumber.trim(),
          phone: phone.trim(),
          hospitalName: clinicHospitalName.trim(),
          clinicAddress: clinicAddress.trim(),
          governmentId: govIdDoc,
          degreeCertificate: degreeDoc,
          medicalLicenseProof: licenseDoc,
          avatar: profilePhoto || '',
          role: 'doctor',
          isHospitalAssociated: isHospitalAssociated,
          associatedHospital: associatedHospital?._id || null,
        });

        Alert.alert(
          'Verification Request Submitted! 👨‍⚕️',
          'Your credentials have been submitted for review. Verification typically takes 1-2 business days.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } catch (err) {
        Alert.alert('Registration Error', err.response?.data?.message || err.message || 'Could not submit doctor registration.');
      } finally {
        setLoading(false);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. HOSPITAL REGISTRATION
    // ─────────────────────────────────────────────────────────────────────────────
    else if (selectedRole === 'hospital') {
      if (!hospitalName.trim()) {
        Alert.alert('Hospital Name Required', 'Please enter your hospital name.');
        return;
      }
      if (!hospitalContactNumber.trim()) {
        Alert.alert('Contact Number Required', 'Please enter your contact number.');
        return;
      }
      if (!email.trim()) {
        Alert.alert('Email Required', 'Please enter your hospital email address.');
        return;
      }
      if (!password) {
        Alert.alert('Password Required', 'Please create a password.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Password and Confirm Password do not match.');
        return;
      }
      if (!hospitalRegistrationNumber.trim() || !organizationPan.trim()) {
        Alert.alert('Hospital Details Required', 'Please enter your Hospital Registration Number and Organization PAN.');
        return;
      }
      if (!hospitalRegCert || !legalEntityProof || !authorizedRepGovId || !authorizationProof || !hospitalAddressProof) {
        Alert.alert(
          'Required Documents',
          'Please upload all required verification documents (Registration Certificate, Legal Entity Proof, Authorized Rep ID, Authorization Proof, and Address Proof).'
        );
        return;
      }

      setLoading(true);
      try {
        const res = await registerHospital({
          hospitalName: hospitalName.trim(),
          hospitalContactNumber: hospitalContactNumber.trim(),
          hospitalMapLink: hospitalMapLink.trim(),
          hospitalAddress: hospitalAddress.trim(),
          email: email.trim().toLowerCase(),
          password,
          hospitalRegistrationNumber: hospitalRegistrationNumber.trim(),
          organizationPan: organizationPan.trim(),
          hospitalRegistrationCertificate: hospitalRegCert,
          legalEntityProof: legalEntityProof,
          authorizedRepGovId: authorizedRepGovId,
          authorizationProof: authorizationProof,
          hospitalAddressProof: hospitalAddressProof,
          nabhCertificate: nabhCertificate || '',
          gstCertificate: gstCertificate || '',
          role: 'admin',
        });

        Alert.alert(
          'Hospital Verification Submitted! 🏥',
          'Hospital registration submitted for review. This process typically takes 1-2 business days.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } catch (err) {
        Alert.alert('Registration Error', err.response?.data?.message || err.message || 'Could not submit hospital registration.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero Brand Header */}
        <LinearGradient
          colors={['#060D1A', '#0B1528', '#0E1E38']}
          style={styles.heroBanner}
        >
          <View style={styles.topNavRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </TouchableOpacity>

            <View style={styles.logoBadgeContainer}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoBadgeImage}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>MediAI</Text>
            </View>
          </View>

          <View style={styles.heroTextContainer}>
            <Text style={styles.heroHeadline}>
              Join the future of{'\n'}
              <Text style={styles.heroHighlight}>healthcare.</Text>
            </Text>
            <Text style={styles.heroSubText}>
              Create an account to experience AI-powered diagnostics, secure medical records, and seamless consultations.
            </Text>
          </View>
        </LinearGradient>

        {/* Main Form Container */}
        <View style={styles.formCard}>
          {/* Header Title */}
          <Text style={styles.joinTitle}>Create an account</Text>
          <Text style={styles.joinSubtitle}>
            Registering as a{' '}
            <Text style={styles.roleHighlight}>
              {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
            </Text>.
          </Text>

          {/* 3 Role Selection Cards in 1 Row */}
          <View style={styles.rolesRow}>
            {ROLES.map((r) => {
              const isSelected = selectedRole === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roleCard, isSelected && styles.roleCardSelected]}
                  onPress={() => setSelectedRole(r.id)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.roleIconBox, isSelected && styles.roleIconBoxSelected]}>
                    <Ionicons
                      name={r.icon}
                      size={20}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <Text style={[styles.roleCardTitle, isSelected && styles.roleCardTitleSelected]}>
                    {r.title}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ========================================================================= */}
          {/* 1. PATIENT REGISTRATION FORM                                             */}
          {/* ========================================================================= */}
          {selectedRole === 'patient' && (
            <>
              {/* Basic Details */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Basic Details</Text>
                <Text style={styles.sectionSubtitle}>Let's get to know you.</Text>

                <View style={styles.twoColRow}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>First name <Text style={styles.requiredStar}>*</Text></Text>
                    <Input placeholder="" value={firstName} onChangeText={setFirstName} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Last name <Text style={styles.requiredStar}>*</Text></Text>
                    <Input placeholder="" value={lastName} onChangeText={setLastName} />
                  </View>
                </View>

                <View>
                  <Text style={styles.inputLabel}>Email <Text style={styles.requiredStar}>*</Text></Text>
                  <Input placeholder="" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                </View>

                <View style={styles.twoColRow}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Password <Text style={styles.requiredStar}>*</Text></Text>
                    <Input
                      placeholder=""
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      }
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Confirm Password <Text style={styles.requiredStar}>*</Text></Text>
                    <Input
                      placeholder=""
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                          <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      }
                    />
                  </View>
                </View>
              </View>

              {/* Medical Information */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Medical Information</Text>
                <Text style={styles.sectionSubtitle}>Provide your basic health details.</Text>

                <View style={styles.threeColRow}>
                  <View style={styles.colSmall}>
                    <Text style={styles.inputLabel}>Age</Text>
                    <Input placeholder="" value={age} onChangeText={setAge} keyboardType="numeric" />
                  </View>
                  <View style={styles.colLarge}>
                    <Text style={styles.inputLabel}>Sex</Text>
                    <TouchableOpacity style={styles.dropdownBtn} onPress={() => setPickerModal('sex')} activeOpacity={0.8}>
                      <Text style={sex ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>{sex || 'Select'}</Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.colLarge}>
                    <Text style={styles.inputLabel}>Blood Group</Text>
                    <TouchableOpacity style={styles.dropdownBtn} onPress={() => setPickerModal('blood')} activeOpacity={0.8}>
                      <Text style={bloodGroup ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>{bloodGroup || 'Select'}</Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View>
                  <Text style={styles.inputLabel}>Allergies (if any)</Text>
                  <Input placeholder="e.g. Peanuts, Penicillin" value={allergies} onChangeText={setAllergies} />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Current Medications</Text>
                  <Input placeholder="e.g. Metformin 500mg" value={currentMedications} onChangeText={setCurrentMedications} />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Previous Disease History</Text>
                  <Input placeholder="e.g. Asthma, Hypertension" value={previousDiseaseHistory} onChangeText={setPreviousDiseaseHistory} />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Family Disease History</Text>
                  <Input placeholder="e.g. Diabetes in mother" value={familyDiseaseHistory} onChangeText={setFamilyDiseaseHistory} />
                </View>

                <View style={styles.twoColRow}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Emergency Contact Name <Text style={styles.requiredStar}>*</Text></Text>
                    <Input placeholder="e.g. Jane Doe" value={emergencyContactName} onChangeText={setEmergencyContactName} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Emergency Contact Phone <Text style={styles.requiredStar}>*</Text></Text>
                    <Input placeholder="e.g. +1 (555) 000-0000" value={emergencyContactPhone} onChangeText={setEmergencyContactPhone} keyboardType="phone-pad" />
                  </View>
                </View>
              </View>

              {/* Profile Photo */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Profile Photo</Text>
                <Text style={styles.sectionSubtitle}>Personalize your account (Optional).</Text>

                <TouchableOpacity style={styles.uploadDashedBox} onPress={() => handlePickDoc(setProfilePhoto)} activeOpacity={0.8}>
                  {profilePhoto ? (
                    <View style={styles.photoPreviewBox}>
                      <Image source={{ uri: profilePhoto }} style={styles.previewImage} />
                      <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setProfilePhoto(null)}>
                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.uploadPlaceholderInner}>
                      <View style={styles.uploadIconCircle}>
                        <Ionicons name="image-outline" size={26} color={colors.primary} />
                      </View>
                      <Text style={styles.uploadTitle}>Upload Photo</Text>
                      <Text style={styles.uploadSub}>Clear headshot</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cameraOptionRow} onPress={() => handleTakePhoto(setProfilePhoto)} activeOpacity={0.8}>
                  <Text style={styles.cameraOptionText}>Or take a photo with your camera</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ========================================================================= */}
          {/* 2. DOCTOR REGISTRATION FORM                                              */}
          {/* ========================================================================= */}
          {selectedRole === 'doctor' && (
            <>
              {/* Basic Details */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Basic Details</Text>
                <Text style={styles.sectionSubtitle}>Let's get to know you.</Text>

                <View style={styles.twoColRow}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>First name <Text style={styles.requiredStar}>*</Text></Text>
                    <Input placeholder="" value={firstName} onChangeText={setFirstName} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Last name <Text style={styles.requiredStar}>*</Text></Text>
                    <Input placeholder="" value={lastName} onChangeText={setLastName} />
                  </View>
                </View>

                <View>
                  <Text style={styles.inputLabel}>Email <Text style={styles.requiredStar}>*</Text></Text>
                  <Input placeholder="" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                </View>

                <View style={styles.twoColRow}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Password <Text style={styles.requiredStar}>*</Text></Text>
                    <Input
                      placeholder=""
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      }
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Confirm Password <Text style={styles.requiredStar}>*</Text></Text>
                    <Input
                      placeholder=""
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                          <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      }
                    />
                  </View>
                </View>
              </View>

              {/* Professional Details */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Professional Details</Text>
                <Text style={styles.sectionSubtitle}>Provide your medical qualifications.</Text>

                <View style={styles.twoColRow}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Specialization <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity style={styles.dropdownBtn} onPress={() => setPickerModal('specialization')} activeOpacity={0.8}>
                      <Text style={specialization ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder} numberOfLines={1}>
                        {specialization || 'Select Speciality'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Years of Experience <Text style={styles.requiredStar}>*</Text></Text>
                    <Input placeholder="e.g. 10" value={yearsOfExperience} onChangeText={setYearsOfExperience} keyboardType="numeric" />
                  </View>
                </View>

                <View style={styles.twoColRow}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Medical License Number <Text style={styles.requiredStar}>*</Text></Text>
                    <Input placeholder="License number" value={licenseNumber} onChangeText={setLicenseNumber} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Phone Number <Text style={styles.requiredStar}>*</Text></Text>
                    <Input placeholder="e.g. +1 (555) 000-0000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                  </View>
                </View>
              </View>

              {/* Clinic Details */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Clinic Details</Text>
                <Text style={styles.sectionSubtitle}>Where do you currently practice?</Text>

                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.inputLabel}>Are you associated with any hospital? <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: radius.lg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: isHospitalAssociated ? colors.primary : colors.border,
                        backgroundColor: isHospitalAssociated ? colors.primary + '11' : colors.card,
                      }}
                      onPress={() => {
                        setIsHospitalAssociated(true);
                        setClinicHospitalName('');
                        setClinicAddress('');
                        setAssociatedHospital(null);
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: isHospitalAssociated ? colors.primary : colors.text }}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: radius.lg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: !isHospitalAssociated ? colors.primary : colors.border,
                        backgroundColor: !isHospitalAssociated ? colors.primary + '11' : colors.card,
                      }}
                      onPress={() => {
                        setIsHospitalAssociated(false);
                        setClinicHospitalName('');
                        setClinicAddress('');
                        setAssociatedHospital(null);
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: !isHospitalAssociated ? colors.primary : colors.text }}>No</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {isHospitalAssociated ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.inputLabel}>Select Hospital <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity
                      style={styles.dropdownBtn}
                      onPress={() => setPickerModal('hospital')}
                      activeOpacity={0.8}
                    >
                      <Text style={clinicHospitalName ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder} numberOfLines={1}>
                        {clinicHospitalName || 'Select Hospital'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.inputLabel}>Hospital / Clinic Name <Text style={styles.requiredStar}>*</Text></Text>
                    <Input placeholder="e.g. City General Hospital" value={clinicHospitalName} onChangeText={setClinicHospitalName} />
                  </View>
                )}

                <View>
                  <Text style={styles.inputLabel}>Clinic Address <Text style={styles.requiredStar}>*</Text></Text>
                  <Input 
                    placeholder="Enter clinic address" 
                    value={clinicAddress} 
                    onChangeText={setClinicAddress} 
                  />
                </View>
              </View>

              {/* Verification Documents */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Verification Documents</Text>
                <Text style={styles.sectionSubtitle}>Securely upload documents for admin verification (PDF/JPG/PNG).</Text>

                <View style={styles.docGridRow}>
                  <View style={styles.docGridCol}>
                    <Text style={styles.inputLabel}>Government ID <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity
                      style={[styles.docUploadCard, govIdDoc && styles.docUploadCardFilled]}
                      onPress={() => handlePickDoc(setGovIdDoc)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={govIdDoc ? 'checkmark-circle' : 'cloud-upload-outline'} size={24} color={govIdDoc ? colors.success : colors.primary} />
                      <Text style={styles.docUploadTitle}>{govIdDoc ? 'ID Uploaded' : 'Upload ID Proof'}</Text>
                      <Text style={styles.docUploadSub}>{govIdDoc ? 'Tap to change' : 'Max file size: 5MB'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.docGridCol}>
                    <Text style={styles.inputLabel}>Medical Degree <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity
                      style={[styles.docUploadCard, degreeDoc && styles.docUploadCardFilled]}
                      onPress={() => handlePickDoc(setDegreeDoc)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={degreeDoc ? 'checkmark-circle' : 'document-text-outline'} size={24} color={degreeDoc ? colors.success : colors.primary} />
                      <Text style={styles.docUploadTitle}>{degreeDoc ? 'Degree Uploaded' : 'Upload Certificate'}</Text>
                      <Text style={styles.docUploadSub}>{degreeDoc ? 'Tap to change' : 'Max file size: 5MB'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.docGridRow}>
                  <View style={styles.docGridCol}>
                    <Text style={styles.inputLabel}>Medical License Proof <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity
                      style={[styles.docUploadCard, licenseDoc && styles.docUploadCardFilled]}
                      onPress={() => handlePickDoc(setLicenseDoc)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={licenseDoc ? 'checkmark-circle' : 'newspaper-outline'} size={24} color={licenseDoc ? colors.success : colors.primary} />
                      <Text style={styles.docUploadTitle}>{licenseDoc ? 'License Uploaded' : 'Upload License'}</Text>
                      <Text style={styles.docUploadSub}>{licenseDoc ? 'Tap to change' : 'Valid registration proof'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.docGridCol}>
                    <Text style={styles.inputLabel}>Profile Photo <Text style={styles.optionalText}>(Optional)</Text></Text>
                    <TouchableOpacity
                      style={[styles.docUploadCard, profilePhoto && styles.docUploadCardFilled]}
                      onPress={() => handlePickDoc(setProfilePhoto)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={profilePhoto ? 'checkmark-circle' : 'image-outline'} size={24} color={profilePhoto ? colors.success : colors.primary} />
                      <Text style={styles.docUploadTitle}>{profilePhoto ? 'Photo Uploaded' : 'Upload Photo'}</Text>
                      <Text style={styles.docUploadSub}>{profilePhoto ? 'Tap to change' : 'Clear headshot'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.cameraOptionRow} onPress={() => handleTakePhoto(setProfilePhoto)} activeOpacity={0.8}>
                  <Text style={styles.cameraOptionText}>Or take a photo with your camera</Text>
                </TouchableOpacity>

                <View style={styles.importantNoticeBox}>
                  <Ionicons name="information-circle-outline" size={20} color="#B45309" style={{ marginTop: 2 }} />
                  <Text style={styles.importantNoticeText}>
                    <Text style={styles.importantNoticeBold}>Important: </Text>
                    Doctors must be verified by Our Team before accessing consultations. This process typically takes 1-2 business days.
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* ========================================================================= */}
          {/* 3. HOSPITAL REGISTRATION FORM                                            */}
          {/* ========================================================================= */}
          {selectedRole === 'hospital' && (
            <>
              {/* Hospital Information */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Hospital Information</Text>
                <Text style={styles.sectionSubtitle}>Provide your hospital's basic details.</Text>

                <View>
                  <Text style={styles.inputLabel}>Hospital Name <Text style={styles.requiredStar}>*</Text></Text>
                  <Input placeholder="" value={hospitalName} onChangeText={setHospitalName} />
                </View>

                <View style={styles.twoColRow}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Contact Number <Text style={styles.requiredStar}>*</Text></Text>
                    <Input placeholder="" value={hospitalContactNumber} onChangeText={setHospitalContactNumber} keyboardType="phone-pad" />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Google Maps Link</Text>
                    <Input placeholder="https://maps.google.com/..." value={hospitalMapLink} onChangeText={setHospitalMapLink} autoCapitalize="none" />
                  </View>
                </View>

                <View>
                  <Text style={styles.inputLabel}>Hospital Address <Text style={styles.requiredStar}>*</Text></Text>
                  <Input placeholder="Full physical address" value={hospitalAddress} onChangeText={setHospitalAddress} />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Email <Text style={styles.requiredStar}>*</Text></Text>
                  <Input placeholder="" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                </View>

                <View style={styles.twoColRow}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Password <Text style={styles.requiredStar}>*</Text></Text>
                    <Input
                      placeholder=""
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      }
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Confirm Password <Text style={styles.requiredStar}>*</Text></Text>
                    <Input
                      placeholder=""
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                          <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      }
                    />
                  </View>
                </View>
              </View>

              {/* Hospital Details */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Hospital Details</Text>
                <Text style={styles.sectionSubtitle}>Provide your institution's verification details.</Text>

                <View style={styles.twoColRow}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Hospital Registration Number <Text style={styles.requiredStar}>*</Text></Text>
                    <Input placeholder="" value={hospitalRegistrationNumber} onChangeText={setHospitalRegistrationNumber} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Organization PAN <Text style={styles.requiredStar}>*</Text></Text>
                    <Input placeholder="" value={organizationPan} onChangeText={setOrganizationPan} autoCapitalize="characters" />
                  </View>
                </View>
              </View>

              {/* Required Verification Documents */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Required Verification Documents</Text>
                <Text style={styles.sectionSubtitle}>Securely upload documents for admin verification (PDF/JPG/PNG).</Text>

                {/* Grid Row 1 */}
                <View style={styles.docGridRow}>
                  <View style={styles.docGridCol}>
                    <Text style={styles.inputLabel}>Hospital Registration Certificate <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity
                      style={[styles.docUploadCard, hospitalRegCert && styles.docUploadCardFilled]}
                      onPress={() => handlePickDoc(setHospitalRegCert)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={hospitalRegCert ? 'checkmark-circle' : 'document-text-outline'} size={24} color={hospitalRegCert ? colors.success : colors.primary} />
                      <Text style={styles.docUploadTitle}>{hospitalRegCert ? 'Cert Uploaded' : 'Upload Certificate'}</Text>
                      <Text style={styles.docUploadSub}>{hospitalRegCert ? 'Tap to change' : 'Max file size: 5MB'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.docGridCol}>
                    <Text style={styles.inputLabel}>Legal Entity/Organization Proof <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity
                      style={[styles.docUploadCard, legalEntityProof && styles.docUploadCardFilled]}
                      onPress={() => handlePickDoc(setLegalEntityProof)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={legalEntityProof ? 'checkmark-circle' : 'document-text-outline'} size={24} color={legalEntityProof ? colors.success : colors.primary} />
                      <Text style={styles.docUploadTitle}>{legalEntityProof ? 'Proof Uploaded' : 'Upload Proof'}</Text>
                      <Text style={styles.docUploadSub}>{legalEntityProof ? 'Tap to change' : 'Max file size: 5MB'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Grid Row 2 */}
                <View style={styles.docGridRow}>
                  <View style={styles.docGridCol}>
                    <Text style={styles.inputLabel}>Authorized Rep Government ID <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity
                      style={[styles.docUploadCard, authorizedRepGovId && styles.docUploadCardFilled]}
                      onPress={() => handlePickDoc(setAuthorizedRepGovId)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={authorizedRepGovId ? 'checkmark-circle' : 'cloud-upload-outline'} size={24} color={authorizedRepGovId ? colors.success : colors.primary} />
                      <Text style={styles.docUploadTitle}>{authorizedRepGovId ? 'ID Uploaded' : 'Upload ID Proof'}</Text>
                      <Text style={styles.docUploadSub}>{authorizedRepGovId ? 'Tap to change' : 'Max file size: 5MB'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.docGridCol}>
                    <Text style={styles.inputLabel}>Authorization Proof <Text style={styles.requiredStar}>*</Text></Text>
                    <TouchableOpacity
                      style={[styles.docUploadCard, authorizationProof && styles.docUploadCardFilled]}
                      onPress={() => handlePickDoc(setAuthorizationProof)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={authorizationProof ? 'checkmark-circle' : 'document-text-outline'} size={24} color={authorizationProof ? colors.success : colors.primary} />
                      <Text style={styles.docUploadTitle}>{authorizationProof ? 'Proof Uploaded' : 'Upload Proof'}</Text>
                      <Text style={styles.docUploadSub}>{authorizationProof ? 'Tap to change' : 'Max file size: 5MB'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Hospital Address Proof (Full Width) */}
                <View style={{ width: '48.5%' }}>
                  <Text style={styles.inputLabel}>Hospital Address Proof <Text style={styles.requiredStar}>*</Text></Text>
                  <TouchableOpacity
                    style={[styles.docUploadCard, hospitalAddressProof && styles.docUploadCardFilled]}
                    onPress={() => handlePickDoc(setHospitalAddressProof)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={hospitalAddressProof ? 'checkmark-circle' : 'document-text-outline'} size={24} color={hospitalAddressProof ? colors.success : colors.primary} />
                    <Text style={styles.docUploadTitle}>{hospitalAddressProof ? 'Address Proof Uploaded' : 'Upload Proof'}</Text>
                    <Text style={styles.docUploadSub}>{hospitalAddressProof ? 'Tap to change' : 'Max file size: 5MB'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Additional Certificates */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Additional Certificates</Text>

                <View style={styles.docGridRow}>
                  <View style={styles.docGridCol}>
                    <Text style={styles.inputLabel}>NABH Accreditation <Text style={styles.optionalText}>(Optional)</Text></Text>
                    <TouchableOpacity
                      style={[styles.docUploadCard, nabhCertificate && styles.docUploadCardFilled]}
                      onPress={() => handlePickDoc(setNabhCertificate)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={nabhCertificate ? 'checkmark-circle' : 'document-text-outline'} size={24} color={nabhCertificate ? colors.success : colors.primary} />
                      <Text style={styles.docUploadTitle}>{nabhCertificate ? 'NABH Uploaded' : 'Upload Certificate'}</Text>
                      <Text style={styles.docUploadSub}>{nabhCertificate ? 'Tap to change' : 'Max file size: 5MB'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.docGridCol}>
                    <Text style={styles.inputLabel}>GST Certificate <Text style={styles.optionalText}>(Optional)</Text></Text>
                    <TouchableOpacity
                      style={[styles.docUploadCard, gstCertificate && styles.docUploadCardFilled]}
                      onPress={() => handlePickDoc(setGstCertificate)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={gstCertificate ? 'checkmark-circle' : 'document-text-outline'} size={24} color={gstCertificate ? colors.success : colors.primary} />
                      <Text style={styles.docUploadTitle}>{gstCertificate ? 'GST Uploaded' : 'Upload Certificate'}</Text>
                      <Text style={styles.docUploadSub}>{gstCertificate ? 'Tap to change' : 'Max file size: 5MB'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Important Notice Callout */}
                <View style={styles.importantNoticeBox}>
                  <Ionicons name="information-circle-outline" size={20} color="#B45309" style={{ marginTop: 2 }} />
                  <Text style={styles.importantNoticeText}>
                    <Text style={styles.importantNoticeBold}>Important: </Text>
                    Hospitals must be verified by Our Team before gaining access to the platform. This process takes 1-2 business days.
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.backActionBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.backActionText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createActionBtn}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.createActionText}>
                {loading
                  ? 'Submitting…'
                  : selectedRole === 'patient'
                  ? 'Create Account'
                  : 'Submit Verification Request'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer Login Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Picker Modal (Sex, Blood Group, Specialization) */}
      <Modal
        visible={pickerModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModal(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerModal(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>
              {pickerModal === 'sex'
                ? 'Select Sex'
                : pickerModal === 'blood'
                ? 'Select Blood Group'
                : pickerModal === 'specialization'
                ? 'Select Specialization'
                : 'Select Associated Hospital'}
            </Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalOptionsList}>
                {pickerModal === 'sex'
                  ? SEX_OPTIONS.map((opt) => {
                      const isSelected = sex === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.modalOptionItem, isSelected && styles.modalOptionItemSelected]}
                          onPress={() => {
                            setSex(opt);
                            setPickerModal(null);
                          }}
                        >
                          <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>{opt}</Text>
                          {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                        </TouchableOpacity>
                      );
                    })
                  : pickerModal === 'blood'
                  ? BLOOD_GROUPS.map((opt) => {
                      const isSelected = bloodGroup === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.modalOptionItem, isSelected && styles.modalOptionItemSelected]}
                          onPress={() => {
                            setBloodGroup(opt);
                            setPickerModal(null);
                          }}
                        >
                          <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>{opt}</Text>
                          {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                        </TouchableOpacity>
                      );
                    })
                  : pickerModal === 'specialization'
                  ? SPECIALIZATIONS.map((opt) => {
                      const isSelected = specialization === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.modalOptionItem, isSelected && styles.modalOptionItemSelected]}
                          onPress={() => {
                            setSpecialization(opt);
                            setPickerModal(null);
                          }}
                        >
                          <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>{opt}</Text>
                          {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                        </TouchableOpacity>
                      );
                    })
                  : hospitalsList.map((opt) => {
                      const isSelected = associatedHospital?._id === opt._id;
                      return (
                        <TouchableOpacity
                          key={opt._id}
                          style={[styles.modalOptionItem, isSelected && styles.modalOptionItemSelected]}
                          onPress={() => {
                            setAssociatedHospital(opt);
                            setClinicHospitalName(opt.hospitalName);
                            if (opt.hospitalAddress || opt.address) {
                              setClinicAddress(opt.hospitalAddress || opt.address);
                            }
                            setPickerModal(null);
                          }}
                        >
                          <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>{opt.hospitalName}</Text>
                          {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                        </TouchableOpacity>
                      );
                    })
                }
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  // Top Hero Banner
  heroBanner: {
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingBottom: spacing['2xl'],
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadgeImage: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  heroTextContainer: {
    gap: 8,
    marginTop: spacing.xs,
  },
  heroHeadline: {
    fontSize: 28,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.white,
    lineHeight: 36,
  },
  heroHighlight: {
    color: '#0EA5A4',
  },
  heroSubText: {
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255, 255, 255, 0.72)',
    lineHeight: 18,
    maxWidth: '94%',
  },

  // Main Form Card
  formCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  joinTitle: {
    fontSize: 24,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.text,
    textAlign: 'center',
  },
  joinSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  roleHighlight: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },

  // Roles selection (Single row with 3 cards)
  rolesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.xl,
  },
  roleCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  roleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconBoxSelected: {
    backgroundColor: colors.primary + '22',
  },
  roleCardTitle: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  roleCardTitleSelected: {
    color: colors.primary,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
  },

  // Section Blocks
  sectionBlock: {
    marginBottom: spacing.xl,
    gap: 12,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: 4,
  },

  // Field Columns Layouts
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  threeColRow: {
    flexDirection: 'row',
    gap: 8,
  },
  col: {
    flex: 1,
  },
  colSmall: {
    width: '28%',
  },
  colLarge: {
    flex: 1,
  },
  inputLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  requiredStar: {
    color: colors.danger,
    fontWeight: typography.fontWeights.bold,
  },
  optionalText: {
    color: colors.textMuted,
    fontWeight: typography.fontWeights.normal,
  },

  // Dropdown Button
  dropdownBtn: {
    height: 48,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTextPlaceholder: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  dropdownTextSelected: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },

  // 2x2 Verification Documents Grid
  docGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  docGridCol: {
    flex: 1,
  },
  docUploadCard: {
    backgroundColor: 'rgba(14, 165, 164, 0.03)',
    borderWidth: 1.5,
    borderColor: colors.primary + '55',
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 110,
  },
  docUploadCardFilled: {
    borderColor: colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderStyle: 'solid',
  },
  docUploadTitle: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    marginTop: 2,
  },
  docUploadSub: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Important Notice Box
  importantNoticeBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radius.lg,
    padding: 12,
    marginTop: 6,
  },
  importantNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  importantNoticeBold: {
    fontWeight: typography.fontWeights.bold,
  },

  // Profile Photo Upload Box (Patient)
  uploadDashedBox: {
    backgroundColor: 'rgba(14, 165, 164, 0.04)',
    borderWidth: 1.5,
    borderColor: colors.primary + '66',
    borderStyle: 'dashed',
    borderRadius: radius.xl,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlaceholderInner: {
    alignItems: 'center',
    gap: 6,
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 165, 164, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  uploadSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  photoPreviewBox: {
    position: 'relative',
  },
  previewImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  cameraOptionRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  cameraOptionText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },

  // Action Buttons Row
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.base,
  },
  backActionBtn: {
    width: '32%',
    height: 50,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  backActionText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  createActionBtn: {
    flex: 1,
    height: 50,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primary,
  },
  createActionText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingBottom: spacing.base,
  },
  footerText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  footerLink: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  modalHeading: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  modalOptionsList: {
    gap: 6,
  },
  modalOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  modalOptionItemSelected: {
    backgroundColor: colors.primaryGlow,
  },
  modalOptionText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  modalOptionTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
});
