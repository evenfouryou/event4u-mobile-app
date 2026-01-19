import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

type TabKey = 'overview' | 'tickets' | 'lists' | 'staff' | 'revenue' | 'name-changes' | 'resales' | 'seats' | 'cashiers' | 'tables' | 'pr' | 'access' | 'page-editor';

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
}

interface TicketType {
  id: string;
  name: string;
  price: string;
  sold: number;
  total: number;
  revenue: string;
}

interface GuestListEntry {
  id: string;
  name: string;
  guests: number;
  status: 'confirmed' | 'pending' | 'checked-in';
  prName: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive' | 'break';
  checkInTime?: string;
}

interface SiaeNameChange {
  id: string;
  ticketId: string;
  oldFirstName: string;
  oldLastName: string;
  oldCodiceFiscale: string | null;
  newFirstName: string;
  newLastName: string;
  newCodiceFiscale: string | null;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  requestedAt: string;
  approvedAt: string | null;
  oldFiscalSeal: string | null;
  oldProgressiveNumber: number | null;
  newFiscalSeal: string | null;
  newProgressiveNumber: number | null;
}

interface SiaeResale {
  id: string;
  ticketId: string;
  sellerFirstName: string;
  sellerLastName: string;
  buyerFirstName: string | null;
  buyerLastName: string | null;
  resalePrice: string;
  status: 'listed' | 'reserved' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt: string | null;
  oldFiscalSeal: string | null;
  oldProgressiveNumber: number | null;
  newFiscalSeal: string | null;
  newProgressiveNumber: number | null;
}

const tabs: Tab[] = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline' },
  { key: 'tickets', label: 'Biglietti', icon: 'ticket-outline' },
  { key: 'name-changes', label: 'Cambi Nom.', icon: 'swap-horizontal-outline' },
  { key: 'resales', label: 'Rivendite', icon: 'repeat-outline' },
  { key: 'seats', label: 'Posti', icon: 'apps-outline' },
  { key: 'cashiers', label: 'Cassieri', icon: 'cash-outline' },
  { key: 'lists', label: 'Liste', icon: 'list-outline' },
  { key: 'tables', label: 'Tavoli', icon: 'restaurant-outline' },
  { key: 'pr', label: 'PR', icon: 'megaphone-outline' },
  { key: 'staff', label: 'Staff', icon: 'people-outline' },
  { key: 'access', label: 'Accessi', icon: 'qr-code-outline' },
  { key: 'revenue', label: 'Incassi', icon: 'wallet-outline' },
  { key: 'page-editor', label: 'Pagina', icon: 'globe-outline' },
];

export function EventHubScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const [activeTab, setActiveTab] = useState<TabKey>(route.params?.tab || 'overview');
  const [nameChanges, setNameChanges] = useState<SiaeNameChange[]>([]);
  const [resales, setResales] = useState<SiaeResale[]>([]);
  const [loadingNameChanges, setLoadingNameChanges] = useState(false);
  const [loadingResales, setLoadingResales] = useState(false);
  const [errorNameChanges, setErrorNameChanges] = useState<string | null>(null);
  const [errorResales, setErrorResales] = useState<string | null>(null);

  const [eventData, setEventData] = useState<any>(null);
  const [operationalStats, setOperationalStats] = useState<any>(null);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [errorEvent, setErrorEvent] = useState<string | null>(null);

  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [errorTickets, setErrorTickets] = useState<string | null>(null);

  const [guestLists, setGuestLists] = useState<GuestListEntry[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [errorLists, setErrorLists] = useState<string | null>(null);

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [errorStaff, setErrorStaff] = useState<string | null>(null);

  const [revenueData, setRevenueData] = useState<any>(null);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [errorRevenue, setErrorRevenue] = useState<string | null>(null);

  const [reloadOverview, setReloadOverview] = useState(0);
  const [reloadTickets, setReloadTickets] = useState(0);
  const [reloadLists, setReloadLists] = useState(0);
  const [reloadStaff, setReloadStaff] = useState(0);
  const [reloadRevenue, setReloadRevenue] = useState(0);

  const eventId = route.params?.eventId || '1';

  const statCardWidth = (isTablet || isLandscape)
    ? (width - spacing.lg * 2 - spacing.md * 3) / 4
    : (width - spacing.lg * 2 - spacing.md) / 2;

  useEffect(() => {
    setNameChanges([]);
    setResales([]);
    setErrorNameChanges(null);
    setErrorResales(null);
    setEventData(null);
    setOperationalStats(null);
    setErrorEvent(null);
    setTicketTypes([]);
    setErrorTickets(null);
    setGuestLists([]);
    setErrorLists(null);
    setStaffMembers([]);
    setErrorStaff(null);
    setRevenueData(null);
    setErrorRevenue(null);
    setReloadOverview(0);
    setReloadTickets(0);
    setReloadLists(0);
    setReloadStaff(0);
    setReloadRevenue(0);
  }, [eventId]);

  useEffect(() => {
    const loadEventData = async () => {
      setLoadingEvent(true);
      setErrorEvent(null);
      try {
        const [event, stats] = await Promise.all([
          api.get<any>(`/api/events/${eventId}`),
          api.get<any>(`/api/events/${eventId}/operational-stats`).catch(() => null),
        ]);
        setEventData(event);
        if (stats) {
          setOperationalStats(stats);
        }
      } catch (e) {
        console.error(e);
        setErrorEvent('Errore di connessione');
      }
      setLoadingEvent(false);
    };
    loadEventData();
  }, [eventId, reloadOverview]);

  useEffect(() => {
    if (activeTab !== 'tickets') return;
    
    const loadTicketTypes = async () => {
      setLoadingTickets(true);
      setErrorTickets(null);
      try {
        const data = await api.get<any[]>(`/api/siae/ticketed-events/${eventId}/ticket-stats`);
        setTicketTypes(data);
      } catch (e) {
        setErrorTickets('Errore di connessione');
      }
      setLoadingTickets(false);
    };
    loadTicketTypes();
  }, [activeTab, eventId, reloadTickets]);

  useEffect(() => {
    if (activeTab !== 'lists') return;
    
    const loadGuestLists = async () => {
      setLoadingLists(true);
      setErrorLists(null);
      try {
        const data = await api.get<any[]>(`/api/pr/events/${eventId}/guest-lists`);
        const mapped = data.map((gl: any) => ({
          id: gl.id,
          name: gl.name || gl.guestName || 'Lista',
          guests: gl.totalGuests || gl.guests || 0,
          status: gl.status || 'pending',
          prName: gl.prName || gl.assignedPrName || 'N/A',
        }));
        setGuestLists(mapped);
      } catch (e) {
        setErrorLists('Errore di connessione');
      }
      setLoadingLists(false);
    };
    loadGuestLists();
  }, [activeTab, eventId, reloadLists]);

  useEffect(() => {
    if (activeTab !== 'staff') return;
    
    const loadStaff = async () => {
      setLoadingStaff(true);
      setErrorStaff(null);
      try {
        const data = await api.get<any[]>(`/api/events/${eventId}/pr-assignments`);
        const mapped = data.map((s: any) => ({
          id: s.id,
          name: s.userName || s.name || 'Staff',
          role: s.role || s.assignmentType || 'Staff',
          status: s.status || 'active',
          checkInTime: s.checkInTime || null,
        }));
        setStaffMembers(mapped);
      } catch (e) {
        setErrorStaff('Errore di connessione');
      }
      setLoadingStaff(false);
    };
    loadStaff();
  }, [activeTab, eventId, reloadStaff]);

  useEffect(() => {
    if (activeTab !== 'revenue') return;
    
    const loadRevenue = async () => {
      setLoadingRevenue(true);
      setErrorRevenue(null);
      try {
        const data = await api.get<any>(`/api/events/${eventId}/revenue-analysis`);
        setRevenueData(data);
      } catch (e) {
        setErrorRevenue('Errore di connessione');
      }
      setLoadingRevenue(false);
    };
    loadRevenue();
  }, [activeTab, eventId, reloadRevenue]);

  useEffect(() => {
    if (activeTab !== 'name-changes') return;
    
    const loadNameChanges = async () => {
      setLoadingNameChanges(true);
      setErrorNameChanges(null);
      try {
        const data = await api.get<any[]>(`/api/siae/ticketed-events/${eventId}/name-changes`);
        setNameChanges(data);
      } catch (e) {
        setErrorNameChanges('Errore di connessione');
      }
      setLoadingNameChanges(false);
    };
    loadNameChanges();
  }, [activeTab, eventId]);

  useEffect(() => {
    if (activeTab !== 'resales') return;
    
    const loadResales = async () => {
      setLoadingResales(true);
      setErrorResales(null);
      try {
        const data = await api.get<any[]>(`/api/siae/ticketed-events/${eventId}/resales`);
        setResales(data);
      } catch (e) {
        setErrorResales('Errore di connessione');
      }
      setLoadingResales(false);
    };
    loadResales();
  }, [activeTab, eventId]);

  const getEventName = () => eventData?.name || 'Caricamento...';
  const getEventDate = () => {
    if (!eventData?.startDate) return '--';
    const date = new Date(eventData.startDate);
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const getEventTime = () => {
    if (!eventData?.startDate) return '';
    const start = new Date(eventData.startDate);
    const end = eventData.endDate ? new Date(eventData.endDate) : null;
    const startTime = start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const endTime = end ? end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
    return endTime ? `${startTime} - ${endTime}` : startTime;
  };
  const getEventVenue = () => eventData?.venue || eventData?.locationName || '--';
  const getEventStatus = () => eventData?.status || 'pending';
  const getTicketsSold = () => operationalStats?.ticketsSold ?? eventData?.ticketsSold ?? 0;
  const getTotalTickets = () => operationalStats?.totalTickets ?? eventData?.totalTickets ?? 0;
  const getTotalRevenue = () => {
    const revenue = operationalStats?.totalRevenue ?? eventData?.totalRevenue ?? 0;
    return typeof revenue === 'number' ? `€ ${revenue.toLocaleString('it-IT')}` : revenue;
  };
  const getGuestsCheckedIn = () => operationalStats?.guestsCheckedIn ?? 0;
  const getStaffOnDuty = () => operationalStats?.staffOnDuty ?? staffMembers.filter(s => s.status === 'active').length;

  const getRevenueBreakdown = () => {
    if (!revenueData?.breakdown) {
      return [];
    }
    const colorMap: Record<string, string> = {
      'tickets': colors.primary,
      'biglietti': colors.primary,
      'tables': colors.accent,
      'tavoli': colors.accent,
      'drinks': colors.success,
      'bevande': colors.success,
      'other': colors.warning,
      'altro': colors.warning,
    };
    return revenueData.breakdown.map((item: any) => ({
      label: item.label || item.category,
      value: typeof item.value === 'number' ? `€ ${item.value.toLocaleString('it-IT')}` : item.value,
      percentage: item.percentage || 0,
      color: colorMap[item.category?.toLowerCase()] || colors.mutedForeground,
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
      case 'active':
      case 'checked-in':
      case 'completed':
        return colors.success;
      case 'confirmed':
      case 'approved':
        return colors.primary;
      case 'pending':
      case 'break':
      case 'listed':
      case 'reserved':
        return colors.warning;
      case 'inactive':
      case 'rejected':
      case 'cancelled':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const renderTab = ({ item }: { item: Tab }) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === item.key && styles.tabActive]}
      onPress={() => setActiveTab(item.key)}
      testID={`tab-${item.key}`}
    >
      <Ionicons
        name={item.icon as any}
        size={20}
        color={activeTab === item.key ? colors.primary : colors.mutedForeground}
      />
      <Text style={[styles.tabLabel, activeTab === item.key && styles.tabLabelActive]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderOverviewTab = () => {
    if (loadingEvent) {
      return (
        <View style={styles.loadingContainer} testID="loading-overview">
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      );
    }

    if (errorEvent) {
      return (
        <Card style={styles.emptyCard} testID="error-overview">
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorEvent}</Text>
          <Button
            title="Riprova"
            variant="primary"
            onPress={() => setReloadOverview(prev => prev + 1)}
            style={styles.retryButton}
            testID="button-retry-overview"
          />
        </Card>
      );
    }

    const statusLabel = getEventStatus() === 'live' ? 'In Corso' : 
                        getEventStatus() === 'upcoming' ? 'Prossimo' : 
                        getEventStatus() === 'completed' ? 'Concluso' : 'Bozza';

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} testID="scroll-overview">
        <Card style={styles.eventInfoCard} variant="elevated" testID="event-info-card">
          <View style={styles.eventHeader}>
            <View>
              <Text style={styles.eventName}>{getEventName()}</Text>
              <View style={styles.eventMeta}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.eventMetaText}>{getEventDate()} • {getEventTime()}</Text>
              </View>
              <View style={styles.eventMeta}>
                <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.eventMetaText}>{getEventVenue()}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(getEventStatus())}20` }]}>
              <View style={[styles.liveDot, { backgroundColor: getStatusColor(getEventStatus()) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(getEventStatus()) }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, { width: statCardWidth }]} testID="stat-revenue">
            <Ionicons name="wallet-outline" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{getTotalRevenue()}</Text>
            <Text style={styles.statLabel}>Incasso Totale</Text>
          </Card>
          <Card style={[styles.statCard, { width: statCardWidth }]} testID="stat-tickets">
            <Ionicons name="ticket-outline" size={24} color={colors.success} />
            <Text style={styles.statValue}>{getTicketsSold()}/{getTotalTickets()}</Text>
            <Text style={styles.statLabel}>Biglietti</Text>
          </Card>
          <Card style={[styles.statCard, { width: statCardWidth }]} testID="stat-checkin">
            <Ionicons name="checkmark-circle-outline" size={24} color={colors.accent} />
            <Text style={styles.statValue}>{getGuestsCheckedIn()}</Text>
            <Text style={styles.statLabel}>Check-in</Text>
          </Card>
          <Card style={[styles.statCard, { width: statCardWidth }]} testID="stat-staff">
            <Ionicons name="people-outline" size={24} color={colors.warning} />
            <Text style={styles.statValue}>{getStaffOnDuty()}</Text>
            <Text style={styles.statLabel}>Staff Attivo</Text>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          <View style={[styles.quickActionsGrid, (isTablet || isLandscape) && styles.quickActionsGridResponsive]}>
            <Button
              title="Gestisci Biglietti"
              variant="secondary"
              icon={<Ionicons name="ticket-outline" size={18} color={colors.foreground} />}
              onPress={() => setActiveTab('tickets')}
              style={styles.quickActionBtn}
              testID="button-manage-tickets"
            />
            <Button
              title="Liste Ospiti"
              variant="secondary"
              icon={<Ionicons name="list-outline" size={18} color={colors.foreground} />}
              onPress={() => setActiveTab('lists')}
              style={styles.quickActionBtn}
              testID="button-guest-lists"
            />
            <Button
              title="Check-in Scanner"
              variant="secondary"
              icon={<Ionicons name="qr-code-outline" size={18} color={colors.foreground} />}
              onPress={() => navigation.navigate('CheckInScanner', { eventId })}
              style={styles.quickActionBtn}
              testID="button-checkin-scanner"
            />
            <Button
              title="Report Vendite"
              variant="secondary"
              icon={<Ionicons name="bar-chart-outline" size={18} color={colors.foreground} />}
              onPress={() => setActiveTab('revenue')}
              style={styles.quickActionBtn}
              testID="button-sales-report"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attività Recente</Text>
          {[
            { action: 'Nuovo check-in', detail: 'Marco R. • Biglietto VIP', time: '2 min fa', icon: 'checkmark-circle' },
            { action: 'Vendita biglietto', detail: 'Standard • € 15,00', time: '5 min fa', icon: 'ticket' },
            { action: 'Staff check-in', detail: 'Giulia M. • Bartender', time: '12 min fa', icon: 'person' },
          ].map((activity, index) => (
            <Card key={index} style={styles.activityCard} testID={`activity-${index}`}>
              <View style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons name={activity.icon as any} size={20} color={colors.primary} />
                </View>
                <View style={styles.activityDetails}>
                  <Text style={styles.activityAction}>{activity.action}</Text>
                  <Text style={styles.activityDetail}>{activity.detail}</Text>
                </View>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderTicketsTab = () => {
    if (loadingTickets) {
      return (
        <View style={styles.loadingContainer} testID="loading-tickets">
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      );
    }

    if (errorTickets) {
      return (
        <Card style={styles.emptyCard} testID="error-tickets">
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorTickets}</Text>
          <Button
            title="Riprova"
            variant="primary"
            onPress={() => setReloadTickets(prev => prev + 1)}
            style={styles.retryButton}
            testID="button-retry-tickets"
          />
        </Card>
      );
    }

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} testID="scroll-tickets">
        <Card style={styles.summaryCard} testID="tickets-summary">
          <Text style={styles.summaryTitle}>Riepilogo Vendite</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{getTicketsSold()}</Text>
              <Text style={styles.summaryLabel}>Venduti</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{getTotalTickets() - getTicketsSold()}</Text>
              <Text style={styles.summaryLabel}>Disponibili</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{getTotalRevenue()}</Text>
              <Text style={styles.summaryLabel}>Incasso</Text>
            </View>
          </View>
        </Card>

        <View style={(isTablet || isLandscape) ? styles.ticketsGrid : undefined}>
          {ticketTypes.length === 0 ? (
            <Card style={styles.emptyCard} testID="empty-tickets">
              <Ionicons name="ticket-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>Nessun tipo biglietto configurato</Text>
            </Card>
          ) : (
            ticketTypes.map((ticket: any) => {
              const sold = ticket.sold || 0;
              const total = ticket.total || ticket.quantity || 0;
              const progress = total > 0 ? (sold / total) * 100 : 0;
              return (
                <Card key={ticket.id} style={[styles.ticketCard, (isTablet || isLandscape) && styles.ticketCardResponsive]} testID={`ticket-type-${ticket.id}`}>
                  <View style={styles.ticketHeader}>
                    <View>
                      <Text style={styles.ticketName}>{ticket.name}</Text>
                      <Text style={styles.ticketPrice}>€ {ticket.price}</Text>
                    </View>
                    <Text style={styles.ticketRevenue}>
                      € {((sold * parseFloat(ticket.price)) || 0).toLocaleString('it-IT')}
                    </Text>
                  </View>
                  <View style={styles.ticketProgress}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>{sold}/{total} venduti</Text>
                      <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progress >= 80 ? colors.success : colors.primary }]} />
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    );
  };

  const renderNameChangesTab = () => {
    if (loadingNameChanges) {
      return (
        <View style={styles.loadingContainer} testID="loading-name-changes">
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      );
    }

    if (errorNameChanges) {
      return (
        <Card style={styles.emptyCard} testID="error-name-changes">
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorNameChanges}</Text>
        </Card>
      );
    }

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} testID="scroll-name-changes">
        <Card style={styles.summaryCard} testID="name-changes-summary">
          <Text style={styles.summaryTitle}>Cambi Nominativo SIAE</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{nameChanges.filter(nc => nc.status === 'pending').length}</Text>
              <Text style={styles.summaryLabel}>In Attesa</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{nameChanges.filter(nc => nc.status === 'completed').length}</Text>
              <Text style={styles.summaryLabel}>Completati</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{nameChanges.length}</Text>
              <Text style={styles.summaryLabel}>Totale</Text>
            </View>
          </View>
        </Card>

        {nameChanges.length === 0 ? (
          <Card style={styles.emptyCard} testID="empty-name-changes">
            <Ionicons name="swap-horizontal-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna richiesta di cambio nominativo</Text>
          </Card>
        ) : (
          <View style={(isTablet || isLandscape) ? styles.listGrid : undefined}>
            {nameChanges.map((nc) => (
              <Card key={nc.id} style={[styles.trackingCard, (isTablet || isLandscape) && styles.trackingCardResponsive]} testID={`name-change-${nc.id}`}>
                <View style={styles.trackingHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(nc.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(nc.status) }]}>
                      {nc.status === 'pending' ? 'In Attesa' : nc.status === 'completed' ? 'Completato' : nc.status}
                    </Text>
                  </View>
                  <Text style={styles.trackingDate}>{new Date(nc.requestedAt).toLocaleDateString('it-IT')}</Text>
                </View>
                <View style={styles.transferRow}>
                  <View style={styles.transferPerson}>
                    <Text style={styles.transferLabel}>DA</Text>
                    <Text style={styles.transferName}>{nc.oldFirstName} {nc.oldLastName}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={colors.mutedForeground} />
                  <View style={styles.transferPerson}>
                    <Text style={styles.transferLabel}>A</Text>
                    <Text style={styles.transferName}>{nc.newFirstName} {nc.newLastName}</Text>
                  </View>
                </View>
                {nc.newFiscalSeal && (
                  <View style={styles.siaeInfo}>
                    <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                    <Text style={styles.siaeText}>Sigillo: {nc.newFiscalSeal} • N. {nc.newProgressiveNumber}</Text>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderResalesTab = () => {
    if (loadingResales) {
      return (
        <View style={styles.loadingContainer} testID="loading-resales">
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      );
    }

    if (errorResales) {
      return (
        <Card style={styles.emptyCard} testID="error-resales">
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorResales}</Text>
        </Card>
      );
    }

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} testID="scroll-resales">
        <Card style={styles.summaryCard} testID="resales-summary">
          <Text style={styles.summaryTitle}>Rivendite SIAE</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{resales.filter(r => r.status === 'listed').length}</Text>
              <Text style={styles.summaryLabel}>In Vendita</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{resales.filter(r => r.status === 'completed').length}</Text>
              <Text style={styles.summaryLabel}>Completate</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{resales.length}</Text>
              <Text style={styles.summaryLabel}>Totale</Text>
            </View>
          </View>
        </Card>

        {resales.length === 0 ? (
          <Card style={styles.emptyCard} testID="empty-resales">
            <Ionicons name="repeat-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna rivendita attiva</Text>
          </Card>
        ) : (
          <View style={(isTablet || isLandscape) ? styles.listGrid : undefined}>
            {resales.map((resale) => (
              <Card key={resale.id} style={[styles.trackingCard, (isTablet || isLandscape) && styles.trackingCardResponsive]} testID={`resale-${resale.id}`}>
                <View style={styles.trackingHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(resale.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(resale.status) }]}>
                      {resale.status === 'listed' ? 'In Vendita' : resale.status === 'completed' ? 'Venduto' : resale.status}
                    </Text>
                  </View>
                  <Text style={styles.trackingDate}>€ {resale.resalePrice}</Text>
                </View>
                <View style={styles.transferRow}>
                  <View style={styles.transferPerson}>
                    <Text style={styles.transferLabel}>VENDITORE</Text>
                    <Text style={styles.transferName}>{resale.sellerFirstName} {resale.sellerLastName}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={colors.mutedForeground} />
                  <View style={styles.transferPerson}>
                    <Text style={styles.transferLabel}>ACQUIRENTE</Text>
                    <Text style={resale.buyerFirstName ? styles.transferName : styles.transferNamePending}>
                      {resale.buyerFirstName ? `${resale.buyerFirstName} ${resale.buyerLastName}` : 'In attesa...'}
                    </Text>
                  </View>
                </View>
                {resale.newFiscalSeal && (
                  <View style={styles.siaeInfo}>
                    <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                    <Text style={styles.siaeText}>Sigillo: {resale.newFiscalSeal} • N. {resale.newProgressiveNumber}</Text>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderListsTab = () => {
    if (loadingLists) {
      return (
        <View style={styles.loadingContainer} testID="loading-lists">
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      );
    }

    if (errorLists) {
      return (
        <Card style={styles.emptyCard} testID="error-lists">
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorLists}</Text>
          <Button
            title="Riprova"
            variant="primary"
            onPress={() => setReloadLists(prev => prev + 1)}
            style={styles.retryButton}
            testID="button-retry-lists"
          />
        </Card>
      );
    }

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} testID="scroll-lists">
        <Card style={styles.summaryCard} testID="lists-summary">
          <Text style={styles.summaryTitle}>Liste Ospiti</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{guestLists.reduce((sum, gl) => sum + gl.guests, 0)}</Text>
              <Text style={styles.summaryLabel}>Totale Ospiti</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{guestLists.filter(gl => gl.status === 'checked-in').length}</Text>
              <Text style={styles.summaryLabel}>Check-in</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{guestLists.length}</Text>
              <Text style={styles.summaryLabel}>Liste</Text>
            </View>
          </View>
        </Card>

        {guestLists.length === 0 ? (
          <Card style={styles.emptyCard} testID="empty-lists">
            <Ionicons name="list-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna lista ospiti</Text>
          </Card>
        ) : (
          <View style={(isTablet || isLandscape) ? styles.listGrid : undefined}>
            {guestLists.map((entry) => (
              <Card key={entry.id} style={[styles.listEntryCard, (isTablet || isLandscape) && styles.listEntryCardResponsive]} testID={`guest-list-${entry.id}`}>
                <View style={styles.listEntryHeader}>
                  <View>
                    <Text style={styles.listEntryName}>{entry.name}</Text>
                    <Text style={styles.listEntryPr}>PR: {entry.prName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(entry.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(entry.status) }]}>
                      {entry.status === 'checked-in' ? 'Entrato' : entry.status === 'confirmed' ? 'Confermato' : 'In Attesa'}
                    </Text>
                  </View>
                </View>
                <View style={styles.listEntryFooter}>
                  <View style={styles.guestCount}>
                    <Ionicons name="people-outline" size={16} color={colors.mutedForeground} />
                    <Text style={styles.guestCountText}>{entry.guests} ospiti</Text>
                  </View>
                  {entry.status !== 'checked-in' && (
                    <Button
                      title="Check-in"
                      variant="outline"
                      size="sm"
                      onPress={() => {}}
                      testID={`button-checkin-${entry.id}`}
                    />
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderStaffTab = () => {
    if (loadingStaff) {
      return (
        <View style={styles.loadingContainer} testID="loading-staff">
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      );
    }

    if (errorStaff) {
      return (
        <Card style={styles.emptyCard} testID="error-staff">
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorStaff}</Text>
          <Button
            title="Riprova"
            variant="primary"
            onPress={() => setReloadStaff(prev => prev + 1)}
            style={styles.retryButton}
            testID="button-retry-staff"
          />
        </Card>
      );
    }

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} testID="scroll-staff">
        <Card style={styles.summaryCard} testID="staff-summary">
          <Text style={styles.summaryTitle}>Staff in Servizio</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>
                {staffMembers.filter((s) => s.status === 'active').length}
              </Text>
              <Text style={styles.summaryLabel}>Attivi</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>
                {staffMembers.filter((s) => s.status === 'break').length}
              </Text>
              <Text style={styles.summaryLabel}>In Pausa</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{staffMembers.length}</Text>
              <Text style={styles.summaryLabel}>Totale</Text>
            </View>
          </View>
        </Card>

        {staffMembers.length === 0 ? (
          <Card style={styles.emptyCard} testID="empty-staff">
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuno staff assegnato</Text>
          </Card>
        ) : (
          <View style={(isTablet || isLandscape) ? styles.listGrid : undefined}>
            {staffMembers.map((member) => (
              <Card key={member.id} style={[styles.staffCard, (isTablet || isLandscape) && styles.staffCardResponsive]} testID={`staff-${member.id}`}>
                <View style={styles.staffHeader}>
                  <View style={styles.staffAvatar}>
                    <Text style={styles.staffInitials}>
                      {member.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                    </Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{member.name}</Text>
                    <Text style={styles.staffRole}>{member.role}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.status) }]} />
                </View>
                {member.checkInTime && (
                  <View style={styles.staffCheckIn}>
                    <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                    <Text style={styles.staffCheckInText}>Check-in: {member.checkInTime}</Text>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderRevenueTab = () => {
    if (loadingRevenue) {
      return (
        <View style={styles.loadingContainer} testID="loading-revenue">
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      );
    }

    if (errorRevenue) {
      return (
        <Card style={styles.emptyCard} testID="error-revenue">
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorRevenue}</Text>
          <Button
            title="Riprova"
            variant="primary"
            onPress={() => setReloadRevenue(prev => prev + 1)}
            style={styles.retryButton}
            testID="button-retry-revenue"
          />
        </Card>
      );
    }

    const revenueBreakdown = getRevenueBreakdown();
    const totalRevenueValue = revenueData?.totalRevenue ?? operationalStats?.totalRevenue ?? 0;
    const formattedTotal = typeof totalRevenueValue === 'number' 
      ? `€ ${totalRevenueValue.toLocaleString('it-IT')}` 
      : totalRevenueValue;
    const trendPercentage = revenueData?.trendPercentage ?? null;
    const cardPayments = revenueData?.paymentMethods?.card ?? revenueData?.cardPayments ?? 0;
    const cashPayments = revenueData?.paymentMethods?.cash ?? revenueData?.cashPayments ?? 0;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} testID="scroll-revenue">
        <Card style={styles.revenueCard} variant="elevated" testID="revenue-total">
          <Text style={styles.revenueTotalLabel}>Incasso Totale</Text>
          <Text style={styles.revenueTotalValue}>{formattedTotal}</Text>
          {trendPercentage !== null && (
            <View style={styles.revenueTrend}>
              <Ionicons 
                name={trendPercentage >= 0 ? "trending-up" : "trending-down"} 
                size={16} 
                color={trendPercentage >= 0 ? colors.success : colors.destructive} 
              />
              <Text style={[styles.revenueTrendText, { color: trendPercentage >= 0 ? colors.success : colors.destructive }]}>
                {trendPercentage >= 0 ? '+' : ''}{trendPercentage}% rispetto a evento precedente
              </Text>
            </View>
          )}
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suddivisione Incassi</Text>
          {revenueBreakdown.length === 0 ? (
            <Card style={styles.emptyCard} testID="empty-breakdown">
              <Ionicons name="pie-chart-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>Nessun dato disponibile</Text>
            </Card>
          ) : (
            <View style={(isTablet || isLandscape) ? styles.listGrid : undefined}>
              {revenueBreakdown.map((item: any, index: number) => (
                <Card key={index} style={[styles.breakdownCard, (isTablet || isLandscape) && styles.breakdownCardResponsive]} testID={`breakdown-${index}`}>
                  <View style={styles.breakdownHeader}>
                    <View style={styles.breakdownLabel}>
                      <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                      <Text style={styles.breakdownName}>{item.label}</Text>
                    </View>
                    <Text style={styles.breakdownValue}>{item.value}</Text>
                  </View>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[styles.breakdownFill, { width: `${item.percentage}%`, backgroundColor: item.color }]}
                    />
                  </View>
                  <Text style={styles.breakdownPercentage}>{item.percentage}%</Text>
                </Card>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metodi di Pagamento</Text>
          <Card style={styles.paymentCard} testID="payment-methods">
            <View style={styles.paymentRow}>
              <View style={styles.paymentMethod}>
                <Ionicons name="card-outline" size={20} color={colors.primary} />
                <Text style={styles.paymentLabel}>Carte</Text>
              </View>
              <Text style={styles.paymentValue}>
                {typeof cardPayments === 'number' ? `€ ${cardPayments.toLocaleString('it-IT')}` : cardPayments}
              </Text>
            </View>
            <View style={styles.paymentDivider} />
            <View style={styles.paymentRow}>
              <View style={styles.paymentMethod}>
                <Ionicons name="cash-outline" size={20} color={colors.success} />
                <Text style={styles.paymentLabel}>Contanti</Text>
              </View>
              <Text style={styles.paymentValue}>
                {typeof cashPayments === 'number' ? `€ ${cashPayments.toLocaleString('it-IT')}` : cashPayments}
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    );
  };

  const renderPlaceholderTab = (title: string, icon: string, description: string) => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} testID={`scroll-placeholder-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <Card style={styles.placeholderCard} testID={`placeholder-${title.toLowerCase().replace(/\s/g, '-')}`}>
        <Ionicons name={icon as any} size={64} color={colors.primary} />
        <Text style={styles.placeholderTitle}>{title}</Text>
        <Text style={styles.placeholderDescription}>{description}</Text>
        <View style={styles.placeholderBadge}>
          <Text style={styles.placeholderBadgeText}>Prossimamente</Text>
        </View>
      </Card>
    </ScrollView>
  );

  const renderSeatsTab = () => renderPlaceholderTab(
    'Posti Numerati',
    'apps-outline',
    'Gestisci i posti numerati per questo evento. Puoi assegnare e monitorare le prenotazioni.'
  );

  const renderCashiersTab = () => renderPlaceholderTab(
    'Cassieri',
    'cash-outline',
    'Gestisci le postazioni cassa e le assegnazioni dei cassieri per questo evento.'
  );

  const renderTablesTab = () => renderPlaceholderTab(
    'Tavoli',
    'restaurant-outline',
    'Gestisci le prenotazioni dei tavoli e le aree VIP del locale.'
  );

  const renderPrTab = () => renderPlaceholderTab(
    'PR & Promoter',
    'megaphone-outline',
    'Gestisci i PR assegnati, le liste ospiti e le performance dei promoter.'
  );

  const renderAccessTab = () => renderPlaceholderTab(
    'Controllo Accessi',
    'qr-code-outline',
    'Monitora i check-in in tempo reale e le statistiche di accesso all\'evento.'
  );

  const renderPageEditorTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} testID="scroll-page-editor">
      <Card style={styles.placeholderCard} testID="placeholder-page-editor">
        <Ionicons name="globe-outline" size={64} color={colors.primary} />
        <Text style={styles.placeholderTitle}>Pagina Pubblica</Text>
        <Text style={styles.placeholderDescription}>
          Personalizza la pagina pubblica dell'evento per i tuoi clienti.
        </Text>
        <Button
          title="Apri Editor Web"
          variant="primary"
          onPress={() => {}}
          icon={<Ionicons name="open-outline" size={20} color={colors.primaryForeground} />}
          style={styles.placeholderButton}
          testID="button-open-editor"
        />
      </Card>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'tickets':
        return renderTicketsTab();
      case 'name-changes':
        return renderNameChangesTab();
      case 'resales':
        return renderResalesTab();
      case 'seats':
        return renderSeatsTab();
      case 'cashiers':
        return renderCashiersTab();
      case 'lists':
        return renderListsTab();
      case 'tables':
        return renderTablesTab();
      case 'pr':
        return renderPrTab();
      case 'staff':
        return renderStaffTab();
      case 'access':
        return renderAccessTab();
      case 'revenue':
        return renderRevenueTab();
      case 'page-editor':
        return renderPageEditorTab();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Centro Controllo"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity testID="button-settings">
            <Ionicons name="settings-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <View style={styles.tabsContainer}>
        <FlatList
          data={tabs}
          renderItem={renderTab}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsList}
        />
      </View>

      <View style={styles.contentContainer}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsList: {
    paddingHorizontal: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  errorText: {
    color: colors.destructive,
    fontSize: fontSize.base,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  retryButton: {
    marginTop: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  eventInfoCard: {
    marginBottom: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  eventMetaText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginTop: spacing.sm,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickActionsGridResponsive: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickActionBtn: {
    flex: 1,
    minWidth: 140,
  },
  activityCard: {
    marginBottom: spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDetails: {
    flex: 1,
  },
  activityAction: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  activityDetail: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  activityTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  ticketsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  ticketCard: {
    marginBottom: spacing.md,
  },
  ticketCardResponsive: {
    flex: 1,
    minWidth: 280,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  ticketName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  ticketPrice: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  ticketRevenue: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  ticketProgress: {},
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  progressPercentage: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  listGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  listEntryCard: {
    marginBottom: spacing.md,
  },
  listEntryCardResponsive: {
    flex: 1,
    minWidth: 280,
  },
  listEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  listEntryName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  listEntryPr: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  listEntryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  guestCountText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  trackingCard: {
    marginBottom: spacing.md,
  },
  trackingCardResponsive: {
    flex: 1,
    minWidth: 280,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  trackingDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transferPerson: {
    flex: 1,
  },
  transferLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  transferName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  transferNamePending: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  siaeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  siaeText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  staffCard: {
    marginBottom: spacing.md,
  },
  staffCardResponsive: {
    flex: 1,
    minWidth: 280,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  staffAvatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffInitials: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  staffRole: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
  },
  staffCheckIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  staffCheckInText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  revenueCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  revenueTotalLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  revenueTotalValue: {
    color: colors.foreground,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
  },
  revenueTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  revenueTrendText: {
    color: colors.success,
    fontSize: fontSize.sm,
  },
  breakdownCard: {
    marginBottom: spacing.md,
  },
  breakdownCardResponsive: {
    flex: 1,
    minWidth: 280,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
  },
  breakdownName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  breakdownValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  breakdownBar: {
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  breakdownFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  breakdownPercentage: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  paymentCard: {
    padding: spacing.md,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  paymentLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  paymentValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  paymentDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  placeholderCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  placeholderTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginTop: spacing.lg,
  },
  placeholderDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  placeholderBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  placeholderBadgeText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  placeholderButton: {
    marginTop: spacing.md,
  },
  statusTimelineCard: {
    marginBottom: spacing.md,
  },
  statusTimelineTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  statusTimeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusTimelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  statusTimelineIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTimelineIconActive: {
    backgroundColor: colors.primary,
  },
  statusTimelineIconCompleted: {
    backgroundColor: colors.success,
  },
  statusTimelineLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  statusTimelineLabelActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  statusTimelineLabelCompleted: {
    color: colors.success,
  },
  statusTimelineLine: {
    position: 'absolute',
    top: 20,
    left: '55%',
    width: '90%',
    height: 2,
    backgroundColor: colors.muted,
  },
  statusTimelineLineActive: {
    backgroundColor: colors.primary,
  },
});
