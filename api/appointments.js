import client from './client';

// ─── Patient Appointments ─────────────────────────────────────────────────────
export const getAppointments = (params = {}) =>
  client.get('/api/appointments/patient', { params }).then((r) => r.data);

export const getAppointmentById = (id) =>
  client.get(`/api/appointments/${id}`).then((r) => r.data);

export const createAppointment = (payload) =>
  client.post('/api/appointments', payload).then((r) => r.data);

// Backend uses PUT (not PATCH) for updates
export const updateAppointment = (id, payload) =>
  client.put(`/api/appointments/${id}`, payload).then((r) => r.data);

export const cancelAppointment = (id) =>
  client.put(`/api/appointments/${id}`, { status: 'cancelled' }).then((r) => r.data);

export const getUpcomingAppointment = () =>
  client
    .get('/api/appointments/patient', { params: { upcoming: 1, limit: 1 } })
    .then((r) => r.data);

export const deleteAppointment = (id) =>
  client.delete(`/api/appointments/${id}`).then((r) => r.data);

// ─── Doctor Appointment Views ─────────────────────────────────────────────────
export const getDoctorAppointments = (params = {}) =>
  client.get('/api/appointments/doctor', { params }).then((r) => r.data);

export const getDoctorPatients = () =>
  client.get('/api/appointments/doctor/patients').then((r) => r.data);

export const getDoctorPatientDetail = (patientId) =>
  client
    .get(`/api/appointments/doctor/patient/${patientId}`)
    .then((r) => r.data);

// ─── Doctor Slot Availability ─────────────────────────────────────────────────
// Requires backend route: GET /api/appointments/slots/:doctorId
export const getDoctorSlots = (doctorId, date) =>
  client
    .get(`/api/appointments/slots/${doctorId}`, { params: { date } })
    .then((r) => r.data);
