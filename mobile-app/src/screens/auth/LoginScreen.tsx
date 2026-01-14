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
import { useAuthStore } from '../../store/auth';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '../../lib/theme';

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: LoginScreenProps) {
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
      setEmailError('Email è obbligatorio');
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with Logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons
              name="ticket-outline"
              size={40}
              color={colors.primary}
            />
            <Text style={styles.logoText}>Event4U</Text>
          </View>
          <Text style={styles.subtitle}>Accedi al tuo account</Text>
        </View>

        {/* Form Card */}
        <Card style={styles.card}>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color={colors.destructive} />
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
            leftIcon={
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.mutedForeground}
              />
            }
          />

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPasswordLink}
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
              // TODO: Implement Google login
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
          />

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Non hai un account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>Registrati</Text>
            </TouchableOpacity>
          </View>
        </Card>
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
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
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
  forgotPasswordLink: {
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  loginButton: {
    marginBottom: spacing.lg,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
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
    marginTop: spacing.lg,
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
