import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeOut, Layout } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { triggerHaptic } from '@/lib/haptics';

interface CartItem {
  id: string;
  eventName: string;
  eventDate: Date;
  ticketType: string;
  sectorName: string;
  quantity: number;
  unitPrice: number;
  reservedUntil: Date;
}

interface CartScreenProps {
  onBack: () => void;
  onCheckout: () => void;
  onContinueShopping: () => void;
}

export function CartScreen({ onBack, onCheckout, onContinueShopping }: CartScreenProps) {
  const [items, setItems] = useState<CartItem[]>([
    {
      id: '1',
      eventName: 'Saturday Night Fever',
      eventDate: new Date('2026-02-01T23:00:00'),
      ticketType: 'Ingresso + Drink',
      sectorName: 'Pista',
      quantity: 2,
      unitPrice: 35,
      reservedUntil: new Date(Date.now() + 10 * 60 * 1000),
    },
  ]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (until: Date) => {
    const diff = until.getTime() - Date.now();
    if (diff <= 0) return 'Scaduto';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const updateQuantity = (itemId: string, delta: number) => {
    triggerHaptic('light');
    setItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeItem = (itemId: string) => {
    triggerHaptic('medium');
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const fees = subtotal * 0.05;
  const total = subtotal + fees;

  return (
    <SafeArea style={styles.container}>
      <Header
        title="Carrello"
        showBack
        onBack={onBack}
        rightElement={
          items.length > 0 ? (
            <Badge variant="default">{items.length}</Badge>
          ) : undefined
        }
        testID="header-cart"
      />

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bag-outline" size={80} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Carrello vuoto</Text>
          <Text style={styles.emptyText}>
            Aggiungi biglietti per i tuoi eventi preferiti
          </Text>
          <Button
            variant="golden"
            onPress={onContinueShopping}
            style={styles.emptyButton}
            testID="button-continue-shopping"
          >
            Esplora Eventi
          </Button>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.timerBanner}>
              <Ionicons name="time-outline" size={20} color={colors.warning} />
              <Text style={styles.timerText}>
                I biglietti sono riservati per <Text style={styles.timerValue}>{getTimeRemaining(items[0].reservedUntil)}</Text>
              </Text>
            </View>

            {items.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 100)}
                exiting={FadeOut}
                layout={Layout.springify()}
              >
                <Card style={styles.itemCard} testID={`cart-item-${item.id}`}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemEventName}>{item.eventName}</Text>
                      <View style={styles.itemMeta}>
                        <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                        <Text style={styles.itemMetaText}>
                          {formatDate(item.eventDate)} • {formatTime(item.eventDate)}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => removeItem(item.id)}
                      style={styles.removeButton}
                      testID={`button-remove-${item.id}`}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                    </Pressable>
                  </View>

                  <View style={styles.itemDivider} />

                  <View style={styles.itemDetails}>
                    <View style={styles.itemDetail}>
                      <Text style={styles.itemDetailLabel}>Tipologia</Text>
                      <Text style={styles.itemDetailValue}>{item.ticketType}</Text>
                    </View>
                    <View style={styles.itemDetail}>
                      <Text style={styles.itemDetailLabel}>Settore</Text>
                      <Text style={styles.itemDetailValue}>{item.sectorName}</Text>
                    </View>
                    <View style={styles.itemDetail}>
                      <Text style={styles.itemDetailLabel}>Prezzo</Text>
                      <Text style={styles.itemDetailValue}>€{item.unitPrice}</Text>
                    </View>
                  </View>

                  <View style={styles.itemFooter}>
                    <View style={styles.quantityControl}>
                      <Pressable
                        onPress={() => updateQuantity(item.id, -1)}
                        style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
                        disabled={item.quantity <= 1}
                      >
                        <Ionicons name="remove" size={18} color={item.quantity <= 1 ? colors.mutedForeground : colors.foreground} />
                      </Pressable>
                      <Text style={styles.quantityValue}>{item.quantity}</Text>
                      <Pressable
                        onPress={() => updateQuantity(item.id, 1)}
                        style={styles.quantityButton}
                      >
                        <Ionicons name="add" size={18} color={colors.foreground} />
                      </Pressable>
                    </View>
                    <Text style={styles.itemTotal}>
                      €{(item.unitPrice * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            ))}

            <Card style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Riepilogo Ordine</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotale</Text>
                <Text style={styles.summaryValue}>€{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Commissioni servizio</Text>
                <Text style={styles.summaryValue}>€{fees.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Totale</Text>
                <Text style={styles.totalValue}>€{total.toFixed(2)}</Text>
              </View>
            </Card>

            <View style={styles.securityInfo}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
              <Text style={styles.securityText}>
                Pagamento sicuro con crittografia SSL
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerTotal}>
              <Text style={styles.footerTotalLabel}>Totale</Text>
              <Text style={styles.footerTotalValue}>€{total.toFixed(2)}</Text>
            </View>
            <Button
              variant="golden"
              size="lg"
              onPress={onCheckout}
              style={styles.checkoutButton}
              testID="button-checkout"
            >
              Procedi al Pagamento
            </Button>
          </View>
        </>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
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
    color: colors.foreground,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    paddingHorizontal: spacing.xxl,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.warning}15`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.warning}30`,
  },
  timerText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  timerValue: {
    fontWeight: '700',
    color: colors.warning,
  },
  itemCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
  },
  itemEventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemMetaText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  removeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  itemDetail: {
    alignItems: 'center',
  },
  itemDetailLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  itemDetailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.foreground,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  quantityButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    minWidth: 32,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryCard: {
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  summaryTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
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
    color: colors.mutedForeground,
  },
  summaryValue: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  totalValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  securityText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  footerTotalLabel: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
  },
  footerTotalValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
  },
  checkoutButton: {
    width: '100%',
  },
});

export default CartScreen;
