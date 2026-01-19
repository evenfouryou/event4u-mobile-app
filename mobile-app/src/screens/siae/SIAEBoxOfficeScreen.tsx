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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface Event {
  id: number;
  name: string;
  date: string;
}

interface TicketType {
  id: number;
  name: string;
  price: number;
  available: number;
}

interface CartItem {
  typeId: number;
  typeName: string;
  quantity: number;
  price: number;
}

export function SIAEBoxOfficeScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerFiscalCode, setCustomerFiscalCode] = useState('');

  const loadData = async () => {
    try {
      const eventsRes = await api.get<any>('/api/siae/events/active');
      setEvents(eventsRes.events || eventsRes || []);
    } catch (error) {
      console.error('Error loading box office data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketTypes = async (eventId: number) => {
    try {
      const response = await api.get<any>(`/api/siae/events/${eventId}/ticket-types`);
      setTicketTypes(response.ticketTypes || response || []);
    } catch (error) {
      console.error('Error loading ticket types:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadTicketTypes(selectedEvent.id);
      setCart([]);
    }
  }, [selectedEvent]);

  const addToCart = (type: TicketType) => {
    const existing = cart.find(item => item.typeId === type.id);
    if (existing) {
      setCart(cart.map(item =>
        item.typeId === type.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        typeId: type.id,
        typeName: type.name,
        quantity: 1,
        price: type.price,
      }]);
    }
  };

  const removeFromCart = (typeId: number) => {
    const existing = cart.find(item => item.typeId === typeId);
    if (existing && existing.quantity > 1) {
      setCart(cart.map(item =>
        item.typeId === typeId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setCart(cart.filter(item => item.typeId !== typeId));
    }
  };

  const getTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleCheckout = async () => {
    if (!selectedEvent || cart.length === 0) {
      Alert.alert('Errore', 'Seleziona un evento e aggiungi biglietti');
      return;
    }
    if (!customerName || !customerFiscalCode) {
      Alert.alert('Errore', 'Inserisci nome e codice fiscale del cliente');
      return;
    }

    setProcessing(true);
    try {
      await api.post('/api/siae/box-office/checkout', {
        eventId: selectedEvent.id,
        items: cart,
        customer: {
          name: customerName,
          fiscalCode: customerFiscalCode,
        },
      });
      Alert.alert('Successo', 'Vendita completata con successo');
      setCart([]);
      setCustomerName('');
      setCustomerFiscalCode('');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile completare la vendita');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Biglietteria" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Biglietteria" showBack onBack={() => navigation.goBack()} />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          (isTablet || isLandscape) && styles.scrollContentWide
        ]}
        showsVerticalScrollIndicator={false}
        testID="box-office-scroll"
      >
        <View style={[
          styles.mainContent,
          (isTablet || isLandscape) && styles.mainContentWide
        ]}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seleziona Evento</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventsScroll}>
              <View style={styles.eventsRow}>
                {events.map(event => (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.eventChip,
                      selectedEvent?.id === event.id && styles.eventChipActive
                    ]}
                    onPress={() => setSelectedEvent(event)}
                    activeOpacity={0.8}
                    testID={`chip-event-${event.id}`}
                  >
                    <Text style={[
                      styles.eventChipText,
                      selectedEvent?.id === event.id && styles.eventChipTextActive
                    ]}>
                      {event.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {selectedEvent && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tipi Biglietto</Text>
                <View style={[
                  styles.typesGrid,
                  (isTablet || isLandscape) && styles.typesGridWide
                ]}>
                  {ticketTypes.map(type => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeCard,
                        (isTablet || isLandscape) && styles.typeCardWide
                      ]}
                      onPress={() => addToCart(type)}
                      activeOpacity={0.8}
                      testID={`button-type-${type.id}`}
                    >
                      <Card variant="glass">
                        <Text style={styles.typeName}>{type.name}</Text>
                        <Text style={styles.typePrice}>{formatCurrency(type.price)}</Text>
                        <Text style={styles.typeAvailable}>{type.available} disponibili</Text>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dati Cliente</Text>
                <Card variant="glass">
                  <View style={[
                    styles.inputRow,
                    (isTablet || isLandscape) && styles.inputRowWide
                  ]}>
                    <View style={[
                      styles.inputGroup,
                      (isTablet || isLandscape) && styles.inputGroupHalf
                    ]}>
                      <Text style={styles.inputLabel}>Nome e Cognome</Text>
                      <TextInput
                        style={styles.input}
                        value={customerName}
                        onChangeText={setCustomerName}
                        placeholder="Mario Rossi"
                        placeholderTextColor={colors.mutedForeground}
                        testID="input-customer-name"
                      />
                    </View>
                    <View style={[
                      styles.inputGroup,
                      (isTablet || isLandscape) && styles.inputGroupHalf
                    ]}>
                      <Text style={styles.inputLabel}>Codice Fiscale</Text>
                      <TextInput
                        style={styles.input}
                        value={customerFiscalCode}
                        onChangeText={(text) => setCustomerFiscalCode(text.toUpperCase())}
                        placeholder="RSSMRA80A01H501Z"
                        placeholderTextColor={colors.mutedForeground}
                        autoCapitalize="characters"
                        testID="input-fiscal-code"
                      />
                    </View>
                  </View>
                </Card>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {cart.length > 0 && (
        <View style={styles.cartContainer}>
          <Card variant="glass" style={styles.cartCard}>
            <View style={styles.cartItems}>
              {cart.map(item => (
                <View key={item.typeId} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.typeName}</Text>
                    <Text style={styles.cartItemPrice}>
                      {item.quantity} x {formatCurrency(item.price)}
                    </Text>
                  </View>
                  <View style={styles.cartItemControls}>
                    <TouchableOpacity
                      onPress={() => removeFromCart(item.typeId)}
                      style={styles.cartButton}
                      testID={`button-remove-${item.typeId}`}
                    >
                      <Ionicons name="remove" size={20} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={styles.cartItemQuantity}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => addToCart(ticketTypes.find(t => t.id === item.typeId)!)}
                      style={styles.cartButton}
                      testID={`button-add-${item.typeId}`}
                    >
                      <Ionicons name="add" size={20} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
            
            <View style={styles.cartTotal}>
              <Text style={styles.totalLabel}>Totale</Text>
              <Text style={styles.totalValue}>{formatCurrency(getTotal())}</Text>
            </View>
            
            <Button
              onPress={handleCheckout}
              disabled={processing}
              style={styles.checkoutButton}
              testID="button-checkout"
            >
              <Ionicons name="card-outline" size={20} color={colors.primaryForeground} />
              <Text style={styles.checkoutText}>
                {processing ? 'Elaborazione...' : 'Completa Vendita'}
              </Text>
            </Button>
          </Card>
        </View>
      )}
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
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 220,
  },
  scrollContentWide: {
    paddingHorizontal: spacing.xl,
  },
  mainContent: {
    flex: 1,
  },
  mainContentWide: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
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
  eventsScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  eventsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  eventChip: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  eventChipText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  eventChipTextActive: {
    color: colors.primaryForeground,
  },
  typesGrid: {
    gap: spacing.md,
  },
  typesGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeCard: {
    flex: 1,
  },
  typeCardWide: {
    flex: 0,
    width: '48%',
    marginRight: '2%',
    marginBottom: spacing.md,
  },
  typeName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  typePrice: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  typeAvailable: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  inputRow: {
    gap: spacing.md,
  },
  inputRowWide: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputGroupHalf: {
    flex: 1,
    marginBottom: 0,
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
  cartContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  cartCard: {
    padding: spacing.lg,
  },
  cartItems: {
    marginBottom: spacing.lg,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  cartItemPrice: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cartButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemQuantity: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    minWidth: 24,
    textAlign: 'center',
  },
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.lg,
  },
  totalLabel: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  totalValue: {
    color: colors.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  checkoutText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

export default SIAEBoxOfficeScreen;
