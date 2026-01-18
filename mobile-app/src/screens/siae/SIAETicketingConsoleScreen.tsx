import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface ActiveEvent {
  id: number;
  name: string;
  date: string;
  ticketsSold: number;
  ticketsAvailable: number;
}

interface TicketTypeOption {
  id: number;
  name: string;
  price: number;
  available: number;
}

interface IssuedTicket {
  id: number;
  ticketNumber: string;
  holderName: string;
  type: string;
  price: number;
  issuedAt: string;
}

export function SIAETicketingConsoleScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeOption[]>([]);
  const [recentTickets, setRecentTickets] = useState<IssuedTicket[]>([]);
  
  const [selectedType, setSelectedType] = useState<TicketTypeOption | null>(null);
  const [holderName, setHolderName] = useState('');
  const [holderFiscalCode, setHolderFiscalCode] = useState('');

  const loadData = async () => {
    try {
      const [eventRes, recentRes] = await Promise.all([
        api.get<any>('/api/siae/console/active-event'),
        api.get<any>('/api/siae/console/recent-tickets'),
      ]);
      
      if (eventRes.event) {
        setActiveEvent(eventRes.event);
        setTicketTypes(eventRes.ticketTypes || []);
      }
      setRecentTickets(recentRes.tickets || recentRes || []);
    } catch (error) {
      console.error('Error loading console data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleIssueTicket = async () => {
    if (!activeEvent || !selectedType) {
      Alert.alert('Errore', 'Seleziona un tipo di biglietto');
      return;
    }
    if (!holderName || !holderFiscalCode) {
      Alert.alert('Errore', 'Inserisci nome e codice fiscale');
      return;
    }

    setIssuing(true);
    try {
      const response = await api.post<any>('/api/siae/console/issue-ticket', {
        eventId: activeEvent.id,
        ticketTypeId: selectedType.id,
        holderName,
        holderFiscalCode,
      });
      
      Alert.alert(
        'Biglietto Emesso',
        `Numero: ${response.ticketNumber}\nTipo: ${selectedType.name}\nPrezzo: ${formatCurrency(selectedType.price)}`,
        [{ text: 'OK' }]
      );
      
      setHolderName('');
      setHolderFiscalCode('');
      setSelectedType(null);
      loadData();
    } catch (error) {
      Alert.alert('Errore', 'Impossibile emettere il biglietto');
    } finally {
      setIssuing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Console Emissione" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  if (!activeEvent) {
    return (
      <View style={styles.container}>
        <Header title="Console Emissione" showBack onBack={() => navigation.goBack()} />
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun evento attivo</Text>
          <Text style={styles.emptySubtext}>
            Configura un evento per iniziare l'emissione biglietti
          </Text>
          <Button
            onPress={() => navigation.navigate('SIAETicketedEvents')}
            style={styles.goToEventsButton}
            data-testid="button-go-events"
          >
            <Text style={styles.goToEventsText}>Vai agli Eventi</Text>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Console Emissione" showBack onBack={() => navigation.goBack()} />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="glass" style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.eventName}>{activeEvent.name}</Text>
          <View style={styles.eventStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{activeEvent.ticketsSold}</Text>
              <Text style={styles.statLabel}>Venduti</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>{activeEvent.ticketsAvailable}</Text>
              <Text style={styles.statLabel}>Disponibili</Text>
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo Biglietto</Text>
          <View style={styles.typesGrid}>
            {ticketTypes.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeOption,
                  selectedType?.id === type.id && styles.typeOptionSelected
                ]}
                onPress={() => setSelectedType(type)}
                activeOpacity={0.8}
                data-testid={`option-type-${type.id}`}
              >
                <Text style={[
                  styles.typeName,
                  selectedType?.id === type.id && styles.typeNameSelected
                ]}>
                  {type.name}
                </Text>
                <Text style={[
                  styles.typePrice,
                  selectedType?.id === type.id && styles.typePriceSelected
                ]}>
                  {formatCurrency(type.price)}
                </Text>
                <Text style={styles.typeAvailable}>{type.available} disp.</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intestatario</Text>
          <Card variant="glass">
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome e Cognome</Text>
              <TextInput
                style={styles.input}
                value={holderName}
                onChangeText={setHolderName}
                placeholder="Mario Rossi"
                placeholderTextColor={colors.mutedForeground}
                data-testid="input-holder-name"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Codice Fiscale</Text>
              <TextInput
                style={styles.input}
                value={holderFiscalCode}
                onChangeText={(text) => setHolderFiscalCode(text.toUpperCase())}
                placeholder="RSSMRA80A01H501Z"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                data-testid="input-holder-cf"
              />
            </View>
          </Card>
        </View>

        <Button
          onPress={handleIssueTicket}
          disabled={issuing || !selectedType}
          style={[
            styles.issueButton,
            (!selectedType) && styles.issueButtonDisabled
          ]}
          data-testid="button-issue"
        >
          {issuing ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Ionicons name="print-outline" size={24} color={colors.primaryForeground} />
              <Text style={styles.issueButtonText}>
                Emetti Biglietto
                {selectedType && ` - ${formatCurrency(selectedType.price)}`}
              </Text>
            </>
          )}
        </Button>

        {recentTickets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ultimi Biglietti Emessi</Text>
            {recentTickets.slice(0, 5).map(ticket => (
              <Card key={ticket.id} variant="glass" style={styles.recentTicket}>
                <View style={styles.ticketRow}>
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
                    <Text style={styles.ticketHolder}>{ticket.holderName}</Text>
                  </View>
                  <View style={styles.ticketMeta}>
                    <Text style={styles.ticketType}>{ticket.type}</Text>
                    <Text style={styles.ticketPrice}>{formatCurrency(ticket.price)}</Text>
                    <Text style={styles.ticketTime}>{formatTime(ticket.issuedAt)}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  eventCard: {
    marginTop: spacing.lg,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.destructive}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.destructive,
  },
  liveText: {
    color: colors.destructive,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
  },
  eventStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  statValue: {
    color: colors.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  typeOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  typeName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  typeNameSelected: {
    color: colors.primary,
  },
  typePrice: {
    color: colors.mutedForeground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  typePriceSelected: {
    color: colors.primary,
  },
  typeAvailable: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.foreground,
    fontSize: fontSize.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  issueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  issueButtonDisabled: {
    opacity: 0.5,
  },
  issueButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  recentTicket: {
    marginBottom: spacing.md,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketInfo: {
    flex: 1,
  },
  ticketNumber: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  ticketHolder: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  ticketMeta: {
    alignItems: 'flex-end',
  },
  ticketType: {
    color: colors.teal,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  ticketPrice: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  ticketTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  goToEventsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  goToEventsText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

export default SIAETicketingConsoleScreen;
