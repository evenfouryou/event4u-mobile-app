import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, gradients } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { triggerHaptic } from '@/lib/haptics';

interface VenueDetailScreenProps {
  venueId: string;
  onBack: () => void;
  onEventPress: (eventId: string) => void;
}

export function VenueDetailScreen({
  venueId,
  onBack,
  onEventPress,
}: VenueDetailScreenProps) {
  const venue = {
    id: venueId,
    name: 'Club XYZ',
    description: 'Il club più esclusivo di Milano. Atmosfera unica, musica internazionale e drink premium. Dress code elegante richiesto.',
    address: 'Via Roma 123',
    city: 'Milano',
    zipCode: '20121',
    phone: '+39 02 1234567',
    email: 'info@clubxyz.it',
    website: 'www.clubxyz.it',
    imageUrl: null,
    categories: ['Disco', 'Techno', 'House'],
    rating: 4.5,
    reviewCount: 328,
    capacity: 800,
    openingHours: {
      friday: '23:00 - 05:00',
      saturday: '23:00 - 06:00',
    },
    amenities: ['Guardaroba', 'Area VIP', 'Terrazza', 'Parcheggio'],
    upcomingEvents: [
      { id: 'e1', name: 'Saturday Night Fever', date: new Date('2026-02-01T23:00:00') },
      { id: 'e2', name: 'DJ Set Special', date: new Date('2026-02-08T22:00:00') },
      { id: 'e3', name: 'Carnival Party', date: new Date('2026-02-15T22:00:00') },
    ],
  };

  const formatEventDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <SafeArea style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageContainer}>
          {venue.imageUrl ? (
            <Image source={{ uri: venue.imageUrl }} style={styles.image} />
          ) : (
            <LinearGradient
              colors={gradients.cardPurple}
              style={styles.imagePlaceholder}
            >
              <Ionicons name="business" size={80} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          )}
          <LinearGradient colors={gradients.dark} style={styles.imageOverlay} />

          <Pressable onPress={onBack} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </View>
          </Pressable>

          <View style={styles.imageBadges}>
            {venue.categories.map((cat, i) => (
              <Badge key={i} variant="secondary">{cat}</Badge>
            ))}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.venueName}>{venue.name}</Text>
              <View style={styles.rating}>
                <Ionicons name="star" size={18} color={colors.primary} />
                <Text style={styles.ratingValue}>{venue.rating}</Text>
                <Text style={styles.reviewCount}>({venue.reviewCount} recensioni)</Text>
              </View>
            </View>
          </View>

          <View style={styles.locationSection}>
            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Ionicons name="location" size={20} color={colors.primary} />
              </View>
              <View style={styles.metaText}>
                <Text style={styles.metaLabel}>{venue.address}</Text>
                <Text style={styles.metaValue}>{venue.zipCode} {venue.city}</Text>
              </View>
              <Pressable
                onPress={() => triggerHaptic('light')}
                style={styles.mapButton}
              >
                <Ionicons name="navigate" size={18} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.description}>
            <Text style={styles.sectionTitle}>Informazioni</Text>
            <Text style={styles.descriptionText}>{venue.description}</Text>
          </View>

          <View style={styles.infoGrid}>
            <Card style={styles.infoCard}>
              <Ionicons name="people" size={24} color={colors.primary} />
              <Text style={styles.infoValue}>{venue.capacity}</Text>
              <Text style={styles.infoLabel}>Capienza</Text>
            </Card>
            <Card style={styles.infoCard}>
              <Ionicons name="time" size={24} color={colors.teal} />
              <Text style={styles.infoValue}>23:00</Text>
              <Text style={styles.infoLabel}>Apertura</Text>
            </Card>
          </View>

          <View style={styles.amenitiesSection}>
            <Text style={styles.sectionTitle}>Servizi</Text>
            <View style={styles.amenitiesList}>
              {venue.amenities.map((amenity, i) => (
                <View key={i} style={styles.amenityItem}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>Prossimi Eventi</Text>
            {venue.upcomingEvents.map((event, index) => (
              <View key={event.id}>
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onEventPress(event.id);
                  }}
                >
                  <Card style={styles.eventCard}>
                    <View style={styles.eventDateBox}>
                      <Text style={styles.eventDay}>{event.date.getDate()}</Text>
                      <Text style={styles.eventMonth}>
                        {event.date.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventName}>{event.name}</Text>
                      <Text style={styles.eventTime}>
                        {event.date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                  </Card>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Contatti</Text>
            <Card style={styles.contactCard}>
              <Pressable style={styles.contactRow}>
                <Ionicons name="call-outline" size={20} color={colors.mutedForeground} />
                <Text style={styles.contactText}>{venue.phone}</Text>
              </Pressable>
              <View style={styles.contactDivider} />
              <Pressable style={styles.contactRow}>
                <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />
                <Text style={styles.contactText}>{venue.email}</Text>
              </Pressable>
              <View style={styles.contactDivider} />
              <Pressable style={styles.contactRow}>
                <Ionicons name="globe-outline" size={20} color={colors.mutedForeground} />
                <Text style={styles.contactText}>{venue.website}</Text>
              </Pressable>
            </Card>
          </View>
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  imageContainer: {
    height: 250,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  backButton: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    zIndex: 10,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBadges: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerInfo: {},
  venueName: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  reviewCount: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  locationSection: {
    marginBottom: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    flex: 1,
  },
  metaLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  metaValue: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    lineHeight: 24,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  infoCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  infoValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  amenitiesSection: {
    marginBottom: spacing.lg,
  },
  amenitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: '45%',
  },
  amenityText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  eventsSection: {
    marginBottom: spacing.lg,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventDateBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  eventDay: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  eventMonth: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
    marginTop: -2,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  eventTime: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  contactSection: {
    marginBottom: spacing.lg,
  },
  contactCard: {
    padding: spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  contactText: {
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  contactDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
});

export default VenueDetailScreen;
