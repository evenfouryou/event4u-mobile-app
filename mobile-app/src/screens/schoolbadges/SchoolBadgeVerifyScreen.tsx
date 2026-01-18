import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';

export function SchoolBadgeVerifyScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [badgeCode, setBadgeCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!badgeCode.trim()) {
      setError('Inserisci un codice badge');
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (badgeCode.toLowerCase() === 'invalid') {
        navigation.navigate('SchoolBadgeError', { reason: 'Badge non trovato nel sistema' });
      } else {
        navigation.navigate('SchoolBadgeView', { badgeCode: badgeCode.trim() });
      }
    } catch (err) {
      setError('Errore durante la verifica');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleScanInstead = () => {
    navigation.navigate('SchoolBadgeScanner');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          data-testid="button-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verifica Badge</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="keypad" size={48} color={colors.primary} />
        </View>
        
        <Text style={styles.title}>Inserisci Codice Badge</Text>
        <Text style={styles.subtitle}>
          Inserisci il codice identificativo stampato sul badge
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="Es: SCH-2024-00123"
            placeholderTextColor={colors.mutedForeground}
            value={badgeCode}
            onChangeText={(text) => {
              setBadgeCode(text.toUpperCase());
              setError(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            data-testid="input-badge-code"
          />
          {badgeCode.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setBadgeCode('')}
              data-testid="button-clear"
            >
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color={colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.verifyButton, isVerifying && styles.verifyButtonDisabled]}
          onPress={handleVerify}
          disabled={isVerifying}
          activeOpacity={0.8}
          data-testid="button-verify"
        >
          {isVerifying ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color={colors.primaryForeground} />
              <Text style={styles.verifyButtonText}>Verifica Badge</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>oppure</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScanInstead}
          activeOpacity={0.8}
          data-testid="button-scan-instead"
        >
          <Ionicons name="scan" size={24} color={colors.teal} />
          <Text style={styles.scanButtonText}>Scansiona QR Code</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.helpSection, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.helpCard}>
          <Ionicons name="help-circle" size={24} color={colors.mutedForeground} />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Dove trovo il codice?</Text>
            <Text style={styles.helpText}>
              Il codice badge è stampato sotto il QR code, generalmente nel formato SCH-ANNO-NUMERO
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['3xl'],
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: borderRadius['2xl'],
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  inputContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: fontSize.lg,
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: 1,
  },
  inputError: {
    borderColor: colors.destructive,
  },
  clearButton: {
    position: 'absolute',
    right: spacing.lg,
    top: '50%',
    marginTop: -10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.destructive,
  },
  verifyButton: {
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
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.teal,
    paddingVertical: spacing.lg,
  },
  scanButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.teal,
  },
  helpSection: {
    paddingHorizontal: spacing.lg,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
});
