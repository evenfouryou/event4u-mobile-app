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
      await new Promise(resolve => setTimeout(resolve, 500));
      setApprovals([
        { id: '1', eventName: 'Concerto Estate 2024', gestoreName: 'Marco Rossi', companyName: 'Event Club Milano', eventDate: '2024-07-15', submittedAt: '2024-01-27T10:30:00', reportType: 'RCA', ticketsSold: 1250, totalRevenue: 37500, status: 'pending' },
        { id: '2', eventName: 'Festival Jazz Roma', gestoreName: 'Giulia Bianchi', companyName: 'Party Roma SRL', eventDate: '2024-06-20', submittedAt: '2024-01-27T09:15:00', reportType: 'RMG', ticketsSold: 890, totalRevenue: 22250, status: 'pending' },
        { id: '3', eventName: 'Teatro Classico', gestoreName: 'Luca Verdi', companyName: 'Concerti Torino', eventDate: '2024-05-10', submittedAt: '2024-01-26T14:20:00', reportType: 'RCA', ticketsSold: 320, totalRevenue: 9600, status: 'approved' },
        { id: '4', eventName: 'Danza Moderna', gestoreName: 'Anna Neri', companyName: 'Teatro Napoli', eventDate: '2024-04-22', submittedAt: '2024-01-26T11:45:00', reportType: 'RPM', ticketsSold: 180, totalRevenue: 5400, status: 'approved' },
        { id: '5', eventName: 'DJ Night Club', gestoreName: 'Paolo Gialli', companyName: 'Music Live Firenze', eventDate: '2024-03-15', submittedAt: '2024-01-25T16:30:00', reportType: 'RMG', ticketsSold: 450, totalRevenue: 11250, status: 'rejected', rejectionReason: 'Dati incompleti nel report mensile' },
        { id: '6', eventName: 'Opera Prima', gestoreName: 'Sara Blu', companyName: 'Festival Bologna', eventDate: '2024-08-01', submittedAt: '2024-01-27T08:00:00', reportType: 'RCA', ticketsSold: 560, totalRevenue: 28000, status: 'pending' },
      ]);
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
            <Text style={styles.eventName}>{item.eventName}</Text>
            {getStatusBadge(item.status)}
          </View>
          <Text style={styles.gestoreInfo}>{item.gestoreName} • {item.companyName}</Text>
        </View>
      </View>

      <View style={styles.approvalDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Data Evento</Text>
            <Text style={styles.detailValue}>{formatDate(item.eventDate)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Tipo Report</Text>
            {getReportTypeBadge(item.reportType)}
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Biglietti</Text>
            <Text style={styles.detailValue}>{item.ticketsSold}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Incasso</Text>
            <Text style={styles.detailValue}>{formatCurrency(item.totalRevenue)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.submittedAt}>
        Inviato: {formatDateTime(item.submittedAt)}
      </Text>

      {item.rejectionReason && (
        <View style={styles.rejectionBox}>
          <Ionicons name="alert-circle" size={16} color={staticColors.destructive} />
          <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
        </View>
      )}

      <View style={styles.approvalActions}>
        {item.status === 'pending' && (
          <>
            <Button
              variant="default"
              size="sm"
              onPress={() => handleApprove(item)}
              testID={`button-approve-${item.id}`}
            >
              <Ionicons name="checkmark-circle" size={16} color={staticColors.primaryForeground} />
              <Text style={[styles.actionButtonText, { color: staticColors.primaryForeground }]}>Approva</Text>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onPress={() => handleReject(item)}
              testID={`button-reject-${item.id}`}
            >
              <Ionicons name="close-circle" size={16} color={staticColors.destructiveForeground} />
              <Text style={[styles.actionButtonText, { color: staticColors.destructiveForeground }]}>Rifiuta</Text>
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onPress={() => handleViewDetails(item)}
          testID={`button-details-${item.id}`}
        >
          <Ionicons name="eye-outline" size={16} color={staticColors.foreground} />
          <Text style={styles.actionButtonText}>Dettagli</Text>
        </Button>
      </View>
    </Card>
  );

  if (showLoader) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header showLogo showBack onBack={onBack} testID="header-siae-approvals" />
        <Loading text="Caricamento approvazioni SIAE..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header showLogo showBack onBack={onBack} testID="header-siae-approvals" />

      <View style={styles.statsSection}>
        <Text style={styles.title}>Approvazioni SIAE</Text>
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard} testID="stat-pending">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.warning}20` }]}>
              <Ionicons name="time" size={20} color={staticColors.warning} />
            </View>
            <Text style={styles.statValue}>{approvals.filter(a => a.status === 'pending').length}</Text>
            <Text style={styles.statLabel}>In Attesa</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-approved">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
              <Ionicons name="checkmark-circle" size={20} color={staticColors.success} />
            </View>
            <Text style={styles.statValue}>{approvals.filter(a => a.status === 'approved').length}</Text>
            <Text style={styles.statLabel}>Approvati</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-rejected">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.destructive}20` }]}>
              <Ionicons name="close-circle" size={20} color={staticColors.destructive} />
            </View>
            <Text style={styles.statValue}>{approvals.filter(a => a.status === 'rejected').length}</Text>
            <Text style={styles.statLabel}>Rifiutati</Text>
          </GlassCard>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
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
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessuna approvazione trovata</Text>
          <Text style={styles.emptyText}>
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
    backgroundColor: staticColors.background,
  },
  statsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.md,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: staticColors.border,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  filtersContainer: {
    marginTop: spacing.md,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
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
    fontSize: typography.fontSize.xs - 2,
    fontWeight: '600',
    color: staticColors.warningForeground,
  },
  filterBadgeTextActive: {
    color: staticColors.primary,
  },
  listContent: {
    padding: spacing.lg,
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
  },
  eventName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    flex: 1,
    marginRight: spacing.sm,
  },
  gestoreInfo: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  approvalDetails: {
    backgroundColor: staticColors.background,
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
    color: staticColors.mutedForeground,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
    marginTop: 2,
  },
  submittedAt: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: spacing.sm,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${staticColors.destructive}10`,
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
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
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
    color: staticColors.foreground,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
