import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { Avatar } from '@/components/Avatar';
import { triggerHaptic } from '@/lib/haptics';
import api, { PublicEvent } from '@/lib/api';

type FilterType = 'all' | 'today' | 'weekend' | 'month';

interface EventsListScreenProps {
  onBack: () => void;
  onEventPress: (eventId: string) => void;
  onCartPress: () => void;
  onLoginPress: () => void;
  isAuthenticated?: boolean;
}

export function EventsListScreen({
  onBack,
  onEventPress,
  onCartPress,
  onLoginPress,
  isAuthenticated = false,
}: EventsListScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [events, setEvents] = useState<PublicEvent[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getPublicEvents({ limit: 50 });
      setEvents(data);
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

  const getFilteredEvents = () => {
    const now = new Date();
    let filtered = events;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.eventName.toLowerCase().includes(query) ||
        e.locationName.toLowerCase().includes(query)
      );
    }

    switch (activeFilter) {
      case 'today':
        filtered = filtered.filter(e => {
          const eventDate = new Date(e.eventStart);
          return eventDate.toDateString() === now.toDateString();
        });
        break;
      case 'weekend':
        const saturday = new Date(now);
        saturday.setDate(now.getDate() + (6 - now.getDay()));
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);
        filtered = filtered.filter(e => {
          const eventDate = new Date(e.eventStart);
          return eventDate >= saturday && eventDate <= sunday;
        });
        break;
      case 'month':
        filtered = filtered.filter(e => {
          const eventDate = new Date(e.eventStart);
          return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
        });
        break;
    }

    return filtered;
  };

  const filteredEvents = getFilteredEvents();

  const filters: { key: FilterType; label: string; icon?: string }[] = [
    { key: 'all', label: 'Tutti' },
    { key: 'today', label: 'Stasera', icon: 'star' },
    { key: 'weekend', label: 'Weekend' },
    { key: 'month', label: 'Mese' },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) return 'Stasera';
    
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

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  const toggleLocation = () => {
    triggerHaptic('medium');
    setLocationEnabled(!locationEnabled);
  };

  const renderEvent = ({ item, index }: { item: PublicEvent; index: number }) => {
    const eventDate = new Date(item.eventStart);
    const isToday = eventDate.toDateString() === new Date().toDateString();
    const isSoldOut = item.availableTickets <= 0;

    return (
      <View>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onEventPress(item.id);
          }}
        >
          <Card style={styles.eventCard} testID={`event-${item.id}`}>
            <View style={styles.eventImageContainer}>
              {item.eventImageUrl ? (
                <Image source={{ uri: item.eventImageUrl }} style={styles.eventImage} />
              ) : (
                <View style={styles.eventImagePlaceholder}>
                  <Ionicons name="sparkles" size={40} color={colors.primary} style={{ opacity: 0.3 }} />
                </View>
              )}
              <View style={styles.eventImageOverlay} />
              
              <View style={styles.eventBadges}>
                {isToday && (
                  <View style={styles.todayBadge}>
                    <View style={styles.todayDot} />
                    <Text style={styles.todayText}>Stasera</Text>
                  </View>
                )}
                {item.categoryName && (
                  <Badge
                    style={{ backgroundColor: item.categoryColor || colors.secondary }}
                  >
                    {item.categoryName}
                  </Badge>
                )}
              </View>

              {isSoldOut && (
                <View style={styles.soldOutOverlay}>
                  <Text style={styles.soldOutText}>SOLD OUT</Text>
                </View>
              )}
            </View>

            <View style={styles.eventContent}>
              <Text style={styles.eventName} numberOfLines={2}>
                {item.eventName}
              </Text>

              <View style={styles.eventMeta}>
                <View style={styles.eventMetaRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.eventMetaText}>
                    {formatDate(item.eventStart)} • {formatTime(item.eventStart)}
                  </Text>
                </View>
                <View style={styles.eventMetaRow}>
                  <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.eventMetaText} numberOfLines={1}>
                    {item.locationName}
                  </Text>
                  {item.distance && locationEnabled && (
                    <Badge variant="outline" style={styles.distanceBadge}>
                      {formatDistance(item.distance)}
                    </Badge>
                  )}
                </View>
              </View>

              <View style={styles.eventFooter}>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>da</Text>
                  <Text style={styles.priceValue}>
                    {item.minPrice ? `€${item.minPrice}` : 'Gratuito'}
                  </Text>
                </View>
                <View style={styles.availabilityContainer}>
                  <Text style={styles.availabilityText}>
                    {item.availableTickets} disponibili
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeArea style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.foreground} />
          </Pressable>
          <Image
            source={require('../../../assets/logo.png')}
            style={[styles.headerLogo, { tintColor: '#FFFFFF' }]}
            resizeMode="contain"
          />
          <View style={styles.headerActions}>
            <Pressable onPress={onCartPress} style={styles.iconButton}>
              <Ionicons name="bag-outline" size={24} color={colors.foreground} />
            </Pressable>
            {!isAuthenticated && (
              <Pressable onPress={onLoginPress} style={styles.iconButton}>
                <Ionicons name="person-outline" size={24} color={colors.foreground} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cerca eventi, luoghi..."
            placeholderTextColor={colors.mutedForeground}
            style={styles.searchInput}
          />
          <Pressable
            onPress={toggleLocation}
            style={[styles.locationButton, locationEnabled && styles.locationButtonActive]}
          >
            <Ionicons
              name={locationEnabled ? 'location' : 'location-outline'}
              size={20}
              color={locationEnabled ? colors.primary : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>

      <View>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                setActiveFilter(item.key);
              }}
              style={[styles.filterPill, activeFilter === item.key && styles.filterPillActive]}
            >
              {item.icon && (
                <Ionicons
                  name={item.icon as any}
                  size={14}
                  color={activeFilter === item.key ? colors.primaryForeground : colors.mutedForeground}
                />
              )}
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === item.key && styles.filterPillTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
          contentContainerStyle={styles.filtersContainer}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {loading ? (
        <Loading text="Caricamento eventi..." />
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Nessun evento trovato</Text>
              <Text style={styles.emptyText}>
                Prova a modificare i filtri o la ricerca
              </Text>
            </View>
          }
        />
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  headerLogo: {
    height: 28,
    width: 100,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  locationButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  locationButtonActive: {
    backgroundColor: `${colors.primary}20`,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterPillText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  eventCard: {
    padding: 0,
    overflow: 'hidden',
  },
  eventImageContainer: {
    height: 160,
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
  },
  eventBadges: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
  todayText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: 'white',
  },
  soldOutOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    color: colors.destructive,
    letterSpacing: 2,
  },
  eventContent: {
    padding: spacing.md,
  },
  eventName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  eventMeta: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventMetaText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    flex: 1,
  },
  distanceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  priceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  priceValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  availabilityContainer: {},
  availabilityText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
  },
});

export default EventsListScreen;
