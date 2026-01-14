import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
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
  const insets = useSafeAreaInsets();
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

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Pagamento" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Pagamento" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informazioni Acquirente</Text>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="email@esempio.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />}
            />
            <Input
              label="Nome Completo"
              value={name}
              onChangeText={setName}
              placeholder="Mario Rossi"
              leftIcon={<Ionicons name="person-outline" size={20} color={colors.mutedForeground} />}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metodo di Pagamento</Text>
            
            {(paymentMethods || []).map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentOption,
                  selectedPaymentMethod === method.id && styles.paymentOptionSelected,
                ]}
                onPress={() => setSelectedPaymentMethod(method.id)}
                data-testid={`button-payment-${method.id}`}
              >
                <View style={styles.paymentOptionIcon}>
                  <Ionicons
                    name={getPaymentMethodIcon(method.type, method.brand) as any}
                    size={24}
                    color={selectedPaymentMethod === method.id ? colors.primary : colors.foreground}
                  />
                </View>
                <View style={styles.paymentOptionInfo}>
                  <Text style={styles.paymentOptionLabel}>
                    {getPaymentMethodLabel(method)}
                  </Text>
                  {method.expiryMonth && method.expiryYear && (
                    <Text style={styles.paymentOptionExpiry}>
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
              data-testid="button-add-payment"
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              <Text style={styles.addPaymentText}>Aggiungi nuova carta</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Riepilogo Ordine</Text>
            <Card style={styles.summaryCard}>
              {(orderSummary?.items || []).map((item, index) => (
                <View key={index} style={styles.summaryItem}>
                  <Text style={styles.summaryItemName}>
                    {item.quantity}x {item.name}
                  </Text>
                  <Text style={styles.summaryItemPrice}>
                    €{(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotale</Text>
                <Text style={styles.summaryValue}>
                  €{(orderSummary?.subtotal || 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Commissione servizio</Text>
                <Text style={styles.summaryValue}>
                  €{(orderSummary?.serviceFee || 0).toFixed(2)}
                </Text>
              </View>
              {orderSummary?.discount && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Sconto</Text>
                  <Text style={styles.discountValue}>
                    -€{orderSummary.discount.toFixed(2)}
                  </Text>
                </View>
              )}
            </Card>
          </View>

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAcceptTerms(!acceptTerms)}
            data-testid="button-accept-terms"
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && (
                <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />
              )}
            </View>
            <Text style={styles.termsText}>
              Accetto i{' '}
              <Text style={styles.termsLink}>Termini e Condizioni</Text>
              {' '}e la{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          <Card style={styles.securityCard}>
            <Ionicons name="shield-checkmark" size={24} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Pagamento Sicuro</Text>
              <Text style={styles.securityText}>
                I tuoi dati sono protetti con crittografia SSL
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Totale da pagare</Text>
          <Text style={styles.totalAmount}>
            €{(orderSummary?.total || total || 0).toFixed(2)}
          </Text>
        </View>
        <Button
          title={processing ? 'Elaborazione...' : 'Paga Ora'}
          onPress={handlePayment}
          loading={processing}
          disabled={!selectedPaymentMethod || !email || !name || !acceptTerms}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
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
