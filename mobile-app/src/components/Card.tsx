import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { borderRadius, spacing, shadows } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'glass' | 'elevated';
  onPress?: () => void;
  testID?: string;
}

export function Card({ children, style, variant = 'default', onPress, testID }: CardProps) {
  const { colors, isDark } = useTheme();
  
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
          backgroundColor: staticColors.glass,
          borderColor: staticColors.glassBorder,
          borderWidth: 1,
        };
      case 'elevated':
        return {
          backgroundColor: staticColors.card,
          ...shadows.md,
        };
      default:
        return {
          backgroundColor: staticColors.card,
          borderColor: staticColors.border,
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
  const { colors, isDark } = useTheme();
  
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
          {
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: staticColors.glassBorder,
          },
          { opacity: pressed ? 0.95 : 1 },
          style,
        ]}
        testID={testID}
      >
        <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.blurView}>
          <View style={[styles.glassContent, { backgroundColor: staticColors.glass }]}>{children}</View>
        </BlurView>
      </Pressable>
    );
  }

  return (
    <View style={[{
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: staticColors.glassBorder,
    }, style]} testID={testID}>
      <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.blurView}>
        <View style={[styles.glassContent, { backgroundColor: staticColors.glass }]}>{children}</View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  blurView: {
    flex: 1,
  },
  glassContent: {
    flex: 1,
    padding: spacing.md,
  },
});
