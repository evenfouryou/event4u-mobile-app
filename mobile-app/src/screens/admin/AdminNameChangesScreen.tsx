import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { NameChangeRequest } from '@/lib/api';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

interface AdminNameChangesScreenProps {
  onBack: () => void;
}

export function AdminNameChangesScreen({ onBack }: AdminNameChangesScreenProps) {
  const { colors } = useTheme();
  const [requests, setRequests] = useState<NameChangeRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<NameChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadNameChanges();
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
    filterRequests();
  }, [requests, activeFilter]);

  const loadNameChanges = async () => {
    try {
      setIsLoading(true);
      const data = await api.getNameChanges();
      setRequests(data);
    } catch (error) {
      console.error('Error loading name changes:', error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterRequests = () => {
    if (activeFilter === 'all') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(r => r.status === activeFilter));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNameChanges();
    setRefreshing(false);
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      triggerHaptic('light');
      await api.approveNameChange(id);
      await loadNameChanges();
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
      await loadNameChanges();
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'approved':
        return <Badge variant="success">Approvato</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rifiutato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'pending', label: 'In attesa' },
    { id: 'approved', label: 'Approvati' },
    { id: 'rejected', label: 'Rifiutati' },
  ];

  const renderRequest = ({ item }: { item: NameChangeRequest }) => {
    const isProcessing = processingId === item.id;

    return (
      <Card style={styles.requestCard} testID={`name-change-${item.id}`}>
        <View style={styles.requestHeader}>
          <View style={styles.requestIcon}>
            <Ionicons name="swap-horizontal" size={24} color={staticColors.primary} />
          </View>
          <View style={styles.requestInfo}>
            <View style={styles.nameChangeRow}>
              <Text style={styles.originalName} numberOfLines={1}>{item.originalFirstName} {item.originalLastName}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.mutedForeground} />
              <Text style={styles.newName} numberOfLines={1}>{item.newFirstName} {item.newLastName}</Text>
            </View>
            <View style={styles.requestMeta}>
              {item.eventName && (
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.metaText}>{item.eventName}</Text>
                </View>
              )}
              {item.requesterName && (
                <View style={styles.metaItem}>
                  <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.metaText}>{item.requesterName}</Text>
                </View>
              )}
            </View>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View style={styles.requestDivider} />

        <View style={styles.requestDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="ticket-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>Biglietto: {item.ticketCode || '-'}</Text>
          </View>
          {item.createdAt && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
              <Text style={styles.detailText}>Richiesto: {formatDate(item.createdAt)}</Text>
            </View>
          )}
          {item.reason && (
            <View style={styles.detailRow}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.mutedForeground} />
              <Text style={styles.detailText} numberOfLines={2}>Motivo: {item.reason}</Text>
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
              name={item.status === 'approved' ? 'checkmark-circle' : 'close-circle'} 
              size={16} 
              color={item.status === 'approved' ? staticColors.teal : staticColors.destructive} 
            />
            <Text style={styles.processedText}>
              {item.status === 'approved' ? 'Approvato' : 'Rifiutato'} il {formatDate(item.processedAt)}
              {item.processedBy && ` da ${item.processedBy}`}
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
        <Text style={styles.screenTitle}>Richieste Cambio Nome</Text>
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
      ) : filteredRequests.length > 0 ? (
        <FlatList
          data={filteredRequests}
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
              : 'Le richieste di cambio nome appariranno qui'}
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
