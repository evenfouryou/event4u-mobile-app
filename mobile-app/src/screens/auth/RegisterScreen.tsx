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

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

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
      setEmailError('Email è obbligatoria');
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
      setConfirmPasswordError('Conferma la password');
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

  const cardMaxWidth = isTablet ? 480 : isLandscape ? 400 : '100%';
  const contentPadding = isTablet ? spacing['3xl'] : spacing.xl;

  // In landscape with many fields, use two columns for name fields
  const useNameRow = isLandscape || isTablet;

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
            {/* Header with Logo */}
            <View style={[
              styles.header,
              isLandscape && styles.headerLandscape,
            ]}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                testID="button-back"
              >
                <Ionicons
                  name="chevron-back"
                  size={28}
                  color={colors.primary}
                />
              </TouchableOpacity>
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
              ]}>Crea il tuo account</Text>
            </View>

            {/* Form Card */}
            <Card style={[
              styles.card,
              { padding: contentPadding },
            ]} variant="elevated">
              {/* Error Banner */}
              {error ? (
                <View style={styles.errorBanner} testID="error-banner">
                  <Ionicons name="alert-circle" size={20} color={colors.destructive} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Name Fields - Row layout on tablet/landscape */}
              {useNameRow ? (
                <View style={styles.nameRow}>
                  <View style={styles.nameField}>
                    <Input
                      label="Nome"
                      placeholder="Giovanni"
                      value={firstName}
                      onChangeText={(text) => {
                        setFirstName(text);
                        setFirstNameError('');
                      }}
                      error={firstNameError}
                      autoComplete="given-name"
                      textContentType="givenName"
                      leftIcon={
                        <Ionicons
                          name="person-outline"
                          size={20}
                          color={colors.mutedForeground}
                        />
                      }
                      testID="input-firstname"
                    />
                  </View>
                  <View style={styles.nameField}>
                    <Input
                      label="Cognome"
                      placeholder="Rossi"
                      value={lastName}
                      onChangeText={(text) => {
                        setLastName(text);
                        setLastNameError('');
                      }}
                      error={lastNameError}
                      autoComplete="family-name"
                      textContentType="familyName"
                      leftIcon={
                        <Ionicons
                          name="person-outline"
                          size={20}
                          color={colors.mutedForeground}
                        />
                      }
                      testID="input-lastname"
                    />
                  </View>
                </View>
              ) : (
                <>
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
                    autoComplete="given-name"
                    textContentType="givenName"
                    leftIcon={
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color={colors.mutedForeground}
                      />
                    }
                    testID="input-firstname"
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
                    autoComplete="family-name"
                    textContentType="familyName"
                    leftIcon={
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color={colors.mutedForeground}
                      />
                    }
                    testID="input-lastname"
                  />
                </>
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
                placeholder="Minimo 8 caratteri"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError('');
                }}
                error={passwordError}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                leftIcon={
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.mutedForeground}
                  />
                }
                testID="input-password"
              />

              {/* Confirm Password Input */}
              <Input
                label="Conferma Password"
                placeholder="Ripeti la password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setConfirmPasswordError('');
                }}
                error={confirmPasswordError}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                leftIcon={
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.mutedForeground}
                  />
                }
                testID="input-confirm-password"
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
                    name={password.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
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
                <View
                  style={[
                    styles.requirementItem,
                    password === confirmPassword && confirmPassword.length > 0 && styles.requirementMet,
                  ]}
                >
                  <Ionicons
                    name={password === confirmPassword && confirmPassword.length > 0 ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={password === confirmPassword && confirmPassword.length > 0 ? colors.success : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      password === confirmPassword && confirmPassword.length > 0 && styles.requirementMetText,
                    ]}
                  >
                    Le password coincidono
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
                testID="button-register"
              />

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>oppure</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Register Button */}
              <Button
                title="Registrati con Google"
                onPress={() => {
                  setError('Registrazione Google non ancora disponibile');
                }}
                variant="outline"
                icon={
                  <Ionicons
                    name="logo-google"
                    size={20}
                    color={colors.foreground}
                  />
                }
                testID="button-google-register"
              />

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Hai già un account? </Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Login')}
                  testID="link-login"
                >
                  <Text style={styles.loginLink}>Accedi</Text>
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
    marginBottom: spacing['2xl'],
    position: 'relative',
  },
  headerLandscape: {
    marginBottom: spacing.xl,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: spacing.sm,
    zIndex: 10,
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
  nameRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  nameField: {
    flex: 1,
  },
  requirementsContainer: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
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
