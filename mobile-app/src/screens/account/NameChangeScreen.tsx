import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { api } from '../../lib/api';

const DOCUMENT_TYPES = [
  { value: 'identity_card', label: "Carta d'identità" },
  { value: 'passport', label: 'Passaporto' },
  { value: 'driving_license', label: 'Patente di guida' },
] as const;

interface TicketInfo {
  id: string;
  eventTitle: string;
  ticketType: string;
  currentHolder: string;
  transferFee: number;
}

type RouteParams = {
  NameChange: { ticketId: string };
};

export function NameChangeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'NameChange'>>();
  const queryClient = useQueryClient();
  const { ticketId } = route.params;
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [documentType, setDocumentType] = useState<'identity_card' | 'passport' | 'driving_license'>('identity_card');
  const [documentNumber, setDocumentNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['/api/public/account/tickets', ticketId],
    queryFn: () => api.get<TicketInfo>(`/api/public/account/tickets/${ticketId}`),
  });

  const transferMutation = useMutation({
    mutationFn: (data: { 
      ticketId: string; 
      newFirstName: string; 
      newLastName: string; 
      newEmail: string; 
      newCodiceFiscale: string;
      documentType: string;
      documentNumber: string;
      dateOfBirth: string;
    }) => api.post('/api/public/account/name-change', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/public/account/tickets'] });
      Alert.alert(
        'Cambio nominativo completato',
        'Il nuovo intestatario riceverà una email con i dettagli del biglietto.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: Error) => {
      Alert.alert('Errore', error.message || 'Impossibile completare il cambio nominativo');
    },
  });

  const handleTransfer = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !codiceFiscale.trim() || !documentNumber.trim() || !dateOfBirth.trim()) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }
    if (email !== confirmEmail) {
      Alert.alert('Errore', 'Gli indirizzi email non coincidono');
      return;
    }

    Alert.alert(
      'Conferma cambio nominativo',
      `Stai per trasferire il biglietto a ${firstName} ${lastName} (${email}).\n\n${
        ticket?.transferFee ? `Costo del servizio: €${ticket.transferFee.toFixed(2)}` : 'Operazione gratuita'
      }\n\nQuesta operazione non può essere annullata.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: () => transferMutation.mutate({ 
            ticketId, 
            newFirstName: firstName, 
            newLastName: lastName, 
            newEmail: email, 
            newCodiceFiscale: codiceFiscale,
            documentType,
            documentNumber,
            dateOfBirth,
          }),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header 
          title="Cambio nominativo" 
          showBack 
          onBack={() => navigation.goBack()}
          testID="header-name-change"
        />
        <View style={styles.loadingContainer} testID="loading-container">
          <Text style={styles.loadingText} testID="text-loading">Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header 
        title="Cambio nominativo" 
        showBack 
        onBack={() => navigation.goBack()}
        testID="header-name-change"
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            isTablet && styles.contentTablet,
            isLandscape && styles.contentLandscape,
          ]}
          keyboardShouldPersistTaps="handled"
          testID="scroll-view-name-change"
        >
          <View style={[
            styles.contentWrapper,
            isTablet && { maxWidth: 600, alignSelf: 'center', width: '100%' },
          ]}>
            <Card style={styles.ticketInfoCard} testID="card-ticket-info">
              <View style={styles.ticketInfo}>
                <Ionicons name="ticket-outline" size={24} color={colors.primary} />
                <View style={styles.ticketInfoContent}>
                  <Text style={styles.ticketTitle} testID="text-event-title">{ticket?.eventTitle}</Text>
                  <Text style={styles.ticketType} testID="text-ticket-type">{ticket?.ticketType}</Text>
                </View>
              </View>
              <View style={styles.currentHolder}>
                <Text style={styles.holderLabel}>Intestatario attuale</Text>
                <Text style={styles.holderName} testID="text-current-holder">{ticket?.currentHolder}</Text>
              </View>
            </Card>

            <Card style={styles.warningCard} testID="card-warning">
              <View style={styles.warningContent}>
                <Ionicons name="warning-outline" size={24} color={colors.warning} />
                <View style={styles.warningText}>
                  <Text style={styles.warningTitle} testID="text-warning-title">Attenzione</Text>
                  <Text style={styles.warningDescription} testID="text-warning-description">
                    Il cambio nominativo è definitivo e non può essere annullato. 
                    Assicurati che i dati inseriti siano corretti.
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.formCard} testID="card-form">
              <Text style={styles.sectionTitle} testID="text-section-title">Dati nuovo intestatario</Text>
              
              <Input
                label="Nome *"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Nome del nuovo intestatario"
                autoCapitalize="words"
                testID="input-first-name"
              />
              
              <Input
                label="Cognome *"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Cognome del nuovo intestatario"
                autoCapitalize="words"
                testID="input-last-name"
              />
              
              <Input
                label="Email *"
                value={email}
                onChangeText={setEmail}
                placeholder="Email del nuovo intestatario"
                keyboardType="email-address"
                autoCapitalize="none"
                testID="input-email"
              />
              
              <Input
                label="Conferma email *"
                value={confirmEmail}
                onChangeText={setConfirmEmail}
                placeholder="Ripeti l'indirizzo email"
                keyboardType="email-address"
                autoCapitalize="none"
                testID="input-confirm-email"
              />
              
              <Input
                label="Codice Fiscale *"
                value={codiceFiscale}
                onChangeText={setCodiceFiscale}
                placeholder="Codice fiscale del nuovo intestatario"
                autoCapitalize="characters"
                maxLength={16}
                testID="input-codice-fiscale"
              />
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo documento *</Text>
                <View style={styles.documentTypeRow}>
                  {DOCUMENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.documentTypeButton,
                        documentType === type.value && styles.documentTypeButtonActive
                      ]}
                      onPress={() => setDocumentType(type.value)}
                      testID={`button-document-type-${type.value}`}
                    >
                      <Text style={[
                        styles.documentTypeText,
                        documentType === type.value && styles.documentTypeTextActive
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <Input
                label="Numero documento *"
                value={documentNumber}
                onChangeText={setDocumentNumber}
                placeholder="Numero del documento di identità"
                autoCapitalize="characters"
                testID="input-document-number"
              />
              
              <Input
                label="Data di nascita *"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="GG/MM/AAAA"
                keyboardType="numeric"
                testID="input-date-of-birth"
              />
            </Card>

            {ticket?.transferFee && ticket.transferFee > 0 && (
              <Card style={styles.feeCard} testID="card-fee">
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel} testID="text-fee-label">Costo servizio</Text>
                  <Text style={styles.feeValue} testID="text-fee-value">€{ticket.transferFee.toFixed(2)}</Text>
                </View>
                <Text style={styles.feeNote} testID="text-fee-note">
                  L'importo verrà addebitato sul metodo di pagamento salvato
                </Text>
              </Card>
            )}

            <Button
              title="Conferma cambio nominativo"
              onPress={handleTransfer}
              loading={transferMutation.isPending}
              icon={<Ionicons name="swap-horizontal-outline" size={20} color={colors.primaryForeground} />}
              testID="button-confirm-transfer"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  contentTablet: {
    paddingHorizontal: spacing.xl,
  },
  contentLandscape: {
    paddingHorizontal: spacing.lg,
  },
  contentWrapper: {
    gap: spacing.md,
  },
  ticketInfoCard: {
    padding: spacing.lg,
  },
  ticketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ticketInfoContent: {
    flex: 1,
  },
  ticketTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  ticketType: {
    color: colors.primary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  currentHolder: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  holderLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  holderName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },
  warningCard: {
    padding: spacing.md,
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  warningContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  warningText: {
    flex: 1,
  },
  warningTitle: {
    color: colors.warning,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  warningDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  formCard: {
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  feeCard: {
    padding: spacing.md,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  feeValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  feeNote: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  inputGroup: {
    marginTop: spacing.sm,
  },
  inputLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  documentTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  documentTypeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  documentTypeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  documentTypeText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  documentTypeTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
});
