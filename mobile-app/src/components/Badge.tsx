import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, borderRadius, spacing, typography } from '@/lib/theme';

type BadgeVariant = 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'outline' | 'golden' | 'teal';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
  testID,
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, { container: ViewStyle; text: TextStyle }> = {
    default: {
      container: { backgroundColor: colors.primary },
      text: { color: colors.primaryForeground },
    },
    secondary: {
      container: { backgroundColor: colors.secondary },
      text: { color: colors.secondaryForeground },
    },
    success: {
      container: { backgroundColor: colors.success },
      text: { color: colors.successForeground },
    },
    destructive: {
      container: { backgroundColor: colors.destructive },
      text: { color: colors.destructiveForeground },
    },
    warning: {
      container: { backgroundColor: colors.warning },
      text: { color: colors.warningForeground },
    },
    outline: {
      container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
      text: { color: colors.foreground },
    },
    golden: {
      container: { backgroundColor: colors.primary },
      text: { color: '#000' },
    },
    teal: {
      container: { backgroundColor: colors.teal },
      text: { color: '#000' },
    },
  };

  const sizeStyles: Record<BadgeSize, { container: ViewStyle; text: TextStyle }> = {
    sm: {
      container: { paddingHorizontal: spacing.xs, paddingVertical: 2 },
      text: { fontSize: typography.fontSize.xs - 2 },
    },
    md: {
      container: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
      text: { fontSize: typography.fontSize.xs },
    },
    lg: {
      container: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
      text: { fontSize: typography.fontSize.sm },
    },
  };

  const currentStyle = variantStyles[variant] || variantStyles.default;
  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <View style={[styles.base, currentStyle.container, currentSize.container, style]} testID={testID}>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text style={[styles.text, currentStyle.text, currentSize.text, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export function LiveBadge({ testID }: { testID?: string }) {
  return (
    <Badge variant="success" style={styles.liveBadge} testID={testID}>
      <View style={styles.liveContent}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>Live</Text>
      </View>
    </Badge>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  liveBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  liveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.successForeground,
  },
  liveText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.successForeground,
  },
});

export default Badge;
