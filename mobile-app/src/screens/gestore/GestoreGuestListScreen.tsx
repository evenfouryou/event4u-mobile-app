import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { EventGuest, EventGuestStats } from '@/lib/api';

type StatusFilter = 'all' | 'confirmed' | 'pending' | 'cancelled';
type TypeFilter = 'all' | 'vip' | 'regular' | 'comp';

interface GestoreGuestListScreenProps {
  eventId: string;
  onBack: () => void;
}

export function GestoreGuestListScreen({ eventId, onBack }: GestoreGuestListScreenProps) {
  const { colors } = useTheme();
  const [guests, setGuests] = useState<EventGuest[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<EventGuest[]>([]);
  const [stats, setStats] = useState<EventGuestStats>({
    total: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    checkedIn: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [eventId]);

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
    filterGuests();
  }, [guests, searchQuery, statusFilter, typeFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [guestsData, statsData] = await Promise.all([
        api.getEventGuests(eventId),
        api.getEventGuestStats(eventId),
      ]);
      setGuests(guestsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading guests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterGuests = () => {
    let filtered = [...guests];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(guest => guest.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(guest => guest.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(guest =>
        guest.firstName.toLowerCase().includes(query) ||
        guest.lastName.toLowerCase().includes(query) ||
        guest.email?.toLowerCase().includes(query) ||
        guest.phone?.includes(query)
      );
    }

    setFilteredGuests(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confermato</Badge>;
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annullato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'vip':
        return <Badge variant="default">VIP</Badge>;
      case 'comp':
        return <Badge variant="outline">Omaggio</Badge>;
      default:
        return null;
    }
  };

  const handleSendReminder = () => {
    const count = selectedGuests.size > 0 ? selectedGuests.size : filteredGuests.filter(g => g.status === 'pending').length;
    
    Alert.alert(
      'Invia Promemoria',
      `Vuoi inviare un promemoria a ${count} ospiti?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Invia',
          onPress: async () => {
            try {
              const guestIds = selectedGuests.size > 0 
                ? Array.from(selectedGuests) 
                : filteredGuests.filter(g => g.status === 'pending').map(g => g.id);
              await api.sendGuestReminders(eventId, guestIds);
              triggerHaptic('success');
              Alert.alert('Successo', 'Promemoria inviati con successo');
              setSelectedGuests(new Set());
            } catch (error) {
              Alert.alert('Errore', 'Impossibile inviare i promemoria');
            }
          },
        },
      ]
    );
  };

  const handleCheckInAll = () => {
    const pendingGuests = filteredGuests.filter(g => g.status === 'confirmed' && !g.checkedIn);
    
    Alert.alert(
      'Check-in Multiplo',
      `Vuoi effettuare il check-in di ${pendingGuests.length} ospiti?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Check-in',
          onPress: async () => {
            try {
              await api.bulkCheckInGuests(eventId, pendingGuests.map(g => g.id));
              triggerHaptic('success');
              loadData();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile effettuare il check-in');
            }
          },
        },
      ]
    );
  };

  const toggleGuestSelection = (guestId: string) => {
    triggerHaptic('selection');
    const newSelected = new Set(selectedGuests);
    if (newSelected.has(guestId)) {
      newSelected.delete(guestId);
    } else {
      newSelected.add(guestId);
    }
    setSelectedGuests(newSelected);
  };

  const statusFilters: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'confirmed', label: 'Confermati' },
    { id: 'pending', label: 'In attesa' },
    { id: 'cancelled', label: 'Annullati' },
  ];

  const typeFilters: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'vip', label: 'VIP' },
    { id: 'regular', label: 'Regular' },
    { id: 'comp', label: 'Omaggio' },
  ];

  const renderGuest = ({ item }: { item: EventGuest }) => (
    <Pressable
      onLongPress={() => toggleGuestSelection(item.id)}
      onPress={() => {
        if (selectedGuests.size > 0) {
          toggleGuestSelection(item.id);
        } else {
          triggerHaptic('light');
        }
      }}
    >
      <Card 
        style={selectedGuests.has(item.id) ? styles.guestCardSelected : styles.guestCard} 
        testID={`guest-${item.id}`}
      >
        <View style={styles.guestContent}>
          {selectedGuests.size > 0 && (
            <View style={[
              styles.checkbox,
              selectedGuests.has(item.id) && styles.checkboxSelected
            ]}>
              {selectedGuests.has(item.id) && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
          )}
          <Avatar
            name={`${item.firstName} ${item.lastName}`}
            size="md"
            testID={`avatar-${item.id}`}
          />
          <View style={styles.guestInfo}>
            <View style={styles.guestNameRow}>
              <Text style={styles.guestName}>{item.firstName} {item.lastName}</Text>
              {getTypeBadge(item.type)}
            </View>
            {item.email && (
              <Text style={styles.guestContact}>{item.email}</Text>
            )}
            {item.phone && (
              <Text style={styles.guestContact}>{item.phone}</Text>
            )}
            {item.ticketType && (
              <View style={styles.ticketInfo}>
                <Ionicons name="ticket-outline" size={12} color={colors.mutedForeground} />
                <Text style={styles.ticketType}>{item.ticketType}</Text>
              </View>
            )}
          </View>
          <View style={styles.guestStatus}>
            {getStatusBadge(item.status)}
            {item.checkedIn ? (
              <View style={styles.checkedInBadge}>
                <Ionicons name="checkmark-circle" size={16} color={staticColors.success} />
                <Text style={styles.checkedInText}>Entrato</Text>
              </View>
            ) : (
              <View style={styles.notCheckedInBadge}>
                <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.notCheckedInText}>Non entrato</Text>
              </View>
            )}
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
        testID="header-guest-list"
      />

      {showLoader ? (
        <Loading text="Caricamento lista ospiti..." />
      ) : (
        <>
          <View style={styles.headerSection}>
            <Text style={styles.title}>Lista Ospiti</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Totali</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: staticColors.success }]}>{stats.confirmed}</Text>
                <Text style={styles.statLabel}>Confermati</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: staticColors.primary }]}>{stats.checkedIn}</Text>
                <Text style={styles.statLabel}>Check-in</Text>
              </View>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color={colors.mutedForeground} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cerca per nome, email o telefono..."
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

          <View style={styles.filtersSection}>
            <Text style={styles.filterLabel}>Stato:</Text>
            <FlatList
              horizontal
              data={statusFilters}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    triggerHaptic('selection');
                    setStatusFilter(item.id);
                  }}
                  style={[
                    styles.filterChip,
                    statusFilter === item.id && styles.filterChipActive,
                  ]}
                  testID={`filter-status-${item.id}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === item.id && styles.filterChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>

          <View style={styles.filtersSection}>
            <Text style={styles.filterLabel}>Tipo:</Text>
            <FlatList
              horizontal
              data={typeFilters}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    triggerHaptic('selection');
                    setTypeFilter(item.id);
                  }}
                  style={[
                    styles.filterChip,
                    typeFilter === item.id && styles.filterChipActive,
                  ]}
                  testID={`filter-type-${item.id}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      typeFilter === item.id && styles.filterChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>

          <View style={styles.bulkActions}>
            <Button
              variant="outline"
              size="sm"
              onPress={handleSendReminder}
              testID="btn-send-reminder"
            >
              <Ionicons name="notifications-outline" size={16} color={colors.foreground} />
              <Text style={styles.bulkActionText}>Invia Promemoria</Text>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onPress={handleCheckInAll}
              testID="btn-checkin-all"
            >
              <Ionicons name="checkmark-done-outline" size={16} color={colors.foreground} />
              <Text style={styles.bulkActionText}>Check-in Tutti</Text>
            </Button>
          </View>

          {filteredGuests.length > 0 ? (
            <FlatList
              data={filteredGuests}
              renderItem={renderGuest}
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
              <Ionicons name="people-outline" size={64} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Nessun ospite</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Prova con una ricerca diversa' : 'Gli ospiti dell\'evento appariranno qui'}
              </Text>
            </View>
          )}
        </>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: staticColors.border,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
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
  filtersSection: {
    paddingLeft: spacing.lg,
    marginBottom: spacing.xs,
  },
  filterLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
    marginBottom: spacing.xs,
  },
  filtersList: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
  bulkActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  bulkActionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
    marginLeft: spacing.xs,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  guestCard: {
    padding: spacing.md,
  },
  guestCardSelected: {
    backgroundColor: `${staticColors.primary}10`,
    borderColor: staticColors.primary,
  },
  guestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: staticColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  guestInfo: {
    flex: 1,
  },
  guestNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  guestName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  guestContact: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  ticketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  ticketType: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  guestStatus: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkedInText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.success,
    fontWeight: '500',
  },
  notCheckedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notCheckedInText: {
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

export default GestoreGuestListScreen;
