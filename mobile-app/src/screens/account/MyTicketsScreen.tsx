import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Header } from '../../components/Header';
import { TicketCard } from '../../components/TicketCard';
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

type FilterType = 'all' | 'valid' | 'used' | 'cancelled';

export function MyTicketsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: tickets, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['/api/public/account/tickets'],
    queryFn: () => api.get<Ticket[]>('/api/public/account/tickets'),
  });

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

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="ticket-outline" size={64} color={colors.mutedForeground} />
      <Text style={styles.emptyTitle}>Nessun biglietto</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'all' 
          ? 'Non hai ancora acquistato biglietti'
          : `Nessun biglietto ${filter === 'valid' ? 'valido' : filter === 'used' ? 'usato' : 'annullato'}`}
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
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
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
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    marginRight: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
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
  },
  listEmpty: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
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
    textAlign: 'center',
  },
});
