import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/lib/theme';

interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}

export function Loading({ size = 'large', color = staticColors.primary, text }: LoadingProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

export function FullScreenLoading({ text }: { text?: string }) {
  return (
    <View style={styles.fullScreen}>
      <ActivityIndicator size="large" color={staticColors.primary} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonLines}>
          <View style={[styles.skeletonLine, { width: '60%' }]} />
          <View style={[styles.skeletonLine, { width: '40%' }]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, { width: '100%', marginTop: spacing.md }]} />
      <View style={[styles.skeletonLine, { width: '80%' }]} />
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
    backgroundColor: staticColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
  },
  skeletonCard: {
    backgroundColor: staticColors.card,
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
    backgroundColor: staticColors.muted,
  },
  skeletonLines: {
    flex: 1,
    marginLeft: spacing.md,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: staticColors.muted,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
});

export default Loading;
