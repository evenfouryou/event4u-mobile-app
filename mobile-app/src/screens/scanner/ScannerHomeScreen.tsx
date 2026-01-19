import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
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

  const contentMaxWidth = isTablet ? 900 : undefined;
  const statsColumns = isTablet || isLandscape ? 4 : 2;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Scanner" testID="header-scanner" />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { maxWidth: contentMaxWidth, alignSelf: contentMaxWidth ? 'center' : undefined, width: contentMaxWidth ? '100%' : undefined }
        ]}
        showsVerticalScrollIndicator={false}
        testID="scrollview-scanner-home"
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.emerald} testID="refresh-scanner-home" />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle} testID="text-section-events">Seleziona Evento</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventsScroll} testID="scrollview-events">
            {(events || []).map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventCard,
                  selectedEvent?.id === event.id && styles.eventCardSelected,
                ]}
                onPress={() => handleEventSelect(event)}
                testID={`button-event-${event.id}`}
              >
                <Text style={styles.eventTitle} numberOfLines={1} testID={`text-event-title-${event.id}`}>{event.title}</Text>
                <View style={styles.eventDetails}>
                  <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.eventDate} testID={`text-event-date-${event.id}`}>{event.date}</Text>
                </View>
                <View style={styles.eventDetails}>
                  <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.eventDate} testID={`text-event-time-${event.id}`}>{event.time}</Text>
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
                  <View key={i} style={styles.skeletonEventCard} testID={`skeleton-event-${i}`} />
                ))}
              </View>
            )}
            {!eventsLoading && (!events || events.length === 0) && (
              <Card style={styles.noEventsCard} testID="card-no-events">
                <Ionicons name="calendar-outline" size={32} color={colors.mutedForeground} />
                <Text style={styles.noEventsText} testID="text-no-events">Nessun evento disponibile</Text>
              </Card>
            )}
          </ScrollView>
        </View>

        {selectedEvent && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle} testID="text-section-stats">Statistiche Oggi</Text>
              <View style={[styles.statsGrid, { flexDirection: 'row', flexWrap: 'wrap' }]}>
                <Card style={[styles.statCard, { minWidth: `${100 / statsColumns - 2}%` }]} testID="card-stat-scans">
                  <View style={[styles.statIconContainer, { backgroundColor: colors.emerald + '20' }]}>
                    <Ionicons name="scan-outline" size={24} color={colors.emerald} />
                  </View>
                  <Text style={styles.statValue} testID="text-stat-total">{todayStats.totalScans}</Text>
                  <Text style={styles.statLabel}>Scansioni</Text>
                </Card>
                
                <Card style={[styles.statCard, { minWidth: `${100 / statsColumns - 2}%` }]} testID="card-stat-valid">
                  <View style={[styles.statIconContainer, { backgroundColor: colors.success + '20' }]}>
                    <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.success }]} testID="text-stat-valid">{todayStats.validScans}</Text>
                  <Text style={styles.statLabel}>Validi</Text>
                </Card>
                
                <Card style={[styles.statCard, { minWidth: `${100 / statsColumns - 2}%` }]} testID="card-stat-invalid">
                  <View style={[styles.statIconContainer, { backgroundColor: colors.destructive + '20' }]}>
                    <Ionicons name="close-circle-outline" size={24} color={colors.destructive} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.destructive }]} testID="text-stat-invalid">{todayStats.invalidScans}</Text>
                  <Text style={styles.statLabel}>Errori</Text>
                </Card>
                
                <Card style={[styles.statCard, { minWidth: `${100 / statsColumns - 2}%` }]} testID="card-stat-duplicate">
                  <View style={[styles.statIconContainer, { backgroundColor: colors.warning + '20' }]}>
                    <Ionicons name="copy-outline" size={24} color={colors.warning} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.warning }]} testID="text-stat-duplicate">{todayStats.duplicateScans}</Text>
                  <Text style={styles.statLabel}>Duplicati</Text>
                </Card>
              </View>
            </View>

            <View style={[styles.section, isLandscape && styles.sectionLandscape]}>
              <TouchableOpacity
                style={[styles.scanButton, isLandscape && { maxWidth: 400, alignSelf: 'center', width: '100%' }]}
                onPress={handleScan}
                activeOpacity={0.8}
                testID="button-scan"
              >
                <View style={styles.scanButtonInner}>
                  <Ionicons name="scan" size={48} color={colors.emeraldForeground} />
                  <Text style={styles.scanButtonText}>Scansiona</Text>
                  <Text style={styles.scanButtonSubtext}>Tocca per avviare la scansione</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={[styles.actionsRow, isTablet && { maxWidth: 500, alignSelf: 'center', width: '100%' }]}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleViewHistory}
                testID="button-history"
              >
                <Ionicons name="time-outline" size={24} color={colors.foreground} />
                <Text style={styles.actionButtonText}>Storico</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleViewStats}
                testID="button-stats"
              >
                <Ionicons name="stats-chart-outline" size={24} color={colors.foreground} />
                <Text style={styles.actionButtonText}>Statistiche</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={[styles.section, (isTablet || isLandscape) && styles.twoColumnSection]}>
          <View style={(isTablet || isLandscape) ? styles.halfColumn : undefined}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} testID="text-section-scanners">Scanner Attivi</Text>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={handleManageOperators}
                testID="button-manage-operators"
              >
                <Ionicons name="settings-outline" size={16} color={colors.emerald} />
                <Text style={styles.manageButtonText}>Gestisci</Text>
              </TouchableOpacity>
            </View>
            <Card style={styles.activeScannersCard} testID="card-active-scanners">
              <View style={styles.activeScannersRow}>
                <View style={styles.activeScannerStat}>
                  <View style={[styles.onlineDot, { backgroundColor: colors.teal }]} />
                  <Text style={[styles.activeScannersValue, { color: colors.teal }]} testID="text-scanners-online">
                    {activeScanners?.onlineCount || 0}
                  </Text>
                  <Text style={styles.activeScannersLabel}>Online</Text>
                </View>
                <View style={styles.activeScannerDivider} />
                <View style={styles.activeScannerStat}>
                  <View style={[styles.onlineDot, { backgroundColor: colors.mutedForeground }]} />
                  <Text style={styles.activeScannersValue} testID="text-scanners-total">
                    {activeScanners?.totalCount || 0}
                  </Text>
                  <Text style={styles.activeScannersLabel}>Totali</Text>
                </View>
              </View>
            </Card>
          </View>

          <View style={(isTablet || isLandscape) ? styles.halfColumn : { marginTop: spacing.xl }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} testID="text-section-activity">Attività Recente</Text>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={handleViewActivity}
                testID="button-view-activity"
              >
                <Text style={styles.manageButtonText}>Vedi Tutto</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.emerald} />
              </TouchableOpacity>
            </View>
            {(recentScans && recentScans.length > 0) ? (
              <View style={styles.recentScansContainer} testID="container-recent-scans">
                {recentScans.slice(0, 5).map((scan) => (
                  <View key={scan.id} style={styles.recentScanItem} testID={`item-scan-${scan.id}`}>
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
                      <Text style={styles.recentScanHolder} testID={`text-scan-holder-${scan.id}`}>{scan.holderName}</Text>
                      <Text style={styles.recentScanCode} testID={`text-scan-code-${scan.id}`}>{scan.ticketCode}</Text>
                    </View>
                    <Text style={styles.recentScanTime} testID={`text-scan-time-${scan.id}`}>
                      {new Date(scan.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Card style={styles.noRecentScansCard} testID="card-no-recent-scans">
                <Ionicons name="scan-outline" size={32} color={colors.mutedForeground} />
                <Text style={styles.noRecentScansText} testID="text-no-recent-scans">Nessuna scansione recente</Text>
              </Card>
            )}
          </View>
        </View>

        {!selectedEvent && !eventsLoading && events && events.length > 0 && (
          <Card style={[styles.selectEventPrompt, isTablet && { maxWidth: 500, alignSelf: 'center' }]} testID="card-select-event-prompt">
            <Ionicons name="hand-left-outline" size={48} color={colors.emerald} />
            <Text style={styles.promptTitle} testID="text-prompt-title">Seleziona un evento</Text>
            <Text style={styles.promptText} testID="text-prompt-description">
              Scegli l'evento per cui vuoi scansionare i biglietti
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLandscape: {
    alignItems: 'center',
  },
  twoColumnSection: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  halfColumn: {
    flex: 1,
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
    marginBottom: spacing.xl,
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
