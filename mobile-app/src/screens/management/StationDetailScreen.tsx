import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

interface StationDetail {
  id: string;
  name: string;
  locationId: string;
  locationName: string;
  type: string;
  isActive: boolean;
  notes: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  price: string;
}

interface StaffAssignment {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'break' | 'offline';
  shiftStart: string;
  shiftEnd: string;
}

export function StationDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const stationId = route.params?.stationId;

  const [station, setStation] = useState<StationDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'staff'>('products');

  useEffect(() => {
    loadStationDetail();
  }, [stationId]);

  const loadStationDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const [stationData, productsData, staffData] = await Promise.all([
        api.get<any>(`/api/stations/${stationId}`),
        api.get<any[]>(`/api/stations/${stationId}/products`).catch(() => []),
        api.get<any[]>(`/api/stations/${stationId}/staff`).catch(() => []),
      ]);
      setStation({
        id: stationData.id?.toString() || '',
        name: stationData.name || '',
        locationId: stationData.locationId?.toString() || '',
        locationName: stationData.locationName || stationData.location?.name || '',
        type: stationData.type || 'bar',
        isActive: stationData.isActive ?? true,
        notes: stationData.notes || '',
      });
      setProducts(productsData.map((p: any) => ({
        id: p.id?.toString() || '',
        name: p.name || '',
        category: p.category || '',
        currentStock: p.currentStock || 0,
        minStock: p.minStock || 0,
        price: `€ ${(p.price || 0).toFixed(2)}`,
      })));
      setStaff(staffData.map((s: any) => ({
        id: s.id?.toString() || '',
        name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        role: s.role || 'Bartender',
        status: s.status || 'offline',
        shiftStart: s.shiftStart || '',
        shiftEnd: s.shiftEnd || '',
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (current: number, min: number) => {
    if (current <= 0) return { color: colors.destructive, label: 'Esaurito' };
    if (current <= min) return { color: colors.warning, label: 'Basso' };
    return { color: colors.success, label: 'OK' };
  };

  const getStatusColor = (status: StaffAssignment['status']) => {
    switch (status) {
      case 'active': return colors.success;
      case 'break': return colors.warning;
      case 'offline': return colors.mutedForeground;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Dettaglio Stazione" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer} testID="loading-indicator">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !station) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Dettaglio Stazione" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer} testID="error-state">
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{error || 'Stazione non trovata'}</Text>
          <Button title="Riprova" onPress={loadStationDetail} style={styles.retryButton} testID="button-retry" />
        </View>
      </SafeAreaView>
    );
  }

  const renderProduct = ({ item }: { item: Product }) => {
    const stockStatus = getStockStatus(item.currentStock, item.minStock);
    return (
      <View style={styles.productRow} testID={`product-${item.id}`}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
        </View>
        <View style={styles.productStock}>
          <Text style={[styles.stockValue, { color: stockStatus.color }]}>{item.currentStock}</Text>
          <View style={[styles.stockBadge, { backgroundColor: `${stockStatus.color}20` }]}>
            <Text style={[styles.stockLabel, { color: stockStatus.color }]}>{stockStatus.label}</Text>
          </View>
        </View>
        <Text style={styles.productPrice}>{item.price}</Text>
      </View>
    );
  };

  const renderStaff = ({ item }: { item: StaffAssignment }) => (
    <View style={styles.staffRow} testID={`staff-${item.id}`}>
      <View style={[styles.staffAvatar, { borderColor: getStatusColor(item.status) }]}>
        <Text style={styles.staffInitial}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.staffInfo}>
        <Text style={styles.staffName}>{item.name}</Text>
        <Text style={styles.staffRole}>{item.role}</Text>
      </View>
      <View style={styles.staffShift}>
        {item.shiftStart && item.shiftEnd && (
          <Text style={styles.shiftText}>{item.shiftStart} - {item.shiftEnd}</Text>
        )}
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title={station.name}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditStation', { stationId })}
            testID="button-edit-station"
          >
            <Ionicons name="pencil" size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={(isTablet || isLandscape) ? styles.contentResponsive : undefined}
        testID="scroll-view-station-detail"
      >
        <View style={(isTablet || isLandscape) ? styles.columnLeft : undefined}>
          <Card style={styles.heroCard} variant="elevated" testID="hero-card">
            <View style={styles.heroHeader}>
              <View style={styles.heroIcon}>
                <Ionicons name="beer" size={32} color={colors.primary} />
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.heroName}>{station.name}</Text>
                <View style={styles.heroMeta}>
                  <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.heroLocation}>{station.locationName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: station.isActive ? `${colors.success}20` : `${colors.mutedForeground}20` }]}>
                  <View style={[styles.statusDotSmall, { backgroundColor: station.isActive ? colors.success : colors.mutedForeground }]} />
                  <Text style={[styles.statusText, { color: station.isActive ? colors.success : colors.mutedForeground }]}>
                    {station.isActive ? 'Attiva' : 'Inattiva'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{products.length}</Text>
                <Text style={styles.statLabel}>Prodotti</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{staff.filter(s => s.status === 'active').length}</Text>
                <Text style={styles.statLabel}>Staff Attivo</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{products.filter(p => p.currentStock <= p.minStock).length}</Text>
                <Text style={styles.statLabel}>Stock Basso</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={(isTablet || isLandscape) ? styles.columnRight : undefined}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'products' && styles.tabActive]}
              onPress={() => setActiveTab('products')}
              testID="tab-products"
            >
              <Ionicons name="wine-outline" size={18} color={activeTab === 'products' ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
                Prodotti ({products.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'staff' && styles.tabActive]}
              onPress={() => setActiveTab('staff')}
              testID="tab-staff"
            >
              <Ionicons name="people-outline" size={18} color={activeTab === 'staff' ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.tabText, activeTab === 'staff' && styles.tabTextActive]}>
                Staff ({staff.length})
              </Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.listCard} variant="elevated" testID="list-card">
            {activeTab === 'products' ? (
              products.length === 0 ? (
                <Text style={styles.emptyText}>Nessun prodotto assegnato</Text>
              ) : (
                products.map((p) => renderProduct({ item: p }))
              )
            ) : (
              staff.length === 0 ? (
                <Text style={styles.emptyText}>Nessuno staff assegnato</Text>
              ) : (
                staff.map((s) => renderStaff({ item: s }))
              )
            )}
          </Card>

          {station.notes && (
            <Card style={styles.notesCard} variant="elevated" testID="notes-card">
              <Text style={styles.sectionTitle}>Note</Text>
              <Text style={styles.notesText}>{station.notes}</Text>
            </Card>
          )}

          <View style={styles.actionsContainer}>
            <Button
              title="Gestisci Stock"
              onPress={() => navigation.navigate('BartenderDirectStock', { stationId })}
              style={styles.actionButton}
              testID="button-manage-stock"
            />
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
    paddingHorizontal: spacing.lg,
  },
  contentResponsive: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  columnLeft: {
    flex: 1,
    minWidth: 300,
  },
  columnRight: {
    flex: 1,
    minWidth: 300,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.destructive,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  heroCard: {
    marginTop: spacing.md,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  heroName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  heroLocation: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xxs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.glass.background,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  listCard: {
    marginTop: spacing.md,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  productCategory: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  productStock: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stockValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  stockBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 2,
  },
  stockLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
  productPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    width: 60,
    textAlign: 'right',
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  staffInitial: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  staffInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  staffName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  staffRole: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  staffShift: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shiftText: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  notesCard: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  notesText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    lineHeight: 22,
  },
  actionsContainer: {
    marginTop: spacing.lg,
  },
  actionButton: {
    marginBottom: spacing.md,
  },
  bottomPadding: {
    height: spacing['3xl'],
  },
});
