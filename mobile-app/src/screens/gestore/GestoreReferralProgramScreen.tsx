import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Dimensions, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { ReferralProgram as ApiReferralProgram, ReferralStats as ApiReferralStats, ReferralLeader } from '@/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReferralStats {
  totalReferrals: number;
  successfulConversions: number;
  pendingInvites: number;
  totalCommissionsPaid: number;
  totalCommissionsPending: number;
  conversionRate: number;
}

interface ReferralCode {
  id: string;
  code: string;
  ownerName: string;
  ownerEmail: string;
  invitesCount: number;
  conversionsCount: number;
  commissionEarned: number;
  commissionPending: number;
  isActive: boolean;
  createdAt: string;
}

interface CommissionPayment {
  id: string;
  referralCode: string;
  ownerName: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  paidAt: string | null;
}

interface ReferralConfig {
  referrerBonus: number;
  refereeDiscount: number;
  bonusType: 'fixed' | 'percentage';
  minPurchaseAmount: number;
}

interface GestoreReferralProgramScreenProps {
  onBack: () => void;
}

export function GestoreReferralProgramScreen({ onBack }: GestoreReferralProgramScreenProps) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    successfulConversions: 0,
    pendingInvites: 0,
    totalCommissionsPaid: 0,
    totalCommissionsPending: 0,
    conversionRate: 0,
  });
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [config, setConfig] = useState<ReferralConfig>({
    referrerBonus: 10,
    refereeDiscount: 5,
    bonusType: 'fixed',
    minPurchaseAmount: 20,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeTab, setActiveTab] = useState<'codes' | 'payments' | 'settings'>('codes');

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
      setHasError(false);

      const [apiStats, leaderboard] = await Promise.all([
        api.getReferralStats(),
        api.getReferralLeaderboard(),
      ]);

      setStats({
        totalReferrals: apiStats.totalReferrals,
        successfulConversions: apiStats.successfulReferrals,
        pendingInvites: apiStats.pendingReferrals,
        totalCommissionsPaid: apiStats.totalPointsAwarded,
        totalCommissionsPending: 0,
        conversionRate: apiStats.totalReferrals > 0 
          ? Math.round((apiStats.successfulReferrals / apiStats.totalReferrals) * 100) 
          : 0,
      });

      setReferralCodes(leaderboard.map((leader, idx) => ({
        id: String(idx + 1),
        code: `REF${leader.userId.slice(0, 6).toUpperCase()}`,
        ownerName: leader.userName,
        ownerEmail: '',
        invitesCount: leader.referralCount || 0,
        conversionsCount: leader.referralCount || 0,
        commissionEarned: leader.pointsEarned || 0,
        commissionPending: 0,
        isActive: true,
        createdAt: '',
      })));

      setPayments([]);
    } catch (error) {
      console.error('Error loading referral data:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `€${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleShareCode = async (code: string) => {
    triggerHaptic('medium');
    try {
      await Share.share({
        message: `Usa il mio codice ${code} per ottenere uno sconto sul tuo primo acquisto!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success" testID="badge-payment-paid">Pagato</Badge>;
      case 'pending':
        return <Badge variant="warning" testID="badge-payment-pending">In attesa</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" testID="badge-payment-cancelled">Annullato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const tabs = [
    { id: 'codes', label: 'Codici' },
    { id: 'payments', label: 'Pagamenti' },
    { id: 'settings', label: 'Config' },
  ];

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-referral-program"
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
          <Loading text="Caricamento programma referral..." />
        ) : (
          <>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Programma Referral</Text>
              <Text style={styles.subtitle}>Gestisci codici invito e commissioni</Text>
            </View>

            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                  <Ionicons name="share-social" size={24} color={staticColors.primary} />
                </View>
                <Text style={styles.statValue}>{stats.totalReferrals}</Text>
                <Text style={styles.statLabel}>Inviti Totali</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
                  <Ionicons name="checkmark-done" size={24} color={staticColors.success} />
                </View>
                <Text style={styles.statValue}>{stats.successfulConversions}</Text>
                <Text style={styles.statLabel}>Conversioni</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                  <Ionicons name="trending-up" size={24} color={staticColors.teal} />
                </View>
                <Text style={styles.statValue}>{stats.conversionRate}%</Text>
                <Text style={styles.statLabel}>Tasso Conv.</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${staticColors.purple}20` }]}>
                  <Ionicons name="cash" size={24} color={staticColors.purple} />
                </View>
                <Text style={styles.statValue}>{formatCurrency(stats.totalCommissionsPaid)}</Text>
                <Text style={styles.statLabel}>Pagato</Text>
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

            {activeTab === 'codes' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Codici Referral Attivi</Text>
                  <Pressable
                    onPress={() => triggerHaptic('medium')}
                    testID="button-add-referral-code"
                  >
                    <Ionicons name="add-circle" size={24} color={staticColors.primary} />
                  </Pressable>
                </View>

                {referralCodes.map((referral) => (
                  <Card key={referral.id} style={styles.referralCard}>
                    <View style={styles.referralHeader}>
                      <View style={styles.referralCodeContainer}>
                        <Text style={styles.referralCode}>{referral.code}</Text>
                        <Badge variant={referral.isActive ? 'success' : 'secondary'} testID={`badge-referral-status-${referral.id}`}>
                          {referral.isActive ? 'Attivo' : 'Inattivo'}
                        </Badge>
                      </View>
                      <Pressable
                        onPress={() => handleShareCode(referral.code)}
                        testID={`button-share-${referral.id}`}
                      >
                        <Ionicons name="share-outline" size={22} color={staticColors.primary} />
                      </Pressable>
                    </View>

                    <View style={styles.referralOwner}>
                      <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
                      <Text style={styles.referralOwnerName}>{referral.ownerName}</Text>
                      {referral.ownerEmail ? (
                        <Text style={styles.referralOwnerEmail}>{referral.ownerEmail}</Text>
                      ) : null}
                    </View>

                    <View style={styles.referralDivider} />

                    <View style={styles.referralStats}>
                      <View style={styles.referralStat}>
                        <Text style={styles.referralStatValue}>{referral.invitesCount}</Text>
                        <Text style={styles.referralStatLabel}>Inviti</Text>
                      </View>
                      <View style={styles.referralStat}>
                        <Text style={styles.referralStatValue}>{referral.conversionsCount}</Text>
                        <Text style={styles.referralStatLabel}>Conversioni</Text>
                      </View>
                      <View style={styles.referralStat}>
                        <Text style={[styles.referralStatValue, { color: staticColors.success }]}>
                          {formatCurrency(referral.commissionEarned)}
                        </Text>
                        <Text style={styles.referralStatLabel}>Guadagnato</Text>
                      </View>
                      {referral.commissionPending > 0 && (
                        <View style={styles.referralStat}>
                          <Text style={[styles.referralStatValue, { color: staticColors.warning }]}>
                            {formatCurrency(referral.commissionPending)}
                          </Text>
                          <Text style={styles.referralStatLabel}>In attesa</Text>
                        </View>
                      )}
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {activeTab === 'payments' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Pagamenti Commissioni</Text>
                  {stats.totalCommissionsPending > 0 && (
                    <Badge variant="warning" testID="badge-pending-total">
                      {formatCurrency(stats.totalCommissionsPending)} in attesa
                    </Badge>
                  )}
                </View>

                {payments.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <View style={styles.emptyContent}>
                      <Ionicons name="wallet-outline" size={48} color={colors.mutedForeground} />
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                        Nessun pagamento disponibile
                      </Text>
                    </View>
                  </Card>
                ) : null}

                {payments.map((payment) => (
                  <Pressable
                    key={payment.id}
                    onPress={() => triggerHaptic('light')}
                    testID={`button-payment-${payment.id}`}
                  >
                    <Card style={styles.paymentCard}>
                      <View style={styles.paymentHeader}>
                        <View style={styles.paymentInfo}>
                          <Text style={styles.paymentOwner}>{payment.ownerName}</Text>
                          <Text style={styles.paymentCode}>Codice: {payment.referralCode}</Text>
                        </View>
                        <View style={styles.paymentAmountContainer}>
                          <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                          {getPaymentStatusBadge(payment.status)}
                        </View>
                      </View>

                      <View style={styles.paymentFooter}>
                        <Text style={styles.paymentDate}>
                          Creato: {formatDate(payment.createdAt)}
                        </Text>
                        {payment.paidAt && (
                          <Text style={styles.paymentDate}>
                            Pagato: {formatDate(payment.paidAt)}
                          </Text>
                        )}
                      </View>

                      {payment.status === 'pending' && (
                        <Pressable
                          onPress={() => triggerHaptic('medium')}
                          style={styles.payNowButton}
                          testID={`button-pay-now-${payment.id}`}
                        >
                          <Ionicons name="card" size={16} color={staticColors.primary} />
                          <Text style={styles.payNowText}>Paga ora</Text>
                        </Pressable>
                      )}
                    </Card>
                  </Pressable>
                ))}
              </View>
            )}

            {activeTab === 'settings' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Configurazione Bonus</Text>

                <Card style={styles.settingCard}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Bonus Referrer</Text>
                      <Text style={styles.settingDescription}>Premio per chi invita un amico</Text>
                    </View>
                    <View style={styles.settingValue}>
                      <Text style={styles.settingValueText}>
                        {config.bonusType === 'fixed' ? formatCurrency(config.referrerBonus) : `${config.referrerBonus}%`}
                      </Text>
                    </View>
                  </View>
                </Card>

                <Card style={styles.settingCard}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Sconto Invitato</Text>
                      <Text style={styles.settingDescription}>Sconto per il nuovo cliente</Text>
                    </View>
                    <View style={styles.settingValue}>
                      <Text style={styles.settingValueText}>
                        {config.bonusType === 'fixed' ? formatCurrency(config.refereeDiscount) : `${config.refereeDiscount}%`}
                      </Text>
                    </View>
                  </View>
                </Card>

                <Card style={styles.settingCard}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Tipo Bonus</Text>
                      <Text style={styles.settingDescription}>Importo fisso o percentuale</Text>
                    </View>
                    <View style={styles.settingValue}>
                      <Text style={styles.settingValueText}>
                        {config.bonusType === 'fixed' ? 'Fisso' : 'Percentuale'}
                      </Text>
                    </View>
                  </View>
                </Card>

                <Card style={styles.settingCard}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Acquisto Minimo</Text>
                      <Text style={styles.settingDescription}>Importo minimo per validare referral</Text>
                    </View>
                    <View style={styles.settingValue}>
                      <Text style={styles.settingValueText}>{formatCurrency(config.minPurchaseAmount)}</Text>
                    </View>
                  </View>
                </Card>

                <Pressable
                  onPress={() => triggerHaptic('medium')}
                  testID="button-edit-referral-settings"
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
  referralCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referralCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  referralCode: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.primary,
    fontFamily: 'monospace',
  },
  referralOwner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  referralOwnerName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  referralOwnerEmail: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  referralDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  referralStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  referralStat: {
    alignItems: 'center',
  },
  referralStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  referralStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  paymentCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentOwner: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  paymentCode: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  paymentAmountContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  paymentAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  paymentDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  payNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${staticColors.primary}20`,
    borderRadius: borderRadius.md,
  },
  payNowText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primary,
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
  emptyCard: {
    padding: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default GestoreReferralProgramScreen;
