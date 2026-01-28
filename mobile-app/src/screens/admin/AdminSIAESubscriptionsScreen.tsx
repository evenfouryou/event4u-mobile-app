import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAESubscription } from '@/lib/api';

interface AdminSIAESubscriptionsScreenProps {
  onBack: () => void;
}

type FilterType = 'all' | 'active' | 'pending' | 'expired' | 'cancelled';

export function AdminSIAESubscriptionsScreen({ onBack }: AdminSIAESubscriptionsScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [subscriptions, setSubscriptions] = useState<SIAESubscription[]>([]);

  useEffect(() => {
    loadSubscriptions();
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

  const loadSubscriptions = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAESubscriptions();
      setSubscriptions(data);
    } catch (error) {
      console.error('Error loading SIAE subscriptions:', error);
      Alert.alert('Errore', 'Impossibile caricare gli abbonamenti SIAE');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
    setRefreshing(false);
  };

  const getStatusBadge = (status: SIAESubscription['status']) => {
    const config: Record<SIAESubscription['status'], { variant: any; label: string }> = {
      active: { variant: 'success', label: 'Attivo' },
      pending: { variant: 'warning', label: 'In Sospeso' },
      expired: { variant: 'destructive', label: 'Scaduto' },
      cancelled: { variant: 'destructive', label: 'Annullato' },
    };
    return config[status] || { variant: 'secondary', label: status };
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch =
      searchQuery === '' ||
      subscription.subscriptionCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subscription.holderFirstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subscription.holderLastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (subscription.companyName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (subscription.eventName?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    if (activeFilter === 'all') return matchesSearch;
    return matchesSearch && subscription.status === activeFilter;
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    expired: subscriptions.filter(s => s.status === 'expired').length,
    pending: subscriptions.filter(s => s.status === 'pending').length,
  };

  const StatsCard = ({ label, value }: { label: string; value: number }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );

  const renderSubscriptionCard = ({ item }: { item: SIAESubscription }) => {
    const statusConfig = getStatusBadge(item.status);

    return (
      <Card style={styles.subscriptionCard}>
        <View style={styles.subscriptionHeader}>
          <View style={styles.subscriptionInfo}>
            <Text style={[styles.subscriptionCode, { color: colors.mutedForeground }]}>
              {item.subscriptionCode}
            </Text>
            <Text style={[styles.subscriptionName, { color: colors.foreground }]}>
              {item.holderFirstName} {item.holderLastName}
            </Text>
            {item.companyName && (
              <Text style={[styles.companyName, { color: colors.mutedForeground }]}>
                {item.companyName}
              </Text>
            )}
          </View>
          <Badge variant={statusConfig.variant} size="sm">
            {statusConfig.label}
          </Badge>
        </View>

        <View style={styles.subscriptionDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              {formatDate(item.validFrom)} - {formatDate(item.validTo)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="ticket-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              {item.eventsCount} event{item.eventsCount !== 1 ? 'i' : 'o'}
            </Text>
          </View>

          {item.eventName && (
            <View style={styles.detailRow}>
              <Ionicons name="star-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.detailText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.eventName}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              € {typeof item.totalAmount === 'number' ? item.totalAmount.toFixed(2) : parseFloat(item.totalAmount as string).toFixed(2)}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const styles = createStyles(colors, insets);

  if (showLoader) {
    return <Loading text="Caricamento abbonamenti..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Abbonamenti SIAE"
        onBack={onBack}
        testID="header-admin-siae-subscriptions"
      />

      <View style={styles.statsContainer}>
        <StatsCard label="Totale" value={stats.total} />
        <StatsCard label="Attivi" value={stats.active} />
        <StatsCard label="Scaduti" value={stats.expired} />
        <StatsCard label="In Sospeso" value={stats.pending} />
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca abbonamento..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-subscriptions"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'active', 'pending', 'expired', 'cancelled'] as FilterType[]).map(filter => {
          const filterLabels: Record<FilterType, string> = {
            all: 'Tutti',
            active: 'Attivi',
            pending: 'In Sospeso',
            expired: 'Scaduti',
            cancelled: 'Annullati',
          };

          return (
            <Pressable
              key={filter}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === filter ? staticColors.primary : colors.card,
                  borderColor: activeFilter === filter ? staticColors.primary : colors.border,
                },
              ]}
              onPress={() => {
                triggerHaptic('light');
                setActiveFilter(filter);
              }}
              testID={`filter-${filter}`}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: activeFilter === filter ? '#000000' : colors.mutedForeground },
                ]}
              >
                {filterLabels[filter]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.statsHeader}>
        <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
          {filteredSubscriptions.length} abbonamenti trovati
        </Text>
      </View>

      <FlatList
        data={filteredSubscriptions}
        renderItem={renderSubscriptionCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={staticColors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="ticket-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessun Abbonamento</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Non ci sono abbonamenti che corrispondono alla ricerca
            </Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: any, insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    statCard: {
      flex: 1,
      minWidth: '48%',
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    searchContainer: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      height: 44,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '400',
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
    statsHeader: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    resultCount: {
      fontSize: 13,
      fontWeight: '500',
    },
    listContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: insets.bottom + spacing.xl,
    },
    subscriptionCard: {
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    subscriptionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    subscriptionInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    subscriptionCode: {
      fontSize: 12,
      fontWeight: '500',
      marginBottom: 2,
    },
    subscriptionName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    companyName: {
      fontSize: 13,
      fontWeight: '500',
    },
    subscriptionDetails: {
      gap: spacing.xs,
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
