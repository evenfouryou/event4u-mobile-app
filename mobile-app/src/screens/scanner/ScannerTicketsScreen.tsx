import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';

interface Ticket {
  id: string;
  ticketCode: string;
  ticketType: string;
  holderName: string;
  holderEmail: string;
  purchaseDate: string;
  status: 'valid' | 'used' | 'expired' | 'cancelled' | 'refunded';
  price: number;
  gate?: string;
  scannedAt?: string;
}

interface TicketStats {
  total: number;
  valid: number;
  used: number;
  expired: number;
  cancelled: number;
}

const STATUS_CONFIG = {
  valid: { label: 'Valido', color: colors.teal, icon: 'checkmark-circle' },
  used: { label: 'Utilizzato', color: colors.emerald, icon: 'enter' },
  expired: { label: 'Scaduto', color: colors.mutedForeground, icon: 'time' },
  cancelled: { label: 'Annullato', color: colors.destructive, icon: 'close-circle' },
  refunded: { label: 'Rimborsato', color: colors.warning, icon: 'return-down-back' },
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'Tutti' },
  { id: 'valid', label: 'Validi' },
  { id: 'used', label: 'Utilizzati' },
  { id: 'expired', label: 'Scaduti' },
];

const TICKET_TYPES = ['VIP', 'Standard', 'Early Bird', 'Backstage'];

export default function ScannerTicketsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const eventId = route.params?.eventId;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const numColumns = isTablet || isLandscape ? 2 : 1;
  const contentMaxWidth = isTablet ? 1200 : undefined;

  const { data: tickets, refetch: refetchTickets } = useQuery<Ticket[]>({
    queryKey: ['/api/events', eventId, 'tickets'],
  });

  const { data: stats, refetch: refetchStats } = useQuery<TicketStats>({
    queryKey: ['/api/events', eventId, 'tickets/stats'],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTickets(), refetchStats()]);
    setRefreshing(false);
  }, [refetchTickets, refetchStats]);

  const mockTickets: Ticket[] = tickets || [
    { id: '1', ticketCode: 'TKT-001234', ticketType: 'VIP', holderName: 'Marco Rossi', holderEmail: 'marco@email.com', purchaseDate: '2026-01-10', status: 'valid', price: 50 },
    { id: '2', ticketCode: 'TKT-001235', ticketType: 'Standard', holderName: 'Anna Bianchi', holderEmail: 'anna@email.com', purchaseDate: '2026-01-11', status: 'used', price: 25, gate: 'Ingresso A', scannedAt: '22:30' },
    { id: '3', ticketCode: 'TKT-001236', ticketType: 'Standard', holderName: 'Paolo Verde', holderEmail: 'paolo@email.com', purchaseDate: '2026-01-12', status: 'valid', price: 25 },
    { id: '4', ticketCode: 'TKT-001237', ticketType: 'Early Bird', holderName: 'Sara Neri', holderEmail: 'sara@email.com', purchaseDate: '2026-01-05', status: 'expired', price: 20 },
    { id: '5', ticketCode: 'TKT-001238', ticketType: 'VIP', holderName: 'Giulia Russo', holderEmail: 'giulia@email.com', purchaseDate: '2026-01-13', status: 'cancelled', price: 50 },
    { id: '6', ticketCode: 'TKT-001239', ticketType: 'Backstage', holderName: 'Luca Ferrari', holderEmail: 'luca@email.com', purchaseDate: '2026-01-14', status: 'valid', price: 100 },
    { id: '7', ticketCode: 'TKT-001240', ticketType: 'Standard', holderName: 'Elena Martini', holderEmail: 'elena@email.com', purchaseDate: '2026-01-15', status: 'refunded', price: 25 },
  ];

  const mockStats: TicketStats = stats || {
    total: mockTickets.length,
    valid: mockTickets.filter(t => t.status === 'valid').length,
    used: mockTickets.filter(t => t.status === 'used').length,
    expired: mockTickets.filter(t => t.status === 'expired').length,
    cancelled: mockTickets.filter(t => ['cancelled', 'refunded'].includes(t.status)).length,
  };

  const filteredTickets = mockTickets.filter((ticket) => {
    const matchesSearch = ticket.ticketCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.holderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.holderEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || ticket.status === activeFilter;
    const matchesType = !selectedType || ticket.ticketType === selectedType;
    return matchesSearch && matchesFilter && matchesType;
  });

  const renderTicketCard = ({ item, index }: { item: Ticket; index: number }) => {
    const statusConfig = STATUS_CONFIG[item.status];
    const isLeftColumn = index % 2 === 0;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
        activeOpacity={0.8}
        testID={`card-ticket-${item.id}`}
        style={[
          styles.ticketCardWrapper,
          numColumns === 2 && {
            flex: 0.5,
            paddingLeft: isLeftColumn ? 0 : spacing.sm,
            paddingRight: isLeftColumn ? spacing.sm : 0,
          },
        ]}
      >
        <Card variant="glass" style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketCode}>{item.ticketCode}</Text>
              <Text style={styles.holderName}>{item.holderName}</Text>
              <Text style={styles.holderEmail}>{item.holderEmail}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
              <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          <View style={styles.ticketDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="pricetag-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.detailText}>{item.ticketType}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="cash-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.detailText}>€{item.price}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.detailText}>{item.purchaseDate}</Text>
              </View>
            </View>

            {item.status === 'used' && item.scannedAt && (
              <View style={styles.scannedInfo}>
                <Ionicons name="scan-outline" size={14} color={colors.emerald} />
                <Text style={styles.scannedText}>
                  Scansionato alle {item.scannedAt} - {item.gate}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Biglietti Evento"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('ExportTickets', { eventId })}
            testID="button-export"
          >
            <Ionicons name="download-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <View style={[styles.contentContainer, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined]}>
        <View style={styles.statsContainer}>
          <Card variant="glass" style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue} testID="text-total-tickets">{mockStats.total}</Text>
                <Text style={styles.statLabel}>Totale</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.teal }]} testID="text-valid-tickets">{mockStats.valid}</Text>
                <Text style={styles.statLabel}>Validi</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.emerald }]} testID="text-used-tickets">{mockStats.used}</Text>
                <Text style={styles.statLabel}>Usati</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.destructive }]} testID="text-cancelled-tickets">{mockStats.cancelled}</Text>
                <Text style={styles.statLabel}>Annullati</Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressSegment, { flex: mockStats.used, backgroundColor: colors.emerald }]} />
                <View style={[styles.progressSegment, { flex: mockStats.valid, backgroundColor: colors.teal }]} />
                <View style={[styles.progressSegment, { flex: mockStats.expired + mockStats.cancelled, backgroundColor: colors.mutedForeground }]} />
              </View>
              <Text style={styles.progressText} testID="text-progress">
                {mockStats.used} / {mockStats.total} ingressi ({Math.round((mockStats.used / mockStats.total) * 100)}%)
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca per codice, nome o email..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTER_OPTIONS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterPill,
                activeFilter === filter.id && styles.filterPillActive,
              ]}
              onPress={() => setActiveFilter(filter.id)}
              testID={`filter-${filter.id}`}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === filter.id && styles.filterPillTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.filterDivider} />
          {TICKET_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterPill,
                styles.typePill,
                selectedType === type && styles.typePillActive,
              ]}
              onPress={() => setSelectedType(selectedType === type ? null : type)}
              testID={`type-${type}`}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedType === type && styles.typePillTextActive,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={filteredTickets}
          renderItem={renderTicketCard}
          keyExtractor={(item) => item.id}
          key={numColumns}
          numColumns={numColumns}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald} />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <Card style={styles.emptyCard} variant="glass">
              <Ionicons name="ticket-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle} testID="text-empty-title">Nessun biglietto trovato</Text>
              <Text style={styles.emptyText} testID="text-empty-subtitle">Prova a modificare i filtri di ricerca</Text>
            </Card>
          }
          ListHeaderComponent={
            <Text style={styles.resultCount} testID="text-result-count">
              {filteredTickets.length} biglietti trovati
            </Text>
          }
          testID="list-tickets"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
  },
  statsContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  statsCard: {
    paddingVertical: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.borderSubtle,
  },
  progressContainer: {
    gap: spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressSegment: {
    height: '100%',
  },
  progressText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  filtersContainer: {
    maxHeight: 50,
    marginTop: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  filterPillText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterPillTextActive: {
    color: colors.emeraldForeground,
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.sm,
  },
  typePill: {
    borderColor: colors.teal,
    borderStyle: 'dashed',
  },
  typePillActive: {
    backgroundColor: `${colors.teal}20`,
    borderColor: colors.teal,
    borderStyle: 'solid',
  },
  typePillTextActive: {
    color: colors.teal,
  },
  listContent: {
    padding: spacing.lg,
  },
  ticketCardWrapper: {
    flex: 1,
  },
  resultCount: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  ticketCard: {
    paddingVertical: spacing.lg,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketCode: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  holderName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  holderEmail: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  ticketDetails: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  scannedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  scannedText: {
    color: colors.emerald,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
});
