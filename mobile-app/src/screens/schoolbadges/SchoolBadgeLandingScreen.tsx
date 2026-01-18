import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';

export function SchoolBadgeLandingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleScanBadge = () => {
    navigation.navigate('SchoolBadgeScanner');
  };

  const handleVerifyManually = () => {
    navigation.navigate('SchoolBadgeVerify');
  };

  const handleAdminAccess = () => {
    navigation.navigate('SchoolBadgeManager');
  };

  const features = [
    {
      icon: 'shield-checkmark' as const,
      title: 'Verifica Sicura',
      description: 'Autenticazione crittografata per ogni badge',
    },
    {
      icon: 'qr-code' as const,
      title: 'Scansione Rapida',
      description: 'Verifica istantanea tramite QR code',
    },
    {
      icon: 'time' as const,
      title: 'Tempo Reale',
      description: 'Stato badge sempre aggiornato',
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Ionicons name="school" size={48} color={colors.primary} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Badge Scolastici</Text>
          <Text style={styles.heroSubtitle}>
            Sistema di verifica digitale per badge identificativi scolastici
          </Text>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={handleScanBadge}
            activeOpacity={0.8}
            data-testid="button-scan-badge"
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="scan" size={32} color={colors.primaryForeground} />
            </View>
            <Text style={styles.primaryActionText}>Scansiona Badge</Text>
            <Text style={styles.actionDescription}>Verifica un badge con la fotocamera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={handleVerifyManually}
            activeOpacity={0.8}
            data-testid="button-verify-manual"
          >
            <View style={styles.secondaryIconContainer}>
              <Ionicons name="keypad" size={28} color={colors.teal} />
            </View>
            <View style={styles.secondaryActionContent}>
              <Text style={styles.secondaryActionText}>Verifica Manuale</Text>
              <Text style={styles.secondaryDescription}>Inserisci il codice del badge</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Caratteristiche</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={24} color={colors.teal} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            Per gestire i template e creare nuovi badge, accedi all'area amministrativa
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={styles.adminButton}
          onPress={handleAdminAccess}
          activeOpacity={0.8}
          data-testid="button-admin-access"
        >
          <Ionicons name="settings-outline" size={20} color={colors.primary} />
          <Text style={styles.adminButtonText}>Accesso Amministratore</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logoBackground: {
    width: 96,
    height: 96,
    borderRadius: borderRadius['2xl'],
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  heroTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  actionsSection: {
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryActionText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primaryForeground,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    fontSize: fontSize.sm,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 206, 209, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionContent: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  secondaryActionText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  secondaryDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  featuresSection: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 206, 209, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  featureTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  featureDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.foreground,
    lineHeight: 20,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  adminButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
