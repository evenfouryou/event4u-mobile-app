import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, spacing, typography, shadows } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

type GradientType = 'golden' | 'teal' | 'purple' | 'blue' | 'pink';

interface ActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  gradient?: GradientType;
  testID?: string;
}

export function ActionCard({
  icon,
  label,
  onPress,
  gradient = 'golden',
  testID,
}: ActionCardProps) {
  const { gradients } = useTheme();
  const [pressed, setPressed] = useState(false);

  const handlePress = () => {
    triggerHaptic('medium');
    onPress?.();
  };

  const getGradientColors = (): [string, string] => {
    switch (gradient) {
      case 'golden': return [...gradients.golden] as [string, string];
      case 'teal': return [...gradients.teal] as [string, string];
      case 'purple': return [...gradients.purple] as [string, string];
      case 'blue': return [...gradients.blue] as [string, string];
      case 'pink': return [...gradients.pink] as [string, string];
      default: return [...gradients.golden] as [string, string];
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.container,
        pressed && styles.containerPressed,
      ]}
      testID={testID}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={32} color="white" />
        </View>
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
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
  containerPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
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
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    color: 'white',
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
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
