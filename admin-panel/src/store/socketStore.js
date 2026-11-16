import { create } from 'zustand';
import { io } from 'socket.io-client';

export const useSocketStore = create((set, get) => ({
  socket: null,
  connect: (token) => {
    if (get().socket) return;
    const socket = io('http://localhost:5000', { auth: { token }, withCredentials: true });
    set({ socket });
  },
  disconnect: () => {
    const s = get().socket;
    if (s) { s.disconnect(); set({ socket: null }); }
  },
}));