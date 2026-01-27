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
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LoyaltyLevel {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  benefits: string[];
  color: string;
  icon: string;
  membersCount: number;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: string;
  isActive: boolean;
  redeemedCount: number;
}

interface LoyaltyStats {
  totalMembers: number;
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  pointsPerPurchase: number;
  euroPerPoint: number;
}

interface GestoreLoyaltyProgramScreenProps {
  onBack: () => void;
}

export function GestoreLoyaltyProgramScreen({ onBack }: GestoreLoyaltyProgramScreenProps) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<LoyaltyStats>({
    totalMembers: 0,
    activeMembers: 0,
    totalPointsIssued: 0,
    totalPointsRedeemed: 0,
    pointsPerPurchase: 1,
    euroPerPoint: 0.01,
  });
  const [levels, setLevels] = useState<LoyaltyLevel[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'levels' | 'rewards' | 'settings'>('levels');

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
        totalMembers: 1842,
        activeMembers: 1256,
        totalPointsIssued: 458920,
        totalPointsRedeemed: 125680,
        pointsPerPurchase: 1,
        euroPerPoint: 0.01,
      });

      setLevels([
        {
          id: 'bronze',
          name: 'Bronze',
          minPoints: 0,
          maxPoints: 999,
          benefits: ['Sconto 5% su eventi selezionati', 'Newsletter esclusiva'],
          color: '#CD7F32',
          icon: 'shield',
          membersCount: 892,
        },
        {
          id: 'silver',
          name: 'Silver',
          minPoints: 1000,
          maxPoints: 4999,
          benefits: ['Sconto 10% su tutti gli eventi', 'Accesso anticipato vendite', 'Newsletter esclusiva'],
          color: '#C0C0C0',
          icon: 'shield',
          membersCount: 456,
        },
        {
          id: 'gold',
          name: 'Gold',
          minPoints: 5000,
          maxPoints: 14999,
          benefits: ['Sconto 15% su tutti gli eventi', 'Accesso VIP', 'Priority check-in', 'Newsletter esclusiva'],
          color: '#FFD700',
          icon: 'shield',
          membersCount: 234,
        },
        {
          id: 'platinum',
          name: 'Platinum',
          minPoints: 15000,
          maxPoints: null,
          benefits: ['Sconto 25% su tutti gli eventi', 'Area VIP gratuita', 'Concierge dedicato', 'Eventi esclusivi', 'Newsletter esclusiva'],
          color: '#E5E4E2',
          icon: 'diamond',
          membersCount: 52,
        },
      ]);

      setRewards([
        {
          id: '1',
          name: 'Sconto 10€',
          description: 'Buono sconto da utilizzare su qualsiasi evento',
          pointsCost: 500,
          category: 'sconto',
          isActive: true,
          redeemedCount: 156,
        },
        {
          id: '2',
          name: 'Drink Omaggio',
          description: 'Un drink gratuito al bar dell\'evento',
          pointsCost: 200,
          category: 'beverage',
          isActive: true,
          redeemedCount: 423,
        },
        {
          id: '3',
          name: 'Upgrade VIP',
          description: 'Upgrade gratuito all\'area VIP',
          pointsCost: 1500,
          category: 'experience',
          isActive: true,
          redeemedCount: 89,
        },
        {
          id: '4',
          name: 'Meet & Greet',
          description: 'Incontro esclusivo con gli artisti',
          pointsCost: 5000,
          category: 'experience',
          isActive: true,
          redeemedCount: 12,
        },
        {
          id: '5',
          name: 'Evento Gratuito',
          description: 'Biglietto omaggio per un evento a scelta',
          pointsCost: 2500,
          category: 'ticket',
          isActive: false,
          redeemedCount: 45,
        },
      ]);
    } catch (error) {
      console.error('Error loading loyalty data:', error);
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
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sconto':
        return 'pricetag';
      case 'beverage':
        return 'wine';
      case 'experience':
        return 'star';
      case 'ticket':
        return 'ticket';
      default:
        return 'gift';
    }
  };

  const tabs = [
    { id: 'levels', label: 'Livelli' },
    { id: 'rewards', label: 'Premi' },
    { id: 'settings', label: 'Config' },
  ];

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-loyalty-program"
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
          <Loading text="Caricamento programma fedeltà..." />
        ) : (
          <>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Programma Fedeltà</Text>
              <Text style={styles.subtitle}>Gestisci livelli e premi per i tuoi clienti</Text>
            </View>

            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                  <Ionicons name="people" size={24} color={staticColors.primary} />
                </View>
                <Text style={styles.statValue}>{formatNumber(stats.totalMembers)}</Text>
                <Text style={styles.statLabel}>Membri Totali</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                  <Ionicons name="person-circle" size={24} color={staticColors.success} />
                </View>
                <Text style={styles.statValue}>{formatNumber(stats.activeMembers)}</Text>
                <Text style={styles.statLabel}>Membri Attivi</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                  <Ionicons name="star" size={24} color={staticColors.teal} />
                </View>
                <Text style={styles.statValue}>{formatNumber(stats.totalPointsIssued)}</Text>
                <Text style={styles.statLabel}>Punti Emessi</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.purple}20` }]}>
                  <Ionicons name="gift" size={24} color={staticColors.purple} />
                </View>
                <Text style={styles.statValue}>{formatNumber(stats.totalPointsRedeemed)}</Text>
                <Text style={styles.statLabel}>Punti Riscattati</Text>
              </GlassCard>
            </View>

            <View style={styles.tabContainer}>
              {tabs.map((tab) => (
                <Pressable
                  key={tab.id}
                  onPress={() => {
                    triggerHaptic('light');
                    setActiveTab(tab.id as any);
                  }}
                  style={[
                    styles.tab,
                    activeTab === tab.id && styles.tabActive,
                  ]}
                  testID={`tab-${tab.id}`}
                >
                  <Text style={[
                    styles.tabText,
                    activeTab === tab.id && styles.tabTextActive,
                  ]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {activeTab === 'levels' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Livelli Fedeltà</Text>
                  <Pressable
                    onPress={() => triggerHaptic('medium')}
                    testID="button-add-level"
                  >
                    <Ionicons name="add-circle" size={24} color={staticColors.primary} />
                  </Pressable>
                </View>

                {levels.map((level) => (
                  <Pressable
                    key={level.id}
                    onPress={() => triggerHaptic('light')}
                    testID={`button-level-${level.id}`}
                  >
                    <Card style={styles.levelCard}>
                      <View style={styles.levelHeader}>
                        <LinearGradient
                          colors={[level.color, `${level.color}80`]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.levelBadge}
                        >
                          <Ionicons name={level.icon as any} size={24} color="#FFF" />
                        </LinearGradient>
                        <View style={styles.levelInfo}>
                          <Text style={styles.levelName}>{level.name}</Text>
                          <Text style={styles.levelPoints}>
                            {formatNumber(level.minPoints)} - {level.maxPoints ? formatNumber(level.maxPoints) : '∞'} punti
                          </Text>
                        </View>
                        <View style={styles.levelMembers}>
                          <Text style={styles.levelMembersCount}>{formatNumber(level.membersCount)}</Text>
                          <Text style={styles.levelMembersLabel}>membri</Text>
                        </View>
                      </View>

                      <View style={styles.benefitsList}>
                        {level.benefits.slice(0, 3).map((benefit, index) => (
                          <View key={index} style={styles.benefitItem}>
                            <Ionicons name="checkmark-circle" size={16} color={staticColors.success} />
                            <Text style={styles.benefitText}>{benefit}</Text>
                          </View>
                        ))}
                        {level.benefits.length > 3 && (
                          <Text style={styles.moreBenefits}>+{level.benefits.length - 3} altri benefici</Text>
                        )}
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            )}

            {activeTab === 'rewards' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Premi Disponibili</Text>
                  <Pressable
                    onPress={() => triggerHaptic('medium')}
                    testID="button-add-reward"
                  >
                    <Ionicons name="add-circle" size={24} color={staticColors.primary} />
                  </Pressable>
                </View>

                {rewards.map((reward) => (
                  <Pressable
                    key={reward.id}
                    onPress={() => triggerHaptic('light')}
                    testID={`button-reward-${reward.id}`}
                  >
                    <Card style={styles.rewardCard}>
                      <View style={styles.rewardHeader}>
                        <View style={[styles.rewardIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                          <Ionicons name={getCategoryIcon(reward.category) as any} size={20} color={staticColors.teal} />
                        </View>
                        <View style={styles.rewardInfo}>
                          <Text style={styles.rewardName}>{reward.name}</Text>
                          <Text style={styles.rewardDescription}>{reward.description}</Text>
                        </View>
                        <Badge variant={reward.isActive ? 'success' : 'secondary'} testID={`badge-reward-status-${reward.id}`}>
                          {reward.isActive ? 'Attivo' : 'Inattivo'}
                        </Badge>
                      </View>

                      <View style={styles.rewardFooter}>
                        <View style={styles.rewardPoints}>
                          <Ionicons name="star" size={14} color={staticColors.primary} />
                          <Text style={styles.rewardPointsText}>{formatNumber(reward.pointsCost)} punti</Text>
                        </View>
                        <Text style={styles.rewardRedeemed}>
                          {reward.redeemedCount} riscattati
                        </Text>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            )}

            {activeTab === 'settings' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Configurazione Punti</Text>

                <Card style={styles.settingCard}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Punti per Euro speso</Text>
                      <Text style={styles.settingDescription}>Quanti punti accumula il cliente per ogni euro speso</Text>
                    </View>
                    <View style={styles.settingValue}>
                      <Text style={styles.settingValueText}>{stats.pointsPerPurchase}</Text>
                      <Text style={styles.settingValueUnit}>punto/€</Text>
                    </View>
                  </View>
                </Card>

                <Card style={styles.settingCard}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Valore punto</Text>
                      <Text style={styles.settingDescription}>Valore monetario di ogni punto</Text>
                    </View>
                    <View style={styles.settingValue}>
                      <Text style={styles.settingValueText}>€{stats.euroPerPoint.toFixed(2)}</Text>
                      <Text style={styles.settingValueUnit}>per punto</Text>
                    </View>
                  </View>
                </Card>

                <Card style={styles.settingCard}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Scadenza punti</Text>
                      <Text style={styles.settingDescription}>I punti scadono dopo un periodo di inattività</Text>
                    </View>
                    <View style={styles.settingValue}>
                      <Text style={styles.settingValueText}>12</Text>
                      <Text style={styles.settingValueUnit}>mesi</Text>
                    </View>
                  </View>
                </Card>

                <Pressable
                  onPress={() => triggerHaptic('medium')}
                  testID="button-edit-settings"
                >
                  <Card style={styles.editButton}>
                    <Ionicons name="settings" size={20} color={staticColors.primary} />
                    <Text style={styles.editButtonText}>Modifica Configurazione</Text>
                  </Card>
                </Pressable>
              </View>
            )}
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
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: staticColors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  tabTextActive: {
    color: staticColors.primaryForeground,
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
  },
  levelCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  levelPoints: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  levelMembers: {
    alignItems: 'center',
  },
  levelMembersCount: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.primary,
  },
  levelMembersLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  benefitsList: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  benefitText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  moreBenefits: {
    fontSize: typography.fontSize.xs,
    color: staticColors.primary,
    marginTop: spacing.xs,
  },
  rewardCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rewardIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rewardInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rewardName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  rewardDescription: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  rewardPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rewardPointsText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primary,
  },
  rewardRedeemed: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  settingCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  settingDescription: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  settingValue: {
    alignItems: 'flex-end',
  },
  settingValueText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  settingValueUnit: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  editButton: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  editButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primary,
  },
});

export default GestoreLoyaltyProgramScreen;
