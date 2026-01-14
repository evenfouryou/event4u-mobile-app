import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Button, Card, Header } from '../../components';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
}

interface ScanStats {
  totalScans: number;
  validScans: number;
  invalidScans: number;
  duplicateScans: number;
}

export function ScannerHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data: events, isLoading: eventsLoading, refetch } = useQuery<Event[]>({
    queryKey: ['/api/scanner/events'],
  });

  const { data: stats } = useQuery<ScanStats>({
    queryKey: ['/api/scanner/stats/today', selectedEvent?.id],
    enabled: !!selectedEvent,
  });

  const todayStats = stats || {
    totalScans: 0,
    validScans: 0,
    invalidScans: 0,
    duplicateScans: 0,
  };

  const handleEventSelect = useCallback((event: Event) => {
    setSelectedEvent(event);
  }, []);

  const handleScan = useCallback(() => {
    if (selectedEvent) {
      navigation.navigate('ScannerScan', { eventId: selectedEvent.id, eventTitle: selectedEvent.title });
    }
  }, [navigation, selectedEvent]);

  const handleViewHistory = useCallback(() => {
    if (selectedEvent) {
      navigation.navigate('ScannerHistory', { eventId: selectedEvent.id });
    }
  }, [navigation, selectedEvent]);

  const handleViewStats = useCallback(() => {
    if (selectedEvent) {
      navigation.navigate('ScannerStats', { eventId: selectedEvent.id });
    }
  }, [navigation, selectedEvent]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Scanner" />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seleziona Evento</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventsScroll}>
            {(events || []).map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventCard,
                  selectedEvent?.id === event.id && styles.eventCardSelected,
                ]}
                onPress={() => handleEventSelect(event)}
                data-testid={`button-event-${event.id}`}
              >
                <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                <View style={styles.eventDetails}>
                  <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.eventDate}>{event.date}</Text>
                </View>
                <View style={styles.eventDetails}>
                  <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.eventDate}>{event.time}</Text>
                </View>
                {selectedEvent?.id === event.id && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {eventsLoading && (
              <View style={styles.loadingEvents}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={styles.skeletonEventCard} />
                ))}
              </View>
            )}
            {!eventsLoading && (!events || events.length === 0) && (
              <Card style={styles.noEventsCard}>
                <Ionicons name="calendar-outline" size={32} color={colors.mutedForeground} />
                <Text style={styles.noEventsText}>Nessun evento disponibile</Text>
              </Card>
            )}
          </ScrollView>
        </View>

        {selectedEvent && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Statistiche Oggi</Text>
              <View style={styles.statsGrid}>
                <Card style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="scan-outline" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.statValue}>{todayStats.totalScans}</Text>
                  <Text style={styles.statLabel}>Scansioni</Text>
                </Card>
                
                <Card style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.success + '20' }]}>
                    <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.success }]}>{todayStats.validScans}</Text>
                  <Text style={styles.statLabel}>Validi</Text>
                </Card>
                
                <Card style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.destructive + '20' }]}>
                    <Ionicons name="close-circle-outline" size={24} color={colors.destructive} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.destructive }]}>{todayStats.invalidScans}</Text>
                  <Text style={styles.statLabel}>Errori</Text>
                </Card>
                
                <Card style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.warning + '20' }]}>
                    <Ionicons name="copy-outline" size={24} color={colors.warning} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.warning }]}>{todayStats.duplicateScans}</Text>
                  <Text style={styles.statLabel}>Duplicati</Text>
                </Card>
              </View>
            </View>

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={handleScan}
                activeOpacity={0.8}
                data-testid="button-scan"
              >
                <View style={styles.scanButtonInner}>
                  <Ionicons name="scan" size={48} color={colors.primaryForeground} />
                  <Text style={styles.scanButtonText}>Scansiona</Text>
                  <Text style={styles.scanButtonSubtext}>Tocca per avviare la scansione</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleViewHistory}
                data-testid="button-history"
              >
                <Ionicons name="time-outline" size={24} color={colors.foreground} />
                <Text style={styles.actionButtonText}>Storico</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleViewStats}
                data-testid="button-stats"
              >
                <Ionicons name="stats-chart-outline" size={24} color={colors.foreground} />
                <Text style={styles.actionButtonText}>Statistiche</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!selectedEvent && !eventsLoading && events && events.length > 0 && (
          <Card style={styles.selectEventPrompt}>
            <Ionicons name="hand-left-outline" size={48} color={colors.primary} />
            <Text style={styles.promptTitle}>Seleziona un evento</Text>
            <Text style={styles.promptText}>
              Scegli l'evento per cui vuoi scansionare i biglietti
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  eventsScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  eventCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginRight: spacing.md,
    minWidth: 160,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  eventCardSelected: {
    borderColor: colors.primary,
  },
  eventTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  eventDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  loadingEvents: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skeletonEventCard: {
    width: 160,
    height: 100,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
  },
  noEventsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minWidth: 200,
  },
  noEventsText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  scanButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  scanButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  scanButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginTop: spacing.md,
  },
  scanButtonSubtext: {
    color: colors.primaryForeground,
    fontSize: fontSize.sm,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButtonText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  selectEventPrompt: {
    alignItems: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xl,
  },
  promptTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
  },
  promptText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
