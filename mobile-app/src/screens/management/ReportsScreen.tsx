import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

type ReportPeriod = 'today' | 'week' | 'month' | 'year' | 'custom';
type ReportType = 'overview' | 'sales' | 'tickets' | 'staff' | 'inventory';

interface ReportSummary {
  totalRevenue: number;
  revenueChange: number;
  totalEvents: number;
  eventsChange: number;
  ticketsSold: number;
  ticketsChange: number;
  averageAttendance: number;
  attendanceChange: number;
}

interface TopEvent {
  id: string;
  name: string;
  date: string;
  revenue: number;
  attendance: number;
}

interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

const periodOptions: { key: ReportPeriod; label: string }[] = [
  { key: 'today', label: 'Oggi' },
  { key: 'week', label: 'Settimana' },
  { key: 'month', label: 'Mese' },
  { key: 'year', label: 'Anno' },
];

const reportTypes: { key: ReportType; label: string; icon: string }[] = [
  { key: 'overview', label: 'Panoramica', icon: 'analytics-outline' },
  { key: 'sales', label: 'Vendite', icon: 'cash-outline' },
  { key: 'tickets', label: 'Biglietti', icon: 'ticket-outline' },
  { key: 'staff', label: 'Staff', icon: 'people-outline' },
  { key: 'inventory', label: 'Inventario', icon: 'cube-outline' },
];

export function ReportsScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [activePeriod, setActivePeriod] = useState<ReportPeriod>('month');
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    loadReports();
  }, [activePeriod, activeReport]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<any>(`/api/reports?period=${activePeriod}&type=${activeReport}`);
      
      setSummary({
        totalRevenue: data.totalRevenue || 0,
        revenueChange: data.revenueChange || 0,
        totalEvents: data.totalEvents || 0,
        eventsChange: data.eventsChange || 0,
        ticketsSold: data.ticketsSold || 0,
        ticketsChange: data.ticketsChange || 0,
        averageAttendance: data.averageAttendance || 0,
        attendanceChange: data.attendanceChange || 0,
      });

      setTopEvents((data.topEvents || []).slice(0, 5).map((e: any) => ({
        id: e.id?.toString() || '',
        name: e.name || '',
        date: e.eventDate ? new Date(e.eventDate).toLocaleDateString('it-IT') : '',
        revenue: e.revenue || 0,
        attendance: e.attendance || 0,
      })));

      setTopProducts((data.topProducts || []).slice(0, 5).map((p: any) => ({
        id: p.id?.toString() || '',
        name: p.name || '',
        quantity: p.quantity || 0,
        revenue: p.revenue || 0,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `€ ${value.toFixed(2)}`;
  const formatChange = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const renderStatCard = (
    title: string,
    value: string,
    change: number,
    icon: string,
    color: string,
    testIdSuffix: string
  ) => (
    <Card style={[styles.statCard, (isTablet || isLandscape) && styles.statCardWide]} variant="elevated" testID={`card-stat-${testIdSuffix}`}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <View style={styles.changeContainer}>
        <Ionicons
          name={change >= 0 ? 'trending-up' : 'trending-down'}
          size={14}
          color={change >= 0 ? colors.success : colors.destructive}
        />
        <Text style={[styles.changeText, { color: change >= 0 ? colors.success : colors.destructive }]}>
          {formatChange(change)}
        </Text>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Report"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => navigation.navigate('ExportReport', { period: activePeriod })}
            testID="button-export"
          >
            <Ionicons name="download-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodContainer}
        >
          {periodOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.periodPill, activePeriod === option.key && styles.periodPillActive]}
              onPress={() => setActivePeriod(option.key)}
              testID={`period-${option.key}`}
            >
              <Text style={[styles.periodText, activePeriod === option.key && styles.periodTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.reportTypeContainer}
        >
          {reportTypes.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[styles.reportTypePill, activeReport === type.key && styles.reportTypePillActive]}
              onPress={() => setActiveReport(type.key)}
              testID={`report-${type.key}`}
            >
              <Ionicons
                name={type.icon as any}
                size={16}
                color={activeReport === type.key ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.reportTypeText, activeReport === type.key && styles.reportTypeTextActive]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
            <Text style={styles.loadingText}>Caricamento report...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Riprova" onPress={loadReports} style={styles.retryButton} testID="button-retry" />
          </View>
        ) : summary ? (
          <>
            <View style={[styles.statsGrid, (isTablet || isLandscape) && styles.statsGridWide]}>
              {renderStatCard(
                'Incasso',
                formatCurrency(summary.totalRevenue),
                summary.revenueChange,
                'cash',
                colors.primary,
                'revenue'
              )}
              {renderStatCard(
                'Eventi',
                summary.totalEvents.toString(),
                summary.eventsChange,
                'calendar',
                colors.teal,
                'events'
              )}
              {renderStatCard(
                'Biglietti',
                summary.ticketsSold.toString(),
                summary.ticketsChange,
                'ticket',
                colors.success,
                'tickets'
              )}
              {renderStatCard(
                'Presenze Medie',
                summary.averageAttendance.toFixed(0),
                summary.attendanceChange,
                'people',
                colors.warning,
                'attendance'
              )}
            </View>

            {topEvents.length > 0 && (
              <Card style={styles.section} variant="elevated" testID="card-top-events">
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Top Eventi</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('AllEvents')} testID="link-all-events">
                    <Text style={styles.seeAllLink}>Vedi tutti</Text>
                  </TouchableOpacity>
                </View>
                {topEvents.map((event, index) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventRow}
                    onPress={() => navigation.navigate('NightFile', { eventId: event.id })}
                    testID={`row-event-${event.id}`}
                  >
                    <View style={styles.eventRank}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventName}>{event.name}</Text>
                      <Text style={styles.eventDate}>{event.date}</Text>
                    </View>
                    <View style={styles.eventStats}>
                      <Text style={styles.eventRevenue}>{formatCurrency(event.revenue)}</Text>
                      <Text style={styles.eventAttendance}>{event.attendance} presenze</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </Card>
            )}

            {topProducts.length > 0 && (
              <Card style={styles.section} variant="elevated" testID="card-top-products">
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Top Prodotti</Text>
                </View>
                {topProducts.map((product) => (
                  <View key={product.id} style={styles.productRow} testID={`row-product-${product.id}`}>
                    <View style={styles.productRank}>
                      <Ionicons name="wine" size={14} color={colors.primary} />
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productQty}>{product.quantity} venduti</Text>
                    </View>
                    <Text style={styles.productRevenue}>{formatCurrency(product.revenue)}</Text>
                  </View>
                ))}
              </Card>
            )}
          </>
        ) : null}

        <View style={styles.bottomPadding} />
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
  periodContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  periodPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  periodPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  periodTextActive: {
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  reportTypeContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  reportTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  reportTypePillActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  reportTypeText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  reportTypeTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  statsGridWide: {
    flexWrap: 'nowrap',
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'flex-start',
  },
  statCardWide: {
    minWidth: 'auto',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statTitle: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: spacing.xxs,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xxs,
  },
  changeText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  section: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  seeAllLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  eventInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  eventName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  eventDate: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  eventStats: {
    alignItems: 'flex-end',
  },
  eventRevenue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.primary,
  },
  eventAttendance: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  productName: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  productQty: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  productRevenue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.teal,
  },
  centerContainer: {
    padding: spacing['3xl'],
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.destructive,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  bottomPadding: {
    height: spacing['3xl'],
  },
});
