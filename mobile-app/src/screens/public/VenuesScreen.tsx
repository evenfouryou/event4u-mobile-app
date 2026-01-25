import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { triggerHaptic } from '@/lib/haptics';

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  imageUrl: string | null;
  categories: string[];
  rating: number;
  reviewCount: number;
  upcomingEvents: number;
  distance: number | null;
}

interface VenuesScreenProps {
  onBack: () => void;
  onVenuePress: (venueId: string) => void;
}

export function VenuesScreen({ onBack, onVenuePress }: VenuesScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);

  const venues: Venue[] = [
    {
      id: '1',
      name: 'Club XYZ',
      address: 'Via Roma 123',
      city: 'Milano',
      imageUrl: null,
      categories: ['Disco', 'Techno'],
      rating: 4.5,
      reviewCount: 328,
      upcomingEvents: 5,
      distance: 2.5,
    },
    {
      id: '2',
      name: 'Disco Palace',
      address: 'Via Veneto 45',
      city: 'Roma',
      imageUrl: null,
      categories: ['House', 'Commercial'],
      rating: 4.2,
      reviewCount: 215,
      upcomingEvents: 3,
      distance: null,
    },
    {
      id: '3',
      name: 'Salsa Club',
      address: 'Piazza Garibaldi 12',
      city: 'Napoli',
      imageUrl: null,
      categories: ['Latino', 'Salsa'],
      rating: 4.7,
      reviewCount: 156,
      upcomingEvents: 8,
      distance: 5.2,
    },
    {
      id: '4',
      name: 'Underground',
      address: 'Via Sottoripa 8',
      city: 'Genova',
      imageUrl: null,
      categories: ['Techno', 'Minimal'],
      rating: 4.8,
      reviewCount: 89,
      upcomingEvents: 2,
      distance: 12.3,
    },
  ];

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  const renderVenue = ({ item, index }: { item: Venue; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <Pressable
        onPress={() => {
          triggerHaptic('light');
          onVenuePress(item.id);
        }}
      >
        <Card style={styles.venueCard} testID={`venue-${item.id}`}>
          <View style={styles.venueImageContainer}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.venueImage} />
            ) : (
              <View style={styles.venueImagePlaceholder}>
                <Ionicons name="business" size={40} color={colors.primary} style={{ opacity: 0.3 }} />
              </View>
            )}
          </View>

          <View style={styles.venueContent}>
            <View style={styles.venueHeader}>
              <Text style={styles.venueName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.distance && locationEnabled && (
                <Badge variant="outline" style={styles.distanceBadge}>
                  {formatDistance(item.distance)}
                </Badge>
              )}
            </View>

            <View style={styles.venueLocation}>
              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.venueAddress}>
                {item.address}, {item.city}
              </Text>
            </View>

            <View style={styles.venueCategories}>
              {item.categories.map((cat, i) => (
                <Badge key={i} variant="secondary" style={styles.categoryBadge}>
                  {cat}
                </Badge>
              ))}
            </View>

            <View style={styles.venueFooter}>
              <View style={styles.venueRating}>
                <Ionicons name="star" size={16} color={colors.primary} />
                <Text style={styles.ratingText}>{item.rating}</Text>
                <Text style={styles.reviewCount}>({item.reviewCount})</Text>
              </View>
              <View style={styles.venueEvents}>
                <Ionicons name="calendar" size={16} color={colors.teal} />
                <Text style={styles.eventsText}>{item.upcomingEvents} eventi</Text>
              </View>
            </View>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );

  return (
    <SafeArea style={styles.container}>
      <Header title="Locali" showBack onBack={onBack} testID="header-venues" />

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.mutedForeground} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cerca locali, città..."
          placeholderTextColor={colors.mutedForeground}
          style={styles.searchInput}
        />
        <Pressable
          onPress={() => {
            triggerHaptic('medium');
            setLocationEnabled(!locationEnabled);
          }}
          style={[styles.locationButton, locationEnabled && styles.locationButtonActive]}
        >
          <Ionicons
            name={locationEnabled ? 'location' : 'location-outline'}
            size={20}
            color={locationEnabled ? colors.primary : colors.mutedForeground}
          />
        </Pressable>
      </View>

      {loading ? (
        <Loading text="Caricamento locali..." />
      ) : (
        <FlatList
          data={venues}
          renderItem={renderVenue}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={64} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Nessun locale trovato</Text>
              <Text style={styles.emptyText}>
                Prova a modificare la ricerca
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
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
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  venueCard: {
    padding: 0,
    overflow: 'hidden',
  },
  venueImageContainer: {
    height: 120,
  },
  venueImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  venueImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueContent: {
    padding: spacing.md,
  },
  venueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  venueName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
  },
  distanceBadge: {
    marginLeft: spacing.sm,
  },
  venueLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  venueAddress: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  venueCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  venueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  venueRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  reviewCount: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  venueEvents: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventsText: {
    fontSize: typography.fontSize.sm,
    color: colors.teal,
    fontWeight: '500',
  },
  emptyState: {
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

export default VenuesScreen;
