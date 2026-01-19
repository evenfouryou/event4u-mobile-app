import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

interface BeverageItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  isActive: boolean;
}

export function BeverageScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [items, setItems] = useState<BeverageItem[]>([
    { id: '1', name: 'Vodka Absolut', category: 'Spirits', price: 8, stock: 24, minStock: 10, isActive: true },
    { id: '2', name: 'Gin Tanqueray', category: 'Spirits', price: 9, stock: 18, minStock: 8, isActive: true },
    { id: '3', name: 'Prosecco', category: 'Vini', price: 6, stock: 48, minStock: 20, isActive: true },
    { id: '4', name: 'Champagne Moët', category: 'Champagne', price: 80, stock: 12, minStock: 6, isActive: true },
    { id: '5', name: 'Birra Heineken', category: 'Birre', price: 5, stock: 96, minStock: 50, isActive: true },
    { id: '6', name: 'Red Bull', category: 'Energy', price: 4, stock: 3, minStock: 20, isActive: true },
    { id: '7', name: 'Coca Cola', category: 'Soft Drink', price: 3, stock: 72, minStock: 30, isActive: true },
    { id: '8', name: 'Rum Havana Club', category: 'Spirits', price: 8, stock: 5, minStock: 8, isActive: false },
  ]);

  const categories = [...new Set(items.map(item => item.category))];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleAddItem = () => {
    Alert.alert('Aggiungi Prodotto', 'Funzionalità in sviluppo');
  };

  const handleEditItem = (item: BeverageItem) => {
    Alert.alert('Modifica Prodotto', `Modifica di "${item.name}" in sviluppo`);
  };

  const handleToggleActive = (itemId: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isActive: !item.isActive } : item
      )
    );
  };

  const handleUpdateStock = (itemId: string, delta: number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, stock: Math.max(0, item.stock + delta) }
          : item
      )
    );
  };

  const getStockStatus = (item: BeverageItem) => {
    if (item.stock <= 0) return 'critical';
    if (item.stock < item.minStock) return 'low';
    return 'normal';
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case 'critical': return colors.destructive;
      case 'low': return colors.warning;
      default: return colors.success;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = items.filter(item => item.stock < item.minStock).length;
  const totalValue = items.reduce((sum, item) => sum + (item.price * item.stock), 0);

  const renderItemCard = (item: BeverageItem, index: number) => {
    const stockStatus = getStockStatus(item);
    const stockColor = getStockColor(stockStatus);
    
    return (
      <View
        key={item.id}
        style={[
          styles.itemCard,
          !item.isActive && styles.itemCardInactive,
          (isTablet || isLandscape) && {
            flex: 1,
            marginLeft: index % 2 === 1 ? spacing.md : 0,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.itemHeader}
          onPress={() => handleEditItem(item)}
          activeOpacity={0.8}
          testID={`item-card-${item.id}`}
        >
          <View style={styles.itemInfo}>
            <View style={styles.itemTitleRow}>
              <Text style={[styles.itemName, !item.isActive && styles.itemNameInactive]}>
                {item.name}
              </Text>
              {!item.isActive && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>Disattivo</Text>
                </View>
              )}
            </View>
            <Text style={styles.itemCategory}>{item.category}</Text>
            <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleToggleActive(item.id)}
            testID={`toggle-${item.id}`}
          >
            <Ionicons
              name={item.isActive ? 'eye' : 'eye-off'}
              size={20}
              color={item.isActive ? colors.teal : colors.mutedForeground}
            />
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.stockSection}>
          <View style={styles.stockInfo}>
            <Text style={styles.stockLabel}>Stock</Text>
            <View style={styles.stockBarContainer}>
              <View
                style={[
                  styles.stockBar,
                  {
                    width: `${Math.min((item.stock / (item.minStock * 2)) * 100, 100)}%`,
                    backgroundColor: stockColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.stockValue, { color: stockColor }]}>
              {item.stock} unità
            </Text>
          </View>
          
          <View style={styles.stockControls}>
            <TouchableOpacity
              style={styles.stockButton}
              onPress={() => handleUpdateStock(item.id, -1)}
              testID={`decrement-${item.id}`}
            >
              <Ionicons name="remove" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stockButton, styles.stockButtonAdd]}
              onPress={() => handleUpdateStock(item.id, 1)}
              testID={`increment-${item.id}`}
            >
              <Ionicons name="add" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderItemRows = () => {
    if (!isTablet && !isLandscape) {
      return filteredItems.map((item, index) => renderItemCard(item, index));
    }

    const rows = [];
    for (let i = 0; i < filteredItems.length; i += 2) {
      rows.push(
        <View key={i} style={styles.itemRow}>
          {renderItemCard(filteredItems[i], 0)}
          {filteredItems[i + 1] && renderItemCard(filteredItems[i + 1], 1)}
        </View>
      );
    }
    return rows;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="button-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestione Beverage</Text>
        <TouchableOpacity
          onPress={handleAddItem}
          style={styles.addButton}
          testID="button-add-item"
        >
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.statsRow, isLandscape && styles.statsRowLandscape]}>
        <View style={[styles.statCard, isTablet && styles.statCardTablet]}>
          <Ionicons name="wine" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{items.length}</Text>
          <Text style={styles.statLabel}>Prodotti</Text>
        </View>
        <View style={[styles.statCard, isTablet && styles.statCardTablet]}>
          <Ionicons name="alert-circle" size={24} color={colors.warning} />
          <Text style={styles.statValue}>{lowStockCount}</Text>
          <Text style={styles.statLabel}>Stock Basso</Text>
        </View>
        <View style={[styles.statCard, isTablet && styles.statCardTablet]}>
          <Ionicons name="cash" size={24} color={colors.teal} />
          <Text style={styles.statValue}>{formatCurrency(totalValue)}</Text>
          <Text style={styles.statLabel}>Valore</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, isLandscape && styles.searchContainerLandscape]}>
        <View style={[styles.searchBar, isTablet && styles.searchBarTablet]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca prodotto..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.categoriesContainer,
          isLandscape && styles.categoriesContainerLandscape,
        ]}
      >
        <TouchableOpacity
          style={[styles.categoryPill, !selectedCategory && styles.categoryPillActive]}
          onPress={() => setSelectedCategory(null)}
          testID="category-all"
        >
          <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>
            Tutti
          </Text>
        </TouchableOpacity>
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[styles.categoryPill, selectedCategory === category && styles.categoryPillActive]}
            onPress={() => setSelectedCategory(category)}
            testID={`category-${category.toLowerCase().replace(' ', '-')}`}
          >
            <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wine-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun prodotto trovato</Text>
          </View>
        ) : (
          renderItemRows()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLandscape: {
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statsRowLandscape: {
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardTablet: {
    maxWidth: 180,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchContainerLandscape: {
    paddingHorizontal: spacing.xl,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  searchBarTablet: {
    maxWidth: 500,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  categoriesContainerLandscape: {
    paddingHorizontal: spacing.xl,
  },
  categoryPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  categoryTextActive: {
    color: colors.primaryForeground,
    fontWeight: fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  scrollContentLandscape: {
    paddingHorizontal: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    marginTop: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  itemCardInactive: {
    opacity: 0.6,
  },
  itemHeader: {
    flexDirection: 'row',
    padding: spacing.lg,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  itemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  itemNameInactive: {
    color: colors.mutedForeground,
  },
  inactiveBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  inactiveBadgeText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  itemCategory: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  itemPrice: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  stockInfo: {
    flex: 1,
  },
  stockLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  stockBarContainer: {
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: 3,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  stockBar: {
    height: '100%',
    borderRadius: 3,
  },
  stockValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  stockControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stockButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockButtonAdd: {
    backgroundColor: colors.primary,
  },
});
