import { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, Image, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, gradients } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SafeArea } from '@/components/SafeArea';
import { useAuth } from '@/contexts/AuthContext';
import { triggerHaptic } from '@/lib/haptics';

interface RegisterScreenProps {
  onNavigateLogin: () => void;
  onRegisterSuccess: () => void;
  onGoBack?: () => void;
}

type Step = 1 | 2 | 3 | 4;

export function RegisterScreen({ onNavigateLogin, onRegisterSuccess, onGoBack }: RegisterScreenProps) {
  const { register, verifyOtp } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const otpInputs = useRef<(TextInput | null)[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: '' as '' | 'M' | 'F',
    password: '',
    confirmPassword: '',
  });
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.firstName.trim()) {
      return 'Inserisci il tuo nome';
    }
    if (!formData.lastName.trim()) {
      return 'Inserisci il tuo cognome';
    }
    if (!formData.email || !formData.email.includes('@')) {
      return 'Inserisci una email valida';
    }
    return null;
  };

  const validateStep2 = () => {
    if (!formData.phone || formData.phone.length < 10) {
      return 'Inserisci un numero di telefono valido (min 10 cifre)';
    }
    if (!formData.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(formData.birthDate)) {
      return 'Inserisci la data di nascita (formato: AAAA-MM-GG)';
    }
    if (!formData.gender) {
      return 'Seleziona il sesso';
    }
    return null;
  };

  const validateStep3 = () => {
    if (!formData.password || formData.password.length < 8) {
      return 'La password deve avere almeno 8 caratteri';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Le password non coincidono';
    }
    if (!acceptedPrivacy) {
      return 'Devi accettare la privacy policy';
    }
    return null;
  };

  const handleNext = () => {
    let validationError: string | null = null;

    if (step === 1) {
      validationError = validateStep1();
      if (!validationError) {
        triggerHaptic('light');
        setStep(2);
      }
    } else if (step === 2) {
      validationError = validateStep2();
      if (!validationError) {
        triggerHaptic('light');
        setStep(3);
      }
    }

    if (validationError) {
      setError(validationError);
      triggerHaptic('error');
    }
  };

  const handleBack = () => {
    triggerHaptic('light');
    if (step === 1) {
      onGoBack?.();
    } else {
      setStep((prev) => (prev - 1) as Step);
    }
    setError('');
  };

  const handleRegister = async () => {
    const validationError = validateStep3();
    if (validationError) {
      setError(validationError);
      triggerHaptic('error');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        birthDate: formData.birthDate,
        gender: formData.gender as 'M' | 'F',
      });
      setCustomerId(result.customerId);
      setStep(4);
      triggerHaptic('success');
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.join('');
    if (code.length !== 6 || !customerId) {
      setError('Inserisci il codice OTP completo');
      triggerHaptic('error');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await verifyOtp(customerId, code);
      triggerHaptic('success');
      onRegisterSuccess();
    } catch (err: any) {
      setError(err.message || 'Codice OTP non valido');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Dati Personali';
      case 2:
        return 'Contatti';
      case 3:
        return 'Sicurezza';
      case 4:
        return 'Verifica Telefono';
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 1:
        return 'Inserisci le tue informazioni di base';
      case 2:
        return 'Come possiamo contattarti?';
      case 3:
        return 'Proteggi il tuo account';
      case 4:
        return `Inserisci il codice inviato a ${formData.phone}`;
    }
  };

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
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>

          <View style={styles.glowContainer}>
            <View style={styles.glowGolden} />
          </View>

          <View style={styles.header}>
            <Image
              source={require('../../../assets/logo.png')}
              style={[styles.logo, { tintColor: '#FFFFFF' }]}
              resizeMode="contain"
            />
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressSteps}>
              {[1, 2, 3].map((s) => (
                <View key={s} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      s === step && styles.stepCircleActive,
                      s < step && styles.stepCircleCompleted,
                    ]}
                  >
                    {s < step ? (
                      <Ionicons name="checkmark" size={16} color="#000" />
                    ) : (
                      <Text
                        style={[
                          styles.stepNumber,
                          (s === step || s < step) && styles.stepNumberActive,
                        ]}
                      >
                        {s}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      s === step && styles.stepLabelActive,
                    ]}
                  >
                    {s === 1 ? 'Dati' : s === 2 ? 'Contatti' : 'Password'}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((step - 1) / 2) * 100}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.stepHeader}>
            <Text style={styles.title}>{getStepTitle()}</Text>
            <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {step === 1 && (
              <>
                <Input
                  label="Nome"
                  value={formData.firstName}
                  onChangeText={(v) => updateField('firstName', v)}
                  placeholder="Mario"
                  autoCapitalize="words"
                  leftIcon="person-outline"
                  testID="input-firstName"
                />
                <Input
                  label="Cognome"
                  value={formData.lastName}
                  onChangeText={(v) => updateField('lastName', v)}
                  placeholder="Rossi"
                  autoCapitalize="words"
                  leftIcon="person-outline"
                  testID="input-lastName"
                />
                <Input
                  label="Email"
                  value={formData.email}
                  onChangeText={(v) => updateField('email', v)}
                  placeholder="mario@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  leftIcon="mail-outline"
                  testID="input-email"
                />
              </>
            )}

            {step === 2 && (
              <>
                <Input
                  label="Telefono"
                  value={formData.phone}
                  onChangeText={(v) => updateField('phone', v)}
                  placeholder="+39 123 456 7890"
                  keyboardType="phone-pad"
                  leftIcon="call-outline"
                  testID="input-phone"
                />
                <Input
                  label="Data di Nascita"
                  value={formData.birthDate}
                  onChangeText={(v) => updateField('birthDate', v)}
                  placeholder="AAAA-MM-GG (es. 1990-05-15)"
                  keyboardType="numbers-and-punctuation"
                  leftIcon="calendar-outline"
                  testID="input-birthDate"
                />
                <View style={styles.genderSection}>
                  <Text style={styles.genderLabel}>Sesso</Text>
                  <View style={styles.genderButtons}>
                    <Pressable
                      style={[
                        styles.genderButton,
                        formData.gender === 'M' && styles.genderButtonActive,
                      ]}
                      onPress={() => {
                        triggerHaptic('light');
                        updateField('gender', 'M');
                      }}
                      testID="button-gender-male"
                    >
                      <Ionicons
                        name="male"
                        size={24}
                        color={formData.gender === 'M' ? colors.primary : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.genderText,
                          formData.gender === 'M' && styles.genderTextActive,
                        ]}
                      >
                        Maschio
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.genderButton,
                        formData.gender === 'F' && styles.genderButtonActive,
                      ]}
                      onPress={() => {
                        triggerHaptic('light');
                        updateField('gender', 'F');
                      }}
                      testID="button-gender-female"
                    >
                      <Ionicons
                        name="female"
                        size={24}
                        color={formData.gender === 'F' ? colors.primary : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.genderText,
                          formData.gender === 'F' && styles.genderTextActive,
                        ]}
                      >
                        Femmina
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </>
            )}

            {step === 3 && (
              <>
                <Input
                  label="Password"
                  value={formData.password}
                  onChangeText={(v) => updateField('password', v)}
                  placeholder="Minimo 8 caratteri"
                  secureTextEntry
                  leftIcon="lock-closed-outline"
                  testID="input-password"
                />
                <Input
                  label="Conferma Password"
                  value={formData.confirmPassword}
                  onChangeText={(v) => updateField('confirmPassword', v)}
                  placeholder="Ripeti la password"
                  secureTextEntry
                  leftIcon="lock-closed-outline"
                  testID="input-confirmPassword"
                />
                <Pressable
                  style={styles.privacyRow}
                  onPress={() => {
                    setAcceptedPrivacy(!acceptedPrivacy);
                    triggerHaptic('light');
                  }}
                >
                  <View style={[styles.checkbox, acceptedPrivacy && styles.checkboxActive]}>
                    {acceptedPrivacy && <Ionicons name="checkmark" size={16} color="#000" />}
                  </View>
                  <Text style={styles.privacyText}>
                    Accetto la <Text style={styles.privacyLink}>Privacy Policy</Text> e i{' '}
                    <Text style={styles.privacyLink}>Termini di Servizio</Text>
                  </Text>
                </Pressable>
              </>
            )}

            {step === 4 && (
              <View style={styles.otpContainer}>
                <View style={styles.otpIconContainer}>
                  <LinearGradient
                    colors={gradients.teal}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.otpIconGradient}
                  >
                    <Ionicons name="shield-checkmark" size={40} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.otpTitle}>Verifica il tuo numero</Text>
                <Text style={styles.otpDescription}>
                  Abbiamo inviato un codice a 6 cifre al numero {formData.phone}
                </Text>
                <View style={styles.otpInputContainer}>
                  {otpCode.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { otpInputs.current[index] = ref; }}
                      style={[
                        styles.otpInput,
                        digit ? styles.otpInputFilled : null,
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value.slice(-1), index)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      testID={`input-otp-${index}`}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            {step < 3 ? (
              <Button
                variant="golden"
                size="lg"
                onPress={handleNext}
                style={styles.nextButton}
                testID="button-next"
              >
                Continua
              </Button>
            ) : step === 3 ? (
              <Button
                variant="golden"
                size="lg"
                onPress={handleRegister}
                loading={loading}
                style={styles.nextButton}
                testID="button-register"
              >
                Crea Account
              </Button>
            ) : (
              <Button
                variant="golden"
                size="lg"
                onPress={handleVerifyOtp}
                loading={loading}
                disabled={otpCode.join('').length !== 6}
                style={styles.nextButton}
                testID="button-verify-otp"
              >
                Verifica
              </Button>
            )}
          </View>

          {step < 4 && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Hai già un account?</Text>
              <Pressable onPress={onNavigateLogin}>
                <Text style={styles.loginLink}>Accedi</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    padding: spacing.sm,
    zIndex: 10,
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    overflow: 'hidden',
  },
  glowGolden: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.primary,
    opacity: 0.12,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  logo: {
    width: 120,
    height: 50,
  },
  progressContainer: {
    marginBottom: spacing.xl,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stepCircleActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  stepCircleCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  stepNumberActive: {
    color: colors.primary,
  },
  stepLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  stepHeader: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.destructive}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.destructive}30`,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    color: colors.destructive,
    fontSize: typography.fontSize.sm,
  },
  form: {
    marginBottom: spacing.lg,
  },
  genderSection: {
    marginTop: spacing.sm,
  },
  genderLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  genderButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  genderText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  genderTextActive: {
    color: colors.primary,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  privacyText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  privacyLink: {
    color: colors.primary,
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: spacing.lg,
  },
  nextButton: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    color: colors.mutedForeground,
    fontSize: typography.fontSize.base,
  },
  loginLink: {
    color: colors.primary,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  otpContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  otpIconContainer: {
    marginBottom: spacing.lg,
  },
  otpIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  otpDescription: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  otpInputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
});

export default RegisterScreen;
