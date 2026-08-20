import client from './client';

export const getDoctors = (params = {}) =>
  client.get('/api/doctors', { params }).then((r) => r.data);

export const getDoctorById = (id) =>
  client.get(`/api/doctors/${id}`).then((r) => r.data);

export const getDoctorAvailability = (id) =>
  client.get(`/api/doctors/${id}/availability`).then((r) => r.data);

export const searchDoctors = (query, specialty) =>
  client.get('/api/doctors', { params: { search: query, specialty } }).then((r) => r.data);

export const getDoctorPatients = () =>
  client.get('/api/doctors/my-patients').then((r) => r.data);
