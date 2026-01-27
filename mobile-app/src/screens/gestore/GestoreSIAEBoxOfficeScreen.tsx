import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAEBoxOfficeData } from '@/lib/api';

type PaymentMethod = 'contanti' | 'carta' | 'altro';

interface CartItem {
  ticketTypeId: string;
  ticketTypeName: string;
  price: number;
  quantity: number;
}

interface GestoreSIAEBoxOfficeScreenProps {
  onBack: () => void;
}

export function GestoreSIAEBoxOfficeScreen({ onBack }: GestoreSIAEBoxOfficeScreenProps) {
  const { colors, gradients } = useTheme();
  const [data, setData] = useState<SIAEBoxOfficeData | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('contanti');
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const boxOfficeData = await api.getSIAEBoxOfficeData();
      setData(boxOfficeData);
    } catch (error) {
      console.error('Error loading box office data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddToCart = (ticketType: { id: string; name: string; price: number }) => {
    triggerHaptic('light');
    const existingItem = cart.find(item => item.ticketTypeId === ticketType.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.ticketTypeId === ticketType.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        ticketTypeId: ticketType.id,
        ticketTypeName: ticketType.name,
        price: ticketType.price,
        quantity: 1,
      }]);
    }
  };

  const handleRemoveFromCart = (ticketTypeId: string) => {
    triggerHaptic('light');
    const existingItem = cart.find(item => item.ticketTypeId === ticketTypeId);
    if (existingItem && existingItem.quantity > 1) {
      setCart(cart.map(item =>
        item.ticketTypeId === ticketTypeId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setCart(cart.filter(item => item.ticketTypeId !== ticketTypeId));
    }
  };

  const handleClearCart = () => {
    triggerHaptic('medium');
    setCart([]);
  };

  const handleProcessSale = async () => {
    if (cart.length === 0 || !data) return;

    try {
      setIsProcessing(true);
      triggerHaptic('medium');
      await api.processSIAEBoxOfficeSale({
        items: cart.map(item => ({
          ticketTypeId: item.ticketTypeId,
          quantity: item.quantity,
        })),
        paymentMethod,
        total: cartTotal,
      });
      triggerHaptic('success');
      setCart([]);
      await loadData();
    } catch (error) {
      console.error('Error processing sale:', error);
      triggerHaptic('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleDrawer = async () => {
    if (!data) return;

    try {
      triggerHaptic('medium');
      await api.toggleSIAEBoxOfficeDrawer(data.drawerStatus === 'open' ? 'close' : 'open');
      await loadData();
    } catch (error) {
      console.error('Error toggling drawer:', error);
      triggerHaptic('error');
    }
  };

  const handlePrintReceipt = async () => {
    try {
      triggerHaptic('medium');
      await api.printSIAEBoxOfficeReceipt();
      triggerHaptic('success');
    } catch (error) {
      console.error('Error printing receipt:', error);
      triggerHaptic('error');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const paymentMethods: { id: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'contanti', label: 'Contanti', icon: 'cash' },
    { id: 'carta', label: 'Carta', icon: 'card' },
    { id: 'altro', label: 'Altro', icon: 'ellipsis-horizontal' },
  ];

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-box-office"
      />

      {showLoader ? (
        <Loading text="Caricamento Cassa Biglietti..." />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.headerSection}>
            <Text style={styles.title}>Cassa Biglietti</Text>
            {data && (
              <Badge variant={data.drawerStatus === 'open' ? 'success' : 'secondary'}>
                Cassetto {data.drawerStatus === 'open' ? 'Aperto' : 'Chiuso'}
              </Badge>
            )}
          </View>

          {data && (
            <>
              <View style={styles.statsRow}>
                <GlassCard style={styles.statCardWide} testID="stat-cash-drawer">
                  <View style={styles.statCardContent}>
                    <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                      <Ionicons name="cash" size={24} color={staticColors.success} />
                    </View>
                    <View style={styles.statInfo}>
                      <Text style={styles.statLabel}>In Cassetto</Text>
                      <Text style={styles.statValueLarge}>{formatCurrency(data.cashInDrawer)}</Text>
                    </View>
                  </View>
                </GlassCard>
              </View>

              <View style={styles.statsGrid}>
                <GlassCard style={styles.statCard} testID="stat-session-transactions">
                  <Text style={styles.statValue}>{data.sessionTransactions}</Text>
                  <Text style={styles.statLabel}>Transazioni</Text>
                </GlassCard>

                <GlassCard style={styles.statCard} testID="stat-session-total">
                  <Text style={styles.statValue}>{formatCurrency(data.sessionTotal)}</Text>
                  <Text style={styles.statLabel}>Totale Sessione</Text>
                </GlassCard>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vendita Rapida</Text>
                <View style={styles.quickSaleGrid}>
                  {data.ticketTypes.map((ticketType) => (
                    <Pressable
                      key={ticketType.id}
                      onPress={() => handleAddToCart(ticketType)}
                      testID={`quick-sale-${ticketType.id}`}
                    >
                      <LinearGradient
                        colors={gradients.golden}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.quickSaleButton}
                      >
                        <Ionicons name="add-circle" size={24} color="#000000" />
                        <Text style={styles.quickSaleButtonName}>{ticketType.name}</Text>
                        <Text style={styles.quickSaleButtonPrice}>{formatCurrency(ticketType.price)}</Text>
                      </LinearGradient>
                    </Pressable>
                  ))}
                </View>
              </View>

              {cart.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Carrello ({cartCount})</Text>
                    <Pressable onPress={handleClearCart} testID="button-clear-cart">
                      <Text style={styles.clearButton}>Svuota</Text>
                    </Pressable>
                  </View>
                  <Card style={styles.cartCard}>
                    {cart.map((item) => (
                      <View key={item.ticketTypeId} style={styles.cartItem}>
                        <View style={styles.cartItemInfo}>
                          <Text style={styles.cartItemName}>{item.ticketTypeName}</Text>
                          <Text style={styles.cartItemPrice}>
                            {formatCurrency(item.price)} x {item.quantity}
                          </Text>
                        </View>
                        <View style={styles.cartItemActions}>
                          <Pressable
                            onPress={() => handleRemoveFromCart(item.ticketTypeId)}
                            style={styles.cartItemButton}
                            testID={`cart-remove-${item.ticketTypeId}`}
                          >
                            <Ionicons name="remove-circle" size={24} color={staticColors.destructive} />
                          </Pressable>
                          <Text style={styles.cartItemQuantity}>{item.quantity}</Text>
                          <Pressable
                            onPress={() => handleAddToCart({ id: item.ticketTypeId, name: item.ticketTypeName, price: item.price })}
                            style={styles.cartItemButton}
                            testID={`cart-add-${item.ticketTypeId}`}
                          >
                            <Ionicons name="add-circle" size={24} color={staticColors.success} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                    <View style={styles.cartTotal}>
                      <Text style={styles.cartTotalLabel}>Totale</Text>
                      <Text style={styles.cartTotalValue}>{formatCurrency(cartTotal)}</Text>
                    </View>
                  </Card>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Metodo di Pagamento</Text>
                <View style={styles.paymentMethodsGrid}>
                  {paymentMethods.map((method) => (
                    <Pressable
                      key={method.id}
                      onPress={() => {
                        triggerHaptic('light');
                        setPaymentMethod(method.id);
                      }}
                      testID={`payment-method-${method.id}`}
                    >
                      <Card
                        style={{
                          ...styles.paymentMethodCard,
                          ...(paymentMethod === method.id ? styles.paymentMethodCardActive : {}),
                        }}
                      >
                        <Ionicons
                          name={method.icon}
                          size={24}
                          color={paymentMethod === method.id ? staticColors.primary : staticColors.mutedForeground}
                        />
                        <Text
                          style={[
                            styles.paymentMethodLabel,
                            paymentMethod === method.id && styles.paymentMethodLabelActive,
                          ]}
                        >
                          {method.label}
                        </Text>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Button
                onPress={handleProcessSale}
                disabled={cart.length === 0 || isProcessing}
                loading={isProcessing}
                style={styles.processButton}
                testID="button-process-sale"
              >
                <View style={styles.processButtonContent}>
                  <Ionicons name="checkmark-circle" size={20} color={staticColors.primaryForeground} />
                  <Text style={styles.processButtonText}>
                    Completa Vendita {cart.length > 0 && `(${formatCurrency(cartTotal)})`}
                  </Text>
                </View>
              </Button>

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={handlePrintReceipt}
                  style={styles.actionButton}
                  testID="button-print-receipt"
                >
                  <Card style={styles.actionButtonCard}>
                    <Ionicons name="print" size={24} color={staticColors.foreground} />
                    <Text style={styles.actionButtonText}>Stampa Ricevuta</Text>
                  </Card>
                </Pressable>

                <Pressable
                  onPress={handleToggleDrawer}
                  style={styles.actionButton}
                  testID="button-toggle-drawer"
                >
                  <Card
                    style={{
                      ...styles.actionButtonCard,
                      backgroundColor: data.drawerStatus === 'open'
                        ? `${staticColors.destructive}15`
                        : `${staticColors.success}15`,
                    }}
                  >
                    <Ionicons
                      name={data.drawerStatus === 'open' ? 'lock-closed' : 'lock-open'}
                      size={24}
                      color={data.drawerStatus === 'open' ? staticColors.destructive : staticColors.success}
                    />
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: data.drawerStatus === 'open' ? staticColors.destructive : staticColors.success },
                      ]}
                    >
                      {data.drawerStatus === 'open' ? 'Chiudi Cassetto' : 'Apri Cassetto'}
                    </Text>
                  </Card>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
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
    paddingBottom: spacing.xl * 2,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statsRow: {
    marginBottom: spacing.md,
  },
  statCardWide: {
    padding: spacing.lg,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statValueLarge: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  clearButton: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.destructive,
  },
  quickSaleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickSaleButton: {
    width: 150,
    height: 90,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  quickSaleButtonName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: '#000000',
    marginTop: spacing.xs,
  },
  quickSaleButtonPrice: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: '#000000',
  },
  cartCard: {
    padding: spacing.md,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  cartItemPrice: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cartItemButton: {
    padding: spacing.xs,
  },
  cartItemQuantity: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    minWidth: 24,
    textAlign: 'center',
  },
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  cartTotalLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  cartTotalValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentMethodCard: {
    width: 100,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.xs,
  },
  paymentMethodCardActive: {
    borderColor: staticColors.primary,
    backgroundColor: `${staticColors.primary}10`,
  },
  paymentMethodLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  paymentMethodLabelActive: {
    color: staticColors.primary,
  },
  processButton: {
    marginBottom: spacing.md,
  },
  processButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  processButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
});

export default GestoreSIAEBoxOfficeScreen;
