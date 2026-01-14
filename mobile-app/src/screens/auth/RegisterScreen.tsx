import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../navigation/MainNavigator';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { useAuthStore } from '../../store/auth';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '../../lib/theme';

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const register = useAuthStore((state) => state.register);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const handleRegister = async () => {
    setFirstNameError('');
    setLastNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setError('');

    let isValid = true;

    if (!firstName.trim()) {
      setFirstNameError('Il nome è obbligatorio');
      isValid = false;
    }

    if (!lastName.trim()) {
      setLastNameError('Il cognome è obbligatorio');
      isValid = false;
    }

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
    } else if (!validatePassword(password)) {
      setPasswordError('La password deve contenere almeno 8 caratteri');
      isValid = false;
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Confirma la password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Le password non coincidono');
      isValid = false;
    }

    if (!isValid) return;

    setIsLoading(true);
    try {
      await register({
        firstName,
        lastName,
        email,
        password,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Errore durante la registrazione. Riprova.'
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
          <Text style={styles.subtitle}>Crea il tuo account</Text>
        </View>

        {/* Form Card */}
        <Card style={styles.card}>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* First Name Input */}
          <Input
            label="Nome"
            placeholder="Giovanni"
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text);
              setFirstNameError('');
            }}
            error={firstNameError}
            leftIcon={
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.mutedForeground}
              />
            }
          />

          {/* Last Name Input */}
          <Input
            label="Cognome"
            placeholder="Rossi"
            value={lastName}
            onChangeText={(text) => {
              setLastName(text);
              setLastNameError('');
            }}
            error={lastNameError}
            leftIcon={
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.mutedForeground}
              />
            }
          />

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

          {/* Confirm Password Input */}
          <Input
            label="Conferma Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setConfirmPasswordError('');
            }}
            error={confirmPasswordError}
            secureTextEntry
            leftIcon={
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.mutedForeground}
              />
            }
          />

          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <View
              style={[
                styles.requirementItem,
                password.length >= 8 && styles.requirementMet,
              ]}
            >
              <Ionicons
                name={password.length >= 8 ? 'checkmark-circle' : 'close-circle-outline'}
                size={16}
                color={password.length >= 8 ? colors.success : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.requirementText,
                  password.length >= 8 && styles.requirementMetText,
                ]}
              >
                Minimo 8 caratteri
              </Text>
            </View>
          </View>

          {/* Register Button */}
          <Button
            title={isLoading ? 'Registrazione in corso...' : 'Registrati'}
            onPress={handleRegister}
            disabled={isLoading}
            loading={isLoading}
            style={styles.registerButton}
          />

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Hai già un account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Accedi</Text>
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
  requirementsContainer: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  requirementMet: {},
  requirementText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  requirementMetText: {
    color: colors.success,
  },
  registerButton: {
    marginBottom: spacing.lg,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  loginLink: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
