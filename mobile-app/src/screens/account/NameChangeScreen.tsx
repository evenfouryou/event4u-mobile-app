import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { triggerHaptic } from '@/lib/haptics';

interface NameChangeScreenProps {
  ticketId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function NameChangeScreen({ ticketId, onBack, onSuccess }: NameChangeScreenProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [formData, setFormData] = useState({
    newFirstName: '',
    newLastName: '',
    newEmail: '',
    newPhone: '',
    reason: '',
  });
  const [error, setError] = useState('');

  const ticket = {
    id: ticketId,
    eventName: 'Saturday Night Fever',
    eventDate: new Date('2026-02-01T23:00:00'),
    ticketType: 'VIP',
    currentHolder: 'Mario Rossi',
    changeFee: 5.0,
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.newFirstName || !formData.newLastName) {
      return 'Inserisci nome e cognome del nuovo intestatario';
    }
    if (!formData.newEmail || !formData.newEmail.includes('@')) {
      return 'Inserisci una email valida';
    }
    return null;
  };

  const handleContinue = () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      triggerHaptic('error');
      return;
    }
    setError('');
    triggerHaptic('medium');
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setLoading(true);
    triggerHaptic('medium');

    setTimeout(() => {
      triggerHaptic('success');
      setStep('success');
      setLoading(false);
    }, 2000);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  if (step === 'success') {
    return (
      <SafeArea style={styles.container}>
        <Header showLogo showBack onBack={onBack} />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <View>
            <Text style={styles.successTitle}>Richiesta Inviata!</Text>
            <Text style={styles.successText}>
              Il cambio nominativo è stato elaborato con successo.{'\n\n'}
              Il nuovo intestatario riceverà una email di conferma con il biglietto aggiornato.
            </Text>
          </View>
          <View style={styles.successActions}>
            <Button variant="golden" size="lg" onPress={onSuccess} testID="button-done">
              Torna ai Biglietti
            </Button>
          </View>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-name-change" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Card style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Ionicons name="ticket" size={24} color={colors.primary} />
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketEventName}>{ticket.eventName}</Text>
                  <Text style={styles.ticketDate}>{formatDate(ticket.eventDate)}</Text>
                </View>
                <Badge variant="default">{ticket.ticketType}</Badge>
              </View>
              <View style={styles.ticketDivider} />
              <View style={styles.currentHolder}>
                <Text style={styles.currentHolderLabel}>Attuale intestatario</Text>
                <Text style={styles.currentHolderName}>{ticket.currentHolder}</Text>
              </View>
            </Card>
          </View>

          {step === 'form' && (
            <View>
              <Text style={styles.sectionTitle}>Nuovo Intestatario</Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Card style={styles.formCard}>
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <Input
                      label="Nome"
                      value={formData.newFirstName}
                      onChangeText={(v) => updateField('newFirstName', v)}
                      placeholder="Nome"
                      autoCapitalize="words"
                      testID="input-newFirstName"
                    />
                  </View>
                  <View style={styles.formHalf}>
                    <Input
                      label="Cognome"
                      value={formData.newLastName}
                      onChangeText={(v) => updateField('newLastName', v)}
                      placeholder="Cognome"
                      autoCapitalize="words"
                      testID="input-newLastName"
                    />
                  </View>
                </View>

                <Input
                  label="Email"
                  value={formData.newEmail}
                  onChangeText={(v) => updateField('newEmail', v)}
                  placeholder="email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="mail-outline"
                  testID="input-newEmail"
                />

                <Input
                  label="Telefono (opzionale)"
                  value={formData.newPhone}
                  onChangeText={(v) => updateField('newPhone', v)}
                  placeholder="+39 333 1234567"
                  keyboardType="phone-pad"
                  leftIcon="call-outline"
                  testID="input-newPhone"
                />
              </Card>

              <View style={styles.feeInfo}>
                <Ionicons name="information-circle" size={20} color={colors.mutedForeground} />
                <Text style={styles.feeText}>
                  Commissione cambio nominativo: <Text style={styles.feeAmount}>€{ticket.changeFee.toFixed(2)}</Text>
                </Text>
              </View>

              <Button
                variant="golden"
                size="lg"
                onPress={handleContinue}
                style={styles.continueButton}
                testID="button-continue"
              >
                Continua
              </Button>
            </View>
          )}

          {step === 'confirm' && (
            <View>
              <Text style={styles.sectionTitle}>Conferma Cambio</Text>

              <Card style={styles.confirmCard}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Da</Text>
                  <Text style={styles.confirmValue}>{ticket.currentHolder}</Text>
                </View>
                <View style={styles.confirmArrow}>
                  <Ionicons name="arrow-down" size={24} color={colors.primary} />
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>A</Text>
                  <Text style={styles.confirmValue}>
                    {formData.newFirstName} {formData.newLastName}
                  </Text>
                </View>
                <View style={styles.confirmDivider} />
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Email</Text>
                  <Text style={styles.confirmValue}>{formData.newEmail}</Text>
                </View>
                {formData.newPhone && (
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Telefono</Text>
                    <Text style={styles.confirmValue}>{formData.newPhone}</Text>
                  </View>
                )}
              </Card>

              <Card style={styles.totalCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Commissione</Text>
                  <Text style={styles.totalValue}>€{ticket.changeFee.toFixed(2)}</Text>
                </View>
              </Card>

              <View style={styles.warningBox}>
                <Ionicons name="warning" size={20} color={colors.warning} />
                <Text style={styles.warningText}>
                  Questa operazione è irreversibile. Il biglietto sarà trasferito al nuovo intestatario.
                </Text>
              </View>

              <View style={styles.confirmActions}>
                <Button
                  variant="outline"
                  size="lg"
                  onPress={() => setStep('form')}
                  style={styles.backButton}
                  testID="button-back-form"
                >
                  Modifica
                </Button>
                <Button
                  variant="golden"
                  size="lg"
                  onPress={handleConfirm}
                  loading={loading}
                  style={styles.confirmButton}
                  testID="button-confirm"
                >
                  Conferma
                </Button>
              </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  ticketCard: {
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketEventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  ticketDate: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  currentHolder: {
    alignItems: 'center',
  },
  currentHolderLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  currentHolderName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
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
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formHalf: {
    flex: 1,
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  feeText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  feeAmount: {
    fontWeight: '600',
    color: colors.foreground,
  },
  continueButton: {
    marginTop: spacing.md,
  },
  confirmCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  confirmLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  confirmValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  confirmArrow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  confirmDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  totalCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
  },
  totalValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: `${colors.warning}15`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.warning}30`,
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  successIcon: {
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
  },
  successActions: {
    marginTop: spacing.xxl,
    width: '100%',
  },
});

export default NameChangeScreen;
