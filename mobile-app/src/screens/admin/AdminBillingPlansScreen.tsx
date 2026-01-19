import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  subscriberCount: number;
  isActive: boolean;
  isPopular: boolean;
}

export function AdminBillingPlansScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState<BillingPlan[]>([]);

  const loadPlans = async () => {
    try {
      const response = await api.get<BillingPlan[]>('/api/admin/billing/plans').catch(() => []);
      if (Array.isArray(response) && response.length > 0) {
        setPlans(response);
      } else {
        setPlans([
          {
            id: '1',
            name: 'Base',
            price: 29,
            interval: 'month',
            features: ['Fino a 5 eventi/mese', '100 biglietti/evento', 'Supporto email'],
            subscriberCount: 45,
            isActive: true,
            isPopular: false,
          },
          {
            id: '2',
            name: 'Pro',
            price: 79,
            interval: 'month',
            features: ['Eventi illimitati', '1000 biglietti/evento', 'Supporto prioritario', 'Analytics avanzati'],
            subscriberCount: 128,
            isActive: true,
            isPopular: true,
          },
          {
            id: '3',
            name: 'Enterprise',
            price: 199,
            interval: 'month',
            features: ['Tutto incluso', 'Biglietti illimitati', 'Account manager dedicato', 'API access', 'White-label'],
            subscriberCount: 23,
            isActive: true,
            isPopular: false,
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPlans();
  };

  const togglePlanStatus = (plan: BillingPlan) => {
    const action = plan.isActive ? 'disabilitare' : 'abilitare';
    Alert.alert(
      'Conferma',
      `Vuoi ${action} il piano "${plan.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            try {
              await api.put(`/api/admin/billing/plans/${plan.id}`, { isActive: !plan.isActive });
              setPlans(plans.map(p => p.id === plan.id ? { ...p, isActive: !p.isActive } : p));
            } catch (error) {
              Alert.alert('Errore', 'Impossibile aggiornare il piano');
            }
          },
        },
      ]
    );
  };

  const formatPrice = (price: number, interval: string) => {
    return `€${price}/${interval === 'month' ? 'mese' : 'anno'}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Piani Abbonamento" showBack />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="loading-text">Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Piani Abbonamento"
        showBack
        rightAction={
          <TouchableOpacity
            onPress={() => Alert.alert('Nuovo Piano', 'Funzionalità in sviluppo')}
            testID="button-add-plan"
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          (isTablet || isLandscape) && styles.scrollContentLandscape
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        testID="scroll-view-plans"
      >
        <View style={[
          styles.summaryRow,
          (isTablet || isLandscape) && styles.summaryRowLandscape
        ]}>
          <Card variant="glass" style={styles.summaryCard} testID="card-summary-plans">
            <Text style={styles.summaryValue} testID="text-summary-plans-count">{plans.length}</Text>
            <Text style={styles.summaryLabel}>Piani Attivi</Text>
          </Card>
          <Card variant="glass" style={styles.summaryCard} testID="card-summary-subscribers">
            <Text style={styles.summaryValue} testID="text-summary-subscribers-count">
              {plans.reduce((sum, p) => sum + p.subscriberCount, 0)}
            </Text>
            <Text style={styles.summaryLabel}>Abbonati Totali</Text>
          </Card>
        </View>

        <View style={[
          styles.plansContainer,
          (isTablet || isLandscape) && styles.plansContainerLandscape
        ]}>
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              variant="glass" 
              style={[
                styles.planCard,
                (isTablet || isLandscape) && styles.planCardLandscape
              ]}
              testID={`card-plan-${plan.id}`}
            >
              <View style={styles.planHeader}>
                <View style={styles.planTitleRow}>
                  <Text style={styles.planName} testID={`text-plan-name-${plan.id}`}>{plan.name}</Text>
                  {plan.isPopular && (
                    <View style={styles.popularBadge}>
                      <Ionicons name="star" size={12} color={colors.primary} />
                      <Text style={styles.popularText}>Popolare</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: plan.isActive ? `${colors.success}20` : `${colors.destructive}20` }]}>
                  <Text style={[styles.statusText, { color: plan.isActive ? colors.success : colors.destructive }]} testID={`text-plan-status-${plan.id}`}>
                    {plan.isActive ? 'Attivo' : 'Disabilitato'}
                  </Text>
                </View>
              </View>

              <Text style={styles.planPrice} testID={`text-plan-price-${plan.id}`}>{formatPrice(plan.price, plan.interval)}</Text>
              
              <View style={styles.subscribersRow}>
                <Ionicons name="people-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.subscribersText} testID={`text-plan-subscribers-${plan.id}`}>{plan.subscriberCount} abbonati</Text>
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.teal} />
                    <Text style={styles.featureText} testID={`text-plan-feature-${plan.id}-${index}`}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.planActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => Alert.alert('Modifica Piano', 'Funzionalità in sviluppo')}
                  testID={`button-edit-${plan.id}`}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={styles.editButtonText}>Modifica</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, !plan.isActive && styles.toggleButtonActive]}
                  onPress={() => togglePlanStatus(plan)}
                  testID={`button-toggle-${plan.id}`}
                >
                  <Ionicons
                    name={plan.isActive ? 'pause-outline' : 'play-outline'}
                    size={18}
                    color={plan.isActive ? colors.warning : colors.success}
                  />
                  <Text style={[styles.toggleButtonText, { color: plan.isActive ? colors.warning : colors.success }]}>
                    {plan.isActive ? 'Disabilita' : 'Abilita'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
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
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentLandscape: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryRowLandscape: {
    maxWidth: 400,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  summaryValue: {
    color: colors.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  plansContainer: {
    flex: 1,
  },
  plansContainerLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  planCard: {
    marginBottom: spacing.lg,
    padding: spacing.xl,
  },
  planCardLandscape: {
    width: '48.5%',
    marginBottom: 0,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planName: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  popularText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
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
  planPrice: {
    color: colors.teal,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  subscribersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  subscribersText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  featuresContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  planActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}20`,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.warning}20`,
  },
  toggleButtonActive: {
    backgroundColor: `${colors.success}20`,
  },
  toggleButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});

export default AdminBillingPlansScreen;
