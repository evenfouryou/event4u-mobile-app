import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

interface Product {
  id: string;
  name: string;
  category: string;
  description?: string;
  image?: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  price: number;
}

interface StockHistory {
  date: string;
  value: number;
}

interface ConsumptionLog {
  id: string;
  date: string;
  quantity: number;
  event?: string;
  station?: string;
  user?: string;
}

type RouteParams = {
  ProductDetail: { productId: string };
};

export default function ProductDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ProductDetail'>>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const { productId } = route.params;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [consumptionLogs, setConsumptionLogs] = useState<ConsumptionLog[]>([]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>(`/api/products/${productId}`);
      
      setProduct({
        id: data.id?.toString() || '',
        name: data.name || '',
        category: data.category || 'altri',
        description: data.description || '',
        image: data.image || data.imageUrl,
        currentStock: data.currentStock || data.stock || 0,
        minStock: data.minStock || 10,
        maxStock: data.maxStock || 100,
        unit: data.unit || 'pz',
        price: parseFloat(data.price || '0'),
      });

      const mockHistory: StockHistory[] = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('it-IT', { weekday: 'short' }),
          value: Math.floor(Math.random() * 50) + 20,
        };
      });
      setStockHistory(mockHistory);

      const mockLogs: ConsumptionLog[] = [
        { id: '1', date: 'Oggi 22:30', quantity: 5, event: 'Serata Latino', station: 'Bar 1' },
        { id: '2', date: 'Oggi 21:15', quantity: 3, event: 'Serata Latino', station: 'Bar 2' },
        { id: '3', date: 'Ieri 23:45', quantity: 8, event: 'Friday Night', station: 'Bar 1' },
      ];
      setConsumptionLogs(mockLogs);
    } catch (e) {
      console.error('Error loading product:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductDetails();
  }, [productId]);

  if (loading || !product) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Dettaglio Prodotto" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStockStatus = () => {
    const percentage = (product.currentStock / product.maxStock) * 100;
    if (product.currentStock <= product.minStock) {
      return { color: colors.destructive, label: 'Critico' };
    }
    if (percentage <= 30) {
      return { color: colors.warning, label: 'Basso' };
    }
    return { color: colors.teal, label: 'OK' };
  };

  const stockStatus = getStockStatus();
  const stockPercentage = Math.min((product.currentStock / product.maxStock) * 100, 100);
  const maxChartValue = Math.max(...stockHistory.map(h => h.value));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Dettaglio Prodotto"
        showBack
        rightAction={
          <TouchableOpacity testID="button-edit-product">
            <Ionicons name="create-outline" size={24} color={colors.foreground} />
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
        testID="scroll-view-product-detail"
      >
        <View style={[styles.mainContent, (isTablet || isLandscape) && styles.mainContentWide]}>
          <View style={styles.imageContainer}>
            {product.image ? (
              <Image source={{ uri: product.image }} style={styles.productImage} testID="image-product" />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="cube-outline" size={64} color={colors.mutedForeground} />
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.titleRow}>
              <Text style={styles.productName} testID="text-product-name">{product.name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{product.category}</Text>
              </View>
            </View>
            {product.description && (
              <Text style={styles.description} testID="text-description">{product.description}</Text>
            )}
            <Text style={styles.price} testID="text-price">€{product.price.toFixed(2)} / {product.unit}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Livello Stock</Text>
            <Card variant="glass" testID="card-stock-level">
              <View style={styles.stockHeader}>
                <View>
                  <Text style={styles.stockValue} testID="text-stock-value">
                    {product.currentStock} {product.unit}
                  </Text>
                  <Text style={styles.stockRange}>
                    Min: {product.minStock} • Max: {product.maxStock}
                  </Text>
                </View>
                <View style={[styles.stockStatusBadge, { backgroundColor: `${stockStatus.color}20` }]}>
                  <View style={[styles.stockDot, { backgroundColor: stockStatus.color }]} />
                  <Text style={[styles.stockStatusText, { color: stockStatus.color }]} testID="text-stock-status">
                    {stockStatus.label}
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${stockPercentage}%`,
                        backgroundColor: stockStatus.color,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>0</Text>
                  <Text style={styles.progressLabel}>{product.maxStock}</Text>
                </View>
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Storico Ultimi 7 Giorni</Text>
            <Card variant="glass" testID="card-stock-history">
              <View style={styles.chartContainer}>
                <View style={styles.chartBars}>
                  {stockHistory.map((day, index) => (
                    <TouchableOpacity key={index} style={styles.chartBarWrapper} testID={`chart-bar-${index}`}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: (day.value / maxChartValue) * 80,
                            backgroundColor: index === stockHistory.length - 1 ? colors.primary : colors.muted,
                          },
                        ]}
                      />
                      <Text style={styles.chartLabel}>{day.date}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Registro Consumo</Text>
            {consumptionLogs.length > 0 ? (
              consumptionLogs.map((log) => (
                <Card key={log.id} variant="glass" style={styles.logCard} testID={`card-log-${log.id}`}>
                  <View style={styles.logRow}>
                    <View style={styles.logIcon}>
                      <Ionicons name="remove-circle-outline" size={20} color={colors.warning} />
                    </View>
                    <View style={styles.logInfo}>
                      <Text style={styles.logQuantity} testID={`text-log-quantity-${log.id}`}>-{log.quantity} {product.unit}</Text>
                      <Text style={styles.logMeta}>
                        {log.event} • {log.station}
                      </Text>
                    </View>
                    <Text style={styles.logDate}>{log.date}</Text>
                  </View>
                </Card>
              ))
            ) : (
              <Card style={styles.emptyCard} variant="glass" testID="card-empty-logs">
                <Ionicons name="receipt-outline" size={32} color={colors.mutedForeground} />
                <Text style={styles.emptyText}>Nessun consumo registrato</Text>
              </Card>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, isLandscape && styles.bottomActionsLandscape]}>
        <Button
          title="Rimuovi Stock"
          variant="outline"
          onPress={() => navigation.navigate('StockAdjustment', { productId, type: 'remove' })}
          style={styles.actionButton}
          testID="button-remove-stock"
        />
        <Button
          title="Aggiungi Stock"
          variant="primary"
          onPress={() => navigation.navigate('StockAdjustment', { productId, type: 'add' })}
          style={styles.actionButton}
          testID="button-add-stock"
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
  imageContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius['2xl'],
  },
  productImagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  productName: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  categoryBadgeText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  description: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  price: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stockValue: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  stockRange: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  stockStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  stockStatusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  progressBarContainer: {
    gap: spacing.sm,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  chartContainer: {
    height: 120,
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  chartBarWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 28,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  chartLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  logCard: {
    marginBottom: spacing.sm,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logInfo: {
    flex: 1,
  },
  logQuantity: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  logMeta: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  logDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
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
  bottomActions: {
    flexDirection: 'row',
    gap: spacing.md,
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
  actionButton: {
    flex: 1,
  },
});
