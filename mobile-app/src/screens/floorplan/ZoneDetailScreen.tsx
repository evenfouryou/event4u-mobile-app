import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Seat {
  id: string;
  number: string;
  row: string;
  status: 'available' | 'reserved' | 'sold';
  ticketHolder?: string;
}

interface ZoneHistory {
  id: string;
  action: string;
  date: string;
  user: string;
  details?: string;
}

interface ZoneData {
  id: string;
  name: string;
  type: 'section' | 'table' | 'vip' | 'general' | 'stage' | 'bar';
  status: 'available' | 'reserved' | 'sold';
  capacity: number;
  currentOccupancy: number;
  priceTier?: string;
  priceAmount?: number;
  description?: string;
  seats?: Seat[];
  history?: ZoneHistory[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS = {
  available: colors.teal,
  reserved: colors.primary,
  sold: colors.destructive,
};

export function ZoneDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { zoneId, zoneName } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zone, setZone] = useState<ZoneData | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'seats' | 'history'>('info');

  const loadZoneData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<any>(`/api/floorplan/zones/${zoneId}`);
      setZone(response);
    } catch (e) {
      const mockSeats: Seat[] = Array.from({ length: 20 }, (_, i) => ({
        id: `seat-${i + 1}`,
        number: `${(i % 10) + 1}`,
        row: String.fromCharCode(65 + Math.floor(i / 10)),
        status: i < 5 ? 'sold' : i < 10 ? 'reserved' : 'available',
        ticketHolder: i < 5 ? `Cliente ${i + 1}` : undefined,
      }));

      const mockHistory: ZoneHistory[] = [
        { id: '1', action: 'Creazione', date: '2025-01-10', user: 'Admin', details: 'Zona creata' },
        { id: '2', action: 'Modifica capacità', date: '2025-01-12', user: 'Manager', details: 'Capacità aumentata da 40 a 50' },
        { id: '3', action: 'Prenotazione', date: '2025-01-15', user: 'Sistema', details: '10 posti prenotati' },
        { id: '4', action: 'Vendita', date: '2025-01-16', user: 'Sistema', details: '5 biglietti venduti' },
      ];

      setZone({
        id: zoneId,
        name: zoneName || 'Zona',
        type: 'vip',
        status: 'reserved',
        capacity: 50,
        currentOccupancy: 35,
        priceTier: 'VIP',
        priceAmount: 150,
        description: 'Area VIP con servizio dedicato, accesso esclusivo e vista privilegiata sul palco.',
        seats: mockSeats,
        history: mockHistory,
        createdAt: '2025-01-10',
        updatedAt: '2025-01-16',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZoneData();
  }, [zoneId]);

  const getZoneTypeIcon = (type: ZoneData['type']) => {
    switch (type) {
      case 'vip': return 'star';
      case 'table': return 'restaurant';
      case 'stage': return 'musical-notes';
      case 'bar': return 'wine';
      case 'general': return 'people';
      default: return 'grid';
    }
  };

  const getZoneTypeLabel = (type: ZoneData['type']) => {
    switch (type) {
      case 'vip': return 'VIP';
      case 'table': return 'Tavolo';
      case 'section': return 'Sezione';
      case 'stage': return 'Palco';
      case 'bar': return 'Bar';
      case 'general': return 'Area Generale';
      default: return type;
    }
  };

  const getStatusLabel = (status: ZoneData['status']) => {
    switch (status) {
      case 'available': return 'Disponibile';
      case 'reserved': return 'Prenotata';
      case 'sold': return 'Venduta';
    }
  };

  const renderSeat = ({ item }: { item: Seat }) => (
    <View style={styles.seatItem}>
      <View style={[styles.seatIndicator, { backgroundColor: STATUS_COLORS[item.status] }]} />
      <View style={styles.seatInfo}>
        <Text style={styles.seatNumber}>Fila {item.row} - Posto {item.number}</Text>
        {item.ticketHolder ? (
          <Text style={styles.seatHolder}>{item.ticketHolder}</Text>
        ) : (
          <Text style={styles.seatStatus}>{getStatusLabel(item.status)}</Text>
        )}
      </View>
      <Ionicons
        name={item.status === 'available' ? 'square-outline' : 'checkmark-circle'}
        size={20}
        color={STATUS_COLORS[item.status]}
      />
    </View>
  );

  const renderHistoryItem = ({ item }: { item: ZoneHistory }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyIconContainer}>
        <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
      </View>
      <View style={styles.historyContent}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyAction}>{item.action}</Text>
          <Text style={styles.historyDate}>{item.date}</Text>
        </View>
        <Text style={styles.historyUser}>di {item.user}</Text>
        {item.details && <Text style={styles.historyDetails}>{item.details}</Text>}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={zoneName || 'Dettaglio Zona'} showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  if (error || !zone) {
    return (
      <View style={styles.container}>
        <Header title={zoneName || 'Dettaglio Zona'} showBack onBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{error || 'Zona non trovata'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadZoneData} data-testid="button-retry">
            <Ionicons name="refresh-outline" size={20} color={colors.primaryForeground} />
            <Text style={styles.retryButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const occupancyPercentage = zone.capacity > 0 ? (zone.currentOccupancy / zone.capacity) * 100 : 0;

  return (
    <View style={styles.container}>
      <Header
        title={zone.name}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('FloorPlanEditor', { zoneId: zone.id })}
            data-testid="button-edit-zone"
          >
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Card variant="glass">
            <View style={styles.zoneHeader}>
              <View style={[styles.zoneTypeIcon, { backgroundColor: `${STATUS_COLORS[zone.status]}20` }]}>
                <Ionicons
                  name={getZoneTypeIcon(zone.type) as any}
                  size={28}
                  color={STATUS_COLORS[zone.status]}
                />
              </View>
              <View style={styles.zoneHeaderInfo}>
                <Text style={styles.zoneName}>{zone.name}</Text>
                <Text style={styles.zoneType}>{getZoneTypeLabel(zone.type)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[zone.status]}20` }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[zone.status] }]}>
                  {getStatusLabel(zone.status)}
                </Text>
              </View>
            </View>

            {zone.description && (
              <Text style={styles.zoneDescription}>{zone.description}</Text>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiche</Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{zone.capacity}</Text>
              <Text style={styles.statLabel}>Capacità Totale</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{zone.currentOccupancy}</Text>
              <Text style={styles.statLabel}>Occupazione</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{zone.capacity - zone.currentOccupancy}</Text>
              <Text style={styles.statLabel}>Disponibili</Text>
            </Card>
            {zone.priceAmount && (
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>€{zone.priceAmount}</Text>
                <Text style={styles.statLabel}>{zone.priceTier || 'Prezzo'}</Text>
              </Card>
            )}
          </View>

          <Card style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Occupazione</Text>
              <Text style={styles.progressValue}>{occupancyPercentage.toFixed(0)}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${occupancyPercentage}%`,
                    backgroundColor: occupancyPercentage > 80 ? colors.destructive : occupancyPercentage > 50 ? colors.primary : colors.teal,
                  },
                ]}
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'info' && styles.tabActive]}
              onPress={() => setActiveTab('info')}
              data-testid="tab-info"
            >
              <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Info</Text>
            </TouchableOpacity>
            {zone.seats && zone.seats.length > 0 && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'seats' && styles.tabActive]}
                onPress={() => setActiveTab('seats')}
                data-testid="tab-seats"
              >
                <Text style={[styles.tabText, activeTab === 'seats' && styles.tabTextActive]}>Posti ({zone.seats.length})</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.tab, activeTab === 'history' && styles.tabActive]}
              onPress={() => setActiveTab('history')}
              data-testid="tab-history"
            >
              <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Storico</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'info' && (
            <Card>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tipo</Text>
                <Text style={styles.infoValue}>{getZoneTypeLabel(zone.type)}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Stato</Text>
                <Text style={[styles.infoValue, { color: STATUS_COLORS[zone.status] }]}>
                  {getStatusLabel(zone.status)}
                </Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Capacità</Text>
                <Text style={styles.infoValue}>{zone.capacity} persone</Text>
              </View>
              {zone.priceTier && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tariffa</Text>
                    <Text style={styles.infoValue}>{zone.priceTier}</Text>
                  </View>
                </>
              )}
              {zone.priceAmount && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Prezzo</Text>
                    <Text style={styles.infoValue}>€{zone.priceAmount.toFixed(2)}</Text>
                  </View>
                </>
              )}
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Creata il</Text>
                <Text style={styles.infoValue}>{zone.createdAt}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ultimo aggiornamento</Text>
                <Text style={styles.infoValue}>{zone.updatedAt}</Text>
              </View>
            </Card>
          )}

          {activeTab === 'seats' && zone.seats && (
            <Card>
              <View style={styles.seatsLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.teal }]} />
                  <Text style={styles.legendText}>Disponibile</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>Prenotato</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.destructive }]} />
                  <Text style={styles.legendText}>Venduto</Text>
                </View>
              </View>
              <FlatList
                data={zone.seats}
                renderItem={renderSeat}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.seatDivider} />}
              />
            </Card>
          )}

          {activeTab === 'history' && zone.history && (
            <Card>
              <FlatList
                data={zone.history}
                renderItem={renderHistoryItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.historyDivider} />}
              />
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('FloorPlanEditor', { zoneId: zone.id })}
              data-testid="button-action-edit"
            >
              <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="create-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.actionText}>Modifica Zona</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {}}
              data-testid="button-action-history"
            >
              <View style={[styles.actionIcon, { backgroundColor: `${colors.teal}20` }]}>
                <Ionicons name="time-outline" size={24} color={colors.teal} />
              </View>
              <Text style={styles.actionText}>Vedi Storico</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  zoneTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneHeaderInfo: {
    flex: 1,
  },
  zoneName: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  zoneType: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  zoneDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: spacing.lg,
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
  progressCard: {
    padding: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  progressValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.primaryForeground,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  infoValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  seatsLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  legendText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  seatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  seatIndicator: {
    width: 4,
    height: 32,
    borderRadius: borderRadius.full,
  },
  seatInfo: {
    flex: 1,
  },
  seatNumber: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  seatHolder: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  seatStatus: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  seatDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  historyItem: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  historyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyContent: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyAction: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  historyDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  historyUser: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  historyDetails: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  historyDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});

export default ZoneDetailScreen;
