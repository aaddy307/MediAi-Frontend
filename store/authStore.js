import { create } from 'zustand';
import storage from '../utils/storage';

const TOKEN_KEY = 'mediai_token';
const USER_KEY = 'mediai_user';

const useAuthStore = create((set) => ({
  token: null,
  user: null,
  role: null,
  isLoading: true,

  loadToken: async () => {
    try {
      const token = await storage.getItem(TOKEN_KEY);
      const userRaw = await storage.getItem(USER_KEY);
      let user = userRaw ? JSON.parse(userRaw) : null;
      if (user) {
        user.fullName = user.fullName || user.name || user.email?.split('@')[0] || '';
        user.name = user.fullName;
      }
      set({ token, user, role: user?.role ?? null, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  login: async (token, userData) => {
    const fullName = userData?.fullName || userData?.name || userData?.email?.split('@')[0] || '';
    const user = userData ? {
      ...userData,
      fullName,
      name: fullName,
    } : null;
    await storage.setItem(TOKEN_KEY, token);
    await storage.setItem(USER_KEY, JSON.stringify(user ?? {}));
    set({ token, user, role: user?.role ?? null });
  },

  logout: async () => {
    await storage.deleteItem(TOKEN_KEY);
    await storage.deleteItem(USER_KEY);
    set({ token: null, user: null, role: null });
  },
}));

export default useAuthStore;
