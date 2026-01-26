import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors as staticColors, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}

export function Loading({ size = 'large', color, text }: LoadingProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color || colors.primary} />
      {text && <Text style={[styles.text, { color: colors.mutedForeground }]}>{text}</Text>}
    </View>
  );
}

export function FullScreenLoading({ text }: { text?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {text && <Text style={[styles.text, { color: colors.mutedForeground }]}>{text}</Text>}
    </View>
  );
}

export function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.skeletonCard, { backgroundColor: colors.card }]}>
      <View style={styles.skeletonHeader}>
        <View style={[styles.skeletonAvatar, { backgroundColor: colors.muted }]} />
        <View style={styles.skeletonLines}>
          <View style={[styles.skeletonLine, { width: '60%', backgroundColor: colors.muted }]} />
          <View style={[styles.skeletonLine, { width: '40%', backgroundColor: colors.muted }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, { width: '100%', marginTop: spacing.md, backgroundColor: colors.muted }]} />
      <View style={[styles.skeletonLine, { width: '80%', backgroundColor: colors.muted }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
  },
  skeletonCard: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  skeletonLines: {
    flex: 1,
    marginLeft: spacing.md,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
});

export default Loading;
