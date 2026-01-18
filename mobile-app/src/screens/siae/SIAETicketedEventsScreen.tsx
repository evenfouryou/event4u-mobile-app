import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface TicketedEvent {
  id: number;
  name: string;
  date: string;
  venue: string;
  ticketsSold: number;
  ticketsTotal: number;
  revenue: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

export function SIAETicketedEventsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<TicketedEvent[]>([]);

  const loadEvents = async () => {
    try {
      const response = await api.get<any>('/api/siae/ticketed-events');
      const data = response.events || response || [];
      setEvents(data);
    } catch (error) {
      console.error('Error loading ticketed events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return colors.primary;
      case 'ongoing':
        return colors.teal;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'In Arrivo';
      case 'ongoing':
        return 'In Corso';
      case 'completed':
        return 'Completato';
      case 'cancelled':
        return 'Annullato';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const renderEvent = ({ item }: { item: TicketedEvent }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => navigation.navigate('SIAEEventTickets', { eventId: item.id })}
      activeOpacity={0.8}
      data-testid={`card-event-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.eventHeader}>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.eventName}>{item.name}</Text>
        
        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>{item.venue}</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="ticket-outline" size={20} color={colors.primary} />
            <View>
              <Text style={styles.statValue}>{item.ticketsSold}/{item.ticketsTotal}</Text>
              <Text style={styles.statLabel}>Biglietti</Text>
            </View>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={20} color={colors.teal} />
            <View>
              <Text style={[styles.statValue, { color: colors.teal }]}>{formatCurrency(item.revenue)}</Text>
              <Text style={styles.statLabel}>Incasso</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(item.ticketsSold / item.ticketsTotal) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round((item.ticketsSold / item.ticketsTotal) * 100)}% venduto
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Eventi con Bigliettazione" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Eventi con Bigliettazione"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('SIAEEventAdd')} data-testid="button-add-event">
            <Ionicons name="add-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun evento configurato</Text>
            <Text style={styles.emptySubtext}>Crea un evento per iniziare la vendita biglietti</Text>
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  eventCard: {
    marginBottom: spacing.lg,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  eventDetails: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statValue: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  progressContainer: {
    gap: spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  emptyText: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  emptySubtext: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});

export default SIAETicketedEventsScreen;
