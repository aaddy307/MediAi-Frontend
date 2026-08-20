import client from './client';

export const checkSymptoms = (symptoms, previousMessages = [], mode, imageUrl) =>
  client.post('/api/ai/symptom-check', { symptoms, previousMessages, mode, imageUrl }).then((r) => r.data);

// ─── AI Chat (requires backend route: POST /api/ai/chat) ─────────────────────
export const getAIChatResponse = (message, history = []) =>
  client.post('/api/ai/chat', { message, history }).then((r) => r.data);

// ─── Medical Scan / Image Analysis ───────────────────────────────────────────
// Requires backend route: POST /api/ai/analyze-scan
export const analyzeScan = (formData) =>
  client
    .post('/api/ai/analyze-scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);

// ─── Symptom Image Upload ─────────────────────────────────────────────────────
export const uploadSymptomImage = (formData) =>
  client
    .post('/api/ai/upload-symptom-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
