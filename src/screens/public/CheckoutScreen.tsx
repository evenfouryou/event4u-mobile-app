import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, Linking, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

export interface CartItem {
  ticketedEventId: string;
  eventName: string;
  eventDate: string;
  sectorId: string;
  sectorName: string;
  ticketTypeId?: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
}

interface CheckoutScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  cartItems?: CartItem[];
}

export function CheckoutScreen({ onBack, onSuccess, cartItems = [] }: CheckoutScreenProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'review' | 'processing' | 'success'>('review');
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);

  const subtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const fees = subtotal * 0.05;
  const total = subtotal + fees;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handlePay = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Errore', 'Il carrello è vuoto');
      return;
    }

    setLoading(true);
    triggerHaptic('medium');
    
    try {
      const checkoutItems = cartItems.map(item => ({
        ticketedEventId: item.ticketedEventId,
        sectorId: item.sectorId,
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

      const result = await api.createMobileCheckout(checkoutItems);
      
      if (result.checkoutUrl) {
        setCheckoutSessionId(result.sessionId);
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
                    const confirmation = await api.confirmMobileCheckout(result.sessionId);
                    if (confirmation.success) {
                      triggerHaptic('success');
                      setStep('success');
                    } else {
                      Alert.alert('Errore', confirmation.message || 'Pagamento non completato. Riprova.');
                      setStep('review');
                    }
                  } catch (error: any) {
                    console.error('Confirmation error:', error);
                    Alert.alert('Errore', error.message || 'Impossibile verificare il pagamento');
                    setStep('review');
                  } finally {
                    setLoading(false);
                  }
                },
              },
              {
                text: 'Annulla',
                style: 'cancel',
                onPress: () => {
                  setStep('review');
                  setLoading(false);
                },
              },
            ]
          );
        } else {
          Alert.alert('Errore', 'Impossibile aprire il browser');
          setStep('review');
        }
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
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
            <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.successIcon}>
              <Ionicons name="checkmark" size={48} color={staticColors.primaryForeground} />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.successTitle}>Acquisto Completato!</Text>
            <Text style={styles.successAmount}>€{total.toFixed(2)}</Text>
            <Text style={styles.successText}>
              I tuoi biglietti sono stati aggiunti al tuo account.
              Riceverai una email di conferma.
            </Text>
          </View>
          <View style={styles.successActions}>
            <Button variant="golden" size="lg" onPress={onSuccess} testID="button-done">
              Vai ai Miei Biglietti
            </Button>
          </View>
        </View>
      </SafeArea>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-checkout" />
        <View style={styles.emptyState}>
          <Ionicons name="bag-outline" size={80} color={staticColors.mutedForeground} />
          <Text style={styles.emptyTitle}>Carrello vuoto</Text>
          <Text style={styles.emptyText}>
            Aggiungi biglietti per i tuoi eventi preferiti
          </Text>
          <Button
            variant="golden"
            onPress={onBack}
            style={styles.emptyButton}
            testID="button-back-to-events"
          >
            Esplora Eventi
          </Button>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-checkout" />

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
          <Text style={styles.pageTitle}>Riepilogo Ordine</Text>

          {cartItems.map((item, index) => (
            <View key={`${item.ticketedEventId}-${item.sectorId}-${index}`}>
              <Card style={styles.itemCard} testID={`checkout-item-${index}`}>
                <View style={styles.itemHeader}>
                  <Ionicons name="ticket" size={24} color={staticColors.primary} />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemEventName}>{item.eventName}</Text>
                    <Text style={styles.itemDate}>{formatDate(item.eventDate)}</Text>
                  </View>
                  <Badge variant="default">{item.quantity}x</Badge>
                </View>
                <View style={styles.itemDetails}>
                  <View style={styles.itemDetail}>
                    <Text style={styles.itemDetailLabel}>Tipologia</Text>
                    <Text style={styles.itemDetailValue}>{item.ticketTypeName}</Text>
                  </View>
                  <View style={styles.itemDetail}>
                    <Text style={styles.itemDetailLabel}>Settore</Text>
                    <Text style={styles.itemDetailValue}>{item.sectorName}</Text>
                  </View>
                  <View style={styles.itemDetail}>
                    <Text style={styles.itemDetailLabel}>Prezzo</Text>
                    <Text style={styles.itemDetailValue}>€{item.unitPrice.toFixed(2)}</Text>
                  </View>
                </View>
                <View style={styles.itemTotal}>
                  <Text style={styles.itemTotalLabel}>Subtotale</Text>
                  <Text style={styles.itemTotalValue}>€{(item.unitPrice * item.quantity).toFixed(2)}</Text>
                </View>
              </Card>
            </View>
          ))}

          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Dettaglio Pagamento</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotale biglietti</Text>
              <Text style={styles.summaryValue}>€{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Commissioni di servizio</Text>
              <Text style={styles.summaryValue}>€{fees.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Totale</Text>
              <Text style={styles.totalValue}>€{total.toFixed(2)}</Text>
            </View>
          </Card>

          {step === 'processing' && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={staticColors.primary} />
              <Text style={styles.processingTitle}>Pagamento in corso...</Text>
              <Text style={styles.processingText}>
                Completa il pagamento nel browser, poi torna qui per confermare.
              </Text>
            </View>
          )}

          {step === 'review' && (
            <View>
              <Button
                variant="golden"
                size="lg"
                onPress={handlePay}
                loading={loading}
                style={styles.payButton}
                testID="button-pay"
              >
                {loading ? 'Elaborazione...' : `Paga €${total.toFixed(2)}`}
              </Button>

              <View style={styles.securityBadges}>
                <View style={styles.securityBadge}>
                  <Ionicons name="lock-closed" size={16} color={staticColors.success} />
                  <Text style={styles.securityBadgeText}>Pagamento sicuro con Stripe</Text>
                </View>
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
    backgroundColor: staticColors.background,
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
  pageTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    paddingHorizontal: spacing.xxl,
  },
  itemCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemEventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  itemDate: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  itemDetail: {
    alignItems: 'center',
  },
  itemDetailLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: 2,
  },
  itemDetailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  itemTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  itemTotalLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  itemTotalValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.primary,
  },
  summaryCard: {
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  summaryValue: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  totalLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  totalValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  payButton: {
    marginBottom: spacing.md,
  },
  securityBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  securityBadgeText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
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
    color: staticColors.foreground,
  },
  processingText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  successTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    textAlign: 'center',
  },
  successAmount: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '800',
    color: staticColors.primary,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  successText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  successActions: {
    width: '100%',
    paddingHorizontal: spacing.xl,
  },
});

export default CheckoutScreen;
