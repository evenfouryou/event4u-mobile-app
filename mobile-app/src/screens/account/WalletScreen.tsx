import React from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { api } from '../../lib/api';

interface WalletData {
  balance: number;
  pendingBalance: number;
}

interface Transaction {
  id: string;
  type: 'credit' | 'debit' | 'pending';
  description: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export function WalletScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ['/api/wallet'],
    queryFn: () => api.get<WalletData>('/api/wallet'),
  });

  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions, isRefetching } = useQuery({
    queryKey: ['/api/wallet/transactions'],
    queryFn: () => api.get<Transaction[]>('/api/wallet/transactions'),
  });

  const handleRefresh = () => {
    refetchWallet();
    refetchTransactions();
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending') return 'time-outline';
    if (type === 'credit') return 'arrow-down-outline';
    return 'arrow-up-outline';
  };

  const getTransactionColor = (type: string, status: string) => {
    if (status === 'pending') return colors.warning;
    if (status === 'failed') return colors.destructive;
    if (type === 'credit') return colors.success;
    return colors.mutedForeground;
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(item.type, item.status) + '20' }]}>
        <Ionicons 
          name={getTransactionIcon(item.type, item.status)} 
          size={20} 
          color={getTransactionColor(item.type, item.status)} 
        />
      </View>
      <View style={styles.transactionContent}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>{item.date}</Text>
      </View>
      <View style={styles.transactionAmount}>
        <Text style={[
          styles.transactionValue,
          { color: item.type === 'credit' ? colors.success : colors.foreground }
        ]}>
          {item.type === 'credit' ? '+' : '-'}€{Math.abs(item.amount).toFixed(2)}
        </Text>
        {item.status !== 'completed' && (
          <Text style={[styles.transactionStatus, { color: getTransactionColor(item.type, item.status) }]}>
            {item.status === 'pending' ? 'In attesa' : 'Fallito'}
          </Text>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color={colors.mutedForeground} />
      <Text style={styles.emptyTitle}>Nessun movimento</Text>
      <Text style={styles.emptySubtitle}>Le tue transazioni appariranno qui</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header 
        title="Wallet" 
        showBack 
        onBack={() => navigation.goBack()} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo disponibile</Text>
          <Text style={styles.balanceValue}>
            €{(wallet?.balance || 0).toFixed(2)}
          </Text>
          
          {(wallet?.pendingBalance ?? 0) > 0 && (
            <View style={styles.pendingRow}>
              <Ionicons name="time-outline" size={16} color={colors.warning} />
              <Text style={styles.pendingText}>
                €{wallet?.pendingBalance.toFixed(2)} in attesa
              </Text>
            </View>
          )}

          <View style={styles.balanceActions}>
            <Button
              title="Ricarica"
              size="sm"
              onPress={() => {}}
              icon={<Ionicons name="add-outline" size={18} color={colors.primaryForeground} />}
              style={styles.actionButton}
            />
            <Button
              title="Preleva"
              variant="outline"
              size="sm"
              onPress={() => {}}
              icon={<Ionicons name="arrow-up-outline" size={18} color={colors.foreground} />}
              style={styles.actionButton}
            />
          </View>
        </Card>

        <Card style={styles.transactionsCard}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Movimenti</Text>
          </View>

          {transactions && transactions.length > 0 ? (
            <View>
              {transactions.map((transaction) => (
                <React.Fragment key={transaction.id}>
                  {renderTransaction({ item: transaction })}
                </React.Fragment>
              ))}
            </View>
          ) : (
            renderEmpty()
          )}
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Come funziona il wallet?</Text>
              <Text style={styles.infoText}>
                Il saldo wallet viene accreditato automaticamente quando vendi un biglietto. 
                Puoi utilizzarlo per acquistare nuovi biglietti o prelevarlo sul tuo conto bancario.
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
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
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  balanceCard: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  balanceLabel: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    opacity: 0.8,
  },
  balanceValue: {
    color: colors.primaryForeground,
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  pendingText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  transactionsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  transactionDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  transactionStatus: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  infoCard: {
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  infoText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
});
