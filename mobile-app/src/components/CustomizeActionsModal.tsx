import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/Button';
import { triggerHaptic } from '@/lib/haptics';
import { 
  ClientQuickAction, 
  PrQuickAction,
  getClientQuickActions,
  setClientQuickActions,
  getPrQuickActions,
  setPrQuickActions,
} from '@/lib/storage';

interface ActionOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CLIENT_ACTION_OPTIONS: ActionOption[] = [
  { id: 'buy-tickets', label: 'Acquista Biglietti', icon: 'ticket-outline' },
  { id: 'my-qr', label: 'I miei QR', icon: 'qr-code-outline' },
  { id: 'wallet', label: 'Ricarica Wallet', icon: 'wallet-outline' },
  { id: 'resell', label: 'Rivendi Biglietti', icon: 'swap-horizontal-outline' },
  { id: 'pr-area', label: 'Area PR', icon: 'people-outline' },
  { id: 'scanner-area', label: 'Area Scanner', icon: 'scan' },
  { id: 'events', label: 'Esplora Eventi', icon: 'calendar-outline' },
  { id: 'profile', label: 'Profilo', icon: 'person-outline' },
];

const PR_ACTION_OPTIONS: ActionOption[] = [
  { id: 'events', label: 'Eventi', icon: 'calendar' },
  { id: 'lists', label: 'Liste Ospiti', icon: 'people' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet' },
  { id: 'profile', label: 'Profilo', icon: 'person' },
  { id: 'client-switch', label: 'Account Cliente', icon: 'swap-horizontal' },
];

interface CustomizeActionsModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'client' | 'pr';
  hasPrAccount?: boolean;
  hasScannerAccess?: boolean;
  onSave?: () => void;
}

export function CustomizeActionsModal({
  visible,
  onClose,
  mode,
  hasPrAccount = false,
  hasScannerAccess = false,
  onSave,
}: CustomizeActionsModalProps) {
  const { colors } = useTheme();
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const actionOptions = mode === 'client' 
    ? CLIENT_ACTION_OPTIONS.filter(a => {
        if (a.id === 'pr-area' && !hasPrAccount) return false;
        if (a.id === 'scanner-area' && !hasScannerAccess) return false;
        return true;
      })
    : PR_ACTION_OPTIONS;

  useEffect(() => {
    if (visible) {
      loadActions();
    }
  }, [visible, mode]);

  const loadActions = async () => {
    if (mode === 'client') {
      const actions = await getClientQuickActions();
      setSelectedActions(actions);
    } else {
      const actions = await getPrQuickActions();
      setSelectedActions(actions);
    }
  };

  const toggleAction = (actionId: string) => {
    triggerHaptic('light');
    setSelectedActions(prev => {
      if (prev.includes(actionId)) {
        if (prev.length <= 2) {
          return prev;
        }
        return prev.filter(id => id !== actionId);
      } else {
        if (prev.length >= 4) {
          return prev;
        }
        return [...prev, actionId];
      }
    });
  };

  const moveAction = (actionId: string, direction: 'up' | 'down') => {
    triggerHaptic('light');
    setSelectedActions(prev => {
      const index = prev.indexOf(actionId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newActions = [...prev];
      [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
      return newActions;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (mode === 'client') {
        await setClientQuickActions(selectedActions as ClientQuickAction[]);
      } else {
        await setPrQuickActions(selectedActions as PrQuickAction[]);
      }
      triggerHaptic('success');
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error saving actions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>Personalizza Azioni</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Seleziona da 2 a 4 azioni da mostrare nella home. Usa le frecce per riordinare.
          </Text>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Azioni Selezionate ({selectedActions.length}/4)</Text>
            {selectedActions.map((actionId, index) => {
              const action = actionOptions.find(a => a.id === actionId);
              if (!action) return null;
              return (
                <View key={actionId} style={[styles.selectedItem, { backgroundColor: colors.background, borderColor: `${colors.primary}30` }]}>
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
                      <Ionicons name={action.icon} size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.itemLabel, { color: colors.foreground }]}>{action.label}</Text>
                  </View>
                  <View style={styles.itemActions}>
                    <Pressable
                      onPress={() => moveAction(actionId, 'up')}
                      style={[styles.arrowButton, index === 0 && styles.arrowDisabled]}
                      disabled={index === 0}
                    >
                      <Ionicons name="chevron-up" size={20} color={index === 0 ? colors.muted : colors.foreground} />
                    </Pressable>
                    <Pressable
                      onPress={() => moveAction(actionId, 'down')}
                      style={[styles.arrowButton, index === selectedActions.length - 1 && styles.arrowDisabled]}
                      disabled={index === selectedActions.length - 1}
                    >
                      <Ionicons name="chevron-down" size={20} color={index === selectedActions.length - 1 ? colors.muted : colors.foreground} />
                    </Pressable>
                    <Pressable
                      onPress={() => toggleAction(actionId)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="remove-circle" size={24} color={colors.destructive} />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <Text style={[styles.sectionTitle, { marginTop: spacing.lg, color: colors.mutedForeground }]}>Azioni Disponibili</Text>
            {actionOptions
              .filter(a => !selectedActions.includes(a.id))
              .map(action => (
                <Pressable
                  key={action.id}
                  style={[styles.availableItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => toggleAction(action.id)}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconCircle, styles.iconCircleInactive, { backgroundColor: `${colors.muted}30` }]}>
                      <Ionicons name={action.icon} size={20} color={colors.mutedForeground} />
                    </View>
                    <Text style={[styles.itemLabelInactive, { color: colors.mutedForeground }]}>{action.label}</Text>
                  </View>
                  <Ionicons 
                    name="add-circle" 
                    size={24} 
                    color={selectedActions.length >= 4 ? colors.muted : colors.teal} 
                  />
                </Pressable>
              ))}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              variant="ghost"
              onPress={onClose}
              style={styles.cancelButton}
            >
              Annulla
            </Button>
            <Button
              variant="golden"
              onPress={handleSave}
              loading={loading}
              style={styles.saveButton}
            >
              Salva
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  scrollView: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  availableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleInactive: {},
  itemLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
  },
  itemLabelInactive: {
    fontSize: typography.fontSize.base,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  arrowButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

export default CustomizeActionsModal;
