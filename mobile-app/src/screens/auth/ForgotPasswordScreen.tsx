import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SafeArea } from '@/components/SafeArea';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function ForgotPasswordScreen({ onBack, onSuccess }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
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

  if (sent) {
    return (
      <SafeArea style={styles.container}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.foreground} />
        </Pressable>

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="mail-outline" size={64} color={colors.primary} />
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
            <Pressable onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={colors.foreground} />
            </Pressable>
            <Image
              source={require('../../../assets/logo-white.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="key-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>Password Dimenticata?</Text>
            <Text style={styles.subtitle}>
              Inserisci la tua email e ti invieremo un link per reimpostare la password
            </Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

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
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
              testID="button-submit"
            >
              Invia Link
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ricordi la password?</Text>
            <Pressable onPress={onBack}>
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
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  form: {
    marginBottom: spacing.xl,
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
  submitButton: {
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
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  emailHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  successHint: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  successActions: {
    marginTop: spacing.xxl,
    width: '100%',
  },
});

export default ForgotPasswordScreen;
