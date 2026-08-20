import client from './client';
import { Platform } from 'react-native';

export const login = (email, password) =>
  client.post('/api/auth/login', { email, password }).then((r) => r.data);

const buildFormData = async (payload, fileKeys) => {
  const formData = new FormData();
  for (const key of Object.keys(payload)) {
    const value = payload[key];
    if (fileKeys.includes(key) && value) {
      const uri = value;
      const uriParts = uri.split('/');
      let fileName = uriParts[uriParts.length - 1] || `${key}.jpg`;
      if (!fileName.includes('.')) {
        fileName += '.jpg';
      }
      const ext = (fileName.split('.').pop() || '').toLowerCase();
      let fileType = 'image/jpeg';
      if (ext === 'pdf') {
        fileType = 'application/pdf';
      } else if (ext === 'png') {
        fileType = 'image/png';
      } else if (ext === 'webp') {
        fileType = 'image/webp';
      }
      
      const fieldName = key === 'avatar' ? 'profilePhoto' : key;

      if (Platform.OS === 'web') {
        try {
          const blob = await (await fetch(uri)).blob();
          formData.append(fieldName, blob, fileName);
        } catch (e) {
          console.error(`Failed to fetch blob for web upload:`, e);
          formData.append(fieldName, value);
        }
      } else {
        formData.append(fieldName, {
          uri: uri,
          name: fileName,
          type: fileType
        });
      }
    } else if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  }
  return formData;
};

export const register = (payload) =>
  client.post('/api/auth/register', payload).then((r) => r.data);

export const registerDoctor = async (payload) => {
  const fileKeys = ['degreeCertificate', 'governmentId', 'medicalLicenseProof', 'avatar'];
  const formData = await buildFormData(payload, fileKeys);
  return client.post('/api/auth/doctor/register', formData).then((r) => r.data);
};

export const registerHospital = async (payload) => {
  const fileKeys = [
    'hospitalRegistrationCertificate',
    'legalEntityProof',
    'authorizedRepGovId',
    'authorizationProof',
    'hospitalAddressProof',
    'nabhCertificate',
    'gstCertificate'
  ];
  const formData = await buildFormData(payload, fileKeys);
  return client.post('/api/auth/hospital/register', formData).then((r) => r.data);
};

// OTP verification after registration
export const verifyOtp = (email, otp) =>
  client.post('/api/auth/verify-otp', { email, otp }).then((r) => r.data);

export const resendOtp = (email) =>
  client.post('/api/auth/resend-otp', { email }).then((r) => r.data);

export const getMe = () => client.get('/api/auth/me').then((r) => r.data);

// Password Management
export const forgotPassword = (email) =>
  client.post('/api/auth/forgot-password', { email }).then((r) => r.data);

// Backend expects token in URL path: POST /api/auth/reset-password/:token
export const resetPassword = (token, password) =>
  client.post(`/api/auth/reset-password/${token}`, { password }).then((r) => r.data);

export const changePassword = (oldPassword, newPassword) =>
  client
    .put('/api/auth/change-password', { oldPassword, newPassword })
    .then((r) => r.data);

// Profile updates
export const updateProfile = (payload) =>
  client.patch('/api/auth/profile', payload).then((r) => r.data);

export const updateAvatar = (formData) =>
  client
    .patch('/api/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);

export const updateEmergencyProfile = (formData) =>
  client
    .patch('/api/auth/emergency-profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);

// Push notification token (requires backend route: POST /api/auth/push-token)
export const updatePushToken = (pushToken) =>
  client.post('/api/auth/push-token', { pushToken }).then((r) => r.data);

// Token refresh
export const refreshToken = () =>
  client.post('/api/auth/refresh').then((r) => r.data);

// Fetch approved hospitals for registration selector
export const getApprovedHospitals = () =>
  client.get('/api/auth/hospitals').then((r) => r.data);
