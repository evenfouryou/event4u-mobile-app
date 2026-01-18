import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, borderRadius, spacing, fontSize, fontWeight } from '../theme';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'teal';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  const getLoaderColor = () => {
    if (variant === 'outline' || variant === 'ghost') {
      return colors.primary;
    }
    if (variant === 'primary' || variant === 'teal') {
      return colors.background;
    }
    return colors.foreground;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyles}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={getLoaderColor()}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: colors.destructive,
  },
  teal: {
    backgroundColor: colors.teal,
  },
  disabled: {
    opacity: 0.5,
  },
  size_sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
  },
  size_lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    minHeight: 52,
  },
  text: {
    fontWeight: fontWeight.semibold,
  },
  text_primary: {
    color: colors.primaryForeground,
  },
  text_secondary: {
    color: colors.foreground,
  },
  text_outline: {
    color: colors.foreground,
  },
  text_ghost: {
    color: colors.foreground,
  },
  text_destructive: {
    color: colors.destructiveForeground,
  },
  text_teal: {
    color: colors.tealForeground,
  },
  textDisabled: {
    opacity: 0.7,
  },
  textSize_sm: {
    fontSize: fontSize.sm,
  },
  textSize_md: {
    fontSize: fontSize.base,
  },
  textSize_lg: {
    fontSize: fontSize.lg,
  },
});
