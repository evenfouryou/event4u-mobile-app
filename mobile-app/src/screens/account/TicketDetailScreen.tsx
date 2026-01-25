import { View, Text, StyleSheet, ScrollView, Pressable, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { triggerHaptic } from '@/lib/haptics';

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
    fiscalSeal: 'SIAE-2026-ABC123',
    qrCode: 'data:image/svg+xml,...',
  };

  const formatDate = (date: Date) => {
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

  const handleShare = async () => {
    triggerHaptic('medium');
    try {
      await Share.share({
        message: `Il mio biglietto per ${ticket.eventName}\n${formatDate(ticket.eventDate)} alle ${formatTime(ticket.eventDate)}\n${ticket.location}`,
        title: ticket.eventName,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <SafeArea style={styles.container}>
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
        <View>
          <Card style={styles.qrCard} testID="card-qr">
            <View style={styles.qrContainer}>
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code" size={160} color={colors.foreground} />
              </View>
              <Text style={styles.ticketCode}>{ticket.ticketCode}</Text>
            </View>

            <View style={styles.qrDivider}>
              <View style={styles.qrDividerCircleLeft} />
              <View style={styles.qrDividerLine} />
              <View style={styles.qrDividerCircleRight} />
            </View>

            <View style={styles.ticketSummary}>
              <Text style={styles.eventName}>{ticket.eventName}</Text>
              <View style={styles.eventMeta}>
                <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.eventMetaText}>
                  {formatDate(ticket.eventDate)}
                </Text>
              </View>
              <View style={styles.eventMeta}>
                <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.eventMetaText}>
                  {formatTime(ticket.eventDate)} - {formatTime(ticket.eventEnd)}
                </Text>
              </View>
              <View style={styles.eventMeta}>
                <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.eventMetaText}>{ticket.location}</Text>
              </View>
            </View>
          </Card>
        </View>

        <View>
          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Dettagli Biglietto</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tipologia</Text>
              <Badge variant="default">{ticket.ticketType}</Badge>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Settore</Text>
              <Text style={styles.detailValue}>{ticket.sectorName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Intestatario</Text>
              <Text style={styles.detailValue}>{ticket.holderName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Prezzo</Text>
              <Text style={styles.detailValue}>€ {ticket.price.toFixed(2)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Stato</Text>
              <Badge variant="success">Valido</Badge>
            </View>
          </Card>
        </View>

        <View>
          <Card style={styles.venueCard}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.venueInfo}>
              <View style={styles.venueIcon}>
                <Ionicons name="business-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.venueText}>
                <Text style={styles.venueName}>{ticket.location}</Text>
                <Text style={styles.venueAddress}>{ticket.address}</Text>
              </View>
              <Pressable
                onPress={() => triggerHaptic('light')}
                style={styles.mapButton}
              >
                <Ionicons name="navigate-outline" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </Card>
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

        <View style={styles.fiscalInfo}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.fiscalText}>
            Sigillo SIAE: {ticket.fiscalSeal}
          </Text>
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
    paddingBottom: spacing.xxl,
  },
  shareButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCard: {
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: colors.foreground,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ticketCode: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    letterSpacing: 2,
  },
  qrDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: spacing.md,
  },
  qrDividerCircleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
    marginLeft: -spacing.lg - 10,
  },
  qrDividerLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrDividerCircleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
    marginRight: -spacing.lg - 10,
  },
  ticketSummary: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventMetaText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  detailsCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.foreground,
  },
  venueCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  venueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  venueIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueText: {
    flex: 1,
  },
  venueName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  venueAddress: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
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
  fiscalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fiscalText: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
});

export default TicketDetailScreen;
