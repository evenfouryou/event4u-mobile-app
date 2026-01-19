import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

type EventFilter = 'all' | 'active' | 'upcoming' | 'past';

interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  ticketsSold: number;
  totalTickets: number;
  revenue: string;
  status: 'live' | 'upcoming' | 'past' | 'draft';
  image?: string;
}

const filterOptions: { key: EventFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'Tutti', icon: 'apps-outline' },
  { key: 'active', label: 'Attivi', icon: 'pulse-outline' },
  { key: 'upcoming', label: 'Futuri', icon: 'calendar-outline' },
  { key: 'past', label: 'Passati', icon: 'time-outline' },
];

const mapEventStatus = (event: any): 'live' | 'upcoming' | 'past' | 'draft' => {
  const now = new Date();
  const eventDate = new Date(event.eventDate || event.date);
  if (event.status === 'draft') return 'draft';
  if (eventDate < now) return 'past';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (eventDate >= today && eventDate < tomorrow) return 'live';
  return 'upcoming';
};

export function ManageEventsScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const numColumns = (isTablet || isLandscape) ? 2 : 1;

  const [activeFilter, setActiveFilter] = useState<EventFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<any[]>('/api/events');

        const mappedEvents = data.map((e: any) => ({
          id: e.id,
          name: e.name,
          date: new Date(e.eventDate || e.date).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          time: e.startTime && e.endTime ? `${e.startTime} - ${e.endTime}` : '',
          venue: e.venueName || e.location?.name || '',
          ticketsSold: e.ticketsSold || 0,
          totalTickets: e.totalCapacity || e.capacity || 0,
          revenue: `€ ${(e.actualRevenue || e.revenue || 0).toLocaleString('it-IT')}`,
          status: mapEventStatus(e),
        }));
        setEvents(mappedEvents);
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Errore caricamento');
        setLoading(false);
      }
    };
    loadEvents();
  }, [reloadKey]);

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'live':
        return colors.success;
      case 'upcoming':
        return colors.primary;
      case 'past':
        return colors.mutedForeground;
      case 'draft':
        return colors.warning;
    }
  };

  const getStatusLabel = (status: Event['status']) => {
    switch (status) {
      case 'live':
        return 'In Corso';
      case 'upcoming':
        return 'Prossimo';
      case 'past':
        return 'Concluso';
      case 'draft':
        return 'Bozza';
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'active' && event.status === 'live') ||
      (activeFilter === 'upcoming' && (event.status === 'upcoming' || event.status === 'draft')) ||
      (activeFilter === 'past' && event.status === 'past');

    const matchesSearch =
      searchQuery === '' ||
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleEventPress = (eventId: string) => {
    navigation.navigate('EventHub', { eventId });
  };

  const handleQuickAction = (eventId: string, action: string) => {
    switch (action) {
      case 'edit':
        navigation.navigate('EditEvent', { eventId });
        break;
      case 'tickets':
        navigation.navigate('EventHub', { eventId, tab: 'tickets' });
        break;
      case 'duplicate':
        break;
    }
  };

  const handleRetry = () => {
    setReloadKey((prev) => prev + 1);
  };

  const renderFilterPill = ({ item }: { item: typeof filterOptions[0] }) => (
    <TouchableOpacity
      style={[
        styles.filterPill,
        activeFilter === item.key && styles.filterPillActive,
      ]}
      onPress={() => setActiveFilter(item.key)}
      testID={`filter-${item.key}`}
    >
      <Ionicons
        name={item.icon as any}
        size={16}
        color={activeFilter === item.key ? colors.primaryForeground : colors.mutedForeground}
      />
      <Text
        style={[
          styles.filterPillText,
          activeFilter === item.key && styles.filterPillTextActive,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderEventCard = ({ item }: { item: Event }) => {
    const progress = item.totalTickets > 0 ? (item.ticketsSold / item.totalTickets) * 100 : 0;

    return (
      <TouchableOpacity
        onPress={() => handleEventPress(item.id)}
        activeOpacity={0.8}
        testID={`card-event-${item.id}`}
        style={(isTablet || isLandscape) ? styles.eventCardLandscapeWrapper : undefined}
      >
        <Card style={styles.eventCard} variant="elevated">
          <View style={styles.eventHeader}>
            <View style={styles.eventInfo}>
              <Text style={styles.eventName}>{item.name}</Text>
              <View style={styles.eventMeta}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.eventMetaText}>{item.date}</Text>
              </View>
              <View style={styles.eventMeta}>
                <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.eventMetaText}>{item.venue}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
              {item.status === 'live' && (
                <View style={[styles.liveDot, { backgroundColor: getStatusColor(item.status) }]} />
              )}
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Biglietti venduti</Text>
              <Text style={styles.progressValue}>
                {item.ticketsSold}/{item.totalTickets}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor:
                      progress >= 80
                        ? colors.success
                        : progress >= 50
                        ? colors.primary
                        : colors.warning,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.eventFooter}>
            <View style={styles.revenueInfo}>
              <Text style={styles.revenueLabel}>Incasso</Text>
              <Text style={styles.revenueValue}>{item.revenue}</Text>
            </View>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction(item.id, 'edit')}
                testID={`button-edit-${item.id}`}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction(item.id, 'tickets')}
                testID={`button-tickets-${item.id}`}
              >
                <Ionicons name="ticket-outline" size={20} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction(item.id, 'duplicate')}
                testID={`button-duplicate-${item.id}`}
              >
                <Ionicons name="copy-outline" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderLoadingState = () => (
    <View style={styles.loadingState} testID="loading-indicator">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Caricamento eventi...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState} testID="error-state">
      <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
      <Text style={styles.errorTitle}>Errore di caricamento</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={handleRetry}
        testID="button-retry"
      >
        <Ionicons name="refresh-outline" size={20} color={colors.primaryForeground} />
        <Text style={styles.retryButtonText}>Riprova</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState} testID="empty-state">
      <Ionicons name="calendar-outline" size={64} color={colors.muted} />
      <Text style={styles.emptyTitle}>Nessun evento trovato</Text>
      <Text style={styles.emptyText}>
        Prova a modificare i filtri o crea un nuovo evento
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Gestione Eventi"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateEvent')}
            testID="button-create-event"
          >
            <Ionicons name="add" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca eventi..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          data={filterOptions}
          renderItem={renderFilterPill}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {loading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.eventsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          testID="events-list"
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEvent')}
        activeOpacity={0.8}
        testID="button-fab-create"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
    paddingVertical: spacing.md,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
  },
  eventsList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  columnWrapper: {
    gap: spacing.md,
  },
  eventCardLandscapeWrapper: {
    flex: 1,
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
  progressSection: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  progressValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  revenueInfo: {
    flex: 1,
  },
  revenueLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  revenueValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    marginTop: spacing.md,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.lg,
  },
  errorText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.lg,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
