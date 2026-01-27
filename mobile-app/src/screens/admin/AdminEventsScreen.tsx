import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { AdminEvent } from '@/lib/api';

interface AdminEventsScreenProps {
  onBack: () => void;
  onEventPress: (eventId: string) => void;
}

export function AdminEventsScreen({ onBack, onEventPress }: AdminEventsScreenProps) {
  const { colors } = useTheme();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      const data = await api.getAdminEvents();
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.gestoreName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attivo</Badge>;
      case 'upcoming':
        return <Badge variant="default">Prossimo</Badge>;
      case 'past':
        return <Badge variant="secondary">Passato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderEvent = ({ item }: { item: AdminEvent }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onEventPress(item.id);
      }}
    >
      <Card style={styles.eventCard} testID={`event-${item.id}`}>
        <View style={styles.eventHeader}>
          <View style={styles.eventDateBox}>
            <Text style={styles.eventDay}>{new Date(item.startDate).getDate()}</Text>
            <Text style={styles.eventMonth}>
              {new Date(item.startDate).toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}
            </Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.eventMeta}>
              <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.eventMetaText}>{item.gestoreName || '-'}</Text>
            </View>
            <View style={styles.eventMeta}>
              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.eventMetaText}>{item.location || '-'}</Text>
            </View>
          </View>
          <View style={styles.eventActions}>
            {getStatusBadge(item.status)}
          </View>
        </View>

        <View style={styles.eventDivider} />

        <View style={styles.eventStats}>
          <View style={styles.eventStat}>
            <Text style={styles.eventStatValue}>{item.ticketsSold || 0}</Text>
            <Text style={styles.eventStatLabel}>Biglietti</Text>
          </View>
          <View style={styles.eventStat}>
            <Text style={styles.eventStatValue}>€{(item.revenue || 0).toFixed(0)}</Text>
            <Text style={styles.eventStatLabel}>Incasso</Text>
          </View>
          <View style={styles.eventStat}>
            <Text style={styles.eventStatValue}>{item.capacity || '-'}</Text>
            <Text style={styles.eventStatLabel}>Capacità</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-events"
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca eventi..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {showLoader ? (
        <Loading text="Caricamento eventi..." />
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
          <Ionicons name="calendar-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessun evento trovato</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'Prova con una ricerca diversa' : 'Gli eventi appariranno qui'}
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
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
  },
  eventStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  eventStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
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

export default AdminEventsScreen;
