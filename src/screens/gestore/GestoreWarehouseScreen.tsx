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
import api, { WarehouseItem, WarehouseMovement } from '@/lib/api';

type TabType = 'stock' | 'movements' | 'alerts';

interface GestoreWarehouseScreenProps {
  onBack: () => void;
}

export function GestoreWarehouseScreen({ onBack }: GestoreWarehouseScreenProps) {
  const { colors } = useTheme();
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [movements, setMovements] = useState<WarehouseMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      const [itemsData, movementsData] = await Promise.all([
        api.getWarehouseItems(),
        api.getWarehouseMovements(),
      ]);
      setItems(itemsData);
      setMovements(movementsData);
    } catch (err) {
      console.error('Error loading warehouse data:', err);
      setError('Errore nel caricamento del magazzino');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredItems = useMemo(() => {
    let filtered = items;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.location?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [items, searchQuery]);

  const lowStockItems = useMemo(() => {
    return items.filter(item => item.currentQty <= item.minQty);
  }, [items]);

  const getStockBadge = (currentQty: number, minQty: number) => {
    if (currentQty <= 0) {
      return <Badge variant="destructive">Esaurito</Badge>;
    } else if (currentQty <= minQty) {
      return <Badge variant="warning">Stock Basso</Badge>;
    }
    return <Badge variant="success">Disponibile</Badge>;
  };

  const getMovementIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'in':
        return 'arrow-down-circle-outline';
      case 'out':
        return 'arrow-up-circle-outline';
      case 'transfer':
        return 'swap-horizontal-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'in':
        return staticColors.success || '#22c55e';
      case 'out':
        return staticColors.destructive || '#ef4444';
      case 'transfer':
        return staticColors.primary;
      default:
        return staticColors.mutedForeground;
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

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'stock', label: 'Stock', count: items.length },
    { id: 'movements', label: 'Movimenti', count: movements.length },
    { id: 'alerts', label: 'Allerte', count: lowStockItems.length },
  ];

  const renderItem = ({ item }: { item: WarehouseItem }) => (
    <Pressable
      onPress={() => triggerHaptic('light')}
      testID={`warehouse-item-${item.id}`}
    >
      <Card style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={[styles.itemIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="cube" size={24} color={colors.primary} />
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.itemLocation, { color: colors.mutedForeground }]}>
              {item.location || 'Posizione non specificata'}
            </Text>
          </View>
          {getStockBadge(item.currentQty, item.minQty)}
        </View>
        <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
        <View style={styles.itemStats}>
          <View style={styles.itemStat}>
            <Text style={[styles.itemStatValue, { color: colors.foreground }]}>{item.currentQty}</Text>
            <Text style={[styles.itemStatLabel, { color: colors.mutedForeground }]}>Quantità</Text>
          </View>
          <View style={styles.itemStat}>
            <Text style={[styles.itemStatValue, { color: colors.foreground }]}>{item.minQty}</Text>
            <Text style={[styles.itemStatLabel, { color: colors.mutedForeground }]}>Minimo</Text>
          </View>
          <View style={styles.itemStat}>
            <Text style={[styles.itemStatValue, { color: colors.foreground }]}>{item.unit || 'pz'}</Text>
            <Text style={[styles.itemStatLabel, { color: colors.mutedForeground }]}>Unità</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  const renderMovement = ({ item }: { item: WarehouseMovement }) => (
    <Card style={styles.movementCard} testID={`movement-item-${item.id}`}>
      <View style={styles.movementContent}>
        <View style={[styles.movementIcon, { backgroundColor: `${getMovementColor(item.type)}20` }]}>
          <Ionicons name={getMovementIcon(item.type)} size={24} color={getMovementColor(item.type)} />
        </View>
        <View style={styles.movementInfo}>
          <Text style={[styles.movementProduct, { color: colors.foreground }]}>{item.productName}</Text>
          <Text style={[styles.movementDate, { color: colors.mutedForeground }]}>
            {formatDate(item.createdAt)}
          </Text>
          {item.notes && (
            <Text style={[styles.movementNotes, { color: colors.mutedForeground }]}>{item.notes}</Text>
          )}
        </View>
        <View style={styles.movementQty}>
          <Text style={[
            styles.movementQtyValue,
            { color: item.type === 'in' ? (staticColors.success || '#22c55e') : colors.destructive }
          ]}>
            {item.type === 'in' ? '+' : '-'}{item.quantity}
          </Text>
          <Badge variant={item.type === 'in' ? 'success' : 'destructive'}>
            {item.type === 'in' ? 'Entrata' : item.type === 'out' ? 'Uscita' : 'Trasf.'}
          </Badge>
        </View>
      </View>
    </Card>
  );

  const renderAlertItem = ({ item }: { item: WarehouseItem }) => (
    <Card style={styles.alertCard} testID={`alert-item-${item.id}`}>
      <View style={styles.alertContent}>
        <View style={[styles.alertIcon, { backgroundColor: `${colors.destructive}20` }]}>
          <Ionicons name="warning" size={24} color={colors.destructive} />
        </View>
        <View style={styles.alertInfo}>
          <Text style={[styles.alertProduct, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.alertLocation, { color: colors.mutedForeground }]}>
            {item.location || 'Posizione non specificata'}
          </Text>
          <View style={styles.alertQtyRow}>
            <Text style={[styles.alertQtyLabel, { color: colors.mutedForeground }]}>
              Attuale: <Text style={{ color: colors.destructive, fontWeight: '700' }}>{item.currentQty}</Text>
            </Text>
            <Text style={[styles.alertQtyLabel, { color: colors.mutedForeground }]}>
              Minimo: <Text style={{ fontWeight: '600' }}>{item.minQty}</Text>
            </Text>
          </View>
        </View>
        <Badge variant="destructive">Riordina</Badge>
      </View>
    </Card>
  );

  const renderEmptyState = (message: string, icon: keyof typeof Ionicons.glyphMap) => (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={64} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{message}</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        Gestisci il magazzino dal pannello web
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

  const renderContent = () => {
    if (error) return renderError();
    if (showLoader) return <Loading text="Caricamento magazzino..." />;

    switch (activeTab) {
      case 'stock':
        return filteredItems.length > 0 ? (
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
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
          renderEmptyState('Nessun prodotto in magazzino', 'cube-outline')
        );

      case 'movements':
        return movements.length > 0 ? (
          <FlatList
            data={movements}
            renderItem={renderMovement}
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
          renderEmptyState('Nessun movimento registrato', 'swap-horizontal-outline')
        );

      case 'alerts':
        return lowStockItems.length > 0 ? (
          <FlatList
            data={lowStockItems}
            renderItem={renderAlertItem}
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
          renderEmptyState('Nessun prodotto con stock basso', 'checkmark-circle-outline')
        );
    }
  };

  return (
    <SafeArea edges={['bottom']} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as ViewStyle}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-warehouse"
      />

      <View style={styles.titleContainer}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Magazzino</Text>
        <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
          {items.length} prodotti • {lowStockItems.length} allerte
        </Text>
      </View>

      {activeTab === 'stock' && (
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.secondary }]}>
            <Ionicons name="search" size={20} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Cerca prodotti..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              testID="input-search-warehouse"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
                <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        </View>
      )}

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
              { backgroundColor: activeTab === tab.id ? colors.primary : colors.secondary },
            ]}
            testID={`tab-${tab.id}`}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.id ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {tab.label}
            </Text>
            {tab.count !== undefined && tab.count > 0 && (
              <View style={[
                styles.tabBadge,
                { backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : colors.muted },
              ]}>
                <Text style={[
                  styles.tabBadgeText,
                  { color: activeTab === tab.id ? colors.primaryForeground : colors.mutedForeground },
                ]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {renderContent()}
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
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  tabBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tabBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  itemCard: {
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  itemLocation: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  itemDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  itemStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  itemStat: {
    alignItems: 'center',
  },
  itemStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  itemStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  movementCard: {
    padding: spacing.md,
  },
  movementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  movementIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movementInfo: {
    flex: 1,
  },
  movementProduct: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  movementDate: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  movementNotes: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  movementQty: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  movementQtyValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  alertCard: {
    padding: spacing.md,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertInfo: {
    flex: 1,
  },
  alertProduct: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  alertLocation: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  alertQtyRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  alertQtyLabel: {
    fontSize: typography.fontSize.sm,
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
});

export default GestoreWarehouseScreen;
