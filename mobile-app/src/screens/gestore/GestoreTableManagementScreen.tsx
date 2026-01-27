import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { EventTable, EventTableStats } from '@/lib/api';

type ViewMode = 'grid' | 'list';
type TableStatus = 'available' | 'reserved' | 'occupied';

interface GestoreTableManagementScreenProps {
  eventId: string;
  onBack: () => void;
}

export function GestoreTableManagementScreen({ eventId, onBack }: GestoreTableManagementScreenProps) {
  const { colors } = useTheme();
  const [tables, setTables] = useState<EventTable[]>([]);
  const [stats, setStats] = useState<EventTableStats>({
    total: 0,
    available: 0,
    reserved: 0,
    occupied: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [tablesData, statsData] = await Promise.all([
        api.getEventTables(eventId),
        api.getEventTableStats(eventId),
      ]);
      setTables(tablesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return staticColors.success;
      case 'reserved':
        return staticColors.warning;
      case 'occupied':
        return staticColors.destructive;
      default:
        return staticColors.mutedForeground;
    }
  };

  const getStatusLabel = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return 'Disponibile';
      case 'reserved':
        return 'Prenotato';
      case 'occupied':
        return 'Occupato';
      default:
        return status;
    }
  };

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return <Badge variant="success">Disponibile</Badge>;
      case 'reserved':
        return <Badge variant="warning">Prenotato</Badge>;
      case 'occupied':
        return <Badge variant="destructive">Occupato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleReserve = (table: EventTable) => {
    triggerHaptic('light');
    Alert.alert(
      'Prenota Tavolo',
      `Vuoi prenotare il tavolo ${table.number}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Prenota',
          onPress: async () => {
            try {
              await api.reserveTable(eventId, table.id);
              loadData();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile prenotare il tavolo');
            }
          },
        },
      ]
    );
  };

  const handleRelease = (table: EventTable) => {
    triggerHaptic('light');
    Alert.alert(
      'Rilascia Tavolo',
      `Vuoi rilasciare il tavolo ${table.number}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rilascia',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.releaseTable(eventId, table.id);
              loadData();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile rilasciare il tavolo');
            }
          },
        },
      ]
    );
  };

  const renderGridItem = ({ item }: { item: EventTable }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        if (item.status === 'available') {
          handleReserve(item);
        } else {
          handleRelease(item);
        }
      }}
      style={styles.gridItem}
      testID={`table-grid-${item.id}`}
    >
      <View style={[styles.tableCircle, { borderColor: getStatusColor(item.status) }]}>
        <Text style={styles.tableNumber}>{item.number}</Text>
        <Text style={styles.tableCapacity}>{item.capacity} posti</Text>
      </View>
      {item.guestName && (
        <Text style={styles.guestNameSmall} numberOfLines={1}>{item.guestName}</Text>
      )}
    </Pressable>
  );

  const renderListItem = ({ item }: { item: EventTable }) => (
    <Card style={styles.listCard} testID={`table-list-${item.id}`}>
      <View style={styles.listContent}>
        <View style={[styles.tableIndicator, { backgroundColor: getStatusColor(item.status) }]} />
        <View style={styles.tableInfo}>
          <Text style={styles.tableTitle}>Tavolo {item.number}</Text>
          <Text style={styles.tableSubtitle}>{item.capacity} posti</Text>
          {item.guestName && (
            <Text style={styles.guestName}>{item.guestName}</Text>
          )}
        </View>
        <View style={styles.tableActions}>
          {getStatusBadge(item.status)}
          <View style={styles.actionButtons}>
            {item.status === 'available' ? (
              <Button
                variant="outline"
                size="sm"
                onPress={() => handleReserve(item)}
                testID={`btn-reserve-${item.id}`}
              >
                <Text style={styles.actionButtonText}>Prenota</Text>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => handleRelease(item)}
                testID={`btn-release-${item.id}`}
              >
                <Text style={[styles.actionButtonText, { color: staticColors.destructive }]}>Rilascia</Text>
              </Button>
            )}
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-table-management"
      />

      {showLoader ? (
        <Loading text="Caricamento tavoli..." />
      ) : (
        <>
          <View style={styles.headerSection}>
            <Text style={styles.title}>Gestione Tavoli</Text>
            <View style={styles.viewToggle}>
              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  setViewMode('grid');
                }}
                style={[styles.toggleButton, viewMode === 'grid' && styles.toggleButtonActive]}
                testID="btn-view-grid"
              >
                <Ionicons
                  name="grid-outline"
                  size={20}
                  color={viewMode === 'grid' ? staticColors.primaryForeground : staticColors.mutedForeground}
                />
              </Pressable>
              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  setViewMode('list');
                }}
                style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
                testID="btn-view-list"
              >
                <Ionicons
                  name="list-outline"
                  size={20}
                  color={viewMode === 'list' ? staticColors.primaryForeground : staticColors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.statsRow}>
            <GlassCard style={styles.miniStatCard} testID="stat-total">
              <Text style={styles.miniStatValue}>{stats.total}</Text>
              <Text style={styles.miniStatLabel}>Totali</Text>
            </GlassCard>
            <GlassCard style={styles.miniStatCardAvailable} testID="stat-available">
              <Text style={styles.miniStatValueSuccess}>{stats.available}</Text>
              <Text style={styles.miniStatLabel}>Disponibili</Text>
            </GlassCard>
            <GlassCard style={styles.miniStatCardReserved} testID="stat-reserved">
              <Text style={styles.miniStatValueWarning}>{stats.reserved}</Text>
              <Text style={styles.miniStatLabel}>Prenotati</Text>
            </GlassCard>
            <GlassCard style={styles.miniStatCardOccupied} testID="stat-occupied">
              <Text style={styles.miniStatValueDestructive}>{stats.occupied}</Text>
              <Text style={styles.miniStatLabel}>Occupati</Text>
            </GlassCard>
          </View>

          {tables.length > 0 ? (
            viewMode === 'grid' ? (
              <FlatList
                data={tables}
                renderItem={renderGridItem}
                keyExtractor={(item) => item.id}
                numColumns={3}
                contentContainerStyle={styles.gridContent}
                columnWrapperStyle={styles.gridRow}
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
              <FlatList
                data={tables}
                renderItem={renderListItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                  />
                }
              />
            )
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="grid-outline" size={64} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Nessun tavolo</Text>
              <Text style={styles.emptyText}>I tavoli dell'evento appariranno qui</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
    padding: 2,
  },
  toggleButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  toggleButtonActive: {
    backgroundColor: staticColors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  miniStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  miniStatCardAvailable: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderColor: staticColors.success,
  },
  miniStatCardReserved: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderColor: staticColors.warning,
  },
  miniStatCardOccupied: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderColor: staticColors.destructive,
  },
  miniStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  miniStatValueSuccess: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.success,
  },
  miniStatValueWarning: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.warning,
  },
  miniStatValueDestructive: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.destructive,
  },
  miniStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  gridContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: spacing.md,
  },
  gridItem: {
    width: '30%',
    alignItems: 'center',
  },
  tableCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    backgroundColor: staticColors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableNumber: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  tableCapacity: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  guestNameSmall: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 80,
  },
  listContentContainer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  listCard: {
    padding: spacing.md,
  },
  listCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: spacing.md,
  },
  tableInfo: {
    flex: 1,
  },
  tableTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  tableSubtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  guestName: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    marginTop: spacing.xs,
  },
  tableActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
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

export default GestoreTableManagementScreen;
