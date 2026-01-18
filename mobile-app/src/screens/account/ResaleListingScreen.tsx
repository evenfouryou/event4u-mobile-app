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

interface TicketResaleInfo {
  id: string;
  eventTitle: string;
  eventDate: string;
  ticketType: string;
  originalPrice: number;
  maxResalePrice: number;
  platformFeePercent: number;
}

type RouteParams = {
  ResaleListing: { ticketId: string };
};

export function ResaleListingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ResaleListing'>>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { ticketId } = route.params;

  const [price, setPrice] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['/api/public/account/tickets', ticketId, 'resale-info'],
    queryFn: () => api.get<TicketResaleInfo>(`/api/public/account/tickets/${ticketId}/resale-info`),
  });

  const createListingMutation = useMutation({
    mutationFn: (data: { ticketId: string; resalePrice: number }) =>
      api.post('/api/public/account/resale', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/public/account/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/account/resales'] });
      Alert.alert(
        'Biglietto in vendita',
        'Il tuo biglietto è stato messo in vendita. Riceverai una notifica quando verrà acquistato.',
        [{ text: 'OK', onPress: () => navigation.navigate('MyResales') }]
      );
    },
    onError: (error: Error) => {
      Alert.alert('Errore', error.message || 'Impossibile mettere in vendita il biglietto');
    },
  });

  const priceNumber = parseFloat(price) || 0;
  const platformFee = ticket ? (priceNumber * ticket.platformFeePercent) / 100 : 0;
  const netEarnings = priceNumber - platformFee;

  const handleCreateListing = () => {
    if (!price || priceNumber <= 0) {
      Alert.alert('Errore', 'Inserisci un prezzo valido');
      return;
    }
    if (ticket && priceNumber > ticket.maxResalePrice) {
      Alert.alert('Errore', `Il prezzo massimo consentito è €${ticket.maxResalePrice.toFixed(2)}`);
      return;
    }

    Alert.alert(
      'Conferma messa in vendita',
      `Stai per mettere in vendita il biglietto a €${priceNumber.toFixed(2)}.\n\nGuadagno netto: €${netEarnings.toFixed(2)}\n\nVuoi procedere?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: () => createListingMutation.mutate({ ticketId, resalePrice: priceNumber }),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header title="Metti in vendita" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Metti in vendita" 
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
          <Card style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Ionicons name="ticket-outline" size={24} color={colors.primary} />
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketTitle}>{ticket?.eventTitle}</Text>
                <Text style={styles.ticketType}>{ticket?.ticketType}</Text>
              </View>
            </View>
            <View style={styles.ticketMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.metaText}>{ticket?.eventDate}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="pricetag-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.metaText}>Prezzo originale: €{ticket?.originalPrice.toFixed(2)}</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.priceCard}>
            <Text style={styles.sectionTitle}>Imposta il prezzo</Text>
            
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>€</Text>
              <Input
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
                containerStyle={styles.priceInput}
              />
            </View>

            {ticket && (
              <Text style={styles.maxPriceNote}>
                Prezzo massimo consentito: €{ticket.maxResalePrice.toFixed(2)}
              </Text>
            )}
          </Card>

          <Card style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Riepilogo</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Prezzo di vendita</Text>
              <Text style={styles.summaryValue}>€{priceNumber.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Commissione piattaforma ({ticket?.platformFeePercent}%)
              </Text>
              <Text style={[styles.summaryValue, styles.feeValue]}>
                -€{platformFee.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Guadagno netto</Text>
              <Text style={styles.totalValue}>€{netEarnings.toFixed(2)}</Text>
            </View>
          </Card>

          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                Il biglietto rimarrà valido fino a quando non verrà acquistato. 
                Potrai rimuoverlo dalla vendita in qualsiasi momento dalla sezione "Le mie rivendite".
              </Text>
            </View>
          </Card>

          <Button
            title="Metti in vendita"
            onPress={handleCreateListing}
            loading={createListingMutation.isPending}
            disabled={!price || priceNumber <= 0 || (ticket ? priceNumber > ticket.maxResalePrice : false)}
            icon={<Ionicons name="pricetag-outline" size={20} color={colors.primaryForeground} />}
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
  ticketCard: {
    padding: spacing.lg,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ticketInfo: {
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
  ticketMeta: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  priceCard: {
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currencySymbol: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  priceInput: {
    flex: 1,
    marginBottom: 0,
  },
  maxPriceNote: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  summaryCard: {
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  feeValue: {
    color: colors.destructive,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  totalValue: {
    color: colors.success,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  infoCard: {
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
