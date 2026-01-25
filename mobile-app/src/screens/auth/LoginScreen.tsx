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
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError('Inserisci le credenziali');
      triggerHaptic('error');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(identifier, password);
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
              source={{ uri: 'https://manage.eventfouryou.com/logos/logo-vertical-dark.svg' }}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.logoFallback}>
              <LinearGradient
                colors={[colors.primary, '#FFA500']}
                style={styles.logoGradient}
              >
                <Text style={styles.logoText}>E4U</Text>
              </LinearGradient>
              <Text style={styles.brandName}>EventFourYou</Text>
            </View>
            <Text style={styles.title}>Login</Text>
          </View>

          <View style={styles.methodTabs}>
            <Text style={styles.methodLabel}>Non hai un account?</Text>
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
    width: 120,
    height: 60,
    marginBottom: spacing.md,
  },
  logoFallback: {
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
  },
  brandName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    letterSpacing: 1,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
  },
  methodTabs: {
    marginBottom: spacing.lg,
  },
  methodLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
    textAlign: 'center',
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
});

export default LoginScreen;
