import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { MarketingCampaign, MarketingStats } from '@/lib/api';

interface ManagerMarketingScreenProps {
  onBack: () => void;
}

export function ManagerMarketingScreen({ onBack }: ManagerMarketingScreenProps) {
  const { colors } = useTheme();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [stats, setStats] = useState<MarketingStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalEmails: 0,
    openRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMarketing();
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

  const loadMarketing = async () => {
    try {
      setIsLoading(true);
      const [campaignsData, statsData] = await Promise.all([
        api.getManagerCampaigns(),
        api.getManagerMarketingStats(),
      ]);
      setCampaigns(campaignsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading marketing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMarketing();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attiva</Badge>;
      case 'scheduled':
        return <Badge variant="default">Programmata</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completata</Badge>;
      case 'draft':
        return <Badge variant="outline">Bozza</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-marketing"
      />

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
        {showLoader ? (
          <Loading text="Caricamento marketing..." />
        ) : (
          <>
            <View style={styles.statsContainer}>
              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                  <Ionicons name="megaphone" size={24} color={staticColors.primary} />
                </View>
                <Text style={styles.statValue}>{stats.totalCampaigns}</Text>
                <Text style={styles.statLabel}>Campagne</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                  <Ionicons name="checkmark-circle" size={24} color={staticColors.success} />
                </View>
                <Text style={styles.statValue}>{stats.activeCampaigns}</Text>
                <Text style={styles.statLabel}>Attive</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                  <Ionicons name="mail" size={24} color={staticColors.teal} />
                </View>
                <Text style={styles.statValue}>{stats.totalEmails}</Text>
                <Text style={styles.statLabel}>Email Inviate</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
                  <Ionicons name="analytics" size={24} color={staticColors.golden} />
                </View>
                <Text style={styles.statValue}>{stats.openRate}%</Text>
                <Text style={styles.statLabel}>Open Rate</Text>
              </GlassCard>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Campagne</Text>

              {campaigns.length > 0 ? (
                campaigns.map((campaign) => (
                  <Pressable
                    key={campaign.id}
                    onPress={() => {
                      triggerHaptic('light');
                    }}
                  >
                    <Card style={styles.campaignCard} testID={`campaign-${campaign.id}`}>
                      <View style={styles.campaignHeader}>
                        <View style={styles.campaignInfo}>
                          <Text style={styles.campaignName}>{campaign.name}</Text>
                          <Text style={styles.campaignType}>{campaign.type}</Text>
                        </View>
                        {getStatusBadge(campaign.status)}
                      </View>

                      <View style={styles.campaignDivider} />

                      <View style={styles.campaignStats}>
                        <View style={styles.campaignStat}>
                          <Ionicons name="mail-outline" size={16} color={colors.mutedForeground} />
                          <Text style={styles.campaignStatValue}>{campaign.sentCount || 0}</Text>
                          <Text style={styles.campaignStatLabel}>Inviate</Text>
                        </View>
                        <View style={styles.campaignStat}>
                          <Ionicons name="open-outline" size={16} color={colors.mutedForeground} />
                          <Text style={styles.campaignStatValue}>{campaign.openCount || 0}</Text>
                          <Text style={styles.campaignStatLabel}>Aperte</Text>
                        </View>
                        <View style={styles.campaignStat}>
                          <Ionicons name="link-outline" size={16} color={colors.mutedForeground} />
                          <Text style={styles.campaignStatValue}>{campaign.clickCount || 0}</Text>
                          <Text style={styles.campaignStatLabel}>Click</Text>
                        </View>
                      </View>

                      <View style={styles.campaignFooter}>
                        <Text style={styles.campaignDate}>
                          {campaign.scheduledAt ? formatDate(campaign.scheduledAt) : 'Non programmata'}
                        </Text>
                      </View>
                    </Card>
                  </Pressable>
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <View style={styles.emptyContent}>
                    <Ionicons name="megaphone-outline" size={48} color={colors.mutedForeground} />
                    <Text style={styles.emptyTitle}>Nessuna campagna</Text>
                    <Text style={styles.emptyText}>Crea campagne marketing dal pannello web</Text>
                  </View>
                </Card>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  campaignCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
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
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  campaignType: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  campaignDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  campaignStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  campaignStat: {
    alignItems: 'center',
    gap: 2,
  },
  campaignStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  campaignStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  campaignFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  campaignDate: {
    fontSize: typography.fontSize.sm,
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
  },
});

export default ManagerMarketingScreen;
