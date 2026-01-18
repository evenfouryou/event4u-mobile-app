export const colors = {
  background: '#0a0e17',
  surface: '#151922',
  card: '#151922',
  cardForeground: '#FFFFFF',
  
  primary: '#FFD700',
  primaryForeground: '#000000',
  
  secondary: '#1e2533',
  secondaryForeground: '#FFFFFF',
  
  accent: '#FFD700',
  accentForeground: '#000000',
  
  teal: '#00CED1',
  tealForeground: '#000000',
  
  foreground: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  
  muted: '#1e2533',
  mutedForeground: '#94A3B8',
  
  border: '#1e2533',
  borderSubtle: '#1e2533',
  
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  
  success: '#00CED1',
  successForeground: '#000000',
  
  warning: '#F59E0B',
  warningForeground: '#000000',
  
  error: '#EF4444',
  errorForeground: '#FFFFFF',
  
  glass: {
    background: 'rgba(21, 25, 34, 0.7)',
    border: 'rgba(255, 255, 255, 0.1)',
  },
  
  overlay: {
    dark: 'rgba(10, 14, 23, 0.9)',
    medium: 'rgba(10, 14, 23, 0.7)',
    light: 'rgba(10, 14, 23, 0.5)',
  },
} as const;

export type ColorKeys = keyof typeof colors;
