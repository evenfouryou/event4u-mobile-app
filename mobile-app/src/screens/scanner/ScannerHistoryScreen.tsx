import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

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

  const numColumns = (isTablet || isLandscape) ? 2 : 1;
  const contentMaxWidth = isTablet ? 1200 : undefined;

  const renderScanItem = useCallback(({ item, index }: { item: ScanRecord; index: number }) => (
    <Card 
      style={[
        styles.scanCard,
        numColumns === 2 && {
          flex: 1,
          marginLeft: index % 2 === 1 ? spacing.md / 2 : 0,
          marginRight: index % 2 === 0 ? spacing.md / 2 : 0,
        }
      ]} 
      testID={`card-scan-${item.id}`}
    >
      <View style={styles.scanHeader}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons name={getStatusIcon(item.status) as any} size={20} color={colors.foreground} />
        </View>
        <View style={styles.scanInfo}>
          <Text style={styles.holderName} testID={`text-holder-${item.id}`}>{item.holderName}</Text>
          <Text style={styles.ticketCode} testID={`text-code-${item.id}`}>{item.ticketCode}</Text>
        </View>
        <View style={styles.timeInfo}>
          <Text style={styles.scanTime} testID={`text-time-${item.id}`}>{formatTime(item.scanTime)}</Text>
          <Text style={styles.scanDate} testID={`text-date-${item.id}`}>{formatDate(item.scanTime)}</Text>
        </View>
      </View>
      
      <View style={styles.scanDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="ticket-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.detailText} testID={`text-type-${item.id}`}>{item.ticketType}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]} testID={`text-status-${item.id}`}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  ), [numColumns]);

  const filteredScans = scans || [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Storico Scansioni"
        showBack
        onBack={() => navigation.goBack()}
        testID="header-history"
      />

      <View style={styles.filtersContainer}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          keyExtractor={(item) => item.id}
          testID="list-filters"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === item.id && styles.filterChipActive,
              ]}
              onPress={() => handleFilterPress(item.id)}
              testID={`button-filter-${item.id}`}
            >
              <Ionicons
                name={item.icon as any}
                size={16}
                color={activeFilter === item.id ? colors.emeraldForeground : colors.foreground}
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
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={[
          styles.scansList,
          { maxWidth: contentMaxWidth, alignSelf: contentMaxWidth ? 'center' : undefined, width: contentMaxWidth ? '100%' : undefined }
        ]}
        showsVerticalScrollIndicator={false}
        testID="list-scans"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.emerald}
            testID="refresh-history"
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.skeletonCard} testID={`skeleton-${i}`} />
              ))}
            </View>
          ) : (
            <Card style={styles.emptyCard} testID="card-empty">
              <Ionicons name="scan-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle} testID="text-empty-title">Nessuna scansione</Text>
              <Text style={styles.emptyText} testID="text-empty-description">
                Le scansioni effettuate appariranno qui
              </Text>
            </Card>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
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
