import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Input, Header } from '../../components';
import { api } from '../../lib/api';

const CASHIER_ACCENT = colors.cashier;
const CASHIER_ACCENT_FOREGROUND = colors.cashierForeground;
const TABLET_BREAKPOINT = 768;
const CONTENT_MAX_WIDTH = 600;

interface TicketType {
  id: string;
  name: string;
  price: number;
  description?: string;
  icon: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const TICKET_TYPES: TicketType[] = [
  {
    id: '1',
    name: 'VIP',
    price: 50,
    description: 'Accesso area VIP',
    icon: 'star',
  },
  {
    id: '2',
    name: 'Standard',
    price: 30,
    description: 'Accesso generale',
    icon: 'ticket',
  },
  {
    id: '3',
    name: 'Early Bird',
    price: 25,
    description: 'Sconto early',
    icon: 'sunny',
  },
  {
    id: '4',
    name: 'Gruppo',
    price: 120,
    description: 'Pacchetto 4 biglietti',
    icon: 'people',
  },
];

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: '1',
    name: 'Contanti',
    icon: 'cash',
    color: colors.success,
  },
  {
    id: '2',
    name: 'Carta',
    icon: 'card',
    color: colors.primary,
  },
  {
    id: '3',
    name: 'Bonifico',
    icon: 'swap-horizontal',
    color: colors.accent,
  },
  {
    id: '4',
    name: 'QR Code',
    icon: 'qr-code',
    color: colors.warning,
  },
];

export function CashierTicketScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= TABLET_BREAKPOINT;

  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedTicketData = TICKET_TYPES.find((t) => t.id === selectedTicket);
  const selectedPaymentData = PAYMENT_METHODS.find((p) => p.id === selectedPayment);
  const totalPrice = selectedTicketData ? selectedTicketData.price * quantity : 0;

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity > 0 && newQuantity <= 20) {
      setQuantity(newQuantity);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!selectedTicket || !selectedPayment) {
      return;
    }

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setShowConfirmation(false);

    navigation.navigate('CashierSuccess', {
      ticketType: selectedTicketData?.name,
      quantity,
      totalPrice,
      paymentMethod: selectedPaymentData?.name,
    });

    setSelectedTicket(null);
    setQuantity(1);
    setCustomerName('');
    setCustomerEmail('');
    setSelectedPayment(null);
  };

  const canProceed = selectedTicket && selectedPayment && quantity > 0;
  const numColumns = isLandscape || isTablet ? 2 : 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Vendi Biglietto"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
        testID="scroll-view"
      >
        <View style={[styles.contentWrapper, isTablet && { maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', width: '100%' }]}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>1. Seleziona Tipo Biglietto</Text>
            <FlatList
              data={TICKET_TYPES}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.ticketTypeButton,
                    selectedTicket === item.id && styles.ticketTypeButtonSelected,
                  ]}
                  onPress={() => setSelectedTicket(item.id)}
                  activeOpacity={0.7}
                  testID={`button-ticket-type-${item.id}`}
                >
                  <View
                    style={[
                      styles.ticketTypeIcon,
                      selectedTicket === item.id && styles.ticketTypeIconSelected,
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={28}
                      color={selectedTicket === item.id ? CASHIER_ACCENT_FOREGROUND : CASHIER_ACCENT}
                    />
                  </View>
                  <View style={styles.ticketTypeContent}>
                    <Text style={styles.ticketTypeName}>{item.name}</Text>
                    {item.description && (
                      <Text style={styles.ticketTypeDescription}>{item.description}</Text>
                    )}
                  </View>
                  <Text style={styles.ticketTypePrice} testID={`text-ticket-price-${item.id}`}>
                    € {item.price.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              testID="list-ticket-types"
            />
          </View>

          {selectedTicket && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>2. Quantità</Text>
              <Card style={styles.quantityCard} testID="card-quantity">
                <View style={styles.quantitySelector}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    testID="button-quantity-decrease"
                  >
                    <Ionicons
                      name="remove"
                      size={24}
                      color={quantity <= 1 ? colors.mutedForeground : CASHIER_ACCENT}
                    />
                  </TouchableOpacity>
                  <Text style={styles.quantityValue} testID="text-quantity">{quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(1)}
                    disabled={quantity >= 20}
                    testID="button-quantity-increase"
                  >
                    <Ionicons
                      name="add"
                      size={24}
                      color={quantity >= 20 ? colors.mutedForeground : CASHIER_ACCENT}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>Subtotale</Text>
                  <Text style={styles.subtotalValue} testID="text-subtotal">€ {totalPrice.toFixed(2)}</Text>
                </View>
              </Card>
            </View>
          )}

          {selectedTicket && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>3. Dati Cliente (Opzionale)</Text>
              <Input
                label="Nome"
                placeholder="Nome cliente"
                value={customerName}
                onChangeText={setCustomerName}
                containerStyle={styles.inputContainer}
                testID="input-customer-name"
              />
              <Input
                label="Email"
                placeholder="Email cliente"
                value={customerEmail}
                onChangeText={setCustomerEmail}
                keyboardType="email-address"
                containerStyle={styles.inputContainer}
                testID="input-customer-email"
              />
            </View>
          )}

          {selectedTicket && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>4. Metodo Pagamento</Text>
              <FlatList
                data={PAYMENT_METHODS}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodButton,
                      selectedPayment === item.id && styles.paymentMethodButtonSelected,
                    ]}
                    onPress={() => setSelectedPayment(item.id)}
                    activeOpacity={0.7}
                    testID={`button-payment-${item.id}`}
                  >
                    <View
                      style={[
                        styles.paymentIcon,
                        selectedPayment === item.id && { backgroundColor: item.color },
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={24}
                        color={
                          selectedPayment === item.id
                            ? colors.primaryForeground
                            : item.color
                        }
                      />
                    </View>
                    <Text style={styles.paymentName}>{item.name}</Text>
                    {selectedPayment === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color={item.color} />
                    )}
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                numColumns={2}
                columnWrapperStyle={styles.paymentGrid}
                testID="list-payment-methods"
              />
            </View>
          )}

          {selectedTicket && (
            <View style={styles.section}>
              <Card style={styles.summaryCard} variant="elevated" testID="card-summary">
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{selectedTicketData?.name}</Text>
                  <Text style={styles.summaryValue}>
                    {quantity} × € {selectedTicketData?.price.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>TOTALE</Text>
                  <Text style={styles.totalValue} testID="text-total">€ {totalPrice.toFixed(2)}</Text>
                </View>
              </Card>
            </View>
          )}
        </View>
      </ScrollView>

      {selectedTicket && (
        <View style={styles.fixedBottom}>
          <Button
            title={`Conferma • € ${totalPrice.toFixed(2)}`}
            variant="primary"
            size="lg"
            onPress={() => setShowConfirmation(true)}
            disabled={!canProceed || isProcessing}
            loading={isProcessing}
            style={styles.confirmButton}
            textStyle={styles.confirmButtonText}
            testID="button-confirm-purchase"
          />
        </View>
      )}

      <Modal
        visible={showConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={[styles.confirmationCard, isTablet && { maxWidth: CONTENT_MAX_WIDTH }]} testID="modal-confirmation">
            <View style={styles.confirmationHeader}>
              <Text style={styles.confirmationTitle}>Conferma Acquisto</Text>
              <TouchableOpacity
                onPress={() => setShowConfirmation(false)}
                testID="button-close-modal"
              >
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.confirmationContent}>
              <View style={styles.confirmationItem}>
                <Text style={styles.confirmationItemLabel}>Biglietti</Text>
                <Text style={styles.confirmationItemValue} testID="text-confirmation-tickets">
                  {quantity} × {selectedTicketData?.name}
                </Text>
              </View>

              <View style={styles.confirmationItem}>
                <Text style={styles.confirmationItemLabel}>Prezzo Unitario</Text>
                <Text style={styles.confirmationItemValue} testID="text-confirmation-unit-price">
                  € {selectedTicketData?.price.toFixed(2)}
                </Text>
              </View>

              {customerName && (
                <View style={styles.confirmationItem}>
                  <Text style={styles.confirmationItemLabel}>Cliente</Text>
                  <Text style={styles.confirmationItemValue} testID="text-confirmation-customer">
                    {customerName}
                  </Text>
                </View>
              )}

              <View style={styles.confirmationItem}>
                <Text style={styles.confirmationItemLabel}>Metodo Pagamento</Text>
                <Text style={styles.confirmationItemValue} testID="text-confirmation-payment">
                  {selectedPaymentData?.name}
                </Text>
              </View>

              <View style={styles.confirmationDivider} />

              <View style={styles.confirmationTotal}>
                <Text style={styles.confirmationTotalLabel}>TOTALE</Text>
                <Text style={styles.confirmationTotalValue} testID="text-confirmation-total">
                  € {totalPrice.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.confirmationActions}>
              <Button
                title="Annulla"
                variant="outline"
                size="lg"
                onPress={() => setShowConfirmation(false)}
                disabled={isProcessing}
                style={styles.cancelButton}
                testID="button-cancel-purchase"
              />
              <Button
                title={isProcessing ? 'Elaborazione...' : 'Conferma'}
                variant="primary"
                size="lg"
                onPress={handleConfirmPurchase}
                loading={isProcessing}
                style={styles.confirmActionButton}
                testID="button-submit-purchase"
              />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentTablet: {
    paddingHorizontal: spacing.xl,
  },
  contentWrapper: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  ticketTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  ticketTypeButtonSelected: {
    borderColor: CASHIER_ACCENT,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  ticketTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  ticketTypeIconSelected: {
    backgroundColor: CASHIER_ACCENT,
  },
  ticketTypeContent: {
    flex: 1,
  },
  ticketTypeName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  ticketTypeDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  ticketTypePrice: {
    color: CASHIER_ACCENT,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  quantityCard: {
    paddingVertical: spacing.lg,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  quantityButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    color: colors.foreground,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subtotalLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  subtotalValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  paymentGrid: {
    gap: spacing.md,
  },
  paymentMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  paymentMethodButtonSelected: {
    borderColor: CASHIER_ACCENT,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  paymentName: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  summaryCard: {
    paddingVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  totalValue: {
    color: CASHIER_ACCENT,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  fixedBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmButton: {
    minHeight: 56,
  },
  confirmButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  confirmationCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  confirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  confirmationTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  confirmationContent: {
    marginBottom: spacing.lg,
  },
  confirmationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  confirmationItemLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  confirmationItemValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  confirmationDivider: {
    height: 2,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  confirmationTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  confirmationTotalLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  confirmationTotalValue: {
    color: CASHIER_ACCENT,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
  },
  confirmActionButton: {
    flex: 1,
  },
});
