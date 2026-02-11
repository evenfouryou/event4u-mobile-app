import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { triggerHaptic } from '@/lib/haptics';
import { useCart } from '@/navigation/AppNavigator';

interface CartScreenProps {
  onBack: () => void;
  onCheckout: () => void;
  onContinueShopping: () => void;
}

export function CartScreen({ onBack, onCheckout, onContinueShopping }: CartScreenProps) {
  const { cartItems: items, removeFromCart, updateQuantity: updateCartQuantity } = useCart();

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    triggerHaptic('light');
    updateCartQuantity(index, delta);
  };

  const handleRemoveItem = (index: number) => {
    triggerHaptic('medium');
    removeFromCart(index);
  };

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const fees = subtotal * 0.05;
  const total = subtotal + fees;

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
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
          <Ionicons name="bag-outline" size={80} color={staticColors.mutedForeground} />
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
            {items.map((item, index) => (
              <View key={`${item.ticketedEventId}-${item.sectorId}-${index}`}>
                <Card style={styles.itemCard} testID={`cart-item-${index}`}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemEventName}>{item.eventName}</Text>
                      <View style={styles.itemMeta}>
                        <Ionicons name="calendar-outline" size={14} color={staticColors.mutedForeground} />
                        <Text style={styles.itemMetaText}>
                          {formatDate(item.eventDate)} • {formatTime(item.eventDate)}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handleRemoveItem(index)}
                      style={styles.removeButton}
                      testID={`button-remove-${index}`}
                    >
                      <Ionicons name="trash-outline" size={20} color={staticColors.destructive} />
                    </Pressable>
                  </View>

                  <View style={styles.itemDivider} />

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

                  <View style={styles.itemFooter}>
                    <View style={styles.quantityControl}>
                      <Pressable
                        onPress={() => handleUpdateQuantity(index, -1)}
                        style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
                        disabled={item.quantity <= 1}
                      >
                        <Ionicons name="remove" size={18} color={item.quantity <= 1 ? staticColors.mutedForeground : staticColors.foreground} />
                      </Pressable>
                      <Text style={styles.quantityValue}>{item.quantity}</Text>
                      <Pressable
                        onPress={() => handleUpdateQuantity(index, 1)}
                        style={styles.quantityButton}
                      >
                        <Ionicons name="add" size={18} color={staticColors.foreground} />
                      </Pressable>
                    </View>
                    <Text style={styles.itemTotal}>
                      €{(item.unitPrice * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                </Card>
              </View>
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
              <Ionicons name="shield-checkmark" size={20} color={staticColors.success} />
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
    backgroundColor: staticColors.background,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
  },
  itemEventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  removeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDivider: {
    height: 1,
    backgroundColor: staticColors.border,
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
    color: staticColors.mutedForeground,
    marginBottom: 2,
  },
  itemDetailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.secondary,
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
    color: staticColors.foreground,
    minWidth: 32,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  summaryCard: {
    padding: spacing.lg,
    marginTop: spacing.md,
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
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  securityText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: staticColors.card,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
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
    color: staticColors.mutedForeground,
  },
  footerTotalValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  checkoutButton: {
    width: '100%',
  },
});

export default CartScreen;
