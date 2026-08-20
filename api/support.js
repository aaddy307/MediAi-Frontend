import client from './client';

// Backend mounts at /api/support-tickets

export const getMyTickets = () =>
  client.get('/api/support-tickets/my').then((r) => r.data);

export const createTicket = (payload) =>
  client.post('/api/support-tickets', payload).then((r) => r.data);

export const getTicketById = (id) =>
  client.get(`/api/support-tickets/${id}`).then((r) => r.data);

export const addTicketMessage = (id, message) =>
  client.post(`/api/support-tickets/${id}/reply`, { message }).then((r) => r.data);

export const deleteTicket = (id) =>
  client.delete(`/api/support-tickets/${id}`).then((r) => r.data);
