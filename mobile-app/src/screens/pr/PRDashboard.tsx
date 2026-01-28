import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ActionCard } from '@/components/ActionCard';
import { CustomizeActionsModal } from '@/components/CustomizeActionsModal';
import { SkeletonDashboard } from '@/components/Loading';
import { Avatar } from '@/components/Avatar';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { PrProfile, PrWallet, PrEvent } from '@/lib/api';
import { PrQuickAction, getPrQuickActions } from '@/lib/storage';

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
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PrProfile | null>(null);
  const [wallet, setWallet] = useState<PrWallet | null>(null);
  const [events, setEvents] = useState<PrEvent[]>([]);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickActions, setQuickActions] = useState<PrQuickAction[]>(['events', 'lists', 'wallet', 'profile']);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  useEffect(() => {
    loadData();
    loadQuickActions();
  }, []);

  useEffect(() => {
    // Hide skeleton immediately if we have data (from cache)
    if (profile !== null || events.length > 0) {
      setShowSkeleton(false);
    }
  }, [profile, events]);

  const loadData = async () => {
    try {
      // Don't set loading=true initially - allows cache data to show immediately
      const [profileData, walletData, eventsData] = await Promise.all([
        api.getPrProfile().catch(() => null),
        api.getPrWallet().catch(() => null),
        api.getPrEvents().catch(() => []),
      ]);
      setProfile(profileData);
      setWallet(walletData);
      setEvents(eventsData.slice(0, 3));
      setShowSkeleton(false);
    } catch (error) {
      console.error('Error loading PR dashboard:', error);
      setShowSkeleton(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await loadQuickActions();
    setRefreshing(false);
  };

  const loadQuickActions = async () => {
    const actions = await getPrQuickActions();
    setQuickActions(actions);
  };

  const getActionConfig = (actionId: PrQuickAction) => {
    const configs: Record<PrQuickAction, { icon: keyof typeof Ionicons.glyphMap; label: string; gradient: 'golden' | 'teal' | 'purple' | 'blue' | 'pink'; onPress: () => void }> = {
      'events': { icon: 'calendar', label: 'Eventi', gradient: 'purple', onPress: onNavigateEvents },
      'lists': { icon: 'people', label: 'Liste', gradient: 'blue', onPress: onNavigateLists },
      'wallet': { icon: 'wallet', label: 'Wallet', gradient: 'golden', onPress: onNavigateWallet },
      'profile': { icon: 'person', label: 'Profilo', gradient: 'pink', onPress: onNavigateProfile },
      'client-switch': { icon: 'swap-horizontal', label: 'Cliente', gradient: 'teal', onPress: onSwitchToClient },
    };
    return configs[actionId];
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  const renderQuickActions = () => {
    const visibleActions = quickActions.slice(0, 5);

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionsScrollContent}
      >
        {visibleActions.map(actionId => {
          const config = getActionConfig(actionId);
          return (
            <View key={actionId} style={styles.actionCardWrapper}>
              <ActionCard
                icon={config.icon}
                label={config.label}
                gradient={config.gradient}
                onPress={config.onPress}
                testID={`action-${actionId}`}
              />
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const walletBalance = wallet?.balance || 0;
  const pendingBalance = wallet?.pendingBalance || 0;

  if (showSkeleton && !refreshing) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <SkeletonDashboard />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topHeader}>
        <View style={styles.headerLogoContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={[styles.headerLogo, { tintColor: '#FFFFFF' }]}
            resizeMode="contain"
          />
        </View>
        <View style={styles.headerRightActions}>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onNavigateWallet();
            }}
            style={styles.walletIconButton}
            testID="button-wallet-icon"
          >
            <LinearGradient
              colors={gradients.golden}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.walletIconGradient}
            >
              <Ionicons name="wallet" size={18} color={colors.primaryForeground} />
            </LinearGradient>
            <View style={styles.walletBadge}>
              <Text style={styles.walletBadgeText}>{walletBalance.toFixed(0)}</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onSwitchToClient();
            }}
            style={styles.switchButton}
            testID="button-switch-to-client"
          >
            <Ionicons name="swap-horizontal" size={22} color={staticColors.teal} />
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
        {profile && (
          <View style={styles.greetingContainer}>
            <View style={styles.greetingContent}>
              <Avatar
                name={`${profile.firstName || ''} ${profile.lastName || ''}`}
                size="lg"
                testID="avatar-pr"
              />
              <View style={styles.greetingText}>
                <Text style={styles.greeting}>
                  {getGreeting()}, <Text style={styles.greetingName}>{profile.firstName}</Text>
                </Text>
                <View style={styles.prBadgeRow}>
                  <Badge variant="golden" size="sm">
                    <Text style={styles.prBadgeText}>PR Dashboard</Text>
                  </Badge>
                  <Badge variant="outline" size="sm" style={styles.prCodeBadge}>
                    <Text style={styles.prCodeText}>{profile.prCode}</Text>
                  </Badge>
                </View>
              </View>
            </View>
          </View>
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
              <Ionicons name="wallet" size={24} color={staticColors.primaryForeground} />
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
              <Ionicons name="time" size={24} color={staticColors.successForeground} />
              <Text style={styles.statValueTeal}>€{pendingBalance.toFixed(2)}</Text>
              <Text style={styles.statLabelTeal}>In Attesa</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setShowCustomizeModal(true);
            }}
            style={styles.customizeButton}
            testID="button-customize-actions"
          >
            <Ionicons name="settings-outline" size={18} color={staticColors.primary} />
            <Text style={styles.customizeText}>Personalizza</Text>
          </Pressable>
        </View>
        <View style={styles.actionsGrid}>
          {renderQuickActions()}
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
              <Pressable
                key={event.id}
                onPress={() => {
                  triggerHaptic('light');
                  onNavigateEvents();
                }}
                testID={`event-card-${event.id}`}
              >
                <Card style={styles.eventCard}>
                  {event.eventImageUrl ? (
                    <Image
                      source={{ uri: event.eventImageUrl }}
                      style={styles.eventImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={gradients.purple}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.eventImagePlaceholder}
                    >
                      <Ionicons name="calendar" size={24} color={staticColors.primaryForeground} />
                    </LinearGradient>
                  )}
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventName} numberOfLines={1}>{event.eventName}</Text>
                      <Ionicons name="chevron-forward" size={18} color={staticColors.mutedForeground} />
                    </View>
                    <View style={styles.eventMeta}>
                      <View style={styles.eventMetaItem}>
                        <Ionicons name="calendar-outline" size={14} color={staticColors.primary} />
                        <Text style={styles.eventDate}>
                          {new Date(event.eventStart).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                      </View>
                      <View style={styles.eventMetaItem}>
                        <Ionicons name="time-outline" size={14} color={staticColors.primary} />
                        <Text style={styles.eventDate}>
                          {new Date(event.eventStart).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.eventMetaItem}>
                      <Ionicons name="location-outline" size={14} color={staticColors.mutedForeground} />
                      <Text style={styles.eventLocation} numberOfLines={1}>{event.locationName}</Text>
                    </View>
                    <View style={styles.eventStatsRow}>
                      <View style={styles.eventStatChip}>
                        <Ionicons name="people" size={12} color={staticColors.teal} />
                        <Text style={styles.eventStatChipText}>{event.guestCount || 0} ospiti</Text>
                      </View>
                      {(event.tableCount || 0) > 0 && (
                        <View style={styles.eventStatChip}>
                          <Ionicons name="grid" size={12} color={staticColors.golden} />
                          <Text style={styles.eventStatChipText}>{event.tableCount} tavoli</Text>
                        </View>
                      )}
                      {(event.earnings || 0) > 0 && (
                        <View style={styles.eventStatChip}>
                          <Ionicons name="cash" size={12} color={staticColors.success} />
                          <Text style={styles.eventStatChipText}>€{(event.earnings || 0).toFixed(0)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              </Pressable>
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
              <Ionicons name="swap-horizontal" size={24} color={staticColors.teal} />
              <View style={styles.switchCardText}>
                <Text style={styles.switchCardTitle}>Passa ad Account Cliente</Text>
                <Text style={styles.switchCardSubtitle}>Acquista biglietti e gestisci il tuo wallet</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={staticColors.mutedForeground} />
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
            <Ionicons name="log-out-outline" size={20} color={staticColors.destructive} />
            <Text style={styles.logoutText}>Esci</Text>
          </View>
        </Button>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <CustomizeActionsModal
        visible={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        mode="pr"
        onSave={loadQuickActions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  headerLogoContainer: {
    flex: 1,
  },
  headerLogo: {
    width: 120,
    height: 32,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  walletIconButton: {
    position: 'relative',
  },
  walletIconGradient: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: staticColors.destructive,
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  walletBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  greetingContainer: {
    marginBottom: spacing.lg,
  },
  greetingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  greetingText: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  greetingName: {
    color: staticColors.primary,
    fontWeight: '700',
  },
  prBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  prBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: staticColors.primaryForeground,
  },
  prCodeBadge: {
    borderColor: staticColors.primary,
  },
  switchButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 206, 209, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: staticColors.teal,
  },
  actionsScrollContent: {
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  actionCardWrapper: {
    marginRight: spacing.sm,
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
    backgroundColor: staticColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primaryForeground,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  prCodeText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.primary,
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
    color: staticColors.primaryForeground,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primaryForeground,
    opacity: 0.8,
  },
  statValueTeal: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.successForeground,
    marginTop: spacing.sm,
  },
  statLabelTeal: {
    fontSize: typography.fontSize.sm,
    color: staticColors.successForeground,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  customizeText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    fontWeight: '500',
  },
  seeAllText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    fontWeight: '500',
  },
  actionsGrid: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  eventCard: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    overflow: 'hidden',
    padding: 0,
  },
  eventImage: {
    width: 100,
    height: 100,
    borderTopLeftRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
  },
  eventImagePlaceholder: {
    width: 100,
    height: 100,
    borderTopLeftRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    flex: 1,
    marginRight: spacing.xs,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.primary,
  },
  eventLocation: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    flex: 1,
  },
  eventStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  eventStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: staticColors.glass,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  eventStatChipText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.foreground,
    fontWeight: '500',
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
    color: staticColors.foreground,
  },
  switchCardSubtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
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
    color: staticColors.destructive,
    fontWeight: '500',
  },
});
