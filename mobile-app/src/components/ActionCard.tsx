import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors, borderRadius, spacing, typography, shadows } from '@/lib/theme';
import { triggerHaptic } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type GradientType = 'golden' | 'teal' | 'purple' | 'blue' | 'pink';

interface ActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  gradient?: GradientType;
  testID?: string;
}

const gradientColors: Record<GradientType, [string, string]> = {
  golden: ['#FFD700', '#FFA500'],
  teal: ['#00CED1', '#008B8B'],
  purple: ['#8B5CF6', '#6366F1'],
  blue: ['#3B82F6', '#2563EB'],
  pink: ['#EC4899', '#DB2777'],
};

export function ActionCard({
  icon,
  label,
  onPress,
  gradient = 'golden',
  testID,
}: ActionCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    triggerHaptic('medium');
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, styles.container]}
      testID={testID}
    >
      <LinearGradient
        colors={gradientColors[gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={32} color="white" />
        </View>
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

export function QuickActionRow({
  actions,
}: {
  actions: Array<ActionCardProps & { key: string }>;
}) {
  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <View key={action.key} style={styles.actionWrapper}>
          <ActionCard {...action} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 120,
    ...shadows.md,
  },
  gradient: {
    flex: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionWrapper: {
    flex: 1,
  },
});

export default ActionCard;
