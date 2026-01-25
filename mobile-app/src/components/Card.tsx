import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors, borderRadius, spacing, shadows } from '@/lib/theme';
import { triggerHaptic } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'glass' | 'elevated';
  onPress?: () => void;
  testID?: string;
}

export function Card({ children, style, variant = 'default', onPress, testID }: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }
  };

  const handlePress = () => {
    if (onPress) {
      triggerHaptic('light');
      onPress();
    }
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'glass':
        return {
          backgroundColor: colors.glass,
          borderColor: colors.glassBorder,
          borderWidth: 1,
        };
      case 'elevated':
        return {
          backgroundColor: colors.card,
          ...shadows.md,
        };
      default:
        return {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
        };
    }
  };

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, styles.base, getVariantStyles(), style]}
        testID={testID}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={[styles.base, getVariantStyles(), style]} testID={testID}>
      {children}
    </View>
  );
}

export function GlassCard({ children, style, onPress, testID }: Omit<CardProps, 'variant'>) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }
  };

  const handlePress = () => {
    if (onPress) {
      triggerHaptic('light');
      onPress();
    }
  };

  const Container = onPress ? AnimatedPressable : Animated.View;

  return (
    <Container
      onPress={onPress ? handlePress : undefined}
      onPressIn={onPress ? handlePressIn : undefined}
      onPressOut={onPress ? handlePressOut : undefined}
      style={[animatedStyle, styles.glassBase, style]}
      testID={testID}
    >
      <BlurView intensity={20} tint="dark" style={styles.blurView}>
        <View style={styles.glassContent}>{children}</View>
      </BlurView>
    </Container>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  glassBase: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  blurView: {
    flex: 1,
  },
  glassContent: {
    padding: spacing.lg,
  },
});

export default Card;
