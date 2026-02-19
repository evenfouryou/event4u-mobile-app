import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Image, ImageBackground, Dimensions, FlatList, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { PrEvent } from '@/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const CARD_MARGIN = spacing.sm;
const SNAP_WIDTH = CARD_WIDTH + CARD_MARGIN * 2;

interface PREventsScreenProps {
  onGoBack: () => void;
  onSelectEvent: (eventId: string) => void;
}

export function PREventsScreen({ onGoBack, onSelectEvent }: PREventsScreenProps) {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<PrEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const eventsData = await api.getPrEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading PR events:', error);
    } finally {
      setIsLoading(false);
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
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDay = (dateString: string) => new Date(dateString).getDate();
  const getMonth = (dateString: string) =>
    new Date(dateString).toLocaleDateString('it-IT', { month: 'short' }).toUpperCase();
  const getWeekday = (dateString: string) =>
    new Date(dateString).toLocaleDateString('it-IT', { weekday: 'short' }).toUpperCase();

  if (showLoader) {
    return <Loading text="Caricamento eventi..." />;
  }

  const renderEventCard = ({ item: event, index }: { item: PrEvent; index: number }) => (
    <View style={styles.cardOuter} testID={`event-card-${event.id}`}>
      <View style={styles.card}>
        {event.eventImageUrl ? (
          <ImageBackground
            source={{ uri: event.eventImageUrl }}
            style={styles.cardImage}
            imageStyle={styles.cardImageStyle}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
              style={styles.cardGradient}
            >
              <View style={styles.cardDateBadge}>
                <Text style={styles.cardDateWeekday}>{getWeekday(event.eventStart)}</Text>
                <Text style={styles.cardDateDay}>{getDay(event.eventStart)}</Text>
                <Text style={styles.cardDateMonth}>{getMonth(event.eventStart)}</Text>
              </View>
              <View style={styles.cardOverlayInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>{event.eventName}</Text>
                <View style={styles.cardMetaRow}>
                  <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.cardMetaText} numberOfLines={1}>{event.locationName}</Text>
                </View>
                <View style={styles.cardMetaRow}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.cardMetaText}>{formatTime(event.eventStart)}</Text>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={styles.cardImage}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardNoImageContent}>
              <View style={styles.cardDateBadgeSolid}>
                <Text style={styles.cardDateWeekday}>{getWeekday(event.eventStart)}</Text>
                <Text style={styles.cardDateDay}>{getDay(event.eventStart)}</Text>
                <Text style={styles.cardDateMonth}>{getMonth(event.eventStart)}</Text>
              </View>
              <View style={styles.cardOverlayInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>{event.eventName}</Text>
                <View style={styles.cardMetaRow}>
                  <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.cardMetaText} numberOfLines={1}>{event.locationName}</Text>
                </View>
                <View style={styles.cardMetaRow}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.cardMetaText}>{formatTime(event.eventStart)}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        )}

        <View style={styles.cardBody}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="people" size={18} color={staticColors.primary} />
              <Text style={styles.statBoxValue}>{event.guestCount || 0}</Text>
              <Text style={styles.statBoxLabel}>Ospiti</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="grid" size={18} color={staticColors.primary} />
              <Text style={styles.statBoxValue}>{event.tableCount || 0}</Text>
              <Text style={styles.statBoxLabel}>Tavoli</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="cash" size={18} color={staticColors.teal} />
              <Text style={[styles.statBoxValue, { color: staticColors.teal }]}>
                {'\u20AC'}{(event.earnings || 0).toFixed(0)}
              </Text>
              <Text style={styles.statBoxLabel}>Guadagno</Text>
            </View>
          </View>

          <Button
            variant="golden"
            onPress={() => {
              triggerHaptic('light');
              onSelectEvent(event.id);
            }}
            style={styles.enterButton}
            testID={`button-enter-event-${event.id}`}
          >
            Entra
          </Button>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="screen-pr-events">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>I Miei Eventi</Text>
        <Pressable onPress={onRefresh} style={styles.refreshButton} testID="button-refresh">
          <Ionicons name="refresh" size={22} color={staticColors.foreground} />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterButton, filter === 'upcoming' && styles.filterButtonActive]}
          onPress={() => { setFilter('upcoming'); setActiveIndex(0); }}
          testID="filter-upcoming"
        >
          <Ionicons
            name="arrow-forward-circle"
            size={16}
            color={filter === 'upcoming' ? staticColors.primaryForeground : staticColors.mutedForeground}
          />
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
            Prossimi
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, filter === 'past' && styles.filterButtonActive]}
          onPress={() => { setFilter('past'); setActiveIndex(0); }}
          testID="filter-past"
        >
          <Ionicons
            name="time"
            size={16}
            color={filter === 'past' ? staticColors.primaryForeground : staticColors.mutedForeground}
          />
          <Text style={[styles.filterText, filter === 'past' && styles.filterTextActive]}>
            Passati
          </Text>
        </Pressable>
      </View>

      {filteredEvents.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={staticColors.primary} />
          }
        >
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={48} color={staticColors.mutedForeground} />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === 'upcoming' ? 'Nessun evento in programma' : 'Nessun evento passato'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Gli eventi a cui sei assegnato appariranno qui
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.carouselContainer}>
          <FlatList
            data={filteredEvents}
            renderItem={renderEventCard}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled={false}
            snapToInterval={SNAP_WIDTH}
            snapToAlignment="center"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SNAP_WIDTH);
              setActiveIndex(Math.max(0, Math.min(newIndex, filteredEvents.length - 1)));
            }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={staticColors.primary} />
            }
            testID="carousel-events"
          />

          {filteredEvents.length > 1 && (
            <View style={styles.pagination}>
              {filteredEvents.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === activeIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}

          <Text style={styles.counterText}>
            {activeIndex + 1} / {filteredEvents.length}
          </Text>
        </View>
      )}
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
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: staticColors.glass,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  filterButtonActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
  },
  filterTextActive: {
    color: staticColors.primaryForeground,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  carouselContent: {
    paddingHorizontal: spacing.md - CARD_MARGIN,
    alignItems: 'center',
  },
  cardOuter: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN,
  },
  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: staticColors.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: staticColors.border,
    ...shadows.lg,
  },
  cardImage: {
    height: 240,
  },
  cardImageStyle: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  cardGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  cardNoImageContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  cardDateBadge: {
    width: 56,
    height: 66,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  cardDateBadgeSolid: {
    width: 56,
    height: 66,
    borderRadius: borderRadius.lg,
    backgroundColor: staticColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  cardDateWeekday: {
    fontSize: 9,
    fontWeight: '700',
    color: staticColors.primary,
    letterSpacing: 0.5,
  },
  cardDateDay: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    color: staticColors.primary,
    lineHeight: 30,
  },
  cardDateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: staticColors.primary,
    letterSpacing: 0.5,
  },
  cardOverlayInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardMetaText: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  cardBody: {
    padding: spacing.md,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statBoxValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.primary,
  },
  statBoxLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: staticColors.border,
  },
  enterButton: {
    borderRadius: borderRadius.lg,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.lg,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: staticColors.border,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: staticColors.primary,
  },
  counterText: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: staticColors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
