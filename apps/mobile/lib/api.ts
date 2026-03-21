import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// TODO: attach token from MMKV storage
api.interceptors.request.use((config) => {
  // const token = storage.getString('access_token');
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
