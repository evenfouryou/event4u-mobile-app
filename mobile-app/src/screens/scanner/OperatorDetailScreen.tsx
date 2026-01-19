import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Switch, Alert, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Header, Card, Button } from '../../components';
import { api } from '../../lib/api';

interface Event {
  id: string;
  title: string;
  date: string;
}

interface OperatorData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  assignedEventIds: string[];
  permissions: {
    scanEntry: boolean;
    scanExit: boolean;
    manualCheckIn: boolean;
  };
}

const INITIAL_DATA: OperatorData = {
  name: '',
  email: '',
  phone: '',
  isActive: true,
  assignedEventIds: [],
  permissions: {
    scanEntry: true,
    scanExit: false,
    manualCheckIn: false,
  },
};

export function OperatorDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const contentMaxWidth = isTablet ? 800 : undefined;

  const { operatorId, mode = 'create' } = route.params || {};
  const isEditMode = mode === 'edit' && operatorId;

  const [formData, setFormData] = useState<OperatorData>(INITIAL_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: operator, isLoading: operatorLoading } = useQuery<OperatorData>({
    queryKey: ['/api/scanners', operatorId],
    enabled: isEditMode,
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/scanner/events'],
  });

  useEffect(() => {
    if (operator && isEditMode) {
      setFormData({
        id: operator.id,
        name: operator.name || '',
        email: operator.email || '',
        phone: operator.phone || '',
        isActive: operator.isActive ?? true,
        assignedEventIds: operator.assignedEventIds || [],
        permissions: operator.permissions || INITIAL_DATA.permissions,
      });
    }
  }, [operator, isEditMode]);

  const saveMutation = useMutation({
    mutationFn: async (data: OperatorData) => {
      if (isEditMode) {
        return api.put(`/api/scanners/${operatorId}`, data);
      }
      return api.post('/api/scanners', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scanners'] });
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert('Errore', error.message || 'Si è verificato un errore');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return api.delete(`/api/scanners/${operatorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scanners'] });
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert('Errore', error.message || 'Si è verificato un errore');
    },
  });

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Nome richiesto';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email richiesta';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email non valida';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSave = useCallback(() => {
    if (validateForm()) {
      saveMutation.mutate(formData);
    }
  }, [formData, validateForm, saveMutation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Conferma eliminazione',
      `Sei sicuro di voler eliminare l'operatore ${formData.name}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  }, [formData.name, deleteMutation]);

  const handleEventToggle = useCallback((eventId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedEventIds: prev.assignedEventIds.includes(eventId)
        ? prev.assignedEventIds.filter(id => id !== eventId)
        : [...prev.assignedEventIds, eventId],
    }));
  }, []);

  const handlePermissionToggle = useCallback((permission: keyof OperatorData['permissions']) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission],
      },
    }));
  }, []);

  if (operatorLoading && isEditMode) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header
          title="Caricamento..."
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonBlock} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.contentWrapper, contentMaxWidth && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <Header
          title={isEditMode ? 'Modifica Operatore' : 'Nuovo Operatore'}
          showBack
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, isLandscape && styles.contentContainerLandscape]}
          showsVerticalScrollIndicator={false}
          testID="scroll-view-content"
        >
          <View style={[styles.formContainer, (isTablet || isLandscape) && styles.formContainerWide]}>
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Informazioni</Text>
              
              <View style={[styles.inputRow, (isTablet || isLandscape) && styles.inputRowWide]}>
                <View style={[styles.inputGroup, (isTablet || isLandscape) && styles.inputGroupHalf]}>
                  <Text style={styles.inputLabel}>Nome *</Text>
                  <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    value={formData.name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                    placeholder="Nome completo"
                    placeholderTextColor={colors.mutedForeground}
                    testID="input-name"
                  />
                  {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>

                <View style={[styles.inputGroup, (isTablet || isLandscape) && styles.inputGroupHalf]}>
                  <Text style={styles.inputLabel}>Email *</Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    value={formData.email}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                    placeholder="email@esempio.com"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    testID="input-email"
                  />
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefono</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                  placeholder="+39 123 456 7890"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                  testID="input-phone"
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Stato Operatore</Text>
                  <Text style={styles.toggleDescription}>
                    {formData.isActive ? 'Attivo - può effettuare scansioni' : 'Inattivo - non può effettuare scansioni'}
                  </Text>
                </View>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, isActive: value }))}
                  trackColor={{ false: colors.muted, true: colors.teal + '50' }}
                  thumbColor={formData.isActive ? colors.teal : colors.mutedForeground}
                  testID="switch-active"
                />
              </View>
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Permessi</Text>
              <Text style={styles.sectionDescription}>
                Seleziona le azioni che l'operatore può eseguire
              </Text>

              <TouchableOpacity
                style={styles.permissionItem}
                onPress={() => handlePermissionToggle('scanEntry')}
                testID="button-permission-scan-entry"
              >
                <View style={[styles.checkbox, formData.permissions.scanEntry && styles.checkboxChecked]}>
                  {formData.permissions.scanEntry && (
                    <Ionicons name="checkmark" size={16} color={colors.emeraldForeground} />
                  )}
                </View>
                <View style={styles.permissionInfo}>
                  <View style={styles.permissionHeader}>
                    <Ionicons name="enter-outline" size={20} color={colors.teal} />
                    <Text style={styles.permissionTitle}>Scansione Entrata</Text>
                  </View>
                  <Text style={styles.permissionDescription}>
                    Può scansionare i biglietti all'ingresso dell'evento
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.permissionItem}
                onPress={() => handlePermissionToggle('scanExit')}
                testID="button-permission-scan-exit"
              >
                <View style={[styles.checkbox, formData.permissions.scanExit && styles.checkboxChecked]}>
                  {formData.permissions.scanExit && (
                    <Ionicons name="checkmark" size={16} color={colors.emeraldForeground} />
                  )}
                </View>
                <View style={styles.permissionInfo}>
                  <View style={styles.permissionHeader}>
                    <Ionicons name="exit-outline" size={20} color={colors.emerald} />
                    <Text style={styles.permissionTitle}>Scansione Uscita</Text>
                  </View>
                  <Text style={styles.permissionDescription}>
                    Può registrare l'uscita degli ospiti dall'evento
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.permissionItem}
                onPress={() => handlePermissionToggle('manualCheckIn')}
                testID="button-permission-manual-checkin"
              >
                <View style={[styles.checkbox, formData.permissions.manualCheckIn && styles.checkboxChecked]}>
                  {formData.permissions.manualCheckIn && (
                    <Ionicons name="checkmark" size={16} color={colors.emeraldForeground} />
                  )}
                </View>
                <View style={styles.permissionInfo}>
                  <View style={styles.permissionHeader}>
                    <Ionicons name="create-outline" size={20} color={colors.warning} />
                    <Text style={styles.permissionTitle}>Check-in Manuale</Text>
                  </View>
                  <Text style={styles.permissionDescription}>
                    Può inserire manualmente i codici biglietto senza scansione
                  </Text>
                </View>
              </TouchableOpacity>
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Assegnazione Eventi</Text>
              <Text style={styles.sectionDescription}>
                Seleziona gli eventi a cui l'operatore può accedere
              </Text>

              {(events || []).length === 0 ? (
                <View style={styles.noEventsContainer}>
                  <Ionicons name="calendar-outline" size={32} color={colors.mutedForeground} />
                  <Text style={styles.noEventsText}>Nessun evento disponibile</Text>
                </View>
              ) : (
                <View style={(isTablet || isLandscape) ? styles.eventsGrid : undefined}>
                  {(events || []).map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={[styles.eventItem, (isTablet || isLandscape) && styles.eventItemWide]}
                      onPress={() => handleEventToggle(event.id)}
                      testID={`button-event-${event.id}`}
                    >
                      <View style={[
                        styles.checkbox,
                        formData.assignedEventIds.includes(event.id) && styles.checkboxChecked
                      ]}>
                        {formData.assignedEventIds.includes(event.id) && (
                          <Ionicons name="checkmark" size={16} color={colors.emeraldForeground} />
                        )}
                      </View>
                      <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventDate}>{event.date}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>

            {isEditMode && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                testID="button-delete"
              >
                <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                <Text style={styles.deleteButtonText}>Elimina Operatore</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, (isTablet || isLandscape) && styles.footerWide]}>
          <Button
            onPress={handleSave}
            loading={saveMutation.isPending}
            style={[styles.saveButton, (isTablet || isLandscape) && styles.saveButtonWide]}
            testID="button-save"
          >
            {isEditMode ? 'Salva Modifiche' : 'Crea Operatore'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  contentContainerLandscape: {
    paddingHorizontal: spacing.xl,
  },
  formContainer: {
    flex: 1,
  },
  formContainerWide: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  skeletonBlock: {
    height: 200,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
  },
  section: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
  },
  inputRow: {
    flexDirection: 'column',
  },
  inputRowWide: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputGroupHalf: {
    flex: 1,
  },
  inputLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.foreground,
    fontSize: fontSize.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputError: {
    borderColor: colors.destructive,
  },
  errorText: {
    color: colors.destructive,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  toggleDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: spacing.xxs,
  },
  checkboxChecked: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  permissionTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  permissionDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    paddingLeft: spacing.xl + spacing.sm,
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventItemWide: {
    width: '48%',
    borderBottomWidth: 0,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  eventDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noEventsText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  deleteButtonText: {
    color: colors.destructive,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  footerWide: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButton: {
    width: '100%',
  },
  saveButtonWide: {
    maxWidth: 400,
  },
});
