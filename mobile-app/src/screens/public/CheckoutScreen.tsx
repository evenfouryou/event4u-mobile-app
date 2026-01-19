import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Button, Card, Input, Header } from '../../components';
import { api } from '../../lib/api';

interface PaymentMethod {
  id: string;
  type: 'card' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

interface OrderSummary {
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  serviceFee: number;
  discount?: number;
  total: number;
}

export function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const { cartId, type, resaleId, quantity, total } = route.params || {};

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { data: paymentMethods, isLoading: loadingPaymentMethods } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/payment-methods'],
  });

  const { data: orderSummary, isLoading: loadingOrder } = useQuery<OrderSummary>({
    queryKey: ['/api/checkout/summary', { cartId, type, resaleId }],
  });

  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0) {
      const defaultMethod = paymentMethods.find((m) => m.isDefault);
      setSelectedPaymentMethod(defaultMethod?.id || paymentMethods[0].id);
    }
  }, [paymentMethods]);

  const paymentMutation = useMutation({
    mutationFn: async (data: {
      paymentMethodId: string;
      email: string;
      name: string;
      cartId?: string;
      resaleId?: string;
      quantity?: number;
    }) => {
      return api.post('/api/checkout/process', data);
    },
    onSuccess: (data: any) => {
      setProcessing(false);
      navigation.navigate('CheckoutSuccess', {
        orderId: data.orderId,
        type: type || 'tickets',
      });
    },
    onError: (error: Error) => {
      setProcessing(false);
      Alert.alert('Errore Pagamento', error.message || 'Il pagamento non è andato a buon fine');
    },
  });

  const handlePayment = () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Errore', 'Seleziona un metodo di pagamento');
      return;
    }
    if (!email || !name) {
      Alert.alert('Errore', 'Inserisci email e nome');
      return;
    }
    if (!acceptTerms) {
      Alert.alert('Errore', 'Devi accettare i termini e condizioni');
      return;
    }

    setProcessing(true);
    paymentMutation.mutate({
      paymentMethodId: selectedPaymentMethod,
      email,
      name,
      cartId,
      resaleId,
      quantity,
    });
  };

  const handleAddPaymentMethod = () => {
    Alert.alert('Aggiungi Carta', 'Integrazione Stripe Card Form');
  };

  const getPaymentMethodIcon = (type: string, brand?: string) => {
    if (type === 'apple_pay') return 'logo-apple';
    if (type === 'google_pay') return 'logo-google';
    return 'card-outline';
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    if (method.type === 'apple_pay') return 'Apple Pay';
    if (method.type === 'google_pay') return 'Google Pay';
    return `${method.brand || 'Carta'} •••• ${method.last4}`;
  };

  const isLoading = loadingPaymentMethods || loadingOrder;

  const formMaxWidth = isTablet ? 600 : undefined;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Pagamento" showBack onBack={() => navigation.goBack()} testID="header-checkout" />
        <View style={styles.loadingContainer} testID="container-loading">
          <ActivityIndicator size="large" color={colors.primary} testID="indicator-loading" />
          <Text style={styles.loadingText} testID="text-loading">Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Pagamento" showBack onBack={() => navigation.goBack()} testID="header-checkout" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isLandscape ? 120 : 160 },
        ]}
        testID="scrollview-checkout"
      >
        <View style={[
          styles.content,
          isTablet && styles.contentTablet,
          { maxWidth: formMaxWidth, alignSelf: isTablet ? 'center' : undefined, width: isTablet ? '100%' : undefined },
        ]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle} testID="text-section-buyer">Informazioni Acquirente</Text>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="email@esempio.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />}
              testID="input-email"
            />
            <Input
              label="Nome Completo"
              value={name}
              onChangeText={setName}
              placeholder="Mario Rossi"
              leftIcon={<Ionicons name="person-outline" size={20} color={colors.mutedForeground} />}
              testID="input-name"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle} testID="text-section-payment">Metodo di Pagamento</Text>
            
            {(paymentMethods || []).map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentOption,
                  selectedPaymentMethod === method.id && styles.paymentOptionSelected,
                ]}
                onPress={() => setSelectedPaymentMethod(method.id)}
                testID={`button-payment-${method.id}`}
                accessibilityLabel={`Seleziona ${getPaymentMethodLabel(method)}`}
              >
                <View style={styles.paymentOptionIcon}>
                  <Ionicons
                    name={getPaymentMethodIcon(method.type, method.brand) as any}
                    size={24}
                    color={selectedPaymentMethod === method.id ? colors.primary : colors.foreground}
                  />
                </View>
                <View style={styles.paymentOptionInfo}>
                  <Text style={styles.paymentOptionLabel} testID={`text-payment-label-${method.id}`}>
                    {getPaymentMethodLabel(method)}
                  </Text>
                  {method.expiryMonth && method.expiryYear && (
                    <Text style={styles.paymentOptionExpiry} testID={`text-payment-expiry-${method.id}`}>
                      Scade {method.expiryMonth}/{method.expiryYear}
                    </Text>
                  )}
                </View>
                <View style={[
                  styles.radioButton,
                  selectedPaymentMethod === method.id && styles.radioButtonSelected,
                ]}>
                  {selectedPaymentMethod === method.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.addPaymentButton}
              onPress={handleAddPaymentMethod}
              testID="button-add-payment"
              accessibilityLabel="Aggiungi nuova carta"
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              <Text style={styles.addPaymentText}>Aggiungi nuova carta</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle} testID="text-section-summary">Riepilogo Ordine</Text>
            <Card style={styles.summaryCard} testID="card-order-summary">
              {(orderSummary?.items || []).map((item, index) => (
                <View key={index} style={styles.summaryItem} testID={`container-item-${index}`}>
                  <Text style={styles.summaryItemName} testID={`text-item-name-${index}`}>
                    {item.quantity}x {item.name}
                  </Text>
                  <Text style={styles.summaryItemPrice} testID={`text-item-price-${index}`}>
                    €{(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel} testID="text-subtotal-label">Subtotale</Text>
                <Text style={styles.summaryValue} testID="text-subtotal-value">
                  €{(orderSummary?.subtotal || 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel} testID="text-fee-label">Commissione servizio</Text>
                <Text style={styles.summaryValue} testID="text-fee-value">
                  €{(orderSummary?.serviceFee || 0).toFixed(2)}
                </Text>
              </View>
              {orderSummary?.discount && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel} testID="text-discount-label">Sconto</Text>
                  <Text style={styles.discountValue} testID="text-discount-value">
                    -€{orderSummary.discount.toFixed(2)}
                  </Text>
                </View>
              )}
            </Card>
          </View>

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAcceptTerms(!acceptTerms)}
            testID="button-accept-terms"
            accessibilityLabel="Accetta termini e condizioni"
            accessibilityState={{ checked: acceptTerms }}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && (
                <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />
              )}
            </View>
            <Text style={styles.termsText} testID="text-terms">
              Accetto i{' '}
              <Text style={styles.termsLink}>Termini e Condizioni</Text>
              {' '}e la{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          <Card style={styles.securityCard} testID="card-security">
            <Ionicons name="shield-checkmark" size={24} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle} testID="text-security-title">Pagamento Sicuro</Text>
              <Text style={styles.securityText} testID="text-security-description">
                I tuoi dati sono protetti con crittografia SSL
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, isTablet && styles.bottomBarTablet]} testID="container-bottom-bar">
        <View style={[
          styles.bottomBarContent,
          { maxWidth: formMaxWidth, alignSelf: isTablet ? 'center' : undefined, width: isTablet ? '100%' : undefined },
        ]}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel} testID="text-total-label">Totale da pagare</Text>
            <Text style={styles.totalAmount} testID="text-total-amount">
              €{(orderSummary?.total || total || 0).toFixed(2)}
            </Text>
          </View>
          <Button
            title={processing ? 'Elaborazione...' : 'Paga Ora'}
            onPress={handlePayment}
            loading={processing}
            disabled={!selectedPaymentMethod || !email || !name || !acceptTerms}
            testID="button-pay-now"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: spacing.lg,
  },
  contentTablet: {
    paddingHorizontal: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
  },
  paymentOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentOptionInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  paymentOptionLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  paymentOptionExpiry: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  addPaymentText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  summaryCard: {},
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryItemName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    flex: 1,
  },
  summaryItemPrice: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  discountValue: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  securityTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  securityText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  bottomBar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  bottomBarTablet: {
    paddingHorizontal: spacing.xl,
  },
  bottomBarContent: {
    width: '100%',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  totalAmount: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
});
