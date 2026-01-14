import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { api } from '../../lib/api';

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
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { ticketId } = route.params;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['/api/tickets', ticketId, 'transfer-info'],
    queryFn: () => api.get<TicketInfo>(`/api/tickets/${ticketId}/transfer-info`),
  });

  const transferMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; email: string }) =>
      api.post(`/api/tickets/${ticketId}/transfer`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
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
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
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
          onPress: () => transferMutation.mutate({ firstName, lastName, email }),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header title="Cambio nominativo" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Cambio nominativo" 
        showBack 
        onBack={() => navigation.goBack()} 
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.ticketInfoCard}>
            <View style={styles.ticketInfo}>
              <Ionicons name="ticket-outline" size={24} color={colors.primary} />
              <View style={styles.ticketInfoContent}>
                <Text style={styles.ticketTitle}>{ticket?.eventTitle}</Text>
                <Text style={styles.ticketType}>{ticket?.ticketType}</Text>
              </View>
            </View>
            <View style={styles.currentHolder}>
              <Text style={styles.holderLabel}>Intestatario attuale</Text>
              <Text style={styles.holderName}>{ticket?.currentHolder}</Text>
            </View>
          </Card>

          <Card style={styles.warningCard}>
            <View style={styles.warningContent}>
              <Ionicons name="warning-outline" size={24} color={colors.warning} />
              <View style={styles.warningText}>
                <Text style={styles.warningTitle}>Attenzione</Text>
                <Text style={styles.warningDescription}>
                  Il cambio nominativo è definitivo e non può essere annullato. 
                  Assicurati che i dati inseriti siano corretti.
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Dati nuovo intestatario</Text>
            
            <Input
              label="Nome *"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Nome del nuovo intestatario"
              autoCapitalize="words"
            />
            
            <Input
              label="Cognome *"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Cognome del nuovo intestatario"
              autoCapitalize="words"
            />
            
            <Input
              label="Email *"
              value={email}
              onChangeText={setEmail}
              placeholder="Email del nuovo intestatario"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Input
              label="Conferma email *"
              value={confirmEmail}
              onChangeText={setConfirmEmail}
              placeholder="Ripeti l'indirizzo email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Card>

          {ticket?.transferFee && ticket.transferFee > 0 && (
            <Card style={styles.feeCard}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Costo servizio</Text>
                <Text style={styles.feeValue}>€{ticket.transferFee.toFixed(2)}</Text>
              </View>
              <Text style={styles.feeNote}>
                L'importo verrà addebitato sul metodo di pagamento salvato
              </Text>
            </Card>
          )}

          <Button
            title="Conferma cambio nominativo"
            onPress={handleTransfer}
            loading={transferMutation.isPending}
            icon={<Ionicons name="swap-horizontal-outline" size={20} color={colors.primaryForeground} />}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
});
