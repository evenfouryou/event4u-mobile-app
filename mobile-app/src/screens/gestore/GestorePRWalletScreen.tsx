import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { PRWalletData, PRWalletTransaction } from '@/lib/api';

interface GestorePRWalletScreenProps {
  onBack: () => void;
}

export function GestorePRWalletScreen({ onBack }: GestorePRWalletScreenProps) {
  const { colors } = useTheme();
  const [walletData, setWalletData] = useState<PRWalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadWalletData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getGestorePRWallet();
      setWalletData(data);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      setWalletData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const handleRequestPayout = async () => {
    if (!walletData || walletData.balance <= 0 || isRequestingPayout) return;
    
    try {
      triggerHaptic('medium');
      setIsRequestingPayout(true);
      await api.requestGestorePRPayout();
      triggerHaptic('success');
      await loadWalletData();
    } catch (error) {
      console.error('Error requesting payout:', error);
      triggerHaptic('error');
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'commission':
        return 'trending-up';
      case 'payout':
        return 'wallet-outline';
      case 'bonus':
        return 'gift-outline';
      default:
        return 'cash-outline';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'commission':
        return colors.success || '#22c55e';
      case 'payout':
        return colors.warning || '#f59e0b';
      case 'bonus':
        return colors.primary;
      default:
        return colors.mutedForeground;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'commission':
        return 'Commissione';
      case 'payout':
        return 'Prelievo';
      case 'bonus':
        return 'Bonus';
      default:
        return type;
    }
  };

  const renderTransaction = ({ item }: { item: PRWalletTransaction }) => (
    <Card style={styles.transactionCard} testID={`transaction-${item.id}`}>
      <View style={styles.transactionContent}>
        <View style={[styles.transactionIcon, { backgroundColor: `${getTransactionColor(item.type)}20` }]}>
          <Ionicons 
            name={getTransactionIcon(item.type) as any} 
            size={20} 
            color={getTransactionColor(item.type)} 
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <View style={styles.transactionMeta}>
            <Badge variant={item.type === 'commission' ? 'success' : item.type === 'bonus' ? 'default' : 'secondary'}>
              {getTransactionLabel(item.type)}
            </Badge>
            <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <Text style={[
          styles.transactionAmount,
          { color: item.type === 'payout' ? colors.warning || '#f59e0b' : colors.success || '#22c55e' }
        ]}>
          {item.type === 'payout' ? '-' : '+'}{formatCurrency(Math.abs(item.amount))}
        </Text>
      </View>
    </Card>
  );

  const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: number; color?: string }) => (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color || colors.primary}20` }]}>
        <Ionicons name={icon as any} size={20} color={color || colors.primary} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : {}]}>{formatCurrency(value)}</Text>
    </Card>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-pr-wallet"
      />

      {showLoader ? (
        <Loading text="Caricamento wallet..." />
      ) : walletData ? (
        <FlatList
          data={walletData.transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerSection}>
              <Text style={styles.screenTitle}>Wallet PR</Text>
              <Text style={styles.screenSubtitle}>Gestisci le commissioni dei PR</Text>

              <View style={styles.statsGrid}>
                <StatCard 
                  icon="wallet" 
                  label="Saldo Disponibile" 
                  value={walletData.balance}
                  color={colors.primary}
                />
                <StatCard 
                  icon="trending-up" 
                  label="Guadagni Totali" 
                  value={walletData.totalEarnings}
                  color={colors.success || '#22c55e'}
                />
                <StatCard 
                  icon="time-outline" 
                  label="In Attesa" 
                  value={walletData.pending}
                  color={colors.warning || '#f59e0b'}
                />
                <StatCard 
                  icon="checkmark-circle" 
                  label="Prelevato" 
                  value={walletData.withdrawn}
                  color={colors.mutedForeground}
                />
              </View>

              {walletData.balance > 0 && (
                <Pressable
                  style={[styles.payoutButton, isRequestingPayout && styles.payoutButtonDisabled]}
                  onPress={handleRequestPayout}
                  disabled={isRequestingPayout}
                  testID="button-request-payout"
                >
                  <Ionicons name="download-outline" size={20} color={staticColors.primaryForeground} />
                  <Text style={styles.payoutButtonText}>
                    {isRequestingPayout ? 'Richiesta in corso...' : 'Richiedi Prelievo'}
                  </Text>
                </Pressable>
              )}

              <Text style={styles.sectionTitle}>Storico Transazioni</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>Nessuna transazione</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="wallet-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Wallet non disponibile</Text>
          <Text style={styles.emptyText}>Impossibile caricare i dati del wallet</Text>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerSection: {
    marginBottom: spacing.md,
  },
  screenTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  screenSubtitle: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '47%',
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: staticColors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  payoutButtonDisabled: {
    opacity: 0.6,
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
    marginBottom: spacing.sm,
  },
  transactionCard: {
    padding: spacing.md,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
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
    marginBottom: spacing.xs,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  transactionDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  transactionAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default GestorePRWalletScreen;
