import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAENameChange } from '@/lib/api';

type FilterType = 'all' | 'pending' | 'completed' | 'rejected';

interface AdminNameChangesScreenProps {
  onBack: () => void;
}

interface FiltersData {
  companies: { id: string; name: string }[];
  events: { id: string; name: string; companyId: string }[];
  statuses: string[];
}

export function AdminNameChangesScreen({ onBack }: AdminNameChangesScreenProps) {
  const { colors } = useTheme();
  const [requests, setRequests] = useState<SIAENameChange[]>([]);
  const [filtersData, setFiltersData] = useState<FiltersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0 });

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [nameChangesRes, filtersRes] = await Promise.all([
        api.getNameChanges({ status: activeFilter === 'all' ? undefined : activeFilter }),
        api.getNameChangesFilters(),
      ]);
      setRequests(nameChangesRes.nameChanges);
      setPagination({ page: nameChangesRes.pagination.page, total: nameChangesRes.pagination.total });
      setFiltersData(filtersRes);
    } catch (error) {
      console.error('Error loading name changes:', error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const reloadWithFilters = async () => {
    try {
      setIsLoading(true);
      const params: { companyId?: string; status?: string } = {};
      if (selectedCompanyId) params.companyId = selectedCompanyId;
      if (activeFilter !== 'all') params.status = activeFilter;
      const res = await api.getNameChanges(params);
      setRequests(res.nameChanges);
      setPagination({ page: res.pagination.page, total: res.pagination.total });
    } catch (error) {
      console.error('Error reloading:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadWithFilters();
  }, [activeFilter, selectedCompanyId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reloadWithFilters();
    setRefreshing(false);
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      triggerHaptic('light');
      await api.approveNameChange(id);
      await reloadWithFilters();
      triggerHaptic('success');
    } catch (error) {
      console.error('Error approving name change:', error);
      triggerHaptic('error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      triggerHaptic('light');
      await api.rejectNameChange(id);
      await reloadWithFilters();
      triggerHaptic('success');
    } catch (error) {
      console.error('Error rejecting name change:', error);
      triggerHaptic('error');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'completed':
        return <Badge variant="success">Completato</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rifiutato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'not_required':
        return <Badge variant="outline">Non richiesto</Badge>;
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'paid':
        return <Badge variant="success">Pagato</Badge>;
      case 'refunded':
        return <Badge variant="destructive">Rimborsato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'pending', label: 'In attesa' },
    { id: 'completed', label: 'Completati' },
    { id: 'rejected', label: 'Rifiutati' },
  ];

  const stats = useMemo(() => {
    return {
      total: pagination.total,
      pending: requests.filter(r => r.status === 'pending').length,
      completed: requests.filter(r => r.status === 'completed').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
    };
  }, [requests, pagination]);

  const renderRequest = ({ item }: { item: SIAENameChange }) => {
    const isProcessing = processingId === item.id;
    const fee = parseFloat(item.fee || '0');

    return (
      <Card style={styles.requestCard} testID={`name-change-${item.id}`}>
        <View style={styles.requestHeader}>
          <View style={styles.requestIcon}>
            <Ionicons name="swap-horizontal" size={24} color={staticColors.primary} />
          </View>
          <View style={styles.requestInfo}>
            <View style={styles.nameChangeRow}>
              <Text style={styles.originalName} numberOfLines={1}>
                {item.ticket.participantFirstName} {item.ticket.participantLastName}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.mutedForeground} />
              <Text style={styles.newName} numberOfLines={1}>
                {item.newFirstName} {item.newLastName}
              </Text>
            </View>
            <View style={styles.requestMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="business-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.metaText}>{item.company.name}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.metaText}>{item.event.name}</Text>
              </View>
            </View>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View style={styles.requestDivider} />

        <View style={styles.requestDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="ticket-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>Biglietto: {item.ticket.ticketCode}</Text>
          </View>
          {item.sigilloFiscaleOriginale || item.ticket.sigilloFiscale ? (
            <View style={styles.detailRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.mutedForeground} />
              <Text style={styles.detailText}>Sigillo: {item.sigilloFiscaleOriginale || item.ticket.sigilloFiscale}</Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>Richiesto: {formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>Evento: {formatDate(item.event.startDatetime)}</Text>
          </View>
          {fee > 0 && (
            <View style={styles.feeRow}>
              <View style={styles.detailRow}>
                <Ionicons name="card-outline" size={16} color={staticColors.success} />
                <Text style={[styles.detailText, { color: staticColors.success, fontWeight: '600' }]}>
                  Commissione: €{fee.toFixed(2)}
                </Text>
              </View>
              {getPaymentStatusBadge(item.paymentStatus)}
            </View>
          )}
        </View>

        {item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <Pressable
              onPress={() => handleReject(item.id)}
              style={[styles.actionButton, styles.rejectButton]}
              disabled={isProcessing}
              testID={`button-reject-${item.id}`}
            >
              {isProcessing ? (
                <Text style={styles.rejectButtonText}>...</Text>
              ) : (
                <>
                  <Ionicons name="close" size={18} color={staticColors.destructive} />
                  <Text style={styles.rejectButtonText}>Rifiuta</Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={() => handleApprove(item.id)}
              style={[styles.actionButton, styles.approveButton]}
              disabled={isProcessing}
              testID={`button-approve-${item.id}`}
            >
              {isProcessing ? (
                <Text style={styles.approveButtonText}>...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={staticColors.primaryForeground} />
                  <Text style={styles.approveButtonText}>Approva</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {item.status !== 'pending' && item.processedAt && (
          <View style={styles.processedInfo}>
            <Ionicons 
              name={item.status === 'completed' ? 'checkmark-circle' : 'close-circle'} 
              size={16} 
              color={item.status === 'completed' ? staticColors.teal : staticColors.destructive} 
            />
            <Text style={styles.processedText}>
              {item.status === 'completed' ? 'Completato' : 'Rifiutato'} il {formatDate(item.processedAt)}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-name-changes"
      />

      <View style={styles.titleContainer}>
        <Ionicons name="swap-horizontal-outline" size={24} color={staticColors.primary} />
        <Text style={styles.screenTitle}>Cambi Nominativo</Text>
      </View>

      <View style={styles.statsGrid}>
        <GlassCard style={styles.statCard} testID="stat-total">
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="people" size={18} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Totale</Text>
        </GlassCard>
        <GlassCard style={styles.statCard} testID="stat-pending">
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.warning}20` }]}>
            <Ionicons name="time" size={18} color={staticColors.warning} />
          </View>
          <Text style={[styles.statValue, { color: staticColors.warning }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>In Attesa</Text>
        </GlassCard>
        <GlassCard style={styles.statCard} testID="stat-completed">
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
            <Ionicons name="checkmark-circle" size={18} color={staticColors.success} />
          </View>
          <Text style={[styles.statValue, { color: staticColors.success }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completati</Text>
        </GlassCard>
        <GlassCard style={styles.statCard} testID="stat-rejected">
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.destructive}20` }]}>
            <Ionicons name="close-circle" size={18} color={staticColors.destructive} />
          </View>
          <Text style={[styles.statValue, { color: staticColors.destructive }]}>{stats.rejected}</Text>
          <Text style={styles.statLabel}>Rifiutati</Text>
        </GlassCard>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                setActiveFilter(item.id);
              }}
              style={[
                styles.filterChip,
                activeFilter === item.id && styles.filterChipActive,
              ]}
              testID={`filter-${item.id}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {showLoader ? (
        <Loading text="Caricamento richieste..." />
      ) : requests.length > 0 ? (
        <FlatList
          data={requests}
          renderItem={renderRequest}
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
          testID="list-name-changes"
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="swap-horizontal-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessuna richiesta trovata</Text>
          <Text style={styles.emptyText}>
            {activeFilter === 'pending' 
              ? 'Non ci sono richieste in attesa'
              : 'Le richieste di cambio nominativo appariranno qui'}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  screenTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  filtersContainer: {
    paddingBottom: spacing.sm,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  filterChipTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  requestCard: {
    padding: spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  requestIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  nameChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  originalName: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textDecorationLine: 'line-through',
    maxWidth: '40%',
  },
  newName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    maxWidth: '40%',
  },
  requestMeta: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  requestDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  requestDetails: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  rejectButton: {
    backgroundColor: `${staticColors.destructive}15`,
  },
  rejectButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.destructive,
  },
  approveButton: {
    backgroundColor: staticColors.primary,
  },
  approveButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  processedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  processedText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
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

export default AdminNameChangesScreen;
