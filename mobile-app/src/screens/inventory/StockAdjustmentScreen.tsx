import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

interface Product {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
}

type AdjustmentType = 'add' | 'remove' | 'set';
type AdjustmentReason = 'delivery' | 'consumption' | 'damage' | 'correction' | 'other';

const ADJUSTMENT_TYPES = [
  { id: 'add', label: 'Aggiungi', icon: 'add-circle-outline', color: colors.teal },
  { id: 'remove', label: 'Rimuovi', icon: 'remove-circle-outline', color: colors.warning },
  { id: 'set', label: 'Imposta', icon: 'sync-outline', color: colors.primary },
];

const ADJUSTMENT_REASONS = [
  { id: 'delivery', label: 'Consegna', icon: 'cube-outline' },
  { id: 'consumption', label: 'Consumo', icon: 'restaurant-outline' },
  { id: 'damage', label: 'Danno', icon: 'alert-circle-outline' },
  { id: 'correction', label: 'Correzione', icon: 'pencil-outline' },
  { id: 'other', label: 'Altro', icon: 'ellipsis-horizontal-outline' },
];

type RouteParams = {
  StockAdjustment: { productId?: string; type?: AdjustmentType };
};

export default function StockAdjustmentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'StockAdjustment'>>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>(route.params?.type || 'add');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState<AdjustmentReason>('delivery');
  const [notes, setNotes] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.get<any[]>('/api/products');
      
      const formattedProducts: Product[] = (data || []).map((p: any) => ({
        id: p.id?.toString() || '',
        name: p.name || '',
        category: p.category || 'altri',
        currentStock: p.currentStock || p.stock || 0,
        unit: p.unit || 'pz',
      }));

      setProducts(formattedProducts);

      if (route.params?.productId) {
        const product = formattedProducts.find(p => p.id === route.params.productId);
        if (product) setSelectedProduct(product);
      }
    } catch (e) {
      console.error('Error loading products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(0, prev + delta));
  };

  const handleSubmit = async () => {
    if (!selectedProduct) {
      Alert.alert('Errore', 'Seleziona un prodotto');
      return;
    }
    if (quantity <= 0) {
      Alert.alert('Errore', 'Inserisci una quantità valida');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/api/inventory/adjust', {
        productId: selectedProduct.id,
        type: adjustmentType,
        quantity,
        reason,
        notes,
      });
      Alert.alert('Successo', 'Stock aggiornato correttamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Errore', 'Impossibile aggiornare lo stock');
    } finally {
      setSubmitting(false);
    }
  };

  const getNewStockValue = () => {
    if (!selectedProduct) return 0;
    switch (adjustmentType) {
      case 'add':
        return selectedProduct.currentStock + quantity;
      case 'remove':
        return Math.max(0, selectedProduct.currentStock - quantity);
      case 'set':
        return quantity;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Modifica Stock" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Modifica Stock" showBack />
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prodotto</Text>
          <TouchableOpacity
            style={styles.productSelector}
            onPress={() => setShowProductPicker(!showProductPicker)}
            data-testid="button-select-product"
          >
            <View style={styles.productSelectorContent}>
              <Ionicons name="cube-outline" size={20} color={colors.mutedForeground} />
              <Text style={selectedProduct ? styles.productSelectedText : styles.productPlaceholder}>
                {selectedProduct ? selectedProduct.name : 'Seleziona prodotto...'}
              </Text>
            </View>
            <Ionicons
              name={showProductPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
          {showProductPicker && (
            <Card variant="glass" style={styles.productList}>
              <ScrollView style={styles.productListScroll} nestedScrollEnabled>
                {products.map(product => (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.productItem,
                      selectedProduct?.id === product.id && styles.productItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedProduct(product);
                      setShowProductPicker(false);
                    }}
                    data-testid={`select-product-${product.id}`}
                  >
                    <Text style={styles.productItemName}>{product.name}</Text>
                    <Text style={styles.productItemStock}>
                      {product.currentStock} {product.unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo Modifica</Text>
          <View style={styles.typeGrid}>
            {ADJUSTMENT_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  adjustmentType === type.id && { borderColor: type.color, backgroundColor: `${type.color}10` },
                ]}
                onPress={() => setAdjustmentType(type.id as AdjustmentType)}
                data-testid={`type-${type.id}`}
              >
                <Ionicons
                  name={type.icon as any}
                  size={24}
                  color={adjustmentType === type.id ? type.color : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    adjustmentType === type.id && { color: type.color },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quantità</Text>
          <Card variant="glass">
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(-10)}
                data-testid="button-quantity-minus-10"
              >
                <Text style={styles.quantityButtonText}>-10</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(-1)}
                data-testid="button-quantity-minus-1"
              >
                <Ionicons name="remove" size={24} color={colors.foreground} />
              </TouchableOpacity>
              <View style={styles.quantityInputContainer}>
                <TextInput
                  style={styles.quantityInput}
                  value={quantity.toString()}
                  onChangeText={(text) => setQuantity(parseInt(text) || 0)}
                  keyboardType="number-pad"
                  data-testid="input-quantity"
                />
                {selectedProduct && (
                  <Text style={styles.quantityUnit}>{selectedProduct.unit}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(1)}
                data-testid="button-quantity-plus-1"
              >
                <Ionicons name="add" size={24} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(10)}
                data-testid="button-quantity-plus-10"
              >
                <Text style={styles.quantityButtonText}>+10</Text>
              </TouchableOpacity>
            </View>
            {selectedProduct && (
              <View style={styles.stockPreview}>
                <Text style={styles.stockPreviewLabel}>
                  Stock attuale: {selectedProduct.currentStock} {selectedProduct.unit}
                </Text>
                <Text style={styles.stockPreviewArrow}>→</Text>
                <Text style={styles.stockPreviewNew}>
                  Nuovo: {getNewStockValue()} {selectedProduct.unit}
                </Text>
              </View>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motivazione</Text>
          <View style={styles.reasonGrid}>
            {ADJUSTMENT_REASONS.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.reasonPill,
                  reason === r.id && styles.reasonPillActive,
                ]}
                onPress={() => setReason(r.id as AdjustmentReason)}
                data-testid={`reason-${r.id}`}
              >
                <Ionicons
                  name={r.icon as any}
                  size={16}
                  color={reason === r.id ? colors.primaryForeground : colors.foreground}
                />
                <Text
                  style={[
                    styles.reasonPillText,
                    reason === r.id && styles.reasonPillTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note (opzionale)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Aggiungi note..."
            placeholderTextColor={colors.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            data-testid="input-notes"
          />
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          title="Conferma Modifica"
          variant="primary"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!selectedProduct || quantity <= 0}
          style={styles.submitButton}
        />
      </View>
    </View>
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
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  productSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  productSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  productPlaceholder: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  productSelectedText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  productList: {
    marginTop: spacing.sm,
    maxHeight: 200,
  },
  productListScroll: {
    maxHeight: 180,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  productItemSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  productItemName: {
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  productItemStock: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  typeLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  quantityInputContainer: {
    alignItems: 'center',
  },
  quantityInput: {
    color: colors.foreground,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    minWidth: 80,
  },
  quantityUnit: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  stockPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  stockPreviewLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  stockPreviewArrow: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  stockPreviewNew: {
    color: colors.teal,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  reasonPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reasonPillText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  reasonPillTextActive: {
    color: colors.primaryForeground,
  },
  notesInput: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.foreground,
    fontSize: fontSize.base,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bottomActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: colors.glass.background,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  submitButton: {
    width: '100%',
  },
});
