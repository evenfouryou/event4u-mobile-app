import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { GestoreLocation } from '@/lib/api';

type FilterType = 'all' | 'active' | 'inactive';

interface GestoreLocationsScreenProps {
  onBack: () => void;
  onLocationPress?: (location: GestoreLocation) => void;
  onAddLocation?: () => void;
}

function generateMockLocations(): GestoreLocation[] {
  return [
    {
      id: '1',
      name: 'Club Prestige Milano',
      address: 'Via della Moda 15',
      city: 'Milano',
      capacity: 500,
      eventsCount: 12,
      status: 'active',
      contactPhone: '+39 02 1234567',
      contactEmail: 'info@clubprestige.it',
    },
    {
      id: '2',
      name: 'Terrazza Roma',
      address: 'Piazza Navona 22',
      city: 'Roma',
      capacity: 200,
      eventsCount: 8,
      status: 'active',
      contactPhone: '+39 06 7654321',
    },
    {
      id: '3',
      name: 'Beach Club Rimini',
      address: 'Lungomare Tintori 50',
      city: 'Rimini',
      capacity: 1000,
      eventsCount: 5,
      status: 'inactive',
    },
    {
      id: '4',
      name: 'Disco Palace Napoli',
      address: 'Via Toledo 100',
      city: 'Napoli',
      capacity: 800,
      eventsCount: 15,
      status: 'active',
      contactEmail: 'booking@discopalace.it',
    },
    {
      id: '5',
      name: 'Sky Lounge Torino',
      address: 'Corso Francia 250',
      city: 'Torino',
      capacity: 150,
      eventsCount: 0,
      status: 'inactive',
    },
  ];
}

export function GestoreLocationsScreen({ onBack, onLocationPress, onAddLocation }: GestoreLocationsScreenProps) {
  const { colors } = useTheme();
  const [locations, setLocations] = useState<GestoreLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<GestoreLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLocations();
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
    filterLocations();
  }, [locations, activeFilter, searchQuery]);

  const loadLocations = async () => {
    try {
      setIsLoading(true);
      const data = await api.getGestoreLocations();
      if (data.length === 0) {
        setLocations(generateMockLocations());
      } else {
        setLocations(data);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations(generateMockLocations());
    } finally {
      setIsLoading(false);
    }
  };

  const filterLocations = () => {
    let filtered = [...locations];

    if (activeFilter === 'active') {
      filtered = filtered.filter(location => location.status === 'active');
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(location => location.status === 'inactive');
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(location =>
        location.name.toLowerCase().includes(query) ||
        location.address.toLowerCase().includes(query) ||
        location.city.toLowerCase().includes(query)
      );
    }

    setFilteredLocations(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocations();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attiva</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inattiva</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'active', label: 'Attivi' },
    { id: 'inactive', label: 'Inattivi' },
  ];

  const handleLocationPress = (location: GestoreLocation) => {
    triggerHaptic('light');
    onLocationPress?.(location);
  };

  const handleAddLocation = () => {
    triggerHaptic('light');
    onAddLocation?.();
  };

  const renderLocation = ({ item }: { item: GestoreLocation }) => (
    <Pressable
      onPress={() => handleLocationPress(item)}
      testID={`location-item-${item.id}`}
    >
      <Card style={styles.locationCard} testID={`location-card-${item.id}`}>
        <View style={styles.locationContent}>
          <View style={[styles.locationIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="location-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={[styles.locationName, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.locationAddress, { color: colors.mutedForeground }]}>
              {item.address}, {item.city}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                  Capacità: {item.capacity}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                  {item.eventsCount} eventi
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.locationActions}>
            {getStatusBadge(item.status)}
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-locations"
      />

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.secondary }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca sede..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-location"
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
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                setActiveFilter(item.id);
              }}
              style={[
                styles.filterChip,
                { backgroundColor: colors.secondary },
                activeFilter === item.id && styles.filterChipActive,
              ]}
              testID={`filter-${item.id}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.mutedForeground },
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
        <Loading text="Caricamento sedi..." />
      ) : filteredLocations.length > 0 ? (
        <FlatList
          data={filteredLocations}
          renderItem={renderLocation}
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
          <Ionicons name="location-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna sede trovata</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {searchQuery ? 'Prova con una ricerca diversa' : 'Aggiungi sedi per gestire le tue location'}
          </Text>
        </View>
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleAddLocation}
        testID="button-add-location"
      >
        <Ionicons name="add" size={28} color={staticColors.primaryForeground} />
      </Pressable>
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
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
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
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
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
  locationCard: {
    padding: spacing.md,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: typography.fontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: typography.fontSize.xs,
  },
  locationActions: {
    alignItems: 'flex-end',
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
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default GestoreLocationsScreen;
