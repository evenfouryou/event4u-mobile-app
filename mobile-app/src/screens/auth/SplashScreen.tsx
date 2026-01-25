import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Asset } from 'expo-asset';
import { colors, typography, spacing } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';

const logoImage = require('../../../assets/logo.png');

interface SplashScreenProps {
  onReady: (isAuthenticated: boolean) => void;
}

export function SplashScreen({ onReady }: SplashScreenProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  const loadAssets = useCallback(async () => {
    try {
      await Asset.loadAsync([logoImage]);
      setAssetsLoaded(true);
    } catch {
      setAssetsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    if (!isLoading && assetsLoaded) {
      const timer = setTimeout(() => {
        onReady(isAuthenticated);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, assetsLoaded, onReady]);

  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      
      <View style={styles.logoContainer}>
        <Image
          source={logoImage}
          style={[styles.logo, { tintColor: '#FFFFFF' }]}
          resizeMode="contain"
        />
      </View>

      <View style={styles.textContainer}>
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
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 80,
  },
  textContainer: {
    alignItems: 'center',
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
