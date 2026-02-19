import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput } from 'react-native';
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
import api, { ScanHistoryEntry } from '@/lib/api';

interface GestoreScannerHistoryScreenProps {
  onBack: () => void;
}

type DateFilter = 'today' | 'week' | 'month' | 'all';
type ResultFilter = 'all' | 'success' | 'error' | 'duplicate';

export function GestoreScannerHistoryScreen({ onBack }: GestoreScannerHistoryScreenProps) {
  const { colors } = useTheme();
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ScanHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  useEffect(() => {
    applyFilters();
  }, [history, searchQuery, dateFilter, resultFilter]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const data = await api.getScannerHistory();
      setHistory(data);
    } catch (error) {
      console.error('Error loading scan history:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...history];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.ticketCode.toLowerCase().includes(query) ||
          entry.eventName.toLowerCase().includes(query) ||
          entry.operatorName.toLowerCase().includes(query)
      );
    }

    if (resultFilter !== 'all') {
      filtered = filtered.filter((entry) => entry.result === resultFilter);
    }

    const now = new Date();
    if (dateFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter((entry) => new Date(entry.timestamp) >= today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((entry) => new Date(entry.timestamp) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((entry) => new Date(entry.timestamp) >= monthAgo);
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setFilteredHistory(filtered);
  }, [history, searchQuery, dateFilter, resultFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleExport = () => {
    triggerHaptic('medium');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getResultBadge = (result: ScanHistoryEntry['result']) => {
    switch (result) {
      case 'success':
        return <Badge variant="success">Successo</Badge>;
      case 'error':
        return <Badge variant="destructive">Errore</Badge>;
      case 'duplicate':
        return <Badge variant="warning">Duplicato</Badge>;
      default:
        return <Badge variant="secondary">{result}</Badge>;
    }
  };

  const renderHistoryItem = ({ item }: { item: ScanHistoryEntry }) => (
    <Card style={styles.historyCard} testID={`scan-${item.id}`}>
      <View style={styles.historyHeader}>
        <View style={styles.historyInfo}>
          <Text style={[styles.ticketCode, { color: colors.foreground }]}>{item.ticketCode}</Text>
          <Text style={[styles.eventName, { color: colors.mutedForeground }]}>{item.eventName}</Text>
        </View>
        {getResultBadge(item.result)}
      </View>

      <View style={[styles.historyDivider, { backgroundColor: colors.border }]} />

      <View style={styles.historyDetails}>
        <View style={styles.historyDetail}>
          <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.historyDetailText, { color: colors.mutedForeground }]}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        <View style={styles.historyDetail}>
          <Ionicons name="ticket-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.historyDetailText, { color: colors.mutedForeground }]}>{item.ticketType}</Text>
        </View>
        <View style={styles.historyDetail}>
          <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.historyDetailText, { color: colors.mutedForeground }]}>{item.operatorName}</Text>
        </View>
      </View>

      {item.errorMessage && (
        <View style={[styles.errorMessage, { backgroundColor: `${staticColors.destructive}10` }]}>
          <Ionicons name="alert-circle" size={14} color={staticColors.destructive} />
          <Text style={[styles.errorMessageText, { color: staticColors.destructive }]}>{item.errorMessage}</Text>
        </View>
      )}
    </Card>
  );

  const DateFilterButton = ({ value, label }: { value: DateFilter; label: string }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        setDateFilter(value);
      }}
      style={[
        styles.filterButton,
        {
          backgroundColor: dateFilter === value ? colors.primary : colors.secondary,
        },
      ]}
    >
      <Text
        style={[
          styles.filterButtonText,
          { color: dateFilter === value ? colors.primaryForeground : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const ResultFilterButton = ({ value, label }: { value: ResultFilter; label: string }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        setResultFilter(value);
      }}
      style={[
        styles.filterButton,
        {
          backgroundColor: resultFilter === value ? colors.primary : colors.secondary,
        },
      ]}
    >
      <Text
        style={[
          styles.filterButtonText,
          { color: resultFilter === value ? colors.primaryForeground : colors.foreground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        title="Storico Scansioni"
        showBack
        onBack={onBack}
        rightElement={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setShowFilters(!showFilters);
              }}
              style={styles.headerButton}
            >
              <Ionicons name="filter" size={22} color={showFilters ? colors.primary : colors.foreground} />
            </Pressable>
            <Pressable onPress={handleExport} style={styles.headerButton}>
              <Ionicons name="download-outline" size={22} color={colors.foreground} />
            </Pressable>
          </View>
        }
        testID="header-scanner-history"
      />

      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Cerca codice biglietto..."
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
          testID="input-search"
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setSearchQuery('');
            }}
          >
            <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Data</Text>
            <View style={styles.filterRow}>
              <DateFilterButton value="today" label="Oggi" />
              <DateFilterButton value="week" label="Settimana" />
              <DateFilterButton value="month" label="Mese" />
              <DateFilterButton value="all" label="Tutto" />
            </View>
          </View>
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Risultato</Text>
            <View style={styles.filterRow}>
              <ResultFilterButton value="all" label="Tutti" />
              <ResultFilterButton value="success" label="Successo" />
              <ResultFilterButton value="error" label="Errore" />
              <ResultFilterButton value="duplicate" label="Duplicato" />
            </View>
          </View>
        </View>
      )}

      <View style={styles.statsRow}>
        <GlassCard style={styles.miniStat}>
          <Text style={[styles.miniStatValue, { color: colors.foreground }]}>{filteredHistory.length}</Text>
          <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Risultati</Text>
        </GlassCard>
        <GlassCard style={styles.miniStat}>
          <Text style={[styles.miniStatValue, { color: staticColors.success }]}>
            {filteredHistory.filter((h) => h.result === 'success').length}
          </Text>
          <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Successi</Text>
        </GlassCard>
        <GlassCard style={styles.miniStat}>
          <Text style={[styles.miniStatValue, { color: staticColors.destructive }]}>
            {filteredHistory.filter((h) => h.result === 'error').length}
          </Text>
          <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>Errori</Text>
        </GlassCard>
      </View>

      {showLoader ? (
        <Loading text="Caricamento storico..." />
      ) : filteredHistory.length > 0 ? (
        <FlatList
          data={filteredHistory}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna scansione trovata</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {searchQuery ? 'Prova a modificare i criteri di ricerca' : 'Le scansioni appariranno qui'}
          </Text>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.xs,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  filterSection: {
    gap: spacing.xs,
  },
  filterLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  miniStat: {
    flex: 1,
    padding: spacing.sm,
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  miniStatLabel: {
    fontSize: typography.fontSize.xs,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  historyCard: {
    padding: spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  historyInfo: {
    flex: 1,
  },
  ticketCode: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  eventName: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  historyDivider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  historyDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  historyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyDetailText: {
    fontSize: typography.fontSize.xs,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  errorMessageText: {
    fontSize: typography.fontSize.xs,
    flex: 1,
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
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default GestoreScannerHistoryScreen;
