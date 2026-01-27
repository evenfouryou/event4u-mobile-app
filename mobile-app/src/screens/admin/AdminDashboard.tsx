import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { Loading, SkeletonDashboard } from '@/components/Loading';
import { ActionCard } from '@/components/ActionCard';
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
}

interface RecentGestore {
  id: string;
  name: string;
  companyName: string;
  eventsCount: number;
  status: string;
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
  onSwitchToClient,
  onLogout,
}: AdminDashboardProps) {
  const { user, logout } = useAuth();
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<AdminStats>({
    totalGestori: 0,
    activeGestori: 0,
    totalEvents: 0,
    totalUsers: 0,
    monthlyRevenue: 0,
    recentGestori: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      setStats(data);
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

  const quickActions = [
    { id: 'gestori', icon: 'people' as const, label: 'Gestori', gradient: 'golden' as const, onPress: onNavigateGestori },
    { id: 'companies', icon: 'business' as const, label: 'Aziende', gradient: 'teal' as const, onPress: onNavigateCompanies },
    { id: 'events', icon: 'calendar' as const, label: 'Eventi', gradient: 'purple' as const, onPress: onNavigateEvents },
    { id: 'billing', icon: 'card' as const, label: 'Billing', gradient: 'blue' as const, onPress: onNavigateBilling },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo.png')}
          style={[styles.headerLogo, { tintColor: '#FFFFFF' }]}
          resizeMode="contain"
        />
        <Badge variant="destructive">Admin</Badge>
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
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Pannello Admin</Text>
          <Text style={styles.greetingSubtext}>Gestisci la piattaforma Event4U</Text>
        </View>

        {showLoader ? (
          <SkeletonDashboard />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                  <Ionicons name="people" size={24} color={staticColors.primary} />
                </View>
                <Text style={styles.statValue}>{stats.totalGestori}</Text>
                <Text style={styles.statLabel}>Gestori</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                  <Ionicons name="checkmark-circle" size={24} color={staticColors.success} />
                </View>
                <Text style={styles.statValue}>{stats.activeGestori}</Text>
                <Text style={styles.statLabel}>Attivi</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                  <Ionicons name="calendar" size={24} color={staticColors.teal} />
                </View>
                <Text style={styles.statValue}>{stats.totalEvents}</Text>
                <Text style={styles.statLabel}>Eventi</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
                  <Ionicons name="cash" size={24} color={staticColors.golden} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(stats.monthlyRevenue)}</Text>
                <Text style={styles.statLabel}>Mese</Text>
              </GlassCard>
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
                <Text style={styles.sectionTitle}>Gestori Recenti</Text>
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
  greeting: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  greetingText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  greetingSubtext: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
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
  section: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  seeAllLink: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    fontWeight: '500',
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
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuItem: {
    flex: 1,
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
