import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { SkeletonList } from '@/components/Loading';
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

interface PendingReissueData {
  cancelledAwaitingReissue: Array<{
    id: string;
    ticketCode: string;
    sigilloFiscale: string | null;
    participantFirstName: string | null;
    participantLastName: string | null;
    cancellationDate: string | null;
    event: { id: string; name: string };
    company: { id: string; name: string };
  }>;
  pendingRequests: SIAENameChange[];
  summary: {
    cancelledAwaitingReissueCount: number;
    pendingRequestsCount: number;
    totalPendingReissue: number;
  };
}

export function AdminNameChangesScreen({ onBack }: AdminNameChangesScreenProps) {
  const { colors } = useTheme();
  const [requests, setRequests] = useState<SIAENameChange[]>([]);
  const [filtersData, setFiltersData] = useState<FiltersData | null>(null);
  const [pendingReissue, setPendingReissue] = useState<PendingReissueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
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
      const [nameChangesRes, filtersRes, pendingReissueRes] = await Promise.all([
        api.getNameChanges({ status: activeFilter === 'all' ? undefined : activeFilter }),
        api.getNameChangesFilters(),
        api.get<PendingReissueData>('/api/siae/admin/name-changes/pending-reissue').catch(() => null),
      ]);
      setRequests(nameChangesRes.nameChanges);
      setPagination({ page: nameChangesRes.pagination.page, total: nameChangesRes.pagination.total });
      setFiltersData(filtersRes);
      setPendingReissue(pendingReissueRes);
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
      const params: { status?: string } = {};
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
  }, [activeFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
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
      Alert.alert('Errore', 'Impossibile approvare il cambio nominativo');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    Alert.alert(
      'Rifiuta Cambio',
      'Sei sicuro di voler rifiutare questa richiesta di cambio nominativo?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rifiuta',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(id);
              triggerHaptic('light');
              await api.rejectNameChange(id);
              await reloadWithFilters();
              triggerHaptic('success');
            } catch (error) {
              console.error('Error rejecting name change:', error);
              triggerHaptic('error');
              Alert.alert('Errore', 'Impossibile rifiutare il cambio nominativo');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'Gratis';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(parseFloat(amount));
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
    const pending = requests.filter(r => r.status === 'pending').length;
    const completed = requests.filter(r => r.status === 'completed').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    return { total: pagination.total, pending, completed, rejected };
  }, [requests, pagination]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Cambi Nominativo"
        showBack
        onBack={onBack}
        testID="header-name-changes"
      />

      {showLoader ? (
        <View style={styles.loaderContainer}>
          <SkeletonList count={4} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.md }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.statsGrid}>
            <GlassCard style={styles.statCard} testID="stat-total">
              <Ionicons name="people" size={20} color={colors.mutedForeground} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Totale</Text>
            </GlassCard>
            <GlassCard style={styles.statCard} testID="stat-pending">
              <Ionicons name="time" size={20} color={staticColors.warning} />
              <Text style={[styles.statValue, { color: staticColors.warning }]}>{stats.pending}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>In Attesa</Text>
            </GlassCard>
            <GlassCard style={styles.statCard} testID="stat-completed">
              <Ionicons name="checkmark-circle" size={20} color={staticColors.success} />
              <Text style={[styles.statValue, { color: staticColors.success }]}>{stats.completed}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Completati</Text>
            </GlassCard>
            <GlassCard style={styles.statCard} testID="stat-rejected">
              <Ionicons name="close-circle" size={20} color={staticColors.destructive} />
              <Text style={[styles.statValue, { color: staticColors.destructive }]}>{stats.rejected}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Rifiutati</Text>
            </GlassCard>
          </View>

          {pendingReissue && pendingReissue.summary?.totalPendingReissue > 0 && (
            <Card style={[styles.alertCard, { borderColor: staticColors.warning }]} testID="alert-pending-reissue">
              <View style={styles.alertHeader}>
                <Ionicons name="warning" size={20} color={staticColors.warning} />
                <Text style={[styles.alertTitle, { color: staticColors.warning }]}>
                  Biglietti in Attesa di Riemissione
                </Text>
              </View>
              {pendingReissue.summary.cancelledAwaitingReissueCount > 0 && (
                <Text style={[styles.alertText, { color: colors.mutedForeground }]}>
                  {pendingReissue.summary.cancelledAwaitingReissueCount} biglietti annullati senza nuovo titolo
                </Text>
              )}
              {pendingReissue.summary.pendingRequestsCount > 0 && (
                <Text style={[styles.alertText, { color: colors.mutedForeground }]}>
                  {pendingReissue.summary.pendingRequestsCount} richieste in attesa di elaborazione
                </Text>
              )}
            </Card>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersContainer}
            contentContainerStyle={styles.filtersContent}
          >
            {filters.map((filter) => (
              <Pressable
                key={filter.id}
                style={[
                  styles.filterChip,
                  { backgroundColor: activeFilter === filter.id ? colors.primary : colors.card },
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  setActiveFilter(filter.id);
                }}
                testID={`filter-${filter.id}`}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: activeFilter === filter.id ? staticColors.primaryForeground : colors.foreground },
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Richieste</Text>
            <Badge variant="outline">{requests.length}</Badge>
          </View>

          {requests.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="swap-horizontal-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Nessuna richiesta di cambio nominativo
              </Text>
            </Card>
          ) : (
            requests.map((request) => {
              const isProcessing = processingId === request.id;
              const fee = parseFloat(request.fee || '0');

              return (
                <Card key={request.id} style={styles.requestCard} testID={`name-change-${request.id}`}>
                  <View style={styles.requestHeader}>
                    <View style={styles.requestIcon}>
                      <Ionicons name="swap-horizontal" size={24} color={staticColors.primary} />
                    </View>
                    <View style={styles.requestInfo}>
                      <View style={styles.nameChangeRow}>
                        <Text style={[styles.originalName, { color: colors.foreground }]} numberOfLines={1}>
                          {request.ticket.participantFirstName} {request.ticket.participantLastName}
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.newName, { color: staticColors.primary }]} numberOfLines={1}>
                          {request.newFirstName} {request.newLastName}
                        </Text>
                      </View>
                      <View style={styles.badgesRow}>
                        {getStatusBadge(request.status)}
                        {getPaymentStatusBadge(request.paymentStatus)}
                      </View>
                    </View>
                  </View>

                  <View style={[styles.requestDetails, { borderTopColor: colors.border }]}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                        {request.event?.name || 'Evento'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="business-outline" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                        {request.company?.name || 'Azienda'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="ticket-outline" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                        {request.ticket.ticketCode}
                      </Text>
                    </View>
                    {fee > 0 && (
                      <View style={styles.detailRow}>
                        <Ionicons name="cash-outline" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                          Commissione: {formatCurrency(request.fee)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                        Richiesto: {formatDate(request.createdAt)}
                      </Text>
                    </View>
                    {request.ticket.sigilloFiscale && (
                      <View style={styles.detailRow}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={staticColors.info} />
                        <Text style={[styles.detailText, { color: staticColors.info }]}>
                          Sigillo: {request.ticket.sigilloFiscale}
                        </Text>
                      </View>
                    )}
                  </View>

                  {request.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <Button
                        variant="default"
                        size="sm"
                        onPress={() => handleApprove(request.id)}
                        disabled={isProcessing}
                        testID={`button-approve-${request.id}`}
                      >
                        <Ionicons name="checkmark" size={16} color={staticColors.primaryForeground} />
                        <Text style={{ color: staticColors.primaryForeground, fontWeight: '600' }}>Approva</Text>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onPress={() => handleReject(request.id)}
                        disabled={isProcessing}
                        testID={`button-reject-${request.id}`}
                      >
                        <Ionicons name="close" size={16} color={staticColors.destructiveForeground} />
                        <Text style={{ color: staticColors.destructiveForeground, fontWeight: '600' }}>Rifiuta</Text>
                      </Button>
                    </View>
                  )}
                </Card>
              );
            })
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    padding: spacing.md,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  alertCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    backgroundColor: `${staticColors.warning}10`,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  alertTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  alertText: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  filtersContainer: {
    marginBottom: spacing.lg,
  },
  filtersContent: {
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
  requestCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: `${staticColors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  nameChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  originalName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    maxWidth: '35%',
  },
  newName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    maxWidth: '35%',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  requestDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});

export default AdminNameChangesScreen;
