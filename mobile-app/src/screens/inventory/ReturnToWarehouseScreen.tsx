import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Button, Header } from '../../components';

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
}

interface ReturnItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  sentQuantity: number;
  returnQuantity: number;
  unit: string;
  condition: 'good' | 'damaged' | 'expired';
}

interface PendingReturn {
  id: string;
  eventId: string;
  eventTitle: string;
  date: string;
  itemsCount: number;
  status: 'pending' | 'processing' | 'completed';
}

export default function ReturnToWarehouseScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events/recent'],
  });

  const { data: pendingReturns } = useQuery<PendingReturn[]>({
    queryKey: ['/api/warehouse/returns/pending'],
  });

  const { data: eventItems, isLoading: loadingItems } = useQuery<ReturnItem[]>({
    queryKey: ['/api/events/items', selectedEvent?.id],
    enabled: !!selectedEvent,
  });

  const submitReturnMutation = useMutation({
    mutationFn: async (data: { eventId: string; items: ReturnItem[] }) => {
      return fetch('/api/warehouse/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouse/returns/pending'] });
      Alert.alert('Successo', 'Reso registrato correttamente');
      setSelectedEvent(null);
      setReturnItems([]);
    },
    onError: () => {
      Alert.alert('Errore', 'Impossibile registrare il reso');
    },
  });

  const mockEvents: Event[] = events || [
    { id: '1', title: 'Saturday Night Party', date: '2026-01-17', location: 'Club Milano' },
    { id: '2', title: 'Deep House Night', date: '2026-01-16', location: 'Tunnel' },
    { id: '3', title: 'Latino Fever', date: '2026-01-15', location: 'Tropicana' },
  ];

  const mockReturnItems: ReturnItem[] = eventItems || [
    { id: '1', productId: 'p1', productName: 'Coca Cola 33cl', category: 'Bevande', sentQuantity: 100, returnQuantity: 0, unit: 'pz', condition: 'good' },
    { id: '2', productId: 'p2', productName: 'Vodka Premium', category: 'Alcolici', sentQuantity: 20, returnQuantity: 0, unit: 'bt', condition: 'good' },
    { id: '3', productId: 'p3', productName: 'Bicchieri Plastica', category: 'Accessori', sentQuantity: 500, returnQuantity: 0, unit: 'pz', condition: 'good' },
    { id: '4', productId: 'p4', productName: 'Red Bull', category: 'Bevande', sentQuantity: 50, returnQuantity: 0, unit: 'pz', condition: 'good' },
  ];

  const mockPendingReturns: PendingReturn[] = pendingReturns || [
    { id: '1', eventId: 'e1', eventTitle: 'Friday Night', date: '2026-01-14', itemsCount: 12, status: 'pending' },
  ];

  const handleEventSelect = useCallback((event: Event) => {
    setSelectedEvent(event);
    setReturnItems(mockReturnItems.map(item => ({ ...item, returnQuantity: 0 })));
  }, []);

  const updateReturnQuantity = (itemId: string, quantity: number) => {
    setReturnItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, returnQuantity: Math.max(0, Math.min(quantity, item.sentQuantity)) }
          : item
      )
    );
  };

  const updateCondition = (itemId: string, condition: ReturnItem['condition']) => {
    setReturnItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, condition } : item
      )
    );
  };

  const handleSubmitReturn = () => {
    if (!selectedEvent) return;
    const itemsWithReturn = returnItems.filter(item => item.returnQuantity > 0);
    if (itemsWithReturn.length === 0) {
      Alert.alert('Attenzione', 'Inserisci almeno una quantità da restituire');
      return;
    }
    submitReturnMutation.mutate({ eventId: selectedEvent.id, items: itemsWithReturn });
  };

  const filteredItems = returnItems.filter(item =>
    item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getConditionColor = (condition: ReturnItem['condition']) => {
    switch (condition) {
      case 'good': return colors.teal;
      case 'damaged': return colors.warning;
      case 'expired': return colors.destructive;
    }
  };

  const renderEventCard = ({ item }: { item: Event }) => (
    <TouchableOpacity
      style={[
        styles.eventCard,
        selectedEvent?.id === item.id && styles.eventCardSelected,
      ]}
      onPress={() => handleEventSelect(item)}
      activeOpacity={0.8}
      data-testid={`card-event-${item.id}`}
    >
      <Text style={styles.eventTitle}>{item.title}</Text>
      <View style={styles.eventMeta}>
        <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
        <Text style={styles.eventDate}>{item.date}</Text>
      </View>
      <View style={styles.eventMeta}>
        <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
        <Text style={styles.eventDate}>{item.location}</Text>
      </View>
      {selectedEvent?.id === item.id && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={20} color={colors.teal} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderReturnItem = ({ item }: { item: ReturnItem }) => (
    <Card variant="glass" style={styles.returnItemCard}>
      <View style={styles.returnItemHeader}>
        <View style={styles.returnItemInfo}>
          <Text style={styles.returnItemName}>{item.productName}</Text>
          <Text style={styles.returnItemCategory}>{item.category}</Text>
        </View>
        <Text style={styles.sentQuantity}>
          Inviati: {item.sentQuantity} {item.unit}
        </Text>
      </View>

      <View style={styles.quantityRow}>
        <Text style={styles.quantityLabel}>Quantità reso:</Text>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateReturnQuantity(item.id, item.returnQuantity - 1)}
            data-testid={`button-decrease-${item.id}`}
          >
            <Ionicons name="remove" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TextInput
            style={styles.quantityInput}
            value={item.returnQuantity.toString()}
            onChangeText={(text) => updateReturnQuantity(item.id, parseInt(text) || 0)}
            keyboardType="number-pad"
            data-testid={`input-quantity-${item.id}`}
          />
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateReturnQuantity(item.id, item.returnQuantity + 1)}
            data-testid={`button-increase-${item.id}`}
          >
            <Ionicons name="add" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.maxButton}
            onPress={() => updateReturnQuantity(item.id, item.sentQuantity)}
            data-testid={`button-max-${item.id}`}
          >
            <Text style={styles.maxButtonText}>MAX</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.conditionRow}>
        <Text style={styles.conditionLabel}>Condizione:</Text>
        <View style={styles.conditionButtons}>
          {(['good', 'damaged', 'expired'] as const).map((condition) => (
            <TouchableOpacity
              key={condition}
              style={[
                styles.conditionButton,
                item.condition === condition && {
                  backgroundColor: `${getConditionColor(condition)}20`,
                  borderColor: getConditionColor(condition),
                },
              ]}
              onPress={() => updateCondition(item.id, condition)}
              data-testid={`button-condition-${condition}-${item.id}`}
            >
              <Text
                style={[
                  styles.conditionButtonText,
                  item.condition === condition && { color: getConditionColor(condition) },
                ]}
              >
                {condition === 'good' ? 'Buono' : condition === 'damaged' ? 'Danneggiato' : 'Scaduto'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Card>
  );

  const renderPendingReturn = ({ item }: { item: PendingReturn }) => (
    <TouchableOpacity
      style={styles.pendingCard}
      onPress={() => navigation.navigate('ReturnDetail', { returnId: item.id })}
      activeOpacity={0.8}
      data-testid={`card-pending-${item.id}`}
    >
      <Card variant="glass" style={styles.pendingCardInner}>
        <View style={styles.pendingInfo}>
          <Text style={styles.pendingTitle}>{item.eventTitle}</Text>
          <Text style={styles.pendingMeta}>{item.date} • {item.itemsCount} articoli</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${colors.warning}20` }]}>
          <Text style={[styles.statusText, { color: colors.warning }]}>In attesa</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header title="Resi al Magazzino" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {!selectedEvent ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Seleziona Evento</Text>
              <FlatList
                data={mockEvents}
                renderItem={renderEventCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eventsList}
              />
            </View>

            {mockPendingReturns.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Resi in Attesa</Text>
                <FlatList
                  data={mockPendingReturns}
                  renderItem={renderPendingReturn}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
                />
              </View>
            )}

            <Card style={styles.instructionCard} variant="glass">
              <Ionicons name="information-circle-outline" size={24} color={colors.teal} />
              <Text style={styles.instructionText}>
                Seleziona un evento per iniziare a registrare i resi dei prodotti non utilizzati.
              </Text>
            </Card>
          </>
        ) : (
          <>
            <View style={styles.selectedEventHeader}>
              <View style={styles.selectedEventInfo}>
                <Text style={styles.selectedEventTitle}>{selectedEvent.title}</Text>
                <Text style={styles.selectedEventMeta}>{selectedEvent.date}</Text>
              </View>
              <TouchableOpacity
                style={styles.changeEventButton}
                onPress={() => setSelectedEvent(null)}
                data-testid="button-change-event"
              >
                <Text style={styles.changeEventText}>Cambia</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cerca prodotto..."
                placeholderTextColor={colors.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
                data-testid="input-search"
              />
            </View>

            {loadingItems ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Prodotti ({filteredItems.length})</Text>
                <FlatList
                  data={filteredItems}
                  renderItem={renderReturnItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {selectedEvent && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerLabel}>Articoli da restituire:</Text>
            <Text style={styles.footerValue}>
              {returnItems.filter(i => i.returnQuantity > 0).length}
            </Text>
          </View>
          <Button
            onPress={handleSubmitReturn}
            disabled={submitReturnMutation.isPending}
            data-testid="button-submit-return"
          >
            <Text style={styles.submitButtonText}>
              {submitReturnMutation.isPending ? 'Elaborazione...' : 'Conferma Reso'}
            </Text>
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  eventsList: {
    gap: spacing.md,
  },
  eventCard: {
    width: 180,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  eventCardSelected: {
    borderColor: colors.teal,
    backgroundColor: `${colors.teal}10`,
  },
  eventTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  eventDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  pendingCard: {
    marginBottom: spacing.xs,
  },
  pendingCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingInfo: {
    flex: 1,
  },
  pendingTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  pendingMeta: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  instructionCard: {
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  instructionText: {
    flex: 1,
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  selectedEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  selectedEventInfo: {
    flex: 1,
  },
  selectedEventTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  selectedEventMeta: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  changeEventButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  changeEventText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  loadingContainer: {
    padding: spacing['3xl'],
    alignItems: 'center',
  },
  returnItemCard: {
    paddingVertical: spacing.lg,
  },
  returnItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  returnItemInfo: {
    flex: 1,
  },
  returnItemName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  returnItemCategory: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  sentQuantity: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  quantityLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quantityButton: {
    width: 36,
    height: 36,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  quantityInput: {
    width: 60,
    height: 36,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  maxButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.primary}20`,
    borderRadius: borderRadius.md,
  },
  maxButtonText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conditionLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  conditionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  conditionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  conditionButtonText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  footerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  footerLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  footerValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  submitButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
