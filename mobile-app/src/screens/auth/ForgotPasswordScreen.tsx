import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../navigation/MainNavigator';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '../../lib/theme';

type ForgotPasswordScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'ForgotPassword'
>;

export default function ForgotPasswordScreen({
  navigation,
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = async () => {
    setEmailError('');
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setEmailError('Email è obbligatorio');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Inserisci un email valido');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement password reset API call
      // For now, we'll simulate the request
      await new Promise((resolve) => setTimeout(resolve, 1500));
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={colors.primary}
            />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Ionicons
              name="ticket-outline"
              size={40}
              color={colors.primary}
            />
            <Text style={styles.logoText}>Event4U</Text>
          </View>
          <Text style={styles.subtitle}>Recupera la tua password</Text>
        </View>

        {/* Form Card */}
        <Card style={styles.card}>
          {!success ? (
            <>
              <Text style={styles.description}>
                Inserisci il tuo email e ti invieremo un link per resettare la
                tua password.
              </Text>

              {error && (
                <View style={styles.errorBanner}>
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color={colors.destructive}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

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
                leftIcon={
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colors.mutedForeground}
                  />
                }
              />

              {/* Reset Button */}
              <Button
                title={
                  isLoading ? 'Invio in corso...' : 'Invia link di reset'
                }
                onPress={handleResetPassword}
                disabled={isLoading}
                loading={isLoading}
                style={styles.resetButton}
              />

              {/* Back to Login Link */}
              <View style={styles.backToLoginContainer}>
                <Text style={styles.backToLoginText}>
                  Ricordi la tua password?{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.backToLoginLink}>Torna al login</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Success Message */}
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <Ionicons
                    name="checkmark-circle"
                    size={64}
                    color={colors.success}
                  />
                </View>
                <Text style={styles.successTitle}>Email inviata!</Text>
                <Text style={styles.successMessage}>
                  Abbiamo inviato un link di reset della password a {email}.
                  Controlla la tua casella di posta e segui le istruzioni.
                </Text>

                {/* Back to Login Button */}
                <Button
                  title="Torna al login"
                  onPress={() => navigation.navigate('Login')}
                  style={styles.backButton2}
                />

                {/* Resend Link */}
                <TouchableOpacity
                  onPress={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  backButton: {
    position: 'absolute',
    left: -spacing.md,
    top: 0,
    padding: spacing.sm,
    zIndex: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  logoText: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.mutedForeground,
    fontWeight: fontWeight.medium,
  },
  card: {
    variant: 'elevated' as const,
  },
  description: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.destructive,
    fontSize: fontSize.sm,
    flex: 1,
    fontWeight: fontWeight.medium,
  },
  resetButton: {
    marginBottom: spacing.lg,
  },
  backToLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
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
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  successMessage: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  backButton2: {
    width: '100%',
    marginBottom: spacing.lg,
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
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  helpText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
});
