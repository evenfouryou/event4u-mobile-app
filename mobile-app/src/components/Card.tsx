import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, borderRadius, spacing, shadows } from '@/lib/theme';
import { triggerHaptic } from '@/lib/haptics';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'glass' | 'elevated';
  onPress?: () => void;
  testID?: string;
}

export function Card({ children, style, variant = 'default', onPress, testID }: CardProps) {
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
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.base,
          getVariantStyles(),
          { opacity: pressed ? 0.95 : 1 },
          style,
        ]}
        testID={testID}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.base, getVariantStyles(), style]} testID={testID}>
      {children}
    </View>
  );
}

export function GlassCard({ children, style, onPress, testID }: Omit<CardProps, 'variant'>) {
  const handlePress = () => {
    if (onPress) {
      triggerHaptic('light');
      onPress();
    }
  };

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.glassBase,
          { opacity: pressed ? 0.95 : 1 },
          style,
        ]}
        testID={testID}
      >
        <BlurView intensity={20} tint="dark" style={styles.blurView}>
          <View style={styles.glassContent}>{children}</View>
        </BlurView>
      </Pressable>
    );
  }

  return (
    <View style={[styles.glassBase, style]} testID={testID}>
      <BlurView intensity={20} tint="dark" style={styles.blurView}>
        <View style={styles.glassContent}>{children}</View>
      </BlurView>
    </View>
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
