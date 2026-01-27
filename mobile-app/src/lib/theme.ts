export const colors = {
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
  purple: '#8B5CF6',
  pink: '#EC4899',
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};

export const gradients = {
  golden: ['#FFD700', '#FFA500'] as const,
  goldenLight: ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)'] as const,
  teal: ['#00CED1', '#008B8B'] as const,
  tealLight: ['rgba(0, 206, 209, 0.15)', 'rgba(0, 206, 209, 0.05)'] as const,
  primary: ['#FFD700', '#FF8C00'] as const,
  purple: ['#8B5CF6', '#6D28D9'] as const,
  purpleLight: ['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)'] as const,
  blue: ['#3B82F6', '#1D4ED8'] as const,
  pink: ['#EC4899', '#BE185D'] as const,
  card: ['rgba(17, 24, 39, 0.8)', 'rgba(17, 24, 39, 0.6)'] as const,
  cardPurple: ['#4c1d95', '#7c3aed', '#a855f7'] as const,
  hero: ['rgba(255, 215, 0, 0.3)', 'transparent'] as const,
  heroTeal: ['rgba(0, 206, 209, 0.25)', 'transparent'] as const,
  dark: ['transparent', '#0a0e17'] as const,
  overlay: ['transparent', 'rgba(10, 14, 23, 0.9)'] as const,
  goldenTeal: ['rgba(255, 215, 0, 0.15)', 'rgba(0, 206, 209, 0.1)'] as const,
  creditCard: ['#1e3a5f', '#0f2744'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  lineHeight: {
    tight: 1.1,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  golden: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  teal: {
    shadowColor: '#00CED1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
};

export const hitSlop = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
};

export const touchableMinHeight = 48;
export const touchableMinHeightLarge = 56;

export default {
  colors,
  gradients,
  spacing,
  borderRadius,
  typography,
  shadows,
  hitSlop,
  touchableMinHeight,
  touchableMinHeightLarge,
};
