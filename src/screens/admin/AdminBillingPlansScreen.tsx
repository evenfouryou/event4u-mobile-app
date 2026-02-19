import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { SkeletonList } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { BillingPlan } from '@/lib/api';

interface AdminBillingPlansScreenProps {
  onBack: () => void;
}

export function AdminBillingPlansScreen({ onBack }: AdminBillingPlansScreenProps) {
  const { colors } = useTheme();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
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
      const data = await api.getAdminBillingPlans();
      setPlans(data);
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

  const formatCurrency = (price: string) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(parseFloat(price));
  };

  const handleEditPlan = (plan: BillingPlan) => {
    triggerHaptic('medium');
    Alert.alert('Modifica Piano', `Modifica ${plan.name} dal pannello web`);
  };

  const handleTogglePlan = async (plan: BillingPlan) => {
    triggerHaptic('medium');
    try {
      await api.updateAdminBillingPlan(plan.id, { isActive: !plan.isActive });
      await loadPlans();
    } catch (error) {
      console.error('Error toggling plan:', error);
      Alert.alert('Errore', 'Impossibile aggiornare lo stato del piano');
    }
  };

  const handleDeactivatePlan = (plan: BillingPlan) => {
    Alert.alert(
      'Conferma Disattivazione',
      `Sei sicuro di voler disattivare il piano "${plan.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Disattiva',
          style: 'destructive',
          onPress: () => handleTogglePlan(plan),
        },
      ]
    );
  };

  const activePlans = plans.filter(p => p.isActive).length;
  const totalPlans = plans.length;

  const getTypeLabel = (type: string) => {
    return type === 'monthly' ? 'Mensile' : 'Per Evento';
  };

  const getDetailsText = (plan: BillingPlan) => {
    if (plan.type === 'monthly' && plan.durationDays) {
      return `${plan.durationDays} giorni`;
    }
    if (plan.type === 'per_event' && plan.eventsIncluded) {
      return `${plan.eventsIncluded} eventi inclusi`;
    }
    return null;
  };

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
              <Ionicons name="layers" size={24} color={staticColors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{totalPlans}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Piani Totali</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color={staticColors.success} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{activePlans}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Attivi</Text>
            </GlassCard>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Piani Disponibili</Text>
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                triggerHaptic('medium');
                Alert.alert('Info', 'Crea nuovi piani dal pannello web');
              }}
              testID="button-add-plan"
            >
              <Ionicons name="add" size={18} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontWeight: '500' }}>Nuovo</Text>
            </Button>
          </View>

          {plans.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="layers-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Nessun piano configurato
              </Text>
            </Card>
          ) : (
            plans.map((plan) => (
              <Card 
                key={plan.id} 
                style={styles.planCard}
                testID={`card-plan-${plan.id}`}
              >
                <View style={styles.planHeader}>
                  <View style={styles.planTitleRow}>
                    <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                    <Badge variant={plan.type === 'monthly' ? 'default' : 'secondary'}>
                      {getTypeLabel(plan.type)}
                    </Badge>
                  </View>
                  <View style={styles.actionButtons}>
                    <Pressable
                      onPress={() => handleEditPlan(plan)}
                      style={styles.actionButton}
                      testID={`button-edit-plan-${plan.id}`}
                    >
                      <Ionicons name="create-outline" size={20} color={colors.mutedForeground} />
                    </Pressable>
                    {plan.isActive && (
                      <Pressable
                        onPress={() => handleDeactivatePlan(plan)}
                        style={styles.actionButton}
                        testID={`button-deactivate-plan-${plan.id}`}
                      >
                        <Ionicons name="ban-outline" size={20} color={staticColors.destructive} />
                      </Pressable>
                    )}
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <Text style={[styles.planPrice, { color: colors.primary }]}>
                    {formatCurrency(plan.price)}
                  </Text>
                  <Text style={[styles.priceInterval, { color: colors.mutedForeground }]}>
                    /{plan.type === 'monthly' ? 'mese' : 'evento'}
                  </Text>
                </View>

                {getDetailsText(plan) && (
                  <Text style={[styles.detailsText, { color: colors.mutedForeground }]}>
                    {getDetailsText(plan)}
                  </Text>
                )}

                {plan.description && (
                  <Text style={[styles.descriptionText, { color: colors.mutedForeground }]}>
                    {plan.description}
                  </Text>
                )}

                <View style={[styles.planFooter, { borderTopColor: colors.border }]}>
                  <Badge 
                    variant={plan.isActive ? 'success' : 'destructive'}
                    style={styles.statusBadge}
                  >
                    <View style={styles.statusContent}>
                      <Ionicons 
                        name={plan.isActive ? 'checkmark-circle' : 'close-circle'} 
                        size={14} 
                        color={plan.isActive ? staticColors.success : staticColors.destructive} 
                      />
                      <Text style={[styles.statusText, { color: plan.isActive ? staticColors.success : staticColors.destructive }]}>
                        {plan.isActive ? 'Attivo' : 'Disattivato'}
                      </Text>
                    </View>
                  </Badge>
                </View>
              </Card>
            ))
          )}

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
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
  planCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
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
    flexWrap: 'wrap',
  },
  planName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
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
  detailsText: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  descriptionText: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  planFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});

export default AdminBillingPlansScreen;
