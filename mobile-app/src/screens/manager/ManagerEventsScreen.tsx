import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput } from 'react-native';
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
import api, { ManagerEvent } from '@/lib/api';

type FilterType = 'all' | 'upcoming' | 'active' | 'past' | 'draft';

interface ManagerEventsScreenProps {
  onBack: () => void;
  onEventPress: (eventId: string) => void;
  onCreateEvent: () => void;
}

export function ManagerEventsScreen({ onBack, onEventPress, onCreateEvent }: ManagerEventsScreenProps) {
  const { colors, gradients } = useTheme();
  const [events, setEvents] = useState<ManagerEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ManagerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
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

  useEffect(() => {
    filterEvents();
  }, [events, activeFilter, searchQuery]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const data = await api.getManagerEvents();
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    if (activeFilter !== 'all') {
      filtered = filtered.filter(event => event.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
      );
    }

    setFilteredEvents(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attivo</Badge>;
      case 'upcoming':
        return <Badge variant="default">Prossimo</Badge>;
      case 'past':
        return <Badge variant="secondary">Passato</Badge>;
      case 'draft':
        return <Badge variant="outline">Bozza</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderEvent = ({ item }: { item: ManagerEvent }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onEventPress(item.id);
      }}
    >
      <Card style={styles.eventCard} testID={`event-${item.id}`}>
        <View style={styles.eventHeader}>
          <View style={styles.eventDateBox}>
            <Text style={styles.eventDay}>{new Date(item.startDate).getDate()}</Text>
            <Text style={styles.eventMonth}>
              {new Date(item.startDate).toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}
            </Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.eventMeta}>
              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.eventMetaText} numberOfLines={1}>{item.location || '-'}</Text>
            </View>
            <View style={styles.eventMeta}>
              <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.eventMetaText}>{formatTime(item.startDate)}</Text>
            </View>
          </View>
          <View style={styles.eventActions}>
            {getStatusBadge(item.status)}
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </View>
        </View>

        <View style={styles.eventDivider} />

        <View style={styles.eventStats}>
          <View style={styles.eventStat}>
            <Ionicons name="ticket-outline" size={16} color={staticColors.primary} />
            <Text style={styles.eventStatValue}>{item.ticketsSold || 0}</Text>
            <Text style={styles.eventStatLabel}>Biglietti</Text>
          </View>
          <View style={styles.eventStat}>
            <Ionicons name="people-outline" size={16} color={staticColors.teal} />
            <Text style={styles.eventStatValue}>{item.guestsCount || 0}</Text>
            <Text style={styles.eventStatLabel}>Ospiti</Text>
          </View>
          <View style={styles.eventStat}>
            <Ionicons name="cash-outline" size={16} color={staticColors.golden} />
            <Text style={styles.eventStatValue}>€{item.revenue?.toFixed(0) || 0}</Text>
            <Text style={styles.eventStatLabel}>Incasso</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'upcoming', label: 'Prossimi' },
    { id: 'active', label: 'Attivi' },
    { id: 'past', label: 'Passati' },
    { id: 'draft', label: 'Bozze' },
  ];

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-events"
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca eventi..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
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
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                setActiveFilter(item.id);
              }}
              style={[
                styles.filterChip,
                activeFilter === item.id && styles.filterChipActive,
              ]}
              testID={`filter-${item.id}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {showLoader ? (
        <Loading text="Caricamento eventi..." />
      ) : filteredEvents.length > 0 ? (
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
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessun evento trovato</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'Prova con una ricerca diversa' : 'Crea il tuo primo evento'}
          </Text>
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
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
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  eventCard: {
    padding: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eventDateBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDay: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  eventMonth: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.primary,
    marginTop: -2,
  },
  eventInfo: {
    flex: 1,
    gap: 4,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    flex: 1,
  },
  eventActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  eventDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  eventStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  eventStat: {
    alignItems: 'center',
    gap: 4,
  },
  eventStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  eventStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
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

export default ManagerEventsScreen;
