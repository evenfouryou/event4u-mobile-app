import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { NameChangeRequest } from '@/lib/api';

type TabType = 'pending' | 'approved' | 'rejected';

interface GestoreSIAENameChangesScreenProps {
  onBack: () => void;
}

export function GestoreSIAENameChangesScreen({ onBack }: GestoreSIAENameChangesScreenProps) {
  const { colors } = useTheme();
  const [requests, setRequests] = useState<NameChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRequests();
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

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const data = await api.getNameChangeRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error loading name change requests:', error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleApprove = async (request: NameChangeRequest) => {
    Alert.alert(
      'Approva Cambio Nominativo',
      `Confermi di voler approvare il cambio nominativo da "${request.originalName}" a "${request.newName}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Approva',
          style: 'default',
          onPress: async () => {
            try {
              setProcessingIds(prev => new Set(prev).add(request.id));
              triggerHaptic('success');
              await api.approveNameChange(request.id);
              await loadRequests();
            } catch (error) {
              console.error('Error approving name change:', error);
              triggerHaptic('error');
              Alert.alert('Errore', 'Impossibile approvare la richiesta');
            } finally {
              setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(request.id);
                return next;
              });
            }
          },
        },
      ]
    );
  };

  const handleReject = async (request: NameChangeRequest) => {
    Alert.alert(
      'Rifiuta Cambio Nominativo',
      `Confermi di voler rifiutare il cambio nominativo da "${request.originalName}" a "${request.newName}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rifiuta',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingIds(prev => new Set(prev).add(request.id));
              triggerHaptic('medium');
              await api.rejectNameChange(request.id);
              await loadRequests();
            } catch (error) {
              console.error('Error rejecting name change:', error);
              triggerHaptic('error');
              Alert.alert('Errore', 'Impossibile rifiutare la richiesta');
            } finally {
              setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(request.id);
                return next;
              });
            }
          },
        },
      ]
    );
  };

  const handleViewDocument = (documentUrl: string) => {
    triggerHaptic('light');
    Linking.openURL(documentUrl);
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(r => r.status === activeTab);
  }, [requests, activeTab]);

  const getStatusBadge = (status: NameChangeRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">In Attesa</Badge>;
      case 'approved':
        return <Badge variant="success">Approvata</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rifiutata</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getTabCount = (tab: TabType) => {
    return requests.filter(r => r.status === tab).length;
  };

  const renderRequest = ({ item }: { item: NameChangeRequest }) => {
    const isProcessing = processingIds.has(item.id);

    return (
      <Card style={styles.requestCard} testID={`name-change-${item.id}`}>
        <View style={styles.requestHeader}>
          <View style={styles.requestInfo}>
            <Text style={[styles.ticketCode, { color: colors.foreground }]} numberOfLines={1}>
              {item.ticketCode}
            </Text>
            <View style={styles.requestMeta}>
              <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.requestMetaText, { color: colors.mutedForeground }]}>
                {formatDate(item.requestDate)}
              </Text>
            </View>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View style={[styles.requestDivider, { backgroundColor: colors.border }]} />

        <View style={styles.nameChangeContainer}>
          <View style={styles.nameSection}>
            <Text style={[styles.nameLabel, { color: colors.mutedForeground }]}>Nome Originale</Text>
            <Text style={[styles.nameValue, { color: colors.foreground }]}>{item.originalName}</Text>
          </View>
          <View style={styles.arrowContainer}>
            <Ionicons name="arrow-forward" size={20} color={colors.primary} />
          </View>
          <View style={[styles.nameSection, styles.nameSectionRight]}>
            <Text style={[styles.nameLabel, { color: colors.mutedForeground }]}>Nuovo Nome</Text>
            <Text style={[styles.nameValue, { color: colors.foreground }]}>{item.newName}</Text>
          </View>
        </View>

        <View style={[styles.requestDivider, { backgroundColor: colors.border }]} />

        <View style={styles.requestDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Evento</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]} numberOfLines={1}>
              {item.eventName}
            </Text>
          </View>
          {item.fee > 0 && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Commissione</Text>
              <Text style={[styles.detailValue, styles.feeValue, { color: staticColors.warning }]}>
                {formatCurrency(item.fee)}
              </Text>
            </View>
          )}
        </View>

        {item.documentUrl && (
          <Pressable
            style={[styles.documentButton, { backgroundColor: colors.secondary }]}
            onPress={() => handleViewDocument(item.documentUrl!)}
            testID={`button-view-document-${item.id}`}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.foreground} />
            <Text style={[styles.documentButtonText, { color: colors.foreground }]}>
              Visualizza Documento
            </Text>
          </Pressable>
        )}

        {item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <Button
              variant="outline"
              size="sm"
              onPress={() => handleReject(item)}
              disabled={isProcessing}
              style={styles.rejectButton}
              testID={`button-reject-${item.id}`}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="close-circle-outline" size={16} color={staticColors.destructive} />
                <Text style={[styles.rejectButtonText, { color: staticColors.destructive }]}>Rifiuta</Text>
              </View>
            </Button>
            <Button
              variant="default"
              size="sm"
              onPress={() => handleApprove(item)}
              disabled={isProcessing}
              style={styles.approveButton}
              testID={`button-approve-${item.id}`}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="checkmark-circle-outline" size={16} color={staticColors.primaryForeground} />
                <Text style={[styles.approveButtonText, { color: staticColors.primaryForeground }]}>Approva</Text>
              </View>
            </Button>
          </View>
        )}
      </Card>
    );
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'pending', label: 'In Attesa' },
    { id: 'approved', label: 'Approvate' },
    { id: 'rejected', label: 'Rifiutate' },
  ];

  return (
    <SafeArea edges={['bottom']} style={{ ...styles.container, backgroundColor: colors.background }}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-name-changes"
      />

      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.foreground }]}>Cambio Nominativo</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {requests.length} richieste totali
        </Text>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab(tab.id);
            }}
            style={[
              styles.tab,
              { backgroundColor: colors.secondary },
              activeTab === tab.id && { backgroundColor: colors.primary },
            ]}
            testID={`tab-${tab.id}`}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: colors.mutedForeground },
                activeTab === tab.id && { color: staticColors.primaryForeground },
              ]}
            >
              {tab.label}
            </Text>
            <View style={[
              styles.tabBadge,
              { backgroundColor: activeTab === tab.id ? 'rgba(0,0,0,0.2)' : colors.border },
            ]}>
              <Text style={[
                styles.tabBadgeText,
                { color: activeTab === tab.id ? staticColors.primaryForeground : colors.mutedForeground },
              ]}>
                {getTabCount(tab.id)}
              </Text>
            </View>
          </Pressable>
        ))}
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
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna richiesta trovata</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Non ci sono richieste di cambio nominativo {
              activeTab === 'pending' ? 'in attesa' :
              activeTab === 'approved' ? 'approvate' : 'rifiutate'
            }
          </Text>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tabLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  tabBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  requestCard: {
    padding: spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  requestInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  ticketCode: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  requestMetaText: {
    fontSize: typography.fontSize.sm,
  },
  requestDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  nameChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameSection: {
    flex: 1,
  },
  nameSectionRight: {
    alignItems: 'flex-end',
  },
  nameLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: 4,
  },
  nameValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  arrowContainer: {
    paddingHorizontal: spacing.sm,
  },
  requestDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  feeValue: {
    fontWeight: '700',
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  documentButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rejectButton: {
    flex: 1,
  },
  approveButton: {
    flex: 1,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rejectButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  approveButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
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

export default GestoreSIAENameChangesScreen;
