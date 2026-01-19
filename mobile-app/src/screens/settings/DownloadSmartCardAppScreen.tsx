import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

export function DownloadSmartCardAppScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const handleDownloadWindows = () => {
    Linking.openURL('https://event4u.app/downloads/smartcard-windows');
  };

  const handleDownloadMac = () => {
    Linking.openURL('https://event4u.app/downloads/smartcard-mac');
  };

  const handleDocumentation = () => {
    Linking.openURL('https://docs.event4u.app/smartcard');
  };

  const features = [
    {
      icon: 'card-outline' as const,
      title: 'Lettore Smart Card',
      description: 'Supporto per smart card SIAE e badge identificativi',
    },
    {
      icon: 'sync-outline' as const,
      title: 'Sincronizzazione',
      description: 'Sincronizza automaticamente i dati con il cloud',
    },
    {
      icon: 'shield-checkmark-outline' as const,
      title: 'Firma Digitale',
      description: 'Firma documenti in modo sicuro con la smart card',
    },
    {
      icon: 'print-outline' as const,
      title: 'Stampa Biglietti',
      description: 'Stampa biglietti e badge direttamente dal PC',
    },
  ];

  const requirements = [
    'Windows 10/11 o macOS 10.14+',
    'Lettore smart card compatibile PC/SC',
    'Connessione internet attiva',
    '50 MB di spazio su disco',
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="button-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Card App</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroSection, isLandscape && styles.heroSectionLandscape]}>
          <View style={styles.heroIcon}>
            <Ionicons name="desktop-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Event4U Smart Card</Text>
          <Text style={styles.heroSubtitle}>
            Applicazione desktop per la gestione di smart card, firma digitale e stampa biglietti
          </Text>
          <Text style={styles.versionText}>Versione 2.1.0</Text>
        </View>

        <View style={(isTablet || isLandscape) ? styles.contentGrid : undefined}>
          <View style={[styles.leftColumn, (isTablet || isLandscape) && styles.leftColumnWide]}>
            <View style={styles.downloadSection}>
              <Text style={styles.sectionTitle}>Download</Text>
              
              <TouchableOpacity
                style={styles.downloadCard}
                onPress={handleDownloadWindows}
                activeOpacity={0.8}
                testID="button-download-windows"
              >
                <View style={styles.downloadIcon}>
                  <Ionicons name="logo-windows" size={32} color="#0078D4" />
                </View>
                <View style={styles.downloadInfo}>
                  <Text style={styles.downloadTitle}>Windows</Text>
                  <Text style={styles.downloadMeta}>Windows 10/11 • 45 MB</Text>
                </View>
                <Ionicons name="download-outline" size={24} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.downloadCard}
                onPress={handleDownloadMac}
                activeOpacity={0.8}
                testID="button-download-mac"
              >
                <View style={styles.downloadIcon}>
                  <Ionicons name="logo-apple" size={32} color={colors.foreground} />
                </View>
                <View style={styles.downloadInfo}>
                  <Text style={styles.downloadTitle}>macOS</Text>
                  <Text style={styles.downloadMeta}>macOS 10.14+ • 52 MB</Text>
                </View>
                <Ionicons name="download-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.requirementsSection}>
              <Text style={styles.sectionTitle}>Requisiti di Sistema</Text>
              <View style={styles.requirementsCard}>
                {requirements.map((req, index) => (
                  <View key={index} style={styles.requirementItem}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={styles.requirementText}>{req}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.rightColumn, (isTablet || isLandscape) && styles.rightColumnWide]}>
            <View style={styles.featuresSection}>
              <Text style={styles.sectionTitle}>Funzionalità</Text>
              <View style={(isTablet || isLandscape) ? styles.featuresGrid : undefined}>
                {features.map((feature, index) => (
                  <View
                    key={index}
                    style={[
                      styles.featureCard,
                      (isTablet || isLandscape) && styles.featureCardGrid,
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
          </View>
        </View>

        <View style={[styles.helpSection, isTablet && styles.helpSectionTablet]}>
          <View style={styles.helpCard}>
            <Ionicons name="book-outline" size={24} color={colors.primary} />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Hai bisogno di aiuto?</Text>
              <Text style={styles.helpText}>
                Consulta la documentazione per istruzioni dettagliate sull'installazione e configurazione
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.docsButton}
            onPress={handleDocumentation}
            activeOpacity={0.8}
            testID="button-documentation"
          >
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={styles.docsButtonText}>Apri Documentazione</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Supporto Tecnico</Text>
          <Text style={styles.supportText}>
            Per assistenza tecnica, contattaci all'indirizzo supporto@event4u.app
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLandscape: {
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  scrollContentLandscape: {
    paddingHorizontal: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    marginBottom: spacing.lg,
  },
  heroSectionLandscape: {
    paddingVertical: spacing.xl,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: borderRadius['2xl'],
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  heroTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  versionText: {
    fontSize: fontSize.sm,
    color: colors.teal,
    fontWeight: fontWeight.medium,
  },
  contentGrid: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  leftColumn: {
    flex: 1,
  },
  leftColumnWide: {
    flex: 1,
    maxWidth: 400,
  },
  rightColumn: {
    flex: 1,
  },
  rightColumnWide: {
    flex: 1,
  },
  downloadSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  downloadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  downloadIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  downloadTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  downloadMeta: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  featuresSection: {
    marginBottom: spacing.xl,
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
  featureCardGrid: {
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
  requirementsSection: {
    marginBottom: spacing.xl,
  },
  requirementsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  requirementText: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  helpSection: {
    marginBottom: spacing.xl,
  },
  helpSectionTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  docsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.lg,
  },
  docsButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  supportSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  supportTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  supportText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
