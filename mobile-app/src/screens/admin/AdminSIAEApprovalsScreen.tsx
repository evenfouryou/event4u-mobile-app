import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAEApproval as APISIAEApproval } from '@/lib/api';

interface AdminSIAEApprovalsScreenProps {
  onBack: () => void;
}

interface SIAEApproval {
  id: string;
  eventName: string;
  gestoreName: string;
  companyName: string;
  eventDate: string;
  submittedAt: string;
  reportType: 'RCA' | 'RMG' | 'RPM';
  ticketsSold: number;
  totalRevenue: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

type FilterType = 'pending' | 'approved' | 'rejected' | 'all';

export function AdminSIAEApprovalsScreen({ onBack }: AdminSIAEApprovalsScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('pending');
  const [approvals, setApprovals] = useState<SIAEApproval[]>([]);

  useEffect(() => {
    loadApprovals();
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

  const loadApprovals = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminSIAEApprovals();
      setApprovals(data.map(a => ({
        id: a.id,
        eventName: a.details || 'Richiesta SIAE',
        gestoreName: a.companyName,
        companyName: a.companyName,
        eventDate: a.requestDate,
        submittedAt: a.requestDate,
        reportType: 'RCA' as const,
        ticketsSold: 0,
        totalRevenue: 0,
        status: a.status,
      })));
    } catch (error) {
      console.error('Error loading SIAE approvals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApprovals();
    setRefreshing(false);
  };

  const getStatusBadge = (status: SIAEApproval['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">In Attesa</Badge>;
      case 'approved':
        return <Badge variant="success">Approvato</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rifiutato</Badge>;
    }
  };

  const getReportTypeBadge = (type: SIAEApproval['reportType']) => {
    return <Badge variant="outline">{type}</Badge>;
  };

  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = approval.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.gestoreName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || approval.status === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  const handleApprove = (approval: SIAEApproval) => {
    triggerHaptic('medium');
    Alert.alert(
      'Approva Report',
      `Vuoi approvare il report SIAE per "${approval.eventName}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Approva',
          onPress: () => {
            setApprovals(prev => prev.map(a =>
              a.id === approval.id ? { ...a, status: 'approved' as const } : a
            ));
            triggerHaptic('success');
          },
        },
      ]
    );
  };

  const handleReject = (approval: SIAEApproval) => {
    triggerHaptic('medium');
    Alert.prompt(
      'Rifiuta Report',
      'Inserisci il motivo del rifiuto:',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rifiuta',
          style: 'destructive',
          onPress: (reason: string | undefined) => {
            setApprovals(prev => prev.map(a =>
              a.id === approval.id ? { ...a, status: 'rejected' as const, rejectionReason: reason || 'Nessun motivo specificato' } : a
            ));
          },
        },
      ],
      'plain-text',
      ''
    );
  };

  const handleViewDetails = (approval: SIAEApproval) => {
    triggerHaptic('light');
    Alert.alert(
      'Dettagli Report',
      `Evento: ${approval.eventName}\nGestore: ${approval.gestoreName}\nAzienda: ${approval.companyName}\nData Evento: ${formatDate(approval.eventDate)}\nTipo Report: ${approval.reportType}\nBiglietti: ${approval.ticketsSold}\nIncasso: ${formatCurrency(approval.totalRevenue)}${approval.rejectionReason ? `\n\nMotivo Rifiuto: ${approval.rejectionReason}` : ''}`
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const filters: { id: FilterType; label: string; count?: number }[] = [
    { id: 'pending', label: 'In Attesa', count: pendingCount },
    { id: 'approved', label: 'Approvati' },
    { id: 'rejected', label: 'Rifiutati' },
    { id: 'all', label: 'Tutti' },
  ];

  const renderApproval = ({ item }: { item: SIAEApproval }) => (
    <Card style={styles.approvalCard} testID={`approval-${item.id}`}>
      <View style={styles.approvalHeader}>
        <View style={styles.approvalInfo}>
          <View style={styles.approvalTitleRow}>
            <Text style={[styles.eventName, { color: colors.foreground }]}>{item.eventName}</Text>
            {getStatusBadge(item.status)}
          </View>
          <Text style={[styles.gestoreInfo, { color: colors.mutedForeground }]}>
            {item.gestoreName} • {item.companyName}
          </Text>
        </View>
      </View>

      <View style={[styles.approvalDetails, { backgroundColor: colors.background }]}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Data Evento</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{formatDate(item.eventDate)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Tipo Report</Text>
            {getReportTypeBadge(item.reportType)}
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Biglietti</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.ticketsSold}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Incasso</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{formatCurrency(item.totalRevenue)}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.submittedAt, { color: colors.mutedForeground }]}>
        Inviato: {formatDateTime(item.submittedAt)}
      </Text>

      {item.rejectionReason && (
        <View style={styles.rejectionBox}>
          <Ionicons name="alert-circle" size={16} color={staticColors.destructive} />
          <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
        </View>
      )}

      <View style={[styles.approvalActions, { borderTopColor: colors.border }]}>
        {item.status === 'pending' && (
          <>
            <Button
              variant="default"
              size="sm"
              onPress={() => handleApprove(item)}
              testID={`button-approve-${item.id}`}
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>Approva</Text>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onPress={() => handleReject(item)}
              testID={`button-reject-${item.id}`}
            >
              <Ionicons name="close-circle" size={16} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>Rifiuta</Text>
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onPress={() => handleViewDetails(item)}
          testID={`button-details-${item.id}`}
        >
          <Ionicons name="eye-outline" size={16} color={colors.foreground} />
          <Text style={[styles.actionButtonText, { color: colors.foreground }]}>Dettagli</Text>
        </Button>
      </View>
    </Card>
  );

  if (showLoader) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header 
          title="Approvazioni SIAE" 
          subtitle="Gestione Report" 
          showBack 
          onBack={onBack} 
          testID="header-siae-approvals" 
        />
        <Loading text="Caricamento approvazioni SIAE..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header 
        title="Approvazioni SIAE" 
        subtitle="Gestione Report" 
        showBack 
        onBack={onBack} 
        testID="header-siae-approvals" 
      />

      <View style={styles.statsSection}>
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard} testID="stat-pending">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.warning}20` }]}>
              <Ionicons name="time" size={20} color={staticColors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {approvals.filter(a => a.status === 'pending').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>In Attesa</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-approved">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
              <Ionicons name="checkmark-circle" size={20} color={staticColors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {approvals.filter(a => a.status === 'approved').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Approvati</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-rejected">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.destructive}20` }]}>
              <Ionicons name="close-circle" size={20} color={staticColors.destructive} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {approvals.filter(a => a.status === 'rejected').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Rifiutati</Text>
          </GlassCard>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca evento, gestore..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
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
                { backgroundColor: colors.card, borderColor: colors.border },
                activeFilter === item.id && styles.filterChipActive,
              ]}
              testID={`filter-${item.id}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.foreground },
                  activeFilter === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
              {item.count !== undefined && item.count > 0 && (
                <View style={[
                  styles.filterBadge,
                  activeFilter === item.id && styles.filterBadgeActive,
                ]}>
                  <Text style={[
                    styles.filterBadgeText,
                    activeFilter === item.id && styles.filterBadgeTextActive,
                  ]}>
                    {item.count}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        />
      </View>

      {filteredApprovals.length > 0 ? (
        <FlatList
          data={filteredApprovals}
          renderItem={renderApproval}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={staticColors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna approvazione trovata</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {activeFilter === 'pending' 
              ? 'Non ci sono report in attesa di approvazione'
              : 'Prova a modificare i filtri o la ricerca'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },
  filtersContainer: {
    marginTop: spacing.md,
  },
  filtersList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: staticColors.primaryForeground,
  },
  filterBadge: {
    backgroundColor: staticColors.warning,
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: staticColors.primaryForeground,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
  },
  filterBadgeTextActive: {
    color: staticColors.primary,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: spacing.md,
  },
  approvalCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  approvalHeader: {
    marginBottom: spacing.md,
  },
  approvalInfo: {
    flex: 1,
  },
  approvalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    flex: 1,
  },
  gestoreInfo: {
    fontSize: typography.fontSize.sm,
  },
  approvalDetails: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    marginTop: 2,
  },
  submittedAt: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.sm,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${staticColors.destructive}15`,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  rejectionText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.destructive,
  },
  approvalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
