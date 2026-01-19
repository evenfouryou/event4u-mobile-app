import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';

interface FeatureCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  testID?: string;
}

function FeatureCard({ icon, title, description, testID }: FeatureCardProps) {
  return (
    <Card variant="glass" style={styles.featureCard} testID={testID}>
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </Card>
  );
}

export function LandingScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const handleExploreEvents = () => {
    navigation.navigate('Events');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const contentPadding = isTablet ? spacing['3xl'] : isLandscape ? spacing.xl : spacing.xl;
  const cardMaxWidth = isTablet ? 600 : isLandscape ? 500 : undefined;
  const featuresDirection = isLandscape && !isTablet ? 'row' : 'column';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { padding: contentPadding },
          isLandscape && styles.contentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
        testID="scroll-landing"
      >
        <View style={[
          styles.innerContainer,
          cardMaxWidth ? { maxWidth: cardMaxWidth, alignSelf: 'center' as const } : undefined,
        ]}>
          <View style={styles.logoContainer} testID="container-logo">
            <View style={styles.logoWrapper}>
              <Ionicons name="calendar" size={isTablet ? 56 : 48} color={colors.primary} />
            </View>
            <Text style={[
              styles.logoText,
              isTablet && styles.logoTextTablet,
            ]}>Event4U</Text>
          </View>

          <View style={styles.heroSection}>
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.1)', 'rgba(0, 206, 209, 0.05)', 'transparent']}
              style={styles.heroGradient}
            />
            <Text style={[
              styles.heroTitle,
              isTablet && styles.heroTitleTablet,
              isLandscape && !isTablet && styles.heroTitleLandscape,
            ]}>Scopri gli eventi vicino a te</Text>
            <Text style={[
              styles.heroSubtitle,
              isTablet && styles.heroSubtitleTablet,
            ]}>
              Trova i migliori eventi, acquista biglietti in sicurezza e vivi esperienze uniche
            </Text>
          </View>

          <View style={[
            styles.featuresContainer,
            featuresDirection === 'row' && styles.featuresContainerRow,
          ]}>
            <FeatureCard
              icon="calendar-outline"
              title="Eventi"
              description="Esplora migliaia di eventi nella tua zona: concerti, festival, club e molto altro"
              testID="card-feature-events"
            />
            <FeatureCard
              icon="shield-checkmark-outline"
              title="Biglietti Sicuri"
              description="Acquista con fiducia. Ogni biglietto è verificato e protetto da frodi"
              testID="card-feature-tickets"
            />
            <FeatureCard
              icon="flash-outline"
              title="Facile Acquisto"
              description="Checkout veloce e semplice. Ricevi i tuoi biglietti istantaneamente"
              testID="card-feature-purchase"
            />
          </View>

          <View style={[
            styles.ctaContainer,
            isLandscape && styles.ctaContainerLandscape,
          ]}>
            <Button
              title="Esplora Eventi"
              onPress={handleExploreEvents}
              variant="primary"
              size="lg"
              style={[
                styles.ctaButton,
                isLandscape && styles.ctaButtonLandscape,
              ]}
              icon={<Ionicons name="search-outline" size={20} color={colors.primaryForeground} />}
              testID="button-explore-events"
            />
            <Button
              title="Accedi"
              onPress={handleLogin}
              variant="outline"
              size="lg"
              style={[
                styles.ctaButton,
                isLandscape && styles.ctaButtonLandscape,
              ]}
              icon={<Ionicons name="log-in-outline" size={20} color={colors.foreground} />}
              testID="button-login"
            />
          </View>

          <View style={styles.footer}>
            <View style={[
              styles.statsRow,
              isTablet && styles.statsRowTablet,
            ]} testID="container-stats">
              <View style={styles.statItem}>
                <Text style={[
                  styles.statValue,
                  isTablet && styles.statValueTablet,
                ]} testID="text-stat-events">10K+</Text>
                <Text style={styles.statLabel}>Eventi</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[
                  styles.statValue,
                  isTablet && styles.statValueTablet,
                ]} testID="text-stat-users">500K+</Text>
                <Text style={styles.statLabel}>Utenti</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[
                  styles.statValue,
                  isTablet && styles.statValueTablet,
                ]} testID="text-stat-tickets">1M+</Text>
                <Text style={styles.statLabel}>Biglietti</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
  },
  contentLandscape: {
    paddingVertical: spacing.lg,
  },
  innerContainer: {
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 1,
  },
  logoTextTablet: {
    fontSize: fontSize['3xl'],
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
    position: 'relative',
  },
  heroGradient: {
    position: 'absolute',
    top: -spacing['4xl'],
    left: -spacing['4xl'],
    right: -spacing['4xl'],
    height: 200,
    borderRadius: 100,
  },
  heroTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  heroTitleTablet: {
    fontSize: fontSize['4xl'],
  },
  heroTitleLandscape: {
    fontSize: fontSize['2xl'],
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  heroSubtitleTablet: {
    fontSize: fontSize.lg,
    lineHeight: 28,
    maxWidth: 500,
  },
  featuresContainer: {
    gap: spacing.lg,
    marginBottom: spacing['3xl'],
  },
  featuresContainerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featureCard: {
    padding: spacing.xl,
    alignItems: 'center',
    flex: 1,
    minWidth: 140,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  featureTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaContainer: {
    gap: spacing.md,
    marginBottom: spacing['3xl'],
  },
  ctaContainerLandscape: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ctaButton: {
    width: '100%',
  },
  ctaButtonLandscape: {
    width: 'auto',
    minWidth: 180,
    flex: 1,
    maxWidth: 220,
  },
  footer: {
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.xl,
    width: '100%',
  },
  statsRowTablet: {
    padding: spacing['2xl'],
    maxWidth: 500,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  statValueTablet: {
    fontSize: fontSize['2xl'],
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderSubtle,
  },
});
