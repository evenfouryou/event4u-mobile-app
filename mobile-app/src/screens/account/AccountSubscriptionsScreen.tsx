import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { api } from '../../lib/api';

interface Subscription {
  id: number;
  venueName: string;
  venueImage?: string;
  planName: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  price: number;
  billingCycle: 'monthly' | 'yearly';
  benefits?: string[];
}

const statusConfig = {
  active: {
    label: 'Attivo',
    color: colors.success,
    icon: 'checkmark-circle' as const,
  },
  expired: {
    label: 'Scaduto',
    color: colors.error,
    icon: 'close-circle' as const,
  },
  cancelled: {
    label: 'Cancellato',
    color: colors.mutedForeground,
    icon: 'ban' as const,
  },
  pending: {
    label: 'In attesa',
    color: colors.warning,
    icon: 'time' as const,
  },
};

interface SubscriptionCardProps {
  subscription: Subscription;
  onPress?: () => void;
}

function SubscriptionCard({ subscription, onPress }: SubscriptionCardProps) {
  const status = statusConfig[subscription.status];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getBillingLabel = (cycle: string) => {
    return cycle === 'monthly' ? '/mese' : '/anno';
  };

  return (
    <Card variant="default" style={styles.subscriptionCard}>
      <View style={styles.cardHeader}>
        <View style={styles.venueInfo}>
          <View style={styles.venueIconContainer}>
            <Ionicons name="business-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.venueDetails}>
            <Text style={styles.venueName}>{subscription.venueName}</Text>
            <Text style={styles.planName}>{subscription.planName}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <Ionicons name={status.icon} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Data inizio</Text>
            <Text style={styles.dateValue}>{formatDate(subscription.startDate)}</Text>
          </View>
          {subscription.endDate && (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Data fine</Text>
              <Text style={styles.dateValue}>{formatDate(subscription.endDate)}</Text>
            </View>
          )}
        </View>

        {subscription.benefits && subscription.benefits.length > 0 && (
          <View style={styles.benefitsContainer}>
            {subscription.benefits.slice(0, 3).map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Ionicons name="checkmark" size={14} color={colors.success} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceValue}>€{subscription.price.toFixed(2)}</Text>
          <Text style={styles.priceCycle}>{getBillingLabel(subscription.billingCycle)}</Text>
        </View>
        <Button
          title="Gestisci"
          variant="outline"
          size="sm"
          onPress={onPress || (() => {})}
        />
      </View>
    </Card>
  );
}

function EmptyState() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="card-outline" size={64} color={colors.mutedForeground} />
      </View>
      <Text style={styles.emptyTitle}>Nessun abbonamento</Text>
      <Text style={styles.emptySubtitle}>
        Non hai ancora abbonamenti attivi. Esplora i locali per trovare offerte esclusive.
      </Text>
      <Button
        title="Esplora Locali"
        variant="primary"
        onPress={() => navigation.navigate('Venues')}
        icon={<Ionicons name="search-outline" size={18} color={colors.primaryForeground} />}
        style={styles.exploreButton}
      />
    </View>
  );
}

export function AccountSubscriptionsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const { data: subscriptionsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['/api/public/account/subscriptions'],
    queryFn: () => api.get<{ upcoming: Subscription[]; past: Subscription[] }>('/api/public/account/subscriptions'),
  });
  
  const subscriptions = [...(subscriptionsData?.upcoming || []), ...(subscriptionsData?.past || [])];

  const activeSubscriptions = subscriptions?.filter(s => s.status === 'active') || [];
  const otherSubscriptions = subscriptions?.filter(s => s.status !== 'active') || [];

  const handleSubscriptionPress = (subscription: Subscription) => {
    navigation.navigate('SubscriptionDetail', { subscriptionId: subscription.id });
  };

  return (
    <View style={styles.container}>
      <Header
        title="I miei abbonamenti"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            {[1, 2].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonHeader} />
                <View style={styles.skeletonBody} />
              </View>
            ))}
          </View>
        ) : !subscriptions || subscriptions.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {activeSubscriptions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Abbonamenti attivi</Text>
                {activeSubscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onPress={() => handleSubscriptionPress(subscription)}
                  />
                ))}
              </View>
            )}

            {otherSubscriptions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Altri abbonamenti</Text>
                {otherSubscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onPress={() => handleSubscriptionPress(subscription)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  loadingContainer: {
    gap: spacing.md,
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    gap: spacing.md,
  },
  skeletonHeader: {
    height: 48,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
  },
  skeletonBody: {
    height: 80,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  subscriptionCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  venueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  venueIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueDetails: {
    flex: 1,
  },
  venueName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  planName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  cardBody: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  dateValue: {
    fontSize: fontSize.sm,
    color: colors.foreground,
    fontWeight: fontWeight.medium,
  },
  benefitsContainer: {
    gap: spacing.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.muted,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xxs,
  },
  priceValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  priceCycle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  exploreButton: {
    minWidth: 180,
  },
});
