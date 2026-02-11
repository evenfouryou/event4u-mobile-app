import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { InventoryProduct, InventoryCategory } from '@/lib/api';

type TabType = 'all' | 'byCategory' | 'lowStock';

interface GestoreProductsScreenProps {
  onBack: () => void;
}

export function GestoreProductsScreen({ onBack }: GestoreProductsScreenProps) {
  const { colors } = useTheme();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
      const [productsData, categoriesData] = await Promise.all([
        api.getGestoreProducts(),
        api.getGestoreCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Errore nel caricamento dei prodotti');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.categoryName?.toLowerCase().includes(query)
      );
    }

    switch (activeTab) {
      case 'lowStock':
        filtered = filtered.filter(p => p.currentStock <= (p.minStock || 10));
        break;
      case 'byCategory':
        if (selectedCategory) {
          filtered = filtered.filter(p => p.categoryId === selectedCategory);
        }
        break;
    }

    return filtered;
  }, [products, searchQuery, activeTab, selectedCategory]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => p.currentStock <= (p.minStock || 10)).length;
  }, [products]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStockBadge = (stock: number, minStock: number) => {
    if (stock <= 0) {
      return <Badge variant="destructive">Esaurito</Badge>;
    } else if (stock <= minStock) {
      return <Badge variant="warning">Basso</Badge>;
    }
    return <Badge variant="success">Disponibile</Badge>;
  };

  const handleProductPress = (product: InventoryProduct) => {
    triggerHaptic('selection');
    Alert.alert(
      product.name,
      `Stock: ${product.currentStock}\nPrezzo: ${formatCurrency(product.unitPrice)}\nCategoria: ${product.categoryName || 'Nessuna'}`,
      [
        { text: 'Chiudi', style: 'cancel' },
        { text: 'Modifica', onPress: () => Alert.alert('Modifica', 'Usa il pannello web per modificare i prodotti') },
      ]
    );
  };

  const handleDeleteProduct = (product: InventoryProduct) => {
    triggerHaptic('medium');
    Alert.alert(
      'Elimina Prodotto',
      `Sei sicuro di voler eliminare "${product.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: () => Alert.alert('Info', 'Usa il pannello web per eliminare i prodotti') },
      ]
    );
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'all', label: 'Tutti', count: products.length },
    { id: 'byCategory', label: 'Per Categoria' },
    { id: 'lowStock', label: 'Stock Basso', count: lowStockCount },
  ];

  const renderProduct = ({ item }: { item: InventoryProduct }) => (
    <Pressable onPress={() => handleProductPress(item)} testID={`product-item-${item.id}`}>
      <Card style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={[styles.productIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="cube" size={24} color={colors.primary} />
          </View>
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.productCategory, { color: colors.mutedForeground }]}>
              {item.categoryName || 'Senza categoria'}
            </Text>
          </View>
          {getStockBadge(item.currentStock, item.minStock || 10)}
        </View>
        <View style={[styles.productDivider, { backgroundColor: colors.border }]} />
        <View style={styles.productStats}>
          <View style={styles.productStat}>
            <Text style={[styles.productStatValue, { color: colors.foreground }]}>{item.currentStock}</Text>
            <Text style={[styles.productStatLabel, { color: colors.mutedForeground }]}>Stock</Text>
          </View>
          <View style={styles.productStat}>
            <Text style={[styles.productStatValue, { color: colors.foreground }]}>{formatCurrency(item.unitPrice)}</Text>
            <Text style={[styles.productStatLabel, { color: colors.mutedForeground }]}>Prezzo</Text>
          </View>
          <View style={styles.productStat}>
            <Text style={[styles.productStatValue, { color: colors.foreground }]}>{item.minStock || 10}</Text>
            <Text style={[styles.productStatLabel, { color: colors.mutedForeground }]}>Min. Stock</Text>
          </View>
        </View>
        <View style={styles.productActions}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: `${colors.primary}15` }]}
            onPress={() => handleProductPress(item)}
            testID={`button-edit-product-${item.id}`}
          >
            <Ionicons name="pencil" size={16} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Modifica</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: `${colors.destructive}15` }]}
            onPress={() => handleDeleteProduct(item)}
            testID={`button-delete-product-${item.id}`}
          >
            <Ionicons name="trash" size={16} color={colors.destructive} />
            <Text style={[styles.actionButtonText, { color: colors.destructive }]}>Elimina</Text>
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );

  const renderCategoryFilter = () => (
    <View style={styles.categoryFilterContainer}>
      <FlatList
        horizontal
        data={[{ id: null, name: 'Tutte' }, ...categories]}
        keyExtractor={(item) => item.id || 'all'}
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
            testID={`filter-category-${item.id || 'all'}`}
          >
            <Text
              style={[
                styles.categoryFilterText,
                { color: selectedCategory === item.id ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {item.name}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={64} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {activeTab === 'lowStock' ? 'Nessun prodotto con stock basso' : 'Nessun prodotto trovato'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {searchQuery ? 'Prova con una ricerca diversa' : 'Aggiungi prodotti dal pannello web'}
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

  return (
    <SafeArea edges={['bottom']} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as ViewStyle}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-products"
      />

      <View style={styles.titleContainer}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Gestione Prodotti</Text>
        <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
          {products.length} prodotti totali
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.secondary }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca prodotti..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-products"
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
              if (tab.id !== 'byCategory') {
                setSelectedCategory(null);
              }
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

      {activeTab === 'byCategory' && renderCategoryFilter()}

      {showLoader ? (
        <Loading text="Caricamento prodotti..." />
      ) : error ? (
        renderError()
      ) : filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
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
      ) : (
        renderEmptyState()
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          triggerHaptic('selection');
          Alert.alert('Nuovo Prodotto', 'Usa il pannello web per aggiungere nuovi prodotti');
        }}
        testID="button-add-product"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </Pressable>
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
  productCard: {
    padding: spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  productCategory: {
    fontSize: typography.fontSize.sm,
  },
  productDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  productStat: {
    alignItems: 'center',
  },
  productStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  productStatLabel: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  productActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default GestoreProductsScreen;
