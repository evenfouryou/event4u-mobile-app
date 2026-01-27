import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { AdminEventDetail } from '@/lib/api';

type TabType = 'overview' | 'tickets' | 'tables' | 'staff' | 'stats';

interface AdminEventDetailScreenProps {
  eventId: string;
  onBack: () => void;
}

export function AdminEventDetailScreen({ eventId, onBack }: AdminEventDetailScreenProps) {
  const { colors } = useTheme();
  const [event, setEvent] = useState<AdminEventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEventDetail();
  }, [eventId]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadEventDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getAdminEventDetail(eventId);
      setEvent(data);
    } catch (err) {
      console.error('Error loading event detail:', err);
      setError('Impossibile caricare i dettagli dell\'evento');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEventDetail();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attivo</Badge>;
      case 'upcoming':
        return <Badge variant="default">In arrivo</Badge>;
      case 'completed':
        return <Badge variant="secondary">Concluso</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annullato</Badge>;
      case 'draft':
        return <Badge variant="outline">Bozza</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const tabs: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'overview', label: 'Panoramica', icon: 'home-outline' },
    { id: 'tickets', label: 'Biglietti', icon: 'ticket-outline' },
    { id: 'tables', label: 'Tavoli', icon: 'grid-outline' },
    { id: 'staff', label: 'Staff', icon: 'people-outline' },
    { id: 'stats', label: 'Statistiche', icon: 'stats-chart-outline' },
  ];

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="ticket" size={24} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue}>{event?.ticketsSold || 0}</Text>
          <Text style={styles.statLabel}>Biglietti Venduti</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
            <Ionicons name="grid" size={24} color={staticColors.teal} />
          </View>
          <Text style={styles.statValue}>{event?.tablesBooked || 0}/{event?.tablesTotal || 0}</Text>
          <Text style={styles.statLabel}>Tavoli Prenotati</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
            <Ionicons name="cash" size={24} color={staticColors.golden} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(event?.revenue || 0)}</Text>
          <Text style={styles.statLabel}>Fatturato</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.accent}` }]}>
            <Ionicons name="people" size={24} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue}>{event?.staffCount || 0}</Text>
          <Text style={styles.statLabel}>Staff</Text>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informazioni Evento</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Gestore</Text>
            <Text style={styles.detailValue}>{event?.gestoreName || '-'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{event?.locationName || '-'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Inizio</Text>
            <Text style={styles.detailValue}>
              {event?.startDate ? formatDateTime(event.startDate) : '-'}
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Fine</Text>
            <Text style={styles.detailValue}>
              {event?.endDate ? formatDateTime(event.endDate) : '-'}
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Capienza</Text>
            <Text style={styles.detailValue}>{event?.capacity || '-'}</Text>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stato</Text>
        <Card style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{event?.name || 'Evento'}</Text>
            {event?.status && getStatusBadge(event.status)}
          </View>
          {event?.createdAt && (
            <Text style={styles.planExpiry}>
              Creato: {formatDate(event.createdAt)}
            </Text>
          )}
        </Card>
      </View>
    </View>
  );

  const renderTickets = () => (
    <View style={styles.tabContent}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Riepilogo Biglietti</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{event?.ticketsSold || 0}</Text>
            <Text style={styles.summaryLabel}>Venduti</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{event?.ticketsAvailable || 0}</Text>
            <Text style={styles.summaryLabel}>Disponibili</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{formatCurrency(event?.ticketRevenue || 0)}</Text>
            <Text style={styles.summaryLabel}>Incasso</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Tipologie Biglietti</Text>
      {event?.ticketTypes && event.ticketTypes.length > 0 ? (
        event.ticketTypes.map((ticket) => (
          <Card key={ticket.id} style={styles.itemCard} testID={`ticket-type-${ticket.id}`}>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{ticket.name}</Text>
                <Text style={styles.itemSubtitle}>{formatCurrency(ticket.price)}</Text>
              </View>
              <Badge variant="outline">{ticket.sold}/{ticket.capacity}</Badge>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min((ticket.sold / ticket.capacity) * 100, 100)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{Math.round((ticket.sold / ticket.capacity) * 100)}%</Text>
            </View>
          </Card>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="ticket-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun biglietto configurato</Text>
        </Card>
      )}
    </View>
  );

  const renderTables = () => (
    <View style={styles.tabContent}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Riepilogo Tavoli</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{event?.tablesTotal || 0}</Text>
            <Text style={styles.summaryLabel}>Totale</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{event?.tablesBooked || 0}</Text>
            <Text style={styles.summaryLabel}>Prenotati</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{formatCurrency(event?.tablesRevenue || 0)}</Text>
            <Text style={styles.summaryLabel}>Incasso</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Lista Tavoli</Text>
      {event?.tables && event.tables.length > 0 ? (
        event.tables.map((table) => (
          <Card key={table.id} style={styles.itemCard} testID={`table-${table.id}`}>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{table.name}</Text>
                <View style={styles.tableMeta}>
                  <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.tableMetaText}>{table.capacity} posti</Text>
                </View>
              </View>
              <Badge variant={table.status === 'booked' ? 'success' : 'outline'}>
                {table.status === 'booked' ? 'Prenotato' : 'Libero'}
              </Badge>
            </View>
            {table.bookedBy && (
              <View style={styles.tableBooking}>
                <Ionicons name="person-outline" size={14} color={staticColors.primary} />
                <Text style={styles.tableBookingText}>{table.bookedBy}</Text>
              </View>
            )}
          </Card>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="grid-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun tavolo configurato</Text>
        </Card>
      )}
    </View>
  );

  const renderStaff = () => (
    <View style={styles.tabContent}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Riepilogo Staff</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{event?.staffCount || 0}</Text>
            <Text style={styles.summaryLabel}>Totale</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{event?.scannersCount || 0}</Text>
            <Text style={styles.summaryLabel}>Scanner</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{event?.prCount || 0}</Text>
            <Text style={styles.summaryLabel}>PR</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Staff Assegnato</Text>
      {event?.staff && event.staff.length > 0 ? (
        event.staff.map((member) => (
          <Card key={member.id} style={styles.staffCard} testID={`staff-${member.id}`}>
            <View style={styles.staffContent}>
              <Avatar name={member.name} size="md" testID={`avatar-staff-${member.id}`} />
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{member.name}</Text>
                <Text style={styles.staffEmail}>{member.email || member.phone || '-'}</Text>
              </View>
              <View style={styles.staffActions}>
                <Badge variant={member.role === 'scanner' ? 'default' : 'secondary'}>
                  {member.role === 'scanner' ? 'Scanner' : member.role === 'pr' ? 'PR' : member.role}
                </Badge>
                <Badge variant={member.status === 'active' ? 'success' : 'outline'}>
                  {member.status === 'active' ? 'Attivo' : member.status}
                </Badge>
              </View>
            </View>
          </Card>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun membro dello staff</Text>
        </Card>
      )}
    </View>
  );

  const renderStats = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="cash" size={24} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(event?.revenue || 0)}</Text>
          <Text style={styles.statLabel}>Fatturato Totale</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
            <Ionicons name="ticket" size={24} color={staticColors.teal} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(event?.ticketRevenue || 0)}</Text>
          <Text style={styles.statLabel}>Incasso Biglietti</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
            <Ionicons name="grid" size={24} color={staticColors.golden} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(event?.tablesRevenue || 0)}</Text>
          <Text style={styles.statLabel}>Incasso Tavoli</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.accent}` }]}>
            <Ionicons name="restaurant" size={24} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(event?.consumptionRevenue || 0)}</Text>
          <Text style={styles.statLabel}>Consumazioni</Text>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dettaglio Economico</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="trending-up-outline" size={20} color={staticColors.teal} />
            <Text style={styles.detailLabel}>Fatturato</Text>
            <Text style={[styles.detailValue, { color: staticColors.teal }]}>
              {formatCurrency(event?.revenue || 0)}
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="trending-down-outline" size={20} color={staticColors.destructive} />
            <Text style={styles.detailLabel}>Spese</Text>
            <Text style={[styles.detailValue, { color: staticColors.destructive }]}>
              -{formatCurrency(event?.expenses || 0)}
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="wallet-outline" size={20} color={staticColors.golden} />
            <Text style={styles.detailLabel}>Profitto</Text>
            <Text style={[styles.detailValue, { color: staticColors.golden, fontWeight: '700' }]}>
              {formatCurrency(event?.profit || 0)}
            </Text>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Riepilogo Partecipanti</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="ticket-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Biglietti Venduti</Text>
            <Text style={styles.detailValue}>{event?.ticketsSold || 0}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Check-in</Text>
            <Text style={styles.detailValue}>{event?.checkedIn || 0}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="list-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>In Lista</Text>
            <Text style={styles.detailValue}>{event?.guestsCount || 0}</Text>
          </View>
        </Card>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'tickets':
        return renderTickets();
      case 'tables':
        return renderTables();
      case 'staff':
        return renderStaff();
      case 'stats':
        return renderStats();
      default:
        return null;
    }
  };

  if (showLoader) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-event-detail" />
        <Loading text="Caricamento evento..." />
      </SafeArea>
    );
  }

  if (error || !event) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-event-detail" />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>{error || 'Evento non trovato'}</Text>
          <Pressable onPress={loadEventDetail} testID="button-retry">
            <Text style={styles.retryText}>Riprova</Text>
          </Pressable>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-event-detail" />

      <View style={styles.eventHeader}>
        <View style={styles.eventHeaderContent}>
          <View style={styles.eventIcon}>
            <Ionicons name="calendar" size={28} color={staticColors.primary} />
          </View>
          <View style={styles.eventHeaderInfo}>
            <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
            <Text style={styles.eventLocation}>{event.locationName || '-'}</Text>
            {event.startDate && (
              <Text style={styles.eventDate}>{formatDateTime(event.startDate)}</Text>
            )}
          </View>
          {getStatusBadge(event.status)}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab(tab.id);
            }}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            testID={`tab-${tab.id}`}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.id ? staticColors.primaryForeground : staticColors.mutedForeground}
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

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
        {renderTabContent()}
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  eventHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  eventHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventHeaderInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  eventLocation: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  eventDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    gap: spacing.xs,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  tabContent: {
    gap: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  detailsCard: {
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  detailDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.sm,
  },
  planCard: {
    padding: spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    flex: 1,
    marginRight: spacing.sm,
  },
  planExpiry: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  summaryCard: {
    padding: spacing.md,
  },
  summaryTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: staticColors.border,
  },
  itemCard: {
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  itemSubtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: staticColors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: staticColors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.foreground,
    width: 40,
    textAlign: 'right',
  },
  tableMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  tableMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  tableBooking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  tableBookingText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
  },
  staffCard: {
    padding: spacing.md,
  },
  staffContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  staffEmail: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  staffActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
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
  retryText: {
    fontSize: typography.fontSize.base,
    color: staticColors.primary,
    fontWeight: '600',
    marginTop: spacing.md,
  },
});

export default AdminEventDetailScreen;
