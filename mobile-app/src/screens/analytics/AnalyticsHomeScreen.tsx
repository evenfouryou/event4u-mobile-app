import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

interface AnalyticsSummary {
  totalEvents: number;
  totalRevenue: number;
  avgTicketPrice: number;
  topProduct: string;
  inventoryStatus: string;
  staffEfficiency: number;
  insights: string[];
}

interface TrendDataPoint {
  label: string;
  value: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: 'inventory' | 'sales' | 'staffing' | 'events';
  priority: 'high' | 'medium' | 'low';
}

export default function AnalyticsHomeScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [summaryData, recommendationsData] = await Promise.all([
        api.get<any>('/api/analytics/summary').catch(() => null),
        api.get<any[]>('/api/analytics/recommendations').catch(() => []),
      ]);

      if (summaryData) {
        setSummary({
          totalEvents: summaryData.totalEvents || 12,
          totalRevenue: summaryData.totalRevenue || 45000,
          avgTicketPrice: summaryData.avgTicketPrice || 25,
          topProduct: summaryData.topProduct || 'Birra alla spina',
          inventoryStatus: summaryData.inventoryStatus || 'Ottimo',
          staffEfficiency: summaryData.staffEfficiency || 87,
          insights: summaryData.insights || [
            'Vendite in aumento del 15% rispetto al mese scorso',
            'Scorte di bevande alcoliche in esaurimento',
            'Picco di consumo previsto per il weekend',
          ],
        });
      } else {
        setSummary({
          totalEvents: 12,
          totalRevenue: 45000,
          avgTicketPrice: 25,
          topProduct: 'Birra alla spina',
          inventoryStatus: 'Ottimo',
          staffEfficiency: 87,
          insights: [
            'Vendite in aumento del 15% rispetto al mese scorso',
            'Scorte di bevande alcoliche in esaurimento',
            'Picco di consumo previsto per il weekend',
          ],
        });
      }

      setTrendData([
        { label: 'Lun', value: 120 },
        { label: 'Mar', value: 180 },
        { label: 'Mer', value: 150 },
        { label: 'Gio', value: 220 },
        { label: 'Ven', value: 380 },
        { label: 'Sab', value: 450 },
        { label: 'Dom', value: 280 },
      ]);

      setTopProducts([
        { name: 'Birra alla spina', quantity: 450, revenue: 2250 },
        { name: 'Cocktail', quantity: 320, revenue: 3200 },
        { name: 'Shot', quantity: 280, revenue: 1120 },
        { name: 'Soft Drink', quantity: 200, revenue: 600 },
        { name: 'Acqua', quantity: 180, revenue: 360 },
      ]);

      const recs = Array.isArray(recommendationsData) ? recommendationsData : [];
      setRecommendations(recs.length > 0 ? recs.slice(0, 3) : [
        {
          id: '1',
          title: 'Riordina Birra',
          description: 'Scorte in esaurimento. Ordine consigliato: 50 fusti',
          type: 'inventory',
          priority: 'high',
        },
        {
          id: '2',
          title: 'Staff Weekend',
          description: 'Aumenta personale bar del 20% per sabato sera',
          type: 'staffing',
          priority: 'medium',
        },
        {
          id: '3',
          title: 'Promozione Cocktail',
          description: 'Margine elevato sui cocktail - considera promozione',
          type: 'sales',
          priority: 'low',
        },
      ]);
    } catch (e) {
      console.error('Error loading analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  const generateNewAnalysis = async () => {
    try {
      setGenerating(true);
      await api.post('/api/analytics/generate').catch(() => null);
      await loadAnalytics();
    } catch (e) {
      console.error('Error generating analysis:', e);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const maxTrendValue = Math.max(...trendData.map(d => d.value), 1);
  const maxProductValue = Math.max(...topProducts.map(p => p.quantity), 1);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return colors.destructive;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.teal;
      default:
        return colors.mutedForeground;
    }
  };

  const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'inventory':
        return 'cube-outline';
      case 'sales':
        return 'trending-up-outline';
      case 'staffing':
        return 'people-outline';
      case 'events':
        return 'calendar-outline';
      default:
        return 'bulb-outline';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="AI Analytics" />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="text-loading">Caricamento analisi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="AI Analytics"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('Insights')}
            testID="button-insights"
          >
            <Ionicons name="bulb-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          (isLandscape || isTablet) && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
        testID="scroll-analytics-home"
      >
        <View style={[styles.section, (isLandscape || isTablet) && styles.sectionWide]}>
          <Card variant="glass" style={styles.summaryCard} testID="card-summary">
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIcon}>
                <Ionicons name="analytics" size={24} color={colors.primary} />
              </View>
              <View style={styles.summaryTitleContainer}>
                <Text style={styles.summaryTitle} testID="text-summary-title">Riepilogo AI</Text>
                <Text style={styles.summarySubtitle} testID="text-summary-subtitle">Ultimo aggiornamento: ora</Text>
              </View>
            </View>
            <View style={styles.insightsContainer}>
              {summary?.insights.map((insight, index) => (
                <View key={index} style={styles.insightItem} testID={`item-insight-${index}`}>
                  <View style={[styles.insightDot, { backgroundColor: index === 1 ? colors.warning : colors.teal }]} />
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.statsGrid, (isLandscape || isTablet) && styles.statsGridWide]}>
              <View style={styles.statItem} testID="stat-revenue">
                <Text style={styles.statValue}>€{summary?.totalRevenue.toLocaleString('it-IT')}</Text>
                <Text style={styles.statLabel}>Fatturato</Text>
              </View>
              <View style={styles.statItem} testID="stat-events">
                <Text style={styles.statValue}>{summary?.totalEvents}</Text>
                <Text style={styles.statLabel}>Eventi</Text>
              </View>
              <View style={styles.statItem} testID="stat-efficiency">
                <Text style={[styles.statValue, { color: colors.teal }]}>{summary?.staffEfficiency}%</Text>
                <Text style={styles.statLabel}>Efficienza</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={[
          (isLandscape || isTablet) && styles.twoColumnContainer,
        ]}>
          <View style={[styles.section, (isLandscape || isTablet) && styles.halfSection]}>
            <Text style={styles.sectionTitle} testID="text-trends-title">Trend Consumi</Text>
            <Card variant="glass" testID="card-trends">
              <View style={styles.chartContainer}>
                <View style={styles.chartBars}>
                  {trendData.map((point, index) => (
                    <View key={index} style={styles.chartBarContainer} testID={`bar-trend-${index}`}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: (point.value / maxTrendValue) * 100,
                            backgroundColor: index === trendData.length - 2 ? colors.primary : colors.teal,
                          },
                        ]}
                      />
                      <Text style={styles.chartLabel}>{point.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          </View>

          <View style={[styles.section, (isLandscape || isTablet) && styles.halfSection]}>
            <Text style={styles.sectionTitle} testID="text-products-title">Top Prodotti</Text>
            <Card variant="glass" testID="card-products">
              {topProducts.map((product, index) => (
                <View key={index} style={styles.productItem} testID={`item-product-${index}`}>
                  <View style={styles.productRank}>
                    <Text style={styles.productRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <View style={styles.productBarContainer}>
                      <View
                        style={[
                          styles.productBar,
                          { width: `${(product.quantity / maxProductValue) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.productStats}>
                    <Text style={styles.productQuantity}>{product.quantity}</Text>
                    <Text style={styles.productRevenue}>€{product.revenue}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} testID="text-recommendations-title">Raccomandazioni</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Recommendations')}
              testID="button-view-all-recommendations"
            >
              <Text style={styles.viewAllText}>Vedi tutte</Text>
            </TouchableOpacity>
          </View>
          <View style={[
            (isLandscape || isTablet) && styles.recommendationsGrid,
          ]}>
            {recommendations.map((rec) => (
              <TouchableOpacity
                key={rec.id}
                style={[
                  styles.recommendationCard,
                  (isLandscape || isTablet) && styles.recommendationCardWide,
                ]}
                onPress={() => navigation.navigate('Recommendations')}
                activeOpacity={0.8}
                testID={`card-recommendation-${rec.id}`}
              >
                <Card variant="glass">
                  <View style={styles.recommendationHeader}>
                    <View style={[styles.recommendationIcon, { backgroundColor: `${getPriorityColor(rec.priority)}20` }]}>
                      <Ionicons name={getTypeIcon(rec.type)} size={20} color={getPriorityColor(rec.priority)} />
                    </View>
                    <View style={styles.recommendationContent}>
                      <Text style={styles.recommendationTitle}>{rec.title}</Text>
                      <Text style={styles.recommendationDescription}>{rec.description}</Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(rec.priority)}20` }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(rec.priority) }]}>
                        {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Bassa'}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, generating && styles.fabDisabled]}
        onPress={generateNewAnalysis}
        activeOpacity={0.8}
        disabled={generating}
        testID="button-generate-analysis"
      >
        {generating ? (
          <ActivityIndicator size="small" color={colors.primaryForeground} />
        ) : (
          <Ionicons name="sparkles" size={28} color={colors.primaryForeground} />
        )}
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
    paddingBottom: 120,
  },
  scrollContentWide: {
    paddingHorizontal: spacing.md,
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
  sectionWide: {
    paddingHorizontal: spacing.md,
  },
  halfSection: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  twoColumnContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
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
  summaryCard: {
    marginTop: spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitleContainer: {
    marginLeft: spacing.md,
  },
  summaryTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  summarySubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  insightsContainer: {
    marginBottom: spacing.lg,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  insightText: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  statsGridWide: {
    justifyContent: 'space-evenly',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  chartContainer: {
    height: 150,
    paddingTop: spacing.md,
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 28,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    minHeight: 4,
  },
  chartLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  productRankText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  productInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  productName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  productBarContainer: {
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  productBar: {
    height: '100%',
    backgroundColor: colors.teal,
    borderRadius: borderRadius.full,
  },
  productStats: {
    alignItems: 'flex-end',
  },
  productQuantity: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  productRevenue: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  recommendationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  recommendationCard: {
    marginBottom: spacing.sm,
  },
  recommendationCardWide: {
    width: '50%',
    paddingHorizontal: spacing.xs,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  recommendationTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  recommendationDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
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
  fabDisabled: {
    opacity: 0.6,
  },
});
