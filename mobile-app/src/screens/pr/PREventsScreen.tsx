import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { PrEvent } from '@/lib/api';

interface PREventsScreenProps {
  onGoBack: () => void;
  onSelectEvent: (eventId: string) => void;
}

export function PREventsScreen({ onGoBack, onSelectEvent }: PREventsScreenProps) {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<PrEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const eventsData = await api.getPrEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading PR events:', error);
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
  const filteredEvents = events.filter((event) => {
    const eventDate = new Date(event.eventStart);
    return filter === 'upcoming' ? eventDate >= now : eventDate < now;
  });

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

  if (loading) {
    return <Loading text="Caricamento eventi..." />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onGoBack();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={staticColors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>I Miei Eventi</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterButton, filter === 'upcoming' && styles.filterButtonActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
            Prossimi
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, filter === 'past' && styles.filterButtonActive]}
          onPress={() => setFilter('past')}
        >
          <Text style={[styles.filterText, filter === 'past' && styles.filterTextActive]}>
            Passati
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={staticColors.primary}
          />
        }
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={staticColors.mutedForeground} />
            <Text style={styles.emptyTitle}>
              {filter === 'upcoming' ? 'Nessun evento in programma' : 'Nessun evento passato'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Gli eventi a cui sei assegnato appariranno qui
            </Text>
          </View>
        ) : (
          filteredEvents.map((event) => (
            <Pressable
              key={event.id}
              onPress={() => {
                triggerHaptic('light');
                onSelectEvent(event.id);
              }}
            >
              <Card style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateDay}>
                      {new Date(event.eventStart).getDate()}
                    </Text>
                    <Text style={styles.dateMonth}>
                      {new Date(event.eventStart).toLocaleDateString('it-IT', { month: 'short' })}
                    </Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventName}>{event.eventName}</Text>
                    <View style={styles.eventMeta}>
                      <Ionicons name="time-outline" size={14} color={staticColors.mutedForeground} />
                      <Text style={styles.eventMetaText}>{formatTime(event.eventStart)}</Text>
                    </View>
                    <View style={styles.eventMeta}>
                      <Ionicons name="location-outline" size={14} color={staticColors.mutedForeground} />
                      <Text style={styles.eventMetaText}>{event.locationName}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={staticColors.mutedForeground} />
                </View>
                <View style={styles.eventStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{event.guestCount || 0}</Text>
                    <Text style={styles.statLabel}>Ospiti</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{event.tableCount || 0}</Text>
                    <Text style={styles.statLabel}>Tavoli</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: staticColors.teal }]}>
                      €{(event.earnings || 0).toFixed(0)}
                    </Text>
                    <Text style={styles.statLabel}>Guadagno</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  filterRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: staticColors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  filterButtonActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  filterTextActive: {
    color: staticColors.primaryForeground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  eventCard: {
    marginBottom: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dateBox: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: staticColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primaryForeground,
  },
  dateMonth: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: staticColors.primaryForeground,
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  eventStats: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.primary,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.xs,
  },
});
