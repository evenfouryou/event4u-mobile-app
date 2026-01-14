import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  companyId?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const response = await api.post<{ user: User; token?: string }>('/api/auth/login', {
      email,
      password,
    });
    
    if (response.token) {
      await SecureStore.setItemAsync('authToken', response.token);
    }
    
    set({ user: response.user, isAuthenticated: true });
  },

  register: async (data: RegisterData) => {
    const response = await api.post<{ user: User; token?: string }>('/api/auth/register', data);
    
    if (response.token) {
      await SecureStore.setItemAsync('authToken', response.token);
    }
    
    set({ user: response.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      // Ignore logout errors
    }
    await SecureStore.deleteItemAsync('authToken');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const user = await api.get<User>('/api/auth/user');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
