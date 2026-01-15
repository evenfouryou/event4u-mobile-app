import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  useWindowDimensions,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { api } from '../../lib/api';

interface Event {
  id: number;
  name: string;
  startDatetime: string;
  endDatetime?: string;
  location?: string;
}

interface DashboardStats {
  activeEvents: number;
  ticketsSold: number;
  todayRevenue: number;
  nextEventName?: string;
  nextEventDate?: string;
}

interface UserData {
  firstName?: string;
  lastName?: string;
  role?: string;
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    activeEvents: 0,
    ticketsSold: 0,
    todayRevenue: 0,
  });
  const [hasBeverageAccess, setHasBeverageAccess] = useState(false);
  const [hasScannerAccess, setHasScannerAccess] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [eventsData, userData, userFeatures] = await Promise.all([
        api.get<Event[]>('/api/events').catch(() => []),
        api.get<UserData>('/api/auth/user').catch(() => null),
        api.get<any>('/api/user-features/current/my').catch(() => null),
      ]);
      
      // Set feature access based on user features
      if (userFeatures) {
        setHasBeverageAccess(userFeatures.beverageEnabled !== false);
        setHasScannerAccess(userFeatures.scannerEnabled !== false);
      } else {
        // Default to true if gestore role
        const isGestore = userData?.role === 'gestore';
        setHasBeverageAccess(isGestore);
        setHasScannerAccess(isGestore);
      }
      
      setEvents(eventsData || []);
      setUser(userData);
      
      const now = new Date();
      const activeEvents = eventsData?.filter((e: Event) => {
        const startDate = new Date(e.startDatetime);
        const endDate = e.endDatetime ? new Date(e.endDatetime) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        return startDate <= now && endDate >= now;
      }) || [];
      
      const futureEvents = eventsData?.filter((e: Event) => new Date(e.startDatetime) > now)
        .sort((a: Event, b: Event) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()) || [];
      
      const nextEvent = futureEvents[0];
      
      // Calculate real stats from events data
      const totalTicketsSold = eventsData?.reduce((sum: number, e: any) => 
        sum + (e.ticketsSold || 0), 0) || 0;
      const totalRevenue = eventsData?.reduce((sum: number, e: any) => 
        sum + parseFloat(e.actualRevenue || e.revenue || '0'), 0) || 0;
      
      setStats({
        activeEvents: activeEvents.length,
        ticketsSold: totalTicketsSold,
        todayRevenue: totalRevenue,
        nextEventName: nextEvent?.name,
        nextEventDate: nextEvent?.startDatetime,
      });
    } catch (err) {
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  const getInitials = (firstName?: string, lastName?: string): string => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleEventPress = (eventId: number) => {
    navigation.navigate('EventDetail', { eventId });
  };

  const handleSeeAllEvents = () => {
    navigation.navigate('Events');
  };

  const handleNewEvent = () => {
    navigation.navigate('CreateEvent');
  };

  const handleScanner = () => {
    navigation.navigate('Scanner');
  };

  const handleBeverage = () => {
    navigation.navigate('Beverage');
  };

  const recentEvents = events.slice(0, isLandscape ? 4 : 3);

  const statsGridColumns = isLandscape ? 4 : 2;

  if (loading) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 }]}
      >
        <View style={styles.headerSkeleton}>
          <View style={styles.avatarSkeleton} />
          <View style={styles.headerTextSkeleton}>
            <View style={styles.greetingSkeleton} />
            <View style={styles.nameSkeleton} />
          </View>
        </View>
        <View style={[styles.statsGrid, { flexDirection: 'row', flexWrap: 'wrap' }]}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.statCardSkeleton, { width: `${100 / statsGridColumns - 2}%` }]} />
          ))}
        </View>
        <View style={styles.sectionSkeleton} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.eventCardSkeleton} />
        ))}
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={fetchData}
          data-testid="button-retry"
        >
          <Text style={styles.retryButtonText}>Riprova</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {getInitials(user?.firstName, user?.lastName)}
            </Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.firstName || 'Gestore'}</Text>
          </View>
        </View>
        <View style={styles.onlineStatus}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      </View>

      <View style={[
        styles.statsGrid, 
        isLandscape && styles.statsGridLandscape
      ]}>
        <View style={[styles.statCard, isLandscape && styles.statCardLandscape]}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
            <View style={styles.statIconGradient1}>
              <Ionicons name="calendar-outline" size={28} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.statValue}>{stats.activeEvents}</Text>
          <Text style={styles.statLabel}>Eventi Attivi</Text>
        </View>

        <View style={[styles.statCard, isLandscape && styles.statCardLandscape]}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
            <View style={styles.statIconGradient2}>
              <Ionicons name="ticket-outline" size={28} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.statValue}>{stats.ticketsSold}</Text>
          <Text style={styles.statLabel}>Biglietti Venduti</Text>
        </View>

        <View style={[styles.statCard, isLandscape && styles.statCardLandscape]}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(20, 184, 166, 0.2)' }]}>
            <View style={styles.statIconGradient3}>
              <Ionicons name="wallet-outline" size={28} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.statValue}>{formatCurrency(stats.todayRevenue)}</Text>
          <Text style={styles.statLabel}>Incasso Oggi</Text>
        </View>

        <View style={[styles.statCard, isLandscape && styles.statCardLandscape]}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(244, 63, 94, 0.2)' }]}>
            <View style={styles.statIconGradient4}>
              <Ionicons name="time-outline" size={28} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.statValue} numberOfLines={1}>
            {stats.nextEventName ? formatDate(stats.nextEventDate!) : '--'}
          </Text>
          <Text style={styles.statLabel}>Prossimo Evento</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Azioni Rapide</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsContainer}
        >
          <TouchableOpacity 
            style={[styles.quickActionButton, styles.quickActionGradient1]}
            onPress={handleNewEvent}
            activeOpacity={0.8}
            data-testid="button-new-event"
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="add-outline" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionLabel}>Nuovo Evento</Text>
          </TouchableOpacity>

          {hasScannerAccess && (
            <TouchableOpacity 
              style={[styles.quickActionButton, styles.quickActionGradient2]}
              onPress={handleScanner}
              activeOpacity={0.8}
              data-testid="button-scanner"
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="qr-code-outline" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>Scanner</Text>
            </TouchableOpacity>
          )}

          {hasBeverageAccess && (
            <TouchableOpacity 
              style={[styles.quickActionButton, styles.quickActionGradient3]}
              onPress={handleBeverage}
              activeOpacity={0.8}
              data-testid="button-beverage"
            >
              <View style={styles.quickActionIconContainer}>
                <Ionicons name="wine-outline" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>Beverage</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Eventi Recenti</Text>
          <TouchableOpacity onPress={handleSeeAllEvents} data-testid="button-see-all-events">
            <Text style={styles.seeAllText}>Vedi tutti</Text>
          </TouchableOpacity>
        </View>

        {recentEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyStateText}>Nessun evento disponibile</Text>
          </View>
        ) : (
          <View style={[
            styles.eventsContainer,
            isLandscape && styles.eventsContainerLandscape
          ]}>
            {recentEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventCard,
                  isLandscape && styles.eventCardLandscape
                ]}
                onPress={() => handleEventPress(event.id)}
                activeOpacity={0.8}
                data-testid={`event-card-${event.id}`}
              >
                <View style={styles.eventIconContainer}>
                  <Ionicons name="calendar" size={24} color={colors.primary} />
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
                  <Text style={styles.eventDate}>{formatDate(event.startDatetime)}</Text>
                </View>
                <View style={styles.eventChevron}>
                  <Ionicons name="chevron-forward" size={24} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    color: colors.primaryForeground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  headerTextContainer: {
    gap: spacing.xs,
  },
  greeting: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  userName: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  onlineText: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statsGridLandscape: {
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardLandscape: {
    width: '23%',
    padding: spacing.md,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconGradient1: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  statIconGradient2: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  statIconGradient3: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: '#14B8A6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  statIconGradient4: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: '#F43F5E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  seeAllText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  quickActionsContainer: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  quickActionButton: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  quickActionGradient1: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
  },
  quickActionGradient2: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
  },
  quickActionGradient3: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  eventsContainer: {
    gap: spacing.md,
  },
  eventsContainerLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  eventCardLandscape: {
    width: '48%',
  },
  eventIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    flex: 1,
    gap: spacing.xs,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  eventDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  eventChevron: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  headerSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatarSkeleton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.muted,
  },
  headerTextSkeleton: {
    gap: spacing.sm,
  },
  greetingSkeleton: {
    width: 80,
    height: 16,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.muted,
  },
  nameSkeleton: {
    width: 120,
    height: 24,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.muted,
  },
  statCardSkeleton: {
    height: 140,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  sectionSkeleton: {
    height: 24,
    width: 150,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  eventCardSkeleton: {
    height: 80,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
});
