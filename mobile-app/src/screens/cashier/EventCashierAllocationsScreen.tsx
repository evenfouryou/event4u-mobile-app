import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

const CASHIER_ACCENT = colors.cashier;
const CASHIER_ACCENT_FOREGROUND = colors.cashierForeground;

interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  status: 'upcoming' | 'active' | 'completed';
  cashiersNeeded: number;
  cashiersAssigned: number;
  allocations: CashierAllocation[];
}

interface CashierAllocation {
  id: string;
  cashierId: string;
  cashierName: string;
  shift: string;
  station: string;
  status: 'confirmed' | 'pending' | 'declined';
}

interface AvailableCashier {
  id: string;
  name: string;
  email: string;
  availability: boolean;
}

export function EventCashierAllocationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data: events = [], refetch } = useQuery<Event[]>({
    queryKey: ['/api/cashier/allocations/events'],
    queryFn: () =>
      api.get<Event[]>('/api/cashier/allocations/events').catch(() => [
        {
          id: '1',
          name: 'Notte Italiana',
          date: '2025-01-18',
          time: '23:00 - 05:00',
          venue: 'Club Paradiso',
          status: 'upcoming',
          cashiersNeeded: 4,
          cashiersAssigned: 2,
          allocations: [
            {
              id: 'a1',
              cashierId: 'c1',
              cashierName: 'Marco Rossi',
              shift: '23:00 - 02:00',
              station: 'Ingresso Principale',
              status: 'confirmed',
            },
            {
              id: 'a2',
              cashierId: 'c2',
              cashierName: 'Laura Bianchi',
              shift: '02:00 - 05:00',
              station: 'Ingresso Principale',
              status: 'confirmed',
            },
          ],
        },
        {
          id: '2',
          name: 'Friday Vibes',
          date: '2025-01-24',
          time: '22:30 - 04:00',
          venue: 'Discoteca Luna',
          status: 'upcoming',
          cashiersNeeded: 3,
          cashiersAssigned: 1,
          allocations: [
            {
              id: 'a3',
              cashierId: 'c3',
              cashierName: 'Paolo Verdi',
              shift: '22:30 - 04:00',
              station: 'Bar Principale',
              status: 'pending',
            },
          ],
        },
        {
          id: '3',
          name: 'Electronic Sunday',
          date: '2025-01-19',
          time: '21:00 - 03:00',
          venue: 'Space Club',
          status: 'upcoming',
          cashiersNeeded: 2,
          cashiersAssigned: 2,
          allocations: [
            {
              id: 'a4',
              cashierId: 'c1',
              cashierName: 'Marco Rossi',
              shift: '21:00 - 00:00',
              station: 'Cassa 1',
              status: 'confirmed',
            },
            {
              id: 'a5',
              cashierId: 'c4',
              cashierName: 'Anna Ferrari',
              shift: '00:00 - 03:00',
              station: 'Cassa 1',
              status: 'confirmed',
            },
          ],
        },
      ]),
  });

  const { data: availableCashiers = [] } = useQuery<AvailableCashier[]>({
    queryKey: ['/api/cashier/allocations/available'],
    queryFn: () =>
      api.get<AvailableCashier[]>('/api/cashier/allocations/available').catch(() => [
        { id: 'c1', name: 'Marco Rossi', email: 'marco.r@email.com', availability: true },
        { id: 'c2', name: 'Laura Bianchi', email: 'laura.b@email.com', availability: true },
        { id: 'c3', name: 'Paolo Verdi', email: 'paolo.v@email.com', availability: false },
        { id: 'c4', name: 'Anna Ferrari', email: 'anna.f@email.com', availability: true },
      ]),
  });

  const assignCashierMutation = useMutation({
    mutationFn: (data: { eventId: string; cashierId: string; shift: string; station: string }) =>
      api.post('/api/cashier/allocations/assign', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cashier/allocations/events'] });
      setShowAssignModal(false);
      Alert.alert('Successo', 'Cassiere assegnato con successo');
    },
  });

  const removeAllocationMutation = useMutation({
    mutationFn: (allocationId: string) =>
      api.delete(`/api/cashier/allocations/${allocationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cashier/allocations/events'] });
      Alert.alert('Successo', 'Allocazione rimossa');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'declined':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confermato';
      case 'pending':
        return 'In Attesa';
      case 'declined':
        return 'Rifiutato';
      default:
        return status;
    }
  };

  const getCoverageColor = (assigned: number, needed: number) => {
    const percentage = (assigned / needed) * 100;
    if (percentage >= 100) return colors.success;
    if (percentage >= 50) return colors.warning;
    return colors.destructive;
  };

  const handleAssignCashier = (cashier: AvailableCashier) => {
    if (!selectedEvent) return;
    assignCashierMutation.mutate({
      eventId: selectedEvent.id,
      cashierId: cashier.id,
      shift: 'Da definire',
      station: 'Da definire',
    });
  };

  const handleRemoveAllocation = (allocation: CashierAllocation) => {
    Alert.alert(
      'Rimuovi Allocazione',
      `Vuoi rimuovere ${allocation.cashierName} da questo evento?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: () => removeAllocationMutation.mutate(allocation.id),
        },
      ]
    );
  };

  const openAssignModal = (event: Event) => {
    setSelectedEvent(event);
    setShowAssignModal(true);
  };

  return (
    <View style={styles.container}>
      <Header title="Allocazione Cassieri" showBack />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CASHIER_ACCENT} />
        }
      >
        <Card variant="glass" style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{events.length}</Text>
              <Text style={styles.summaryLabel}>Eventi</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>
                {events.filter((e) => e.cashiersAssigned < e.cashiersNeeded).length}
              </Text>
              <Text style={styles.summaryLabel}>Da Completare</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {events.reduce((sum, e) => sum + e.cashiersAssigned, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Assegnati</Text>
            </View>
          </View>
        </Card>

        {events.map((event) => (
          <Card key={event.id} variant="glass" style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>{event.name}</Text>
                <View style={styles.eventMeta}>
                  <Ionicons name="calendar" size={14} color={colors.accent} />
                  <Text style={styles.eventMetaText}>{formatDate(event.date)}</Text>
                  <Ionicons name="time" size={14} color={colors.accent} />
                  <Text style={styles.eventMetaText}>{event.time}</Text>
                </View>
                <View style={styles.eventMeta}>
                  <Ionicons name="location" size={14} color={colors.mutedForeground} />
                  <Text style={styles.eventVenue}>{event.venue}</Text>
                </View>
              </View>
              <View style={styles.coverageContainer}>
                <View
                  style={[
                    styles.coverageBadge,
                    { backgroundColor: getCoverageColor(event.cashiersAssigned, event.cashiersNeeded) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.coverageText,
                      { color: getCoverageColor(event.cashiersAssigned, event.cashiersNeeded) },
                    ]}
                  >
                    {event.cashiersAssigned}/{event.cashiersNeeded}
                  </Text>
                </View>
              </View>
            </View>

            {event.allocations.length > 0 && (
              <View style={styles.allocationsList}>
                {event.allocations.map((allocation) => (
                  <View key={allocation.id} style={styles.allocationItem}>
                    <View style={styles.allocationInfo}>
                      <View style={styles.allocationAvatar}>
                        <Ionicons name="person" size={16} color={CASHIER_ACCENT} />
                      </View>
                      <View>
                        <Text style={styles.allocationName}>{allocation.cashierName}</Text>
                        <Text style={styles.allocationDetails}>
                          {allocation.shift} • {allocation.station}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.allocationActions}>
                      <View
                        style={[
                          styles.allocationStatus,
                          { backgroundColor: getStatusColor(allocation.status) + '20' },
                        ]}
                      >
                        <View
                          style={[styles.statusDot, { backgroundColor: getStatusColor(allocation.status) }]}
                        />
                        <Text
                          style={[styles.allocationStatusText, { color: getStatusColor(allocation.status) }]}
                        >
                          {getStatusLabel(allocation.status)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveAllocation(allocation)}
                        data-testid={`button-remove-${allocation.id}`}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {event.cashiersAssigned < event.cashiersNeeded && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => openAssignModal(event)}
                data-testid={`button-add-cashier-${event.id}`}
              >
                <Ionicons name="add" size={20} color={CASHIER_ACCENT} />
                <Text style={styles.addButtonText}>Aggiungi Cassiere</Text>
              </TouchableOpacity>
            )}
          </Card>
        ))}

        {events.length === 0 && (
          <Card variant="glass" style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessun evento</Text>
            <Text style={styles.emptySubtitle}>Non ci sono eventi che richiedono cassieri</Text>
          </Card>
        )}
      </ScrollView>

      <Modal visible={showAssignModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assegna Cassiere</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {selectedEvent && (
              <Text style={styles.modalSubtitle}>
                {selectedEvent.name} - {formatDate(selectedEvent.date)}
              </Text>
            )}

            <ScrollView style={styles.cashiersList}>
              {availableCashiers.map((cashier) => {
                const isAssigned = selectedEvent?.allocations.some((a) => a.cashierId === cashier.id);
                return (
                  <TouchableOpacity
                    key={cashier.id}
                    style={[
                      styles.cashierItem,
                      (!cashier.availability || isAssigned) && styles.cashierItemDisabled,
                    ]}
                    onPress={() => handleAssignCashier(cashier)}
                    disabled={!cashier.availability || isAssigned}
                    data-testid={`cashier-select-${cashier.id}`}
                  >
                    <View style={styles.cashierInfo}>
                      <View style={styles.cashierAvatar}>
                        <Ionicons name="person" size={20} color={CASHIER_ACCENT} />
                      </View>
                      <View>
                        <Text style={styles.cashierName}>{cashier.name}</Text>
                        <Text style={styles.cashierEmail}>{cashier.email}</Text>
                      </View>
                    </View>
                    {isAssigned ? (
                      <View style={styles.assignedBadge}>
                        <Text style={styles.assignedText}>Assegnato</Text>
                      </View>
                    ) : cashier.availability ? (
                      <Ionicons name="add-circle" size={24} color={CASHIER_ACCENT} />
                    ) : (
                      <View style={styles.unavailableBadge}>
                        <Text style={styles.unavailableText}>Non Disponibile</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Button title="Chiudi" variant="outline" onPress={() => setShowAssignModal(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  summaryCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.borderSubtle,
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  eventCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  eventMetaText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    marginRight: spacing.md,
  },
  eventVenue: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  coverageContainer: {},
  coverageBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  coverageText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  allocationsList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  allocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  allocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  allocationAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: CASHIER_ACCENT + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allocationName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  allocationDetails: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  allocationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  allocationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  allocationStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: CASHIER_ACCENT + '50',
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
  },
  addButtonText: {
    color: CASHIER_ACCENT,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  modalSubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.xl,
  },
  cashiersList: {
    maxHeight: 350,
    marginBottom: spacing.xl,
  },
  cashierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  cashierItemDisabled: {
    opacity: 0.5,
  },
  cashierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cashierAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: CASHIER_ACCENT + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashierName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  cashierEmail: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  assignedBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  assignedText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  unavailableBadge: {
    backgroundColor: colors.destructive + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  unavailableText: {
    color: colors.destructive,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
