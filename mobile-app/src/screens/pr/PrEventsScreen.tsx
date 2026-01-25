import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows, gradients } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { triggerHaptic } from '@/lib/haptics';
import api, { PrProfile, PrEvent } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface PrEventsScreenProps {
  onBack: () => void;
  onEventPress: (eventId: string) => void;
}

export function PrEventsScreen({ onBack, onEventPress }: PrEventsScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [prProfile, setPrProfile] = useState<PrProfile | null>(null);
  const [events, setEvents] = useState<PrEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileData, eventsData] = await Promise.all([
        api.getPrProfile().catch(() => null),
        api.getPrEvents().catch(() => []),
      ]);
      setPrProfile(profileData);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading PR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const now = new Date();
  
  const upcomingEvents = useMemo(() => 
    events.filter(e => new Date(e.eventStart) >= now)
      .sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime()),
    [events]
  );

  const pastEvents = useMemo(() => 
    events.filter(e => new Date(e.eventStart) < now)
      .sort((a, b) => new Date(b.eventStart).getTime() - new Date(a.eventStart).getTime()),
    [events]
  );

  const displayedEvents = activeFilter === 'upcoming' ? upcomingEvents : pastEvents;

  const todayEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return events.filter(e => {
      const eventDate = new Date(e.eventStart);
      return eventDate >= today && eventDate < tomorrow;
    });
  }, [events]);

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

  const isToday = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  };

  const getInitials = () => {
    if (prProfile?.firstName && prProfile?.lastName) {
      return `${prProfile.firstName[0]}${prProfile.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'PR';
  };

  const renderEventCard = (event: PrEvent) => {
    const eventIsToday = isToday(event.eventStart);
    const isPast = new Date(event.eventStart) < now;

    return (
      <Pressable
        key={event.id}
        onPress={() => {
          triggerHaptic('medium');
          onEventPress(event.id);
        }}
        style={({ pressed }) => [
          styles.eventCard,
          { opacity: pressed ? 0.95 : 1 },
        ]}
        testID={`pr-event-card-${event.id}`}
      >
        <View style={styles.eventImageContainer}>
          {event.eventImageUrl ? (
            <Image
              source={{ uri: event.eventImageUrl }}
              style={styles.eventImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={gradients.purpleLight}
              style={styles.eventImagePlaceholder}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
            style={styles.eventImageOverlay}
          />
          
          {eventIsToday && (
            <View style={styles.todayBadge}>
              <Ionicons name="sparkles" size={12} color={colors.primaryForeground} />
              <Text style={styles.todayBadgeText}>OGGI</Text>
            </View>
          )}
          
          {isPast && (
            <View style={styles.pastBadge}>
              <Text style={styles.pastBadgeText}>Passato</Text>
            </View>
          )}
        </View>

        <View style={styles.eventContent}>
          <Text style={styles.eventName} numberOfLines={2}>{event.eventName}</Text>
          
          <View style={styles.eventMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={styles.metaText}>{formatDate(event.eventStart)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text style={styles.metaText}>{formatTime(event.eventStart)}</Text>
            </View>
          </View>

          <View style={styles.eventFooter}>
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.locationText} numberOfLines={1}>{event.locationName}</Text>
            </View>
            <View style={styles.discoverButton}>
              <Text style={styles.discoverText}>Scopri</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento eventi...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onBack();
          }}
          style={styles.backButton}
          testID="button-back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>I Miei Eventi PR</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar initials={getInitials()} size={56} />
            <View style={styles.profileInfo}>
              <Text style={styles.welcomeText}>Bentornato,</Text>
              <Text style={styles.profileName}>
                {prProfile?.firstName || user?.email?.split('@')[0] || 'Promoter'}
              </Text>
              {prProfile?.prCode && (
                <View style={styles.prCodeContainer}>
                  <Badge variant="primary" size="sm">
                    <Ionicons name="shield-checkmark" size={12} color={colors.primaryForeground} style={{ marginRight: 4 }} />
                    <Text style={styles.prCodeText}>{prProfile.prCode}</Text>
                  </Badge>
                </View>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <LinearGradient colors={gradients.purpleLight} style={styles.statIcon}>
                <Ionicons name="calendar" size={18} color={colors.foreground} />
              </LinearGradient>
              <Text style={styles.statValue}>{events.length}</Text>
              <Text style={styles.statLabel}>Totali</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <LinearGradient colors={gradients.goldenLight} style={styles.statIcon}>
                <Ionicons name="today" size={18} color={colors.primary} />
              </LinearGradient>
              <Text style={styles.statValue}>{todayEvents.length}</Text>
              <Text style={styles.statLabel}>Oggi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <LinearGradient colors={gradients.tealLight} style={styles.statIcon}>
                <Ionicons name="arrow-forward-circle" size={18} color={colors.teal} />
              </LinearGradient>
              <Text style={styles.statValue}>{upcomingEvents.length}</Text>
              <Text style={styles.statLabel}>Prossimi</Text>
            </View>
          </View>
        </GlassCard>

        <View style={styles.filterContainer}>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setActiveFilter('upcoming');
            }}
            style={[
              styles.filterButton,
              activeFilter === 'upcoming' && styles.filterButtonActive,
            ]}
            testID="filter-upcoming"
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={activeFilter === 'upcoming' ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text style={[
              styles.filterText,
              activeFilter === 'upcoming' && styles.filterTextActive,
            ]}>
              Prossimi ({upcomingEvents.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setActiveFilter('past');
            }}
            style={[
              styles.filterButton,
              activeFilter === 'past' && styles.filterButtonActive,
            ]}
            testID="filter-past"
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={activeFilter === 'past' ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text style={[
              styles.filterText,
              activeFilter === 'past' && styles.filterTextActive,
            ]}>
              Passati ({pastEvents.length})
            </Text>
          </Pressable>
        </View>

        {displayedEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>
              {activeFilter === 'upcoming' ? 'Nessun evento in programma' : 'Nessun evento passato'}
            </Text>
            <Text style={styles.emptyDescription}>
              {activeFilter === 'upcoming'
                ? 'I tuoi prossimi eventi appariranno qui'
                : 'Lo storico dei tuoi eventi apparirà qui'}
            </Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {displayedEvents.map(renderEventCard)}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.foreground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
  },
  profileCard: {
    marginBottom: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  profileName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  prCodeContainer: {
    marginTop: spacing.xs,
  },
  prCodeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.glassBorder,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  filterTextActive: {
    color: colors.primaryForeground,
  },
  eventsList: {
    gap: spacing.md,
  },
  eventCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  eventImageContainer: {
    height: 160,
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  eventImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  todayBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  todayBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  pastBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  pastBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  eventContent: {
    padding: spacing.md,
  },
  eventName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    fontWeight: '500',
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    flex: 1,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  discoverText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});

export default PrEventsScreen;
