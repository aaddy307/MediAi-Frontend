import client from './client';

// Backend mounts vitals at /api/patient/vitals (vitals.routes.js)

export const getVitals = (params = {}) =>
  client.get('/api/patient/vitals/history', { params }).then((r) => r.data);

export const getLatestVitals = () =>
  client.get('/api/patient/vitals/latest').then((r) => r.data);

export const logVitals = (payload) =>
  client.post('/api/patient/vitals', payload).then((r) => r.data);

export const getVitalsHistory = (type, days = 30) =>
  client
    .get('/api/patient/vitals/history', { params: { type, days } })
    .then((r) => r.data);
