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
  Linking,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  rating: number;
  totalOrders: number;
  lastOrderDate: string;
  status: 'active' | 'inactive';
}

interface Order {
  id: string;
  supplierId: string;
  date: string;
  total: number;
  status: 'pending' | 'delivered' | 'cancelled';
  items: number;
}

const FILTER_OPTIONS = [
  { id: 'all', label: 'Tutti' },
  { id: 'active', label: 'Attivi' },
  { id: 'bevande', label: 'Bevande' },
  { id: 'alcolici', label: 'Alcolici' },
  { id: 'accessori', label: 'Accessori' },
];

export default function SuppliersScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  const numColumns = isTablet || isLandscape ? 2 : 1;

  const { data: suppliers, refetch } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const { data: recentOrders } = useQuery<Order[]>({
    queryKey: ['/api/suppliers/orders/recent'],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const mockSuppliers: Supplier[] = suppliers || [
    {
      id: '1',
      name: 'Beverage Italia Srl',
      email: 'ordini@beverageitalia.it',
      phone: '+39 02 1234567',
      address: 'Via Roma 123, Milano',
      category: 'Bevande',
      rating: 4.8,
      totalOrders: 156,
      lastOrderDate: '2026-01-15',
      status: 'active',
    },
    {
      id: '2',
      name: 'Distilleria Premium',
      email: 'vendite@distilleriapremium.com',
      phone: '+39 06 7654321',
      address: 'Via Venezia 45, Roma',
      category: 'Alcolici',
      rating: 4.5,
      totalOrders: 89,
      lastOrderDate: '2026-01-10',
      status: 'active',
    },
    {
      id: '3',
      name: 'Party Supplies Co',
      email: 'info@partysupplies.it',
      phone: '+39 055 9876543',
      address: 'Piazza Duomo 10, Firenze',
      category: 'Accessori',
      rating: 4.2,
      totalOrders: 45,
      lastOrderDate: '2026-01-08',
      status: 'active',
    },
    {
      id: '4',
      name: 'Old Supplier Ltd',
      email: 'contact@oldsupplier.com',
      phone: '+39 011 1112233',
      address: 'Via Garibaldi 78, Torino',
      category: 'Bevande',
      rating: 3.5,
      totalOrders: 12,
      lastOrderDate: '2025-11-20',
      status: 'inactive',
    },
  ];

  const mockOrders: Order[] = recentOrders || [
    { id: 'o1', supplierId: '1', date: '2026-01-15', total: 2500, status: 'delivered', items: 15 },
    { id: 'o2', supplierId: '2', date: '2026-01-10', total: 1800, status: 'delivered', items: 8 },
    { id: 'o3', supplierId: '1', date: '2026-01-05', total: 3200, status: 'delivered', items: 22 },
  ];

  const filteredSuppliers = mockSuppliers.filter((supplier) => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' ||
      (activeFilter === 'active' && supplier.status === 'active') ||
      supplier.category.toLowerCase() === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Errore', 'Impossibile effettuare la chiamata');
    });
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Errore', 'Impossibile aprire il client email');
    });
  };

  const getSupplierOrders = (supplierId: string) => {
    return mockOrders.filter(order => order.supplierId === supplierId);
  };

  const renderRatingStars = (rating: number) => {
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : star - 0.5 <= rating ? 'star-half' : 'star-outline'}
            size={14}
            color={colors.primary}
          />
        ))}
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const statusColors = {
      pending: colors.warning,
      delivered: colors.teal,
      cancelled: colors.destructive,
    };
    const statusLabels = {
      pending: 'In attesa',
      delivered: 'Consegnato',
      cancelled: 'Annullato',
    };

    return (
      <View style={styles.orderItem} testID={`order-item-${item.id}`}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderDate}>{item.date}</Text>
          <Text style={styles.orderItems}>{item.items} articoli</Text>
        </View>
        <View style={styles.orderRight}>
          <Text style={styles.orderTotal}>€{item.total.toLocaleString()}</Text>
          <View style={[styles.orderStatus, { backgroundColor: `${statusColors[item.status]}20` }]}>
            <Text style={[styles.orderStatusText, { color: statusColors[item.status] }]}>
              {statusLabels[item.status]}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSupplierCard = ({ item }: { item: Supplier }) => {
    const isExpanded = expandedSupplier === item.id;
    const supplierOrders = getSupplierOrders(item.id);

    return (
      <View style={[styles.supplierCardWrapper, numColumns === 2 && styles.supplierCardGrid]}>
        <Card variant="glass" style={styles.supplierCard}>
          <TouchableOpacity
            style={styles.supplierHeader}
            onPress={() => setExpandedSupplier(isExpanded ? null : item.id)}
            activeOpacity={0.8}
            testID={`card-supplier-${item.id}`}
          >
            <View style={styles.supplierAvatar}>
              <Text style={styles.supplierInitial}>{item.name.charAt(0)}</Text>
            </View>
            <View style={styles.supplierInfo}>
              <View style={styles.supplierNameRow}>
                <Text style={styles.supplierName} testID={`text-supplier-name-${item.id}`}>{item.name}</Text>
                {item.status === 'inactive' && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Inattivo</Text>
                  </View>
                )}
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
              {renderRatingStars(item.rating)}
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.supplierDetails}>
              <View style={styles.contactRow}>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleCall(item.phone)}
                  testID={`button-call-${item.id}`}
                >
                  <Ionicons name="call-outline" size={20} color={colors.teal} />
                  <Text style={styles.contactButtonText}>{item.phone}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleEmail(item.email)}
                  testID={`button-email-${item.id}`}
                >
                  <Ionicons name="mail-outline" size={20} color={colors.primary} />
                  <Text style={styles.contactButtonText}>Email</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.addressText}>{item.address}</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{item.totalOrders}</Text>
                  <Text style={styles.statLabel}>Ordini</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{item.lastOrderDate}</Text>
                  <Text style={styles.statLabel}>Ultimo Ordine</Text>
                </View>
              </View>

              {supplierOrders.length > 0 && (
                <View style={styles.ordersSection}>
                  <Text style={styles.ordersSectionTitle}>Ordini Recenti</Text>
                  {supplierOrders.slice(0, 3).map((order) => (
                    <View key={order.id}>{renderOrderItem({ item: order })}</View>
                  ))}
                </View>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('PurchaseOrders', { supplierId: item.id })}
                  testID={`button-new-order-${item.id}`}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.actionButtonText}>Nuovo Ordine</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('SupplierDetail', { supplierId: item.id })}
                  testID={`button-details-${item.id}`}
                >
                  <Ionicons name="open-outline" size={20} color={colors.foreground} />
                  <Text style={styles.actionButtonText}>Dettagli</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Card>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Fornitori"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddSupplier')}
            testID="button-add-supplier"
          >
            <Ionicons name="add" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <View style={[styles.searchContainer, isLandscape && styles.searchContainerLandscape]}>
        <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca fornitore..."
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

      <FlatList
        data={filteredSuppliers}
        renderItem={renderSupplierCard}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={[styles.listContent, isLandscape && styles.listContentLandscape]}
        columnWrapperStyle={numColumns === 2 ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        testID="list-suppliers"
        ListEmptyComponent={
          <Card style={styles.emptyCard} variant="glass" testID="card-empty">
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessun fornitore trovato</Text>
            <Text style={styles.emptyText}>Prova a modificare i filtri di ricerca</Text>
          </Card>
        }
      />
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
  supplierCardWrapper: {
    marginBottom: spacing.md,
  },
  supplierCardGrid: {
    flex: 1,
    marginBottom: 0,
  },
  supplierCard: {
    overflow: 'hidden',
  },
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  supplierAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierInitial: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  supplierName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  inactiveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.destructive}20`,
  },
  inactiveBadgeText: {
    color: colors.destructive,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  categoryBadgeText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
  },
  supplierDetails: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  contactRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  contactButtonText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  addressText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
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
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.borderSubtle,
  },
  ordersSection: {
    marginBottom: spacing.lg,
  },
  ordersSectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  orderInfo: {},
  orderDate: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  orderItems: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderTotal: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  orderStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  orderStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  actionButtonText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
});
