import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { CashierStats, CashierTransaction, CashierEvent } from '@/lib/api';

interface GestoreCashierScreenProps {
  onBack: () => void;
}

export function GestoreCashierScreen({ onBack }: GestoreCashierScreenProps) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<CashierStats>({
    transactionsCount: 0,
    totalSales: 0,
    avgTicketValue: 0,
    cashDrawerStatus: 'closed',
    cashBalance: 0,
    cardPayments: 0,
    cashPayments: 0,
  });
  const [transactions, setTransactions] = useState<CashierTransaction[]>([]);
  const [events, setEvents] = useState<CashierEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadCashierData();
  }, [selectedEvent]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadEvents = async () => {
    try {
      const data = await api.getGestoreCashierEvents();
      setEvents(data);
      const activeEvent = data.find(e => e.status === 'active');
      if (activeEvent) {
        setSelectedEvent(activeEvent.id);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadCashierData = async () => {
    try {
      setIsLoading(true);
      const [statsData, transactionsData] = await Promise.all([
        api.getGestoreCashierStats(selectedEvent || undefined),
        api.getGestoreCashierTransactions(selectedEvent || undefined),
      ]);
      setStats(statsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading cashier data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCashierData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDrawerStatusLabel = (status: CashierStats['cashDrawerStatus']) => {
    switch (status) {
      case 'open':
        return 'Aperta';
      case 'closed':
        return 'Chiusa';
      case 'balanced':
        return 'Chiusa e Quadrata';
    }
  };

  const getDrawerStatusColor = (status: CashierStats['cashDrawerStatus']) => {
    switch (status) {
      case 'open':
        return staticColors.success;
      case 'closed':
        return staticColors.mutedForeground;
      case 'balanced':
        return staticColors.teal;
    }
  };

  const getPaymentMethodIcon = (method: CashierTransaction['paymentMethod']): keyof typeof Ionicons.glyphMap => {
    switch (method) {
      case 'cash':
        return 'cash-outline';
      case 'card':
        return 'card-outline';
      case 'wallet':
        return 'wallet-outline';
      default:
        return 'ellipsis-horizontal-outline';
    }
  };

  const getPaymentMethodLabel = (method: CashierTransaction['paymentMethod']) => {
    switch (method) {
      case 'cash':
        return 'Contanti';
      case 'card':
        return 'Carta';
      case 'wallet':
        return 'Wallet';
      default:
        return 'Altro';
    }
  };

  const getTransactionStatusColor = (status: CashierTransaction['status']) => {
    switch (status) {
      case 'completed':
        return staticColors.success;
      case 'pending':
        return staticColors.warning;
      case 'refunded':
        return staticColors.destructive;
    }
  };

  const selectedEventData = events.find(e => e.id === selectedEvent);

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-cashier"
      />

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
          <Text style={styles.title}>Cassa</Text>
          <Text style={styles.subtitle}>Dashboard vendite e transazioni</Text>
        </View>

        <Pressable
          onPress={() => {
            triggerHaptic('selection');
            setShowEventPicker(!showEventPicker);
          }}
          style={styles.eventSelector}
          testID="event-selector"
        >
          <View style={styles.eventSelectorContent}>
            <Ionicons name="calendar" size={20} color={staticColors.primary} />
            <View style={styles.eventSelectorText}>
              <Text style={styles.eventSelectorLabel}>Evento Selezionato</Text>
              <Text style={styles.eventSelectorValue}>
                {selectedEventData?.name || 'Seleziona evento'}
              </Text>
            </View>
          </View>
          <Ionicons
            name={showEventPicker ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={staticColors.mutedForeground}
          />
        </Pressable>

        {showEventPicker && (
          <View style={styles.eventPickerContainer}>
            {events.map((event) => (
              <Pressable
                key={event.id}
                onPress={() => {
                  triggerHaptic('selection');
                  setSelectedEvent(event.id);
                  setShowEventPicker(false);
                }}
                style={[
                  styles.eventPickerItem,
                  selectedEvent === event.id && styles.eventPickerItemActive,
                ]}
                testID={`event-option-${event.id}`}
              >
                <View style={styles.eventPickerItemContent}>
                  <Text style={styles.eventPickerItemName}>{event.name}</Text>
                  <Text style={styles.eventPickerItemDate}>{event.date}</Text>
                </View>
                {event.status === 'active' && (
                  <Badge variant="success">
                    <Text style={styles.eventBadgeText}>Attivo</Text>
                  </Badge>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {showLoader ? (
          <Loading text="Caricamento dati cassa..." />
        ) : (
          <>
            <Card style={styles.drawerCard}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Stato Cassa</Text>
                <Badge
                  variant={stats.cashDrawerStatus === 'open' ? 'success' : 'secondary'}
                >
                  <Text style={[styles.drawerStatusText, { color: getDrawerStatusColor(stats.cashDrawerStatus) }]}>
                    {getDrawerStatusLabel(stats.cashDrawerStatus)}
                  </Text>
                </Badge>
              </View>
              <View style={styles.drawerBalance}>
                <Text style={styles.drawerBalanceLabel}>Saldo Contanti</Text>
                <Text style={styles.drawerBalanceValue}>{formatCurrency(stats.cashBalance)}</Text>
              </View>
            </Card>

            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                  <Ionicons name="receipt" size={20} color={staticColors.primary} />
                </View>
                <Text style={styles.statValue}>{stats.transactionsCount}</Text>
                <Text style={styles.statLabel}>Transazioni</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                  <Ionicons name="cash" size={20} color={staticColors.success} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(stats.totalSales)}</Text>
                <Text style={styles.statLabel}>Vendite Totali</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                  <Ionicons name="pricetag" size={20} color={staticColors.teal} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(stats.avgTicketValue)}</Text>
                <Text style={styles.statLabel}>Scontrino Medio</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
                  <Ionicons name="card" size={20} color={staticColors.golden} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(stats.cardPayments)}</Text>
                <Text style={styles.statLabel}>Pagam. Carta</Text>
              </GlassCard>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transazioni Recenti</Text>

              {transactions.length > 0 ? (
                transactions.slice(0, 15).map((transaction) => (
                  <Card key={transaction.id} style={styles.transactionCard} testID={`transaction-${transaction.id}`}>
                    <View style={styles.transactionContent}>
                      <View style={[styles.transactionIcon, { backgroundColor: `${getTransactionStatusColor(transaction.status)}20` }]}>
                        <Ionicons
                          name={getPaymentMethodIcon(transaction.paymentMethod)}
                          size={20}
                          color={getTransactionStatusColor(transaction.status)}
                        />
                      </View>
                      <View style={styles.transactionInfo}>
                        <View style={styles.transactionHeader}>
                          <Text style={styles.transactionTime}>{formatTime(transaction.time)}</Text>
                          <Badge variant="outline">
                            <Text style={styles.paymentMethodText}>
                              {getPaymentMethodLabel(transaction.paymentMethod)}
                            </Text>
                          </Badge>
                        </View>
                        <Text style={styles.transactionItems}>
                          {transaction.items} {transaction.items === 1 ? 'articolo' : 'articoli'}
                          {transaction.receiptNumber && ` • #${transaction.receiptNumber}`}
                        </Text>
                        {transaction.customerName && (
                          <Text style={styles.customerName}>{transaction.customerName}</Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.transactionAmount,
                          { color: transaction.status === 'refunded' ? staticColors.destructive : staticColors.success },
                        ]}
                      >
                        {transaction.status === 'refunded' ? '-' : '+'}{formatCurrency(transaction.amount)}
                      </Text>
                    </View>
                  </Card>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <View style={styles.emptyContent}>
                    <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
                    <Text style={styles.emptyTitle}>Nessuna transazione</Text>
                    <Text style={styles.emptyText}>Le transazioni appariranno qui</Text>
                  </View>
                </Card>
              )}
            </View>
          </>
        )}
      </ScrollView>
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
    paddingBottom: spacing.xxl,
  },
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  eventSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  eventSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventSelectorText: {
    flex: 1,
  },
  eventSelectorLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  eventSelectorValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: 2,
  },
  eventPickerContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
    overflow: 'hidden',
  },
  eventPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  eventPickerItemActive: {
    backgroundColor: `${staticColors.primary}10`,
  },
  eventPickerItemContent: {
    flex: 1,
  },
  eventPickerItemName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  eventPickerItemDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  eventBadgeText: {
    fontSize: typography.fontSize.xs,
  },
  drawerCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  drawerStatusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  drawerBalance: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  drawerBalanceLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  drawerBalanceValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.success,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  transactionCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  transactionTime: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  paymentMethodText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  transactionItems: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  customerName: {
    fontSize: typography.fontSize.xs,
    color: staticColors.teal,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  emptyCard: {
    padding: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
});

export default GestoreCashierScreen;
