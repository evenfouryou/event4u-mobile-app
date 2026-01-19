import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

interface StatCard {
  id: string;
  label: string;
  value: string;
  icon: string;
  color: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  image?: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  price: number;
  todayConsumption: number;
}

const CATEGORIES = [
  { id: 'all', label: 'Tutti', icon: 'grid-outline' },
  { id: 'bevande', label: 'Bevande', icon: 'water-outline' },
  { id: 'alcolici', label: 'Alcolici', icon: 'wine-outline' },
  { id: 'snacks', label: 'Snacks', icon: 'fast-food-outline' },
  { id: 'accessori', label: 'Accessori', icon: 'cube-outline' },
];

export default function InventoryHomeScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stats, setStats] = useState({
    totalProducts: 0,
    criticalStock: 0,
    todayConsumption: 0,
    inventoryValue: 0,
  });

  const numColumns = isTablet || isLandscape ? 2 : 2;
  const cardWidth = (width - spacing.lg * 2 - spacing.md * (numColumns - 1)) / numColumns;

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await api.get<any[]>('/api/products');
      
      const formattedProducts: Product[] = (data || []).map((p: any) => ({
        id: p.id?.toString() || '',
        name: p.name || '',
        category: p.category || 'altri',
        image: p.image || p.imageUrl,
        currentStock: p.currentStock || p.stock || 0,
        minStock: p.minStock || 10,
        maxStock: p.maxStock || 100,
        unit: p.unit || 'pz',
        price: parseFloat(p.price || '0'),
        todayConsumption: p.todayConsumption || 0,
      }));

      setProducts(formattedProducts);

      const critical = formattedProducts.filter(p => p.currentStock <= p.minStock).length;
      const totalValue = formattedProducts.reduce((sum, p) => sum + (p.currentStock * p.price), 0);
      const todayCons = formattedProducts.reduce((sum, p) => sum + p.todayConsumption, 0);

      setStats({
        totalProducts: formattedProducts.length,
        criticalStock: critical,
        todayConsumption: todayCons,
        inventoryValue: totalValue,
      });
    } catch (e) {
      console.error('Error loading inventory:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category.toLowerCase() === selectedCategory);

  const getStockStatus = (current: number, min: number, max: number) => {
    const percentage = (current / max) * 100;
    if (current <= min) return { color: colors.destructive, label: 'Critico' };
    if (percentage <= 30) return { color: colors.warning, label: 'Basso' };
    return { color: colors.teal, label: 'OK' };
  };

  const statsCards: StatCard[] = [
    {
      id: '1',
      label: 'Prodotti Totali',
      value: stats.totalProducts.toString(),
      icon: 'cube',
      color: colors.primary,
    },
    {
      id: '2',
      label: 'Stock Critico',
      value: stats.criticalStock.toString(),
      icon: 'alert-circle',
      color: colors.destructive,
    },
    {
      id: '3',
      label: 'Consumo Oggi',
      value: stats.todayConsumption.toString(),
      icon: 'trending-down',
      color: colors.warning,
    },
    {
      id: '4',
      label: 'Valore Inventario',
      value: `€${stats.inventoryValue.toLocaleString('it-IT')}`,
      icon: 'cash',
      color: colors.teal,
    },
  ];

  const renderStatCard = ({ item }: { item: StatCard }) => (
    <Card style={[styles.statCard, { width: cardWidth }]} variant="glass" testID={`stat-card-${item.id}`}>
      <View style={[styles.statIcon, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon as any} size={20} color={item.color} />
      </View>
      <Text style={styles.statValue} testID={`stat-value-${item.id}`}>{item.value}</Text>
      <Text style={styles.statLabel}>{item.label}</Text>
    </Card>
  );

  const renderCategoryPill = ({ id, label, icon }: typeof CATEGORIES[0]) => (
    <TouchableOpacity
      key={id}
      style={[
        styles.categoryPill,
        selectedCategory === id && styles.categoryPillActive,
      ]}
      onPress={() => setSelectedCategory(id)}
      testID={`pill-category-${id}`}
    >
      <Ionicons
        name={icon as any}
        size={16}
        color={selectedCategory === id ? colors.primaryForeground : colors.foreground}
      />
      <Text
        style={[
          styles.categoryPillText,
          selectedCategory === id && styles.categoryPillTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderProductCard = ({ item }: { item: Product }) => {
    const stockStatus = getStockStatus(item.currentStock, item.minStock, item.maxStock);
    const stockPercentage = Math.min((item.currentStock / item.maxStock) * 100, 100);

    return (
      <TouchableOpacity
        style={[styles.productCard, { width: cardWidth }]}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        activeOpacity={0.8}
        testID={`card-product-${item.id}`}
      >
        <Card variant="glass">
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImage} testID={`image-product-${item.id}`} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={32} color={colors.mutedForeground} />
            </View>
          )}
          <Text style={styles.productName} numberOfLines={1} testID={`text-product-name-${item.id}`}>{item.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
          <View style={styles.stockInfo}>
            <Text style={styles.stockText} testID={`text-stock-${item.id}`}>
              {item.currentStock} {item.unit}
            </Text>
            <View style={[styles.stockStatusBadge, { backgroundColor: `${stockStatus.color}20` }]}>
              <Text style={[styles.stockStatusText, { color: stockStatus.color }]} testID={`text-status-${item.id}`}>
                {stockStatus.label}
              </Text>
            </View>
          </View>
          <View style={styles.stockBarContainer}>
            <View
              style={[
                styles.stockBar,
                {
                  width: `${stockPercentage}%`,
                  backgroundColor: stockStatus.color,
                },
              ]}
            />
          </View>
          {item.todayConsumption > 0 && (
            <Text style={styles.consumptionText} testID={`text-consumption-${item.id}`}>
              -{item.todayConsumption} oggi
            </Text>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Magazzino" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText}>Caricamento inventario...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Magazzino"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductList')}
            testID="button-view-all"
          >
            <Ionicons name="list-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
        testID="scroll-view-inventory"
      >
        <View style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <Text style={styles.sectionTitle}>Panoramica</Text>
          <FlatList
            data={statsCards}
            renderItem={renderStatCard}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            columnWrapperStyle={styles.statsGrid}
            scrollEnabled={false}
            testID="list-stats"
          />
        </View>

        <View style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <Text style={styles.sectionTitle}>Categorie</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
            testID="scroll-categories"
          >
            {CATEGORIES.map(renderCategoryPill)}
          </ScrollView>
        </View>

        <View style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prodotti</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProductList')}
              testID="button-view-all-products"
            >
              <Text style={styles.viewAllText}>Vedi tutti</Text>
            </TouchableOpacity>
          </View>
          {filteredProducts.length > 0 ? (
            <FlatList
              data={filteredProducts.slice(0, isTablet || isLandscape ? 8 : 6)}
              renderItem={renderProductCard}
              keyExtractor={(item) => item.id}
              numColumns={numColumns}
              columnWrapperStyle={styles.productsGrid}
              scrollEnabled={false}
              testID="list-products"
            />
          ) : (
            <Card style={styles.emptyCard} variant="glass" testID="card-empty">
              <Ionicons name="cube-outline" size={32} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>Nessun prodotto trovato</Text>
            </Card>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, isLandscape && styles.fabLandscape]}
        onPress={() => navigation.navigate('Consumption')}
        activeOpacity={0.8}
        testID="button-add-consumption"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentLandscape: {
    paddingBottom: 80,
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
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionLandscape: {
    paddingHorizontal: spacing.xl,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  statsGrid: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  categoriesContainer: {
    gap: spacing.sm,
  },
  categoryPill: {
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
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  categoryPillTextActive: {
    color: colors.primaryForeground,
  },
  productsGrid: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  productCard: {
    flex: 1,
  },
  productImage: {
    width: '100%',
    height: 80,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  productName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  categoryBadgeText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stockText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  stockStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  stockStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  stockBarContainer: {
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  stockBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  consumptionText: {
    color: colors.warning,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabLandscape: {
    bottom: 80,
  },
});
