import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Modal, TextInput, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAETicketType } from '@/lib/api';

interface GestoreSIAETicketTypesScreenProps {
  onBack: () => void;
}

interface TicketTypeForm {
  name: string;
  price: string;
  siaeCode: string;
  available: string;
  category: string;
  isActive: boolean;
}

const initialForm: TicketTypeForm = {
  name: '',
  price: '',
  siaeCode: '',
  available: '',
  category: '',
  isActive: true,
};

export function GestoreSIAETicketTypesScreen({ onBack }: GestoreSIAETicketTypesScreenProps) {
  const { colors } = useTheme();
  const [ticketTypes, setTicketTypes] = useState<SIAETicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<SIAETicketType | null>(null);
  const [form, setForm] = useState<TicketTypeForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [showEventPicker, setShowEventPicker] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadTicketTypes();
    }
  }, [selectedEventId]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadEvents = async () => {
    try {
      const siaeEvents = await api.getSIAEEvents();
      const eventList = siaeEvents.map(e => ({ id: e.eventId, name: e.eventName }));
      setEvents(eventList);
      if (eventList.length > 0 && !selectedEventId) {
        setSelectedEventId(eventList[0].id);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadTicketTypes = async () => {
    if (!selectedEventId) return;
    try {
      setIsLoading(true);
      const data = await api.getSIAETicketTypes(selectedEventId);
      setTicketTypes(data);
    } catch (error) {
      console.error('Error loading ticket types:', error);
      setTicketTypes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTicketTypes();
    setRefreshing(false);
  };

  const handleOpenModal = (ticketType?: SIAETicketType) => {
    if (ticketType) {
      setEditingType(ticketType);
      setForm({
        name: ticketType.name,
        price: ticketType.price.toString(),
        siaeCode: ticketType.siaeCode,
        available: ticketType.available.toString(),
        category: ticketType.category,
        isActive: ticketType.isActive,
      });
    } else {
      setEditingType(null);
      setForm(initialForm);
    }
    setShowModal(true);
    triggerHaptic('light');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || !form.siaeCode.trim()) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: parseFloat(form.price),
        siaeCode: form.siaeCode.trim(),
        available: parseInt(form.available) || 0,
        category: form.category.trim(),
        isActive: form.isActive,
      };

      if (editingType) {
        await api.updateSIAETicketType(selectedEventId, editingType.id, payload);
      } else {
        await api.createSIAETicketType(selectedEventId, payload);
      }

      triggerHaptic('success');
      setShowModal(false);
      await loadTicketTypes();
    } catch (error) {
      console.error('Error saving ticket type:', error);
      triggerHaptic('error');
      Alert.alert('Errore', 'Impossibile salvare il tipo biglietto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (ticketType: SIAETicketType) => {
    Alert.alert(
      'Elimina Tipo Biglietto',
      `Sei sicuro di voler eliminare "${ticketType.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteSIAETicketType(selectedEventId, ticketType.id);
              triggerHaptic('success');
              await loadTicketTypes();
            } catch (error) {
              console.error('Error deleting ticket type:', error);
              triggerHaptic('error');
              Alert.alert('Errore', 'Impossibile eliminare il tipo biglietto');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (ticketType: SIAETicketType) => {
    try {
      await api.updateSIAETicketType(selectedEventId, ticketType.id, {
        isActive: !ticketType.isActive,
      });
      triggerHaptic('selection');
      await loadTicketTypes();
    } catch (error) {
      console.error('Error toggling active:', error);
      triggerHaptic('error');
    }
  };

  const formatPrice = (price: number) => {
    return `€${price.toFixed(2)}`;
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const renderTicketType = ({ item }: { item: SIAETicketType }) => (
    <Card style={styles.ticketCard} testID={`ticket-type-${item.id}`}>
      <View style={styles.ticketHeader}>
        <View style={styles.ticketInfo}>
          <View style={styles.ticketTitleRow}>
            <Text style={styles.ticketName}>{item.name}</Text>
            <Badge variant={item.isActive ? 'success' : 'secondary'}>
              {item.isActive ? 'Attivo' : 'Inattivo'}
            </Badge>
          </View>
          <Text style={styles.ticketCategory}>{item.category}</Text>
        </View>
        <Text style={styles.ticketPrice}>{formatPrice(item.price)}</Text>
      </View>

      <View style={styles.ticketDivider} />

      <View style={styles.ticketDetails}>
        <View style={styles.ticketDetailItem}>
          <Text style={styles.ticketDetailLabel}>Codice SIAE</Text>
          <Text style={styles.ticketDetailValue}>{item.siaeCode}</Text>
        </View>
        <View style={styles.ticketDetailItem}>
          <Text style={styles.ticketDetailLabel}>Quantità</Text>
          <Text style={styles.ticketDetailValue}>{item.available + item.sold}</Text>
        </View>
        <View style={styles.ticketDetailItem}>
          <Text style={styles.ticketDetailLabel}>Venduti</Text>
          <Text style={[styles.ticketDetailValue, { color: staticColors.success }]}>
            {item.sold}
          </Text>
        </View>
        <View style={styles.ticketDetailItem}>
          <Text style={styles.ticketDetailLabel}>Disponibili</Text>
          <Text style={[styles.ticketDetailValue, { color: staticColors.primary }]}>
            {item.available}
          </Text>
        </View>
      </View>

      <View style={styles.ticketActions}>
        <Pressable
          style={styles.actionButton}
          onPress={() => handleToggleActive(item)}
          testID={`toggle-active-${item.id}`}
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
          testID={`edit-ticket-${item.id}`}
        >
          <Ionicons name="pencil-outline" size={22} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
          testID={`delete-ticket-${item.id}`}
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
        <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingType ? 'Modifica Tipo Biglietto' : 'Nuovo Tipo Biglietto'}
            </Text>
            <Pressable onPress={() => setShowModal(false)} testID="button-close-modal">
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Nome *</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                value={form.name}
                onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
                placeholder="es. Intero, Ridotto, VIP"
                placeholderTextColor={colors.mutedForeground}
                testID="input-name"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Prezzo *</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                  value={form.price}
                  onChangeText={(text) => setForm(prev => ({ ...prev, price: text }))}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                  testID="input-price"
                />
              </View>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Quantità</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                  value={form.available}
                  onChangeText={(text) => setForm(prev => ({ ...prev, available: text }))}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  testID="input-available"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Codice SIAE *</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                value={form.siaeCode}
                onChangeText={(text) => setForm(prev => ({ ...prev, siaeCode: text }))}
                placeholder="es. A1, B2, INT"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                testID="input-siae-code"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Categoria</Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
                value={form.category}
                onChangeText={(text) => setForm(prev => ({ ...prev, category: text }))}
                placeholder="es. Standard, Premium"
                placeholderTextColor={colors.mutedForeground}
                testID="input-category"
              />
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
              {isSaving ? 'Salvataggio...' : (editingType ? 'Salva' : 'Crea')}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderEventPicker = () => (
    <Modal
      visible={showEventPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEventPicker(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowEventPicker(false)}>
        <View style={[styles.eventPickerContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleziona Evento</Text>
            <Pressable onPress={() => setShowEventPicker(false)} testID="button-close-event-picker">
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.eventOption,
                  item.id === selectedEventId && styles.eventOptionSelected,
                ]}
                onPress={() => {
                  setSelectedEventId(item.id);
                  setShowEventPicker(false);
                  triggerHaptic('selection');
                }}
                testID={`event-option-${item.id}`}
              >
                <Text style={[
                  styles.eventOptionText,
                  item.id === selectedEventId && styles.eventOptionTextSelected,
                ]}>
                  {item.name}
                </Text>
                {item.id === selectedEventId && (
                  <Ionicons name="checkmark" size={20} color={staticColors.primary} />
                )}
              </Pressable>
            )}
          />
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-ticket-types"
      />

      <View style={styles.titleContainer}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Tipi Biglietto</Text>
            <Pressable
              style={styles.eventSelector}
              onPress={() => {
                triggerHaptic('light');
                setShowEventPicker(true);
              }}
              testID="button-select-event"
            >
              <Text style={styles.eventSelectorText} numberOfLines={1}>
                {selectedEvent?.name || 'Seleziona evento'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Button
            variant="default"
            size="sm"
            onPress={() => handleOpenModal()}
            testID="button-add-ticket-type"
          >
            <Ionicons name="add" size={18} color={staticColors.primaryForeground} />
            <Text style={styles.addButtonText}>Aggiungi</Text>
          </Button>
        </View>
      </View>

      {showLoader ? (
        <Loading text="Caricamento tipi biglietto..." />
      ) : ticketTypes.length > 0 ? (
        <FlatList
          data={ticketTypes}
          renderItem={renderTicketType}
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
          <Ionicons name="pricetag-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessun tipo biglietto</Text>
          <Text style={styles.emptyText}>
            Aggiungi i tipi di biglietto per questo evento
          </Text>
          <Button
            variant="default"
            onPress={() => handleOpenModal()}
            style={styles.emptyButton}
            testID="button-add-first-type"
          >
            Aggiungi Tipo Biglietto
          </Button>
        </View>
      )}

      {renderModal()}
      {renderEventPicker()}
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
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  eventSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  eventSelectorText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
    maxWidth: 180,
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
    marginLeft: 4,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  ticketCard: {
    padding: spacing.md,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketInfo: {
    flex: 1,
  },
  ticketTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  ticketName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  ticketCategory: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  ticketPrice: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  ticketDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ticketDetailItem: {
    alignItems: 'center',
    minWidth: '22%',
  },
  ticketDetailLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: 2,
  },
  ticketDetailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  ticketActions: {
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
  eventPickerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '60%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  eventOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  eventOptionSelected: {
    backgroundColor: `${staticColors.primary}15`,
  },
  eventOptionText: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
    flex: 1,
  },
  eventOptionTextSelected: {
    fontWeight: '600',
    color: staticColors.primary,
  },
});

export default GestoreSIAETicketTypesScreen;
