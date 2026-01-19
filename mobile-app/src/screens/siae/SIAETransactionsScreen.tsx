import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

type FilterType = 'all' | 'sale' | 'refund' | 'void';

interface Transaction {
  id: number;
  transactionNumber: string;
  type: 'sale' | 'refund' | 'void';
  amount: number;
  ticketNumber: string;
  eventName: string;
  operatorName: string;
  createdAt: string;
  fiscalData: {
    receiptNumber: string;
    signed: boolean;
  };
}

export function SIAETransactionsScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('all');

  const numColumns = (isTablet || isLandscape) ? 2 : 1;

  const loadTransactions = async () => {
    try {
      const response = await api.get<any>('/api/siae/transactions');
      const data = response.transactions || response || [];
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const filteredTransactions = useMemo(() => {
    if (filterType === 'all') return transactions;
    return transactions.filter(t => t.type === filterType);
  }, [transactions, filterType]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale':
        return colors.success;
      case 'refund':
        return colors.warning;
      case 'void':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return 'add-circle';
      case 'refund':
        return 'arrow-undo-circle';
      case 'void':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sale':
        return 'Vendita';
      case 'refund':
        return 'Rimborso';
      case 'void':
        return 'Annullo';
      default:
        return type;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const renderFilterPill = (value: FilterType, label: string, isActive: boolean) => (
    <TouchableOpacity
      key={value}
      style={[styles.filterPill, isActive && styles.filterPillActive]}
      onPress={() => setFilterType(value)}
      activeOpacity={0.8}
      testID={`filter-${value}`}
    >
      <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTransaction = ({ item, index }: { item: Transaction; index: number }) => (
    <TouchableOpacity
      style={[
        styles.transactionCard,
        numColumns === 2 && {
          flex: 1,
          marginLeft: index % 2 === 1 ? spacing.sm : 0,
          marginRight: index % 2 === 0 ? spacing.sm : 0,
        }
      ]}
      onPress={() => navigation.navigate('SIAETransactionDetail', { transactionId: item.id })}
      activeOpacity={0.8}
      testID={`card-transaction-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.transactionRow}>
          <View style={[styles.typeIndicator, { backgroundColor: getTypeColor(item.type) }]} />
          <View style={styles.transactionInfo}>
            <View style={styles.transactionHeader}>
              <View style={styles.headerLeft}>
                <Ionicons 
                  name={getTypeIcon(item.type) as any} 
                  size={20} 
                  color={getTypeColor(item.type)} 
                />
                <Text style={styles.transactionNumber}>{item.transactionNumber}</Text>
              </View>
              <Text style={[styles.amount, { color: item.type === 'sale' ? colors.success : colors.destructive }]}>
                {item.type === 'sale' ? '+' : '-'}{formatCurrency(item.amount)}
              </Text>
            </View>
            
            <Text style={styles.ticketInfo}>Biglietto: {item.ticketNumber}</Text>
            <Text style={styles.eventName}>{item.eventName}</Text>
            
            <View style={styles.transactionFooter}>
              <View style={[styles.typeBadge, { backgroundColor: `${getTypeColor(item.type)}20` }]}>
                <Text style={[styles.typeText, { color: getTypeColor(item.type) }]}>
                  {getTypeLabel(item.type)}
                </Text>
              </View>
              {item.fiscalData.signed && (
                <View style={styles.signedBadge}>
                  <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                  <Text style={styles.signedText}>Firmato</Text>
                </View>
              )}
            </View>
            
            <View style={styles.metaRow}>
              <Text style={styles.operator}>{item.operatorName}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Transazioni Fiscali" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Transazioni Fiscali" showBack onBack={() => navigation.goBack()} />
      
      <View style={styles.filtersSection}>
        <View style={styles.filterRow}>
          {renderFilterPill('all', 'Tutte', filterType === 'all')}
          {renderFilterPill('sale', 'Vendite', filterType === 'sale')}
          {renderFilterPill('refund', 'Rimborsi', filterType === 'refund')}
          {renderFilterPill('void', 'Annulli', filterType === 'void')}
        </View>
      </View>
      
      <FlatList
        key={numColumns}
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary}
            testID="refresh-control"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna transazione</Text>
            <Text style={styles.emptySubtext}>Le transazioni fiscali appariranno qui</Text>
          </View>
        }
        testID="transactions-list"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  filtersSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  transactionCard: {
    marginBottom: spacing.md,
  },
  transactionRow: {
    flexDirection: 'row',
  },
  typeIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  transactionNumber: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  amount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  ticketInfo: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.md,
  },
  transactionFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.success}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  signedText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  operator: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  date: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  emptyText: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  emptySubtext: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});

export default SIAETransactionsScreen;
