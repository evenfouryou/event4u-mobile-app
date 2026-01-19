import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Venue {
  id: string;
  name: string;
  address: string;
  thumbnail?: string;
  lastUpdated: string;
  eventCount: number;
  zoneCount: number;
  totalCapacity: number;
  hasFloorPlan: boolean;
}

export function FloorPlanHomeScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);

  const numColumns = isTablet || isLandscape ? 2 : 1;
  const cardWidth = numColumns === 2 ? (width - spacing.lg * 2 - spacing.md) / 2 : width - spacing.lg * 2;

  const loadVenues = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      
      const response = await api.get<any[]>('/api/venues');
      
      const formattedVenues: Venue[] = response.map((venue: any) => ({
        id: venue.id?.toString() || '',
        name: venue.name || 'Venue',
        address: venue.address || venue.location || '',
        thumbnail: venue.thumbnail || venue.imageUrl,
        lastUpdated: venue.updatedAt ? new Date(venue.updatedAt).toLocaleDateString('it-IT') : 'N/A',
        eventCount: venue.eventCount || 0,
        zoneCount: venue.zoneCount || 0,
        totalCapacity: venue.capacity || venue.totalCapacity || 0,
        hasFloorPlan: venue.hasFloorPlan ?? true,
      }));
      
      setVenues(formattedVenues);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento venue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVenues();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadVenues(true);
  };

  const renderVenueCard = (venue: Venue, index: number) => (
    <TouchableOpacity
      key={venue.id}
      style={[styles.venueCard, { width: cardWidth }]}
      onPress={() => navigation.navigate('FloorPlanViewer', { venueId: venue.id, venueName: venue.name })}
      activeOpacity={0.8}
      testID={`card-venue-${venue.id}`}
    >
      <Card variant="glass">
        <View style={styles.venueContent}>
          {venue.thumbnail ? (
            <Image source={{ uri: venue.thumbnail }} style={styles.venueThumbnail} testID={`image-venue-${venue.id}`} />
          ) : (
            <View style={styles.venueThumbnailPlaceholder} testID={`placeholder-venue-${venue.id}`}>
              <Ionicons name="map-outline" size={32} color={colors.mutedForeground} />
            </View>
          )}
          <View style={styles.venueInfo}>
            <Text style={styles.venueName} testID={`text-venue-name-${venue.id}`}>{venue.name}</Text>
            <View style={styles.venueMetaRow}>
              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.venueMetaText} numberOfLines={1} testID={`text-venue-address-${venue.id}`}>{venue.address}</Text>
            </View>
            <View style={styles.venueStats}>
              <View style={styles.venueStat}>
                <Ionicons name="grid-outline" size={12} color={colors.teal} />
                <Text style={styles.venueStatText} testID={`text-zone-count-${venue.id}`}>{venue.zoneCount} zone</Text>
              </View>
              <View style={styles.venueStat}>
                <Ionicons name="people-outline" size={12} color={colors.primary} />
                <Text style={styles.venueStatText} testID={`text-capacity-${venue.id}`}>{venue.totalCapacity} cap.</Text>
              </View>
              <View style={styles.venueStat}>
                <Ionicons name="calendar-outline" size={12} color={colors.accent} />
                <Text style={styles.venueStatText} testID={`text-event-count-${venue.id}`}>{venue.eventCount} eventi</Text>
              </View>
            </View>
            <View style={styles.venueFooter}>
              <Text style={styles.lastUpdated} testID={`text-updated-${venue.id}`}>Aggiornato: {venue.lastUpdated}</Text>
              {venue.hasFloorPlan && (
                <View style={styles.floorPlanBadge} testID={`badge-floorplan-${venue.id}`}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text style={styles.floorPlanBadgeText}>Planimetria</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Planimetrie" />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="loading-text">Caricamento venue...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Planimetrie" />
        <View style={styles.errorContainer} testID="error-container">
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText} testID="error-text">{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadVenues()}
            testID="button-retry"
          >
            <Ionicons name="refresh-outline" size={20} color={colors.primaryForeground} />
            <Text style={styles.retryButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Planimetrie"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('FloorPlanEditor', { mode: 'create' })}
            testID="button-add-floorplan"
          >
            <Ionicons name="add-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        testID="scroll-view-venues"
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} testID="text-section-title">Venue con Planimetria</Text>
            <Text style={styles.venueCount} testID="text-venue-count">{venues.length} venue</Text>
          </View>
          
          {venues.length > 0 ? (
            <View style={[styles.venuesGrid, numColumns === 2 && styles.venuesGridTwo]}>
              {venues.map((venue, index) => renderVenueCard(venue, index))}
            </View>
          ) : (
            <Card style={styles.emptyCard} testID="empty-state">
              <Ionicons name="map-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle} testID="empty-title">Nessuna planimetria</Text>
              <Text style={styles.emptyText} testID="empty-text">
                Aggiungi una planimetria per gestire le zone della venue
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('FloorPlanEditor', { mode: 'create' })}
                testID="button-add-first-floorplan"
              >
                <Ionicons name="add-outline" size={20} color={colors.primaryForeground} />
                <Text style={styles.addButtonText}>Aggiungi Planimetria</Text>
              </TouchableOpacity>
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} testID="text-legend-title">Legenda Stato Zone</Text>
          <Card variant="outline" testID="card-legend">
            <View style={[styles.legendContainer, isLandscape && styles.legendContainerLandscape]}>
              <View style={styles.legendItem} testID="legend-available">
                <View style={[styles.legendDot, { backgroundColor: colors.teal }]} />
                <Text style={styles.legendText}>Disponibile</Text>
              </View>
              <View style={styles.legendItem} testID="legend-reserved">
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Prenotata</Text>
              </View>
              <View style={styles.legendItem} testID="legend-sold">
                <View style={[styles.legendDot, { backgroundColor: colors.destructive }]} />
                <Text style={styles.legendText}>Venduta</Text>
              </View>
            </View>
          </Card>
        </View>
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
  },
  scrollContent: {
    paddingBottom: 100,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  venueCount: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  venuesGrid: {
    gap: spacing.md,
  },
  venuesGridTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  venueCard: {
    marginBottom: spacing.md,
  },
  venueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  venueThumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  venueThumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  venueName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  venueMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  venueMetaText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    flex: 1,
  },
  venueStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  venueStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  venueStatText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  venueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  lastUpdated: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  floorPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.success}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  floorPlanBadgeText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  addButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  legendContainerLandscape: {
    justifyContent: 'center',
    gap: spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
  },
  legendText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
});

export default FloorPlanHomeScreen;
