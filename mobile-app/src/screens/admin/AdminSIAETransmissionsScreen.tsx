import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme, ThemeColors } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAETransmission } from '@/lib/api';

type StatusFilter = 'all' | 'sent' | 'pending' | 'error' | 'accepted';

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

  const dynamicStyles = createDynamicStyles(colors);

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
      pending: data.filter(t => t.status === 'pending' || t.status === 'draft').length,
      completed: data.filter(t => t.status === 'sent' || t.status === 'accepted').length,
      failed: data.filter(t => t.status === 'error' || t.status === 'rejected').length,
    };
    setStats(stats);
  };

  const filterTransmissions = () => {
    let filtered = [...transmissions];

    if (activeFilter !== 'all') {
      if (activeFilter === 'accepted') {
        filtered = filtered.filter(t => t.status === 'accepted' || t.status === 'sent');
      } else {
        filtered = filtered.filter(t => t.status === activeFilter);
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(transmission =>
        transmission.eventName?.toLowerCase().includes(query) ||
        transmission.companyName?.toLowerCase().includes(query) ||
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
        return <Badge variant="default">Inviato</Badge>;
      case 'accepted':
        return <Badge variant="success">Accettato</Badge>;
      case 'pending':
      case 'draft':
        return <Badge variant="warning">In attesa</Badge>;
      case 'error':
      case 'rejected':
        return <Badge variant="destructive">Errore</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'RCA':
        return `${colors.primary}20`;
      case 'RMG':
        return `${colors.warning}20`;
      case 'RPM':
        return `${colors.accent}20`;
      default:
        return `${colors.secondary}20`;
    }
  };

  const filters: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'pending', label: 'In attesa' },
    { id: 'accepted', label: 'Accettati' },
    { id: 'error', label: 'Errori' },
  ];

  const renderTransmission = ({ item }: { item: SIAETransmission }) => (
    <Card style={dynamicStyles.transmissionCard} testID={`transmission-${item.id}`}>
      <View style={dynamicStyles.transmissionHeader}>
        <View style={dynamicStyles.reportTypeContainer}>
          <View style={[dynamicStyles.reportTypeIcon, { backgroundColor: getReportTypeColor(item.reportType) }]}>
            <Text style={dynamicStyles.reportTypeText}>{item.reportType}</Text>
          </View>
          <View style={dynamicStyles.transmissionInfo}>
            <Text style={dynamicStyles.companyName} numberOfLines={1}>{item.companyName || 'Azienda sconosciuta'}</Text>
            <Text style={dynamicStyles.eventName} numberOfLines={1}>{item.eventName || 'Nessun evento'}</Text>
            <Text style={dynamicStyles.date}>{formatDate(item.transmissionDate)}</Text>
          </View>
        </View>
        {getStatusBadge(item.status)}
      </View>
      {item.errorMessage && (
        <View style={dynamicStyles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={colors.destructive} />
          <Text style={dynamicStyles.errorMessage}>{item.errorMessage}</Text>
        </View>
      )}
    </Card>
  );

  return (
    <SafeArea edges={['bottom']} style={dynamicStyles.container}>
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
          <View style={dynamicStyles.statsSection}>
            <Text style={dynamicStyles.title}>Trasmissioni SIAE</Text>
            <View style={dynamicStyles.statsGrid}>
              <GlassCard style={dynamicStyles.statCard} testID="stat-total-transmissions">
                <View style={[dynamicStyles.statIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="send" size={20} color={colors.primary} />
                </View>
                <Text style={dynamicStyles.statValue}>{stats.total}</Text>
                <Text style={dynamicStyles.statLabel}>Totali</Text>
              </GlassCard>

              <GlassCard style={dynamicStyles.statCard} testID="stat-pending-transmissions">
                <View style={[dynamicStyles.statIcon, { backgroundColor: `${colors.warning}20` }]}>
                  <Ionicons name="time" size={20} color={colors.warning} />
                </View>
                <Text style={dynamicStyles.statValue}>{stats.pending}</Text>
                <Text style={dynamicStyles.statLabel}>In attesa</Text>
              </GlassCard>

              <GlassCard style={dynamicStyles.statCard} testID="stat-completed-transmissions">
                <View style={[dynamicStyles.statIcon, { backgroundColor: `${colors.success}20` }]}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                </View>
                <Text style={dynamicStyles.statValue}>{stats.completed}</Text>
                <Text style={dynamicStyles.statLabel}>Completate</Text>
              </GlassCard>

              <GlassCard style={dynamicStyles.statCard} testID="stat-failed-transmissions">
                <View style={[dynamicStyles.statIcon, { backgroundColor: `${colors.destructive}20` }]}>
                  <Ionicons name="warning" size={20} color={colors.destructive} />
                </View>
                <Text style={dynamicStyles.statValue}>{stats.failed}</Text>
                <Text style={dynamicStyles.statLabel}>Errori</Text>
              </GlassCard>
            </View>
          </View>

          <View style={dynamicStyles.searchContainer}>
            <View style={dynamicStyles.searchInputWrapper}>
              <Ionicons name="search" size={20} color={colors.mutedForeground} />
              <TextInput
                style={dynamicStyles.searchInput}
                placeholder="Cerca azienda, evento o tipo..."
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

          <View style={dynamicStyles.filtersContainer}>
            <FlatList
              horizontal
              data={filters}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={dynamicStyles.filtersList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    setActiveFilter(item.id);
                  }}
                  style={[
                    dynamicStyles.filterChip,
                    activeFilter === item.id && dynamicStyles.filterChipActive,
                  ]}
                  testID={`filter-${item.id}`}
                >
                  <Text
                    style={[
                      dynamicStyles.filterChipText,
                      activeFilter === item.id && dynamicStyles.filterChipTextActive,
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
              contentContainerStyle={dynamicStyles.listContent}
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
            <View style={dynamicStyles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
              <Text style={dynamicStyles.emptyTitle}>Nessuna trasmissione</Text>
              <Text style={dynamicStyles.emptyText}>
                {searchQuery ? 'Prova con una ricerca diversa' : 'Le trasmissioni SIAE appariranno qui'}
              </Text>
            </View>
          )}
        </>
      )}
    </SafeArea>
  );
}

const createDynamicStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
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
    color: colors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
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
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  filtersContainer: {
    paddingVertical: spacing.sm,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondary,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  filterChipTextActive: {
    color: colors.primaryForeground,
    fontWeight: '600',
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
    color: colors.foreground,
  },
  transmissionInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  eventName: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  date: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  errorMessage: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.destructive,
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
    color: colors.foreground,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default AdminSIAETransmissionsScreen;
