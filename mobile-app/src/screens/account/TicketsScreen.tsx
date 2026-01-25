import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { triggerHaptic } from '@/lib/haptics';

type TabType = 'upcoming' | 'past' | 'cancelled';

interface Ticket {
  id: string;
  ticketCode: string;
  eventName: string;
  eventDate: Date;
  location: string;
  ticketType: string;
  sectorName: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  qrCode?: string;
}

interface TicketsScreenProps {
  onBack: () => void;
  onTicketPress: (ticketId: string) => void;
}

export function TicketsScreen({ onBack, onTicketPress }: TicketsScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [loading, setLoading] = useState(false);

  const mockTickets: Ticket[] = [
    {
      id: '1',
      ticketCode: 'EVT-2026-001234',
      eventName: 'Saturday Night Fever',
      eventDate: new Date('2026-02-01T23:00:00'),
      location: 'Club XYZ - Milano',
      ticketType: 'VIP',
      sectorName: 'Zona Privé',
      status: 'active',
    },
    {
      id: '2',
      ticketCode: 'EVT-2026-001235',
      eventName: 'DJ Set Special',
      eventDate: new Date('2026-02-08T22:00:00'),
      location: 'Disco Palace - Roma',
      ticketType: 'Standard',
      sectorName: 'Pista',
      status: 'active',
    },
    {
      id: '3',
      ticketCode: 'EVT-2026-001100',
      eventName: 'New Year Party',
      eventDate: new Date('2025-12-31T22:00:00'),
      location: 'Grand Hotel - Firenze',
      ticketType: 'Premium',
      sectorName: 'Tavolo',
      status: 'used',
    },
  ];

  const getFilteredTickets = () => {
    const now = new Date();
    switch (activeTab) {
      case 'upcoming':
        return mockTickets.filter(t => t.eventDate > now && t.status === 'active');
      case 'past':
        return mockTickets.filter(t => t.eventDate <= now || t.status === 'used');
      case 'cancelled':
        return mockTickets.filter(t => t.status === 'cancelled');
      default:
        return [];
    }
  };

  const tickets = getFilteredTickets();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Valido</Badge>;
      case 'used':
        return <Badge variant="secondary">Usato</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annullato</Badge>;
      case 'expired':
        return <Badge variant="secondary">Scaduto</Badge>;
    }
  };

  const renderTicket = ({ item, index }: { item: Ticket; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Pressable
        onPress={() => {
          triggerHaptic('light');
          onTicketPress(item.id);
        }}
      >
        <Card style={styles.ticketCard} testID={`ticket-${item.id}`}>
          <View style={styles.ticketHeader}>
            <View style={styles.ticketDateBadge}>
              <Text style={styles.ticketDateDay}>{item.eventDate.getDate()}</Text>
              <Text style={styles.ticketDateMonth}>
                {item.eventDate.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}
              </Text>
            </View>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketEventName} numberOfLines={1}>
                {item.eventName}
              </Text>
              <View style={styles.ticketMeta}>
                <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.ticketMetaText} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
              <View style={styles.ticketMeta}>
                <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.ticketMetaText}>{formatTime(item.eventDate)}</Text>
              </View>
            </View>
            <View style={styles.ticketActions}>
              {getStatusBadge(item.status)}
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </View>
          </View>

          <View style={styles.ticketDivider} />

          <View style={styles.ticketFooter}>
            <View style={styles.ticketDetail}>
              <Text style={styles.ticketDetailLabel}>Tipologia</Text>
              <Text style={styles.ticketDetailValue}>{item.ticketType}</Text>
            </View>
            <View style={styles.ticketDetail}>
              <Text style={styles.ticketDetailLabel}>Settore</Text>
              <Text style={styles.ticketDetailValue}>{item.sectorName}</Text>
            </View>
            <View style={styles.ticketDetail}>
              <Text style={styles.ticketDetailLabel}>Codice</Text>
              <Text style={styles.ticketDetailValue}>{item.ticketCode.slice(-6)}</Text>
            </View>
          </View>

          {item.status === 'active' && (
            <View style={styles.qrHint}>
              <Ionicons name="qr-code-outline" size={16} color={colors.primary} />
              <Text style={styles.qrHintText}>Tocca per vedere il QR Code</Text>
            </View>
          )}
        </Card>
      </Pressable>
    </Animated.View>
  );

  return (
    <SafeArea style={styles.container}>
      <Header
        title="I miei Biglietti"
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

      {loading ? (
        <Loading text="Caricamento biglietti..." />
      ) : tickets.length > 0 ? (
        <FlatList
          data={tickets}
          renderItem={renderTicket}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons
            name={activeTab === 'cancelled' ? 'close-circle-outline' : 'ticket-outline'}
            size={64}
            color={colors.mutedForeground}
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.secondary,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.primaryForeground,
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
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketDateDay: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  ticketDateMonth: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
    marginTop: -2,
  },
  ticketInfo: {
    flex: 1,
    gap: 4,
  },
  ticketEventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketMetaText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    flex: 1,
  },
  ticketActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: colors.border,
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
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  ticketDetailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  qrHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  qrHintText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
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
    color: colors.foreground,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default TicketsScreen;
