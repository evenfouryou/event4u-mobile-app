import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header } from '../../components';

interface ScannedTicket {
  id: string;
  ticketCode: string;
  ticketType: string;
  holderName: string;
  scannedAt: string;
  scanResult: 'valid' | 'invalid' | 'duplicate' | 'expired';
  gate: string;
  operatorId: string;
  operatorName: string;
}

interface SessionStats {
  totalScanned: number;
  validScans: number;
  invalidScans: number;
  duplicateScans: number;
  expiredScans: number;
  duration: string;
}

const SCAN_RESULT_CONFIG = {
  valid: { label: 'Valido', color: colors.teal, icon: 'checkmark-circle' },
  invalid: { label: 'Non Valido', color: colors.destructive, icon: 'close-circle' },
  duplicate: { label: 'Duplicato', color: colors.warning, icon: 'copy' },
  expired: { label: 'Scaduto', color: colors.mutedForeground, icon: 'time' },
};

export default function ScannerScannedScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const sessionId = route.params?.sessionId;
  const [refreshing, setRefreshing] = useState(false);
  const [filterResult, setFilterResult] = useState<string | null>(null);

  const { data: scannedTickets, refetch: refetchTickets } = useQuery<ScannedTicket[]>({
    queryKey: ['/api/scanner/session', sessionId, 'scanned'],
  });

  const { data: sessionStats, refetch: refetchStats } = useQuery<SessionStats>({
    queryKey: ['/api/scanner/session', sessionId, 'stats'],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTickets(), refetchStats()]);
    setRefreshing(false);
  }, [refetchTickets, refetchStats]);

  const mockTickets: ScannedTicket[] = scannedTickets || [
    { id: '1', ticketCode: 'TKT-001234', ticketType: 'VIP', holderName: 'Marco Rossi', scannedAt: '22:45:32', scanResult: 'valid', gate: 'Ingresso A', operatorId: 'op1', operatorName: 'Luigi' },
    { id: '2', ticketCode: 'TKT-001235', ticketType: 'Standard', holderName: 'Anna Bianchi', scannedAt: '22:44:18', scanResult: 'valid', gate: 'Ingresso A', operatorId: 'op1', operatorName: 'Luigi' },
    { id: '3', ticketCode: 'TKT-001236', ticketType: 'Standard', holderName: 'Paolo Verde', scannedAt: '22:43:55', scanResult: 'duplicate', gate: 'Ingresso B', operatorId: 'op2', operatorName: 'Maria' },
    { id: '4', ticketCode: 'TKT-000999', ticketType: 'Early Bird', holderName: 'Sara Neri', scannedAt: '22:42:10', scanResult: 'expired', gate: 'Ingresso A', operatorId: 'op1', operatorName: 'Luigi' },
    { id: '5', ticketCode: 'FAKE-12345', ticketType: 'Unknown', holderName: '-', scannedAt: '22:41:30', scanResult: 'invalid', gate: 'Ingresso A', operatorId: 'op1', operatorName: 'Luigi' },
    { id: '6', ticketCode: 'TKT-001237', ticketType: 'VIP', holderName: 'Giulia Russo', scannedAt: '22:40:05', scanResult: 'valid', gate: 'Ingresso VIP', operatorId: 'op3', operatorName: 'Francesco' },
  ];

  const mockStats: SessionStats = sessionStats || {
    totalScanned: mockTickets.length,
    validScans: mockTickets.filter(t => t.scanResult === 'valid').length,
    invalidScans: mockTickets.filter(t => t.scanResult === 'invalid').length,
    duplicateScans: mockTickets.filter(t => t.scanResult === 'duplicate').length,
    expiredScans: mockTickets.filter(t => t.scanResult === 'expired').length,
    duration: '01:45:22',
  };

  const filteredTickets = filterResult
    ? mockTickets.filter(t => t.scanResult === filterResult)
    : mockTickets;

  const renderFilterPill = (resultType: string | null, label: string, count: number) => (
    <TouchableOpacity
      style={[
        styles.filterPill,
        filterResult === resultType && styles.filterPillActive,
      ]}
      onPress={() => setFilterResult(filterResult === resultType ? null : resultType)}
      data-testid={`filter-${resultType || 'all'}`}
    >
      <Text
        style={[
          styles.filterPillText,
          filterResult === resultType && styles.filterPillTextActive,
        ]}
      >
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderTicketCard = ({ item }: { item: ScannedTicket }) => {
    const resultConfig = SCAN_RESULT_CONFIG[item.scanResult];

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('TicketDetail', { ticketCode: item.ticketCode })}
        activeOpacity={0.8}
        data-testid={`card-scanned-${item.id}`}
      >
        <Card variant="glass" style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View style={[styles.resultIcon, { backgroundColor: `${resultConfig.color}20` }]}>
              <Ionicons name={resultConfig.icon as any} size={20} color={resultConfig.color} />
            </View>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketCode}>{item.ticketCode}</Text>
              <Text style={styles.holderName}>{item.holderName}</Text>
            </View>
            <View style={styles.ticketMeta}>
              <Text style={styles.scanTime}>{item.scannedAt}</Text>
              <View style={[styles.resultBadge, { backgroundColor: `${resultConfig.color}20` }]}>
                <Text style={[styles.resultText, { color: resultConfig.color }]}>
                  {resultConfig.label}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.ticketDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="pricetag-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.detailText}>{item.ticketType}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="enter-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.detailText}>{item.gate}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.detailText}>{item.operatorName}</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Biglietti Scansionati"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('ExportScans', { sessionId })}
            data-testid="button-export"
          >
            <Ionicons name="download-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <Card variant="glass" style={styles.mainStatCard}>
            <Text style={styles.mainStatValue}>{mockStats.totalScanned}</Text>
            <Text style={styles.mainStatLabel}>Totale Scansioni</Text>
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={12} color={colors.emerald} />
              <Text style={styles.durationText}>{mockStats.duration}</Text>
            </View>
          </Card>
        </View>

        <View style={styles.statsRow}>
          <Card variant="glass" style={[styles.statCard, styles.statCardSmall]}>
            <View style={[styles.statDot, { backgroundColor: colors.teal }]} />
            <Text style={styles.statValue}>{mockStats.validScans}</Text>
            <Text style={styles.statLabel}>Validi</Text>
          </Card>
          <Card variant="glass" style={[styles.statCard, styles.statCardSmall]}>
            <View style={[styles.statDot, { backgroundColor: colors.destructive }]} />
            <Text style={styles.statValue}>{mockStats.invalidScans}</Text>
            <Text style={styles.statLabel}>Non Validi</Text>
          </Card>
          <Card variant="glass" style={[styles.statCard, styles.statCardSmall]}>
            <View style={[styles.statDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.statValue}>{mockStats.duplicateScans}</Text>
            <Text style={styles.statLabel}>Duplicati</Text>
          </Card>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        {renderFilterPill(null, 'Tutti', mockStats.totalScanned)}
        {renderFilterPill('valid', 'Validi', mockStats.validScans)}
        {renderFilterPill('invalid', 'Non Validi', mockStats.invalidScans)}
        {renderFilterPill('duplicate', 'Duplicati', mockStats.duplicateScans)}
      </View>

      <FlatList
        data={filteredTickets}
        renderItem={renderTicketCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          <Card style={styles.emptyCard} variant="glass">
            <Ionicons name="scan-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessuna scansione</Text>
            <Text style={styles.emptyText}>I biglietti scansionati appariranno qui</Text>
          </Card>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statsContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mainStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  mainStatValue: {
    color: colors.foreground,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  mainStatLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: `${colors.emerald}20`,
    borderRadius: borderRadius.full,
  },
  durationText: {
    color: colors.emerald,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statCardSmall: {
    paddingVertical: spacing.lg,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  filterPillText: {
    color: colors.foreground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  filterPillTextActive: {
    color: colors.emeraldForeground,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
  },
  ticketCard: {
    paddingVertical: spacing.lg,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketInfo: {
    flex: 1,
  },
  ticketCode: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  holderName: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  ticketMeta: {
    alignItems: 'flex-end',
  },
  scanTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  resultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  resultText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  ticketDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
});
