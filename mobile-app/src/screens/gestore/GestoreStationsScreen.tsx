import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { GestoreStation, GestoreEvent } from '@/lib/api';

type StationType = 'all' | 'bar' | 'food' | 'entrance' | 'other';

interface GestoreStationsScreenProps {
  onBack: () => void;
}

export function GestoreStationsScreen({ onBack }: GestoreStationsScreenProps) {
  const { colors } = useTheme();
  const [stations, setStations] = useState<GestoreStation[]>([]);
  const [events, setEvents] = useState<GestoreEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StationType>('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [stationsData, eventsData] = await Promise.all([
        api.getGestoreStations(),
        api.getGestoreEvents(),
      ]);
      setStations(stationsData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Error loading stations:', err);
      setError('Errore nel caricamento delle postazioni');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredStations = useMemo(() => {
    let filtered = stations;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(station =>
        station.name.toLowerCase().includes(query) ||
        station.type?.toLowerCase().includes(query)
      );
    }

    if (activeFilter !== 'all') {
      filtered = filtered.filter(s => s.type === activeFilter);
    }

    if (selectedEventId) {
      filtered = filtered.filter(s => s.eventId === selectedEventId);
    }

    return filtered;
  }, [stations, searchQuery, activeFilter, selectedEventId]);

  const getStationTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'bar':
        return 'wine-outline';
      case 'food':
        return 'restaurant-outline';
      case 'entrance':
        return 'enter-outline';
      default:
        return 'cube-outline';
    }
  };

  const getStationTypeBadge = (type: string) => {
    switch (type) {
      case 'bar':
        return <Badge variant="default">Bar</Badge>;
      case 'food':
        return <Badge variant="warning">Food</Badge>;
      case 'entrance':
        return <Badge variant="success">Ingresso</Badge>;
      default:
        return <Badge variant="secondary">Altro</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attiva</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inattiva</Badge>;
      case 'busy':
        return <Badge variant="warning">Occupata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInventoryBadge = (level?: string) => {
    switch (level) {
      case 'low':
        return <Badge variant="destructive">Stock Basso</Badge>;
      case 'ok':
        return <Badge variant="success">Stock OK</Badge>;
      case 'empty':
        return <Badge variant="destructive">Esaurito</Badge>;
      default:
        return null;
    }
  };

  const filters: { id: StationType; label: string }[] = [
    { id: 'all', label: 'Tutte' },
    { id: 'bar', label: 'Bar' },
    { id: 'food', label: 'Food' },
    { id: 'entrance', label: 'Ingressi' },
    { id: 'other', label: 'Altro' },
  ];

  const renderStation = ({ item }: { item: GestoreStation }) => (
    <Pressable
      onPress={() => triggerHaptic('light')}
      testID={`station-item-${item.id}`}
    >
      <Card style={styles.stationCard}>
        <View style={styles.stationHeader}>
          <View style={[styles.stationIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name={getStationTypeIcon(item.type)} size={24} color={colors.primary} />
          </View>
          <View style={styles.stationInfo}>
            <Text style={[styles.stationName, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.stationEvent, { color: colors.mutedForeground }]}>
              {item.eventName || 'Nessun evento'}
            </Text>
          </View>
          {getStationTypeBadge(item.type)}
        </View>
        <View style={[styles.stationDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stationStats}>
          <View style={styles.stationStat}>
            <Ionicons name="people-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.stationStatValue, { color: colors.foreground }]}>
              {item.staffCount || 0}
            </Text>
            <Text style={[styles.stationStatLabel, { color: colors.mutedForeground }]}>Staff</Text>
          </View>
          <View style={styles.stationStat}>
            <Ionicons name="cube-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.stationStatValue, { color: colors.foreground }]}>
              {item.productsCount || 0}
            </Text>
            <Text style={[styles.stationStatLabel, { color: colors.mutedForeground }]}>Prodotti</Text>
          </View>
          <View style={styles.stationStat}>
            {getStatusBadge(item.status)}
          </View>
        </View>
        {item.inventoryStatus && (
          <View style={styles.inventoryBadgeContainer}>
            {getInventoryBadge(item.inventoryStatus)}
          </View>
        )}
      </Card>
    </Pressable>
  );

  const renderEventFilter = () => (
    <View style={styles.eventFilterContainer}>
      <FlatList
        horizontal
        data={[{ id: null, name: 'Tutti gli eventi' }, ...events]}
        keyExtractor={(item) => item.id || 'all'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.eventFilterList}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              triggerHaptic('selection');
              setSelectedEventId(item.id);
            }}
            style={[
              styles.eventFilterChip,
              { backgroundColor: selectedEventId === item.id ? colors.primary : colors.secondary },
            ]}
            testID={`filter-event-${item.id || 'all'}`}
          >
            <Text
              style={[
                styles.eventFilterText,
                { color: selectedEventId === item.id ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {item.name}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="storefront-outline" size={64} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        Nessuna postazione trovata
      </Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {searchQuery ? 'Prova con una ricerca diversa' : 'Crea postazioni dal pannello web'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Errore</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{error}</Text>
      <Pressable
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={loadData}
        testID="button-retry"
      >
        <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>Riprova</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeArea edges={['bottom']} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as ViewStyle}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-stations"
      />

      <View style={styles.titleContainer}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Gestione Postazioni</Text>
        <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
          {stations.length} postazioni totali
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.secondary }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca postazioni..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-stations"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {renderEventFilter()}

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
                { backgroundColor: activeFilter === item.id ? colors.primary : colors.secondary },
              ]}
              testID={`filter-type-${item.id}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: activeFilter === item.id ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {error ? (
        renderError()
      ) : showLoader ? (
        <Loading text="Caricamento postazioni..." />
      ) : filteredStations.length > 0 ? (
        <FlatList
          data={filteredStations}
          renderItem={renderStation}
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
        renderEmptyState()
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  screenTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  screenSubtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
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
  eventFilterContainer: {
    paddingBottom: spacing.sm,
  },
  eventFilterList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  eventFilterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
  },
  eventFilterText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
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
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  stationCard: {
    padding: spacing.md,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stationIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  stationEvent: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  stationDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  stationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stationStat: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  stationStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  stationStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  inventoryBadgeContainer: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
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
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: staticColors.primary,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
});

export default GestoreStationsScreen;
