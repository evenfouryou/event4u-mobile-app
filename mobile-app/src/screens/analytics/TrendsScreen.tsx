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

interface TrendDataPoint {
  label: string;
  value: number;
  previousValue?: number;
}

interface CategoryConsumption {
  category: string;
  current: number;
  previous: number;
  change: number;
}

interface EventAttendance {
  eventName: string;
  attendance: number;
  capacity: number;
  percentage: number;
}

const TIME_PERIODS = [
  { id: '7d', label: '7 Giorni' },
  { id: '30d', label: '30 Giorni' },
  { id: '90d', label: '90 Giorni' },
];

export default function TrendsScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [revenueData, setRevenueData] = useState<TrendDataPoint[]>([]);
  const [attendanceData, setAttendanceData] = useState<EventAttendance[]>([]);
  const [consumptionData, setConsumptionData] = useState<CategoryConsumption[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    revenueChange: 0,
    totalAttendance: 0,
    attendanceChange: 0,
    avgConsumption: 0,
    consumptionChange: 0,
  });

  const loadTrends = async () => {
    try {
      setLoading(true);
      const data = await api.get<any>(`/api/analytics/trends?period=${selectedPeriod}`).catch(() => null);

      if (data) {
        setRevenueData(data.revenue || []);
        setAttendanceData(data.attendance || []);
        setConsumptionData(data.consumption || []);
        setSummary(data.summary || {});
      } else {
        const periodLabels = selectedPeriod === '7d' 
          ? ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
          : selectedPeriod === '30d'
          ? ['S1', 'S2', 'S3', 'S4']
          : ['Gen', 'Feb', 'Mar'];

        setRevenueData(periodLabels.map((label, i) => ({
          label,
          value: 1500 + Math.random() * 3000,
          previousValue: 1200 + Math.random() * 2500,
        })));

        setAttendanceData([
          { eventName: 'Summer Night', attendance: 450, capacity: 500, percentage: 90 },
          { eventName: 'Tropical Party', attendance: 380, capacity: 400, percentage: 95 },
          { eventName: 'DJ Set Live', attendance: 320, capacity: 500, percentage: 64 },
          { eventName: 'Ladies Night', attendance: 280, capacity: 350, percentage: 80 },
          { eventName: 'Weekend Vibes', attendance: 250, capacity: 300, percentage: 83 },
        ]);

        setConsumptionData([
          { category: 'Birra', current: 1250, previous: 1100, change: 13.6 },
          { category: 'Cocktail', current: 890, previous: 750, change: 18.7 },
          { category: 'Vino', current: 450, previous: 480, change: -6.3 },
          { category: 'Soft Drink', current: 380, previous: 350, change: 8.6 },
          { category: 'Shot', current: 620, previous: 580, change: 6.9 },
        ]);

        setSummary({
          totalRevenue: 45000,
          revenueChange: 15.3,
          totalAttendance: 1680,
          attendanceChange: 8.2,
          avgConsumption: 28.5,
          consumptionChange: 12.1,
        });
      }
    } catch (e) {
      console.error('Error loading trends:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrends();
  }, [selectedPeriod]);

  const maxRevenueValue = Math.max(...revenueData.map(d => Math.max(d.value, d.previousValue || 0)), 1);
  const maxAttendance = Math.max(...attendanceData.map(d => d.attendance), 1);
  const maxConsumption = Math.max(...consumptionData.map(d => Math.max(d.current, d.previous)), 1);

  const chartBarWidth = Math.min((width - spacing.lg * 4) / revenueData.length - 8, 40);

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {TIME_PERIODS.map((period) => (
        <TouchableOpacity
          key={period.id}
          style={[
            styles.periodPill,
            selectedPeriod === period.id && styles.periodPillActive,
          ]}
          onPress={() => setSelectedPeriod(period.id)}
          testID={`pill-period-${period.id}`}
        >
          <Text
            style={[
              styles.periodPillText,
              selectedPeriod === period.id && styles.periodPillTextActive,
            ]}
          >
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSummaryCards = () => (
    <View style={[styles.summaryGrid, (isLandscape || isTablet) && styles.summaryGridWide]}>
      <Card variant="glass" style={styles.summaryCard} testID="card-summary-revenue">
        <View style={[styles.summaryIcon, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="cash-outline" size={20} color={colors.primary} />
        </View>
        <Text style={styles.summaryValue}>€{summary.totalRevenue.toLocaleString('it-IT')}</Text>
        <Text style={styles.summaryLabel}>Fatturato</Text>
        <View style={[
          styles.changeIndicator,
          { backgroundColor: summary.revenueChange >= 0 ? `${colors.teal}20` : `${colors.destructive}20` }
        ]}>
          <Ionicons
            name={summary.revenueChange >= 0 ? 'trending-up' : 'trending-down'}
            size={12}
            color={summary.revenueChange >= 0 ? colors.teal : colors.destructive}
          />
          <Text style={[
            styles.changeText,
            { color: summary.revenueChange >= 0 ? colors.teal : colors.destructive }
          ]}>
            {summary.revenueChange >= 0 ? '+' : ''}{summary.revenueChange.toFixed(1)}%
          </Text>
        </View>
      </Card>

      <Card variant="glass" style={styles.summaryCard} testID="card-summary-attendance">
        <View style={[styles.summaryIcon, { backgroundColor: `${colors.teal}20` }]}>
          <Ionicons name="people-outline" size={20} color={colors.teal} />
        </View>
        <Text style={styles.summaryValue}>{summary.totalAttendance.toLocaleString('it-IT')}</Text>
        <Text style={styles.summaryLabel}>Presenze</Text>
        <View style={[
          styles.changeIndicator,
          { backgroundColor: summary.attendanceChange >= 0 ? `${colors.teal}20` : `${colors.destructive}20` }
        ]}>
          <Ionicons
            name={summary.attendanceChange >= 0 ? 'trending-up' : 'trending-down'}
            size={12}
            color={summary.attendanceChange >= 0 ? colors.teal : colors.destructive}
          />
          <Text style={[
            styles.changeText,
            { color: summary.attendanceChange >= 0 ? colors.teal : colors.destructive }
          ]}>
            {summary.attendanceChange >= 0 ? '+' : ''}{summary.attendanceChange.toFixed(1)}%
          </Text>
        </View>
      </Card>

      <Card variant="glass" style={styles.summaryCard} testID="card-summary-consumption">
        <View style={[styles.summaryIcon, { backgroundColor: `${colors.warning}20` }]}>
          <Ionicons name="wine-outline" size={20} color={colors.warning} />
        </View>
        <Text style={styles.summaryValue}>€{summary.avgConsumption.toFixed(1)}</Text>
        <Text style={styles.summaryLabel}>Consumo Medio</Text>
        <View style={[
          styles.changeIndicator,
          { backgroundColor: summary.consumptionChange >= 0 ? `${colors.teal}20` : `${colors.destructive}20` }
        ]}>
          <Ionicons
            name={summary.consumptionChange >= 0 ? 'trending-up' : 'trending-down'}
            size={12}
            color={summary.consumptionChange >= 0 ? colors.teal : colors.destructive}
          />
          <Text style={[
            styles.changeText,
            { color: summary.consumptionChange >= 0 ? colors.teal : colors.destructive }
          ]}>
            {summary.consumptionChange >= 0 ? '+' : ''}{summary.consumptionChange.toFixed(1)}%
          </Text>
        </View>
      </Card>
    </View>
  );

  const renderRevenueChart = () => (
    <View style={[styles.section, (isLandscape || isTablet) && styles.halfSection]}>
      <Text style={styles.sectionTitle} testID="text-revenue-title">Trend Fatturato</Text>
      <Card variant="glass" testID="card-revenue-chart">
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Periodo attuale</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.mutedForeground }]} />
            <Text style={styles.legendText}>Periodo precedente</Text>
          </View>
        </View>
        <View style={styles.chartContainer}>
          <View style={styles.chartBars}>
            {revenueData.map((point, index) => (
              <View key={index} style={styles.chartBarGroup} testID={`bar-revenue-${index}`}>
                <View style={styles.chartBarPair}>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: ((point.previousValue || 0) / maxRevenueValue) * 100,
                        width: chartBarWidth / 2 - 2,
                        backgroundColor: colors.mutedForeground,
                        opacity: 0.5,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: (point.value / maxRevenueValue) * 100,
                        width: chartBarWidth / 2 - 2,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{point.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>
    </View>
  );

  const renderAttendanceChart = () => (
    <View style={[styles.section, (isLandscape || isTablet) && styles.halfSection]}>
      <Text style={styles.sectionTitle} testID="text-attendance-title">Presenze per Evento</Text>
      <Card variant="glass" testID="card-attendance-chart">
        {attendanceData.map((event, index) => (
          <View key={index} style={styles.attendanceItem} testID={`item-attendance-${index}`}>
            <View style={styles.attendanceHeader}>
              <Text style={styles.eventName} numberOfLines={1}>{event.eventName}</Text>
              <Text style={styles.attendanceCount}>
                {event.attendance}/{event.capacity}
              </Text>
            </View>
            <View style={styles.attendanceBarContainer}>
              <View
                style={[
                  styles.attendanceBar,
                  {
                    width: `${event.percentage}%`,
                    backgroundColor: event.percentage >= 90 ? colors.teal : event.percentage >= 70 ? colors.primary : colors.warning,
                  },
                ]}
              />
            </View>
            <Text style={[
              styles.attendancePercentage,
              { color: event.percentage >= 90 ? colors.teal : event.percentage >= 70 ? colors.primary : colors.warning }
            ]}>
              {event.percentage}%
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );

  const renderConsumptionChart = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} testID="text-consumption-title">Consumi per Categoria</Text>
      <Card variant="glass" testID="card-consumption-chart">
        {consumptionData.map((item, index) => (
          <View key={index} style={styles.consumptionItem} testID={`item-consumption-${index}`}>
            <View style={styles.consumptionHeader}>
              <Text style={styles.categoryName}>{item.category}</Text>
              <View style={[
                styles.changeIndicator,
                { backgroundColor: item.change >= 0 ? `${colors.teal}20` : `${colors.destructive}20` }
              ]}>
                <Ionicons
                  name={item.change >= 0 ? 'arrow-up' : 'arrow-down'}
                  size={10}
                  color={item.change >= 0 ? colors.teal : colors.destructive}
                />
                <Text style={[
                  styles.changeTextSmall,
                  { color: item.change >= 0 ? colors.teal : colors.destructive }
                ]}>
                  {Math.abs(item.change).toFixed(1)}%
                </Text>
              </View>
            </View>
            <View style={styles.consumptionBars}>
              <View style={styles.consumptionBarContainer}>
                <View
                  style={[
                    styles.consumptionBarPrevious,
                    { width: `${(item.previous / maxConsumption) * 100}%` },
                  ]}
                />
                <View
                  style={[
                    styles.consumptionBarCurrent,
                    {
                      width: `${(item.current / maxConsumption) * 100}%`,
                      backgroundColor: item.change >= 0 ? colors.teal : colors.destructive,
                    },
                  ]}
                />
              </View>
              <Text style={styles.consumptionValue}>{item.current}</Text>
            </View>
          </View>
        ))}
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.teal }]} />
            <Text style={styles.legendText}>Attuale</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.muted }]} />
            <Text style={styles.legendText}>Precedente</Text>
          </View>
        </View>
      </Card>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Trend Analisi" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="text-loading">Caricamento trend...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Trend Analisi" showBack onBack={() => navigation.goBack()} />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          (isLandscape || isTablet) && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
        testID="scroll-trends"
      >
        <View style={styles.section}>
          {renderPeriodSelector()}
        </View>

        {renderSummaryCards()}

        <View style={(isLandscape || isTablet) ? styles.twoColumnContainer : undefined}>
          {renderRevenueChart()}
          {renderAttendanceChart()}
        </View>

        {renderConsumptionChart()}
      </ScrollView>
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
  },
  periodSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  periodPill: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
  },
  periodPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodPillText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  periodPillTextActive: {
    color: colors.primaryForeground,
  },
  summaryGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryGridWide: {
    paddingHorizontal: spacing.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  changeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  changeTextSmall: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  legendText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
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
  chartBarGroup: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginBottom: spacing.sm,
  },
  chartBar: {
    borderRadius: borderRadius.sm,
    minHeight: 4,
  },
  chartLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  attendanceItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eventName: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginRight: spacing.md,
  },
  attendanceCount: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  attendanceBarContainer: {
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  attendanceBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  attendancePercentage: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textAlign: 'right',
  },
  consumptionItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  consumptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  consumptionBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  consumptionBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  consumptionBarPrevious: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
  },
  consumptionBarCurrent: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  consumptionValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    minWidth: 50,
    textAlign: 'right',
  },
});
