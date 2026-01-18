import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Header, Card } from '../../components';

interface ScanRecord {
  id: string;
  ticketCode: string;
  ticketId: string;
  holderName: string;
  ticketType: string;
  timestamp: string;
  result: 'success' | 'error' | 'duplicate';
  operatorId: string;
  operatorName: string;
  eventId: string;
  eventTitle: string;
  scanType: 'entry' | 'exit' | 'manual';
}

interface Event {
  id: string;
  title: string;
}

interface Operator {
  id: string;
  name: string;
}

interface ScanStats {
  totalScans: number;
  successRate: number;
  avgScanSpeed: number;
  peakHour: string;
}

const RESULT_FILTERS = [
  { id: 'all', label: 'Tutti', icon: 'list-outline' },
  { id: 'success', label: 'Successo', icon: 'checkmark-circle-outline' },
  { id: 'error', label: 'Errore', icon: 'close-circle-outline' },
  { id: 'duplicate', label: 'Duplicati', icon: 'copy-outline' },
];

export function ScanActivityScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [resultFilter, setResultFilter] = useState('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const { data: scans, isLoading, refetch, isRefetching } = useQuery<ScanRecord[]>({
    queryKey: ['/api/scans', resultFilter, selectedEventId, selectedOperatorId, selectedDate],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/scanner/events'],
  });

  const { data: operators } = useQuery<Operator[]>({
    queryKey: ['/api/scanners/list'],
  });

  const { data: stats } = useQuery<ScanStats>({
    queryKey: ['/api/scans/stats', selectedEventId, selectedOperatorId, selectedDate],
  });

  const scanStats = stats || {
    totalScans: 0,
    successRate: 0,
    avgScanSpeed: 0,
    peakHour: '--:--',
  };

  const filteredScans = useMemo(() => {
    let result = scans || [];
    if (resultFilter !== 'all') {
      result = result.filter(scan => scan.result === resultFilter);
    }
    return result;
  }, [scans, resultFilter]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedEventId) count++;
    if (selectedOperatorId) count++;
    if (selectedDate) count++;
    return count;
  }, [selectedEventId, selectedOperatorId, selectedDate]);

  const getResultColor = (result: string) => {
    switch (result) {
      case 'success':
        return colors.teal;
      case 'error':
        return colors.destructive;
      case 'duplicate':
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'duplicate':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const getScanTypeIcon = (type: string) => {
    switch (type) {
      case 'entry':
        return 'enter-outline';
      case 'exit':
        return 'exit-outline';
      case 'manual':
        return 'create-outline';
      default:
        return 'scan-outline';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const clearFilters = useCallback(() => {
    setSelectedEventId(null);
    setSelectedOperatorId(null);
    setSelectedDate(null);
    setShowFilterModal(false);
  }, []);

  const renderScanItem = useCallback(({ item }: { item: ScanRecord }) => (
    <Card style={styles.scanCard}>
      <View style={styles.scanHeader}>
        <View style={[styles.resultIndicator, { backgroundColor: getResultColor(item.result) }]}>
          <Ionicons name={getResultIcon(item.result) as any} size={20} color={colors.foreground} />
        </View>
        <View style={styles.scanMainInfo}>
          <Text style={styles.ticketId}>{item.ticketCode}</Text>
          <Text style={styles.holderName}>{item.holderName}</Text>
        </View>
        <View style={styles.timeInfo}>
          <Text style={styles.scanTime}>{formatTime(item.timestamp)}</Text>
          <Text style={styles.scanDate}>{formatDate(item.timestamp)}</Text>
        </View>
      </View>

      <View style={styles.scanDetails}>
        <View style={styles.detailItem}>
          <Ionicons name={getScanTypeIcon(item.scanType) as any} size={14} color={colors.mutedForeground} />
          <Text style={styles.detailText}>
            {item.scanType === 'entry' ? 'Entrata' : item.scanType === 'exit' ? 'Uscita' : 'Manuale'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
          <Text style={styles.detailText} numberOfLines={1}>{item.operatorName}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
          <Text style={styles.detailText} numberOfLines={1}>{item.eventTitle}</Text>
        </View>
      </View>
    </Card>
  ), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Attività Scansioni"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
            onPress={() => setShowFilterModal(true)}
            data-testid="button-filters"
          >
            <Ionicons name="filter" size={20} color={activeFiltersCount > 0 ? colors.emeraldForeground : colors.foreground} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{scanStats.totalScans}</Text>
          <Text style={styles.statLabel}>Scansioni</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.teal }]}>{scanStats.successRate}%</Text>
          <Text style={styles.statLabel}>Successo</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{scanStats.avgScanSpeed}s</Text>
          <Text style={styles.statLabel}>Media</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{scanStats.peakHour}</Text>
          <Text style={styles.statLabel}>Picco</Text>
        </Card>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          data={RESULT_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                resultFilter === item.id && styles.filterChipActive,
              ]}
              onPress={() => setResultFilter(item.id)}
              data-testid={`button-result-filter-${item.id}`}
            >
              <Ionicons
                name={item.icon as any}
                size={16}
                color={resultFilter === item.id ? colors.emeraldForeground : colors.foreground}
              />
              <Text
                style={[
                  styles.filterChipText,
                  resultFilter === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredScans}
        renderItem={renderScanItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.emerald}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.skeletonCard} />
              ))}
            </View>
          ) : (
            <Card style={styles.emptyCard}>
              <Ionicons name="scan-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Nessuna scansione</Text>
              <Text style={styles.emptyText}>
                Le scansioni effettuate appariranno qui
              </Text>
            </Card>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtri Avanzati</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} data-testid="button-close-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Evento</Text>
              <FlatList
                data={[{ id: null, title: 'Tutti gli eventi' }, ...(events || [])]}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id || 'all'}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      selectedEventId === item.id && styles.filterOptionActive,
                    ]}
                    onPress={() => setSelectedEventId(item.id)}
                    data-testid={`filter-event-${item.id || 'all'}`}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedEventId === item.id && styles.filterOptionTextActive,
                    ]}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Operatore</Text>
              <FlatList
                data={[{ id: null, name: 'Tutti gli operatori' }, ...(operators || [])]}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id || 'all'}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      selectedOperatorId === item.id && styles.filterOptionActive,
                    ]}
                    onPress={() => setSelectedOperatorId(item.id)}
                    data-testid={`filter-operator-${item.id || 'all'}`}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedOperatorId === item.id && styles.filterOptionTextActive,
                    ]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters} data-testid="button-clear-filters">
                <Text style={styles.clearButtonText}>Cancella Filtri</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
                data-testid="button-apply-filters"
              >
                <Text style={styles.applyButtonText}>Applica</Text>
              </TouchableOpacity>
            </View>
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: colors.foreground,
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  filtersContainer: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  filterChipText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterChipTextActive: {
    color: colors.emeraldForeground,
  },
  list: {
    padding: spacing.lg,
  },
  scanCard: {
    padding: spacing.md,
  },
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIndicator: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanMainInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  ticketId: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    fontFamily: 'monospace',
  },
  holderName: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  scanTime: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  scanDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  scanDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    maxWidth: 100,
  },
  separator: {
    height: spacing.md,
  },
  loadingContainer: {
    gap: spacing.md,
  },
  skeletonCard: {
    height: 120,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    marginTop: spacing.xl,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  filterSection: {
    marginBottom: spacing.xl,
  },
  filterSectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  filterOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterOptionActive: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  filterOptionText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  filterOptionTextActive: {
    color: colors.emeraldForeground,
    fontWeight: fontWeight.semibold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  clearButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  applyButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.emerald,
    alignItems: 'center',
  },
  applyButtonText: {
    color: colors.emeraldForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
