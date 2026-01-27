import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { PRRewardsData, PRActiveReward, PREarnedReward, PRLeaderboardEntry } from '@/lib/api';

type TabType = 'active' | 'my' | 'leaderboard';

interface GestorePRRewardsScreenProps {
  onBack: () => void;
}

export function GestorePRRewardsScreen({ onBack }: GestorePRRewardsScreenProps) {
  const { colors } = useTheme();
  const [rewardsData, setRewardsData] = useState<PRRewardsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');

  useEffect(() => {
    loadRewardsData();
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

  const loadRewardsData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getGestorePRRewards();
      setRewardsData(data);
    } catch (error) {
      console.error('Error loading rewards data:', error);
      setRewardsData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRewardsData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'active', label: 'Premi Attivi', icon: 'gift' },
    { id: 'my', label: 'I Miei Premi', icon: 'trophy' },
    { id: 'leaderboard', label: 'Classifica', icon: 'podium' },
  ];

  const renderActiveReward = ({ item }: { item: PRActiveReward }) => {
    const progress = Math.min((item.current / item.target) * 100, 100);
    
    return (
      <Card style={styles.rewardCard} testID={`reward-${item.id}`}>
        <View style={styles.rewardHeader}>
          <View style={[styles.rewardIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="gift" size={24} color={colors.primary} />
          </View>
          <View style={styles.rewardInfo}>
            <Text style={styles.rewardName}>{item.name}</Text>
            <Text style={styles.rewardPrize}>{item.prize}</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progresso</Text>
            <Text style={styles.progressValue}>{item.current} / {item.target}</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progress}%`, backgroundColor: colors.primary }
              ]} 
            />
          </View>
          <Text style={styles.progressPercent}>{Math.round(progress)}% completato</Text>
        </View>

        <View style={styles.targetRow}>
          <Ionicons name="flag" size={14} color={colors.mutedForeground} />
          <Text style={styles.targetText}>Obiettivo: {item.target}</Text>
        </View>
      </Card>
    );
  };

  const renderEarnedReward = ({ item }: { item: PREarnedReward }) => (
    <Card style={styles.earnedCard} testID={`earned-${item.id}`}>
      <View style={styles.earnedContent}>
        <View style={[styles.earnedIcon, { backgroundColor: `${colors.success || '#22c55e'}20` }]}>
          <Ionicons name="trophy" size={24} color={colors.success || '#22c55e'} />
        </View>
        <View style={styles.earnedInfo}>
          <Text style={styles.earnedName}>{item.name}</Text>
          <Text style={styles.earnedPrize}>{item.prize}</Text>
          <Text style={styles.earnedDate}>Vinto il {formatDate(item.earnedAt)}</Text>
        </View>
        <Badge variant="success">Vinto</Badge>
      </View>
    </Card>
  );

  const renderLeaderboardEntry = ({ item, index }: { item: PRLeaderboardEntry; index: number }) => {
    const getRankIcon = (rank: number) => {
      switch (rank) {
        case 1:
          return { icon: 'trophy', color: '#FFD700' };
        case 2:
          return { icon: 'medal', color: '#C0C0C0' };
        case 3:
          return { icon: 'medal', color: '#CD7F32' };
        default:
          return null;
      }
    };

    const rankData = getRankIcon(item.rank);

    return (
      <Card style={styles.leaderboardCard} testID={`leaderboard-${item.rank}`}>
        <View style={styles.leaderboardContent}>
          <View style={[
            styles.rankBadge,
            item.rank <= 3 && { backgroundColor: `${rankData?.color}30` }
          ]}>
            {rankData ? (
              <Ionicons name={rankData.icon as any} size={18} color={rankData.color} />
            ) : (
              <Text style={styles.rankNumber}>{item.rank}</Text>
            )}
          </View>
          <Avatar name={item.prName} size="sm" testID={`avatar-${item.rank}`} />
          <View style={styles.leaderboardInfo}>
            <Text style={styles.leaderboardName}>{item.prName}</Text>
            <Text style={styles.leaderboardPoints}>{item.points.toLocaleString('it-IT')} punti</Text>
          </View>
          {item.rank <= 3 && (
            <Badge variant={item.rank === 1 ? 'default' : 'secondary'}>
              Top {item.rank}
            </Badge>
          )}
        </View>
      </Card>
    );
  };

  const renderContent = () => {
    if (!rewardsData) return null;

    switch (activeTab) {
      case 'active':
        return rewardsData.activeRewards.length > 0 ? (
          <FlatList
            data={rewardsData.activeRewards}
            renderItem={renderActiveReward}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="gift-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessun premio attivo</Text>
            <Text style={styles.emptyText}>I premi attivi appariranno qui</Text>
          </View>
        );
      
      case 'my':
        return rewardsData.myRewards.length > 0 ? (
          <FlatList
            data={rewardsData.myRewards}
            renderItem={renderEarnedReward}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessun premio vinto</Text>
            <Text style={styles.emptyText}>I premi vinti appariranno qui</Text>
          </View>
        );
      
      case 'leaderboard':
        return rewardsData.leaderboard.length > 0 ? (
          <FlatList
            data={rewardsData.leaderboard}
            renderItem={renderLeaderboardEntry}
            keyExtractor={(item) => `rank-${item.rank}`}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="podium-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Classifica vuota</Text>
            <Text style={styles.emptyText}>La classifica apparirà qui</Text>
          </View>
        );
    }
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-pr-rewards"
      />

      <View style={styles.titleSection}>
        <Text style={styles.screenTitle}>Premi PR</Text>
        <Text style={styles.screenSubtitle}>Sistema incentivi e classifiche</Text>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab(tab.id);
            }}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive,
            ]}
            testID={`tab-${tab.id}`}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={16} 
              color={activeTab === tab.id ? staticColors.primaryForeground : staticColors.mutedForeground} 
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {showLoader ? (
        <Loading text="Caricamento premi..." />
      ) : rewardsData ? (
        renderContent()
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="gift-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Premi non disponibili</Text>
          <Text style={styles.emptyText}>Impossibile caricare i dati dei premi</Text>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  titleSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  screenTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  screenSubtitle: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: staticColors.secondary,
  },
  tabActive: {
    backgroundColor: staticColors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  tabTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  rewardCard: {
    padding: spacing.md,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  rewardPrize: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    marginTop: spacing.xs,
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  progressValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  progressBar: {
    height: 8,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  progressPercent: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  targetText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  earnedCard: {
    padding: spacing.md,
  },
  earnedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  earnedIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnedInfo: {
    flex: 1,
  },
  earnedName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  earnedPrize: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    marginTop: spacing.xs,
  },
  earnedDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  leaderboardCard: {
    padding: spacing.md,
  },
  leaderboardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  leaderboardPoints: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default GestorePRRewardsScreen;
