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
import api, { ReportStats } from '@/lib/api';

type ReportType = 'revenue' | 'attendance' | 'inventory' | 'performance';
type PeriodType = 'week' | 'month' | 'year';

interface GestoreReportsScreenProps {
  onBack: () => void;
}

export function GestoreReportsScreen({ onBack }: GestoreReportsScreenProps) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<ReportStats>({
    totalRevenue: 0,
    revenueGrowth: 0,
    avgAttendance: 0,
    attendanceGrowth: 0,
    topProducts: [],
    eventPerformance: [],
    inventoryValue: 0,
    lowStockCount: 0,
    staffPerformance: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeType, setActiveType] = useState<ReportType>('revenue');
  const [activePeriod, setActivePeriod] = useState<PeriodType>('month');

  useEffect(() => {
    loadReports();
  }, [activeType, activePeriod]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const data = await api.getGestoreReportStats(activePeriod, activeType);
      setStats(data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const types: { id: ReportType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'revenue', label: 'Fatturato', icon: 'cash-outline' },
    { id: 'attendance', label: 'Presenze', icon: 'people-outline' },
    { id: 'inventory', label: 'Inventario', icon: 'cube-outline' },
    { id: 'performance', label: 'Performance', icon: 'trending-up-outline' },
  ];

  const periods: { id: PeriodType; label: string }[] = [
    { id: 'week', label: 'Settimana' },
    { id: 'month', label: 'Mese' },
    { id: 'year', label: 'Anno' },
  ];

  const renderRevenueContent = () => (
    <>
      <Card style={styles.mainStatCard}>
        <Text style={styles.mainStatLabel}>Fatturato Totale</Text>
        <Text style={[styles.mainStatValue, { color: staticColors.success }]}>
          {formatCurrency(stats.totalRevenue)}
        </Text>
        <View style={styles.growthRow}>
          <Ionicons
            name={stats.revenueGrowth >= 0 ? 'trending-up' : 'trending-down'}
            size={16}
            color={stats.revenueGrowth >= 0 ? staticColors.success : staticColors.destructive}
          />
          <Text
            style={[
              styles.growthText,
              { color: stats.revenueGrowth >= 0 ? staticColors.success : staticColors.destructive },
            ]}
          >
            {formatPercentage(stats.revenueGrowth)} rispetto al periodo precedente
          </Text>
        </View>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Prodotti per Fatturato</Text>
        {stats.topProducts.length > 0 ? (
          stats.topProducts.map((product, index) => (
            <Card key={product.id} style={styles.listCard} testID={`product-${product.id}`}>
              <View style={styles.listItemContent}>
                <View style={[styles.rankBadge, { backgroundColor: index < 3 ? `${staticColors.primary}20` : staticColors.secondary }]}>
                  <Text style={[styles.rankText, { color: index < 3 ? staticColors.primary : staticColors.mutedForeground }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemName}>{product.name}</Text>
                  <Text style={styles.listItemSubtext}>{product.quantity} venduti</Text>
                </View>
                <Text style={styles.listItemValue}>{formatCurrency(product.revenue)}</Text>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nessun dato disponibile</Text>
          </Card>
        )}
      </View>
    </>
  );

  const renderAttendanceContent = () => (
    <>
      <Card style={styles.mainStatCard}>
        <Text style={styles.mainStatLabel}>Presenze Medie</Text>
        <Text style={[styles.mainStatValue, { color: staticColors.teal }]}>
          {stats.avgAttendance.toLocaleString('it-IT')}
        </Text>
        <View style={styles.growthRow}>
          <Ionicons
            name={stats.attendanceGrowth >= 0 ? 'trending-up' : 'trending-down'}
            size={16}
            color={stats.attendanceGrowth >= 0 ? staticColors.success : staticColors.destructive}
          />
          <Text
            style={[
              styles.growthText,
              { color: stats.attendanceGrowth >= 0 ? staticColors.success : staticColors.destructive },
            ]}
          >
            {formatPercentage(stats.attendanceGrowth)} rispetto al periodo precedente
          </Text>
        </View>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Eventi</Text>
        {stats.eventPerformance.length > 0 ? (
          stats.eventPerformance.map((event) => (
            <Card key={event.id} style={styles.listCard} testID={`event-${event.id}`}>
              <View style={styles.listItemContent}>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemName}>{event.name}</Text>
                  <Text style={styles.listItemSubtext}>{event.ticketsSold} biglietti venduti</Text>
                </View>
                <View style={styles.eventStats}>
                  <Text style={styles.eventRevenue}>{formatCurrency(event.revenue)}</Text>
                  <View style={styles.ratingSmall}>
                    <Ionicons name="star" size={12} color={staticColors.golden} />
                    <Text style={styles.ratingSmallText}>{event.rating.toFixed(1)}</Text>
                  </View>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nessun evento nel periodo</Text>
          </Card>
        )}
      </View>
    </>
  );

  const renderInventoryContent = () => (
    <>
      <View style={styles.statsRow}>
        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="cube" size={20} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(stats.inventoryValue)}</Text>
          <Text style={styles.statLabel}>Valore Inventario</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.warning}20` }]}>
            <Ionicons name="alert-circle" size={20} color={staticColors.warning} />
          </View>
          <Text style={styles.statValue}>{stats.lowStockCount}</Text>
          <Text style={styles.statLabel}>Scorte Basse</Text>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prodotti Più Venduti</Text>
        {stats.topProducts.length > 0 ? (
          stats.topProducts.slice(0, 5).map((product, index) => (
            <Card key={product.id} style={styles.listCard} testID={`inventory-${product.id}`}>
              <View style={styles.listItemContent}>
                <View style={[styles.rankBadge, { backgroundColor: `${staticColors.teal}20` }]}>
                  <Text style={[styles.rankText, { color: staticColors.teal }]}>{index + 1}</Text>
                </View>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemName}>{product.name}</Text>
                </View>
                <Text style={[styles.listItemValue, { color: staticColors.teal }]}>{product.quantity} unità</Text>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nessun dato disponibile</Text>
          </Card>
        )}
      </View>
    </>
  );

  const renderPerformanceContent = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Staff</Text>
        {stats.staffPerformance.length > 0 ? (
          stats.staffPerformance.map((staff, index) => (
            <Card key={staff.id} style={styles.listCard} testID={`staff-${staff.id}`}>
              <View style={styles.listItemContent}>
                <View style={[styles.rankBadge, { backgroundColor: index < 3 ? `${staticColors.success}20` : staticColors.secondary }]}>
                  <Text style={[styles.rankText, { color: index < 3 ? staticColors.success : staticColors.mutedForeground }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemName}>{staff.name}</Text>
                  <Text style={styles.listItemSubtext}>{staff.role}</Text>
                </View>
                <View style={styles.staffStats}>
                  <Text style={styles.scansText}>{staff.scans} scansioni</Text>
                  <View style={styles.ratingSmall}>
                    <Ionicons name="star" size={12} color={staticColors.golden} />
                    <Text style={styles.ratingSmallText}>{staff.rating.toFixed(1)}</Text>
                  </View>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nessun dato disponibile</Text>
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Migliori Eventi</Text>
        {stats.eventPerformance.length > 0 ? (
          stats.eventPerformance.slice(0, 3).map((event, index) => (
            <Card key={event.id} style={styles.listCard} testID={`perf-event-${event.id}`}>
              <View style={styles.listItemContent}>
                <View style={[styles.rankBadge, { backgroundColor: `${staticColors.golden}20` }]}>
                  <Ionicons name="trophy" size={14} color={staticColors.golden} />
                </View>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemName}>{event.name}</Text>
                  <Text style={styles.listItemSubtext}>{event.ticketsSold} biglietti • {formatCurrency(event.revenue)}</Text>
                </View>
                <View style={styles.ratingSmall}>
                  <Ionicons name="star" size={14} color={staticColors.golden} />
                  <Text style={[styles.ratingSmallText, { fontSize: typography.fontSize.base }]}>{event.rating.toFixed(1)}</Text>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nessun evento nel periodo</Text>
          </Card>
        )}
      </View>
    </>
  );

  const renderContent = () => {
    switch (activeType) {
      case 'revenue':
        return renderRevenueContent();
      case 'attendance':
        return renderAttendanceContent();
      case 'inventory':
        return renderInventoryContent();
      case 'performance':
        return renderPerformanceContent();
    }
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-reports"
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
        <View style={styles.headerSection}>
          <Text style={styles.title}>Report e Statistiche</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typesContainer}
        >
          {types.map((type) => (
            <Pressable
              key={type.id}
              onPress={() => {
                triggerHaptic('selection');
                setActiveType(type.id);
              }}
              style={[
                styles.typeChip,
                activeType === type.id && styles.typeChipActive,
              ]}
              testID={`type-${type.id}`}
            >
              <Ionicons
                name={type.icon}
                size={16}
                color={activeType === type.id ? staticColors.primaryForeground : staticColors.mutedForeground}
              />
              <Text
                style={[
                  styles.typeChipText,
                  activeType === type.id && styles.typeChipTextActive,
                ]}
              >
                {type.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.periodsContainer}>
          {periods.map((period) => (
            <Pressable
              key={period.id}
              onPress={() => {
                triggerHaptic('selection');
                setActivePeriod(period.id);
              }}
              style={[
                styles.periodChip,
                activePeriod === period.id && styles.periodChipActive,
              ]}
              testID={`period-${period.id}`}
            >
              <Text
                style={[
                  styles.periodChipText,
                  activePeriod === period.id && styles.periodChipTextActive,
                ]}
              >
                {period.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {showLoader ? (
          <Loading text="Caricamento report..." />
        ) : (
          renderContent()
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
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  typesContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    marginRight: spacing.sm,
  },
  typeChipActive: {
    backgroundColor: staticColors.primary,
  },
  typeChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  typeChipTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  periodsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  periodChip: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: staticColors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  periodChipActive: {
    borderColor: staticColors.primary,
    backgroundColor: `${staticColors.primary}10`,
  },
  periodChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  periodChipTextActive: {
    color: staticColors.primary,
    fontWeight: '600',
  },
  mainStatCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  mainStatLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  mainStatValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  growthText: {
    fontSize: typography.fontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  listCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  listItemSubtext: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  listItemValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: staticColors.success,
  },
  eventStats: {
    alignItems: 'flex-end',
  },
  eventRevenue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.success,
  },
  ratingSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  ratingSmallText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.golden,
  },
  staffStats: {
    alignItems: 'flex-end',
  },
  scansText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.teal,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
});

export default GestoreReportsScreen;
