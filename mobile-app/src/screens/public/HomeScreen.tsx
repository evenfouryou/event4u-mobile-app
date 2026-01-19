import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  RefreshControl,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { api } from '../../lib/api';
import { EventCard } from '../../components/EventCard';
import { Button } from '../../components/Button';

interface PublicEvent {
  id: string;
  eventId: number;
  eventName: string;
  eventStart: string;
  eventEnd: string;
  eventImageUrl: string | null;
  locationName: string;
  locationAddress: string;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  minPrice: number;
  totalAvailable: number;
  ticketsSold: number;
  distance: number | null;
}

interface EventCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string;
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.get<EventCategory[]>('/api/public/event-categories');
      const allCategory: EventCategory = { id: 'all', name: 'Tutti', slug: 'all', icon: 'apps', color: colors.primary };
      setCategories([allCategory, ...(data || [])]);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<PublicEvent[]>('/api/public/events');
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Errore nel caricamento degli eventi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchCategories();
  }, [fetchEvents, fetchCategories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);

  const handleEventPress = (eventId: string) => {
    navigation.navigate('EventDetail', { eventId });
  };

  const handleSearch = () => {
    navigation.navigate('EventsList', { search: searchQuery });
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId !== 'all') {
      navigation.navigate('EventsList', { category: categoryId });
    }
  };

  const handleCartPress = () => {
    navigation.navigate('Cart');
  };

  const handleLoginPress = () => {
    navigation.navigate('Login');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredEvents = events.filter(event => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return event.eventName.toLowerCase().includes(query) ||
             event.locationName.toLowerCase().includes(query);
    }
    return true;
  });

  const todayEvents = filteredEvents.filter(event => {
    const eventDate = new Date(event.eventStart);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  });

  const upcomingEvents = filteredEvents.filter(event => {
    const eventDate = new Date(event.eventStart);
    const today = new Date();
    return eventDate > today;
  });

  const numColumns = isLandscape || isTablet ? 2 : 1;
  const contentPadding = isTablet ? spacing['2xl'] : spacing.lg;
  const heroMargin = isLandscape ? spacing.lg : spacing.xl;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={[styles.container, styles.centerContent]} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="text-loading">Caricamento eventi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.container} testID="home-screen-container">
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { 
              paddingHorizontal: contentPadding,
              paddingBottom: 100 
            }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          testID="scroll-view-home"
        >
          <View style={[styles.header, isLandscape && styles.headerLandscape]}>
            <View style={styles.logoContainer} testID="logo-container">
              <LinearGradient
                colors={[colors.primary, '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Text style={styles.logoText}>E4U</Text>
              </LinearGradient>
              <Text style={[styles.brandText, isTablet && styles.brandTextTablet]}>Event4U</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={handleCartPress}
                testID="button-cart"
              >
                <Ionicons name="cart-outline" size={24} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={handleLoginPress}
                testID="button-login"
              >
                <Ionicons name="person-outline" size={20} color={colors.primaryForeground} />
                <Text style={styles.loginButtonText}>Accedi</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.heroSection, { marginBottom: heroMargin }]}>
            <Text style={[styles.heroTitle, isTablet && styles.heroTitleTablet]} testID="text-hero-title">
              Scopri gli eventi
            </Text>
            <Text style={[styles.heroSubtitle, isTablet && styles.heroSubtitleTablet]} testID="text-hero-subtitle">
              I migliori eventi nella tua zona
            </Text>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={colors.mutedForeground} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cerca eventi, locali..."
                placeholderTextColor={colors.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                testID="input-search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  testID="button-clear-search"
                >
                  <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.categoriesSection}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
              testID="scroll-categories"
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.id && styles.categoryChipActive,
                    selectedCategory === category.id && { borderColor: category.color }
                  ]}
                  onPress={() => handleCategoryPress(category.id)}
                  testID={`button-category-${category.id}`}
                >
                  <Ionicons 
                    name={category.icon as any} 
                    size={16} 
                    color={selectedCategory === category.id ? category.color : colors.mutedForeground} 
                  />
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category.id && { color: category.color }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {todayEvents.length > 0 && (
            <View style={styles.section} testID="section-today-events">
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <View style={styles.liveDot} />
                  <Text style={styles.sectionTitle} testID="text-section-tonight">Stasera</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('EventsList', { filter: 'today' })}
                  testID="button-see-all-today"
                >
                  <Text style={styles.seeAllText}>Vedi tutti</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalEventsList}
                testID="scroll-today-events"
              >
                {todayEvents.slice(0, 5).map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.horizontalEventCard,
                      isTablet && styles.horizontalEventCardTablet
                    ]}
                    onPress={() => handleEventPress(event.id)}
                    activeOpacity={0.9}
                    testID={`card-event-today-${event.id}`}
                  >
                    <Image
                      source={event.eventImageUrl ? { uri: event.eventImageUrl } : require('../../../assets/event-placeholder.png')}
                      style={styles.horizontalEventImage}
                      defaultSource={require('../../../assets/event-placeholder.png')}
                    />
                    <LinearGradient
                      colors={['transparent', colors.overlay.dark]}
                      style={styles.eventGradient}
                    />
                    <View style={styles.todayBadge}>
                      <View style={styles.todayDot} />
                      <Text style={styles.todayText}>LIVE</Text>
                    </View>
                    <View style={styles.horizontalEventContent}>
                      <Text style={styles.horizontalEventTitle} numberOfLines={2}>{event.eventName}</Text>
                      <View style={styles.eventInfoRow}>
                        <Ionicons name="location-outline" size={12} color={colors.teal} />
                        <Text style={styles.eventInfoText} numberOfLines={1}>{event.locationName}</Text>
                      </View>
                      <Text style={styles.eventPrice} testID={`text-price-today-${event.id}`}>
                        {event.minPrice === 0 ? 'Gratuito' : `Da €${event.minPrice.toFixed(2)}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.section} testID="section-upcoming-events">
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} testID="text-section-upcoming">Prossimi Eventi</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('EventsList')}
                testID="button-see-all-upcoming"
              >
                <Text style={styles.seeAllText}>Vedi tutti</Text>
              </TouchableOpacity>
            </View>
            
            {error ? (
              <View style={styles.errorContainer} testID="error-container">
                <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
                <Text style={styles.errorText} testID="text-error">{error}</Text>
                <Button
                  title="Riprova"
                  onPress={fetchEvents}
                  variant="primary"
                  size="sm"
                  testID="button-retry"
                />
              </View>
            ) : upcomingEvents.length === 0 ? (
              <View style={styles.emptyContainer} testID="empty-container">
                <Ionicons name="calendar-outline" size={64} color={colors.mutedForeground} />
                <Text style={styles.emptyTitle} testID="text-empty-title">Nessun evento trovato</Text>
                <Text style={styles.emptyText} testID="text-empty-subtitle">Prova a cercare con altri termini</Text>
              </View>
            ) : (
              <View 
                style={[
                  styles.eventsList, 
                  numColumns === 2 && styles.eventsGrid
                ]}
                testID="events-list"
              >
                {upcomingEvents.map((event) => (
                  <View 
                    key={event.id} 
                    style={numColumns === 2 ? styles.eventGridItem : undefined}
                  >
                    <EventCard
                      id={event.id}
                      title={event.eventName}
                      date={formatDate(event.eventStart)}
                      time={formatTime(event.eventStart)}
                      location={event.locationName}
                      imageUrl={event.eventImageUrl || undefined}
                      price={event.minPrice}
                      isLive={new Date(event.eventStart).toDateString() === new Date().toDateString()}
                      onPress={() => handleEventPress(event.id)}
                      testID={`card-event-upcoming-${event.id}`}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    marginTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerLandscape: {
    marginBottom: spacing.lg,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoGradient: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: colors.primaryForeground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  brandText: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  brandTextTablet: {
    fontSize: fontSize['2xl'],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  loginButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  heroSection: {
    marginBottom: spacing.xl,
  },
  heroTitle: {
    color: colors.foreground,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  heroTitleTablet: {
    fontSize: fontSize['4xl'],
  },
  heroSubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  heroSubtitleTablet: {
    fontSize: fontSize.lg,
  },
  searchContainer: {
    marginBottom: spacing.xl,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  categoriesSection: {
    marginBottom: spacing.xl,
  },
  categoriesContainer: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  categoryChipActive: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
  },
  categoryText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  seeAllText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  horizontalEventsList: {
    gap: spacing.lg,
    paddingRight: spacing.lg,
  },
  horizontalEventCard: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  horizontalEventCardTablet: {
    width: 320,
  },
  horizontalEventImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.muted,
  },
  eventGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 100,
    height: 60,
  },
  todayBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal,
  },
  todayText: {
    color: colors.teal,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  horizontalEventContent: {
    padding: spacing.lg,
  },
  horizontalEventTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  eventInfoText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    flex: 1,
  },
  eventPrice: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: spacing.sm,
  },
  eventsList: {
    gap: spacing.md,
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  eventGridItem: {
    width: '48.5%',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.md,
  },
  errorText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.lg,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
});
