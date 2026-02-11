import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { GestoreScannerStats as ScannerStats } from '@/lib/api';

interface GestoreScannerStatsScreenProps {
  onBack: () => void;
}

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

export function GestoreScannerStatsScreen({ onBack }: GestoreScannerStatsScreenProps) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<ScannerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('today');

  useEffect(() => {
    loadStats();
  }, [periodFilter]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await api.getScannerStats(periodFilter);
      setStats(data);
    } catch (error) {
      console.error('Error loading scanner stats:', error);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const getMaxHourlyCount = () => {
    if (!stats?.scansPerHour) return 1;
    return Math.max(...stats.scansPerHour.map((h) => h.count), 1);
  };

  const PeriodFilterButton = ({ value, label }: { value: PeriodFilter; label: string }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        setPeriodFilter(value);
      }}
      style={[
        styles.filterButton,
        {
          backgroundColor: periodFilter === value ? colors.primary : colors.secondary,
        },
      ]}
    >
      <Text
        style={[
          styles.filterButtonText,
          { color: periodFilter === value ? colors.primaryForeground : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header title="Statistiche Scanner" showBack onBack={onBack} testID="header-scanner-stats" />

      <View style={styles.filterContainer}>
        <PeriodFilterButton value="today" label="Oggi" />
        <PeriodFilterButton value="week" label="Settimana" />
        <PeriodFilterButton value="month" label="Mese" />
        <PeriodFilterButton value="all" label="Tutto" />
      </View>

      {showLoader ? (
        <Loading text="Caricamento statistiche..." />
      ) : stats ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <View style={styles.statsGrid}>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                <Ionicons name="scan" size={24} color={staticColors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.totalScans}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Scansioni Totali</Text>
            </GlassCard>

            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                <Ionicons name="checkmark-circle" size={24} color={staticColors.success} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.successCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Successi</Text>
            </GlassCard>

            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${staticColors.destructive}20` }]}>
                <Ionicons name="close-circle" size={24} color={staticColors.destructive} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.errorCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Errori</Text>
            </GlassCard>

            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                <Ionicons name="trending-up" size={24} color={staticColors.teal} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.successRate.toFixed(1)}%</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Tasso Successo</Text>
            </GlassCard>
          </View>

          {stats.scansPerHour && stats.scansPerHour.length > 0 && (
            <Card style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Ionicons name="bar-chart" size={20} color={colors.primary} />
                <Text style={[styles.chartTitle, { color: colors.foreground }]}>Scansioni per Ora</Text>
              </View>
              <View style={styles.chartContainer}>
                {stats.scansPerHour.map((hour, index) => (
                  <View key={index} style={styles.barContainer}>
                    <Text style={[styles.barValue, { color: colors.mutedForeground }]}>{hour.count}</Text>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(8, (hour.count / getMaxHourlyCount()) * 80),
                          backgroundColor: staticColors.primary,
                        },
                      ]}
                    />
                    <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{hour.hour}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {stats.topOperators && stats.topOperators.length > 0 && (
            <Card style={styles.leaderboardCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trophy" size={20} color={staticColors.golden} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Operatori</Text>
              </View>
              <View style={styles.leaderboardList}>
                {stats.topOperators.map((operator, index) => (
                  <View
                    key={index}
                    style={[styles.leaderboardItem, { borderBottomColor: colors.border }]}
                  >
                    <View style={styles.rankContainer}>
                      <Text
                        style={[
                          styles.rankText,
                          {
                            color: index === 0 ? staticColors.golden : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : colors.mutedForeground,
                          },
                        ]}
                      >
                        #{index + 1}
                      </Text>
                    </View>
                    <View style={styles.operatorInfo}>
                      <Text style={[styles.operatorName, { color: colors.foreground }]}>{operator.name}</Text>
                      <Text style={[styles.operatorScans, { color: colors.mutedForeground }]}>
                        {operator.scans} scansioni
                      </Text>
                    </View>
                    <View style={styles.operatorStats}>
                      <Badge variant={operator.successRate >= 95 ? 'success' : operator.successRate >= 80 ? 'warning' : 'destructive'}>
                        {operator.successRate.toFixed(0)}%
                      </Badge>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {stats.byEvent && stats.byEvent.length > 0 && (
            <Card style={styles.eventsCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={20} color={staticColors.purple} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Per Evento</Text>
              </View>
              <View style={styles.eventsList}>
                {stats.byEvent.map((event, index) => (
                  <View key={index} style={[styles.eventItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventName, { color: colors.foreground }]} numberOfLines={1}>
                        {event.eventName}
                      </Text>
                      <View style={styles.eventMeta}>
                        <Ionicons name="scan-outline" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.eventScans, { color: colors.mutedForeground }]}>
                          {event.scans} scansioni
                        </Text>
                      </View>
                    </View>
                    <View style={styles.eventRate}>
                      <View style={[styles.rateBar, { backgroundColor: colors.secondary }]}>
                        <View
                          style={[
                            styles.rateFill,
                            {
                              width: `${event.successRate}%`,
                              backgroundColor: event.successRate >= 90 ? staticColors.success : event.successRate >= 70 ? staticColors.warning : staticColors.destructive,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.rateText, { color: colors.mutedForeground }]}>
                        {event.successRate.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {stats.duplicateCount > 0 && (
            <Card style={styles.duplicateCard}>
              <View style={styles.duplicateContent}>
                <View style={[styles.duplicateIcon, { backgroundColor: `${staticColors.warning}20` }]}>
                  <Ionicons name="copy" size={24} color={staticColors.warning} />
                </View>
                <View style={styles.duplicateInfo}>
                  <Text style={[styles.duplicateValue, { color: colors.foreground }]}>{stats.duplicateCount}</Text>
                  <Text style={[styles.duplicateLabel, { color: colors.mutedForeground }]}>Scansioni Duplicate</Text>
                </View>
              </View>
            </Card>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="stats-chart-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna statistica disponibile</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Le statistiche saranno disponibili dopo le prime scansioni
          </Text>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    marginTop: 2,
  },
  chartCard: {
    padding: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: spacing.md,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: typography.fontSize.xs - 2,
    marginBottom: 4,
  },
  bar: {
    width: '60%',
    minHeight: 8,
    borderRadius: borderRadius.sm,
  },
  barLabel: {
    fontSize: typography.fontSize.xs - 2,
    marginTop: 4,
  },
  leaderboardCard: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  leaderboardList: {
    gap: 0,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  operatorInfo: {
    flex: 1,
  },
  operatorName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
  },
  operatorScans: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  operatorStats: {
    alignItems: 'flex-end',
  },
  eventsCard: {
    padding: spacing.md,
  },
  eventsList: {
    gap: 0,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  eventScans: {
    fontSize: typography.fontSize.xs,
  },
  eventRate: {
    width: 80,
    alignItems: 'flex-end',
    gap: 4,
  },
  rateBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rateFill: {
    height: '100%',
    borderRadius: 3,
  },
  rateText: {
    fontSize: typography.fontSize.xs,
  },
  duplicateCard: {
    padding: spacing.md,
  },
  duplicateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  duplicateIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duplicateInfo: {
    flex: 1,
  },
  duplicateValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  duplicateLabel: {
    fontSize: typography.fontSize.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default GestoreScannerStatsScreen;
