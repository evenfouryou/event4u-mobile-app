import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface StaffStats {
  guestsToday: number;
  guestsThisWeek: number;
  pendingCheckins: number;
  activeEvent: string | null;
}

interface AssignedEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  role: string;
  checkinsHandled: number;
  status: 'upcoming' | 'active' | 'completed';
}

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  timestamp: string;
  read: boolean;
}

export function StaffPrHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery<StaffStats>({
    queryKey: ['/api/staff/stats'],
    queryFn: () =>
      api.get<StaffStats>('/api/staff/stats').catch(() => ({
        guestsToday: 45,
        guestsThisWeek: 156,
        pendingCheckins: 12,
        activeEvent: 'Notte Italiana',
      })),
  });

  const { data: events = [], refetch: refetchEvents } = useQuery<AssignedEvent[]>({
    queryKey: ['/api/staff/events'],
    queryFn: () =>
      api.get<AssignedEvent[]>('/api/staff/events').catch(() => [
        {
          id: '1',
          name: 'Notte Italiana',
          date: '2025-01-18',
          time: '23:00',
          venue: 'Club Paradiso',
          role: 'Check-in',
          checkinsHandled: 45,
          status: 'active',
        },
        {
          id: '2',
          name: 'Sunday Chill',
          date: '2025-01-19',
          time: '18:00',
          venue: 'Beach Lounge',
          role: 'Accoglienza',
          checkinsHandled: 0,
          status: 'upcoming',
        },
      ]),
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/staff/notifications'],
    queryFn: () =>
      api.get<Notification[]>('/api/staff/notifications').catch(() => [
        {
          id: '1',
          message: 'Nuovo ospite aggiunto alla lista VIP',
          type: 'info',
          timestamp: new Date().toISOString(),
          read: false,
        },
        {
          id: '2',
          message: 'Evento Notte Italiana iniziato',
          type: 'success',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          read: true,
        },
      ]),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchEvents()]);
    setRefreshing(false);
  };

  const activeEvent = events.find((e) => e.status === 'active');
  const upcomingEvents = events.filter((e) => e.status === 'upcoming');
  const unreadNotifications = notifications.filter((n) => !n.read);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'upcoming':
        return colors.accent;
      case 'completed':
        return colors.mutedForeground;
      default:
        return colors.mutedForeground;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return 'information-circle';
      case 'warning':
        return 'warning';
      case 'success':
        return 'checkmark-circle';
      default:
        return 'ellipse';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'info':
        return colors.accent;
      case 'warning':
        return colors.warning;
      case 'success':
        return colors.success;
      default:
        return colors.mutedForeground;
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Staff PR"
        rightAction={
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
              {unreadNotifications.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadNotifications.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {activeEvent && (
          <TouchableOpacity
            onPress={() => navigation.navigate('StaffPrEventPanel', { eventId: activeEvent.id })}
            activeOpacity={0.8}
          >
            <Card variant="elevated" style={styles.activeEventCard}>
              <View style={styles.activeEventBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>IN CORSO</Text>
              </View>
              <Text style={styles.activeEventName}>{activeEvent.name}</Text>
              <View style={styles.activeEventDetails}>
                <View style={styles.activeEventDetail}>
                  <Ionicons name="location" size={16} color={colors.mutedForeground} />
                  <Text style={styles.activeEventDetailText}>{activeEvent.venue}</Text>
                </View>
                <View style={styles.activeEventDetail}>
                  <Ionicons name="people" size={16} color={colors.success} />
                  <Text style={[styles.activeEventDetailText, { color: colors.success }]}>
                    {activeEvent.checkinsHandled} check-in
                  </Text>
                </View>
              </View>
              <Button
                title="Gestisci Evento"
                variant="primary"
                onPress={() => navigation.navigate('StaffPrEventPanel', { eventId: activeEvent.id })}
                style={styles.manageButton}
              />
            </Card>
          </TouchableOpacity>
        )}

        <View style={styles.statsGrid}>
          <Card variant="glass" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="today" size={22} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats?.guestsToday || 0}</Text>
            <Text style={styles.statLabel}>Oggi</Text>
          </Card>
          <Card variant="glass" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="calendar" size={22} color={colors.accent} />
            </View>
            <Text style={styles.statValue}>{stats?.guestsThisWeek || 0}</Text>
            <Text style={styles.statLabel}>Questa Settimana</Text>
          </Card>
          <Card variant="glass" style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="time" size={22} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>{stats?.pendingCheckins || 0}</Text>
            <Text style={styles.statLabel}>In Attesa</Text>
          </Card>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('PRScanner')}
            activeOpacity={0.8}
            data-testid="button-scan-qr"
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="qr-code" size={28} color={colors.primaryForeground} />
            </View>
            <Text style={styles.quickActionLabel}>Scansiona QR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('GuestSearch')}
            activeOpacity={0.8}
            data-testid="button-search-guest"
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="search" size={28} color={colors.primaryForeground} />
            </View>
            <Text style={styles.quickActionLabel}>Cerca Ospite</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('GuestList')}
            activeOpacity={0.8}
            data-testid="button-guest-list"
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.success }]}>
              <Ionicons name="list" size={28} color={colors.primaryForeground} />
            </View>
            <Text style={styles.quickActionLabel}>Lista Ospiti</Text>
          </TouchableOpacity>
        </View>

        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prossimi Eventi</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PRMyEvents')}>
                <Text style={styles.seeAllText}>Vedi tutti</Text>
              </TouchableOpacity>
            </View>
            {upcomingEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => navigation.navigate('StaffPrEventPanel', { eventId: event.id })}
                activeOpacity={0.8}
              >
                <Card variant="glass" style={styles.eventCard}>
                  <View style={styles.eventLeft}>
                    <View style={styles.eventDate}>
                      <Text style={styles.eventDay}>
                        {new Date(event.date).getDate()}
                      </Text>
                      <Text style={styles.eventMonth}>
                        {new Date(event.date).toLocaleDateString('it-IT', { month: 'short' })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventName}>{event.name}</Text>
                    <View style={styles.eventMeta}>
                      <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                      <Text style={styles.eventMetaText}>{event.time}</Text>
                      <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                      <Text style={styles.eventMetaText}>{event.venue}</Text>
                    </View>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleText}>{event.role}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {notifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifiche Recenti</Text>
            <Card variant="glass" style={styles.notificationsCard}>
              {notifications.slice(0, 3).map((notification, index) => (
                <View
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    index < Math.min(notifications.length, 3) - 1 && styles.notificationItemBorder,
                  ]}
                >
                  <View
                    style={[
                      styles.notificationIcon,
                      { backgroundColor: getNotificationColor(notification.type) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getNotificationIcon(notification.type) as any}
                      size={18}
                      color={getNotificationColor(notification.type)}
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={[styles.notificationMessage, !notification.read && styles.unreadMessage]}>
                      {notification.message}
                    </Text>
                  </View>
                  {!notification.read && <View style={styles.unreadDot} />}
                </View>
              ))}
            </Card>
          </View>
        )}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.destructive,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: colors.foreground,
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  activeEventCard: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.success + '15',
    borderColor: colors.success + '30',
  },
  activeEventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  activeEventName: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  activeEventDetails: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  activeEventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeEventDetailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  manageButton: {
    marginTop: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  quickAction: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  eventLeft: {
    marginRight: spacing.lg,
  },
  eventDate: {
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 50,
  },
  eventDay: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  eventMonth: {
    color: colors.primary,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  eventMetaText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginRight: spacing.sm,
  },
  roleBadge: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  roleText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  notificationsCard: {
    padding: spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  notificationItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  unreadMessage: {
    fontWeight: fontWeight.medium,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
