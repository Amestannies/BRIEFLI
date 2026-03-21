import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach access token from memory store
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 and attempt token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const err = error as { response?: { status?: number }; config?: Record<string, unknown> };
    if (err.response?.status === 401 && !err.config?.['_retry']) {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
        const res = await axios.post(`${apiBase}/auth/refresh`, {}, { withCredentials: true });
        const newToken = (res.data as { data?: { accessToken?: string } }).data?.accessToken;
        if (newToken && err.config) {
          sessionStorage.setItem('access_token', newToken);
          err.config['_retry'] = true;
          return api(err.config as unknown as Parameters<typeof api>[0]);
        }
      } catch {
        sessionStorage.removeItem('access_token');
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export { api };
export default api;
