import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
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

interface TicketResaleScreenProps {
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
  canResale: boolean;
  isListed: boolean;
  existingResale: { id: string; resalePrice: string } | null;
  hoursToEvent: number;
}

export function TicketResaleScreen({ ticketId, onBack, onSuccess }: TicketResaleScreenProps) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [step, setStep] = useState<'form' | 'confirm' | 'success' | 'error'>('form');
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [resalePrice, setResalePrice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadTicketData();
  }, [ticketId]);

  const loadTicketData = async () => {
    try {
      setInitialLoading(true);
      const data = await api.getTicketById(ticketId) as any;
      const ticketData: TicketData = {
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
        canResale: data.canResale !== false,
        isListed: data.isListed || false,
        existingResale: data.existingResale || null,
        hoursToEvent: data.hoursToEvent || 0,
      };
      setTicket(ticketData);
      // Pre-fill with original price
      if (ticketData.ticketPrice > 0) {
        setResalePrice(ticketData.ticketPrice.toFixed(2));
      }
    } catch (err) {
      console.error('Error loading ticket:', err);
      setError('Impossibile caricare i dati del biglietto');
      setStep('error');
    } finally {
      setInitialLoading(false);
    }
  };

  const validateForm = () => {
    if (!resalePrice) {
      return 'Inserisci un prezzo di vendita';
    }
    const price = parseFloat(resalePrice);
    if (isNaN(price) || price <= 0) {
      return 'Inserisci un prezzo valido maggiore di 0';
    }
    if (ticket && price > ticket.ticketPrice) {
      return `Il prezzo non può superare il prezzo originale (€${ticket.ticketPrice.toFixed(2)})`;
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
      await api.createResaleListing(ticketId, parseFloat(resalePrice));
      triggerHaptic('success');
      setStep('success');
    } catch (err: any) {
      console.error('Error creating resale listing:', err);
      setError(err.message || 'Impossibile mettere in vendita il biglietto');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelListing = async () => {
    if (!ticket?.existingResale) return;
    
    Alert.alert(
      'Annulla Inserzione',
      'Sei sicuro di voler annullare la rivendita di questo biglietto?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sì, Annulla',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.cancelResaleListing(ticket.existingResale!.id);
              triggerHaptic('success');
              Alert.alert('Fatto', 'Inserzione annullata con successo');
              onSuccess();
            } catch (err: any) {
              setError(err.message || 'Impossibile annullare l\'inserzione');
              triggerHaptic('error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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

  const getDiscount = () => {
    if (!ticket || !resalePrice) return 0;
    const price = parseFloat(resalePrice);
    if (isNaN(price) || price >= ticket.ticketPrice) return 0;
    return Math.round(((ticket.ticketPrice - price) / ticket.ticketPrice) * 100);
  };

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

  if (!ticket.canResale) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} />
        <View style={styles.errorStateContainer}>
          <Ionicons name="close-circle" size={64} color={staticColors.warning} />
          <Text style={styles.errorStateTitle}>Non Disponibile</Text>
          <Text style={styles.errorStateText}>
            La rivendita non è disponibile per questo biglietto.
            {ticket.hoursToEvent < 24 && '\n\nLa rivendita è disponibile fino a 24 ore prima dell\'evento.'}
          </Text>
          <Button variant="outline" onPress={onBack} style={{ marginTop: spacing.lg }}>
            Torna Indietro
          </Button>
        </View>
      </SafeArea>
    );
  }

  // Already listed
  if (ticket.isListed && ticket.existingResale) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.listedContainer}>
            <Ionicons name="pricetag" size={64} color={staticColors.primary} />
            <Text style={styles.listedTitle}>Biglietto in Vendita</Text>
            <Text style={styles.listedText}>
              Questo biglietto è già in vendita sul marketplace a €{Number(ticket.existingResale.resalePrice).toFixed(2)}
            </Text>
          </View>

          <Card style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Ionicons name="ticket" size={24} color={staticColors.primary} />
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketEventName}>{ticket.eventName || 'Evento'}</Text>
                <Text style={styles.ticketDate}>{formatDate(ticket.eventStart)}</Text>
              </View>
              <Badge variant="default">{ticket.ticketType}</Badge>
            </View>
          </Card>

          <View style={styles.priceComparison}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Prezzo originale</Text>
              <Text style={styles.priceOriginal}>€{ticket.ticketPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Prezzo di vendita</Text>
              <Text style={styles.priceResale}>€{Number(ticket.existingResale.resalePrice).toFixed(2)}</Text>
            </View>
          </View>

          <Button
            variant="outline"
            size="lg"
            onPress={handleCancelListing}
            loading={loading}
            style={styles.cancelButton}
            testID="button-cancel-listing"
          >
            Annulla Inserzione
          </Button>
        </ScrollView>
      </SafeArea>
    );
  }

  const holderName = `${ticket.participantFirstName || ''} ${ticket.participantLastName || ''}`.trim() || 'N/A';
  const discount = getDiscount();

  if (step === 'success') {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={staticColors.success} />
          </View>
          <View>
            <Text style={styles.successTitle}>Biglietto in Vendita!</Text>
            <Text style={styles.successText}>
              Il tuo biglietto è stato pubblicato sul marketplace.{'\n\n'}
              Riceverai una notifica quando qualcuno lo acquisterà.
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
      <Header showLogo showBack onBack={onBack} testID="header-resale" />

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
              <View style={styles.ticketDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Intestatario</Text>
                  <Text style={styles.detailValue}>{holderName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Prezzo originale</Text>
                  <Text style={styles.detailValue}>€{ticket.ticketPrice.toFixed(2)}</Text>
                </View>
                {ticket.sectorName && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Settore</Text>
                    <Text style={styles.detailValue}>{ticket.sectorName}</Text>
                  </View>
                )}
              </View>
            </Card>
          </View>

          {step === 'form' && (
            <View>
              <Text style={styles.sectionTitle}>Prezzo di Vendita</Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Card style={styles.formCard}>
                <Input
                  label="Prezzo di vendita (€)"
                  value={resalePrice}
                  onChangeText={setResalePrice}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  leftIcon="pricetag-outline"
                  testID="input-resalePrice"
                />

                {discount > 0 && (
                  <View style={styles.discountBadge}>
                    <Ionicons name="arrow-down" size={16} color={staticColors.success} />
                    <Text style={styles.discountText}>
                      Sconto del {discount}% rispetto al prezzo originale
                    </Text>
                  </View>
                )}
              </Card>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={staticColors.mutedForeground} />
                <Text style={styles.infoText}>
                  Il biglietto sarà visibile nel marketplace e potrà essere acquistato da altri utenti. 
                  Riceverai il pagamento quando il biglietto verrà venduto.
                </Text>
              </View>

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
              <Text style={styles.sectionTitle}>Conferma Inserzione</Text>

              <Card style={styles.confirmCard}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Prezzo originale</Text>
                  <Text style={styles.confirmValue}>€{ticket.ticketPrice.toFixed(2)}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Prezzo di vendita</Text>
                  <Text style={styles.confirmValueHighlight}>€{parseFloat(resalePrice).toFixed(2)}</Text>
                </View>
                {discount > 0 && (
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Sconto</Text>
                    <Badge variant="success">-{discount}%</Badge>
                  </View>
                )}
              </Card>

              <View style={styles.warningBox}>
                <Ionicons name="warning" size={20} color={staticColors.warning} />
                <Text style={styles.warningText}>
                  Una volta pubblicato, il biglietto sarà disponibile per l'acquisto. Potrai annullare l'inserzione in qualsiasi momento prima della vendita.
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
                  Pubblica
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
  ticketDetails: {
    gap: spacing.xs,
  },
  detailRow: {
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
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${staticColors.success}15`,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  discountText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.success,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    lineHeight: 20,
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
  },
  confirmValueHighlight: {
    fontSize: typography.fontSize.lg,
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
  listedContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  listedTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  listedText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  priceComparison: {
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  priceLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  priceOriginal: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textDecorationLine: 'line-through',
  },
  priceResale: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.primary,
  },
  cancelButton: {
    borderColor: staticColors.destructive,
  },
});

export default TicketResaleScreen;
