import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

export function SchoolBadgeErrorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const reason = route.params?.reason || 'Badge non valido';
  const errorCode = route.params?.errorCode;

  const handleRetry = () => {
    navigation.goBack();
  };

  const handleScanNew = () => {
    navigation.navigate('SchoolBadgeScanner');
  };

  const handleGoHome = () => {
    navigation.navigate('SchoolBadgeLanding');
  };

  const getErrorDetails = () => {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('scaduto') || lowerReason.includes('expired')) {
      return {
        icon: 'calendar-outline' as const,
        title: 'Badge Scaduto',
        message: 'Il badge è scaduto e non è più valido per l\'accesso.',
        suggestion: 'Contatta la segreteria per il rinnovo del badge.',
      };
    }
    if (lowerReason.includes('revocato') || lowerReason.includes('revoked')) {
      return {
        icon: 'ban' as const,
        title: 'Badge Revocato',
        message: 'Il badge è stato revocato e non può essere utilizzato.',
        suggestion: 'Rivolgiti all\'amministrazione per maggiori informazioni.',
      };
    }
    if (lowerReason.includes('non trovato') || lowerReason.includes('not found')) {
      return {
        icon: 'search' as const,
        title: 'Badge Non Trovato',
        message: 'Il badge non è presente nel sistema.',
        suggestion: 'Verifica che il codice sia corretto o prova a scansionare nuovamente.',
      };
    }
    return {
      icon: 'close-circle' as const,
      title: 'Verifica Fallita',
      message: reason,
      suggestion: 'Riprova o contatta l\'assistenza tecnica.',
    };
  };

  const errorDetails = getErrorDetails();

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
        <Text style={styles.headerTitle}>Errore Verifica</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
        ]}
      >
        <View style={[
          styles.content,
          isTablet && styles.contentTablet,
        ]}>
          <View style={[styles.errorIconContainer, isLandscape && styles.errorIconContainerLandscape]}>
            <View style={styles.errorIconOuter}>
              <View style={styles.errorIconInner}>
                <Ionicons name={errorDetails.icon} size={48} color={colors.destructive} />
              </View>
            </View>
          </View>

          <Text style={styles.errorTitle}>{errorDetails.title}</Text>
          <Text style={styles.errorMessage}>{errorDetails.message}</Text>

          <View style={[styles.suggestionCard, isTablet && styles.suggestionCardTablet]}>
            <Ionicons name="bulb" size={24} color={colors.warning} />
            <Text style={styles.suggestionText}>{errorDetails.suggestion}</Text>
          </View>

          {errorCode && (
            <View style={styles.errorCodeContainer}>
              <Text style={styles.errorCodeLabel}>Codice Errore</Text>
              <Text style={styles.errorCode}>{errorCode}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.actionsContainer, isLandscape && styles.actionsContainerLandscape]}>
        <View style={[styles.actionsInner, isTablet && styles.actionsInnerTablet]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleScanNew}
            activeOpacity={0.8}
            testID="button-scan-new"
          >
            <Ionicons name="scan" size={24} color={colors.primaryForeground} />
            <Text style={styles.primaryButtonText}>Scansiona Nuovo Badge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
            testID="button-retry"
          >
            <Ionicons name="refresh" size={24} color={colors.teal} />
            <Text style={styles.secondaryButtonText}>Riprova</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.textButton}
            onPress={handleGoHome}
            activeOpacity={0.8}
            testID="button-home"
          >
            <Text style={styles.textButtonText}>Torna alla Home</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  scrollContentLandscape: {
    paddingHorizontal: spacing.xl,
  },
  content: {
    alignItems: 'center',
  },
  contentTablet: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  errorIconContainer: {
    marginBottom: spacing['2xl'],
  },
  errorIconContainerLandscape: {
    marginBottom: spacing.xl,
  },
  errorIconOuter: {
    width: 128,
    height: 128,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconInner: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    lineHeight: 24,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    maxWidth: 320,
  },
  suggestionCardTablet: {
    maxWidth: 400,
  },
  suggestionText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.foreground,
    lineHeight: 20,
  },
  errorCodeContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  errorCodeLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  errorCode: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    fontFamily: 'monospace',
    marginTop: spacing.xs,
  },
  actionsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  actionsContainerLandscape: {
    paddingHorizontal: spacing.xl,
  },
  actionsInner: {
    gap: spacing.md,
  },
  actionsInnerTablet: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.teal,
    paddingVertical: spacing.lg,
  },
  secondaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.teal,
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  textButtonText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
});
