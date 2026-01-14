import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Dimensions, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Button, Card, EventCard } from '../../components';
import { api } from '../../lib/api';

const { width, height } = Dimensions.get('window');

interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  postalCode: string;
  phone?: string;
  email?: string;
  website?: string;
  imageUrl?: string;
  gallery?: string[];
  rating?: number;
  reviewCount?: number;
  latitude: number;
  longitude: number;
  type: string;
  capacity?: number;
  amenities?: string[];
  openingHours?: { day: string; hours: string }[];
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  imageUrl?: string;
  price?: number;
}

export function VenueDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { venueId } = route.params;

  const { data: venue, isLoading } = useQuery<Venue>({
    queryKey: ['/api/venues', venueId],
  });

  const { data: venueEvents } = useQuery<Event[]>({
    queryKey: ['/api/venues', venueId, 'events'],
    enabled: !!venueId,
  });

  const handleCall = () => {
    if (venue?.phone) {
      Linking.openURL(`tel:${venue.phone}`);
    }
  };

  const handleEmail = () => {
    if (venue?.email) {
      Linking.openURL(`mailto:${venue.email}`);
    }
  };

  const handleWebsite = () => {
    if (venue?.website) {
      Linking.openURL(venue.website);
    }
  };

  const handleDirections = () => {
    if (venue) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;
      Linking.openURL(url);
    }
  };

  const handleEventPress = (eventId: string) => {
    navigation.navigate('EventDetail', { eventId });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonContent}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonText} />
        </View>
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
        <Text style={styles.errorText}>Locale non trovato</Text>
        <Button title="Torna indietro" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: venue.imageUrl || 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800' }}
            style={styles.heroImage}
          />
          <View style={styles.imageOverlay} />
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + spacing.sm }]}
            onPress={() => navigation.goBack()}
            data-testid="button-back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.venueType}>{venue.type}</Text>
              <Text style={styles.title}>{venue.name}</Text>
            </View>
            {venue.rating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={16} color={colors.warning} />
                <Text style={styles.ratingText}>{venue.rating.toFixed(1)}</Text>
                {venue.reviewCount && (
                  <Text style={styles.reviewCount}>({venue.reviewCount})</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={colors.primary} />
            <Text style={styles.address}>
              {venue.address}, {venue.postalCode} {venue.city}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            {venue.phone && (
              <TouchableOpacity style={styles.actionButton} onPress={handleCall} data-testid="button-call">
                <Ionicons name="call" size={20} color={colors.primary} />
                <Text style={styles.actionText}>Chiama</Text>
              </TouchableOpacity>
            )}
            {venue.email && (
              <TouchableOpacity style={styles.actionButton} onPress={handleEmail} data-testid="button-email">
                <Ionicons name="mail" size={20} color={colors.primary} />
                <Text style={styles.actionText}>Email</Text>
              </TouchableOpacity>
            )}
            {venue.website && (
              <TouchableOpacity style={styles.actionButton} onPress={handleWebsite} data-testid="button-website">
                <Ionicons name="globe" size={20} color={colors.primary} />
                <Text style={styles.actionText}>Sito</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionButton} onPress={handleDirections} data-testid="button-directions">
              <Ionicons name="navigate" size={20} color={colors.primary} />
              <Text style={styles.actionText}>Indicazioni</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descrizione</Text>
            <Text style={styles.description}>{venue.description}</Text>
          </View>

          {venue.capacity && (
            <Card style={styles.infoCard}>
              <View style={styles.infoItem}>
                <Ionicons name="people" size={20} color={colors.primary} />
                <Text style={styles.infoLabel}>Capacità</Text>
                <Text style={styles.infoValue}>{venue.capacity} persone</Text>
              </View>
            </Card>
          )}

          {venue.amenities && venue.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Servizi</Text>
              <View style={styles.amenitiesGrid}>
                {venue.amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityChip}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {venue.openingHours && venue.openingHours.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Orari di Apertura</Text>
              <Card style={styles.hoursCard}>
                {venue.openingHours.map((item, index) => (
                  <View key={index} style={styles.hoursRow}>
                    <Text style={styles.hoursDay}>{item.day}</Text>
                    <Text style={styles.hoursTime}>{item.hours}</Text>
                  </View>
                ))}
              </Card>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Posizione</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: venue.latitude,
                  longitude: venue.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker
                  coordinate={{ latitude: venue.latitude, longitude: venue.longitude }}
                  title={venue.name}
                />
              </MapView>
              <TouchableOpacity
                style={styles.mapOverlay}
                onPress={handleDirections}
                activeOpacity={0.8}
              >
                <Text style={styles.mapOverlayText}>Apri in Google Maps</Text>
              </TouchableOpacity>
            </View>
          </View>

          {venueEvents && venueEvents.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prossimi Eventi</Text>
              {venueEvents.slice(0, 3).map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  date={event.date}
                  time={event.time}
                  location={event.location}
                  imageUrl={event.imageUrl}
                  price={event.price}
                  onPress={() => handleEventPress(event.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  imageContainer: {
    width: '100%',
    height: height * 0.35,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backButton: {
    position: 'absolute',
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  venueType: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  ratingText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  reviewCount: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  address: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    color: colors.foreground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  description: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    lineHeight: 24,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    flex: 1,
  },
  infoValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  amenityText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  hoursCard: {
    padding: 0,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hoursDay: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  hoursTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  mapContainer: {
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  mapOverlayText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  errorText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  skeletonImage: {
    width: '100%',
    height: height * 0.35,
    backgroundColor: colors.card,
  },
  skeletonContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  skeletonTitle: {
    height: 32,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    width: '80%',
  },
  skeletonText: {
    height: 20,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    width: '60%',
  },
});
