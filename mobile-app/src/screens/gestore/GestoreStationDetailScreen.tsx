import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { GestoreStationDetail } from '@/lib/api';

type TabType = 'panoramica' | 'personale' | 'prodotti';

interface GestoreStationDetailScreenProps {
  stationId: string;
  onBack: () => void;
}

export function GestoreStationDetailScreen({ stationId, onBack }: GestoreStationDetailScreenProps) {
  const { colors } = useTheme();
  const [station, setStation] = useState<GestoreStationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('panoramica');

  useEffect(() => {
    loadStationDetail();
  }, [stationId]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadStationDetail = async () => {
    try {
      setIsLoading(true);
      const data = await api.getGestoreStationDetail(stationId);
      setStation(data);
    } catch (error) {
      console.error('Error loading station detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStationDetail();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStationTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'bar':
        return 'wine-outline';
      case 'food':
        return 'restaurant-outline';
      case 'entrance':
        return 'enter-outline';
      case 'vip':
        return 'star-outline';
      case 'cloakroom':
        return 'shirt-outline';
      default:
        return 'cube-outline';
    }
  };

  const getStationTypeLabel = (type: string) => {
    switch (type) {
      case 'bar':
        return 'Bar';
      case 'food':
        return 'Food';
      case 'entrance':
        return 'Ingresso';
      case 'vip':
        return 'VIP';
      case 'cloakroom':
        return 'Guardaroba';
      default:
        return 'Altro';
    }
  };

  const getStationTypeBadge = (type: string) => {
    switch (type) {
      case 'bar':
        return <Badge variant="default">Bar</Badge>;
      case 'food':
        return <Badge variant="warning">Food</Badge>;
      case 'entrance':
        return <Badge variant="success">Ingresso</Badge>;
      case 'vip':
        return <Badge variant="default">VIP</Badge>;
      case 'cloakroom':
        return <Badge variant="secondary">Guardaroba</Badge>;
      default:
        return <Badge variant="secondary">Altro</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attiva</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inattiva</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const tabs: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'panoramica', label: 'Panoramica', icon: 'home-outline' },
    { id: 'personale', label: 'Personale', icon: 'people-outline' },
    { id: 'prodotti', label: 'Prodotti', icon: 'cube-outline' },
  ];

  const renderPanoramica = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="cash" size={24} color={staticColors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]} testID="text-total-sales">
            {formatCurrency(station?.totalSales || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Vendite Totali</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
            <Ionicons name="receipt" size={24} color={staticColors.teal} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]} testID="text-transaction-count">
            {station?.transactionCount || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Transazioni</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
            <Ionicons name="people" size={24} color={staticColors.golden} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]} testID="text-staff-count">
            {station?.staff?.length || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Personale</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
            <Ionicons name="cube" size={24} color="#8B5CF6" />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]} testID="text-products-count">
            {station?.products?.length || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Prodotti</Text>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Dettagli Stazione</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name={getStationTypeIcon(station?.type || '')} size={20} color={colors.mutedForeground} />
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Tipo</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]} testID="text-station-type">
              {getStationTypeLabel(station?.type || '')}
            </Text>
          </View>
          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Assegnato a</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]} testID="text-event-name">
              {station?.eventName || 'Nessun evento'}
            </Text>
          </View>
          <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
          <View style={styles.detailRow}>
            <Ionicons name="radio-button-on-outline" size={20} color={colors.mutedForeground} />
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Stato</Text>
            <View testID="badge-station-status">
              {getStatusBadge(station?.status || 'inactive')}
            </View>
          </View>
        </Card>
      </View>
    </View>
  );

  const renderPersonale = () => (
    <View style={styles.tabContent}>
      <Card style={styles.summaryCard}>
        <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Riepilogo Personale</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{station?.staff?.length || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Totale</Text>
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Staff Assegnato</Text>
      {station?.staff && station.staff.length > 0 ? (
        station.staff.map((member, index) => (
          <Card key={member.id || index} style={styles.staffCard} testID={`staff-item-${member.id}`}>
            <View style={styles.staffInfo}>
              <View style={[styles.staffAvatar, { backgroundColor: `${staticColors.primary}20` }]}>
                <Ionicons name="person" size={24} color={staticColors.primary} />
              </View>
              <View style={styles.staffDetails}>
                <Text style={[styles.staffName, { color: colors.foreground }]}>{member.name}</Text>
                <Text style={[styles.staffRole, { color: colors.mutedForeground }]}>{member.role}</Text>
              </View>
              <Badge variant="secondary">{member.shift}</Badge>
            </View>
          </Card>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nessun personale assegnato</Text>
        </Card>
      )}
    </View>
  );

  const renderProdotti = () => (
    <View style={styles.tabContent}>
      <Card style={styles.summaryCard}>
        <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Riepilogo Prodotti</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{station?.products?.length || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Totale Prodotti</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {station?.products?.filter(p => p.stock > 0).length || 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Disponibili</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {station?.products?.filter(p => p.stock === 0).length || 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Esauriti</Text>
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Lista Prodotti</Text>
      {station?.products && station.products.length > 0 ? (
        station.products.map((product, index) => (
          <Card key={product.id || index} style={styles.productCard} testID={`product-item-${product.id}`}>
            <View style={styles.productHeader}>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>
                <Text style={[styles.productCategory, { color: colors.mutedForeground }]}>{product.category}</Text>
              </View>
              <Text style={[styles.productPrice, { color: colors.primary }]}>{formatCurrency(product.price)}</Text>
            </View>
            <View style={styles.productFooter}>
              <View style={styles.stockInfo}>
                <Ionicons 
                  name="cube-outline" 
                  size={16} 
                  color={product.stock > 0 ? staticColors.success : staticColors.destructive} 
                />
                <Text style={[
                  styles.stockText,
                  { color: product.stock > 0 ? staticColors.success : staticColors.destructive }
                ]}>
                  Stock: {product.stock}
                </Text>
              </View>
              <Badge variant={product.stock > 0 ? 'success' : 'destructive'}>
                {product.stock > 0 ? 'Disponibile' : 'Esaurito'}
              </Badge>
            </View>
          </Card>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nessun prodotto configurato</Text>
        </Card>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'panoramica':
        return renderPanoramica();
      case 'personale':
        return renderPersonale();
      case 'prodotti':
        return renderProdotti();
      default:
        return null;
    }
  };

  if (showLoader) {
    return (
      <SafeArea edges={['bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
        <Header showLogo showBack onBack={onBack} testID="header-station-detail" />
        <Loading text="Caricamento stazione..." />
      </SafeArea>
    );
  }

  if (!station) {
    return (
      <SafeArea edges={['bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
        <Header showLogo showBack onBack={onBack} testID="header-station-detail" />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Stazione non trovata</Text>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Header showLogo showBack onBack={onBack} testID="header-station-detail" />

      <View style={[styles.stationHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.stationTitleRow}>
          <View style={[styles.stationIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name={getStationTypeIcon(station.type)} size={24} color={colors.primary} />
          </View>
          <View style={styles.stationTitleInfo}>
            <Text style={[styles.stationTitle, { color: colors.foreground }]} numberOfLines={1} testID="text-station-name">
              {station.name}
            </Text>
            <Text style={[styles.stationSubtitle, { color: colors.mutedForeground }]}>
              {station.eventName || 'Nessun evento assegnato'}
            </Text>
          </View>
          {getStationTypeBadge(station.type)}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab(tab.id);
            }}
            style={[
              styles.tab,
              { backgroundColor: activeTab === tab.id ? colors.primary : colors.secondary }
            ]}
            testID={`tab-${tab.id}`}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.id ? staticColors.primaryForeground : colors.mutedForeground}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.id ? staticColors.primaryForeground : colors.mutedForeground }
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {renderTabContent()}
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stationHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  stationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stationIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationTitleInfo: {
    flex: 1,
  },
  stationTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.weights.bold as any,
  },
  stationSubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.weights.medium as any,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  tabContent: {
    padding: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.weights.semibold as any,
    marginBottom: spacing.md,
  },
  detailsCard: {
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  detailLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.weights.medium as any,
  },
  detailDivider: {
    height: 1,
    marginHorizontal: -spacing.md,
  },
  summaryCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.weights.semibold as any,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.weights.bold as any,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  summaryDivider: {
    width: 1,
    height: '100%',
  },
  staffCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffDetails: {
    flex: 1,
  },
  staffName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.weights.medium as any,
  },
  staffRole: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  productCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.weights.medium as any,
  },
  productCategory: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  productPrice: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.weights.bold as any,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stockText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.weights.medium as any,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.weights.semibold as any,
    marginTop: spacing.md,
  },
});
