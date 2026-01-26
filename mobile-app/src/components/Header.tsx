import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
  transparent?: boolean;
  showLogo?: boolean;
  testID?: string;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightElement,
  leftElement,
  transparent = false,
  showLogo = false,
  testID,
}: HeaderProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    triggerHaptic('light');
    onBack?.();
  };

  return (
    <View
      style={[
        styles.container,
        { 
          paddingTop: insets.top + spacing.sm,
          backgroundColor: transparent ? 'transparent' : staticColors.background,
          borderBottomColor: transparent ? 'transparent' : staticColors.border,
        },
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          {showBack && onBack && (
            <Pressable onPress={handleBack} style={styles.backButton} testID="button-back">
              <Ionicons name="chevron-back" size={28} color={staticColors.foreground} />
            </Pressable>
          )}
          {leftElement}
        </View>

        <View style={styles.center}>
          {showLogo ? (
            <Image
              source={require('../../assets/logo.png')}
              style={[styles.headerLogo, { tintColor: isDark ? '#FFFFFF' : staticColors.foreground }]}
              resizeMode="contain"
            />
          ) : (
            <>
              {title && (
                <Text style={[styles.title, { color: staticColors.foreground }]} numberOfLines={1}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={[styles.subtitle, { color: staticColors.mutedForeground }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </>
          )}
        </View>

        <View style={styles.right}>{rightElement}</View>
      </View>
    </View>
  );
}

export function GreetingHeader({
  name,
  email,
  avatarElement,
  rightElement,
}: {
  name: string;
  email?: string;
  avatarElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}) {
  const { colors } = useTheme();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  return (
    <View style={styles.greetingContainer}>
      <View style={styles.greetingContent}>
        {avatarElement && <View style={styles.avatarWrapper}>{avatarElement}</View>}
        <View style={styles.greetingText}>
          <Text style={[styles.greeting, { color: staticColors.foreground }]}>
            {getGreeting()}, <Text style={[styles.greetingName, { color: staticColors.primary }]}>{name}</Text>
          </Text>
          {email && <Text style={[styles.greetingEmail, { color: staticColors.mutedForeground }]}>{email}</Text>}
        </View>
      </View>
      {rightElement && <View style={styles.greetingRight}>{rightElement}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 48,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 48,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  headerLogo: {
    width: 80,
    height: 28,
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  greetingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    marginRight: spacing.md,
  },
  greetingText: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
  },
  greetingName: {
    fontWeight: '700',
  },
  greetingEmail: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  greetingRight: {
    marginLeft: spacing.md,
  },
});
