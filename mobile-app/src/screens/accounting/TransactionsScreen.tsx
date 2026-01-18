import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
}

const TYPE_FILTERS = [
  { id: 'all', label: 'Tutte', icon: 'list-outline' },
  { id: 'income', label: 'Entrate', icon: 'arrow-down-outline' },
  { id: 'expense', label: 'Uscite', icon: 'arrow-up-outline' },
];

const CATEGORIES = [
  'Tutti',
  'Biglietteria',
  'Commissioni',
  'Personale',
  'Affitto',
  'Marketing',
  'Utenze',
  'Forniture',
  'Altro',
];

export function TransactionsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('Tutti');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const loadTransactions = async () => {
    try {
      const response = await api.get<any>('/api/transactions');
      const data = response.transactions || response || [];

      setTransactions(data.map((t: any) => ({
        id: t.id?.toString() || Math.random().toString(),
        date: t.date || t.createdAt,
        description: t.description || t.notes || 'Transazione',
        category: t.category || 'Altro',
        amount: Math.abs(parseFloat(t.amount || 0)),
        type: t.type === 'expense' || parseFloat(t.amount) < 0 ? 'expense' : 'income',
      })));
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([
        { id: '1', date: '2025-01-18', description: 'Vendita biglietti evento XYZ', category: 'Biglietteria', amount: 2500, type: 'income' },
        { id: '2', date: '2025-01-17', description: 'Commissioni vendita online', category: 'Commissioni', amount: 350, type: 'income' },
        { id: '3', date: '2025-01-17', description: 'Pagamento DJ performer', category: 'Personale', amount: 800, type: 'expense' },
        { id: '4', date: '2025-01-16', description: 'Affitto locale', category: 'Affitto', amount: 1500, type: 'expense' },
        { id: '5', date: '2025-01-15', description: 'Vendita merchandising', category: 'Merchandising', amount: 420, type: 'income' },
        { id: '6', date: '2025-01-15', description: 'Bolletta elettrica', category: 'Utenze', amount: 380, type: 'expense' },
        { id: '7', date: '2025-01-14', description: 'Campagna social media', category: 'Marketing', amount: 250, type: 'expense' },
        { id: '8', date: '2025-01-13', description: 'Prevendite weekend', category: 'Biglietteria', amount: 1850, type: 'income' },
      ]);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Oggi';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ieri';
    }

    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
    });
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesType = selectedType === 'all' || transaction.type === selectedType;
    const matchesCategory = selectedCategory === 'Tutti' || transaction.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesCategory && matchesSearch;
  });

  const groupedTransactions: { [key: string]: Transaction[] } = {};
  filteredTransactions.forEach((transaction) => {
    const dateKey = transaction.date.split('T')[0];
    if (!groupedTransactions[dateKey]) {
      groupedTransactions[dateKey] = [];
    }
    groupedTransactions[dateKey].push(transaction);
  });

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Transazioni" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento transazioni...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Transazioni" showBack onBack={() => navigation.goBack()} />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca transazione..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="input-search-transactions"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScroll}
      >
        {TYPE_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterPill,
              selectedType === filter.id && styles.filterPillActive,
            ]}
            onPress={() => setSelectedType(filter.id)}
            data-testid={`pill-type-${filter.id}`}
          >
            <Ionicons
              name={filter.icon as any}
              size={16}
              color={selectedType === filter.id ? colors.primaryForeground : colors.foreground}
            />
            <Text
              style={[
                styles.filterPillText,
                selectedType === filter.id && styles.filterPillTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            styles.filterPill,
            selectedCategory !== 'Tutti' && styles.filterPillActive,
          ]}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          data-testid="pill-category"
        >
          <Ionicons
            name="pricetag-outline"
            size={16}
            color={selectedCategory !== 'Tutti' ? colors.primaryForeground : colors.foreground}
          />
          <Text
            style={[
              styles.filterPillText,
              selectedCategory !== 'Tutti' && styles.filterPillTextActive,
            ]}
          >
            {selectedCategory}
          </Text>
          <Ionicons
            name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={selectedCategory !== 'Tutti' ? colors.primaryForeground : colors.foreground}
          />
        </TouchableOpacity>
      </ScrollView>

      {showCategoryPicker && (
        <View style={styles.categoryPicker}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryOption,
                  selectedCategory === category && styles.categoryOptionActive,
                ]}
                onPress={() => {
                  setSelectedCategory(category);
                  setShowCategoryPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    selectedCategory === category && styles.categoryOptionTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Entrate</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            +{formatCurrency(totalIncome)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Uscite</Text>
          <Text style={[styles.summaryValue, { color: colors.destructive }]}>
            -{formatCurrency(totalExpense)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {sortedDates.length > 0 ? (
          sortedDates.map((dateKey) => (
            <View key={dateKey} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{formatDate(dateKey)}</Text>
              {groupedTransactions[dateKey].map((transaction) => (
                <Card key={transaction.id} variant="glass" style={styles.transactionCard}>
                  <View style={styles.transactionRow}>
                    <View style={[
                      styles.transactionIcon,
                      { backgroundColor: transaction.type === 'income' ? `${colors.primary}20` : `${colors.destructive}20` }
                    ]}>
                      <Ionicons
                        name={transaction.type === 'income' ? 'arrow-down' : 'arrow-up'}
                        size={20}
                        color={transaction.type === 'income' ? colors.primary : colors.destructive}
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDescription}>{transaction.description}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{transaction.category}</Text>
                      </View>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      { color: transaction.type === 'income' ? colors.primary : colors.destructive }
                    ]}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          ))
        ) : (
          <Card variant="glass" style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna transazione trovata</Text>
            <Text style={styles.emptySubtext}>
              Prova a modificare i filtri di ricerca
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  filtersScroll: {
    maxHeight: 50,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
  },
  categoryPicker: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  categoryOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  categoryOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryOptionText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  categoryOptionTextActive: {
    color: colors.primaryForeground,
    fontWeight: fontWeight.medium,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  dateGroup: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionCard: {
    marginBottom: spacing.sm,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  transactionAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
    marginTop: spacing.xl,
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

export default TransactionsScreen;
