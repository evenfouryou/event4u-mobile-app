import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { api } from '../../lib/api';

interface WalletData {
  balance: number;
  pendingBalance: number;
  currency: string;
  withdrawEnabled: boolean;
}

interface Transaction {
  id: string;
  type: 'credit' | 'debit' | 'pending' | 'refund';
  category: 'purchase' | 'sale' | 'topup' | 'withdrawal' | 'refund';
  description: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
}

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  purchase: 'ticket-outline',
  sale: 'pricetag-outline',
  topup: 'add-circle-outline',
  withdrawal: 'arrow-up-circle-outline',
  refund: 'refresh-outline',
};

const categoryLabels: Record<string, string> = {
  purchase: 'Acquisto',
  sale: 'Vendita',
  topup: 'Ricarica',
  withdrawal: 'Prelievo',
  refund: 'Rimborso',
};

interface TransactionItemProps {
  transaction: Transaction;
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const getTransactionColor = () => {
    if (transaction.status === 'pending') return colors.warning;
    if (transaction.status === 'failed') return colors.error;
    if (transaction.type === 'credit') return colors.success;
    return colors.textSecondary;
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

  const color = getTransactionColor();
  const icon = categoryIcons[transaction.category] || 'cash-outline';

  return (
    <TouchableOpacity style={styles.transactionItem} activeOpacity={0.7}>
      <View style={[styles.transactionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.transactionContent}>
        <Text style={styles.transactionDescription} numberOfLines={1}>
          {transaction.description}
        </Text>
        <View style={styles.transactionMeta}>
          <Text style={styles.transactionCategory}>
            {categoryLabels[transaction.category]}
          </Text>
          <Text style={styles.transactionDot}>•</Text>
          <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
        </View>
      </View>
      <View style={styles.transactionAmountContainer}>
        <Text style={[styles.transactionAmount, { color }]}>
          {transaction.type === 'credit' ? '+' : '-'}€{Math.abs(transaction.amount).toFixed(2)}
        </Text>
        {transaction.status !== 'completed' && (
          <Text style={[styles.transactionStatus, { color }]}>
            {transaction.status === 'pending' ? 'In attesa' : 'Fallito'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function EmptyTransactions() {
  return (
    <View style={styles.emptyTransactions}>
      <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
      <Text style={styles.emptyTitle}>Nessun movimento</Text>
      <Text style={styles.emptySubtitle}>
        I tuoi movimenti appariranno qui dopo il primo utilizzo
      </Text>
    </View>
  );
}

export function ClientWalletScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

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

  const handleAddFunds = () => {
    navigation.navigate('AddFunds');
  };

  const handleWithdraw = () => {
    navigation.navigate('Withdraw');
  };

  const balance = wallet?.balance || 0;
  const pendingBalance = wallet?.pendingBalance || 0;
  const withdrawEnabled = wallet?.withdrawEnabled ?? false;

  return (
    <View style={styles.container}>
      <Header
        title="Wallet"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Card variant="glass" style={styles.balanceCard}>
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)', 'transparent']}
            style={styles.balanceGradient}
          />
          <Text style={styles.balanceLabel}>Saldo disponibile</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.currencySymbol}>€</Text>
            <Text style={styles.balanceValue}>{balance.toFixed(2)}</Text>
          </View>

          {pendingBalance > 0 && (
            <View style={styles.pendingContainer}>
              <Ionicons name="time-outline" size={16} color={colors.warning} />
              <Text style={styles.pendingText}>
                €{pendingBalance.toFixed(2)} in attesa di conferma
              </Text>
            </View>
          )}

          <View style={styles.balanceActions}>
            <Button
              title="Ricarica"
              variant="primary"
              size="md"
              onPress={handleAddFunds}
              icon={<Ionicons name="add-outline" size={20} color={colors.primaryForeground} />}
              style={styles.actionButton}
            />
            {withdrawEnabled && (
              <Button
                title="Preleva"
                variant="outline"
                size="md"
                onPress={handleWithdraw}
                icon={<Ionicons name="arrow-up-outline" size={20} color={colors.foreground} />}
                style={styles.actionButton}
              />
            )}
          </View>
        </Card>

        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickAction} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="card-outline" size={22} color={colors.teal} />
            </View>
            <Text style={styles.quickActionLabel}>Metodi pagamento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="document-text-outline" size={22} color={colors.teal} />
            </View>
            <Text style={styles.quickActionLabel}>Storico completo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} activeOpacity={0.7}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="help-circle-outline" size={22} color={colors.teal} />
            </View>
            <Text style={styles.quickActionLabel}>Assistenza</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Movimenti recenti</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllLink}>Vedi tutti</Text>
            </TouchableOpacity>
          </View>

          <Card variant="default" style={styles.transactionsCard}>
            {transactionsLoading ? (
              <View style={styles.loadingTransactions}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={styles.skeletonTransaction}>
                    <View style={styles.skeletonIcon} />
                    <View style={styles.skeletonContent}>
                      <View style={styles.skeletonLine} />
                      <View style={styles.skeletonLineShort} />
                    </View>
                    <View style={styles.skeletonAmount} />
                  </View>
                ))}
              </View>
            ) : !transactions || transactions.length === 0 ? (
              <EmptyTransactions />
            ) : (
              <View>
                {transactions.slice(0, 10).map((transaction, index) => (
                  <View key={transaction.id}>
                    {index > 0 && <View style={styles.transactionDivider} />}
                    <TransactionItem transaction={transaction} />
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>

        <Card variant="default" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Transazioni sicure</Text>
              <Text style={styles.infoText}>
                Tutte le transazioni sono protette e criptate. Il tuo saldo è al sicuro.
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
    gap: spacing.lg,
  },
  balanceCard: {
    padding: spacing['2xl'],
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  balanceGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currencySymbol: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginTop: spacing.xs,
    marginRight: spacing.xs,
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: -1,
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    backgroundColor: colors.warning + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  pendingText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.medium,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.teal + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickActionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  transactionsSection: {
    gap: spacing.md,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  viewAllLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  transactionsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  loadingTransactions: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  skeletonTransaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
  },
  skeletonContent: {
    flex: 1,
    gap: spacing.xs,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: colors.muted,
    borderRadius: 4,
    width: '80%',
  },
  skeletonLineShort: {
    height: 12,
    backgroundColor: colors.muted,
    borderRadius: 4,
    width: '50%',
  },
  skeletonAmount: {
    width: 60,
    height: 16,
    backgroundColor: colors.muted,
    borderRadius: 4,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
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
    fontSize: fontSize.base,
    color: colors.foreground,
    fontWeight: fontWeight.medium,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  transactionCategory: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  transactionDot: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
  },
  transactionDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  transactionStatus: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  transactionDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginLeft: spacing.lg + 40 + spacing.md,
  },
  emptyTransactions: {
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  emptyTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  infoCard: {
    padding: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.xxs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
