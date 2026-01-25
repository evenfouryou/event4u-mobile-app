import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, RefreshControl, ActivityIndicator, Share, Clipboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows, gradients } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { triggerHaptic } from '@/lib/haptics';
import api, { 
  PrProfile, 
  PublicEvent, 
  GuestList, 
  EventTable, 
  TableBooking, 
  PrTicketStats, 
  PrReward, 
  PrActivityLog 
} from '@/lib/api';

interface PrEventDashboardScreenProps {
  eventId: string;
  onBack: () => void;
}

type TabType = 'liste' | 'biglietti' | 'cancellazioni' | 'premi';

export function PrEventDashboardScreen({ eventId, onBack }: PrEventDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [prProfile, setPrProfile] = useState<PrProfile | null>(null);
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [guestLists, setGuestLists] = useState<GuestList[]>([]);
  const [tables, setTables] = useState<EventTable[]>([]);
  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [ticketStats, setTicketStats] = useState<PrTicketStats>({ sold: 0, revenue: 0, commission: 0 });
  const [rewards, setRewards] = useState<PrReward[]>([]);
  const [activityLogs, setActivityLogs] = useState<PrActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('liste');
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        profileData,
        eventData,
        listsData,
        tablesData,
        bookingsData,
        statsData,
        rewardsData,
        logsData,
      ] = await Promise.all([
        api.getPrProfile().catch(() => null),
        api.getPrEventById(eventId).catch(() => null),
        api.getPrEventGuestLists(eventId).catch(() => []),
        api.getPrEventTables(eventId).catch(() => []),
        api.getPrEventBookings(eventId).catch(() => []),
        api.getPrEventTicketStats(eventId).catch(() => ({ sold: 0, revenue: 0, commission: 0 })),
        api.getPrEventRewards(eventId).catch(() => []),
        api.getPrEventActivityLogs(eventId).catch(() => []),
      ]);
      setPrProfile(profileData);
      setEvent(eventData);
      setGuestLists(listsData);
      setTables(tablesData);
      setBookings(bookingsData);
      setTicketStats(statsData);
      setRewards(rewardsData);
      setActivityLogs(logsData);
    } catch (error) {
      console.error('Error loading event data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const prLink = useMemo(() => {
    if (!event || !prProfile?.prCode) return null;
    return `https://manage.eventfouryou.com/e/${event.id}?pr=${prProfile.prCode}`;
  }, [event, prProfile]);

  const stats = useMemo(() => ({
    totalGuests: guestLists.reduce((acc, list) => acc + (list.currentCount || 0), 0),
    totalTables: bookings.filter(b => b.status === 'confirmed' || b.status === 'approved').length,
    ticketsSold: ticketStats.sold,
    commissionEarned: ticketStats.commission,
  }), [guestLists, bookings, ticketStats]);

  const cancellations = useMemo(() => 
    activityLogs.filter(log => 
      log.activityType.includes('cancelled')
    ),
    [activityLogs]
  );

  const handleCopyLink = async () => {
    if (!prLink) return;
    try {
      await Clipboard.setString(prLink);
      setLinkCopied(true);
      triggerHaptic('light');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  const handleShareLink = async () => {
    if (!prLink || !event) return;
    triggerHaptic('medium');
    try {
      await Share.share({
        title: event.eventName,
        message: `Acquista il tuo biglietto per ${event.eventName}! ${prLink}`,
        url: prLink,
      });
    } catch (err) {
      handleCopyLink();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    return `${diffDays} giorni fa`;
  };

  const renderStatCard = (icon: keyof typeof Ionicons.glyphMap, value: string | number, label: string, color: string) => (
    <View style={[styles.statCard, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderListeTab = () => (
    <View style={styles.tabContent}>
      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <Ionicons name="list" size={18} color="#10b981" />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Liste & Tavoli</Text>
            <Text style={styles.sectionDescription}>Gestisci ospiti e prenotazioni</Text>
          </View>
        </View>

        <Pressable style={styles.actionButton} testID="button-manage-lists">
          <View style={styles.actionButtonContent}>
            <Ionicons name="person-add-outline" size={20} color="#10b981" />
            <Text style={styles.actionButtonText}>Aggiungi ospiti alle liste</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>

        <Pressable style={styles.actionButton} testID="button-manage-tables">
          <View style={styles.actionButtonContent}>
            <Ionicons name="grid-outline" size={20} color="#3b82f6" />
            <Text style={styles.actionButtonText}>Gestisci prenotazioni tavoli</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>
      </GlassCard>

      {guestLists.length > 0 && (
        <Card style={styles.sectionCard}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Le tue liste ({guestLists.length})</Text>
            <Badge variant="outline" size="sm">
              <Text style={styles.badgeText}>{stats.totalGuests} ospiti</Text>
            </Badge>
          </View>
          {guestLists.map(list => (
            <View key={list.id} style={styles.listItem}>
              <View style={[styles.listIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="list" size={18} color="#10b981" />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{list.name}</Text>
                <Text style={styles.listCount}>{list.currentCount || 0} ospiti</Text>
              </View>
              <Badge variant="outline" size="sm">
                <Text style={styles.badgeText}>{list.listType}</Text>
              </Badge>
            </View>
          ))}
        </Card>
      )}

      {tables.length > 0 && (
        <Card style={styles.sectionCard}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Tavoli ({tables.length})</Text>
            <Badge variant="outline" size="sm">
              <Text style={styles.badgeText}>{stats.totalTables} prenotati</Text>
            </Badge>
          </View>
          <View style={styles.tablesGrid}>
            {tables.slice(0, 6).map(table => {
              const isBooked = bookings.some(b => b.tableId === table.id && (b.status === 'confirmed' || b.status === 'approved'));
              return (
                <View key={table.id} style={[styles.tableItem, isBooked && styles.tableItemBooked]}>
                  <Ionicons name="grid" size={20} color={isBooked ? '#10b981' : colors.mutedForeground} />
                  <Text style={styles.tableName}>{table.name}</Text>
                  <Text style={styles.tableCapacity}>{table.capacity} posti</Text>
                  {isBooked && (
                    <View style={styles.tableBookedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                      <Text style={styles.tableBookedText}>Prenotato</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Card>
      )}
    </View>
  );

  const renderBigliettiTab = () => (
    <View style={styles.tabContent}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
        style={styles.linkCard}
      >
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
            <Ionicons name="link" size={18} color="#8b5cf6" />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Il tuo Link Personale</Text>
            <Text style={styles.sectionDescription}>Condividi per tracciare le vendite</Text>
          </View>
        </View>

        {prLink ? (
          <>
            <View style={styles.linkContainer}>
              <Text style={styles.linkText} numberOfLines={1}>{prLink}</Text>
              <Pressable
                onPress={handleCopyLink}
                style={styles.copyButton}
                testID="button-copy-link"
              >
                <Ionicons
                  name={linkCopied ? 'checkmark' : 'copy-outline'}
                  size={20}
                  color={linkCopied ? '#10b981' : colors.foreground}
                />
              </Pressable>
            </View>

            <View style={styles.linkButtons}>
              <Button
                variant="primary"
                onPress={handleShareLink}
                style={styles.shareButton}
                testID="button-share-link"
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="share-outline" size={18} color={colors.primaryForeground} />
                  <Text style={styles.buttonText}>Condividi</Text>
                </View>
              </Button>
            </View>

            <View style={styles.linkStats}>
              <View style={styles.linkStatItem}>
                <Text style={styles.linkStatValue}>{ticketStats.sold}</Text>
                <Text style={styles.linkStatLabel}>Biglietti venduti</Text>
              </View>
              <View style={styles.linkStatItem}>
                <Text style={[styles.linkStatValue, { color: colors.primary }]}>€{ticketStats.commission.toFixed(2)}</Text>
                <Text style={styles.linkStatLabel}>Commissione totale</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyLink}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.mutedForeground} />
            <Text style={styles.emptyLinkText}>Link non disponibile</Text>
          </View>
        )}
      </LinearGradient>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <Ionicons name="trending-up" size={18} color="#3b82f6" />
          </View>
          <Text style={styles.sectionTitle}>Storico Vendite</Text>
        </View>

        {stats.ticketsSold > 0 ? (
          <View style={styles.salesStats}>
            <View style={[styles.salesItem, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <View style={styles.salesIcon}>
                <Ionicons name="ticket" size={20} color="#10b981" />
              </View>
              <View style={styles.salesInfo}>
                <Text style={styles.salesLabel}>Biglietti venduti</Text>
                <Text style={styles.salesSubtext}>Tramite il tuo link</Text>
              </View>
              <Text style={[styles.salesValue, { color: '#10b981' }]}>{stats.ticketsSold}</Text>
            </View>
            <View style={[styles.salesItem, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
              <View style={styles.salesIcon}>
                <Ionicons name="cash" size={20} color={colors.primary} />
              </View>
              <View style={styles.salesInfo}>
                <Text style={styles.salesLabel}>Revenue generato</Text>
                <Text style={styles.salesSubtext}>Incasso totale</Text>
              </View>
              <Text style={[styles.salesValue, { color: colors.primary }]}>€{ticketStats.revenue.toFixed(2)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptySales}>
            <Ionicons name="ticket-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptySalesTitle}>Nessun biglietto venduto</Text>
            <Text style={styles.emptySalesText}>Condividi il tuo link per iniziare!</Text>
          </View>
        )}
      </Card>
    </View>
  );

  const renderCancellazioniTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
            <Ionicons name="time" size={18} color="#f59e0b" />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Storico Cancellazioni</Text>
            <Text style={styles.sectionDescription}>Tutte le cancellazioni e modifiche</Text>
          </View>
        </View>

        {cancellations.length > 0 ? (
          <View style={styles.cancellationsList}>
            {cancellations.map(log => {
              const data = log.entityData ? JSON.parse(log.entityData) : {};
              const getIcon = (): keyof typeof Ionicons.glyphMap => {
                if (log.activityType.includes('list')) return 'people';
                if (log.activityType.includes('table')) return 'grid';
                if (log.activityType.includes('ticket')) return 'ticket';
                return 'close-circle';
              };
              const getColor = () => {
                if (log.activityType.includes('list')) return '#ef4444';
                if (log.activityType.includes('table')) return '#f59e0b';
                if (log.activityType.includes('ticket')) return '#8b5cf6';
                return colors.mutedForeground;
              };
              const getLabel = () => {
                if (log.activityType.includes('list')) return 'Ospite rimosso dalla lista';
                if (log.activityType.includes('table')) return 'Prenotazione tavolo annullata';
                if (log.activityType.includes('ticket')) return 'Biglietto annullato';
                return 'Cancellazione';
              };

              return (
                <View key={log.id} style={[styles.cancellationItem, { borderLeftColor: getColor() }]}>
                  <View style={[styles.cancellationIcon, { backgroundColor: `${getColor()}15` }]}>
                    <Ionicons name={getIcon()} size={18} color={getColor()} />
                  </View>
                  <View style={styles.cancellationInfo}>
                    <Text style={styles.cancellationLabel}>{getLabel()}</Text>
                    {data.name && <Text style={styles.cancellationName}>{data.name}</Text>}
                    {log.reason && <Text style={styles.cancellationReason}>Motivo: {log.reason}</Text>}
                    <View style={styles.cancellationTime}>
                      <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                      <Text style={styles.cancellationTimeText}>{formatTimeAgo(log.createdAt)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCancellations}>
            <View style={styles.emptySuccessIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            </View>
            <Text style={styles.emptyCancellationsTitle}>Nessuna cancellazione</Text>
            <Text style={styles.emptyCancellationsText}>Tutto in ordine!</Text>
          </View>
        )}
      </Card>
    </View>
  );

  const renderPremiTab = () => (
    <View style={styles.tabContent}>
      <LinearGradient
        colors={['rgba(255, 215, 0, 0.1)', 'rgba(245, 158, 11, 0.05)']}
        style={styles.rewardsCard}
      >
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: 'rgba(255, 215, 0, 0.2)' }]}>
            <Ionicons name="trophy" size={18} color={colors.primary} />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Obiettivi & Premi</Text>
            <Text style={styles.sectionDescription}>Raggiungi gli obiettivi per sbloccare bonus</Text>
          </View>
        </View>

        {rewards.length > 0 ? (
          <View style={styles.rewardsList}>
            {rewards.map(reward => {
              const progress = reward.progress;
              const percentage = progress ? Math.min((progress.currentValue / progress.targetValue) * 100, 100) : 0;
              const isCompleted = progress?.isCompleted;

              return (
                <View key={reward.id} style={[styles.rewardItem, isCompleted && styles.rewardItemCompleted]}>
                  <View style={styles.rewardHeader}>
                    <View style={[styles.rewardIcon, isCompleted ? styles.rewardIconCompleted : undefined]}>
                      <Ionicons
                        name={isCompleted ? 'checkmark-circle' : 'flag'}
                        size={24}
                        color={isCompleted ? '#10b981' : colors.primary}
                      />
                    </View>
                    <View style={styles.rewardInfo}>
                      <Text style={styles.rewardName}>{reward.name}</Text>
                      {reward.description && (
                        <Text style={styles.rewardDescription}>{reward.description}</Text>
                      )}
                    </View>
                    <Badge variant={isCompleted ? 'success' : 'primary'} size="sm">
                      <Text style={styles.rewardBadgeText}>
                        {reward.rewardType === 'bonus_cash' && `+€${reward.rewardValue}`}
                        {reward.rewardType === 'percentage_bonus' && `+${reward.rewardValue}%`}
                        {reward.rewardType === 'gift' && 'Premio'}
                        {reward.rewardType === 'badge' && 'Badge'}
                      </Text>
                    </Badge>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressLabel}>
                        {reward.targetType === 'tickets_sold' && 'Biglietti venduti'}
                        {reward.targetType === 'guests_added' && 'Ospiti in lista'}
                        {reward.targetType === 'tables_booked' && 'Tavoli prenotati'}
                        {reward.targetType === 'revenue' && 'Revenue generato'}
                      </Text>
                      <Text style={styles.progressValue}>
                        {progress?.currentValue || 0} / {reward.targetValue}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${percentage}%` }]} />
                    </View>
                  </View>

                  {isCompleted && !progress?.rewardClaimed && (
                    <Button
                      variant="primary"
                      size="sm"
                      style={styles.claimButton}
                      testID={`button-claim-${reward.id}`}
                    >
                      <View style={styles.buttonContent}>
                        <Ionicons name="gift" size={16} color={colors.primaryForeground} />
                        <Text style={styles.claimButtonText}>Riscuoti Premio</Text>
                      </View>
                    </Button>
                  )}
                  {progress?.rewardClaimed && (
                    <View style={styles.claimedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.claimedText}>Premio già riscosso</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyRewards}>
            <Ionicons name="medal-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyRewardsTitle}>Nessun premio attivo</Text>
            <Text style={styles.emptyRewardsText}>Gli obiettivi saranno disponibili a breve</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento dashboard...</Text>
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton} testID="button-back">
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>Evento non trovato</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.mutedForeground} />
          <Text style={styles.errorTitle}>Evento non trovato</Text>
          <Text style={styles.errorText}>L'evento potrebbe essere stato rimosso.</Text>
          <Button variant="primary" onPress={onBack}>
            <Text style={styles.buttonText}>Torna agli eventi</Text>
          </Button>
        </View>
      </View>
    );
  }

  const eventIsToday = isToday(event.eventStart);

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroContainer}>
          {event.eventImageUrl ? (
            <Image source={{ uri: event.eventImageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={gradients.purple} style={styles.heroImage} />
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(10,14,23,0.95)']} style={styles.heroOverlay} />
          
          <View style={[styles.heroHeader, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable onPress={onBack} style={styles.heroBackButton} testID="button-back">
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </Pressable>
            <Pressable onPress={onRefresh} style={styles.heroRefreshButton} testID="button-refresh">
              <Ionicons name="refresh" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {eventIsToday && (
            <View style={styles.todayBadge}>
              <Ionicons name="sparkles" size={12} color={colors.primaryForeground} />
              <Text style={styles.todayBadgeText}>OGGI</Text>
            </View>
          )}

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{event.eventName}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.metaChip}>
                <Ionicons name="calendar" size={14} color={colors.foreground} />
                <Text style={styles.metaChipText}>{formatDate(event.eventStart)}</Text>
              </View>
              <View style={styles.metaChip}>
                <Ionicons name="time" size={14} color={colors.foreground} />
                <Text style={styles.metaChipText}>{formatTime(event.eventStart)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          {renderStatCard('people', stats.totalGuests, 'Ospiti', '#10b981')}
          {renderStatCard('grid', stats.totalTables, 'Tavoli', '#3b82f6')}
          {renderStatCard('ticket', stats.ticketsSold, 'Biglietti', '#8b5cf6')}
          {renderStatCard('cash', `€${stats.commissionEarned.toFixed(0)}`, 'Guadagno', colors.primary)}
        </View>

        <View style={styles.tabsContainer}>
          {(['liste', 'biglietti', 'cancellazioni', 'premi'] as TabType[]).map(tab => (
            <Pressable
              key={tab}
              onPress={() => {
                triggerHaptic('light');
                setActiveTab(tab);
              }}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              testID={`tab-${tab}`}
            >
              <Ionicons
                name={
                  tab === 'liste' ? 'list' :
                  tab === 'biglietti' ? 'ticket' :
                  tab === 'cancellazioni' ? 'time' : 'trophy'
                }
                size={18}
                color={activeTab === tab ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'liste' ? 'Liste' :
                 tab === 'biglietti' ? 'Biglietti' :
                 tab === 'cancellazioni' ? 'Storico' : 'Premi'}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'liste' && renderListeTab()}
        {activeTab === 'biglietti' && renderBigliettiTab()}
        {activeTab === 'cancellazioni' && renderCancellazioniTab()}
        {activeTab === 'premi' && renderPremiTab()}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.foreground,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  heroContainer: {
    height: 220,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  heroBackButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadge: {
    position: 'absolute',
    top: 80,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  todayBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  heroContent: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
  },
  heroTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  metaChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.primaryForeground,
  },
  tabContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionCard: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.foreground,
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  listCount: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tableItem: {
    width: '31%',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  tableItemBooked: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  tableName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    color: colors.foreground,
  },
  tableCapacity: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  tableBookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  tableBookedText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
  },
  linkCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    fontFamily: 'monospace',
  },
  copyButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkButtons: {
    marginBottom: spacing.md,
  },
  shareButton: {
    width: '100%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  linkStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  linkStatItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: borderRadius.lg,
  },
  linkStatValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: '#8b5cf6',
  },
  linkStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  emptyLink: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyLinkText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
  },
  salesStats: {
    gap: spacing.md,
  },
  salesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  salesIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  salesInfo: {
    flex: 1,
  },
  salesLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  salesSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  salesValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  emptySales: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptySalesTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  emptySalesText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  cancellationsList: {
    gap: spacing.md,
  },
  cancellationItem: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 3,
    gap: spacing.md,
  },
  cancellationIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancellationInfo: {
    flex: 1,
  },
  cancellationLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  cancellationName: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  cancellationReason: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  cancellationTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  cancellationTimeText: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  emptyCancellations: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptySuccessIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCancellationsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  emptyCancellationsText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  rewardsCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  rewardsList: {
    gap: spacing.md,
  },
  rewardItem: {
    padding: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rewardItemCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIconCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.foreground,
  },
  rewardDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  rewardBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.foreground,
  },
  progressContainer: {
    gap: spacing.xs,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  claimButton: {
    marginTop: spacing.md,
  },
  claimButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  claimedText: {
    fontSize: typography.fontSize.sm,
    color: '#10b981',
  },
  emptyRewards: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyRewardsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  emptyRewardsText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
});

export default PrEventDashboardScreen;
