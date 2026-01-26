import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { PrWallet, PrTransaction } from '@/lib/api';

interface PRWalletScreenProps {
  onGoBack: () => void;
  onRequestPayout: () => void;
}

export function PRWalletScreen({ onGoBack, onRequestPayout }: PRWalletScreenProps) {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [wallet, setWallet] = useState<PrWallet | null>(null);
  const [transactions, setTransactions] = useState<PrTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [walletData, txData] = await Promise.all([
        api.getPrWallet().catch(() => null),
        api.getPrTransactions().catch(() => []),
      ]);
      setWallet(walletData);
      setTransactions(txData);
    } catch (error) {
      console.error('Error loading PR wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'commission':
        return 'trending-up';
      case 'payout':
        return 'arrow-down-circle';
      case 'bonus':
        return 'gift';
      default:
        return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) return staticColors.teal;
    return staticColors.destructive;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return <Loading text="Caricamento wallet..." />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onGoBack();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={staticColors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Wallet PR</Text>
        <View style={{ width: 40 }} />
      </View>

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
        <LinearGradient
          colors={gradients.creditCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Saldo Disponibile</Text>
            <Badge variant="golden">
              <Text style={styles.prBadgeText}>PR WALLET</Text>
            </Badge>
          </View>
          <Text style={styles.balanceValue}>€{(wallet?.balance || 0).toFixed(2)}</Text>
          <View style={styles.balanceFooter}>
            <View style={styles.pendingInfo}>
              <Ionicons name="time-outline" size={16} color={staticColors.mutedForeground} />
              <Text style={styles.pendingText}>
                In attesa: €{(wallet?.pendingBalance || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color={staticColors.teal} />
            <Text style={styles.statValue}>€{(wallet?.totalEarnings || 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>Totale Guadagnato</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="arrow-down-circle" size={24} color={staticColors.primary} />
            <Text style={styles.statValue}>€{(wallet?.totalPaidOut || 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>Totale Prelevato</Text>
          </Card>
        </View>

        {(wallet?.balance || 0) >= 50 && (
          <Pressable
            onPress={() => {
              triggerHaptic('medium');
              onRequestPayout();
            }}
          >
            <LinearGradient
              colors={gradients.golden}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.payoutButton}
            >
              <Ionicons name="cash-outline" size={20} color={staticColors.primaryForeground} />
              <Text style={styles.payoutButtonText}>Richiedi Prelievo</Text>
            </LinearGradient>
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>Cronologia</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={staticColors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna transazione</Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <Card key={tx.id} style={styles.transactionCard}>
              <View style={styles.transactionIcon}>
                <Ionicons
                  name={getTransactionIcon(tx.type) as any}
                  size={20}
                  color={getTransactionColor(tx.type, tx.amount)}
                />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDesc}>{tx.description}</Text>
                <Text style={styles.transactionDate}>{formatDate(tx.createdAt)}</Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  { color: getTransactionColor(tx.type, tx.amount) },
                ]}
              >
                {tx.amount > 0 ? '+' : ''}€{Math.abs(tx.amount).toFixed(2)}
              </Text>
            </Card>
          ))
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  balanceCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  balanceLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  prBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: staticColors.primaryForeground,
  },
  balanceValue: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pendingText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  payoutButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.md,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  transactionDesc: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  transactionDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  transactionAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});
