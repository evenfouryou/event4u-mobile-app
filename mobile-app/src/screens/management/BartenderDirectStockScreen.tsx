import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
}

interface ConsumptionEntry {
  productId: string;
  quantity: number;
}

export function BartenderDirectStockScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  const stationId = route.params?.stationId;
  const eventId = route.params?.eventId;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [consumptions, setConsumptions] = useState<Map<string, number>>(new Map());
  const [stationName, setStationName] = useState('');

  useEffect(() => {
    loadProducts();
  }, [stationId, eventId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let endpoint = stationId 
        ? `/api/stations/${stationId}`
        : `/api/events/${eventId}/direct-stock`;
      
      const [productsData, stationData] = await Promise.all([
        api.get<any[]>(endpoint),
        stationId ? api.get<any>(`/api/stations/${stationId}`) : Promise.resolve({ name: 'Evento' }),
      ]);
      
      setStationName(stationData.name || 'Stazione');
      setProducts(productsData.map((p: any) => ({
        id: p.id?.toString() || '',
        name: p.name || '',
        category: p.category || '',
        stock: p.currentStock || p.stock || 0,
        minStock: p.minStock || 0,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const updateConsumption = (productId: string, delta: number) => {
    const newConsumptions = new Map(consumptions);
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const current = newConsumptions.get(productId) || 0;
    const newValue = Math.max(0, Math.min(product.stock, current + delta));
    
    if (newValue === 0) {
      newConsumptions.delete(productId);
    } else {
      newConsumptions.set(productId, newValue);
    }
    setConsumptions(newConsumptions);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasConsumptions = consumptions.size > 0;
  const totalItems = Array.from(consumptions.values()).reduce((sum, qty) => sum + qty, 0);

  const handleSubmit = async () => {
    if (!hasConsumptions) return;

    try {
      setSubmitting(true);
      setError(null);

      const entries: ConsumptionEntry[] = Array.from(consumptions.entries()).map(([productId, quantity]) => ({
        productId,
        quantity,
      }));

      const endpoint = stationId 
        ? `/api/stations/${stationId}`
        : `/api/events/${eventId}/direct-stock/consume`;

      await api.post(endpoint, { consumptions: entries });
      
      Alert.alert('Registrato', `${totalItems} consumazioni registrate`, [
        { text: 'OK', onPress: () => {
          setConsumptions(new Map());
          loadProducts();
        }},
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore registrazione');
    } finally {
      setSubmitting(false);
    }
  };

  const getStockColor = (stock: number, min: number) => {
    if (stock <= 0) return colors.destructive;
    if (stock <= min) return colors.warning;
    return colors.success;
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const consumption = consumptions.get(item.id) || 0;
    const remainingStock = item.stock - consumption;
    const stockColor = getStockColor(remainingStock, item.minStock);

    return (
      <TouchableOpacity
        style={[styles.productCard, consumption > 0 && styles.productCardSelected]}
        onPress={() => updateConsumption(item.id, 1)}
        onLongPress={() => {
          if (consumption > 0) {
            setConsumptions(prev => {
              const newMap = new Map(prev);
              newMap.delete(item.id);
              return newMap;
            });
          }
        }}
        activeOpacity={0.7}
        data-testid={`product-${item.id}`}
      >
        <View style={styles.productHeader}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={[styles.stockBadge, { color: stockColor }]}>{remainingStock}</Text>
        </View>
        
        <Text style={styles.productCategory}>{item.category}</Text>

        {consumption > 0 && (
          <View style={styles.consumptionBadge}>
            <TouchableOpacity
              style={styles.decrementButton}
              onPress={(e) => {
                e.stopPropagation?.();
                updateConsumption(item.id, -1);
              }}
              data-testid={`button-decrement-${item.id}`}
            >
              <Ionicons name="remove" size={16} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={styles.consumptionCount}>{consumption}</Text>
            <TouchableOpacity
              style={styles.incrementButton}
              onPress={(e) => {
                e.stopPropagation?.();
                updateConsumption(item.id, 1);
              }}
              disabled={remainingStock <= 0}
              data-testid={`button-increment-${item.id}`}
            >
              <Ionicons name="add" size={16} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Registra Consumo" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Registra Consumo"
        subtitle={stationName}
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca prodotti..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="input-search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.helperText}>
        Tocca un prodotto per aggiungere. Tieni premuto per rimuovere tutti.
      </Text>

      {filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="wine-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun prodotto trovato</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={isLandscape ? 4 : 2}
          key={isLandscape ? 'landscape' : 'portrait'}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      )}

      {hasConsumptions && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.footerSummary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Prodotti</Text>
              <Text style={styles.summaryValue}>{consumptions.size}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Totale</Text>
              <Text style={styles.summaryValue}>{totalItems}</Text>
            </View>
          </View>
          <Button
            title={submitting ? 'Registrazione...' : 'Registra Consumo'}
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.submitButton}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  helperText: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  gridContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  productCard: {
    flex: 0.48,
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    minHeight: 100,
  },
  productCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.foreground,
    marginRight: spacing.xs,
  },
  stockBadge: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  productCategory: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  consumptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  decrementButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  incrementButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  consumptionCount: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.destructive}20`,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.destructive,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.glass.background,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  footerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  submitButton: {
    width: '100%',
  },
});
