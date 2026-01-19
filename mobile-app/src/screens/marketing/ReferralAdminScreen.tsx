import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Switch,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';

interface ReferralSettings {
  enabled: boolean;
  referrerReward: number;
  refereeReward: number;
  minPurchase: number;
  maxReferrals: number;
  expirationDays: number;
}

interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalRewardsIssued: number;
  topReferrer: {
    name: string;
    count: number;
  };
}

interface Referral {
  id: string;
  referrerName: string;
  referrerEmail: string;
  refereeName: string;
  refereeEmail: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  rewardAmount: number;
}

interface TopReferrer {
  id: string;
  name: string;
  email: string;
  referralCount: number;
  successRate: number;
  totalRewardsEarned: number;
}

export default function ReferralAdminScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'leaderboard'>('overview');

  const numColumns = isTablet || isLandscape ? 4 : 2;
  const statCardWidth = (width - spacing.lg * 2 - spacing.md * (numColumns - 1)) / numColumns;

  const { data: settings, refetch: refetchSettings } = useQuery<ReferralSettings>({
    queryKey: ['/api/marketing/referral/settings'],
  });

  const { data: stats, refetch: refetchStats } = useQuery<ReferralStats>({
    queryKey: ['/api/marketing/referral/stats'],
  });

  const { data: referrals, refetch: refetchReferrals } = useQuery<Referral[]>({
    queryKey: ['/api/marketing/referral/list'],
  });

  const { data: topReferrers, refetch: refetchTopReferrers } = useQuery<TopReferrer[]>({
    queryKey: ['/api/marketing/referral/top'],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<ReferralSettings>) => {
      return fetch('/api/marketing/referral/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/referral/settings'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchSettings(), refetchStats(), refetchReferrals(), refetchTopReferrers()]);
    setRefreshing(false);
  }, [refetchSettings, refetchStats, refetchReferrals, refetchTopReferrers]);

  const mockSettings: ReferralSettings = settings || {
    enabled: true,
    referrerReward: 10,
    refereeReward: 5,
    minPurchase: 20,
    maxReferrals: 50,
    expirationDays: 30,
  };

  const mockStats: ReferralStats = stats || {
    totalReferrals: 456,
    successfulReferrals: 234,
    pendingReferrals: 45,
    totalRewardsIssued: 3890,
    topReferrer: {
      name: 'Marco Rossi',
      count: 23,
    },
  };

  const mockReferrals: Referral[] = referrals || [
    { id: '1', referrerName: 'Marco Rossi', referrerEmail: 'marco@email.com', refereeName: 'Anna Bianchi', refereeEmail: 'anna@email.com', status: 'completed', createdAt: '2026-01-15', completedAt: '2026-01-17', rewardAmount: 10 },
    { id: '2', referrerName: 'Laura Verde', referrerEmail: 'laura@email.com', refereeName: 'Paolo Neri', refereeEmail: 'paolo@email.com', status: 'pending', createdAt: '2026-01-16', rewardAmount: 10 },
    { id: '3', referrerName: 'Marco Rossi', referrerEmail: 'marco@email.com', refereeName: 'Sara Gialli', refereeEmail: 'sara@email.com', status: 'completed', createdAt: '2026-01-14', completedAt: '2026-01-16', rewardAmount: 10 },
    { id: '4', referrerName: 'Giuseppe Blu', referrerEmail: 'giuseppe@email.com', refereeName: 'Elena Rosa', refereeEmail: 'elena@email.com', status: 'expired', createdAt: '2025-12-10', rewardAmount: 10 },
  ];

  const mockTopReferrers: TopReferrer[] = topReferrers || [
    { id: '1', name: 'Marco Rossi', email: 'marco@email.com', referralCount: 23, successRate: 78, totalRewardsEarned: 180 },
    { id: '2', name: 'Laura Verde', email: 'laura@email.com', referralCount: 18, successRate: 72, totalRewardsEarned: 130 },
    { id: '3', name: 'Giovanni Blu', email: 'giovanni@email.com', referralCount: 15, successRate: 80, totalRewardsEarned: 120 },
    { id: '4', name: 'Francesca Gialli', email: 'francesca@email.com', referralCount: 12, successRate: 66, totalRewardsEarned: 80 },
    { id: '5', name: 'Antonio Neri', email: 'antonio@email.com', referralCount: 10, successRate: 70, totalRewardsEarned: 70 },
  ];

  const getStatusConfig = (status: Referral['status']) => {
    switch (status) {
      case 'pending': return { label: 'In Attesa', color: colors.warning };
      case 'completed': return { label: 'Completato', color: colors.teal };
      case 'expired': return { label: 'Scaduto', color: colors.mutedForeground };
      case 'cancelled': return { label: 'Annullato', color: colors.destructive };
    }
  };

  const renderReferralCard = ({ item }: { item: Referral }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <Card variant="glass" style={styles.referralCard} testID={`card-referral-${item.id}`}>
        <View style={styles.referralHeader}>
          <View style={styles.referralParty}>
            <View style={styles.referralAvatar} testID={`avatar-referrer-${item.id}`}>
              <Text style={styles.avatarText}>{item.referrerName.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.referralName} testID={`text-referrer-${item.id}`}>{item.referrerName}</Text>
              <Text style={styles.referralLabel}>Referrer</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={20} color={colors.mutedForeground} />
          <View style={styles.referralParty}>
            <View>
              <Text style={styles.referralName} testID={`text-referee-${item.id}`}>{item.refereeName}</Text>
              <Text style={styles.referralLabel}>Invitato</Text>
            </View>
            <View style={[styles.referralAvatar, { backgroundColor: `${colors.teal}20` }]} testID={`avatar-referee-${item.id}`}>
              <Text style={[styles.avatarText, { color: colors.teal }]}>{item.refereeName.charAt(0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.referralMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.metaText} testID={`text-date-${item.id}`}>{item.createdAt}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]} testID={`badge-status-${item.id}`}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          {item.status === 'completed' && (
            <View style={styles.rewardBadge} testID={`badge-reward-${item.id}`}>
              <Ionicons name="gift" size={12} color={colors.primary} />
              <Text style={styles.rewardText}>€{item.rewardAmount}</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const renderTopReferrer = ({ item, index }: { item: TopReferrer; index: number }) => (
    <Card variant="glass" style={[styles.leaderCard, isTablet && styles.leaderCardTablet]} testID={`card-leader-${item.id}`}>
      <View style={styles.leaderRank}>
        <Text style={[
          styles.rankNumber,
          index < 3 && { color: index === 0 ? colors.primary : index === 1 ? '#C0C0C0' : '#CD7F32' }
        ]} testID={`text-rank-${item.id}`}>
          #{index + 1}
        </Text>
      </View>
      <View style={styles.leaderAvatar} testID={`avatar-leader-${item.id}`}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.leaderInfo}>
        <Text style={styles.leaderName} testID={`text-name-${item.id}`}>{item.name}</Text>
        <Text style={styles.leaderEmail} testID={`text-email-${item.id}`}>{item.email}</Text>
      </View>
      <View style={styles.leaderStats}>
        <Text style={styles.leaderStatValue} testID={`text-count-${item.id}`}>{item.referralCount}</Text>
        <Text style={styles.leaderStatLabel}>Referral</Text>
      </View>
      <View style={styles.leaderStats}>
        <Text style={[styles.leaderStatValue, { color: colors.teal }]} testID={`text-rate-${item.id}`}>{item.successRate}%</Text>
        <Text style={styles.leaderStatLabel}>Successo</Text>
      </View>
      <View style={styles.leaderStats}>
        <Text style={[styles.leaderStatValue, { color: colors.primary }]} testID={`text-earned-${item.id}`}>€{item.totalRewardsEarned}</Text>
        <Text style={styles.leaderStatLabel}>Guadagnato</Text>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Programma Referral"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('ReferralSettings')}
            testID="button-settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <View style={styles.tabsContainer}>
        {[
          { id: 'overview', label: 'Panoramica', icon: 'stats-chart-outline' },
          { id: 'referrals', label: 'Referral', icon: 'people-outline' },
          { id: 'leaderboard', label: 'Classifica', icon: 'trophy-outline' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id as any)}
            testID={`tab-${tab.id}`}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.id ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        testID="scroll-view"
      >
        {activeTab === 'overview' && (
          <>
            <View style={styles.section}>
              <Card variant="glass" style={styles.statusCard} testID="card-status">
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel} testID="text-program-label">Programma Referral</Text>
                  <Switch
                    value={mockSettings.enabled}
                    onValueChange={(value) => updateSettingsMutation.mutate({ enabled: value })}
                    trackColor={{ false: colors.surface, true: `${colors.teal}50` }}
                    thumbColor={mockSettings.enabled ? colors.teal : colors.mutedForeground}
                    testID="switch-program-enabled"
                  />
                </View>

                <View style={[styles.rewardsPreview, isLandscape && styles.rewardsPreviewLandscape]}>
                  <View style={styles.rewardPreviewItem} testID="preview-referrer">
                    <Ionicons name="person" size={20} color={colors.primary} />
                    <Text style={styles.rewardPreviewLabel}>Referrer</Text>
                    <Text style={styles.rewardPreviewValue} testID="text-referrer-reward">€{mockSettings.referrerReward}</Text>
                  </View>
                  <Ionicons name="add" size={20} color={colors.mutedForeground} />
                  <View style={styles.rewardPreviewItem} testID="preview-referee">
                    <Ionicons name="person-add" size={20} color={colors.teal} />
                    <Text style={styles.rewardPreviewLabel}>Invitato</Text>
                    <Text style={styles.rewardPreviewValue} testID="text-referee-reward">€{mockSettings.refereeReward}</Text>
                  </View>
                </View>

                <View style={[styles.conditionsRow, isLandscape && styles.conditionsRowLandscape]}>
                  <View style={styles.conditionItem} testID="condition-min-purchase">
                    <Ionicons name="cart-outline" size={16} color={colors.mutedForeground} />
                    <Text style={styles.conditionText}>Min. €{mockSettings.minPurchase}</Text>
                  </View>
                  <View style={styles.conditionItem} testID="condition-expiration">
                    <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                    <Text style={styles.conditionText}>{mockSettings.expirationDays} giorni</Text>
                  </View>
                  <View style={styles.conditionItem} testID="condition-max-referrals">
                    <Ionicons name="infinite-outline" size={16} color={colors.mutedForeground} />
                    <Text style={styles.conditionText}>Max {mockSettings.maxReferrals}</Text>
                  </View>
                </View>
              </Card>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle} testID="text-stats-title">Statistiche</Text>
              <View style={styles.statsGrid}>
                <Card variant="glass" style={[styles.statCard, { width: statCardWidth }]} testID="stat-total">
                  <Ionicons name="people" size={24} color={colors.primary} />
                  <Text style={styles.statValue} testID="text-total-referrals">{mockStats.totalReferrals}</Text>
                  <Text style={styles.statLabel}>Totale Referral</Text>
                </Card>
                <Card variant="glass" style={[styles.statCard, { width: statCardWidth }]} testID="stat-successful">
                  <Ionicons name="checkmark-circle" size={24} color={colors.teal} />
                  <Text style={[styles.statValue, { color: colors.teal }]} testID="text-successful">{mockStats.successfulReferrals}</Text>
                  <Text style={styles.statLabel}>Completati</Text>
                </Card>
                <Card variant="glass" style={[styles.statCard, { width: statCardWidth }]} testID="stat-pending">
                  <Ionicons name="time" size={24} color={colors.warning} />
                  <Text style={[styles.statValue, { color: colors.warning }]} testID="text-pending">{mockStats.pendingReferrals}</Text>
                  <Text style={styles.statLabel}>In Attesa</Text>
                </Card>
                <Card variant="glass" style={[styles.statCard, { width: statCardWidth }]} testID="stat-rewards">
                  <Ionicons name="gift" size={24} color={colors.primary} />
                  <Text style={styles.statValue} testID="text-rewards">€{mockStats.totalRewardsIssued}</Text>
                  <Text style={styles.statLabel}>Premi Erogati</Text>
                </Card>
              </View>
            </View>

            <View style={styles.section}>
              <TouchableOpacity
                onPress={() => setActiveTab('leaderboard')}
                activeOpacity={0.8}
                testID="button-view-top-referrer"
              >
                <Card variant="glass" style={styles.topReferrerCard} testID="card-top-referrer">
                  <View style={styles.topReferrerIcon}>
                    <Ionicons name="trophy" size={28} color={colors.primary} />
                  </View>
                  <View style={styles.topReferrerInfo}>
                    <Text style={styles.topReferrerLabel}>Top Referrer del Mese</Text>
                    <Text style={styles.topReferrerName} testID="text-top-referrer-name">{mockStats.topReferrer.name}</Text>
                    <Text style={styles.topReferrerCount} testID="text-top-referrer-count">{mockStats.topReferrer.count} referral completati</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                </Card>
              </TouchableOpacity>
            </View>
          </>
        )}

        {activeTab === 'referrals' && (
          <View style={styles.section}>
            <FlatList
              key={`referrals-${isTablet ? 2 : 1}`}
              data={mockReferrals}
              renderItem={renderReferralCard}
              keyExtractor={(item) => item.id}
              numColumns={isTablet ? 2 : 1}
              scrollEnabled={false}
              columnWrapperStyle={isTablet ? styles.referralGridRow : undefined}
              ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
              ListEmptyComponent={
                <Card style={styles.emptyCard} variant="glass" testID="empty-referrals">
                  <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
                  <Text style={styles.emptyTitle}>Nessun referral</Text>
                  <Text style={styles.emptyText}>I referral appariranno qui</Text>
                </Card>
              }
              testID="list-referrals"
            />
          </View>
        )}

        {activeTab === 'leaderboard' && (
          <View style={styles.section}>
            <FlatList
              data={mockTopReferrers}
              renderItem={renderTopReferrer}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
              testID="list-leaderboard"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  tabText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
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
  statusCard: {
    paddingVertical: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  rewardsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  rewardsPreviewLandscape: {
    gap: spacing.xl * 2,
  },
  rewardPreviewItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  rewardPreviewLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  rewardPreviewValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  conditionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  conditionsRowLandscape: {
    justifyContent: 'center',
    gap: spacing.xl * 2,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  conditionText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  topReferrerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  topReferrerIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topReferrerInfo: {
    flex: 1,
  },
  topReferrerLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  topReferrerName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  topReferrerCount: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
  referralGridRow: {
    gap: spacing.md,
  },
  referralCard: {
    flex: 1,
    paddingVertical: spacing.lg,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  referralParty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  referralAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  referralName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  referralLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  referralMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
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
    fontWeight: fontWeight.medium,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: `${colors.primary}20`,
    borderRadius: borderRadius.full,
  },
  rewardText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  leaderCardTablet: {
    paddingHorizontal: spacing.lg,
  },
  leaderRank: {
    width: 32,
    alignItems: 'center',
  },
  rankNumber: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  leaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  leaderEmail: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  leaderStats: {
    alignItems: 'center',
    minWidth: 50,
  },
  leaderStatValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  leaderStatLabel: {
    color: colors.mutedForeground,
    fontSize: 10,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
});
