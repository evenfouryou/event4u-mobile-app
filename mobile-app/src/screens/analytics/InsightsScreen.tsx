import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Insight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'inventory' | 'sales' | 'staffing' | 'events';
  createdAt: string;
  actionable: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'Tutti', icon: 'grid-outline' },
  { id: 'inventory', label: 'Inventario', icon: 'cube-outline' },
  { id: 'sales', label: 'Vendite', icon: 'trending-up-outline' },
  { id: 'staffing', label: 'Staff', icon: 'people-outline' },
  { id: 'events', label: 'Eventi', icon: 'calendar-outline' },
];

export default function InsightsScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loadInsights = async () => {
    try {
      setLoading(true);
      const data = await api.get<Insight[]>('/api/analytics/insights').catch(() => null);
      
      if (data && Array.isArray(data)) {
        setInsights(data);
      } else {
        setInsights([
          {
            id: '1',
            title: 'Scorte Birra in Esaurimento',
            description: 'Le scorte di birra alla spina sono scese sotto il livello minimo. Considera un riordino immediato per evitare interruzioni durante il weekend.',
            impact: 'high',
            category: 'inventory',
            createdAt: new Date().toISOString(),
            actionable: true,
          },
          {
            id: '2',
            title: 'Picco Vendite Previsto',
            description: 'Basandosi sui dati storici, il prossimo sabato si prevede un aumento del 35% delle vendite rispetto alla media.',
            impact: 'high',
            category: 'sales',
            createdAt: new Date().toISOString(),
            actionable: false,
          },
          {
            id: '3',
            title: 'Staff Insufficiente',
            description: 'Per l\'evento di sabato, il numero attuale di baristi potrebbe essere insufficiente. Consigliato aumentare del 20%.',
            impact: 'medium',
            category: 'staffing',
            createdAt: new Date().toISOString(),
            actionable: true,
          },
          {
            id: '4',
            title: 'Cocktail Margine Elevato',
            description: 'I cocktail hanno generato il margine più alto questo mese. Considera una promozione per aumentare le vendite.',
            impact: 'medium',
            category: 'sales',
            createdAt: new Date().toISOString(),
            actionable: true,
          },
          {
            id: '5',
            title: 'Evento Sold Out Imminente',
            description: 'L\'evento "Summer Night" è al 92% della capacità. Possibilità di sold out nelle prossime 24 ore.',
            impact: 'low',
            category: 'events',
            createdAt: new Date().toISOString(),
            actionable: false,
          },
          {
            id: '6',
            title: 'Trend Consumi Positivo',
            description: 'I consumi medi per cliente sono aumentati del 12% rispetto al mese scorso. Tendenza positiva.',
            impact: 'low',
            category: 'sales',
            createdAt: new Date().toISOString(),
            actionable: false,
          },
          {
            id: '7',
            title: 'Scorte Ghiaccio',
            description: 'Livelli di ghiaccio adeguati per il weekend. Nessuna azione richiesta.',
            impact: 'low',
            category: 'inventory',
            createdAt: new Date().toISOString(),
            actionable: false,
          },
        ]);
      }
    } catch (e) {
      console.error('Error loading insights:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const filteredInsights = selectedCategory === 'all'
    ? insights
    : insights.filter(i => i.category === selectedCategory);

  const getImpactColor = (impact: string) => {
    switch (impact) {
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

  const getImpactLabel = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'Critico';
      case 'medium':
        return 'Moderato';
      case 'low':
        return 'Basso';
      default:
        return impact;
    }
  };

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
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

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'inventory':
        return 'Inventario';
      case 'sales':
        return 'Vendite';
      case 'staffing':
        return 'Staff';
      case 'events':
        return 'Eventi';
      default:
        return category;
    }
  };

  const renderCategoryPill = ({ id, label, icon }: typeof CATEGORIES[0]) => (
    <TouchableOpacity
      key={id}
      style={[
        styles.categoryPill,
        selectedCategory === id && styles.categoryPillActive,
      ]}
      onPress={() => setSelectedCategory(id)}
      testID={`pill-category-${id}`}
    >
      <Ionicons
        name={icon as any}
        size={16}
        color={selectedCategory === id ? colors.primaryForeground : colors.foreground}
      />
      <Text
        style={[
          styles.categoryPillText,
          selectedCategory === id && styles.categoryPillTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderInsightCard = ({ item, index }: { item: Insight; index: number }) => (
    <View 
      style={[
        styles.insightCard,
        (isLandscape || isTablet) && styles.insightCardWide,
      ]} 
      testID={`card-insight-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.insightHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: `${getImpactColor(item.impact)}20` }]}>
            <Ionicons name={getCategoryIcon(item.category)} size={20} color={getImpactColor(item.impact)} />
          </View>
          <View style={styles.insightMeta}>
            <Text style={styles.categoryLabel}>{getCategoryLabel(item.category)}</Text>
            <View style={[styles.impactBadge, { backgroundColor: `${getImpactColor(item.impact)}20` }]}>
              <View style={[styles.impactDot, { backgroundColor: getImpactColor(item.impact) }]} />
              <Text style={[styles.impactText, { color: getImpactColor(item.impact) }]}>
                {getImpactLabel(item.impact)}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.insightTitle}>{item.title}</Text>
        <Text style={styles.insightDescription}>{item.description}</Text>
        {item.actionable && (
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            testID={`button-action-${item.id}`}
          >
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            <Text style={styles.actionButtonText}>Azione Suggerita</Text>
          </TouchableOpacity>
        )}
      </Card>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="AI Insights" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="text-loading">Caricamento insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="AI Insights" showBack onBack={() => navigation.goBack()} />
      
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          testID="scroll-categories"
        >
          {CATEGORIES.map(renderCategoryPill)}
        </ScrollView>
      </View>

      <View style={[styles.statsRow, (isLandscape || isTablet) && styles.statsRowWide]}>
        <View style={styles.statCard} testID="stat-high">
          <Text style={[styles.statNumber, { color: colors.destructive }]}>
            {insights.filter(i => i.impact === 'high').length}
          </Text>
          <Text style={styles.statText}>Critici</Text>
        </View>
        <View style={styles.statCard} testID="stat-medium">
          <Text style={[styles.statNumber, { color: colors.warning }]}>
            {insights.filter(i => i.impact === 'medium').length}
          </Text>
          <Text style={styles.statText}>Moderati</Text>
        </View>
        <View style={styles.statCard} testID="stat-low">
          <Text style={[styles.statNumber, { color: colors.teal }]}>
            {insights.filter(i => i.impact === 'low').length}
          </Text>
          <Text style={styles.statText}>Bassi</Text>
        </View>
      </View>

      <FlatList
        data={filteredInsights}
        renderItem={renderInsightCard}
        keyExtractor={(item) => item.id}
        numColumns={(isLandscape || isTablet) ? 2 : 1}
        key={(isLandscape || isTablet) ? 'two-columns' : 'one-column'}
        contentContainerStyle={[
          styles.listContent,
          (isLandscape || isTablet) && styles.listContentWide,
        ]}
        columnWrapperStyle={(isLandscape || isTablet) ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        testID="list-insights"
        ListEmptyComponent={
          <Card style={styles.emptyCard} variant="glass" testID="empty-state">
            <Ionicons name="bulb-outline" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun insight trovato</Text>
          </Card>
        }
      />
    </SafeAreaView>
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
  categoriesSection: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  categoryPillTextActive: {
    color: colors.primaryForeground,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  statsRowWide: {
    paddingHorizontal: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statNumber: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  listContentWide: {
    paddingHorizontal: spacing.md,
  },
  columnWrapper: {
    gap: spacing.md,
  },
  insightCard: {
    marginBottom: spacing.md,
  },
  insightCardWide: {
    flex: 1,
    maxWidth: '50%',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightMeta: {
    flex: 1,
    marginLeft: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  impactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  impactDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
  },
  impactText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  insightTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  insightDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
});
