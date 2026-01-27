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
import api, { AdminSIAEMonitorStats, AdminSIAEActivity, SIAEReportStatus } from '@/lib/api';

type StatusFilter = 'all' | 'pending' | 'sent' | 'approved' | 'error';

interface AdminSIAEMonitorScreenProps {
  onBack: () => void;
}

export function AdminSIAEMonitorScreen({ onBack }: AdminSIAEMonitorScreenProps) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<AdminSIAEMonitorStats>({
    totalEvents: 0,
    pendingReports: 0,
    transmissionErrors: 0,
    successRate: 0,
    totalGestori: 0,
    activeGestori: 0,
  });
  const [activities, setActivities] = useState<AdminSIAEActivity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<AdminSIAEActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    filterActivities();
  }, [activities, activeFilter, searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsData, activitiesData] = await Promise.all([
        api.getAdminSIAEMonitorStats(),
        api.getAdminSIAEActivities(),
      ]);
      setStats(statsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error loading SIAE monitor data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];

    if (activeFilter !== 'all') {
      filtered = filtered.filter(activity => activity.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.gestoreName.toLowerCase().includes(query) ||
        activity.eventName?.toLowerCase().includes(query)
      );
    }

    setFilteredActivities(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: SIAEReportStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'sent':
        return <Badge variant="default">Inviato</Badge>;
      case 'approved':
        return <Badge variant="success">Approvato</Badge>;
      case 'error':
        return <Badge variant="destructive">Errore</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'rca':
        return 'RCA';
      case 'rmg':
        return 'RMG';
      case 'rpm':
        return 'RPM';
      default:
        return type.toUpperCase();
    }
  };

  const filters: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'pending', label: 'In attesa' },
    { id: 'sent', label: 'Inviati' },
    { id: 'approved', label: 'Approvati' },
    { id: 'error', label: 'Errori' },
  ];

  const renderActivity = ({ item }: { item: AdminSIAEActivity }) => (
    <Card style={styles.activityCard} testID={`activity-${item.id}`}>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.gestoreName}>{item.gestoreName}</Text>
          {getStatusBadge(item.status)}
        </View>
        <View style={styles.activityDetails}>
          <Badge variant="outline" style={styles.typeBadge}>
            {getReportTypeLabel(item.reportType)}
          </Badge>
          {item.eventName && (
            <Text style={styles.eventName} numberOfLines={1}>{item.eventName}</Text>
          )}
        </View>
        <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
      </View>
    </Card>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-monitor"
      />

      {showLoader ? (
        <Loading text="Caricamento monitoraggio SIAE..." />
      ) : (
        <>
          <View style={styles.statsSection}>
            <Text style={styles.title}>Monitoraggio SIAE</Text>
            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard} testID="stat-total-events">
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                  <Ionicons name="calendar" size={20} color={staticColors.primary} />
                </View>
                <Text style={styles.statValue}>{stats.totalEvents}</Text>
                <Text style={styles.statLabel}>Eventi Totali</Text>
              </GlassCard>

              <GlassCard style={styles.statCard} testID="stat-pending-reports">
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.warning}20` }]}>
                  <Ionicons name="time" size={20} color={staticColors.warning} />
                </View>
                <Text style={styles.statValue}>{stats.pendingReports}</Text>
                <Text style={styles.statLabel}>Report Pendenti</Text>
              </GlassCard>

              <GlassCard style={styles.statCard} testID="stat-errors">
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.destructive}20` }]}>
                  <Ionicons name="warning" size={20} color={staticColors.destructive} />
                </View>
                <Text style={styles.statValue}>{stats.transmissionErrors}</Text>
                <Text style={styles.statLabel}>Errori</Text>
              </GlassCard>

              <GlassCard style={styles.statCard} testID="stat-success-rate">
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                  <Ionicons name="checkmark-circle" size={20} color={staticColors.success} />
                </View>
                <Text style={styles.statValue}>{stats.successRate}%</Text>
                <Text style={styles.statLabel}>Tasso Successo</Text>
              </GlassCard>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color={colors.mutedForeground} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cerca gestore o evento..."
                placeholderTextColor={colors.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
                testID="input-search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
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
                </Pressable>
              )}
            />
          </View>

          <Text style={styles.sectionTitle}>Attività Recenti</Text>

          {filteredActivities.length > 0 ? (
            <FlatList
              data={filteredActivities}
              renderItem={renderActivity}
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
              <Text style={styles.emptyTitle}>Nessuna attività</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Prova con una ricerca diversa' : 'Le attività SIAE appariranno qui'}
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
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
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
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  activityCard: {
    padding: spacing.md,
  },
  activityContent: {
    gap: spacing.xs,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gestoreName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    flex: 1,
  },
  activityDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeBadge: {
    minWidth: 40,
  },
  eventName: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    flex: 1,
  },
  timestamp: {
    fontSize: typography.fontSize.xs,
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

export default AdminSIAEMonitorScreen;
