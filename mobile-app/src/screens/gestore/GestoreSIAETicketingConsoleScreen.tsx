import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAETicketingData, SIAEEvent } from '@/lib/api';

interface GestoreSIAETicketingConsoleScreenProps {
  onBack: () => void;
}

export function GestoreSIAETicketingConsoleScreen({ onBack }: GestoreSIAETicketingConsoleScreenProps) {
  const { colors, gradients } = useTheme();
  const [data, setData] = useState<SIAETicketingData | null>(null);
  const [events, setEvents] = useState<SIAEEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTicketType, setSelectedTicketType] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerFiscalCode, setCustomerFiscalCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [showEventSelector, setShowEventSelector] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadTicketingData(selectedEventId);
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

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const eventsData = await api.getSIAEEvents();
      setEvents(eventsData);
      if (eventsData.length > 0) {
        setSelectedEventId(eventsData[0].eventId);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTicketingData = async (eventId: string) => {
    try {
      const ticketingData = await api.getSIAETicketingData(eventId);
      setData(ticketingData);
    } catch (error) {
      console.error('Error loading ticketing data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedEventId) {
      await loadTicketingData(selectedEventId);
    }
    setRefreshing(false);
  };

  const handleEmitTicket = async () => {
    if (!selectedEventId || !selectedTicketType) return;

    try {
      setIsEmitting(true);
      triggerHaptic('medium');
      await api.emitSIAETicket(selectedEventId, {
        ticketTypeId: selectedTicketType,
        customerName: customerName || undefined,
        customerFiscalCode: customerFiscalCode || undefined,
      });
      triggerHaptic('success');
      setCustomerName('');
      setCustomerFiscalCode('');
      setSelectedTicketType(null);
      await loadTicketingData(selectedEventId);
    } catch (error) {
      console.error('Error emitting ticket:', error);
      triggerHaptic('error');
    } finally {
      setIsEmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedEvent = events.find(e => e.eventId === selectedEventId);

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-ticketing-console"
      />

      {showLoader ? (
        <Loading text="Caricamento Console Biglietteria..." />
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
          <View style={styles.headerSection}>
            <Text style={styles.title}>Console Biglietteria</Text>
            <Badge variant="default">SIAE</Badge>
          </View>

          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setShowEventSelector(!showEventSelector);
            }}
            testID="button-event-selector"
          >
            <Card style={styles.eventSelector}>
              <View style={styles.eventSelectorContent}>
                <View style={styles.eventSelectorLeft}>
                  <Ionicons name="calendar" size={20} color={staticColors.primary} />
                  <View style={styles.eventSelectorText}>
                    <Text style={styles.eventSelectorLabel}>Evento Selezionato</Text>
                    <Text style={styles.eventSelectorName} numberOfLines={1}>
                      {selectedEvent?.eventName || 'Seleziona evento'}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={showEventSelector ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.mutedForeground}
                />
              </View>
            </Card>
          </Pressable>

          {showEventSelector && (
            <Card style={styles.eventList} testID="event-selector-dropdown">
              {events.map((event) => (
                <Pressable
                  key={event.eventId}
                  onPress={() => {
                    triggerHaptic('light');
                    setSelectedEventId(event.eventId);
                    setShowEventSelector(false);
                  }}
                  style={[
                    styles.eventItem,
                    event.eventId === selectedEventId && styles.eventItemActive,
                  ]}
                  testID={`event-option-${event.eventId}`}
                >
                  <Text style={styles.eventItemName}>{event.eventName}</Text>
                  {event.eventId === selectedEventId && (
                    <Ionicons name="checkmark" size={18} color={staticColors.primary} />
                  )}
                </Pressable>
              ))}
            </Card>
          )}

          {data && (
            <>
              <View style={styles.statsGrid}>
                <GlassCard style={styles.statCard} testID="stat-tickets-today">
                  <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                    <Ionicons name="ticket" size={20} color={staticColors.primary} />
                  </View>
                  <Text style={styles.statValue}>{data.ticketsToday}</Text>
                  <Text style={styles.statLabel}>Biglietti Emessi Oggi</Text>
                </GlassCard>

                <GlassCard style={styles.statCard} testID="stat-revenue-today">
                  <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                    <Ionicons name="cash" size={20} color={staticColors.success} />
                  </View>
                  <Text style={styles.statValue}>{formatCurrency(data.revenueToday)}</Text>
                  <Text style={styles.statLabel}>Incasso Oggi</Text>
                </GlassCard>

                <GlassCard style={styles.statCard} testID="stat-available-seats">
                  <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                    <Ionicons name="people" size={20} color={staticColors.teal} />
                  </View>
                  <Text style={styles.statValue}>{data.availableSeats}</Text>
                  <Text style={styles.statLabel}>Posti Disponibili</Text>
                </GlassCard>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tipo Biglietto</Text>
                <View style={styles.ticketTypesGrid}>
                  {data.ticketTypes.map((type) => (
                    <Pressable
                      key={type.id}
                      onPress={() => {
                        triggerHaptic('light');
                        setSelectedTicketType(type.id === selectedTicketType ? null : type.id);
                      }}
                      testID={`ticket-type-${type.id}`}
                    >
                      <Card
                        style={{
                          ...styles.ticketTypeCard,
                          ...(selectedTicketType === type.id ? styles.ticketTypeCardActive : {}),
                        }}
                      >
                        <Text style={styles.ticketTypeName}>{type.name}</Text>
                        <Text style={styles.ticketTypePrice}>{formatCurrency(type.price)}</Text>
                        <Text style={styles.ticketTypeAvailable}>
                          {type.available} disponibili
                        </Text>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dati Cliente (opzionale)</Text>
                <Card style={styles.customerCard}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nome Cliente</Text>
                    <TextInput
                      style={styles.input}
                      value={customerName}
                      onChangeText={setCustomerName}
                      placeholder="Nome e Cognome"
                      placeholderTextColor={staticColors.mutedForeground}
                      testID="input-customer-name"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Codice Fiscale</Text>
                    <TextInput
                      style={styles.input}
                      value={customerFiscalCode}
                      onChangeText={setCustomerFiscalCode}
                      placeholder="Codice Fiscale"
                      placeholderTextColor={staticColors.mutedForeground}
                      autoCapitalize="characters"
                      testID="input-customer-fiscal-code"
                    />
                  </View>
                </Card>
              </View>

              <Button
                onPress={handleEmitTicket}
                disabled={!selectedTicketType || isEmitting}
                loading={isEmitting}
                style={styles.emitButton}
                testID="button-emit-ticket"
              >
                <View style={styles.emitButtonContent}>
                  <Ionicons name="print" size={20} color={staticColors.primaryForeground} />
                  <Text style={styles.emitButtonText}>Emetti Biglietto</Text>
                </View>
              </Button>

              {data.recentEmissions.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Emissioni Recenti</Text>
                  {data.recentEmissions.map((emission) => (
                    <Card key={emission.id} style={styles.emissionCard} testID={`emission-${emission.id}`}>
                      <View style={styles.emissionContent}>
                        <View style={styles.emissionLeft}>
                          <Text style={styles.emissionCode}>{emission.ticketCode}</Text>
                          <Text style={styles.emissionType}>{emission.type}</Text>
                          {emission.customerName && (
                            <Text style={styles.emissionCustomer}>{emission.customerName}</Text>
                          )}
                        </View>
                        <Text style={styles.emissionTime}>{formatTime(emission.timestamp)}</Text>
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
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
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  eventSelector: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  eventSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  eventSelectorText: {
    flex: 1,
  },
  eventSelectorLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  eventSelectorName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  eventList: {
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  eventItemActive: {
    backgroundColor: `${staticColors.primary}15`,
  },
  eventItemName: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  ticketTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ticketTypeCard: {
    padding: spacing.md,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ticketTypeCardActive: {
    borderColor: staticColors.primary,
    backgroundColor: `${staticColors.primary}10`,
  },
  ticketTypeName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  ticketTypePrice: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.primary,
    marginBottom: spacing.xs,
  },
  ticketTypeAvailable: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  customerCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  input: {
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  emitButton: {
    marginBottom: spacing.lg,
  },
  emitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  emissionCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  emissionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  emissionLeft: {
    flex: 1,
  },
  emissionCode: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    fontFamily: 'monospace',
  },
  emissionType: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  emissionCustomer: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    marginTop: 2,
  },
  emissionTime: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
});

export default GestoreSIAETicketingConsoleScreen;
