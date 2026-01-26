import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows, gradients } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { triggerHaptic } from '@/lib/haptics';

interface PrProfile {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  prCode: string;
  email?: string;
  phone?: string;
  status: string;
}

interface PrStats {
  totalGuests: number;
  totalTables: number;
  ticketsSold: number;
  totalRevenue: number;
  commissionEarned: number;
  activeEvents: number;
}

interface FeaturedEvent {
  id: string;
  eventId: string;
  eventName: string;
  eventImageUrl: string | null;
  eventStart: string;
  locationName: string;
}

interface WalletInfo {
  balance: string;
  pendingPayout: string;
}

interface PrDashboardScreenProps {
  onNavigateEvents: () => void;
  onNavigateWallet: () => void;
  onNavigateProfile: () => void;
  onNavigateEventDetail: (eventId: string) => void;
  onGoBack: () => void;
}

export function PrDashboardScreen({
  onNavigateEvents,
  onNavigateWallet,
  onNavigateProfile,
  onNavigateEventDetail,
  onGoBack,
}: PrDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<PrProfile | null>(null);
  const [stats, setStats] = useState<PrStats | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [featuredEvent, setFeaturedEvent] = useState<FeaturedEvent | null>(null);

  const animatedValues = useRef({
    guests: new Animated.Value(0),
    tables: new Animated.Value(0),
    tickets: new Animated.Value(0),
    commission: new Animated.Value(0),
  }).current;

  const [displayStats, setDisplayStats] = useState({
    guests: 0,
    tables: 0,
    tickets: 0,
    commission: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (stats) {
      animateStats();
    }
  }, [stats]);

  const animateStats = () => {
    if (!stats) return;

    const targets = {
      guests: stats.totalGuests,
      tables: stats.totalTables,
      tickets: stats.ticketsSold,
      commission: stats.commissionEarned,
    };

    Object.keys(targets).forEach((key) => {
      const targetValue = targets[key as keyof typeof targets];
      animatedValues[key as keyof typeof animatedValues].setValue(0);
      
      Animated.timing(animatedValues[key as keyof typeof animatedValues], {
        toValue: targetValue,
        duration: 1500,
        useNativeDriver: false,
      }).start();

      animatedValues[key as keyof typeof animatedValues].addListener(({ value }) => {
        setDisplayStats(prev => ({
          ...prev,
          [key]: Math.round(value),
        }));
      });
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API calls
      setProfile({
        id: '1',
        firstName: 'Mario',
        lastName: 'Rossi',
        prCode: 'PR2024001',
        status: 'active',
      });
      setStats({
        totalGuests: 127,
        totalTables: 8,
        ticketsSold: 45,
        totalRevenue: 2250,
        commissionEarned: 338,
        activeEvents: 3,
      });
      setWallet({
        balance: '338.00',
        pendingPayout: '125.00',
      });
      setFeaturedEvent({
        id: '1',
        eventId: 'evt-1',
        eventName: 'Saturday Night Fever',
        eventImageUrl: null,
        eventStart: new Date().toISOString(),
        locationName: 'Club Paradise',
      });
    } catch (error) {
      console.error('Error loading PR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isToday = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>
              {profile?.displayName || `${profile?.firstName} ${profile?.lastName}`}
            </Text>
            <Badge variant="golden" style={styles.prBadge} testID="badge-pr-code">
              {profile?.prCode}
            </Badge>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                onNavigateWallet();
              }}
              style={styles.walletButton}
              testID="button-wallet"
            >
              <LinearGradient
                colors={gradients.creditCard}
                style={styles.walletPreview}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.walletLabel}>Saldo</Text>
                <Text style={styles.walletBalance}>€{wallet?.balance || '0.00'}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                onNavigateProfile();
              }}
              style={styles.profileButton}
              testID="button-profile"
            >
              <Ionicons name="person-circle-outline" size={32} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']}
            style={styles.statCard}
          >
            <Ionicons name="people" size={24} color="#8B5CF6" />
            <Text style={styles.statValue}>{displayStats.guests}</Text>
            <Text style={styles.statLabel}>Ospiti</Text>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)']}
            style={styles.statCard}
          >
            <Ionicons name="grid" size={24} color="#3B82F6" />
            <Text style={styles.statValue}>{displayStats.tables}</Text>
            <Text style={styles.statLabel}>Tavoli</Text>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
            style={styles.statCard}
          >
            <Ionicons name="ticket" size={24} color="#10B981" />
            <Text style={styles.statValue}>{displayStats.tickets}</Text>
            <Text style={styles.statLabel}>Biglietti</Text>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
            style={styles.statCard}
          >
            <Ionicons name="trending-up" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>€{displayStats.commission}</Text>
            <Text style={styles.statLabel}>Guadagno</Text>
          </LinearGradient>
        </View>

        {/* Featured Event */}
        {featuredEvent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isToday(featuredEvent.eventStart) ? 'Evento di Oggi' : 'Prossimo Evento'}
            </Text>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                onNavigateEventDetail(featuredEvent.id);
              }}
              testID="card-featured-event"
            >
              <LinearGradient
                colors={gradients.cardPurple}
                style={styles.featuredEventCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isToday(featuredEvent.eventStart) && (
                  <Badge variant="golden" style={styles.todayBadge}>
                    OGGI
                  </Badge>
                )}
                <Text style={styles.featuredEventName}>{featuredEvent.eventName}</Text>
                <View style={styles.featuredEventDetails}>
                  <View style={styles.eventDetail}>
                    <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.eventDetailText}>{formatDate(featuredEvent.eventStart)}</Text>
                  </View>
                  <View style={styles.eventDetail}>
                    <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.eventDetailText}>{formatTime(featuredEvent.eventStart)}</Text>
                  </View>
                  <View style={styles.eventDetail}>
                    <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.eventDetailText}>{featuredEvent.locationName}</Text>
                  </View>
                </View>
                <View style={styles.featuredEventArrow}>
                  <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          <View style={styles.actionsGrid}>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                onNavigateEvents();
              }}
              style={styles.actionCard}
              testID="action-my-events"
            >
              <LinearGradient
                colors={gradients.purpleLight}
                style={styles.actionGradient}
              >
                <Ionicons name="calendar" size={28} color="#8B5CF6" />
                <Text style={styles.actionLabel}>I Miei Eventi</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                onNavigateWallet();
              }}
              style={styles.actionCard}
              testID="action-wallet"
            >
              <LinearGradient
                colors={gradients.goldenLight}
                style={styles.actionGradient}
              >
                <Ionicons name="wallet" size={28} color={colors.golden} />
                <Text style={styles.actionLabel}>Wallet</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                // Navigate to share links
              }}
              style={styles.actionCard}
              testID="action-share-link"
            >
              <LinearGradient
                colors={gradients.tealLight}
                style={styles.actionGradient}
              >
                <Ionicons name="share-social" size={28} color={colors.teal} />
                <Text style={styles.actionLabel}>Condividi Link</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                onNavigateProfile();
              }}
              style={styles.actionCard}
              testID="action-profile"
            >
              <LinearGradient
                colors={['rgba(236, 72, 153, 0.15)', 'rgba(236, 72, 153, 0.05)']}
                style={styles.actionGradient}
              >
                <Ionicons name="person" size={28} color="#EC4899" />
                <Text style={styles.actionLabel}>Profilo</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greeting: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  prBadge: {
    alignSelf: 'flex-start',
  },
  walletButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  walletPreview: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 100,
  },
  walletLabel: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  walletBalance: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileButton: {
    padding: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  featuredEventCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  todayBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  featuredEventName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: spacing.md,
    maxWidth: '80%',
  },
  featuredEventDetails: {
    gap: spacing.sm,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventDetailText: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  featuredEventArrow: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCard: {
    width: '48%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.lg,
  },
  actionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.foreground,
    textAlign: 'center',
  },
});
