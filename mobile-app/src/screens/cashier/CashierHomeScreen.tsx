import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

const CASHIER_ACCENT = colors.cashier;
const CASHIER_ACCENT_FOREGROUND = colors.cashierForeground;
const TABLET_BREAKPOINT = 768;
const CONTENT_MAX_WIDTH = 800;

interface CashierStats {
  totalRevenue: number;
  ticketsSold: number;
  transactionsCount: number;
  cashRevenue: number;
  cardRevenue: number;
}

interface CurrentEvent {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'in_progress' | 'ended';
}

interface RecentTransaction {
  id: string;
  type: 'ticket' | 'beverage' | 'other';
  title: string;
  amount: number;
  time: string;
  ticketType?: string;
}

interface CashierDashboard {
  stats: CashierStats;
  currentEvent: CurrentEvent | null;
  recentTransactions: RecentTransaction[];
}

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  action: () => void;
}

function formatCurrency(amount: number): string {
  return `€ ${amount.toFixed(2).replace('.', ',')}`;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function CashierHomeScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= TABLET_BREAKPOINT;

  const { data: dashboard, isLoading, refetch, isRefetching } = useQuery<CashierDashboard>({
    queryKey: ['/api/cashier/dashboard'],
    queryFn: () => api.get<CashierDashboard>('/api/cashier/dashboard'),
    refetchInterval: 30000,
  });

  const stats = dashboard?.stats;
  const currentEvent = dashboard?.currentEvent;
  const recentTransactions = dashboard?.recentTransactions || [];

  const statCards = [
    {
      id: '1',
      label: 'Incassi Oggi',
      value: stats ? formatCurrency(stats.totalRevenue) : '€ 0,00',
      icon: 'cash',
      trend: null,
      color: CASHIER_ACCENT,
    },
    {
      id: '2',
      label: 'Biglietti Venduti',
      value: stats?.ticketsSold?.toString() || '0',
      icon: 'ticket',
      trend: null,
      color: CASHIER_ACCENT,
    },
    {
      id: '3',
      label: 'Transazioni',
      value: stats?.transactionsCount?.toString() || '0',
      icon: 'swap-horizontal',
      trend: null,
      color: CASHIER_ACCENT,
    },
    {
      id: '4',
      label: 'Incassi Contanti',
      value: stats ? formatCurrency(stats.cashRevenue) : '€ 0,00',
      icon: 'wallet',
      color: CASHIER_ACCENT,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Vendi Biglietto',
      icon: 'ticket',
      color: CASHIER_ACCENT,
      action: () => navigation.navigate('CashierTicket'),
    },
    {
      id: '2',
      title: 'Riepilogo Bevande',
      icon: 'wine',
      color: colors.cashierLight,
      action: () => {
        navigation.navigate('CashierDashboard');
      },
    },
    {
      id: '3',
      title: 'Riepilogo Incassi',
      icon: 'pie-chart',
      color: colors.cashierDark,
      action: () => {
        navigation.navigate('CashierDashboard');
      },
    },
    {
      id: '4',
      title: 'Chiusura Cassa',
      icon: 'lock-closed',
      color: colors.destructive,
      action: () => {},
    },
  ];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'ticket':
        return 'ticket';
      case 'beverage':
        return 'wine';
      default:
        return 'receipt';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'ticket':
        return CASHIER_ACCENT;
      case 'beverage':
        return colors.cashierLight;
      default:
        return colors.cashierDark;
    }
  };

  const numColumns = isLandscape || isTablet ? 4 : 2;
  const cardWidth = isTablet
    ? (Math.min(width, CONTENT_MAX_WIDTH) - spacing.lg * 2 - spacing.md * (numColumns - 1)) / numColumns
    : (width - spacing.lg * 2 - spacing.md) / 2;

  const renderStatCard = ({ item }: { item: typeof statCards[0] }) => (
    <Card style={[styles.statCard, { width: cardWidth }]} testID={`card-stat-${item.id}`}>
      <View style={styles.statHeader}>
        <Ionicons name={item.icon as any} size={24} color={item.color || CASHIER_ACCENT} />
      </View>
      <Text style={styles.statLabel}>{item.label}</Text>
      <Text style={styles.statValue} testID={`text-stat-value-${item.id}`}>{item.value}</Text>
    </Card>
  );

  const renderQuickAction = ({ item }: { item: QuickAction }) => (
    <TouchableOpacity
      style={[styles.quickActionButton, { width: cardWidth }]}
      onPress={item.action}
      activeOpacity={0.8}
      testID={`button-quick-action-${item.id}`}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={32} color={colors.primaryForeground} />
      </View>
      <Text style={styles.quickActionLabel}>{item.title}</Text>
    </TouchableOpacity>
  );

  const getEventStatusText = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'In corso';
      case 'scheduled':
        return 'Programmato';
      case 'ended':
        return 'Terminato';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Cassa" />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText}>Caricamento dati...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Cassa" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            testID="refresh-control"
          />
        }
        testID="scroll-view"
      >
        <View style={[styles.contentWrapper, isTablet && { maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', width: '100%' }]}>
          {currentEvent ? (
            <Card style={styles.eventCard} variant="elevated" testID="card-current-event">
              <View style={styles.eventHeader}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventLabel}>Evento Attuale</Text>
                  <Text style={styles.eventName} testID="text-event-name">{currentEvent.name}</Text>
                  <Text style={styles.eventTime} testID="text-event-time">
                    {currentEvent.date} • {currentEvent.startTime} - {currentEvent.endTime}
                  </Text>
                </View>
                <View style={[
                  styles.eventStatus,
                  currentEvent.status === 'in_progress' && styles.eventStatusActive,
                  currentEvent.status === 'ended' && styles.eventStatusEnded,
                ]}>
                  <View style={[
                    styles.statusIndicator,
                    currentEvent.status === 'in_progress' && styles.statusIndicatorActive,
                    currentEvent.status === 'ended' && styles.statusIndicatorEnded,
                  ]} />
                  <Text style={[
                    styles.statusText,
                    currentEvent.status === 'in_progress' && styles.statusTextActive,
                    currentEvent.status === 'ended' && styles.statusTextEnded,
                  ]} testID="text-event-status">
                    {getEventStatusText(currentEvent.status)}
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <Card style={styles.eventCard} variant="elevated" testID="card-no-event">
              <View style={styles.noEventContainer}>
                <Ionicons name="calendar-outline" size={40} color={colors.mutedForeground} />
                <Text style={styles.noEventText}>Nessun evento assegnato</Text>
                <Text style={styles.noEventSubtext}>
                  Attendi l'assegnazione ad un evento da parte del gestore
                </Text>
              </View>
            </Card>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statistiche Oggi</Text>
            <FlatList
              data={statCards}
              renderItem={renderStatCard}
              keyExtractor={(item) => item.id}
              numColumns={numColumns}
              key={numColumns}
              columnWrapperStyle={styles.statsGrid}
              scrollEnabled={false}
              testID="list-stats"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Azioni Rapide</Text>
            <FlatList
              data={quickActions}
              renderItem={renderQuickAction}
              keyExtractor={(item) => item.id}
              numColumns={numColumns}
              key={`actions-${numColumns}`}
              columnWrapperStyle={styles.actionsGrid}
              scrollEnabled={false}
              testID="list-quick-actions"
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Transazioni Recenti</Text>
              <TouchableOpacity testID="button-view-all-transactions">
                <Text style={styles.viewAllText}>Vedi tutto</Text>
              </TouchableOpacity>
            </View>

            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <Card key={transaction.id} style={styles.transactionCard} testID={`card-transaction-${transaction.id}`}>
                  <View style={styles.transactionItem}>
                    <View style={styles.transactionIcon}>
                      <Ionicons 
                        name={getTransactionIcon(transaction.type) as any} 
                        size={20} 
                        color={getTransactionColor(transaction.type)} 
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionTitle} testID={`text-transaction-title-${transaction.id}`}>
                        {transaction.title}
                      </Text>
                      <Text style={styles.transactionTime}>{transaction.time}</Text>
                    </View>
                    <Text style={styles.transactionAmount} testID={`text-transaction-amount-${transaction.id}`}>
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                </Card>
              ))
            ) : (
              <Card style={styles.emptyTransactionsCard} testID="card-empty-transactions">
                <View style={styles.emptyTransactions}>
                  <Ionicons name="receipt-outline" size={32} color={colors.mutedForeground} />
                  <Text style={styles.emptyTransactionsText}>
                    Nessuna transazione recente
                  </Text>
                </View>
              </Card>
            )}
          </View>

          <View style={styles.section}>
            <Card style={styles.summaryCard} testID="card-summary">
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Contanti</Text>
                <Text style={styles.summaryValue} testID="text-summary-cash">
                  {stats ? formatCurrency(stats.cashRevenue) : '€ 0,00'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Carte</Text>
                <Text style={styles.summaryValue} testID="text-summary-card">
                  {stats ? formatCurrency(stats.cardRevenue) : '€ 0,00'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Totale</Text>
                <Text style={styles.summaryTotal} testID="text-summary-total">
                  {stats ? formatCurrency(stats.totalRevenue) : '€ 0,00'}
                </Text>
              </View>
            </Card>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 80,
  },
  scrollContentTablet: {
    paddingHorizontal: spacing.xl,
  },
  contentWrapper: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  eventCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventInfo: {
    flex: 1,
  },
  eventLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  eventTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  eventStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  eventStatusActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  eventStatusEnded: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.mutedForeground,
  },
  statusIndicatorActive: {
    backgroundColor: colors.success,
  },
  statusIndicatorEnded: {
    backgroundColor: colors.destructive,
  },
  statusText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextEnded: {
    color: colors.destructive,
  },
  noEventContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  noEventText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  noEventSubtext: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  statsGrid: {
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  actionsGrid: {
    gap: spacing.md,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  quickActionLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  transactionCard: {
    marginBottom: spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  transactionTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  transactionAmount: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  emptyTransactionsCard: {
    padding: spacing.lg,
  },
  emptyTransactions: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTransactionsText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  summaryCard: {
    paddingVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  summaryTotal: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
