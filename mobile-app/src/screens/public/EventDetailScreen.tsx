import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { triggerHaptic } from '@/lib/haptics';
import api, { PublicEventDetail as ApiEvent } from '@/lib/api';

interface Sector {
  id: string;
  name: string;
  ticketTypes: {
    id: string;
    name: string;
    price: number;
    available: number;
  }[];
}

interface EventDetailScreenProps {
  eventId: string;
  onBack: () => void;
  onAddToCart: (sectorId: string, ticketTypeId: string, quantity: number) => void;
  onGoToCart: () => void;
}

export function EventDetailScreen({
  eventId,
  onBack,
  onAddToCart,
  onGoToCart,
}: EventDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedTicketType, setSelectedTicketType] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [eventData, setEventData] = useState<ApiEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const data = await api.getPublicEventById(eventId);
      setEventData(data);
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEventData();
    setRefreshing(false);
  };

  const event = eventData ? {
    id: eventData.id,
    name: eventData.eventName || 'Evento',
    description: 'Scopri questo evento unico. Acquista i tuoi biglietti ora!',
    startDate: eventData.eventStart ? new Date(eventData.eventStart) : new Date(),
    endDate: eventData.eventEnd ? new Date(eventData.eventEnd) : new Date(),
    imageUrl: eventData.eventImageUrl || null,
    location: {
      name: eventData.locationName || 'Location',
      address: eventData.locationAddress || '',
    },
    category: eventData.categoryName || 'Evento',
    categoryColor: eventData.categoryColor || '#EC4899',
    sectors: (eventData.sectors || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      ticketTypes: [{
        id: `${s.id}-default`,
        name: s.name,
        price: s.price || 0,
        available: s.available || 0,
      }],
    })) as Sector[],
  } : null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedTicket = event?.sectors
    .flatMap(s => s.ticketTypes)
    .find(t => t.id === selectedTicketType);

  const total = selectedTicket ? selectedTicket.price * quantity : 0;

  const handleAddToCart = () => {
    if (selectedSector && selectedTicketType) {
      triggerHaptic('success');
      onAddToCart(selectedSector, selectedTicketType, quantity);
    }
  };

  if (loading) {
    return (
      <SafeArea style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={staticColors.primary} />
          <Text style={styles.loadingText}>Caricamento evento...</Text>
        </View>
      </SafeArea>
    );
  }

  if (!event) {
    return (
      <SafeArea style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={staticColors.mutedForeground} />
          <Text style={styles.loadingText}>Evento non trovato</Text>
          <Button variant="outline" onPress={onBack} style={{ marginTop: spacing.md }}>
            Torna indietro
          </Button>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={staticColors.primary}
          />
        }
      >
        <View style={styles.imageContainer}>
          {event.imageUrl ? (
            <Image source={{ uri: event.imageUrl }} style={styles.image} />
          ) : (
            <LinearGradient
              colors={['#4c1d95', '#7c3aed', '#a855f7']}
              style={styles.imagePlaceholder}
            >
              <Ionicons name="sparkles" size={80} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          )}
          <LinearGradient
            colors={['transparent', staticColors.background]}
            style={styles.imageOverlay}
          />

          <Pressable
            onPress={onBack}
            style={[styles.backButton, { top: insets.top + spacing.sm }]}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="chevron-back" size={24} color={staticColors.foreground} />
            </View>
          </Pressable>

          <View style={styles.imageBadges}>
            <Badge style={{ backgroundColor: event.categoryColor }}>
              {event.category}
            </Badge>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.eventName}>{event.name}</Text>

          <View style={styles.eventMeta}>
            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Ionicons name="calendar" size={20} color={staticColors.primary} />
              </View>
              <View>
                <Text style={styles.metaLabel}>{formatDate(event.startDate)}</Text>
                <Text style={styles.metaValue}>
                  {formatTime(event.startDate)} - {formatTime(event.endDate)}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Ionicons name="location" size={20} color={staticColors.primary} />
              </View>
              <View style={styles.metaTextContainer}>
                <Text style={styles.metaLabel}>{event.location.name}</Text>
                <Text style={styles.metaValue}>{event.location.address}</Text>
              </View>
              <Pressable style={styles.mapButton}>
                <Ionicons name="navigate" size={18} color={staticColors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.description}>
            <Text style={styles.sectionTitle}>Descrizione</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>

          <View style={styles.ticketsSection}>
            <Text style={styles.sectionTitle}>Scegli il tuo biglietto</Text>

            {event.sectors.map((sector) => (
              <View key={sector.id}>
                <Card style={styles.sectorCard}>
                  <Text style={styles.sectorName}>{sector.name}</Text>

                  {sector.ticketTypes.map((ticket) => {
                    const isSelected = selectedTicketType === ticket.id;
                    const isSoldOut = ticket.available <= 0;

                    return (
                      <Pressable
                        key={ticket.id}
                        onPress={() => {
                          if (!isSoldOut) {
                            triggerHaptic('selection');
                            setSelectedSector(sector.id);
                            setSelectedTicketType(ticket.id);
                            setQuantity(1);
                          }
                        }}
                        style={[
                          styles.ticketOption,
                          isSelected && styles.ticketOptionSelected,
                          isSoldOut && styles.ticketOptionDisabled,
                        ]}
                        disabled={isSoldOut}
                      >
                        <View style={styles.ticketInfo}>
                          <Text style={[
                            styles.ticketName,
                            isSoldOut && styles.ticketNameDisabled,
                          ]}>
                            {ticket.name}
                          </Text>
                          <Text style={styles.ticketAvailability}>
                            {isSoldOut ? 'Esaurito' : `${ticket.available} disponibili`}
                          </Text>
                        </View>
                        <View style={styles.ticketPrice}>
                          <Text style={[
                            styles.ticketPriceValue,
                            isSoldOut && styles.ticketPriceDisabled,
                          ]}>
                            €{ticket.price}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={24} color={staticColors.primary} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </Card>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {selectedTicketType && selectedTicket && (
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.quantitySelector}>
              <Pressable
                onPress={() => {
                  if (quantity > 1) {
                    triggerHaptic('light');
                    setQuantity(q => q - 1);
                  }
                }}
                style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={20} color={quantity <= 1 ? staticColors.mutedForeground : staticColors.foreground} />
              </Pressable>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <Pressable
                onPress={() => {
                  if (quantity < selectedTicket.available) {
                    triggerHaptic('light');
                    setQuantity(q => q + 1);
                  }
                }}
                style={[styles.quantityButton, quantity >= selectedTicket.available && styles.quantityButtonDisabled]}
                disabled={quantity >= selectedTicket.available}
              >
                <Ionicons name="add" size={20} color={quantity >= selectedTicket.available ? staticColors.mutedForeground : staticColors.foreground} />
              </Pressable>
            </View>

            <View style={styles.footerRight}>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Totale</Text>
                <Text style={styles.totalValue}>€{total.toFixed(2)}</Text>
              </View>
              <Button
                variant="golden"
                onPress={handleAddToCart}
                testID="button-add-to-cart"
              >
                Aggiungi
              </Button>
            </View>
          </View>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  imageContainer: {
    height: 280,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  backButton: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 10,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBadges: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.lg,
  },
  eventName: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.lg,
  },
  eventMeta: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  metaIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaTextContainer: {
    flex: 1,
  },
  metaLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  metaValue: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  mapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    lineHeight: 24,
  },
  ticketsSection: {
    gap: spacing.md,
  },
  sectorCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectorName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  ticketOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: -spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  ticketOptionSelected: {
    backgroundColor: `${staticColors.primary}10`,
  },
  ticketOptionDisabled: {
    opacity: 0.5,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  ticketNameDisabled: {
    color: staticColors.mutedForeground,
  },
  ticketAvailability: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  ticketPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ticketPriceValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.primary,
  },
  ticketPriceDisabled: {
    color: staticColors.mutedForeground,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: staticColors.card,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  quantityButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    minWidth: 40,
    textAlign: 'center',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  totalValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
});

export default EventDetailScreen;
