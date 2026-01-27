import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { SkeletonList } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  subscriberCount: number;
  isPopular?: boolean;
  isActive: boolean;
}

interface AdminBillingPlansScreenProps {
  onBack: () => void;
}

export function AdminBillingPlansScreen({ onBack }: AdminBillingPlansScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPlans();
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

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setPlans([
        {
          id: '1',
          name: 'Starter',
          price: 29,
          interval: 'monthly',
          features: ['Fino a 5 eventi/mese', '500 biglietti/evento', 'Supporto email', 'Report base'],
          subscriberCount: 45,
          isActive: true,
        },
        {
          id: '2',
          name: 'Professional',
          price: 79,
          interval: 'monthly',
          features: ['Eventi illimitati', 'Biglietti illimitati', 'Supporto prioritario', 'SIAE incluso', 'Report avanzati'],
          subscriberCount: 128,
          isPopular: true,
          isActive: true,
        },
        {
          id: '3',
          name: 'Enterprise',
          price: 199,
          interval: 'monthly',
          features: ['Tutto in Professional', 'API dedicate', 'Gestore dedicato', 'SLA garantito', 'White label', 'Integrazioni custom'],
          subscriberCount: 23,
          isActive: true,
        },
        {
          id: '4',
          name: 'Promo 2024',
          price: 49,
          interval: 'monthly',
          features: ['10 eventi/mese', '1000 biglietti/evento', 'Supporto chat'],
          subscriberCount: 12,
          isActive: false,
        },
      ]);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlans();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleEditPlan = (plan: Plan) => {
    triggerHaptic('medium');
  };

  const handleTogglePlan = (plan: Plan) => {
    triggerHaptic('medium');
    setPlans(prev => prev.map(p => 
      p.id === plan.id ? { ...p, isActive: !p.isActive } : p
    ));
  };

  const totalSubscribers = plans.reduce((sum, plan) => sum + plan.subscriberCount, 0);
  const monthlyRevenue = plans.reduce((sum, plan) => sum + (plan.isActive ? plan.price * plan.subscriberCount : 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Piani Abbonamento"
        showBack
        onBack={onBack}
        testID="header-billing-plans"
      />

      {showLoader ? (
        <View style={styles.loaderContainer}>
          <SkeletonList count={3} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.md }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard}>
              <Ionicons name="people" size={24} color={staticColors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{totalSubscribers}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Abbonati</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Ionicons name="cash" size={24} color={staticColors.success} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{formatCurrency(monthlyRevenue)}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>MRR</Text>
            </GlassCard>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Piani Disponibili</Text>
            <Button
              variant="outline"
              size="sm"
              onPress={() => triggerHaptic('medium')}
              testID="button-add-plan"
            >
              <Ionicons name="add" size={18} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontWeight: '500' }}>Nuovo</Text>
            </Button>
          </View>

          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              style={{...styles.planCard, ...(plan.isPopular ? styles.popularCard : {})}}
              testID={`card-plan-${plan.id}`}
            >
              <View style={styles.planHeader}>
                <View style={styles.planTitleRow}>
                  <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                  {plan.isPopular && <Badge variant="golden">Popolare</Badge>}
                  {!plan.isActive && <Badge variant="secondary">Disattivo</Badge>}
                </View>
                <Pressable
                  onPress={() => handleEditPlan(plan)}
                  style={styles.editButton}
                  testID={`button-edit-plan-${plan.id}`}
                >
                  <Ionicons name="create-outline" size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <View style={styles.priceRow}>
                <Text style={[styles.planPrice, { color: colors.primary }]}>{formatCurrency(plan.price)}</Text>
                <Text style={[styles.priceInterval, { color: colors.mutedForeground }]}>
                  /{plan.interval === 'monthly' ? 'mese' : 'anno'}
                </Text>
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={staticColors.success} />
                    <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.planFooter, { borderTopColor: colors.border }]}>
                <View style={styles.subscriberInfo}>
                  <Ionicons name="people-outline" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.subscriberCount, { color: colors.mutedForeground }]}>
                    {plan.subscriberCount} abbonati
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleTogglePlan(plan)}
                  style={[styles.toggleButton, { backgroundColor: plan.isActive ? `${staticColors.success}20` : `${staticColors.destructive}20` }]}
                  testID={`button-toggle-plan-${plan.id}`}
                >
                  <Text style={[styles.toggleText, { color: plan.isActive ? staticColors.success : staticColors.destructive }]}>
                    {plan.isActive ? 'Attivo' : 'Disattivo'}
                  </Text>
                </Pressable>
              </View>
            </Card>
          ))}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
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
  },
  planCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  popularCard: {
    borderColor: staticColors.golden,
    borderWidth: 1,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  planName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  editButton: {
    padding: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.sm,
  },
  planPrice: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
  },
  priceInterval: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.xs,
  },
  featuresContainer: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: typography.fontSize.sm,
  },
  planFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  subscriberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  subscriberCount: {
    fontSize: typography.fontSize.sm,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  toggleText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});

export default AdminBillingPlansScreen;
