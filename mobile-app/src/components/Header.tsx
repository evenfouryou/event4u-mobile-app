import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/lib/theme';
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
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    triggerHaptic('light');
    onBack?.();
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.sm },
        transparent && styles.transparent,
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          {showBack && onBack && (
            <Pressable onPress={handleBack} style={styles.backButton} testID="button-back">
              <Ionicons name="chevron-back" size={28} color={colors.foreground} />
            </Pressable>
          )}
          {leftElement}
        </View>

        <View style={styles.center}>
          {showLogo ? (
            <Image
              source={require('../../assets/logo.png')}
              style={[styles.headerLogo, { tintColor: '#FFFFFF' }]}
              resizeMode="contain"
            />
          ) : (
            <>
              {title && (
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
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
  const insets = useSafeAreaInsets();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  return (
    <View style={[styles.greetingContainer, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.greetingContent}>
        {avatarElement && <View style={styles.avatarWrapper}>{avatarElement}</View>}
        <View style={styles.greetingText}>
          <Text style={styles.greeting}>
            {getGreeting()}, <Text style={styles.greetingName}>{name}</Text>
          </Text>
          {email && <Text style={styles.greetingEmail}>{email}</Text>}
        </View>
      </View>
      {rightElement && <View style={styles.greetingRight}>{rightElement}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    flex: 2,
    alignItems: 'center',
  },
  right: {
    flex: 1,
    alignItems: 'flex-end',
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
    color: colors.foreground,
    textAlign: 'center',
  },
  headerLogo: {
    height: 28,
    width: 100,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 2,
  },
  greetingContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: colors.foreground,
  },
  greetingName: {
    fontWeight: '700',
  },
  greetingEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  greetingRight: {
    marginLeft: spacing.md,
  },
});

export default Header;
