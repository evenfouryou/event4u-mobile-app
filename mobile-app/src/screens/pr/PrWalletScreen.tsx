import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, gradients } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { triggerHaptic } from '@/lib/haptics';

interface WalletInfo {
  id: string;
  balance: string;
  pendingPayout: string;
  totalEarned: string;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  description: string;
  status: string;
  createdAt: string;
}

interface PayoutRequest {
  id: string;
  amount: string;
  status: string;
  requestedAt: string;
  processedAt?: string;
}

type TabType = 'transazioni' | 'prelievi';

interface PrWalletScreenProps {
  onGoBack: () => void;
}

export function PrWalletScreen({ onGoBack }: PrWalletScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('transazioni');
  const [requestingPayout, setRequestingPayout] = useState(false);

  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      setWallet({
        id: '1',
        balance: '338.00',
        pendingPayout: '125.00',
        totalEarned: '1250.00',
        currency: 'EUR',
      });
      setTransactions([
        { id: '1', type: 'commission', amount: '24.00', description: 'Commissione biglietti - Saturday Night', status: 'completed', createdAt: new Date().toISOString() },
        { id: '2', type: 'bonus', amount: '50.00', description: 'Bonus obiettivo raggiunto', status: 'completed', createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', type: 'commission', amount: '36.00', description: 'Commissione biglietti - Techno Sunday', status: 'completed', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: '4', type: 'payout', amount: '200.00', description: 'Prelievo su conto', status: 'completed', createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
      ]);
      setPayoutRequests([
        { id: '1', amount: '200.00', status: 'completed', requestedAt: new Date(Date.now() - 86400000 * 7).toISOString(), processedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
      ]);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRequestPayout = async () => {
    const balance = parseFloat(wallet?.balance || '0');
    if (balance < 50) {
      Alert.alert('Saldo insufficiente', 'Il saldo minimo per il prelievo è €50.00');
      return;
    }

    try {
      setRequestingPayout(true);
      triggerHaptic('success');
      // API call here
      Alert.alert('Richiesta inviata!', 'La tua richiesta di pagamento è stata inviata.');
      await loadData();
    } catch (error) {
      Alert.alert('Errore', 'Impossibile inviare la richiesta.');
    } finally {
      setRequestingPayout(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'commission':
      case 'earning':
        return { name: 'trending-up', color: '#10B981' };
      case 'payout':
      case 'withdrawal':
        return { name: 'send', color: '#3B82F6' };
      case 'bonus':
      case 'reward':
        return { name: 'gift', color: '#F59E0B' };
      case 'refund':
        return { name: 'arrow-down', color: '#F97316' };
      default:
        return { name: 'receipt', color: colors.mutedForeground };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <Badge variant="success">Completato</Badge>;
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'processing':
        return <Badge variant="info">In elaborazione</Badge>;
      case 'rejected':
      case 'failed':
        return <Badge variant="destructive">Rifiutato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const balance = parseFloat(wallet?.balance || '0');
  const pendingPayout = parseFloat(wallet?.pendingPayout || '0');
  const totalEarned = parseFloat(wallet?.totalEarned || '0');
  const canRequestPayout = balance >= 50;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onGoBack();
          }}
          style={styles.backButton}
          testID="button-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={styles.title}>Wallet</Text>
          <Text style={styles.subtitle}>Gestisci i tuoi guadagni</Text>
        </View>
      </View>

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
        {/* Balance Card */}
        <LinearGradient
          colors={gradients.creditCard}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          <View style={styles.balanceHeader}>
            <View style={styles.balanceHeaderLeft}>
              <Ionicons name="wallet" size={24} color="rgba(255,255,255,0.8)" />
              <Text style={styles.balanceLabel}>PR Wallet</Text>
            </View>
            <View style={styles.balanceHeaderRight}>
              <Ionicons name="star" size={14} color={colors.golden} />
            </View>
          </View>

          <View style={styles.balanceMain}>
            <Text style={styles.balanceTitle}>Saldo disponibile</Text>
            <Text style={styles.balanceValue}>€{balance.toFixed(2)}</Text>
          </View>

          <View style={styles.balanceStats}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>In attesa</Text>
              <Text style={styles.balanceStatValue}>€{pendingPayout.toFixed(2)}</Text>
            </View>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>Totale guadagnato</Text>
              <Text style={styles.balanceStatValue}>€{totalEarned.toFixed(2)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Request Payout Button */}
        <Button
          variant="primary"
          size="lg"
          style={styles.payoutButton}
          onPress={handleRequestPayout}
          disabled={!canRequestPayout || requestingPayout}
          testID="button-request-payout"
        >
          <Ionicons name="send" size={20} color={colors.primaryForeground} />
          <Text style={styles.payoutButtonText}>
            {requestingPayout ? 'Invio in corso...' : 'Richiedi Pagamento'}
          </Text>
        </Button>
        {!canRequestPayout && (
          <Text style={styles.payoutNote}>Saldo minimo per il prelievo: €50.00</Text>
        )}

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <LinearGradient colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']} style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#10B981" />
            <Text style={styles.statValue}>
              {transactions.filter(t => t.type === 'commission' || t.type === 'earning').length}
            </Text>
            <Text style={styles.statLabel}>Commissioni</Text>
          </LinearGradient>
          <LinearGradient colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']} style={styles.statCard}>
            <Ionicons name="gift" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>
              {transactions.filter(t => t.type === 'bonus' || t.type === 'reward').length}
            </Text>
            <Text style={styles.statLabel}>Bonus</Text>
          </LinearGradient>
          <LinearGradient colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)']} style={styles.statCard}>
            <Ionicons name="send" size={24} color="#3B82F6" />
            <Text style={styles.statValue}>
              {payoutRequests.filter(p => p.status === 'completed' || p.status === 'paid').length}
            </Text>
            <Text style={styles.statLabel}>Prelievi</Text>
          </LinearGradient>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setActiveTab('transazioni');
            }}
            style={[styles.tab, activeTab === 'transazioni' && styles.tabActive]}
            testID="tab-transactions"
          >
            <Ionicons
              name="time"
              size={18}
              color={activeTab === 'transazioni' ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.tabLabel, activeTab === 'transazioni' && styles.tabLabelActive]}>
              Transazioni
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setActiveTab('prelievi');
            }}
            style={[styles.tab, activeTab === 'prelievi' && styles.tabActive]}
            testID="tab-payouts"
          >
            <Ionicons
              name="cash"
              size={18}
              color={activeTab === 'prelievi' ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.tabLabel, activeTab === 'prelievi' && styles.tabLabelActive]}>
              Prelievi
            </Text>
          </Pressable>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'transazioni' && (
            <Card style={styles.listCard}>
              <View style={styles.listHeader}>
                <Ionicons name="receipt" size={20} color={colors.primary} />
                <Text style={styles.listTitle}>Storico Transazioni</Text>
              </View>
              {transactions.length > 0 ? (
                transactions.map(transaction => {
                  const icon = getTransactionIcon(transaction.type);
                  const isOutgoing = transaction.type === 'payout' || transaction.type === 'withdrawal';
                  return (
                    <View key={transaction.id} style={styles.listItem} testID={`transaction-${transaction.id}`}>
                      <View style={[styles.listItemIcon, { backgroundColor: `${icon.color}20` }]}>
                        <Ionicons name={icon.name as any} size={18} color={icon.color} />
                      </View>
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>{transaction.description}</Text>
                        <Text style={styles.listItemSub}>
                          {formatDate(transaction.createdAt)} • {formatTime(transaction.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.listItemRight}>
                        <Text style={[styles.listItemAmount, { color: isOutgoing ? '#3B82F6' : '#10B981' }]}>
                          {isOutgoing ? '-' : '+'}€{parseFloat(transaction.amount).toFixed(2)}
                        </Text>
                        {getStatusBadge(transaction.status)}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
                  <Text style={styles.emptyTitle}>Nessuna transazione</Text>
                  <Text style={styles.emptyText}>Le tue transazioni appariranno qui</Text>
                </View>
              )}
            </Card>
          )}

          {activeTab === 'prelievi' && (
            <Card style={styles.listCard}>
              <View style={styles.listHeader}>
                <Ionicons name="cash" size={20} color={colors.primary} />
                <Text style={styles.listTitle}>Richieste di Prelievo</Text>
              </View>
              {payoutRequests.length > 0 ? (
                payoutRequests.map(payout => (
                  <View key={payout.id} style={styles.listItem} testID={`payout-${payout.id}`}>
                    <View style={[styles.listItemIcon, {
                      backgroundColor: payout.status === 'completed' || payout.status === 'paid'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : payout.status === 'pending'
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(148, 163, 184, 0.2)'
                    }]}>
                      <Ionicons
                        name={
                          payout.status === 'completed' || payout.status === 'paid'
                            ? 'checkmark-circle'
                            : payout.status === 'pending'
                            ? 'time'
                            : 'close-circle'
                        }
                        size={18}
                        color={
                          payout.status === 'completed' || payout.status === 'paid'
                            ? '#10B981'
                            : payout.status === 'pending'
                            ? '#F59E0B'
                            : colors.destructive
                        }
                      />
                    </View>
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle}>€{parseFloat(payout.amount).toFixed(2)}</Text>
                      <Text style={styles.listItemSub}>Richiesto il {formatDate(payout.requestedAt)}</Text>
                    </View>
                    <View style={styles.listItemRight}>
                      {getStatusBadge(payout.status)}
                      {payout.processedAt && (
                        <Text style={styles.processedDate}>
                          Processato il {formatDate(payout.processedAt)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="cash-outline" size={48} color={colors.mutedForeground} />
                  <Text style={styles.emptyTitle}>Nessuna richiesta</Text>
                  <Text style={styles.emptyText}>Le tue richieste di prelievo appariranno qui</Text>
                </View>
              )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  balanceCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.md,
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  balanceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  balanceHeaderRight: {},
  balanceLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  balanceMain: {
    marginBottom: spacing.lg,
  },
  balanceTitle: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.xs,
  },
  balanceValue: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '700',
    color: '#ffffff',
  },
  balanceStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  balanceStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  balanceStatLabel: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.xs,
  },
  balanceStatValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#ffffff',
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  payoutButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  payoutNote: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.background,
  },
  tabLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabContent: {},
  listCard: {
    padding: spacing.md,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.foreground,
  },
  listItemSub: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  listItemRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  listItemAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  processedDate: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
});
