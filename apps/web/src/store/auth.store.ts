import { create } from 'zustand';
import type { User } from '@briefli/shared';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => {
    sessionStorage.setItem('access_token', accessToken);
    set({ user, accessToken });
  },
  clearAuth: () => {
    sessionStorage.removeItem('access_token');
    set({ user: null, accessToken: null });
  },
}));
