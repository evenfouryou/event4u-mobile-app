import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAEEvent } from '@/lib/api';

interface AdminSIAEConsoleScreenProps {
  onBack: () => void;
}

type StatusFilter = 'all' | 'pending' | 'transmitted' | 'approved' | 'rejected';

export function AdminSIAEConsoleScreen({ onBack }: AdminSIAEConsoleScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [events, setEvents] = useState<SIAEEvent[]>([]);

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

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAEEvents();
      setEvents(data);
    } catch (error) {
      console.error('Error loading SIAE events:', error);
      Alert.alert('Errore', 'Impossibile caricare gli eventi SIAE');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'success' | 'warning' | 'destructive' | 'default'; label: string }> = {
      pending: { variant: 'warning', label: 'In Attesa' },
      transmitted: { variant: 'default', label: 'Trasmesso' },
      approved: { variant: 'success', label: 'Approvato' },
      rejected: { variant: 'destructive', label: 'Rifiutato' },
      draft: { variant: 'default', label: 'Bozza' },
    };
    return config[status] || config.pending;
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venueName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    return matchesSearch && event.rcaStatus === activeFilter;
  });

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Tutti' },
    { key: 'pending', label: 'In Attesa' },
    { key: 'transmitted', label: 'Trasmessi' },
    { key: 'approved', label: 'Approvati' },
    { key: 'rejected', label: 'Rifiutati' },
  ];

  const renderEventCard = ({ item }: { item: SIAEEvent }) => {
    const statusConfig = getStatusBadge(item.rcaStatus);
    
    return (
      <Card style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={styles.eventInfo}>
            <Text style={[styles.eventName, { color: colors.foreground }]}>
              {item.eventName}
            </Text>
            <Text style={[styles.venue, { color: colors.mutedForeground }]}>
              {item.venueName}
            </Text>
          </View>
          <Badge variant={statusConfig.variant} size="sm">
            {statusConfig.label}
          </Badge>
        </View>

        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              {new Date(item.eventDate).toLocaleDateString('it-IT')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="ticket-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              {item.ticketCount} biglietti
            </Text>
          </View>
          {item.rcaProtocolNumber && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                Protocollo: {item.rcaProtocolNumber}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          {item.rcaTransmissionDate && (
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Trasmesso</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {new Date(item.rcaTransmissionDate).toLocaleDateString('it-IT')}
              </Text>
            </View>
          )}
          {item.rcaResponseDate && (
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Risposta</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {new Date(item.rcaResponseDate).toLocaleDateString('it-IT')}
              </Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const styles = createStyles(colors, insets);

  if (showLoader) {
    return <Loading text="Caricamento console SIAE..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Console SIAE"
        onBack={onBack}
        testID="header-admin-siae-console"
      />

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca evento..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-events"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filters}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: filter }) => (
            <Pressable
              style={[
                styles.filterChip,
                { 
                  backgroundColor: activeFilter === filter.key ? staticColors.primary : colors.card,
                  borderColor: activeFilter === filter.key ? staticColors.primary : colors.border,
                }
              ]}
              onPress={() => {
                triggerHaptic('light');
                setActiveFilter(filter.key);
              }}
              testID={`filter-${filter.key}`}
            >
              <Text style={[
                styles.filterText,
                { color: activeFilter === filter.key ? '#000000' : colors.mutedForeground }
              ]}>
                {filter.label}
              </Text>
            </Pressable>
          )}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.filterScroll}
        />
      </View>

      <GlassCard style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{events.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Totali</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: staticColors.warning }]}>
              {events.filter(e => e.rcaStatus === 'pending').length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>In Attesa</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: staticColors.teal }]}>
              {events.filter(e => e.rcaStatus === 'approved').length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Approvati</Text>
          </View>
        </View>
      </GlassCard>

      <View style={styles.statsHeader}>
        <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
          {filteredEvents.length} eventi trovati
        </Text>
      </View>

      <FlatList
        data={filteredEvents}
        renderItem={renderEventCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={staticColors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="ticket-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessun Evento</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Non ci sono eventi SIAE disponibili
            </Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  filterContainer: {
    paddingVertical: spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryCard: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
  },
  statsHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: insets.bottom + spacing.xl,
  },
  eventCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  eventInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  venue: {
    fontSize: 13,
  },
  eventDetails: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
