import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';

interface StockItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  location: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
  color: string;
}

interface WarehouseStats {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
}

const CATEGORIES: Category[] = [
  { id: 'bevande', name: 'Bevande', icon: 'water-outline', count: 45, color: colors.teal },
  { id: 'alcolici', name: 'Alcolici', icon: 'wine-outline', count: 32, color: colors.primary },
  { id: 'snacks', name: 'Snacks', icon: 'fast-food-outline', count: 18, color: colors.warning },
  { id: 'accessori', name: 'Accessori', icon: 'cube-outline', count: 24, color: '#8B5CF6' },
];

export default function WarehouseScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const [refreshing, setRefreshing] = useState(false);

  const numColumns = isTablet || isLandscape ? 2 : 2;
  const cardWidth = (width - spacing.lg * 2 - spacing.md * (numColumns - 1)) / numColumns;

  const { data: stats, refetch: refetchStats } = useQuery<WarehouseStats>({
    queryKey: ['/api/warehouse/stats'],
  });

  const { data: lowStockItems, refetch: refetchItems } = useQuery<StockItem[]>({
    queryKey: ['/api/warehouse/low-stock'],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchItems()]);
    setRefreshing(false);
  }, [refetchStats, refetchItems]);

  const warehouseStats = stats || {
    totalItems: 119,
    lowStockCount: 8,
    outOfStockCount: 2,
    totalValue: 45670,
  };

  const mockLowStockItems: StockItem[] = lowStockItems || [
    { id: '1', name: 'Coca Cola 33cl', category: 'Bevande', currentStock: 5, minStock: 20, maxStock: 100, unit: 'pz', location: 'A1' },
    { id: '2', name: 'Vodka Premium', category: 'Alcolici', currentStock: 2, minStock: 10, maxStock: 50, unit: 'bt', location: 'B3' },
    { id: '3', name: 'Bicchieri Plastica', category: 'Accessori', currentStock: 50, minStock: 200, maxStock: 1000, unit: 'pz', location: 'C2' },
  ];

  const getStockPercentage = (current: number, max: number) => Math.min((current / max) * 100, 100);
  
  const getStockColor = (current: number, min: number) => {
    if (current === 0) return colors.destructive;
    if (current <= min) return colors.warning;
    return colors.teal;
  };

  const renderStatCard = (
    label: string,
    value: string | number,
    icon: string,
    color: string,
    testId: string
  ) => (
    <Card style={[styles.statCard, { width: cardWidth }]} variant="glass" testID={testId}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );

  const renderCategoryCard = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { width: cardWidth }]}
      onPress={() => navigation.navigate('ProductList', { category: item.id })}
      activeOpacity={0.8}
      testID={`card-category-${item.id}`}
    >
      <Card variant="glass" style={styles.categoryCardInner}>
        <View style={[styles.categoryIcon, { backgroundColor: `${item.color}20` }]}>
          <Ionicons name={item.icon as any} size={24} color={item.color} />
        </View>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryCount}>{item.count} prodotti</Text>
      </Card>
    </TouchableOpacity>
  );

  const renderLowStockItem = ({ item }: { item: StockItem }) => {
    const percentage = getStockPercentage(item.currentStock, item.maxStock);
    const stockColor = getStockColor(item.currentStock, item.minStock);

    return (
      <TouchableOpacity
        style={styles.lowStockItem}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        activeOpacity={0.8}
        testID={`card-lowstock-${item.id}`}
      >
        <Card variant="glass" style={styles.lowStockCard}>
          <View style={styles.lowStockHeader}>
            <View style={styles.lowStockInfo}>
              <Text style={styles.lowStockName} numberOfLines={1} testID={`text-lowstock-name-${item.id}`}>{item.name}</Text>
              <Text style={styles.lowStockLocation}>
                <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                {' '}{item.location}
              </Text>
            </View>
            <View style={[styles.stockBadge, { backgroundColor: `${stockColor}20` }]}>
              <Text style={[styles.stockBadgeText, { color: stockColor }]} testID={`text-lowstock-qty-${item.id}`}>
                {item.currentStock} {item.unit}
              </Text>
            </View>
          </View>
          <View style={styles.stockBarContainer}>
            <View style={[styles.stockBar, { width: `${percentage}%`, backgroundColor: stockColor }]} />
          </View>
          <Text style={styles.lowStockMeta}>
            Min: {item.minStock} | Max: {item.maxStock}
          </Text>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Magazzino"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('StockAdjustment')}
            testID="button-adjust-stock"
          >
            <Ionicons name="swap-horizontal-outline" size={24} color={colors.foreground} />
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        testID="scroll-view-warehouse"
      >
        <View style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <Text style={styles.sectionTitle}>Panoramica</Text>
          <View style={styles.statsGrid}>
            {renderStatCard('Prodotti Totali', warehouseStats.totalItems, 'cube', colors.primary, 'stat-total-items')}
            {renderStatCard('Stock Basso', warehouseStats.lowStockCount, 'alert-circle', colors.warning, 'stat-low-stock')}
            {renderStatCard('Esauriti', warehouseStats.outOfStockCount, 'close-circle', colors.destructive, 'stat-out-of-stock')}
            {renderStatCard('Valore', `€${warehouseStats.totalValue.toLocaleString()}`, 'cash', colors.teal, 'stat-value')}
          </View>
        </View>

        <View style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <Text style={styles.sectionTitle}>Categorie</Text>
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategoryCard}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            columnWrapperStyle={styles.categoriesGrid}
            scrollEnabled={false}
            testID="list-categories"
          />
        </View>

        <View style={[styles.section, isLandscape && styles.sectionLandscape]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stock Critico</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProductList', { filter: 'low-stock' })}
              testID="button-view-all-lowstock"
            >
              <Text style={styles.viewAllText}>Vedi tutti</Text>
            </TouchableOpacity>
          </View>
          {mockLowStockItems.length > 0 ? (
            <FlatList
              data={mockLowStockItems}
              renderItem={renderLowStockItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
              testID="list-low-stock"
            />
          ) : (
            <Card style={styles.emptyCard} variant="glass" testID="card-empty">
              <Ionicons name="checkmark-circle-outline" size={32} color={colors.teal} />
              <Text style={styles.emptyText}>Nessun prodotto in stock critico</Text>
            </Card>
          )}
        </View>

        <View style={[styles.actionsSection, isLandscape && styles.actionsSectionLandscape]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ReturnToWarehouse')}
            activeOpacity={0.8}
            testID="button-returns"
          >
            <Card variant="glass" style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: `${colors.teal}20` }]}>
                <Ionicons name="arrow-undo-outline" size={24} color={colors.teal} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Resi al Magazzino</Text>
                <Text style={styles.actionSubtitle}>Gestisci i ritorni dagli eventi</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Suppliers')}
            activeOpacity={0.8}
            testID="button-suppliers"
          >
            <Card variant="glass" style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="people-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Fornitori</Text>
                <Text style={styles.actionSubtitle}>Gestisci i tuoi fornitori</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('PurchaseOrders')}
            activeOpacity={0.8}
            testID="button-orders"
          >
            <Card variant="glass" style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: `${colors.warning}20` }]}>
                <Ionicons name="document-text-outline" size={24} color={colors.warning} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Ordini Acquisto</Text>
                <Text style={styles.actionSubtitle}>Traccia gli ordini ai fornitori</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </Card>
          </TouchableOpacity>
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
  categoriesGrid: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  categoryCard: {
    flex: 1,
  },
  categoryCardInner: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  categoryName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  categoryCount: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  lowStockItem: {
    marginBottom: spacing.xs,
  },
  lowStockCard: {
    paddingVertical: spacing.lg,
  },
  lowStockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  lowStockInfo: {
    flex: 1,
  },
  lowStockName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  lowStockLocation: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  stockBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  stockBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  stockBarContainer: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  stockBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  lowStockMeta: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.md,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  actionsSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionsSectionLandscape: {
    paddingHorizontal: spacing.xl,
  },
  actionButton: {
    marginBottom: spacing.xs,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabLandscape: {
    bottom: 80,
  },
});
