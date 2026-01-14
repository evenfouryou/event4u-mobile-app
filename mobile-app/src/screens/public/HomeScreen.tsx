import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, EventCard, Button } from '../../components';
import { api } from '../../lib/api';

const { width } = Dimensions.get('window');

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
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

const CATEGORIES: Category[] = [
  { id: '1', name: 'Musica', icon: 'musical-notes', count: 42 },
  { id: '2', name: 'Club', icon: 'wine', count: 28 },
  { id: '3', name: 'Festival', icon: 'bonfire', count: 15 },
  { id: '4', name: 'Concerti', icon: 'mic', count: 33 },
  { id: '5', name: 'Party', icon: 'sparkles', count: 21 },
];

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const { data: featuredEvents, isLoading: loadingFeatured } = useQuery({
    queryKey: ['/api/events', 'featured'],
  });

  const { data: upcomingEvents, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['/api/events', 'upcoming'],
  });

  const handleEventPress = (eventId: string) => {
    navigation.navigate('EventDetail', { eventId });
  };

  const handleCategoryPress = (categoryId: string) => {
    navigation.navigate('Events', { categoryId });
  };

  const handleSeeAllEvents = () => {
    navigation.navigate('Events');
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => handleCategoryPress(item.id)}
      activeOpacity={0.8}
      data-testid={`button-category-${item.id}`}
    >
      <View style={styles.categoryIcon}>
        <Ionicons name={item.icon as any} size={24} color={colors.primary} />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
      <Text style={styles.categoryCount}>{item.count}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View>
          <Text style={styles.greeting}>Benvenuto</Text>
          <Text style={styles.title}>Scopri eventi</Text>
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('Events')}
          data-testid="button-search"
        >
          <Ionicons name="search" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.banner}
        activeOpacity={0.9}
        data-testid="button-banner"
      >
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800' }}
          style={styles.bannerImage}
        />
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerTag}>In Evidenza</Text>
          <Text style={styles.bannerTitle}>Weekend Festival</Text>
          <Text style={styles.bannerSubtitle}>15-17 Gennaio • Milano</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categorie</Text>
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Eventi in Evidenza</Text>
          <TouchableOpacity onPress={handleSeeAllEvents} data-testid="button-see-all-featured">
            <Text style={styles.seeAll}>Vedi tutti</Text>
          </TouchableOpacity>
        </View>
        {loadingFeatured ? (
          <View style={styles.loadingContainer}>
            {[1, 2].map((i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </View>
        ) : (
          ((featuredEvents as Event[]) || []).slice(0, 3).map((event) => (
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
          ))
        )}
        {!loadingFeatured && (!featuredEvents || (featuredEvents as Event[]).length === 0) && (
          <Card style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun evento in evidenza</Text>
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Prossimi Eventi</Text>
          <TouchableOpacity onPress={handleSeeAllEvents} data-testid="button-see-all-upcoming">
            <Text style={styles.seeAll}>Vedi tutti</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {loadingUpcoming ? (
            [1, 2, 3].map((i) => (
              <View key={i} style={styles.horizontalSkeletonCard} />
            ))
          ) : (
            ((upcomingEvents as Event[]) || []).slice(0, 5).map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.horizontalEventCard}
                onPress={() => handleEventPress(event.id)}
                activeOpacity={0.8}
                data-testid={`button-event-${event.id}`}
              >
                <Image
                  source={{ uri: event.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400' }}
                  style={styles.horizontalEventImage}
                />
                <View style={styles.horizontalEventContent}>
                  <Text style={styles.horizontalEventTitle} numberOfLines={2}>
                    {event.title}
                  </Text>
                  <Text style={styles.horizontalEventDate}>{event.date}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Card style={styles.promoCard}>
          <View style={styles.promoContent}>
            <Ionicons name="ticket" size={32} color={colors.primary} />
            <View style={styles.promoText}>
              <Text style={styles.promoTitle}>Rivendita Biglietti</Text>
              <Text style={styles.promoSubtitle}>Compra e vendi biglietti in sicurezza</Text>
            </View>
          </View>
          <Button
            title="Esplora"
            variant="outline"
            size="sm"
            onPress={() => navigation.navigate('Resales')}
          />
        </Card>
      </View>
    </ScrollView>
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
    paddingBottom: spacing.lg,
  },
  greeting: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  title: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    height: 180,
    marginBottom: spacing.lg,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  bannerTag: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  bannerTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  bannerSubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
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
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  seeAll: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  categoriesList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  categoryItem: {
    alignItems: 'center',
    width: 72,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  categoryName: {
    color: colors.foreground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  categoryCount: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  loadingContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  skeletonCard: {
    height: 240,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
  },
  horizontalScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  horizontalSkeletonCard: {
    width: 200,
    height: 200,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
  },
  horizontalEventCard: {
    width: 200,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  horizontalEventImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.muted,
  },
  horizontalEventContent: {
    padding: spacing.sm,
  },
  horizontalEventTitle: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  horizontalEventDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  promoCard: {
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  promoText: {
    flex: 1,
  },
  promoTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  promoSubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
});
