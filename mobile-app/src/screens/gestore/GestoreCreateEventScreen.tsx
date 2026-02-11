import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Switch, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { GestoreLocation, EventFormat } from '@/lib/api';

interface GestoreCreateEventScreenProps {
  onBack: () => void;
  onEventCreated: (eventId: string) => void;
  editEventId?: string;
}

type StepId = 'info' | 'datetime' | 'recurrence' | 'siae' | 'tickets' | 'summary';

interface Step {
  id: StepId;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const BASE_STEPS: Step[] = [
  { id: 'info', title: 'Info', icon: 'document-text-outline', description: 'Informazioni base' },
  { id: 'datetime', title: 'Date', icon: 'calendar-outline', description: 'Date e orari' },
  { id: 'recurrence', title: 'Ricorrenza', icon: 'repeat-outline', description: 'Eventi ricorrenti' },
];

const SIAE_STEPS: Step[] = [
  { id: 'siae', title: 'SIAE', icon: 'ticket-outline', description: 'Biglietteria SIAE' },
  { id: 'tickets', title: 'Biglietti', icon: 'pricetag-outline', description: 'Biglietti e Abbonamenti' },
];

const FINAL_STEP: Step = { id: 'summary', title: 'Riepilogo', icon: 'checkmark-circle-outline', description: 'Conferma e pubblica' };

function getSteps(siaeEnabled: boolean): Step[] {
  if (siaeEnabled) {
    return [...BASE_STEPS, ...SIAE_STEPS, FINAL_STEP];
  }
  return [...BASE_STEPS, FINAL_STEP];
}

interface TicketConfig {
  id: string;
  name: string;
  ticketType: 'INT' | 'RID' | 'OMA';
  price: string;
  ddp: string;
  sectorCode: string;
  isNumbered: boolean;
  quantity: number;
}

interface SubscriptionTypeConfig {
  id: string;
  name: string;
  description: string;
  turnType: 'F' | 'L';
  eventsCount: number;
  price: string;
  maxQuantity?: number;
}

type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly';

interface FormData {
  name: string;
  description: string;
  locationId: string;
  formatId: string;
  capacity: string;
  startDate: Date;
  startTime: Date;
  endDate: Date;
  endTime: Date;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceInterval: number;
  recurrenceCount: number;
  recurrenceEndDate: Date | null;
  isPublic: boolean;
  imageUrl: string;
}

export function GestoreCreateEventScreen({ onBack, onEventCreated, editEventId }: GestoreCreateEventScreenProps) {
  const { colors, gradients } = useTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const [locations, setLocations] = useState<GestoreLocation[]>([]);
  const [formats, setFormats] = useState<EventFormat[]>([]);
  
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);
  
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  
  const [siaeEnabled, setSiaeEnabled] = useState(false);
  const [siaeGenreCode, setSiaeGenreCode] = useState('');
  const [siaeTaxType, setSiaeTaxType] = useState<'S' | 'I'>('S');
  const [siaeRequiresNominative, setSiaeRequiresNominative] = useState(false);
  const [siaeMaxTicketsPerUser, setSiaeMaxTicketsPerUser] = useState(10);
  const [siaeSectors, setSiaeSectors] = useState<TicketConfig[]>([]);
  const [siaeSubscriptionTypes, setSiaeSubscriptionTypes] = useState<SubscriptionTypeConfig[]>([]);
  const [showGenrePicker, setShowGenrePicker] = useState(false);
  const [showTaxTypePicker, setShowTaxTypePicker] = useState(false);
  const [showTicketTypePicker, setShowTicketTypePicker] = useState<string | null>(null);
  const [showTurnTypePicker, setShowTurnTypePicker] = useState<string | null>(null);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const STEPS = getSteps(siaeEnabled);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    locationId: '',
    formatId: '',
    capacity: '',
    startDate: new Date(),
    startTime: new Date(new Date().setHours(22, 0, 0, 0)),
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
    endTime: new Date(new Date().setHours(4, 0, 0, 0)),
    isRecurring: false,
    recurrencePattern: 'none',
    recurrenceInterval: 1,
    recurrenceCount: 4,
    recurrenceEndDate: null,
    isPublic: true,
    imageUrl: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const steps = getSteps(siaeEnabled);
    const progress = ((currentStepIndex + 1) / steps.length) * 100;
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  }, [currentStepIndex, siaeEnabled]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      
      const [locationsData, formatsData] = await Promise.all([
        api.getGestoreLocations(),
        api.getEventFormats(),
      ]);
      
      setLocations(locationsData);
      setFormats(formatsData);
      
      if (editEventId) {
        const event = await api.getGestoreEventDetail(editEventId);
        if (event) {
          const startDate = event.startDate ? new Date(event.startDate) : new Date();
          const endDate = event.endDate ? new Date(event.endDate) : new Date(new Date().setDate(new Date().getDate() + 1));
          
          setFormData(prev => ({
            ...prev,
            name: event.name,
            description: event.description || '',
            capacity: event.capacity?.toString() || '',
            isPublic: event.isPublic,
            startDate: startDate,
            startTime: startDate,
            endDate: endDate,
            endTime: endDate,
          }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (key: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const currentStep = STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const canGoNext = (): boolean => {
    switch (currentStep.id) {
      case 'info':
        return formData.name.trim().length >= 3;
      case 'datetime':
        return true;
      case 'recurrence':
        return true;
      case 'siae':
        // Validate SIAE config: genre required, tax type must match regulations
        return siaeGenreCode.length > 0 && siaeTaxType.length > 0;
      case 'tickets':
        // Validate tickets: at least one ticket with name and valid price
        // OMA (omaggio/free) tickets can have 0 price
        const ticketsValid = siaeSectors.length > 0 && siaeSectors.every(t => {
          const hasName = t.name.trim().length > 0;
          const price = parseFloat(t.price) || 0;
          const isFreeTicket = t.ticketType === 'OMA';
          const hasValidPrice = isFreeTicket || price > 0;
          return hasName && hasValidPrice;
        });
        // Validate subscriptions if any: must have name and positive price
        const subscriptionsValid = siaeSubscriptionTypes.length === 0 || siaeSubscriptionTypes.every(s => {
          const hasName = s.name.trim().length > 0;
          const price = parseFloat(s.price) || 0;
          const eventsCount = s.eventsCount || 0;
          return hasName && price > 0 && eventsCount > 0;
        });
        return ticketsValid && subscriptionsValid;
      case 'summary':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (currentStepIndex < STEPS.length - 1 && canGoNext()) {
      triggerHaptic('light');
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      triggerHaptic('light');
      setCurrentStepIndex(prev => prev - 1);
    } else {
      onBack();
    }
  };

  const formatDateTime = (date: Date, time: Date): string => {
    const d = new Date(date);
    d.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return d.toISOString();
  };

  const buildPayload = (status: 'draft' | 'scheduled') => {
    const basePayload = {
      name: formData.name,
      description: formData.description,
      locationId: formData.locationId || undefined,
      formatId: formData.formatId || undefined,
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      startDatetime: formatDateTime(formData.startDate, formData.startTime),
      endDatetime: formatDateTime(formData.endDate, formData.endTime),
      isRecurring: formData.isRecurring,
      recurrencePattern: formData.isRecurring ? formData.recurrencePattern : 'none',
      recurrenceInterval: formData.recurrenceInterval,
      recurrenceCount: formData.recurrenceCount,
      recurrenceEndDate: formData.recurrenceEndDate?.toISOString(),
      isPublic: formData.isPublic,
      imageUrl: formData.imageUrl || undefined,
      status,
    };
    
    // Add SIAE data if enabled
    if (siaeEnabled) {
      return {
        ...basePayload,
        siaeEnabled: true,
        siaeGenreCode: siaeGenreCode || undefined,
        siaeTaxType: siaeTaxType,
        siaeRequiresNominative: siaeRequiresNominative,
        siaeMaxTicketsPerUser: siaeMaxTicketsPerUser,
        siaeSectors: siaeSectors.filter(s => s.name.trim()).map(sector => ({
          name: sector.name,
          ticketType: sector.ticketType,
          sectorCode: sector.sectorCode,
          price: parseFloat(sector.price) || 0,
          ddp: parseFloat(sector.ddp) || 0,
          isNumbered: sector.isNumbered,
          quantity: sector.quantity || 0,
        })),
        siaeSubscriptionTypes: siaeSubscriptionTypes.filter(s => s.name.trim()).map(sub => ({
          name: sub.name,
          turnType: sub.turnType,
          price: parseFloat(sub.price) || 0,
          eventsCount: sub.eventsCount || 1,
        })),
      };
    }
    
    return basePayload;
  };

  const saveDraft = async () => {
    try {
      setSaving(true);
      
      const payload = buildPayload('draft');
      
      let result;
      if (editEventId) {
        result = await api.updateGestoreEvent(editEventId, payload);
      } else {
        result = await api.createGestoreEvent(payload);
      }
      
      triggerHaptic('success');
      Alert.alert('Bozza Salvata', 'L\'evento è stato salvato come bozza.', [
        { text: 'OK', onPress: () => onEventCreated(result.id) },
      ]);
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Errore', 'Impossibile salvare la bozza. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  const publishEvent = async () => {
    try {
      setPublishing(true);
      
      const payload = buildPayload('scheduled');
      
      let result;
      if (editEventId) {
        result = await api.updateGestoreEvent(editEventId, payload);
      } else {
        result = await api.createGestoreEvent(payload);
      }
      
      triggerHaptic('success');
      Alert.alert('Evento Pubblicato!', 'Il tuo evento è stato creato e pubblicato con successo.', [
        { text: 'Visualizza', onPress: () => onEventCreated(result.id) },
      ]);
    } catch (error) {
      console.error('Error publishing event:', error);
      Alert.alert('Errore', 'Impossibile pubblicare l\'evento. Riprova.');
    } finally {
      setPublishing(false);
    }
  };

  const selectedLocation = locations.find(l => l.id === formData.locationId);
  const selectedFormat = formats.find(f => f.id === formData.formatId);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <Animated.View 
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]} 
        />
      </View>
      <View style={styles.stepsIndicator}>
        {STEPS.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          
          return (
            <Pressable
              key={step.id}
              onPress={() => {
                if (index < currentStepIndex) {
                  triggerHaptic('light');
                  setCurrentStepIndex(index);
                }
              }}
              style={styles.stepIndicator}
              testID={`step-${step.id}`}
            >
              <View style={[
                styles.stepDot,
                isActive && styles.stepDotActive,
                isCompleted && styles.stepDotCompleted,
              ]}>
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color={staticColors.primaryForeground} />
                ) : (
                  <Ionicons name={step.icon} size={14} color={isActive ? staticColors.primaryForeground : colors.mutedForeground} />
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                isActive && styles.stepLabelActive,
              ]}>
                {step.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderInfoStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Informazioni Evento</Text>
      <Text style={styles.stepDescription}>Inserisci i dettagli base del tuo evento</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nome Evento *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Es. Serata Disco Anni '80"
          placeholderTextColor={colors.mutedForeground}
          value={formData.name}
          onChangeText={(text) => updateFormData('name', text)}
          testID="input-event-name"
        />
        {formData.name.length > 0 && formData.name.length < 3 && (
          <Text style={styles.inputError}>Il nome deve avere almeno 3 caratteri</Text>
        )}
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Descrizione</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Descrivi il tuo evento..."
          placeholderTextColor={colors.mutedForeground}
          value={formData.description}
          onChangeText={(text) => updateFormData('description', text)}
          multiline
          numberOfLines={4}
          testID="input-event-description"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Location</Text>
        <Pressable
          style={styles.selectButton}
          onPress={() => setShowLocationPicker(!showLocationPicker)}
          testID="button-select-location"
        >
          <View style={styles.selectContent}>
            <Ionicons name="location-outline" size={20} color={selectedLocation ? staticColors.primary : colors.mutedForeground} />
            <Text style={[styles.selectText, !selectedLocation && styles.selectPlaceholder]}>
              {selectedLocation ? selectedLocation.name : 'Seleziona location'}
            </Text>
          </View>
          <Ionicons name={showLocationPicker ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedForeground} />
        </Pressable>
        
        {showLocationPicker && (
          <View style={styles.pickerList}>
            {locations.length > 0 ? locations.map(location => (
              <Pressable
                key={location.id}
                style={[styles.pickerItem, formData.locationId === location.id && styles.pickerItemActive]}
                onPress={() => {
                  updateFormData('locationId', location.id);
                  if (location.capacity && !formData.capacity) {
                    updateFormData('capacity', location.capacity.toString());
                  }
                  setShowLocationPicker(false);
                }}
              >
                <View style={styles.pickerItemContent}>
                  <Text style={styles.pickerItemText}>{location.name}</Text>
                  <Text style={styles.pickerItemSubtext}>{location.city} • Cap. {location.capacity}</Text>
                </View>
                {formData.locationId === location.id && (
                  <Ionicons name="checkmark-circle" size={20} color={staticColors.primary} />
                )}
              </Pressable>
            )) : (
              <Text style={styles.pickerEmpty}>Nessuna location disponibile</Text>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Formato Evento</Text>
        <Pressable
          style={styles.selectButton}
          onPress={() => setShowFormatPicker(!showFormatPicker)}
          testID="button-select-format"
        >
          <View style={styles.selectContent}>
            {selectedFormat ? (
              <View style={[styles.formatDot, { backgroundColor: selectedFormat.color }]} />
            ) : (
              <Ionicons name="color-palette-outline" size={20} color={colors.mutedForeground} />
            )}
            <Text style={[styles.selectText, !selectedFormat && styles.selectPlaceholder]}>
              {selectedFormat ? selectedFormat.name : 'Seleziona formato'}
            </Text>
          </View>
          <Ionicons name={showFormatPicker ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedForeground} />
        </Pressable>
        
        {showFormatPicker && (
          <View style={styles.pickerList}>
            {formats.length > 0 ? formats.map(format => (
              <Pressable
                key={format.id}
                style={[styles.pickerItem, formData.formatId === format.id && styles.pickerItemActive]}
                onPress={() => {
                  updateFormData('formatId', format.id);
                  setShowFormatPicker(false);
                }}
              >
                <View style={styles.pickerItemContent}>
                  <View style={styles.formatRow}>
                    <View style={[styles.formatDot, { backgroundColor: format.color }]} />
                    <Text style={styles.pickerItemText}>{format.name}</Text>
                  </View>
                  <Text style={styles.pickerItemSubtext}>{format.description}</Text>
                </View>
                {formData.formatId === format.id && (
                  <Ionicons name="checkmark-circle" size={20} color={staticColors.primary} />
                )}
              </Pressable>
            )) : (
              <Text style={styles.pickerEmpty}>Nessun formato disponibile</Text>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Capienza Massima</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Es. 500"
          placeholderTextColor={colors.mutedForeground}
          value={formData.capacity}
          onChangeText={(text) => updateFormData('capacity', text.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          testID="input-capacity"
        />
      </View>
      
      <View style={styles.switchRow}>
        <View style={styles.switchInfo}>
          <Text style={styles.switchLabel}>Evento Pubblico</Text>
          <Text style={styles.switchDescription}>Visibile nella ricerca pubblica</Text>
        </View>
        <Switch
          value={formData.isPublic}
          onValueChange={(value) => updateFormData('isPublic', value)}
          trackColor={{ false: colors.muted, true: staticColors.primary }}
          thumbColor={staticColors.foreground}
          testID="switch-public"
        />
      </View>

      {/* SIAE Toggle */}
      <Pressable 
        style={styles.siaeToggle}
        onPress={() => {
          setSiaeEnabled(!siaeEnabled);
          triggerHaptic('medium');
        }}
        testID="toggle-siae"
      >
        <View style={styles.siaeToggleInfo}>
          <View style={styles.siaeToggleIcon}>
            <Ionicons name="document-text" size={24} color={staticColors.primary} />
          </View>
          <View style={styles.siaeToggleText}>
            <Text style={styles.siaeToggleTitle}>Biglietteria SIAE</Text>
            <Text style={styles.siaeToggleDesc}>Abilita conformità fiscale italiana</Text>
          </View>
        </View>
        <Switch
          value={siaeEnabled}
          onValueChange={(value) => {
            setSiaeEnabled(value);
            triggerHaptic('medium');
          }}
          trackColor={{ false: colors.muted, true: staticColors.primary }}
          thumbColor={staticColors.foreground}
          testID="switch-siae"
        />
      </Pressable>
      {siaeEnabled && (
        <View style={styles.siaeEnabledHint}>
          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
          <Text style={styles.siaeEnabledText}>Step SIAE aggiuntivi verranno mostrati</Text>
        </View>
      )}
    </View>
  );

  const renderDateTimeStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Date e Orari</Text>
      <Text style={styles.stepDescription}>Quando si svolgerà l'evento?</Text>
      
      <View style={styles.dateSection}>
        <Text style={styles.sectionLabel}>Inizio Evento</Text>
        
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowStartDatePicker(true)}
          testID="button-start-date"
        >
          <View style={styles.dateIcon}>
            <Ionicons name="calendar" size={20} color={staticColors.primary} />
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Data</Text>
            <Text style={styles.dateValue}>{formatDate(formData.startDate)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>
        
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowStartTimePicker(true)}
          testID="button-start-time"
        >
          <View style={styles.dateIcon}>
            <Ionicons name="time" size={20} color={staticColors.teal} />
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Ora</Text>
            <Text style={styles.dateValue}>{formatTime(formData.startTime)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>
      
      <View style={styles.dateSection}>
        <Text style={styles.sectionLabel}>Fine Evento</Text>
        
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowEndDatePicker(true)}
          testID="button-end-date"
        >
          <View style={styles.dateIcon}>
            <Ionicons name="calendar" size={20} color={staticColors.primary} />
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Data</Text>
            <Text style={styles.dateValue}>{formatDate(formData.endDate)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>
        
        <Pressable
          style={styles.dateButton}
          onPress={() => setShowEndTimePicker(true)}
          testID="button-end-time"
        >
          <View style={styles.dateIcon}>
            <Ionicons name="time" size={20} color={staticColors.teal} />
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Ora</Text>
            <Text style={styles.dateValue}>{formatTime(formData.endTime)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>
      
      {showStartDatePicker && (
        <DateTimePicker
          value={formData.startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowStartDatePicker(Platform.OS === 'ios');
            if (date) updateFormData('startDate', date);
          }}
          minimumDate={new Date()}
        />
      )}
      
      {showStartTimePicker && (
        <DateTimePicker
          value={formData.startTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          is24Hour={true}
          onChange={(event, date) => {
            setShowStartTimePicker(Platform.OS === 'ios');
            if (date) updateFormData('startTime', date);
          }}
        />
      )}
      
      {showEndDatePicker && (
        <DateTimePicker
          value={formData.endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowEndDatePicker(Platform.OS === 'ios');
            if (date) updateFormData('endDate', date);
          }}
          minimumDate={formData.startDate}
        />
      )}
      
      {showEndTimePicker && (
        <DateTimePicker
          value={formData.endTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          is24Hour={true}
          onChange={(event, date) => {
            setShowEndTimePicker(Platform.OS === 'ios');
            if (date) updateFormData('endTime', date);
          }}
        />
      )}
    </View>
  );

  const renderRecurrenceStep = () => {
    const patterns: { id: RecurrencePattern; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
      { id: 'none', label: 'Nessuna', icon: 'remove-circle-outline' },
      { id: 'daily', label: 'Giornaliera', icon: 'today-outline' },
      { id: 'weekly', label: 'Settimanale', icon: 'calendar-outline' },
      { id: 'monthly', label: 'Mensile', icon: 'calendar-number-outline' },
    ];

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Ricorrenza</Text>
        <Text style={styles.stepDescription}>Crea eventi ricorrenti automaticamente</Text>
        
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Evento Ricorrente</Text>
            <Text style={styles.switchDescription}>Ripeti questo evento più volte</Text>
          </View>
          <Switch
            value={formData.isRecurring}
            onValueChange={(value) => {
              updateFormData('isRecurring', value);
              if (!value) updateFormData('recurrencePattern', 'none');
            }}
            trackColor={{ false: colors.muted, true: staticColors.primary }}
            thumbColor={staticColors.foreground}
            testID="switch-recurring"
          />
        </View>
        
        {formData.isRecurring && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Frequenza</Text>
              <View style={styles.patternGrid}>
                {patterns.filter(p => p.id !== 'none').map(pattern => (
                  <Pressable
                    key={pattern.id}
                    style={[
                      styles.patternOption,
                      formData.recurrencePattern === pattern.id && styles.patternOptionActive,
                    ]}
                    onPress={() => updateFormData('recurrencePattern', pattern.id)}
                    testID={`pattern-${pattern.id}`}
                  >
                    <Ionicons 
                      name={pattern.icon} 
                      size={24} 
                      color={formData.recurrencePattern === pattern.id ? staticColors.primaryForeground : colors.mutedForeground} 
                    />
                    <Text style={[
                      styles.patternLabel,
                      formData.recurrencePattern === pattern.id && styles.patternLabelActive,
                    ]}>
                      {pattern.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ripeti ogni</Text>
              <View style={styles.intervalRow}>
                <Pressable
                  style={styles.intervalButton}
                  onPress={() => updateFormData('recurrenceInterval', Math.max(1, formData.recurrenceInterval - 1))}
                >
                  <Ionicons name="remove" size={24} color={staticColors.foreground} />
                </Pressable>
                <Text style={styles.intervalValue}>{formData.recurrenceInterval}</Text>
                <Pressable
                  style={styles.intervalButton}
                  onPress={() => updateFormData('recurrenceInterval', formData.recurrenceInterval + 1)}
                >
                  <Ionicons name="add" size={24} color={staticColors.foreground} />
                </Pressable>
                <Text style={styles.intervalLabel}>
                  {formData.recurrencePattern === 'daily' ? 'giorni' : 
                   formData.recurrencePattern === 'weekly' ? 'settimane' : 'mesi'}
                </Text>
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Numero di occorrenze</Text>
              <View style={styles.intervalRow}>
                <Pressable
                  style={styles.intervalButton}
                  onPress={() => updateFormData('recurrenceCount', Math.max(1, formData.recurrenceCount - 1))}
                >
                  <Ionicons name="remove" size={24} color={staticColors.foreground} />
                </Pressable>
                <Text style={styles.intervalValue}>{formData.recurrenceCount}</Text>
                <Pressable
                  style={styles.intervalButton}
                  onPress={() => updateFormData('recurrenceCount', formData.recurrenceCount + 1)}
                >
                  <Ionicons name="add" size={24} color={staticColors.foreground} />
                </Pressable>
                <Text style={styles.intervalLabel}>eventi</Text>
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  const SIAE_GENRES = [
    { code: 'A1', name: 'Concerto musica leggera', taxType: 'S' as const },
    { code: 'A2', name: 'Concerto musica classica', taxType: 'S' as const },
    { code: 'B1', name: 'Discoteca/Sala da ballo', taxType: 'I' as const },
    { code: 'B2', name: 'Trattenimento musicale', taxType: 'I' as const },
    { code: 'C1', name: 'Spettacolo teatrale', taxType: 'S' as const },
    { code: 'D1', name: 'Manifestazione sportiva', taxType: 'S' as const },
    { code: 'E1', name: 'Esposizione/Fiera', taxType: 'I' as const },
  ];

  const renderSiaeStep = () => {
    const selectedGenre = SIAE_GENRES.find(g => g.code === siaeGenreCode);
    const vatRate = siaeTaxType === 'S' ? '10%' : '22%';

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Biglietteria SIAE</Text>
        <Text style={styles.stepDescription}>Configura la fiscalità dell'evento</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Genere Evento (TAB.1 SIAE) *</Text>
          <Pressable
            style={[styles.pickerButton, { backgroundColor: colors.secondary }]}
            onPress={() => setShowGenrePicker(true)}
            testID="button-genre-picker"
          >
            <Ionicons name="musical-notes-outline" size={20} color={colors.mutedForeground} />
            <Text style={[styles.pickerButtonText, { color: selectedGenre ? colors.foreground : colors.mutedForeground }]}>
              {selectedGenre ? `${selectedGenre.code} - ${selectedGenre.name}` : 'Seleziona genere'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {showGenrePicker && (
          <Card style={styles.pickerCard}>
            <ScrollView style={{ maxHeight: 250 }}>
              {SIAE_GENRES.map(genre => (
                <Pressable
                  key={genre.code}
                  style={[styles.pickerOption, siaeGenreCode === genre.code && styles.pickerOptionActive]}
                  onPress={() => {
                    setSiaeGenreCode(genre.code);
                    setSiaeTaxType(genre.taxType);
                    setShowGenrePicker(false);
                    triggerHaptic('light');
                  }}
                  testID={`genre-option-${genre.code}`}
                >
                  <Text style={[styles.pickerOptionCode, { color: colors.primary }]}>{genre.code}</Text>
                  <Text style={[styles.pickerOptionText, { color: colors.foreground }]}>{genre.name}</Text>
                  {siaeGenreCode === genre.code && (
                    <Ionicons name="checkmark-circle" size={20} color={staticColors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Card>
        )}

        {siaeGenreCode && (
          <Card style={{...styles.vatCard, borderColor: staticColors.primary + '40'}}>
            <View style={styles.vatRow}>
              <View>
                <Text style={styles.vatLabel}>Aliquota IVA Applicata</Text>
                <Text style={styles.vatDescription}>Questa aliquota sarà applicata a tutti i biglietti</Text>
              </View>
              <Badge variant="golden" testID="badge-vat-rate">{vatRate}</Badge>
            </View>
          </Card>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tipo Imposta</Text>
          <View style={styles.taxTypeRow}>
            <Pressable
              style={[styles.taxTypeOption, siaeTaxType === 'S' && styles.taxTypeOptionActive]}
              onPress={() => { setSiaeTaxType('S'); triggerHaptic('light'); }}
              testID="tax-type-S"
            >
              <Text style={[styles.taxTypeLabel, siaeTaxType === 'S' && styles.taxTypeLabelActive]}>Spettacolo</Text>
              <Text style={styles.taxTypeDesc}>IVA 10%</Text>
            </Pressable>
            <Pressable
              style={[styles.taxTypeOption, siaeTaxType === 'I' && styles.taxTypeOptionActive]}
              onPress={() => { setSiaeTaxType('I'); triggerHaptic('light'); }}
              testID="tax-type-I"
            >
              <Text style={[styles.taxTypeLabel, siaeTaxType === 'I' && styles.taxTypeLabelActive]}>Intrattenimento</Text>
              <Text style={styles.taxTypeDesc}>IVA 22% + ISI</Text>
            </Pressable>
          </View>
        </View>

        <Card style={{...styles.isiCard, backgroundColor: siaeTaxType === 'I' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)'}}>
          <View style={styles.isiRow}>
            <View style={[styles.isiIcon, { backgroundColor: siaeTaxType === 'I' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)' }]}>
              <Ionicons 
                name={siaeTaxType === 'I' ? 'warning-outline' : 'checkmark-circle-outline'} 
                size={24} 
                color={siaeTaxType === 'I' ? '#F59E0B' : '#22C55E'} 
              />
            </View>
            <View style={styles.isiInfo}>
              <Text style={[styles.isiTitle, { color: siaeTaxType === 'I' ? '#F59E0B' : '#22C55E' }]}>
                Imposta Intrattenimenti (ISI)
              </Text>
              <Text style={styles.isiDesc}>
                {siaeTaxType === 'I' 
                  ? 'Dovuta al 16% - Musica NON dal vivo o < 51%' 
                  : 'Non dovuta - Musica dal vivo ≥ 51%'}
              </Text>
            </View>
            <Badge variant={siaeTaxType === 'I' ? 'warning' : 'success'}>
              {siaeTaxType === 'I' ? 'ISI 16%' : 'ESENTE'}
            </Badge>
          </View>
        </Card>

        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Biglietti Nominativi</Text>
            <Text style={styles.switchDescription}>Obbligatorio per eventi &gt;5000 persone</Text>
          </View>
          <Switch
            value={siaeRequiresNominative}
            onValueChange={(value) => {
              setSiaeRequiresNominative(value);
              triggerHaptic('light');
            }}
            trackColor={{ false: colors.muted, true: staticColors.primary }}
            thumbColor={staticColors.foreground}
            testID="switch-nominative"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Max Biglietti per Utente</Text>
          <Text style={styles.inputHint}>Massimo 10 per normativa SIAE</Text>
          <View style={styles.intervalRow}>
            <Pressable
              style={styles.intervalButton}
              onPress={() => setSiaeMaxTicketsPerUser(Math.max(1, siaeMaxTicketsPerUser - 1))}
              testID="button-max-tickets-minus"
            >
              <Ionicons name="remove" size={24} color={staticColors.foreground} />
            </Pressable>
            <Text style={styles.intervalValue}>{siaeMaxTicketsPerUser}</Text>
            <Pressable
              style={styles.intervalButton}
              onPress={() => setSiaeMaxTicketsPerUser(Math.min(10, siaeMaxTicketsPerUser + 1))}
              testID="button-max-tickets-plus"
            >
              <Ionicons name="add" size={24} color={staticColors.foreground} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const addNewTicket = () => {
    const newTicket: TicketConfig = {
      id: Date.now().toString(),
      name: '',
      ticketType: 'INT',
      price: '20.00',
      ddp: '0',
      sectorCode: '',
      isNumbered: false,
      quantity: 100,
    };
    setSiaeSectors([...siaeSectors, newTicket]);
    triggerHaptic('light');
  };

  const updateTicket = (id: string, field: keyof TicketConfig, value: any) => {
    setSiaeSectors(siaeSectors.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTicket = (id: string) => {
    setSiaeSectors(siaeSectors.filter(t => t.id !== id));
    triggerHaptic('medium');
  };

  const addNewSubscription = () => {
    const newSub: SubscriptionTypeConfig = {
      id: Date.now().toString(),
      name: '',
      description: '',
      turnType: 'F',
      eventsCount: 5,
      price: '100.00',
    };
    setSiaeSubscriptionTypes([...siaeSubscriptionTypes, newSub]);
    triggerHaptic('light');
  };

  const updateSubscription = (id: string, field: keyof SubscriptionTypeConfig, value: any) => {
    setSiaeSubscriptionTypes(siaeSubscriptionTypes.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSubscription = (id: string) => {
    setSiaeSubscriptionTypes(siaeSubscriptionTypes.filter(s => s.id !== id));
    triggerHaptic('medium');
  };

  const TICKET_TYPES = [
    { id: 'INT', label: 'Intero' },
    { id: 'RID', label: 'Ridotto' },
    { id: 'OMA', label: 'Omaggio' },
  ];

  const TURN_TYPES = [
    { id: 'F', label: 'Fisso' },
    { id: 'L', label: 'Libero' },
  ];

  const renderTicketsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Biglietti & Abbonamenti</Text>
      <Text style={styles.stepDescription}>Configura prezzi e tipologie</Text>
      
      {siaeSectors.length === 0 ? (
        <Card style={styles.emptyTicketsCard}>
          <Ionicons name="ticket-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun biglietto configurato</Text>
          <Pressable 
            style={[styles.addButton, { backgroundColor: staticColors.primary }]}
            onPress={addNewTicket}
            testID="button-add-first-ticket"
          >
            <Ionicons name="add" size={20} color={staticColors.primaryForeground} />
            <Text style={styles.addButtonText}>Crea Primo Biglietto</Text>
          </Pressable>
        </Card>
      ) : (
        <>
          {siaeSectors.map((ticket, index) => (
            <Card key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketNumber}>Biglietto {index + 1}</Text>
                <Pressable onPress={() => removeTicket(ticket.id)} testID={`button-remove-ticket-${index}`}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome Biglietto *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground }]}
                  value={ticket.name}
                  onChangeText={(text) => updateTicket(ticket.id, 'name', text)}
                  placeholder="es. Ingresso Standard, VIP"
                  placeholderTextColor={colors.mutedForeground}
                  testID={`input-ticket-name-${index}`}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipologia *</Text>
                <View style={styles.ticketTypeRow}>
                  {TICKET_TYPES.map(type => (
                    <Pressable
                      key={type.id}
                      style={[styles.ticketTypeOption, ticket.ticketType === type.id && styles.ticketTypeOptionActive]}
                      onPress={() => updateTicket(ticket.id, 'ticketType', type.id)}
                      testID={`ticket-type-${type.id}-${index}`}
                    >
                      <Text style={[styles.ticketTypeLabel, ticket.ticketType === type.id && styles.ticketTypeLabelActive]}>
                        {type.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.priceRow}>
                <View style={styles.priceInput}>
                  <Text style={styles.inputLabel}>Prezzo € *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground }]}
                    value={ticket.price}
                    onChangeText={(text) => updateTicket(ticket.id, 'price', text)}
                    keyboardType="decimal-pad"
                    placeholder="20.00"
                    placeholderTextColor={colors.mutedForeground}
                    testID={`input-price-${index}`}
                  />
                </View>
                <View style={styles.priceInput}>
                  <Text style={styles.inputLabel}>DDP €</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground }]}
                    value={ticket.ddp}
                    onChangeText={(text) => updateTicket(ticket.id, 'ddp', text)}
                    keyboardType="decimal-pad"
                    placeholder="2.00"
                    placeholderTextColor={colors.mutedForeground}
                    testID={`input-ddp-${index}`}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantità *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground }]}
                  value={ticket.quantity.toString()}
                  onChangeText={(text) => updateTicket(ticket.id, 'quantity', parseInt(text) || 0)}
                  keyboardType="number-pad"
                  placeholder="100"
                  placeholderTextColor={colors.mutedForeground}
                  testID={`input-quantity-${index}`}
                />
              </View>

              <View style={styles.checkboxRow}>
                <Pressable
                  style={styles.checkbox}
                  onPress={() => updateTicket(ticket.id, 'isNumbered', !ticket.isNumbered)}
                  testID={`checkbox-numbered-${index}`}
                >
                  <Ionicons 
                    name={ticket.isNumbered ? 'checkbox' : 'square-outline'} 
                    size={24} 
                    color={ticket.isNumbered ? staticColors.primary : colors.mutedForeground} 
                  />
                  <Text style={styles.checkboxLabel}>Posti numerati</Text>
                </Pressable>
              </View>
            </Card>
          ))}

          <Pressable 
            style={[styles.addButton, styles.addButtonOutline]}
            onPress={addNewTicket}
            testID="button-add-ticket"
          >
            <Ionicons name="add" size={20} color={staticColors.primary} />
            <Text style={[styles.addButtonText, { color: staticColors.primary }]}>Aggiungi Biglietto</Text>
          </Pressable>
        </>
      )}

      <View style={styles.subscriptionSection}>
        <View style={styles.subscriptionHeader}>
          <Text style={styles.subscriptionTitle}>Tipologie Abbonamenti</Text>
          <Pressable onPress={addNewSubscription} testID="button-add-subscription">
            <Ionicons name="add-circle-outline" size={28} color={staticColors.primary} />
          </Pressable>
        </View>

        {siaeSubscriptionTypes.length === 0 ? (
          <Text style={styles.subscriptionEmpty}>Nessun abbonamento. Aggiungi per eventi multi-giorno.</Text>
        ) : (
          siaeSubscriptionTypes.map((sub, index) => (
            <Card key={sub.id} style={styles.subscriptionCard}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketNumber}>Abbonamento {index + 1}</Text>
                <Pressable onPress={() => removeSubscription(sub.id)} testID={`button-remove-sub-${index}`}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground }]}
                  value={sub.name}
                  onChangeText={(text) => updateSubscription(sub.id, 'name', text)}
                  placeholder="es. Abbonamento 5 serate"
                  placeholderTextColor={colors.mutedForeground}
                  testID={`input-sub-name-${index}`}
                />
              </View>

              <View style={styles.priceRow}>
                <View style={styles.priceInput}>
                  <Text style={styles.inputLabel}>Tipo Turno</Text>
                  <View style={styles.turnTypeRow}>
                    {TURN_TYPES.map(type => (
                      <Pressable
                        key={type.id}
                        style={[styles.turnTypeOption, sub.turnType === type.id && styles.turnTypeOptionActive]}
                        onPress={() => updateSubscription(sub.id, 'turnType', type.id)}
                        testID={`turn-type-${type.id}-${index}`}
                      >
                        <Text style={[styles.turnTypeLabel, sub.turnType === type.id && styles.turnTypeLabelActive]}>
                          {type.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.priceInput}>
                  <Text style={styles.inputLabel}>N. Eventi</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground }]}
                    value={sub.eventsCount.toString()}
                    onChangeText={(text) => updateSubscription(sub.id, 'eventsCount', parseInt(text) || 0)}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor={colors.mutedForeground}
                    testID={`input-sub-events-${index}`}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Prezzo €</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground }]}
                  value={sub.price}
                  onChangeText={(text) => updateSubscription(sub.id, 'price', text)}
                  keyboardType="decimal-pad"
                  placeholder="100.00"
                  placeholderTextColor={colors.mutedForeground}
                  testID={`input-sub-price-${index}`}
                />
              </View>
            </Card>
          ))
        )}
      </View>
    </View>
  );

  const renderSummaryStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Riepilogo</Text>
      <Text style={styles.stepDescription}>Verifica i dettagli prima di pubblicare</Text>
      
      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.summaryBadge}
          >
            <Ionicons name="sparkles" size={20} color={staticColors.primaryForeground} />
          </LinearGradient>
          <Text style={styles.summaryTitle} numberOfLines={2}>{formData.name || 'Evento senza nome'}</Text>
        </View>
        
        {formData.description && (
          <Text style={styles.summaryDescription} numberOfLines={3}>{formData.description}</Text>
        )}
        
        <View style={styles.summaryDivider} />
        
        <View style={styles.summaryRow}>
          <View style={[styles.summaryIcon, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
            <Ionicons name="calendar" size={18} color="#60A5FA" />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Data e Ora</Text>
            <Text style={styles.summaryValue}>
              {formatDate(formData.startDate)} • {formatTime(formData.startTime)}
            </Text>
          </View>
        </View>
        
        {selectedLocation && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="location" size={18} color="#A855F7" />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>Location</Text>
              <Text style={styles.summaryValue}>{selectedLocation.name}</Text>
            </View>
          </View>
        )}
        
        {selectedFormat && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIcon, { backgroundColor: selectedFormat.color + '25' }]}>
              <View style={[styles.formatDotSmall, { backgroundColor: selectedFormat.color }]} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>Formato</Text>
              <Text style={styles.summaryValue}>{selectedFormat.name}</Text>
            </View>
          </View>
        )}
        
        {formData.capacity && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
              <Ionicons name="people" size={18} color="#34D399" />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>Capienza</Text>
              <Text style={styles.summaryValue}>{formData.capacity} persone</Text>
            </View>
          </View>
        )}
        
        {formData.isRecurring && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
              <Ionicons name="repeat" size={18} color="#FBBF24" />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>Ricorrenza</Text>
              <Text style={styles.summaryValue}>
                {formData.recurrenceCount} eventi, ogni {formData.recurrenceInterval}{' '}
                {formData.recurrencePattern === 'daily' ? 'giorni' : 
                 formData.recurrencePattern === 'weekly' ? 'settimane' : 'mesi'}
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.summaryRow}>
          <View style={[styles.summaryIcon, { backgroundColor: formData.isPublic ? 'rgba(52, 211, 153, 0.15)' : 'rgba(156, 163, 175, 0.15)' }]}>
            <Ionicons name={formData.isPublic ? "globe" : "lock-closed"} size={18} color={formData.isPublic ? "#34D399" : "#9CA3AF"} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Visibilità</Text>
            <Text style={styles.summaryValue}>{formData.isPublic ? 'Pubblico' : 'Privato'}</Text>
          </View>
        </View>
      </Card>
      
      {/* SIAE Summary Section */}
      {siaeEnabled && (
        <Card style={styles.siaeSummaryCard}>
          <View style={styles.siaeSummaryHeader}>
            <View style={styles.siaeSummaryIcon}>
              <Ionicons name="document-text" size={20} color={staticColors.primary} />
            </View>
            <View>
              <Text style={styles.siaeSummaryTitle}>Configurazione SIAE</Text>
              <Text style={styles.siaeSummarySubtitle}>Biglietteria fiscale italiana</Text>
            </View>
            <Badge variant="success" testID="badge-siae-enabled">Attivo</Badge>
          </View>
          
          <View style={styles.summaryDivider} />
          
          {selectedSiaeGenre && (
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Ionicons name="musical-notes" size={18} color="#8B5CF6" />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>Genere Spettacolo</Text>
                <Text style={styles.summaryValue}>{siaeGenreCode} - {selectedSiaeGenre.descrizione}</Text>
              </View>
            </View>
          )}
          
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <Ionicons name="receipt" size={18} color="#EC4899" />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>Tipo Imposta</Text>
              <Text style={styles.summaryValue}>
                {siaeTaxType === 'S' ? 'Spettacolo (IVA 10%)' : 'Intrattenimento (IVA 22% + ISI 16%)'}
              </Text>
            </View>
          </View>
          
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
              <Ionicons name="pricetag" size={18} color="#FBBF24" />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>Aliquota IVA</Text>
              <Text style={styles.summaryValue}>{vatRate}</Text>
            </View>
          </View>
          
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIcon, { backgroundColor: siaeRequiresNominative ? 'rgba(52, 211, 153, 0.15)' : 'rgba(156, 163, 175, 0.15)' }]}>
              <Ionicons name={siaeRequiresNominative ? "person-circle" : "person-outline"} size={18} color={siaeRequiresNominative ? "#34D399" : "#9CA3AF"} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>Biglietti Nominativi</Text>
              <Text style={styles.summaryValue}>{siaeRequiresNominative ? 'Obbligatori' : 'Non richiesti'}</Text>
            </View>
          </View>
          
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
              <Ionicons name="ticket" size={18} color="#60A5FA" />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>Max Biglietti/Utente</Text>
              <Text style={styles.summaryValue}>{siaeMaxTicketsPerUser} biglietti</Text>
            </View>
          </View>
          
          {siaeSectors.length > 0 && (
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Ionicons name="layers" size={18} color="#22C55E" />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>Tipologie Biglietti</Text>
                <Text style={styles.summaryValue}>{siaeSectors.length} configurate</Text>
              </View>
            </View>
          )}
          
          {siaeSubscriptionTypes.length > 0 && (
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Ionicons name="card" size={18} color="#8B5CF6" />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>Abbonamenti</Text>
                <Text style={styles.summaryValue}>{siaeSubscriptionTypes.length} configurati</Text>
              </View>
            </View>
          )}
        </Card>
      )}
      
      <View style={styles.publishActions}>
        <Button
          variant="outline"
          onPress={saveDraft}
          disabled={saving || publishing}
          style={styles.draftButton}
          testID="button-save-draft"
        >
          {saving ? (
            <Loading size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={staticColors.foreground} />
              <Text style={styles.draftButtonText}>Salva Bozza</Text>
            </>
          )}
        </Button>
        
        <Button
          onPress={publishEvent}
          disabled={saving || publishing || !formData.name.trim()}
          style={styles.publishButton}
          testID="button-publish"
        >
          {publishing ? (
            <Loading size="small" />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={20} color={staticColors.primaryForeground} />
              <Text style={styles.publishButtonText}>Pubblica Evento</Text>
            </>
          )}
        </Button>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (currentStep.id) {
      case 'info':
        return renderInfoStep();
      case 'datetime':
        return renderDateTimeStep();
      case 'recurrence':
        return renderRecurrenceStep();
      case 'siae':
        return renderSiaeStep();
      case 'tickets':
        return renderTicketsStep();
      case 'summary':
        return renderSummaryStep();
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <SafeArea style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-create-event" />
        <Loading text="Caricamento..." />
      </SafeArea>
    );
  }

  if (hasError) {
    return (
      <SafeArea style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-create-event" />
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={48} color={staticColors.destructive} />
          <Text style={styles.errorTitle}>Errore di caricamento</Text>
          <Text style={styles.errorText}>Impossibile caricare i dati necessari.</Text>
          <Button onPress={loadData}>
            <Ionicons name="refresh" size={20} color={staticColors.primaryForeground} />
            <Text style={styles.retryText}>Riprova</Text>
          </Button>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header 
        showLogo 
        showBack 
        onBack={goBack} 
        title={editEventId ? "Modifica Evento" : "Crea Evento"}
        testID="header-create-event" 
      />
      
      {renderProgressBar()}
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>
        
        {!isLastStep && (
          <View style={styles.footer}>
            <Button
              variant="outline"
              onPress={goBack}
              style={styles.backButton}
              testID="button-back"
            >
              <Ionicons name="arrow-back" size={20} color={staticColors.foreground} />
              <Text style={styles.backButtonText}>Indietro</Text>
            </Button>
            
            <Button
              onPress={goNext}
              disabled={!canGoNext()}
              style={{...styles.nextButton, ...(!canGoNext() ? styles.nextButtonDisabled : {})}}
              testID="button-next"
            >
              <Text style={styles.nextButtonText}>Avanti</Text>
              <Ionicons name="arrow-forward" size={20} color={staticColors.primaryForeground} />
            </Button>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: staticColors.secondary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: staticColors.primary,
    borderRadius: 2,
  },
  stepsIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepIndicator: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: staticColors.primary,
  },
  stepDotCompleted: {
    backgroundColor: staticColors.primary,
  },
  stepLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: staticColors.primary,
    fontWeight: '600',
  },
  stepContent: {
    gap: spacing.lg,
  },
  stepTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  stepDescription: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    marginTop: -spacing.sm,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  textInput: {
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    fontSize: typography.fontSize.xs,
    color: staticColors.destructive,
    marginTop: 4,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectText: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  selectPlaceholder: {
    color: staticColors.mutedForeground,
  },
  formatDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  formatDotSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pickerList: {
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  pickerItemActive: {
    backgroundColor: `${staticColors.primary}15`,
  },
  pickerItemContent: {
    flex: 1,
    gap: 2,
  },
  pickerItemText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  pickerItemSubtext: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickerEmpty: {
    padding: spacing.lg,
    textAlign: 'center',
    color: staticColors.mutedForeground,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.md,
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
  dateSection: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: staticColors.border,
    gap: spacing.md,
  },
  dateIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  dateValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: 2,
  },
  patternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  patternOption: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
    gap: spacing.xs,
  },
  patternOptionActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  patternLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  patternLabelActive: {
    color: staticColors.primaryForeground,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  intervalButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  intervalValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    minWidth: 50,
    textAlign: 'center',
  },
  intervalLabel: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    marginLeft: spacing.sm,
  },
  summaryCard: {
    padding: spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    flex: 1,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  summaryDescription: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    marginBottom: spacing.md,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
    marginTop: 2,
  },
  publishActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  draftButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  publishButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  publishButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    backgroundColor: staticColors.background,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  retryText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
    marginLeft: spacing.sm,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
    gap: spacing.sm,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },
  pickerCard: {
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  pickerOptionActive: {
    backgroundColor: `${staticColors.primary}15`,
  },
  pickerOptionCode: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    width: 36,
  },
  pickerOptionText: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },
  vatCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 2,
    backgroundColor: `${staticColors.primary}10`,
  },
  vatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vatLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  vatDescription: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  taxTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  taxTypeOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
    gap: spacing.xs,
  },
  taxTypeOptionActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  taxTypeLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  taxTypeLabelActive: {
    color: staticColors.primaryForeground,
  },
  taxTypeDesc: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  isiCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  isiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  isiIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  isiInfo: {
    flex: 1,
  },
  isiTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  isiDesc: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  inputHint: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: spacing.xs,
  },
  emptyTicketsCard: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  ticketCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  ticketNumber: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  input: {
    height: 48,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.base,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  ticketTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ticketTypeOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  ticketTypeOptionActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  ticketTypeLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  ticketTypeLabelActive: {
    color: staticColors.primaryForeground,
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  priceInput: {
    flex: 1,
  },
  checkboxRow: {
    marginTop: spacing.sm,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkboxLabel: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  subscriptionSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  subscriptionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  subscriptionEmpty: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    padding: spacing.md,
  },
  subscriptionCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  turnTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  turnTypeOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  turnTypeOptionActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  turnTypeLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  turnTypeLabelActive: {
    color: staticColors.primaryForeground,
  },
  siaeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${staticColors.primary}15`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: `${staticColors.primary}40`,
    marginTop: spacing.md,
  },
  siaeToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  siaeToggleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${staticColors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siaeToggleText: {
    flex: 1,
  },
  siaeToggleTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  siaeToggleDesc: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  siaeEnabledHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  siaeEnabledText: {
    fontSize: typography.fontSize.sm,
    color: '#22C55E',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  addButtonOutline: {
    borderWidth: 1,
    borderColor: staticColors.primary,
    backgroundColor: 'transparent',
  },
  addButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  siaeSummaryCard: {
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: `${staticColors.primary}40`,
    backgroundColor: `${staticColors.primary}08`,
  },
  siaeSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  siaeSummaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${staticColors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siaeSummaryTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  siaeSummarySubtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
});

export default GestoreCreateEventScreen;
