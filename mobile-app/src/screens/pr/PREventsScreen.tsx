import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header } from '../../components';

interface Event {
  id: number;
  name: string;
  date: string;
  time: string;
  venue: string;
  guestCount: number;
  tableCount: number;
  commission: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

const mockEvents: Event[] = [
  { id: 1, name: 'Notte Italiana', date: '18 Gen 2026', time: '23:00', venue: 'Club Paradiso', guestCount: 24, tableCount: 3, commission: '€120.00', status: 'upcoming' },
  { id: 2, name: 'Friday Vibes', date: '17 Gen 2026', time: '22:30', venue: 'Discoteca Luna', guestCount: 18, tableCount: 2, commission: '€90.00', status: 'ongoing' },
  { id: 3, name: 'Electronic Sunday', date: '19 Gen 2026', time: '21:00', venue: 'Space Club', guestCount: 12, tableCount: 1, commission: '€60.00', status: 'upcoming' },
  { id: 4, name: 'Retro Night', date: '10 Gen 2026', time: '22:00', venue: 'Vintage Club', guestCount: 32, tableCount: 4, commission: '€160.00', status: 'completed' },
  { id: 5, name: 'New Year Party', date: '31 Dic 2025', time: '22:00', venue: 'Grand Hall', guestCount: 48, tableCount: 6, commission: '€320.00', status: 'completed' },
];

const filterOptions = [
  { key: 'all', label: 'Tutti' },
  { key: 'upcoming', label: 'Prossimi' },
  { key: 'ongoing', label: 'In Corso' },
  { key: 'completed', label: 'Completati' },
];

export function PREventsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const filteredEvents = mockEvents.filter(event => 
    selectedFilter === 'all' || event.status === selectedFilter
  );

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'upcoming': return colors.purple;
      case 'ongoing': return colors.success;
      case 'completed': return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: Event['status']) => {
    switch (status) {
      case 'upcoming': return 'Prossimo';
      case 'ongoing': return 'In Corso';
      case 'completed': return 'Completato';
    }
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => navigation.navigate('PRGuestLists', { eventId: item.id, eventName: item.name })}
    >
      <Card style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={styles.eventImagePlaceholder}>
            <Ionicons name="calendar" size={32} color={colors.purple} />
          </View>
          <View style={styles.eventMainInfo}>
            <Text style={styles.eventName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.eventDateRow}>
              <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.eventDate}>{item.date} - {item.time}</Text>
            </View>
            <View style={styles.eventDateRow}>
              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.eventVenue} numberOfLines={1}>{item.venue}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        
        <View style={styles.eventDivider} />
        
        <View style={styles.eventStats}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={18} color={colors.purple} />
            <Text style={styles.statValue}>{item.guestCount}</Text>
            <Text style={styles.statLabel}>Ospiti</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="grid-outline" size={18} color={colors.purpleLight} />
            <Text style={styles.statValue}>{item.tableCount}</Text>
            <Text style={styles.statLabel}>Tavoli</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={18} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.success }]}>{item.commission}</Text>
            <Text style={styles.statLabel}>Commissione</Text>
          </View>
        </View>

        <View style={styles.eventActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PRGuestLists', { eventId: item.id, eventName: item.name })}
          >
            <Ionicons name="list" size={16} color={colors.purple} />
            <Text style={styles.actionText}>Lista Ospiti</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PRTables', { eventId: item.id, eventName: item.name })}
          >
            <Ionicons name="grid" size={16} color={colors.purple} />
            <Text style={styles.actionText}>Tavoli</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header 
        title="I Miei Eventi" 
        showBack 
        onBack={() => navigation.goBack()}
      />
      
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filterOptions}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterPill,
                selectedFilter === item.key && styles.filterPillActive
              ]}
              onPress={() => setSelectedFilter(item.key)}
            >
              <Text style={[
                styles.filterText,
                selectedFilter === item.key && styles.filterTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEvent}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.lg }]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.purple}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessun evento trovato</Text>
            <Text style={styles.emptySubtitle}>Non hai eventi con questo filtro</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  filterText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterTextActive: {
    color: colors.primaryForeground,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  eventCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eventImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.purple + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMainInfo: {
    flex: 1,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: 4,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  eventDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  eventVenue: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  eventDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  eventStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  eventActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.purple + '15',
  },
  actionText: {
    color: colors.purple,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});
