import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius, gradients } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { Loading, SkeletonDashboard } from '@/components/Loading';
import { ActionCard } from '@/components/ActionCard';
import { AdminMenuDrawer } from '@/components/AdminMenuDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

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
    gestoriTrend: 0,
    eventsTrend: 0,
    revenueTrend: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    loadDashboardData();
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
      });
      if (data.alerts) {
        setAlerts(data.alerts);
      }
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
    }).format(amount);
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'warning': return 'warning';
      case 'error': return 'alert-circle';
      case 'info': return 'information-circle';
      case 'success': return 'checkmark-circle';
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'warning': return staticColors.warning;
      case 'error': return staticColors.destructive;
      case 'info': return staticColors.teal;
      case 'success': return staticColors.success;
    }
  };

  const quickActions = [
    { id: 'gestori', icon: 'people' as const, label: 'Gestori', gradient: 'golden' as const, onPress: onNavigateGestori },
    { id: 'companies', icon: 'business' as const, label: 'Aziende', gradient: 'teal' as const, onPress: onNavigateCompanies },
    { id: 'events', icon: 'calendar' as const, label: 'Eventi', gradient: 'purple' as const, onPress: onNavigateEvents },
    { id: 'billing', icon: 'card' as const, label: 'Billing', gradient: 'blue' as const, onPress: onNavigateBilling },
  ];

  const renderTrendIndicator = (trend: number) => {
    const isPositive = trend >= 0;
    return (
      <View style={[styles.trendBadge, { backgroundColor: isPositive ? `${staticColors.success}20` : `${staticColors.destructive}20` }]}>
        <Ionicons 
          name={isPositive ? 'trending-up' : 'trending-down'} 
          size={12} 
          color={isPositive ? staticColors.success : staticColors.destructive} 
        />
        <Text style={[styles.trendText, { color: isPositive ? staticColors.success : staticColors.destructive }]}>
          {isPositive ? '+' : ''}{trend}%
        </Text>
      </View>
    );
  };

  const handleMenuNavigation = (navigateFn?: () => void) => {
    if (navigateFn) {
      navigateFn();
    } else {
      triggerHaptic('medium');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setMenuVisible(true);
          }}
          style={styles.menuButton}
          testID="button-menu"
        >
          <Ionicons name="menu" size={24} color={colors.foreground} />
        </Pressable>
        <Image
          source={require('../../../assets/logo.png')}
          style={[styles.headerLogo, { tintColor: '#FFFFFF' }]}
          resizeMode="contain"
        />
        <View style={styles.headerRight}>
          {onSwitchToClient && (
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                onSwitchToClient();
              }}
              style={styles.switchButton}
              testID="button-switch-to-client"
            >
              <Ionicons name="swap-horizontal" size={20} color={staticColors.primary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onNavigateSettings();
            }}
            style={styles.settingsButton}
            testID="button-settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onNavigateProfile();
            }}
            style={styles.avatarButton}
            testID="button-profile"
          >
            <Avatar
              name={`${user?.firstName || ''} ${user?.lastName || ''}`}
              size="sm"
              testID="avatar-admin"
            />
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.15)', 'rgba(0, 206, 209, 0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTextContent}>
              <Text style={styles.heroTitle}>Pannello Admin</Text>
              <Text style={styles.heroSubtitle}>Gestisci la piattaforma Event4U</Text>
              <View style={styles.heroStats}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{stats.totalUsers}</Text>
                  <Text style={styles.heroStatLabel}>Utenti totali</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatValue}>{stats.totalEvents}</Text>
                  <Text style={styles.heroStatLabel}>Eventi attivi</Text>
                </View>
              </View>
            </View>
            <View style={styles.heroIconContainer}>
              <LinearGradient
                colors={[staticColors.primary, '#FF8C00']}
                style={styles.heroIconGradient}
              >
                <Ionicons name="shield-checkmark" size={40} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>

        {showLoader ? (
          <SkeletonDashboard />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard}>
                <View style={styles.statHeader}>
                  <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                    <Ionicons name="people" size={24} color={staticColors.primary} />
                  </View>
                  {renderTrendIndicator(stats.gestoriTrend || 0)}
                </View>
                <Text style={styles.statValue}>{stats.totalGestori}</Text>
                <Text style={styles.statLabel}>Gestori</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={styles.statHeader}>
                  <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                    <Ionicons name="checkmark-circle" size={24} color={staticColors.success} />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.activeGestori}</Text>
                <Text style={styles.statLabel}>Attivi</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={styles.statHeader}>
                  <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                    <Ionicons name="calendar" size={24} color={staticColors.teal} />
                  </View>
                  {renderTrendIndicator(stats.eventsTrend || 0)}
                </View>
                <Text style={styles.statValue}>{stats.totalEvents}</Text>
                <Text style={styles.statLabel}>Eventi</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={styles.statHeader}>
                  <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
                    <Ionicons name="cash" size={24} color={staticColors.golden} />
                  </View>
                  {renderTrendIndicator(stats.revenueTrend || 0)}
                </View>
                <Text style={styles.statValue}>{formatCurrency(stats.monthlyRevenue)}</Text>
                <Text style={styles.statLabel}>Mese</Text>
              </GlassCard>
            </View>

            <View style={styles.kpiRow}>
              <GlassCard style={styles.kpiCard}>
                <View style={[styles.kpiIcon, { backgroundColor: `${staticColors.purple}20` }]}>
                  <Ionicons name="ticket" size={20} color={staticColors.purple} />
                </View>
                <View style={styles.kpiContent}>
                  <Text style={styles.kpiValue}>{stats.ticketsSoldToday}</Text>
                  <Text style={styles.kpiLabel}>Ticket venduti oggi</Text>
                </View>
              </GlassCard>

              <GlassCard style={styles.kpiCard}>
                <View style={[styles.kpiIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <Ionicons name="cloud-upload" size={20} color="#10B981" />
                </View>
                <View style={styles.kpiContent}>
                  <Text style={styles.kpiValue}>{stats.pendingSIAETransmissions}</Text>
                  <Text style={styles.kpiLabel}>SIAE pendenti</Text>
                </View>
              </GlassCard>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleInline}>Notifiche</Text>
                <Badge variant="secondary">{alerts.length}</Badge>
              </View>
              <View style={styles.alertsList}>
                {alerts.map((alert) => (
                  <Card key={alert.id} style={styles.alertCard}>
                    <View style={styles.alertContent}>
                      <View style={[styles.alertIconWrap, { backgroundColor: `${getAlertColor(alert.type)}15` }]}>
                        <Ionicons name={getAlertIcon(alert.type)} size={20} color={getAlertColor(alert.type)} />
                      </View>
                      <View style={styles.alertTextContent}>
                        <Text style={styles.alertTitle}>{alert.title}</Text>
                        <Text style={styles.alertMessage}>{alert.message}</Text>
                      </View>
                      <Text style={styles.alertTime}>{alert.time}</Text>
                    </View>
                  </Card>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Azioni Rapide</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.actionsScrollContent}
              >
                {quickActions.map((action) => (
                  <View key={action.id} style={styles.actionCardWrapper}>
                    <ActionCard
                      icon={action.icon}
                      label={action.label}
                      gradient={action.gradient}
                      onPress={action.onPress}
                      testID={`action-${action.id}`}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleInline}>Gestori Recenti</Text>
                <Pressable onPress={onNavigateGestori}>
                  <Text style={styles.seeAllLink}>Vedi tutti</Text>
                </Pressable>
              </View>

              {stats.recentGestori.length > 0 ? (
                <View style={styles.gestoriList}>
                  {stats.recentGestori.slice(0, 5).map((gestore) => (
                    <Pressable
                      key={gestore.id}
                      onPress={() => {
                        triggerHaptic('light');
                        onNavigateGestori();
                      }}
                    >
                      <Card style={styles.gestoreCard} testID={`gestore-card-${gestore.id}`}>
                        <View style={styles.gestoreContent}>
                          <Avatar name={gestore.name} size="md" testID={`avatar-${gestore.id}`} />
                          <View style={styles.gestoreInfo}>
                            <Text style={styles.gestoreName}>{gestore.name}</Text>
                            <Text style={styles.gestoreCompany}>{gestore.companyName}</Text>
                          </View>
                          <View style={styles.gestoreStats}>
                            <Badge variant={gestore.status === 'active' ? 'success' : 'secondary'}>
                              {gestore.status === 'active' ? 'Attivo' : 'Inattivo'}
                            </Badge>
                            <Text style={styles.gestoreEvents}>{gestore.eventsCount} eventi</Text>
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Card style={styles.emptyCard}>
                  <View style={styles.emptyContent}>
                    <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
                    <Text style={styles.emptyTitle}>Nessun gestore</Text>
                    <Text style={styles.emptyText}>I gestori appariranno qui</Text>
                  </View>
                </Card>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gestione Sistema</Text>
              <View style={styles.menuGrid}>
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateUsers();
                  }}
                  style={styles.menuItem}
                  testID="menu-users"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: `${staticColors.purple}20` }]}>
                      <Ionicons name="person" size={24} color={staticColors.purple} />
                    </View>
                    <Text style={styles.menuLabel}>Utenti</Text>
                  </Card>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateSettings();
                  }}
                  style={styles.menuItem}
                  testID="menu-settings"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                      <Ionicons name="cog" size={24} color={staticColors.teal} />
                    </View>
                    <Text style={styles.menuLabel}>Impostazioni</Text>
                  </Card>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateNameChanges();
                  }}
                  style={styles.menuItem}
                  testID="menu-name-changes"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: `${staticColors.pink}20` }]}>
                      <Ionicons name="swap-horizontal" size={24} color={staticColors.pink} />
                    </View>
                    <Text style={styles.menuLabel}>Cambio Nominativo</Text>
                  </Card>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateSIAEMonitor();
                  }}
                  style={styles.menuItem}
                  testID="menu-siae-monitor"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                    </View>
                    <Text style={styles.menuLabel}>Monitor SIAE</Text>
                  </Card>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SIAE</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.siaeScrollContent}
              >
                <Pressable onPress={() => handleMenuNavigation(onNavigateSIAETables)} style={styles.siaeItem}>
                  <Card style={styles.siaeCard}>
                    <View style={[styles.siaeIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="grid-outline" size={20} color="#10B981" />
                    </View>
                    <Text style={styles.siaeLabel}>Tables</Text>
                  </Card>
                </Pressable>
                <Pressable onPress={() => handleMenuNavigation(onNavigateSIAECards)} style={styles.siaeItem}>
                  <Card style={styles.siaeCard}>
                    <View style={[styles.siaeIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="card-outline" size={20} color="#10B981" />
                    </View>
                    <Text style={styles.siaeLabel}>Cards</Text>
                  </Card>
                </Pressable>
                <Pressable onPress={() => handleMenuNavigation(onNavigateSIAEConfig)} style={styles.siaeItem}>
                  <Card style={styles.siaeCard}>
                    <View style={[styles.siaeIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="options" size={20} color="#10B981" />
                    </View>
                    <Text style={styles.siaeLabel}>Config</Text>
                  </Card>
                </Pressable>
                <Pressable onPress={() => handleMenuNavigation(onNavigateSIAEApprovals)} style={styles.siaeItem}>
                  <Card style={styles.siaeCard}>
                    <View style={[styles.siaeIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="checkmark-done" size={20} color="#10B981" />
                    </View>
                    <Text style={styles.siaeLabel}>Approvals</Text>
                    <Badge variant="destructive" style={styles.siaeBadge}>3</Badge>
                  </Card>
                </Pressable>
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Billing</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.siaeScrollContent}
              >
                <Pressable onPress={() => handleMenuNavigation(onNavigateBillingPlans)} style={styles.siaeItem}>
                  <Card style={styles.siaeCard}>
                    <View style={[styles.siaeIcon, { backgroundColor: `${staticColors.golden}20` }]}>
                      <Ionicons name="layers" size={20} color={staticColors.golden} />
                    </View>
                    <Text style={styles.siaeLabel}>Plans</Text>
                  </Card>
                </Pressable>
                <Pressable onPress={() => handleMenuNavigation(onNavigateBillingOrganizers)} style={styles.siaeItem}>
                  <Card style={styles.siaeCard}>
                    <View style={[styles.siaeIcon, { backgroundColor: `${staticColors.golden}20` }]}>
                      <Ionicons name="briefcase" size={20} color={staticColors.golden} />
                    </View>
                    <Text style={styles.siaeLabel}>Organizers</Text>
                  </Card>
                </Pressable>
                <Pressable onPress={() => handleMenuNavigation(onNavigateBillingInvoices)} style={styles.siaeItem}>
                  <Card style={styles.siaeCard}>
                    <View style={[styles.siaeIcon, { backgroundColor: `${staticColors.golden}20` }]}>
                      <Ionicons name="receipt" size={20} color={staticColors.golden} />
                    </View>
                    <Text style={styles.siaeLabel}>Invoices</Text>
                  </Card>
                </Pressable>
                <Pressable onPress={() => handleMenuNavigation(onNavigateBillingReports)} style={styles.siaeItem}>
                  <Card style={styles.siaeCard}>
                    <View style={[styles.siaeIcon, { backgroundColor: `${staticColors.golden}20` }]}>
                      <Ionicons name="bar-chart" size={20} color={staticColors.golden} />
                    </View>
                    <Text style={styles.siaeLabel}>Reports</Text>
                  </Card>
                </Pressable>
              </ScrollView>
            </View>

            <View style={styles.logoutSection}>
              <Button
                variant="outline"
                size="lg"
                onPress={async () => {
                  triggerHaptic('medium');
                  await logout();
                  onLogout();
                }}
                style={styles.logoutButton}
                testID="button-logout"
              >
                <Ionicons name="log-out-outline" size={20} color={colors.foreground} />
                <Text style={styles.logoutText}>Esci</Text>
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
    gap: spacing.sm,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    height: 28,
    width: 100,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  switchButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: staticColors.primary,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  heroBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  heroSubtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  heroStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  heroStatItem: {
    alignItems: 'flex-start',
  },
  heroStatValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  heroStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: staticColors.border,
  },
  heroIconContainer: {
    marginLeft: spacing.md,
  },
  heroIconGradient: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  statCard: {
    width: '48%',
    padding: spacing.md,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  trendText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  kpiCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiContent: {
    flex: 1,
  },
  kpiValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  kpiLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitleInline: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  seeAllLink: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    fontWeight: '500',
  },
  alertsList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  alertCard: {
    padding: spacing.md,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  alertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTextContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  alertMessage: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  alertTime: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  actionsScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  actionCardWrapper: {
    width: 120,
  },
  gestoriList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  gestoreCard: {
    padding: spacing.md,
  },
  gestoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gestoreInfo: {
    flex: 1,
  },
  gestoreName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  gestoreCompany: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  gestoreStats: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  gestoreEvents: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuItem: {
    width: '47%',
  },
  menuCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  menuLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
    textAlign: 'center',
  },
  siaeScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  siaeItem: {
    width: 100,
  },
  siaeCard: {
    padding: spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  siaeIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  siaeLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: staticColors.foreground,
    textAlign: 'center',
  },
  siaeBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  logoutSection: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
  },
});

export default AdminDashboard;
