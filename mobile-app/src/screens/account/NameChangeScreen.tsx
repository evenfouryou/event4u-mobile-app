import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

interface NameChangeScreenProps {
  ticketId: string;
  onBack: () => void;
  onSuccess: () => void;
}

interface TicketData {
  id: string;
  ticketCode: string;
  ticketType: string;
  ticketPrice: number;
  participantFirstName: string | null;
  participantLastName: string | null;
  eventName: string | null;
  eventStart: string | null;
  locationName: string | null;
  locationAddress: string | null;
  sectorName: string | null;
  canNameChange: boolean;
  nameChangeFee: string;
  hoursToEvent: number;
}

type DocumentType = 'carta_identita' | 'passaporto' | 'patente';

export function NameChangeScreen({ ticketId, onBack, onSuccess }: NameChangeScreenProps) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [step, setStep] = useState<'form' | 'confirm' | 'success' | 'error'>('form');
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [formData, setFormData] = useState({
    newFirstName: '',
    newLastName: '',
    newEmail: '',
    newFiscalCode: '',
    newDocumentType: 'carta_identita' as DocumentType,
    newDocumentNumber: '',
    newDateOfBirth: '',
  });
  const [error, setError] = useState('');
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);

  useEffect(() => {
    loadTicketData();
  }, [ticketId]);

  const loadTicketData = async () => {
    try {
      setInitialLoading(true);
      const data = await api.getTicketById(ticketId) as any;
      setTicket({
        id: data.id,
        ticketCode: data.ticketCode,
        ticketType: data.ticketType,
        ticketPrice: Number(data.ticketPrice) || 0,
        participantFirstName: data.participantFirstName,
        participantLastName: data.participantLastName,
        eventName: data.eventName,
        eventStart: data.eventStart,
        locationName: data.locationName,
        locationAddress: data.locationAddress,
        sectorName: data.sectorName,
        canNameChange: data.canNameChange,
        nameChangeFee: data.nameChangeFee || '0',
        hoursToEvent: data.hoursToEvent || 0,
      });
    } catch (err) {
      console.error('Error loading ticket:', err);
      setError('Impossibile caricare i dati del biglietto');
      setStep('error');
    } finally {
      setInitialLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateDateOfBirth = (dateStr: string): boolean => {
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateStr.match(dateRegex);
    if (!match) return false;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;
    
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
  };

  const formatDateInput = (text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  };

  const validateForm = () => {
    if (!formData.newFirstName || formData.newFirstName.length < 2) {
      return 'Il nome deve avere almeno 2 caratteri';
    }
    if (!formData.newLastName || formData.newLastName.length < 2) {
      return 'Il cognome deve avere almeno 2 caratteri';
    }
    if (!formData.newEmail || !formData.newEmail.includes('@')) {
      return 'Inserisci una email valida';
    }
    if (!formData.newFiscalCode || formData.newFiscalCode.length !== 16) {
      return 'Il codice fiscale deve essere di 16 caratteri';
    }
    if (!formData.newDocumentType) {
      return 'Seleziona un tipo di documento';
    }
    if (!formData.newDocumentNumber || formData.newDocumentNumber.length < 5) {
      return 'Inserisci un numero documento valido';
    }
    if (!formData.newDateOfBirth) {
      return 'Inserisci la data di nascita';
    }
    if (!validateDateOfBirth(formData.newDateOfBirth)) {
      return 'Formato data non valido. Usa GG/MM/AAAA (es. 01/01/1990)';
    }
    return null;
  };

  const handleContinue = () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      triggerHaptic('error');
      return;
    }
    setError('');
    triggerHaptic('medium');
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!ticket) return;
    
    setLoading(true);
    triggerHaptic('medium');

    try {
      const response = await api.requestNameChange(ticketId, {
        newFirstName: formData.newFirstName,
        newLastName: formData.newLastName,
        newEmail: formData.newEmail,
        newFiscalCode: formData.newFiscalCode.toUpperCase(),
        newDocumentType: formData.newDocumentType,
        newDocumentNumber: formData.newDocumentNumber,
        newDateOfBirth: formData.newDateOfBirth,
      });

      if (response.requiresPayment) {
        // For now, show message that payment needs to be done on web
        Alert.alert(
          'Pagamento Richiesto',
          `Il cambio nominativo richiede un pagamento di €${Number(ticket.nameChangeFee).toFixed(2)}. Completa il pagamento dal sito web.`,
          [{ text: 'OK', onPress: onSuccess }]
        );
      } else {
        triggerHaptic('success');
        setStep('success');
      }
    } catch (err: any) {
      console.error('Error requesting name change:', err);
      setError(err.message || 'Impossibile completare la richiesta');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Data non disponibile';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    switch (type) {
      case 'carta_identita': return 'Carta d\'Identità';
      case 'passaporto': return 'Passaporto';
      case 'patente': return 'Patente';
      default: return 'Seleziona documento';
    }
  };

  const documentTypes: DocumentType[] = ['carta_identita', 'passaporto', 'patente'];

  if (initialLoading) {
    return <Loading text="Caricamento biglietto..." />;
  }

  if (step === 'error' || !ticket) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} />
        <View style={styles.errorStateContainer}>
          <Ionicons name="alert-circle" size={64} color={staticColors.destructive} />
          <Text style={styles.errorStateTitle}>Errore</Text>
          <Text style={styles.errorStateText}>{error || 'Impossibile caricare il biglietto'}</Text>
          <Button variant="outline" onPress={onBack} style={{ marginTop: spacing.lg }}>
            Torna Indietro
          </Button>
        </View>
      </SafeArea>
    );
  }

  if (!ticket.canNameChange) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} />
        <View style={styles.errorStateContainer}>
          <Ionicons name="close-circle" size={64} color={staticColors.warning} />
          <Text style={styles.errorStateTitle}>Non Disponibile</Text>
          <Text style={styles.errorStateText}>
            Il cambio nominativo non è disponibile per questo biglietto.
            {ticket.hoursToEvent < 24 && '\n\nIl cambio nominativo è disponibile fino a 24 ore prima dell\'evento.'}
          </Text>
          <Button variant="outline" onPress={onBack} style={{ marginTop: spacing.lg }}>
            Torna Indietro
          </Button>
        </View>
      </SafeArea>
    );
  }

  const currentHolder = `${ticket.participantFirstName || ''} ${ticket.participantLastName || ''}`.trim() || 'N/A';
  const changeFee = Number(ticket.nameChangeFee) || 0;

  if (step === 'success') {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={staticColors.success} />
          </View>
          <View>
            <Text style={styles.successTitle}>Richiesta Inviata!</Text>
            <Text style={styles.successText}>
              Il cambio nominativo è stato elaborato con successo.{'\n\n'}
              Il nuovo intestatario riceverà una email di conferma con il biglietto aggiornato.
            </Text>
          </View>
          <View style={styles.successActions}>
            <Button variant="golden" size="lg" onPress={onSuccess} testID="button-done">
              Torna ai Biglietti
            </Button>
          </View>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-name-change" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Card style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Ionicons name="ticket" size={24} color={staticColors.primary} />
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketEventName}>{ticket.eventName || 'Evento'}</Text>
                  <Text style={styles.ticketDate}>{formatDate(ticket.eventStart)}</Text>
                  {ticket.locationName && (
                    <Text style={styles.ticketLocation}>{ticket.locationName}</Text>
                  )}
                </View>
                <Badge variant="default">{ticket.ticketType}</Badge>
              </View>
              <View style={styles.ticketDivider} />
              <View style={styles.currentHolder}>
                <Text style={styles.currentHolderLabel}>Attuale intestatario</Text>
                <Text style={styles.currentHolderName}>{currentHolder}</Text>
              </View>
            </Card>
          </View>

          {step === 'form' && (
            <View>
              <Text style={styles.sectionTitle}>Nuovo Intestatario</Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Card style={styles.formCard}>
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <Input
                      label="Nome *"
                      value={formData.newFirstName}
                      onChangeText={(v) => updateField('newFirstName', v)}
                      placeholder="Nome"
                      autoCapitalize="words"
                      testID="input-newFirstName"
                    />
                  </View>
                  <View style={styles.formHalf}>
                    <Input
                      label="Cognome *"
                      value={formData.newLastName}
                      onChangeText={(v) => updateField('newLastName', v)}
                      placeholder="Cognome"
                      autoCapitalize="words"
                      testID="input-newLastName"
                    />
                  </View>
                </View>

                <Input
                  label="Email *"
                  value={formData.newEmail}
                  onChangeText={(v) => updateField('newEmail', v)}
                  placeholder="email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="mail-outline"
                  testID="input-newEmail"
                />

                <Input
                  label="Codice Fiscale *"
                  value={formData.newFiscalCode}
                  onChangeText={(v) => updateField('newFiscalCode', v.toUpperCase())}
                  placeholder="RSSMRA85M01H501Z"
                  autoCapitalize="characters"
                  maxLength={16}
                  leftIcon="card-outline"
                  testID="input-newFiscalCode"
                />

                <Input
                  label="Data di Nascita *"
                  value={formData.newDateOfBirth}
                  onChangeText={(v) => updateField('newDateOfBirth', formatDateInput(v))}
                  placeholder="GG/MM/AAAA"
                  keyboardType="numeric"
                  maxLength={10}
                  leftIcon="calendar-outline"
                  testID="input-newDateOfBirth"
                />

                <Text style={styles.inputLabel}>Tipo Documento *</Text>
                <Pressable
                  style={styles.documentPicker}
                  onPress={() => setShowDocumentPicker(!showDocumentPicker)}
                  testID="select-documentType"
                >
                  <Ionicons name="document-text-outline" size={20} color={staticColors.mutedForeground} />
                  <Text style={styles.documentPickerText}>{getDocumentTypeLabel(formData.newDocumentType)}</Text>
                  <Ionicons name={showDocumentPicker ? 'chevron-up' : 'chevron-down'} size={20} color={staticColors.mutedForeground} />
                </Pressable>
                {showDocumentPicker && (
                  <View style={styles.documentOptions}>
                    {documentTypes.map((type) => (
                      <Pressable
                        key={type}
                        style={[styles.documentOption, formData.newDocumentType === type && styles.documentOptionSelected]}
                        onPress={() => {
                          updateField('newDocumentType', type);
                          setShowDocumentPicker(false);
                        }}
                      >
                        <Text style={[styles.documentOptionText, formData.newDocumentType === type && styles.documentOptionTextSelected]}>
                          {getDocumentTypeLabel(type)}
                        </Text>
                        {formData.newDocumentType === type && (
                          <Ionicons name="checkmark" size={18} color={staticColors.primary} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}

                <Input
                  label="Numero Documento *"
                  value={formData.newDocumentNumber}
                  onChangeText={(v) => updateField('newDocumentNumber', v.toUpperCase())}
                  placeholder="CA12345AB"
                  autoCapitalize="characters"
                  leftIcon="id-card-outline"
                  testID="input-newDocumentNumber"
                />
              </Card>

              {changeFee > 0 && (
                <View style={styles.feeInfo}>
                  <Ionicons name="information-circle" size={20} color={staticColors.mutedForeground} />
                  <Text style={styles.feeText}>
                    Commissione cambio nominativo: <Text style={styles.feeAmount}>€{changeFee.toFixed(2)}</Text>
                  </Text>
                </View>
              )}

              <Button
                variant="golden"
                size="lg"
                onPress={handleContinue}
                style={styles.continueButton}
                testID="button-continue"
              >
                Continua
              </Button>
            </View>
          )}

          {step === 'confirm' && (
            <View>
              <Text style={styles.sectionTitle}>Conferma Cambio</Text>

              <Card style={styles.confirmCard}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Da</Text>
                  <Text style={styles.confirmValue}>{currentHolder}</Text>
                </View>
                <View style={styles.confirmArrow}>
                  <Ionicons name="arrow-down" size={24} color={staticColors.primary} />
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>A</Text>
                  <Text style={styles.confirmValue}>
                    {formData.newFirstName} {formData.newLastName}
                  </Text>
                </View>
                <View style={styles.confirmDivider} />
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Email</Text>
                  <Text style={styles.confirmValue}>{formData.newEmail}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Codice Fiscale</Text>
                  <Text style={styles.confirmValue}>{formData.newFiscalCode}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Documento</Text>
                  <Text style={styles.confirmValue}>{getDocumentTypeLabel(formData.newDocumentType)}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>N. Documento</Text>
                  <Text style={styles.confirmValue}>{formData.newDocumentNumber}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Data Nascita</Text>
                  <Text style={styles.confirmValue}>{formData.newDateOfBirth}</Text>
                </View>
              </Card>

              {changeFee > 0 && (
                <Card style={styles.totalCard}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Commissione</Text>
                    <Text style={styles.totalValue}>€{changeFee.toFixed(2)}</Text>
                  </View>
                </Card>
              )}

              <View style={styles.warningBox}>
                <Ionicons name="warning" size={20} color={staticColors.warning} />
                <Text style={styles.warningText}>
                  Questa operazione è irreversibile. Il biglietto sarà trasferito al nuovo intestatario.
                </Text>
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.confirmActions}>
                <Button
                  variant="outline"
                  size="lg"
                  onPress={() => {
                    setError('');
                    setStep('form');
                  }}
                  style={styles.backButton}
                  testID="button-back-form"
                >
                  Modifica
                </Button>
                <Button
                  variant="golden"
                  size="lg"
                  onPress={handleConfirm}
                  loading={loading}
                  style={styles.confirmButton}
                  testID="button-confirm"
                >
                  {changeFee > 0 ? `Paga €${changeFee.toFixed(2)}` : 'Conferma'}
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
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
    paddingBottom: spacing.xxl,
  },
  ticketCard: {
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketEventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  ticketDate: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  ticketLocation: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  currentHolder: {
    alignItems: 'center',
  },
  currentHolderLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginBottom: spacing.xs,
  },
  currentHolderName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  errorContainer: {
    backgroundColor: `${staticColors.destructive}20`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${staticColors.destructive}40`,
  },
  errorText: {
    color: staticColors.destructive,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  documentPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  documentPickerText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  documentOptions: {
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  documentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  documentOptionSelected: {
    backgroundColor: `${staticColors.primary}15`,
  },
  documentOptionText: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  documentOptionTextSelected: {
    color: staticColors.primary,
    fontWeight: '600',
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  feeText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  feeAmount: {
    fontWeight: '600',
    color: staticColors.foreground,
  },
  continueButton: {
    marginTop: spacing.md,
  },
  confirmCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  confirmLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  confirmValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  confirmArrow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  confirmDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.sm,
  },
  totalCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
  },
  totalValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: `${staticColors.warning}15`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: `${staticColors.warning}30`,
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 24,
  },
  successActions: {
    marginTop: spacing.xxl,
    width: '100%',
  },
  errorStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorStateTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  errorStateText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default NameChangeScreen;
