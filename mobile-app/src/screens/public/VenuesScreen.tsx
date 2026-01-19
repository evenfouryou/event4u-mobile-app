import { useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Platform, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Input, Card } from '../../components';
import { api } from '../../lib/api';

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  imageUrl?: string;
  rating?: number;
  eventsCount?: number;
  latitude: number;
  longitude: number;
  type: string;
}

export function VenuesScreen() {
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const numColumns = isLandscape || isTablet ? 2 : 1;

  const { data: venues, isLoading } = useQuery<Venue[]>({
    queryKey: ['/api/public/all-locations', { search: searchQuery }],
  });

  const handleVenuePress = useCallback((venue: Venue) => {
    if (viewMode === 'map') {
      setSelectedVenue(venue);
      mapRef.current?.animateToRegion({
        latitude: venue.latitude,
        longitude: venue.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      navigation.navigate('VenueDetail', { venueId: venue.id });
    }
  }, [viewMode, navigation]);

  const handleMarkerPress = (venue: Venue) => {
    setSelectedVenue(venue);
  };

  const handleSelectedVenuePress = () => {
    if (selectedVenue) {
      navigation.navigate('VenueDetail', { venueId: selectedVenue.id });
    }
  };

  const renderVenueItem = ({ item, index }: { item: Venue; index: number }) => {
    const isLeftColumn = index % 2 === 0;
    const cardStyle = numColumns === 2
      ? [styles.venueCard, isLeftColumn ? styles.venueCardLeft : styles.venueCardRight]
      : styles.venueCard;

    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={() => handleVenuePress(item)}
        activeOpacity={0.8}
        testID={`button-venue-${item.id}`}
      >
        <Image
          source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400' }}
          style={numColumns === 2 ? styles.venueImageGrid : styles.venueImage}
          testID={`image-venue-${item.id}`}
        />
        <View style={styles.venueContent}>
          <Text style={styles.venueName} testID={`text-venue-name-${item.id}`}>{item.name}</Text>
          <View style={styles.venueInfo}>
            <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.venueAddress} testID={`text-venue-address-${item.id}`}>{item.address}, {item.city}</Text>
          </View>
          <View style={styles.venueStats}>
            {item.rating && (
              <View style={styles.ratingStat}>
                <Ionicons name="star" size={14} color={colors.warning} />
                <Text style={styles.ratingText} testID={`text-venue-rating-${item.id}`}>{item.rating.toFixed(1)}</Text>
              </View>
            )}
            {item.eventsCount !== undefined && (
              <View style={styles.eventsStat}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.eventsText} testID={`text-venue-events-${item.id}`}>{item.eventsCount} eventi</Text>
              </View>
            )}
          </View>
          <View style={styles.venueType}>
            <Text style={styles.venueTypeText} testID={`text-venue-type-${item.id}`}>{item.type}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const venuesList = (venues || []) as Venue[];

  const initialRegion = venuesList.length > 0 ? {
    latitude: venuesList[0].latitude,
    longitude: venuesList[0].longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  } : {
    latitude: 45.4642,
    longitude: 9.1900,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} testID="button-back">
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title} testID="text-screen-title">Locali</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
            testID="button-list-view"
          >
            <Ionicons
              name="list"
              size={20}
              color={viewMode === 'list' ? colors.primaryForeground : colors.foreground}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
            onPress={() => setViewMode('map')}
            testID="button-map-view"
          >
            <Ionicons
              name="map"
              size={20}
              color={viewMode === 'map' ? colors.primaryForeground : colors.foreground}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Cerca locali..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Ionicons name="search" size={20} color={colors.mutedForeground} />}
          containerStyle={styles.searchInput}
          testID="input-search-venues"
        />
      </View>

      {viewMode === 'list' ? (
        <FlatList
          key={numColumns}
          data={venuesList}
          renderItem={renderVenueItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.venuesList}
          columnWrapperStyle={numColumns === 2 ? styles.columnWrapper : undefined}
          showsVerticalScrollIndicator={false}
          testID="flatlist-venues"
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.loadingContainer} testID="container-loading">
                {[1, 2, 3].map((i) => (
                  <View key={i} style={styles.skeletonCard} testID={`skeleton-card-${i}`} />
                ))}
              </View>
            ) : (
              <Card style={styles.emptyCard} testID="card-empty-state">
                <Ionicons name="business-outline" size={48} color={colors.mutedForeground} />
                <Text style={styles.emptyTitle} testID="text-empty-title">Nessun locale trovato</Text>
                <Text style={styles.emptyText} testID="text-empty-message">
                  Prova a cercare con un altro termine
                </Text>
              </Card>
            )
          }
        />
      ) : (
        <View style={styles.mapContainer} testID="container-map">
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={initialRegion}
            customMapStyle={mapDarkStyle}
            testID="map-view"
          >
            {venuesList.map((venue) => (
              <Marker
                key={venue.id}
                coordinate={{ latitude: venue.latitude, longitude: venue.longitude }}
                onPress={() => handleMarkerPress(venue)}
                testID={`marker-venue-${venue.id}`}
              >
                <View style={[
                  styles.marker,
                  selectedVenue?.id === venue.id && styles.markerSelected,
                ]}>
                  <Ionicons
                    name="location"
                    size={24}
                    color={selectedVenue?.id === venue.id ? colors.primary : colors.foreground}
                  />
                </View>
              </Marker>
            ))}
          </MapView>

          {selectedVenue && (
            <TouchableOpacity
              style={styles.selectedVenueCard}
              onPress={handleSelectedVenuePress}
              activeOpacity={0.9}
              testID={`button-selected-venue-${selectedVenue.id}`}
            >
              <Image
                source={{ uri: selectedVenue.imageUrl || 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400' }}
                style={styles.selectedVenueImage}
                testID={`image-selected-venue-${selectedVenue.id}`}
              />
              <View style={styles.selectedVenueContent}>
                <Text style={styles.selectedVenueName} testID={`text-selected-venue-name-${selectedVenue.id}`}>{selectedVenue.name}</Text>
                <Text style={styles.selectedVenueAddress} testID={`text-selected-venue-address-${selectedVenue.id}`}>
                  {selectedVenue.address}, {selectedVenue.city}
                </Text>
                <View style={styles.selectedVenueStats}>
                  {selectedVenue.rating && (
                    <View style={styles.ratingStat}>
                      <Ionicons name="star" size={12} color={colors.warning} />
                      <Text style={styles.ratingText} testID={`text-selected-venue-rating-${selectedVenue.id}`}>{selectedVenue.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const mapDarkStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#27272a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 2,
  },
  toggleButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInput: {
    marginBottom: 0,
  },
  venuesList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  columnWrapper: {
    gap: spacing.md,
  },
  venueCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  venueCardLeft: {
    marginRight: 0,
  },
  venueCardRight: {
    marginLeft: 0,
  },
  venueImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.muted,
  },
  venueImageGrid: {
    width: '100%',
    height: 100,
    backgroundColor: colors.muted,
  },
  venueContent: {
    flex: 1,
    padding: spacing.md,
  },
  venueName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  venueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  venueAddress: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    flex: 1,
  },
  venueStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  ratingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  eventsStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventsText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  venueType: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  venueTypeText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    gap: spacing.md,
  },
  skeletonCard: {
    height: 100,
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
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  marker: {
    backgroundColor: colors.card,
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
  },
  markerSelected: {
    borderColor: colors.primary,
  },
  selectedVenueCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.md,
  },
  selectedVenueImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  selectedVenueContent: {
    flex: 1,
  },
  selectedVenueName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  selectedVenueAddress: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  selectedVenueStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});
