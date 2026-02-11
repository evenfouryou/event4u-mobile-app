import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Animated, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { GestoreInventoryStats, InventoryProduct, InventoryCategory, WarehouseMovement, PriceList } from '@/lib/api';

type SubScreen = 'hub' | 'products' | 'categories' | 'movements' | 'priceLists' | 'orders' | 'returns';

interface MenuItem {
  id: SubScreen;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  color: string;
  count?: number;
}

interface GestoreInventoryHubScreenProps {
  onBack: () => void;
}

export function GestoreInventoryHubScreen({ onBack }: GestoreInventoryHubScreenProps) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<GestoreInventoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<SubScreen>('hub');
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    loadStats();
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

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getGestoreInventoryStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading inventory stats:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const navigateToScreen = (screen: SubScreen) => {
    triggerHaptic('selection');
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentScreen(screen);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleBack = () => {
    if (currentScreen !== 'hub') {
      navigateToScreen('hub');
    } else {
      onBack();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const menuItems: MenuItem[] = [
    {
      id: 'products',
      icon: 'cube',
      label: 'Prodotti',
      description: 'Gestisci catalogo prodotti',
      color: staticColors.primary,
      count: stats?.totalItems || 0,
    },
    {
      id: 'categories',
      icon: 'folder',
      label: 'Categorie',
      description: 'Organizza per categoria',
      color: '#8B5CF6',
      count: stats?.categoriesCount || 0,
    },
    {
      id: 'movements',
      icon: 'swap-horizontal',
      label: 'Movimenti',
      description: 'Carico e scarico merce',
      color: '#10B981',
    },
    {
      id: 'priceLists',
      icon: 'pricetag',
      label: 'Listini Prezzi',
      description: 'Gestisci prezzi e sconti',
      color: '#F59E0B',
    },
    {
      id: 'orders',
      icon: 'cart',
      label: 'Ordini Acquisto',
      description: 'Ordini ai fornitori',
      color: '#3B82F6',
    },
    {
      id: 'returns',
      icon: 'return-down-back',
      label: 'Resi Magazzino',
      description: 'Gestisci resi da eventi',
      color: '#EF4444',
    },
  ];

  const statCards = [
    {
      icon: 'cube',
      label: 'Prodotti Totali',
      value: stats?.totalItems || 0,
      color: staticColors.primary,
    },
    {
      icon: 'warning',
      label: 'Sotto Scorta',
      value: stats?.lowStockItems || 0,
      color: stats?.lowStockItems ? '#EF4444' : '#10B981',
    },
    {
      icon: 'folder',
      label: 'Categorie',
      value: stats?.categoriesCount || 0,
      color: '#8B5CF6',
    },
    {
      icon: 'cash',
      label: 'Valore Stock',
      value: formatCurrency(stats?.totalValue || 0),
      color: '#10B981',
      isText: true,
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <Pressable
      key={item.id}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={() => navigateToScreen(item.id)}
      testID={`menu-${item.id}`}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon} size={28} color={item.color} />
      </View>
      <View style={styles.menuContent}>
        <View style={styles.menuHeader}>
          <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
          {item.count !== undefined && (
            <Badge variant="secondary" size="sm">{item.count}</Badge>
          )}
        </View>
        <Text style={[styles.menuDescription, { color: colors.mutedForeground }]}>
          {item.description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
    </Pressable>
  );

  const renderHub = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={staticColors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={[styles.headerIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="cube" size={32} color={staticColors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Gestione Inventario</Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
              Prodotti, categorie, movimenti e listini
            </Text>
          </View>
        </View>
      </GlassCard>

      <View style={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <Card key={index} style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}20` }]}>
              <Ionicons name={stat.icon as any} size={20} color={stat.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {stat.isText ? stat.value : stat.value.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          </Card>
        ))}
      </View>

      {stats?.lowStockItems && stats.lowStockItems > 0 && (
        <Pressable
          style={[styles.alertBanner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}
          onPress={() => navigateToScreen('products')}
          testID="alert-low-stock"
        >
          <Ionicons name="warning" size={24} color="#D97706" />
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, { color: '#92400E' }]}>
              {stats.lowStockItems} prodotti sotto scorta
            </Text>
            <Text style={[styles.alertDescription, { color: '#A16207' }]}>
              Tocca per visualizzare e riordinare
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#D97706" />
        </Pressable>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Menu Inventario</Text>

      <View style={styles.menuList}>
        {menuItems.map(renderMenuItem)}
      </View>

      <View style={styles.quickActions}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Azioni Rapide</Text>
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: `${staticColors.primary}15` }]}
            onPress={() => navigateToScreen('products')}
            testID="action-add-product"
          >
            <Ionicons name="add-circle" size={24} color={staticColors.primary} />
            <Text style={[styles.actionLabel, { color: staticColors.primary }]}>Nuovo Prodotto</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: '#10B98115' }]}
            onPress={() => navigateToScreen('movements')}
            testID="action-add-movement"
          >
            <Ionicons name="add" size={24} color="#10B981" />
            <Text style={[styles.actionLabel, { color: '#10B981' }]}>Carico Merce</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: '#3B82F615' }]}
            onPress={() => navigateToScreen('orders')}
            testID="action-new-order"
          >
            <Ionicons name="cart" size={24} color="#3B82F6" />
            <Text style={[styles.actionLabel, { color: '#3B82F6' }]}>Nuovo Ordine</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderSubScreen = () => {
    switch (currentScreen) {
      case 'products':
        return <ProductsSubScreen onBack={() => navigateToScreen('hub')} />;
      case 'categories':
        return <CategoriesSubScreen onBack={() => navigateToScreen('hub')} />;
      case 'movements':
        return <MovementsSubScreen onBack={() => navigateToScreen('hub')} />;
      case 'priceLists':
        return <PriceListsSubScreen onBack={() => navigateToScreen('hub')} />;
      case 'orders':
        return <OrdersSubScreen onBack={() => navigateToScreen('hub')} />;
      case 'returns':
        return <ReturnsSubScreen onBack={() => navigateToScreen('hub')} />;
      default:
        return null;
    }
  };

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'products': return 'Prodotti';
      case 'categories': return 'Categorie';
      case 'movements': return 'Movimenti';
      case 'priceLists': return 'Listini Prezzi';
      case 'orders': return 'Ordini Acquisto';
      case 'returns': return 'Resi Magazzino';
      default: return 'Inventario';
    }
  };

  if (showLoader && isLoading) {
    return (
      <SafeArea>
        <Header title="Inventario" onBack={onBack} />
        <Loading text="Caricamento inventario..." />
      </SafeArea>
    );
  }

  if (hasError) {
    return (
      <SafeArea>
        <Header title="Inventario" onBack={onBack} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore di caricamento</Text>
          <Text style={[styles.errorMessage, { color: colors.mutedForeground }]}>
            Impossibile caricare i dati dell'inventario
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: staticColors.primary }]}
            onPress={loadStats}
            testID="button-retry"
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryText}>Riprova</Text>
          </Pressable>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <Header title={getScreenTitle()} onBack={handleBack} />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {currentScreen === 'hub' ? renderHub() : renderSubScreen()}
      </Animated.View>
    </SafeArea>
  );
}

interface SubScreenProps {
  onBack: () => void;
}

function ProductsSubScreen({ onBack }: SubScreenProps) {
  const { colors } = useTheme();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'lowStock' | 'outOfStock'>('all');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const [productsData, categoriesData] = await Promise.all([
        api.getGestoreProducts(),
        api.getGestoreCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading products:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getStockBadge = (stock: number, minStock: number = 10) => {
    if (stock <= 0) return <Badge variant="destructive">Esaurito</Badge>;
    if (stock <= minStock) return <Badge variant="warning">Basso</Badge>;
    return <Badge variant="success">OK</Badge>;
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoryName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'lowStock') return matchesSearch && p.currentStock <= (p.minStock || 10) && p.currentStock > 0;
    if (filterType === 'outOfStock') return matchesSearch && p.currentStock <= 0;
    return matchesSearch;
  });

  const handleAddProduct = () => {
    triggerHaptic('selection');
    Alert.alert(
      'Nuovo Prodotto',
      'Inserisci i dati del nuovo prodotto',
      [{ text: 'Annulla', style: 'cancel' }]
    );
  };

  const handleProductPress = (product: InventoryProduct) => {
    triggerHaptic('selection');
    Alert.alert(
      product.name,
      `Stock: ${product.currentStock} pz\nMin: ${product.minStock || 10}\nPrezzo: ${formatCurrency(product.unitPrice)}\nCategoria: ${product.categoryName || 'Nessuna'}`,
      [
        { text: 'Chiudi', style: 'cancel' },
        { text: 'Modifica', onPress: () => {} },
        { text: 'Carica Stock', onPress: () => {} },
      ]
    );
  };

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: staticColors.primary }]} onPress={loadProducts}>
          <Text style={styles.retryText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  const filterChips = [
    { id: 'all' as const, label: 'Tutti', count: products.length },
    { id: 'lowStock' as const, label: 'Sotto Scorta', count: products.filter(p => p.currentStock <= (p.minStock || 10) && p.currentStock > 0).length },
    { id: 'outOfStock' as const, label: 'Esauriti', count: products.filter(p => p.currentStock <= 0).length },
  ];

  return (
    <View style={styles.subScreenContainer}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Cerca prodotti..."
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
          testID="input-search-products"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {filterChips.map(chip => (
          <Pressable
            key={chip.id}
            style={[
              styles.filterChip,
              { backgroundColor: filterType === chip.id ? staticColors.primary : colors.card },
            ]}
            onPress={() => { triggerHaptic('selection'); setFilterType(chip.id); }}
            testID={`filter-${chip.id}`}
          >
            <Text style={[styles.filterChipText, { color: filterType === chip.id ? '#000' : colors.foreground }]}>
              {chip.label} ({chip.count})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <Loading text="Caricamento prodotti..." />
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessun prodotto</Text>
          <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
            {searchQuery ? 'Nessun risultato per la ricerca' : 'Aggiungi il primo prodotto'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.productItem, { backgroundColor: colors.card }]}
              onPress={() => handleProductPress(item)}
              testID={`product-${item.id}`}
            >
              <View style={[styles.productIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                <Ionicons name="cube" size={24} color={staticColors.primary} />
              </View>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.productCategory, { color: colors.mutedForeground }]}>
                  {item.categoryName || 'Senza categoria'} • {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <View style={styles.productStock}>
                {getStockBadge(item.currentStock, item.minStock)}
                <Text style={[styles.stockText, { color: colors.mutedForeground }]}>
                  {item.currentStock} pz
                </Text>
              </View>
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: staticColors.primary }]}
        onPress={handleAddProduct}
        testID="button-add-product"
      >
        <Ionicons name="add" size={28} color="#000" />
      </Pressable>
    </View>
  );
}

function CategoriesSubScreen({ onBack }: SubScreenProps) {
  const { colors } = useTheme();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getGestoreCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const categoryColors = ['#8B5CF6', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#EC4899'];

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: staticColors.primary }]} onPress={loadCategories}>
          <Text style={styles.retryText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return <Loading text="Caricamento categorie..." />;
  }

  return (
    <View style={styles.subScreenContainer}>
      {categories.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna categoria</Text>
          <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
            Crea la prima categoria per organizzare i prodotti
          </Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => {
            const color = categoryColors[index % categoryColors.length];
            return (
              <Pressable
                style={[styles.categoryItem, { backgroundColor: colors.card }]}
                onPress={() => triggerHaptic('selection')}
                testID={`category-${item.id}`}
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${color}20` }]}>
                  <Ionicons name="folder" size={24} color={color} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.categoryCount, { color: colors.mutedForeground }]}>
                    {item.productsCount || 0} prodotti
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: '#8B5CF6' }]}
        onPress={() => { triggerHaptic('selection'); Alert.alert('Nuova Categoria', 'Inserisci il nome della categoria'); }}
        testID="button-add-category"
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </Pressable>
    </View>
  );
}

function MovementsSubScreen({ onBack }: SubScreenProps) {
  const { colors } = useTheme();
  const [movements, setMovements] = useState<WarehouseMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out' | 'transfer'>('all');

  useEffect(() => {
    loadMovements();
  }, []);

  const loadMovements = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getWarehouseMovements();
      setMovements(data);
    } catch (error) {
      console.error('Error loading movements:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in': return { icon: 'arrow-down', color: '#10B981' };
      case 'out': return { icon: 'arrow-up', color: '#EF4444' };
      case 'transfer': return { icon: 'swap-horizontal', color: '#3B82F6' };
      default: return { icon: 'help', color: colors.mutedForeground };
    }
  };

  const filteredMovements = movements.filter(m => filterType === 'all' || m.type === filterType);

  const filterChips = [
    { id: 'all' as const, label: 'Tutti', count: movements.length },
    { id: 'in' as const, label: 'Carichi', count: movements.filter(m => m.type === 'in').length },
    { id: 'out' as const, label: 'Scarichi', count: movements.filter(m => m.type === 'out').length },
    { id: 'transfer' as const, label: 'Trasferimenti', count: movements.filter(m => m.type === 'transfer').length },
  ];

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: staticColors.primary }]} onPress={loadMovements}>
          <Text style={styles.retryText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return <Loading text="Caricamento movimenti..." />;
  }

  return (
    <View style={styles.subScreenContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {filterChips.map(chip => (
          <Pressable
            key={chip.id}
            style={[
              styles.filterChip,
              { backgroundColor: filterType === chip.id ? staticColors.primary : colors.card },
            ]}
            onPress={() => { triggerHaptic('selection'); setFilterType(chip.id); }}
            testID={`filter-${chip.id}`}
          >
            <Text style={[styles.filterChipText, { color: filterType === chip.id ? '#000' : colors.foreground }]}>
              {chip.label} ({chip.count})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {filteredMovements.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="swap-horizontal-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessun movimento</Text>
          <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
            I movimenti di magazzino appariranno qui
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMovements}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const { icon, color } = getMovementIcon(item.type);
            return (
              <Card style={styles.movementItem}>
                <View style={[styles.movementIcon, { backgroundColor: `${color}20` }]}>
                  <Ionicons name={icon as any} size={24} color={color} />
                </View>
                <View style={styles.movementInfo}>
                  <Text style={[styles.movementProduct, { color: colors.foreground }]}>{item.productName}</Text>
                  <Text style={[styles.movementDetails, { color: colors.mutedForeground }]}>
                    {item.notes || 'Movimento magazzino'} • {new Date(item.createdAt).toLocaleDateString('it-IT')}
                  </Text>
                </View>
                <View style={styles.movementQuantity}>
                  <Text style={[styles.quantityText, { color: item.type === 'in' ? '#10B981' : '#EF4444' }]}>
                    {item.type === 'in' ? '+' : '-'}{item.quantity}
                  </Text>
                </View>
              </Card>
            );
          }}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: '#10B981' }]}
        onPress={() => { triggerHaptic('selection'); Alert.alert('Nuovo Movimento', 'Seleziona il tipo di movimento'); }}
        testID="button-add-movement"
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </Pressable>
    </View>
  );
}

function PriceListsSubScreen({ onBack }: SubScreenProps) {
  const { colors } = useTheme();
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loadPriceLists();
  }, []);

  const loadPriceLists = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getGestorePriceLists();
      setPriceLists(data);
    } catch (error) {
      console.error('Error loading price lists:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: staticColors.primary }]} onPress={loadPriceLists}>
          <Text style={styles.retryText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return <Loading text="Caricamento listini..." />;
  }

  return (
    <View style={styles.subScreenContainer}>
      {priceLists.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="pricetag-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessun listino</Text>
          <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
            Crea il primo listino prezzi
          </Text>
        </View>
      ) : (
        <FlatList
          data={priceLists}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Card style={styles.priceListItem}>
              <View style={[styles.priceListIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="pricetag" size={24} color="#F59E0B" />
              </View>
              <View style={styles.priceListInfo}>
                <View style={styles.priceListHeader}>
                  <Text style={[styles.priceListName, { color: colors.foreground }]}>{item.name}</Text>
                  {item.isDefault && <Badge variant="golden" size="sm">Default</Badge>}
                </View>
                <Text style={[styles.priceListDetails, { color: colors.mutedForeground }]}>
                  {item.productsCount || 0} prodotti
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </Card>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: '#F59E0B' }]}
        onPress={() => { triggerHaptic('selection'); Alert.alert('Nuovo Listino', 'Inserisci i dati del listino'); }}
        testID="button-add-pricelist"
      >
        <Ionicons name="add" size={28} color="#000" />
      </Pressable>
    </View>
  );
}

function OrdersSubScreen({ onBack }: SubScreenProps) {
  const { colors } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getGestorePurchaseOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="warning">In Attesa</Badge>;
      case 'ordered': return <Badge variant="default">Ordinato</Badge>;
      case 'shipped': return <Badge variant="teal">Spedito</Badge>;
      case 'received': return <Badge variant="success">Ricevuto</Badge>;
      case 'cancelled': return <Badge variant="destructive">Annullato</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: staticColors.primary }]} onPress={loadOrders}>
          <Text style={styles.retryText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return <Loading text="Caricamento ordini..." />;
  }

  return (
    <View style={styles.subScreenContainer}>
      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessun ordine</Text>
          <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
            Crea il primo ordine d'acquisto
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Card style={styles.orderItem}>
              <View style={[styles.orderIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="cart" size={24} color="#3B82F6" />
              </View>
              <View style={styles.orderInfo}>
                <View style={styles.orderHeader}>
                  <Text style={[styles.orderNumber, { color: colors.foreground }]}>#{item.orderNumber}</Text>
                  {getStatusBadge(item.status)}
                </View>
                <Text style={[styles.orderSupplier, { color: colors.mutedForeground }]}>
                  {item.supplierName} • {new Date(item.createdAt).toLocaleDateString('it-IT')}
                </Text>
                <Text style={[styles.orderTotal, { color: staticColors.primary }]}>
                  {formatCurrency(item.totalAmount)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </Card>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: '#3B82F6' }]}
        onPress={() => { triggerHaptic('selection'); Alert.alert('Nuovo Ordine', 'Seleziona il fornitore'); }}
        testID="button-add-order"
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </Pressable>
    </View>
  );
}

function ReturnsSubScreen({ onBack }: SubScreenProps) {
  const { colors } = useTheme();
  const [returns, setReturns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getWarehouseReturns();
      setReturns(data);
    } catch (error) {
      console.error('Error loading returns:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="warning">In Attesa</Badge>;
      case 'in_progress': return <Badge variant="default">In Corso</Badge>;
      case 'completed': return <Badge variant="success">Completato</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: staticColors.primary }]} onPress={loadReturns}>
          <Text style={styles.retryText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return <Loading text="Caricamento resi..." />;
  }

  return (
    <View style={styles.subScreenContainer}>
      {returns.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="return-down-back-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessun reso</Text>
          <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
            I resi da eventi appariranno qui
          </Text>
        </View>
      ) : (
        <FlatList
          data={returns}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Card style={styles.returnItem}>
              <View style={[styles.returnIcon, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="return-down-back" size={24} color="#EF4444" />
              </View>
              <View style={styles.returnInfo}>
                <View style={styles.returnHeader}>
                  <Text style={[styles.returnEvent, { color: colors.foreground }]}>{item.eventName}</Text>
                  {getStatusBadge(item.status)}
                </View>
                <Text style={[styles.returnDetails, { color: colors.mutedForeground }]}>
                  {item.itemsCount} articoli • {new Date(item.returnDate).toLocaleDateString('it-IT')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </Card>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  headerCard: {
    marginBottom: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: spacing.sm,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  alertContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  alertTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: typography.fontSize.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  menuList: {
    marginBottom: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  menuLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  menuDescription: {
    fontSize: typography.fontSize.sm,
  },
  quickActions: {
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.xs,
  },
  actionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  subScreenContainer: {
    flex: 1,
    padding: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.fontSize.base,
  },
  filterRow: {
    marginBottom: spacing.md,
    maxHeight: 44,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    maxWidth: 250,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: typography.fontSize.sm,
  },
  productStock: {
    alignItems: 'flex-end',
  },
  stockText: {
    fontSize: typography.fontSize.xs,
    marginTop: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: typography.fontSize.sm,
  },
  movementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  movementIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  movementInfo: {
    flex: 1,
  },
  movementProduct: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginBottom: 4,
  },
  movementDetails: {
    fontSize: typography.fontSize.sm,
  },
  movementQuantity: {
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  priceListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceListIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  priceListInfo: {
    flex: 1,
  },
  priceListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceListName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  priceListDetails: {
    fontSize: typography.fontSize.sm,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  orderSupplier: {
    fontSize: typography.fontSize.sm,
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  returnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  returnIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  returnInfo: {
    flex: 1,
  },
  returnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  returnEvent: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  returnDetails: {
    fontSize: typography.fontSize.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
