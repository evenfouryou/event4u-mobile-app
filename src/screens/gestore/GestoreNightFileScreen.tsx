import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
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
import api, { NightFileData, CashierEvent } from '@/lib/api';

interface GestoreNightFileScreenProps {
  onBack: () => void;
}

export function GestoreNightFileScreen({ onBack }: GestoreNightFileScreenProps) {
  const { colors } = useTheme();
  const [nightData, setNightData] = useState<NightFileData | null>(null);
  const [events, setEvents] = useState<CashierEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadNightData();
    }
  }, [selectedEvent]);

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
      const data = await api.getGestoreCashierEvents();
      setEvents(data);
      const activeEvent = data.find(e => e.status === 'active');
      if (activeEvent) {
        setSelectedEvent(activeEvent.id);
      } else if (data.length > 0) {
        setSelectedEvent(data[0].id);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadNightData = async () => {
    if (!selectedEvent) return;
    try {
      setIsLoading(true);
      const data = await api.getNightFileData(selectedEvent);
      setNightData(data);
    } catch (error) {
      console.error('Error loading night file data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNightData();
    setRefreshing(false);
  };

  const handleCloseReport = () => {
    if (!nightData) return;

    const statusMessage = nightData.status === 'open' 
      ? 'Vuoi iniziare la chiusura serata?' 
      : 'Vuoi confermare e chiudere definitivamente il report?';

    Alert.alert(
      'Chiusura Serata',
      statusMessage,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Conferma', 
          onPress: async () => {
            setIsClosing(true);
            triggerHaptic('success');
            await new Promise(resolve => setTimeout(resolve, 1500));
            setIsClosing(false);
            await loadNightData();
          }
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const getStatusLabel = (status: NightFileData['status']) => {
    switch (status) {
      case 'open':
        return 'Aperto';
      case 'closing':
        return 'In Chiusura';
      case 'closed':
        return 'Chiuso';
    }
  };

  const getStatusColor = (status: NightFileData['status']) => {
    switch (status) {
      case 'open':
        return staticColors.success;
      case 'closing':
        return staticColors.warning;
      case 'closed':
        return staticColors.mutedForeground;
    }
  };

  const getStatusBadgeVariant = (status: NightFileData['status']): 'success' | 'warning' | 'secondary' => {
    switch (status) {
      case 'open':
        return 'success';
      case 'closing':
        return 'warning';
      case 'closed':
        return 'secondary';
    }
  };

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category.toLowerCase()) {
      case 'bar':
        return 'wine-outline';
      case 'food':
        return 'restaurant-outline';
      case 'entrance':
        return 'ticket-outline';
      case 'vip':
        return 'diamond-outline';
      default:
        return 'pricetag-outline';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'bar':
        return staticColors.primary;
      case 'food':
        return staticColors.warning;
      case 'entrance':
        return staticColors.teal;
      case 'vip':
        return staticColors.golden;
      default:
        return staticColors.mutedForeground;
    }
  };

  const selectedEventData = events.find(e => e.id === selectedEvent);

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-night-file"
      />

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
        <View style={styles.headerSection}>
          <Text style={styles.title} testID="text-title">Chiusura Serata</Text>
          <Text style={styles.subtitle}>Report di fine serata</Text>
        </View>

        <Pressable
          onPress={() => {
            triggerHaptic('selection');
            setShowEventPicker(!showEventPicker);
          }}
          style={styles.eventSelector}
          testID="event-selector"
        >
          <View style={styles.eventSelectorContent}>
            <Ionicons name="calendar" size={20} color={staticColors.primary} />
            <View style={styles.eventSelectorText}>
              <Text style={styles.eventSelectorLabel}>Evento Selezionato</Text>
              <Text style={styles.eventSelectorValue}>
                {selectedEventData?.name || 'Seleziona evento'}
              </Text>
            </View>
          </View>
          <Ionicons
            name={showEventPicker ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={staticColors.mutedForeground}
          />
        </Pressable>

        {showEventPicker && (
          <View style={styles.eventPickerContainer}>
            {events.map((event) => (
              <Pressable
                key={event.id}
                onPress={() => {
                  triggerHaptic('selection');
                  setSelectedEvent(event.id);
                  setShowEventPicker(false);
                }}
                style={[
                  styles.eventPickerItem,
                  selectedEvent === event.id && styles.eventPickerItemActive,
                ]}
                testID={`event-option-${event.id}`}
              >
                <View style={styles.eventPickerItemContent}>
                  <Text style={styles.eventPickerItemName}>{event.name}</Text>
                  <Text style={styles.eventPickerItemDate}>{event.date}</Text>
                </View>
                {event.status === 'active' && (
                  <Badge variant="success">
                    <Text style={styles.eventBadgeText}>Attivo</Text>
                  </Badge>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {showLoader ? (
          <Loading text="Caricamento dati chiusura..." />
        ) : nightData ? (
          <>
            <Card style={styles.statusCard} testID="status-card">
              <View style={styles.statusHeader}>
                <View>
                  <Text style={styles.statusTitle}>{nightData.eventName}</Text>
                  <Text style={styles.statusDate}>{nightData.date}</Text>
                </View>
                <Badge variant={getStatusBadgeVariant(nightData.status)}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(nightData.status) }]}>
                    {getStatusLabel(nightData.status)}
                  </Text>
                </Badge>
              </View>
            </Card>

            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard} testID="stat-revenue">
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                  <Ionicons name="cash" size={20} color={staticColors.success} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(nightData.totalRevenue)}</Text>
                <Text style={styles.statLabel}>Incasso Totale</Text>
              </GlassCard>

              <GlassCard style={styles.statCard} testID="stat-tickets">
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                  <Ionicons name="ticket" size={20} color={staticColors.teal} />
                </View>
                <Text style={styles.statValue}>{nightData.ticketsSold}</Text>
                <Text style={styles.statLabel}>Biglietti Venduti</Text>
              </GlassCard>

              <GlassCard style={styles.statCard} testID="stat-guests">
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                  <Ionicons name="people" size={20} color={staticColors.primary} />
                </View>
                <Text style={styles.statValue}>{nightData.guestsEntered}</Text>
                <Text style={styles.statLabel}>Ospiti Entrati</Text>
              </GlassCard>

              <GlassCard style={styles.statCard} testID="stat-stations">
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
                  <Ionicons name="storefront" size={20} color={staticColors.golden} />
                </View>
                <Text style={styles.statValue}>{nightData.activeStations}</Text>
                <Text style={styles.statLabel}>Stazioni Attive</Text>
              </GlassCard>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Riepilogo per Categoria</Text>
              {nightData.breakdown.map((item, index) => (
                <Card key={index} style={styles.breakdownCard} testID={`breakdown-${item.category}`}>
                  <View style={styles.breakdownContent}>
                    <View style={[styles.breakdownIcon, { backgroundColor: `${getCategoryColor(item.category)}20` }]}>
                      <Ionicons
                        name={getCategoryIcon(item.category)}
                        size={20}
                        color={getCategoryColor(item.category)}
                      />
                    </View>
                    <View style={styles.breakdownInfo}>
                      <Text style={styles.breakdownCategory}>{item.category}</Text>
                      <Text style={styles.breakdownTransactions}>{item.transactions} transazioni</Text>
                    </View>
                    <Text style={styles.breakdownAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                </Card>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Riconciliazione Cassa</Text>
              <Card style={styles.reconciliationCard} testID="reconciliation-card">
                <View style={styles.reconciliationRow}>
                  <Text style={styles.reconciliationLabel}>Contanti Attesi</Text>
                  <Text style={styles.reconciliationValue}>{formatCurrency(nightData.cashReconciliation.expected)}</Text>
                </View>
                <View style={styles.reconciliationRow}>
                  <Text style={styles.reconciliationLabel}>Contanti Contati</Text>
                  <Text style={styles.reconciliationValue}>{formatCurrency(nightData.cashReconciliation.counted)}</Text>
                </View>
                <View style={[styles.reconciliationRow, styles.reconciliationDivider]}>
                  <Text style={styles.reconciliationLabelBold}>Differenza</Text>
                  <Text style={[
                    styles.reconciliationValueBold,
                    { color: nightData.cashReconciliation.difference === 0 
                        ? staticColors.success 
                        : nightData.cashReconciliation.difference > 0 
                          ? staticColors.teal 
                          : staticColors.destructive 
                    }
                  ]}>
                    {nightData.cashReconciliation.difference >= 0 ? '+' : ''}{formatCurrency(nightData.cashReconciliation.difference)}
                  </Text>
                </View>
              </Card>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Riepilogo Staff</Text>
              {nightData.staffSummary.length > 0 ? (
                nightData.staffSummary.map((staff, index) => (
                  <Card key={index} style={styles.staffCard} testID={`staff-${index}`}>
                    <View style={styles.staffContent}>
                      <View style={[styles.staffAvatar, { backgroundColor: `${staticColors.primary}20` }]}>
                        <Ionicons name="person" size={20} color={staticColors.primary} />
                      </View>
                      <View style={styles.staffInfo}>
                        <Text style={styles.staffName}>{staff.name}</Text>
                        <Text style={styles.staffRole}>{staff.role}</Text>
                      </View>
                      <View style={styles.staffStats}>
                        <Text style={styles.staffHours}>{formatHours(staff.hours)}</Text>
                        {staff.tips > 0 && (
                          <Text style={styles.staffTips}>Mance: {formatCurrency(staff.tips)}</Text>
                        )}
                      </View>
                    </View>
                  </Card>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyText}>Nessun dato staff disponibile</Text>
                </Card>
              )}
            </View>

            {nightData.status !== 'closed' && (
              <View style={styles.buttonContainer}>
                <Button
                  onPress={handleCloseReport}
                  variant="default"
                  size="lg"
                  loading={isClosing}
                  testID="button-close-report"
                >
                  {nightData.status === 'open' ? 'Inizia Chiusura' : 'Conferma e Chiudi Report'}
                </Button>
              </View>
            )}

            {nightData.status === 'closed' && (
              <Card style={styles.closedBanner} testID="closed-banner">
                <View style={styles.closedContent}>
                  <Ionicons name="checkmark-circle" size={32} color={staticColors.success} />
                  <Text style={styles.closedText}>Report chiuso con successo</Text>
                </View>
              </Card>
            )}
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="document-text-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Nessun evento selezionato</Text>
              <Text style={styles.emptySubtext}>Seleziona un evento per visualizzare i dati di chiusura</Text>
            </View>
          </Card>
        )}
      </ScrollView>
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
    paddingBottom: spacing.xxl,
  },
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  eventSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  eventSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventSelectorText: {
    flex: 1,
  },
  eventSelectorLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  eventSelectorValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: 2,
  },
  eventPickerContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
    overflow: 'hidden',
  },
  eventPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  eventPickerItemActive: {
    backgroundColor: `${staticColors.primary}10`,
  },
  eventPickerItemContent: {
    flex: 1,
  },
  eventPickerItemName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  eventPickerItemDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  eventBadgeText: {
    fontSize: typography.fontSize.xs,
  },
  statusCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  statusDate: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  breakdownCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  breakdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  breakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownCategory: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  breakdownTransactions: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  breakdownAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.success,
  },
  reconciliationCard: {
    padding: spacing.lg,
  },
  reconciliationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  reconciliationDivider: {
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  reconciliationLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  reconciliationValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  reconciliationLabelBold: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  reconciliationValueBold: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  staffCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  staffContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  staffRole: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  staffStats: {
    alignItems: 'flex-end',
  },
  staffHours: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.teal,
  },
  staffTips: {
    fontSize: typography.fontSize.xs,
    color: staticColors.golden,
    marginTop: 2,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  closedBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: `${staticColors.success}10`,
  },
  closedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  closedText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.success,
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
});

export default GestoreNightFileScreen;
