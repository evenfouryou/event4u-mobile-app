import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
// Note: uses staticColors for StyleSheet
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { triggerHaptic } from '@/lib/haptics';
import api, { Wallet, WalletTransaction } from '@/lib/api';

interface Transaction {
  id: string;
  type: 'topup' | 'purchase' | 'refund';
  description: string;
  amount: number;
  date: Date;
}

interface WalletScreenProps {
  onBack: () => void;
  onTopUp: () => void;
}

export function WalletScreen({ onBack, onTopUp }: WalletScreenProps) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'topup'>('transactions');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [walletData, transactionsData] = await Promise.all([
        api.getWallet(),
        api.getWalletTransactions(50),
      ]);
      setWallet(walletData);
      setTransactions(transactionsData.transactions || []);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const balance = wallet?.balance || 0;
  const topUpOptions = [10, 25, 50, 100, 200];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'topup':
      case 'credit':
        return 'arrow-down-circle';
      case 'purchase':
      case 'debit':
        return 'cart';
      case 'refund':
        return 'return-up-back';
      default:
        return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'topup':
      case 'credit':
      case 'refund':
        return staticColors.success;
      case 'purchase':
      case 'debit':
        return staticColors.foreground;
      default:
        return staticColors.teal;
    }
  };

  const renderTransaction = ({ item, index }: { item: WalletTransaction; index: number }) => (
    <View>
      <View style={styles.transactionItem}>
        <View style={[styles.transactionIcon, { backgroundColor: `${getTransactionColor(item.type)}15` }]}>
          <Ionicons
            name={getTransactionIcon(item.type) as any}
            size={20}
            color={getTransactionColor(item.type)}
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={styles.transactionDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: item.amount >= 0 ? staticColors.success : staticColors.foreground },
          ]}
        >
          {item.amount >= 0 ? '+' : ''}€{Math.abs(item.amount).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-wallet" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={staticColors.primary}
          />
        }
      >
        <View>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceHeader}>
              <View style={styles.walletIcon}>
                <Ionicons name="wallet" size={28} color={staticColors.primaryForeground} />
              </View>
              <Text style={styles.balanceLabel}>Saldo Disponibile</Text>
            </View>
            <Text style={styles.balanceValue}>€ {balance.toFixed(2)}</Text>
            <Button
              variant="secondary"
              size="lg"
              onPress={onTopUp}
              style={styles.topUpButton}
              textStyle={{ color: staticColors.primary }}
              testID="button-topup"
            >
              <View style={styles.topUpButtonContent}>
                <Ionicons name="add-circle" size={20} color={staticColors.primary} />
                <Text style={styles.topUpButtonText}>Ricarica</Text>
              </View>
            </Button>
          </LinearGradient>
        </View>

        <View>
          <View style={styles.quickTopUp}>
            <Text style={styles.sectionTitle}>Ricarica Rapida</Text>
            <View style={styles.topUpGrid}>
              {topUpOptions.map((amount) => (
                <Pressable
                  key={amount}
                  onPress={() => {
                    triggerHaptic('medium');
                    onTopUp();
                  }}
                  style={styles.topUpOption}
                >
                  <Text style={styles.topUpAmount}>€{amount}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Movimenti</Text>
          </View>

          <Card style={styles.transactionsCard}>
            {transactions.length > 0 ? (
              transactions.map((item, index) => (
                <View key={item.id}>
                  {renderTransaction({ item, index })}
                  {index < transactions.length - 1 && <View style={styles.transactionDivider} />}
                </View>
              ))
            ) : (
              <View style={styles.emptyTransactions}>
                <Ionicons name="receipt-outline" size={48} color={staticColors.mutedForeground} />
                <Text style={styles.emptyText}>Nessun movimento</Text>
              </View>
            )}
          </Card>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={20} color={staticColors.success} />
            <Text style={styles.infoText}>
              Il tuo saldo è protetto e sicuro
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="flash" size={20} color={staticColors.primary} />
            <Text style={styles.infoText}>
              Paga più velocemente con il Wallet
            </Text>
          </View>
        </View>
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  balanceCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.golden,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: typography.fontSize.base,
    color: 'rgba(0,0,0,0.7)',
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: '800',
    color: staticColors.primaryForeground,
    marginBottom: spacing.lg,
  },
  topUpButton: {
    backgroundColor: 'white',
  },
  topUpButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topUpButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primary,
  },
  quickTopUp: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  topUpGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topUpOption: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  topUpAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  transactionsHeader: {
    marginBottom: spacing.md,
  },
  transactionsCard: {
    padding: spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  transactionDate: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  transactionDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.xs,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    marginTop: spacing.md,
  },
  infoSection: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
});

export default WalletScreen;
