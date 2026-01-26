import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
// Note: uses staticColors for StyleSheet
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { triggerHaptic } from '@/lib/haptics';

interface Subscription {
  id: string;
  name: string;
  venueName: string;
  validFrom: Date;
  validTo: Date;
  entriesUsed: number;
  totalEntries: number | null;
  status: 'active' | 'expired' | 'suspended';
  benefits: string[];
}

interface SubscriptionsScreenProps {
  onBack: () => void;
  onExploreSubscriptions: () => void;
}

export function SubscriptionsScreen({
  onBack,
  onExploreSubscriptions,
}: SubscriptionsScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'expired'>('active');

  const subscriptions: Subscription[] = [
    {
      id: '1',
      name: 'Club XYZ Gold',
      venueName: 'Club XYZ',
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
      entriesUsed: 5,
      totalEntries: null,
      status: 'active',
      benefits: ['Ingresso illimitato', 'Salta la fila', '-20% drink'],
    },
    {
      id: '2',
      name: 'Disco Palace Season',
      venueName: 'Disco Palace',
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-06-30'),
      entriesUsed: 3,
      totalEntries: 12,
      status: 'active',
      benefits: ['12 ingressi', 'Area VIP', 'Drink omaggio'],
    },
    {
      id: '3',
      name: 'Latin Club Monthly',
      venueName: 'Salsa Club',
      validFrom: new Date('2025-11-01'),
      validTo: new Date('2025-11-30'),
      entriesUsed: 4,
      totalEntries: 4,
      status: 'expired',
      benefits: ['4 ingressi', 'Corso salsa incluso'],
    },
  ];

  const filteredSubscriptions = subscriptions.filter((sub) =>
    activeTab === 'active' ? sub.status === 'active' : sub.status !== 'active'
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const renderSubscription = (item: Subscription, index: number) => {
    const daysRemaining = getDaysRemaining(item.validTo);
    const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0;
    const entriesRemaining = item.totalEntries ? item.totalEntries - item.entriesUsed : null;

    return (
      <View key={item.id}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setExpandedId(expandedId === item.id ? null : item.id);
          }}
        >
          <Card style={styles.subscriptionCard} testID={`subscription-${item.id}`}>
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={item.status === 'active' ? ['#FFD700', '#FFA500'] : ['#6B7280', '#4B5563']}
                style={styles.iconContainer}
              >
                <Ionicons name="card" size={24} color="white" />
              </LinearGradient>
              <View style={styles.cardInfo}>
                <Text style={styles.subscriptionName}>{item.name}</Text>
                <Text style={styles.venueName}>{item.venueName}</Text>
              </View>
              <Badge
                variant={
                  item.status === 'active'
                    ? isExpiringSoon
                      ? 'warning'
                      : 'success'
                    : 'secondary'
                }
              >
                {item.status === 'active'
                  ? isExpiringSoon
                    ? `${daysRemaining}g`
                    : 'Attivo'
                  : 'Scaduto'}
              </Badge>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Validità</Text>
                <Text style={styles.detailValue}>
                  {formatDate(item.validFrom)} - {formatDate(item.validTo)}
                </Text>
              </View>
              
              {item.totalEntries && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Ingressi</Text>
                  <View style={styles.entriesContainer}>
                    <Text style={styles.entriesUsed}>{item.entriesUsed}</Text>
                    <Text style={styles.entriesSeparator}>/</Text>
                    <Text style={styles.entriesTotal}>{item.totalEntries}</Text>
                    {entriesRemaining !== null && entriesRemaining <= 3 && entriesRemaining > 0 && (
                      <Badge variant="warning" style={styles.entriesBadge}>
                        {entriesRemaining} rimasti
                      </Badge>
                    )}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.benefitsList}>
              {item.benefits.map((benefit, i) => (
                <View key={i} style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={16} color={staticColors.success} />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            <View style={styles.cardFooter}>
              <Ionicons name="chevron-forward" size={20} color={staticColors.mutedForeground} />
            </View>
          </Card>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-subscriptions" />

      <View style={styles.tabs}>
        <Pressable
          onPress={() => {
            triggerHaptic('selection');
            setActiveTab('active');
          }}
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Attivi
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            triggerHaptic('selection');
            setActiveTab('expired');
          }}
          style={[styles.tab, activeTab === 'expired' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'expired' && styles.tabTextActive]}>
            Scaduti
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredSubscriptions.length > 0 ? (
          filteredSubscriptions.map((item, index) => renderSubscription(item, index))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color={staticColors.mutedForeground} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'active'
                ? 'Nessun abbonamento attivo'
                : 'Nessun abbonamento scaduto'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'active'
                ? 'Scopri gli abbonamenti disponibili presso i tuoi locali preferiti'
                : 'Gli abbonamenti scaduti appariranno qui'}
            </Text>
            {activeTab === 'active' && (
              <Button
                variant="golden"
                onPress={onExploreSubscriptions}
                style={styles.emptyButton}
                testID="button-explore"
              >
                Esplora Abbonamenti
              </Button>
            )}
          </View>
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
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
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  subscriptionCard: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  venueName: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  cardDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  entriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  entriesUsed: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.primary,
  },
  entriesSeparator: {
    fontSize: typography.fontSize.lg,
    color: staticColors.mutedForeground,
  },
  entriesTotal: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  entriesBadge: {
    marginLeft: spacing.xs,
  },
  benefitsList: {
    gap: spacing.xs,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  cardFooter: {
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyButton: {
    marginTop: spacing.lg,
  },
});

export default SubscriptionsScreen;
