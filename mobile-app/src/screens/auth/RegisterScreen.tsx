import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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
}

export function RegisterScreen({ onNavigateLogin, onRegisterSuccess }: RegisterScreenProps) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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
    if (!formData.password || formData.password.length < 6) {
      return 'La password deve avere almeno 6 caratteri';
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
        phone: formData.phone || undefined,
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
          <View style={styles.glowContainer}>
            <View style={styles.glowGolden} />
          </View>

          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>E4U</Text>
            </View>
            <Text style={styles.title}>Crea Account</Text>
            <Text style={styles.subtitle}>Unisciti alla community</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.form}>
            {error ? (
              <View style={styles.errorContainer}>
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
              label="Telefono (opzionale)"
              value={formData.phone}
              onChangeText={(v) => updateField('phone', v)}
              placeholder="+39 333 1234567"
              keyboardType="phone-pad"
              leftIcon="call-outline"
              testID="input-phone"
            />

            <Input
              label="Password"
              value={formData.password}
              onChangeText={(v) => updateField('password', v)}
              placeholder="Minimo 6 caratteri"
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
                triggerHaptic('selection');
                setAcceptedPrivacy(!acceptedPrivacy);
              }}
            >
              <View style={[styles.checkbox, acceptedPrivacy && styles.checkboxChecked]}>
                {acceptedPrivacy && <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />}
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
              Registrati
            </Button>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.footer}>
            <Text style={styles.footerText}>Hai già un account?</Text>
            <Pressable onPress={onNavigateLogin}>
              <Text style={styles.loginLink}>Accedi</Text>
            </Pressable>
          </Animated.View>
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
    top: -50,
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
    marginBottom: spacing.xl,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryForeground,
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
  form: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: `${colors.destructive}20`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.destructive}40`,
  },
  errorText: {
    color: colors.destructive,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
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
  registerButton: {
    marginTop: spacing.md,
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
