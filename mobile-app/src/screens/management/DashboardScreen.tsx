import React, { useState, useEffect } from 'react';
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
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

interface StatCard {
  id: string;
  label: string;
  value: string;
  icon: string;
  trend?: number;
  trendUp?: boolean;
  color: string;
}

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  route: string;
}

interface ActiveEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  ticketsSold: number;
  revenue: string;
  status: 'live' | 'upcoming' | 'ended';
}

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const numColumns = isTablet ? 4 : isLandscape ? 4 : 2;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalRevenue: 0,
    ticketsSold: 0,
    activeEvents: 0,
    avgTicketPrice: 0,
  });
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const events = await api.get<any[]>('/api/events');
      
      const active = events.filter((e: any) => e.status === 'live' || e.status === 'active');
      const totalRevenue = events.reduce((sum: number, e: any) => sum + (parseFloat(e.actualRevenue || e.revenue || '0')), 0);
      const ticketsSold = events.reduce((sum: number, e: any) => sum + (e.ticketsSold || 0), 0);
      
      setDashboardStats({
        totalRevenue,
        ticketsSold,
        activeEvents: active.length,
        avgTicketPrice: ticketsSold > 0 ? totalRevenue / ticketsSold : 0,
      });
      
      const formattedEvents: ActiveEvent[] = active.slice(0, 3).map((event: any) => ({
        id: event.id?.toString() || '',
        name: event.name || event.title || 'Evento',
        date: event.date ? new Date(event.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
        time: event.startTime && event.endTime ? `${event.startTime} - ${event.endTime}` : '',
        venue: event.venue || event.location || '',
        ticketsSold: event.ticketsSold || 0,
        revenue: `€ ${(parseFloat(event.actualRevenue || event.revenue || '0')).toLocaleString('it-IT')}`,
        status: event.status === 'live' ? 'live' : event.status === 'active' ? 'upcoming' : 'ended',
      }));
      
      setActiveEvents(formattedEvents);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats: StatCard[] = [
    {
      id: '1',
      label: 'Fatturato Totale',
      value: `€ ${dashboardStats.totalRevenue.toLocaleString('it-IT')}`,
      icon: 'wallet',
      color: colors.primary,
    },
    {
      id: '2',
      label: 'Biglietti Venduti',
      value: dashboardStats.ticketsSold.toLocaleString('it-IT'),
      icon: 'ticket',
      color: colors.success,
    },
    {
      id: '3',
      label: 'Eventi Attivi',
      value: dashboardStats.activeEvents.toString(),
      icon: 'calendar',
      color: colors.accent,
    },
    {
      id: '4',
      label: 'Incasso Medio',
      value: `€ ${dashboardStats.avgTicketPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: 'trending-up',
      color: colors.warning,
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Gestisci Eventi',
      icon: 'calendar-outline',
      color: colors.primary,
      route: 'ManageEvents',
    },
    {
      id: '2',
      title: 'Nuovo Evento',
      icon: 'add-circle-outline',
      color: colors.success,
      route: 'CreateEvent',
    },
    {
      id: '3',
      title: 'Report Vendite',
      icon: 'bar-chart-outline',
      color: colors.accent,
      route: 'SalesReport',
    },
    {
      id: '4',
      title: 'Gestione Staff',
      icon: 'people-outline',
      color: colors.warning,
      route: 'StaffManagement',
    },
  ];

  const getStatusColor = (status: ActiveEvent['status']) => {
    switch (status) {
      case 'live':
        return colors.success;
      case 'upcoming':
        return colors.primary;
      case 'ended':
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: ActiveEvent['status']) => {
    switch (status) {
      case 'live':
        return 'In Corso';
      case 'upcoming':
        return 'Prossimo';
      case 'ended':
        return 'Concluso';
    }
  };

  const cardWidth = isTablet
    ? (width - spacing.lg * 2 - spacing.md * 3) / 4
    : isLandscape 
      ? (width - spacing.lg * 2 - spacing.md * 3) / 4 
      : (width - spacing.lg * 2 - spacing.md) / 2;

  const renderStatCard = ({ item }: { item: StatCard }) => (
    <Card style={[styles.statCard, { width: cardWidth }]} testID={`stat-card-${item.id}`}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: `${item.color}20` }]}>
          <Ionicons name={item.icon as any} size={20} color={item.color} />
        </View>
        {item.trend !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: item.trendUp ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
            <Ionicons
              name={item.trendUp ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={item.trendUp ? colors.success : colors.destructive}
            />
            <Text style={[styles.trendText, { color: item.trendUp ? colors.success : colors.destructive }]}>
              {item.trend}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{item.value}</Text>
      <Text style={styles.statLabel}>{item.label}</Text>
    </Card>
  );

  const renderQuickAction = ({ item }: { item: QuickAction }) => (
    <TouchableOpacity
      style={styles.quickActionButton}
      onPress={() => navigation.navigate(item.route)}
      activeOpacity={0.8}
      testID={`button-quick-action-${item.id}`}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={28} color={colors.primaryForeground} />
      </View>
      <Text style={styles.quickActionLabel}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderEventCard = (event: ActiveEvent) => (
    <TouchableOpacity
      key={event.id}
      style={[styles.eventCard, (isTablet || isLandscape) && styles.eventCardResponsive]}
      onPress={() => navigation.navigate('EventHub', { eventId: event.id })}
      activeOpacity={0.8}
      testID={`card-event-${event.id}`}
    >
      <Card variant="elevated">
        <View style={styles.eventHeader}>
          <View style={styles.eventInfo}>
            <Text style={styles.eventName}>{event.name}</Text>
            <View style={styles.eventMeta}>
              <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.eventMetaText}>{event.date} • {event.time}</Text>
            </View>
            <View style={styles.eventMeta}>
              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.eventMetaText}>{event.venue}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(event.status)}20` }]}>
            {event.status === 'live' && <View style={[styles.liveDot, { backgroundColor: getStatusColor(event.status) }]} />}
            <Text style={[styles.statusText, { color: getStatusColor(event.status) }]}>
              {getStatusLabel(event.status)}
            </Text>
          </View>
        </View>
        <View style={styles.eventStats}>
          <View style={styles.eventStat}>
            <Text style={styles.eventStatValue}>{event.ticketsSold}</Text>
            <Text style={styles.eventStatLabel}>Biglietti</Text>
          </View>
          <View style={styles.eventStatDivider} />
          <View style={styles.eventStat}>
            <Text style={styles.eventStatValue}>{event.revenue}</Text>
            <Text style={styles.eventStatLabel}>Incasso</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header
          title="Dashboard Gestore"
          rightAction={
            <TouchableOpacity testID="button-notifications">
              <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
            </TouchableOpacity>
          }
        />
        <View style={styles.loadingContainer} testID="loading-indicator">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header
          title="Dashboard Gestore"
          rightAction={
            <TouchableOpacity testID="button-notifications">
              <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
            </TouchableOpacity>
          }
        />
        <View style={styles.errorContainer} testID="error-state">
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={loadDashboard}
            testID="button-retry"
          >
            <Ionicons name="refresh-outline" size={20} color={colors.primaryForeground} />
            <Text style={styles.retryButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Dashboard Gestore"
        rightAction={
          <TouchableOpacity testID="button-notifications">
            <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        testID="scroll-view-dashboard"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Panoramica</Text>
          <FlatList
            key={numColumns}
            data={stats}
            renderItem={renderStatCard}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            columnWrapperStyle={styles.statsGrid}
            scrollEnabled={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          <FlatList
            data={quickActions}
            renderItem={renderQuickAction}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionsContainer}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Eventi Attivi</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ManageEvents')}
              testID="button-view-all-events"
            >
              <Text style={styles.viewAllText}>Vedi tutti</Text>
            </TouchableOpacity>
          </View>
          {activeEvents.length > 0 ? (
            <View style={(isTablet || isLandscape) ? styles.eventsGrid : undefined}>
              {activeEvents.map(renderEventCard)}
            </View>
          ) : (
            <Card style={styles.emptyCard} testID="empty-events-card">
              <Ionicons name="calendar-outline" size={32} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>Nessun evento attivo</Text>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <Card style={styles.chartCard} testID="chart-card">
            <Text style={styles.chartTitle}>Andamento Vendite</Text>
            <View style={styles.chartPlaceholder}>
              <View style={styles.chartBars}>
                {[65, 45, 75, 55, 85, 70, 90].map((chartHeight, index) => (
                  <View
                    key={index}
                    style={[
                      styles.chartBar,
                      { height: chartHeight, backgroundColor: index === 6 ? colors.primary : colors.muted },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.chartLabels}>
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day, index) => (
                  <Text key={index} style={styles.chartLabel}>{day}</Text>
                ))}
              </View>
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
    paddingBottom: spacing.xl,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
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
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
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
  statsGrid: {
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  trendText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  actionsContainer: {
    gap: spacing.md,
  },
  quickActionButton: {
    alignItems: 'center',
    width: 90,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickActionLabel: {
    color: colors.foreground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  eventCard: {
    marginBottom: spacing.md,
  },
  eventCardResponsive: {
    flex: 1,
    minWidth: 280,
    maxWidth: '48%',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  eventMetaText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  eventStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  eventStat: {
    flex: 1,
    alignItems: 'center',
  },
  eventStatValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  eventStatLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  eventStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  chartCard: {
    padding: spacing.lg,
  },
  chartTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.lg,
  },
  chartPlaceholder: {
    height: 120,
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  chartBar: {
    width: 32,
    borderRadius: borderRadius.sm,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  chartLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    width: 32,
    textAlign: 'center',
  },
});
