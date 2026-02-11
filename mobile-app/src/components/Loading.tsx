import { View, Text, ActivityIndicator, StyleSheet, Animated, Easing } from 'react-native';
import { spacing, typography } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useRef } from 'react';

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

function AnimatedSkeleton({ style }: { style: any }) {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        style,
        { backgroundColor: colors.muted, opacity },
      ]}
    />
  );
}

export function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.skeletonCard, { backgroundColor: colors.card }]}>
      <View style={styles.skeletonHeader}>
        <AnimatedSkeleton style={styles.skeletonAvatar} />
        <View style={styles.skeletonLines}>
          <AnimatedSkeleton style={[styles.skeletonLine, { width: '60%' }]} />
          <AnimatedSkeleton style={[styles.skeletonLine, { width: '40%' }]} />
        </View>
      </View>
      <AnimatedSkeleton style={[styles.skeletonLine, { width: '100%', marginTop: spacing.md }]} />
      <AnimatedSkeleton style={[styles.skeletonLine, { width: '80%' }]} />
    </View>
  );
}

export function SkeletonEventCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
      <AnimatedSkeleton style={styles.eventImage} />
      <View style={styles.eventContent}>
        <AnimatedSkeleton style={[styles.skeletonLine, { width: '70%', height: 16 }]} />
        <AnimatedSkeleton style={[styles.skeletonLine, { width: '50%', height: 12 }]} />
        <View style={styles.eventFooter}>
          <AnimatedSkeleton style={[styles.skeletonLine, { width: '30%', height: 12 }]} />
          <AnimatedSkeleton style={[styles.skeletonLine, { width: '20%', height: 12 }]} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonEventList({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonEventCard key={index} />
      ))}
    </View>
  );
}

export function SkeletonDashboard() {
  const { colors } = useTheme();
  return (
    <View style={styles.dashboardContainer}>
      <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <AnimatedSkeleton style={[styles.skeletonCircle, { width: 48, height: 48 }]} />
          <AnimatedSkeleton style={[styles.skeletonLine, { width: 60, height: 12, marginTop: 8 }]} />
        </View>
        <View style={styles.statItem}>
          <AnimatedSkeleton style={[styles.skeletonCircle, { width: 48, height: 48 }]} />
          <AnimatedSkeleton style={[styles.skeletonLine, { width: 60, height: 12, marginTop: 8 }]} />
        </View>
        <View style={styles.statItem}>
          <AnimatedSkeleton style={[styles.skeletonCircle, { width: 48, height: 48 }]} />
          <AnimatedSkeleton style={[styles.skeletonLine, { width: 60, height: 12, marginTop: 8 }]} />
        </View>
      </View>
      <SkeletonEventList count={2} />
    </View>
  );
}

export function SkeletonProfile() {
  const { colors } = useTheme();
  return (
    <View style={[styles.profileContainer, { backgroundColor: colors.card }]}>
      <AnimatedSkeleton style={styles.profileAvatar} />
      <AnimatedSkeleton style={[styles.skeletonLine, { width: '50%', height: 20, marginTop: 16 }]} />
      <AnimatedSkeleton style={[styles.skeletonLine, { width: '70%', height: 14, marginTop: 8 }]} />
      <View style={styles.profileStats}>
        <View style={styles.profileStatItem}>
          <AnimatedSkeleton style={[styles.skeletonLine, { width: 40, height: 24 }]} />
          <AnimatedSkeleton style={[styles.skeletonLine, { width: 50, height: 12, marginTop: 4 }]} />
        </View>
        <View style={styles.profileStatItem}>
          <AnimatedSkeleton style={[styles.skeletonLine, { width: 40, height: 24 }]} />
          <AnimatedSkeleton style={[styles.skeletonLine, { width: 50, height: 12, marginTop: 4 }]} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonWallet() {
  const { colors } = useTheme();
  return (
    <View style={[styles.walletContainer, { backgroundColor: colors.card }]}>
      <AnimatedSkeleton style={[styles.skeletonLine, { width: '40%', height: 14 }]} />
      <AnimatedSkeleton style={[styles.skeletonLine, { width: '60%', height: 32, marginTop: 12 }]} />
      <View style={styles.walletActions}>
        <AnimatedSkeleton style={styles.walletButton} />
        <AnimatedSkeleton style={styles.walletButton} />
      </View>
    </View>
  );
}

export function SkeletonTicketCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.ticketCard, { backgroundColor: colors.card }]}>
      <View style={styles.ticketLeft}>
        <AnimatedSkeleton style={[styles.skeletonLine, { width: '80%', height: 16 }]} />
        <AnimatedSkeleton style={[styles.skeletonLine, { width: '60%', height: 12, marginTop: 8 }]} />
        <AnimatedSkeleton style={[styles.skeletonLine, { width: '40%', height: 12, marginTop: 4 }]} />
      </View>
      <AnimatedSkeleton style={styles.ticketQR} />
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
  skeletonCircle: {
    borderRadius: 24,
  },
  skeletonList: {
    padding: spacing.md,
  },
  eventCard: {
    borderRadius: 16,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 140,
  },
  eventContent: {
    padding: spacing.md,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  dashboardContainer: {
    padding: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  profileContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: 16,
    margin: spacing.md,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileStats: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.xl,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  walletContainer: {
    padding: spacing.lg,
    borderRadius: 16,
    margin: spacing.md,
  },
  walletActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  walletButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
  },
  ticketCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ticketLeft: {
    flex: 1,
  },
  ticketQR: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
});

export default Loading;
