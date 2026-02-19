import { View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions, ActivityIndicator, RefreshControl, Animated } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Badge, LiveBadge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { SkeletonEventCard } from '@/components/Loading';
import { triggerHaptic } from '@/lib/haptics';
import api, { PublicEvent, PublicVenue } from '@/lib/api';
import { getCurrentLocation, UserLocation } from '@/lib/location';

const { width } = Dimensions.get('window');
const STORY_SIZE = 72;
const STORY_RING_SIZE = 78;

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function formatEventTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

interface LandingScreenProps {
  onNavigateEvents: () => void;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onNavigateVenues: () => void;
  onNavigateResales: () => void;
  onNavigateAccount: () => void;
  onNavigateEventDetail?: (eventId: string) => void;
  isAuthenticated: boolean;
}

const categories = [
  { id: 'all', name: 'Tutti', icon: 'apps' as const, color: staticColors.primary },
  { id: 'club', name: 'Club', icon: 'musical-notes' as const, color: '#8B5CF6' },
  { id: 'concerti', name: 'Concerti', icon: 'mic' as const, color: staticColors.teal },
  { id: 'festival', name: 'Festival', icon: 'people' as const, color: '#E91E63' },
  { id: 'aperitivi', name: 'Aperitivi', icon: 'wine' as const, color: '#FF9800' },
  { id: 'sport', name: 'Sport', icon: 'football' as const, color: '#4CAF50' },
  { id: 'teatro', name: 'Teatro', icon: 'easel' as const, color: '#9C27B0' },
  { id: 'privati', name: 'Privati', icon: 'lock-closed' as const, color: '#607D8B' },
];

const cities = [
  { id: 'all', name: 'Tutte le città' },
  { id: 'milano', name: 'Milano' },
  { id: 'roma', name: 'Roma' },
  { id: 'napoli', name: 'Napoli' },
  { id: 'firenze', name: 'Firenze' },
  { id: 'torino', name: 'Torino' },
  { id: 'bologna', name: 'Bologna' },
  { id: 'palermo', name: 'Palermo' },
];

export function LandingScreen({
  onNavigateEvents,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateVenues,
  onNavigateResales,
  onNavigateAccount,
  onNavigateEventDetail,
  isAuthenticated,
}: LandingScreenProps) {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [featuredEvent, setFeaturedEvent] = useState<PublicEvent | null>(null);
  const [nearbyEvents, setNearbyEvents] = useState<PublicEvent[]>([]);
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');

  const heroAnim = useRef(new Animated.Value(0)).current;
  const storyAnims = useRef(categories.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    loadAllData();
    animateEntrance();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [selectedCity]);

  const animateEntrance = () => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    storyAnims.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 100 + index * 60,
        useNativeDriver: true,
      }).start();
    });
  };

  const loadAllData = async () => {
    await Promise.all([loadEvents(), loadLocationAndNearbyEvents(), loadVenues()]);
  };

  const loadVenues = async () => {
    try {
      const data = await api.getPublicVenues({ limit: 6 });
      setVenues(data);
    } catch (error) {
      console.error('Error loading venues:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, []);

  const loadLocationAndNearbyEvents = async () => {
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      if (location) {
        setUserLocation(location);
        const nearbyData = await api.getPublicEvents({
          limit: 10,
          userLat: location.latitude,
          userLng: location.longitude,
        });
        setNearbyEvents(nearbyData);
      }
    } catch (error) {
      console.error('Error loading nearby events:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      setShowSkeleton(true);
      const data = await api.getPublicEvents({ limit: 12 });
      const filtered = selectedCity === 'all'
        ? data
        : data.filter((e) => {
            const city = (e.locationName || '').toLowerCase();
            return city.includes(selectedCity.toLowerCase());
          });
      if (filtered.length > 0) {
        setFeaturedEvent(filtered[0]);
        setEvents(filtered.slice(1));
      } else {
        setFeaturedEvent(null);
        setEvents([]);
      }
      setShowSkeleton(false);
    } catch (error) {
      console.error('Error loading events:', error);
      setShowSkeleton(false);
    }
  };

  const handleEventPress = (eventId: string) => {
    triggerHaptic('light');
    if (onNavigateEventDetail) {
      onNavigateEventDetail(eventId);
    } else {
      onNavigateEvents();
    }
  };

  const renderStories = () => (
    <View style={styles.storiesSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesScroll}
      >
        {(nearbyEvents.length > 0 ? nearbyEvents : events).slice(0, 8).map((event, index) => (
          <Animated.View
            key={`story-${event.id}`}
            style={{
              opacity: storyAnims[Math.min(index, storyAnims.length - 1)],
              transform: [{
                scale: storyAnims[Math.min(index, storyAnims.length - 1)].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              }],
            }}
          >
            <Pressable
              style={styles.storyItem}
              onPress={() => handleEventPress(String(event.id))}
              testID={`story-event-${event.id}`}
            >
              <LinearGradient
                colors={['#FFD700', '#FF8C00', '#00CED1']}
                style={styles.storyRing}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.storyImageContainer}>
                  <Image
                    source={{ uri: event.eventImageUrl || 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e8?w=200' }}
                    style={styles.storyImage}
                  />
                </View>
              </LinearGradient>
              <Text style={styles.storyLabel} numberOfLines={1}>
                {event.eventName?.split(' ')[0] || 'Evento'}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );

  const renderSearchBar = () => (
    <Pressable
      style={styles.searchBar}
      onPress={() => {
        triggerHaptic('light');
        onNavigateEvents();
      }}
      testID="button-search-bar"
    >
      <Ionicons name="search" size={20} color={staticColors.mutedForeground} />
      <Text style={styles.searchPlaceholder}>Cerca eventi, locali, artisti...</Text>
      <View style={styles.searchFilterButton}>
        <Ionicons name="options" size={18} color={staticColors.primary} />
      </View>
    </Pressable>
  );

  const renderCityFilter = () => (
    <View style={styles.cityFilterSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cityFilterScroll}
      >
        {cities.map((city) => {
          const isActive = selectedCity === city.id;
          return (
            <Pressable
              key={city.id}
              style={[
                styles.cityChip,
                isActive && styles.cityChipActive,
              ]}
              onPress={() => {
                triggerHaptic('light');
                setSelectedCity(city.id);
              }}
              testID={`city-filter-${city.id}`}
            >
              {city.id !== 'all' && (
                <Ionicons
                  name="location"
                  size={12}
                  color={isActive ? '#000' : staticColors.mutedForeground}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[
                styles.cityChipText,
                isActive && styles.cityChipTextActive,
              ]}>
                {city.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderCategories = () => (
    <View style={styles.categoriesSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={styles.categoryItem}
              onPress={() => {
                triggerHaptic('light');
                setSelectedCategory(cat.id);
                onNavigateEvents();
              }}
              testID={`category-${cat.id}`}
            >
              <View style={[
                styles.categoryIcon,
                { backgroundColor: isActive ? `${cat.color}30` : `${cat.color}15` },
                isActive && { borderWidth: 2, borderColor: cat.color },
              ]}>
                <Ionicons name={cat.icon} size={26} color={cat.color} />
              </View>
              <Text style={[
                styles.categoryName,
                isActive && { color: cat.color, fontWeight: '700' },
              ]}>
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderFeaturedEvent = () => {
    if (!featuredEvent) return null;
    return (
      <View style={styles.featuredSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="star" size={18} color={staticColors.primary} />
            <Text style={styles.sectionTitle}>In Evidenza</Text>
          </View>
        </View>
        <Pressable
          style={styles.featuredCard}
          onPress={() => handleEventPress(String(featuredEvent.id))}
          testID={`featured-event-${featuredEvent.id}`}
        >
          <Image
            source={{ uri: featuredEvent.eventImageUrl || 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e8?w=800' }}
            style={styles.featuredImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={styles.featuredGradient}
          >
            <View style={styles.featuredBadges}>
              <LiveBadge testID="badge-featured-live" />
              <Badge variant="golden" size="sm">{formatEventDate(featuredEvent.eventStart)}</Badge>
            </View>
            <Text style={styles.featuredName} numberOfLines={2}>
              {featuredEvent.eventName}
            </Text>
            <View style={styles.featuredDetails}>
              <View style={styles.featuredInfo}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.featuredVenue} numberOfLines={1}>
                  {featuredEvent.locationName}
                </Text>
              </View>
              <View style={styles.featuredInfo}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.featuredVenue}>
                  {formatEventTime(featuredEvent.eventStart)}
                </Text>
              </View>
            </View>
            <View style={styles.featuredFooter}>
              <Text style={styles.featuredPrice}>
                {`da €${(featuredEvent.minPrice || 0).toFixed(2)}`}
              </Text>
              <View style={styles.featuredCTA}>
                <Text style={styles.featuredCTAText}>Acquista</Text>
                <Ionicons name="arrow-forward" size={16} color="#000" />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  const renderNearbyEvents = () => {
    if (!userLocation && !locationLoading) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="location" size={18} color={staticColors.teal} />
            <Text style={styles.sectionTitle}>Vicino a Te</Text>
          </View>
          {nearbyEvents.length > 3 && (
            <Pressable onPress={onNavigateEvents} testID="link-see-all-nearby">
              <Text style={styles.seeAll}>Vedi tutti</Text>
            </Pressable>
          )}
        </View>

        {locationLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={staticColors.teal} />
            <Text style={styles.loadingText}>Ricerca eventi vicini...</Text>
          </View>
        ) : nearbyEvents.length === 0 ? (
          <View style={styles.emptyRow}>
            <Ionicons name="location-outline" size={28} color={staticColors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun evento trovato nella tua zona</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventsScroll}
          >
            {nearbyEvents.slice(0, 6).map((event) => (
              <Pressable
                key={`nearby-${event.id}`}
                style={styles.eventCard}
                onPress={() => handleEventPress(String(event.id))}
                testID={`nearby-event-card-${event.id}`}
              >
                <Image
                  source={{ uri: event.eventImageUrl || 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e8?w=400' }}
                  style={styles.eventImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.9)']}
                  style={styles.eventGradient}
                >
                  <Badge variant="teal" size="sm">
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="location" size={10} color="#fff" style={{ marginRight: 3 }} />
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{formatEventDate(event.eventStart)}</Text>
                    </View>
                  </Badge>
                  <Text style={styles.eventName} numberOfLines={2}>{event.eventName}</Text>
                  <View style={styles.eventInfo}>
                    <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.eventVenue} numberOfLines={1}>{event.locationName}</Text>
                  </View>
                  <View style={styles.eventFooter}>
                    <Text style={styles.eventTime}>{formatEventTime(event.eventStart)}</Text>
                    <Text style={styles.eventPrice}>
                      {`€${(event.minPrice || 0).toFixed(2)}`}
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderUpcomingEvents = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="flame" size={18} color="#F59E0B" />
          <Text style={styles.sectionTitle}>Eventi in Arrivo</Text>
        </View>
        <Pressable onPress={onNavigateEvents} testID="link-see-all-upcoming">
          <Text style={styles.seeAll}>Vedi tutti</Text>
        </Pressable>
      </View>

      {showSkeleton ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScroll}>
          {[1, 2, 3].map((i) => <SkeletonEventCard key={i} />)}
        </ScrollView>
      ) : events.length === 0 ? (
        <View style={styles.emptyRow}>
          <Ionicons name="calendar-outline" size={28} color={staticColors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun evento disponibile</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.eventsScroll}
        >
          {events.map((event) => (
            <Pressable
              key={event.id}
              style={styles.eventCard}
              onPress={() => handleEventPress(String(event.id))}
              testID={`event-card-${event.id}`}
            >
              <Image
                source={{ uri: event.eventImageUrl || 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e8?w=400' }}
                style={styles.eventImage}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.9)']}
                style={styles.eventGradient}
              >
                <Badge variant="golden" size="sm">{formatEventDate(event.eventStart)}</Badge>
                <Text style={styles.eventName} numberOfLines={2}>{event.eventName}</Text>
                <View style={styles.eventInfo}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.eventVenue} numberOfLines={1}>{event.locationName}</Text>
                </View>
                <View style={styles.eventFooter}>
                  <Text style={styles.eventTime}>{formatEventTime(event.eventStart)}</Text>
                  <Text style={styles.eventPrice}>
                    {`€${(event.minPrice || 0).toFixed(2)}`}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderVenuesPreview = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="business" size={18} color={staticColors.purple} />
          <Text style={styles.sectionTitle}>Locali</Text>
        </View>
        <Pressable onPress={onNavigateVenues} testID="link-see-all-venues">
          <Text style={styles.seeAll}>Vedi tutti</Text>
        </Pressable>
      </View>

      {venues.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.venuesScroll}
        >
          {venues.map((venue) => (
            <Pressable
              key={venue.id}
              style={styles.venueCard}
              onPress={() => {
                triggerHaptic('light');
                onNavigateVenues();
              }}
              testID={`card-venue-${venue.id}`}
            >
              {venue.heroImageUrl ? (
                <Image source={{ uri: venue.heroImageUrl }} style={styles.venueImage} />
              ) : (
                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.25)', 'rgba(0, 206, 209, 0.15)']}
                  style={styles.venueImage}
                >
                  <Ionicons name="business" size={28} color={staticColors.purple} />
                </LinearGradient>
              )}
              <View style={styles.venueInfo}>
                <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
                {venue.city && (
                  <View style={styles.venueLocationRow}>
                    <Ionicons name="location-outline" size={12} color={staticColors.mutedForeground} />
                    <Text style={styles.venueCity} numberOfLines={1}>{venue.city}</Text>
                  </View>
                )}
                {venue.eventCount > 0 && (
                  <Text style={styles.venueEvents}>
                    {venue.eventCount} {venue.eventCount === 1 ? 'evento' : 'eventi'}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Pressable
          style={styles.venuesBanner}
          onPress={() => {
            triggerHaptic('light');
            onNavigateVenues();
          }}
          testID="button-explore-venues"
        >
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.2)', 'rgba(0, 206, 209, 0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.venuesBannerGradient}
          >
            <View style={styles.venuesBannerContent}>
              <View style={styles.venuesBannerLeft}>
                <Text style={styles.venuesBannerTitle}>Scopri i Locali</Text>
                <Text style={styles.venuesBannerSubtitle}>
                  Esplora le migliori venue della tua città
                </Text>
              </View>
              <View style={styles.venuesBannerIcon}>
                <Ionicons name="map" size={36} color={staticColors.purple} />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );

  const renderJoinBanner = () => {
    if (isAuthenticated) return null;
    return (
      <View style={styles.joinSection}>
        <Pressable
          style={styles.joinBanner}
          onPress={onNavigateRegister}
          testID="button-join-banner"
        >
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.10)', 'rgba(0, 206, 209, 0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.joinGradient}
          >
            <View style={styles.joinLeft}>
              <View style={styles.joinIconCircle}>
                <Ionicons name="sparkles" size={18} color={staticColors.primary} />
              </View>
              <View style={styles.joinTextContainer}>
                <Text style={styles.joinTitle}>Unisciti a Event Four You</Text>
                <Text style={styles.joinSubtitle}>Biglietti, offerte esclusive e altro</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={staticColors.primary} />
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeArea style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={staticColors.primary}
            colors={[staticColors.primary]}
          />
        }
      >
        <View style={styles.glowContainer}>
          <View style={styles.glowGolden} />
          <View style={styles.glowTeal} />
        </View>

        <Animated.View style={[styles.header, { opacity: heroAnim }]}>
          <Image
            source={require('../../../assets/logo.png')}
            style={[styles.logo, { tintColor: '#FFFFFF' }]}
            resizeMode="contain"
          />
          <View style={styles.headerActions}>
            {isAuthenticated ? (
              <Pressable
                style={styles.profileButton}
                onPress={onNavigateAccount}
                testID="button-account-header"
              >
                <Ionicons name="person-circle" size={32} color={staticColors.primary} />
              </Pressable>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onPress={onNavigateLogin}
                testID="button-login"
              >
                Accedi
              </Button>
            )}
          </View>
        </Animated.View>

        {renderStories()}
        {renderSearchBar()}
        {renderCityFilter()}
        {renderCategories()}
        {renderFeaturedEvent()}
        {renderNearbyEvents()}
        {renderUpcomingEvents()}
        {renderVenuesPreview()}
        {renderJoinBanner()}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Event Four You</Text>
          <Text style={styles.footerCopy}>2026 Tutti i diritti riservati</Text>
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    overflow: 'hidden',
  },
  glowGolden: {
    position: 'absolute',
    top: -150,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: staticColors.primary,
    opacity: 0.1,
  },
  glowTeal: {
    position: 'absolute',
    top: 200,
    left: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: staticColors.teal,
    opacity: 0.06,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  logo: {
    width: 130,
    height: 44,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  profileButton: {
    padding: 4,
  },

  storiesSection: {
    marginBottom: spacing.md,
  },
  storiesScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  storyItem: {
    alignItems: 'center',
    width: STORY_SIZE + 8,
  },
  storyRing: {
    width: STORY_RING_SIZE,
    height: STORY_RING_SIZE,
    borderRadius: STORY_RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  storyImageContainer: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: staticColors.background,
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: staticColors.foreground,
    marginTop: 4,
    textAlign: 'center',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: staticColors.border,
    gap: spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
  },
  searchFilterButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cityFilterSection: {
    marginBottom: spacing.md,
  },
  cityFilterScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  cityChipActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  cityChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  cityChipTextActive: {
    color: '#000',
    fontWeight: '700',
  },

  categoriesSection: {
    marginBottom: spacing.lg,
  },
  categoriesScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  categoryItem: {
    alignItems: 'center',
    width: 72,
  },
  categoryIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: staticColors.foreground,
    textAlign: 'center',
  },

  featuredSection: {
    marginBottom: spacing.lg,
  },
  featuredCard: {
    marginHorizontal: spacing.lg,
    height: 280,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  featuredBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  featuredName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  featuredDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  featuredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredVenue: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredPrice: {
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    color: staticColors.primary,
  },
  featuredCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  featuredCTAText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: '#000',
  },

  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  seeAll: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    fontWeight: '600',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  emptyRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },

  eventsScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  eventCard: {
    width: width * 0.65,
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingTop: spacing.xl,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
    marginBottom: 4,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  eventVenue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  eventPrice: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.primary,
  },

  venuesScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  venueCard: {
    width: 150,
    borderRadius: borderRadius.lg,
    backgroundColor: staticColors.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  venueImage: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${staticColors.purple}10`,
  },
  venueInfo: {
    padding: spacing.sm,
    gap: 3,
  },
  venueName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  venueLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  venueCity: {
    fontSize: 11,
    color: staticColors.mutedForeground,
    flex: 1,
  },
  venueEvents: {
    fontSize: 11,
    color: staticColors.primary,
    fontWeight: '500',
  },
  venuesBanner: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  venuesBannerGradient: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  venuesBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  venuesBannerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  venuesBannerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: 4,
  },
  venuesBannerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  venuesBannerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  joinSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  joinBanner: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  joinGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: `${staticColors.primary}20`,
    borderRadius: borderRadius.lg,
  },
  joinLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  joinIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinTextContainer: {
    flex: 1,
  },
  joinTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  joinSubtitle: {
    fontSize: 12,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },

  footer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  footerBrand: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: 4,
  },
  footerCopy: {
    fontSize: 12,
    color: staticColors.mutedForeground,
  },
});
