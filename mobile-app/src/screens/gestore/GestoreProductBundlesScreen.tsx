import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BundleProduct {
  id: string;
  name: string;
  originalPrice: number;
  quantity: number;
}

interface ProductBundle {
  id: string;
  name: string;
  description: string;
  products: BundleProduct[];
  originalTotal: number;
  bundlePrice: number;
  discountPercent: number;
  isActive: boolean;
  salesCount: number;
  revenue: number;
  imageUrl: string | null;
  createdAt: string;
  validUntil: string | null;
}

interface BundleStats {
  totalBundles: number;
  activeBundles: number;
  totalSales: number;
  totalRevenue: number;
  averageDiscount: number;
}

interface GestoreProductBundlesScreenProps {
  onBack: () => void;
}

export function GestoreProductBundlesScreen({ onBack }: GestoreProductBundlesScreenProps) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<BundleStats>({
    totalBundles: 0,
    activeBundles: 0,
    totalSales: 0,
    totalRevenue: 0,
    averageDiscount: 0,
  });
  const [bundles, setBundles] = useState<ProductBundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      setStats({
        totalBundles: 12,
        activeBundles: 8,
        totalSales: 456,
        totalRevenue: 18240,
        averageDiscount: 15,
      });

      setBundles([
        {
          id: '1',
          name: 'Party Starter Pack',
          description: 'Il pacchetto perfetto per iniziare la serata',
          products: [
            { id: 'p1', name: 'Vodka Premium 1L', originalPrice: 45, quantity: 1 },
            { id: 'p2', name: 'Red Bull (4 pack)', originalPrice: 12, quantity: 2 },
            { id: 'p3', name: 'Ghiaccio Premium', originalPrice: 5, quantity: 1 },
          ],
          originalTotal: 74,
          bundlePrice: 59,
          discountPercent: 20,
          isActive: true,
          salesCount: 89,
          revenue: 5251,
          imageUrl: null,
          createdAt: '2025-01-01',
          validUntil: null,
        },
        {
          id: '2',
          name: 'VIP Experience',
          description: 'Esperienza esclusiva con champagne e servizio dedicato',
          products: [
            { id: 'p4', name: 'Champagne Dom Pérignon', originalPrice: 280, quantity: 1 },
            { id: 'p5', name: 'Finger Food Selection', originalPrice: 45, quantity: 1 },
            { id: 'p6', name: 'Tavolo VIP', originalPrice: 100, quantity: 1 },
          ],
          originalTotal: 425,
          bundlePrice: 350,
          discountPercent: 18,
          isActive: true,
          salesCount: 23,
          revenue: 8050,
          imageUrl: null,
          createdAt: '2025-01-05',
          validUntil: '2025-02-28',
        },
        {
          id: '3',
          name: 'Cocktail Selection',
          description: 'Selezione di 4 cocktail premium a scelta',
          products: [
            { id: 'p7', name: 'Cocktail Premium', originalPrice: 12, quantity: 4 },
          ],
          originalTotal: 48,
          bundlePrice: 38,
          discountPercent: 21,
          isActive: true,
          salesCount: 156,
          revenue: 5928,
          imageUrl: null,
          createdAt: '2024-12-15',
          validUntil: null,
        },
        {
          id: '4',
          name: 'Gin Lovers',
          description: 'Per gli amanti del gin con toniche premium',
          products: [
            { id: 'p8', name: 'Gin Premium', originalPrice: 55, quantity: 1 },
            { id: 'p9', name: 'Tonica Fever-Tree (4 pack)', originalPrice: 8, quantity: 2 },
            { id: 'p10', name: 'Garnish Kit', originalPrice: 6, quantity: 1 },
          ],
          originalTotal: 77,
          bundlePrice: 65,
          discountPercent: 16,
          isActive: true,
          salesCount: 67,
          revenue: 4355,
          imageUrl: null,
          createdAt: '2024-12-20',
          validUntil: null,
        },
        {
          id: '5',
          name: 'Weekend Special',
          description: 'Offerta speciale solo weekend',
          products: [
            { id: 'p11', name: 'Prosecco', originalPrice: 25, quantity: 2 },
            { id: 'p12', name: 'Aperol', originalPrice: 20, quantity: 1 },
          ],
          originalTotal: 70,
          bundlePrice: 55,
          discountPercent: 21,
          isActive: false,
          salesCount: 34,
          revenue: 1870,
          imageUrl: null,
          createdAt: '2024-11-01',
          validUntil: '2025-01-15',
        },
      ]);
    } catch (error) {
      console.error('Error loading bundles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `€${amount.toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredBundles = bundles.filter(bundle => {
    if (filter === 'active') return bundle.isActive;
    if (filter === 'inactive') return !bundle.isActive;
    return true;
  });

  const filters = [
    { id: 'all', label: 'Tutti' },
    { id: 'active', label: 'Attivi' },
    { id: 'inactive', label: 'Inattivi' },
  ];

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-product-bundles"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {showLoader ? (
          <Loading text="Caricamento bundle..." />
        ) : (
          <>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Bundle Prodotti</Text>
              <Text style={styles.subtitle}>Crea e gestisci pacchetti scontati</Text>
            </View>

            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                  <Ionicons name="cube" size={24} color={staticColors.primary} />
                </View>
                <Text style={styles.statValue}>{stats.totalBundles}</Text>
                <Text style={styles.statLabel}>Bundle Totali</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                  <Ionicons name="checkmark-circle" size={24} color={staticColors.success} />
                </View>
                <Text style={styles.statValue}>{stats.activeBundles}</Text>
                <Text style={styles.statLabel}>Attivi</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                  <Ionicons name="cart" size={24} color={staticColors.teal} />
                </View>
                <Text style={styles.statValue}>{formatNumber(stats.totalSales)}</Text>
                <Text style={styles.statLabel}>Vendite</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.purple}20` }]}>
                  <Ionicons name="cash" size={24} color={staticColors.purple} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</Text>
                <Text style={styles.statLabel}>Ricavi</Text>
              </GlassCard>
            </View>

            <View style={styles.filterContainer}>
              {filters.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    triggerHaptic('light');
                    setFilter(f.id as any);
                  }}
                  style={[
                    styles.filterButton,
                    filter === f.id && styles.filterButtonActive,
                  ]}
                  testID={`filter-${f.id}`}
                >
                  <Text style={[
                    styles.filterText,
                    filter === f.id && styles.filterTextActive,
                  ]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {filter === 'all' ? 'Tutti i Bundle' : filter === 'active' ? 'Bundle Attivi' : 'Bundle Inattivi'}
                </Text>
                <Pressable
                  onPress={() => triggerHaptic('medium')}
                  testID="button-add-bundle"
                >
                  <Ionicons name="add-circle" size={24} color={staticColors.primary} />
                </Pressable>
              </View>

              {filteredBundles.length > 0 ? (
                filteredBundles.map((bundle) => (
                  <Pressable
                    key={bundle.id}
                    onPress={() => triggerHaptic('light')}
                    testID={`button-bundle-${bundle.id}`}
                  >
                    <Card style={styles.bundleCard}>
                      <View style={styles.bundleHeader}>
                        <View style={styles.bundleIconContainer}>
                          <Ionicons name="cube-outline" size={28} color={staticColors.primary} />
                        </View>
                        <View style={styles.bundleInfo}>
                          <View style={styles.bundleNameRow}>
                            <Text style={styles.bundleName}>{bundle.name}</Text>
                            <Badge variant={bundle.isActive ? 'success' : 'secondary'} testID={`badge-bundle-status-${bundle.id}`}>
                              {bundle.isActive ? 'Attivo' : 'Inattivo'}
                            </Badge>
                          </View>
                          <Text style={styles.bundleDescription}>{bundle.description}</Text>
                        </View>
                      </View>

                      <View style={styles.bundleDivider} />

                      <View style={styles.productsContainer}>
                        <Text style={styles.productsTitle}>Prodotti inclusi:</Text>
                        {bundle.products.map((product, index) => (
                          <View key={product.id} style={styles.productRow}>
                            <Text style={styles.productQuantity}>{product.quantity}x</Text>
                            <Text style={styles.productName}>{product.name}</Text>
                            <Text style={styles.productPrice}>{formatCurrency(product.originalPrice)}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.bundlePricing}>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>Prezzo originale:</Text>
                          <Text style={styles.originalPrice}>{formatCurrency(bundle.originalTotal)}</Text>
                        </View>
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>Prezzo bundle:</Text>
                          <View style={styles.bundlePriceContainer}>
                            <Text style={styles.bundlePrice}>{formatCurrency(bundle.bundlePrice)}</Text>
                            <Badge variant="destructive" size="sm" testID={`badge-discount-${bundle.id}`}>
                              -{bundle.discountPercent}%
                            </Badge>
                          </View>
                        </View>
                      </View>

                      <View style={styles.bundleStats}>
                        <View style={styles.bundleStat}>
                          <Ionicons name="cart-outline" size={16} color={colors.mutedForeground} />
                          <Text style={styles.bundleStatValue}>{bundle.salesCount}</Text>
                          <Text style={styles.bundleStatLabel}>vendite</Text>
                        </View>
                        <View style={styles.bundleStat}>
                          <Ionicons name="cash-outline" size={16} color={colors.mutedForeground} />
                          <Text style={styles.bundleStatValue}>{formatCurrency(bundle.revenue)}</Text>
                          <Text style={styles.bundleStatLabel}>ricavi</Text>
                        </View>
                        {bundle.validUntil && (
                          <View style={styles.bundleStat}>
                            <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
                            <Text style={styles.bundleStatValue}>Fino al</Text>
                            <Text style={styles.bundleStatLabel}>{formatDate(bundle.validUntil)}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.bundleActions}>
                        <Pressable
                          onPress={() => triggerHaptic('light')}
                          style={styles.actionButton}
                          testID={`button-edit-bundle-${bundle.id}`}
                        >
                          <Ionicons name="create-outline" size={18} color={staticColors.primary} />
                          <Text style={styles.actionButtonText}>Modifica</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => triggerHaptic('light')}
                          style={styles.actionButton}
                          testID={`button-stats-bundle-${bundle.id}`}
                        >
                          <Ionicons name="stats-chart-outline" size={18} color={staticColors.teal} />
                          <Text style={[styles.actionButtonText, { color: staticColors.teal }]}>Statistiche</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => triggerHaptic('light')}
                          style={styles.actionButton}
                          testID={`button-toggle-bundle-${bundle.id}`}
                        >
                          <Ionicons
                            name={bundle.isActive ? 'pause-outline' : 'play-outline'}
                            size={18}
                            color={bundle.isActive ? staticColors.warning : staticColors.success}
                          />
                          <Text style={[styles.actionButtonText, { color: bundle.isActive ? staticColors.warning : staticColors.success }]}>
                            {bundle.isActive ? 'Disattiva' : 'Attiva'}
                          </Text>
                        </Pressable>
                      </View>
                    </Card>
                  </Pressable>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <View style={styles.emptyContent}>
                    <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
                    <Text style={styles.emptyTitle}>Nessun bundle trovato</Text>
                    <Text style={styles.emptyText}>
                      {filter === 'active' ? 'Non ci sono bundle attivi' : 
                       filter === 'inactive' ? 'Non ci sono bundle inattivi' : 
                       'Crea il tuo primo bundle'}
                    </Text>
                  </View>
                </Card>
              )}
            </View>

            <View style={styles.section}>
              <Pressable
                onPress={() => triggerHaptic('medium')}
                testID="button-create-bundle"
              >
                <Card style={styles.createButton}>
                  <Ionicons name="add-circle" size={24} color={staticColors.primary} />
                  <View style={styles.createButtonContent}>
                    <Text style={styles.createButtonTitle}>Crea Nuovo Bundle</Text>
                    <Text style={styles.createButtonSubtitle}>Combina prodotti con uno sconto</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                </Card>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  filterButtonActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  filterTextActive: {
    color: staticColors.primaryForeground,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  bundleCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bundleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: `${staticColors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  bundleInfo: {
    flex: 1,
  },
  bundleNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bundleName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
    flex: 1,
    marginRight: spacing.sm,
  },
  bundleDescription: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 4,
  },
  bundleDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  productsContainer: {
    marginBottom: spacing.md,
  },
  productsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  productQuantity: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primary,
    width: 30,
  },
  productName: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
    flex: 1,
  },
  productPrice: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  bundlePricing: {
    backgroundColor: `${staticColors.primary}10`,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  priceLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  originalPrice: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textDecorationLine: 'line-through',
  },
  bundlePriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bundlePrice: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.success,
  },
  bundleStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  bundleStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bundleStatValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  bundleStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  bundleActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.primary,
  },
  emptyCard: {
    padding: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  createButton: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  createButtonTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  createButtonSubtitle: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
});

export default GestoreProductBundlesScreen;
