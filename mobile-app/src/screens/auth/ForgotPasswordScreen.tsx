import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../navigation/MainNavigator';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '../../theme';

type ForgotPasswordScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'ForgotPassword'
>;

export default function ForgotPasswordScreen({
  navigation,
}: ForgotPasswordScreenProps) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = async () => {
    setEmailError('');
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setEmailError('Email è obbligatoria');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Inserisci un email valido');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement password reset API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSentEmail(email);
      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Errore durante il reset della password. Riprova.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const cardMaxWidth = isTablet ? 480 : isLandscape ? 400 : '100%';
  const contentPadding = isTablet ? spacing['3xl'] : spacing.xl;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isLandscape && styles.scrollContentLandscape,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[
            styles.innerContainer,
            { maxWidth: typeof cardMaxWidth === 'number' ? cardMaxWidth : undefined },
            isLandscape && styles.innerContainerLandscape,
          ]}>
            {/* Header with Back Button */}
            <View style={[
              styles.header,
              isLandscape && styles.headerLandscape,
            ]}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                testID="button-back"
              >
                <Ionicons
                  name="chevron-back"
                  size={28}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <View style={styles.logoIcon}>
                  <Ionicons
                    name="ticket-outline"
                    size={isTablet ? 48 : 40}
                    color={colors.primary}
                  />
                </View>
                <Text style={[
                  styles.logoText,
                  isTablet && styles.logoTextTablet,
                ]}>Event4U</Text>
              </View>
              <Text style={[
                styles.subtitle,
                isTablet && styles.subtitleTablet,
              ]}>Recupera la tua password</Text>
            </View>

            {/* Form Card */}
            <Card style={[
              styles.card,
              { padding: contentPadding },
            ]} variant="elevated">
              {!success ? (
                <>
                  <Text style={styles.description}>
                    Inserisci il tuo email e ti invieremo un link per resettare la
                    tua password.
                  </Text>

                  {/* Error Banner */}
                  {error ? (
                    <View style={styles.errorBanner} testID="error-banner">
                      <Ionicons
                        name="alert-circle"
                        size={20}
                        color={colors.destructive}
                      />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  {/* Email Input */}
                  <Input
                    label="Email"
                    placeholder="nome@example.com"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailError('');
                    }}
                    error={emailError}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    leftIcon={
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={colors.mutedForeground}
                      />
                    }
                    testID="input-email"
                  />

                  {/* Reset Button */}
                  <Button
                    title={isLoading ? 'Invio in corso...' : 'Invia link di reset'}
                    onPress={handleResetPassword}
                    disabled={isLoading}
                    loading={isLoading}
                    style={styles.resetButton}
                    testID="button-reset"
                  />

                  {/* Back to Login Link */}
                  <View style={styles.backToLoginContainer}>
                    <Text style={styles.backToLoginText}>
                      Ricordi la tua password?{' '}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Login')}
                      testID="link-login"
                    >
                      <Text style={styles.backToLoginLink}>Torna al login</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {/* Success Message */}
                  <View style={styles.successContainer} testID="success-container">
                    <View style={styles.successIconContainer}>
                      <Ionicons
                        name="checkmark-circle"
                        size={64}
                        color={colors.success}
                      />
                    </View>
                    <Text style={styles.successTitle}>Email inviata!</Text>
                    <Text style={styles.successMessage}>
                      Abbiamo inviato un link di reset della password a {sentEmail}.
                      Controlla la tua casella di posta e segui le istruzioni.
                    </Text>

                    {/* Back to Login Button */}
                    <Button
                      title="Torna al login"
                      onPress={() => navigation.navigate('Login')}
                      style={styles.successButton}
                      testID="button-back-login"
                    />

                    {/* Resend Link */}
                    <TouchableOpacity
                      onPress={() => {
                        setSuccess(false);
                        setEmail('');
                      }}
                      testID="link-resend"
                    >
                      <Text style={styles.resendText}>
                        Non hai ricevuto l'email?{' '}
                        <Text style={styles.resendLink}>Rinvia</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Card>

            {/* Additional Help */}
            {!success && (
              <View style={styles.helpSection}>
                <Text style={styles.helpTitle}>Hai problemi?</Text>
                <Text style={styles.helpText}>
                  Se non ricevi l'email entro 5 minuti, controlla la cartella spam
                  o contatta il nostro supporto.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
  },
  scrollContentLandscape: {
    paddingVertical: spacing.lg,
  },
  innerContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  innerContainerLandscape: {
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
    position: 'relative',
  },
  headerLandscape: {
    marginBottom: spacing.xl,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: spacing.sm,
    zIndex: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoText: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  logoTextTablet: {
    fontSize: fontSize['4xl'],
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.mutedForeground,
    fontWeight: fontWeight.medium,
  },
  subtitleTablet: {
    fontSize: fontSize.xl,
  },
  card: {
    width: '100%',
  },
  description: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    lineHeight: 22,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: colors.destructive,
    fontSize: fontSize.sm,
    flex: 1,
    fontWeight: fontWeight.medium,
  },
  resetButton: {
    marginBottom: spacing.xl,
  },
  backToLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  backToLoginText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  backToLoginLink: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  successIconContainer: {
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    marginBottom: spacing.lg,
  },
  successMessage: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  successButton: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  resendText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  resendLink: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  helpSection: {
    marginTop: spacing['2xl'],
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  helpText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
