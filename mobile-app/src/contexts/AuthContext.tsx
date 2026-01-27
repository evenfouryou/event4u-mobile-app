import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<{ role?: string }>;
  register: (data: RegisterData) => Promise<{ customerId: string }>;
  verifyOtp: (customerId: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
  gender: 'M' | 'F';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_CREDENTIALS_KEY = 'event4u_credentials';
const AUTH_USER_KEY = 'event4u_user';
const AUTH_TOKEN_KEY = 'event4u_auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveCredentials = async (identifier: string, password: string) => {
    try {
      await SecureStore.setItemAsync(AUTH_CREDENTIALS_KEY, JSON.stringify({ identifier, password }));
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  // Re-authenticate using stored credentials (called by API client on 401)
  const reAuthenticate = async (): Promise<boolean> => {
    try {
      const storedCredentials = await SecureStore.getItemAsync(AUTH_CREDENTIALS_KEY);
      if (!storedCredentials) {
        return false;
      }
      
      const { identifier, password } = JSON.parse(storedCredentials);
      const isPhone = identifier.startsWith('+') || /^\d{8,15}$/.test(identifier.replace(/[\s\-()]/g, ''));
      
      const body: any = { password };
      if (isPhone) {
        body.phone = identifier;
      } else {
        body.email = identifier;
      }

      // Use postDirect to avoid triggering another re-auth cycle
      const response = await api.postDirect<{ user: User; message: string; token?: string }>('/api/auth/login', body);
      
      if (response.user) {
        setUser(response.user);
        await saveUser(response.user);
        
        // Save and use auth token if provided - this is critical for the retry to work
        if (response.token) {
          await SecureStore.setItemAsync(AUTH_TOKEN_KEY, response.token);
          api.setAuthToken(response.token);
          console.log('[Auth] New token saved after re-authentication:', response.token.substring(0, 10) + '...');
        } else {
          console.log('[Auth] Warning: No token received from login response');
        }
        
        console.log('[Auth] Re-authenticated successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Auth] Re-authentication failed:', error);
      return false;
    }
  };

  // Load saved token and set up the re-auth handler on mount
  useEffect(() => {
    const loadSavedToken = async () => {
      try {
        const savedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        if (savedToken) {
          api.setAuthToken(savedToken);
          console.log('[Auth] Loaded saved auth token');
        }
      } catch (error) {
        console.error('[Auth] Error loading saved token:', error);
      }
    };
    
    loadSavedToken();
    api.setReAuthHandler(reAuthenticate);
  }, []);

  const saveUser = async (userData: User) => {
    try {
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const clearStoredData = async () => {
    try {
      await SecureStore.deleteItemAsync(AUTH_CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(AUTH_USER_KEY);
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      api.setAuthToken(null);
    } catch (error) {
      console.error('Error clearing stored data:', error);
    }
  };

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      // CRITICAL FIX 2026-01-27: Load saved auth token first before any API calls
      const savedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (savedToken) {
        api.setAuthToken(savedToken);
        console.log('[Auth] Restored saved auth token');
      }
      
      // First try to validate existing session
      try {
        const userData = await api.get<{ user: User }>('/api/auth/user');
        if (userData && userData.user) {
          setUser(userData.user);
          await saveUser(userData.user);
          return;
        }
      } catch (sessionError) {
        console.log('Session expired, trying stored credentials...');
      }
      
      // Session invalid, try to re-authenticate with stored credentials
      const storedCredentials = await SecureStore.getItemAsync(AUTH_CREDENTIALS_KEY);
      if (storedCredentials) {
        try {
          const { identifier, password } = JSON.parse(storedCredentials);
          
          // Detect if it's email, phone, or username
          const isPhone = identifier.startsWith('+') || /^\d{8,15}$/.test(identifier.replace(/[\s\-()]/g, ''));
          
          const body: any = { password };
          if (isPhone) {
            body.phone = identifier;
          } else {
            body.email = identifier;
          }

          // Use postDirect to bypass re-auth handler during login
          const response = await api.postDirect<{ user: User; message: string; token?: string }>('/api/auth/login', body);
          
          if (response.user) {
            setUser(response.user);
            await saveUser(response.user);
            
            // CRITICAL FIX 2026-01-27: Save and set token from re-authentication
            if (response.token) {
              await SecureStore.setItemAsync(AUTH_TOKEN_KEY, response.token);
              api.setAuthToken(response.token);
              console.log('[Auth] Token saved from re-authentication');
            }
            
            console.log('Re-authenticated successfully');
            return;
          }
        } catch (reAuthError) {
          console.log('Re-authentication failed, clearing stored credentials');
          await clearStoredData();
        }
      }
      
      // No valid session or stored credentials, try to load cached user for offline display
      const storedUser = await SecureStore.getItemAsync(AUTH_USER_KEY);
      if (storedUser) {
        // Only set user if we have stored credentials (otherwise it's stale data)
        const hasCredentials = await SecureStore.getItemAsync(AUTH_CREDENTIALS_KEY);
        if (hasCredentials) {
          setUser(JSON.parse(storedUser));
          return;
        }
      }
      
      setUser(null);
    } catch (error) {
      console.log('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    // Prefetch public events on app startup for instant landing page
    api.prefetchPublicEvents(6);
    api.prefetchPublicEvents(50);
  }, []);

  const login = async (identifier: string, password: string): Promise<{ role?: string }> => {
    try {
      // Detect if it's email, phone, or username
      const isPhone = identifier.startsWith('+') || /^\d{8,15}$/.test(identifier.replace(/[\s\-()]/g, ''));
      
      const body: any = { password };
      if (isPhone) {
        body.phone = identifier;
      } else {
        body.email = identifier;
      }

      const response = await api.post<{ user: User; message: string; token?: string }>('/api/auth/login', body);

      if (response.user) {
        setUser(response.user);
        
        // Save credentials and user for persistence
        await saveCredentials(identifier, password);
        await saveUser(response.user);
        
        // Save and use auth token if provided (for mobile app Bearer token auth)
        if (response.token) {
          await SecureStore.setItemAsync(AUTH_TOKEN_KEY, response.token);
          api.setAuthToken(response.token);
          console.log('[Auth] Token saved and set for API requests');
        }
        
        // Prefetch dashboard data for instant navigation (Instagram-style)
        const role = response.user.role;
        if (role === 'pr') {
          api.prefetchPrDashboard();
        } else if (role === 'scanner') {
          api.prefetchScannerDashboard();
        } else {
          api.prefetchClientDashboard();
        }
        
        return { role: response.user.role };
      }
      return { role: 'client' };
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Credenziali non valide');
    }
  };

  const register = async (data: RegisterData): Promise<{ customerId: string }> => {
    try {
      const response = await api.post<{ customerId: string; message: string }>('/api/public/customers/register', {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        birthDate: data.birthDate,
        gender: data.gender,
      });

      return { customerId: response.customerId };
    } catch (error: any) {
      console.error('Register error:', error);
      throw new Error(error.message || 'Errore durante la registrazione');
    }
  };

  const verifyOtp = async (customerId: string, otpCode: string) => {
    try {
      const response = await api.post<{ user: User; message: string }>('/api/public/customers/verify-otp', {
        customerId,
        otpCode,
      });

      if (response.user) {
        setUser(response.user);
        await saveUser(response.user);
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      throw new Error(error.message || 'Codice OTP non valido');
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      await clearStoredData();
      api.clearCache();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verifyOtp,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
