import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, fontSize, fontWeight } from '../lib/theme';

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  imageUrl?: string;
  price?: number;
  onPress: () => void;
}

export function EventCard({
  title,
  date,
  time,
  location,
  imageUrl,
  price,
  onPress,
}: EventCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image
        source={imageUrl ? { uri: imageUrl } : require('../../assets/event-placeholder.png')}
        style={styles.image}
        defaultSource={require('../../assets/event-placeholder.png')}
      />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
          <Text style={styles.infoText}>{date} • {time}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
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
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: colors.muted,
  },
  content: {
    padding: spacing.md,
  },
  title: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  infoText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    flex: 1,
  },
  price: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    marginTop: spacing.sm,
  },
});
