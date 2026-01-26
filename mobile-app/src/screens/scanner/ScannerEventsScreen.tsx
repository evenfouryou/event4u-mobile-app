import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { ScannerEvent } from '@/lib/api';

interface ScannerEventsScreenProps {
  onBack: () => void;
  onEventPress: (eventId: string) => void;
}

export function ScannerEventsScreen({ onBack, onEventPress }: ScannerEventsScreenProps) {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<ScannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getScannerEvents();
      setEvents(data);
    } catch (error) {
      console.error('Error loading scanner events:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getEventStatus = (event: ScannerEvent) => {
    const now = new Date();
    const start = new Date(event.eventStart);
    const end = new Date(event.eventEnd);

    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'live';
    return 'past';
  };

  const renderEvent = ({ item }: { item: ScannerEvent }) => {
    const status = getEventStatus(item);
    const percentage = item.totalGuests > 0 
      ? Math.round((item.checkedIn / item.totalGuests) * 100) 
      : 0;

    return (
      <Pressable
        onPress={() => {
          triggerHaptic('light');
          onEventPress(item.eventId);
        }}
        testID={`event-${item.id}`}
      >
        <Card style={styles.eventCard}>
          <View style={styles.eventHeader}>
            {item.eventImageUrl ? (
              <Image source={{ uri: item.eventImageUrl }} style={styles.eventImage} />
            ) : (
              <View style={[styles.eventImagePlaceholder, { backgroundColor: colors.secondary }]}>
                <Ionicons name="calendar" size={28} color={colors.mutedForeground} />
              </View>
            )}
            <View style={styles.eventTitleSection}>
              <View style={styles.eventTitleRow}>
                <Text style={[styles.eventName, { color: colors.foreground }]} numberOfLines={2}>
                  {item.eventName}
                </Text>
                {status === 'live' && (
                  <Badge variant="destructive">
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  </Badge>
                )}
              </View>
              <View style={styles.eventMeta}>
                <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.locationName}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.mutedForeground} />
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.detailText, { color: colors.foreground }]}>
                  {formatDate(item.eventStart)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.detailText, { color: colors.foreground }]}>
                  {formatTime(item.eventStart)}
                </Text>
              </View>
            </View>

            <View style={styles.permissionsRow}>
              {item.canScanLists && (
                <Badge variant="secondary">
                  <Text style={[styles.permissionText, { color: colors.foreground }]}>Liste</Text>
                </Badge>
              )}
              {item.canScanTables && (
                <Badge variant="secondary">
                  <Text style={[styles.permissionText, { color: colors.foreground }]}>Tavoli</Text>
                </Badge>
              )}
              {item.canScanTickets && (
                <Badge variant="secondary">
                  <Text style={[styles.permissionText, { color: colors.foreground }]}>Biglietti</Text>
                </Badge>
              )}
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                  Check-in: {item.checkedIn}/{item.totalGuests}
                </Text>
                <Text style={[styles.progressPercentage, { color: colors.primary }]}>
                  {percentage}%
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.secondary }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${percentage}%`,
                      backgroundColor: colors.primary 
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  if (loading) {
    return <Loading text="Caricamento eventi..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton} testID="button-back">
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>I miei Eventi</Text>
        <View style={styles.headerRight} />
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Nessun evento assegnato
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Contatta il gestore per essere assegnato a un evento
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  eventCard: {
    gap: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
  },
  eventImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTitleSection: {
    flex: 1,
    gap: spacing.xs,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: staticColors.primaryForeground,
  },
  liveText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: staticColors.primaryForeground,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.fontSize.xs,
    flex: 1,
  },
  divider: {
    height: 1,
  },
  eventDetails: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
  },
  permissionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  permissionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  progressSection: {
    gap: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: typography.fontSize.sm,
  },
  progressPercentage: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
});
