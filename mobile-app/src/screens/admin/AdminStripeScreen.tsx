import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { StripeTransactionData, StripeModeResponse } from '@/lib/api';

interface AdminStripeScreenProps {
  onBack: () => void;
}

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  testID: string;
}

export function AdminStripeScreen({ onBack }: AdminStripeScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<StripeTransactionData[]>([]);
  const [stripeMode, setStripeMode] = useState<StripeModeResponse>({ mode: 'sandbox', isProduction: false });
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'pending' | 'failed' | 'refunded'>('all');

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [txData, modeData] = await Promise.all([
        api.getStripeTransactions(),
        api.getStripeMode(),
      ]);
      setTransactions(txData);
      setStripeMode(modeData);
    } catch (error) {
      console.error('Error loading stripe data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredTransactions = transactions.filter(t =>
    selectedStatus === 'all' || t.status === selectedStatus
  );

  const stats: StatCard[] = [
    {
      label: 'Ricavi Totali',
      value: `€${transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.totalAmount || 0), 0)
        .toFixed(2)}`,
      icon: 'cash',
      color: staticColors.golden,
      testID: 'stat-total-revenue',
    },
    {
      label: 'Ricavi Oggi',
      value: `€${transactions
        .filter(t => {
          if (t.status !== 'completed' || !t.createdAt) return false;
          const txDate = new Date(t.createdAt);
          txDate.setHours(0, 0, 0, 0);
          return txDate.getTime() === today.getTime();
        })
        .reduce((sum, t) => sum + Number(t.totalAmount || 0), 0)
        .toFixed(2)}`,
      icon: 'today',
      color: staticColors.primary,
      testID: 'stat-today-revenue',
    },
    {
      label: 'Transazioni OK',
      value: transactions.filter(t => t.status === 'completed').length,
      icon: 'checkmark-circle',
      color: staticColors.success,
      testID: 'stat-successful',
    },
    {
      label: 'Transazioni Fallite',
      value: transactions.filter(t => t.status === 'failed').length,
      icon: 'close-circle',
      color: staticColors.destructive,
      testID: 'stat-failed',
    },
    {
      label: 'Pagamenti In Sospeso',
      value: `€${transactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + Number(t.totalAmount || 0), 0)
        .toFixed(2)}`,
      icon: 'clock',
      color: staticColors.warning,
      testID: 'stat-pending',
    },
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Completato', variant: 'success' as const };
      case 'pending':
        return { label: 'In Sospeso', variant: 'warning' as const };
      case 'failed':
        return { label: 'Fallito', variant: 'destructive' as const };
      case 'refunded':
        return { label: 'Rimborsato', variant: 'secondary' as const };
      default:
        return { label: status, variant: 'secondary' as const };
    }
  };

  const renderStatCard = (stat: StatCard) => (
    <Card key={stat.testID} style={styles.statCard} testID={`card-${stat.testID}`}>
      <View style={styles.statContent}>
        <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
          <Ionicons name={stat.icon as any} size={24} color={stat.color} />
        </View>
        <View style={styles.statText}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          <Text style={[styles.statValue, { color: colors.foreground, fontWeight: '700' }]}>
            {stat.value}
          </Text>
        </View>
      </View>
    </Card>
  );

  const renderTransactionCard = ({ item }: { item: StripeTransactionData }) => {
    const statusConfig = getStatusConfig(item.status);
    const formattedDate = new Date(item.createdAt).toLocaleDateString('it-IT', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Card style={styles.transactionCard} testID={`card-transaction-${item.id}`}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text style={[styles.transactionCode, { color: colors.foreground, fontWeight: '600' }]}>
              {item.transactionCode}
            </Text>
            <Text style={[styles.transactionDate, { color: colors.mutedForeground }]}>
              {formattedDate}
            </Text>
          </View>
          <Badge variant={statusConfig.variant} size="sm">
            {statusConfig.label}
          </Badge>
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Importo:</Text>
            <Text style={[styles.detailValue, { color: colors.foreground, fontWeight: '600' }]}>
              €{Number(item.totalAmount).toFixed(2)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Biglietti:</Text>
            <Text style={[styles.detailValue, { color: colors.foreground, fontWeight: '600' }]}>
              {item.ticketsCount}
            </Text>
          </View>
          {item.paymentMethod && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Pagamento:</Text>
              <Text style={[styles.detailValue, { color: colors.foreground, fontWeight: '600' }]}>
                {item.paymentMethod}
              </Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const filterOptions = [
    { key: 'all' as const, label: 'Tutte' },
    { key: 'completed' as const, label: 'Completate' },
    { key: 'pending' as const, label: 'In Sospeso' },
    { key: 'failed' as const, label: 'Fallite' },
    { key: 'refunded' as const, label: 'Rimborsate' },
  ];

  if (showLoader) {
    return <Loading text="Caricamento dati Stripe..." />;
  }

  const styles_ = createStyles(colors, insets);

  return (
    <View style={[styles_.container, { backgroundColor: colors.background }]}>
      <Header
        title="Stripe"
        subtitle="Gestione Pagamenti"
        showBack
        onBack={onBack}
        testID="header-admin-stripe"
      />

      <ScrollView
        style={styles_.scrollView}
        contentContainerStyle={styles_.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={staticColors.primary} />
        }
      >
        {/* Stripe Mode Indicator */}
        <Card style={styles_.modeCard}>
          <View style={styles_.modeContent}>
            <View
              style={[
                styles_.modeIcon,
                {
                  backgroundColor: stripeMode.isProduction
                    ? staticColors.success + '20'
                    : staticColors.warning + '20',
                },
              ]}
            >
              <Ionicons
                name={stripeMode.isProduction ? 'checkmark-circle' : 'alert-circle'}
                size={24}
                color={stripeMode.isProduction ? staticColors.success : staticColors.warning}
              />
            </View>
            <View style={styles_.modeText}>
              <Text style={[styles_.modeLabel, { color: colors.mutedForeground }]}>Connessione Stripe</Text>
              <Badge
                variant={stripeMode.isProduction ? 'success' : 'warning'}
                size="sm"
                style={styles_.modeBadge}
              >
                {stripeMode.isProduction ? 'Produzione' : 'Sandbox'}
              </Badge>
            </View>
          </View>
        </Card>

        {/* Stats Cards */}
        <View style={styles_.statsContainer}>
          {stats.map(renderStatCard)}
        </View>

        {/* Filter Buttons */}
        <View style={styles_.filterContainer}>
          {filterOptions.map(filter => (
            <Pressable
              key={filter.key}
              style={[
                styles_.filterChip,
                {
                  backgroundColor:
                    selectedStatus === filter.key ? staticColors.primary : colors.card,
                  borderColor: selectedStatus === filter.key ? staticColors.primary : colors.border,
                },
              ]}
              onPress={() => {
                triggerHaptic('light');
                setSelectedStatus(filter.key);
              }}
              testID={`filter-${filter.key}`}
            >
              <Text
                style={[
                  styles_.filterText,
                  {
                    color: selectedStatus === filter.key ? '#FFFFFF' : colors.foreground,
                    fontWeight: '500',
                  },
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Transaction Count */}
        <View style={styles_.countContainer}>
          <Text style={[styles_.countText, { color: colors.mutedForeground }]}>
            {filteredTransactions.length} transazion{filteredTransactions.length !== 1 ? 'i' : 'e'} trovate
          </Text>
        </View>

        {/* Transactions List */}
        {filteredTransactions.length > 0 ? (
          <FlatList
            data={filteredTransactions.sort((a, b) => {
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA;
            })}
            renderItem={renderTransactionCard}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            style={styles_.transactionList}
            testID="list-transactions"
          />
        ) : (
          <View style={styles_.emptyState}>
            <Ionicons name="swap-horizontal-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles_.emptyTitle, { color: colors.foreground, fontWeight: '600' }]}>
              Nessuna Transazione
            </Text>
            <Text style={[styles_.emptyText, { color: colors.mutedForeground }]}>
              Non ci sono transazioni che corrispondono ai filtri selezionati
            </Text>
          </View>
        )}

        <View style={styles_.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      paddingBottom: insets.bottom + spacing.xl,
    },
    modeCard: {
      marginBottom: spacing.lg,
      padding: spacing.md,
    },
    modeContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    modeIcon: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeText: {
      flex: 1,
      gap: spacing.xs,
    },
    modeLabel: {
      fontSize: typography.fontSize.sm,
      fontWeight: '500',
    },
    modeBadge: {
      alignSelf: 'flex-start',
    },
    statsContainer: {
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    statCard: {
      padding: spacing.md,
    },
    statContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    statIcon: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statText: {
      flex: 1,
    },
    statLabel: {
      fontSize: typography.fontSize.sm,
      marginBottom: spacing.xs,
    },
    statValue: {
      fontSize: typography.fontSize.lg,
    },
    filterContainer: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
      flexWrap: 'wrap',
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      borderWidth: 1,
    },
    filterText: {
      fontSize: typography.fontSize.sm,
    },
    countContainer: {
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.md,
    },
    countText: {
      fontSize: typography.fontSize.sm,
      fontWeight: '500',
    },
    transactionList: {
      marginBottom: spacing.md,
    },
    transactionCard: {
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    transactionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    transactionInfo: {
      flex: 1,
      marginRight: spacing.md,
    },
    transactionCode: {
      fontSize: typography.fontSize.base,
      marginBottom: spacing.xs,
    },
    transactionDate: {
      fontSize: typography.fontSize.sm,
    },
    transactionDetails: {
      gap: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: typography.fontSize.sm,
    },
    detailValue: {
      fontSize: typography.fontSize.sm,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl * 2,
    },
    emptyTitle: {
      fontSize: typography.fontSize.lg,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    emptyText: {
      fontSize: typography.fontSize.sm,
      textAlign: 'center',
    },
    bottomSpacing: {
      height: spacing.xl,
    },
  });

export default AdminStripeScreen;
