import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Header, Card } from '../../components';

interface HourlyStat {
  hour: string;
  count: number;
  valid: number;
  invalid: number;
}

interface DailyStats {
  totalScans: number;
  validScans: number;
  invalidScans: number;
  duplicateScans: number;
  uniqueVisitors: number;
  peakHour: string;
  avgScansPerHour: number;
  hourlyStats: HourlyStat[];
}

const TIME_FILTERS = [
  { id: 'today', label: 'Oggi' },
  { id: 'week', label: 'Settimana' },
  { id: 'month', label: 'Mese' },
  { id: 'all', label: 'Totale' },
];

export function ScannerStatsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const { eventId } = route.params || {};
  const [activeTimeFilter, setActiveTimeFilter] = useState('today');

  const { data: stats, isLoading } = useQuery<DailyStats>({
    queryKey: ['/api/scanner/stats', eventId, activeTimeFilter],
  });

  const defaultStats: DailyStats = {
    totalScans: 0,
    validScans: 0,
    invalidScans: 0,
    duplicateScans: 0,
    uniqueVisitors: 0,
    peakHour: '--:--',
    avgScansPerHour: 0,
    hourlyStats: [],
  };

  const currentStats = stats || defaultStats;
  const validRate = currentStats.totalScans > 0 
    ? Math.round((currentStats.validScans / currentStats.totalScans) * 100) 
    : 0;

  const maxHourlyCount = Math.max(...(currentStats.hourlyStats?.map(h => h.count) || [1]));
  const contentMaxWidth = isTablet ? 900 : undefined;
  const statsColumns = isTablet || isLandscape ? 4 : 2;

  const renderBarChart = () => {
    if (!currentStats.hourlyStats || currentStats.hourlyStats.length === 0) {
      return (
        <View style={styles.noDataContainer} testID="container-no-chart-data">
          <Ionicons name="bar-chart-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.noDataText} testID="text-no-chart-data">Nessun dato disponibile</Text>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer} testID="container-chart">
        <ScrollView horizontal={isLandscape || isTablet} showsHorizontalScrollIndicator={false}>
          <View style={[styles.barChart, (isLandscape || isTablet) && { minWidth: Math.max(width * 0.5, 400) }]}>
            {currentStats.hourlyStats.map((stat, index) => {
              const validHeight = (stat.valid / maxHourlyCount) * 120;
              const invalidHeight = ((stat.count - stat.valid) / maxHourlyCount) * 120;

              return (
                <View key={index} style={styles.barColumn} testID={`bar-column-${index}`}>
                  <View style={styles.barWrapper}>
                    <View style={[styles.bar, { height: invalidHeight, backgroundColor: colors.destructive }]} />
                    <View style={[styles.bar, { height: validHeight, backgroundColor: colors.success }]} />
                  </View>
                  <Text style={styles.barLabel}>{stat.hour}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Validi</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.destructive }]} />
            <Text style={styles.legendText}>Non validi</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Statistiche"
        showBack
        onBack={() => navigation.goBack()}
        testID="header-stats"
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { maxWidth: contentMaxWidth, alignSelf: contentMaxWidth ? 'center' : undefined, width: contentMaxWidth ? '100%' : undefined }
        ]}
        showsVerticalScrollIndicator={false}
        testID="scrollview-stats"
      >
        <View style={styles.timeFiltersContainer}>
          {TIME_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.timeFilterButton,
                activeTimeFilter === filter.id && styles.timeFilterButtonActive,
              ]}
              onPress={() => setActiveTimeFilter(filter.id)}
              testID={`button-time-${filter.id}`}
            >
              <Text
                style={[
                  styles.timeFilterText,
                  activeTimeFilter === filter.id && styles.timeFilterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.overviewSection, (isTablet || isLandscape) && styles.overviewSectionLandscape]}>
          <View style={[styles.mainStatCard, (isTablet || isLandscape) && { flex: 1 }]} testID="card-main-stat">
            <View style={styles.mainStatContent}>
              <Text style={styles.mainStatValue} testID="text-total-scans">{currentStats.totalScans}</Text>
              <Text style={styles.mainStatLabel}>Scansioni Totali</Text>
            </View>
            <View style={styles.rateCircle}>
              <Text style={styles.rateValue} testID="text-valid-rate">{validRate}%</Text>
              <Text style={styles.rateLabel}>validi</Text>
            </View>
          </View>
        </View>

        <View style={[styles.statsGrid, { flexDirection: 'row', flexWrap: 'wrap' }]}>
          <Card style={[styles.statCard, styles.statCardSuccess, { minWidth: `${100 / statsColumns - 2}%` }]} testID="card-stat-valid">
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.success }]} testID="text-valid-scans">{currentStats.validScans}</Text>
            <Text style={styles.statLabel}>Validi</Text>
          </Card>

          <Card style={[styles.statCard, styles.statCardError, { minWidth: `${100 / statsColumns - 2}%` }]} testID="card-stat-invalid">
            <Ionicons name="close-circle" size={28} color={colors.destructive} />
            <Text style={[styles.statValue, { color: colors.destructive }]} testID="text-invalid-scans">{currentStats.invalidScans}</Text>
            <Text style={styles.statLabel}>Non Validi</Text>
          </Card>

          <Card style={[styles.statCard, styles.statCardWarning, { minWidth: `${100 / statsColumns - 2}%` }]} testID="card-stat-duplicate">
            <Ionicons name="copy" size={28} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.warning }]} testID="text-duplicate-scans">{currentStats.duplicateScans}</Text>
            <Text style={styles.statLabel}>Duplicati</Text>
          </Card>

          <Card style={[styles.statCard, { minWidth: `${100 / statsColumns - 2}%` }]} testID="card-stat-visitors">
            <Ionicons name="people" size={28} color={colors.emerald} />
            <Text style={[styles.statValue, { color: colors.emerald }]} testID="text-visitors">{currentStats.uniqueVisitors}</Text>
            <Text style={styles.statLabel}>Visitatori</Text>
          </Card>
        </View>

        <View style={[styles.section, (isTablet || isLandscape) && styles.sectionRow]}>
          <View style={(isTablet || isLandscape) ? { flex: 2 } : undefined}>
            <Text style={styles.sectionTitle} testID="text-section-hourly">Scansioni per Ora</Text>
            <Card style={styles.chartCard} testID="card-chart">
              {renderBarChart()}
            </Card>
          </View>

          <View style={(isTablet || isLandscape) ? { flex: 1, marginLeft: spacing.lg } : { marginTop: spacing.lg }}>
            <Text style={styles.sectionTitle} testID="text-section-info">Informazioni Aggiuntive</Text>
            <Card style={styles.infoCard} testID="card-info">
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={24} color={colors.emerald} />
                  <Text style={styles.infoLabel}>Ora di Punta</Text>
                  <Text style={styles.infoValue} testID="text-peak-hour">{currentStats.peakHour}</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <Ionicons name="trending-up-outline" size={24} color={colors.emerald} />
                  <Text style={styles.infoLabel}>Media/Ora</Text>
                  <Text style={styles.infoValue} testID="text-avg-hour">{currentStats.avgScansPerHour.toFixed(1)}</Text>
                </View>
              </View>
            </Card>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} testID="text-section-summary">Riepilogo</Text>
          <Card style={[styles.summaryCard, isTablet && { maxWidth: 600 }]} testID="card-summary">
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tasso di successo</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]} testID="text-success-rate">{validRate}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${validRate}%` }]} />
            </View>
            
            <View style={[styles.summaryRow, { marginTop: spacing.lg }]}>
              <Text style={styles.summaryLabel}>Tasso di errore</Text>
              <Text style={[styles.summaryValue, { color: colors.destructive }]} testID="text-error-rate">{100 - validRate}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFillError, { width: `${100 - validRate}%` }]} />
            </View>
          </Card>
        </View>
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
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  timeFiltersContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  timeFilterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  timeFilterButtonActive: {
    backgroundColor: colors.emerald,
  },
  timeFilterText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  timeFilterTextActive: {
    color: colors.emeraldForeground,
  },
  overviewSection: {
    marginBottom: spacing.lg,
  },
  overviewSectionLandscape: {
    flexDirection: 'row',
  },
  mainStatCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainStatContent: {
    flex: 1,
  },
  mainStatValue: {
    color: colors.foreground,
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
  },
  mainStatLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    marginTop: spacing.xs,
  },
  rateCircle: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.success,
  },
  rateValue: {
    color: colors.success,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  rateLabel: {
    color: colors.success,
    fontSize: fontSize.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
  },
  statCardSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  statCardError: {
    borderLeftWidth: 3,
    borderLeftColor: colors.destructive,
  },
  statCardWarning: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginTop: spacing.sm,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionRow: {
    flexDirection: 'row',
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  chartCard: {
    padding: spacing.md,
  },
  chartContainer: {},
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingBottom: spacing.lg,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    width: 24,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: borderRadius.sm,
    minHeight: 2,
  },
  barLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  legendText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noDataText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  infoCard: {
    padding: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  infoValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
  },
  infoDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
  },
  summaryCard: {
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
  },
  progressFillError: {
    height: '100%',
    backgroundColor: colors.destructive,
    borderRadius: borderRadius.full,
  },
});
