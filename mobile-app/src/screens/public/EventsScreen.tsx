import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Input, EventCard, Card } from '../../components';
import { api } from '../../lib/api';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  imageUrl?: string;
  price?: number;
  category?: string;
}

const FILTERS = [
  { id: 'all', label: 'Tutti' },
  { id: 'today', label: 'Oggi' },
  { id: 'week', label: 'Questa settimana' },
  { id: 'month', label: 'Questo mese' },
];

const CATEGORIES = [
  { id: 'music', label: 'Musica', icon: 'musical-notes' },
  { id: 'club', label: 'Club', icon: 'wine' },
  { id: 'festival', label: 'Festival', icon: 'bonfire' },
  { id: 'concert', label: 'Concerti', icon: 'mic' },
  { id: 'party', label: 'Party', icon: 'sparkles' },
];

export function EventsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeCategory, setActiveCategory] = useState<string | null>(
    route.params?.categoryId || null
  );

  const { data: events, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['/api/public/events', { filter: activeFilter, categoryId: activeCategory, search: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilter) params.append('filter', activeFilter);
      if (activeCategory) params.append('categoryId', activeCategory);
      if (searchQuery) params.append('search', searchQuery);
      const queryString = params.toString();
      const url = `/api/public/events${queryString ? `?${queryString}` : ''}`;
      return api.get<Event[]>(url).catch(() => []);
    },
  });

  const handleEventPress = useCallback((eventId: string) => {
    navigation.navigate('EventDetail', { eventId });
  }, [navigation]);

  const handleFilterPress = (filterId: string) => {
    setActiveFilter(filterId);
  };

  const handleCategoryPress = (categoryId: string) => {
    setActiveCategory(activeCategory === categoryId ? null : categoryId);
  };

  const numColumns = isLandscape || isTablet ? 2 : 1;

  const renderEventItem = useCallback(({ item, index }: { item: Event; index: number }) => (
    <View style={[
      styles.eventItem,
      numColumns === 2 && styles.eventItemGrid,
      numColumns === 2 && index % 2 === 0 && styles.eventItemGridLeft,
      numColumns === 2 && index % 2 === 1 && styles.eventItemGridRight,
    ]}>
      <EventCard
        id={item.id}
        title={item.title}
        date={item.date}
        time={item.time}
        location={item.location}
        imageUrl={item.imageUrl}
        price={item.price}
        onPress={() => handleEventPress(item.id)}
        testID={`card-event-${item.id}`}
      />
    </View>
  ), [handleEventPress, numColumns]);

  const filteredEvents = (events as Event[]) || [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title} testID="text-events-title">Eventi</Text>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => navigation.navigate('Venues')}
          testID="button-map"
        >
          <Ionicons name="map-outline" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Cerca eventi..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Ionicons name="search" size={20} color={colors.mutedForeground} />}
          containerStyle={styles.searchInput}
          testID="input-search-events"
        />
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === item.id && styles.filterChipActive,
              ]}
              onPress={() => handleFilterPress(item.id)}
              testID={`button-filter-${item.id}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                activeCategory === item.id && styles.categoryChipActive,
              ]}
              onPress={() => handleCategoryPress(item.id)}
              testID={`button-category-${item.id}`}
            >
              <Ionicons
                name={item.icon as any}
                size={16}
                color={activeCategory === item.id ? colors.primaryForeground : colors.foreground}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  activeCategory === item.id && styles.categoryChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        key={numColumns}
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.eventsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            testID="refresh-control-events"
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer} testID="loading-events">
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.skeletonCard} />
              ))}
            </View>
          ) : (
            <Card style={styles.emptyCard} testID="empty-events">
              <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Nessun evento trovato</Text>
              <Text style={styles.emptyText}>
                Prova a modificare i filtri o cerca qualcos'altro
              </Text>
            </Card>
          )
        }
        testID="flatlist-events"
      />
    </SafeAreaView>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  mapButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchInput: {
    marginBottom: 0,
  },
  filtersContainer: {
    marginBottom: spacing.sm,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterChipTextActive: {
    color: colors.primaryForeground,
  },
  categoriesContainer: {
    marginBottom: spacing.md,
  },
  categoriesList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  categoryChipTextActive: {
    color: colors.primaryForeground,
  },
  eventsList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  eventItem: {
    marginBottom: spacing.md,
  },
  eventItemGrid: {
    flex: 1,
    maxWidth: '50%',
  },
  eventItemGridLeft: {
    paddingRight: spacing.xs,
  },
  eventItemGridRight: {
    paddingLeft: spacing.xs,
  },
  loadingContainer: {
    gap: spacing.md,
  },
  skeletonCard: {
    height: 240,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
