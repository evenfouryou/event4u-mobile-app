import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Button, Card, Header } from '../../components';
import { api } from '../../lib/api';

interface CartItem {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventImageUrl?: string;
  ticketTypeId: string;
  ticketTypeName: string;
  price: number;
  quantity: number;
}

interface Cart {
  items: CartItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
}

export function CartScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery<Cart>({
    queryKey: ['/api/cart'],
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async (data: { itemId: string; quantity: number }) => {
      return api.put('/api/cart/items/' + data.itemId, { quantity: data.quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return api.delete('/api/cart/items/' + itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
  });

  const handleQuantityChange = (itemId: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      handleRemoveItem(itemId);
    } else {
      updateQuantityMutation.mutate({ itemId, quantity: newQty });
    }
  };

  const handleRemoveItem = (itemId: string) => {
    Alert.alert(
      'Rimuovi Biglietto',
      'Sei sicuro di voler rimuovere questo biglietto dal carrello?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: () => removeItemMutation.mutate(itemId),
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) return;
    navigation.navigate('Checkout', { cartId: 'current' });
  };

  const handleContinueShopping = () => {
    navigation.navigate('Events');
  };

  const groupedItems = (cart?.items || []).reduce((acc, item) => {
    if (!acc[item.eventId]) {
      acc[item.eventId] = {
        eventId: item.eventId,
        eventTitle: item.eventTitle,
        eventDate: item.eventDate,
        eventTime: item.eventTime,
        eventImageUrl: item.eventImageUrl,
        tickets: [],
      };
    }
    acc[item.eventId].tickets.push(item);
    return acc;
  }, {} as Record<string, { eventId: string; eventTitle: string; eventDate: string; eventTime: string; eventImageUrl?: string; tickets: CartItem[] }>);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Carrello" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          {[1, 2].map((i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      </View>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <View style={styles.container}>
      <Header
        title="Carrello"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          !isEmpty && (
            <TouchableOpacity data-testid="button-clear-cart">
              <Ionicons name="trash-outline" size={22} color={colors.destructive} />
            </TouchableOpacity>
          )
        }
      />

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cart-outline" size={64} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>Il tuo carrello è vuoto</Text>
          <Text style={styles.emptyText}>
            Esplora gli eventi e aggiungi biglietti al carrello
          </Text>
          <Button
            title="Esplora Eventi"
            onPress={handleContinueShopping}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 180 }}
          >
            <View style={styles.content}>
              {Object.values(groupedItems).map((group) => (
                <Card key={group.eventId} style={styles.eventGroup}>
                  <View style={styles.eventHeader}>
                    <Image
                      source={{ uri: group.eventImageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400' }}
                      style={styles.eventImage}
                    />
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {group.eventTitle}
                      </Text>
                      <View style={styles.eventDate}>
                        <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
                        <Text style={styles.eventDateText}>
                          {group.eventDate} • {group.eventTime}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {group.tickets.map((ticket) => (
                    <View key={ticket.id} style={styles.ticketRow}>
                      <View style={styles.ticketInfo}>
                        <Text style={styles.ticketName}>{ticket.ticketTypeName}</Text>
                        <Text style={styles.ticketPrice}>€{ticket.price.toFixed(2)}</Text>
                      </View>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => handleQuantityChange(ticket.id, ticket.quantity, -1)}
                          data-testid={`button-decrease-${ticket.id}`}
                        >
                          <Ionicons name="remove" size={18} color={colors.foreground} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{ticket.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => handleQuantityChange(ticket.id, ticket.quantity, 1)}
                          data-testid={`button-increase-${ticket.id}`}
                        >
                          <Ionicons name="add" size={18} color={colors.foreground} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.ticketSubtotal}>
                        €{(ticket.price * ticket.quantity).toFixed(2)}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveItem(ticket.id)}
                        data-testid={`button-remove-${ticket.id}`}
                      >
                        <Ionicons name="close" size={18} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </Card>
              ))}

              <Card style={styles.promoCard}>
                <View style={styles.promoRow}>
                  <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
                  <Text style={styles.promoText}>Hai un codice sconto?</Text>
                  <TouchableOpacity data-testid="button-add-promo">
                    <Text style={styles.promoButton}>Applica</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotale</Text>
                <Text style={styles.summaryValue}>€{cart.subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Commissione servizio</Text>
                <Text style={styles.summaryValue}>€{cart.serviceFee.toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Totale</Text>
                <Text style={styles.totalValue}>€{cart.total.toFixed(2)}</Text>
              </View>
            </View>
            <Button
              title="Procedi al Pagamento"
              onPress={handleCheckout}
              loading={updateQuantityMutation.isPending || removeItemMutation.isPending}
            />
          </View>
        </>
      )}
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
    gap: spacing.md,
  },
  loadingContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  skeletonCard: {
    height: 150,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  eventGroup: {
    padding: 0,
    overflow: 'hidden',
  },
  eventHeader: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  eventInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  eventTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  eventDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  eventDateText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  ticketPrice: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    minWidth: 24,
    textAlign: 'center',
  },
  ticketSubtotal: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginRight: spacing.sm,
  },
  removeButton: {
    padding: spacing.xs,
  },
  promoCard: {},
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  promoText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    flex: 1,
  },
  promoButton: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
  summaryContainer: {
    marginBottom: spacing.md,
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
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  totalValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});
