import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

const CASHIER_ACCENT = colors.cashier;
const CASHIER_ACCENT_FOREGROUND = colors.cashierForeground;

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  ticketsSold: number;
  transactionsCount: number;
  averageTransaction: number;
  cashRevenue: number;
  cardRevenue: number;
  refundsTotal: number;
}

interface RevenueByEvent {
  eventId: string;
  eventName: string;
  revenue: number;
  ticketsSold: number;
}

interface RecentTransaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  paymentMethod: 'cash' | 'card';
  timestamp: string;
  cashierName: string;
}

interface HourlyRevenue {
  hour: string;
  revenue: number;
}

type TimePeriod = 'today' | 'week' | 'month';

export function CashierDashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['/api/cashier/dashboard/stats', timePeriod],
    queryFn: () =>
      api.get<DashboardStats>(`/api/cashier/dashboard/stats?period=${timePeriod}`).catch(() => ({
        totalRevenue: 45680.5,
        todayRevenue: 2340.0,
        weekRevenue: 12450.0,
        monthRevenue: 45680.5,
        ticketsSold: 1234,
        transactionsCount: 567,
        averageTransaction: 42.5,
        cashRevenue: 18272.2,
        cardRevenue: 27408.3,
        refundsTotal: 345.0,
      })),
  });

  const { data: revenueByEvent = [] } = useQuery<RevenueByEvent[]>({
    queryKey: ['/api/cashier/dashboard/revenue-by-event', timePeriod],
    queryFn: () =>
      api.get<RevenueByEvent[]>(`/api/cashier/dashboard/revenue-by-event?period=${timePeriod}`).catch(() => [
        { eventId: '1', eventName: 'Notte Italiana', revenue: 4560.0, ticketsSold: 234 },
        { eventId: '2', eventName: 'Friday Vibes', revenue: 3280.0, ticketsSold: 178 },
        { eventId: '3', eventName: 'Electronic Sunday', revenue: 2120.0, ticketsSold: 112 },
      ]),
  });

  const { data: recentTransactions = [], refetch: refetchTransactions } = useQuery<RecentTransaction[]>({
    queryKey: ['/api/cashier/dashboard/transactions'],
    queryFn: () =>
      api.get<RecentTransaction[]>('/api/cashier/dashboard/transactions').catch(() => [
        {
          id: '1',
          type: 'ticket',
          description: '2x Ingresso VIP',
          amount: 60.0,
          paymentMethod: 'card',
          timestamp: new Date().toISOString(),
          cashierName: 'Marco R.',
        },
        {
          id: '2',
          type: 'ticket',
          description: '4x Ingresso Standard',
          amount: 60.0,
          paymentMethod: 'cash',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          cashierName: 'Laura B.',
        },
        {
          id: '3',
          type: 'table',
          description: 'Tavolo VIP (6 pax)',
          amount: 300.0,
          paymentMethod: 'card',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
          cashierName: 'Marco R.',
        },
        {
          id: '4',
          type: 'ticket',
          description: '1x Ingresso Standard',
          amount: 15.0,
          paymentMethod: 'cash',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          cashierName: 'Paolo V.',
        },
      ]),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchTransactions()]);
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `€ ${amount.toFixed(2).replace('.', ',')}`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const getRevenueForPeriod = () => {
    if (!stats) return 0;
    switch (timePeriod) {
      case 'today':
        return stats.todayRevenue;
      case 'week':
        return stats.weekRevenue;
      case 'month':
        return stats.monthRevenue;
      default:
        return stats.todayRevenue;
    }
  };

  const periodOptions: { value: TimePeriod; label: string }[] = [
    { value: 'today', label: 'Oggi' },
    { value: 'week', label: 'Settimana' },
    { value: 'month', label: 'Mese' },
  ];

  const cashPercentage = stats ? (stats.cashRevenue / (stats.cashRevenue + stats.cardRevenue)) * 100 : 50;

  return (
    <View style={styles.container}>
      <Header
        title="Dashboard Vendite"
        showBack
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('CashierReports')} data-testid="button-reports">
            <Ionicons name="document-text-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CASHIER_ACCENT} />
        }
      >
        <View style={styles.periodSelector}>
          {periodOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.periodButton, timePeriod === option.value && styles.periodButtonActive]}
              onPress={() => setTimePeriod(option.value)}
              data-testid={`period-${option.value}`}
            >
              <Text
                style={[styles.periodButtonText, timePeriod === option.value && styles.periodButtonTextActive]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card variant="elevated" style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Ricavi {periodOptions.find((p) => p.value === timePeriod)?.label}</Text>
          <Text style={styles.revenueAmount}>{formatCurrency(getRevenueForPeriod())}</Text>
          <View style={styles.revenueBreakdown}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: colors.success }]} />
              <Text style={styles.breakdownLabel}>Contanti</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(stats?.cashRevenue || 0)}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.breakdownLabel}>Carta</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(stats?.cardRevenue || 0)}</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressCash, { width: `${cashPercentage}%` }]} />
            <View style={[styles.progressCard, { width: `${100 - cashPercentage}%` }]} />
          </View>
        </Card>

        <View style={styles.statsGrid}>
          <Card variant="glass" style={styles.statCard}>
            <Ionicons name="ticket" size={24} color={CASHIER_ACCENT} />
            <Text style={styles.statValue}>{stats?.ticketsSold || 0}</Text>
            <Text style={styles.statLabel}>Biglietti</Text>
          </Card>
          <Card variant="glass" style={styles.statCard}>
            <Ionicons name="swap-horizontal" size={24} color={colors.cashierLight} />
            <Text style={styles.statValue}>{stats?.transactionsCount || 0}</Text>
            <Text style={styles.statLabel}>Transazioni</Text>
          </Card>
          <Card variant="glass" style={styles.statCard}>
            <Ionicons name="calculator" size={24} color={colors.cashierDark} />
            <Text style={styles.statValue}>{formatCurrency(stats?.averageTransaction || 0)}</Text>
            <Text style={styles.statLabel}>Media</Text>
          </Card>
          <Card variant="glass" style={styles.statCard}>
            <Ionicons name="return-down-back" size={24} color={colors.destructive} />
            <Text style={[styles.statValue, { color: colors.destructive }]}>
              {formatCurrency(stats?.refundsTotal || 0)}
            </Text>
            <Text style={styles.statLabel}>Rimborsi</Text>
          </Card>
        </View>

        {revenueByEvent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ricavi per Evento</Text>
            <Card variant="glass" style={styles.eventsCard}>
              {revenueByEvent.map((event, index) => (
                <View
                  key={event.eventId}
                  style={[styles.eventRow, index < revenueByEvent.length - 1 && styles.eventRowBorder]}
                >
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventName}>{event.eventName}</Text>
                    <Text style={styles.eventTickets}>{event.ticketsSold} biglietti</Text>
                  </View>
                  <Text style={styles.eventRevenue}>{formatCurrency(event.revenue)}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ultime Transazioni</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CashierTransactions')}>
              <Text style={styles.seeAllText}>Vedi tutte</Text>
            </TouchableOpacity>
          </View>
          <Card variant="glass" style={styles.transactionsCard}>
            {recentTransactions.map((transaction, index) => (
              <View
                key={transaction.id}
                style={[
                  styles.transactionRow,
                  index < recentTransactions.length - 1 && styles.transactionRowBorder,
                ]}
              >
                <View style={styles.transactionIcon}>
                  <Ionicons
                    name={transaction.paymentMethod === 'cash' ? 'cash' : 'card'}
                    size={20}
                    color={transaction.paymentMethod === 'cash' ? colors.success : colors.accent}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  <Text style={styles.transactionMeta}>
                    {transaction.cashierName} • {formatTime(transaction.timestamp)}
                  </Text>
                </View>
                <Text style={styles.transactionAmount}>{formatCurrency(transaction.amount)}</Text>
              </View>
            ))}
          </Card>
        </View>

        <View style={styles.quickActions}>
          <Button
            title="Nuova Vendita"
            variant="primary"
            icon={<Ionicons name="add" size={20} color={colors.primaryForeground} />}
            onPress={() => navigation.navigate('CassaBiglietti')}
          />
          <Button
            title="Esporta Report"
            variant="outline"
            icon={<Ionicons name="download-outline" size={20} color={colors.foreground} />}
            onPress={() => {}}
          />
        </View>
      </ScrollView>
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  periodButtonActive: {
    backgroundColor: CASHIER_ACCENT,
  },
  periodButtonText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  periodButtonTextActive: {
    color: colors.primaryForeground,
    fontWeight: fontWeight.semibold,
  },
  revenueCard: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: CASHIER_ACCENT + '15',
    borderColor: CASHIER_ACCENT + '30',
  },
  revenueLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  revenueAmount: {
    color: colors.foreground,
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
  },
  revenueBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  breakdownValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  progressBar: {
    height: 8,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressCash: {
    backgroundColor: colors.success,
  },
  progressCard: {
    backgroundColor: colors.accent,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2 - 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  seeAllText: {
    color: CASHIER_ACCENT,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  eventsCard: {
    padding: spacing.md,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  eventRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  eventInfo: {},
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  eventTickets: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  eventRevenue: {
    color: CASHIER_ACCENT,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  transactionsCard: {
    padding: spacing.md,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  transactionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  transactionMeta: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  transactionAmount: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
