import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';

interface MarketingStats {
  totalCampaigns: number;
  activeCampaigns: number;
  emailsSent: number;
  openRate: number;
  clickRate: number;
  totalRevenue: number;
  newSubscribers: number;
  unsubscribes: number;
}

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
  sentCount: number;
  openRate: number;
  clickRate: number;
  startDate: string;
}

interface RecentActivity {
  id: string;
  type: 'email_sent' | 'subscriber' | 'referral' | 'loyalty_reward';
  title: string;
  description: string;
  timestamp: string;
}

export default function MarketingDashboardScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const [refreshing, setRefreshing] = useState(false);

  const numColumns = isTablet || isLandscape ? 4 : 2;
  const cardWidth = (width - spacing.lg * 2 - spacing.md * (numColumns - 1)) / numColumns;

  const { data: stats, refetch: refetchStats } = useQuery<MarketingStats>({
    queryKey: ['/api/marketing/stats'],
  });

  const { data: campaigns, refetch: refetchCampaigns } = useQuery<Campaign[]>({
    queryKey: ['/api/marketing/campaigns/recent'],
  });

  const { data: activities, refetch: refetchActivities } = useQuery<RecentActivity[]>({
    queryKey: ['/api/marketing/activities'],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchCampaigns(), refetchActivities()]);
    setRefreshing(false);
  }, [refetchStats, refetchCampaigns, refetchActivities]);

  const mockStats: MarketingStats = stats || {
    totalCampaigns: 24,
    activeCampaigns: 3,
    emailsSent: 45600,
    openRate: 28.5,
    clickRate: 4.2,
    totalRevenue: 12500,
    newSubscribers: 320,
    unsubscribes: 15,
  };

  const mockCampaigns: Campaign[] = campaigns || [
    { id: '1', name: 'Weekend Party Promo', type: 'email', status: 'active', sentCount: 2500, openRate: 32, clickRate: 5.1, startDate: '2026-01-17' },
    { id: '2', name: 'VIP Members Only', type: 'email', status: 'completed', sentCount: 800, openRate: 45, clickRate: 8.2, startDate: '2026-01-15' },
    { id: '3', name: 'Early Bird Alert', type: 'push', status: 'scheduled', sentCount: 0, openRate: 0, clickRate: 0, startDate: '2026-01-20' },
  ];

  const mockActivities: RecentActivity[] = activities || [
    { id: '1', type: 'email_sent', title: 'Campagna Inviata', description: 'Weekend Party Promo a 2,500 contatti', timestamp: '5 min fa' },
    { id: '2', type: 'subscriber', title: 'Nuovo Iscritto', description: 'marco.rossi@email.com si è iscritto', timestamp: '15 min fa' },
    { id: '3', type: 'referral', title: 'Referral Completato', description: 'Anna ha invitato 3 amici', timestamp: '1 ora fa' },
    { id: '4', type: 'loyalty_reward', title: 'Premio Riscattato', description: 'Paolo ha riscattato 500 punti', timestamp: '2 ore fa' },
  ];

  const getStatusConfig = (status: Campaign['status']) => {
    switch (status) {
      case 'draft': return { label: 'Bozza', color: colors.mutedForeground };
      case 'scheduled': return { label: 'Programmata', color: colors.warning };
      case 'active': return { label: 'Attiva', color: colors.teal };
      case 'completed': return { label: 'Completata', color: colors.primary };
      case 'paused': return { label: 'In Pausa', color: colors.mutedForeground };
    }
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'email_sent': return { icon: 'mail', color: colors.primary };
      case 'subscriber': return { icon: 'person-add', color: colors.teal };
      case 'referral': return { icon: 'people', color: colors.warning };
      case 'loyalty_reward': return { icon: 'gift', color: '#8B5CF6' };
    }
  };

  const renderQuickAction = (
    icon: string,
    label: string,
    route: string,
    color: string
  ) => (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={() => navigation.navigate(route)}
      activeOpacity={0.8}
      testID={`button-${route.toLowerCase()}`}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Marketing"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('MarketingSettings')}
            testID="button-settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        testID="scroll-view"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle} testID="text-overview-title">Panoramica</Text>
          <View style={styles.statsGrid}>
            <Card variant="glass" style={[styles.statCard, { width: cardWidth }]} testID="stat-emails">
              <View style={[styles.statIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="mail" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{mockStats.emailsSent.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Email Inviate</Text>
            </Card>
            <Card variant="glass" style={[styles.statCard, { width: cardWidth }]} testID="stat-open-rate">
              <View style={[styles.statIcon, { backgroundColor: `${colors.teal}20` }]}>
                <Ionicons name="eye" size={20} color={colors.teal} />
              </View>
              <Text style={styles.statValue}>{mockStats.openRate}%</Text>
              <Text style={styles.statLabel}>Tasso Apertura</Text>
            </Card>
            <Card variant="glass" style={[styles.statCard, { width: cardWidth }]} testID="stat-click-rate">
              <View style={[styles.statIcon, { backgroundColor: `${colors.warning}20` }]}>
                <Ionicons name="hand-left" size={20} color={colors.warning} />
              </View>
              <Text style={styles.statValue}>{mockStats.clickRate}%</Text>
              <Text style={styles.statLabel}>Tasso Click</Text>
            </Card>
            <Card variant="glass" style={[styles.statCard, { width: cardWidth }]} testID="stat-revenue">
              <View style={[styles.statIcon, { backgroundColor: `${colors.success}20` }]}>
                <Ionicons name="cash" size={20} color={colors.success} />
              </View>
              <Text style={styles.statValue}>€{mockStats.totalRevenue.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </Card>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} testID="text-actions-title">Azioni Rapide</Text>
          <Card variant="glass" style={styles.quickActionsCard} testID="card-quick-actions">
            <View style={[styles.quickActionsGrid, isLandscape && styles.quickActionsGridLandscape]}>
              {renderQuickAction('mail-outline', 'Email', 'MarketingEmail', colors.primary)}
              {renderQuickAction('ribbon-outline', 'Fedeltà', 'LoyaltyAdmin', colors.warning)}
              {renderQuickAction('people-outline', 'Referral', 'ReferralAdmin', colors.teal)}
              {renderQuickAction('pricetags-outline', 'Bundle', 'BundlesAdmin', '#8B5CF6')}
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} testID="text-campaigns-title">Campagne Recenti</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('CampaignsList')}
              testID="button-view-all-campaigns"
            >
              <Text style={styles.viewAllText}>Vedi tutte</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.campaignsContainer, isTablet && styles.campaignsContainerTablet]}>
            {mockCampaigns.map((campaign) => {
              const statusConfig = getStatusConfig(campaign.status);
              return (
                <TouchableOpacity
                  key={campaign.id}
                  onPress={() => navigation.navigate('CampaignDetail', { campaignId: campaign.id })}
                  activeOpacity={0.8}
                  testID={`card-campaign-${campaign.id}`}
                  style={isTablet ? styles.campaignCardTablet : undefined}
                >
                  <Card variant="glass" style={styles.campaignCard}>
                    <View style={styles.campaignHeader}>
                      <View style={styles.campaignInfo}>
                        <Text style={styles.campaignName} testID={`text-campaign-name-${campaign.id}`}>{campaign.name}</Text>
                        <View style={styles.campaignMeta}>
                          <Ionicons
                            name={campaign.type === 'email' ? 'mail-outline' : 'notifications-outline'}
                            size={14}
                            color={colors.mutedForeground}
                          />
                          <Text style={styles.campaignDate}>{campaign.startDate}</Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]} testID={`badge-status-${campaign.id}`}>
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                          {statusConfig.label}
                        </Text>
                      </View>
                    </View>
                    {campaign.status === 'completed' && (
                      <View style={styles.campaignStats}>
                        <View style={styles.campaignStatItem}>
                          <Text style={styles.campaignStatValue}>{campaign.sentCount.toLocaleString()}</Text>
                          <Text style={styles.campaignStatLabel}>Inviate</Text>
                        </View>
                        <View style={styles.campaignStatItem}>
                          <Text style={styles.campaignStatValue}>{campaign.openRate}%</Text>
                          <Text style={styles.campaignStatLabel}>Aperture</Text>
                        </View>
                        <View style={styles.campaignStatItem}>
                          <Text style={styles.campaignStatValue}>{campaign.clickRate}%</Text>
                          <Text style={styles.campaignStatLabel}>Click</Text>
                        </View>
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} testID="text-activities-title">Attività Recenti</Text>
          </View>

          <Card variant="glass" style={styles.activitiesCard} testID="card-activities">
            {mockActivities.map((activity, index) => {
              const iconConfig = getActivityIcon(activity.type);
              return (
                <View
                  key={activity.id}
                  style={[
                    styles.activityItem,
                    index !== mockActivities.length - 1 && styles.activityItemBorder,
                  ]}
                  testID={`activity-${activity.id}`}
                >
                  <View style={[styles.activityIcon, { backgroundColor: `${iconConfig.color}20` }]}>
                    <Ionicons name={iconConfig.icon as any} size={18} color={iconConfig.color} />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                  </View>
                  <Text style={styles.activityTime}>{activity.timestamp}</Text>
                </View>
              );
            })}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} testID="text-subscribers-title">Abbonati</Text>
          <View style={styles.subscriberCards}>
            <Card variant="glass" style={styles.subscriberCard} testID="card-new-subscribers">
              <View style={styles.subscriberCardContent}>
                <View style={[styles.subscriberIcon, { backgroundColor: `${colors.teal}20` }]}>
                  <Ionicons name="trending-up" size={20} color={colors.teal} />
                </View>
                <View>
                  <Text style={styles.subscriberValue}>+{mockStats.newSubscribers}</Text>
                  <Text style={styles.subscriberLabel}>Nuovi questo mese</Text>
                </View>
              </View>
            </Card>
            <Card variant="glass" style={styles.subscriberCard} testID="card-unsubscribers">
              <View style={styles.subscriberCardContent}>
                <View style={[styles.subscriberIcon, { backgroundColor: `${colors.destructive}20` }]}>
                  <Ionicons name="trending-down" size={20} color={colors.destructive} />
                </View>
                <View>
                  <Text style={styles.subscriberValue}>-{mockStats.unsubscribes}</Text>
                  <Text style={styles.subscriberLabel}>Disiscritti</Text>
                </View>
              </View>
            </Card>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateCampaign')}
        activeOpacity={0.8}
        testID="button-create-campaign"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  quickActionsCard: {
    paddingVertical: spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionsGridLandscape: {
    justifyContent: 'center',
    gap: spacing.xl * 2,
  },
  quickAction: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    color: colors.foreground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  campaignsContainer: {
    gap: spacing.md,
  },
  campaignsContainerTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  campaignCardTablet: {
    width: '48%',
  },
  campaignCard: {
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  campaignInfo: {
    flex: 1,
  },
  campaignName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  campaignMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  campaignDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  campaignStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  campaignStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  campaignStatValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  campaignStatLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  activitiesCard: {
    paddingVertical: spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  activityDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  activityTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  subscriberCards: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  subscriberCard: {
    flex: 1,
    paddingVertical: spacing.lg,
  },
  subscriberCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  subscriberIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriberValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  subscriberLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
