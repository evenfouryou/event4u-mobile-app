import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  border: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  teal: string;
  golden: string;
  glass: string;
  glassBorder: string;
}

const darkColors: ThemeColors = {
  background: '#0a0e17',
  foreground: '#f8fafc',
  card: '#111827',
  cardForeground: '#f8fafc',
  border: '#1e293b',
  primary: '#FFD700',
  primaryForeground: '#000000',
  secondary: '#1e293b',
  secondaryForeground: '#f8fafc',
  muted: '#1e293b',
  mutedForeground: '#94a3b8',
  accent: '#1e293b',
  accentForeground: '#f8fafc',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  success: '#00CED1',
  successForeground: '#000000',
  warning: '#f59e0b',
  warningForeground: '#000000',
  teal: '#00CED1',
  golden: '#FFD700',
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};

const lightColors: ThemeColors = {
  background: '#ffffff',
  foreground: '#0f172a',
  card: '#f8fafc',
  cardForeground: '#0f172a',
  border: '#e2e8f0',
  primary: '#d4a500',
  primaryForeground: '#ffffff',
  secondary: '#f1f5f9',
  secondaryForeground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  accent: '#f1f5f9',
  accentForeground: '#0f172a',
  destructive: '#dc2626',
  destructiveForeground: '#ffffff',
  success: '#0891b2',
  successForeground: '#ffffff',
  warning: '#d97706',
  warningForeground: '#ffffff',
  teal: '#0891b2',
  golden: '#d4a500',
  glass: 'rgba(0, 0, 0, 0.03)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
};

interface ThemeGradients {
  golden: readonly [string, string];
  goldenLight: readonly [string, string];
  teal: readonly [string, string];
  tealLight: readonly [string, string];
  primary: readonly [string, string];
  purple: readonly [string, string];
  purpleLight: readonly [string, string];
  blue: readonly [string, string];
  pink: readonly [string, string];
  card: readonly [string, string];
  hero: readonly [string, string];
  heroTeal: readonly [string, string];
  dark: readonly [string, string];
  overlay: readonly [string, string];
  goldenTeal: readonly [string, string];
  creditCard: readonly [string, string];
}

const darkGradients: ThemeGradients = {
  golden: ['#FFD700', '#FFA500'],
  goldenLight: ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)'],
  teal: ['#00CED1', '#008B8B'],
  tealLight: ['rgba(0, 206, 209, 0.15)', 'rgba(0, 206, 209, 0.05)'],
  primary: ['#FFD700', '#FF8C00'],
  purple: ['#8B5CF6', '#6D28D9'],
  purpleLight: ['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)'],
  blue: ['#3B82F6', '#1D4ED8'],
  pink: ['#EC4899', '#BE185D'],
  card: ['rgba(17, 24, 39, 0.8)', 'rgba(17, 24, 39, 0.6)'],
  hero: ['rgba(255, 215, 0, 0.3)', 'transparent'],
  heroTeal: ['rgba(0, 206, 209, 0.25)', 'transparent'],
  dark: ['transparent', '#0a0e17'],
  overlay: ['transparent', 'rgba(10, 14, 23, 0.9)'],
  goldenTeal: ['rgba(255, 215, 0, 0.15)', 'rgba(0, 206, 209, 0.1)'],
  creditCard: ['#1e3a5f', '#0f2744'],
};

const lightGradients: ThemeGradients = {
  golden: ['#d4a500', '#b8860b'],
  goldenLight: ['rgba(212, 165, 0, 0.12)', 'rgba(212, 165, 0, 0.04)'],
  teal: ['#0891b2', '#0e7490'],
  tealLight: ['rgba(8, 145, 178, 0.12)', 'rgba(8, 145, 178, 0.04)'],
  primary: ['#d4a500', '#b8860b'],
  purple: ['#8B5CF6', '#7c3aed'],
  purpleLight: ['rgba(139, 92, 246, 0.12)', 'rgba(139, 92, 246, 0.04)'],
  blue: ['#3B82F6', '#2563eb'],
  pink: ['#EC4899', '#db2777'],
  card: ['rgba(248, 250, 252, 0.9)', 'rgba(248, 250, 252, 0.7)'],
  hero: ['rgba(212, 165, 0, 0.2)', 'transparent'],
  heroTeal: ['rgba(8, 145, 178, 0.15)', 'transparent'],
  dark: ['transparent', '#ffffff'],
  overlay: ['transparent', 'rgba(255, 255, 255, 0.95)'],
  goldenTeal: ['rgba(212, 165, 0, 0.1)', 'rgba(8, 145, 178, 0.08)'],
  creditCard: ['#3b82f6', '#1d4ed8'],
};

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  gradients: ThemeGradients;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'event4u_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadThemeMode();
  }, []);

  const loadThemeMode = async () => {
    try {
      const savedMode = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
      if (savedMode && ['light', 'dark', 'auto'].includes(savedMode)) {
        setModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme mode:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  const isDark = mode === 'auto' 
    ? systemColorScheme === 'dark' 
    : mode === 'dark';

  const colors = isDark ? darkColors : lightColors;
  const gradients = isDark ? darkGradients : lightGradients;

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, gradients, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { darkColors, lightColors, darkGradients, lightGradients };
export type { ThemeColors, ThemeGradients };
