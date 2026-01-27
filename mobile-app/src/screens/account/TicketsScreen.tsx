import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
// Note: uses staticColors for StyleSheet
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { triggerHaptic } from '@/lib/haptics';
import api, { Ticket as ApiTicket, TicketsResponse } from '@/lib/api';

type TabType = 'upcoming' | 'past' | 'cancelled';

interface TicketsScreenProps {
  onBack: () => void;
  onTicketPress: (ticketId: string) => void;
}

export function TicketsScreen({ onBack, onTicketPress }: TicketsScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ticketsData, setTicketsData] = useState<TicketsResponse>({ upcoming: [], past: [], cancelled: [], total: 0 });

  useEffect(() => {
    loadTickets();
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

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const data = await api.getMyTickets();
      setTicketsData(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const getFilteredTickets = (): ApiTicket[] => {
    switch (activeTab) {
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

  const tickets = getFilteredTickets();

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
        return <Badge variant="success">Valido</Badge>;
      case 'used':
        return <Badge variant="secondary">Usato</Badge>;
      case 'cancelled':
      case 'annullato':
        return <Badge variant="destructive">Annullato</Badge>;
      default:
        return <Badge variant="secondary">Scaduto</Badge>;
    }
  };

  const renderTicket = ({ item, index }: { item: ApiTicket; index: number }) => {
    const eventDate = item.eventStart ? new Date(item.eventStart) : null;
    const isValid = item.status === 'emitted' || item.status === 'active';
    
    return (
      <View>
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
      </View>
    );
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-tickets"
      />

      <View style={styles.tabs}>
        {(['upcoming', 'past', 'cancelled'] as TabType[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab(tab);
            }}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            testID={`tab-${tab}`}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
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
            name={activeTab === 'cancelled' ? 'close-circle-outline' : 'ticket-outline'}
            size={64}
            color={staticColors.mutedForeground}
          />
          <Text style={styles.emptyTitle}>
            {activeTab === 'upcoming'
              ? 'Nessun biglietto in programma'
              : activeTab === 'past'
              ? 'Nessun biglietto passato'
              : 'Nessun biglietto annullato'}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'upcoming'
              ? 'Esplora gli eventi e acquista i tuoi biglietti'
              : 'I biglietti appariranno qui dopo l\'evento'}
          </Text>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
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
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  tabTextActive: {
    color: staticColors.primaryForeground,
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
    justifyContent: 'space-between',
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
