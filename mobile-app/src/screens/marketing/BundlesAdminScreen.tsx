import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Switch,
  FlatList,
  Modal,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Header } from '../../components';

interface Bundle {
  id: string;
  name: string;
  description: string;
  items: BundleItem[];
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  savingsPercent: number;
  status: 'active' | 'draft' | 'expired' | 'soldout';
  validFrom: string;
  validTo: string;
  salesCount: number;
  maxSales?: number;
  imageUrl?: string;
}

interface BundleItem {
  id: string;
  type: 'ticket' | 'drink' | 'food' | 'merchandise';
  name: string;
  quantity: number;
  value: number;
}

interface BundleStats {
  totalBundles: number;
  activeBundles: number;
  totalSales: number;
  totalRevenue: number;
  averageSavings: number;
}

const ITEM_TYPES = [
  { id: 'ticket', label: 'Biglietto', icon: 'ticket', color: colors.primary },
  { id: 'drink', label: 'Bevanda', icon: 'wine', color: colors.teal },
  { id: 'food', label: 'Cibo', icon: 'fast-food', color: colors.warning },
  { id: 'merchandise', label: 'Merchandise', icon: 'shirt', color: '#8B5CF6' },
];

export default function BundlesAdminScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);

  const numColumns = isTablet || isLandscape ? 4 : 2;
  const statCardWidth = (width - spacing.lg * 2 - spacing.md * (numColumns - 1)) / numColumns;

  const [newBundle, setNewBundle] = useState({
    name: '',
    description: '',
    bundlePrice: '',
    items: [] as BundleItem[],
  });

  const { data: bundles, refetch: refetchBundles } = useQuery<Bundle[]>({
    queryKey: ['/api/marketing/bundles'],
  });

  const { data: stats, refetch: refetchStats } = useQuery<BundleStats>({
    queryKey: ['/api/marketing/bundles/stats'],
  });

  const toggleBundleMutation = useMutation({
    mutationFn: async ({ bundleId, active }: { bundleId: string; active: boolean }) => {
      return fetch(`/api/marketing/bundles/${bundleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: active ? 'active' : 'draft' }),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/bundles'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchBundles(), refetchStats()]);
    setRefreshing(false);
  }, [refetchBundles, refetchStats]);

  const mockBundles: Bundle[] = bundles || [
    {
      id: '1',
      name: 'Party Package',
      description: 'Ingresso + 2 drink inclusi',
      items: [
        { id: 'i1', type: 'ticket', name: 'Ingresso Standard', quantity: 1, value: 25 },
        { id: 'i2', type: 'drink', name: 'Cocktail Premium', quantity: 2, value: 12 },
      ],
      originalPrice: 49,
      bundlePrice: 39,
      savings: 10,
      savingsPercent: 20,
      status: 'active',
      validFrom: '2026-01-01',
      validTo: '2026-01-31',
      salesCount: 156,
      maxSales: 200,
    },
    {
      id: '2',
      name: 'VIP Experience',
      description: 'Ingresso VIP + tavolo + bottiglia',
      items: [
        { id: 'i3', type: 'ticket', name: 'Ingresso VIP', quantity: 1, value: 50 },
        { id: 'i4', type: 'drink', name: 'Bottiglia Champagne', quantity: 1, value: 80 },
      ],
      originalPrice: 130,
      bundlePrice: 99,
      savings: 31,
      savingsPercent: 24,
      status: 'active',
      validFrom: '2026-01-01',
      validTo: '2026-02-28',
      salesCount: 45,
    },
    {
      id: '3',
      name: 'Coppia Special',
      description: 'Pacchetto per due persone',
      items: [
        { id: 'i5', type: 'ticket', name: 'Ingresso Standard', quantity: 2, value: 50 },
        { id: 'i6', type: 'drink', name: 'Cocktail', quantity: 2, value: 16 },
      ],
      originalPrice: 66,
      bundlePrice: 55,
      savings: 11,
      savingsPercent: 17,
      status: 'draft',
      validFrom: '2026-02-01',
      validTo: '2026-02-14',
      salesCount: 0,
    },
    {
      id: '4',
      name: 'Early Bird Bundle',
      description: 'Prevendita scontata',
      items: [
        { id: 'i7', type: 'ticket', name: 'Ingresso Standard', quantity: 1, value: 25 },
      ],
      originalPrice: 25,
      bundlePrice: 18,
      savings: 7,
      savingsPercent: 28,
      status: 'soldout',
      validFrom: '2025-12-01',
      validTo: '2025-12-31',
      salesCount: 100,
      maxSales: 100,
    },
  ];

  const mockStats: BundleStats = stats || {
    totalBundles: 4,
    activeBundles: 2,
    totalSales: 301,
    totalRevenue: 12450,
    averageSavings: 22,
  };

  const getStatusConfig = (status: Bundle['status']) => {
    switch (status) {
      case 'active': return { label: 'Attivo', color: colors.teal };
      case 'draft': return { label: 'Bozza', color: colors.mutedForeground };
      case 'expired': return { label: 'Scaduto', color: colors.warning };
      case 'soldout': return { label: 'Esaurito', color: colors.destructive };
    }
  };

  const getItemTypeConfig = (type: BundleItem['type']) => {
    return ITEM_TYPES.find(t => t.id === type) || ITEM_TYPES[0];
  };

  const renderBundleCard = ({ item, index }: { item: Bundle; index: number }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <View style={[isTablet && styles.bundleCardWrapper]}>
        <TouchableOpacity
          onPress={() => {
            setSelectedBundle(item);
            navigation.navigate('BundleDetail', { bundleId: item.id });
          }}
          activeOpacity={0.8}
          testID={`card-bundle-${item.id}`}
        >
          <Card variant="glass" style={styles.bundleCard}>
            <View style={styles.bundleHeader}>
              <View style={styles.bundleInfo}>
                <View style={styles.bundleNameRow}>
                  <Text style={styles.bundleName} testID={`text-bundle-name-${item.id}`}>{item.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]} testID={`badge-status-${item.id}`}>
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.bundleDescription} testID={`text-description-${item.id}`}>{item.description}</Text>
              </View>
              <Switch
                value={item.status === 'active'}
                onValueChange={(value) => toggleBundleMutation.mutate({ bundleId: item.id, active: value })}
                trackColor={{ false: colors.surface, true: `${colors.teal}50` }}
                thumbColor={item.status === 'active' ? colors.teal : colors.mutedForeground}
                disabled={item.status === 'soldout' || item.status === 'expired'}
                testID={`switch-bundle-${item.id}`}
              />
            </View>

            <View style={styles.itemsList} testID={`list-items-${item.id}`}>
              {item.items.map((bundleItem) => {
                const typeConfig = getItemTypeConfig(bundleItem.type);
                return (
                  <View key={bundleItem.id} style={styles.itemRow} testID={`item-${bundleItem.id}`}>
                    <View style={[styles.itemIcon, { backgroundColor: `${typeConfig.color}20` }]}>
                      <Ionicons name={typeConfig.icon as any} size={14} color={typeConfig.color} />
                    </View>
                    <Text style={styles.itemName}>
                      {bundleItem.quantity}x {bundleItem.name}
                    </Text>
                    <Text style={styles.itemValue}>€{bundleItem.value}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.pricingRow}>
              <View style={styles.priceInfo}>
                <Text style={styles.originalPrice} testID={`text-original-${item.id}`}>€{item.originalPrice}</Text>
                <Text style={styles.bundlePrice} testID={`text-price-${item.id}`}>€{item.bundlePrice}</Text>
              </View>
              <View style={styles.savingsBadge} testID={`badge-savings-${item.id}`}>
                <Ionicons name="pricetag" size={14} color={colors.primary} />
                <Text style={styles.savingsText}>-{item.savingsPercent}%</Text>
              </View>
            </View>

            <View style={styles.bundleMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.metaText} testID={`text-dates-${item.id}`}>{item.validFrom} - {item.validTo}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="cart-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.metaText} testID={`text-sales-${item.id}`}>
                  {item.salesCount} venduti
                  {item.maxSales && ` / ${item.maxSales}`}
                </Text>
              </View>
            </View>

            {item.maxSales && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(item.salesCount / item.maxSales) * 100}%` },
                    ]}
                  />
                </View>
              </View>
            )}
          </Card>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Bundle & Offerte"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            testID="button-create-bundle"
          >
            <Ionicons name="add" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        testID="scroll-view"
      >
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <Card variant="glass" style={[styles.statCard, { width: statCardWidth }]} testID="stat-active">
              <View style={[styles.statIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="pricetags" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statValue} testID="text-active-bundles">{mockStats.activeBundles}</Text>
              <Text style={styles.statLabel}>Bundle Attivi</Text>
            </Card>
            <Card variant="glass" style={[styles.statCard, { width: statCardWidth }]} testID="stat-sales">
              <View style={[styles.statIcon, { backgroundColor: `${colors.teal}20` }]}>
                <Ionicons name="cart" size={20} color={colors.teal} />
              </View>
              <Text style={styles.statValue} testID="text-total-sales">{mockStats.totalSales}</Text>
              <Text style={styles.statLabel}>Vendite Totali</Text>
            </Card>
            <Card variant="glass" style={[styles.statCard, { width: statCardWidth }]} testID="stat-revenue">
              <View style={[styles.statIcon, { backgroundColor: `${colors.success}20` }]}>
                <Ionicons name="cash" size={20} color={colors.success} />
              </View>
              <Text style={styles.statValue} testID="text-revenue">€{mockStats.totalRevenue.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </Card>
            <Card variant="glass" style={[styles.statCard, { width: statCardWidth }]} testID="stat-savings">
              <View style={[styles.statIcon, { backgroundColor: `${colors.warning}20` }]}>
                <Ionicons name="trending-down" size={20} color={colors.warning} />
              </View>
              <Text style={styles.statValue} testID="text-avg-savings">{mockStats.averageSavings}%</Text>
              <Text style={styles.statLabel}>Sconto Medio</Text>
            </Card>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} testID="text-bundles-title">I Tuoi Bundle</Text>
          <FlatList
            key={`bundles-${isTablet ? 2 : 1}`}
            data={mockBundles}
            renderItem={renderBundleCard}
            keyExtractor={(item) => item.id}
            numColumns={isTablet ? 2 : 1}
            scrollEnabled={false}
            columnWrapperStyle={isTablet ? styles.bundleGridRow : undefined}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            ListEmptyComponent={
              <Card style={styles.emptyCard} variant="glass" testID="empty-bundles">
                <Ionicons name="pricetags-outline" size={48} color={colors.mutedForeground} />
                <Text style={styles.emptyTitle}>Nessun bundle</Text>
                <Text style={styles.emptyText}>Crea il tuo primo bundle per iniziare</Text>
              </Card>
            }
            testID="list-bundles"
          />
        </View>
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} testID="text-modal-title">Nuovo Bundle</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} testID="button-close-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome Bundle</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Es: Weekend Special"
                  placeholderTextColor={colors.mutedForeground}
                  value={newBundle.name}
                  onChangeText={(text) => setNewBundle({ ...newBundle, name: text })}
                  testID="input-bundle-name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Descrizione</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMultiline]}
                  placeholder="Descrivi cosa include questo bundle"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                  value={newBundle.description}
                  onChangeText={(text) => setNewBundle({ ...newBundle, description: text })}
                  testID="input-bundle-description"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Aggiungi Articoli</Text>
                <View style={[styles.itemTypesGrid, isLandscape && styles.itemTypesGridLandscape]}>
                  {ITEM_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={styles.itemTypeButton}
                      onPress={() => {
                        Alert.alert('Aggiungi', `Seleziona un ${type.label.toLowerCase()} da aggiungere`);
                      }}
                      testID={`button-add-${type.id}`}
                    >
                      <View style={[styles.itemTypeIcon, { backgroundColor: `${type.color}20` }]}>
                        <Ionicons name={type.icon as any} size={20} color={type.color} />
                      </View>
                      <Text style={styles.itemTypeLabel}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Prezzo Bundle</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="€ 0.00"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                  value={newBundle.bundlePrice}
                  onChangeText={(text) => setNewBundle({ ...newBundle, bundlePrice: text })}
                  testID="input-bundle-price"
                />
              </View>
            </ScrollView>

            <Button
              onPress={() => {
                Alert.alert('Successo', 'Bundle creato! Aggiungi articoli per completare.');
                setShowCreateModal(false);
                setNewBundle({ name: '', description: '', bundlePrice: '', items: [] });
              }}
              disabled={!newBundle.name}
              testID="button-create"
            >
              <Text style={styles.buttonText}>Crea Bundle</Text>
            </Button>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.8}
        testID="button-fab-create"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  bundleGridRow: {
    gap: spacing.md,
  },
  bundleCardWrapper: {
    flex: 1,
  },
  bundleCard: {
    paddingVertical: spacing.lg,
  },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bundleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  bundleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  bundleName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  bundleDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  itemsList: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  itemValue: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  originalPrice: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textDecorationLine: 'line-through',
  },
  bundlePrice: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: `${colors.primary}20`,
    borderRadius: borderRadius.full,
  },
  savingsText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  bundleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  progressContainer: {
    marginTop: spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    color: colors.foreground,
    fontSize: fontSize.base,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  itemTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  itemTypesGridLandscape: {
    justifyContent: 'center',
  },
  itemTypeButton: {
    alignItems: 'center',
    gap: spacing.xs,
    width: '22%',
  },
  itemTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTypeLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
