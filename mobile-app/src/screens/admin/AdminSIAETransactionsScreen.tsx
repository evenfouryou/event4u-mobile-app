import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAETransaction } from '@/lib/api';

interface AdminSIAETransactionsScreenProps {
  onBack: () => void;
}

type FilterType = 'all' | 'sale' | 'refund' | 'cancellation';

export function AdminSIAETransactionsScreen({ onBack }: AdminSIAETransactionsScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [transactions, setTransactions] = useState<SIAETransaction[]>([]);

  useEffect(() => {
    loadTransactions();
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

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAETransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading SIAE transactions:', error);
      Alert.alert('Errore', 'Impossibile caricare le transazioni SIAE');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const getTypeConfig = (type: SIAETransaction['type']) => {
    const config = {
      sale: { icon: 'cart-outline' as const, label: 'Vendita', color: staticColors.teal },
      refund: { icon: 'arrow-undo-outline' as const, label: 'Rimborso', color: staticColors.destructive },
      cancellation: { icon: 'close-circle-outline' as const, label: 'Annullamento', color: staticColors.golden },
    };
    return config[type] || config.sale;
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.ticketCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.fiscalSeal.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    return matchesSearch && transaction.type === activeFilter;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Tutte' },
    { key: 'sale', label: 'Vendite' },
    { key: 'refund', label: 'Rimborsi' },
    { key: 'cancellation', label: 'Annullamenti' },
  ];

  const renderTransactionCard = ({ item }: { item: SIAETransaction }) => {
    const typeConfig = getTypeConfig(item.type);
    const isRefund = item.type === 'refund' || item.type === 'cancellation';
    
    return (
      <Card style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={[styles.typeIcon, { backgroundColor: typeConfig.color + '20' }]}>
            <Ionicons name={typeConfig.icon} size={20} color={typeConfig.color} />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={[styles.ticketCode, { color: colors.foreground }]}>
              {item.ticketCode}
            </Text>
            <Text style={[styles.eventName, { color: colors.mutedForeground }]}>
              {item.eventName}
            </Text>
          </View>
          <Badge variant="default" size="sm">
            {typeConfig.label}
          </Badge>
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              Sigillo: {item.fiscalSeal}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              {new Date(item.transactionDate).toLocaleString('it-IT')}
            </Text>
          </View>
        </View>

        <View style={styles.transactionFooter}>
          <Text style={[styles.amount, { color: isRefund ? staticColors.destructive : staticColors.golden }]}>
            {isRefund ? '-' : '+'}€{Math.abs(item.amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </Card>
    );
  };

  const styles = createStyles(colors, insets);

  if (showLoader) {
    return <Loading text="Caricamento transazioni..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Transazioni SIAE"
        onBack={onBack}
        testID="header-admin-siae-transactions"
      />

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca transazione..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-transactions"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        {filters.map(filter => (
          <Pressable
            key={filter.key}
            style={[
              styles.filterChip,
              { 
                backgroundColor: activeFilter === filter.key ? staticColors.primary : colors.card,
                borderColor: activeFilter === filter.key ? staticColors.primary : colors.border,
              }
            ]}
            onPress={() => {
              triggerHaptic('light');
              setActiveFilter(filter.key);
            }}
            testID={`filter-${filter.key}`}
          >
            <Text style={[
              styles.filterText,
              { color: activeFilter === filter.key ? '#000000' : colors.mutedForeground }
            ]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.statsHeader}>
        <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
          {filteredTransactions.length} transazioni trovate
        </Text>
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransactionCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={staticColors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="swap-horizontal-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna Transazione</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Non ci sono transazioni che corrispondono alla ricerca
            </Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: insets.bottom + spacing.xl,
  },
  transactionCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  ticketCode: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventName: {
    fontSize: 13,
  },
  transactionDetails: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: 13,
  },
  transactionFooter: {
    alignItems: 'flex-end',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
