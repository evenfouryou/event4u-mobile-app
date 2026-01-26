import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { ScannerEvent } from '@/lib/api';

interface ScannerEventsScreenProps {
  onBack: () => void;
  onEventPress: (eventId: string) => void;
}

export function ScannerEventsScreen({ onBack, onEventPress }: ScannerEventsScreenProps) {
  const { colors } = useTheme();
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
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
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
          {item.eventImageUrl ? (
            <Image source={{ uri: item.eventImageUrl }} style={styles.eventImage} />
          ) : (
            <View style={[styles.eventImagePlaceholder, { backgroundColor: colors.secondary }]}>
              <Ionicons name="calendar" size={32} color={colors.mutedForeground} />
            </View>
          )}
          
          <View style={styles.eventContent}>
            <View style={styles.eventHeader}>
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
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.locationName}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {formatDate(item.eventStart)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {formatTime(item.eventStart)}
                </Text>
              </View>
            </View>

            <View style={styles.permissionsRow}>
              {item.canScanLists && (
                <Badge variant="secondary">
                  <Text style={styles.permissionText}>Liste</Text>
                </Badge>
              )}
              {item.canScanTables && (
                <Badge variant="secondary">
                  <Text style={styles.permissionText}>Tavoli</Text>
                </Badge>
              )}
              {item.canScanTickets && (
                <Badge variant="secondary">
                  <Text style={styles.permissionText}>Biglietti</Text>
                </Badge>
              )}
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.foreground }]}>
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

          <View style={styles.chevron}>
            <Ionicons name="chevron-forward" size={24} color={colors.mutedForeground} />
          </View>
        </Card>
      </Pressable>
    );
  };

  if (loading) {
    return <Loading text="Caricamento eventi..." />;
  }

  return (
    <SafeArea edges={['bottom']} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }])}>
      <Header
        title="I miei Eventi"
        showBack
        onBack={onBack}
        testID="header-scanner-events"
      />

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
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  eventCard: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  eventImage: {
    width: 100,
    height: '100%',
    minHeight: 140,
  },
  eventImagePlaceholder: {
    width: 100,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.fontSize.xs,
    flex: 1,
  },
  permissionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  permissionText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.secondaryForeground,
  },
  progressSection: {
    gap: spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  chevron: {
    justifyContent: 'center',
    paddingRight: spacing.sm,
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
