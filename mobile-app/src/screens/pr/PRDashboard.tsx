import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows, gradients } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ActionCard } from '@/components/ActionCard';
import { triggerHaptic } from '@/lib/haptics';
import api, { PrProfile, PrWallet, PrEvent } from '@/lib/api';

interface PRDashboardProps {
  onNavigateEvents: () => void;
  onNavigateWallet: () => void;
  onNavigateProfile: () => void;
  onNavigateLists: () => void;
  onSwitchToClient: () => void;
  onLogout: () => void;
}

export function PRDashboard({
  onNavigateEvents,
  onNavigateWallet,
  onNavigateProfile,
  onNavigateLists,
  onSwitchToClient,
  onLogout,
}: PRDashboardProps) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PrProfile | null>(null);
  const [wallet, setWallet] = useState<PrWallet | null>(null);
  const [events, setEvents] = useState<PrEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileData, walletData, eventsData] = await Promise.all([
        api.getPrProfile().catch(() => null),
        api.getPrWallet().catch(() => null),
        api.getPrEvents().catch(() => []),
      ]);
      setProfile(profileData);
      setWallet(walletData);
      setEvents(eventsData.slice(0, 3));
    } catch (error) {
      console.error('Error loading PR dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const walletBalance = wallet?.balance || 0;
  const pendingBalance = wallet?.pendingBalance || 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Badge variant="golden" style={styles.prBadge}>
            <Text style={styles.prBadgeText}>PR</Text>
          </Badge>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onSwitchToClient();
          }}
          style={styles.switchButton}
        >
          <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
        </Pressable>
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
        {profile && (
          <GlassCard style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {profile.firstName?.[0] || ''}{profile.lastName?.[0] || ''}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {profile.displayName || `${profile.firstName} ${profile.lastName}`}
                </Text>
                <Badge variant="outline" size="sm">
                  <Text style={styles.prCodeText}>Codice: {profile.prCode}</Text>
                </Badge>
              </View>
            </View>
          </GlassCard>
        )}

        <View style={styles.statsRow}>
          <Pressable
            style={styles.statCard}
            onPress={() => {
              triggerHaptic('light');
              onNavigateWallet();
            }}
          >
            <LinearGradient
              colors={gradients.golden}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <Ionicons name="wallet" size={24} color={colors.primaryForeground} />
              <Text style={styles.statValue}>€{walletBalance.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Saldo</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.statCard}
            onPress={() => {
              triggerHaptic('light');
              onNavigateWallet();
            }}
          >
            <LinearGradient
              colors={gradients.teal}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <Ionicons name="time" size={24} color={colors.successForeground} />
              <Text style={styles.statValueTeal}>€{pendingBalance.toFixed(2)}</Text>
              <Text style={styles.statLabelTeal}>In Attesa</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Azioni Rapide</Text>
        <View style={styles.actionsGrid}>
          <ActionCard
            icon="calendar"
            label="Eventi"
            onPress={onNavigateEvents}
            gradient="purple"
          />
          <ActionCard
            icon="people"
            label="Liste Ospiti"
            onPress={onNavigateLists}
            gradient="blue"
          />
          <ActionCard
            icon="wallet"
            label="Wallet"
            onPress={onNavigateWallet}
            gradient="golden"
          />
          <ActionCard
            icon="person"
            label="Profilo"
            onPress={onNavigateProfile}
            gradient="pink"
          />
        </View>

        {events.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Eventi Attivi</Text>
              <Pressable onPress={onNavigateEvents}>
                <Text style={styles.seeAllText}>Vedi tutti</Text>
              </Pressable>
            </View>
            {events.map((event) => (
              <Card key={event.id} style={styles.eventCard}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{event.eventName}</Text>
                  <Text style={styles.eventDate}>
                    {new Date(event.eventStart).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.eventLocation}>{event.locationName}</Text>
                </View>
                <View style={styles.eventStats}>
                  <View style={styles.eventStat}>
                    <Text style={styles.eventStatValue}>{event.guestCount || 0}</Text>
                    <Text style={styles.eventStatLabel}>Ospiti</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        <Card style={styles.switchCard}>
          <Pressable
            style={styles.switchCardContent}
            onPress={() => {
              triggerHaptic('medium');
              onSwitchToClient();
            }}
          >
            <View style={styles.switchCardLeft}>
              <Ionicons name="swap-horizontal" size={24} color={colors.teal} />
              <View style={styles.switchCardText}>
                <Text style={styles.switchCardTitle}>Passa ad Account Cliente</Text>
                <Text style={styles.switchCardSubtitle}>Acquista biglietti e gestisci il tuo wallet</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </Pressable>
        </Card>

        <Button
          variant="ghost"
          onPress={() => {
            triggerHaptic('medium');
            onLogout();
          }}
          style={styles.logoutButton}
        >
          <View style={styles.logoutContent}>
            <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
            <Text style={styles.logoutText}>Esci</Text>
          </View>
        </Button>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
  },
  prBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  prBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  switchButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  profileCard: {
    marginBottom: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  prCodeText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  statGradient: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.primaryForeground,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.primaryForeground,
    opacity: 0.8,
  },
  statValueTeal: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.successForeground,
    marginTop: spacing.sm,
  },
  statLabelTeal: {
    fontSize: typography.fontSize.sm,
    color: colors.successForeground,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  eventCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  eventDate: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  eventLocation: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  eventStats: {
    alignItems: 'center',
  },
  eventStat: {
    alignItems: 'center',
  },
  eventStatValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.teal,
  },
  eventStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  switchCard: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  switchCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  switchCardText: {
    flex: 1,
  },
  switchCardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  switchCardSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  logoutButton: {
    marginTop: spacing.md,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    color: colors.destructive,
    fontWeight: '500',
  },
});
