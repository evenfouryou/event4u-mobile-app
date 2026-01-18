import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

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
}

const CATEGORIES = [
  { id: 'all', label: 'Tutti' },
  { id: 'bevande', label: 'Bevande' },
  { id: 'alcolici', label: 'Alcolici' },
  { id: 'snacks', label: 'Snacks' },
  { id: 'accessori', label: 'Accessori' },
];

const STOCK_FILTERS = [
  { id: 'all', label: 'Tutti', color: colors.foreground },
  { id: 'normal', label: 'Normale', color: colors.teal },
  { id: 'low', label: 'Basso', color: colors.warning },
  { id: 'critical', label: 'Critico', color: colors.destructive },
];

export default function ProductListScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState('all');

  const loadProducts = async () => {
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
      }));

      setProducts(formattedProducts);
    } catch (e) {
      console.error('Error loading products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const getStockLevel = (current: number, min: number, max: number) => {
    const percentage = (current / max) * 100;
    if (current <= min) return 'critical';
    if (percentage <= 30) return 'low';
    return 'normal';
  };

  const getStockStatus = (level: string) => {
    switch (level) {
      case 'critical':
        return { color: colors.destructive, label: 'Critico' };
      case 'low':
        return { color: colors.warning, label: 'Basso' };
      default:
        return { color: colors.teal, label: 'OK' };
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category.toLowerCase() === selectedCategory;
    const stockLevel = getStockLevel(product.currentStock, product.minStock, product.maxStock);
    const matchesStock = selectedStockFilter === 'all' || stockLevel === selectedStockFilter;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const renderProduct = ({ item }: { item: Product }) => {
    const stockLevel = getStockLevel(item.currentStock, item.minStock, item.maxStock);
    const stockStatus = getStockStatus(stockLevel);
    const stockPercentage = Math.min((item.currentStock / item.maxStock) * 100, 100);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        activeOpacity={0.8}
        data-testid={`card-product-${item.id}`}
      >
        <Card variant="glass">
          <View style={styles.productRow}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.productImage} />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="cube-outline" size={24} color={colors.mutedForeground} />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
              <View style={styles.stockRow}>
                <Text style={styles.stockText}>
                  {item.currentStock} {item.unit}
                </Text>
                <View style={[styles.stockStatusBadge, { backgroundColor: `${stockStatus.color}20` }]}>
                  <Text style={[styles.stockStatusText, { color: stockStatus.color }]}>
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
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Prodotti" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento prodotti...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Prodotti" showBack />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca prodotti..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="input-search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} data-testid="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterPill,
                selectedCategory === cat.id && styles.filterPillActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
              data-testid={`filter-category-${cat.id}`}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedCategory === cat.id && styles.filterPillTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {STOCK_FILTERS.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterPill,
                selectedStockFilter === filter.id && styles.filterPillActive,
                { borderColor: filter.id !== 'all' ? filter.color : colors.borderSubtle },
              ]}
              onPress={() => setSelectedStockFilter(filter.id)}
              data-testid={`filter-stock-${filter.id}`}
            >
              {filter.id !== 'all' && (
                <View style={[styles.filterDot, { backgroundColor: filter.color }]} />
              )}
              <Text
                style={[
                  styles.filterPillText,
                  selectedStockFilter === filter.id && styles.filterPillTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Card style={styles.emptyCard} variant="glass">
            <Ionicons name="cube-outline" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun prodotto trovato</Text>
          </Card>
        }
      />
    </View>
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
    paddingVertical: spacing.md,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  productCard: {
    marginBottom: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
  },
  productImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
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
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
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
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
});
