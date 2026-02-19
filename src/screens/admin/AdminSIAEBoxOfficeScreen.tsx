import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SiaeBoxOfficeSession } from '@/lib/api';

interface AdminSIAEBoxOfficeScreenProps {
  onBack: () => void;
}

type StatusFilter = 'all' | 'open' | 'closed' | 'reconciled';

export function AdminSIAEBoxOfficeScreen({ onBack }: AdminSIAEBoxOfficeScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<(SiaeBoxOfficeSession & { userName?: string; emissionChannelName?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    loadSessions();
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

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminSIAEBoxOfficeSessions();
      setSessions(data);
    } catch (error) {
      console.error('Error loading SIAE box office sessions:', error);
      Alert.alert('Errore', 'Impossibile caricare le sessioni di cassa');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default">Aperta</Badge>;
      case 'closed':
        return <Badge variant="secondary">Chiusa</Badge>;
      case 'reconciled':
        return <Badge variant="success">Quadrata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (activeFilter === 'all') return true;
    return session.status === activeFilter;
  });

  const stats = {
    activeSessions: sessions.filter(s => s.status === 'open').length,
    totalSessions: sessions.length,
    totalTickets: sessions.reduce((sum, s) => sum + (s.ticketsSold || 0), 0),
    totalRevenue: sessions.reduce((sum, s) => sum + (Number(s.cashTotal || 0) + Number(s.cardTotal || 0)), 0),
  };

  const filters: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'open', label: 'Aperte' },
    { id: 'closed', label: 'Chiuse' },
    { id: 'reconciled', label: 'Quadrate' },
  ];

  const renderSessionCard = ({ item }: { item: SiaeBoxOfficeSession & { userName?: string; emissionChannelName?: string } }) => (
    <Card style={styles.sessionCard} testID={`card-session-${item.id}`}>
      <Pressable
        style={styles.sessionContent}
        onPress={() => {
          triggerHaptic('light');
        }}
      >
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <View style={styles.statusBadgeContainer}>
              {getStatusBadge(item.status)}
              {item.status === 'open' && (
                <View style={[styles.activeDot, { backgroundColor: staticColors.success }]} />
              )}
            </View>
            <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
              {item.userName || `Operatore ${item.userId?.slice(0, 6)}...`}
            </Text>
          </View>
        </View>

        <View style={styles.sessionDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              {formatDateTime(item.openedAt)}
              {item.closedAt && ` - ${new Date(item.closedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
            </Text>
          </View>

          {item.emissionChannelName && (
            <View style={styles.detailRow}>
              <Ionicons name="storefront-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.detailText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.emissionChannelName}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.sessionStats, { borderTopColor: colors.border }]}>
          <View style={styles.statItem}>
            <Ionicons name="ticket-outline" size={16} color={staticColors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {item.ticketsSold || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Biglietti
            </Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={16} color={staticColors.golden} />
            <Text style={[styles.statValue, { color: staticColors.golden }]}>
              €{Number(item.cashTotal || 0).toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Contanti
            </Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="card-outline" size={16} color={staticColors.teal} />
            <Text style={[styles.statValue, { color: staticColors.teal }]}>
              €{Number(item.cardTotal || 0).toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Carte
            </Text>
          </View>
        </View>
      </Pressable>
    </Card>
  );

  const styles = createStyles(colors, insets);

  if (showLoader) {
    return <Loading text="Caricamento sessioni di cassa..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Sessioni di Cassa"
        onBack={onBack}
        testID="header-admin-siae-box-office"
      />

      <View style={styles.statsSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Riepilogo
        </Text>
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard} testID="stat-active-sessions">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={staticColors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {stats.activeSessions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Sessioni Attive
            </Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-total-sessions">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
              <Ionicons name="list-outline" size={20} color={staticColors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {stats.totalSessions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Sessioni Totali
            </Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-total-tickets">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.warning}20` }]}>
              <Ionicons name="ticket-outline" size={20} color={staticColors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {stats.totalTickets}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Biglietti Emessi
            </Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-total-revenue">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
              <Ionicons name="cash-outline" size={20} color={staticColors.golden} />
            </View>
            <Text style={[styles.statValue, { color: staticColors.golden }]}>
              €{stats.totalRevenue.toFixed(0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Ricavi Totali
            </Text>
          </GlassCard>
        </View>
      </View>

      <View style={styles.filterContainer}>
        {filters.map(filter => (
          <Pressable
            key={filter.id}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === filter.id ? staticColors.primary : colors.card,
                borderColor: activeFilter === filter.id ? staticColors.primary : colors.border,
              }
            ]}
            onPress={() => {
              triggerHaptic('light');
              setActiveFilter(filter.id);
            }}
            testID={`filter-${filter.id}`}
          >
            <Text style={[
              styles.filterText,
              { color: activeFilter === filter.id ? '#000000' : colors.mutedForeground }
            ]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredSessions}
        renderItem={renderSessionCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={staticColors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Nessuna Sessione
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Non ci sono sessioni di cassa che corrispondono ai filtri
            </Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  statsSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: insets.bottom + spacing.xl,
  },
  sessionCard: {
    marginBottom: spacing.md,
  },
  sessionContent: {
    padding: spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sessionInfo: {
    flex: 1,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionDetails: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '400',
    flex: 1,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
