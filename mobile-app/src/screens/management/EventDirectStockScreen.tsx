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
  currentStock: number;
  minStock: number;
  eventStock: number;
  price: number;
}

interface StockMovement {
  productId: string;
  quantity: number;
  type: 'add' | 'remove';
}

export function EventDirectStockScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const eventId = route.params?.eventId;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [movements, setMovements] = useState<Map<string, StockMovement>>(new Map());
  const [eventName, setEventName] = useState('');

  useEffect(() => {
    loadEventStock();
  }, [eventId]);

  const loadEventStock = async () => {
    try {
      setLoading(true);
      setError(null);
      const [eventData, stockData] = await Promise.all([
        api.get<any>(`/api/events/${eventId}`),
        api.get<any[]>(`/api/events/${eventId}/direct-stock`).catch(() => []),
      ]);
      setEventName(eventData.name || 'Evento');
      setProducts(stockData.map((p: any) => ({
        id: p.id?.toString() || '',
        name: p.name || '',
        category: p.category || '',
        currentStock: p.currentStock || 0,
        minStock: p.minStock || 0,
        eventStock: p.eventStock || p.allocatedStock || 0,
        price: p.price || 0,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const updateMovement = (productId: string, delta: number) => {
    const newMovements = new Map(movements);
    const existing = newMovements.get(productId);
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let newQuantity = (existing?.quantity || 0) + delta;
    const maxAdd = product.currentStock;
    const maxRemove = -product.eventStock;

    newQuantity = Math.max(maxRemove, Math.min(maxAdd, newQuantity));

    if (newQuantity === 0) {
      newMovements.delete(productId);
    } else {
      newMovements.set(productId, {
        productId,
        quantity: Math.abs(newQuantity),
        type: newQuantity > 0 ? 'add' : 'remove',
      });
    }
    setMovements(newMovements);
  };

  const getMovementQuantity = (productId: string): number => {
    const movement = movements.get(productId);
    if (!movement) return 0;
    return movement.type === 'add' ? movement.quantity : -movement.quantity;
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasChanges = movements.size > 0;

  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      setSaving(true);
      setError(null);

      const stockUpdates = Array.from(movements.values()).map((m) => ({
        productId: m.productId,
        quantity: m.quantity,
        type: m.type,
      }));

      await api.post(`/api/events/${eventId}/direct-stock/load`, { movements: stockUpdates });
      
      Alert.alert('Successo', 'Stock aggiornato correttamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const getStockColor = (current: number, min: number) => {
    if (current <= 0) return colors.destructive;
    if (current <= min) return colors.warning;
    return colors.success;
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const movementQty = getMovementQuantity(item.id);
    const projectedStock = item.eventStock + movementQty;
    const stockColor = getStockColor(projectedStock, item.minStock);

    return (
      <Card style={styles.productCard} variant="elevated" data-testid={`product-${item.id}`}>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productCategory}>{item.category}</Text>
          </View>
          <View style={styles.stockInfo}>
            <Text style={styles.stockLabel}>Magazzino</Text>
            <Text style={styles.stockValue}>{item.currentStock}</Text>
          </View>
        </View>

        <View style={styles.stockControls}>
          <View style={styles.eventStockContainer}>
            <Text style={styles.eventStockLabel}>Stock Evento</Text>
            <Text style={[styles.eventStockValue, { color: stockColor }]}>
              {projectedStock}
              {movementQty !== 0 && (
                <Text style={{ color: movementQty > 0 ? colors.success : colors.destructive }}>
                  {' '}({movementQty > 0 ? '+' : ''}{movementQty})
                </Text>
              )}
            </Text>
          </View>

          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={[styles.controlButton, styles.removeButton]}
              onPress={() => updateMovement(item.id, -1)}
              disabled={projectedStock <= 0}
              data-testid={`button-remove-${item.id}`}
            >
              <Ionicons name="remove" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, styles.addButton]}
              onPress={() => updateMovement(item.id, 1)}
              disabled={item.currentStock - (movementQty > 0 ? movementQty : 0) <= 0}
              data-testid={`button-add-${item.id}`}
            >
              <Ionicons name="add" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {item.minStock > 0 && projectedStock <= item.minStock && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={14} color={colors.warning} />
            <Text style={styles.warningText}>Stock minimo: {item.minStock}</Text>
          </View>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Stock Evento" showBack onBack={() => navigation.goBack()} />
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
        title="Stock Evento"
        subtitle={eventName}
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
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Prodotti</Text>
          <Text style={styles.summaryValue}>{products.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Modifiche</Text>
          <Text style={[styles.summaryValue, { color: hasChanges ? colors.primary : colors.mutedForeground }]}>
            {movements.size}
          </Text>
        </View>
      </View>

      {filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun prodotto trovato</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {hasChanges && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            title={saving ? 'Salvataggio...' : 'Salva Modifiche'}
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
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
  summaryBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  productCard: {
    marginBottom: spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  productCategory: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xxs,
  },
  stockInfo: {
    alignItems: 'flex-end',
  },
  stockLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  stockValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.teal,
  },
  stockControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  eventStockContainer: {
    flex: 1,
  },
  eventStockLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  eventStockValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: {
    backgroundColor: colors.primary,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}20`,
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  warningText: {
    fontSize: fontSize.xs,
    color: colors.warning,
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
  saveButton: {
    width: '100%',
  },
});
