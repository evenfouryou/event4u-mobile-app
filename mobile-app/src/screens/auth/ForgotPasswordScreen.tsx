import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SafeArea } from '@/components/SafeArea';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

type ResetMode = 'email' | 'phone';
type PhoneStep = 'phone' | 'otp' | 'success';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function ForgotPasswordScreen({ onBack, onSuccess }: ForgotPasswordScreenProps) {
  const [mode, setMode] = useState<ResetMode>('email');
  const [email, setEmail] = useState('');
  const [phonePrefix, setPhonePrefix] = useState('+39');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleModeChange = (newMode: ResetMode) => {
    setMode(newMode);
    setError('');
    setEmail('');
    setPhone('');
    setOtpCode('');
    setNewPassword('');
    setCustomerId(null);
    setPhoneStep('phone');
    setSent(false);
  };

  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) {
      setError('Inserisci una email valida');
      triggerHaptic('error');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.post('/api/customer/forgot-password', { email });
      triggerHaptic('success');
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Errore durante la richiesta');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async () => {
    if (!phone || phone.length < 8) {
      setError('Inserisci un numero di telefono valido');
      triggerHaptic('error');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const fullPhone = phonePrefix + phone.replace(/^0+/, '');
      const response = await api.post<{ customerId?: string; message: string }>('/api/public/customers/forgot-password-phone', { phone: fullPhone });
      
      // If customerId is returned, phone was found - proceed to OTP step
      if (response.customerId) {
        setCustomerId(response.customerId);
        setPhoneStep('otp');
        triggerHaptic('success');
      } else {
        // Phone not found but we show generic success for security
        // User will see the success message but can't proceed
        setError('Se il numero è registrato, riceverai un codice OTP. Verifica il tuo telefono.');
        triggerHaptic('medium');
      }
    } catch (err: any) {
      setError(err.message || 'Errore durante la richiesta');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otpCode || otpCode.length < 4) {
      setError('Inserisci il codice OTP');
      triggerHaptic('error');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('La password deve avere almeno 8 caratteri');
      triggerHaptic('error');
      return;
    }
    if (!customerId) {
      setError('Errore: riprova dal primo passaggio');
      triggerHaptic('error');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.post('/api/public/customers/reset-password-phone', {
        customerId,
        otpCode,
        password: newPassword,
      });
      setPhoneStep('success');
      triggerHaptic('success');
    } catch (err: any) {
      setError(err.message || 'Errore durante il reset della password');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!customerId) return;

    try {
      setResendLoading(true);
      setError('');
      await api.post('/api/public/customers/resend-password-reset-otp', { customerId });
      triggerHaptic('success');
    } catch (err: any) {
      setError(err.message || 'Errore durante il reinvio del codice');
      triggerHaptic('error');
    } finally {
      setResendLoading(false);
    }
  };

  if (sent && mode === 'email') {
    return (
      <SafeArea style={styles.container}>
        <Pressable onPress={onBack} style={styles.backButton} testID="button-back">
          <Ionicons name="chevron-back" size={28} color={staticColors.foreground} />
        </Pressable>

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="mail-outline" size={64} color={staticColors.primary} />
          </View>

          <View>
            <Text style={styles.successTitle}>Email Inviata!</Text>
            <Text style={styles.successText}>
              Abbiamo inviato un link per reimpostare la password a{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>
            <Text style={styles.successHint}>
              Controlla anche la cartella spam
            </Text>
          </View>

          <View style={styles.successActions}>
            <Button variant="golden" size="lg" onPress={onBack} testID="button-back-to-login">
              Torna al Login
            </Button>
          </View>
        </View>
      </SafeArea>
    );
  }

  if (phoneStep === 'success' && mode === 'phone') {
    return (
      <SafeArea style={styles.container}>
        <Pressable onPress={onBack} style={styles.backButton} testID="button-back">
          <Ionicons name="chevron-back" size={28} color={staticColors.foreground} />
        </Pressable>

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle-outline" size={64} color={staticColors.primary} />
          </View>

          <View>
            <Text style={styles.successTitle}>Password Reimpostata!</Text>
            <Text style={styles.successText}>
              La tua password è stata cambiata con successo.{'\n'}
              Ora puoi accedere con la nuova password.
            </Text>
          </View>

          <View style={styles.successActions}>
            <Button variant="golden" size="lg" onPress={onBack} testID="button-back-to-login">
              Torna al Login
            </Button>
          </View>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topHeader}>
            <Pressable onPress={onBack} style={styles.backButton} testID="button-back">
              <Ionicons name="chevron-back" size={28} color={staticColors.foreground} />
            </Pressable>
            <Image
              source={require('../../../assets/logo.png')}
              style={[styles.headerLogo, { tintColor: '#FFFFFF' }]}
              resizeMode="contain"
            />
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="key-outline" size={48} color={staticColors.primary} />
            </View>
            <Text style={styles.title}>Password Dimenticata?</Text>
            <Text style={styles.subtitle}>
              {mode === 'email' 
                ? 'Inserisci la tua email e ti invieremo un link per reimpostare la password'
                : phoneStep === 'phone'
                ? 'Inserisci il tuo numero di telefono per ricevere un codice OTP'
                : 'Inserisci il codice OTP e la nuova password'}
            </Text>
          </View>

          <View style={styles.tabContainer}>
            <Pressable
              style={[styles.tab, mode === 'email' && styles.tabActive]}
              onPress={() => handleModeChange('email')}
              testID="tab-email"
            >
              <Text style={[styles.tabText, mode === 'email' && styles.tabTextActive]}>Email</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === 'phone' && styles.tabActive]}
              onPress={() => handleModeChange('phone')}
              testID="tab-phone"
            >
              <Text style={[styles.tabText, mode === 'phone' && styles.tabTextActive]}>Telefono</Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {mode === 'email' ? (
              <>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="mario@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  leftIcon="mail-outline"
                  testID="input-email"
                />

                <Button
                  variant="golden"
                  size="lg"
                  onPress={handleEmailSubmit}
                  loading={loading}
                  style={styles.submitButton}
                  testID="button-submit-email"
                >
                  Invia Link
                </Button>
              </>
            ) : phoneStep === 'phone' ? (
              <>
                <Text style={styles.inputLabel}>Numero di Telefono</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.prefixContainer}>
                    <Pressable
                      style={styles.prefixSelector}
                      onPress={() => {
                        const prefixes = ['+39', '+41', '+33', '+49', '+44', '+1', '+34', '+43', '+32', '+31'];
                        const currentIndex = prefixes.indexOf(phonePrefix);
                        const nextIndex = (currentIndex + 1) % prefixes.length;
                        setPhonePrefix(prefixes[nextIndex]);
                        triggerHaptic('selection');
                      }}
                      testID="button-phone-prefix"
                    >
                      <Text style={styles.prefixText}>{phonePrefix}</Text>
                      <Ionicons name="chevron-down" size={16} color={staticColors.mutedForeground} />
                    </Pressable>
                  </View>
                  <View style={styles.phoneInputContainer}>
                    <Input
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="123 456 7890"
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      leftIcon="call-outline"
                      testID="input-phone"
                    />
                  </View>
                </View>

                <Button
                  variant="golden"
                  size="lg"
                  onPress={handlePhoneSubmit}
                  loading={loading}
                  style={styles.submitButton}
                  testID="button-submit-phone"
                >
                  Invia Codice OTP
                </Button>
              </>
            ) : (
              <>
                <Input
                  label="Codice OTP"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="123456"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  leftIcon="key-outline"
                  testID="input-otp"
                />

                <Input
                  label="Nuova Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Minimo 8 caratteri"
                  secureTextEntry
                  autoCapitalize="none"
                  leftIcon="lock-closed-outline"
                  testID="input-new-password"
                />

                <Button
                  variant="golden"
                  size="lg"
                  onPress={handleOtpSubmit}
                  loading={loading}
                  style={styles.submitButton}
                  testID="button-submit-otp"
                >
                  Reimposta Password
                </Button>

                <Pressable
                  onPress={handleResendOtp}
                  disabled={resendLoading}
                  style={styles.resendButton}
                  testID="button-resend-otp"
                >
                  <Text style={[styles.resendText, resendLoading && styles.resendTextDisabled]}>
                    {resendLoading ? 'Invio in corso...' : 'Reinvia OTP'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ricordi la password?</Text>
            <Pressable onPress={onBack} testID="link-login">
              <Text style={styles.loginLink}>Accedi</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    height: 28,
    width: 100,
  },
  headerSpacer: {
    width: 44,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${staticColors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: staticColors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.mutedForeground,
  },
  tabTextActive: {
    color: staticColors.primaryForeground,
  },
  form: {
    marginBottom: spacing.xl,
  },
  errorContainer: {
    backgroundColor: `${staticColors.destructive}20`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${staticColors.destructive}40`,
  },
  errorText: {
    color: staticColors.destructive,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: spacing.md,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  resendText: {
    color: staticColors.primary,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: staticColors.mutedForeground,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    color: staticColors.mutedForeground,
    fontSize: typography.fontSize.base,
  },
  loginLink: {
    color: staticColors.primary,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  emailHighlight: {
    color: staticColors.primary,
    fontWeight: '600',
  },
  successHint: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  successActions: {
    marginTop: spacing.xxl,
    width: '100%',
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  prefixContainer: {
    width: 80,
  },
  prefixSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  prefixText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  phoneInputContainer: {
    flex: 1,
  },
});

export default ForgotPasswordScreen;
