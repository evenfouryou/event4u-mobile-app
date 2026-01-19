import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Button, Card, Header } from '../../components';
import { api } from '../../lib/api';

interface ResaleDetail {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventImageUrl?: string;
  ticketType: string;
  originalPrice: number;
  resalePrice: number;
  sellerName: string;
  sellerRating?: number;
  quantity: number;
  listedAt: string;
  description?: string;
  transferMethod: 'digital' | 'physical';
  isVerified: boolean;
}

export function ResaleCheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const { resaleId } = route.params;

  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const { data: resale, isLoading } = useQuery<ResaleDetail>({
    queryKey: ['/api/public/resales', resaleId],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (data: { resaleId: string; quantity: number }) => {
      return api.post('/api/resales/purchase', data);
    },
    onSuccess: () => {
      navigation.navigate('CheckoutSuccess', {
        type: 'resale',
        resaleId,
      });
    },
    onError: (error: Error) => {
      Alert.alert('Errore', error.message || 'Acquisto non riuscito');
    },
  });

  const handleQuantityChange = (delta: number) => {
    if (!resale) return;
    const newQty = Math.max(1, Math.min(resale.quantity, selectedQuantity + delta));
    setSelectedQuantity(newQty);
  };

  const getTotalPrice = () => {
    if (!resale) return 0;
    return resale.resalePrice * selectedQuantity;
  };

  const getServiceFee = () => {
    return getTotalPrice() * 0.05;
  };

  const getGrandTotal = () => {
    return getTotalPrice() + getServiceFee();
  };

  const handlePurchase = () => {
    if (!resale) return;
    
    Alert.alert(
      'Conferma Acquisto',
      `Stai per acquistare ${selectedQuantity} bigliett${selectedQuantity > 1 ? 'i' : 'o'} per €${getGrandTotal().toFixed(2)}`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Procedi',
          onPress: () => {
            navigation.navigate('Checkout', {
              type: 'resale',
              resaleId,
              quantity: selectedQuantity,
              total: getGrandTotal(),
            });
          },
        },
      ]
    );
  };

  const contentMaxWidth = isTablet ? 600 : undefined;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header 
          title="Acquista Biglietto" 
          showBack 
          onBack={() => navigation.goBack()} 
          testID="header-resale-checkout"
        />
        <View style={styles.loadingContainer} testID="container-loading">
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
        </View>
      </SafeAreaView>
    );
  }

  if (!resale) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'bottom', 'left', 'right']}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
        <Text style={styles.errorText} testID="text-error-not-found">Biglietto non trovato</Text>
        <Button 
          title="Torna indietro" 
          onPress={() => navigation.goBack()} 
          testID="button-go-back"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header 
        title="Acquista Biglietto" 
        showBack 
        onBack={() => navigation.goBack()} 
        testID="header-resale-checkout"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 140 },
          isTablet && styles.tabletScrollContent,
        ]}
        testID="scrollview-resale-checkout"
      >
        <View style={[
          styles.content,
          isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
          isLandscape && styles.landscapeContent,
        ]}>
          <Card style={styles.eventCard} testID="card-event-info">
            <Image
              source={{ uri: resale.eventImageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400' }}
              style={styles.eventImage}
              testID="image-event"
            />
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle} testID="text-event-title">{resale.eventTitle}</Text>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.infoText} testID="text-event-datetime">{resale.eventDate} • {resale.eventTime}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.infoText} testID="text-event-location">{resale.eventLocation}</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.ticketCard} testID="card-ticket-info">
            <View style={styles.ticketHeader}>
              <View>
                <Text style={styles.ticketType} testID="text-ticket-type">{resale.ticketType}</Text>
                {resale.isVerified && (
                  <View style={styles.verifiedBadge} testID="badge-verified">
                    <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                    <Text style={styles.verifiedText}>Verificato</Text>
                  </View>
                )}
              </View>
              <View style={styles.priceInfo}>
                <Text style={styles.resalePrice} testID="text-resale-price">€{resale.resalePrice.toFixed(2)}</Text>
                <Text style={styles.originalPrice} testID="text-original-price">
                  Orig. €{resale.originalPrice.toFixed(2)}
                </Text>
              </View>
            </View>

            {resale.description && (
              <Text style={styles.ticketDescription} testID="text-ticket-description">{resale.description}</Text>
            )}

            <View style={styles.transferInfo} testID="container-transfer-info">
              <Ionicons
                name={resale.transferMethod === 'digital' ? 'phone-portrait-outline' : 'mail-outline'}
                size={16}
                color={colors.primary}
              />
              <Text style={styles.transferText}>
                {resale.transferMethod === 'digital'
                  ? 'Trasferimento digitale immediato'
                  : 'Consegna biglietto fisico'}
              </Text>
            </View>

            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Quantità</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(-1)}
                  disabled={selectedQuantity <= 1}
                  testID="button-decrease-quantity"
                >
                  <Ionicons
                    name="remove"
                    size={20}
                    color={selectedQuantity > 1 ? colors.foreground : colors.mutedForeground}
                  />
                </TouchableOpacity>
                <Text style={styles.quantityText} testID="text-quantity">{selectedQuantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(1)}
                  disabled={selectedQuantity >= resale.quantity}
                  testID="button-increase-quantity"
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={selectedQuantity < resale.quantity ? colors.foreground : colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.availableText} testID="text-available-quantity">{resale.quantity} disponibili</Text>
            </View>
          </Card>

          <Card style={styles.sellerCard} testID="card-seller-info">
            <Text style={styles.sectionTitle}>Venditore</Text>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerAvatar}>
                <Ionicons name="person" size={24} color={colors.mutedForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sellerName} testID="text-seller-name">{resale.sellerName}</Text>
                {resale.sellerRating && (
                  <View style={styles.sellerRating}>
                    <Ionicons name="star" size={14} color={colors.warning} />
                    <Text style={styles.ratingText} testID="text-seller-rating">{resale.sellerRating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </View>
          </Card>

          <Card style={styles.guaranteeCard} testID="card-guarantee">
            <View style={styles.guaranteeRow}>
              <Ionicons name="shield-checkmark" size={24} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.guaranteeTitle}>Garanzia Event4U</Text>
                <Text style={styles.guaranteeText}>
                  Il tuo acquisto è protetto. Rimborso completo se il biglietto non è valido.
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      <View style={[
        styles.bottomBar,
        isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
      ]} testID="container-bottom-bar">
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biglietti ({selectedQuantity}x)</Text>
            <Text style={styles.summaryValue} testID="text-subtotal">€{getTotalPrice().toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Commissione servizio</Text>
            <Text style={styles.summaryValue} testID="text-service-fee">€{getServiceFee().toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Totale</Text>
            <Text style={styles.totalValue} testID="text-grand-total">€{getGrandTotal().toFixed(2)}</Text>
          </View>
        </View>
        <Button
          title="Procedi all'acquisto"
          onPress={handlePurchase}
          loading={purchaseMutation.isPending}
          testID="button-proceed-purchase"
        />
      </View>
    </SafeAreaView>
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
  scrollContent: {
    flexGrow: 1,
  },
  tabletScrollContent: {
    paddingHorizontal: spacing.xl,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  landscapeContent: {
    paddingHorizontal: spacing.xl,
  },
  loadingContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  skeletonCard: {
    height: 120,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
  },
  eventCard: {
    flexDirection: 'row',
    padding: 0,
    overflow: 'hidden',
  },
  eventImage: {
    width: 80,
    height: 80,
    backgroundColor: colors.muted,
  },
  eventInfo: {
    flex: 1,
    padding: spacing.md,
  },
  eventTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  infoText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  ticketCard: {},
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  ticketType: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  verifiedText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  resalePrice: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  originalPrice: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textDecorationLine: 'line-through',
  },
  ticketDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  transferInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.muted,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  transferText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quantityLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    flex: 1,
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
  availableText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  sellerCard: {},
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  sellerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  ratingText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  guaranteeCard: {},
  guaranteeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  guaranteeTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  guaranteeText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
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
  },
  summaryContainer: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
  },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  totalValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  errorText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
});
