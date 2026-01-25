import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, Linking, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, gradients, shadows } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

interface WalletTopUpScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function WalletTopUpScreen({ onBack, onSuccess }: WalletTopUpScreenProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [step, setStep] = useState<'amount' | 'processing' | 'success'>('amount');
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [newBalance, setNewBalance] = useState(0);

  const presetAmounts = [10, 25, 50, 100, 200, 500];

  const selectedValue = selectedAmount || (customAmount ? parseFloat(customAmount) : 0);

  useEffect(() => {
    loadWalletBalance();
  }, []);

  const loadWalletBalance = async () => {
    try {
      setLoadingBalance(true);
      const wallet = await api.getWallet();
      setCurrentBalance(parseFloat(String(wallet.balance)) || 0);
    } catch (error) {
      console.error('Error loading wallet balance:', error);
      setCurrentBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleAmountSelect = (amount: number) => {
    triggerHaptic('selection');
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setCustomAmount(numericValue);
    setSelectedAmount(null);
  };

  const handlePay = async () => {
    if (selectedValue < 5) return;
    
    setLoading(true);
    triggerHaptic('medium');
    
    try {
      const result = await api.createWalletTopUpCheckout(selectedValue);
      
      if (result.checkoutUrl) {
        setStep('processing');
        
        const supported = await Linking.canOpenURL(result.checkoutUrl);
        if (supported) {
          await Linking.openURL(result.checkoutUrl);
          
          Alert.alert(
            'Pagamento in corso',
            'Dopo aver completato il pagamento nel browser, torna qui e premi "Verifica Pagamento" per confermare.',
            [
              {
                text: 'Verifica Pagamento',
                onPress: async () => {
                  try {
                    setLoading(true);
                    const confirmation = await api.confirmWalletTopUpCheckout(result.sessionId);
                    if (confirmation.success) {
                      setNewBalance(parseFloat(confirmation.newBalance));
                      triggerHaptic('success');
                      setStep('success');
                    } else {
                      Alert.alert('Errore', 'Pagamento non completato. Riprova.');
                      setStep('amount');
                    }
                  } catch (error: any) {
                    console.error('Confirmation error:', error);
                    Alert.alert('Errore', error.message || 'Impossibile verificare il pagamento');
                    setStep('amount');
                  } finally {
                    setLoading(false);
                  }
                },
              },
              {
                text: 'Annulla',
                style: 'cancel',
                onPress: () => {
                  setStep('amount');
                  setLoading(false);
                },
              },
            ]
          );
        } else {
          Alert.alert('Errore', 'Impossibile aprire il browser');
          setStep('amount');
        }
      }
    } catch (error: any) {
      console.error('TopUp error:', error);
      Alert.alert('Errore', error.message || 'Impossibile creare la sessione di pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <View style={styles.successContainer}>
          <View>
            <LinearGradient colors={gradients.golden} style={styles.successIcon}>
              <Ionicons name="checkmark" size={48} color={colors.primaryForeground} />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.successTitle}>Ricarica Completata!</Text>
            <Text style={styles.successAmount}>+€{selectedValue.toFixed(2)}</Text>
            <Text style={styles.successText}>
              Il tuo nuovo saldo è di €{(currentBalance + selectedValue).toFixed(2)}
            </Text>
          </View>
          <View style={styles.successActions}>
            <Button variant="golden" size="lg" onPress={onSuccess} testID="button-done">
              Torna al Wallet
            </Button>
          </View>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-topup" />

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
            <LinearGradient colors={gradients.goldenLight} style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Saldo attuale</Text>
              <Text style={styles.balanceValue}>€{currentBalance.toFixed(2)}</Text>
              {selectedValue > 0 && (
                <View style={styles.newBalance}>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                  <Text style={styles.newBalanceValue}>
                    €{(currentBalance + selectedValue).toFixed(2)}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>

          {step === 'amount' && (
            <View>
              <Text style={styles.sectionTitle}>Seleziona importo</Text>

              <View style={styles.amountsGrid}>
                {presetAmounts.map((amount) => (
                  <Pressable
                    key={amount}
                    onPress={() => handleAmountSelect(amount)}
                    style={[
                      styles.amountOption,
                      selectedAmount === amount && styles.amountOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.amountText,
                        selectedAmount === amount && styles.amountTextSelected,
                      ]}
                    >
                      €{amount}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.customAmountContainer}>
                <Text style={styles.customLabel}>Oppure inserisci un importo</Text>
                <View style={styles.customInputWrapper}>
                  <Text style={styles.currencySymbol}>€</Text>
                  <Input
                    value={customAmount}
                    onChangeText={handleCustomAmountChange}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    style={styles.customInput}
                    testID="input-custom-amount"
                  />
                </View>
                <Text style={styles.minAmount}>Importo minimo: €5.00</Text>
              </View>

              <View style={styles.paymentMethods}>
                <Text style={styles.sectionTitle}>Metodo di pagamento</Text>
                <Card style={styles.methodCard}>
                  <View style={styles.methodRow}>
                    <Ionicons name="card" size={24} color={colors.foreground} />
                    <Text style={styles.methodText}>Carta di credito/debito</Text>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  </View>
                </Card>
              </View>

              <Button
                variant="golden"
                size="lg"
                onPress={handlePay}
                disabled={selectedValue < 5 || loading}
                loading={loading}
                style={styles.continueButton}
                testID="button-pay"
              >
                {selectedValue >= 5
                  ? `Ricarica €${selectedValue.toFixed(2)}`
                  : 'Seleziona un importo'}
              </Button>
              
              <View style={styles.securityNote}>
                <Ionicons name="lock-closed" size={14} color={colors.mutedForeground} />
                <Text style={styles.securityText}>Pagamento sicuro con Stripe</Text>
              </View>
            </View>
          )}

          {step === 'processing' && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingTitle}>Pagamento in corso...</Text>
              <Text style={styles.processingText}>
                Completa il pagamento nel browser, poi torna qui per confermare.
              </Text>
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
  balanceCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  balanceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  balanceValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: colors.foreground,
  },
  newBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  newBalanceValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  amountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  amountOption: {
    width: '31%',
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  amountText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  amountTextSelected: {
    color: colors.primary,
  },
  customAmountContainer: {
    marginBottom: spacing.xl,
  },
  customLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currencySymbol: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '600',
    color: colors.foreground,
  },
  customInput: {
    flex: 1,
  },
  minAmount: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  paymentMethods: {
    marginBottom: spacing.lg,
  },
  methodCard: {
    padding: spacing.md,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  methodText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  continueButton: {
    marginTop: spacing.md,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  securityText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  processingTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.foreground,
  },
  processingText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
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
    marginBottom: spacing.lg,
  },
  cardBrand: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 2,
  },
  cardNumber: {
    fontSize: typography.fontSize.xl,
    fontWeight: '500',
    color: 'white',
    letterSpacing: 3,
    marginBottom: spacing.lg,
  },
  cardFooter: {
    flexDirection: 'row',
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
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
  },
  summaryValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
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
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    ...shadows.golden,
  },
  successTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successAmount: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  successActions: {
    marginTop: spacing.xxl,
    width: '100%',
  },
});

export default WalletTopUpScreen;
