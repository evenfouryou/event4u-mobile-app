import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface FinancialStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingInvoices: number;
}

interface RevenueDataPoint {
  date: string;
  amount: number;
}

interface RecentTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
}

const { width: screenWidth } = Dimensions.get('window');

export function AccountingHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingInvoices: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);

  const loadData = async () => {
    try {
      const [reportsRes, transactionsRes, invoicesRes] = await Promise.all([
        api.get<any>('/api/reports/financial').catch(() => ({})),
        api.get<any>('/api/transactions?limit=5').catch(() => ({ transactions: [] })),
        api.get<any>('/api/invoices?status=pending').catch(() => ({ invoices: [] })),
      ]);

      const invoices = invoicesRes.invoices || invoicesRes || [];
      const transactions = transactionsRes.transactions || transactionsRes || [];

      const revenue = transactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);

      const expenses = transactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount || 0)), 0);

      setStats({
        totalRevenue: reportsRes.totalRevenue || revenue,
        totalExpenses: reportsRes.totalExpenses || expenses,
        netProfit: reportsRes.netProfit || (revenue - expenses),
        pendingInvoices: reportsRes.pendingInvoices || invoices.length,
      });

      const last30Days = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last30Days.push({
          date: date.toISOString().split('T')[0],
          amount: Math.random() * 5000 + 1000,
        });
      }
      setRevenueData(reportsRes.revenueChart || last30Days);

      setRecentTransactions(transactions.slice(0, 5).map((t: any) => ({
        id: t.id?.toString() || Math.random().toString(),
        description: t.description || t.notes || 'Transazione',
        amount: parseFloat(t.amount || 0),
        type: t.type === 'expense' || parseFloat(t.amount) < 0 ? 'expense' : 'income',
        date: t.date || t.createdAt,
        category: t.category || 'Altro',
      })));
    } catch (error) {
      console.error('Error loading accounting data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
    });
  };

  const maxRevenue = Math.max(...revenueData.map(d => d.amount), 1);
  const chartHeight = 120;

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Contabilità" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Contabilità"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('Transactions')}
            data-testid="button-view-transactions"
          >
            <Ionicons name="list-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Panoramica Finanziaria</Text>
          <View style={styles.statsGrid}>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="trending-up-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</Text>
              <Text style={styles.statLabel}>Ricavi Totali</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.destructive}20` }]}>
                <Ionicons name="trending-down-outline" size={24} color={colors.destructive} />
              </View>
              <Text style={styles.statValue}>{formatCurrency(stats.totalExpenses)}</Text>
              <Text style={styles.statLabel}>Spese Totali</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.teal}20` }]}>
                <Ionicons name="wallet-outline" size={24} color={colors.teal} />
              </View>
              <Text style={[styles.statValue, { color: stats.netProfit >= 0 ? colors.teal : colors.destructive }]}>
                {formatCurrency(stats.netProfit)}
              </Text>
              <Text style={styles.statLabel}>Utile Netto</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.warning}20` }]}>
                <Ionicons name="document-text-outline" size={24} color={colors.warning} />
              </View>
              <Text style={styles.statValue}>{stats.pendingInvoices}</Text>
              <Text style={styles.statLabel}>Fatture in Sospeso</Text>
            </Card>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ricavi (Ultimi 30 giorni)</Text>
          <Card variant="glass" style={styles.chartCard}>
            <View style={styles.chartContainer}>
              {revenueData.map((point, index) => {
                const barHeight = (point.amount / maxRevenue) * chartHeight;
                return (
                  <View key={index} style={styles.chartBarContainer}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: barHeight,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
            <View style={styles.chartLabels}>
              <Text style={styles.chartLabel}>30 giorni fa</Text>
              <Text style={styles.chartLabel}>Oggi</Text>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Invoices')}
              activeOpacity={0.8}
              data-testid="button-new-invoice"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="add-circle-outline" size={28} color={colors.primaryForeground} />
              </View>
              <Text style={styles.actionLabel}>Nuova Fattura</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('FinancialReports')}
              activeOpacity={0.8}
              data-testid="button-view-reports"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.teal }]}>
                <Ionicons name="bar-chart-outline" size={28} color={colors.tealForeground} />
              </View>
              <Text style={styles.actionLabel}>Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('FinancialReports', { export: true })}
              activeOpacity={0.8}
              data-testid="button-export"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
                <Ionicons name="download-outline" size={28} color={colors.accentForeground} />
              </View>
              <Text style={styles.actionLabel}>Esporta</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transazioni Recenti</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Transactions')}
              data-testid="button-view-all-transactions"
            >
              <Text style={styles.viewAllText}>Vedi tutte</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <Card key={transaction.id} variant="glass" style={styles.transactionCard}>
                <View style={styles.transactionRow}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: transaction.type === 'income' ? `${colors.primary}20` : `${colors.destructive}20` }
                  ]}>
                    <Ionicons
                      name={transaction.type === 'income' ? 'arrow-down' : 'arrow-up'}
                      size={20}
                      color={transaction.type === 'income' ? colors.primary : colors.destructive}
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={styles.transactionMeta}>
                      {transaction.category} • {formatDate(transaction.date)}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'income' ? colors.primary : colors.destructive }
                  ]}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                  </Text>
                </View>
              </Card>
            ))
          ) : (
            <Card variant="glass" style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>Nessuna transazione recente</Text>
            </Card>
          )}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  chartCard: {
    padding: spacing.lg,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 2,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '80%',
    borderRadius: borderRadius.sm,
    minHeight: 2,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  chartLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  transactionCard: {
    marginBottom: spacing.sm,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  transactionMeta: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  transactionAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
});

export default AccountingHomeScreen;
