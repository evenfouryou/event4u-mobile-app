import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
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

type AccountType = 'customer' | 'organizer';

export function RegisterScreen({ onNavigateLogin, onRegisterSuccess, onGoBack }: RegisterScreenProps) {
  const { register } = useAuth();
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [accountType, setAccountType] = useState<AccountType>('customer');
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
  };

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName) {
      return 'Inserisci nome e cognome';
    }
    if (!formData.email || !formData.email.includes('@')) {
      return 'Inserisci una email valida';
    }
    if (!formData.phone || formData.phone.length < 10) {
      return 'Inserisci un numero di telefono valido';
    }
    if (!formData.birthDate) {
      return 'Inserisci la data di nascita';
    }
    if (!formData.gender) {
      return 'Seleziona il sesso';
    }
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

  const handleRegister = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      triggerHaptic('error');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        birthDate: formData.birthDate,
        gender: formData.gender as 'M' | 'F',
      });
      triggerHaptic('success');
      onRegisterSuccess();
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectType = (type: AccountType) => {
    setAccountType(type);
    triggerHaptic('light');
    if (type === 'organizer') {
      setError('Registrazioni organizzatori temporaneamente sospese');
    } else {
      setError('');
      setStep('form');
    }
  };

  if (step === 'type') {
    return (
      <SafeArea style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {onGoBack && (
            <Pressable onPress={onGoBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </Pressable>
          )}

          <View style={styles.glowContainer}>
            <View style={styles.glowGolden} />
            <View style={styles.glowTeal} />
          </View>

          <View style={styles.header}>
            <Image
              source={require('../../../assets/logo.png')}
              style={[styles.logo, { tintColor: '#FFFFFF' }]}
              resizeMode="contain"
            />
            <Text style={styles.title}>Crea Account</Text>
            <Text style={styles.subtitle}>Scegli il tipo di account</Text>
          </View>

          <View style={styles.typeCards}>
            <Pressable
              style={[styles.typeCard, accountType === 'customer' && styles.typeCardActive]}
              onPress={() => handleSelectType('customer')}
            >
              <LinearGradient
                colors={accountType === 'customer' ? ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)'] : ['rgba(17, 24, 39, 0.8)', 'rgba(17, 24, 39, 0.6)']}
                style={styles.typeCardGradient}
              >
                <View style={[styles.typeIcon, accountType === 'customer' && styles.typeIconActive]}>
                  <Ionicons name="person" size={32} color={accountType === 'customer' ? colors.primary : colors.mutedForeground} />
                </View>
                <Text style={[styles.typeTitle, accountType === 'customer' && styles.typeTitleActive]}>Cliente</Text>
                <Text style={styles.typeDescription}>Acquista biglietti, gestisci prenotazioni e rivendite</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={[styles.typeCard, accountType === 'organizer' && styles.typeCardActive]}
              onPress={() => handleSelectType('organizer')}
            >
              <LinearGradient
                colors={accountType === 'organizer' ? ['rgba(0, 206, 209, 0.15)', 'rgba(0, 206, 209, 0.05)'] : ['rgba(17, 24, 39, 0.8)', 'rgba(17, 24, 39, 0.6)']}
                style={styles.typeCardGradient}
              >
                <View style={[styles.typeIcon, accountType === 'organizer' && styles.typeIconActiveOrg]}>
                  <Ionicons name="business" size={32} color={accountType === 'organizer' ? colors.teal : colors.mutedForeground} />
                </View>
                <Text style={[styles.typeTitle, accountType === 'organizer' && styles.typeTitleActiveOrg]}>Organizzatore</Text>
                <Text style={styles.typeDescription}>Crea eventi, gestisci staff, vendite biglietti e inventario</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {error ? (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={colors.warning} />
              <Text style={styles.infoText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Hai già un account?</Text>
            <Pressable onPress={onNavigateLogin}>
              <Text style={styles.loginLink}>Accedi</Text>
            </Pressable>
          </View>
        </ScrollView>
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
          <Pressable onPress={() => setStep('type')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>

          <View style={styles.glowContainer}>
            <View style={styles.glowGolden} />
          </View>

          <View style={styles.headerSmall}>
            <Image
              source={require('../../../assets/logo.png')}
              style={[styles.logoSmall, { tintColor: '#FFFFFF' }]}
              resizeMode="contain"
            />
            <Text style={styles.title}>Registrati come Cliente</Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={colors.destructive} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="Nome"
                  value={formData.firstName}
                  onChangeText={(v) => updateField('firstName', v)}
                  placeholder="Mario"
                  autoCapitalize="words"
                  leftIcon="person-outline"
                  testID="input-firstName"
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="Cognome"
                  value={formData.lastName}
                  onChangeText={(v) => updateField('lastName', v)}
                  placeholder="Rossi"
                  autoCapitalize="words"
                  testID="input-lastName"
                />
              </View>
            </View>

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
                    size={20}
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
                    size={20}
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

            <Button
              variant="golden"
              size="lg"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerButton}
              testID="button-register"
            >
              Crea Account
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Hai già un account?</Text>
            <Pressable onPress={onNavigateLogin}>
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
    height: 400,
    overflow: 'hidden',
  },
  glowGolden: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
    opacity: 0.15,
  },
  glowTeal: {
    position: 'absolute',
    top: 150,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.teal,
    opacity: 0.1,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl * 1.5,
    marginBottom: spacing.xl,
  },
  headerSmall: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  logo: {
    width: 180,
    height: 80,
    marginBottom: spacing.md,
  },
  logoSmall: {
    width: 120,
    height: 50,
    marginBottom: spacing.sm,
  },
  logoGradient: {
    width: 70,
    height: 70,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGradientSmall: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
  },
  logoTextSmall: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  brandName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    letterSpacing: 1,
    marginBottom: spacing.md,
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
  typeCards: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  typeCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardActive: {
    borderColor: colors.primary,
  },
  typeCardGradient: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  typeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  typeIconActive: {
    backgroundColor: `${colors.primary}20`,
  },
  typeIconActiveOrg: {
    backgroundColor: `${colors.teal}20`,
  },
  typeTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  typeTitleActive: {
    color: colors.primary,
  },
  typeTitleActiveOrg: {
    color: colors.teal,
  },
  typeDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.warning}30`,
  },
  infoText: {
    flex: 1,
    color: colors.warning,
    fontSize: typography.fontSize.sm,
  },
  form: {
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
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
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
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
  genderSection: {
    marginBottom: spacing.md,
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  genderButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  genderText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  genderTextActive: {
    color: colors.primary,
  },
  privacyLink: {
    color: colors.primary,
    fontWeight: '500',
  },
  registerButton: {
    marginTop: spacing.sm,
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
});

export default RegisterScreen;
