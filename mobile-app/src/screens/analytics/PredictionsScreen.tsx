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
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface EventPrediction {
  id: string;
  eventName: string;
  eventDate: string;
  predictedAttendance: number;
  capacity: number;
  confidence: number;
  weatherImpact: 'positive' | 'neutral' | 'negative';
  weatherDescription: string;
}

interface InventoryRecommendation {
  id: string;
  productName: string;
  currentStock: number;
  recommendedStock: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface PriceOptimization {
  id: string;
  productName: string;
  currentPrice: number;
  suggestedPrice: number;
  expectedImpact: string;
  confidence: number;
}

interface WeatherForecast {
  date: string;
  condition: string;
  temperature: number;
  impact: 'positive' | 'neutral' | 'negative';
  icon: string;
}

export default function PredictionsScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [eventPredictions, setEventPredictions] = useState<EventPrediction[]>([]);
  const [inventoryRecommendations, setInventoryRecommendations] = useState<InventoryRecommendation[]>([]);
  const [priceOptimizations, setPriceOptimizations] = useState<PriceOptimization[]>([]);
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast[]>([]);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>('/api/analytics/predictions').catch(() => null);

      if (data) {
        setEventPredictions(data.events || []);
        setInventoryRecommendations(data.inventory || []);
        setPriceOptimizations(data.pricing || []);
        setWeatherForecast(data.weather || []);
      } else {
        setEventPredictions([
          {
            id: '1',
            eventName: 'Summer Night Party',
            eventDate: '2026-01-25',
            predictedAttendance: 420,
            capacity: 500,
            confidence: 92,
            weatherImpact: 'positive',
            weatherDescription: 'Tempo sereno, temperature ideali',
          },
          {
            id: '2',
            eventName: 'DJ Set Live',
            eventDate: '2026-01-26',
            predictedAttendance: 380,
            capacity: 450,
            confidence: 85,
            weatherImpact: 'neutral',
            weatherDescription: 'Nuvoloso, nessun impatto significativo',
          },
          {
            id: '3',
            eventName: 'Tropical Weekend',
            eventDate: '2026-02-01',
            predictedAttendance: 280,
            capacity: 400,
            confidence: 78,
            weatherImpact: 'negative',
            weatherDescription: 'Possibile pioggia, potenziale calo affluenza',
          },
        ]);

        setInventoryRecommendations([
          {
            id: '1',
            productName: 'Birra alla spina',
            currentStock: 45,
            recommendedStock: 120,
            reason: 'Scorta insufficiente per weekend ad alta affluenza',
            priority: 'high',
          },
          {
            id: '2',
            productName: 'Vodka Premium',
            currentStock: 18,
            recommendedStock: 35,
            reason: 'Domanda elevata prevista per cocktail',
            priority: 'high',
          },
          {
            id: '3',
            productName: 'Rum',
            currentStock: 25,
            recommendedStock: 40,
            reason: 'Scorte sotto media per eventi estivi',
            priority: 'medium',
          },
          {
            id: '4',
            productName: 'Ghiaccio',
            currentStock: 200,
            recommendedStock: 300,
            reason: 'Aumento consumo previsto per temperature alte',
            priority: 'medium',
          },
        ]);

        setPriceOptimizations([
          {
            id: '1',
            productName: 'Cocktail Signature',
            currentPrice: 12.00,
            suggestedPrice: 14.00,
            expectedImpact: '+18% margine, -5% volume',
            confidence: 88,
          },
          {
            id: '2',
            productName: 'Shot Premium',
            currentPrice: 5.00,
            suggestedPrice: 4.50,
            expectedImpact: '+25% volume, +12% ricavi',
            confidence: 82,
          },
          {
            id: '3',
            productName: 'Birra importata',
            currentPrice: 6.00,
            suggestedPrice: 7.00,
            expectedImpact: '+16% margine, elasticità bassa',
            confidence: 75,
          },
        ]);

        setWeatherForecast([
          { date: 'Ven 24', condition: 'Sereno', temperature: 22, impact: 'positive', icon: 'sunny' },
          { date: 'Sab 25', condition: 'Sereno', temperature: 24, impact: 'positive', icon: 'sunny' },
          { date: 'Dom 26', condition: 'Nuvoloso', temperature: 20, impact: 'neutral', icon: 'cloudy' },
          { date: 'Lun 27', condition: 'Pioggia', temperature: 18, impact: 'negative', icon: 'rainy' },
          { date: 'Mar 28', condition: 'Variabile', temperature: 19, impact: 'neutral', icon: 'partly-sunny' },
        ]);
      }
    } catch (e) {
      console.error('Error loading predictions:', e);
    } finally {
      setLoading(false);
    }
  };

  const regeneratePredictions = async () => {
    try {
      setGenerating(true);
      await api.post('/api/analytics/predictions/regenerate').catch(() => null);
      await loadPredictions();
    } catch (e) {
      console.error('Error regenerating predictions:', e);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  const getWeatherImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return colors.teal;
      case 'negative':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getWeatherIcon = (icon: string): keyof typeof Ionicons.glyphMap => {
    switch (icon) {
      case 'sunny':
        return 'sunny';
      case 'cloudy':
        return 'cloudy';
      case 'rainy':
        return 'rainy';
      case 'partly-sunny':
        return 'partly-sunny';
      default:
        return 'cloud';
    }
  };

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
        return 'Consigliato';
      case 'low':
        return 'Opzionale';
      default:
        return priority;
    }
  };

  const renderWeatherForecast = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} testID="text-weather-title">Previsioni Meteo</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weatherContainer}
        testID="scroll-weather"
      >
        {weatherForecast.map((day, index) => (
          <Card key={index} variant="glass" style={styles.weatherCard} testID={`card-weather-${index}`}>
            <Text style={styles.weatherDate}>{day.date}</Text>
            <Ionicons
              name={getWeatherIcon(day.icon)}
              size={32}
              color={getWeatherImpactColor(day.impact)}
            />
            <Text style={styles.weatherTemp}>{day.temperature}°C</Text>
            <Text style={styles.weatherCondition}>{day.condition}</Text>
            <View style={[
              styles.weatherImpactBadge,
              { backgroundColor: `${getWeatherImpactColor(day.impact)}20` }
            ]}>
              <Ionicons
                name={day.impact === 'positive' ? 'arrow-up' : day.impact === 'negative' ? 'arrow-down' : 'remove'}
                size={10}
                color={getWeatherImpactColor(day.impact)}
              />
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );

  const renderEventPredictions = () => (
    <View style={[styles.section, (isLandscape || isTablet) && styles.halfSection]}>
      <Text style={styles.sectionTitle} testID="text-events-title">Previsioni Eventi</Text>
      {eventPredictions.map((event) => (
        <Card key={event.id} variant="glass" style={styles.predictionCard} testID={`card-event-${event.id}`}>
          <View style={styles.predictionHeader}>
            <View style={styles.predictionInfo}>
              <Text style={styles.predictionTitle}>{event.eventName}</Text>
              <Text style={styles.predictionDate}>
                {new Date(event.eventDate).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
            </View>
            <View style={styles.confidenceBadge}>
              <Ionicons name="analytics" size={12} color={colors.primary} />
              <Text style={styles.confidenceText}>{event.confidence}%</Text>
            </View>
          </View>

          <View style={styles.attendancePreview}>
            <View style={styles.attendanceNumbers}>
              <Text style={styles.predictedAttendance}>{event.predictedAttendance}</Text>
              <Text style={styles.attendanceCapacity}>/ {event.capacity}</Text>
            </View>
            <View style={styles.attendanceBarContainer}>
              <View
                style={[
                  styles.attendanceBar,
                  {
                    width: `${(event.predictedAttendance / event.capacity) * 100}%`,
                    backgroundColor: event.predictedAttendance / event.capacity >= 0.8 ? colors.teal : colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          <View style={[
            styles.weatherImpactRow,
            { backgroundColor: `${getWeatherImpactColor(event.weatherImpact)}10` }
          ]}>
            <Ionicons
              name={event.weatherImpact === 'positive' ? 'sunny' : event.weatherImpact === 'negative' ? 'rainy' : 'cloudy'}
              size={16}
              color={getWeatherImpactColor(event.weatherImpact)}
            />
            <Text style={[styles.weatherImpactText, { color: getWeatherImpactColor(event.weatherImpact) }]}>
              {event.weatherDescription}
            </Text>
          </View>
        </Card>
      ))}
    </View>
  );

  const renderInventoryRecommendations = () => (
    <View style={[styles.section, (isLandscape || isTablet) && styles.halfSection]}>
      <Text style={styles.sectionTitle} testID="text-inventory-title">Scorte Consigliate</Text>
      {inventoryRecommendations.map((item) => (
        <Card key={item.id} variant="glass" style={styles.inventoryCard} testID={`card-inventory-${item.id}`}>
          <View style={styles.inventoryHeader}>
            <View style={[styles.priorityIcon, { backgroundColor: `${getPriorityColor(item.priority)}20` }]}>
              <Ionicons
                name={item.priority === 'high' ? 'alert-circle' : item.priority === 'medium' ? 'warning' : 'checkmark-circle'}
                size={20}
                color={getPriorityColor(item.priority)}
              />
            </View>
            <View style={styles.inventoryInfo}>
              <Text style={styles.inventoryName}>{item.productName}</Text>
              <Text style={styles.inventoryReason}>{item.reason}</Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(item.priority)}20` }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {getPriorityLabel(item.priority)}
              </Text>
            </View>
          </View>
          <View style={styles.stockComparison}>
            <View style={styles.stockItem}>
              <Text style={styles.stockLabel}>Attuale</Text>
              <Text style={[styles.stockValue, { color: colors.destructive }]}>{item.currentStock}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.mutedForeground} />
            <View style={styles.stockItem}>
              <Text style={styles.stockLabel}>Consigliato</Text>
              <Text style={[styles.stockValue, { color: colors.teal }]}>{item.recommendedStock}</Text>
            </View>
            <View style={styles.stockDiff}>
              <Text style={styles.stockDiffText}>+{item.recommendedStock - item.currentStock}</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );

  const renderPriceOptimizations = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} testID="text-pricing-title">Ottimizzazione Prezzi</Text>
      <View style={(isLandscape || isTablet) ? styles.priceGrid : undefined}>
        {priceOptimizations.map((item) => (
          <Card 
            key={item.id} 
            variant="glass" 
            style={[styles.priceCard, (isLandscape || isTablet) && styles.priceCardWide]} 
            testID={`card-price-${item.id}`}
          >
            <View style={styles.priceHeader}>
              <Text style={styles.priceName}>{item.productName}</Text>
              <View style={styles.confidenceBadge}>
                <Ionicons name="analytics" size={12} color={colors.primary} />
                <Text style={styles.confidenceText}>{item.confidence}%</Text>
              </View>
            </View>
            <View style={styles.priceComparison}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Attuale</Text>
                <Text style={styles.priceValue}>€{item.currentPrice.toFixed(2)}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.primary} />
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Suggerito</Text>
                <Text style={[styles.priceValue, { color: colors.primary }]}>€{item.suggestedPrice.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.impactRow}>
              <Ionicons name="trending-up" size={14} color={colors.teal} />
              <Text style={styles.impactText}>{item.expectedImpact}</Text>
            </View>
          </Card>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="AI Previsioni" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="text-loading">Generazione previsioni...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="AI Previsioni" showBack onBack={() => navigation.goBack()} />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          (isLandscape || isTablet) && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
        testID="scroll-predictions"
      >
        {renderWeatherForecast()}
        
        <View style={(isLandscape || isTablet) ? styles.twoColumnContainer : undefined}>
          {renderEventPredictions()}
          {renderInventoryRecommendations()}
        </View>
        
        {renderPriceOptimizations()}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, generating && styles.fabDisabled]}
        onPress={regeneratePredictions}
        activeOpacity={0.8}
        disabled={generating}
        testID="button-regenerate-predictions"
      >
        {generating ? (
          <ActivityIndicator size="small" color={colors.primaryForeground} />
        ) : (
          <Ionicons name="refresh" size={28} color={colors.primaryForeground} />
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
    marginTop: spacing.md,
  },
  weatherContainer: {
    gap: spacing.md,
  },
  weatherCard: {
    alignItems: 'center',
    padding: spacing.md,
    minWidth: 80,
  },
  weatherDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  weatherTemp: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: spacing.sm,
  },
  weatherCondition: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  weatherImpactBadge: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  predictionCard: {
    marginBottom: spacing.md,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  predictionInfo: {
    flex: 1,
  },
  predictionTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  predictionDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  confidenceText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  attendancePreview: {
    marginBottom: spacing.md,
  },
  attendanceNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  predictedAttendance: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  attendanceCapacity: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    marginLeft: spacing.xs,
  },
  attendanceBarContainer: {
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  attendanceBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  weatherImpactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  weatherImpactText: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  inventoryCard: {
    marginBottom: spacing.md,
  },
  inventoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  priorityIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  inventoryName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  inventoryReason: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
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
  stockComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  stockItem: {
    alignItems: 'center',
  },
  stockLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  stockValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  stockDiff: {
    backgroundColor: `${colors.teal}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  stockDiffText: {
    color: colors.teal,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  priceCard: {
    marginBottom: spacing.md,
  },
  priceCardWide: {
    width: '50%',
    paddingHorizontal: spacing.xs,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  priceName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  priceComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  priceValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.teal}10`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  impactText: {
    color: colors.teal,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
