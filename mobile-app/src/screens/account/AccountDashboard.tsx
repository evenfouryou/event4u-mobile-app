import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { GreetingHeader } from '@/components/Header';
import { ActionCard } from '@/components/ActionCard';
import { CustomizeActionsModal } from '@/components/CustomizeActionsModal';
import { SkeletonDashboard } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { Wallet, Ticket as ApiTicket, TicketsResponse } from '@/lib/api';
import { ClientQuickAction, getClientQuickActions } from '@/lib/storage';

interface AccountDashboardProps {
  onNavigateTickets: () => void;
  onNavigateWallet: () => void;
  onNavigateProfile: () => void;
  onNavigateEvents: () => void;
  onNavigateResales: () => void;
  onNavigateSettings: () => void;
  onNavigatePrDashboard?: () => void;
  onLogout: () => void;
  onGoBack: () => void;
}

export function AccountDashboard({
  onNavigateTickets,
  onNavigateWallet,
  onNavigateProfile,
  onNavigateEvents,
  onNavigateResales,
  onNavigateSettings,
  onNavigatePrDashboard,
  onLogout,
  onGoBack,
}: AccountDashboardProps) {
  const { user, logout } = useAuth();
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [upcomingTickets, setUpcomingTickets] = useState<ApiTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPrAccount, setHasPrAccount] = useState(false);
  const [quickActions, setQuickActions] = useState<ClientQuickAction[]>(['buy-tickets', 'my-qr', 'wallet', 'resell']);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  useEffect(() => {
    loadData();
    loadQuickActions();
  }, []);

  useEffect(() => {
    // Hide skeleton immediately if we have data (from cache)
    if (wallet !== null || upcomingTickets.length > 0) {
      setShowSkeleton(false);
    }
  }, [wallet, upcomingTickets]);

  const loadData = async () => {
    try {
      // Don't set loading=true initially - allows cache data to show immediately
      const [walletData, ticketsData, prProfile] = await Promise.all([
        api.getWallet().catch(() => null),
        api.getMyTickets().catch(() => ({ upcoming: [], past: [], total: 0 })),
        api.getPrProfile().catch(() => null),
      ]);
      setWallet(walletData);
      setUpcomingTickets(ticketsData.upcoming?.slice(0, 3) || []);
      setHasPrAccount(!!prProfile);
      setShowSkeleton(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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
    const actions = await getClientQuickActions();
    setQuickActions(actions);
  };

  const getActionConfig = (actionId: ClientQuickAction) => {
    const configs: Record<ClientQuickAction, { icon: keyof typeof Ionicons.glyphMap; label: string; gradient: 'golden' | 'teal' | 'purple' | 'blue' | 'pink'; onPress: () => void }> = {
      'buy-tickets': { icon: 'ticket-outline', label: 'Acquista Biglietti', gradient: 'golden', onPress: onNavigateEvents },
      'my-qr': { icon: 'qr-code-outline', label: 'I miei QR', gradient: 'teal', onPress: onNavigateTickets },
      'wallet': { icon: 'wallet-outline', label: 'Ricarica Wallet', gradient: 'purple', onPress: onNavigateWallet },
      'resell': { icon: 'swap-horizontal-outline', label: 'Rivendi Biglietti', gradient: 'blue', onPress: onNavigateResales },
      'pr-area': { icon: 'people-outline', label: 'Area PR', gradient: 'pink', onPress: onNavigatePrDashboard || (() => {}) },
      'events': { icon: 'calendar-outline', label: 'Esplora Eventi', gradient: 'golden', onPress: onNavigateEvents },
      'profile': { icon: 'person-outline', label: 'Profilo', gradient: 'blue', onPress: onNavigateProfile },
    };
    return configs[actionId];
  };

  const renderQuickActions = () => {
    const visibleActions = quickActions.filter(a => {
      if (a === 'pr-area' && (!hasPrAccount || !onNavigatePrDashboard)) return false;
      return true;
    });

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topHeader}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onGoBack();
          }}
          style={styles.backButton}
          testID="button-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Image
          source={require('../../../assets/logo.png')}
          style={[styles.headerLogo, { tintColor: '#FFFFFF' }]}
          resizeMode="contain"
        />
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
              onNavigateProfile();
            }}
            style={styles.avatarButton}
            testID="button-profile-avatar"
          >
            <Avatar
              name={`${user?.firstName || ''} ${user?.lastName || ''}`}
              size="sm"
              testID="avatar-header"
            />
          </Pressable>
          {onNavigatePrDashboard && (
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                onNavigatePrDashboard();
              }}
              style={styles.switchButton}
              testID="button-switch-to-pr"
            >
              <Ionicons name="swap-horizontal" size={20} color={staticColors.primary} />
            </Pressable>
          )}
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
        <GreetingHeader
          name={user?.firstName || 'Utente'}
          email={user?.email}
          avatarElement={
            <Avatar
              name={`${user?.firstName || ''} ${user?.lastName || ''}`}
              size="lg"
              testID="avatar-user"
            />
          }
        />

        {showSkeleton && !refreshing ? (
          <SkeletonDashboard />
        ) : (
        <View style={styles.content}>
          <View>
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
                <Ionicons name="settings-outline" size={18} color={colors.primary} />
                <Text style={styles.customizeText}>Personalizza</Text>
              </Pressable>
            </View>
            <View style={styles.actionsGrid}>
              {renderQuickActions()}
            </View>
          </View>



          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prossimi Eventi</Text>
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  onNavigateTickets();
                }}
              >
                <Text style={styles.seeAllLink}>Vedi tutti</Text>
              </Pressable>
            </View>

            {upcomingTickets.length > 0 ? (
              <View style={styles.ticketsList}>
                {upcomingTickets.map((ticket, index) => {
                  const eventDate = ticket.eventStart ? new Date(ticket.eventStart) : null;
                  return (
                  <Pressable
                    key={ticket.id}
                    onPress={() => {
                      triggerHaptic('light');
                      onNavigateTickets();
                    }}
                  >
                    <Card
                      style={styles.ticketCard}
                      testID={`ticket-card-${ticket.id}`}
                    >
                      <View style={styles.ticketContent}>
                        <View style={styles.ticketDateBox}>
                          <Text style={styles.ticketDay}>
                            {eventDate ? eventDate.getDate() : '-'}
                          </Text>
                          <Text style={styles.ticketMonth}>
                            {eventDate ? eventDate.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase() : '-'}
                          </Text>
                        </View>
                        <View style={styles.ticketInfo}>
                          <Text style={styles.ticketName} numberOfLines={1}>
                            {ticket.eventName || 'Evento'}
                          </Text>
                          <View style={styles.ticketMeta}>
                            <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                            <Text style={styles.ticketMetaText}>{ticket.locationName || '-'}</Text>
                            <Text style={styles.ticketMetaDot}>•</Text>
                            <Text style={styles.ticketMetaText}>{formatTime(ticket.eventStart)}</Text>
                          </View>
                        </View>
                        <Badge variant={ticket.ticketType === 'VIP' ? 'default' : 'secondary'}>
                          {ticket.ticketType || 'Standard'}
                        </Badge>
                      </View>
                    </Card>
                  </Pressable>
                  );
                })}
              </View>
            ) : (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
                  <Text style={styles.emptyTitle}>Nessun evento in programma</Text>
                  <Text style={styles.emptyText}>
                    Esplora gli eventi disponibili e acquista i tuoi biglietti
                  </Text>
                  <Button
                    variant="golden"
                    onPress={onNavigateEvents}
                    style={styles.emptyButton}
                    testID="button-explore-events"
                  >
                    Esplora Eventi
                  </Button>
                </View>
              </Card>
            )}
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
        </View>
        )}
      </ScrollView>

      <CustomizeActionsModal
        visible={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        mode="client"
        hasPrAccount={hasPrAccount && !!onNavigatePrDashboard}
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    height: 28,
    width: 100,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  content: {
    paddingHorizontal: spacing.lg,
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  walletIconButton: {
    position: 'relative',
  },
  walletIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: staticColors.primary,
  },
  walletBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: staticColors.card,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: staticColors.golden,
    minWidth: 20,
    alignItems: 'center',
  },
  walletBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: staticColors.golden,
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
    marginTop: spacing.lg,
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
  seeAllLink: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    fontWeight: '500',
  },
  actionsGrid: {
    marginBottom: spacing.lg,
    marginHorizontal: -spacing.lg,
  },
  actionsScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  actionCardWrapper: {
    width: 140,
  },
  walletCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${staticColors.primary}30`,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${staticColors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabel: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    fontWeight: '500',
  },
  walletBalance: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  walletSubtext: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  walletAction: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  ticketsList: {
    gap: spacing.md,
  },
  ticketCard: {
    padding: spacing.md,
  },
  ticketContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ticketDateBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketDay: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  ticketMonth: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.primary,
    marginTop: -2,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  ticketMetaDot: {
    color: staticColors.mutedForeground,
  },
  emptyCard: {
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
  logoutSection: {
    marginTop: spacing.xl,
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

export default AccountDashboard;
