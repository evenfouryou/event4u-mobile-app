import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput, Share, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, typography, borderRadius, gradients } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { triggerHaptic } from '@/lib/haptics';

interface EventDetail {
  id: string;
  eventId: string;
  eventName: string;
  eventImageUrl: string | null;
  eventStart: string;
  locationName: string;
  prCode: string;
}

interface GuestList {
  id: string;
  name: string;
  listType: string;
  currentCount: number;
}

interface EventTable {
  id: string;
  name: string;
  capacity: number;
  isBooked: boolean;
}

interface TicketStats {
  sold: number;
  commission: number;
}

interface Reward {
  id: string;
  name: string;
  description: string | null;
  targetType: string;
  targetValue: number;
  rewardValue: number;
  progress: {
    currentValue: number;
    isCompleted: boolean;
    rewardClaimed: boolean;
  };
}

interface ActivityLog {
  id: string;
  activityType: string;
  entityData: string | null;
  reason: string | null;
  createdAt: string;
}

type TabType = 'liste' | 'biglietti' | 'storico' | 'premi';

interface PrEventDetailScreenProps {
  eventId: string;
  onGoBack: () => void;
}

export function PrEventDetailScreen({ eventId, onGoBack }: PrEventDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('liste');
  const [linkCopied, setLinkCopied] = useState(false);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [guestLists, setGuestLists] = useState<GuestList[]>([]);
  const [tables, setTables] = useState<EventTable[]>([]);
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      setEvent({
        id: eventId,
        eventId: 'evt-' + eventId,
        eventName: 'Saturday Night Fever',
        eventImageUrl: null,
        eventStart: new Date().toISOString(),
        locationName: 'Club Paradise',
        prCode: 'PR2024001',
      });
      setGuestLists([
        { id: '1', name: 'Lista VIP', listType: 'vip', currentCount: 25 },
        { id: '2', name: 'Lista Standard', listType: 'standard', currentCount: 45 },
      ]);
      setTables([
        { id: '1', name: 'T1', capacity: 6, isBooked: true },
        { id: '2', name: 'T2', capacity: 8, isBooked: true },
        { id: '3', name: 'T3', capacity: 4, isBooked: false },
        { id: '4', name: 'T4', capacity: 6, isBooked: false },
      ]);
      setTicketStats({ sold: 12, commission: 120 });
      setRewards([
        {
          id: '1',
          name: '10 Biglietti Venduti',
          description: 'Vendi 10 biglietti per questo evento',
          targetType: 'tickets_sold',
          targetValue: 10,
          rewardValue: 25,
          progress: { currentValue: 12, isCompleted: true, rewardClaimed: false },
        },
        {
          id: '2',
          name: '50 Ospiti in Lista',
          description: 'Aggiungi 50 ospiti alle liste',
          targetType: 'guests_added',
          targetValue: 50,
          rewardValue: 50,
          progress: { currentValue: 70, isCompleted: true, rewardClaimed: true },
        },
      ]);
      setActivityLogs([]);
    } catch (error) {
      console.error('Error loading event data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEventData();
    setRefreshing(false);
  };

  const prLink = useMemo(() => {
    if (!event) return '';
    return `https://manage.eventfouryou.com/e/${event.eventId}?pr=${event.prCode}`;
  }, [event]);

  const stats = useMemo(() => ({
    totalGuests: guestLists.reduce((acc, list) => acc + list.currentCount, 0),
    totalTables: tables.filter(t => t.isBooked).length,
    ticketsSold: ticketStats?.sold || 0,
    commission: ticketStats?.commission || 0,
  }), [guestLists, tables, ticketStats]);

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(prLink);
      setLinkCopied(true);
      triggerHaptic('success');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Acquista il tuo biglietto per ${event?.eventName}! ${prLink}`,
        url: prLink,
      });
      triggerHaptic('success');
    } catch (error) {
      handleCopyLink();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isToday = (dateString: string) => {
    const eventDate = new Date(dateString);
    return eventDate.toDateString() === new Date().toDateString();
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'liste', label: 'Liste', icon: 'list' },
    { id: 'biglietti', label: 'Biglietti', icon: 'ticket' },
    { id: 'storico', label: 'Storico', icon: 'time' },
    { id: 'premi', label: 'Premi', icon: 'trophy' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Hero Section */}
        <LinearGradient
          colors={gradients.cardPurple}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onGoBack();
            }}
            style={styles.backButton}
            testID="button-back"
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>

          {event && isToday(event.eventStart) && (
            <Badge variant="golden" style={styles.todayBadge} testID="badge-today">
              OGGI
            </Badge>
          )}

          <View style={styles.heroContent}>
            <Text style={styles.eventName}>{event?.eventName}</Text>
            <View style={styles.eventDetails}>
              <View style={styles.eventDetail}>
                <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.eventDetailText}>{event ? formatDate(event.eventStart) : '-'}</Text>
              </View>
              <View style={styles.eventDetail}>
                <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.eventDetailText}>{event ? formatTime(event.eventStart) : '-'}</Text>
              </View>
              <View style={styles.eventDetail}>
                <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.eventDetailText}>{event?.locationName}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <LinearGradient colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']} style={styles.miniStat}>
            <Ionicons name="people" size={18} color="#8B5CF6" />
            <Text style={styles.miniStatValue}>{stats.totalGuests}</Text>
            <Text style={styles.miniStatLabel}>Ospiti</Text>
          </LinearGradient>
          <LinearGradient colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)']} style={styles.miniStat}>
            <Ionicons name="grid" size={18} color="#3B82F6" />
            <Text style={styles.miniStatValue}>{stats.totalTables}</Text>
            <Text style={styles.miniStatLabel}>Tavoli</Text>
          </LinearGradient>
          <LinearGradient colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']} style={styles.miniStat}>
            <Ionicons name="ticket" size={18} color="#10B981" />
            <Text style={styles.miniStatValue}>{stats.ticketsSold}</Text>
            <Text style={styles.miniStatLabel}>Biglietti</Text>
          </LinearGradient>
          <LinearGradient colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']} style={styles.miniStat}>
            <Ionicons name="trending-up" size={18} color="#F59E0B" />
            <Text style={styles.miniStatValue}>€{stats.commission}</Text>
            <Text style={styles.miniStatLabel}>Guadagno</Text>
          </LinearGradient>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map(tab => (
            <Pressable
              key={tab.id}
              onPress={() => {
                triggerHaptic('light');
                setActiveTab(tab.id);
              }}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              testID={`tab-${tab.id}`}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.id ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'liste' && (
            <View style={styles.listeTab}>
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person-add" size={20} color="#10B981" />
                  <Text style={styles.sectionTitle}>Liste Ospiti</Text>
                </View>
                {guestLists.map(list => (
                  <View key={list.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <Ionicons name="people" size={18} color="#10B981" />
                      <View>
                        <Text style={styles.listItemName}>{list.name}</Text>
                        <Text style={styles.listItemSub}>{list.currentCount} ospiti</Text>
                      </View>
                    </View>
                    <Badge variant="outline">{list.listType}</Badge>
                  </View>
                ))}
                <Button variant="outline" style={styles.addButton} testID="button-add-guest">
                  <Ionicons name="add" size={18} color={colors.foreground} />
                  <Text style={styles.addButtonText}>Aggiungi ospite</Text>
                </Button>
              </Card>

              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="grid" size={20} color="#3B82F6" />
                  <Text style={styles.sectionTitle}>Tavoli</Text>
                </View>
                <View style={styles.tablesGrid}>
                  {tables.map(table => (
                    <View
                      key={table.id}
                      style={[styles.tableItem, table.isBooked && styles.tableItemBooked]}
                    >
                      <Ionicons name="grid" size={20} color={table.isBooked ? '#10B981' : colors.mutedForeground} />
                      <Text style={styles.tableName}>{table.name}</Text>
                      <Text style={styles.tableCapacity}>{table.capacity} posti</Text>
                      {table.isBooked && (
                        <Badge variant="success" size="small">Prenotato</Badge>
                      )}
                    </View>
                  ))}
                </View>
              </Card>
            </View>
          )}

          {activeTab === 'biglietti' && (
            <View style={styles.bigliettiTab}>
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="link" size={20} color="#8B5CF6" />
                  <Text style={styles.sectionTitle}>Il tuo Link Personale</Text>
                </View>
                <Text style={styles.linkDescription}>Condividi per tracciare le tue vendite</Text>
                
                <View style={styles.linkContainer}>
                  <TextInput
                    value={prLink}
                    editable={false}
                    style={styles.linkInput}
                    testID="input-pr-link"
                  />
                  <Pressable
                    onPress={handleCopyLink}
                    style={styles.copyButton}
                    testID="button-copy-link"
                  >
                    <Ionicons
                      name={linkCopied ? 'checkmark' : 'copy'}
                      size={20}
                      color={linkCopied ? '#10B981' : colors.foreground}
                    />
                  </Pressable>
                </View>

                <View style={styles.linkActions}>
                  <Button variant="outline" style={styles.linkActionButton} onPress={handleCopyLink} testID="button-copy">
                    <Ionicons name="copy" size={18} color={colors.foreground} />
                    <Text style={styles.linkActionText}>Copia</Text>
                  </Button>
                  <Button variant="primary" style={styles.linkActionButton} onPress={handleShareLink} testID="button-share">
                    <Ionicons name="share-social" size={18} color={colors.primaryForeground} />
                    <Text style={[styles.linkActionText, { color: colors.primaryForeground }]}>Condividi</Text>
                  </Button>
                </View>

                <View style={styles.ticketStatsRow}>
                  <LinearGradient colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']} style={styles.ticketStat}>
                    <Text style={styles.ticketStatValue}>{ticketStats?.sold || 0}</Text>
                    <Text style={styles.ticketStatLabel}>Venduti</Text>
                  </LinearGradient>
                  <LinearGradient colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']} style={styles.ticketStat}>
                    <Text style={styles.ticketStatValue}>€{ticketStats?.commission || 0}</Text>
                    <Text style={styles.ticketStatLabel}>Commissione</Text>
                  </LinearGradient>
                </View>
              </Card>
            </View>
          )}

          {activeTab === 'storico' && (
            <View style={styles.storicoTab}>
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time" size={20} color="#F59E0B" />
                  <Text style={styles.sectionTitle}>Storico Cancellazioni</Text>
                </View>
                {activityLogs.length > 0 ? (
                  activityLogs.map(log => (
                    <View key={log.id} style={styles.logItem}>
                      <Ionicons name="close-circle" size={18} color={colors.destructive} />
                      <Text style={styles.logText}>{log.reason || 'Cancellazione'}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyLogs}>
                    <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                    <Text style={styles.emptyLogsTitle}>Nessuna cancellazione</Text>
                    <Text style={styles.emptyLogsText}>Tutto in ordine!</Text>
                  </View>
                )}
              </Card>
            </View>
          )}

          {activeTab === 'premi' && (
            <View style={styles.premiTab}>
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="trophy" size={20} color="#F59E0B" />
                  <Text style={styles.sectionTitle}>Obiettivi & Premi</Text>
                </View>
                <Text style={styles.premiDescription}>Raggiungi gli obiettivi per sbloccare bonus</Text>

                {rewards.map(reward => {
                  const percentage = Math.min((reward.progress.currentValue / reward.targetValue) * 100, 100);
                  return (
                    <View
                      key={reward.id}
                      style={[styles.rewardItem, reward.progress.isCompleted && styles.rewardItemCompleted]}
                    >
                      <View style={styles.rewardHeader}>
                        <View style={styles.rewardInfo}>
                          <View style={[styles.rewardIcon, reward.progress.isCompleted ? styles.rewardIconCompleted : styles.rewardIconPending]}>
                            <Ionicons
                              name={reward.progress.isCompleted ? 'checkmark-circle' : 'flag'}
                              size={20}
                              color={reward.progress.isCompleted ? '#10B981' : '#F59E0B'}
                            />
                          </View>
                          <View>
                            <Text style={styles.rewardName}>{reward.name}</Text>
                            {reward.description && (
                              <Text style={styles.rewardDescription}>{reward.description}</Text>
                            )}
                          </View>
                        </View>
                        <Badge variant={reward.progress.isCompleted ? 'success' : 'muted'}>
                          +€{reward.rewardValue}
                        </Badge>
                      </View>

                      <View style={styles.progressContainer}>
                        <View style={styles.progressHeader}>
                          <Text style={styles.progressLabel}>
                            {reward.targetType === 'tickets_sold' && 'Biglietti venduti'}
                            {reward.targetType === 'guests_added' && 'Ospiti in lista'}
                          </Text>
                          <Text style={styles.progressValue}>
                            {reward.progress.currentValue} / {reward.targetValue}
                          </Text>
                        </View>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${percentage}%` },
                              reward.progress.isCompleted && styles.progressFillCompleted,
                            ]}
                          />
                        </View>
                      </View>

                      {reward.progress.isCompleted && !reward.progress.rewardClaimed && (
                        <Button variant="primary" style={styles.claimButton} testID={`button-claim-${reward.id}`}>
                          <Ionicons name="gift" size={18} color={colors.primaryForeground} />
                          <Text style={styles.claimButtonText}>Riscuoti Premio</Text>
                        </Button>
                      )}

                      {reward.progress.rewardClaimed && (
                        <View style={styles.claimedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                          <Text style={styles.claimedText}>Premio già riscosso</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </Card>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
    paddingBottom: spacing.xxl,
  },
  hero: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    minHeight: 200,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  heroContent: {
    marginTop: spacing.xl,
  },
  eventName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: spacing.md,
  },
  eventDetails: {
    gap: spacing.sm,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventDetailText: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: -spacing.lg,
    gap: spacing.xs,
  },
  miniStat: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  miniStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.foreground,
    marginTop: spacing.xs,
  },
  miniStatLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginHorizontal: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.background,
  },
  tabLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    fontWeight: '500',
    display: 'none',
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabContent: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  listeTab: {
    gap: spacing.md,
  },
  sectionCard: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  listItemName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  listItemSub: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  addButtonText: {
    color: colors.foreground,
    fontWeight: '500',
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tableItem: {
    width: '23%',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    gap: spacing.xs,
  },
  tableItemBooked: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  tableName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  tableCapacity: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  bigliettiTab: {},
  linkDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  linkInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: spacing.sm,
  },
  linkActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  linkActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  linkActionText: {
    fontWeight: '500',
    color: colors.foreground,
  },
  ticketStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ticketStat: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  ticketStatValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
  },
  ticketStatLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  storicoTab: {},
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  logText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  emptyLogs: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyLogsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    marginTop: spacing.md,
  },
  emptyLogsText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  premiTab: {},
  premiDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  rewardItem: {
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  rewardItemCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    flex: 1,
  },
  rewardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIconCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  rewardIconPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  rewardName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  rewardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  progressValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  progressFillCompleted: {
    backgroundColor: '#10B981',
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  claimButtonText: {
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  claimedText: {
    fontSize: typography.fontSize.sm,
    color: '#10B981',
  },
});
