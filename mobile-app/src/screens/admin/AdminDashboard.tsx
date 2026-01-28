import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { SkeletonDashboard } from '@/components/Loading';
import { AdminMenuDrawer } from '@/components/AdminMenuDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WIDGET_STORAGE_KEY = 'admin_dashboard_widgets';

interface AdminDashboardProps {
  onNavigateGestori: () => void;
  onNavigateCompanies: () => void;
  onNavigateEvents: () => void;
  onNavigateUsers: () => void;
  onNavigateBilling: () => void;
  onNavigateSettings: () => void;
  onNavigateProfile: () => void;
  onNavigateNameChanges: () => void;
  onNavigateSIAEMonitor: () => void;
  onNavigatePrinter?: () => void;
  onNavigateDigitalTemplates?: () => void;
  onNavigateStripeAdmin?: () => void;
  onNavigateSIAEApprovals?: () => void;
  onNavigateSIAETables?: () => void;
  onNavigateSIAECards?: () => void;
  onNavigateSIAEConfig?: () => void;
  onNavigateSIAECustomers?: () => void;
  onNavigateSIAEConsole?: () => void;
  onNavigateSIAETransactions?: () => void;
  onNavigateSIAEBoxOffice?: () => void;
  onNavigateSIAETransmissions?: () => void;
  onNavigateSIAETicketTypes?: () => void;
  onNavigateSIAEResales?: () => void;
  onNavigateSIAESubscriptions?: () => void;
  onNavigateSIAEAuditLogs?: () => void;
  onNavigateBillingPlans?: () => void;
  onNavigateBillingOrganizers?: () => void;
  onNavigateBillingInvoices?: () => void;
  onNavigateBillingReports?: () => void;
  onSwitchToClient?: () => void;
  onGestorePress?: (gestoreId: string) => void;
  onLogout: () => void;
}

interface AdminStats {
  totalGestori: number;
  activeGestori: number;
  totalEvents: number;
  totalUsers: number;
  monthlyRevenue: number;
  recentGestori: RecentGestore[];
  ticketsSoldToday?: number;
  pendingSIAETransmissions?: number;
  gestoriTrend?: number;
  eventsTrend?: number;
  revenueTrend?: number;
  alerts?: Alert[];
}

interface RecentGestore {
  id: string;
  name: string;
  companyName: string;
  eventsCount: number;
  status: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
}

type WidgetId = 'stats' | 'kpi' | 'alerts' | 'quickNav' | 'recentGestori' | 'siae' | 'billing';

interface WidgetConfig {
  id: WidgetId;
  enabled: boolean;
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'stats', enabled: true, order: 0 },
  { id: 'kpi', enabled: true, order: 1 },
  { id: 'alerts', enabled: true, order: 2 },
  { id: 'quickNav', enabled: true, order: 3 },
  { id: 'recentGestori', enabled: true, order: 4 },
  { id: 'siae', enabled: true, order: 5 },
  { id: 'billing', enabled: true, order: 6 },
];

export function AdminDashboard({
  onNavigateGestori,
  onNavigateCompanies,
  onNavigateEvents,
  onNavigateUsers,
  onNavigateBilling,
  onNavigateSettings,
  onNavigateProfile,
  onNavigateNameChanges,
  onNavigateSIAEMonitor,
  onNavigatePrinter,
  onNavigateDigitalTemplates,
  onNavigateStripeAdmin,
  onNavigateSIAEApprovals,
  onNavigateSIAETables,
  onNavigateSIAECards,
  onNavigateSIAEConfig,
  onNavigateSIAECustomers,
  onNavigateSIAEConsole,
  onNavigateSIAETransactions,
  onNavigateSIAEBoxOffice,
  onNavigateSIAETransmissions,
  onNavigateSIAETicketTypes,
  onNavigateSIAEResales,
  onNavigateSIAESubscriptions,
  onNavigateSIAEAuditLogs,
  onNavigateBillingPlans,
  onNavigateBillingOrganizers,
  onNavigateBillingInvoices,
  onNavigateBillingReports,
  onSwitchToClient,
  onGestorePress,
  onLogout,
}: AdminDashboardProps) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<AdminStats>({
    totalGestori: 0,
    activeGestori: 0,
    totalEvents: 0,
    totalUsers: 0,
    monthlyRevenue: 0,
    recentGestori: [],
    ticketsSoldToday: 0,
    pendingSIAETransmissions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadWidgetConfig();
    loadDashboardData();
  }, []);

  const loadWidgetConfig = async () => {
    try {
      const stored = await SecureStore.getItemAsync(WIDGET_STORAGE_KEY);
      if (stored) {
        setWidgets(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading widget config:', error);
    }
  };

  const saveWidgetConfig = async (newWidgets: WidgetConfig[]) => {
    try {
      await SecureStore.setItemAsync(WIDGET_STORAGE_KEY, JSON.stringify(newWidgets));
      setWidgets(newWidgets);
    } catch (error) {
      console.error('Error saving widget config:', error);
    }
  };

  const toggleWidget = (widgetId: WidgetId) => {
    const newWidgets = widgets.map(w => 
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    );
    saveWidgetConfig(newWidgets);
    triggerHaptic('light');
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminDashboard();
      setStats({
        ...data,
        ticketsSoldToday: data.ticketsSoldToday ?? 0,
        pendingSIAETransmissions: data.pendingSIAETransmissions ?? 0,
        gestoriTrend: data.gestoriTrend ?? 0,
        eventsTrend: data.eventsTrend ?? 0,
        revenueTrend: data.revenueTrend ?? 0,
        alerts: data.alerts ?? [],
      });
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  const handleMenuNavigation = (navigateFn?: () => void) => {
    if (navigateFn) {
      triggerHaptic('light');
      navigateFn();
    }
  };

  const renderTrend = (value: number) => {
    const isPositive = value >= 0;
    return (
      <View style={[styles.trendBadge, { backgroundColor: isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
        <Ionicons 
          name={isPositive ? 'arrow-up' : 'arrow-down'} 
          size={10} 
          color={isPositive ? '#22C55E' : '#EF4444'} 
        />
        <Text style={[styles.trendText, { color: isPositive ? '#22C55E' : '#EF4444' }]}>
          {Math.abs(value)}%
        </Text>
      </View>
    );
  };

  const renderStatsWidget = () => (
    <View style={styles.statsGrid} key="stats">
      <GlassCard style={styles.statCardMain}>
        <View style={styles.statRow}>
          <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
            <Ionicons name="people" size={22} color={staticColors.primary} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{stats.totalGestori}</Text>
            <Text style={styles.statLabel}>Gestori</Text>
          </View>
          {renderTrend(stats.gestoriTrend || 0)}
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statMiniRow}>
          <View style={styles.statMiniItem}>
            <Text style={styles.statMiniValue}>{stats.activeGestori}</Text>
            <Text style={styles.statMiniLabel}>Attivi</Text>
          </View>
          <View style={styles.statMiniItem}>
            <Text style={styles.statMiniValue}>{stats.totalGestori - stats.activeGestori}</Text>
            <Text style={styles.statMiniLabel}>Inattivi</Text>
          </View>
        </View>
      </GlassCard>

      <View style={styles.statCardColumn}>
        <GlassCard style={styles.statCardSmall}>
          <View style={[styles.statIconSmall, { backgroundColor: 'rgba(20, 184, 166, 0.15)' }]}>
            <Ionicons name="calendar" size={18} color={staticColors.teal} />
          </View>
          <Text style={styles.statValueSmall}>{stats.totalEvents}</Text>
          <Text style={styles.statLabelSmall}>Eventi</Text>
        </GlassCard>
        <GlassCard style={styles.statCardSmall}>
          <View style={[styles.statIconSmall, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
            <Ionicons name="person" size={18} color="#8B5CF6" />
          </View>
          <Text style={styles.statValueSmall}>{stats.totalUsers}</Text>
          <Text style={styles.statLabelSmall}>Utenti</Text>
        </GlassCard>
      </View>
    </View>
  );

  const renderKPIWidget = () => (
    <View style={styles.kpiGrid} key="kpi">
      <GlassCard style={styles.kpiCard}>
        <View style={styles.kpiHeader}>
          <View style={[styles.kpiIcon, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
            <Ionicons name="cash" size={20} color={staticColors.golden} />
          </View>
          {renderTrend(stats.revenueTrend || 0)}
        </View>
        <Text style={styles.kpiValue}>{formatCurrency(stats.monthlyRevenue)}</Text>
        <Text style={styles.kpiLabel}>Ricavi mensili</Text>
      </GlassCard>

      <GlassCard style={styles.kpiCard}>
        <View style={styles.kpiHeader}>
          <View style={[styles.kpiIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
            <Ionicons name="ticket" size={20} color="#8B5CF6" />
          </View>
        </View>
        <Text style={styles.kpiValue}>{stats.ticketsSoldToday}</Text>
        <Text style={styles.kpiLabel}>Ticket oggi</Text>
      </GlassCard>

      <GlassCard style={styles.kpiCard}>
        <View style={styles.kpiHeader}>
          <View style={[styles.kpiIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Ionicons name="cloud-upload" size={20} color="#10B981" />
          </View>
          {(stats.pendingSIAETransmissions || 0) > 0 && (
            <Badge variant="destructive" style={styles.kpiBadge}>{stats.pendingSIAETransmissions}</Badge>
          )}
        </View>
        <Text style={styles.kpiValue}>{stats.pendingSIAETransmissions}</Text>
        <Text style={styles.kpiLabel}>SIAE pendenti</Text>
      </GlassCard>
    </View>
  );

  const renderAlertsWidget = () => {
    const alerts = stats.alerts || [];
    if (alerts.length === 0) return null;
    
    return (
      <View style={styles.section} key="alerts">
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notifiche</Text>
          <Badge variant="secondary">{alerts.length}</Badge>
        </View>
        {alerts.slice(0, 3).map((alert) => (
          <Card key={alert.id} style={styles.alertCard}>
            <View style={styles.alertRow}>
              <View style={[styles.alertIcon, { 
                backgroundColor: alert.type === 'error' ? 'rgba(239, 68, 68, 0.15)' :
                  alert.type === 'warning' ? 'rgba(245, 158, 11, 0.15)' :
                  alert.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(20, 184, 166, 0.15)'
              }]}>
                <Ionicons 
                  name={alert.type === 'error' ? 'alert-circle' : 
                    alert.type === 'warning' ? 'warning' : 
                    alert.type === 'success' ? 'checkmark-circle' : 'information-circle'} 
                  size={18} 
                  color={alert.type === 'error' ? '#EF4444' :
                    alert.type === 'warning' ? '#F59E0B' :
                    alert.type === 'success' ? '#22C55E' : '#14B8A6'}
                />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMessage} numberOfLines={1}>{alert.message}</Text>
              </View>
              <Text style={styles.alertTime}>{alert.time}</Text>
            </View>
          </Card>
        ))}
      </View>
    );
  };

  const renderQuickNavWidget = () => (
    <View style={styles.section} key="quickNav">
      <Text style={styles.sectionTitle}>Navigazione Rapida</Text>
      <View style={styles.navGrid}>
        <Pressable onPress={onNavigateGestori} style={styles.navItem} testID="nav-gestori">
          <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.navIconGradient}>
            <Ionicons name="people" size={22} color="#000" />
          </LinearGradient>
          <Text style={styles.navLabel}>Gestori</Text>
        </Pressable>

        <Pressable onPress={onNavigateCompanies} style={styles.navItem} testID="nav-companies">
          <LinearGradient colors={['#14B8A6', '#0D9488']} style={styles.navIconGradient}>
            <Ionicons name="business" size={22} color="#FFF" />
          </LinearGradient>
          <Text style={styles.navLabel}>Aziende</Text>
        </Pressable>

        <Pressable onPress={onNavigateEvents} style={styles.navItem} testID="nav-events">
          <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.navIconGradient}>
            <Ionicons name="calendar" size={22} color="#FFF" />
          </LinearGradient>
          <Text style={styles.navLabel}>Eventi</Text>
        </Pressable>

        <Pressable onPress={onNavigateUsers} style={styles.navItem} testID="nav-users">
          <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.navIconGradient}>
            <Ionicons name="person" size={22} color="#FFF" />
          </LinearGradient>
          <Text style={styles.navLabel}>Utenti</Text>
        </Pressable>

        <Pressable onPress={onNavigateBilling} style={styles.navItem} testID="nav-billing">
          <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.navIconGradient}>
            <Ionicons name="card" size={22} color="#FFF" />
          </LinearGradient>
          <Text style={styles.navLabel}>Billing</Text>
        </Pressable>

        <Pressable onPress={onNavigateSettings} style={styles.navItem} testID="nav-settings">
          <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.navIconGradient}>
            <Ionicons name="settings" size={22} color="#FFF" />
          </LinearGradient>
          <Text style={styles.navLabel}>Impostazioni</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderRecentGestoriWidget = () => (
    <View style={styles.section} key="recentGestori">
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Gestori Recenti</Text>
        <Pressable onPress={onNavigateGestori} testID="link-all-gestori">
          <Text style={styles.seeAllText}>Vedi tutti</Text>
        </Pressable>
      </View>
      {stats.recentGestori.length > 0 ? (
        stats.recentGestori.slice(0, 4).map((gestore) => (
          <Pressable 
            key={gestore.id} 
            onPress={() => onGestorePress?.(gestore.id)}
            testID={`gestore-row-${gestore.id}`}
          >
            <Card style={styles.gestoreRow}>
              <Avatar name={gestore.name} size="sm" />
              <View style={styles.gestoreInfo}>
                <Text style={styles.gestoreName}>{gestore.name}</Text>
                <Text style={styles.gestoreCompany}>{gestore.companyName}</Text>
              </View>
              <View style={styles.gestoreRight}>
                <Badge variant={gestore.status === 'active' ? 'success' : 'secondary'}>
                  {gestore.status === 'active' ? 'Attivo' : 'Inattivo'}
                </Badge>
                <Text style={styles.gestoreEvents}>{gestore.eventsCount} eventi</Text>
              </View>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="people-outline" size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun gestore recente</Text>
        </Card>
      )}
    </View>
  );

  const renderSIAEWidget = () => (
    <View style={styles.section} key="siae">
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          </View>
          <Text style={styles.sectionTitle}>SIAE</Text>
        </View>
        <Pressable onPress={onNavigateSIAEMonitor} testID="link-siae-monitor">
          <Text style={styles.seeAllText}>Monitor</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        {[
          { id: 'approvals', label: 'Approvazioni', icon: 'checkmark-done', onPress: onNavigateSIAEApprovals, badge: 3 },
          { id: 'tables', label: 'Tabelle', icon: 'grid-outline', onPress: onNavigateSIAETables },
          { id: 'cards', label: 'Tessere', icon: 'card-outline', onPress: onNavigateSIAECards },
          { id: 'config', label: 'Config', icon: 'options', onPress: onNavigateSIAEConfig },
          { id: 'transmissions', label: 'Trasmissioni', icon: 'cloud-upload', onPress: onNavigateSIAETransmissions },
          { id: 'customers', label: 'Clienti', icon: 'people-outline', onPress: onNavigateSIAECustomers },
        ].map((item) => (
          <Pressable 
            key={item.id} 
            onPress={() => handleMenuNavigation(item.onPress)} 
            style={styles.chip}
            testID={`chip-siae-${item.id}`}
          >
            <View style={[styles.chipIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name={item.icon as any} size={16} color="#10B981" />
            </View>
            <Text style={styles.chipLabel}>{item.label}</Text>
            {item.badge && <Badge variant="destructive" style={styles.chipBadge}>{item.badge}</Badge>}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderBillingWidget = () => (
    <View style={styles.section} key="billing">
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Ionicons name="wallet" size={16} color="#F59E0B" />
          </View>
          <Text style={styles.sectionTitle}>Fatturazione</Text>
        </View>
        <Pressable onPress={onNavigateBilling} testID="link-billing">
          <Text style={styles.seeAllText}>Vedi tutto</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        {[
          { id: 'plans', label: 'Piani', icon: 'layers', onPress: onNavigateBillingPlans },
          { id: 'organizers', label: 'Organizzatori', icon: 'briefcase', onPress: onNavigateBillingOrganizers },
          { id: 'invoices', label: 'Fatture', icon: 'receipt', onPress: onNavigateBillingInvoices },
          { id: 'reports', label: 'Report', icon: 'bar-chart', onPress: onNavigateBillingReports },
        ].map((item) => (
          <Pressable 
            key={item.id} 
            onPress={() => handleMenuNavigation(item.onPress)} 
            style={styles.chip}
            testID={`chip-billing-${item.id}`}
          >
            <View style={[styles.chipIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name={item.icon as any} size={16} color="#F59E0B" />
            </View>
            <Text style={styles.chipLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderWidget = (widgetId: WidgetId) => {
    switch (widgetId) {
      case 'stats': return renderStatsWidget();
      case 'kpi': return renderKPIWidget();
      case 'alerts': return renderAlertsWidget();
      case 'quickNav': return renderQuickNavWidget();
      case 'recentGestori': return renderRecentGestoriWidget();
      case 'siae': return renderSIAEWidget();
      case 'billing': return renderBillingWidget();
      default: return null;
    }
  };

  const enabledWidgets = widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => { triggerHaptic('light'); setMenuVisible(true); }} style={styles.menuBtn} testID="button-menu">
          <Ionicons name="menu" size={24} color={colors.foreground} />
        </Pressable>
        <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerRight}>
          <Pressable onPress={() => { triggerHaptic('light'); setEditMode(!editMode); }} style={styles.editBtn} testID="button-edit-widgets">
            <Ionicons name={editMode ? 'checkmark' : 'options-outline'} size={20} color={editMode ? staticColors.success : colors.foreground} />
          </Pressable>
          <Pressable onPress={() => { triggerHaptic('light'); onNavigateProfile(); }} testID="button-profile">
            <Avatar name={`${user?.firstName || ''} ${user?.lastName || ''}`} size="sm" />
          </Pressable>
        </View>
      </View>

      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigateDashboard={() => setMenuVisible(false)}
        onNavigateGestori={onNavigateGestori}
        onNavigateCompanies={onNavigateCompanies}
        onNavigateSettings={onNavigateSettings}
        onNavigatePrinter={() => handleMenuNavigation(onNavigatePrinter)}
        onNavigateDigitalTemplates={() => handleMenuNavigation(onNavigateDigitalTemplates)}
        onNavigateStripeAdmin={() => handleMenuNavigation(onNavigateStripeAdmin)}
        onNavigateSIAEApprovals={() => handleMenuNavigation(onNavigateSIAEApprovals)}
        onNavigateSIAETables={() => handleMenuNavigation(onNavigateSIAETables)}
        onNavigateSIAECards={() => handleMenuNavigation(onNavigateSIAECards)}
        onNavigateSIAEConfig={() => handleMenuNavigation(onNavigateSIAEConfig)}
        onNavigateSIAECustomers={() => handleMenuNavigation(onNavigateSIAECustomers)}
        onNavigateSIAEConsole={() => handleMenuNavigation(onNavigateSIAEConsole)}
        onNavigateSIAETransactions={() => handleMenuNavigation(onNavigateSIAETransactions)}
        onNavigateSIAEMonitor={onNavigateSIAEMonitor}
        onNavigateSIAEBoxOffice={() => handleMenuNavigation(onNavigateSIAEBoxOffice)}
        onNavigateSIAETransmissions={() => handleMenuNavigation(onNavigateSIAETransmissions)}
        onNavigateSIAETicketTypes={() => handleMenuNavigation(onNavigateSIAETicketTypes)}
        onNavigateSIAEResales={() => handleMenuNavigation(onNavigateSIAEResales)}
        onNavigateSIAESubscriptions={() => handleMenuNavigation(onNavigateSIAESubscriptions)}
        onNavigateSIAEAuditLogs={() => handleMenuNavigation(onNavigateSIAEAuditLogs)}
        onNavigateBillingPlans={() => handleMenuNavigation(onNavigateBillingPlans)}
        onNavigateBillingOrganizers={() => handleMenuNavigation(onNavigateBillingOrganizers)}
        onNavigateBillingInvoices={() => handleMenuNavigation(onNavigateBillingInvoices)}
        onNavigateBillingReports={() => handleMenuNavigation(onNavigateBillingReports)}
        onNavigateUsers={onNavigateUsers}
        onNavigateEvents={onNavigateEvents}
        onNavigateNameChanges={onNavigateNameChanges}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>{getGreeting()}, {user?.firstName || 'Admin'}</Text>
          <Text style={styles.greetingSubtext}>Pannello di controllo Event4U</Text>
        </View>

        {editMode && (
          <View style={styles.editPanel}>
            <Text style={styles.editTitle}>Personalizza Dashboard</Text>
            <Text style={styles.editSubtitle}>Attiva o disattiva i widget</Text>
            <View style={styles.widgetToggles}>
              {widgets.map((widget) => (
                <Pressable 
                  key={widget.id} 
                  onPress={() => toggleWidget(widget.id)}
                  style={[styles.widgetToggle, widget.enabled && styles.widgetToggleActive]}
                  testID={`toggle-widget-${widget.id}`}
                >
                  <Text style={[styles.widgetToggleText, widget.enabled && styles.widgetToggleTextActive]}>
                    {widget.id === 'stats' ? 'Statistiche' :
                     widget.id === 'kpi' ? 'KPI' :
                     widget.id === 'alerts' ? 'Notifiche' :
                     widget.id === 'quickNav' ? 'Nav Rapida' :
                     widget.id === 'recentGestori' ? 'Gestori' :
                     widget.id === 'siae' ? 'SIAE' : 'Billing'}
                  </Text>
                  <Ionicons 
                    name={widget.enabled ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={18} 
                    color={widget.enabled ? staticColors.success : colors.mutedForeground} 
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {isLoading ? (
          <SkeletonDashboard />
        ) : (
          <>
            {enabledWidgets.map((widget) => renderWidget(widget.id))}

            <View style={styles.logoutSection}>
              <Button
                variant="outline"
                size="lg"
                onPress={async () => {
                  triggerHaptic('medium');
                  await logout();
                  onLogout();
                }}
                style={styles.logoutBtn}
                testID="button-logout"
              >
                <Ionicons name="log-out-outline" size={18} color={colors.foreground} style={{ marginRight: spacing.xs }} />
                <Text style={[styles.logoutText, { color: colors.foreground }]}>Esci</Text>
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: staticColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  menuBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  logo: { height: 26, width: 90, tintColor: '#FFFFFF' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: 'auto' },
  editBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.full, backgroundColor: staticColors.glass },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  greeting: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.md },
  greetingText: { fontSize: typography.fontSize['2xl'], fontWeight: '700', color: staticColors.foreground },
  greetingSubtext: { fontSize: typography.fontSize.sm, color: staticColors.mutedForeground, marginTop: 4 },
  editPanel: { marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.md, backgroundColor: staticColors.glass, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: staticColors.border },
  editTitle: { fontSize: typography.fontSize.md, fontWeight: '600', color: staticColors.foreground },
  editSubtitle: { fontSize: typography.fontSize.xs, color: staticColors.mutedForeground, marginTop: 2 },
  widgetToggles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  widgetToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.full, backgroundColor: staticColors.muted, borderWidth: 1, borderColor: staticColors.border },
  widgetToggleActive: { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: '#22C55E' },
  widgetToggleText: { fontSize: typography.fontSize.xs, color: staticColors.mutedForeground },
  widgetToggleTextActive: { color: '#22C55E', fontWeight: '500' },
  statsGrid: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm },
  statCardMain: { flex: 2, padding: spacing.md },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statContent: { flex: 1 },
  statValue: { fontSize: typography.fontSize['2xl'], fontWeight: '700', color: staticColors.foreground },
  statLabel: { fontSize: typography.fontSize.xs, color: staticColors.mutedForeground },
  statDivider: { height: 1, backgroundColor: staticColors.border, marginVertical: spacing.sm },
  statMiniRow: { flexDirection: 'row', gap: spacing.lg },
  statMiniItem: {},
  statMiniValue: { fontSize: typography.fontSize.lg, fontWeight: '600', color: staticColors.foreground },
  statMiniLabel: { fontSize: typography.fontSize.xs, color: staticColors.mutedForeground },
  statCardColumn: { flex: 1, gap: spacing.sm },
  statCardSmall: { flex: 1, padding: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  statIconSmall: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValueSmall: { fontSize: typography.fontSize.lg, fontWeight: '700', color: staticColors.foreground },
  statLabelSmall: { fontSize: 10, color: staticColors.mutedForeground },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  trendText: { fontSize: 10, fontWeight: '600' },
  kpiGrid: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginTop: spacing.md },
  kpiCard: { flex: 1, padding: spacing.sm },
  kpiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  kpiIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  kpiBadge: { position: 'absolute', top: -4, right: -4 },
  kpiValue: { fontSize: typography.fontSize.lg, fontWeight: '700', color: staticColors.foreground },
  kpiLabel: { fontSize: 10, color: staticColors.mutedForeground, marginTop: 2 },
  section: { marginTop: spacing.lg, paddingHorizontal: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: typography.fontSize.md, fontWeight: '600', color: staticColors.foreground },
  seeAllText: { fontSize: typography.fontSize.sm, color: staticColors.primary, fontWeight: '500' },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  navItem: { width: (SCREEN_WIDTH - spacing.md * 2 - spacing.sm * 2) / 3, alignItems: 'center' },
  navIconGradient: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  navLabel: { fontSize: typography.fontSize.xs, color: staticColors.foreground, textAlign: 'center' },
  chipScroll: { paddingRight: spacing.md, gap: spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.full, backgroundColor: staticColors.glass, borderWidth: 1, borderColor: staticColors.border },
  chipIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: typography.fontSize.xs, color: staticColors.foreground },
  chipBadge: { marginLeft: 4 },
  gestoreRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, marginBottom: spacing.xs },
  gestoreInfo: { flex: 1, marginLeft: spacing.sm },
  gestoreName: { fontSize: typography.fontSize.sm, fontWeight: '600', color: staticColors.foreground },
  gestoreCompany: { fontSize: typography.fontSize.xs, color: staticColors.mutedForeground },
  gestoreRight: { alignItems: 'flex-end', gap: 4 },
  gestoreEvents: { fontSize: 10, color: staticColors.mutedForeground },
  emptyCard: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { fontSize: typography.fontSize.sm, color: staticColors.mutedForeground, marginTop: spacing.xs },
  alertCard: { marginBottom: spacing.xs },
  alertRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.sm },
  alertIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: typography.fontSize.sm, fontWeight: '600', color: staticColors.foreground },
  alertMessage: { fontSize: typography.fontSize.xs, color: staticColors.mutedForeground },
  alertTime: { fontSize: 10, color: staticColors.mutedForeground },
  logoutSection: { marginTop: spacing.xl, paddingHorizontal: spacing.md },
  logoutBtn: { width: '100%' },
  logoutText: { fontSize: typography.fontSize.sm, fontWeight: '500' },
});

export default AdminDashboard;
