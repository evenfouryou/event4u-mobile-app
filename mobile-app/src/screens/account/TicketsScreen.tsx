import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { triggerHaptic } from '@/lib/haptics';
import api, { Ticket as ApiTicket, TicketsResponse, MyReservation } from '@/lib/api';

type MainTabType = 'tickets' | 'lists';
type TicketTabType = 'upcoming' | 'past' | 'cancelled';
type ListTabType = 'upcoming' | 'past';

interface TicketsScreenProps {
  onBack: () => void;
  onTicketPress: (ticketId: string) => void;
}

export function TicketsScreen({ onBack, onTicketPress }: TicketsScreenProps) {
  const [mainTab, setMainTab] = useState<MainTabType>('tickets');
  const [ticketTab, setTicketTab] = useState<TicketTabType>('upcoming');
  const [listTab, setListTab] = useState<ListTabType>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ticketsData, setTicketsData] = useState<TicketsResponse>({ upcoming: [], past: [], cancelled: [], total: 0 });
  const [reservations, setReservations] = useState<MyReservation[]>([]);
  const [expandedQR, setExpandedQR] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ticketsRes, reservationsRes] = await Promise.all([
        api.getMyTickets().catch(() => ({ upcoming: [], past: [], cancelled: [], total: 0 })),
        api.getMyReservations().catch(() => [])
      ]);
      setTicketsData(ticketsRes);
      setReservations(reservationsRes);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getFilteredTickets = (): ApiTicket[] => {
    switch (ticketTab) {
      case 'upcoming':
        return ticketsData.upcoming || [];
      case 'past':
        return ticketsData.past || [];
      case 'cancelled':
        return ticketsData.cancelled || [];
      default:
        return [];
    }
  };

  const getFilteredReservations = (): MyReservation[] => {
    const now = new Date();
    if (listTab === 'upcoming') {
      return reservations.filter(r => {
        if (!r.eventDate) return true;
        return new Date(r.eventDate) >= now;
      });
    } else {
      return reservations.filter(r => {
        if (!r.eventDate) return false;
        return new Date(r.eventDate) < now;
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'emitted':
      case 'active':
      case 'confirmed':
        return <Badge variant="success">Valido</Badge>;
      case 'used':
      case 'arrived':
      case 'checked_in':
        return <Badge variant="secondary">Usato</Badge>;
      case 'cancelled':
      case 'annullato':
        return <Badge variant="destructive">Annullato</Badge>;
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      default:
        return <Badge variant="secondary">{status || 'N/A'}</Badge>;
    }
  };

  const renderTicket = ({ item }: { item: ApiTicket }) => {
    const eventDate = item.eventStart ? new Date(item.eventStart) : null;
    const isValid = item.status === 'emitted' || item.status === 'active';
    
    return (
      <Pressable
        onPress={() => {
          triggerHaptic('light');
          onTicketPress(item.id);
        }}
      >
        <Card style={styles.ticketCard} testID={`ticket-${item.id}`}>
          <View style={styles.ticketHeader}>
            <View style={styles.ticketDateBadge}>
              <Text style={styles.ticketDateDay}>
                {eventDate ? eventDate.getDate() : '-'}
              </Text>
              <Text style={styles.ticketDateMonth}>
                {eventDate ? eventDate.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase() : '-'}
              </Text>
            </View>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketEventName} numberOfLines={1}>
                {item.eventName || 'Evento'}
              </Text>
              <View style={styles.ticketMeta}>
                <Ionicons name="location-outline" size={14} color={staticColors.mutedForeground} />
                <Text style={styles.ticketMetaText} numberOfLines={1}>
                  {item.locationName || '-'}
                </Text>
              </View>
              <View style={styles.ticketMeta}>
                <Ionicons name="time-outline" size={14} color={staticColors.mutedForeground} />
                <Text style={styles.ticketMetaText}>{formatTime(item.eventStart)}</Text>
              </View>
            </View>
            <View style={styles.ticketActions}>
              {getStatusBadge(item.status)}
              <Ionicons name="chevron-forward" size={20} color={staticColors.mutedForeground} />
            </View>
          </View>

          <View style={styles.ticketDivider} />

          <View style={styles.ticketFooter}>
            <View style={styles.ticketDetail}>
              <Text style={styles.ticketDetailLabel}>Tipologia</Text>
              <Text style={styles.ticketDetailValue}>{item.ticketType || '-'}</Text>
            </View>
            <View style={styles.ticketDetail}>
              <Text style={styles.ticketDetailLabel}>Settore</Text>
              <Text style={styles.ticketDetailValue}>{item.sectorName || '-'}</Text>
            </View>
            <View style={styles.ticketDetail}>
              <Text style={styles.ticketDetailLabel}>Codice</Text>
              <Text style={styles.ticketDetailValue}>{item.ticketCode?.slice(-6) || '-'}</Text>
            </View>
          </View>

          {isValid && (
            <View style={styles.qrHint}>
              <Ionicons name="qr-code-outline" size={16} color={staticColors.primary} />
              <Text style={styles.qrHintText}>Tocca per vedere il QR Code</Text>
            </View>
          )}
        </Card>
      </Pressable>
    );
  };

  const renderReservation = ({ item }: { item: MyReservation }) => {
    const eventDate = item.eventDate ? new Date(item.eventDate) : null;
    const isValid = item.status === 'confirmed' || item.status === 'pending';
    const isExpanded = expandedQR === item.id;
    const qrUrl = item.qrCode 
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(item.qrCode)}&bgcolor=FFFFFF&color=000000`
      : null;
    
    return (
      <Pressable
        onPress={() => {
          triggerHaptic('light');
          if (qrUrl) {
            setExpandedQR(isExpanded ? null : item.id);
          }
        }}
      >
        <Card style={styles.ticketCard} testID={`reservation-${item.id}`}>
          <View style={styles.ticketHeader}>
            <View style={[styles.ticketDateBadge, { backgroundColor: `${staticColors.teal}15` }]}>
              <Text style={[styles.ticketDateDay, { color: staticColors.teal }]}>
                {eventDate ? eventDate.getDate() : '-'}
              </Text>
              <Text style={[styles.ticketDateMonth, { color: staticColors.teal }]}>
                {eventDate ? eventDate.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase() : '-'}
              </Text>
            </View>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketEventName} numberOfLines={1}>
                {item.eventName}
              </Text>
              <View style={styles.ticketMeta}>
                <Ionicons name="list-outline" size={14} color={staticColors.mutedForeground} />
                <Text style={styles.ticketMetaText} numberOfLines={1}>
                  {item.listName}
                </Text>
              </View>
              {item.locationName && (
                <View style={styles.ticketMeta}>
                  <Ionicons name="location-outline" size={14} color={staticColors.mutedForeground} />
                  <Text style={styles.ticketMetaText} numberOfLines={1}>
                    {item.locationName}
                  </Text>
                </View>
              )}
              <View style={styles.ticketMeta}>
                <Ionicons name="time-outline" size={14} color={staticColors.mutedForeground} />
                <Text style={styles.ticketMetaText}>{formatTime(item.eventDate)}</Text>
              </View>
            </View>
            <View style={styles.ticketActions}>
              {getStatusBadge(item.status)}
            </View>
          </View>

          <View style={styles.ticketDivider} />

          <View style={styles.ticketFooter}>
            <View style={styles.ticketDetail}>
              <Text style={styles.ticketDetailLabel}>Nome</Text>
              <Text style={styles.ticketDetailValue}>{item.firstName} {item.lastName}</Text>
            </View>
            <View style={styles.ticketDetail}>
              <Text style={styles.ticketDetailLabel}>Accompagnatori</Text>
              <Text style={styles.ticketDetailValue}>+{item.plusOnes}</Text>
            </View>
          </View>

          {isExpanded && qrUrl && (
            <View style={styles.qrSection}>
              <View style={styles.qrWrapper}>
                <Image
                  source={{ uri: qrUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                  testID="image-qr-code"
                />
              </View>
              <Text style={styles.qrCodeText}>{item.qrCode}</Text>
              <Text style={styles.qrInstructions}>Mostra questo QR Code all'ingresso</Text>
            </View>
          )}

          {isValid && qrUrl && !isExpanded && (
            <View style={styles.qrHint}>
              <Ionicons name="qr-code-outline" size={16} color={staticColors.teal} />
              <Text style={[styles.qrHintText, { color: staticColors.teal }]}>Tocca per vedere il QR Code</Text>
            </View>
          )}

          {!qrUrl && isValid && (
            <View style={styles.qrHint}>
              <Ionicons name="hourglass-outline" size={16} color={staticColors.mutedForeground} />
              <Text style={[styles.qrHintText, { color: staticColors.mutedForeground }]}>QR Code in elaborazione</Text>
            </View>
          )}
        </Card>
      </Pressable>
    );
  };

  const tickets = getFilteredTickets();
  const filteredReservations = getFilteredReservations();

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-tickets"
      />

      <View style={styles.mainTabs}>
        <Pressable
          onPress={() => {
            triggerHaptic('selection');
            setMainTab('tickets');
          }}
          style={[styles.mainTab, mainTab === 'tickets' && styles.mainTabActive]}
          testID="tab-main-tickets"
        >
          <Ionicons 
            name="ticket-outline" 
            size={20} 
            color={mainTab === 'tickets' ? staticColors.primary : staticColors.mutedForeground} 
          />
          <Text style={[styles.mainTabText, mainTab === 'tickets' && styles.mainTabTextActive]}>
            Biglietti
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            triggerHaptic('selection');
            setMainTab('lists');
          }}
          style={[styles.mainTab, mainTab === 'lists' && styles.mainTabActive]}
          testID="tab-main-lists"
        >
          <Ionicons 
            name="list-outline" 
            size={20} 
            color={mainTab === 'lists' ? staticColors.teal : staticColors.mutedForeground} 
          />
          <Text style={[styles.mainTabText, mainTab === 'lists' && styles.mainTabTextActiveList]}>
            Liste
          </Text>
        </Pressable>
      </View>

      {mainTab === 'tickets' ? (
        <>
          <View style={styles.tabs}>
            {(['upcoming', 'past', 'cancelled'] as TicketTabType[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => {
                  triggerHaptic('selection');
                  setTicketTab(tab);
                }}
                style={[styles.tab, ticketTab === tab && styles.tabActive]}
                testID={`tab-${tab}`}
              >
                <Text style={[styles.tabText, ticketTab === tab && styles.tabTextActive]}>
                  {tab === 'upcoming' ? 'Prossimi' : tab === 'past' ? 'Passati' : 'Annullati'}
                </Text>
              </Pressable>
            ))}
          </View>

          {showLoader ? (
            <Loading text="Caricamento biglietti..." />
          ) : tickets.length > 0 ? (
            <FlatList
              data={tickets}
              renderItem={renderTicket}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={staticColors.primary}
                />
              }
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name={ticketTab === 'cancelled' ? 'close-circle-outline' : 'ticket-outline'}
                size={64}
                color={staticColors.mutedForeground}
              />
              <Text style={styles.emptyTitle}>
                {ticketTab === 'upcoming'
                  ? 'Nessun biglietto in programma'
                  : ticketTab === 'past'
                  ? 'Nessun biglietto passato'
                  : 'Nessun biglietto annullato'}
              </Text>
              <Text style={styles.emptyText}>
                {ticketTab === 'upcoming'
                  ? 'Esplora gli eventi e acquista i tuoi biglietti'
                  : 'I biglietti appariranno qui dopo l\'evento'}
              </Text>
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.tabs}>
            {(['upcoming', 'past'] as ListTabType[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => {
                  triggerHaptic('selection');
                  setListTab(tab);
                }}
                style={[styles.tab, listTab === tab && styles.tabActiveList]}
                testID={`tab-list-${tab}`}
              >
                <Text style={[styles.tabText, listTab === tab && styles.tabTextActiveList]}>
                  {tab === 'upcoming' ? 'Prossime' : 'Passate'}
                </Text>
              </Pressable>
            ))}
          </View>

          {showLoader ? (
            <Loading text="Caricamento liste..." />
          ) : filteredReservations.length > 0 ? (
            <FlatList
              data={filteredReservations}
              renderItem={renderReservation}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={staticColors.teal}
                />
              }
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="list-outline"
                size={64}
                color={staticColors.mutedForeground}
              />
              <Text style={styles.emptyTitle}>
                {listTab === 'upcoming'
                  ? 'Nessuna prenotazione attiva'
                  : 'Nessuna prenotazione passata'}
              </Text>
              <Text style={styles.emptyText}>
                Le tue prenotazioni in lista appariranno qui
              </Text>
            </View>
          )}
        </>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  mainTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: staticColors.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mainTabActive: {
    borderColor: staticColors.primary,
    backgroundColor: `${staticColors.primary}10`,
  },
  mainTabText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.mutedForeground,
  },
  mainTabTextActive: {
    color: staticColors.primary,
  },
  mainTabTextActiveList: {
    color: staticColors.teal,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: staticColors.primary,
  },
  tabActiveList: {
    backgroundColor: staticColors.teal,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  tabTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  tabTextActiveList: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  ticketCard: {
    padding: spacing.md,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  ticketDateBadge: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketDateDay: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  ticketDateMonth: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.primary,
    marginTop: -2,
  },
  ticketInfo: {
    flex: 1,
    gap: 4,
  },
  ticketEventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    flex: 1,
  },
  ticketActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ticketDetail: {
    alignItems: 'center',
  },
  ticketDetailLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: 2,
  },
  ticketDetailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  qrHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  qrHintText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    fontWeight: '500',
  },
  qrSection: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  qrCodeText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  qrInstructions: {
    fontSize: typography.fontSize.sm,
    color: staticColors.teal,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default TicketsScreen;
