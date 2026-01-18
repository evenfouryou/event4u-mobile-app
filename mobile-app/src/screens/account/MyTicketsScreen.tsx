import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Header } from '../../components/Header';
import { TicketCard } from '../../components/TicketCard';
import { Card } from '../../components/Card';
import { api } from '../../lib/api';

interface Ticket {
  id: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  ticketType: string;
  ticketCode: string;
  status: 'valid' | 'used' | 'cancelled';
}

interface Subscription {
  id: number;
  name: string;
  eventName: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  eventsIncluded: number;
  eventsUsed: number;
}

type FilterType = 'all' | 'valid' | 'used' | 'cancelled';
type TabType = 'tickets' | 'subscriptions';

export function MyTicketsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState<TabType>('tickets');

  const { data: ticketsData, isLoading: ticketsLoading, refetch: refetchTickets, isRefetching: isRefetchingTickets } = useQuery({
    queryKey: ['/api/public/account/tickets'],
    queryFn: () => api.get<{ tickets: Ticket[] }>('/api/public/account/tickets'),
  });
  
  const tickets = ticketsData?.tickets || (Array.isArray(ticketsData) ? ticketsData : []);

  const { data: subscriptionsData, isLoading: subscriptionsLoading, refetch: refetchSubscriptions, isRefetching: isRefetchingSubscriptions } = useQuery({
    queryKey: ['/api/public/account/subscriptions'],
    queryFn: () => api.get<{ upcoming: Subscription[]; past: Subscription[] }>('/api/public/account/subscriptions'),
  });
  
  const subscriptions = [...(subscriptionsData?.upcoming || []), ...(subscriptionsData?.past || [])];

  const filteredTickets = tickets?.filter(ticket => {
    if (filter === 'all') return true;
    return ticket.status === filter;
  }) || [];

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Tutti' },
    { key: 'valid', label: 'Validi' },
    { key: 'used', label: 'Usati' },
    { key: 'cancelled', label: 'Annullati' },
  ];

  const tabs: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'tickets', label: 'Biglietti', icon: 'ticket-outline' },
    { key: 'subscriptions', label: 'Abbonamenti', icon: 'card-outline' },
  ];

  const handleRefresh = () => {
    if (activeTab === 'tickets') {
      refetchTickets();
    } else {
      refetchSubscriptions();
    }
  };

  const renderTicket = ({ item }: { item: Ticket }) => (
    <TicketCard
      id={item.id}
      eventTitle={item.eventTitle}
      date={item.eventDate}
      time={item.eventTime}
      location={item.eventLocation}
      ticketType={item.ticketType}
      ticketCode={item.ticketCode}
      status={item.status}
      onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
    />
  );

  const renderSubscription = ({ item }: { item: Subscription }) => (
    <Card style={styles.subscriptionCard}>
      <View style={styles.subscriptionHeader}>
        <View style={styles.subscriptionInfo}>
          <Text style={styles.subscriptionName}>{item.name}</Text>
          <Text style={styles.subscriptionEvent}>{item.eventName}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.status === 'active' && styles.statusActive,
          item.status === 'expired' && styles.statusExpired,
          item.status === 'cancelled' && styles.statusCancelled,
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'active' && styles.statusTextActive,
            item.status === 'expired' && styles.statusTextExpired,
            item.status === 'cancelled' && styles.statusTextCancelled,
          ]}>
            {item.status === 'active' ? 'Attivo' : item.status === 'expired' ? 'Scaduto' : 'Annullato'}
          </Text>
        </View>
      </View>
      
      <View style={styles.subscriptionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.detailText}>
            {item.startDate} - {item.endDate}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="albums-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.detailText}>
            {item.eventsUsed} / {item.eventsIncluded} eventi
          </Text>
        </View>
      </View>
      
      {item.status === 'active' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(item.eventsUsed / item.eventsIncluded) * 100}%` }
              ]} 
            />
          </View>
        </View>
      )}
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={activeTab === 'tickets' ? 'ticket-outline' : 'card-outline'} 
        size={64} 
        color={colors.mutedForeground} 
      />
      <Text style={styles.emptyTitle}>
        {activeTab === 'tickets' ? 'Nessun biglietto' : 'Nessun abbonamento'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'tickets'
          ? filter === 'all' 
            ? 'Non hai ancora acquistato biglietti'
            : `Nessun biglietto ${filter === 'valid' ? 'valido' : filter === 'used' ? 'usato' : 'annullato'}`
          : 'Non hai ancora abbonamenti attivi'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header 
        title="I miei biglietti" 
        showBack 
        onBack={() => navigation.goBack()} 
      />
      
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.key ? colors.primary : colors.mutedForeground} 
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {activeTab === 'tickets' && (
        <View style={styles.filtersContainer}>
          <FlatList
            data={filters}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterPill, filter === item.key && styles.filterPillActive]}
                onPress={() => setFilter(item.key)}
              >
                <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {activeTab === 'tickets' ? (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicket}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.lg },
            filteredTickets.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetchingTickets}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderSubscription}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.lg },
            subscriptions.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetchingSubscriptions}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.primary,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filters: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  filterTextActive: {
    color: colors.primaryForeground,
    fontWeight: fontWeight.medium,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
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
    textAlign: 'center',
  },
  subscriptionCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  subscriptionEvent: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusActive: {
    backgroundColor: colors.success + '20',
  },
  statusExpired: {
    backgroundColor: colors.mutedForeground + '20',
  },
  statusCancelled: {
    backgroundColor: colors.destructive + '20',
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextExpired: {
    color: colors.mutedForeground,
  },
  statusTextCancelled: {
    color: colors.destructive,
  },
  subscriptionDetails: {
    gap: spacing.sm,
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
  progressContainer: {
    marginTop: spacing.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
