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
import { useAuthStore } from '../../store/auth';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '../../theme';

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useAuthStore((state) => state.login);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    setEmailError('');
    setPasswordError('');
    setError('');

    let isValid = true;

    if (!email.trim()) {
      setEmailError('Email è obbligatoria');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Inserisci un email valido');
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError('La password è obbligatoria');
      isValid = false;
    }

    if (!isValid) return;

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Errore durante il login. Riprova.'
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
            {/* Header con Logo */}
            <View style={[
              styles.header,
              isLandscape && styles.headerLandscape,
            ]}>
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
              ]}>Accedi al tuo account</Text>
            </View>

            {/* Form Card */}
            <Card style={[
              styles.card,
              { padding: contentPadding },
            ]} variant="elevated">
              {/* Error Banner */}
              {error ? (
                <View style={styles.errorBanner} data-testid="error-banner">
                  <Ionicons name="alert-circle" size={20} color={colors.destructive} />
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

              {/* Password Input */}
              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError('');
                }}
                error={passwordError}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                leftIcon={
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.mutedForeground}
                  />
                }
                testID="input-password"
              />

              {/* Password dimenticata */}
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotPasswordLink}
                data-testid="link-forgot-password"
              >
                <Text style={styles.forgotPasswordText}>Password dimenticata?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <Button
                title={isLoading ? 'Accesso in corso...' : 'Accedi'}
                onPress={handleLogin}
                disabled={isLoading}
                loading={isLoading}
                style={styles.loginButton}
                testID="button-login"
              />

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>oppure</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Login Button */}
              <Button
                title="Accedi con Google"
                onPress={() => {
                  setError('Google login non ancora disponibile');
                }}
                variant="outline"
                icon={
                  <Ionicons
                    name="logo-google"
                    size={20}
                    color={colors.foreground}
                  />
                }
                testID="button-google-login"
              />

              {/* Sign Up Link */}
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Non hai un account? </Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Register')}
                  data-testid="link-register"
                >
                  <Text style={styles.signupLink}>Registrati</Text>
                </TouchableOpacity>
              </View>
            </Card>
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
  },
  headerLandscape: {
    marginBottom: spacing.xl,
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
  forgotPasswordLink: {
    alignItems: 'flex-end',
    marginBottom: spacing.xl,
    paddingVertical: spacing.xs,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  loginButton: {
    marginBottom: spacing.xl,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  signupText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  signupLink: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
