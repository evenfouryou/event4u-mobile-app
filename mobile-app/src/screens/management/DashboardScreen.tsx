import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Button, Header } from '../../components';

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

const { width } = Dimensions.get('window');

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const stats: StatCard[] = [
    {
      id: '1',
      label: 'Fatturato Totale',
      value: '€ 45.320',
      icon: 'wallet',
      trend: 12,
      trendUp: true,
      color: colors.primary,
    },
    {
      id: '2',
      label: 'Biglietti Venduti',
      value: '1.247',
      icon: 'ticket',
      trend: 8,
      trendUp: true,
      color: colors.success,
    },
    {
      id: '3',
      label: 'Eventi Attivi',
      value: '5',
      icon: 'calendar',
      color: colors.accent,
    },
    {
      id: '4',
      label: 'Incasso Medio',
      value: '€ 36,30',
      icon: 'trending-up',
      trend: 3,
      trendUp: false,
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

  const activeEvents: ActiveEvent[] = [
    {
      id: '1',
      name: 'Festival Notte d\'Estate',
      date: '14 Gen 2026',
      time: '22:00 - 04:00',
      venue: 'Arena Milano',
      ticketsSold: 450,
      revenue: '€ 13.500',
      status: 'live',
    },
    {
      id: '2',
      name: 'Techno Underground',
      date: '18 Gen 2026',
      time: '23:00 - 06:00',
      venue: 'Warehouse Roma',
      ticketsSold: 320,
      revenue: '€ 9.600',
      status: 'upcoming',
    },
    {
      id: '3',
      name: 'Sunset Party',
      date: '25 Gen 2026',
      time: '18:00 - 02:00',
      venue: 'Beach Club Rimini',
      ticketsSold: 180,
      revenue: '€ 5.400',
      status: 'upcoming',
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

  const renderStatCard = ({ item }: { item: StatCard }) => (
    <Card style={[styles.statCard, { width: (width - spacing.lg * 2 - spacing.md) / 2 }]}>
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
      data-testid={`button-quick-action-${item.id}`}
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
      style={styles.eventCard}
      onPress={() => navigation.navigate('EventHub', { eventId: event.id })}
      activeOpacity={0.8}
      data-testid={`card-event-${event.id}`}
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

  return (
    <View style={styles.container}>
      <Header
        title="Dashboard Gestore"
        rightAction={
          <TouchableOpacity data-testid="button-notifications">
            <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Panoramica</Text>
          <FlatList
            data={stats}
            renderItem={renderStatCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
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
              data-testid="button-view-all-events"
            >
              <Text style={styles.viewAllText}>Vedi tutti</Text>
            </TouchableOpacity>
          </View>
          {activeEvents.map(renderEventCard)}
        </View>

        <View style={styles.section}>
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Andamento Vendite</Text>
            <View style={styles.chartPlaceholder}>
              <View style={styles.chartBars}>
                {[65, 45, 75, 55, 85, 70, 90].map((height, index) => (
                  <View
                    key={index}
                    style={[
                      styles.chartBar,
                      { height: height, backgroundColor: index === 6 ? colors.primary : colors.muted },
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
    </View>
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
  eventCard: {
    marginBottom: spacing.md,
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
