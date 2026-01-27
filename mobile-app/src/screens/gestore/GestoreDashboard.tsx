import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

interface GestoreDashboardProps {
  onNavigateEvents: () => void;
  onNavigateInventory: () => void;
  onNavigateStaff: () => void;
  onNavigateScanner: () => void;
  onNavigateMarketing: () => void;
  onNavigateAccounting: () => void;
  onNavigateProfile: () => void;
  onNavigateSettings: () => void;
  onNavigateProducts: () => void;
  onNavigatePriceLists: () => void;
  onNavigatePRManagement: () => void;
  onNavigateCompanies: () => void;
  onNavigateStations: () => void;
  onNavigateWarehouse: () => void;
  onNavigateSuppliers: () => void;
  onNavigatePersonnel: () => void;
  onNavigateReports: () => void;
  onNavigateCashier: () => void;
  onNavigateUsers: () => void;
  onNavigateSIAE: () => void;
  onSwitchToClient?: () => void;
  onLogout: () => void;
}

interface DashboardStats {
  activeEvents: number;
  totalGuests: number;
  monthlyRevenue: number;
  pendingTickets: number;
  upcomingEvents: UpcomingEvent[];
}

interface UpcomingEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  guestsCount: number;
  ticketsSold: number;
}

export function GestoreDashboard({
  onNavigateEvents,
  onNavigateInventory,
  onNavigateStaff,
  onNavigateScanner,
  onNavigateMarketing,
  onNavigateAccounting,
  onNavigateProfile,
  onNavigateSettings,
  onNavigateProducts,
  onNavigatePriceLists,
  onNavigatePRManagement,
  onNavigateCompanies,
  onNavigateStations,
  onNavigateWarehouse,
  onNavigateSuppliers,
  onNavigatePersonnel,
  onNavigateReports,
  onNavigateCashier,
  onNavigateUsers,
  onNavigateSIAE,
  onSwitchToClient,
  onLogout,
}: GestoreDashboardProps) {
  const { user, logout } = useAuth();
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats>({
    activeEvents: 0,
    totalGuests: 0,
    monthlyRevenue: 0,
    pendingTickets: 0,
    upcomingEvents: [],
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
      const data = await api.getGestoreDashboard();
      setStats(data);
    } catch (error) {
      console.error('Error loading gestore dashboard:', error);
      setStats({
        activeEvents: 0,
        totalGuests: 0,
        monthlyRevenue: 0,
        pendingTickets: 0,
        upcomingEvents: [],
      });
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const quickActions = [
    { id: 'events', icon: 'calendar' as const, label: 'Eventi', gradient: 'golden' as const, onPress: onNavigateEvents },
    { id: 'inventory', icon: 'cube' as const, label: 'Inventario', gradient: 'teal' as const, onPress: onNavigateInventory },
    { id: 'staff', icon: 'people' as const, label: 'Staff', gradient: 'purple' as const, onPress: onNavigateStaff },
    { id: 'scanner', icon: 'scan' as const, label: 'Scanner', gradient: 'blue' as const, onPress: onNavigateScanner },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
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
              testID="avatar-gestore"
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
          <Text style={styles.greetingText}>Ciao, {user?.firstName || 'Gestore'}</Text>
          <Text style={styles.greetingSubtext}>Gestisci i tuoi eventi</Text>
        </View>

        {showLoader ? (
          <SkeletonDashboard />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name="calendar" size={24} color={staticColors.primary} />
                </View>
                <Text style={styles.statValue}>{stats.activeEvents}</Text>
                <Text style={styles.statLabel}>Eventi Attivi</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name="people" size={24} color={staticColors.teal} />
                </View>
                <Text style={styles.statValue}>{stats.totalGuests}</Text>
                <Text style={styles.statLabel}>Ospiti Totali</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name="cash" size={24} color={staticColors.golden} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(stats.monthlyRevenue)}</Text>
                <Text style={styles.statLabel}>Fatturato Mese</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons name="ticket" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.statValue}>{stats.pendingTickets}</Text>
                <Text style={styles.statLabel}>Biglietti Venduti</Text>
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
                <Text style={styles.sectionTitle}>Prossimi Eventi</Text>
                <Pressable onPress={onNavigateEvents}>
                  <Text style={styles.seeAllLink}>Vedi tutti</Text>
                </Pressable>
              </View>

              {stats.upcomingEvents.length > 0 ? (
                <View style={styles.eventsList}>
                  {stats.upcomingEvents.slice(0, 3).map((event) => (
                    <Pressable
                      key={event.id}
                      onPress={() => {
                        triggerHaptic('light');
                        onNavigateEvents();
                      }}
                    >
                      <Card style={styles.eventCard} testID={`event-card-${event.id}`}>
                        <View style={styles.eventContent}>
                          <View style={styles.eventDateBox}>
                            <Text style={styles.eventDay}>
                              {new Date(event.date).getDate()}
                            </Text>
                            <Text style={styles.eventMonth}>
                              {new Date(event.date).toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.eventInfo}>
                            <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
                            <View style={styles.eventMeta}>
                              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                              <Text style={styles.eventMetaText} numberOfLines={1}>{event.location}</Text>
                            </View>
                          </View>
                          <View style={styles.eventStats}>
                            <Badge variant="secondary">{event.guestsCount} ospiti</Badge>
                            <Badge variant="default">{event.ticketsSold} biglietti</Badge>
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Card style={styles.emptyCard}>
                  <View style={styles.emptyContent}>
                    <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
                    <Text style={styles.emptyTitle}>Nessun evento in programma</Text>
                    <Text style={styles.emptyText}>Crea il tuo primo evento per iniziare</Text>
                    <Button
                      variant="golden"
                      onPress={onNavigateEvents}
                      style={styles.emptyButton}
                      testID="button-create-event"
                    >
                      Crea Evento
                    </Button>
                  </View>
                </Card>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gestione</Text>
              <View style={styles.menuGrid}>
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateMarketing();
                  }}
                  style={styles.menuItem}
                  testID="menu-marketing"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                      <Ionicons name="megaphone" size={24} color="#EC4899" />
                    </View>
                    <Text style={styles.menuLabel}>Marketing</Text>
                  </Card>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateAccounting();
                  }}
                  style={styles.menuItem}
                  testID="menu-accounting"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: `${staticColors.golden}20` }]}>
                      <Ionicons name="stats-chart" size={24} color={staticColors.golden} />
                    </View>
                    <Text style={styles.menuLabel}>Contabilità</Text>
                  </Card>
                </Pressable>
              </View>
            </View>

            {/* Gestione Avanzata Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gestione Avanzata</Text>
              <View style={styles.menuGrid}>
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateProducts();
                  }}
                  style={styles.menuItem}
                  testID="menu-products"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                      <Ionicons name="cube" size={24} color={staticColors.teal} />
                    </View>
                    <Text style={styles.menuLabel}>Prodotti</Text>
                  </Card>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigatePriceLists();
                  }}
                  style={styles.menuItem}
                  testID="menu-pricelists"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: `${staticColors.golden}20` }]}>
                      <Ionicons name="pricetags" size={24} color={staticColors.golden} />
                    </View>
                    <Text style={styles.menuLabel}>Listini</Text>
                  </Card>
                </Pressable>
              </View>
              <View style={styles.menuGrid}>
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateWarehouse();
                  }}
                  style={styles.menuItem}
                  testID="menu-warehouse"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                      <Ionicons name="archive" size={24} color="#8B5CF6" />
                    </View>
                    <Text style={styles.menuLabel}>Magazzino</Text>
                  </Card>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateSuppliers();
                  }}
                  style={styles.menuItem}
                  testID="menu-suppliers"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                      <Ionicons name="business" size={24} color="#3B82F6" />
                    </View>
                    <Text style={styles.menuLabel}>Fornitori</Text>
                  </Card>
                </Pressable>
              </View>
              <View style={styles.menuGrid}>
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigatePersonnel();
                  }}
                  style={styles.menuItem}
                  testID="menu-personnel"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="people" size={24} color="#10B981" />
                    </View>
                    <Text style={styles.menuLabel}>Personale</Text>
                  </Card>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateStations();
                  }}
                  style={styles.menuItem}
                  testID="menu-stations"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Ionicons name="storefront" size={24} color="#F59E0B" />
                    </View>
                    <Text style={styles.menuLabel}>Stazioni</Text>
                  </Card>
                </Pressable>
              </View>
              <View style={styles.menuGrid}>
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigatePRManagement();
                  }}
                  style={styles.menuItem}
                  testID="menu-pr"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                      <Ionicons name="person-add" size={24} color="#EC4899" />
                    </View>
                    <Text style={styles.menuLabel}>PR</Text>
                  </Card>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateCompanies();
                  }}
                  style={styles.menuItem}
                  testID="menu-companies"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                      <Ionicons name="briefcase" size={24} color="#6366F1" />
                    </View>
                    <Text style={styles.menuLabel}>Aziende</Text>
                  </Card>
                </Pressable>
              </View>
              <View style={styles.menuGrid}>
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateReports();
                  }}
                  style={styles.menuItem}
                  testID="menu-reports"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
                      <Ionicons name="analytics" size={24} color="#0EA5E9" />
                    </View>
                    <Text style={styles.menuLabel}>Report</Text>
                  </Card>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateCashier();
                  }}
                  style={styles.menuItem}
                  testID="menu-cashier"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                      <Ionicons name="cash" size={24} color="#22C55E" />
                    </View>
                    <Text style={styles.menuLabel}>Cassa</Text>
                  </Card>
                </Pressable>
              </View>
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
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                      <Ionicons name="person-circle" size={24} color="#A855F7" />
                    </View>
                    <Text style={styles.menuLabel}>Utenti</Text>
                  </Card>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateSIAE();
                  }}
                  style={styles.menuItem}
                  testID="menu-siae"
                >
                  <Card style={styles.menuCard}>
                    <View style={[styles.menuIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                    </View>
                    <Text style={styles.menuLabel}>SIAE</Text>
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
  },
  headerLogo: {
    height: 28,
    width: 100,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
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
  eventsList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  eventCard: {
    padding: spacing.md,
  },
  eventContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventDateBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDay: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  eventMonth: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.primary,
    marginTop: -2,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    flex: 1,
  },
  eventStats: {
    gap: spacing.xs,
    alignItems: 'flex-end',
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
    marginBottom: spacing.lg,
  },
  emptyButton: {
    paddingHorizontal: spacing.xl,
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

export default GestoreDashboard;
