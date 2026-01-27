import { useState, useEffect } from 'react';
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
import api, { SIAETransmission } from '@/lib/api';

type StatusFilter = 'all' | 'sent' | 'pending' | 'error' | 'confirmed';

interface AdminSIAETransmissionsScreenProps {
  onBack: () => void;
}

interface TransmissionStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
}

export function AdminSIAETransmissionsScreen({ onBack }: AdminSIAETransmissionsScreenProps) {
  const { colors } = useTheme();
  const [transmissions, setTransmissions] = useState<SIAETransmission[]>([]);
  const [filteredTransmissions, setFilteredTransmissions] = useState<SIAETransmission[]>([]);
  const [stats, setStats] = useState<TransmissionStats>({
    total: 0,
    pending: 0,
    completed: 0,
    failed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTransmissions();
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
    filterTransmissions();
  }, [transmissions, activeFilter, searchQuery]);

  const loadTransmissions = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAETransmissions();
      setTransmissions(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error loading SIAE transmissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: SIAETransmission[]) => {
    const stats: TransmissionStats = {
      total: data.length,
      pending: data.filter(t => t.status === 'pending').length,
      completed: data.filter(t => t.status === 'sent' || t.status === 'confirmed').length,
      failed: data.filter(t => t.status === 'error').length,
    };
    setStats(stats);
  };

  const filterTransmissions = () => {
    let filtered = [...transmissions];

    if (activeFilter !== 'all') {
      filtered = filtered.filter(transmission => transmission.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(transmission =>
        transmission.eventName?.toLowerCase().includes(query) ||
        transmission.reportType.toLowerCase().includes(query)
      );
    }

    setFilteredTransmissions(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransmissions();
    setRefreshing(false);
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
      case 'sent':
        return <Badge variant="success">Inviato</Badge>;
      case 'confirmed':
        return <Badge variant="success">Confermato</Badge>;
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'error':
        return <Badge variant="destructive">Errore</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'RCA':
        return `${staticColors.primary}20`;
      case 'RMG':
        return `${staticColors.warning}20`;
      case 'RPM':
        return `${staticColors.accent}20`;
      default:
        return `${staticColors.secondary}20`;
    }
  };

  const filters: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'pending', label: 'In attesa' },
    { id: 'sent', label: 'Inviati' },
    { id: 'confirmed', label: 'Confermati' },
    { id: 'error', label: 'Errori' },
  ];

  const renderTransmission = ({ item }: { item: SIAETransmission }) => (
    <Card style={styles.transmissionCard} testID={`transmission-${item.id}`}>
      <View style={styles.transmissionHeader}>
        <View style={styles.reportTypeContainer}>
          <View style={[styles.reportTypeIcon, { backgroundColor: getReportTypeColor(item.reportType) }]}>
            <Text style={styles.reportTypeText}>{item.reportType}</Text>
          </View>
          <View style={styles.transmissionInfo}>
            <Text style={styles.eventName} numberOfLines={1}>{item.eventName || 'Evento sconosciuto'}</Text>
            <Text style={styles.date}>{formatDate(item.transmissionDate)}</Text>
          </View>
        </View>
        {getStatusBadge(item.status)}
      </View>
      {item.errorMessage && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={staticColors.destructive} />
          <Text style={styles.errorMessage}>{item.errorMessage}</Text>
        </View>
      )}
    </Card>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-transmissions"
      />

      {showLoader ? (
        <Loading text="Caricamento trasmissioni SIAE..." />
      ) : (
        <>
          <View style={styles.statsSection}>
            <Text style={styles.title}>Trasmissioni SIAE</Text>
            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard} testID="stat-total-transmissions">
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                  <Ionicons name="send" size={20} color={staticColors.primary} />
                </View>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Totali</Text>
              </GlassCard>

              <GlassCard style={styles.statCard} testID="stat-pending-transmissions">
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.warning}20` }]}>
                  <Ionicons name="time" size={20} color={staticColors.warning} />
                </View>
                <Text style={styles.statValue}>{stats.pending}</Text>
                <Text style={styles.statLabel}>In attesa</Text>
              </GlassCard>

              <GlassCard style={styles.statCard} testID="stat-completed-transmissions">
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                  <Ionicons name="checkmark-circle" size={20} color={staticColors.success} />
                </View>
                <Text style={styles.statValue}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completate</Text>
              </GlassCard>

              <GlassCard style={styles.statCard} testID="stat-failed-transmissions">
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.destructive}20` }]}>
                  <Ionicons name="warning" size={20} color={staticColors.destructive} />
                </View>
                <Text style={styles.statValue}>{stats.failed}</Text>
                <Text style={styles.statLabel}>Errori</Text>
              </GlassCard>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color={colors.mutedForeground} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cerca evento o tipo report..."
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
                    triggerHaptic('light');
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

          {filteredTransmissions.length > 0 ? (
            <FlatList
              data={filteredTransmissions}
              renderItem={renderTransmission}
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
              <Text style={styles.emptyTitle}>Nessuna trasmissione</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Prova con una ricerca diversa' : 'Le trasmissioni SIAE appariranno qui'}
              </Text>
            </View>
          )}
        </>
      )}
    </SafeArea>
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
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    padding: spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
    paddingVertical: spacing.sm,
  },
  filtersContainer: {
    paddingVertical: spacing.sm,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  transmissionCard: {
    padding: spacing.md,
  },
  transmissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reportTypeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  reportTypeIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  reportTypeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  transmissionInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    gap: spacing.xs,
  },
  errorMessage: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: staticColors.destructive,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
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
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
