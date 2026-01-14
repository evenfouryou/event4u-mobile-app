import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Button, Card } from '../../components';
import { api } from '../../lib/api';

const { width, height } = Dimensions.get('window');

interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  available: number;
  maxPerOrder: number;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endTime?: string;
  location: string;
  address: string;
  imageUrl?: string;
  venueId?: string;
  venueName?: string;
  organizer: string;
  ticketTypes: TicketType[];
}

export function EventDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { eventId } = route.params;

  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
  });

  const handleTicketQuantityChange = (ticketId: string, delta: number) => {
    setSelectedTickets((prev) => {
      const current = prev[ticketId] || 0;
      const ticket = event?.ticketTypes.find((t) => t.id === ticketId);
      const max = ticket?.maxPerOrder || 10;
      const newValue = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [ticketId]: newValue };
    });
  };

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    if (!event) return 0;
    return event.ticketTypes.reduce((sum, ticket) => {
      const qty = selectedTickets[ticket.id] || 0;
      return sum + ticket.price * qty;
    }, 0);
  };

  const handleAddToCart = () => {
    const tickets = Object.entries(selectedTickets)
      .filter(([_, qty]) => qty > 0)
      .map(([ticketId, quantity]) => ({ ticketId, quantity }));

    if (tickets.length === 0) return;

    navigation.navigate('Cart', {
      eventId,
      tickets,
    });
  };

  const handleVenuePress = () => {
    if (event?.venueId) {
      navigation.navigate('VenueDetail', { venueId: event.venueId });
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonContent}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonText} />
          <View style={styles.skeletonText} />
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
        <Text style={styles.errorText}>Evento non trovato</Text>
        <Button title="Torna indietro" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: event.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800' }}
            style={styles.heroImage}
          />
          <View style={styles.imageOverlay} />
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + spacing.sm }]}
            onPress={() => navigation.goBack()}
            data-testid="button-back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareButton, { top: insets.top + spacing.sm }]}
            data-testid="button-share"
          >
            <Ionicons name="share-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Data e Ora</Text>
                <Text style={styles.infoValue}>
                  {event.date} • {event.time}
                  {event.endTime && ` - ${event.endTime}`}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.infoRow} onPress={handleVenuePress}>
              <View style={styles.infoIcon}>
                <Ionicons name="location" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Luogo</Text>
                <Text style={styles.infoValue}>{event.venueName || event.location}</Text>
                <Text style={styles.infoAddress}>{event.address}</Text>
              </View>
              {event.venueId && (
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
              )}
            </TouchableOpacity>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Organizzatore</Text>
                <Text style={styles.infoValue}>{event.organizer}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descrizione</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biglietti</Text>
            {event.ticketTypes.map((ticket) => (
              <Card key={ticket.id} style={styles.ticketCard}>
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketName}>{ticket.name}</Text>
                  {ticket.description && (
                    <Text style={styles.ticketDescription}>{ticket.description}</Text>
                  )}
                  <Text style={styles.ticketPrice}>€{ticket.price.toFixed(2)}</Text>
                  <Text style={styles.ticketAvailable}>
                    {ticket.available > 0 ? `${ticket.available} disponibili` : 'Esaurito'}
                  </Text>
                </View>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleTicketQuantityChange(ticket.id, -1)}
                    disabled={!selectedTickets[ticket.id]}
                    data-testid={`button-decrease-${ticket.id}`}
                  >
                    <Ionicons
                      name="remove"
                      size={20}
                      color={selectedTickets[ticket.id] ? colors.foreground : colors.mutedForeground}
                    />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{selectedTickets[ticket.id] || 0}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleTicketQuantityChange(ticket.id, 1)}
                    disabled={ticket.available === 0}
                    data-testid={`button-increase-${ticket.id}`}
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={ticket.available > 0 ? colors.foreground : colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Totale</Text>
          <Text style={styles.priceValue}>€{getTotalPrice().toFixed(2)}</Text>
          <Text style={styles.ticketCount}>{getTotalTickets()} biglietti</Text>
        </View>
        <Button
          title="Aggiungi al Carrello"
          onPress={handleAddToCart}
          disabled={getTotalTickets() === 0}
          style={styles.addToCartButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  imageContainer: {
    width: '100%',
    height: height * 0.4,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backButton: {
    position: 'absolute',
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    position: 'absolute',
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
  },
  infoSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  infoValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  infoAddress: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  description: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    lineHeight: 24,
  },
  ticketCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  ticketDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  ticketPrice: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
  },
  ticketAvailable: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    minWidth: 30,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  priceValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  ticketCount: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  addToCartButton: {
    flex: 1,
  },
  errorText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  skeletonImage: {
    width: '100%',
    height: height * 0.4,
    backgroundColor: colors.card,
  },
  skeletonContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  skeletonTitle: {
    height: 32,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    width: '80%',
  },
  skeletonText: {
    height: 20,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    width: '60%',
  },
});
