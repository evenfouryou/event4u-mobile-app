import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { triggerHaptic } from '@/lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TICKET_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

interface TicketDetailScreenProps {
  ticketId: string;
  onBack: () => void;
  onResell?: () => void;
  onNameChange?: () => void;
}

export function TicketDetailScreen({
  ticketId,
  onBack,
  onResell,
  onNameChange,
}: TicketDetailScreenProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const ticket = {
    id: ticketId,
    ticketCode: 'EVT-2026-001234',
    eventName: 'Saturday Night Fever',
    eventDate: new Date('2026-02-01T23:00:00'),
    eventEnd: new Date('2026-02-02T05:00:00'),
    location: 'Club XYZ',
    address: 'Via Roma 123, Milano',
    ticketType: 'VIP',
    sectorName: 'Zona Privé',
    status: 'active' as const,
    price: 50.0,
    holderName: 'Mario Rossi',
    fiscalSealCode: 'SIAE-2026-ABC123-DEF456-GHI789',
    organizerCompany: 'Event4U S.r.l.',
    ticketingManager: 'Biglietteria Centrale',
    emissionDateTime: new Date('2026-01-20T14:30:00'),
    progressiveNumber: '00123',
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (date: Date) => {
    return `${formatDate(date)} ${formatTime(date)}`;
  };

  const handleFlip = () => {
    triggerHaptic('medium');
    setIsFlipped(!isFlipped);
  };

  const handleShare = async () => {
    triggerHaptic('medium');
    try {
      await Share.share({
        message: `Il mio biglietto per ${ticket.eventName}\n${formatFullDate(ticket.eventDate)} alle ${formatTime(ticket.eventDate)}\n${ticket.location}`,
        title: ticket.eventName,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const PerforatedEdge = ({ side }: { side: 'left' | 'right' }) => (
    <View style={[styles.perforatedEdge, side === 'left' ? styles.perforatedLeft : styles.perforatedRight]}>
      {[...Array(12)].map((_, i) => (
        <View key={i} style={styles.perforatedHole} />
      ))}
    </View>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        rightElement={
          <Pressable onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color={colors.foreground} />
          </Pressable>
        }
        testID="header-ticket-detail"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ticketContainer}>
          <View style={styles.ticketCard}>
            <LinearGradient
              colors={[colors.primary, '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ticketHeader}
            >
              <View style={styles.headerContent}>
                <Text style={styles.headerLabel}>Biglietto Evento</Text>
                <Text style={styles.headerTitle} numberOfLines={2}>
                  {ticket.eventName}
                </Text>
              </View>
              <Ionicons name="ticket" size={32} color="rgba(0,0,0,0.3)" />
            </LinearGradient>

            <PerforatedEdge side="left" />
            <PerforatedEdge side="right" />

            <View style={styles.ticketBody}>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <View style={styles.infoHeader}>
                    <Ionicons name="calendar" size={14} color={colors.primary} />
                    <Text style={styles.infoLabel}>DATA</Text>
                  </View>
                  <Text style={styles.infoValue}>{formatDate(ticket.eventDate)}</Text>
                  <Text style={styles.infoSubvalue}>{formatTime(ticket.eventDate)}</Text>
                </View>

                <View style={styles.infoItem}>
                  <View style={styles.infoHeader}>
                    <Ionicons name="location" size={14} color={colors.primary} />
                    <Text style={styles.infoLabel}>LUOGO</Text>
                  </View>
                  <Text style={styles.infoValue} numberOfLines={1}>{ticket.location}</Text>
                  <Text style={styles.infoSubvalue} numberOfLines={1}>{ticket.address}</Text>
                </View>

                <View style={styles.infoItem}>
                  <View style={styles.infoHeader}>
                    <Ionicons name="ticket" size={14} color={colors.primary} />
                    <Text style={styles.infoLabel}>SETTORE</Text>
                  </View>
                  <Text style={styles.infoValue}>{ticket.sectorName}</Text>
                  <Text style={styles.infoSubvalue}>{ticket.ticketType}</Text>
                </View>

                <View style={styles.infoItem}>
                  <View style={styles.infoHeader}>
                    <Ionicons name="person" size={14} color={colors.primary} />
                    <Text style={styles.infoLabel}>INTESTATARIO</Text>
                  </View>
                  <Text style={styles.infoValue} numberOfLines={1}>{ticket.holderName}</Text>
                </View>
              </View>

              <View style={styles.dashedDivider} />

              <View style={styles.qrSection}>
                <View style={styles.flipContainer}>
                  {!isFlipped ? (
                    <View style={styles.qrWrapper}>
                      <Image
                        source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticket.ticketCode)}&bgcolor=FFFFFF&color=000000` }}
                        style={styles.qrImage}
                        resizeMode="contain"
                        testID="image-qr-code"
                      />
                    </View>
                  ) : (
                    <View style={styles.backContent}>
                      <Text style={styles.backTitle}>Dettagli Biglietto</Text>
                      
                      <View style={styles.backItem}>
                        <Ionicons name="business" size={14} color={colors.primary} />
                        <View style={styles.backItemText}>
                          <Text style={styles.backItemLabel}>Organizzatore</Text>
                          <Text style={styles.backItemValue}>{ticket.organizerCompany}</Text>
                        </View>
                      </View>

                      <View style={styles.backItem}>
                        <Ionicons name="storefront" size={14} color={colors.primary} />
                        <View style={styles.backItemText}>
                          <Text style={styles.backItemLabel}>Biglietteria</Text>
                          <Text style={styles.backItemValue}>{ticket.ticketingManager}</Text>
                        </View>
                      </View>

                      <View style={styles.backItem}>
                        <Ionicons name="calendar" size={14} color={colors.primary} />
                        <View style={styles.backItemText}>
                          <Text style={styles.backItemLabel}>Data Emissione</Text>
                          <Text style={styles.backItemValue}>{formatDateTime(ticket.emissionDateTime)}</Text>
                        </View>
                      </View>

                      <View style={styles.backItem}>
                        <Ionicons name="document-text" size={14} color={colors.primary} />
                        <View style={styles.backItemText}>
                          <Text style={styles.backItemLabel}>Sigillo Fiscale</Text>
                          <Text style={styles.backItemValueSmall}>{ticket.fiscalSealCode}</Text>
                        </View>
                      </View>

                      <View style={styles.backItem}>
                        <Ionicons name="barcode" size={14} color={colors.primary} />
                        <View style={styles.backItemText}>
                          <Text style={styles.backItemLabel}>N. Progressivo</Text>
                          <Text style={styles.backItemValue}>{ticket.progressiveNumber}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                <Button
                  variant="outline"
                  onPress={handleFlip}
                  style={styles.flipButton}
                  testID="button-flip-ticket"
                >
                  <View style={styles.flipButtonContent}>
                    <Ionicons 
                      name={isFlipped ? "qr-code" : "refresh"} 
                      size={18} 
                      color={colors.foreground} 
                    />
                    <Text style={styles.flipButtonText}>
                      {isFlipped ? 'Mostra QR Code' : 'Gira Biglietto'}
                    </Text>
                  </View>
                </Button>
              </View>

              <View style={styles.dashedDivider} />

              <View style={styles.footer}>
                <View style={styles.footerRow}>
                  <View>
                    <Text style={styles.footerLabel}>Codice Biglietto</Text>
                    <Text style={styles.footerCode}>{ticket.ticketCode}</Text>
                  </View>
                  <View style={styles.footerPrice}>
                    <Text style={styles.footerLabel}>Prezzo</Text>
                    <Text style={styles.priceValue}>€{ticket.price.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.fiscalSection}>
                  <View style={styles.fiscalBadge}>
                    <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                    <Text style={styles.fiscalLabel}>Sigillo Fiscale SIAE</Text>
                  </View>
                  <Text style={styles.fiscalCode}>{ticket.fiscalSealCode}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.ticketShadow} />
        </View>

        <View style={styles.actions}>
          {onNameChange && (
            <Button
              variant="outline"
              onPress={onNameChange}
              style={styles.actionButton}
              testID="button-name-change"
            >
              <View style={styles.buttonContent}>
                <Ionicons name="person-outline" size={20} color={colors.foreground} />
                <Text style={styles.buttonText}>Cambio Nominativo</Text>
              </View>
            </Button>
          )}

          {onResell && (
            <Button
              variant="secondary"
              onPress={onResell}
              style={styles.actionButton}
              testID="button-resell"
            >
              <View style={styles.buttonContent}>
                <Ionicons name="swap-horizontal-outline" size={20} color={colors.foreground} />
                <Text style={styles.buttonText}>Metti in Rivendita</Text>
              </View>
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  shareButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  ticketCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: '#000',
  },
  perforatedEdge: {
    position: 'absolute',
    top: 60,
    bottom: 0,
    width: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 10,
  },
  perforatedLeft: {
    left: -8,
  },
  perforatedRight: {
    right: -8,
  },
  perforatedHole: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  ticketBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    paddingVertical: spacing.sm,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  infoSubvalue: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  dashedDivider: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md,
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  flipContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrWrapper: {
    width: 200,
    height: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  backContent: {
    width: 200,
    height: 200,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  backItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  backItemText: {
    flex: 1,
  },
  backItemLabel: {
    fontSize: 9,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  backItemValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: colors.foreground,
  },
  backItemValueSmall: {
    fontSize: 9,
    fontWeight: '500',
    color: colors.foreground,
    fontFamily: 'monospace',
  },
  flipButton: {
    marginTop: spacing.md,
    width: '100%',
  },
  flipButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flipButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.foreground,
  },
  footer: {
    gap: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  footerCode: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.foreground,
    fontFamily: 'monospace',
  },
  footerPrice: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  fiscalSection: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fiscalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  fiscalLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fiscalCode: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.mutedForeground,
    fontFamily: 'monospace',
  },
  ticketShadow: {
    position: 'absolute',
    bottom: -8,
    left: '12.5%',
    width: '75%',
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 100,
    transform: [{ scaleY: 0.3 }],
  },
  actions: {
    gap: spacing.sm,
  },
  actionButton: {
    height: 52,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
});

export default TicketDetailScreen;
