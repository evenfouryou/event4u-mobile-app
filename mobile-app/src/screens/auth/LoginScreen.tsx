import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, Image, Modal, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SafeArea } from '@/components/SafeArea';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

const PHONE_PREFIXES = [
  { value: '+39', label: 'IT +39', flag: 'IT' },
  { value: '+1', label: 'US +1', flag: 'US' },
  { value: '+44', label: 'UK +44', flag: 'GB' },
  { value: '+49', label: 'DE +49', flag: 'DE' },
  { value: '+33', label: 'FR +33', flag: 'FR' },
  { value: '+34', label: 'ES +34', flag: 'ES' },
  { value: '+41', label: 'CH +41', flag: 'CH' },
  { value: '+43', label: 'AT +43', flag: 'AT' },
  { value: '+31', label: 'NL +31', flag: 'NL' },
  { value: '+32', label: 'BE +32', flag: 'BE' },
  { value: '+351', label: 'PT +351', flag: 'PT' },
  { value: '+48', label: 'PL +48', flag: 'PL' },
  { value: '+30', label: 'GR +30', flag: 'GR' },
  { value: '+385', label: 'HR +385', flag: 'HR' },
  { value: '+386', label: 'SI +386', flag: 'SI' },
];

interface LoginScreenProps {
  onNavigateRegister: () => void;
  onNavigateForgotPassword: () => void;
  onLoginSuccess: () => void;
  onGoBack?: () => void;
}

type LoginMethod = 'email' | 'username' | 'phone';

export function LoginScreen({
  onNavigateRegister,
  onNavigateForgotPassword,
  onLoginSuccess,
  onGoBack,
}: LoginScreenProps) {
  const { login } = useAuth();
  const { colors, gradients } = useTheme();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phonePrefix, setPhonePrefix] = useState('+39');
  const [showPrefixModal, setShowPrefixModal] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError('Inserisci le credenziali');
      triggerHaptic('error');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const loginIdentifier = loginMethod === 'phone' 
        ? `${phonePrefix}${identifier.replace(/\s/g, '')}` 
        : identifier;
      await login(loginIdentifier, password);
      triggerHaptic('success');
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Credenziali non valide');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const getInputProps = () => {
    switch (loginMethod) {
      case 'email':
        return {
          placeholder: 'esempio@email.com',
          keyboardType: 'email-address' as const,
          leftIcon: 'mail-outline' as const,
          label: 'Email',
        };
      case 'username':
        return {
          placeholder: 'Il tuo username',
          keyboardType: 'default' as const,
          leftIcon: 'person-outline' as const,
          label: 'Username',
        };
      case 'phone':
        return {
          placeholder: '+39 123 456 7890',
          keyboardType: 'phone-pad' as const,
          leftIcon: 'call-outline' as const,
          label: 'Telefono',
        };
    }
  };

  const inputProps = getInputProps();

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
            <Text style={styles.title}>Login</Text>
          </View>

          <View style={styles.methodTabs}>
            <View style={styles.tabsRow}>
              {(['email', 'username', 'phone'] as LoginMethod[]).map((method) => (
                <Pressable
                  key={method}
                  style={[
                    styles.methodTab,
                    loginMethod === method && styles.methodTabActive,
                  ]}
                  onPress={() => {
                    setLoginMethod(method);
                    setIdentifier('');
                    setError('');
                    triggerHaptic('light');
                  }}
                >
                  <Text
                    style={[
                      styles.methodTabText,
                      loginMethod === method && styles.methodTabTextActive,
                    ]}
                  >
                    {method === 'email' ? 'Email' : method === 'username' ? 'Username' : 'Phone'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={colors.destructive} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {loginMethod === 'phone' ? (
              <View>
                <Text style={styles.inputLabel}>Telefono</Text>
                <View style={styles.phoneRow}>
                  <Pressable
                    style={styles.prefixSelector}
                    onPress={() => {
                      triggerHaptic('light');
                      setShowPrefixModal(true);
                    }}
                    testID="button-select-prefix"
                  >
                    <Text style={styles.prefixText}>{phonePrefix}</Text>
                    <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
                  </Pressable>
                  <View style={styles.phoneInputContainer}>
                    <Input
                      value={identifier}
                      onChangeText={setIdentifier}
                      placeholder="123 456 7890"
                      keyboardType="phone-pad"
                      containerStyle={{ marginBottom: 0, flex: 1 }}
                      testID="input-phone-number"
                    />
                  </View>
                </View>
              </View>
            ) : (
              <Input
                label={inputProps.label}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder={inputProps.placeholder}
                keyboardType={inputProps.keyboardType}
                autoCapitalize="none"
                leftIcon={inputProps.leftIcon}
                testID="input-identifier"
              />
            )}

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="La tua password"
              secureTextEntry
              autoComplete="password"
              leftIcon="lock-closed-outline"
              testID="input-password"
            />

            <Pressable onPress={onNavigateForgotPassword} style={styles.forgotLink}>
              <Text style={styles.forgotText}>Password dimenticata?</Text>
            </Pressable>

            <Button
              variant="golden"
              size="lg"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
              testID="button-login"
            >
              Login
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Non hai un account?</Text>
            <Pressable onPress={onNavigateRegister}>
              <Text style={styles.registerLink}>Registrati</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showPrefixModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrefixModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowPrefixModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleziona Prefisso</Text>
              <Pressable onPress={() => setShowPrefixModal(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            <FlatList
              data={PHONE_PREFIXES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.prefixOption,
                    phonePrefix === item.value && styles.prefixOptionActive,
                  ]}
                  onPress={() => {
                    setPhonePrefix(item.value);
                    setShowPrefixModal(false);
                    triggerHaptic('light');
                  }}
                >
                  <Text style={styles.prefixFlag}>{item.flag}</Text>
                  <Text style={[
                    styles.prefixOptionText,
                    phonePrefix === item.value && styles.prefixOptionTextActive,
                  ]}>
                    {item.label}
                  </Text>
                  {phonePrefix === item.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
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
    top: 100,
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
  logo: {
    width: 180,
    height: 100,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
  },
  methodTabs: {
    marginBottom: spacing.lg,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  methodTabActive: {
    backgroundColor: colors.primary,
  },
  methodTabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  methodTabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  form: {
    marginBottom: spacing.xl,
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
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  forgotText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  loginButton: {
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
  registerLink: {
    color: colors.primary,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  prefixSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 52,
    gap: spacing.xs,
  },
  prefixText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  phoneInputContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  prefixOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  prefixOptionActive: {
    backgroundColor: `${colors.primary}15`,
  },
  prefixFlag: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.mutedForeground,
    width: 30,
  },
  prefixOptionText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  prefixOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;
