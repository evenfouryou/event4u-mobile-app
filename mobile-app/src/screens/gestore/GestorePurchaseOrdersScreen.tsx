import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { GestorePurchaseOrder } from '@/lib/api';

type FilterTab = 'all' | 'pending' | 'approved' | 'delivered' | 'cancelled';

interface GestorePurchaseOrdersScreenProps {
  onBack: () => void;
}

export function GestorePurchaseOrdersScreen({ onBack }: GestorePurchaseOrdersScreenProps) {
  const { colors } = useTheme();
  const [orders, setOrders] = useState<GestorePurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [error, setError] = useState<string | null>(null);

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Tutti' },
    { key: 'pending', label: 'In Attesa' },
    { key: 'approved', label: 'Approvati' },
    { key: 'delivered', label: 'Consegnati' },
    { key: 'cancelled', label: 'Annullati' },
  ];

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

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getGestorePurchaseOrders();
      setOrders(data);
    } catch (err) {
      console.error('Error loading purchase orders:', err);
      setError('Errore nel caricamento degli ordini di acquisto');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (activeTab !== 'all') {
      result = result.filter(order => order.status === activeTab);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.supplierName.toLowerCase().includes(query) ||
        order.notes?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [orders, activeTab, searchQuery]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusConfig = (status: GestorePurchaseOrder['status']) => {
    switch (status) {
      case 'pending':
        return { label: 'In Attesa', color: colors.warning, variant: 'warning' as const };
      case 'approved':
        return { label: 'Approvato', color: '#3B82F6', variant: 'default' as const };
      case 'delivered':
        return { label: 'Consegnato', color: colors.success, variant: 'success' as const };
      case 'cancelled':
        return { label: 'Annullato', color: colors.destructive, variant: 'destructive' as const };
      default:
        return { label: status, color: colors.mutedForeground, variant: 'secondary' as const };
    }
  };

  const handleCreateOrder = () => {
    triggerHaptic('medium');
  };

  const renderOrder = ({ item }: { item: GestorePurchaseOrder }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <Pressable
        onPress={() => triggerHaptic('light')}
        testID={`purchase-order-item-${item.id}`}
      >
        <Card style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View style={[styles.orderIcon, { backgroundColor: `${statusConfig.color}20` }]}>
              <Ionicons name="document-text" size={24} color={statusConfig.color} />
            </View>
            <View style={styles.orderInfo}>
              <Text style={[styles.orderNumber, { color: colors.foreground }]}>
                #{item.orderNumber}
              </Text>
              <Text style={[styles.supplierName, { color: colors.mutedForeground }]}>
                {item.supplierName}
              </Text>
            </View>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </View>

          <View style={[styles.orderDivider, { backgroundColor: colors.border }]} />

          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                  Data ordine
                </Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>
                {formatDate(item.createdAt)}
              </Text>
            </View>

            {item.expectedDelivery && (
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                    Consegna prevista
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>
                  {formatDate(item.expectedDelivery)}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="cube-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                  Articoli
                </Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>
                {item.itemsCount}
              </Text>
            </View>
          </View>

          <View style={[styles.orderDivider, { backgroundColor: colors.border }]} />

          <View style={styles.orderFooter}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Totale</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {formatCurrency(item.totalAmount)}
            </Text>
          </View>
        </Card>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        Nessun ordine trovato
      </Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {searchQuery || activeTab !== 'all'
          ? 'Prova con una ricerca diversa o cambia filtro'
          : 'Crea il tuo primo ordine di acquisto'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Errore</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{error}</Text>
      <Pressable
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={loadData}
        testID="button-retry"
      >
        <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>Riprova</Text>
      </Pressable>
    </View>
  );

  const getFilteredCount = (tab: FilterTab) => {
    if (tab === 'all') return orders.length;
    return orders.filter(o => o.status === tab).length;
  };

  return (
    <SafeArea edges={['bottom']} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as ViewStyle}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-purchase-orders"
      />

      <View style={styles.titleContainer}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Ordini di Acquisto</Text>
        <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
          {orders.length} ordini totali
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.secondary }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca ordine..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-orders"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <FlatList
          data={filterTabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            const isActive = activeTab === item.key;
            const count = getFilteredCount(item.key);
            return (
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  setActiveTab(item.key);
                }}
                style={[
                  styles.tabButton,
                  { backgroundColor: isActive ? colors.primary : colors.secondary },
                ]}
                testID={`tab-${item.key}`}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: isActive ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {item.label} ({count})
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {error ? (
        renderError()
      ) : showLoader ? (
        <Loading text="Caricamento ordini..." />
      ) : filteredOrders.length > 0 ? (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
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
        renderEmptyState()
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleCreateOrder}
        testID="button-create-order"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </Pressable>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  screenTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  screenSubtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
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
  tabsContainer: {
    paddingBottom: spacing.sm,
  },
  tabsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  tabButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  tabButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  orderCard: {
    padding: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  orderIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  supplierName: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  orderDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  orderDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  totalValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.primary,
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
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: staticColors.primary,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default GestorePurchaseOrdersScreen;
