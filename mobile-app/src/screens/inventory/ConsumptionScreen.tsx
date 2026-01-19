import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

interface Event {
  id: string;
  name: string;
  date: string;
  status: string;
}

interface Station {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
}

const QUICK_QUANTITIES = [1, 2, 5, 10];

const STATIONS: Station[] = [
  { id: '1', name: 'Bar Principale' },
  { id: '2', name: 'Bar Esterno' },
  { id: '3', name: 'Bar VIP' },
  { id: '4', name: 'Magazzino' },
];

export default function ConsumptionScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, productsData] = await Promise.all([
        api.get<any[]>('/api/events'),
        api.get<any[]>('/api/products'),
      ]);

      const formattedEvents: Event[] = (eventsData || [])
        .filter((e: any) => e.status === 'live' || e.status === 'active')
        .slice(0, 5)
        .map((e: any) => ({
          id: e.id?.toString() || '',
          name: e.name || e.title || '',
          date: e.date ? new Date(e.date).toLocaleDateString('it-IT') : '',
          status: e.status || '',
        }));

      const formattedProducts: Product[] = (productsData || []).map((p: any) => ({
        id: p.id?.toString() || '',
        name: p.name || '',
        category: p.category || 'altri',
        currentStock: p.currentStock || p.stock || 0,
        unit: p.unit || 'pz',
      }));

      setEvents(formattedEvents);
      setProducts(formattedProducts);

      if (formattedEvents.length > 0) {
        setSelectedEvent(formattedEvents[0]);
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleQuickQuantity = (qty: number) => {
    setQuantity(qty);
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  const handleSubmit = async () => {
    if (!selectedEvent) {
      Alert.alert('Errore', 'Seleziona un evento');
      return;
    }
    if (!selectedStation) {
      Alert.alert('Errore', 'Seleziona una stazione');
      return;
    }
    if (!selectedProduct) {
      Alert.alert('Errore', 'Seleziona un prodotto');
      return;
    }
    if (quantity <= 0) {
      Alert.alert('Errore', 'Inserisci una quantità valida');
      return;
    }
    if (quantity > selectedProduct.currentStock) {
      Alert.alert('Errore', `Stock insufficiente. Disponibili: ${selectedProduct.currentStock} ${selectedProduct.unit}`);
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/api/consumption', {
        eventId: selectedEvent.id,
        stationId: selectedStation.id,
        productId: selectedProduct.id,
        quantity,
        notes,
      });
      Alert.alert('Successo', 'Consumo registrato correttamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Errore', 'Impossibile registrare il consumo');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Registra Consumo" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Registra Consumo" showBack />
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
        testID="scroll-view-consumption"
      >
        <View style={[styles.mainContent, (isTablet || isLandscape) && styles.mainContentWide]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evento</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowEventPicker(!showEventPicker)}
              testID="button-select-event"
            >
              <View style={styles.selectorContent}>
                <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
                <Text style={selectedEvent ? styles.selectorText : styles.selectorPlaceholder}>
                  {selectedEvent ? `${selectedEvent.name} - ${selectedEvent.date}` : 'Seleziona evento...'}
                </Text>
              </View>
              <Ionicons
                name={showEventPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
            {showEventPicker && (
              <Card variant="glass" style={styles.pickerList}>
                {events.map(event => (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.pickerItem,
                      selectedEvent?.id === event.id && styles.pickerItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedEvent(event);
                      setShowEventPicker(false);
                    }}
                    testID={`select-event-${event.id}`}
                  >
                    <View style={styles.pickerItemContent}>
                      <Text style={styles.pickerItemName}>{event.name}</Text>
                      <Text style={styles.pickerItemMeta}>{event.date}</Text>
                    </View>
                    {event.status === 'live' && (
                      <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </Card>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stazione</Text>
            <View style={[styles.stationsGrid, (isTablet || isLandscape) && styles.stationsGridWide]}>
              {STATIONS.map(station => (
                <TouchableOpacity
                  key={station.id}
                  style={[
                    styles.stationCard,
                    selectedStation?.id === station.id && styles.stationCardSelected,
                  ]}
                  onPress={() => setSelectedStation(station)}
                  testID={`station-${station.id}`}
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={selectedStation?.id === station.id ? colors.primaryForeground : colors.foreground}
                  />
                  <Text
                    style={[
                      styles.stationName,
                      selectedStation?.id === station.id && styles.stationNameSelected,
                    ]}
                  >
                    {station.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prodotto</Text>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cerca prodotto..."
                placeholderTextColor={colors.mutedForeground}
                value={productSearch}
                onChangeText={setProductSearch}
                onFocus={() => setShowProductPicker(true)}
                testID="input-product-search"
              />
            </View>
            {(showProductPicker || productSearch.length > 0) && (
              <Card variant="glass" style={styles.productList}>
                <ScrollView style={styles.productListScroll} nestedScrollEnabled testID="scroll-product-picker">
                  {filteredProducts.slice(0, 10).map(product => (
                    <TouchableOpacity
                      key={product.id}
                      style={[
                        styles.productItem,
                        selectedProduct?.id === product.id && styles.productItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedProduct(product);
                        setShowProductPicker(false);
                        setProductSearch(product.name);
                      }}
                      testID={`select-product-${product.id}`}
                    >
                      <View>
                        <Text style={styles.productItemName}>{product.name}</Text>
                        <Text style={styles.productItemCategory}>{product.category}</Text>
                      </View>
                      <Text style={styles.productItemStock}>
                        {product.currentStock} {product.unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Card>
            )}
            {selectedProduct && (
              <View style={styles.selectedProductCard}>
                <Card variant="glass" testID="card-selected-product">
                  <View style={styles.selectedProductRow}>
                    <View>
                      <Text style={styles.selectedProductName} testID="text-selected-product-name">{selectedProduct.name}</Text>
                      <Text style={styles.selectedProductStock} testID="text-selected-product-stock">
                        Disponibili: {selectedProduct.currentStock} {selectedProduct.unit}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedProduct(null);
                        setProductSearch('');
                      }}
                      testID="button-clear-product"
                    >
                      <Ionicons name="close-circle" size={24} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                </Card>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantità</Text>
            <Card variant="glass" testID="card-quantity">
              <View style={styles.quickQuantityRow}>
                {QUICK_QUANTITIES.map(qty => (
                  <TouchableOpacity
                    key={qty}
                    style={[
                      styles.quickQuantityButton,
                      quantity === qty && styles.quickQuantityButtonActive,
                    ]}
                    onPress={() => handleQuickQuantity(qty)}
                    testID={`quick-quantity-${qty}`}
                  >
                    <Text
                      style={[
                        styles.quickQuantityText,
                        quantity === qty && styles.quickQuantityTextActive,
                      ]}
                    >
                      {qty}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(-1)}
                  testID="button-quantity-minus"
                >
                  <Ionicons name="remove" size={24} color={colors.foreground} />
                </TouchableOpacity>
                <View style={styles.quantityInputContainer}>
                  <TextInput
                    style={styles.quantityInput}
                    value={quantity.toString()}
                    onChangeText={(text) => setQuantity(parseInt(text) || 1)}
                    keyboardType="number-pad"
                    testID="input-quantity"
                  />
                  {selectedProduct && (
                    <Text style={styles.quantityUnit}>{selectedProduct.unit}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(1)}
                  testID="button-quantity-plus"
                >
                  <Ionicons name="add" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </Card>
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
              testID="input-notes"
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, isLandscape && styles.bottomActionsLandscape]}>
        <Button
          title="Registra Consumo"
          variant="primary"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!selectedEvent || !selectedStation || !selectedProduct || quantity <= 0}
          style={styles.submitButton}
          testID="button-submit"
        />
      </View>
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
  mainContent: {
    flex: 1,
  },
  mainContentWide: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
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
  selector: {
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
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  selectorPlaceholder: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  selectorText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  pickerList: {
    marginTop: spacing.sm,
    maxHeight: 200,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  pickerItemSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  pickerItemContent: {
    flex: 1,
  },
  pickerItemName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  pickerItemMeta: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.teal}20`,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.teal,
  },
  liveText: {
    color: colors.teal,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  stationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stationsGridWide: {
    maxWidth: 600,
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  stationCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stationName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  stationNameSelected: {
    color: colors.primaryForeground,
  },
  searchContainer: {
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
  productItemCategory: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textTransform: 'capitalize',
  },
  productItemStock: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  selectedProductCard: {
    marginTop: spacing.md,
  },
  selectedProductRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedProductName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  selectedProductStock: {
    color: colors.teal,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  quickQuantityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickQuantityButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickQuantityButtonActive: {
    backgroundColor: colors.primary,
  },
  quickQuantityText: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  quickQuantityTextActive: {
    color: colors.primaryForeground,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: spacing.lg,
    backgroundColor: colors.glass.background,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  bottomActionsLandscape: {
    paddingHorizontal: spacing.xl,
  },
  submitButton: {
    width: '100%',
  },
});
