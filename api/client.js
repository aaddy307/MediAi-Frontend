import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import storage from '../utils/storage';

const getBaseUrl = () => {
  // 1. Prioritize environment variables (.env) for both development and production
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Constants.expoConfig?.extra?.apiUrl) return Constants.expoConfig.extra.apiUrl;

  // 2. Web environment (dynamically matches the host browser location)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:5000`;
  }

  // 3. Development environment: dynamically resolve host from Metro server IP
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host) return `http://${host}:5000`;
    }
    return 'http://localhost:5000';
  }

  // 4. Production fallback (replace with your actual production domain URL)
  return 'https://api.yourproductiondomain.com';
};

const API_URL = getBaseUrl();

const client = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

client.interceptors.request.use(async (config) => {
  const token = await storage.getItem('mediai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await storage.deleteItem('mediai_token');
      await storage.deleteItem('mediai_user');
    }
    return Promise.reject(err);
  }
);

export default client;
