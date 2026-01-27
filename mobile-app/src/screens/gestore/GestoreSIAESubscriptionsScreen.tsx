import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAESubscription } from '@/lib/api';

interface GestoreSIAESubscriptionsScreenProps {
  onBack: () => void;
}

interface SubscriptionForm {
  name: string;
  price: string;
  validFrom: string;
  validTo: string;
  eventsIncluded: string;
  isActive: boolean;
}

const initialForm: SubscriptionForm = {
  name: '',
  price: '',
  validFrom: '',
  validTo: '',
  eventsIncluded: '',
  isActive: true,
};

export function GestoreSIAESubscriptionsScreen({ onBack }: GestoreSIAESubscriptionsScreenProps) {
  const { colors } = useTheme();
  const [subscriptions, setSubscriptions] = useState<SIAESubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SIAESubscription | null>(null);
  const [form, setForm] = useState<SubscriptionForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSubscriptions();
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

  const loadSubscriptions = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAESubscriptions();
      setSubscriptions(data);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setSubscriptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
    setRefreshing(false);
  };

  const handleOpenModal = (subscription?: SIAESubscription) => {
    if (subscription) {
      setEditingSubscription(subscription);
      setForm({
        name: subscription.name,
        price: subscription.price.toString(),
        validFrom: subscription.validFrom,
        validTo: subscription.validTo,
        eventsIncluded: subscription.eventsIncluded.toString(),
        isActive: subscription.isActive,
      });
    } else {
      setEditingSubscription(null);
      setForm(initialForm);
    }
    setShowModal(true);
    triggerHaptic('light');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || !form.validFrom || !form.validTo) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: parseFloat(form.price),
        validFrom: form.validFrom,
        validTo: form.validTo,
        eventsIncluded: parseInt(form.eventsIncluded) || 0,
        isActive: form.isActive,
      };

      if (editingSubscription) {
        await api.updateSIAESubscription(editingSubscription.id, payload);
      } else {
        await api.createSIAESubscription(payload);
      }

      triggerHaptic('success');
      setShowModal(false);
      await loadSubscriptions();
    } catch (error) {
      console.error('Error saving subscription:', error);
      triggerHaptic('error');
      Alert.alert('Errore', 'Impossibile salvare l\'abbonamento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (subscription: SIAESubscription) => {
    Alert.alert(
      'Elimina Abbonamento',
      `Sei sicuro di voler eliminare "${subscription.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteSIAESubscription(subscription.id);
              triggerHaptic('success');
              await loadSubscriptions();
            } catch (error) {
              console.error('Error deleting subscription:', error);
              triggerHaptic('error');
              Alert.alert('Errore', 'Impossibile eliminare l\'abbonamento');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (subscription: SIAESubscription) => {
    try {
      await api.updateSIAESubscription(subscription.id, {
        isActive: !subscription.isActive,
      });
      triggerHaptic('selection');
      await loadSubscriptions();
    } catch (error) {
      console.error('Error toggling active:', error);
      triggerHaptic('error');
    }
  };

  const formatPrice = (price: number) => {
    return `€${price.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const totalRevenue = subscriptions.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalSubscribers = subscriptions.reduce((sum, s) => sum + s.subscribersCount, 0);
  const activeCount = subscriptions.filter(s => s.isActive).length;

  const renderSubscription = ({ item }: { item: SIAESubscription }) => (
    <Card style={styles.subscriptionCard} testID={`subscription-${item.id}`}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.subscriptionName}>{item.name}</Text>
            <Badge variant={item.isActive ? 'success' : 'secondary'}>
              {item.isActive ? 'Attivo' : 'Inattivo'}
            </Badge>
          </View>
          <Text style={styles.validityText}>
            Validità: {formatDate(item.validFrom)} - {formatDate(item.validTo)}
          </Text>
        </View>
        <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Eventi Inclusi</Text>
          <Text style={styles.statValue}>{item.eventsIncluded}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Abbonati</Text>
          <Text style={[styles.statValue, { color: staticColors.teal }]}>
            {item.subscribersCount}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ricavi</Text>
          <Text style={[styles.statValue, { color: staticColors.primary }]}>
            {formatPrice(item.totalRevenue)}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <Pressable
          style={styles.actionButton}
          onPress={() => handleToggleActive(item)}
          testID={`toggle-${item.id}`}
        >
          <Ionicons
            name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
            size={22}
            color={colors.mutedForeground}
          />
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => handleOpenModal(item)}
          testID={`edit-${item.id}`}
        >
          <Ionicons name="pencil-outline" size={22} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
          testID={`delete-${item.id}`}
        >
          <Ionicons name="trash-outline" size={22} color={staticColors.destructive} />
        </Pressable>
      </View>
    </Card>
  );

  const renderModal = () => (
    <Modal
      visible={showModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowModal(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
        <Pressable style={{...styles.modalContent, backgroundColor: colors.card}} onPress={e => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingSubscription ? 'Modifica Abbonamento' : 'Nuovo Abbonamento'}
            </Text>
            <Pressable onPress={() => setShowModal(false)} testID="button-close-modal">
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Nome *</Text>
              <TextInput
                style={{...styles.textInput, color: colors.foreground, borderColor: colors.border}}
                value={form.name}
                onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
                placeholder="es. Abbonamento Stagionale"
                placeholderTextColor={colors.mutedForeground}
                testID="input-name"
              />
            </View>

            <View style={styles.formRow}>
              <View style={{...styles.formField, flex: 1}}>
                <Text style={styles.formLabel}>Prezzo *</Text>
                <TextInput
                  style={{...styles.textInput, color: colors.foreground, borderColor: colors.border}}
                  value={form.price}
                  onChangeText={(text) => setForm(prev => ({ ...prev, price: text }))}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                  testID="input-price"
                />
              </View>
              <View style={{...styles.formField, flex: 1}}>
                <Text style={styles.formLabel}>Eventi Inclusi</Text>
                <TextInput
                  style={{...styles.textInput, color: colors.foreground, borderColor: colors.border}}
                  value={form.eventsIncluded}
                  onChangeText={(text) => setForm(prev => ({ ...prev, eventsIncluded: text }))}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  testID="input-events"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={{...styles.formField, flex: 1}}>
                <Text style={styles.formLabel}>Valido Dal *</Text>
                <TextInput
                  style={{...styles.textInput, color: colors.foreground, borderColor: colors.border}}
                  value={form.validFrom}
                  onChangeText={(text) => setForm(prev => ({ ...prev, validFrom: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  testID="input-valid-from"
                />
              </View>
              <View style={{...styles.formField, flex: 1}}>
                <Text style={styles.formLabel}>Valido Fino *</Text>
                <TextInput
                  style={{...styles.textInput, color: colors.foreground, borderColor: colors.border}}
                  value={form.validTo}
                  onChangeText={(text) => setForm(prev => ({ ...prev, validTo: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  testID="input-valid-to"
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>Attivo</Text>
              <Switch
                value={form.isActive}
                onValueChange={(value) => setForm(prev => ({ ...prev, isActive: value }))}
                trackColor={{ false: colors.border, true: staticColors.primary }}
                thumbColor={form.isActive ? '#FFFFFF' : '#f4f3f4'}
                testID="switch-active"
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <Button
              variant="outline"
              onPress={() => setShowModal(false)}
              style={styles.footerButton}
              testID="button-cancel"
            >
              Annulla
            </Button>
            <Button
              variant="default"
              onPress={handleSave}
              disabled={isSaving}
              style={styles.footerButton}
              testID="button-save"
            >
              {isSaving ? 'Salvataggio...' : (editingSubscription ? 'Salva' : 'Crea')}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-subscriptions"
      />

      <View style={styles.titleContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Abbonamenti SIAE</Text>
          <Button
            variant="default"
            size="sm"
            onPress={() => handleOpenModal()}
            testID="button-add-subscription"
          >
            <Ionicons name="add" size={18} color={staticColors.primaryForeground} />
            <Text style={styles.addButtonText}>Nuovo</Text>
          </Button>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <GlassCard style={styles.statCard} testID="stat-total-revenue">
          <View style={{...styles.statIcon, backgroundColor: `${staticColors.primary}20`}}>
            <Ionicons name="cash" size={20} color={staticColors.primary} />
          </View>
          <Text style={styles.statCardValue}>{formatPrice(totalRevenue)}</Text>
          <Text style={styles.statCardLabel}>Ricavi Totali</Text>
        </GlassCard>

        <GlassCard style={styles.statCard} testID="stat-subscribers">
          <View style={{...styles.statIcon, backgroundColor: `${staticColors.teal}20`}}>
            <Ionicons name="people" size={20} color={staticColors.teal} />
          </View>
          <Text style={styles.statCardValue}>{totalSubscribers}</Text>
          <Text style={styles.statCardLabel}>Abbonati</Text>
        </GlassCard>

        <GlassCard style={styles.statCard} testID="stat-active">
          <View style={{...styles.statIcon, backgroundColor: `${staticColors.success}20`}}>
            <Ionicons name="checkmark-circle" size={20} color={staticColors.success} />
          </View>
          <Text style={styles.statCardValue}>{activeCount}</Text>
          <Text style={styles.statCardLabel}>Attivi</Text>
        </GlassCard>
      </View>

      {showLoader ? (
        <Loading text="Caricamento abbonamenti..." />
      ) : subscriptions.length > 0 ? (
        <FlatList
          data={subscriptions}
          renderItem={renderSubscription}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessun abbonamento</Text>
          <Text style={styles.emptyText}>
            Crea il tuo primo pacchetto abbonamento
          </Text>
          <Button
            variant="default"
            onPress={() => handleOpenModal()}
            style={styles.emptyButton}
            testID="button-add-first"
          >
            Crea Abbonamento
          </Button>
        </View>
      )}

      {renderModal()}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statCardValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statCardLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: 2,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  subscriptionCard: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  subscriptionName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  validityText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 4,
  },
  priceText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: 2,
  },
  statValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  actionButton: {
    padding: spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyButton: {
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  formContainer: {
    gap: spacing.md,
  },
  formField: {
    gap: spacing.xs,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  footerButton: {
    flex: 1,
  },
});

export default GestoreSIAESubscriptionsScreen;
