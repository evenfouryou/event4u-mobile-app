import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Animated, Easing } from 'react-native';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');
const logoImage = require('../../../assets/logo.png');

interface SplashScreenProps {
  onReady: (isAuthenticated: boolean) => void;
}

export function SplashScreen({ onReady }: SplashScreenProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

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
    if (assetsLoaded) {
      Animated.timing(glowOpacity, {
        toValue: 0.6,
        duration: 800,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowScale, {
            toValue: 1.1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 0.9,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      setTimeout(() => {
        Animated.timing(ringOpacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }).start();
        Animated.spring(ringScale, {
          toValue: 1,
          damping: 12,
          useNativeDriver: true,
        }).start();
      }, 200);

      setTimeout(() => {
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
        Animated.spring(logoScale, {
          toValue: 1,
          damping: 10,
          stiffness: 100,
          useNativeDriver: true,
        }).start();
      }, 300);

      setTimeout(() => {
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
        Animated.spring(textTranslateY, {
          toValue: 0,
          damping: 12,
          useNativeDriver: true,
        }).start();
      }, 600);

      const createDotAnimation = (dotOpacity: Animated.Value, delay: number) => {
        setTimeout(() => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(dotOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(dotOpacity, {
                toValue: 0.3,
                duration: 400,
                useNativeDriver: true,
              }),
            ])
          ).start();
        }, delay);
      };

      createDotAnimation(dot1Opacity, 800);
      createDotAnimation(dot2Opacity, 1000);
      createDotAnimation(dot3Opacity, 1200);
    }
  }, [assetsLoaded]);

  useEffect(() => {
    if (!isLoading && assetsLoaded) {
      const timer = setTimeout(() => {
        onReady(isAuthenticated);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, assetsLoaded, onReady]);

  const dot1Scale = dot1Opacity.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0.8, 1.2],
  });

  const dot2Scale = dot2Opacity.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0.8, 1.2],
  });

  const dot3Scale = dot3Opacity.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0.8, 1.2],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0e17', '#0f1520', '#0a0e17']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.glowOuter, { transform: [{ scale: glowScale }], opacity: glowOpacity }]}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)', 'transparent']}
          style={styles.glowGradient}
        />
      </Animated.View>

      <Animated.View style={[styles.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
      <Animated.View style={[styles.ringInner, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />

      <View style={styles.centerContent}>
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.08)']}
            style={styles.logoBg}
          >
            <Image
              source={logoImage}
              style={[styles.logo, { tintColor: '#FFFFFF' }]}
              resizeMode="contain"
            />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }}>
          <Text style={styles.tagline}>La tua serata inizia qui</Text>
        </Animated.View>
      </View>

      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.loadingDot, { opacity: dot1Opacity, transform: [{ scale: dot1Scale }] }]} />
        <Animated.View style={[styles.loadingDot, { opacity: dot2Opacity, transform: [{ scale: dot2Scale }] }]} />
        <Animated.View style={[styles.loadingDot, { opacity: dot3Opacity, transform: [{ scale: dot3Scale }] }]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Event4U</Text>
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
  glowOuter: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.75,
  },
  ring: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  ringInner: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  centerContent: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logoBg: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  logo: {
    width: 120,
    height: 60,
  },
  tagline: {
    fontSize: typography.fontSize.lg,
    color: colors.mutedForeground,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 120,
    flexDirection: 'row',
    gap: 12,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

export default SplashScreen;
