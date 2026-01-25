import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { triggerHaptic } from '@/lib/haptics';

interface CheckoutScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CheckoutScreen({ onBack, onSuccess }: CheckoutScreenProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvc: '',
  });

  const orderSummary = {
    eventName: 'Saturday Night Fever',
    eventDate: new Date('2026-02-01T23:00:00'),
    tickets: 2,
    subtotal: 70,
    fees: 3.5,
    total: 73.5,
  };

  const updateFormField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateCardField = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === 'number') {
      formattedValue = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
    }
    if (field === 'expiry') {
      formattedValue = value.replace(/\D/g, '').replace(/^(\d{2})/, '$1/').substring(0, 5);
    }
    if (field === 'cvc') {
      formattedValue = value.replace(/\D/g, '').substring(0, 4);
    }
    
    setCardData(prev => ({ ...prev, [field]: formattedValue }));
  };

  const handleContinue = () => {
    triggerHaptic('medium');
    setStep('payment');
  };

  const handlePay = async () => {
    setLoading(true);
    triggerHaptic('medium');
    
    setTimeout(() => {
      triggerHaptic('success');
      onSuccess();
    }, 2000);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeArea style={styles.container}>
      <Header
        title="Checkout"
        showBack
        onBack={onBack}
        testID="header-checkout"
      />

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
          <View style={styles.steps}>
            <View style={[styles.step, step === 'details' && styles.stepActive]}>
              <View style={[styles.stepDot, step === 'details' && styles.stepDotActive]}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <Text style={[styles.stepLabel, step === 'details' && styles.stepLabelActive]}>
                Dati
              </Text>
            </View>
            <View style={styles.stepLine} />
            <View style={[styles.step, step === 'payment' && styles.stepActive]}>
              <View style={[styles.stepDot, step === 'payment' && styles.stepDotActive]}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <Text style={[styles.stepLabel, step === 'payment' && styles.stepLabelActive]}>
                Pagamento
              </Text>
            </View>
          </View>

          <View>
            <Card style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Ionicons name="ticket" size={24} color={colors.primary} />
                <View style={styles.orderInfo}>
                  <Text style={styles.orderEventName}>{orderSummary.eventName}</Text>
                  <Text style={styles.orderDate}>{formatDate(orderSummary.eventDate)}</Text>
                </View>
                <Badge variant="default">{orderSummary.tickets}x</Badge>
              </View>
              <View style={styles.orderTotal}>
                <Text style={styles.orderTotalLabel}>Totale</Text>
                <Text style={styles.orderTotalValue}>€{orderSummary.total.toFixed(2)}</Text>
              </View>
            </Card>
          </View>

          {step === 'details' && (
            <View>
              <Text style={styles.sectionTitle}>Dati Intestatario</Text>
              <Card style={styles.formCard}>
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <Input
                      label="Nome"
                      value={formData.firstName}
                      onChangeText={(v) => updateFormField('firstName', v)}
                      placeholder="Mario"
                      autoCapitalize="words"
                      testID="input-firstName"
                    />
                  </View>
                  <View style={styles.formHalf}>
                    <Input
                      label="Cognome"
                      value={formData.lastName}
                      onChangeText={(v) => updateFormField('lastName', v)}
                      placeholder="Rossi"
                      autoCapitalize="words"
                      testID="input-lastName"
                    />
                  </View>
                </View>

                <Input
                  label="Email"
                  value={formData.email}
                  onChangeText={(v) => updateFormField('email', v)}
                  placeholder="mario@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="mail-outline"
                  testID="input-email"
                />

                <Input
                  label="Telefono"
                  value={formData.phone}
                  onChangeText={(v) => updateFormField('phone', v)}
                  placeholder="+39 333 1234567"
                  keyboardType="phone-pad"
                  leftIcon="call-outline"
                  testID="input-phone"
                />
              </Card>

              <Button
                variant="golden"
                size="lg"
                onPress={handleContinue}
                style={styles.continueButton}
                testID="button-continue"
              >
                Continua al Pagamento
              </Button>
            </View>
          )}

          {step === 'payment' && (
            <View>
              <Text style={styles.sectionTitle}>Metodo di Pagamento</Text>
              
              <Card style={styles.cardPreview}>
                <LinearGradient
                  colors={['#1e3a5f', '#0f2744']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardHeader}>
                    <Ionicons name="card" size={32} color="white" />
                    <Text style={styles.cardBrand}>VISA</Text>
                  </View>
                  <Text style={styles.cardNumber}>
                    {cardData.number || '•••• •••• •••• ••••'}
                  </Text>
                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.cardLabel}>SCADENZA</Text>
                      <Text style={styles.cardValue}>{cardData.expiry || 'MM/AA'}</Text>
                    </View>
                    <View>
                      <Text style={styles.cardLabel}>CVC</Text>
                      <Text style={styles.cardValue}>{cardData.cvc ? '•••' : '•••'}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Card>

              <Card style={styles.formCard}>
                <Input
                  label="Numero Carta"
                  value={cardData.number}
                  onChangeText={(v) => updateCardField('number', v)}
                  placeholder="1234 5678 9012 3456"
                  keyboardType="number-pad"
                  leftIcon="card-outline"
                  testID="input-card-number"
                />

                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <Input
                      label="Scadenza"
                      value={cardData.expiry}
                      onChangeText={(v) => updateCardField('expiry', v)}
                      placeholder="MM/AA"
                      keyboardType="number-pad"
                      testID="input-card-expiry"
                    />
                  </View>
                  <View style={styles.formHalf}>
                    <Input
                      label="CVC"
                      value={cardData.cvc}
                      onChangeText={(v) => updateCardField('cvc', v)}
                      placeholder="123"
                      keyboardType="number-pad"
                      secureTextEntry
                      testID="input-card-cvc"
                    />
                  </View>
                </View>
              </Card>

              <View style={styles.securityBadges}>
                <View style={styles.securityBadge}>
                  <Ionicons name="lock-closed" size={16} color={colors.success} />
                  <Text style={styles.securityText}>SSL Sicuro</Text>
                </View>
                <View style={styles.securityBadge}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                  <Text style={styles.securityText}>PCI DSS</Text>
                </View>
              </View>

              <Button
                variant="golden"
                size="lg"
                onPress={handlePay}
                loading={loading}
                style={styles.payButton}
                testID="button-pay"
              >
                <View style={styles.payButtonContent}>
                  <Ionicons name="lock-closed" size={20} color={colors.primaryForeground} />
                  <Text style={styles.payButtonText}>
                    Paga €{orderSummary.total.toFixed(2)}
                  </Text>
                </View>
              </Button>

              <Pressable onPress={() => setStep('details')} style={styles.backLink}>
                <Text style={styles.backLinkText}>← Torna ai dati</Text>
              </Pressable>
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
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  step: {
    alignItems: 'center',
    opacity: 0.5,
  },
  stepActive: {
    opacity: 1,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  stepLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  stepLabelActive: {
    color: colors.foreground,
    fontWeight: '500',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  orderCard: {
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderEventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  orderDate: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderTotalLabel: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
  },
  orderTotalValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formHalf: {
    flex: 1,
  },
  continueButton: {
    marginTop: spacing.md,
  },
  cardPreview: {
    padding: 0,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  cardBrand: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 2,
  },
  cardNumber: {
    fontSize: typography.fontSize.xl,
    fontWeight: '500',
    color: 'white',
    letterSpacing: 4,
    marginBottom: spacing.lg,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  cardLabel: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: typography.fontSize.base,
    color: 'white',
    fontWeight: '500',
  },
  securityBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  securityText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  payButton: {
    marginBottom: spacing.md,
  },
  payButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  payButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  backLink: {
    alignItems: 'center',
    padding: spacing.md,
  },
  backLinkText: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: '500',
  },
});

export default CheckoutScreen;
