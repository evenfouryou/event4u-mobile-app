import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { InventoryProduct, InventoryCategory } from '@/lib/api';

type TabType = 'products' | 'categories' | 'movements' | 'priceLists';

interface GestoreInventoryScreenProps {
  onBack: () => void;
}

export function GestoreInventoryScreen({ onBack }: GestoreInventoryScreenProps) {
  const { colors } = useTheme();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadInventory();
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

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        api.getGestoreProducts(),
        api.getGestoreCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInventory();
    setRefreshing(false);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    return <Badge variant="success">OK</Badge>;
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'products', label: 'Prodotti' },
    { id: 'categories', label: 'Categorie' },
    { id: 'movements', label: 'Movimenti' },
    { id: 'priceLists', label: 'Listini' },
  ];

  const renderProduct = ({ item }: { item: InventoryProduct }) => (
    <Card style={styles.productCard} testID={`product-${item.id}`}>
      <View style={styles.productHeader}>
        <View style={[styles.productIcon, { backgroundColor: `${staticColors.primary}20` }]}>
          <Ionicons name="cube" size={24} color={staticColors.primary} />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.categoryName || 'Senza categoria'}</Text>
        </View>
        {getStockBadge(item.currentStock, item.minStock || 10)}
      </View>
      <View style={styles.productDivider} />
      <View style={styles.productStats}>
        <View style={styles.productStat}>
          <Text style={styles.productStatValue}>{item.currentStock}</Text>
          <Text style={styles.productStatLabel}>Stock</Text>
        </View>
        <View style={styles.productStat}>
          <Text style={styles.productStatValue}>{formatCurrency(item.unitPrice)}</Text>
          <Text style={styles.productStatLabel}>Prezzo</Text>
        </View>
        <View style={styles.productStat}>
          <Text style={styles.productStatValue}>pz</Text>
          <Text style={styles.productStatLabel}>Unità</Text>
        </View>
      </View>
    </Card>
  );

  const renderCategory = ({ item }: { item: InventoryCategory }) => (
    <Card style={styles.categoryCard} testID={`category-${item.id}`}>
      <View style={styles.categoryContent}>
        <View style={[styles.categoryIcon, { backgroundColor: `${staticColors.primary}20` }]}>
          <Ionicons name="folder" size={24} color={staticColors.primary} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <Text style={styles.categoryCount}>{item.productsCount || 0} prodotti</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
      </View>
    </Card>
  );

  const renderMovements = () => (
    <View style={styles.emptyState}>
      <Ionicons name="swap-horizontal-outline" size={64} color={colors.mutedForeground} />
      <Text style={styles.emptyTitle}>Movimenti Stock</Text>
      <Text style={styles.emptyText}>Gestisci i movimenti di magazzino da web per maggiore controllo</Text>
    </View>
  );

  const renderPriceLists = () => (
    <View style={styles.emptyState}>
      <Ionicons name="pricetags-outline" size={64} color={colors.mutedForeground} />
      <Text style={styles.emptyTitle}>Listini Prezzi</Text>
      <Text style={styles.emptyText}>Configura i listini prezzi dalla versione web</Text>
    </View>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-inventory"
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca prodotti..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
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
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            testID={`tab-${tab.id}`}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {showLoader ? (
        <Loading text="Caricamento inventario..." />
      ) : activeTab === 'products' ? (
        filteredProducts.length > 0 ? (
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
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessun prodotto</Text>
            <Text style={styles.emptyText}>Aggiungi prodotti dal pannello web</Text>
          </View>
        )
      ) : activeTab === 'categories' ? (
        categories.length > 0 ? (
          <FlatList
            data={categories}
            renderItem={renderCategory}
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
          <View style={styles.emptyState}>
            <Ionicons name="folder-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessuna categoria</Text>
            <Text style={styles.emptyText}>Crea categorie dal pannello web</Text>
          </View>
        )
      ) : activeTab === 'movements' ? (
        renderMovements()
      ) : (
        renderPriceLists()
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
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
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: staticColors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  tabTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
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
    color: staticColors.foreground,
  },
  productCategory: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  productDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  productStat: {
    alignItems: 'center',
  },
  productStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  productStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  categoryCard: {
    padding: spacing.md,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  categoryCount: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
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

export default GestoreInventoryScreen;
