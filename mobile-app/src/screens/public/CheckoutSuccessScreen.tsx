import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Share, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Button, Card } from '../../components';
import { api } from '../../lib/api';

interface OrderConfirmation {
  orderId: string;
  orderNumber: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  tickets: {
    type: string;
    quantity: number;
  }[];
  total: number;
  email: string;
  qrCode?: string;
}

export function CheckoutSuccessScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const { orderId, type } = route.params || {};

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { data: order } = useQuery<OrderConfirmation>({
    queryKey: ['/api/orders', orderId],
    enabled: !!orderId,
  });

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleViewTickets = () => {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'HomeTabs' },
        { name: 'MyTickets' },
      ],
    });
  };

  const handleBackToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeTabs' }],
    });
  };

  const handleShare = async () => {
    if (!order) return;
    try {
      await Share.share({
        message: `Ho appena acquistato i biglietti per ${order.eventTitle}! ${order.eventDate} • ${order.eventLocation}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleAddToCalendar = () => {
    if (!order) return;
  };

  const contentMaxWidth = isTablet ? 600 : undefined;

  return (
    <SafeAreaView 
      style={styles.container} 
      edges={['top', 'bottom', 'left', 'right']}
      testID="screen-checkout-success"
    >
      <View style={[
        styles.content,
        isLandscape && styles.contentLandscape,
        isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
      ]}>
        <Animated.View
          style={[
            styles.successIcon,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
          testID="icon-success"
        >
          <View style={styles.successIconInner}>
            <Ionicons name="checkmark" size={48} color={colors.successForeground} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
          <Text style={styles.title} testID="text-success-title">Acquisto Completato!</Text>
          <Text style={styles.subtitle} testID="text-success-subtitle">
            I tuoi biglietti sono stati acquistati con successo
          </Text>
        </Animated.View>

        {order && (
          <Animated.View style={[styles.orderCard, { opacity: fadeAnim }]} testID="card-order-confirmation">
            <Card>
              <View style={styles.orderHeader}>
                <Text style={styles.orderLabel} testID="text-order-label">Ordine</Text>
                <Text style={styles.orderNumber} testID="text-order-number">#{order.orderNumber}</Text>
              </View>

              <View style={styles.orderDivider} />

              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} testID="text-event-title">{order.eventTitle}</Text>
                <View style={styles.eventDetail}>
                  <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.eventDetailText} testID="text-event-date">
                    {order.eventDate} • {order.eventTime}
                  </Text>
                </View>
                <View style={styles.eventDetail}>
                  <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.eventDetailText} testID="text-event-location">{order.eventLocation}</Text>
                </View>
              </View>

              <View style={styles.orderDivider} />

              <View style={styles.ticketsSummary}>
                {order.tickets.map((ticket, index) => (
                  <View key={index} style={styles.ticketRow} testID={`row-ticket-${index}`}>
                    <Text style={styles.ticketType}>{ticket.type}</Text>
                    <Text style={styles.ticketQuantity}>x{ticket.quantity}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.orderDivider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel} testID="text-total-label">Totale Pagato</Text>
                <Text style={styles.totalValue} testID="text-total-value">€{order.total.toFixed(2)}</Text>
              </View>

              <View style={styles.emailInfo}>
                <Ionicons name="mail-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.emailText} testID="text-email-confirmation">
                  Conferma inviata a {order.email}
                </Text>
              </View>
            </Card>
          </Animated.View>
        )}

        <Animated.View style={[styles.actionsRow, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            testID="button-share"
          >
            <View style={styles.actionIcon}>
              <Ionicons name="share-social-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>Condividi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddToCalendar}
            testID="button-calendar"
          >
            <View style={styles.actionIcon}>
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>Calendario</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Animated.View style={[
        styles.bottomButtons, 
        { opacity: fadeAnim },
        isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
      ]}>
        <Button
          title="Visualizza i miei biglietti"
          onPress={handleViewTickets}
          testID="button-view-tickets"
        />
        <Button
          title="Torna alla Home"
          variant="outline"
          onPress={handleBackToHome}
          testID="button-back-home"
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  contentLandscape: {
    paddingTop: spacing.md,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successIconInner: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  orderCard: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  orderNumber: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  orderDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  eventInfo: {},
  eventTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  eventDetailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  ticketsSummary: {
    gap: spacing.xs,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketType: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  ticketQuantity: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  totalValue: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  emailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
  },
  emailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  bottomButtons: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
