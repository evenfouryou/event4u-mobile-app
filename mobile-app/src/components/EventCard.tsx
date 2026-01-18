import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, fontSize, fontWeight } from '../theme';

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  imageUrl?: string;
  price?: number;
  isLive?: boolean;
  onPress: () => void;
}

export function EventCard({
  title,
  date,
  time,
  location,
  imageUrl,
  price,
  isLive = false,
  onPress,
}: EventCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <Image
        source={imageUrl ? { uri: imageUrl } : require('../../assets/event-placeholder.png')}
        style={styles.image}
        defaultSource={require('../../assets/event-placeholder.png')}
      />
      <LinearGradient
        colors={['transparent', colors.overlay.dark]}
        style={styles.gradient}
      />
      {isLive && (
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.teal} />
          <Text style={styles.infoText}>{date} • {time}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>{location}</Text>
        </View>
        {price !== undefined && (
          <Text style={styles.price}>
            {price === 0 ? 'Gratuito' : `Da €${price.toFixed(2)}`}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: colors.muted,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal,
  },
  liveText: {
    color: colors.teal,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1,
  },
  content: {
    padding: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    flex: 1,
  },
  price: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: spacing.lg,
  },
});
