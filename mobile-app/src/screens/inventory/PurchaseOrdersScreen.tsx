import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Header } from '../../components';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  expectedDelivery: string;
  status: 'draft' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  notes?: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const STATUS_CONFIG = {
  draft: { label: 'Bozza', color: colors.mutedForeground },
  pending: { label: 'In Attesa', color: colors.warning },
  confirmed: { label: 'Confermato', color: colors.teal },
  shipped: { label: 'Spedito', color: colors.primary },
  delivered: { label: 'Consegnato', color: colors.success },
  cancelled: { label: 'Annullato', color: colors.destructive },
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'Tutti' },
  { id: 'pending', label: 'In Attesa' },
  { id: 'confirmed', label: 'Confermati' },
  { id: 'shipped', label: 'Spediti' },
  { id: 'delivered', label: 'Consegnati' },
];

export default function PurchaseOrdersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const supplierId = route.params?.supplierId;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  const numColumns = isTablet || isLandscape ? 2 : 1;

  const { data: orders, refetch } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders', supplierId],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const mockOrders: PurchaseOrder[] = orders || [
    {
      id: '1',
      orderNumber: 'PO-2026-001',
      supplierId: '1',
      supplierName: 'Beverage Italia Srl',
      date: '2026-01-15',
      expectedDelivery: '2026-01-20',
      status: 'shipped',
      items: [
        { id: 'i1', productId: 'p1', productName: 'Coca Cola 33cl', quantity: 200, unitPrice: 0.8, total: 160 },
        { id: 'i2', productId: 'p2', productName: 'Fanta 33cl', quantity: 100, unitPrice: 0.8, total: 80 },
        { id: 'i3', productId: 'p3', productName: 'Acqua Naturale 50cl', quantity: 300, unitPrice: 0.3, total: 90 },
      ],
      total: 330,
      notes: 'Consegna al mattino preferita',
    },
    {
      id: '2',
      orderNumber: 'PO-2026-002',
      supplierId: '2',
      supplierName: 'Distilleria Premium',
      date: '2026-01-14',
      expectedDelivery: '2026-01-18',
      status: 'confirmed',
      items: [
        { id: 'i4', productId: 'p4', productName: 'Vodka Premium 70cl', quantity: 24, unitPrice: 15, total: 360 },
        { id: 'i5', productId: 'p5', productName: 'Gin London 70cl', quantity: 12, unitPrice: 18, total: 216 },
      ],
      total: 576,
    },
    {
      id: '3',
      orderNumber: 'PO-2026-003',
      supplierId: '1',
      supplierName: 'Beverage Italia Srl',
      date: '2026-01-10',
      expectedDelivery: '2026-01-12',
      status: 'delivered',
      items: [
        { id: 'i6', productId: 'p6', productName: 'Red Bull 25cl', quantity: 100, unitPrice: 1.5, total: 150 },
      ],
      total: 150,
    },
    {
      id: '4',
      orderNumber: 'PO-2026-004',
      supplierId: '3',
      supplierName: 'Party Supplies Co',
      date: '2026-01-16',
      expectedDelivery: '2026-01-22',
      status: 'pending',
      items: [
        { id: 'i7', productId: 'p7', productName: 'Bicchieri Plastica', quantity: 1000, unitPrice: 0.05, total: 50 },
        { id: 'i8', productId: 'p8', productName: 'Cannucce Biodegradabili', quantity: 500, unitPrice: 0.03, total: 15 },
      ],
      total: 65,
    },
  ];

  const filteredOrders = mockOrders.filter((order) => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || order.status === activeFilter;
    const matchesSupplier = !supplierId || order.supplierId === supplierId;
    return matchesSearch && matchesFilter && matchesSupplier;
  });

  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  const getStatusProgress = (status: PurchaseOrder['status']) => {
    const stages = ['draft', 'pending', 'confirmed', 'shipped', 'delivered'];
    const currentIndex = stages.indexOf(status);
    return ((currentIndex + 1) / stages.length) * 100;
  };

  const renderOrderCard = ({ item }: { item: PurchaseOrder }) => {
    const statusConfig = STATUS_CONFIG[item.status];

    return (
      <View style={[styles.orderCardWrapper, numColumns === 2 && styles.orderCardGrid]}>
        <TouchableOpacity
          onPress={() => handleViewOrder(item)}
          activeOpacity={0.8}
          testID={`card-order-${item.id}`}
        >
          <Card variant="glass" style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <View style={styles.orderInfo}>
                <Text style={styles.orderNumber} testID={`text-order-number-${item.id}`}>{item.orderNumber}</Text>
                <Text style={styles.supplierName}>{item.supplierName}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
                <Text style={[styles.statusText, { color: statusConfig.color }]} testID={`text-status-${item.id}`}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            <View style={styles.orderMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.metaText}>{item.date}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.metaText}>Consegna: {item.expectedDelivery}</Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${getStatusProgress(item.status)}%`,
                      backgroundColor: statusConfig.color,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.orderFooter}>
              <Text style={styles.itemsCount}>{item.items.length} articoli</Text>
              <Text style={styles.orderTotal} testID={`text-total-${item.id}`}>€{item.total.toLocaleString()}</Text>
            </View>
          </Card>
        </TouchableOpacity>
      </View>
    );
  };

  const renderOrderItemRow = ({ item }: { item: OrderItem }) => (
    <View style={styles.orderItemRow} testID={`order-item-row-${item.id}`}>
      <View style={styles.orderItemInfo}>
        <Text style={styles.orderItemName}>{item.productName}</Text>
        <Text style={styles.orderItemMeta}>
          {item.quantity} x €{item.unitPrice.toFixed(2)}
        </Text>
      </View>
      <Text style={styles.orderItemTotal}>€{item.total.toFixed(2)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Ordini Acquisto"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreatePurchaseOrder')}
            testID="button-create-order"
          >
            <Ionicons name="add" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <View style={[styles.searchContainer, isLandscape && styles.searchContainerLandscape]}>
        <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca ordine..."
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
          testID="input-search"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={[styles.filtersContent, isLandscape && styles.filtersContentLandscape]}
        testID="scroll-filters"
      >
        {FILTER_OPTIONS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterPill,
              activeFilter === filter.id && styles.filterPillActive,
            ]}
            onPress={() => setActiveFilter(filter.id)}
            testID={`filter-${filter.id}`}
          >
            <Text
              style={[
                styles.filterPillText,
                activeFilter === filter.id && styles.filterPillTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.summaryRow, isLandscape && styles.summaryRowLandscape]}>
        <Card variant="glass" style={styles.summaryCard} testID="summary-orders-count">
          <Text style={styles.summaryValue}>{filteredOrders.length}</Text>
          <Text style={styles.summaryLabel}>Ordini</Text>
        </Card>
        <Card variant="glass" style={styles.summaryCard} testID="summary-pending-count">
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            {filteredOrders.filter(o => o.status === 'pending').length}
          </Text>
          <Text style={styles.summaryLabel}>In Attesa</Text>
        </Card>
        <Card variant="glass" style={styles.summaryCard} testID="summary-total">
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            €{filteredOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}
          </Text>
          <Text style={styles.summaryLabel}>Totale</Text>
        </Card>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={[styles.listContent, isLandscape && styles.listContentLandscape]}
        columnWrapperStyle={numColumns === 2 ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        testID="list-orders"
        ListEmptyComponent={
          <Card style={styles.emptyCard} variant="glass" testID="card-empty">
            <Ionicons name="document-text-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessun ordine trovato</Text>
            <Text style={styles.emptyText}>Crea un nuovo ordine per iniziare</Text>
          </Card>
        }
      />

      <Modal
        visible={showOrderDetail}
        animationType="slide"
        transparent
        onRequestClose={() => setShowOrderDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent} edges={['bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} testID="modal-order-number">{selectedOrder?.orderNumber}</Text>
              <TouchableOpacity
                onPress={() => setShowOrderDetail(false)}
                testID="button-close-modal"
              >
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false} testID="modal-scroll">
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Fornitore</Text>
                  <Text style={styles.modalText}>{selectedOrder.supplierName}</Text>
                </View>

                <View style={styles.modalRow}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Data Ordine</Text>
                    <Text style={styles.modalText}>{selectedOrder.date}</Text>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Consegna Prevista</Text>
                    <Text style={styles.modalText}>{selectedOrder.expectedDelivery}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Stato</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${STATUS_CONFIG[selectedOrder.status].color}20`, alignSelf: 'flex-start' }]}>
                    <Text style={[styles.statusText, { color: STATUS_CONFIG[selectedOrder.status].color }]}>
                      {STATUS_CONFIG[selectedOrder.status].label}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Articoli</Text>
                  {selectedOrder.items.map((item) => (
                    <View key={item.id}>{renderOrderItemRow({ item })}</View>
                  ))}
                </View>

                {selectedOrder.notes && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Note</Text>
                    <Text style={styles.modalText}>{selectedOrder.notes}</Text>
                  </View>
                )}

                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>Totale Ordine</Text>
                  <Text style={styles.totalValue} testID="modal-total">€{selectedOrder.total.toLocaleString()}</Text>
                </View>

                <View style={styles.modalActions}>
                  {selectedOrder.status === 'pending' && (
                    <TouchableOpacity style={styles.modalActionButton} testID="button-confirm-order">
                      <Ionicons name="checkmark-circle-outline" size={20} color={colors.teal} />
                      <Text style={[styles.modalActionText, { color: colors.teal }]}>Conferma</Text>
                    </TouchableOpacity>
                  )}
                  {selectedOrder.status === 'shipped' && (
                    <TouchableOpacity style={styles.modalActionButton} testID="button-mark-delivered">
                      <Ionicons name="cube-outline" size={20} color={colors.primary} />
                      <Text style={[styles.modalActionText, { color: colors.primary }]}>Segna Consegnato</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.modalActionButton} testID="button-print-order">
                    <Ionicons name="print-outline" size={20} color={colors.foreground} />
                    <Text style={styles.modalActionText}>Stampa</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      <TouchableOpacity
        style={[styles.fab, isLandscape && styles.fabLandscape]}
        onPress={() => navigation.navigate('CreatePurchaseOrder')}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  searchContainerLandscape: {
    marginHorizontal: spacing.xl,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  filtersContainer: {
    maxHeight: 50,
    marginTop: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filtersContentLandscape: {
    paddingHorizontal: spacing.xl,
  },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryRowLandscape: {
    paddingHorizontal: spacing.xl,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  listContentLandscape: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 80,
  },
  columnWrapper: {
    gap: spacing.md,
  },
  orderCardWrapper: {
    marginBottom: spacing.md,
  },
  orderCardGrid: {
    flex: 1,
    marginBottom: 0,
  },
  orderCard: {
    paddingVertical: spacing.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  supplierName: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  orderMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
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
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsCount: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  orderTotal: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  modalSection: {
    marginBottom: spacing.lg,
  },
  modalSectionTitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  modalText: {
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  modalRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  orderItemMeta: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  orderItemTotal: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginTop: spacing.md,
  },
  totalLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  totalValue: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalActionText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
  fabLandscape: {
    bottom: 80,
  },
});
