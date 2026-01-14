import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Header, Card } from '../../components';

interface ScanRecord {
  id: string;
  ticketCode: string;
  holderName: string;
  ticketType: string;
  scanTime: string;
  status: 'valid' | 'invalid' | 'duplicate';
  scannedBy: string;
}

const FILTERS = [
  { id: 'all', label: 'Tutti', icon: 'list-outline' },
  { id: 'valid', label: 'Validi', icon: 'checkmark-circle-outline' },
  { id: 'invalid', label: 'Non Validi', icon: 'close-circle-outline' },
  { id: 'duplicate', label: 'Duplicati', icon: 'copy-outline' },
];

export function ScannerHistoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const { eventId } = route.params || {};
  const [activeFilter, setActiveFilter] = useState('all');

  const { data: scans, isLoading, refetch, isRefetching } = useQuery<ScanRecord[]>({
    queryKey: ['/api/scanner/history', eventId, activeFilter],
  });

  const handleFilterPress = useCallback((filterId: string) => {
    setActiveFilter(filterId);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return colors.success;
      case 'invalid':
        return colors.destructive;
      case 'duplicate':
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return 'checkmark-circle';
      case 'invalid':
        return 'close-circle';
      case 'duplicate':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'valid':
        return 'Valido';
      case 'invalid':
        return 'Non Valido';
      case 'duplicate':
        return 'Duplicato';
      default:
        return 'Sconosciuto';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  };

  const renderScanItem = useCallback(({ item }: { item: ScanRecord }) => (
    <Card style={styles.scanCard}>
      <View style={styles.scanHeader}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons name={getStatusIcon(item.status) as any} size={20} color={colors.foreground} />
        </View>
        <View style={styles.scanInfo}>
          <Text style={styles.holderName}>{item.holderName}</Text>
          <Text style={styles.ticketCode}>{item.ticketCode}</Text>
        </View>
        <View style={styles.timeInfo}>
          <Text style={styles.scanTime}>{formatTime(item.scanTime)}</Text>
          <Text style={styles.scanDate}>{formatDate(item.scanTime)}</Text>
        </View>
      </View>
      
      <View style={styles.scanDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="ticket-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.detailText}>{item.ticketType}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  ), []);

  const filteredScans = scans || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Storico Scansioni"
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.filtersContainer}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === item.id && styles.filterChipActive,
              ]}
              onPress={() => handleFilterPress(item.id)}
              data-testid={`button-filter-${item.id}`}
            >
              <Ionicons
                name={item.icon as any}
                size={16}
                color={activeFilter === item.id ? colors.primaryForeground : colors.foreground}
              />
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === item.id && styles.filterChipTextActive,
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
          styles.scansList,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterChipTextActive: {
    color: colors.primaryForeground,
  },
  scansList: {
    padding: spacing.lg,
  },
  scanCard: {
    padding: spacing.md,
  },
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  holderName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  ticketCode: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  scanTime: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  scanDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  scanDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
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
    paddingVertical: spacing.xxl,
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
});
