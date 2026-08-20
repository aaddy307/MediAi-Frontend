import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { connectSocket, disconnectSocket, getSocket } from '../realtime/socket';
import useAuthStore from '../store/authStore';

export default function useSocket(events = {}) {
  const { token, user } = useAuthStore();
  const appState = useRef(AppState.currentState);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const setupListeners = useCallback((socket) => {
    Object.entries(eventsRef.current).forEach(([event, handler]) => {
      socket.off(event); // prevent duplicate listeners
      socket.on(event, handler);
    });
  }, []);

  const connect = useCallback(() => {
    if (!token) return;
    const socket = connectSocket();
    if (user?._id) {
      socket.emit('join', { userId: user._id });
    }
    setupListeners(socket);
  }, [token, user?._id, setupListeners]);

  useEffect(() => {
    connect();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground — reconnect if needed
        const socket = getSocket();
        if (!socket?.connected) {
          connect();
        }
      }
      if (nextState.match(/inactive|background/)) {
        // Optionally disconnect on background
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
      // Cleanup event listeners only, don't fully disconnect (keep for push notifs)
      const socket = getSocket();
      if (socket) {
        Object.keys(eventsRef.current).forEach((event) => socket.off(event));
      }
    };
  }, [connect]);

  const emit = useCallback((event, data) => {
    const socket = getSocket();
    socket?.emit(event, data);
  }, []);

  return { emit };
}
