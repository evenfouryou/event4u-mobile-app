import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  available: number;
  description?: string;
}

interface CartItem {
  ticketType: TicketType;
  quantity: number;
}

type PaymentMethod = 'cash' | 'card' | 'mixed';

export function CassaBigliettiScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/cashier/events'],
    queryFn: () =>
      api.get<Event[]>('/api/cashier/events').catch(() => [
        {
          id: '1',
          name: 'Notte Italiana',
          date: '2025-01-18',
          time: '23:00',
          venue: 'Club Paradiso',
        },
        {
          id: '2',
          name: 'Friday Vibes',
          date: '2025-01-17',
          time: '22:30',
          venue: 'Discoteca Luna',
        },
      ]),
  });

  const { data: ticketTypes = [] } = useQuery<TicketType[]>({
    queryKey: ['/api/cashier/events', selectedEvent?.id, 'tickets'],
    queryFn: () =>
      api.get<TicketType[]>(`/api/cashier/events/${selectedEvent?.id}/tickets`).catch(() => [
        { id: '1', name: 'Ingresso Standard', price: 15.0, available: 234, description: 'Ingresso base' },
        { id: '2', name: 'Ingresso VIP', price: 30.0, available: 45, description: 'Include drink' },
        { id: '3', name: 'Tavolo (4 persone)', price: 150.0, available: 12, description: 'Tavolo riservato + bottiglia' },
        { id: '4', name: 'Tavolo VIP (6 persone)', price: 300.0, available: 5, description: 'Area VIP + 2 bottiglie' },
      ]),
    enabled: !!selectedEvent,
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: { eventId: string; items: CartItem[]; paymentMethod: PaymentMethod }) =>
      api.post('/api/cashier/checkout', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cashier'] });
      setCart([]);
      setShowCheckout(false);
      Alert.alert('Successo', 'Vendita completata con successo');
    },
  });

  const addToCart = (ticketType: TicketType) => {
    const existingItem = cart.find((item) => item.ticketType.id === ticketType.id);
    if (existingItem) {
      if (existingItem.quantity < ticketType.available) {
        setCart(
          cart.map((item) =>
            item.ticketType.id === ticketType.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        );
      }
    } else {
      setCart([...cart, { ticketType, quantity: 1 }]);
    }
  };

  const removeFromCart = (ticketTypeId: string) => {
    const existingItem = cart.find((item) => item.ticketType.id === ticketTypeId);
    if (existingItem && existingItem.quantity > 1) {
      setCart(
        cart.map((item) =>
          item.ticketType.id === ticketTypeId ? { ...item, quantity: item.quantity - 1 } : item
        )
      );
    } else {
      setCart(cart.filter((item) => item.ticketType.id !== ticketTypeId));
    }
  };

  const getCartQuantity = (ticketTypeId: string) => {
    return cart.find((item) => item.ticketType.id === ticketTypeId)?.quantity || 0;
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.ticketType.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (!selectedEvent) return;
    checkoutMutation.mutate({
      eventId: selectedEvent.id,
      items: cart,
      paymentMethod,
    });
  };

  const formatCurrency = (amount: number) => {
    return `€ ${amount.toFixed(2).replace('.', ',')}`;
  };

  return (
    <View style={styles.container}>
      <Header title="Vendita Biglietti" showBack />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seleziona Evento</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventsScroll}>
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => {
                  setSelectedEvent(event);
                  setCart([]);
                }}
                activeOpacity={0.8}
              >
                <Card
                  variant={selectedEvent?.id === event.id ? 'elevated' : 'glass'}
                  style={[
                    styles.eventCard,
                    selectedEvent?.id === event.id && styles.eventCardSelected,
                  ]}
                >
                  <Text style={styles.eventName}>{event.name}</Text>
                  <View style={styles.eventMeta}>
                    <Ionicons name="calendar" size={14} color={colors.accent} />
                    <Text style={styles.eventMetaText}>
                      {new Date(event.date).toLocaleDateString('it-IT', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                  <View style={styles.eventMeta}>
                    <Ionicons name="location" size={14} color={colors.mutedForeground} />
                    <Text style={styles.eventVenue}>{event.venue}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedEvent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biglietti Disponibili</Text>
            <View style={styles.ticketsList}>
              {ticketTypes.map((ticket) => {
                const quantity = getCartQuantity(ticket.id);
                return (
                  <Card key={ticket.id} variant="glass" style={styles.ticketCard}>
                    <View style={styles.ticketInfo}>
                      <Text style={styles.ticketName}>{ticket.name}</Text>
                      {ticket.description && (
                        <Text style={styles.ticketDescription}>{ticket.description}</Text>
                      )}
                      <View style={styles.ticketMeta}>
                        <Text style={styles.ticketPrice}>{formatCurrency(ticket.price)}</Text>
                        <Text style={styles.ticketAvailable}>{ticket.available} disponibili</Text>
                      </View>
                    </View>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={[styles.quantityButton, quantity === 0 && styles.quantityButtonDisabled]}
                        onPress={() => removeFromCart(ticket.id)}
                        disabled={quantity === 0}
                        data-testid={`button-remove-${ticket.id}`}
                      >
                        <Ionicons
                          name="remove"
                          size={20}
                          color={quantity === 0 ? colors.mutedForeground : colors.foreground}
                        />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{quantity}</Text>
                      <TouchableOpacity
                        style={[
                          styles.quantityButton,
                          styles.quantityButtonAdd,
                          quantity >= ticket.available && styles.quantityButtonDisabled,
                        ]}
                        onPress={() => addToCart(ticket)}
                        disabled={quantity >= ticket.available}
                        data-testid={`button-add-${ticket.id}`}
                      >
                        <Ionicons
                          name="add"
                          size={20}
                          color={quantity >= ticket.available ? colors.mutedForeground : colors.primaryForeground}
                        />
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {cart.length > 0 && (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.cartInfo}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
            <Text style={styles.cartTotal}>{formatCurrency(cartTotal)}</Text>
          </View>
          <Button
            title="Procedi al Pagamento"
            variant="primary"
            onPress={() => setShowCheckout(true)}
            style={styles.checkoutButton}
          />
        </View>
      )}

      <Modal visible={showCheckout} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Riepilogo Ordine</Text>
              <TouchableOpacity onPress={() => setShowCheckout(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Card variant="glass" style={styles.orderCard}>
                <Text style={styles.orderEventName}>{selectedEvent?.name}</Text>
                {cart.map((item) => (
                  <View key={item.ticketType.id} style={styles.orderItem}>
                    <View style={styles.orderItemInfo}>
                      <Text style={styles.orderItemName}>{item.ticketType.name}</Text>
                      <Text style={styles.orderItemQuantity}>x{item.quantity}</Text>
                    </View>
                    <Text style={styles.orderItemPrice}>
                      {formatCurrency(item.ticketType.price * item.quantity)}
                    </Text>
                  </View>
                ))}
                <View style={styles.orderDivider} />
                <View style={styles.orderTotal}>
                  <Text style={styles.orderTotalLabel}>Totale</Text>
                  <Text style={styles.orderTotalValue}>{formatCurrency(cartTotal)}</Text>
                </View>
              </Card>

              <View style={styles.paymentSection}>
                <Text style={styles.paymentTitle}>Metodo di Pagamento</Text>
                <View style={styles.paymentOptions}>
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'cash' && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod('cash')}
                    data-testid="payment-cash"
                  >
                    <Ionicons
                      name="cash"
                      size={24}
                      color={paymentMethod === 'cash' ? colors.primary : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.paymentOptionText,
                        paymentMethod === 'cash' && styles.paymentOptionTextActive,
                      ]}
                    >
                      Contanti
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'card' && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod('card')}
                    data-testid="payment-card"
                  >
                    <Ionicons
                      name="card"
                      size={24}
                      color={paymentMethod === 'card' ? colors.primary : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.paymentOptionText,
                        paymentMethod === 'card' && styles.paymentOptionTextActive,
                      ]}
                    >
                      Carta
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.paymentOption, paymentMethod === 'mixed' && styles.paymentOptionActive]}
                    onPress={() => setPaymentMethod('mixed')}
                    data-testid="payment-mixed"
                  >
                    <Ionicons
                      name="swap-horizontal"
                      size={24}
                      color={paymentMethod === 'mixed' ? colors.primary : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.paymentOptionText,
                        paymentMethod === 'mixed' && styles.paymentOptionTextActive,
                      ]}
                    >
                      Misto
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button title="Annulla" variant="outline" onPress={() => setShowCheckout(false)} />
              <Button
                title={`Paga ${formatCurrency(cartTotal)}`}
                variant="primary"
                onPress={handleCheckout}
                loading={checkoutMutation.isPending}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  eventsScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  eventCard: {
    width: 180,
    padding: spacing.lg,
    marginRight: spacing.md,
  },
  eventCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  eventMetaText: {
    color: colors.accent,
    fontSize: fontSize.sm,
  },
  eventVenue: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  ticketsList: {
    gap: spacing.md,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  ticketDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  ticketPrice: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  ticketAvailable: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonAdd: {
    backgroundColor: colors.primary,
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    minWidth: 30,
    textAlign: 'center',
  },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cartBadge: {
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  cartTotal: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  checkoutButton: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  modalScroll: {
    maxHeight: 400,
  },
  orderCard: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  orderEventName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.lg,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  orderItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  orderItemName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  orderItemQuantity: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  orderItemPrice: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  orderDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.md,
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotalLabel: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  orderTotalValue: {
    color: colors.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  paymentSection: {
    marginBottom: spacing.xl,
  },
  paymentTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  paymentOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  paymentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  paymentOptionText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  paymentOptionTextActive: {
    color: colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
