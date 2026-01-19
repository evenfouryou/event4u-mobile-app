import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Approval {
  id: number;
  type: 'name_change' | 'refund' | 'void' | 'discount' | 'manual_entry';
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  requestedAt: string;
  description: string;
  ticketNumber: string | null;
  eventName: string | null;
  amount: number | null;
  metadata: Record<string, any>;
}

export function SIAEApprovalsScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);

  const numColumns = (isTablet || isLandscape) ? 2 : 1;

  const loadApprovals = async () => {
    try {
      const response = await api.get<any>('/api/siae/approvals');
      const data = response.approvals || response || [];
      setApprovals(data);
    } catch (error) {
      console.error('Error loading approvals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadApprovals();
  };

  const handleApprove = async (approval: Approval) => {
    Alert.alert(
      'Conferma Approvazione',
      `Vuoi approvare questa richiesta di ${getTypeLabel(approval.type).toLowerCase()}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Approva',
          style: 'default',
          onPress: async () => {
            setProcessing(approval.id);
            try {
              await api.post(`/api/siae/approvals/${approval.id}/approve`);
              loadApprovals();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile approvare la richiesta');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (approval: Approval) => {
    Alert.alert(
      'Conferma Rifiuto',
      `Vuoi rifiutare questa richiesta di ${getTypeLabel(approval.type).toLowerCase()}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rifiuta',
          style: 'destructive',
          onPress: async () => {
            setProcessing(approval.id);
            try {
              await api.post(`/api/siae/approvals/${approval.id}/reject`);
              loadApprovals();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile rifiutare la richiesta');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'name_change':
        return colors.teal;
      case 'refund':
        return colors.warning;
      case 'void':
        return colors.destructive;
      case 'discount':
        return colors.primary;
      case 'manual_entry':
        return colors.success;
      default:
        return colors.mutedForeground;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'name_change':
        return 'swap-horizontal';
      case 'refund':
        return 'arrow-undo';
      case 'void':
        return 'close-circle';
      case 'discount':
        return 'pricetag';
      case 'manual_entry':
        return 'create';
      default:
        return 'help-circle';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'name_change':
        return 'Cambio Nominativo';
      case 'refund':
        return 'Rimborso';
      case 'void':
        return 'Annullamento';
      case 'discount':
        return 'Sconto';
      case 'manual_entry':
        return 'Inserimento Manuale';
      default:
        return type;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const pendingApprovals = approvals.filter(a => a.status === 'pending');

  const renderApproval = ({ item, index }: { item: Approval; index: number }) => (
    <View style={[
      styles.approvalCardWrapper,
      numColumns === 2 && {
        flex: 1,
        marginLeft: index % 2 === 1 ? spacing.sm : 0,
        marginRight: index % 2 === 0 ? spacing.sm : 0,
      }
    ]}>
      <Card variant="glass" style={styles.approvalCard}>
        <View style={styles.approvalHeader}>
          <View style={[styles.typeIcon, { backgroundColor: `${getTypeColor(item.type)}20` }]}>
            <Ionicons name={getTypeIcon(item.type) as any} size={24} color={getTypeColor(item.type)} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.typeLabel}>{getTypeLabel(item.type)}</Text>
            <Text style={styles.requestedBy}>Richiesto da: {item.requestedBy}</Text>
          </View>
        </View>
        
        <Text style={styles.description}>{item.description}</Text>
        
        <View style={styles.detailsRow}>
          {item.ticketNumber && (
            <View style={styles.detailItem}>
              <Ionicons name="ticket-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.detailText}>{item.ticketNumber}</Text>
            </View>
          )}
          {item.eventName && (
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.detailText}>{item.eventName}</Text>
            </View>
          )}
          {item.amount !== null && (
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.detailText}>{formatCurrency(item.amount)}</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.timestamp}>{formatDate(item.requestedAt)}</Text>
        
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item)}
            disabled={processing === item.id}
            activeOpacity={0.8}
            testID={`button-reject-${item.id}`}
          >
            <Ionicons name="close" size={20} color={colors.destructive} />
            <Text style={[styles.actionText, { color: colors.destructive }]}>Rifiuta</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}
            disabled={processing === item.id}
            activeOpacity={0.8}
            testID={`button-approve-${item.id}`}
          >
            {processing === item.id ? (
              <ActivityIndicator size="small" color={colors.successForeground} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={colors.successForeground} />
                <Text style={[styles.actionText, { color: colors.successForeground }]}>Approva</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Approvazioni" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Approvazioni" showBack onBack={() => navigation.goBack()} />
      
      {pendingApprovals.length > 0 && (
        <View style={styles.countBanner}>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{pendingApprovals.length}</Text>
          </View>
          <Text style={styles.countLabel}>
            {pendingApprovals.length === 1 ? 'richiesta in attesa' : 'richieste in attesa'}
          </Text>
        </View>
      )}
      
      <FlatList
        key={numColumns}
        data={pendingApprovals}
        renderItem={renderApproval}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary}
            testID="refresh-control"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
            <Text style={styles.emptyText}>Nessuna approvazione in sospeso</Text>
            <Text style={styles.emptySubtext}>Tutte le richieste sono state elaborate</Text>
          </View>
        }
        testID="approvals-list"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  countBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: `${colors.warning}10`,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  countBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  countText: {
    color: colors.warningForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  countLabel: {
    color: colors.warning,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  approvalCardWrapper: {
    marginBottom: spacing.lg,
  },
  approvalCard: {
    flex: 1,
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  headerInfo: {
    flex: 1,
  },
  typeLabel: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  requestedBy: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  description: {
    color: colors.foreground,
    fontSize: fontSize.base,
    marginBottom: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  timestamp: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  rejectButton: {
    backgroundColor: `${colors.destructive}20`,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  actionText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  emptyText: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  emptySubtext: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});

export default SIAEApprovalsScreen;
