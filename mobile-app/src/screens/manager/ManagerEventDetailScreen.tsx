import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { ManagerEventDetail } from '@/lib/api';

type TabType = 'overview' | 'ticketing' | 'guests' | 'tables' | 'staff' | 'inventory' | 'finance';

interface ManagerEventDetailScreenProps {
  eventId: string;
  onBack: () => void;
}

export function ManagerEventDetailScreen({ eventId, onBack }: ManagerEventDetailScreenProps) {
  const { colors, gradients } = useTheme();
  const [event, setEvent] = useState<ManagerEventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

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
      const data = await api.getManagerEventDetail(eventId);
      setEvent(data);
    } catch (error) {
      console.error('Error loading event detail:', error);
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
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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
        return <Badge variant="default">Prossimo</Badge>;
      case 'past':
        return <Badge variant="secondary">Passato</Badge>;
      case 'draft':
        return <Badge variant="outline">Bozza</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const tabs: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'overview', label: 'Overview', icon: 'home-outline' },
    { id: 'ticketing', label: 'Biglietti', icon: 'ticket-outline' },
    { id: 'guests', label: 'Ospiti', icon: 'people-outline' },
    { id: 'tables', label: 'Tavoli', icon: 'grid-outline' },
    { id: 'staff', label: 'Staff', icon: 'person-outline' },
    { id: 'inventory', label: 'Inventario', icon: 'cube-outline' },
    { id: 'finance', label: 'Finanze', icon: 'cash-outline' },
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
            <Ionicons name="people" size={24} color={staticColors.teal} />
          </View>
          <Text style={styles.statValue}>{event?.guestsCount || 0}</Text>
          <Text style={styles.statLabel}>Ospiti in Lista</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
            <Ionicons name="cash" size={24} color={staticColors.golden} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(event?.revenue || 0)}</Text>
          <Text style={styles.statLabel}>Incasso Totale</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.purple}20` }]}>
            <Ionicons name="checkmark-circle" size={24} color={staticColors.purple} />
          </View>
          <Text style={styles.statValue}>{event?.checkedIn || 0}</Text>
          <Text style={styles.statLabel}>Check-in</Text>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dettagli Evento</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Data</Text>
            <Text style={styles.detailValue}>{event?.startDate ? formatDate(event.startDate) : '-'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Orario</Text>
            <Text style={styles.detailValue}>
              {event?.startDate ? formatTime(event.startDate) : '-'} - {event?.endDate ? formatTime(event.endDate) : '-'}
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{event?.location || '-'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Capacità</Text>
            <Text style={styles.detailValue}>{event?.capacity || '-'}</Text>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Azioni Rapide</Text>
        <View style={styles.actionsGrid}>
          <Button variant="outline" style={styles.actionButton}>
            <Ionicons name="qr-code-outline" size={20} color={colors.foreground} />
            <Text style={styles.actionButtonText}>Scanner</Text>
          </Button>
          <Button variant="outline" style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color={colors.foreground} />
            <Text style={styles.actionButtonText}>Condividi</Text>
          </Button>
          <Button variant="outline" style={styles.actionButton}>
            <Ionicons name="create-outline" size={20} color={colors.foreground} />
            <Text style={styles.actionButtonText}>Modifica</Text>
          </Button>
          <Button variant="outline" style={styles.actionButton}>
            <Ionicons name="stats-chart-outline" size={20} color={colors.foreground} />
            <Text style={styles.actionButtonText}>Report</Text>
          </Button>
        </View>
      </View>
    </View>
  );

  const renderTicketing = () => (
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
      {event?.ticketTypes?.map((type, index) => (
        <Card key={index} style={styles.ticketTypeCard}>
          <View style={styles.ticketTypeHeader}>
            <Text style={styles.ticketTypeName}>{type.name}</Text>
            <Badge variant={type.available > 0 ? 'success' : 'destructive'}>
              {type.available > 0 ? 'Disponibile' : 'Esaurito'}
            </Badge>
          </View>
          <View style={styles.ticketTypeStats}>
            <Text style={styles.ticketTypePrice}>{formatCurrency(type.price)}</Text>
            <Text style={styles.ticketTypeSold}>{type.sold}/{type.quantity} venduti</Text>
          </View>
        </Card>
      )) || (
        <Card style={styles.emptyCard}>
          <Ionicons name="ticket-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuna tipologia configurata</Text>
        </Card>
      )}
    </View>
  );

  const renderGuests = () => (
    <View style={styles.tabContent}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Riepilogo Liste</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{event?.guestsCount || 0}</Text>
            <Text style={styles.summaryLabel}>Totale Ospiti</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{event?.guestsCheckedIn || 0}</Text>
            <Text style={styles.summaryLabel}>Entrati</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{event?.guestLists?.length || 0}</Text>
            <Text style={styles.summaryLabel}>Liste</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Liste Ospiti</Text>
      {event?.guestLists?.map((list, index) => (
        <Card key={index} style={styles.listCard}>
          <View style={styles.listHeader}>
            <Text style={styles.listName}>{list.name}</Text>
            <Badge variant="secondary">{list.count} ospiti</Badge>
          </View>
          <View style={styles.listStats}>
            <View style={styles.listStat}>
              <Ionicons name="checkmark-circle-outline" size={16} color={staticColors.success} />
              <Text style={styles.listStatText}>{list.checkedIn} entrati</Text>
            </View>
            <View style={styles.listStat}>
              <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
              <Text style={styles.listStatText}>PR: {list.prName || '-'}</Text>
            </View>
          </View>
        </Card>
      )) || (
        <Card style={styles.emptyCard}>
          <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuna lista ospiti</Text>
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

      <Text style={styles.sectionTitle}>Tavoli</Text>
      {event?.tables?.map((table, index) => (
        <Card key={index} style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableName}>{table.name}</Text>
            <Badge variant={table.status === 'available' ? 'success' : table.status === 'booked' ? 'default' : 'secondary'}>
              {table.status === 'available' ? 'Disponibile' : table.status === 'booked' ? 'Prenotato' : 'Occupato'}
            </Badge>
          </View>
          <View style={styles.tableInfo}>
            <Text style={styles.tablePrice}>{formatCurrency(table.minSpend)}</Text>
            <Text style={styles.tableSeats}>{table.seats} posti</Text>
          </View>
        </Card>
      )) || (
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
        <Text style={styles.summaryTitle}>Staff Assegnato</Text>
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

      <Text style={styles.sectionTitle}>Membri Staff</Text>
      {event?.staff?.map((member, index) => (
        <Card key={index} style={styles.staffCard}>
          <View style={styles.staffInfo}>
            <View style={[styles.staffAvatar, { backgroundColor: `${staticColors.primary}20` }]}>
              <Ionicons name="person" size={24} color={staticColors.primary} />
            </View>
            <View style={styles.staffDetails}>
              <Text style={styles.staffName}>{member.name}</Text>
              <Text style={styles.staffRole}>{member.role}</Text>
            </View>
            <Badge variant="secondary">{member.status}</Badge>
          </View>
        </Card>
      )) || (
        <Card style={styles.emptyCard}>
          <Ionicons name="person-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuno staff assegnato</Text>
        </Card>
      )}
    </View>
  );

  const renderInventory = () => (
    <View style={styles.tabContent}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Inventario Evento</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{event?.productsCount || 0}</Text>
            <Text style={styles.summaryLabel}>Prodotti</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{event?.stationsCount || 0}</Text>
            <Text style={styles.summaryLabel}>Stazioni</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{formatCurrency(event?.consumptionTotal || 0)}</Text>
            <Text style={styles.summaryLabel}>Consumo</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Stazioni</Text>
      <Card style={styles.emptyCard}>
        <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
        <Text style={styles.emptyText}>Gestisci inventario da web</Text>
      </Card>
    </View>
  );

  const renderFinance = () => (
    <View style={styles.tabContent}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Riepilogo Finanziario</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: staticColors.success }]}>{formatCurrency(event?.revenue || 0)}</Text>
            <Text style={styles.summaryLabel}>Incasso Totale</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{formatCurrency(event?.expenses || 0)}</Text>
            <Text style={styles.summaryLabel}>Spese</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: (event?.profit || 0) >= 0 ? staticColors.success : staticColors.destructive }]}>
              {formatCurrency(event?.profit || 0)}
            </Text>
            <Text style={styles.summaryLabel}>Profitto</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Dettaglio Entrate</Text>
      <Card style={styles.financeCard}>
        <View style={styles.financeRow}>
          <Text style={styles.financeLabel}>Biglietti</Text>
          <Text style={styles.financeValue}>{formatCurrency(event?.ticketRevenue || 0)}</Text>
        </View>
        <View style={styles.financeDivider} />
        <View style={styles.financeRow}>
          <Text style={styles.financeLabel}>Tavoli</Text>
          <Text style={styles.financeValue}>{formatCurrency(event?.tablesRevenue || 0)}</Text>
        </View>
        <View style={styles.financeDivider} />
        <View style={styles.financeRow}>
          <Text style={styles.financeLabel}>Consumazioni</Text>
          <Text style={styles.financeValue}>{formatCurrency(event?.consumptionRevenue || 0)}</Text>
        </View>
      </Card>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'ticketing':
        return renderTicketing();
      case 'guests':
        return renderGuests();
      case 'tables':
        return renderTables();
      case 'staff':
        return renderStaff();
      case 'inventory':
        return renderInventory();
      case 'finance':
        return renderFinance();
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

  if (!event) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-event-detail" />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Evento non trovato</Text>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-event-detail" />

      <View style={styles.eventHeader}>
        <View style={styles.eventTitleRow}>
          <Text style={styles.eventTitle} numberOfLines={1}>{event.name}</Text>
          {getStatusBadge(event.status)}
        </View>
        <View style={styles.eventMeta}>
          <Ionicons name="calendar-outline" size={16} color={staticColors.mutedForeground} />
          <Text style={styles.eventMetaText}>{formatDate(event.startDate)}</Text>
          <Ionicons name="location-outline" size={16} color={staticColors.mutedForeground} style={{ marginLeft: spacing.md }} />
          <Text style={styles.eventMetaText}>{event.location || '-'}</Text>
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
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  eventTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
    flex: 1,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  eventMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
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
    paddingBottom: spacing.xxl,
  },
  tabContent: {
    padding: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  detailsCard: {
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    flex: 1,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  detailDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  summaryCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
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
    marginTop: spacing.xs,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: staticColors.border,
  },
  ticketTypeCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  ticketTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketTypeName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  ticketTypeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  ticketTypePrice: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.primary,
  },
  ticketTypeSold: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  listCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  listStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  listStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listStatText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  tableCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  tableInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  tablePrice: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.golden,
  },
  tableSeats: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  staffCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffDetails: {
    flex: 1,
  },
  staffName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  staffRole: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  financeCard: {
    padding: spacing.md,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financeLabel: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  financeValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  financeDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.sm,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.md,
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
});

export default ManagerEventDetailScreen;
