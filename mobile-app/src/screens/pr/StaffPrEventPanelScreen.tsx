import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface EventDetails {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  status: 'upcoming' | 'active' | 'completed';
  totalCapacity: number;
  currentAttendance: number;
  checkinsToday: number;
  pendingGuests: number;
}

interface GuestEntry {
  id: string;
  name: string;
  status: 'pending' | 'checked_in' | 'no_show';
  ticketType: string;
  checkInTime?: string;
  addedBy: string;
}

type TabType = 'overview' | 'guests' | 'checkins';

export function StaffPrEventPanelScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const queryClient = useQueryClient();
  const eventId = route.params?.eventId;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const numColumns = isTablet || isLandscape ? 2 : 1;

  const { data: event, refetch: refetchEvent } = useQuery<EventDetails>({
    queryKey: ['/api/staff/events', eventId],
    queryFn: () =>
      api.get<EventDetails>(`/api/staff/events/${eventId}`).catch(() => ({
        id: eventId || '1',
        name: 'Notte Italiana',
        date: '2025-01-18',
        time: '23:00 - 05:00',
        venue: 'Club Paradiso',
        status: 'active',
        totalCapacity: 500,
        currentAttendance: 234,
        checkinsToday: 45,
        pendingGuests: 12,
      })),
    enabled: !!eventId,
  });

  const { data: guests = [], refetch: refetchGuests } = useQuery<GuestEntry[]>({
    queryKey: ['/api/staff/events', eventId, 'guests'],
    queryFn: () =>
      api.get<GuestEntry[]>(`/api/staff/events/${eventId}/guests`).catch(() => [
        {
          id: '1',
          name: 'Marco Rossi',
          status: 'checked_in',
          ticketType: 'VIP',
          checkInTime: new Date().toISOString(),
          addedBy: 'Giovanni PR',
        },
        {
          id: '2',
          name: 'Laura Bianchi',
          status: 'pending',
          ticketType: 'Lista',
          addedBy: 'Maria PR',
        },
        {
          id: '3',
          name: 'Paolo Verdi',
          status: 'checked_in',
          ticketType: 'Tavolo',
          checkInTime: new Date(Date.now() - 1800000).toISOString(),
          addedBy: 'Giovanni PR',
        },
        {
          id: '4',
          name: 'Anna Ferrari',
          status: 'pending',
          ticketType: 'Lista',
          addedBy: 'Luca PR',
        },
      ]),
    enabled: !!eventId,
  });

  const checkInMutation = useMutation({
    mutationFn: (guestId: string) => api.post(`/api/staff/guests/${guestId}/checkin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/events', eventId] });
      Alert.alert('Successo', 'Check-in completato');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvent(), refetchGuests()]);
    setRefreshing(false);
  };

  const handleCheckIn = (guest: GuestEntry) => {
    Alert.alert(
      'Conferma Check-in',
      `Vuoi confermare il check-in per ${guest.name}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Conferma', onPress: () => checkInMutation.mutate(guest.id) },
      ]
    );
  };

  const filteredGuests = guests.filter((guest) =>
    guest.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingGuests = filteredGuests.filter((g) => g.status === 'pending');
  const checkedInGuests = filteredGuests.filter((g) => g.status === 'checked_in');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'no_show':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'Check-in';
      case 'pending':
        return 'In Attesa';
      case 'no_show':
        return 'Assente';
      default:
        return status;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'overview', label: 'Panoramica' },
    { key: 'guests', label: 'Ospiti', count: guests.length },
    { key: 'checkins', label: 'In Attesa', count: pendingGuests.length },
  ];

  const displayGuests = activeTab === 'checkins' ? pendingGuests : filteredGuests;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title={event?.name || 'Evento'} showBack />

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            testID={`tab-${tab.key}`}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.count !== undefined && (
              <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />
        }
        testID="scroll-event-panel"
      >
        {activeTab === 'overview' && event && (
          <>
            <Card variant="elevated" style={styles.statusCard} testID="card-status">
              <View style={styles.statusHeader}>
                <View style={styles.statusInfo}>
                  <View style={[styles.statusIndicator, { backgroundColor: colors.success }]} />
                  <Text style={styles.statusText}>Evento in corso</Text>
                </View>
                <Text style={styles.eventTime}>{event.time}</Text>
              </View>
              <View style={styles.venueRow}>
                <Ionicons name="location" size={16} color={colors.mutedForeground} />
                <Text style={styles.venueText}>{event.venue}</Text>
              </View>
            </Card>

            <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
              <Card variant="glass" style={styles.statCard} testID="card-stat-attendance">
                <Ionicons name="people" size={28} color={colors.purple} />
                <Text style={styles.statValue}>{event.currentAttendance}</Text>
                <Text style={styles.statLabel}>Presenti</Text>
                <Text style={styles.statSubtext}>di {event.totalCapacity}</Text>
              </Card>
              <Card variant="glass" style={styles.statCard} testID="card-stat-checkins">
                <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                <Text style={styles.statValue}>{event.checkinsToday}</Text>
                <Text style={styles.statLabel}>Check-in</Text>
                <Text style={styles.statSubtext}>oggi</Text>
              </Card>
              <Card variant="glass" style={styles.statCard} testID="card-stat-pending">
                <Ionicons name="time" size={28} color={colors.warning} />
                <Text style={styles.statValue}>{event.pendingGuests}</Text>
                <Text style={styles.statLabel}>In Attesa</Text>
                <Text style={styles.statSubtext}>da validare</Text>
              </Card>
            </View>

            <View style={styles.capacitySection}>
              <Text style={styles.sectionTitle}>Capienza</Text>
              <Card variant="glass" style={styles.capacityCard} testID="card-capacity">
                <View style={styles.capacityHeader}>
                  <Text style={styles.capacityPercent}>
                    {Math.round((event.currentAttendance / event.totalCapacity) * 100)}%
                  </Text>
                  <Text style={styles.capacityLabel}>
                    {event.currentAttendance} / {event.totalCapacity}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min((event.currentAttendance / event.totalCapacity) * 100, 100)}%`,
                        backgroundColor:
                          event.currentAttendance / event.totalCapacity > 0.9
                            ? colors.destructive
                            : event.currentAttendance / event.totalCapacity > 0.7
                            ? colors.warning
                            : colors.success,
                      },
                    ]}
                  />
                </View>
              </Card>
            </View>

            <View style={[styles.quickActions, isLandscape && styles.quickActionsLandscape]}>
              <Button
                title="Scansiona QR"
                variant="primary"
                icon={<Ionicons name="qr-code" size={20} color={colors.primaryForeground} />}
                onPress={() => navigation.navigate('PRScanner', { eventId })}
                testID="button-scan-qr"
              />
              <Button
                title="Cerca Ospite"
                variant="outline"
                icon={<Ionicons name="search" size={20} color={colors.foreground} />}
                onPress={() => setActiveTab('guests')}
                testID="button-search-guest"
              />
            </View>
          </>
        )}

        {(activeTab === 'guests' || activeTab === 'checkins') && (
          <>
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={20} color={colors.mutedForeground} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cerca ospite..."
                  placeholderTextColor={colors.mutedForeground}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  testID="input-search-guest"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} testID="button-clear-search">
                    <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={[styles.guestsList, numColumns === 2 && styles.guestsListGrid]}>
              {displayGuests.map((guest, index) => (
                <View 
                  key={guest.id}
                  style={[
                    numColumns === 2 && { width: '50%', paddingHorizontal: spacing.xs },
                    numColumns === 2 && index % 2 === 0 && { paddingLeft: 0 },
                    numColumns === 2 && index % 2 === 1 && { paddingRight: 0 },
                  ]}
                >
                  <Card variant="glass" style={styles.guestCard} testID={`card-guest-${guest.id}`}>
                    <View style={styles.guestHeader}>
                      <View style={styles.guestInfo}>
                        <View style={styles.guestAvatar}>
                          <Ionicons name="person" size={20} color={colors.foreground} />
                        </View>
                        <View>
                          <Text style={styles.guestName}>{guest.name}</Text>
                          <View style={styles.guestMeta}>
                            <View style={[styles.ticketBadge, { backgroundColor: colors.purpleLight + '20' }]}>
                              <Text style={[styles.ticketText, { color: colors.purpleLight }]}>{guest.ticketType}</Text>
                            </View>
                            <Text style={styles.addedBy}>da {guest.addedBy}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.guestStatus}>
                        {guest.status === 'pending' ? (
                          <TouchableOpacity
                            style={styles.checkInButton}
                            onPress={() => handleCheckIn(guest)}
                            testID={`button-checkin-${guest.id}`}
                          >
                            <Ionicons name="checkmark" size={20} color={colors.primaryForeground} />
                            <Text style={styles.checkInButtonText}>Check-in</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.checkedInBadge}>
                            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                            <Text style={styles.checkedInTime}>
                              {guest.checkInTime ? formatTime(guest.checkInTime) : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Card>
                </View>
              ))}
            </View>

            {displayGuests.length === 0 && (
              <Card variant="glass" style={styles.emptyCard} testID="card-empty">
                <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
                <Text style={styles.emptyTitle}>
                  {activeTab === 'checkins' ? 'Nessun ospite in attesa' : 'Nessun ospite trovato'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? 'Prova a modificare la ricerca' : 'La lista è vuota'}
                </Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
    borderBottomColor: colors.borderSubtle,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.purple,
  },
  tabText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.purple,
    fontWeight: fontWeight.semibold,
  },
  tabBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  tabBadgeActive: {
    backgroundColor: colors.purple + '20',
  },
  tabBadgeText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  tabBadgeTextActive: {
    color: colors.purple,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  statusCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  eventTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  venueText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statsGridTablet: {
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginTop: spacing.sm,
  },
  statLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
  },
  statSubtext: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  capacitySection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  capacityCard: {
    padding: spacing.lg,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  capacityPercent: {
    color: colors.foreground,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
  },
  capacityLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickActionsLandscape: {
    justifyContent: 'center',
  },
  searchContainer: {
    marginBottom: spacing.lg,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  guestsList: {
    gap: spacing.md,
  },
  guestsListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  guestCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  guestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  guestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxs,
  },
  ticketBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  ticketText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  addedBy: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  guestStatus: {},
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.purple,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  checkInButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  checkedInTime: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  emptyCard: {
    padding: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptySubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
