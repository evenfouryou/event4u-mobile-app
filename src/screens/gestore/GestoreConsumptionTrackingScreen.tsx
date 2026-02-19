import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { ConsumptionData, CashierEvent } from '@/lib/api';

interface GestoreConsumptionTrackingScreenProps {
  onBack: () => void;
}

type StationFilter = 'all' | 'bar' | 'food' | 'vip';

export function GestoreConsumptionTrackingScreen({ onBack }: GestoreConsumptionTrackingScreenProps) {
  const { colors } = useTheme();
  const [consumptionData, setConsumptionData] = useState<ConsumptionData>({
    eventId: '',
    eventName: '',
    totalSales: 0,
    totalTransactions: 0,
    stations: [],
  });
  const [events, setEvents] = useState<CashierEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<StationFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadConsumptionData();
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
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadConsumptionData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getConsumptionData(selectedEvent || undefined);
      setConsumptionData(data);
    } catch (error) {
      console.error('Error loading consumption data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConsumptionData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getFilteredStations = () => {
    if (selectedFilter === 'all') {
      return consumptionData.stations;
    }
    return consumptionData.stations.filter(
      station => station.type.toLowerCase() === selectedFilter.toLowerCase()
    );
  };

  const getStationTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type.toLowerCase()) {
      case 'bar':
        return 'wine-outline';
      case 'food':
        return 'restaurant-outline';
      case 'vip':
        return 'star-outline';
      default:
        return 'storefront-outline';
    }
  };

  const getStationTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bar':
        return staticColors.primary;
      case 'food':
        return staticColors.teal;
      case 'vip':
        return staticColors.golden;
      default:
        return staticColors.mutedForeground;
    }
  };

  const selectedEventData = events.find(e => e.id === selectedEvent);
  const avgTransaction = consumptionData.totalTransactions > 0
    ? consumptionData.totalSales / consumptionData.totalTransactions
    : 0;

  const filterOptions: { key: StationFilter; label: string }[] = [
    { key: 'all', label: 'Tutti' },
    { key: 'bar', label: 'Bar' },
    { key: 'food', label: 'Food' },
    { key: 'vip', label: 'VIP' },
  ];

  const filteredStations = getFilteredStations();

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-consumption-tracking"
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
          <View style={styles.titleRow}>
            <Text style={styles.title}>Tracciamento Consumo</Text>
            <View style={styles.liveIndicator}>
              <Animated.View
                style={[
                  styles.liveDot,
                  { opacity: pulseAnim },
                ]}
              />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Monitoraggio vendite in tempo reale</Text>
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
          <Loading text="Caricamento dati consumo..." />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                  <Ionicons name="cash" size={20} color={staticColors.success} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(consumptionData.totalSales)}</Text>
                <Text style={styles.statLabel}>Vendite Totali</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                  <Ionicons name="receipt" size={20} color={staticColors.primary} />
                </View>
                <Text style={styles.statValue}>{consumptionData.totalTransactions}</Text>
                <Text style={styles.statLabel}>Transazioni</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                  <Ionicons name="analytics" size={20} color={staticColors.teal} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(avgTransaction)}</Text>
                <Text style={styles.statLabel}>Media Transazione</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
                  <Ionicons name="storefront" size={20} color={staticColors.golden} />
                </View>
                <Text style={styles.statValue}>{consumptionData.stations.length}</Text>
                <Text style={styles.statLabel}>Stazioni Attive</Text>
              </GlassCard>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Filtra per Tipo</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                {filterOptions.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSelectedFilter(option.key);
                    }}
                    style={[
                      styles.filterButton,
                      selectedFilter === option.key && styles.filterButtonActive,
                    ]}
                    testID={`filter-${option.key}`}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        selectedFilter === option.key && styles.filterButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stazioni ({filteredStations.length})</Text>

              {filteredStations.length > 0 ? (
                filteredStations.map((station) => (
                  <Card key={station.id} style={styles.stationCard} testID={`station-${station.id}`}>
                    <View style={styles.stationHeader}>
                      <View style={styles.stationInfo}>
                        <View
                          style={[
                            styles.stationIcon,
                            { backgroundColor: `${getStationTypeColor(station.type)}20` },
                          ]}
                        >
                          <Ionicons
                            name={getStationTypeIcon(station.type)}
                            size={20}
                            color={getStationTypeColor(station.type)}
                          />
                        </View>
                        <View style={styles.stationDetails}>
                          <Text style={styles.stationName}>{station.name}</Text>
                          <Badge variant="outline">
                            <Text style={styles.stationTypeBadge}>{station.type}</Text>
                          </Badge>
                        </View>
                      </View>
                      <Text style={styles.stationSales}>{formatCurrency(station.sales)}</Text>
                    </View>

                    <View style={styles.stationStats}>
                      <View style={styles.stationStatItem}>
                        <Text style={styles.stationStatLabel}>Transazioni</Text>
                        <Text style={styles.stationStatValue}>{station.transactions}</Text>
                      </View>
                      <View style={styles.stationStatItem}>
                        <Text style={styles.stationStatLabel}>Media</Text>
                        <Text style={styles.stationStatValue}>
                          {station.transactions > 0
                            ? formatCurrency(station.sales / station.transactions)
                            : formatCurrency(0)}
                        </Text>
                      </View>
                    </View>

                    {station.topProducts && station.topProducts.length > 0 && (
                      <View style={styles.topProducts}>
                        <Text style={styles.topProductsTitle}>Prodotti Top</Text>
                        <View style={styles.topProductsList}>
                          {station.topProducts.slice(0, 3).map((product, index) => (
                            <View key={index} style={styles.topProductItem}>
                              <Text style={styles.topProductName}>{product.name}</Text>
                              <Text style={styles.topProductQty}>x{product.quantity}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </Card>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <View style={styles.emptyContent}>
                    <Ionicons name="storefront-outline" size={48} color={colors.mutedForeground} />
                    <Text style={styles.emptyTitle}>Nessuna stazione</Text>
                    <Text style={styles.emptyText}>
                      {selectedFilter === 'all'
                        ? 'Le stazioni appariranno qui'
                        : `Nessuna stazione di tipo ${selectedFilter}`}
                    </Text>
                  </View>
                </Card>
              )}
            </View>
          </>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${staticColors.success}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: staticColors.success,
  },
  liveText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.success,
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
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  filterSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  filterLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
  },
  filterScroll: {
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  filterButtonActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  filterButtonTextActive: {
    color: staticColors.primaryForeground,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  stationCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  stationIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationDetails: {
    flex: 1,
    gap: spacing.xs,
  },
  stationName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  stationTypeBadge: {
    fontSize: typography.fontSize.xs,
    textTransform: 'uppercase',
  },
  stationSales: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.success,
  },
  stationStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    gap: spacing.lg,
  },
  stationStatItem: {
    flex: 1,
  },
  stationStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  stationStatValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: 2,
  },
  topProducts: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  topProductsTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.mutedForeground,
    marginBottom: spacing.sm,
  },
  topProductsList: {
    gap: spacing.xs,
  },
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${staticColors.muted}50`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  topProductName: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  topProductQty: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primary,
  },
  emptyCard: {
    padding: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
});
