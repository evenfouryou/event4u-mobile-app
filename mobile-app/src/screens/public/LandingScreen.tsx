import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge, LiveBadge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { triggerHaptic } from '@/lib/haptics';

interface LandingScreenProps {
  onNavigateEvents: () => void;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onNavigateVenues: () => void;
  onNavigateResales: () => void;
}

export function LandingScreen({
  onNavigateEvents,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateVenues,
  onNavigateResales,
}: LandingScreenProps) {
  const features = [
    {
      icon: 'calendar-outline' as const,
      title: 'Eventi Esclusivi',
      description: 'Accedi ai migliori eventi della tua città',
    },
    {
      icon: 'ticket-outline' as const,
      title: 'Biglietti Sicuri',
      description: 'Acquista in sicurezza con garanzia SIAE',
    },
    {
      icon: 'location-outline' as const,
      title: 'Top Venues',
      description: 'I locali più cool della nightlife',
    },
    {
      icon: 'people-outline' as const,
      title: 'Lista VIP',
      description: 'Salta la fila e vivi la notte da protagonista',
    },
  ];

  return (
    <SafeArea style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.glowContainer}>
          <View style={styles.glowGolden} />
          <View style={styles.glowTeal} />
        </View>

        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[colors.primary, '#FFA500']}
                style={styles.logoBox}
              >
                <Text style={styles.logoText}>E4U</Text>
              </LinearGradient>
              <Text style={styles.brandName}>EventFourYou</Text>
            </View>
            <View style={styles.headerRight}>
              <Button
                variant="outline"
                size="sm"
                onPress={onNavigateLogin}
                testID="button-login"
              >
                Accedi
              </Button>
            </View>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.liveBadgeContainer}>
            <LiveBadge testID="badge-live" />
            <Text style={styles.liveBadgeText}>Eventi Live Stasera</Text>
          </View>

          <Text style={styles.heroTitle}>
            La tua{'\n'}
            <Text style={styles.heroTitleAccent}>serata</Text>{'\n'}
            inizia qui
          </Text>

          <Text style={styles.heroSubtitle}>
            Scopri gli eventi più esclusivi, acquista biglietti in sicurezza e vivi notti indimenticabili
          </Text>

          <View style={styles.heroCTA}>
            <Button
              variant="golden"
              size="lg"
              onPress={onNavigateEvents}
              haptic="medium"
              testID="button-explore-events"
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Esplora Eventi</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
              </View>
            </Button>

            <Button
              variant="outline"
              size="lg"
              onPress={onNavigateRegister}
              testID="button-register"
            >
              Registrati Gratis
            </Button>
          </View>
        </View>

        <View style={styles.quickLinks}>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onNavigateEvents();
            }}
            style={styles.quickLink}
          >
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.quickLinkText}>Eventi</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onNavigateResales();
            }}
            style={styles.quickLink}
          >
            <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
            <Text style={styles.quickLinkText}>Rivendite</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onNavigateVenues();
            }}
            style={styles.quickLink}
          >
            <Ionicons name="business" size={20} color={colors.primary} />
            <Text style={styles.quickLinkText}>Locali</Text>
          </Pressable>
        </View>

        <View style={styles.features}>
          <Text style={styles.sectionTitle}>Perché Event4U?</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <Card key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon} size={28} color={colors.primary} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </Card>
            ))}
          </View>
        </View>

        <View>
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.15)', 'rgba(0, 206, 209, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaCard}
          >
            <View style={styles.ctaLogo}>
              <Text style={styles.ctaLogoText}>E4U</Text>
            </View>
            <Text style={styles.ctaTitle}>Pronto per la notte?</Text>
            <Text style={styles.ctaText}>
              Unisciti a migliaia di persone che vivono la nightlife con Event4U
            </Text>
            <Button
              variant="golden"
              size="lg"
              onPress={onNavigateRegister}
              style={styles.ctaButton}
              testID="button-cta-register"
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Inizia Ora</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
              </View>
            </Button>
          </LinearGradient>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Text style={styles.footerLogoText}>Event4U</Text>
          </View>
          <Text style={styles.footerCopyright}>
            © {new Date().getFullYear()} Event4U. Tutti i diritti riservati.
          </Text>
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    overflow: 'hidden',
  },
  glowGolden: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: colors.primary,
    opacity: 0.15,
  },
  glowTeal: {
    position: 'absolute',
    top: 200,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.teal,
    opacity: 0.1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.golden,
  },
  logoText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
  },
  brandName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hero: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  liveBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  liveBadgeText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.teal,
  },
  heroTitle: {
    fontSize: typography.fontSize['5xl'],
    fontWeight: '700',
    color: colors.foreground,
    lineHeight: 56,
    marginBottom: spacing.md,
  },
  heroTitleAccent: {
    color: colors.primary,
  },
  heroSubtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.mutedForeground,
    lineHeight: 28,
    marginBottom: spacing.xl,
  },
  heroCTA: {
    gap: spacing.md,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  quickLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  quickLinkText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.foreground,
  },
  features: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  featureCard: {
    width: '48%',
    padding: spacing.md,
    alignItems: 'center',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  ctaCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  ctaLogo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.golden,
  },
  ctaLogoText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryForeground,
  },
  ctaTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  ctaButton: {
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  footerLogo: {
    marginBottom: spacing.md,
  },
  footerLogoText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  footerCopyright: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
});

export default LandingScreen;
