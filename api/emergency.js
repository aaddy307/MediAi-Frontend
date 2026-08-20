import client from './client';

// ─── Emergency Cases (Patient) ────────────────────────────────────────────────
export const createEmergencyCase = (payload) =>
  client.post('/api/emergency', payload).then((r) => r.data);

export const getEmergencyCase = (id) =>
  client.get(`/api/emergency/${id}`).then((r) => r.data);

// Backend route: GET /api/emergency/patient
export const getMyEmergencyCases = () =>
  client.get('/api/emergency/patient').then((r) => r.data);

export const updateEmergencyStatus = (id, status) =>
  client.put(`/api/emergency/${id}/status`, { status }).then((r) => r.data);

// ─── Emergency Face Scan (optional auth) ─────────────────────────────────────
// Backend route: POST /api/emergency/emergency-scan
export const scanFace = (formData) =>
  client
    .post('/api/emergency/emergency-scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);

// Fast face scan (base64)
export const scanFaceFast = (imageBase64) =>
  client
    .post('/api/emergency/emergency-scan-fast', { imageBase64 })
    .then((r) => r.data);

// ─── Guest SOS (no auth required) ────────────────────────────────────────────
export const guestSOS = (payload) =>
  client.post('/api/emergency/guest-sos', payload).then((r) => r.data);
