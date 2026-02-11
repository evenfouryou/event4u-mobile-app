import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { GestoreEvent } from '@/lib/api';

type FilterType = 'tutti' | 'in_corso' | 'futuri' | 'passati';
type EventStatus = 'draft' | 'scheduled' | 'ongoing' | 'closed';

const statusConfig: Record<EventStatus, { label: string; color: string; bgColor: string; icon: keyof typeof Ionicons.glyphMap; gradientColors: string[] }> = {
  draft: { 
    label: 'Bozza', 
    color: '#9CA3AF', 
    bgColor: 'rgba(156, 163, 175, 0.15)', 
    icon: 'document-text-outline',
    gradientColors: ['#6B7280', '#4B5563']
  },
  scheduled: { 
    label: 'Programmato', 
    color: '#60A5FA', 
    bgColor: 'rgba(96, 165, 250, 0.15)', 
    icon: 'calendar-outline',
    gradientColors: ['#3B82F6', '#6366F1']
  },
  ongoing: { 
    label: 'In Corso', 
    color: '#34D399', 
    bgColor: 'rgba(52, 211, 153, 0.15)', 
    icon: 'radio-outline',
    gradientColors: ['#10B981', '#06B6D4']
  },
  closed: { 
    label: 'Concluso', 
    color: '#F87171', 
    bgColor: 'rgba(248, 113, 113, 0.15)', 
    icon: 'checkmark-circle-outline',
    gradientColors: ['#EF4444', '#EC4899']
  },
};

interface GestoreEventsScreenProps {
  onBack: () => void;
  onEventPress: (eventId: string) => void;
  onCreateEvent: () => void;
}

export function GestoreEventsScreen({ onBack, onEventPress, onCreateEvent }: GestoreEventsScreenProps) {
  const { colors, gradients } = useTheme();
  const [events, setEvents] = useState<GestoreEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('tutti');
  const [searchQuery, setSearchQuery] = useState('');

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
      setHasError(false);
      console.log('[GestoreEventsScreen] Loading events...');
      const data = await api.getGestoreEvents();
      console.log('[GestoreEventsScreen] Got events:', data?.length || 0, 'events');
      if (data && data.length > 0) {
        console.log('[GestoreEventsScreen] First event:', JSON.stringify(data[0]));
      }
      setEvents(data || []);
    } catch (error) {
      console.error('[GestoreEventsScreen] Error loading events:', error);
      setHasError(true);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const getEventStatus = (event: GestoreEvent): EventStatus => {
    if (event.status === 'draft') return 'draft';
    
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = event.endDate ? new Date(event.endDate) : null;
    
    if (endDate && now > endDate) return 'closed';
    if (now >= startDate && (!endDate || now <= endDate)) return 'ongoing';
    if (now < startDate) return 'scheduled';
    
    return event.status as EventStatus || 'scheduled';
  };

  const { filteredEvents, counts } = useMemo(() => {
    const now = new Date();
    
    let inCorsoCount = 0;
    let futuriCount = 0;
    let passatiCount = 0;
    
    events.forEach(event => {
      const status = getEventStatus(event);
      if (status === 'ongoing') inCorsoCount++;
      else if (status === 'scheduled' || status === 'draft') futuriCount++;
      else if (status === 'closed') passatiCount++;
    });
    
    const tuttiCount = events.length;
    
    let filtered = events.filter(event => {
      const status = getEventStatus(event);
      
      switch (activeFilter) {
        case 'tutti':
          return true;
        case 'in_corso':
          return status === 'ongoing';
        case 'futuri':
          return status === 'scheduled' || status === 'draft';
        case 'passati':
          return status === 'closed';
        default:
          return true;
      }
    });
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
      );
    }
    
    filtered.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    return {
      filteredEvents: filtered,
      counts: { tutti: tuttiCount, in_corso: inCorsoCount, futuri: futuriCount, passati: passatiCount }
    };
  }, [events, activeFilter, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase(),
      weekday: date.toLocaleDateString('it-IT', { weekday: 'long' }),
      full: date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const renderEventCard = ({ item, index }: { item: GestoreEvent; index: number }) => {
    const status = getEventStatus(item);
    const config = statusConfig[status] || statusConfig.scheduled;
    const dateInfo = formatDate(item.startDate);
    const isDraft = status === 'draft';

    return (
      <Pressable
        onPress={() => {
          triggerHaptic('light');
          onEventPress(item.id);
        }}
        style={({ pressed }) => [
          styles.eventCardWrapper,
          pressed && styles.eventCardPressed,
        ]}
        testID={`event-card-${item.id}`}
      >
        <Card style={styles.eventCard}>
          <View style={[styles.statusBar, { backgroundColor: config.gradientColors[0] }]} />
          
          <View style={styles.eventContent}>
            <View style={styles.eventHeader}>
              <View style={styles.eventMainInfo}>
                <Text style={styles.eventName} numberOfLines={2}>{item.name}</Text>
                
                <View style={styles.statusBadges}>
                  <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
                    <Ionicons name={config.icon} size={14} color={config.color} />
                    <Text style={[styles.statusBadgeText, { color: config.color }]}>
                      {config.label}
                    </Text>
                  </View>
                  
                  {item.imageUrl && (
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                      <Ionicons name="images-outline" size={14} color="#A855F7" />
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={24} color={colors.mutedForeground} />
              </View>
            </View>
            
            <View style={styles.eventDetails}>
              <View style={styles.dateTimeRow}>
                <View style={[styles.dateBox, { backgroundColor: `${config.color}15` }]}>
                  <Ionicons name="calendar" size={20} color={config.color} />
                </View>
                <View style={styles.dateInfo}>
                  <Text style={styles.dateText}>
                    {dateInfo.weekday}, {dateInfo.full}
                  </Text>
                  <Text style={styles.timeText}>
                    {formatTime(item.startDate)}
                    {item.endDate && ` - ${formatTime(item.endDate)}`}
                  </Text>
                </View>
              </View>
              
              {item.location && (
                <View style={styles.locationRow}>
                  <View style={[styles.dateBox, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
                    <Ionicons name="location" size={20} color="#60A5FA" />
                  </View>
                  <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="ticket-outline" size={18} color={staticColors.primary} />
                <Text style={styles.statValue}>{item.ticketsSold || 0}</Text>
                <Text style={styles.statLabel}>Biglietti</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={18} color={staticColors.teal} />
                <Text style={styles.statValue}>{item.capacity || '-'}</Text>
                <Text style={styles.statLabel}>Capienza</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Ionicons name="cash-outline" size={18} color={staticColors.golden} />
                <Text style={styles.statValue}>€{(item.revenue || 0).toFixed(0)}</Text>
                <Text style={styles.statLabel}>Incasso</Text>
              </View>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  const filters: { id: FilterType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'tutti', label: 'Tutti', icon: 'list-outline' },
    { id: 'in_corso', label: 'In Corso', icon: 'radio-outline' },
    { id: 'futuri', label: 'Prossimi', icon: 'calendar-outline' },
    { id: 'passati', label: 'Passati', icon: 'checkmark-done-outline' },
  ];

  if (hasError) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-events" />
        <View style={styles.errorState}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={48} color={staticColors.destructive} />
          </View>
          <Text style={styles.errorTitle}>Errore di caricamento</Text>
          <Text style={styles.errorText}>
            Impossibile caricare gli eventi. Verifica la connessione e riprova.
          </Text>
          <Button onPress={loadEvents} style={styles.retryButton}>
            <Ionicons name="refresh" size={20} color={staticColors.primaryForeground} />
            <Text style={styles.retryButtonText}>Riprova</Text>
          </Button>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-events" />

      <View style={styles.titleSection}>
        <Text style={styles.pageTitle}>I Miei Eventi</Text>
        <Text style={styles.pageSubtitle}>Gestisci e monitora i tuoi eventi</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca eventi..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-events"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.id;
            const count = counts[item.id];
            
            return (
              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  setActiveFilter(item.id);
                }}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
                testID={`filter-${item.id}`}
              >
                <Ionicons 
                  name={item.icon} 
                  size={16} 
                  color={isActive ? staticColors.primaryForeground : colors.mutedForeground} 
                />
                <Text style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}>
                  {item.label}
                </Text>
                {count > 0 && (
                  <View style={[
                    styles.filterCount,
                    isActive && styles.filterCountActive,
                  ]}>
                    <Text style={[
                      styles.filterCountText,
                      isActive && styles.filterCountTextActive,
                    ]}>
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      </View>

      {showLoader ? (
        <Loading text="Caricamento eventi..." />
      ) : filteredEvents.length > 0 ? (
        <FlatList
          data={filteredEvents}
          renderItem={renderEventCard}
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
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={64} color={colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Nessun evento trovato' : `Nessun evento ${filters.find(f => f.id === activeFilter)?.label.toLowerCase()}`}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery 
              ? 'Prova con una ricerca diversa' 
              : activeFilter === 'in_corso'
                ? 'Non hai eventi attivi al momento'
                : activeFilter === 'futuri'
                  ? 'Crea il tuo primo evento!'
                  : 'Nessun evento passato'}
          </Text>
          {activeFilter === 'futuri' && !searchQuery && (
            <Button 
              onPress={() => {
                triggerHaptic('medium');
                onCreateEvent();
              }}
              style={styles.createButton}
              testID="button-create-empty"
            >
              <Ionicons name="add" size={20} color={staticColors.primaryForeground} />
              <Text style={styles.createButtonText}>Crea Evento</Text>
            </Button>
          )}
        </View>
      )}

      <View style={styles.fabContainer}>
        <Pressable
          onPress={() => {
            triggerHaptic('medium');
            onCreateEvent();
          }}
          testID="button-create-event"
        >
          <LinearGradient
            colors={gradients.golden}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color={staticColors.primaryForeground} />
          </LinearGradient>
        </Pressable>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  titleSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  pageTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  pageSubtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  filtersContainer: {
    paddingBottom: spacing.sm,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    gap: spacing.xs,
    minHeight: 44,
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  filterChipTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  filterCount: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginLeft: 4,
  },
  filterCountActive: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  filterCountText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: staticColors.mutedForeground,
  },
  filterCountTextActive: {
    color: staticColors.primaryForeground,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  eventCardWrapper: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  eventCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  eventCard: {
    padding: 0,
    overflow: 'hidden',
  },
  statusBar: {
    height: 4,
  },
  eventContent: {
    padding: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  eventMainInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  eventName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
  },
  statusBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  chevronContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInfo: {
    flex: 1,
  },
  dateText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  timeText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  locationText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: staticColors.border,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: staticColors.foreground,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  createButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: staticColors.foreground,
    textAlign: 'center',
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  fabContainer: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default GestoreEventsScreen;
