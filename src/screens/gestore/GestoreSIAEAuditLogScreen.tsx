import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAEAuditEntry } from '@/lib/api';

type OperationFilter = 'all' | 'emission' | 'refund' | 'cancellation' | 'name_change';

interface GestoreSIAEAuditLogScreenProps {
  onBack: () => void;
}

export function GestoreSIAEAuditLogScreen({ onBack }: GestoreSIAEAuditLogScreenProps) {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<SIAEAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<OperationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAuditLog();
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

  const loadAuditLog = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAEAuditLog();
      setEntries(data);
    } catch (error) {
      console.error('Error loading SIAE audit log:', error);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAuditLog();
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      triggerHaptic('medium');
      await api.exportSIAEAuditLog();
      Alert.alert('Successo', 'Registro audit esportato con successo');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile esportare il registro audit');
    } finally {
      setExporting(false);
    }
  };

  const getOperationLabel = (operation: SIAEAuditEntry['operation']) => {
    const labels: Record<string, string> = {
      emission: 'Emissione',
      refund: 'Rimborso',
      cancellation: 'Annullamento',
      name_change: 'Cambio Nome',
    };
    return labels[operation] || operation;
  };

  const getOperationBadge = (operation: SIAEAuditEntry['operation']) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
      emission: 'success',
      refund: 'warning',
      cancellation: 'destructive',
      name_change: 'outline',
    };
    return <Badge variant={variants[operation] || 'outline'}>{getOperationLabel(operation)}</Badge>;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesFilter = activeFilter === 'all' || entry.operation === activeFilter;
    const matchesSearch = searchQuery === '' || 
      entry.ticketCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.userName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filters: { id: OperationFilter; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'emission', label: 'Emissione' },
    { id: 'refund', label: 'Rimborso' },
    { id: 'cancellation', label: 'Annullamento' },
  ];

  const renderEntry = ({ item }: { item: SIAEAuditEntry }) => (
    <Card style={styles.entryCard} testID={`audit-entry-${item.id}`}>
      <View style={styles.entryHeader}>
        <View style={styles.entryInfo}>
          {getOperationBadge(item.operation)}
          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
      </View>

      <View style={styles.entryDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Utente</Text>
          </View>
          <Text style={styles.detailValue}>{item.userName}</Text>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="ticket-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Codice</Text>
          </View>
          <Text style={[styles.detailValue, styles.ticketCode]}>{item.ticketCode}</Text>
        </View>

        {item.details && (
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.detailLabel}>Dettagli</Text>
            </View>
            <Text style={styles.detailValue} numberOfLines={2}>{item.details}</Text>
          </View>
        )}
      </View>
    </Card>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-audit"
      />

      <View style={styles.titleContainer}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Registro Audit</Text>
            <Text style={styles.subtitle}>{filteredEntries.length} operazioni</Text>
          </View>
          <Pressable
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={exporting}
            testID="button-export-audit"
          >
            {exporting ? (
              <Loading size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={staticColors.primary} />
                <Text style={styles.exportText}>Esporta</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca per codice biglietto..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-audit"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {filters.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => {
                triggerHaptic('selection');
                setActiveFilter(filter.id);
              }}
              style={[
                styles.filterChip,
                activeFilter === filter.id && styles.filterChipActive,
              ]}
              testID={`filter-${filter.id}`}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter.id && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {showLoader ? (
        <Loading text="Caricamento registro audit..." />
      ) : filteredEntries.length > 0 ? (
        <FlatList
          data={filteredEntries}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessuna operazione trovata</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'Nessun risultato per la ricerca' : 'Il registro audit è vuoto'}
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
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: `${staticColors.primary}20`,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
  },
  filterTextActive: {
    color: staticColors.primaryForeground,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  entryCard: {
    padding: spacing.md,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  entryInfo: {
    gap: spacing.xs,
  },
  timestamp: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 4,
  },
  amount: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  entryDetails: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
    flex: 1,
    textAlign: 'right',
  },
  ticketCode: {
    fontFamily: 'monospace',
    color: staticColors.primary,
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

export default GestoreSIAEAuditLogScreen;
