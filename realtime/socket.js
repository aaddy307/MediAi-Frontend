import { io } from 'socket.io-client';
import Constants from 'expo-constants';

let socket;

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.41.130:5000';

export function connectSocket() {
  if (socket?.connected) return socket;
  socket = io(API_URL, { transports: ['websocket'] });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

// WebRTC call events match server.js exactly — wire these up in Phase 6:
// socket.emit('callUser', { from, roomToCall, signalData, name, isVideo, callerModel, callerId, chatId })
// socket.on('callUser' | 'callAccepted' | 'callRejected' | 'iceCandidate' | 'callEnded', handler)
