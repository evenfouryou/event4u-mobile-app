import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface Recommendation {
  id: string;
  title: string;
  reason: string;
  suggestedAction: string;
  type: 'purchase' | 'staffing' | 'pricing' | 'event';
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  status: 'pending' | 'applied' | 'dismissed';
}

const TABS = [
  { id: 'all', label: 'Tutti' },
  { id: 'purchase', label: 'Acquisti' },
  { id: 'staffing', label: 'Staff' },
  { id: 'pricing', label: 'Prezzi' },
];

export default function RecommendationsScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [applying, setApplying] = useState<string | null>(null);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await api.get<Recommendation[]>('/api/analytics/recommendations').catch(() => null);
      
      if (data && Array.isArray(data)) {
        setRecommendations(data);
      } else {
        setRecommendations([
          {
            id: '1',
            title: 'Ordine Birra Urgente',
            reason: 'Scorte attuali: 5 fusti. Consumo medio weekend: 15 fusti. Rischio esaurimento alto.',
            suggestedAction: 'Ordina 50 fusti di birra entro giovedì per garantire disponibilità weekend.',
            type: 'purchase',
            priority: 'high',
            estimatedImpact: 'Evita perdita stimata di €2,500 in vendite mancate',
            status: 'pending',
          },
          {
            id: '2',
            title: 'Riordino Superalcolici',
            reason: 'Vodka e Gin sotto il 30% della capacità. Trend consumi in aumento.',
            suggestedAction: 'Ordina 20 bottiglie vodka + 15 bottiglie gin.',
            type: 'purchase',
            priority: 'medium',
            estimatedImpact: 'Mantiene continuità servizio cocktail premium',
            status: 'pending',
          },
          {
            id: '3',
            title: 'Incremento Staff Sabato',
            reason: 'Evento "Summer Night" prevede 800+ presenze. Staff attuale insufficiente.',
            suggestedAction: 'Aggiungi 2 baristi e 1 cassiere per turno serale sabato.',
            type: 'staffing',
            priority: 'high',
            estimatedImpact: 'Riduce tempo attesa bar del 40%, migliora customer satisfaction',
            status: 'pending',
          },
          {
            id: '4',
            title: 'Staff Aggiuntivo Domenica',
            reason: 'Brunch prevede 200 presenze. Considera personale extra per servizio tavoli.',
            suggestedAction: 'Aggiungi 1 cameriere per turno pranzo domenica.',
            type: 'staffing',
            priority: 'low',
            estimatedImpact: 'Migliora velocità servizio del 15%',
            status: 'pending',
          },
          {
            id: '5',
            title: 'Promozione Cocktail',
            reason: 'Margine cocktail: 75%. Vendite sotto potenziale. Opportunità di crescita.',
            suggestedAction: 'Lancia "2x1 Cocktail" dalle 18:00 alle 20:00 nei giorni feriali.',
            type: 'pricing',
            priority: 'medium',
            estimatedImpact: 'Aumento vendite cocktail stimato +45%, margine netto +€800/settimana',
            status: 'pending',
          },
          {
            id: '6',
            title: 'Adeguamento Prezzo Premium',
            reason: 'Prezzi drink premium sotto media mercato locale del 10%.',
            suggestedAction: 'Aumenta prezzi champagne e spirits premium del 8%.',
            type: 'pricing',
            priority: 'low',
            estimatedImpact: 'Margine aggiuntivo stimato €400/mese senza impatto volume',
            status: 'pending',
          },
        ]);
      }
    } catch (e) {
      console.error('Error loading recommendations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const applyRecommendation = async (id: string) => {
    Alert.alert(
      'Applica Raccomandazione',
      'Vuoi applicare questa raccomandazione?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Applica',
          onPress: async () => {
            setApplying(id);
            try {
              await api.post(`/api/analytics/recommendations/${id}/apply`).catch(() => null);
              setRecommendations(prev =>
                prev.map(r => r.id === id ? { ...r, status: 'applied' as const } : r)
              );
            } catch (e) {
              console.error('Error applying recommendation:', e);
            } finally {
              setApplying(null);
            }
          },
        },
      ]
    );
  };

  const dismissRecommendation = async (id: string) => {
    setRecommendations(prev =>
      prev.map(r => r.id === id ? { ...r, status: 'dismissed' as const } : r)
    );
  };

  const filteredRecommendations = activeTab === 'all'
    ? recommendations.filter(r => r.status === 'pending')
    : recommendations.filter(r => r.type === activeTab && r.status === 'pending');

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

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Urgente';
      case 'medium':
        return 'Importante';
      case 'low':
        return 'Consigliato';
      default:
        return priority;
    }
  };

  const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'purchase':
        return 'cart-outline';
      case 'staffing':
        return 'people-outline';
      case 'pricing':
        return 'pricetag-outline';
      case 'event':
        return 'calendar-outline';
      default:
        return 'bulb-outline';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'Acquisto';
      case 'staffing':
        return 'Staff';
      case 'pricing':
        return 'Prezzo';
      case 'event':
        return 'Evento';
      default:
        return type;
    }
  };

  const renderRecommendationCard = ({ item, index }: { item: Recommendation; index: number }) => (
    <View 
      style={[
        styles.recommendationCard,
        (isLandscape || isTablet) && styles.recommendationCardWide,
      ]} 
      testID={`card-recommendation-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: `${getPriorityColor(item.priority)}20` }]}>
            <Ionicons name={getTypeIcon(item.type)} size={20} color={getPriorityColor(item.priority)} />
          </View>
          <View style={styles.cardHeaderInfo}>
            <View style={styles.cardHeaderTop}>
              <Text style={styles.typeLabel}>{getTypeLabel(item.type)}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(item.priority)}20` }]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                  {getPriorityLabel(item.priority)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Motivo</Text>
          <Text style={styles.infoText}>{item.reason}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Azione Suggerita</Text>
          <Text style={styles.suggestedAction}>{item.suggestedAction}</Text>
        </View>

        <View style={styles.impactSection}>
          <Ionicons name="trending-up" size={16} color={colors.teal} />
          <Text style={styles.impactText}>{item.estimatedImpact}</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => dismissRecommendation(item.id)}
            activeOpacity={0.8}
            testID={`button-dismiss-${item.id}`}
          >
            <Text style={styles.dismissButtonText}>Ignora</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.applyButton, applying === item.id && styles.applyButtonDisabled]}
            onPress={() => applyRecommendation(item.id)}
            activeOpacity={0.8}
            disabled={applying === item.id}
            testID={`button-apply-${item.id}`}
          >
            {applying === item.id ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={colors.primaryForeground} />
                <Text style={styles.applyButtonText}>Applica</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Raccomandazioni" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="text-loading">Caricamento raccomandazioni...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Raccomandazioni" showBack onBack={() => navigation.goBack()} />
      
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          testID="scroll-tabs"
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              testID={`tab-${tab.id}`}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {activeTab === tab.id && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.summaryRow, (isLandscape || isTablet) && styles.summaryRowWide]}>
        <View style={styles.summaryItem} testID="summary-urgent">
          <Ionicons name="alert-circle" size={20} color={colors.destructive} />
          <Text style={styles.summaryCount}>
            {recommendations.filter(r => r.priority === 'high' && r.status === 'pending').length}
          </Text>
          <Text style={styles.summaryLabel}>Urgenti</Text>
        </View>
        <View style={styles.summaryItem} testID="summary-important">
          <Ionicons name="time" size={20} color={colors.warning} />
          <Text style={styles.summaryCount}>
            {recommendations.filter(r => r.priority === 'medium' && r.status === 'pending').length}
          </Text>
          <Text style={styles.summaryLabel}>Importanti</Text>
        </View>
        <View style={styles.summaryItem} testID="summary-applied">
          <Ionicons name="checkmark-circle" size={20} color={colors.teal} />
          <Text style={styles.summaryCount}>
            {recommendations.filter(r => r.status === 'applied').length}
          </Text>
          <Text style={styles.summaryLabel}>Applicate</Text>
        </View>
      </View>

      <FlatList
        data={filteredRecommendations}
        renderItem={renderRecommendationCard}
        keyExtractor={(item) => item.id}
        numColumns={(isLandscape || isTablet) ? 2 : 1}
        key={(isLandscape || isTablet) ? 'two-columns' : 'one-column'}
        contentContainerStyle={[
          styles.listContent,
          (isLandscape || isTablet) && styles.listContentWide,
        ]}
        columnWrapperStyle={(isLandscape || isTablet) ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        testID="list-recommendations"
        ListEmptyComponent={
          <Card style={styles.emptyCard} variant="glass" testID="empty-state">
            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.teal} />
            <Text style={styles.emptyTitle}>Tutto a posto!</Text>
            <Text style={styles.emptyText}>Nessuna raccomandazione in sospeso</Text>
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
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tabsContent: {
    paddingHorizontal: spacing.lg,
  },
  tab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing.lg,
    right: spacing.lg,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  summaryRowWide: {
    paddingHorizontal: spacing.xl,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  summaryCount: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
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
  recommendationCard: {
    marginBottom: spacing.md,
  },
  recommendationCardWide: {
    flex: 1,
    maxWidth: '50%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  cardTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  infoSection: {
    marginBottom: spacing.md,
  },
  infoLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  infoText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  suggestedAction: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },
  impactSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: `${colors.teal}10`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  impactText: {
    flex: 1,
    color: colors.teal,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  applyButton: {
    flex: 2,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
});
