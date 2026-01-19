import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

type WizardStep = 'info' | 'tickets' | 'staff' | 'review';

interface EventFormData {
  name: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId: string;
  locationName: string;
  capacity: string;
  tickets: TicketType[];
  staff: StaffAssignment[];
}

interface TicketType {
  id: string;
  name: string;
  price: string;
  quantity: string;
}

interface StaffAssignment {
  id: string;
  userId: string;
  userName: string;
  role: string;
}

const steps: { key: WizardStep; label: string; icon: string }[] = [
  { key: 'info', label: 'Info', icon: 'information-circle-outline' },
  { key: 'tickets', label: 'Biglietti', icon: 'ticket-outline' },
  { key: 'staff', label: 'Staff', icon: 'people-outline' },
  { key: 'review', label: 'Revisione', icon: 'checkmark-circle-outline' },
];

export function EventWizardScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [currentStep, setCurrentStep] = useState<WizardStep>('info');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    locationId: '',
    locationName: '',
    capacity: '',
    tickets: [{ id: '1', name: 'Ingresso Standard', price: '15', quantity: '100' }],
    staff: [],
  });

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  const updateForm = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTicketType = () => {
    const newId = (formData.tickets.length + 1).toString();
    updateForm('tickets', [...formData.tickets, { id: newId, name: '', price: '', quantity: '' }]);
  };

  const updateTicket = (index: number, field: keyof TicketType, value: string) => {
    const updated = [...formData.tickets];
    updated[index] = { ...updated[index], [field]: value };
    updateForm('tickets', updated);
  };

  const removeTicket = (index: number) => {
    updateForm('tickets', formData.tickets.filter((_, i) => i !== index));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'info':
        return formData.name.trim() !== '' && formData.date.trim() !== '';
      case 'tickets':
        return formData.tickets.every(t => t.name.trim() !== '' && t.price.trim() !== '');
      case 'staff':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const idx = currentStepIndex;
    if (idx < steps.length - 1) {
      setCurrentStep(steps[idx + 1].key);
    }
  };

  const prevStep = () => {
    const idx = currentStepIndex;
    if (idx > 0) {
      setCurrentStep(steps[idx - 1].key);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const eventPayload = {
        name: formData.name,
        description: formData.description,
        eventDate: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        locationId: formData.locationId || null,
        totalCapacity: parseInt(formData.capacity) || 0,
        ticketTypes: formData.tickets.map(t => ({
          name: t.name,
          price: parseFloat(t.price) || 0,
          quantity: parseInt(t.quantity) || 0,
        })),
        staffAssignments: formData.staff.map(s => ({
          userId: s.userId,
          role: s.role,
        })),
      };

      await api.post('/api/events', eventPayload);
      navigation.navigate('ManageEvents');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore creazione evento');
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={[styles.stepIndicator, (isTablet || isLandscape) && styles.stepIndicatorLandscape]}>
      {steps.map((step, index) => (
        <React.Fragment key={step.key}>
          <TouchableOpacity
            style={[
              styles.stepDot,
              index <= currentStepIndex && styles.stepDotActive,
              index === currentStepIndex && styles.stepDotCurrent,
            ]}
            onPress={() => index < currentStepIndex && setCurrentStep(step.key)}
            disabled={index > currentStepIndex}
            testID={`step-${step.key}`}
          >
            <Ionicons
              name={step.icon as any}
              size={18}
              color={index <= currentStepIndex ? colors.primaryForeground : colors.mutedForeground}
            />
          </TouchableOpacity>
          {index < steps.length - 1 && (
            <View style={[styles.stepLine, index < currentStepIndex && styles.stepLineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderInfoStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} testID="scroll-info-step">
      <View style={(isTablet || isLandscape) ? styles.formGrid : undefined}>
        <Card style={[styles.formCard, (isTablet || isLandscape) && styles.formCardFull]} variant="elevated">
          <Text style={styles.sectionTitle}>Informazioni Evento</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nome Evento *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Es. Serata Disco"
              placeholderTextColor={colors.mutedForeground}
              value={formData.name}
              onChangeText={(v) => updateForm('name', v)}
              testID="input-event-name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descrizione</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Descrizione dell'evento..."
              placeholderTextColor={colors.mutedForeground}
              value={formData.description}
              onChangeText={(v) => updateForm('description', v)}
              multiline
              numberOfLines={4}
              testID="input-event-description"
            />
          </View>

          <View style={(isTablet || isLandscape) ? styles.inputRowResponsive : styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Data *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="GG/MM/AAAA"
                placeholderTextColor={colors.mutedForeground}
                value={formData.date}
                onChangeText={(v) => updateForm('date', v)}
                testID="input-event-date"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.sm }]}>
              <Text style={styles.inputLabel}>Capacità</Text>
              <TextInput
                style={styles.textInput}
                placeholder="500"
                placeholderTextColor={colors.mutedForeground}
                value={formData.capacity}
                onChangeText={(v) => updateForm('capacity', v)}
                keyboardType="numeric"
                testID="input-capacity"
              />
            </View>
          </View>

          <View style={(isTablet || isLandscape) ? styles.inputRowResponsive : styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.inputLabel}>Inizio</Text>
              <TextInput
                style={styles.textInput}
                placeholder="22:00"
                placeholderTextColor={colors.mutedForeground}
                value={formData.startTime}
                onChangeText={(v) => updateForm('startTime', v)}
                testID="input-start-time"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Fine</Text>
              <TextInput
                style={styles.textInput}
                placeholder="04:00"
                placeholderTextColor={colors.mutedForeground}
                value={formData.endTime}
                onChangeText={(v) => updateForm('endTime', v)}
                testID="input-end-time"
              />
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );

  const renderTicketsStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} testID="scroll-tickets-step">
      <Card style={styles.formCard} variant="elevated">
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tipi Biglietto</Text>
          <TouchableOpacity style={styles.addTicketButton} onPress={addTicketType} testID="button-add-ticket">
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={(isTablet || isLandscape) ? styles.ticketsGrid : undefined}>
          {formData.tickets.map((ticket, index) => (
            <View key={ticket.id} style={[styles.ticketCard, (isTablet || isLandscape) && styles.ticketCardResponsive]}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketNumber}>Biglietto {index + 1}</Text>
                {formData.tickets.length > 1 && (
                  <TouchableOpacity onPress={() => removeTicket(index)} testID={`button-remove-ticket-${index}`}>
                    <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Es. VIP, Standard"
                  placeholderTextColor={colors.mutedForeground}
                  value={ticket.name}
                  onChangeText={(v) => updateTicket(index, 'name', v)}
                  testID={`input-ticket-name-${index}`}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.inputLabel}>Prezzo (€) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="15.00"
                    placeholderTextColor={colors.mutedForeground}
                    value={ticket.price}
                    onChangeText={(v) => updateTicket(index, 'price', v)}
                    keyboardType="decimal-pad"
                    testID={`input-ticket-price-${index}`}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Quantità</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="100"
                    placeholderTextColor={colors.mutedForeground}
                    value={ticket.quantity}
                    onChangeText={(v) => updateTicket(index, 'quantity', v)}
                    keyboardType="numeric"
                    testID={`input-ticket-quantity-${index}`}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );

  const renderStaffStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} testID="scroll-staff-step">
      <Card style={styles.formCard} variant="elevated">
        <Text style={styles.sectionTitle}>Assegnazione Staff</Text>
        <Text style={styles.helperText}>
          Puoi assegnare lo staff all'evento dopo la creazione dalla pagina di gestione evento.
        </Text>
        
        <View style={styles.emptyState} testID="empty-staff-state">
          <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuno staff assegnato</Text>
          <Text style={styles.emptySubtext}>Potrai aggiungere lo staff dopo la creazione</Text>
        </View>
      </Card>
    </ScrollView>
  );

  const renderReviewStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false} testID="scroll-review-step">
      <View style={(isTablet || isLandscape) ? styles.reviewGrid : undefined}>
        <Card style={[styles.formCard, (isTablet || isLandscape) && styles.reviewCardLeft]} variant="elevated">
          <Text style={styles.sectionTitle}>Riepilogo Evento</Text>
          
          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>Nome</Text>
            <Text style={styles.reviewValue}>{formData.name || '-'}</Text>
          </View>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>Data</Text>
            <Text style={styles.reviewValue}>{formData.date || '-'}</Text>
          </View>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>Orario</Text>
            <Text style={styles.reviewValue}>
              {formData.startTime && formData.endTime ? `${formData.startTime} - ${formData.endTime}` : '-'}
            </Text>
          </View>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>Capacità</Text>
            <Text style={styles.reviewValue}>{formData.capacity || '-'}</Text>
          </View>
        </Card>

        <Card style={[styles.formCard, (isTablet || isLandscape) && styles.reviewCardRight]} variant="elevated">
          <Text style={styles.reviewSubtitle}>Biglietti ({formData.tickets.length})</Text>
          {formData.tickets.map((ticket, index) => (
            <View key={ticket.id} style={styles.reviewTicket} testID={`review-ticket-${index}`}>
              <Text style={styles.reviewTicketName}>{ticket.name}</Text>
              <Text style={styles.reviewTicketPrice}>€ {ticket.price} x {ticket.quantity}</Text>
            </View>
          ))}

          {error && (
            <View style={styles.errorContainer} testID="error-container">
              <Ionicons name="alert-circle" size={20} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'info': return renderInfoStep();
      case 'tickets': return renderTicketsStep();
      case 'staff': return renderStaffStep();
      case 'review': return renderReviewStep();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Header
          title="Crea Evento"
          showBack
          onBack={prevStep}
        />

        {renderStepIndicator()}
        
        <Text style={styles.stepTitle}>{steps[currentStepIndex].label}</Text>

        {renderCurrentStep()}

        <View style={styles.footer}>
          {currentStep !== 'review' ? (
            <Button
              title="Continua"
              onPress={nextStep}
              disabled={!canProceed()}
              style={styles.footerButton}
              testID="button-continue"
            />
          ) : (
            <Button
              title={saving ? 'Creazione...' : 'Crea Evento'}
              onPress={handleSubmit}
              disabled={saving}
              style={styles.footerButton}
              testID="button-submit"
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  stepIndicatorLandscape: {
    paddingHorizontal: spacing['3xl'],
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotCurrent: {
    borderWidth: 3,
    borderColor: colors.teal,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  formCardFull: {
    flex: 1,
    minWidth: 300,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  addTicketButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputRowResponsive: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ticketsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketCardResponsive: {
    flex: 1,
    minWidth: 280,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ticketNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  reviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  reviewCardLeft: {
    flex: 1,
    minWidth: 280,
  },
  reviewCardRight: {
    flex: 1,
    minWidth: 280,
  },
  reviewSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  reviewValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  reviewSubtitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  reviewTicket: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  reviewTicketName: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  reviewTicketPrice: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.destructive}20`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.destructive,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.glass.background,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  footerButton: {
    width: '100%',
  },
});
