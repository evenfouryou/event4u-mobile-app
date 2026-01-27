import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

type TabType = 'overview' | 'ticketing' | 'guestlists' | 'tables' | 'staff' | 'inventory' | 'finance';

interface EventHubData {
  event: {
    id: string;
    name: string;
    status: 'live' | 'upcoming' | 'ended';
    startTime: string;
    endTime: string;
    location: string;
  };
  stats: {
    totalEntries: number;
    currentInside: number;
    ticketsSold: number;
    revenue: number;
    guestlistEntries: number;
    tablesBooked: number;
    staffPresent: number;
    inventoryAlerts: number;
  };
  realtimeStats: {
    entriesPerHour: number;
    salesPerHour: number;
    averageSpend: number;
  };
}

interface GuestListItem {
  id: string;
  name: string;
  count: number;
  entered: number;
  prName: string;
}

interface TableItem {
  id: string;
  name: string;
  status: 'available' | 'reserved' | 'occupied';
  guestName?: string;
  minSpend?: number;
  currentSpend?: number;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'break' | 'offline';
  checkInTime?: string;
}

interface InventoryAlert {
  id: string;
  productName: string;
  currentQty: number;
  minQty: number;
  location: string;
}

interface GestoreEventHubScreenProps {
  onBack: () => void;
  eventId?: string;
}

const mockEventData: EventHubData = {
  event: {
    id: '1',
    name: 'Saturday Night Live',
    status: 'live',
    startTime: '2024-01-27T22:00:00Z',
    endTime: '2024-01-28T05:00:00Z',
    location: 'Club Paradise',
  },
  stats: {
    totalEntries: 847,
    currentInside: 623,
    ticketsSold: 1250,
    revenue: 45680,
    guestlistEntries: 234,
    tablesBooked: 18,
    staffPresent: 24,
    inventoryAlerts: 3,
  },
  realtimeStats: {
    entriesPerHour: 85,
    salesPerHour: 4500,
    averageSpend: 35.50,
  },
};

const mockGuestLists: GuestListItem[] = [
  { id: '1', name: 'VIP List', count: 45, entered: 32, prName: 'Marco Rossi' },
  { id: '2', name: 'Club Members', count: 120, entered: 89, prName: 'Club' },
  { id: '3', name: 'Birthday Party', count: 25, entered: 18, prName: 'Giulia Bianchi' },
];

const mockTables: TableItem[] = [
  { id: '1', name: 'T1 - VIP Central', status: 'occupied', guestName: 'Marco V.', minSpend: 1000, currentSpend: 1450 },
  { id: '2', name: 'T2 - Corner', status: 'reserved', guestName: 'Gruppo Rossi', minSpend: 800 },
  { id: '3', name: 'T3 - Piscina', status: 'available', minSpend: 600 },
];

const mockStaff: StaffMember[] = [
  { id: '1', name: 'Antonio M.', role: 'Barman', status: 'active', checkInTime: '21:30' },
  { id: '2', name: 'Sara L.', role: 'Cassiere', status: 'active', checkInTime: '21:45' },
  { id: '3', name: 'Luca P.', role: 'Security', status: 'break', checkInTime: '21:00' },
];

const mockInventoryAlerts: InventoryAlert[] = [
  { id: '1', productName: 'Vodka Premium', currentQty: 3, minQty: 10, location: 'Bar Principale' },
  { id: '2', productName: 'Gin Tonic Ready', currentQty: 8, minQty: 20, location: 'Bar Esterno' },
  { id: '3', productName: 'Champagne Brut', currentQty: 2, minQty: 5, location: 'VIP Area' },
];

export function GestoreEventHubScreen({ onBack, eventId }: GestoreEventHubScreenProps) {
  const { colors, gradients } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data, setData] = useState<EventHubData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
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
      await new Promise(resolve => setTimeout(resolve, 500));
      setData(mockEventData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading event hub data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const tabs: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: 'grid-outline' },
    { id: 'ticketing', label: 'Ticketing', icon: 'ticket-outline' },
    { id: 'guestlists', label: 'Liste', icon: 'people-outline' },
    { id: 'tables', label: 'Tavoli', icon: 'restaurant-outline' },
    { id: 'staff', label: 'Staff', icon: 'person-outline' },
    { id: 'inventory', label: 'Inventario', icon: 'cube-outline', badge: data?.stats.inventoryAlerts },
    { id: 'finance', label: 'Finanze', icon: 'wallet-outline' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return staticColors.success;
      case 'upcoming':
        return staticColors.primary;
      case 'ended':
        return colors.mutedForeground;
      default:
        return colors.mutedForeground;
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const renderOverview = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.overviewContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {data?.event.status === 'live' && (
        <LinearGradient
          colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.05)']}
          style={styles.liveBanner}
        >
          <View style={styles.liveDot} />
          <Text style={[styles.liveText, { color: staticColors.success }]}>EVENTO IN CORSO</Text>
          <Text style={[styles.liveTime, { color: colors.mutedForeground }]}>
            Aggiornato: {lastUpdate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </LinearGradient>
      )}

      <View style={styles.statsGrid}>
        <Card style={styles.statCard} testID="stat-entries">
          <Ionicons name="enter-outline" size={24} color={staticColors.primary} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{data?.stats.totalEntries || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Ingressi Totali</Text>
          <View style={styles.statTrend}>
            <Ionicons name="trending-up" size={14} color={staticColors.success} />
            <Text style={[styles.statTrendText, { color: staticColors.success }]}>
              +{data?.realtimeStats.entriesPerHour || 0}/h
            </Text>
          </View>
        </Card>

        <Card style={styles.statCard} testID="stat-inside">
          <Ionicons name="people" size={24} color={staticColors.teal} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{data?.stats.currentInside || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Presenti Ora</Text>
        </Card>

        <Card style={styles.statCard} testID="stat-tickets">
          <Ionicons name="ticket" size={24} color={staticColors.purple} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{data?.stats.ticketsSold || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Biglietti Venduti</Text>
        </Card>

        <Card style={styles.statCard} testID="stat-revenue">
          <Ionicons name="cash" size={24} color={staticColors.golden} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>€{data?.stats.revenue?.toLocaleString() || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Incasso Totale</Text>
          <View style={styles.statTrend}>
            <Ionicons name="trending-up" size={14} color={staticColors.success} />
            <Text style={[styles.statTrendText, { color: staticColors.success }]}>
              +€{data?.realtimeStats.salesPerHour || 0}/h
            </Text>
          </View>
        </Card>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Riepilogo Rapido</Text>

      <Card style={styles.summaryCard} testID="summary-card">
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="list" size={20} color={colors.primary} />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{data?.stats.guestlistEntries || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Liste</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Ionicons name="restaurant" size={20} color={staticColors.teal} />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{data?.stats.tablesBooked || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Tavoli</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Ionicons name="person" size={20} color={staticColors.purple} />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{data?.stats.staffPresent || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Staff</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Ionicons name="warning" size={20} color={colors.destructive} />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{data?.stats.inventoryAlerts || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Allerte</Text>
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Spesa Media</Text>

      <Card style={styles.avgSpendCard} testID="avg-spend-card">
        <View style={styles.avgSpendContent}>
          <Ionicons name="wallet" size={32} color={colors.primary} />
          <View style={styles.avgSpendInfo}>
            <Text style={[styles.avgSpendValue, { color: colors.foreground }]}>
              €{data?.realtimeStats.averageSpend?.toFixed(2) || '0.00'}
            </Text>
            <Text style={[styles.avgSpendLabel, { color: colors.mutedForeground }]}>
              Spesa media per persona
            </Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );

  const renderGuestLists = () => (
    <FlatList
      data={mockGuestLists}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      renderItem={({ item }) => (
        <Card style={styles.listItemCard} testID={`guestlist-${item.id}`}>
          <View style={styles.listItemHeader}>
            <Text style={[styles.listItemName, { color: colors.foreground }]}>{item.name}</Text>
            <Badge variant={item.entered >= item.count ? 'success' : 'default'}>
              {item.entered}/{item.count}
            </Badge>
          </View>
          <View style={styles.listItemMeta}>
            <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.listItemMetaText, { color: colors.mutedForeground }]}>{item.prName}</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(item.entered / item.count) * 100}%`,
                  backgroundColor: item.entered >= item.count ? staticColors.success : colors.primary,
                },
              ]}
            />
          </View>
        </Card>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nessuna lista ospiti</Text>
        </View>
      }
    />
  );

  const renderTables = () => (
    <FlatList
      data={mockTables}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      renderItem={({ item }) => (
        <Card style={styles.listItemCard} testID={`table-${item.id}`}>
          <View style={styles.listItemHeader}>
            <Text style={[styles.listItemName, { color: colors.foreground }]}>{item.name}</Text>
            <Badge
              variant={
                item.status === 'occupied' ? 'success' :
                item.status === 'reserved' ? 'warning' : 'secondary'
              }
            >
              {item.status === 'occupied' ? 'Occupato' :
               item.status === 'reserved' ? 'Prenotato' : 'Libero'}
            </Badge>
          </View>
          {item.guestName && (
            <Text style={[styles.listItemMetaText, { color: colors.mutedForeground }]}>
              {item.guestName}
            </Text>
          )}
          <View style={styles.tableSpend}>
            {item.currentSpend !== undefined && (
              <Text style={[styles.tableSpendValue, { color: colors.foreground }]}>
                €{item.currentSpend}
              </Text>
            )}
            <Text style={[styles.tableSpendMin, { color: colors.mutedForeground }]}>
              Min: €{item.minSpend}
            </Text>
          </View>
        </Card>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nessun tavolo configurato</Text>
        </View>
      }
    />
  );

  const renderStaff = () => (
    <FlatList
      data={mockStaff}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      renderItem={({ item }) => (
        <Card style={styles.listItemCard} testID={`staff-${item.id}`}>
          <View style={styles.listItemHeader}>
            <View style={styles.staffInfo}>
              <View style={[styles.staffAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.staffAvatarText}>{item.name.charAt(0)}</Text>
              </View>
              <View>
                <Text style={[styles.listItemName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.listItemMetaText, { color: colors.mutedForeground }]}>{item.role}</Text>
              </View>
            </View>
            <View style={styles.staffStatus}>
              <Badge
                variant={
                  item.status === 'active' ? 'success' :
                  item.status === 'break' ? 'warning' : 'secondary'
                }
              >
                {item.status === 'active' ? 'Attivo' :
                 item.status === 'break' ? 'Pausa' : 'Offline'}
              </Badge>
              {item.checkInTime && (
                <Text style={[styles.staffCheckIn, { color: colors.mutedForeground }]}>
                  Check-in: {item.checkInTime}
                </Text>
              )}
            </View>
          </View>
        </Card>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nessun membro staff</Text>
        </View>
      }
    />
  );

  const renderInventory = () => (
    <FlatList
      data={mockInventoryAlerts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        mockInventoryAlerts.length > 0 ? (
          <View style={[styles.alertBanner, { backgroundColor: `${colors.destructive}15` }]}>
            <Ionicons name="warning" size={20} color={colors.destructive} />
            <Text style={[styles.alertBannerText, { color: colors.destructive }]}>
              {mockInventoryAlerts.length} prodotti sotto scorta minima
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <Card style={styles.listItemCard} testID={`inventory-alert-${item.id}`}>
          <View style={styles.listItemHeader}>
            <View>
              <Text style={[styles.listItemName, { color: colors.foreground }]}>{item.productName}</Text>
              <Text style={[styles.listItemMetaText, { color: colors.mutedForeground }]}>{item.location}</Text>
            </View>
            <Badge variant="destructive">Riordina</Badge>
          </View>
          <View style={styles.inventoryQty}>
            <Text style={[styles.inventoryQtyLabel, { color: colors.mutedForeground }]}>
              Quantità: <Text style={{ color: colors.destructive, fontWeight: '700' }}>{item.currentQty}</Text> / {item.minQty} min
            </Text>
          </View>
        </Card>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={48} color={staticColors.success} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nessuna allerta inventario</Text>
        </View>
      }
    />
  );

  const renderFinance = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.financeContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Card style={styles.financeMainCard} testID="finance-main">
        <Text style={[styles.financeMainLabel, { color: colors.mutedForeground }]}>Incasso Totale</Text>
        <Text style={[styles.financeMainValue, { color: colors.primary }]}>
          €{data?.stats.revenue?.toLocaleString() || '0'}
        </Text>
      </Card>

      <View style={styles.financeGrid}>
        <Card style={styles.financeCard} testID="finance-tickets">
          <Ionicons name="ticket" size={20} color={staticColors.teal} />
          <Text style={[styles.financeValue, { color: colors.foreground }]}>€28,450</Text>
          <Text style={[styles.financeLabel, { color: colors.mutedForeground }]}>Biglietteria</Text>
        </Card>
        <Card style={styles.financeCard} testID="finance-tables">
          <Ionicons name="restaurant" size={20} color={staticColors.purple} />
          <Text style={[styles.financeValue, { color: colors.foreground }]}>€12,800</Text>
          <Text style={[styles.financeLabel, { color: colors.mutedForeground }]}>Tavoli</Text>
        </Card>
        <Card style={styles.financeCard} testID="finance-bar">
          <Ionicons name="wine" size={20} color={staticColors.pink} />
          <Text style={[styles.financeValue, { color: colors.foreground }]}>€4,430</Text>
          <Text style={[styles.financeLabel, { color: colors.mutedForeground }]}>Bar</Text>
        </Card>
      </View>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'ticketing':
        return (
          <View style={styles.emptyState}>
            <Ionicons name="ticket-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Dettagli ticketing in arrivo
            </Text>
          </View>
        );
      case 'guestlists':
        return renderGuestLists();
      case 'tables':
        return renderTables();
      case 'staff':
        return renderStaff();
      case 'inventory':
        return renderInventory();
      case 'finance':
        return renderFinance();
      default:
        return null;
    }
  };

  if (showLoader) {
    return (
      <SafeArea edges={['bottom']} style={{...styles.container, backgroundColor: colors.background}}>
        <Header showLogo showBack onBack={onBack} testID="header-event-hub" />
        <Loading text="Caricamento centro comando..." />
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={{...styles.container, backgroundColor: colors.background}}>
      <Header showLogo showBack onBack={onBack} testID="header-event-hub" />

      <View style={styles.eventHeader}>
        <View style={styles.eventInfo}>
          <Text style={[styles.eventName, { color: colors.foreground }]} numberOfLines={1}>
            {data?.event.name || 'Evento'}
          </Text>
          <View style={styles.eventMeta}>
            <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]}>
              {data?.event.location || '-'}
            </Text>
          </View>
        </View>
        <View style={styles.eventStatus}>
          {data?.event.status === 'live' && (
            <View style={styles.liveIndicator}>
              <View style={[styles.liveDotSmall, { backgroundColor: staticColors.success }]} />
              <Text style={[styles.liveLabel, { color: staticColors.success }]}>LIVE</Text>
            </View>
          )}
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
              { backgroundColor: activeTab === tab.id ? colors.primary : colors.secondary },
            ]}
            testID={`tab-${tab.id}`}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.id ? colors.primaryForeground : colors.foreground}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === tab.id ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {tab.label}
            </Text>
            {tab.badge !== undefined && tab.badge > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: colors.destructive }]}>
                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  eventInfo: {
    flex: 1,
    gap: 4,
  },
  eventName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: typography.fontSize.sm,
  },
  eventStatus: {
    alignItems: 'flex-end',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
  tabLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  overviewContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: staticColors.success,
  },
  liveText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    flex: 1,
  },
  liveTime: {
    fontSize: typography.fontSize.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statTrendText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  summaryCard: {
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  avgSpendCard: {
    padding: spacing.lg,
  },
  avgSpendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avgSpendInfo: {
    flex: 1,
  },
  avgSpendValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
  },
  avgSpendLabel: {
    fontSize: typography.fontSize.sm,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  listItemCard: {
    padding: spacing.md,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  listItemName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listItemMetaText: {
    fontSize: typography.fontSize.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  tableSpend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  tableSpendValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  tableSpendMin: {
    fontSize: typography.fontSize.sm,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: {
    color: '#000',
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  staffStatus: {
    alignItems: 'flex-end',
    gap: 4,
  },
  staffCheckIn: {
    fontSize: typography.fontSize.xs,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  alertBannerText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  inventoryQty: {
    marginTop: spacing.sm,
  },
  inventoryQtyLabel: {
    fontSize: typography.fontSize.sm,
  },
  financeContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  financeMainCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  financeMainLabel: {
    fontSize: typography.fontSize.sm,
  },
  financeMainValue: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  financeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  financeCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  financeValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  financeLabel: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default GestoreEventHubScreen;
