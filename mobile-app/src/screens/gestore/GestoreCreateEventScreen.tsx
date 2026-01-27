import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

interface GestoreCreateEventScreenProps {
  onBack: () => void;
  onEventCreated: (eventId: string) => void;
}

type StepType = 'basic' | 'datetime' | 'location' | 'tickets' | 'review';

export function GestoreCreateEventScreen({ onBack, onEventCreated }: GestoreCreateEventScreenProps) {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState<StepType>('basic');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    locationName: '',
    locationAddress: '',
    capacity: '',
    isPublic: true,
  });

  const steps: { id: StepType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'basic', label: 'Info Base', icon: 'document-text-outline' },
    { id: 'datetime', label: 'Data e Ora', icon: 'calendar-outline' },
    { id: 'location', label: 'Location', icon: 'location-outline' },
    { id: 'tickets', label: 'Biglietti', icon: 'ticket-outline' },
    { id: 'review', label: 'Riepilogo', icon: 'checkmark-circle-outline' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const canGoNext = () => {
    switch (currentStep) {
      case 'basic':
        return formData.name.trim().length > 0;
      case 'datetime':
        return formData.startDate.trim().length > 0;
      case 'location':
        return formData.locationName.trim().length > 0;
      case 'tickets':
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentStepIndex < steps.length - 1) {
      triggerHaptic('light');
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      triggerHaptic('light');
      setCurrentStep(steps[currentStepIndex - 1].id);
    } else {
      onBack();
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      const event = await api.createGestoreEvent({
        name: formData.name,
        description: formData.description,
        startDate: `${formData.startDate}T${formData.startTime || '20:00'}:00`,
        endDate: formData.endDate ? `${formData.endDate}T${formData.endTime || '04:00'}:00` : undefined,
        locationName: formData.locationName,
        locationAddress: formData.locationAddress,
        capacity: parseInt(formData.capacity) || undefined,
        isPublic: formData.isPublic,
      });
      Alert.alert('Successo', 'Evento creato con successo!', [
        { text: 'OK', onPress: () => onEventCreated(event.id) },
      ]);
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Errore', 'Impossibile creare l\'evento');
    } finally {
      setSaving(false);
    }
  };

  const renderBasicStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Informazioni Base</Text>
      <Text style={styles.stepDescription}>Inserisci le informazioni principali dell'evento</Text>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Nome Evento *</Text>
        <TextInput
          style={styles.formInput}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="Es. Serata Disco"
          placeholderTextColor={colors.mutedForeground}
          testID="input-name"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Descrizione</Text>
        <TextInput
          style={[styles.formInput, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Descrivi il tuo evento..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          testID="input-description"
        />
      </View>

      <Pressable
        style={styles.switchRow}
        onPress={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
      >
        <View style={styles.switchInfo}>
          <Text style={styles.switchLabel}>Evento Pubblico</Text>
          <Text style={styles.switchDescription}>L'evento sarà visibile a tutti</Text>
        </View>
        <View style={[styles.switch, formData.isPublic && styles.switchActive]}>
          <View style={[styles.switchThumb, formData.isPublic && styles.switchThumbActive]} />
        </View>
      </Pressable>
    </View>
  );

  const renderDatetimeStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Data e Ora</Text>
      <Text style={styles.stepDescription}>Quando si svolgerà l'evento?</Text>

      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.formLabel}>Data Inizio *</Text>
          <TextInput
            style={styles.formInput}
            value={formData.startDate}
            onChangeText={(text) => setFormData({ ...formData, startDate: text })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.mutedForeground}
            testID="input-startDate"
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.formLabel}>Ora Inizio</Text>
          <TextInput
            style={styles.formInput}
            value={formData.startTime}
            onChangeText={(text) => setFormData({ ...formData, startTime: text })}
            placeholder="HH:MM"
            placeholderTextColor={colors.mutedForeground}
            testID="input-startTime"
          />
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.formLabel}>Data Fine</Text>
          <TextInput
            style={styles.formInput}
            value={formData.endDate}
            onChangeText={(text) => setFormData({ ...formData, endDate: text })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.mutedForeground}
            testID="input-endDate"
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.formLabel}>Ora Fine</Text>
          <TextInput
            style={styles.formInput}
            value={formData.endTime}
            onChangeText={(text) => setFormData({ ...formData, endTime: text })}
            placeholder="HH:MM"
            placeholderTextColor={colors.mutedForeground}
            testID="input-endTime"
          />
        </View>
      </View>
    </View>
  );

  const renderLocationStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Location</Text>
      <Text style={styles.stepDescription}>Dove si svolgerà l'evento?</Text>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Nome Location *</Text>
        <TextInput
          style={styles.formInput}
          value={formData.locationName}
          onChangeText={(text) => setFormData({ ...formData, locationName: text })}
          placeholder="Es. Club XYZ"
          placeholderTextColor={colors.mutedForeground}
          testID="input-locationName"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Indirizzo</Text>
        <TextInput
          style={styles.formInput}
          value={formData.locationAddress}
          onChangeText={(text) => setFormData({ ...formData, locationAddress: text })}
          placeholder="Via Roma 1, Milano"
          placeholderTextColor={colors.mutedForeground}
          testID="input-locationAddress"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Capacità</Text>
        <TextInput
          style={styles.formInput}
          value={formData.capacity}
          onChangeText={(text) => setFormData({ ...formData, capacity: text })}
          placeholder="500"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          testID="input-capacity"
        />
      </View>
    </View>
  );

  const renderTicketsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Biglietti</Text>
      <Text style={styles.stepDescription}>Configura i biglietti dopo la creazione</Text>

      <Card style={styles.infoCard}>
        <View style={styles.infoContent}>
          <Ionicons name="information-circle-outline" size={24} color={staticColors.primary} />
          <Text style={styles.infoText}>
            Potrai configurare i tipi di biglietto, i prezzi e le quantità dopo aver creato l'evento.
          </Text>
        </View>
      </Card>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Riepilogo</Text>
      <Text style={styles.stepDescription}>Verifica le informazioni dell'evento</Text>

      <Card style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Nome</Text>
          <Text style={styles.reviewValue}>{formData.name || '-'}</Text>
        </View>
        <View style={styles.reviewDivider} />
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Data</Text>
          <Text style={styles.reviewValue}>{formData.startDate || '-'} {formData.startTime}</Text>
        </View>
        <View style={styles.reviewDivider} />
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Location</Text>
          <Text style={styles.reviewValue}>{formData.locationName || '-'}</Text>
        </View>
        <View style={styles.reviewDivider} />
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Capacità</Text>
          <Text style={styles.reviewValue}>{formData.capacity || 'Non specificata'}</Text>
        </View>
        <View style={styles.reviewDivider} />
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Visibilità</Text>
          <Text style={styles.reviewValue}>{formData.isPublic ? 'Pubblico' : 'Privato'}</Text>
        </View>
      </Card>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return renderBasicStep();
      case 'datetime':
        return renderDatetimeStep();
      case 'location':
        return renderLocationStep();
      case 'tickets':
        return renderTicketsStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={goBack}
        testID="header-create-event"
      />

      <View style={styles.stepsIndicator}>
        {steps.map((step, index) => (
          <View key={step.id} style={styles.stepIndicatorItem}>
            <View
              style={[
                styles.stepDot,
                index <= currentStepIndex && styles.stepDotActive,
                index < currentStepIndex && styles.stepDotCompleted,
              ]}
            >
              {index < currentStepIndex ? (
                <Ionicons name="checkmark" size={14} color={staticColors.primaryForeground} />
              ) : (
                <Text
                  style={[
                    styles.stepDotText,
                    index <= currentStepIndex && styles.stepDotTextActive,
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  index < currentStepIndex && styles.stepLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep !== 'review' ? (
          <Button
            variant="golden"
            size="lg"
            onPress={goNext}
            disabled={!canGoNext()}
            style={styles.nextButton}
            testID="button-next"
          >
            Continua
          </Button>
        ) : (
          <Button
            variant="golden"
            size="lg"
            onPress={handleCreate}
            loading={saving}
            style={styles.nextButton}
            testID="button-create"
          >
            Crea Evento
          </Button>
        )}
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  stepsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: staticColors.primary,
  },
  stepDotCompleted: {
    backgroundColor: staticColors.success,
  },
  stepDotText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
  },
  stepDotTextActive: {
    color: staticColors.primaryForeground,
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: staticColors.secondary,
    marginHorizontal: spacing.xs,
  },
  stepLineActive: {
    backgroundColor: staticColors.success,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  stepContent: {
    paddingTop: spacing.md,
  },
  stepTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  stepDescription: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  switchDescription: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: staticColors.secondary,
    padding: 2,
  },
  switchActive: {
    backgroundColor: staticColors.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: staticColors.foreground,
  },
  switchThumbActive: {
    marginLeft: 'auto',
  },
  infoCard: {
    padding: spacing.lg,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    lineHeight: 20,
  },
  reviewCard: {
    padding: spacing.md,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  reviewLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  reviewValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: staticColors.border,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  nextButton: {
    width: '100%',
  },
});

export default GestoreCreateEventScreen;
