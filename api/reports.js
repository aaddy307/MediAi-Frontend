import client from './client';

// ─── Patient Reports ──────────────────────────────────────────────────────────
export const getReports = () =>
  client.get('/api/reports/patient').then((r) => r.data);

export const getReportById = (id) =>
  client.get(`/api/reports/${id}`).then((r) => r.data);

// Note: patients can upload reports directly (backend allows via upload.controller)
export const uploadReport = (formData) =>
  client
    .post('/api/reports/patient', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);

export const deleteReport = (id) =>
  client.delete(`/api/reports/${id}`).then((r) => r.data);

// Share a report with a doctor (requires backend route: POST /api/reports/:id/share)
export const shareReport = (id, doctorId) =>
  client.post(`/api/reports/${id}/share`, { doctorId }).then((r) => r.data);

// ─── Doctor Report Actions ────────────────────────────────────────────────────
export const getDoctorReports = () =>
  client.get('/api/reports/doctor').then((r) => r.data);

export const createDraftReport = (payload) =>
  client.post('/api/reports/draft', payload).then((r) => r.data);

export const editReport = (id, payload) =>
  client.put(`/api/reports/${id}`, payload).then((r) => r.data);

export const updateReportStatus = (id, status) =>
  client.put(`/api/reports/${id}/status`, { status }).then((r) => r.data);

export const getReportByChatId = (chatId) =>
  client.get(`/api/reports/chat/${chatId}`).then((r) => r.data);
