import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows, gradients } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { triggerHaptic } from '@/lib/haptics';

interface PrEvent {
  id: string;
  eventId: string;
  eventName: string;
  eventImageUrl: string | null;
  eventStart: string;
  eventEnd: string | null;
  locationName: string;
  locationAddress?: string;
  stats?: {
    guestsCount: number;
    tablesCount: number;
    ticketsSold: number;
    commissionEarned: number;
  };
}

type FilterType = 'upcoming' | 'past' | 'all';

interface PrEventsScreenProps {
  onNavigateDashboard: () => void;
  onNavigateEventDetail: (eventId: string) => void;
  onGoBack: () => void;
}

export function PrEventsScreen({
  onNavigateDashboard,
  onNavigateEventDetail,
  onGoBack,
}: PrEventsScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<PrEvent[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('upcoming');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      setEvents([
        {
          id: '1',
          eventId: 'evt-1',
          eventName: 'Saturday Night Fever',
          eventImageUrl: null,
          eventStart: new Date().toISOString(),
          eventEnd: null,
          locationName: 'Club Paradise',
          stats: { guestsCount: 45, tablesCount: 3, ticketsSold: 12, commissionEarned: 120 },
        },
        {
          id: '2',
          eventId: 'evt-2',
          eventName: 'Techno Sunday',
          eventImageUrl: null,
          eventStart: new Date(Date.now() + 86400000).toISOString(),
          eventEnd: null,
          locationName: 'Warehouse',
          stats: { guestsCount: 28, tablesCount: 2, ticketsSold: 8, commissionEarned: 80 },
        },
        {
          id: '3',
          eventId: 'evt-3',
          eventName: 'Retro Disco',
          eventImageUrl: null,
          eventStart: new Date(Date.now() - 86400000 * 7).toISOString(),
          eventEnd: null,
          locationName: 'Vintage Club',
          stats: { guestsCount: 62, tablesCount: 5, ticketsSold: 25, commissionEarned: 218 },
        },
      ]);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const now = new Date();

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = new Date(event.eventStart);
      const isPast = eventDate < now;
      
      if (activeFilter === 'upcoming') return !isPast;
      if (activeFilter === 'past') return isPast;
      return true;
    });
  }, [events, activeFilter]);

  const upcomingCount = events.filter(e => new Date(e.eventStart) >= now).length;
  const pastCount = events.filter(e => new Date(e.eventStart) < now).length;

  const isToday = (dateString: string) => {
    const eventDate = new Date(dateString);
    return eventDate.toDateString() === now.toDateString();
  };

  const isLive = (event: PrEvent) => {
    const start = new Date(event.eventStart);
    const end = event.eventEnd ? new Date(event.eventEnd) : new Date(start.getTime() + 6 * 60 * 60 * 1000);
    return now >= start && now <= end;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventBadge = (event: PrEvent) => {
    if (isLive(event)) {
      return <Badge variant="success" testID={`badge-live-${event.id}`}>LIVE</Badge>;
    }
    if (isToday(event.eventStart)) {
      return <Badge variant="golden" testID={`badge-today-${event.id}`}>OGGI</Badge>;
    }
    if (new Date(event.eventStart) < now) {
      return <Badge variant="muted" testID={`badge-past-${event.id}`}>Passato</Badge>;
    }
    return null;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onGoBack();
            }}
            style={styles.backButton}
            testID="button-back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <View>
            <Text style={styles.title}>I Miei Eventi</Text>
            <Text style={styles.subtitle}>{events.length} eventi totali</Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onNavigateDashboard();
          }}
          style={styles.dashboardButton}
          testID="button-dashboard"
        >
          <Ionicons name="grid" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setActiveFilter('upcoming');
            }}
            style={[styles.filterPill, activeFilter === 'upcoming' && styles.filterPillActive]}
            testID="filter-upcoming"
          >
            <Ionicons name="calendar" size={16} color={activeFilter === 'upcoming' ? colors.primaryForeground : colors.foreground} />
            <Text style={[styles.filterText, activeFilter === 'upcoming' && styles.filterTextActive]}>
              Prossimi ({upcomingCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setActiveFilter('past');
            }}
            style={[styles.filterPill, activeFilter === 'past' && styles.filterPillActive]}
            testID="filter-past"
          >
            <Ionicons name="checkmark-circle" size={16} color={activeFilter === 'past' ? colors.primaryForeground : colors.foreground} />
            <Text style={[styles.filterText, activeFilter === 'past' && styles.filterTextActive]}>
              Passati ({pastCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setActiveFilter('all');
            }}
            style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
            testID="filter-all"
          >
            <Ionicons name="apps" size={16} color={activeFilter === 'all' ? colors.primaryForeground : colors.foreground} />
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
              Tutti
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Events List */}
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
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event, index) => (
            <Pressable
              key={event.id}
              onPress={() => {
                triggerHaptic('light');
                onNavigateEventDetail(event.id);
              }}
              testID={`card-event-${event.id}`}
            >
              <Card style={styles.eventCard}>
                {/* Event Image or Gradient */}
                <LinearGradient
                  colors={gradients.cardPurple}
                  style={styles.eventImagePlaceholder}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {getEventBadge(event) && (
                    <View style={styles.eventBadgeContainer}>
                      {getEventBadge(event)}
                    </View>
                  )}
                </LinearGradient>

                {/* Event Info */}
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName} numberOfLines={1}>{event.eventName}</Text>
                  
                  <View style={styles.eventDetails}>
                    <View style={styles.eventDetail}>
                      <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                      <Text style={styles.eventDetailText}>{formatDate(event.eventStart)}</Text>
                    </View>
                    <View style={styles.eventDetail}>
                      <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                      <Text style={styles.eventDetailText}>{formatTime(event.eventStart)}</Text>
                    </View>
                    <View style={styles.eventDetail}>
                      <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                      <Text style={styles.eventDetailText} numberOfLines={1}>{event.locationName}</Text>
                    </View>
                  </View>

                  {/* Stats Row */}
                  {event.stats && (
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Ionicons name="people" size={14} color="#8B5CF6" />
                        <Text style={styles.statText}>{event.stats.guestsCount}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="grid" size={14} color="#3B82F6" />
                        <Text style={styles.statText}>{event.stats.tablesCount}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="ticket" size={14} color="#10B981" />
                        <Text style={styles.statText}>{event.stats.ticketsSold}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="trending-up" size={14} color="#F59E0B" />
                        <Text style={styles.statText}>€{event.stats.commissionEarned}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Arrow */}
                <View style={styles.eventArrow}>
                  <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                </View>
              </Card>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessun evento</Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'upcoming' 
                ? 'Non hai eventi in programma'
                : activeFilter === 'past'
                ? 'Non hai eventi passati'
                : 'Non hai ancora nessun evento'}
            </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  dashboardButton: {
    padding: spacing.xs,
  },
  filterContainer: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondary,
    marginRight: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.primaryForeground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  eventImagePlaceholder: {
    width: 100,
    height: 100,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: spacing.xs,
  },
  eventBadgeContainer: {
    marginTop: spacing.xs,
    marginRight: spacing.xs,
  },
  eventInfo: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  eventDetails: {
    gap: spacing.xs,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventDetailText: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
    fontWeight: '500',
  },
  eventArrow: {
    paddingRight: spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
