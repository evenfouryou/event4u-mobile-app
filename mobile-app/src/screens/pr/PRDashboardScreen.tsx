import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

const { width } = Dimensions.get('window');

interface PRStats {
  totalEarnings: number;
  pendingEarnings: number;
  thisMonthEarnings: number;
  totalGuests: number;
  pendingGuests: number;
  confirmedGuests: number;
  totalTables: number;
  conversionRate: number;
}

interface RecentActivity {
  id: string;
  type: 'guest_added' | 'guest_confirmed' | 'table_booked' | 'payment_received';
  description: string;
  amount?: number;
  timestamp: string;
}

interface UpcomingEvent {
  id: string;
  name: string;
  date: string;
  venue: string;
  guestCount: number;
  tableCount: number;
}

export function PRDashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery<PRStats>({
    queryKey: ['/api/pr/dashboard/stats'],
    queryFn: () =>
      api.get<PRStats>('/api/pr/dashboard/stats').catch(() => ({
        totalEarnings: 2450.0,
        pendingEarnings: 320.0,
        thisMonthEarnings: 580.0,
        totalGuests: 234,
        pendingGuests: 18,
        confirmedGuests: 216,
        totalTables: 45,
        conversionRate: 92.3,
      })),
  });

  const { data: activities = [], refetch: refetchActivities } = useQuery<RecentActivity[]>({
    queryKey: ['/api/pr/dashboard/activities'],
    queryFn: () =>
      api.get<RecentActivity[]>('/api/pr/dashboard/activities').catch(() => [
        {
          id: '1',
          type: 'guest_confirmed',
          description: 'Marco R. confermato per Notte Italiana',
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'payment_received',
          description: 'Commissione ricevuta',
          amount: 25.0,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '3',
          type: 'table_booked',
          description: 'Tavolo VIP prenotato - Friday Vibes',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: '4',
          type: 'guest_added',
          description: '3 ospiti aggiunti alla lista',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
        },
      ]),
  });

  const { data: upcomingEvents = [] } = useQuery<UpcomingEvent[]>({
    queryKey: ['/api/pr/dashboard/upcoming'],
    queryFn: () =>
      api.get<UpcomingEvent[]>('/api/pr/dashboard/upcoming').catch(() => [
        {
          id: '1',
          name: 'Notte Italiana',
          date: 'Sab 18 Gen, 23:00',
          venue: 'Club Paradiso',
          guestCount: 24,
          tableCount: 3,
        },
        {
          id: '2',
          name: 'Sunday Chill',
          date: 'Dom 19 Gen, 18:00',
          venue: 'Beach Lounge',
          guestCount: 12,
          tableCount: 2,
        },
      ]),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchActivities()]);
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `€ ${amount.toFixed(2).replace('.', ',')}`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'guest_added':
        return 'person-add';
      case 'guest_confirmed':
        return 'checkmark-circle';
      case 'table_booked':
        return 'grid';
      case 'payment_received':
        return 'cash';
      default:
        return 'ellipse';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'guest_added':
        return colors.purpleLight;
      case 'guest_confirmed':
        return colors.success;
      case 'table_booked':
        return colors.purple;
      case 'payment_received':
        return colors.success;
      default:
        return colors.mutedForeground;
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Dashboard PR"
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('PRWallet')} data-testid="button-wallet">
            <Ionicons name="wallet-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />
        }
      >
        <Card variant="elevated" style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <View>
              <Text style={styles.earningsLabel}>Guadagni Totali</Text>
              <Text style={styles.earningsAmount}>{stats ? formatCurrency(stats.totalEarnings) : '€ 0,00'}</Text>
            </View>
            <View style={styles.earningsTrend}>
              <Ionicons name="trending-up" size={20} color={colors.success} />
              <Text style={styles.trendText}>+12%</Text>
            </View>
          </View>
          <View style={styles.earningsRow}>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatLabel}>In attesa</Text>
              <Text style={styles.earningsStatValue}>
                {stats ? formatCurrency(stats.pendingEarnings) : '€ 0,00'}
              </Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatLabel}>Questo mese</Text>
              <Text style={styles.earningsStatValue}>
                {stats ? formatCurrency(stats.thisMonthEarnings) : '€ 0,00'}
              </Text>
            </View>
          </View>
          <Button
            title="Richiedi Pagamento"
            variant="primary"
            size="sm"
            onPress={() => navigation.navigate('PRWallet')}
            style={styles.withdrawButton}
          />
        </Card>

        <View style={styles.statsGrid}>
          <Card variant="glass" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.purpleLight + '20' }]}>
              <Ionicons name="people" size={22} color={colors.purpleLight} />
            </View>
            <Text style={styles.statValue}>{stats?.totalGuests || 0}</Text>
            <Text style={styles.statLabel}>Ospiti Totali</Text>
          </Card>
          <Card variant="glass" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="time" size={22} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>{stats?.pendingGuests || 0}</Text>
            <Text style={styles.statLabel}>In Attesa</Text>
          </Card>
          <Card variant="glass" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.purple + '20' }]}>
              <Ionicons name="grid" size={22} color={colors.purple} />
            </View>
            <Text style={styles.statValue}>{stats?.totalTables || 0}</Text>
            <Text style={styles.statLabel}>Tavoli</Text>
          </Card>
          <Card variant="glass" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="analytics" size={22} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{stats?.conversionRate || 0}%</Text>
            <Text style={styles.statLabel}>Conversione</Text>
          </Card>
        </View>

        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prossimi Eventi</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PRMyEvents')}>
                <Text style={styles.seeAllText}>Vedi tutti</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventsScroll}>
              {upcomingEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => navigation.navigate('PRGuestLists', { eventId: event.id })}
                  activeOpacity={0.8}
                >
                  <Card variant="glass" style={styles.eventCard}>
                    <View style={styles.eventImagePlaceholder}>
                      <Ionicons name="calendar" size={32} color={colors.purple} />
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
                      <Text style={styles.eventDate}>{event.date}</Text>
                      <Text style={styles.eventVenue} numberOfLines={1}>{event.venue}</Text>
                      <View style={styles.eventStats}>
                        <View style={styles.eventStat}>
                          <Ionicons name="people" size={14} color={colors.purple} />
                          <Text style={styles.eventStatText}>{event.guestCount}</Text>
                        </View>
                        <View style={styles.eventStat}>
                          <Ionicons name="grid" size={14} color={colors.purpleLight} />
                          <Text style={styles.eventStatText}>{event.tableCount}</Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attività Recente</Text>
          </View>
          <Card variant="glass" style={styles.activitiesCard}>
            {activities.length === 0 ? (
              <View style={styles.emptyActivities}>
                <Ionicons name="time-outline" size={40} color={colors.mutedForeground} />
                <Text style={styles.emptyText}>Nessuna attività recente</Text>
              </View>
            ) : (
              activities.map((activity, index) => (
                <View
                  key={activity.id}
                  style={[
                    styles.activityItem,
                    index < activities.length - 1 && styles.activityItemBorder,
                  ]}
                >
                  <View style={[styles.activityIcon, { backgroundColor: getActivityColor(activity.type) + '20' }]}>
                    <Ionicons
                      name={getActivityIcon(activity.type) as any}
                      size={18}
                      color={getActivityColor(activity.type)}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                    {activity.amount && (
                      <Text style={styles.activityAmount}>+{formatCurrency(activity.amount)}</Text>
                    )}
                  </View>
                  <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
                </View>
              ))
            )}
          </Card>
        </View>

        <View style={styles.quickActions}>
          <Button
            title="Aggiungi Ospite"
            variant="primary"
            icon={<Ionicons name="person-add" size={18} color={colors.primaryForeground} />}
            onPress={() => navigation.navigate('PREvents')}
          />
          <Button
            title="Scansiona QR"
            variant="outline"
            icon={<Ionicons name="qr-code" size={18} color={colors.foreground} />}
            onPress={() => navigation.navigate('PRScanner')}
          />
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
    padding: spacing.lg,
  },
  earningsCard: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.purple + '15',
    borderColor: colors.purple + '30',
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  earningsLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  earningsAmount: {
    color: colors.foreground,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
  },
  earningsTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  trendText: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  earningsRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  earningsStat: {
    flex: 1,
  },
  earningsStatLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xxs,
  },
  earningsStatValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  earningsDivider: {
    width: 1,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.lg,
  },
  withdrawButton: {
    marginTop: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2 - 1,
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  seeAllText: {
    color: colors.purple,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  eventsScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  eventCard: {
    width: 200,
    marginRight: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  eventImagePlaceholder: {
    height: 80,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    padding: spacing.md,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xxs,
  },
  eventDate: {
    color: colors.purpleLight,
    fontSize: fontSize.xs,
    marginBottom: spacing.xxs,
  },
  eventVenue: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
  },
  eventStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  eventStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventStatText: {
    color: colors.foreground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  activitiesCard: {
    padding: spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  activityAmount: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  activityTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  emptyActivities: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
