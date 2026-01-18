import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { colors, borderRadius, spacing, fontSize, fontWeight } from '../theme';

interface TicketCardProps {
  id: string;
  eventTitle: string;
  date: string;
  time: string;
  location: string;
  ticketType: string;
  ticketCode: string;
  status: 'valid' | 'used' | 'cancelled';
  onPress: () => void;
}

export function TicketCard({
  eventTitle,
  date,
  time,
  location,
  ticketType,
  ticketCode,
  status,
  onPress,
}: TicketCardProps) {
  const statusColors = {
    valid: colors.teal,
    used: colors.textSecondary,
    cancelled: colors.destructive,
  };

  const statusLabels = {
    valid: 'Valido',
    used: 'Utilizzato',
    cancelled: 'Annullato',
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.eventTitle} numberOfLines={2}>{eventTitle}</Text>
          <Text style={styles.ticketType}>{ticketType}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[status] + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[status] }]}>
            {statusLabels[status]}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.teal} />
          <Text style={styles.detailText}>{date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{time}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>{location}</Text>
        </View>
      </View>

      {status === 'valid' && (
        <View style={styles.qrContainer}>
          <QRCode
            value={ticketCode}
            size={100}
            backgroundColor="white"
            color="black"
          />
          <Text style={styles.qrCode}>{ticketCode}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  eventTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  ticketType: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  statusBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.xl,
  },
  details: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    flex: 1,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: spacing['2xl'],
    padding: spacing.xl,
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
  },
  qrCode: {
    color: colors.background,
    fontSize: fontSize.xs,
    marginTop: spacing.md,
    fontFamily: 'monospace',
  },
});
