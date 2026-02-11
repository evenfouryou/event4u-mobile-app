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
import api, { SIAEResale } from '@/lib/api';

interface AdminSIAEResalesScreenProps {
  onBack: () => void;
}

type StatusFilterType = 'all' | 'pending' | 'listed' | 'sold' | 'cancelled';

export function AdminSIAEResalesScreen({ onBack }: AdminSIAEResalesScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StatusFilterType>('all');
  const [resales, setResales] = useState<SIAEResale[]>([]);

  useEffect(() => {
    loadResales();
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

  const loadResales = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAEResales();
      setResales(data);
    } catch (error) {
      console.error('Error loading SIAE resales:', error);
      Alert.alert('Errore', 'Impossibile caricare le rivendite SIAE');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResales();
    setRefreshing(false);
  };

  const getStatusConfig = (status: SIAEResale['status']) => {
    const config: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
      pending: { icon: 'time-outline', label: 'In Sospeso', color: staticColors.golden },
      listed: { icon: 'pricetag-outline', label: 'In Vendita', color: staticColors.teal },
      sold: { icon: 'checkmark-circle-outline', label: 'Venduto', color: staticColors.primary },
      fulfilled: { icon: 'checkmark-circle-outline', label: 'Completato', color: staticColors.primary },
      paid: { icon: 'checkmark-done-outline', label: 'Pagato', color: staticColors.primary },
      reserved: { icon: 'lock-closed-outline', label: 'Prenotato', color: staticColors.golden },
      cancelled: { icon: 'close-circle-outline', label: 'Annullato', color: staticColors.destructive },
      expired: { icon: 'calendar-outline', label: 'Scaduto', color: staticColors.destructive },
      rejected: { icon: 'alert-circle-outline', label: 'Rifiutato', color: staticColors.destructive },
    };
    return config[status] || { icon: 'help-outline', label: status, color: colors.mutedForeground };
  };

  const filteredResales = resales.filter(resale => {
    const matchesSearch = 
      searchQuery === '' ||
      resale.ticketCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resale.eventName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resale.sellerName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    return matchesSearch && resale.status === activeFilter;
  });

  const stats = {
    total: resales.length,
    pending: resales.filter(r => r.status === 'pending' || r.status === 'reserved').length,
    listed: resales.filter(r => r.status === 'listed').length,
    sold: resales.filter(r => r.status === 'sold' || r.status === 'fulfilled' || r.status === 'paid').length,
    cancelled: resales.filter(r => r.status === 'cancelled' || r.status === 'expired' || r.status === 'rejected').length,
    totalValue: resales
      .filter(r => r.status === 'sold' || r.status === 'fulfilled' || r.status === 'paid')
      .reduce((sum, r) => sum + Number(r.resalePrice || 0), 0),
  };

  const filters: { key: StatusFilterType; label: string }[] = [
    { key: 'all', label: 'Tutte' },
    { key: 'pending', label: 'In Sospeso' },
    { key: 'listed', label: 'In Vendita' },
    { key: 'sold', label: 'Vendute' },
    { key: 'cancelled', label: 'Annullate' },
  ];

  const renderResaleCard = ({ item }: { item: SIAEResale }) => {
    const statusConfig = getStatusConfig(item.status);
    
    return (
      <Card style={styles.resaleCard}>
        <View style={styles.resaleHeader}>
          <View style={[styles.statusIcon, { backgroundColor: statusConfig.color + '20' }]}>
            <Ionicons name={statusConfig.icon} size={20} color={statusConfig.color} />
          </View>
          <View style={styles.resaleInfo}>
            <Text style={[styles.ticketCode, { color: colors.foreground }]}>
              {item.ticketCode || item.originalTicketId.substring(0, 8)}
            </Text>
            <Text style={[styles.eventName, { color: colors.mutedForeground }]}>
              {item.eventName || 'Evento non specificato'}
            </Text>
          </View>
          <Badge variant="default" size="sm">
            {statusConfig.label}
          </Badge>
        </View>

        <View style={styles.resaleDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              Prezzo: €{Number(item.originalPrice).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="trending-up-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              Rivendita: €{Number(item.resalePrice).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          {item.sellerName && (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                Venditore: {item.sellerName}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.resaleFooter}>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Margine:</Text>
          <Text style={[styles.margin, { color: Number(item.resalePrice) > Number(item.originalPrice) ? staticColors.primary : staticColors.destructive }]}>
            €{(Number(item.resalePrice) - Number(item.originalPrice)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </Card>
    );
  };

  const styles = createStyles(colors, insets);

  if (showLoader) {
    return <Loading text="Caricamento rivendite..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Rivendite SIAE"
        onBack={onBack}
        testID="header-admin-siae-resales"
      />

      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Totali</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.total}</Text>
          </View>
        </Card>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>In Sospeso</Text>
            <Text style={[styles.statValue, { color: staticColors.golden }]}>{stats.pending}</Text>
          </View>
        </Card>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>In Vendita</Text>
            <Text style={[styles.statValue, { color: staticColors.teal }]}>{stats.listed}</Text>
          </View>
        </Card>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Vendute</Text>
            <Text style={[styles.statValue, { color: staticColors.primary }]}>{stats.sold}</Text>
          </View>
        </Card>
      </View>

      <View style={styles.valueContainer}>
        <Text style={[styles.valueLabel, { color: colors.mutedForeground }]}>Valore Totale:</Text>
        <Text style={[styles.valueAmount, { color: staticColors.primary }]}>
          €{stats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca per biglietto, evento..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-resales"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        {filters.map(filter => (
          <Pressable
            key={filter.key}
            style={[
              styles.filterChip,
              { 
                backgroundColor: activeFilter === filter.key ? staticColors.primary : colors.card,
                borderColor: activeFilter === filter.key ? staticColors.primary : colors.border,
              }
            ]}
            onPress={() => {
              triggerHaptic('light');
              setActiveFilter(filter.key);
            }}
            testID={`filter-${filter.key}`}
          >
            <Text style={[
              styles.filterText,
              { color: activeFilter === filter.key ? '#000000' : colors.mutedForeground }
            ]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.statsHeader}>
        <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
          {filteredResales.length} rivendit{filteredResales.length !== 1 ? 'e' : 'a'} trovate
        </Text>
      </View>

      <FlatList
        data={filteredResales}
        renderItem={renderResaleCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={staticColors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="basket-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna Rivendita</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Non ci sono rivendite che corrispondono alla ricerca
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  statContent: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  valueContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  valueAmount: {
    fontSize: 16,
    fontWeight: '700',
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
  resaleCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  resaleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resaleInfo: {
    flex: 1,
  },
  ticketCode: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventName: {
    fontSize: 13,
  },
  resaleDetails: {
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
  },
  resaleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  margin: {
    fontSize: 16,
    fontWeight: '700',
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
