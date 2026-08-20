import client from './client';

// Backend mounts payment at /api/payment

// Get user's own transaction history
export const getMyTransactions = (params = {}) =>
  client.get('/api/payment/my-transactions', { params }).then((r) => r.data);

export const getTransactionById = (id) =>
  client.get(`/api/payment/${id}`).then((r) => r.data);

// Initiate a Stripe-style checkout session
export const createCheckoutSession = (payload) =>
  client.post('/api/payment/checkout', payload).then((r) => r.data);

// Pay for a consultation
export const payForConsultation = (payload) =>
  client.post('/api/payment/consultation', payload).then((r) => r.data);

// Simulate a webhook (dev/testing only)
export const simulateWebhook = (payload) =>
  client.post('/api/payment/simulate-webhook', payload).then((r) => r.data);
