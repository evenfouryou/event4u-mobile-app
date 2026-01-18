import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Button, Header } from '../../components';

interface LoyaltySettings {
  enabled: boolean;
  pointsPerEuro: number;
  minRedemption: number;
  pointsExpireDays: number;
  welcomeBonus: number;
}

interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  multiplier: number;
  color: string;
  benefits: string[];
  membersCount: number;
}

interface PointsRule {
  id: string;
  name: string;
  description: string;
  type: 'earn' | 'spend';
  points: number;
  enabled: boolean;
  conditions?: string;
}

interface LoyaltyStats {
  totalMembers: number;
  activeMembers: number;
  pointsIssued: number;
  pointsRedeemed: number;
  averageBalance: number;
}

export default function LoyaltyAdminScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<PointsRule | null>(null);

  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    type: 'earn' as const,
    points: 0,
  });

  const { data: settings, refetch: refetchSettings } = useQuery<LoyaltySettings>({
    queryKey: ['/api/marketing/loyalty/settings'],
  });

  const { data: tiers, refetch: refetchTiers } = useQuery<LoyaltyTier[]>({
    queryKey: ['/api/marketing/loyalty/tiers'],
  });

  const { data: rules, refetch: refetchRules } = useQuery<PointsRule[]>({
    queryKey: ['/api/marketing/loyalty/rules'],
  });

  const { data: stats, refetch: refetchStats } = useQuery<LoyaltyStats>({
    queryKey: ['/api/marketing/loyalty/stats'],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<LoyaltySettings>) => {
      return fetch('/api/marketing/loyalty/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/loyalty/settings'] });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) => {
      return fetch(`/api/marketing/loyalty/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/loyalty/rules'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchSettings(), refetchTiers(), refetchRules(), refetchStats()]);
    setRefreshing(false);
  }, [refetchSettings, refetchTiers, refetchRules, refetchStats]);

  const mockSettings: LoyaltySettings = settings || {
    enabled: true,
    pointsPerEuro: 10,
    minRedemption: 100,
    pointsExpireDays: 365,
    welcomeBonus: 50,
  };

  const mockTiers: LoyaltyTier[] = tiers || [
    { id: '1', name: 'Bronze', minPoints: 0, multiplier: 1, color: '#CD7F32', benefits: ['Accesso base', '1 punto per euro'], membersCount: 450 },
    { id: '2', name: 'Silver', minPoints: 500, multiplier: 1.5, color: '#C0C0C0', benefits: ['1.5x punti', 'Early access eventi', 'Skip the line'], membersCount: 180 },
    { id: '3', name: 'Gold', minPoints: 1500, multiplier: 2, color: colors.primary, benefits: ['2x punti', 'VIP lounge access', 'Drink omaggio'], membersCount: 45 },
    { id: '4', name: 'Platinum', minPoints: 5000, multiplier: 3, color: '#E5E4E2', benefits: ['3x punti', 'Tavolo riservato', 'Personal concierge'], membersCount: 12 },
  ];

  const mockRules: PointsRule[] = rules || [
    { id: '1', name: 'Acquisto Biglietto', description: 'Guadagna punti per ogni acquisto', type: 'earn', points: 10, enabled: true, conditions: 'Per ogni euro speso' },
    { id: '2', name: 'Check-in Evento', description: 'Bonus punti al check-in', type: 'earn', points: 50, enabled: true },
    { id: '3', name: 'Compleanno', description: 'Punti bonus nel giorno del compleanno', type: 'earn', points: 100, enabled: true },
    { id: '4', name: 'Recensione', description: 'Punti per recensione verificata', type: 'earn', points: 25, enabled: false },
    { id: '5', name: 'Sconto Biglietto', description: 'Scambia punti per sconto', type: 'spend', points: 100, enabled: true, conditions: '€5 di sconto' },
    { id: '6', name: 'Drink Omaggio', description: 'Riscatta un drink gratis', type: 'spend', points: 200, enabled: true },
  ];

  const mockStats: LoyaltyStats = stats || {
    totalMembers: 687,
    activeMembers: 420,
    pointsIssued: 156000,
    pointsRedeemed: 45000,
    averageBalance: 162,
  };

  const renderTierCard = (tier: LoyaltyTier) => (
    <TouchableOpacity
      key={tier.id}
      onPress={() => navigation.navigate('EditTier', { tierId: tier.id })}
      activeOpacity={0.8}
      data-testid={`card-tier-${tier.id}`}
    >
      <Card variant="glass" style={styles.tierCard}>
        <View style={styles.tierHeader}>
          <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
            <Ionicons name="ribbon" size={20} color={colors.background} />
          </View>
          <View style={styles.tierInfo}>
            <Text style={styles.tierName}>{tier.name}</Text>
            <Text style={styles.tierRequirement}>
              {tier.minPoints === 0 ? 'Livello base' : `${tier.minPoints.toLocaleString()}+ punti`}
            </Text>
          </View>
          <View style={styles.tierMeta}>
            <Text style={styles.tierMultiplier}>{tier.multiplier}x</Text>
            <Text style={styles.tierMembers}>{tier.membersCount} membri</Text>
          </View>
        </View>
        <View style={styles.benefitsList}>
          {tier.benefits.slice(0, 3).map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={14} color={tier.color} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderRuleCard = (rule: PointsRule) => (
    <Card key={rule.id} variant="glass" style={styles.ruleCard}>
      <View style={styles.ruleHeader}>
        <View style={[
          styles.ruleTypeIcon,
          { backgroundColor: rule.type === 'earn' ? `${colors.teal}20` : `${colors.primary}20` }
        ]}>
          <Ionicons
            name={rule.type === 'earn' ? 'add-circle' : 'remove-circle'}
            size={20}
            color={rule.type === 'earn' ? colors.teal : colors.primary}
          />
        </View>
        <View style={styles.ruleInfo}>
          <Text style={styles.ruleName}>{rule.name}</Text>
          <Text style={styles.ruleDescription}>{rule.description}</Text>
          {rule.conditions && (
            <Text style={styles.ruleConditions}>{rule.conditions}</Text>
          )}
        </View>
        <View style={styles.ruleRight}>
          <Text style={[styles.rulePoints, { color: rule.type === 'earn' ? colors.teal : colors.primary }]}>
            {rule.type === 'earn' ? '+' : '-'}{rule.points}
          </Text>
          <Switch
            value={rule.enabled}
            onValueChange={(value) => toggleRuleMutation.mutate({ ruleId: rule.id, enabled: value })}
            trackColor={{ false: colors.surface, true: `${colors.teal}50` }}
            thumbColor={rule.enabled ? colors.teal : colors.mutedForeground}
          />
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Programma Fedeltà"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('LoyaltySettings')}
            data-testid="button-settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.section}>
          <Card variant="glass" style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Programma Fedeltà</Text>
              <Switch
                value={mockSettings.enabled}
                onValueChange={(value) => updateSettingsMutation.mutate({ enabled: value })}
                trackColor={{ false: colors.surface, true: `${colors.teal}50` }}
                thumbColor={mockSettings.enabled ? colors.teal : colors.mutedForeground}
              />
            </View>
            <View style={styles.quickSettings}>
              <View style={styles.quickSettingItem}>
                <Text style={styles.quickSettingLabel}>Punti/€</Text>
                <Text style={styles.quickSettingValue}>{mockSettings.pointsPerEuro}</Text>
              </View>
              <View style={styles.quickSettingItem}>
                <Text style={styles.quickSettingLabel}>Min. Riscatto</Text>
                <Text style={styles.quickSettingValue}>{mockSettings.minRedemption}</Text>
              </View>
              <View style={styles.quickSettingItem}>
                <Text style={styles.quickSettingLabel}>Scadenza</Text>
                <Text style={styles.quickSettingValue}>{mockSettings.pointsExpireDays}g</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiche</Text>
          <View style={styles.statsGrid}>
            <Card variant="glass" style={styles.statCard}>
              <Text style={styles.statValue}>{mockStats.totalMembers}</Text>
              <Text style={styles.statLabel}>Membri Totali</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.teal }]}>{mockStats.activeMembers}</Text>
              <Text style={styles.statLabel}>Attivi (30g)</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {mockStats.pointsIssued.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Punti Emessi</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <Text style={styles.statValue}>{mockStats.pointsRedeemed.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Punti Riscattati</Text>
            </Card>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Livelli</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddTier')}
              data-testid="button-add-tier"
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {mockTiers.map(renderTierCard)}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Regole Punti</Text>
            <TouchableOpacity
              onPress={() => setShowRuleModal(true)}
              data-testid="button-add-rule"
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.ruleTypeFilter}>
            <View style={styles.ruleTypeItem}>
              <View style={[styles.ruleTypeDot, { backgroundColor: colors.teal }]} />
              <Text style={styles.ruleTypeLabel}>Guadagna</Text>
            </View>
            <View style={styles.ruleTypeItem}>
              <View style={[styles.ruleTypeDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.ruleTypeLabel}>Riscatta</Text>
            </View>
          </View>

          {mockRules.map(renderRuleCard)}
        </View>
      </ScrollView>

      <Modal
        visible={showRuleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRuleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuova Regola</Text>
              <TouchableOpacity onPress={() => setShowRuleModal(false)} data-testid="button-close-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.ruleTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.ruleTypeSelectorItem,
                  newRule.type === 'earn' && styles.ruleTypeSelectorItemActive,
                ]}
                onPress={() => setNewRule({ ...newRule, type: 'earn' })}
                data-testid="type-earn"
              >
                <Ionicons
                  name="add-circle"
                  size={20}
                  color={newRule.type === 'earn' ? colors.teal : colors.mutedForeground}
                />
                <Text style={[
                  styles.ruleTypeSelectorText,
                  newRule.type === 'earn' && { color: colors.teal },
                ]}>
                  Guadagna
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ruleTypeSelectorItem,
                  newRule.type === 'spend' && styles.ruleTypeSelectorItemActiveSpend,
                ]}
                onPress={() => setNewRule({ ...newRule, type: 'spend' })}
                data-testid="type-spend"
              >
                <Ionicons
                  name="remove-circle"
                  size={20}
                  color={newRule.type === 'spend' ? colors.primary : colors.mutedForeground}
                />
                <Text style={[
                  styles.ruleTypeSelectorText,
                  newRule.type === 'spend' && { color: colors.primary },
                ]}>
                  Riscatta
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nome Regola</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Es: Bonus Check-in"
                placeholderTextColor={colors.mutedForeground}
                value={newRule.name}
                onChangeText={(text) => setNewRule({ ...newRule, name: text })}
                data-testid="input-rule-name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Descrizione</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMultiline]}
                placeholder="Descrivi quando si applica questa regola"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                value={newRule.description}
                onChangeText={(text) => setNewRule({ ...newRule, description: text })}
                data-testid="input-rule-description"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Punti</Text>
              <TextInput
                style={styles.formInput}
                placeholder="100"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                value={newRule.points.toString()}
                onChangeText={(text) => setNewRule({ ...newRule, points: parseInt(text) || 0 })}
                data-testid="input-points"
              />
            </View>

            <Button
              onPress={() => {
                Alert.alert('Successo', 'Regola creata!');
                setShowRuleModal(false);
                setNewRule({ name: '', description: '', type: 'earn', points: 0 });
              }}
              disabled={!newRule.name || !newRule.points}
              data-testid="button-create-rule"
            >
              <Text style={styles.buttonText}>Crea Regola</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusCard: {
    paddingVertical: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  statusLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  quickSettings: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickSettingItem: {
    alignItems: 'center',
  },
  quickSettingLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  quickSettingValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  tierCard: {
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tierBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  tierRequirement: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  tierMeta: {
    alignItems: 'flex-end',
  },
  tierMultiplier: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  tierMembers: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
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
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  ruleTypeFilter: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  ruleTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ruleTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ruleTypeLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  ruleCard: {
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  ruleDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  ruleConditions: {
    color: colors.primary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  ruleRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  rulePoints: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  ruleTypeSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  ruleTypeSelectorItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  ruleTypeSelectorItemActive: {
    borderColor: colors.teal,
    backgroundColor: `${colors.teal}10`,
  },
  ruleTypeSelectorItemActiveSpend: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  ruleTypeSelectorText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
