import { create } from 'zustand';
import { authApi } from '../api/auth';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  fetchMe: async () => {
    try {
      const res = await authApi.me();
      set({ user: res.data.user, loading: false });
    } catch (err) {
      set({ user: null, loading: false });
    }
  },
  login: async (data) => {
    const res = await authApi.login(data);
    localStorage.setItem('token', res.data.token);
    set({ user: res.data.user });
    return res.data;
  },
  logout: async () => {
    await authApi.logout();
    localStorage.removeItem('token');
    set({ user: null });
  },
}));