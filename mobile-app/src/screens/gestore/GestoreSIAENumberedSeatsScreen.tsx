import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAESeat, SIAESeatingData } from '@/lib/api';

interface GestoreSIAENumberedSeatsScreenProps {
  onBack: () => void;
}

export function GestoreSIAENumberedSeatsScreen({ onBack }: GestoreSIAENumberedSeatsScreenProps) {
  const { colors } = useTheme();
  const [seatingData, setSeatingData] = useState<SIAESeatingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedSeat, setSelectedSeat] = useState<SIAESeat | null>(null);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [showEventPicker, setShowEventPicker] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadSeatingData();
    }
  }, [selectedEventId]);

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
      const siaeEvents = await api.getSIAEEvents();
      const eventList = siaeEvents.map(e => ({ id: e.eventId, name: e.eventName }));
      setEvents(eventList);
      if (eventList.length > 0 && !selectedEventId) {
        setSelectedEventId(eventList[0].id);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadSeatingData = async () => {
    if (!selectedEventId) return;
    try {
      setIsLoading(true);
      const data = await api.getSIAESeatingData(selectedEventId);
      setSeatingData(data);
    } catch (error) {
      console.error('Error loading seating data:', error);
      setSeatingData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSeatingData();
    setRefreshing(false);
  };

  const filteredSeats = useMemo(() => {
    if (!seatingData) return [];
    if (selectedSection === 'all') return seatingData.seats;
    return seatingData.seats.filter(seat => seat.section === selectedSection);
  }, [seatingData, selectedSection]);

  const groupedSeats = useMemo(() => {
    const groups: Record<string, SIAESeat[]> = {};
    filteredSeats.forEach(seat => {
      if (!groups[seat.row]) {
        groups[seat.row] = [];
      }
      groups[seat.row].push(seat);
    });
    Object.keys(groups).forEach(row => {
      groups[row].sort((a, b) => a.seatNumber - b.seatNumber);
    });
    return groups;
  }, [filteredSeats]);

  const sortedRows = useMemo(() => {
    return Object.keys(groupedSeats).sort();
  }, [groupedSeats]);

  const handleSeatPress = (seat: SIAESeat) => {
    triggerHaptic('light');
    setSelectedSeat(seat);
    setShowSeatModal(true);
  };

  const handleStatusChange = async (newStatus: 'available' | 'sold' | 'blocked') => {
    if (!selectedSeat || !selectedEventId) return;
    try {
      await api.updateSIAESeatStatus(selectedEventId, selectedSeat.id, newStatus);
      triggerHaptic('success');
      setShowSeatModal(false);
      await loadSeatingData();
    } catch (error) {
      console.error('Error updating seat status:', error);
      triggerHaptic('error');
    }
  };

  const getSeatColor = (status: string) => {
    switch (status) {
      case 'available':
        return staticColors.success;
      case 'sold':
        return staticColors.destructive;
      case 'blocked':
        return staticColors.mutedForeground;
      default:
        return staticColors.border;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Libero';
      case 'sold':
        return 'Venduto';
      case 'blocked':
        return 'Bloccato';
      default:
        return status;
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const renderSeatModal = () => (
    <Modal
      visible={showSeatModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSeatModal(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowSeatModal(false)}>
        <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
          {selectedSeat && (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Dettaglio Posto</Text>
                <Pressable onPress={() => setShowSeatModal(false)} testID="button-close-seat-modal">
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </Pressable>
              </View>

              <View style={styles.seatDetails}>
                <View style={styles.seatDetailRow}>
                  <Text style={styles.seatDetailLabel}>Fila</Text>
                  <Text style={styles.seatDetailValue}>{selectedSeat.row}</Text>
                </View>
                <View style={styles.seatDetailRow}>
                  <Text style={styles.seatDetailLabel}>Posto</Text>
                  <Text style={styles.seatDetailValue}>{selectedSeat.seatNumber}</Text>
                </View>
                <View style={styles.seatDetailRow}>
                  <Text style={styles.seatDetailLabel}>Settore</Text>
                  <Text style={styles.seatDetailValue}>{selectedSeat.section}</Text>
                </View>
                <View style={styles.seatDetailRow}>
                  <Text style={styles.seatDetailLabel}>Stato</Text>
                  <Badge
                    variant={
                      selectedSeat.status === 'available' ? 'success' :
                      selectedSeat.status === 'sold' ? 'destructive' : 'secondary'
                    }
                  >
                    {getStatusLabel(selectedSeat.status)}
                  </Badge>
                </View>
                {selectedSeat.ticketCode && (
                  <View style={styles.seatDetailRow}>
                    <Text style={styles.seatDetailLabel}>Codice Biglietto</Text>
                    <Text style={styles.seatDetailValue}>{selectedSeat.ticketCode}</Text>
                  </View>
                )}
                {selectedSeat.holderName && (
                  <View style={styles.seatDetailRow}>
                    <Text style={styles.seatDetailLabel}>Intestatario</Text>
                    <Text style={styles.seatDetailValue}>{selectedSeat.holderName}</Text>
                  </View>
                )}
              </View>

              <View style={styles.modalActions}>
                <Text style={styles.changeStatusLabel}>Cambia Stato:</Text>
                <View style={styles.statusButtons}>
                  <Button
                    variant={selectedSeat.status === 'available' ? 'default' : 'outline'}
                    size="sm"
                    onPress={() => handleStatusChange('available')}
                    testID="button-status-available"
                  >
                    Libero
                  </Button>
                  <Button
                    variant={selectedSeat.status === 'blocked' ? 'default' : 'outline'}
                    size="sm"
                    onPress={() => handleStatusChange('blocked')}
                    testID="button-status-blocked"
                  >
                    Bloccato
                  </Button>
                </View>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderEventPicker = () => (
    <Modal
      visible={showEventPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEventPicker(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowEventPicker(false)}>
        <View style={[styles.eventPickerContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleziona Evento</Text>
            <Pressable onPress={() => setShowEventPicker(false)} testID="button-close-event-picker">
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.eventOption,
                  item.id === selectedEventId && styles.eventOptionSelected,
                ]}
                onPress={() => {
                  setSelectedEventId(item.id);
                  setShowEventPicker(false);
                  triggerHaptic('selection');
                }}
                testID={`event-option-${item.id}`}
              >
                <Text style={[
                  styles.eventOptionText,
                  item.id === selectedEventId && styles.eventOptionTextSelected,
                ]}>
                  {item.name}
                </Text>
                {item.id === selectedEventId && (
                  <Ionicons name="checkmark" size={20} color={staticColors.primary} />
                )}
              </Pressable>
            )}
          />
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-numbered-seats"
      />

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Posti Numerati</Text>
        <Pressable
          style={styles.eventSelector}
          onPress={() => {
            triggerHaptic('light');
            setShowEventPicker(true);
          }}
          testID="button-select-event"
        >
          <Text style={styles.eventSelectorText} numberOfLines={1}>
            {selectedEvent?.name || 'Seleziona evento'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {showLoader ? (
        <Loading text="Caricamento posti..." />
      ) : !seatingData ? (
        <View style={styles.emptyState}>
          <Ionicons name="grid-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessun dato disponibile</Text>
          <Text style={styles.emptyText}>Seleziona un evento per visualizzare la mappa dei posti</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.statsGrid}>
            <GlassCard style={styles.statCard} testID="stat-total-seats">
              <Text style={styles.statValue}>{seatingData.totalSeats}</Text>
              <Text style={styles.statLabel}>Totale Posti</Text>
            </GlassCard>
            <GlassCard style={styles.statCard} testID="stat-sold-seats">
              <Text style={[styles.statValue, { color: staticColors.destructive }]}>
                {seatingData.soldSeats}
              </Text>
              <Text style={styles.statLabel}>Venduti</Text>
            </GlassCard>
            <GlassCard style={styles.statCard} testID="stat-available-seats">
              <Text style={[styles.statValue, { color: staticColors.success }]}>
                {seatingData.availableSeats}
              </Text>
              <Text style={styles.statLabel}>Liberi</Text>
            </GlassCard>
            <GlassCard style={styles.statCard} testID="stat-blocked-seats">
              <Text style={[styles.statValue, { color: staticColors.mutedForeground }]}>
                {seatingData.blockedSeats}
              </Text>
              <Text style={styles.statLabel}>Bloccati</Text>
            </GlassCard>
          </View>

          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: staticColors.success }]} />
              <Text style={styles.legendText}>Libero</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: staticColors.destructive }]} />
              <Text style={styles.legendText}>Venduto</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: staticColors.mutedForeground }]} />
              <Text style={styles.legendText}>Bloccato</Text>
            </View>
          </View>

          {seatingData.sections.length > 1 && (
            <View style={styles.sectionFilterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable
                  style={[
                    styles.sectionChip,
                    selectedSection === 'all' && styles.sectionChipActive,
                  ]}
                  onPress={() => {
                    triggerHaptic('selection');
                    setSelectedSection('all');
                  }}
                  testID="filter-section-all"
                >
                  <Text style={[
                    styles.sectionChipText,
                    selectedSection === 'all' && styles.sectionChipTextActive,
                  ]}>
                    Tutti i Settori
                  </Text>
                </Pressable>
                {seatingData.sections.map(section => (
                  <Pressable
                    key={section}
                    style={[
                      styles.sectionChip,
                      selectedSection === section && styles.sectionChipActive,
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSelectedSection(section);
                    }}
                    testID={`filter-section-${section}`}
                  >
                    <Text style={[
                      styles.sectionChipText,
                      selectedSection === section && styles.sectionChipTextActive,
                    ]}>
                      {section}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.seatingMapContainer}>
            <View style={styles.stageIndicator}>
              <Text style={styles.stageText}>PALCO</Text>
            </View>

            {sortedRows.map(row => (
              <View key={row} style={styles.rowContainer}>
                <Text style={styles.rowLabel}>{row}</Text>
                <View style={styles.seatsRow}>
                  {groupedSeats[row].map(seat => (
                    <Pressable
                      key={seat.id}
                      style={[
                        styles.seat,
                        { backgroundColor: getSeatColor(seat.status) },
                      ]}
                      onPress={() => handleSeatPress(seat)}
                      testID={`seat-${seat.row}-${seat.seatNumber}`}
                    >
                      <Text style={styles.seatNumber}>{seat.seatNumber}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.rowLabel}>{row}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {renderSeatModal()}
      {renderEventPicker()}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  eventSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  eventSelectorText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
    maxWidth: 200,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.sm,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  sectionFilterContainer: {
    marginBottom: spacing.lg,
  },
  sectionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    marginRight: spacing.sm,
  },
  sectionChipActive: {
    backgroundColor: staticColors.primary,
  },
  sectionChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  sectionChipTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  seatingMapContainer: {
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  stageIndicator: {
    backgroundColor: staticColors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stageText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
    letterSpacing: 2,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rowLabel: {
    width: 24,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  seatsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  seat: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatNumber: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 340,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  seatDetails: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  seatDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seatDetailLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  seatDetailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  modalActions: {
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    paddingTop: spacing.lg,
  },
  changeStatusLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
    marginBottom: spacing.sm,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  eventPickerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '60%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  eventOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  eventOptionSelected: {
    backgroundColor: `${staticColors.primary}15`,
  },
  eventOptionText: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
    flex: 1,
  },
  eventOptionTextSelected: {
    fontWeight: '600',
    color: staticColors.primary,
  },
});

export default GestoreSIAENumberedSeatsScreen;
