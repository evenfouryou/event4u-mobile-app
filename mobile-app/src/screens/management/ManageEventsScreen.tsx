import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Button, Header } from '../../components';

type EventFilter = 'all' | 'active' | 'upcoming' | 'past';

interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  ticketsSold: number;
  totalTickets: number;
  revenue: string;
  status: 'live' | 'upcoming' | 'past' | 'draft';
  image?: string;
}

const filterOptions: { key: EventFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'Tutti', icon: 'apps-outline' },
  { key: 'active', label: 'Attivi', icon: 'pulse-outline' },
  { key: 'upcoming', label: 'Futuri', icon: 'calendar-outline' },
  { key: 'past', label: 'Passati', icon: 'time-outline' },
];

export function ManageEventsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<EventFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const events: Event[] = [
    {
      id: '1',
      name: 'Festival Notte d\'Estate',
      date: '14 Gen 2026',
      time: '22:00 - 04:00',
      venue: 'Arena Milano',
      ticketsSold: 450,
      totalTickets: 500,
      revenue: '€ 13.500',
      status: 'live',
    },
    {
      id: '2',
      name: 'Techno Underground',
      date: '18 Gen 2026',
      time: '23:00 - 06:00',
      venue: 'Warehouse Roma',
      ticketsSold: 320,
      totalTickets: 600,
      revenue: '€ 9.600',
      status: 'upcoming',
    },
    {
      id: '3',
      name: 'Sunset Party',
      date: '25 Gen 2026',
      time: '18:00 - 02:00',
      venue: 'Beach Club Rimini',
      ticketsSold: 180,
      totalTickets: 400,
      revenue: '€ 5.400',
      status: 'upcoming',
    },
    {
      id: '4',
      name: 'New Year\'s Eve 2026',
      date: '31 Dic 2025',
      time: '22:00 - 06:00',
      venue: 'Club XS Milano',
      ticketsSold: 800,
      totalTickets: 800,
      revenue: '€ 32.000',
      status: 'past',
    },
    {
      id: '5',
      name: 'Christmas Special',
      date: '25 Dic 2025',
      time: '21:00 - 04:00',
      venue: 'Discoteca Luna',
      ticketsSold: 350,
      totalTickets: 400,
      revenue: '€ 10.500',
      status: 'past',
    },
    {
      id: '6',
      name: 'Valentine\'s Night',
      date: '14 Feb 2026',
      time: '21:00 - 03:00',
      venue: 'Lounge Bar Roma',
      ticketsSold: 0,
      totalTickets: 200,
      revenue: '€ 0',
      status: 'draft',
    },
  ];

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'live':
        return colors.success;
      case 'upcoming':
        return colors.primary;
      case 'past':
        return colors.mutedForeground;
      case 'draft':
        return colors.warning;
    }
  };

  const getStatusLabel = (status: Event['status']) => {
    switch (status) {
      case 'live':
        return 'In Corso';
      case 'upcoming':
        return 'Prossimo';
      case 'past':
        return 'Concluso';
      case 'draft':
        return 'Bozza';
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'active' && event.status === 'live') ||
      (activeFilter === 'upcoming' && (event.status === 'upcoming' || event.status === 'draft')) ||
      (activeFilter === 'past' && event.status === 'past');

    const matchesSearch =
      searchQuery === '' ||
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleEventPress = (eventId: string) => {
    navigation.navigate('EventHub', { eventId });
  };

  const handleQuickAction = (eventId: string, action: string) => {
    switch (action) {
      case 'edit':
        navigation.navigate('EditEvent', { eventId });
        break;
      case 'tickets':
        navigation.navigate('EventHub', { eventId, tab: 'tickets' });
        break;
      case 'duplicate':
        break;
    }
  };

  const renderFilterPill = ({ item }: { item: typeof filterOptions[0] }) => (
    <TouchableOpacity
      style={[
        styles.filterPill,
        activeFilter === item.key && styles.filterPillActive,
      ]}
      onPress={() => setActiveFilter(item.key)}
      data-testid={`filter-${item.key}`}
    >
      <Ionicons
        name={item.icon as any}
        size={16}
        color={activeFilter === item.key ? colors.primaryForeground : colors.mutedForeground}
      />
      <Text
        style={[
          styles.filterPillText,
          activeFilter === item.key && styles.filterPillTextActive,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderEventCard = ({ item }: { item: Event }) => {
    const progress = (item.ticketsSold / item.totalTickets) * 100;

    return (
      <TouchableOpacity
        onPress={() => handleEventPress(item.id)}
        activeOpacity={0.8}
        data-testid={`card-event-${item.id}`}
      >
        <Card style={styles.eventCard} variant="elevated">
          <View style={styles.eventHeader}>
            <View style={styles.eventInfo}>
              <Text style={styles.eventName}>{item.name}</Text>
              <View style={styles.eventMeta}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.eventMetaText}>{item.date}</Text>
              </View>
              <View style={styles.eventMeta}>
                <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.eventMetaText}>{item.venue}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
              {item.status === 'live' && (
                <View style={[styles.liveDot, { backgroundColor: getStatusColor(item.status) }]} />
              )}
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Biglietti venduti</Text>
              <Text style={styles.progressValue}>
                {item.ticketsSold}/{item.totalTickets}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor:
                      progress >= 80
                        ? colors.success
                        : progress >= 50
                        ? colors.primary
                        : colors.warning,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.eventFooter}>
            <View style={styles.revenueInfo}>
              <Text style={styles.revenueLabel}>Incasso</Text>
              <Text style={styles.revenueValue}>{item.revenue}</Text>
            </View>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction(item.id, 'edit')}
                data-testid={`button-edit-${item.id}`}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction(item.id, 'tickets')}
                data-testid={`button-tickets-${item.id}`}
              >
                <Ionicons name="ticket-outline" size={20} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction(item.id, 'duplicate')}
                data-testid={`button-duplicate-${item.id}`}
              >
                <Ionicons name="copy-outline" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Gestione Eventi"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateEvent')}
            data-testid="button-create-event"
          >
            <Ionicons name="add" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca eventi..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="input-search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          data={filterOptions}
          renderItem={renderFilterPill}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      <FlatList
        data={filteredEvents}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.eventsList,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.muted} />
            <Text style={styles.emptyTitle}>Nessun evento trovato</Text>
            <Text style={styles.emptyText}>
              Prova a modificare i filtri o crea un nuovo evento
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 90 }]}
        onPress={() => navigation.navigate('CreateEvent')}
        activeOpacity={0.8}
        data-testid="button-fab-create"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
    paddingVertical: spacing.md,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
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
  },
  eventsList: {
    paddingHorizontal: spacing.lg,
  },
  eventCard: {
    marginBottom: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  eventMetaText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  progressValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  revenueInfo: {
    flex: 1,
  },
  revenueLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  revenueValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
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
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
