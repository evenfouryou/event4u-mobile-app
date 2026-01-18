import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface PREvent {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  imageUrl?: string;
  status: 'upcoming' | 'active' | 'completed';
  myGuests: number;
  myTables: number;
  totalCapacity: number;
  commissionRate: number;
  estimatedEarnings: number;
}

type FilterStatus = 'all' | 'upcoming' | 'active' | 'completed';

export function PRMyEventsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const { data: events = [], refetch } = useQuery<PREvent[]>({
    queryKey: ['/api/pr/my-events'],
    queryFn: () =>
      api.get<PREvent[]>('/api/pr/my-events').catch(() => [
        {
          id: '1',
          name: 'Notte Italiana',
          date: '2025-01-18',
          time: '23:00 - 05:00',
          venue: 'Club Paradiso',
          address: 'Via Roma 123, Milano',
          status: 'upcoming',
          myGuests: 24,
          myTables: 3,
          totalCapacity: 500,
          commissionRate: 5,
          estimatedEarnings: 120.0,
        },
        {
          id: '2',
          name: 'Friday Vibes',
          date: '2025-01-17',
          time: '22:30 - 04:00',
          venue: 'Discoteca Luna',
          address: 'Corso Vittorio 45, Milano',
          status: 'active',
          myGuests: 18,
          myTables: 2,
          totalCapacity: 400,
          commissionRate: 5,
          estimatedEarnings: 90.0,
        },
        {
          id: '3',
          name: 'Electronic Sunday',
          date: '2025-01-19',
          time: '21:00 - 03:00',
          venue: 'Space Club',
          address: 'Via Dante 78, Milano',
          status: 'upcoming',
          myGuests: 12,
          myTables: 1,
          totalCapacity: 300,
          commissionRate: 6,
          estimatedEarnings: 72.0,
        },
        {
          id: '4',
          name: 'New Year Party',
          date: '2024-12-31',
          time: '22:00 - 06:00',
          venue: 'Grand Club',
          address: 'Piazza Duomo 1, Milano',
          status: 'completed',
          myGuests: 45,
          myTables: 5,
          totalCapacity: 800,
          commissionRate: 8,
          estimatedEarnings: 360.0,
        },
      ]),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredEvents = events.filter((event) => {
    return filterStatus === 'all' || event.status === filterStatus;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    };
    return date.toLocaleDateString('it-IT', options);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return colors.accent;
      case 'active':
        return colors.success;
      case 'completed':
        return colors.mutedForeground;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'In Arrivo';
      case 'active':
        return 'In Corso';
      case 'completed':
        return 'Completato';
      default:
        return status;
    }
  };

  const filterOptions: { value: FilterStatus; label: string; count: number }[] = [
    { value: 'all', label: 'Tutti', count: events.length },
    { value: 'upcoming', label: 'In Arrivo', count: events.filter((e) => e.status === 'upcoming').length },
    { value: 'active', label: 'Attivi', count: events.filter((e) => e.status === 'active').length },
    { value: 'completed', label: 'Completati', count: events.filter((e) => e.status === 'completed').length },
  ];

  const handleEventPress = (event: PREvent) => {
    navigation.navigate('PRGuestLists', { eventId: event.id });
  };

  return (
    <View style={styles.container}>
      <Header title="I Miei Eventi" showBack />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterPill, filterStatus === option.value && styles.filterPillActive]}
              onPress={() => setFilterStatus(option.value)}
              data-testid={`filter-${option.value}`}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterStatus === option.value && styles.filterPillTextActive,
                ]}
              >
                {option.label}
              </Text>
              <View
                style={[
                  styles.filterCount,
                  filterStatus === option.value && styles.filterCountActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterCountText,
                    filterStatus === option.value && styles.filterCountTextActive,
                  ]}
                >
                  {option.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredEvents.length === 0 ? (
          <Card variant="glass" style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessun evento trovato</Text>
            <Text style={styles.emptySubtitle}>
              Non hai eventi {filterStatus !== 'all' ? getStatusLabel(filterStatus).toLowerCase() : ''}
            </Text>
          </Card>
        ) : (
          <View style={styles.eventsList}>
            {filteredEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => handleEventPress(event)}
                activeOpacity={0.8}
                data-testid={`event-item-${event.id}`}
              >
                <Card variant="glass" style={styles.eventCard}>
                  <View style={styles.eventImageContainer}>
                    {event.imageUrl ? (
                      <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
                    ) : (
                      <View style={styles.eventImagePlaceholder}>
                        <Ionicons name="calendar" size={40} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.eventOverlay}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
                        <Text style={styles.statusBadgeText}>{getStatusLabel(event.status)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.eventContent}>
                    <Text style={styles.eventName}>{event.name}</Text>
                    
                    <View style={styles.eventDetails}>
                      <View style={styles.eventDetailRow}>
                        <Ionicons name="calendar-outline" size={16} color={colors.accent} />
                        <Text style={styles.eventDetailText}>{formatDate(event.date)}</Text>
                      </View>
                      <View style={styles.eventDetailRow}>
                        <Ionicons name="time-outline" size={16} color={colors.accent} />
                        <Text style={styles.eventDetailText}>{event.time}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.eventDetailRow}>
                      <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
                      <Text style={styles.eventVenue} numberOfLines={1}>{event.venue}</Text>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.stat}>
                        <Ionicons name="people" size={18} color={colors.primary} />
                        <Text style={styles.statValue}>{event.myGuests}</Text>
                        <Text style={styles.statLabel}>ospiti</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.stat}>
                        <Ionicons name="grid" size={18} color={colors.accent} />
                        <Text style={styles.statValue}>{event.myTables}</Text>
                        <Text style={styles.statLabel}>tavoli</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.stat}>
                        <Ionicons name="cash" size={18} color={colors.success} />
                        <Text style={[styles.statValue, { color: colors.success }]}>
                          € {event.estimatedEarnings.toFixed(0)}
                        </Text>
                        <Text style={styles.statLabel}>stima</Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  filtersContainer: {
    marginBottom: spacing.lg,
  },
  filtersContent: {
    gap: spacing.md,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.xl,
    paddingRight: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
    fontWeight: fontWeight.semibold,
  },
  filterCount: {
    backgroundColor: colors.borderSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  filterCountActive: {
    backgroundColor: colors.primaryForeground + '30',
  },
  filterCountText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  filterCountTextActive: {
    color: colors.primaryForeground,
  },
  eventsList: {
    gap: spacing.lg,
  },
  eventCard: {
    padding: 0,
    overflow: 'hidden',
  },
  eventImageContainer: {
    height: 140,
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventOverlay: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    color: colors.primaryForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  eventContent: {
    padding: spacing.lg,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  eventDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  eventDetailText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  eventVenue: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderSubtle,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  emptyCard: {
    padding: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptySubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
