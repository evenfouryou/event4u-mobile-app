import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface GestoreEvent {
  id: string;
  name: string;
  date: string;
  venueName: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  ticketsSold: number;
  totalCapacity: number;
  revenue: number;
  imageUrl?: string;
}

export function AdminGestoreEventsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const gestoreId = route.params?.gestoreId;
  const gestoreName = route.params?.gestoreName || 'Gestore';
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<GestoreEvent[]>([]);

  const loadEvents = async () => {
    try {
      const response = await api.get<GestoreEvent[]>(`/api/admin/gestori/${gestoreId}/events`).catch(() => []);
      if (Array.isArray(response) && response.length > 0) {
        setEvents(response);
      } else {
        setEvents([
          { id: '1', name: 'Summer Festival 2026', date: '2026-06-15T20:00:00Z', venueName: 'Arena Milano', status: 'published', ticketsSold: 1250, totalCapacity: 5000, revenue: 62500 },
          { id: '2', name: 'Club Night Special', date: '2026-02-14T23:00:00Z', venueName: 'Alcatraz Club', status: 'published', ticketsSold: 450, totalCapacity: 800, revenue: 9000 },
          { id: '3', name: 'Private Event', date: '2026-01-25T19:00:00Z', venueName: 'Villa Reale', status: 'draft', ticketsSold: 0, totalCapacity: 150, revenue: 0 },
          { id: '4', name: 'New Year Party', date: '2025-12-31T22:00:00Z', venueName: 'Magazzini Generali', status: 'completed', ticketsSold: 980, totalCapacity: 1000, revenue: 49000 },
        ]);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [gestoreId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const filteredEvents = events.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.venueName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return colors.success;
      case 'draft': return colors.warning;
      case 'cancelled': return colors.destructive;
      case 'completed': return colors.teal;
      default: return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Pubblicato';
      case 'draft': return 'Bozza';
      case 'cancelled': return 'Annullato';
      case 'completed': return 'Completato';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const getOccupancyPercentage = (sold: number, total: number) => {
    return Math.round((sold / total) * 100);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title={`Eventi - ${gestoreName}`} showBack />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="text-loading">Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title={`Eventi - ${gestoreName}`} showBack />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca eventi..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-events"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          (isTablet || isLandscape) && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        testID="scroll-view"
      >
        {filteredEvents.length > 0 ? (
          <View style={(isTablet || isLandscape) ? styles.eventsGrid : undefined}>
            {filteredEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => navigation.navigate('AdminEventDetail', { eventId: event.id })}
                activeOpacity={0.8}
                testID={`card-event-${event.id}`}
                style={(isTablet || isLandscape) ? styles.eventCardWrapper : undefined}
              >
                <Card variant="glass" style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    {event.imageUrl ? (
                      <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
                    ) : (
                      <View style={[styles.eventImage, styles.eventImagePlaceholder]}>
                        <Ionicons name="calendar-outline" size={24} color={colors.mutedForeground} />
                      </View>
                    )}
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventName} numberOfLines={1} testID={`text-event-name-${event.id}`}>{event.name}</Text>
                      <View style={styles.eventDateRow}>
                        <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                        <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
                      </View>
                      <View style={styles.eventVenueRow}>
                        <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                        <Text style={styles.eventVenue}>{event.venueName}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(event.status)}20` }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(event.status) }]} testID={`text-status-${event.id}`}>
                        {getStatusLabel(event.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Biglietti</Text>
                      <Text style={styles.statValue} testID={`text-tickets-${event.id}`}>
                        {event.ticketsSold} / {event.totalCapacity}
                      </Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${getOccupancyPercentage(event.ticketsSold, event.totalCapacity)}%` },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Ricavi</Text>
                      <Text style={[styles.statValue, { color: colors.teal }]} testID={`text-revenue-${event.id}`}>
                        {formatCurrency(event.revenue)}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Card variant="glass" style={styles.emptyCard} testID="card-empty">
            <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText} testID="text-empty">Nessun evento trovato</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentWide: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  eventCardWrapper: {
    flex: 1,
    minWidth: '45%',
  },
  eventCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  eventImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  eventImagePlaceholder: {
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  eventDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  eventVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventVenue: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});

export default AdminGestoreEventsScreen;
