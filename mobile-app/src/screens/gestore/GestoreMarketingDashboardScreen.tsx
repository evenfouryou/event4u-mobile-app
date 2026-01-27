import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  scheduledCampaigns: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
}

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'push' | 'sms';
  status: 'active' | 'scheduled' | 'completed' | 'draft';
  sentCount: number;
  openCount: number;
  clickCount: number;
  scheduledAt: string | null;
  createdAt: string;
}

interface PerformanceData {
  label: string;
  value: number;
  percentage: number;
}

interface GestoreMarketingDashboardScreenProps {
  onBack: () => void;
  onNavigate?: (screen: string) => void;
}

export function GestoreMarketingDashboardScreen({ onBack, onNavigate }: GestoreMarketingDashboardScreenProps) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<CampaignStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    scheduledCampaigns: 0,
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    openRate: 0,
    clickRate: 0,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStats({
        totalCampaigns: 24,
        activeCampaigns: 3,
        scheduledCampaigns: 5,
        totalSent: 15420,
        totalOpened: 8652,
        totalClicked: 2314,
        openRate: 56.1,
        clickRate: 15.0,
      });

      setCampaigns([
        {
          id: '1',
          name: 'Newsletter Settimanale',
          type: 'email',
          status: 'active',
          sentCount: 2500,
          openCount: 1420,
          clickCount: 356,
          scheduledAt: null,
          createdAt: '2025-01-20',
        },
        {
          id: '2',
          name: 'Promo Weekend',
          type: 'push',
          status: 'scheduled',
          sentCount: 0,
          openCount: 0,
          clickCount: 0,
          scheduledAt: '2025-01-28T18:00:00',
          createdAt: '2025-01-25',
        },
        {
          id: '3',
          name: 'Lancio Nuovo Evento',
          type: 'email',
          status: 'active',
          sentCount: 3200,
          openCount: 1890,
          clickCount: 520,
          scheduledAt: null,
          createdAt: '2025-01-22',
        },
        {
          id: '4',
          name: 'Reminder Evento',
          type: 'sms',
          status: 'completed',
          sentCount: 850,
          openCount: 820,
          clickCount: 245,
          scheduledAt: null,
          createdAt: '2025-01-15',
        },
      ]);

      setPerformanceData([
        { label: 'Lun', value: 450, percentage: 45 },
        { label: 'Mar', value: 680, percentage: 68 },
        { label: 'Mer', value: 520, percentage: 52 },
        { label: 'Gio', value: 890, percentage: 89 },
        { label: 'Ven', value: 1000, percentage: 100 },
        { label: 'Sab', value: 750, percentage: 75 },
        { label: 'Dom', value: 420, percentage: 42 },
      ]);
    } catch (error) {
      console.error('Error loading marketing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" testID="badge-status-active">Attiva</Badge>;
      case 'scheduled':
        return <Badge variant="default" testID="badge-status-scheduled">Programmata</Badge>;
      case 'completed':
        return <Badge variant="secondary" testID="badge-status-completed">Completata</Badge>;
      case 'draft':
        return <Badge variant="outline" testID="badge-status-draft">Bozza</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return 'mail';
      case 'push':
        return 'notifications';
      case 'sms':
        return 'chatbox';
      default:
        return 'megaphone';
    }
  };

  const quickActions = [
    { id: 'new-campaign', icon: 'add-circle', label: 'Nuova Campagna', color: staticColors.primary },
    { id: 'segments', icon: 'people', label: 'Segmenti', color: staticColors.teal },
    { id: 'analytics', icon: 'bar-chart', label: 'Analytics', color: staticColors.purple },
    { id: 'templates', icon: 'document-text', label: 'Template', color: staticColors.pink },
  ];

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-marketing-dashboard"
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
          <Loading text="Caricamento dashboard..." />
        ) : (
          <>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Dashboard Marketing</Text>
              <Text style={styles.subtitle}>Panoramica campagne e performance</Text>
            </View>

            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                  <Ionicons name="mail" size={24} color={staticColors.primary} />
                </View>
                <Text style={styles.statValue}>{formatNumber(stats.totalSent)}</Text>
                <Text style={styles.statLabel}>Inviate</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                  <Ionicons name="open" size={24} color={staticColors.success} />
                </View>
                <Text style={styles.statValue}>{formatNumber(stats.totalOpened)}</Text>
                <Text style={styles.statLabel}>Aperte</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                  <Ionicons name="finger-print" size={24} color={staticColors.teal} />
                </View>
                <Text style={styles.statValue}>{formatNumber(stats.totalClicked)}</Text>
                <Text style={styles.statLabel}>Click</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.purple}20` }]}>
                  <Ionicons name="trending-up" size={24} color={staticColors.purple} />
                </View>
                <Text style={styles.statValue}>{stats.openRate}%</Text>
                <Text style={styles.statLabel}>Open Rate</Text>
              </GlassCard>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Azioni Rapide</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickActionsContainer}
              >
                {quickActions.map((action) => (
                  <Pressable
                    key={action.id}
                    onPress={() => {
                      triggerHaptic('medium');
                      if (onNavigate) {
                        onNavigate(action.id);
                      }
                    }}
                    testID={`button-${action.id}`}
                  >
                    <Card style={styles.quickActionCard}>
                      <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                        <Ionicons name={action.icon as any} size={24} color={action.color} />
                      </View>
                      <Text style={styles.quickActionLabel}>{action.label}</Text>
                    </Card>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance Settimanale</Text>
              <Card style={styles.chartCard}>
                <View style={styles.chartContainer}>
                  {performanceData.map((data, index) => (
                    <View key={index} style={styles.chartBar}>
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: `${data.percentage}%`,
                              backgroundColor: staticColors.primary,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartLabel}>{data.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: staticColors.primary }]} />
                    <Text style={styles.legendText}>Email aperte</Text>
                  </View>
                </View>
              </Card>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Campagne Attive</Text>
                <Badge variant="default" testID="badge-active-count">{stats.activeCampaigns} attive</Badge>
              </View>

              {campaigns.filter(c => c.status === 'active' || c.status === 'scheduled').map((campaign) => (
                <Pressable
                  key={campaign.id}
                  onPress={() => {
                    triggerHaptic('light');
                  }}
                  testID={`button-campaign-${campaign.id}`}
                >
                  <Card style={styles.campaignCard}>
                    <View style={styles.campaignHeader}>
                      <View style={[styles.campaignTypeIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                        <Ionicons name={getTypeIcon(campaign.type) as any} size={20} color={staticColors.primary} />
                      </View>
                      <View style={styles.campaignInfo}>
                        <Text style={styles.campaignName}>{campaign.name}</Text>
                        <Text style={styles.campaignType}>
                          {campaign.type === 'email' ? 'Email' : campaign.type === 'push' ? 'Push' : 'SMS'}
                        </Text>
                      </View>
                      {getStatusBadge(campaign.status)}
                    </View>

                    <View style={styles.campaignDivider} />

                    <View style={styles.campaignStats}>
                      <View style={styles.campaignStat}>
                        <Text style={styles.campaignStatValue}>{formatNumber(campaign.sentCount)}</Text>
                        <Text style={styles.campaignStatLabel}>Inviate</Text>
                      </View>
                      <View style={styles.campaignStat}>
                        <Text style={styles.campaignStatValue}>{formatNumber(campaign.openCount)}</Text>
                        <Text style={styles.campaignStatLabel}>Aperte</Text>
                      </View>
                      <View style={styles.campaignStat}>
                        <Text style={styles.campaignStatValue}>{formatNumber(campaign.clickCount)}</Text>
                        <Text style={styles.campaignStatLabel}>Click</Text>
                      </View>
                      <View style={styles.campaignStat}>
                        <Text style={styles.campaignStatValue}>
                          {campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0}%
                        </Text>
                        <Text style={styles.campaignStatLabel}>Open Rate</Text>
                      </View>
                    </View>

                    {campaign.scheduledAt && (
                      <View style={styles.campaignFooter}>
                        <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                        <Text style={styles.campaignDate}>
                          Programmata: {formatDate(campaign.scheduledAt)}
                        </Text>
                      </View>
                    )}
                  </Card>
                </Pressable>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Campagne Recenti</Text>
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                  }}
                  testID="button-view-all-campaigns"
                >
                  <Text style={styles.viewAllText}>Vedi tutte</Text>
                </Pressable>
              </View>

              {campaigns.filter(c => c.status === 'completed').slice(0, 3).map((campaign) => (
                <Pressable
                  key={campaign.id}
                  onPress={() => {
                    triggerHaptic('light');
                  }}
                  testID={`button-campaign-completed-${campaign.id}`}
                >
                  <Card style={styles.recentCampaignCard}>
                    <View style={styles.recentCampaignRow}>
                      <View style={[styles.campaignTypeIconSmall, { backgroundColor: `${staticColors.teal}20` }]}>
                        <Ionicons name={getTypeIcon(campaign.type) as any} size={16} color={staticColors.teal} />
                      </View>
                      <View style={styles.recentCampaignInfo}>
                        <Text style={styles.recentCampaignName}>{campaign.name}</Text>
                        <Text style={styles.recentCampaignMeta}>
                          {formatNumber(campaign.sentCount)} inviate · {formatNumber(campaign.openCount)} aperte
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                    </View>
                  </Card>
                </Pressable>
              ))}
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
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2,
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
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    fontWeight: '500',
  },
  quickActionsContainer: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  quickActionCard: {
    padding: spacing.md,
    alignItems: 'center',
    width: 100,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickActionLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.foreground,
    fontWeight: '500',
    textAlign: 'center',
  },
  chartCard: {
    padding: spacing.md,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: spacing.md,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    width: 24,
    height: 120,
    backgroundColor: `${staticColors.primary}20`,
    borderRadius: borderRadius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: borderRadius.sm,
  },
  chartLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  campaignCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  campaignTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
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
  },
  campaignStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  campaignStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  campaignFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  campaignDate: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  recentCampaignCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  recentCampaignRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  campaignTypeIconSmall: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  recentCampaignInfo: {
    flex: 1,
  },
  recentCampaignName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  recentCampaignMeta: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
});

export default GestoreMarketingDashboardScreen;
