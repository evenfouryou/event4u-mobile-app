import { View, Text, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';

const { width } = Dimensions.get('window');

interface FeatureCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card variant="glass" style={styles.featureCard}>
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
  const insets = useSafeAreaInsets();

  const handleExploreEvents = () => {
    navigation.navigate('Events');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing['3xl'] },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.logoContainer}>
        <View style={styles.logoWrapper}>
          <Ionicons name="calendar" size={48} color={colors.primary} />
        </View>
        <Text style={styles.logoText}>Event4U</Text>
      </View>

      <View style={styles.heroSection}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.1)', 'rgba(0, 206, 209, 0.05)', 'transparent']}
          style={styles.heroGradient}
        />
        <Text style={styles.heroTitle}>Scopri gli eventi vicino a te</Text>
        <Text style={styles.heroSubtitle}>
          Trova i migliori eventi, acquista biglietti in sicurezza e vivi esperienze uniche
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        <FeatureCard
          icon="calendar-outline"
          title="Eventi"
          description="Esplora migliaia di eventi nella tua zona: concerti, festival, club e molto altro"
        />
        <FeatureCard
          icon="shield-checkmark-outline"
          title="Biglietti Sicuri"
          description="Acquista con fiducia. Ogni biglietto è verificato e protetto da frodi"
        />
        <FeatureCard
          icon="flash-outline"
          title="Facile Acquisto"
          description="Checkout veloce e semplice. Ricevi i tuoi biglietti istantaneamente"
        />
      </View>

      <View style={styles.ctaContainer}>
        <Button
          title="Esplora Eventi"
          onPress={handleExploreEvents}
          variant="primary"
          size="lg"
          style={styles.ctaButton}
          icon={<Ionicons name="search-outline" size={20} color={colors.primaryForeground} />}
        />
        <Button
          title="Accedi"
          onPress={handleLogin}
          variant="outline"
          size="lg"
          style={styles.ctaButton}
          icon={<Ionicons name="log-in-outline" size={20} color={colors.foreground} />}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>10K+</Text>
            <Text style={styles.statLabel}>Eventi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>500K+</Text>
            <Text style={styles.statLabel}>Utenti</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>1M+</Text>
            <Text style={styles.statLabel}>Biglietti</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
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
  heroSubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  featuresContainer: {
    gap: spacing.lg,
    marginBottom: spacing['3xl'],
  },
  featureCard: {
    padding: spacing.xl,
    alignItems: 'center',
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
  ctaButton: {
    width: '100%',
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
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
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
