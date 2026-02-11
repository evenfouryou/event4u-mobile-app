import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SkeletonDashboard } from '@/components/Loading';
import { GestoreMenuDrawer } from '@/components/GestoreMenuDrawer';
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
  onNavigateLocations: () => void;
  onNavigateCreateEvent?: () => void;
  onNavigateEventHub?: (eventId: string) => void;
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
  onNavigateLocations,
  onNavigateCreateEvent,
  onNavigateEventHub,
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
  const [hasError, setHasError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];
  
  // Animazioni per le card
  const cardAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const quickActionAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const scaleAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  useEffect(() => {
    loadDashboardData();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
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
      setHasError(false);
      const data = await api.getGestoreDashboard();
      setStats(data);
    } catch (error) {
      console.error('Error loading gestore dashboard:', error);
      setHasError(true);
      setStats({
        activeEvents: 0,
        totalGuests: 0,
        monthlyRevenue: 0,
        pendingTickets: 0,
        upcomingEvents: [],
      });
    } finally {
      setIsLoading(false);
      // Trigger card entrance animations
      animateCardsIn();
    }
  };
  
  const animateCardsIn = () => {
    // Reset animations
    cardAnims.forEach(anim => anim.setValue(0));
    quickActionAnims.forEach(anim => anim.setValue(0));
    
    // Stagger stat cards
    const cardAnimations = cardAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      })
    );
    
    // Stagger quick actions
    const quickActionAnimations = quickActionAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 350,
        delay: 400 + index * 80,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      })
    );
    
    Animated.parallel([...cardAnimations, ...quickActionAnimations]).start();
  };
  
  const handleCardPressIn = (index: number) => {
    Animated.spring(scaleAnims[index], {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };
  
  const handleCardPressOut = (index: number) => {
    Animated.spring(scaleAnims[index], {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
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

  const [greeting, setGreeting] = useState('');
  
  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Buongiorno');
      else if (hour < 18) setGreeting('Buon pomeriggio');
      else setGreeting('Buonasera');
    };
    
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Aggiorna ogni minuto
    return () => clearInterval(interval);
  }, []);

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const ongoingEvents = stats.upcomingEvents.filter(event => {
    const eventDate = new Date(event.date);
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    return eventDay.getTime() === today.getTime();
  });

  const futureEvents = stats.upcomingEvents.filter(event => {
    const eventDate = new Date(event.date);
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    return eventDay > today;
  }).slice(0, 3);

  const nextEventDate = futureEvents[0] 
    ? new Date(futureEvents[0].date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
    : '--';

  const quickActions = [
    { 
      id: 'newEvent', 
      icon: 'add-circle' as const, 
      label: 'Nuovo Evento', 
      gradient: ['#6366F1', '#8B5CF6'] as [string, string],
      onPress: onNavigateCreateEvent || onNavigateEvents 
    },
    { 
      id: 'scanner', 
      icon: 'qr-code' as const, 
      label: 'Scanner', 
      gradient: ['#14B8A6', '#10B981'] as [string, string],
      onPress: onNavigateScanner 
    },
    { 
      id: 'inventory', 
      icon: 'wine' as const, 
      label: 'Beverage', 
      gradient: ['#F59E0B', '#EF6C00'] as [string, string],
      onPress: onNavigateInventory 
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setShowMenu(true);
            }}
            style={styles.menuButton}
            testID="button-menu"
          >
            <Ionicons name="menu" size={26} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onNavigateProfile();
            }}
            style={styles.avatarButton}
            testID="button-profile"
          >
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[staticColors.primary, `${staticColors.primary}99`]}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarInitials}>
                  {getInitials(user?.firstName, user?.lastName)}
                </Text>
              </LinearGradient>
            </View>
          </Pressable>
          <View style={styles.greetingContainer} testID="text-greeting">
            <Text style={[styles.greetingSmall, { color: colors.mutedForeground }]}>{greeting}</Text>
            <Text style={[styles.greetingName, { color: colors.foreground }]} testID="text-username">{user?.firstName || 'Gestore'}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.onlineBadge} testID="badge-online-status">
            <Animated.View style={[styles.onlineDot, { opacity: pulseAnim }]} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
          {onSwitchToClient && (
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                onSwitchToClient();
              }}
              style={styles.headerIconButton}
              testID="button-switch-to-client"
            >
              <Ionicons name="swap-horizontal" size={22} color={staticColors.primary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onNavigateSettings();
            }}
            style={styles.headerIconButton}
            testID="button-settings"
          >
            <Ionicons name="settings-outline" size={22} color={colors.foreground} />
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
            tintColor={staticColors.primary}
          />
        }
      >
        {showLoader ? (
          <SkeletonDashboard />
        ) : hasError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={staticColors.destructive} />
            <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore di caricamento</Text>
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              Impossibile caricare i dati. Verifica la connessione e riprova.
            </Text>
            <Button
              variant="golden"
              onPress={loadDashboardData}
              testID="button-retry-dashboard"
              style={{ marginTop: spacing.lg }}
            >
              Riprova
            </Button>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              {[
                { 
                  id: 'active-events',
                  colors: ['#6366F1', '#8B5CF6'] as [string, string],
                  icon: 'calendar' as const,
                  value: stats.activeEvents,
                  label: 'Eventi Attivi',
                  accentColor: '#6366F1',
                },
                { 
                  id: 'sold-tickets',
                  colors: ['#F59E0B', '#EF6C00'] as [string, string],
                  icon: 'ticket' as const,
                  value: stats.pendingTickets,
                  label: 'Biglietti Venduti',
                  accentColor: '#F59E0B',
                },
                { 
                  id: 'revenue',
                  colors: ['#14B8A6', '#10B981'] as [string, string],
                  icon: 'cash' as const,
                  value: formatCurrency(stats.monthlyRevenue),
                  label: 'Incasso Oggi',
                  accentColor: '#14B8A6',
                },
                { 
                  id: 'next-event',
                  colors: ['#EC4899', '#F43F5E'] as [string, string],
                  icon: 'time' as const,
                  value: nextEventDate,
                  label: 'Prossimo Evento',
                  accentColor: '#EC4899',
                },
              ].map((stat, index) => (
                <Animated.View
                  key={stat.id}
                  style={{
                    opacity: cardAnims[index],
                    transform: [
                      { scale: Animated.multiply(cardAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }), scaleAnims[index]) },
                      { translateY: cardAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }) },
                    ],
                    width: '48%',
                  }}
                >
                  <Pressable
                    onPressIn={() => handleCardPressIn(index)}
                    onPressOut={() => handleCardPressOut(index)}
                    onPress={() => {
                      triggerHaptic('light');
                      if (stat.id === 'active-events') onNavigateEvents();
                      else if (stat.id === 'sold-tickets') onNavigateReports?.();
                    }}
                    testID={`stat-${stat.id}`}
                  >
                    <GlassCard style={{
                      ...styles.statCard,
                      borderTopWidth: 3,
                      borderTopColor: stat.accentColor,
                    }}>
                      <View style={styles.statCardHeader}>
                        <LinearGradient
                          colors={stat.colors}
                          style={styles.statIconGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name={stat.icon} size={22} color="#FFF" />
                        </LinearGradient>
                        <View style={[styles.statIndicator, { backgroundColor: `${stat.accentColor}30` }]}>
                          <View style={[styles.statIndicatorDot, { backgroundColor: stat.accentColor }]} />
                        </View>
                      </View>
                      <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
                      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
                    </GlassCard>
                  </Pressable>
                </Animated.View>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleContainer}>
                  <LinearGradient
                    colors={[staticColors.primary, `${staticColors.primary}80`]}
                    style={styles.sectionTitleIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="flash" size={14} color="#FFF" />
                  </LinearGradient>
                  <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0, paddingHorizontal: 0 }]}>Azioni Rapide</Text>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickActionsScrollContent}
              >
                {quickActions.map((action, index) => (
                  <Animated.View
                    key={action.id}
                    style={{
                      opacity: quickActionAnims[index],
                      transform: [
                        { translateX: quickActionAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [-30, 0],
                        }) },
                        { scale: quickActionAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1],
                        }) },
                      ],
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        triggerHaptic('medium');
                        action.onPress();
                      }}
                      style={({ pressed }) => [
                        styles.quickActionButton,
                        pressed && styles.quickActionButtonPressed,
                      ]}
                      testID={`quick-action-${action.id}`}
                    >
                      <LinearGradient
                        colors={action.gradient}
                        style={styles.quickActionGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={styles.quickActionShine} />
                        <View style={styles.quickActionIconContainer}>
                          <View style={styles.quickActionIconRing}>
                            <Ionicons name={action.icon} size={28} color="#FFF" />
                          </View>
                        </View>
                        <Text style={styles.quickActionLabel}>{action.label}</Text>
                        <View style={styles.quickActionArrow}>
                          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
                        </View>
                      </LinearGradient>
                    </Pressable>
                  </Animated.View>
                ))}
              </ScrollView>
            </View>

            {ongoingEvents.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="play-circle" size={20} color="#10B981" />
                    <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0, paddingHorizontal: 0, marginLeft: spacing.xs }]}>
                      Eventi In Corso
                    </Text>
                  </View>
                </View>
                <View style={styles.eventsList}>
                  {ongoingEvents.map((event) => (
                    <Pressable
                      key={event.id}
                      onPress={() => {
                        triggerHaptic('light');
                        onNavigateEventHub?.(event.id) || onNavigateEvents();
                      }}
                      testID={`event-ongoing-${event.id}`}
                    >
                      <GlassCard style={{ ...styles.eventCard, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                        <View style={styles.eventContent}>
                          <View style={[styles.eventIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <Ionicons name="play" size={24} color="#10B981" />
                          </View>
                          <View style={styles.eventInfo}>
                            <Text style={[styles.eventName, { color: colors.foreground }]} numberOfLines={1}>
                              {event.name}
                            </Text>
                            <View style={styles.eventMeta}>
                              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                              <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                                {event.location}
                              </Text>
                            </View>
                          </View>
                          <Badge variant="success">In Corso</Badge>
                        </View>
                      </GlassCard>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0, paddingHorizontal: 0 }]}>
                  Prossimi Eventi
                </Text>
                <Pressable onPress={onNavigateEvents} testID="button-see-all-events">
                  <Text style={[styles.seeAllLink, { color: staticColors.primary }]}>Vedi tutti</Text>
                </Pressable>
              </View>

              {futureEvents.length > 0 ? (
                <View style={styles.eventsList}>
                  {futureEvents.map((event) => (
                    <Pressable
                      key={event.id}
                      onPress={() => {
                        triggerHaptic('light');
                        onNavigateEventHub?.(event.id) || onNavigateEvents();
                      }}
                      testID={`event-upcoming-${event.id}`}
                    >
                      <GlassCard style={styles.eventCard}>
                        <View style={styles.eventContent}>
                          <View style={styles.eventDateBox}>
                            <Text style={[styles.eventDay, { color: staticColors.primary }]}>
                              {new Date(event.date).getDate()}
                            </Text>
                            <Text style={[styles.eventMonth, { color: staticColors.primary }]}>
                              {new Date(event.date).toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.eventInfo}>
                            <Text style={[styles.eventName, { color: colors.foreground }]} numberOfLines={1}>
                              {event.name}
                            </Text>
                            <View style={styles.eventMeta}>
                              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                              <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                                {event.location}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.eventStats}>
                            <Badge variant="secondary">{event.guestsCount} ospiti</Badge>
                            <Badge variant="default">{event.ticketsSold} biglietti</Badge>
                          </View>
                        </View>
                      </GlassCard>
                    </Pressable>
                  ))}
                </View>
              ) : stats.upcomingEvents.length === 0 ? (
                <GlassCard style={styles.emptyCard}>
                  <View style={styles.emptyContent}>
                    <View style={styles.emptyIconContainer}>
                      <Ionicons name="calendar-outline" size={48} color={staticColors.primary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessun evento in programma</Text>
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                      Crea il tuo primo evento per iniziare
                    </Text>
                    <Pressable
                      onPress={() => {
                        triggerHaptic('medium');
                        onNavigateCreateEvent?.() || onNavigateEvents();
                      }}
                      testID="button-create-first-event"
                    >
                      <LinearGradient
                        colors={[staticColors.golden, '#F59E0B']}
                        style={styles.createEventButton}
                      >
                        <Ionicons name="add" size={20} color="#000" />
                        <Text style={styles.createEventText}>Crea Evento</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </GlassCard>
              ) : null}
            </View>

            <View style={styles.bottomPadding} />
          </>
        )}
      </ScrollView>

      <GestoreMenuDrawer
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        onNavigateDashboard={() => setShowMenu(false)}
        onNavigateEvents={onNavigateEvents}
        onNavigateInventory={onNavigateInventory}
        onNavigateStaff={onNavigateStaff}
        onNavigateScanner={onNavigateScanner}
        onNavigateMarketing={onNavigateMarketing}
        onNavigateAccounting={onNavigateAccounting}
        onNavigateProfile={onNavigateProfile}
        onNavigateSettings={onNavigateSettings}
        onNavigateProducts={onNavigateProducts}
        onNavigatePriceLists={onNavigatePriceLists}
        onNavigatePRManagement={onNavigatePRManagement}
        onNavigateCompanies={onNavigateCompanies}
        onNavigateStations={onNavigateStations}
        onNavigateWarehouse={onNavigateWarehouse}
        onNavigateSuppliers={onNavigateSuppliers}
        onNavigatePersonnel={onNavigatePersonnel}
        onNavigateReports={onNavigateReports}
        onNavigateCashier={onNavigateCashier}
        onNavigateUsers={onNavigateUsers}
        onNavigateSIAE={onNavigateSIAE}
        onNavigateLocations={onNavigateLocations}
        currentScreen="dashboard"
      />
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 48,
    height: 48,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: `${staticColors.primary}40`,
  },
  avatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: '#FFF',
  },
  greetingContainer: {
    marginLeft: spacing.xs,
  },
  greetingSmall: {
    fontSize: typography.fontSize.sm,
  },
  greetingName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14B8A6',
  },
  onlineText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: '#14B8A6',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  statCard: {
    padding: spacing.md,
    minHeight: 130,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  statIconGradient: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    marginTop: spacing.sm,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitleIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  seeAllLink: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  quickActionsScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  quickActionButton: {
    width: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  quickActionButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  quickActionGradient: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  quickActionShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    transform: [{ skewY: '-10deg' }],
  },
  quickActionIconContainer: {
    marginTop: spacing.sm,
  },
  quickActionIconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginTop: spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  quickActionArrow: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
  },
  eventsList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  eventCard: {
    padding: spacing.md,
  },
  eventContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventIconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  eventMonth: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    marginTop: -2,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  eventStats: {
    gap: spacing.xs,
    alignItems: 'flex-end',
  },
  emptyCard: {
    marginHorizontal: spacing.md,
    padding: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  createEventText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#000',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 300,
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

export default GestoreDashboard;
