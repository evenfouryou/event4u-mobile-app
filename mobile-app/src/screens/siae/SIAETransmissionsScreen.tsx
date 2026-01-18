import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

type FilterType = 'all' | 'RCA' | 'RMG' | 'RPM';
type FilterStatus = 'all' | 'pending' | 'success' | 'error';

interface Transmission {
  id: number;
  type: string;
  status: 'pending' | 'success' | 'error';
  eventName: string;
  createdAt: string;
  errorMessage?: string;
}

export function SIAETransmissionsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transmissions, setTransmissions] = useState<Transmission[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const loadTransmissions = async () => {
    try {
      const response = await api.get<any>('/api/siae/transmissions');
      const data = response.transmissions || response || [];
      
      setTransmissions(data.map((t: any) => ({
        id: t.id,
        type: t.type || t.reportType || 'RCA',
        status: t.status === 'completed' ? 'success' : t.status === 'failed' ? 'error' : t.status,
        eventName: t.eventName || t.event?.name || 'Evento',
        createdAt: t.createdAt,
        errorMessage: t.errorMessage,
      })));
    } catch (error) {
      console.error('Error loading transmissions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransmissions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTransmissions();
  };

  const filteredTransmissions = useMemo(() => {
    return transmissions.filter((t) => {
      const typeMatch = filterType === 'all' || t.type === filterType;
      const statusMatch = filterStatus === 'all' || t.status === filterStatus;
      return typeMatch && statusMatch;
    });
  }, [transmissions, filterType, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.destructive;
      case 'pending':
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'pending':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return 'Completato';
      case 'error':
        return 'Errore';
      case 'pending':
        return 'In Attesa';
      default:
        return status;
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

  const typeFilters: FilterType[] = ['all', 'RCA', 'RMG', 'RPM'];
  const statusFilters: FilterStatus[] = ['all', 'pending', 'success', 'error'];

  const renderFilterPill = (
    value: string,
    label: string,
    isActive: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      style={[styles.filterPill, isActive && styles.filterPillActive]}
      onPress={onPress}
      activeOpacity={0.8}
      data-testid={`filter-${value}`}
    >
      <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTransmission = ({ item }: { item: Transmission }) => (
    <TouchableOpacity
      style={styles.transmissionCard}
      onPress={() => navigation.navigate('SIAETransmissionDetail', { transmissionId: item.id })}
      activeOpacity={0.8}
      data-testid={`card-transmission-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.transmissionRow}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor(item.status) }
          ]} />
          <View style={styles.transmissionInfo}>
            <View style={styles.transmissionHeader}>
              <View style={[styles.typeBadge, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[styles.typeText, { color: colors.primary }]}>
                  {item.type}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor(item.status)}20` }
              ]}>
                <Ionicons
                  name={getStatusIcon(item.status) as any}
                  size={14}
                  color={getStatusColor(item.status)}
                />
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.transmissionEvent}>{item.eventName}</Text>
            <Text style={styles.transmissionDate}>{formatDate(item.createdAt)}</Text>
            {item.errorMessage && item.status === 'error' && (
              <Text style={styles.errorPreview} numberOfLines={1}>
                {item.errorMessage}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title="Trasmissioni SIAE"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Trasmissioni SIAE"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('SIAEReports')}
            data-testid="button-new-report"
          >
            <Ionicons name="add-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      
      <View style={styles.filtersSection}>
        <Text style={styles.filterLabel}>Tipo</Text>
        <View style={styles.filterRow}>
          {typeFilters.map((type) => 
            renderFilterPill(
              type,
              type === 'all' ? 'Tutti' : type,
              filterType === type,
              () => setFilterType(type)
            )
          )}
        </View>
        
        <Text style={styles.filterLabel}>Stato</Text>
        <View style={styles.filterRow}>
          {statusFilters.map((status) => 
            renderFilterPill(
              status,
              status === 'all' ? 'Tutti' : getStatusLabel(status),
              filterStatus === status,
              () => setFilterStatus(status)
            )
          )}
        </View>
      </View>
      
      <FlatList
        data={filteredTransmissions}
        renderItem={renderTransmission}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna trasmissione trovata</Text>
            <Text style={styles.emptySubtext}>
              Modifica i filtri o genera un nuovo report
            </Text>
          </View>
        }
      />
    </View>
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
  filtersSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  transmissionCard: {
    marginBottom: spacing.md,
  },
  transmissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 4,
    height: '100%',
    minHeight: 60,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  transmissionInfo: {
    flex: 1,
  },
  transmissionHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  transmissionEvent: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  transmissionDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  errorPreview: {
    color: colors.destructive,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
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

export default SIAETransmissionsScreen;
