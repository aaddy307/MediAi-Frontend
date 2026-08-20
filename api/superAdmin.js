import client from './client';

// ─── Dashboard ────────────────────────────────────────────────────────────────
// Backend route: GET /api/super-admin/dashboard/stats
export const getSuperAdminDashboard = () =>
  client.get('/api/super-admin/dashboard/stats').then((r) => r.data);

// ─── Doctor Management ────────────────────────────────────────────────────────
// Backend: GET /api/super-admin/doctors  (filter by verificationStatus in params)
export const getPendingDoctors = () =>
  client
    .get('/api/super-admin/doctors', { params: { verificationStatus: 'pending' } })
    .then((r) => r.data);

export const getAllDoctors = (params = {}) =>
  client.get('/api/super-admin/doctors', { params }).then((r) => r.data);

// Requires backend routes to be added (see plan)
export const approveDoctor = (id) =>
  client.patch(`/api/super-admin/doctors/${id}/approve`).then((r) => r.data);

export const rejectDoctor = (id, reason) =>
  client.patch(`/api/super-admin/doctors/${id}/reject`, { reason }).then((r) => r.data);

export const approveHospital = (id) =>
  client.patch(`/api/super-admin/hospitals/${id}/approve`).then((r) => r.data);

export const rejectHospital = (id, reason) =>
  client.patch(`/api/super-admin/hospitals/${id}/reject`, { reason }).then((r) => r.data);

// ─── Admin Management ─────────────────────────────────────────────────────────
export const getAllAdmins = (params = {}) =>
  client.get('/api/super-admin/admins', { params }).then((r) => r.data);

export const createAdmin = (payload) =>
  client.post('/api/super-admin/admins', payload).then((r) => r.data);

export const updateAdmin = (id, payload) =>
  client.put(`/api/super-admin/admins/${id}`, payload).then((r) => r.data);

export const suspendAdmin = (id) =>
  client.patch(`/api/super-admin/admins/${id}/suspend`).then((r) => r.data);

export const deleteAdmin = (id) =>
  client.delete(`/api/super-admin/admins/${id}`).then((r) => r.data);

// ─── Platform-wide Data ───────────────────────────────────────────────────────
export const getAllPlatformUsers = (params = {}) =>
  client.get('/api/super-admin/users', { params }).then((r) => r.data);

export const getAllAppointments = (params = {}) =>
  client.get('/api/super-admin/appointments', { params }).then((r) => r.data);

export const getAllSupportTickets = (params = {}) =>
  client.get('/api/super-admin/support-tickets', { params }).then((r) => r.data);

export const getAllAuditLogs = (params = {}) =>
  client.get('/api/super-admin/audit-logs', { params }).then((r) => r.data);

// ─── Emergency Control Center ─────────────────────────────────────────────────
export const getAllEmergencies = (params = {}) =>
  client.get('/api/super-admin/emergencies', { params }).then((r) => r.data);

export const getEmergencyById = (id) =>
  client.get(`/api/super-admin/emergencies/${id}`).then((r) => r.data);

export const assignEmergency = (id, payload) =>
  client.patch(`/api/super-admin/emergencies/${id}/assign`, payload).then((r) => r.data);

export const updateEmergencyStatus = (id, status) =>
  client.patch(`/api/super-admin/emergencies/${id}/status`, { status }).then((r) => r.data);

// ─── System & Analytics ───────────────────────────────────────────────────────
// Requires backend route: GET /api/super-admin/system-health
export const getSystemHealth = () =>
  client.get('/api/super-admin/system-health').then((r) => r.data);

export const getAnalytics = (params = {}) =>
  client.get('/api/super-admin/analytics', { params }).then((r) => r.data);

// ─── Platform Settings ────────────────────────────────────────────────────────
export const getPlatformSettings = () =>
  client.get('/api/super-admin/settings').then((r) => r.data);

export const updatePlatformSettings = (payload) =>
  client.put('/api/super-admin/settings', payload).then((r) => r.data);
