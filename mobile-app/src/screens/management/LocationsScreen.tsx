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

type LocationFilter = 'all' | 'active' | 'inactive';

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  capacity: number;
  eventsCount: number;
  status: 'active' | 'inactive';
}

const filterOptions: { key: LocationFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'Tutti', icon: 'apps-outline' },
  { key: 'active', label: 'Attivi', icon: 'checkmark-circle-outline' },
  { key: 'inactive', label: 'Inattivi', icon: 'close-circle-outline' },
];

export function LocationsScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const numColumns = (isTablet || isLandscape) ? 2 : 1;

  const [activeFilter, setActiveFilter] = useState<LocationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<any[]>('/api/locations');
      const mapped = data.map((loc: any) => ({
        id: loc.id?.toString() || '',
        name: loc.name || '',
        address: loc.address || '',
        city: loc.city || '',
        capacity: loc.capacity || 0,
        eventsCount: loc.eventsCount || 0,
        status: loc.isActive ? 'active' : 'inactive',
      }));
      setLocations(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = locations.filter((loc) => {
    const matchesFilter =
      activeFilter === 'all' || loc.status === activeFilter;
    const matchesSearch =
      searchQuery === '' ||
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const renderFilterPill = ({ item }: { item: typeof filterOptions[0] }) => (
    <TouchableOpacity
      style={[styles.filterPill, activeFilter === item.key && styles.filterPillActive]}
      onPress={() => setActiveFilter(item.key)}
      testID={`filter-${item.key}`}
    >
      <Ionicons
        name={item.icon as any}
        size={16}
        color={activeFilter === item.key ? colors.primaryForeground : colors.mutedForeground}
      />
      <Text style={[styles.filterPillText, activeFilter === item.key && styles.filterPillTextActive]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderLocationCard = ({ item }: { item: Location }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('LocationDetail', { locationId: item.id })}
      activeOpacity={0.8}
      testID={`card-location-${item.id}`}
      style={(isTablet || isLandscape) ? styles.cardWrapper : undefined}
    >
      <Card style={styles.locationCard} variant="elevated">
        <View style={styles.locationHeader}>
          <View style={styles.locationIcon}>
            <Ionicons name="location" size={24} color={colors.primary} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationName}>{item.name}</Text>
            <Text style={styles.locationAddress}>{item.address}</Text>
            <Text style={styles.locationCity}>{item.city}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? `${colors.success}20` : `${colors.mutedForeground}20` }]}>
            <Text style={[styles.statusText, { color: item.status === 'active' ? colors.success : colors.mutedForeground }]}>
              {item.status === 'active' ? 'Attivo' : 'Inattivo'}
            </Text>
          </View>
        </View>
        <View style={styles.locationStats}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.statText}>Capacità: {item.capacity}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.statText}>{item.eventsCount} eventi</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Location"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateLocation')}
            testID="button-add-location"
          >
            <Ionicons name="add" size={24} color={colors.primaryForeground} />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca location..."
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

      <FlatList
        data={filterOptions}
        renderItem={renderFilterPill}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      />

      {loading ? (
        <View style={styles.centerContainer} testID="loading-indicator">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer} testID="error-state">
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Riprova" onPress={loadLocations} style={styles.retryButton} testID="button-retry" />
        </View>
      ) : filteredLocations.length === 0 ? (
        <View style={styles.centerContainer} testID="empty-state">
          <Ionicons name="location-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuna location trovata</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLocations}
          renderItem={renderLocationCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          numColumns={numColumns}
          key={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          testID="locations-list"
        />
      )}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
    fontWeight: fontWeight.semibold,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  columnWrapper: {
    gap: spacing.md,
  },
  cardWrapper: {
    flex: 1,
  },
  locationCard: {
    marginBottom: spacing.md,
    flex: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  locationName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.xxs,
  },
  locationAddress: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  locationCity: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  locationStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.destructive,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  retryButton: {
    marginTop: spacing.lg,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
