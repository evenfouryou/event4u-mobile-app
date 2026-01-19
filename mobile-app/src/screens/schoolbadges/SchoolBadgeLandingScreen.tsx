import { View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

export function SchoolBadgeLandingScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroSection, isLandscape && styles.heroSectionLandscape]}>
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

        <View style={[
          styles.actionsSection,
          (isTablet || isLandscape) && styles.actionsSectionWide,
        ]}>
          <TouchableOpacity
            style={[styles.primaryAction, isTablet && styles.primaryActionTablet]}
            onPress={handleScanBadge}
            activeOpacity={0.8}
            testID="button-scan-badge"
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="scan" size={32} color={colors.primaryForeground} />
            </View>
            <Text style={styles.primaryActionText}>Scansiona Badge</Text>
            <Text style={styles.actionDescription}>Verifica un badge con la fotocamera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryAction, isTablet && styles.secondaryActionTablet]}
            onPress={handleVerifyManually}
            activeOpacity={0.8}
            testID="button-verify-manual"
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

        <View style={[styles.featuresSection, (isTablet || isLandscape) && styles.featuresSectionWide]}>
          <Text style={styles.sectionTitle}>Caratteristiche</Text>
          <View style={(isTablet || isLandscape) ? styles.featuresGrid : undefined}>
            {features.map((feature, index) => (
              <View 
                key={index} 
                style={[
                  styles.featureCard,
                  (isTablet || isLandscape) && styles.featureCardWide,
                ]}
              >
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
        </View>

        <View style={[styles.infoCard, isTablet && styles.infoCardTablet]}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            Per gestire i template e creare nuovi badge, accedi all'area amministrativa
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, isLandscape && styles.bottomBarLandscape]}>
        <TouchableOpacity
          style={[styles.adminButton, isTablet && styles.adminButtonTablet]}
          onPress={handleAdminAccess}
          activeOpacity={0.8}
          testID="button-admin-access"
        >
          <Ionicons name="settings-outline" size={20} color={colors.primary} />
          <Text style={styles.adminButtonText}>Accesso Amministratore</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  scrollContentLandscape: {
    paddingHorizontal: spacing['2xl'],
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  heroSectionLandscape: {
    paddingVertical: spacing.xl,
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
  actionsSectionWide: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
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
  primaryActionTablet: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
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
  secondaryActionTablet: {
    justifyContent: 'center',
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
  featuresSectionWide: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
  featureCardWide: {
    flex: 1,
    minWidth: 250,
    marginBottom: 0,
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
  infoCardTablet: {
    maxWidth: 600,
    alignSelf: 'center',
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
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  bottomBarLandscape: {
    paddingHorizontal: spacing['2xl'],
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
  adminButtonTablet: {
    maxWidth: 400,
    alignSelf: 'center',
  },
  adminButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
