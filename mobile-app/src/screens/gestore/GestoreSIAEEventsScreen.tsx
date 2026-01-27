import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAEEvent, SIAEReportStatus } from '@/lib/api';

type FilterType = 'all' | 'pending' | 'sent' | 'error' | 'approved';

interface GestoreSIAEEventsScreenProps {
  onBack: () => void;
  onEventPress: (eventId: string) => void;
}

export function GestoreSIAEEventsScreen({ onBack, onEventPress }: GestoreSIAEEventsScreenProps) {
  const { colors } = useTheme();
  const [events, setEvents] = useState<SIAEEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<SIAEEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  useEffect(() => {
    filterEvents();
  }, [events, activeFilter]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAEEvents();
      setEvents(data);
    } catch (error) {
      console.error('Error loading SIAE events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];
    if (activeFilter !== 'all') {
      filtered = filtered.filter(event => event.rcaStatus === activeFilter);
    }
    setFilteredEvents(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const getStatusBadge = (status: SIAEReportStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'sent':
        return <Badge variant="default">Inviato</Badge>;
      case 'approved':
        return <Badge variant="success">Approvato</Badge>;
      case 'error':
        return <Badge variant="destructive">Errore</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderEvent = ({ item }: { item: SIAEEvent }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onEventPress(item.id);
      }}
    >
      <Card style={styles.eventCard} testID={`siae-event-${item.id}`}>
        <View style={styles.eventHeader}>
          <View style={styles.eventDateBox}>
            <Text style={styles.eventDay}>{new Date(item.eventDate).getDate()}</Text>
            <Text style={styles.eventMonth}>
              {new Date(item.eventDate).toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}
            </Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventName} numberOfLines={1}>{item.eventName}</Text>
            <View style={styles.eventMeta}>
              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.eventMetaText} numberOfLines={1}>{item.venueName}</Text>
            </View>
            <View style={styles.eventMeta}>
              <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.eventMetaText}>{formatTime(item.eventDate)}</Text>
            </View>
          </View>
          <View style={styles.eventActions}>
            {getStatusBadge(item.rcaStatus)}
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </View>
        </View>

        <View style={styles.eventDivider} />

        <View style={styles.eventStats}>
          <View style={styles.eventStat}>
            <Ionicons name="ticket-outline" size={16} color={staticColors.primary} />
            <Text style={styles.eventStatValue}>{item.ticketCount}</Text>
            <Text style={styles.eventStatLabel}>Biglietti</Text>
          </View>
          <View style={styles.eventStat}>
            <Ionicons name="document-text-outline" size={16} color={staticColors.teal} />
            <Text style={styles.eventStatValue}>RCA</Text>
            <Text style={styles.eventStatLabel}>
              {item.rcaTransmissionDate
                ? new Date(item.rcaTransmissionDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
                : '-'}
            </Text>
          </View>
          <View style={styles.eventStat}>
            <Ionicons name="checkmark-circle-outline" size={16} color={staticColors.success} />
            <Text style={styles.eventStatValue}>
              {item.rcaProtocolNumber ? 'OK' : '-'}
            </Text>
            <Text style={styles.eventStatLabel}>Protocollo</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'pending', label: 'In attesa' },
    { id: 'sent', label: 'Inviati' },
    { id: 'approved', label: 'Approvati' },
    { id: 'error', label: 'Errori' },
  ];

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-events"
      />

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Eventi SIAE</Text>
        <Text style={styles.subtitle}>{filteredEvents.length} eventi</Text>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                setActiveFilter(item.id);
              }}
              style={[
                styles.filterChip,
                activeFilter === item.id && styles.filterChipActive,
              ]}
              testID={`filter-${item.id}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {showLoader ? (
        <Loading text="Caricamento eventi SIAE..." />
      ) : filteredEvents.length > 0 ? (
        <FlatList
          data={filteredEvents}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessun evento trovato</Text>
          <Text style={styles.emptyText}>
            {activeFilter !== 'all'
              ? 'Prova a cambiare il filtro'
              : 'Non ci sono eventi con report SIAE'}
          </Text>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  filtersContainer: {
    paddingBottom: spacing.sm,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  filterChipTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  eventCard: {
    padding: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eventDateBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDay: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  eventMonth: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.primary,
    marginTop: -2,
  },
  eventInfo: {
    flex: 1,
    gap: 4,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    flex: 1,
  },
  eventActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  eventDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  eventStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  eventStat: {
    alignItems: 'center',
    gap: 4,
  },
  eventStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  eventStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default GestoreSIAEEventsScreen;
