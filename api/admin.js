import client from './client';

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
export const getAdminDashboard = () =>
  client.get('/api/admin/stats').then((r) => r.data);

// ─── User Management ──────────────────────────────────────────────────────────
export const getUsers = (params = {}) =>
  client.get('/api/admin/users', { params }).then((r) => r.data);

// Update a user (general edit via PUT)
export const updateUser = (id, payload) =>
  client.put(`/api/admin/users/${id}`, payload).then((r) => r.data);

// Toggle user active/suspended status (dedicated status endpoint)
export const updateUserStatus = (id, isActive) =>
  client.put(`/api/admin/users/${id}/status`, { isActive }).then((r) => r.data);

export const deleteUser = (id) =>
  client.delete(`/api/admin/users/${id}`).then((r) => r.data);

// ─── Medicine Stock (admin CRUD) ──────────────────────────────────────────────
// Backend mounts at /api/medicine-stock
export const getMedicineStock = (params = {}) =>
  client.get('/api/medicine-stock', { params }).then((r) => r.data);

export const createMedicineStock = (payload) =>
  client.post('/api/medicine-stock', payload).then((r) => r.data);

export const updateMedicineStock = (id, payload) =>
  client.put(`/api/medicine-stock/${id}`, payload).then((r) => r.data);

export const deleteMedicineStock = (id) =>
  client.delete(`/api/medicine-stock/${id}`).then((r) => r.data);

// Correct restock endpoint: PATCH /api/medicine-stock/:id/stock
// Body: { adjustment: number, type: 'add' | 'subtract' | 'set' }
export const adjustMedicineStock = (id, adjustment) =>
  client.patch(`/api/medicine-stock/${id}/stock`, { adjustment, type: 'add' }).then((r) => r.data);

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const getAuditLogs = (params = {}) =>
  client.get('/api/admin/audit-logs', { params }).then((r) => r.data);

// ─── Support Tickets (admin) ──────────────────────────────────────────────────
// Backend mounts at /api/support-tickets
export const getAllTickets = (params = {}) =>
  client.get('/api/support-tickets', { params }).then((r) => r.data);

export const replyToTicket = (id, message) =>
  client.post(`/api/support-tickets/${id}/reply`, { message }).then((r) => r.data);

export const closeTicket = (id) =>
  client.patch(`/api/support-tickets/${id}`, { status: 'closed' }).then((r) => r.data);

// ─── Medicine Orders (admin) ──────────────────────────────────────────────────
// Backend mounts at /api/medicine-orders
export const getAllOrders = (params = {}) =>
  client.get('/api/medicine-orders', { params }).then((r) => r.data);

export const updateOrderStatus = (id, status) =>
  client.put(`/api/medicine-orders/${id}/status`, { status }).then((r) => r.data);

// ─── Ambulances (admin) ───────────────────────────────────────────────────────
export const getAmbulances = (params = {}) =>
  client.get('/api/ambulances', { params }).then((r) => r.data);

export const addAmbulance = (payload) =>
  client.post('/api/ambulances', payload).then((r) => r.data);

export const updateAmbulance = (id, payload) =>
  client.put(`/api/ambulances/${id}`, payload).then((r) => r.data);

export const deleteAmbulance = (id) =>
  client.delete(`/api/ambulances/${id}`).then((r) => r.data);

// ─── Emergency Cases (admin) ──────────────────────────────────────────────────
export const getAdminEmergencies = (params = {}) =>
  client.get('/api/admin/emergencies', { params }).then((r) => r.data);

export const updateAdminEmergencyStatus = (id, status) =>
  client.patch(`/api/admin/emergencies/${id}/status`, { status }).then((r) => r.data);

// ─── Facility Appointments (admin) ─────────────────────────────────────────────
export const getAdminAppointments = (params = {}) =>
  client.get('/api/admin/appointments', { params }).then((r) => r.data);

// ─── Doctor Management (admin) ─────────────────────────────────────────────────
export const getAdminDoctors = (params = {}) =>
  client.get('/api/admin/doctors', { params }).then((r) => r.data);

export const verifyDoctor = (id, status, rejectionReason) =>
  client.put(`/api/admin/doctors/${id}/verify`, { status, rejectionReason }).then((r) => r.data);

