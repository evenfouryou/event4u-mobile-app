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

interface ActiveScannersInfo {
  onlineCount: number;
  totalCount: number;
}

interface RecentScan {
  id: string;
  ticketCode: string;
  holderName: string;
  result: 'success' | 'error' | 'duplicate';
  timestamp: string;
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

  const { data: activeScanners } = useQuery<ActiveScannersInfo>({
    queryKey: ['/api/scanners/active'],
  });

  const { data: recentScans } = useQuery<RecentScan[]>({
    queryKey: ['/api/scans/recent'],
  });

  const handleManageOperators = useCallback(() => {
    navigation.navigate('ScannerOperators');
  }, [navigation]);

  const handleViewActivity = useCallback(() => {
    navigation.navigate('ScanActivity');
  }, [navigation]);

  const handleLiveScanning = useCallback(() => {
    if (selectedEvent) {
      navigation.navigate('LiveScanning', { eventId: selectedEvent.id, eventTitle: selectedEvent.title });
    }
  }, [navigation, selectedEvent]);

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
          <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.emerald} />
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
                  <View style={[styles.statIconContainer, { backgroundColor: colors.emerald + '20' }]}>
                    <Ionicons name="scan-outline" size={24} color={colors.emerald} />
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
                  <Ionicons name="scan" size={48} color={colors.emeraldForeground} />
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Scanner Attivi</Text>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManageOperators}
              data-testid="button-manage-operators"
            >
              <Ionicons name="settings-outline" size={16} color={colors.emerald} />
              <Text style={styles.manageButtonText}>Gestisci</Text>
            </TouchableOpacity>
          </View>
          <Card style={styles.activeScannersCard}>
            <View style={styles.activeScannersRow}>
              <View style={styles.activeScannerStat}>
                <View style={[styles.onlineDot, { backgroundColor: colors.teal }]} />
                <Text style={[styles.activeScannersValue, { color: colors.teal }]}>
                  {activeScanners?.onlineCount || 0}
                </Text>
                <Text style={styles.activeScannersLabel}>Online</Text>
              </View>
              <View style={styles.activeScannerDivider} />
              <View style={styles.activeScannerStat}>
                <View style={[styles.onlineDot, { backgroundColor: colors.mutedForeground }]} />
                <Text style={styles.activeScannersValue}>
                  {activeScanners?.totalCount || 0}
                </Text>
                <Text style={styles.activeScannersLabel}>Totali</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attività Recente</Text>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleViewActivity}
              data-testid="button-view-activity"
            >
              <Text style={styles.manageButtonText}>Vedi Tutto</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.emerald} />
            </TouchableOpacity>
          </View>
          {(recentScans && recentScans.length > 0) ? (
            <View style={styles.recentScansContainer}>
              {recentScans.slice(0, 5).map((scan) => (
                <View key={scan.id} style={styles.recentScanItem}>
                  <View style={[
                    styles.recentScanIndicator,
                    { backgroundColor: scan.result === 'success' ? colors.teal : scan.result === 'duplicate' ? colors.warning : colors.destructive }
                  ]}>
                    <Ionicons
                      name={scan.result === 'success' ? 'checkmark' : scan.result === 'duplicate' ? 'alert' : 'close'}
                      size={12}
                      color={colors.foreground}
                    />
                  </View>
                  <View style={styles.recentScanInfo}>
                    <Text style={styles.recentScanHolder}>{scan.holderName}</Text>
                    <Text style={styles.recentScanCode}>{scan.ticketCode}</Text>
                  </View>
                  <Text style={styles.recentScanTime}>
                    {new Date(scan.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Card style={styles.noRecentScansCard}>
              <Ionicons name="scan-outline" size={32} color={colors.mutedForeground} />
              <Text style={styles.noRecentScansText}>Nessuna scansione recente</Text>
            </Card>
          )}
        </View>

        {!selectedEvent && !eventsLoading && events && events.length > 0 && (
          <Card style={styles.selectEventPrompt}>
            <Ionicons name="hand-left-outline" size={48} color={colors.emerald} />
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
    borderColor: colors.emerald,
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
    backgroundColor: colors.emerald,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  scanButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  scanButtonText: {
    color: colors.emeraldForeground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginTop: spacing.md,
  },
  scanButtonSubtext: {
    color: colors.emeraldForeground,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  manageButtonText: {
    color: colors.emerald,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  activeScannersCard: {
    padding: spacing.lg,
  },
  activeScannersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeScannerStat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  activeScannersValue: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  activeScannersLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  activeScannerDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  recentScansContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  recentScanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentScanIndicator: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentScanInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  recentScanHolder: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  recentScanCode: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
  },
  recentScanTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  noRecentScansCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  noRecentScansText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
});
