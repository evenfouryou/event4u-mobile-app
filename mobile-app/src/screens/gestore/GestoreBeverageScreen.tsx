import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { BeverageData, BeverageCatalogItem, BeverageSalesItem, BeverageStockItem } from '@/lib/api';

type TabType = 'catalogo' | 'vendite' | 'scorte';
type CategoryFilter = 'tutti' | 'alcolici' | 'analcolici' | 'cocktail' | 'birra' | 'vino';

interface GestoreBeverageScreenProps {
  onBack: () => void;
}

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'alcolici', label: 'Alcolici' },
  { id: 'analcolici', label: 'Analcolici' },
  { id: 'cocktail', label: 'Cocktail' },
  { id: 'birra', label: 'Birra' },
  { id: 'vino', label: 'Vino' },
];

export function GestoreBeverageScreen({ onBack }: GestoreBeverageScreenProps) {
  const { colors } = useTheme();
  const [beverageData, setBeverageData] = useState<BeverageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('catalogo');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('tutti');
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      const data = await api.getBeverageData();
      setBeverageData(data);
    } catch (err) {
      console.error('Error loading beverage data:', err);
      setError('Errore nel caricamento delle bevande');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredCatalog = useMemo(() => {
    if (!beverageData?.catalog) return [];
    let filtered = beverageData.catalog;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'tutti') {
      filtered = filtered.filter(item =>
        item.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    return filtered;
  }, [beverageData?.catalog, searchQuery, selectedCategory]);

  const filteredSales = useMemo(() => {
    if (!beverageData?.sales) return [];
    let filtered = beverageData.sales;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => b.quantitySold - a.quantitySold);
  }, [beverageData?.sales, searchQuery]);

  const filteredStock = useMemo(() => {
    if (!beverageData?.stock) return [];
    let filtered = beverageData.stock;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [beverageData?.stock, searchQuery]);

  const lowStockCount = useMemo(() => {
    return beverageData?.stock.filter(s => s.status === 'low' || s.status === 'out').length || 0;
  }, [beverageData?.stock]);

  const topSellers = useMemo(() => {
    return filteredSales.slice(0, 5);
  }, [filteredSales]);

  const totalRevenue = useMemo(() => {
    return beverageData?.sales.reduce((sum, item) => sum + item.revenue, 0) || 0;
  }, [beverageData?.sales]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStockBadge = (status: 'ok' | 'low' | 'out') => {
    switch (status) {
      case 'out':
        return <Badge variant="destructive">Esaurito</Badge>;
      case 'low':
        return <Badge variant="warning">Basso</Badge>;
      default:
        return <Badge variant="success">OK</Badge>;
    }
  };

  const getAvailabilityBadge = (available: boolean) => {
    return available 
      ? <Badge variant="success">Disponibile</Badge>
      : <Badge variant="destructive">Non disponibile</Badge>;
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'catalogo', label: 'Catalogo', count: beverageData?.catalog.length },
    { id: 'vendite', label: 'Vendite' },
    { id: 'scorte', label: 'Scorte', count: lowStockCount > 0 ? lowStockCount : undefined },
  ];

  const renderCatalogItem = ({ item }: { item: BeverageCatalogItem }) => (
    <Card style={styles.itemCard} testID={`catalog-item-${item.id}`}>
      <View style={styles.itemHeader}>
        <View style={[styles.itemIcon, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="wine" size={24} color={colors.primary} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.itemCategory, { color: colors.mutedForeground }]}>
            {item.category}
          </Text>
        </View>
        {getAvailabilityBadge(item.available)}
      </View>
      <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
      <View style={styles.itemStats}>
        <View style={styles.itemStat}>
          <Text style={[styles.itemStatValue, { color: colors.foreground }]}>{formatCurrency(item.price)}</Text>
          <Text style={[styles.itemStatLabel, { color: colors.mutedForeground }]}>Prezzo</Text>
        </View>
        <View style={styles.itemStat}>
          <Text style={[styles.itemStatValue, { color: colors.foreground }]}>{item.category}</Text>
          <Text style={[styles.itemStatLabel, { color: colors.mutedForeground }]}>Categoria</Text>
        </View>
      </View>
    </Card>
  );

  const renderSalesItem = ({ item, index }: { item: BeverageSalesItem; index: number }) => (
    <Card style={styles.itemCard} testID={`sales-item-${item.beverageId}`}>
      <View style={styles.itemHeader}>
        <View style={[styles.rankBadge, { backgroundColor: index < 3 ? colors.primary : colors.secondary }]}>
          <Text style={[styles.rankText, { color: index < 3 ? colors.primaryForeground : colors.foreground }]}>
            #{index + 1}
          </Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.itemCategory, { color: colors.mutedForeground }]}>
            {item.quantitySold} unità vendute
          </Text>
        </View>
        <View style={styles.revenueContainer}>
          <Text style={[styles.revenueValue, { color: colors.primary }]}>{formatCurrency(item.revenue)}</Text>
          <Text style={[styles.revenueLabel, { color: colors.mutedForeground }]}>Ricavi</Text>
        </View>
      </View>
    </Card>
  );

  const renderStockItem = ({ item }: { item: BeverageStockItem }) => (
    <Card style={styles.itemCard} testID={`stock-item-${item.beverageId}`}>
      <View style={styles.itemHeader}>
        <View style={[styles.itemIcon, { backgroundColor: item.status === 'ok' ? `${colors.primary}20` : `${colors.destructive}20` }]}>
          <Ionicons 
            name={item.status === 'ok' ? 'cube' : 'warning'} 
            size={24} 
            color={item.status === 'ok' ? colors.primary : colors.destructive} 
          />
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.itemCategory, { color: colors.mutedForeground }]}>
            Stock minimo: {item.minStock}
          </Text>
        </View>
        {getStockBadge(item.status)}
      </View>
      <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
      <View style={styles.stockBarContainer}>
        <View style={styles.stockBarHeader}>
          <Text style={[styles.stockBarLabel, { color: colors.mutedForeground }]}>Livello Stock</Text>
          <Text style={[styles.stockBarValue, { color: colors.foreground }]}>
            {item.currentStock} / {item.minStock * 2}
          </Text>
        </View>
        <View style={[styles.stockBarBg, { backgroundColor: colors.secondary }]}>
          <View 
            style={[
              styles.stockBarFill, 
              { 
                backgroundColor: item.status === 'ok' ? colors.primary : item.status === 'low' ? '#f59e0b' : colors.destructive,
                width: `${Math.min((item.currentStock / (item.minStock * 2)) * 100, 100)}%`,
              }
            ]} 
          />
        </View>
      </View>
      {item.status !== 'ok' && (
        <View style={[styles.reorderSuggestion, { backgroundColor: `${colors.primary}10` }]}>
          <Ionicons name="cart" size={16} color={colors.primary} />
          <Text style={[styles.reorderText, { color: colors.primary }]}>
            Suggerimento: riordina {Math.max(item.minStock * 2 - item.currentStock, 0)} unità
          </Text>
        </View>
      )}
    </Card>
  );

  const renderSalesStats = () => (
    <View style={styles.statsContainer}>
      <Card style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <View style={[styles.statsIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="trending-up" size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.statsValue, { color: colors.foreground }]}>{formatCurrency(totalRevenue)}</Text>
            <Text style={[styles.statsLabel, { color: colors.mutedForeground }]}>Ricavi Totali</Text>
          </View>
        </View>
      </Card>
      <Card style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <View style={[styles.statsIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="trophy" size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.statsValue, { color: colors.foreground }]}>{topSellers[0]?.name || '-'}</Text>
            <Text style={[styles.statsLabel, { color: colors.mutedForeground }]}>Top Seller</Text>
          </View>
        </View>
      </Card>
    </View>
  );

  const renderCategoryFilter = () => (
    <View style={styles.categoryFilterContainer}>
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFilterList}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              triggerHaptic('selection');
              setSelectedCategory(item.id);
            }}
            style={[
              styles.categoryFilterChip,
              { backgroundColor: selectedCategory === item.id ? colors.primary : colors.secondary },
            ]}
            testID={`filter-category-${item.id}`}
          >
            <Text
              style={[
                styles.categoryFilterText,
                { color: selectedCategory === item.id ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="wine-outline" size={64} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {activeTab === 'catalogo' ? 'Nessuna bevanda trovata' : 
         activeTab === 'vendite' ? 'Nessun dato di vendita' : 
         'Nessun dato di stock'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {searchQuery ? 'Prova con una ricerca diversa' : 'I dati verranno mostrati qui'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Errore</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{error}</Text>
      <Pressable
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={loadData}
        testID="button-retry"
      >
        <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>Riprova</Text>
      </Pressable>
    </View>
  );

  const renderContent = () => {
    if (showLoader) {
      return <Loading text="Caricamento bevande..." />;
    }

    if (error) {
      return renderError();
    }

    switch (activeTab) {
      case 'catalogo':
        return filteredCatalog.length > 0 ? (
          <FlatList
            data={filteredCatalog}
            renderItem={renderCatalogItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        ) : renderEmptyState();

      case 'vendite':
        return filteredSales.length > 0 ? (
          <FlatList
            data={filteredSales}
            renderItem={renderSalesItem}
            keyExtractor={(item) => item.beverageId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderSalesStats}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        ) : renderEmptyState();

      case 'scorte':
        return filteredStock.length > 0 ? (
          <FlatList
            data={filteredStock}
            renderItem={renderStockItem}
            keyExtractor={(item) => item.beverageId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        ) : renderEmptyState();

      default:
        return null;
    }
  };

  return (
    <SafeArea edges={['bottom']} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as ViewStyle}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-beverage"
      />

      <View style={styles.titleContainer}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]} testID="text-screen-title">Bevande</Text>
        <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]} testID="text-screen-subtitle">
          Gestisci catalogo, vendite e scorte
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.secondary }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca bevande..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-beverages"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab(tab.id);
            }}
            style={[
              styles.tab,
              { backgroundColor: activeTab === tab.id ? colors.primary : colors.secondary },
            ]}
            testID={`tab-${tab.id}`}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.id ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {tab.label}
              {tab.count !== undefined && ` (${tab.count})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'catalogo' && renderCategoryFilter()}

      {renderContent()}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  screenTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  categoryFilterContainer: {
    paddingBottom: spacing.sm,
  },
  categoryFilterList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryFilterChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  categoryFilterText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  itemCard: {
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  itemCategory: {
    fontSize: typography.fontSize.sm,
  },
  itemDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  itemStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  itemStat: {
    alignItems: 'center',
  },
  itemStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  itemStatLabel: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  revenueContainer: {
    alignItems: 'flex-end',
  },
  revenueValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  revenueLabel: {
    fontSize: typography.fontSize.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statsCard: {
    flex: 1,
    padding: spacing.md,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  statsLabel: {
    fontSize: typography.fontSize.xs,
  },
  stockBarContainer: {
    marginTop: spacing.xs,
  },
  stockBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  stockBarLabel: {
    fontSize: typography.fontSize.xs,
  },
  stockBarValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  stockBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  stockBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  reorderSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  reorderText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});

export default GestoreBeverageScreen;
