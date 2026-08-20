import client from './client';

// ─── Medicine Stock (catalog browsed by patients) ────────────────────────────
export const getMedicines = (params = {}) =>
  client.get('/api/medicine-stock', { params }).then((r) => r.data);

export const getMedicineById = (id) =>
  client.get(`/api/medicine-stock/${id}`).then((r) => r.data);

// ─── Medicine Orders ──────────────────────────────────────────────────────────
export const createOrder = (payload) =>
  client.post('/api/medicine-orders', payload).then((r) => r.data);

export const getMyOrders = () =>
  client.get('/api/medicine-orders/patient').then((r) => r.data);

export const getOrderById = (id) =>
  client.get(`/api/medicine-orders/${id}`).then((r) => r.data);

export const cancelOrder = (id) =>
  client.put(`/api/medicine-orders/${id}/status`, { status: 'cancelled' }).then((r) => r.data);

// ─── Medicine Reminders ───────────────────────────────────────────────────────
// Backend mounts medicine reminder routes at /api/medicines (medicine.routes.js)
export const getReminders = () =>
  client.get('/api/medicines/patient').then((r) => r.data);

export const createReminder = (payload) =>
  client.post('/api/medicines', payload).then((r) => r.data);

export const updateReminder = (id, payload) =>
  client.put(`/api/medicines/${id}`, payload).then((r) => r.data);

export const deleteReminder = (id) =>
  client.delete(`/api/medicines/${id}`).then((r) => r.data);

export const updateReminderStatus = (id, status) =>
  client.put(`/api/medicines/${id}/status`, { status }).then((r) => r.data);
