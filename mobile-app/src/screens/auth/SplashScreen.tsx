import { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, typography } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';

interface SplashScreenProps {
  onReady: (isAuthenticated: boolean) => void;
}

export function SplashScreen({ onReady }: SplashScreenProps) {
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        onReady(isAuthenticated);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, onReady]);

  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>E4U</Text>
        </View>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>Event4U</Text>
        <Text style={styles.subtitle}>La tua serata inizia qui</Text>
      </View>

      <View style={styles.loadingContainer}>
        <View style={styles.loadingDot} />
        <View style={[styles.loadingDot, styles.loadingDotDelay1]} />
        <View style={[styles.loadingDot, styles.loadingDotDelay2]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
    opacity: 0.15,
    top: '30%',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 15,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primaryForeground,
    letterSpacing: -1,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.mutedForeground,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  loadingDotDelay1: {
    opacity: 0.6,
  },
  loadingDotDelay2: {
    opacity: 1,
  },
});

export default SplashScreen;
