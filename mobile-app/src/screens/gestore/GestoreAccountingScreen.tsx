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
import api, { AccountingStats, Transaction } from '@/lib/api';

type PeriodType = 'today' | 'week' | 'month' | 'year';

interface GestoreAccountingScreenProps {
  onBack: () => void;
}

export function GestoreAccountingScreen({ onBack }: GestoreAccountingScreenProps) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<AccountingStats>({
    totalRevenue: 0,
    ticketRevenue: 0,
    tableRevenue: 0,
    consumptionRevenue: 0,
    expenses: 0,
    profit: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activePeriod, setActivePeriod] = useState<PeriodType>('month');

  useEffect(() => {
    loadAccounting();
  }, [activePeriod]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadAccounting = async () => {
    try {
      setIsLoading(true);
      const [statsData, transactionsData] = await Promise.all([
        api.getGestoreAccountingStats(activePeriod),
        api.getGestoreTransactions(activePeriod),
      ]);
      setStats(statsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading accounting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAccounting();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const periods: { id: PeriodType; label: string }[] = [
    { id: 'today', label: 'Oggi' },
    { id: 'week', label: 'Settimana' },
    { id: 'month', label: 'Mese' },
    { id: 'year', label: 'Anno' },
  ];

  const getTransactionIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'ticket':
        return 'ticket-outline';
      case 'table':
        return 'grid-outline';
      case 'consumption':
        return 'wine-outline';
      case 'refund':
        return 'arrow-undo-outline';
      default:
        return 'cash-outline';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'ticket':
        return staticColors.primary;
      case 'table':
        return staticColors.golden;
      case 'consumption':
        return staticColors.teal;
      case 'refund':
        return staticColors.destructive;
      default:
        return staticColors.foreground;
    }
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-accounting"
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
        <View style={styles.periodsContainer}>
          {periods.map((period) => (
            <Pressable
              key={period.id}
              onPress={() => {
                triggerHaptic('selection');
                setActivePeriod(period.id);
              }}
              style={[
                styles.periodChip,
                activePeriod === period.id && styles.periodChipActive,
              ]}
              testID={`period-${period.id}`}
            >
              <Text
                style={[
                  styles.periodChipText,
                  activePeriod === period.id && styles.periodChipTextActive,
                ]}
              >
                {period.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {showLoader ? (
          <Loading text="Caricamento contabilità..." />
        ) : (
          <>
            <Card style={styles.mainStatCard}>
              <Text style={styles.mainStatLabel}>Fatturato Totale</Text>
              <Text style={[styles.mainStatValue, { color: staticColors.success }]}>
                {formatCurrency(stats.totalRevenue)}
              </Text>
              <View style={styles.profitRow}>
                <Text style={styles.profitLabel}>Profitto Netto:</Text>
                <Text style={[styles.profitValue, { color: stats.profit >= 0 ? staticColors.success : staticColors.destructive }]}>
                  {formatCurrency(stats.profit)}
                </Text>
              </View>
            </Card>

            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                  <Ionicons name="ticket" size={20} color={staticColors.primary} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(stats.ticketRevenue)}</Text>
                <Text style={styles.statLabel}>Biglietti</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
                  <Ionicons name="grid" size={20} color={staticColors.golden} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(stats.tableRevenue)}</Text>
                <Text style={styles.statLabel}>Tavoli</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                  <Ionicons name="wine" size={20} color={staticColors.teal} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(stats.consumptionRevenue)}</Text>
                <Text style={styles.statLabel}>Consumazioni</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.destructive}20` }]}>
                  <Ionicons name="trending-down" size={20} color={staticColors.destructive} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(stats.expenses)}</Text>
                <Text style={styles.statLabel}>Spese</Text>
              </GlassCard>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ultime Transazioni</Text>

              {transactions.length > 0 ? (
                transactions.slice(0, 10).map((transaction) => (
                  <Card key={transaction.id} style={styles.transactionCard} testID={`transaction-${transaction.id}`}>
                    <View style={styles.transactionContent}>
                      <View style={[styles.transactionIcon, { backgroundColor: `${getTransactionColor(transaction.type)}20` }]}>
                        <Ionicons
                          name={getTransactionIcon(transaction.type)}
                          size={20}
                          color={getTransactionColor(transaction.type)}
                        />
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionDescription}>{transaction.description}</Text>
                        <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
                      </View>
                      <Text
                        style={[
                          styles.transactionAmount,
                          { color: transaction.amount >= 0 ? staticColors.success : staticColors.destructive },
                        ]}
                      >
                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
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
  periodsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  periodChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
  },
  periodChipActive: {
    backgroundColor: staticColors.primary,
  },
  periodChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  periodChipTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  mainStatCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  mainStatLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  mainStatValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  profitLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  profitValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
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
  transactionDescription: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  transactionDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
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

export default GestoreAccountingScreen;
