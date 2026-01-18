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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Ticket {
  id: number;
  ticketNumber: string;
  ticketType: string;
  holderName: string;
  holderFiscalCode: string;
  price: number;
  status: 'valid' | 'used' | 'cancelled' | 'refunded';
  purchasedAt: string;
  usedAt: string | null;
}

export function SIAETicketsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  
  const eventId = route.params?.eventId;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [eventName, setEventName] = useState('');

  const loadTickets = async () => {
    try {
      const endpoint = eventId 
        ? `/api/siae/events/${eventId}/tickets`
        : '/api/siae/tickets';
      const response = await api.get<any>(endpoint);
      const data = response.tickets || response || [];
      setTickets(data);
      if (response.eventName) {
        setEventName(response.eventName);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [eventId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return colors.success;
      case 'used':
        return colors.teal;
      case 'cancelled':
        return colors.destructive;
      case 'refunded':
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'valid':
        return 'Valido';
      case 'used':
        return 'Utilizzato';
      case 'cancelled':
        return 'Annullato';
      case 'refunded':
        return 'Rimborsato';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const renderTicket = ({ item }: { item: Ticket }) => (
    <TouchableOpacity
      style={styles.ticketCard}
      onPress={() => navigation.navigate('SIAETicketDetail', { ticketId: item.id })}
      activeOpacity={0.8}
      data-testid={`card-ticket-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.ticketRow}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
          <View style={styles.ticketInfo}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketNumber}>{item.ticketNumber}</Text>
              <View style={[styles.typeBadge, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={styles.typeText}>{item.ticketType}</Text>
              </View>
            </View>
            
            <Text style={styles.holderName}>{item.holderName}</Text>
            <Text style={styles.fiscalCode}>{item.holderFiscalCode}</Text>
            
            <View style={styles.ticketFooter}>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
              <Text style={styles.price}>{formatCurrency(item.price)}</Text>
            </View>
            
            <Text style={styles.purchaseDate}>Acquistato: {formatDate(item.purchasedAt)}</Text>
            {item.usedAt && (
              <Text style={styles.usedDate}>Utilizzato: {formatDate(item.usedAt)}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header 
          title={eventName || 'Lista Biglietti'} 
          showBack 
          onBack={() => navigation.goBack()} 
        />
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
        title={eventName || 'Lista Biglietti'}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          eventId ? (
            <TouchableOpacity 
              onPress={() => navigation.navigate('SIAETicketAdd', { eventId })} 
              data-testid="button-add-ticket"
            >
              <Ionicons name="add-outline" size={24} color={colors.foreground} />
            </TouchableOpacity>
          ) : undefined
        }
      />
      
      <FlatList
        data={tickets}
        renderItem={renderTicket}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun biglietto emesso</Text>
            <Text style={styles.emptySubtext}>I biglietti venduti appariranno qui</Text>
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
  ticketCard: {
    marginBottom: spacing.md,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 4,
    height: '100%',
    minHeight: 100,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  ticketNumber: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  typeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  typeText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  holderName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  fiscalCode: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  price: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  purchaseDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  usedDate: {
    color: colors.teal,
    fontSize: fontSize.xs,
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

export default SIAETicketsScreen;
