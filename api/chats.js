import client from './client';

// Get all chats for logged-in user (role-aware: patient or doctor)
export const getChats = () => {
  let role = 'patient';
  try {
    const auth = require('../store/authStore').default;
    role = auth.getState()?.user?.role || 'patient';
  } catch (_) {}
  const endpoint = role === 'doctor' ? '/api/chats/doctor/all' : '/api/chats/patient/all';
  return client.get(endpoint).then((r) => r.data);
};

// Get doctor's chats
export const getDoctorChats = () =>
  client.get('/api/chats/doctor/all').then((r) => r.data);

// Get a single chat with its messages
export const getChatMessages = (chatId) =>
  client.get(`/api/chats/${chatId}`).then((r) => r.data);

// Create / init a chat
export const initChat = (participantId, participantModel = 'Doctor') =>
  client.post('/api/chats', { participantId, participantModel }).then((r) => r.data);

// Send a message inside a chat
export const sendMessage = (chatId, content, attachmentUrl) =>
  client
    .post(`/api/chats/${chatId}/messages`, { content, attachmentUrl })
    .then((r) => r.data);

// Mark chat as read
export const markChatRead = (chatId) =>
  client.patch(`/api/chats/${chatId}/read`).then((r) => r.data);

// Upload a chat attachment (image / file)
export const uploadChatAttachment = (formData) =>
  client
    .post('/api/chats/attachment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);

// Request a consultation (patient → doctor)
export const requestConsultation = (payload) =>
  client.post('/api/chats/request', payload).then((r) => r.data);

// End a consultation
export const endConsultation = (chatId) =>
  client.put(`/api/chats/${chatId}/end`).then((r) => r.data);

// Cancel a consultation
export const cancelConsultation = (chatId) =>
  client.put(`/api/chats/${chatId}/cancel`).then((r) => r.data);

// Doctor responds to a consultation request
export const respondToConsultation = (chatId, payload) =>
  client.put(`/api/chats/${chatId}/respond`, payload).then((r) => r.data);

// Get pending consultation requests (doctor)
export const getPendingRequests = () =>
  client.get('/api/chats/doctor/pending').then((r) => r.data);

// Delete a message
export const deleteMessage = (chatId, messageIndex) =>
  client.delete(`/api/chats/${chatId}/messages/${messageIndex}`).then((r) => r.data);
