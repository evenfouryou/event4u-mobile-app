import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, spacing, typography, shadows, touchableMinHeight } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic, HapticType } from '@/lib/haptics';

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'golden';
type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: HapticType;
  testID?: string;
}

export function Button({
  children,
  onPress,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  style,
  textStyle,
  haptic = 'light',
  testID,
}: ButtonProps) {
  const { colors, gradients } = useTheme();
  
  const handlePress = () => {
    if (!disabled && !loading) {
      triggerHaptic(haptic);
      onPress?.();
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return { height: 40, paddingHorizontal: spacing.md };
      case 'lg':
        return { height: 56, paddingHorizontal: spacing.xl };
      case 'icon':
        return { width: 48, height: 48, paddingHorizontal: 0 };
      default:
        return { height: touchableMinHeight, paddingHorizontal: spacing.lg };
    }
  };

  const getTextSize = (): number => {
    switch (size) {
      case 'sm':
        return typography.fontSize.sm;
      case 'lg':
        return typography.fontSize.lg;
      default:
        return typography.fontSize.base;
    }
  };

  const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
    default: {
      container: { backgroundColor: staticColors.primary },
      text: { color: staticColors.primaryForeground, fontWeight: '600' },
    },
    secondary: {
      container: { backgroundColor: staticColors.secondary },
      text: { color: staticColors.secondaryForeground, fontWeight: '600' },
    },
    outline: {
      container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: staticColors.border },
      text: { color: staticColors.foreground, fontWeight: '500' },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: staticColors.foreground, fontWeight: '500' },
    },
    destructive: {
      container: { backgroundColor: staticColors.destructive },
      text: { color: staticColors.destructiveForeground, fontWeight: '600' },
    },
    golden: {
      container: { backgroundColor: staticColors.primary },
      text: { color: staticColors.primaryForeground, fontWeight: '700' },
    },
  };

  const variantStyle = variantStyles[variant];

  if (variant === 'golden') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          { opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
        ]}
        testID={testID}
      >
        <LinearGradient
          colors={[...gradients.golden]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.base,
            getSizeStyles(),
            shadows.golden,
            style,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={staticColors.primaryForeground} />
          ) : typeof children === 'string' || typeof children === 'number' ? (
            <Text style={[styles.text, { fontSize: getTextSize() }, variantStyle.text, textStyle]}>
              {children}
            </Text>
          ) : (
            children
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        getSizeStyles(),
        variantStyle.container,
        disabled && styles.disabled,
        { opacity: pressed ? 0.9 : 1 },
        style,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text.color} />
      ) : typeof children === 'string' || typeof children === 'number' ? (
        <Text style={[styles.text, { fontSize: getTextSize() }, variantStyle.text, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  text: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
