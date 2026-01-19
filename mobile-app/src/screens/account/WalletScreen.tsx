import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ['/api/public/account/wallet'],
    queryFn: () => api.get<WalletData>('/api/public/account/wallet'),
  });

  const { data: transactionsData, isLoading: transactionsLoading, refetch: refetchTransactions, isRefetching } = useQuery({
    queryKey: ['/api/public/account/wallet/transactions'],
    queryFn: () => api.get<{ transactions: Transaction[] }>('/api/public/account/wallet/transactions'),
  });
  
  const transactions = transactionsData?.transactions || [];

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
    <View style={styles.transactionItem} testID={`transaction-item-${item.id}`}>
      <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(item.type, item.status) + '20' }]}>
        <Ionicons 
          name={getTransactionIcon(item.type, item.status)} 
          size={20} 
          color={getTransactionColor(item.type, item.status)} 
        />
      </View>
      <View style={styles.transactionContent}>
        <Text style={styles.transactionDescription} testID={`text-transaction-description-${item.id}`}>
          {item.description}
        </Text>
        <Text style={styles.transactionDate} testID={`text-transaction-date-${item.id}`}>
          {item.date}
        </Text>
      </View>
      <View style={styles.transactionAmount}>
        <Text 
          style={[
            styles.transactionValue,
            { color: item.type === 'credit' ? colors.success : colors.foreground }
          ]}
          testID={`text-transaction-amount-${item.id}`}
        >
          {item.type === 'credit' ? '+' : '-'}€{Math.abs(item.amount).toFixed(2)}
        </Text>
        {item.status !== 'completed' && (
          <Text 
            style={[styles.transactionStatus, { color: getTransactionColor(item.type, item.status) }]}
            testID={`text-transaction-status-${item.id}`}
          >
            {item.status === 'pending' ? 'In attesa' : 'Fallito'}
          </Text>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer} testID="container-empty-transactions">
      <Ionicons name="receipt-outline" size={64} color={colors.mutedForeground} />
      <Text style={styles.emptyTitle} testID="text-empty-title">Nessun movimento</Text>
      <Text style={styles.emptySubtitle} testID="text-empty-subtitle">Le tue transazioni appariranno qui</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header 
        title="Wallet" 
        showBack 
        onBack={() => navigation.goBack()}
        testID="header-wallet"
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          isTablet && styles.contentTablet,
          isLandscape && styles.contentLandscape,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        testID="scroll-view-wallet"
      >
        <View style={[
          styles.contentWrapper,
          isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' },
        ]}>
          <Card style={styles.balanceCard} testID="card-balance">
            <Text style={styles.balanceLabel} testID="text-balance-label">Saldo disponibile</Text>
            <Text style={styles.balanceValue} testID="text-balance-value">
              €{(wallet?.balance || 0).toFixed(2)}
            </Text>
            
            {(wallet?.pendingBalance ?? 0) > 0 && (
              <View style={styles.pendingRow} testID="container-pending-balance">
                <Ionicons name="time-outline" size={16} color={colors.warning} />
                <Text style={styles.pendingText} testID="text-pending-balance">
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
                testID="button-recharge"
              />
              <Button
                title="Preleva"
                variant="outline"
                size="sm"
                onPress={() => {}}
                icon={<Ionicons name="arrow-up-outline" size={18} color={colors.foreground} />}
                style={styles.actionButton}
                testID="button-withdraw"
              />
            </View>
          </Card>

          <Card style={styles.transactionsCard} testID="card-transactions">
            <View style={styles.transactionsHeader}>
              <Text style={styles.sectionTitle} testID="text-transactions-title">Movimenti</Text>
            </View>

            {transactions && transactions.length > 0 ? (
              <View testID="list-transactions">
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

          <Card style={styles.infoCard} testID="card-info">
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle} testID="text-info-title">Come funziona il wallet?</Text>
                <Text style={styles.infoText} testID="text-info-description">
                  Il saldo wallet viene accreditato automaticamente quando vendi un biglietto. 
                  Puoi utilizzarlo per acquistare nuovi biglietti o prelevarlo sul tuo conto bancario.
                </Text>
              </View>
            </View>
          </Card>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  contentTablet: {
    paddingHorizontal: spacing.xl,
  },
  contentLandscape: {
    paddingHorizontal: spacing.lg,
  },
  contentWrapper: {
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
