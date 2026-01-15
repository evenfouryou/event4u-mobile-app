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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
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
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
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

  // Reset data when eventId changes
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

  // Load event data on mount
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

  // Load ticket types when tickets tab is active
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

  // Load guest lists when lists tab is active
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

  // Load staff when staff tab is active
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

  // Load revenue data when revenue tab is active
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

  // Fetch name changes
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

  // Fetch resales
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

  // Helper functions for computed values
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

  // Revenue breakdown from API data
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
      data-testid={`tab-${item.key}`}
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
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      );
    }

    if (errorEvent) {
      return (
        <Card style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorEvent}</Text>
          <Button
            title="Riprova"
            variant="primary"
            onPress={() => setReloadOverview(prev => prev + 1)}
            style={styles.retryButton}
          />
        </Card>
      );
    }

    const statusLabel = getEventStatus() === 'live' ? 'In Corso' : 
                        getEventStatus() === 'upcoming' ? 'Prossimo' : 
                        getEventStatus() === 'completed' ? 'Concluso' : 'Bozza';

    return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.eventInfoCard} variant="elevated">
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

      <Card style={styles.statusTimelineCard}>
        <Text style={styles.statusTimelineTitle}>Stato Evento</Text>
        <View style={styles.statusTimeline}>
          {[
            { key: 'draft', label: 'Bozza', icon: 'document-outline' },
            { key: 'live', label: 'In Corso', icon: 'play-outline' },
            { key: 'completed', label: 'Concluso', icon: 'checkmark-circle-outline' },
            { key: 'archived', label: 'Archiviato', icon: 'archive-outline' },
          ].map((step, index, arr) => {
            const currentStatus = getEventStatus();
            const statusOrder = ['draft', 'pending', 'upcoming', 'live', 'completed', 'archived'];
            const currentIndex = statusOrder.indexOf(currentStatus);
            const stepIndex = statusOrder.indexOf(step.key);
            const isActive = step.key === currentStatus || 
                            (step.key === 'draft' && ['draft', 'pending', 'upcoming'].includes(currentStatus));
            const isCompleted = stepIndex < currentIndex || 
                              (step.key === 'draft' && currentIndex > 2);
            
            return (
              <View key={step.key} style={styles.statusTimelineStep}>
                <View style={[
                  styles.statusTimelineIcon,
                  isActive && styles.statusTimelineIconActive,
                  isCompleted && styles.statusTimelineIconCompleted,
                ]}>
                  <Ionicons 
                    name={step.icon as any} 
                    size={20} 
                    color={isActive ? colors.primaryForeground : isCompleted ? colors.successForeground : colors.mutedForeground} 
                  />
                </View>
                <Text style={[
                  styles.statusTimelineLabel,
                  isActive && styles.statusTimelineLabelActive,
                  isCompleted && styles.statusTimelineLabelCompleted,
                ]}>
                  {step.label}
                </Text>
                {index < arr.length - 1 && (
                  <View style={[
                    styles.statusTimelineLine,
                    (isCompleted || isActive) && styles.statusTimelineLineActive,
                  ]} />
                )}
              </View>
            );
          })}
        </View>
      </Card>

      <View style={[styles.statsGrid, { flexDirection: 'row', flexWrap: 'wrap' }]}>
        <Card style={[styles.statCard, { width: isLandscape ? (width - spacing.lg * 2 - spacing.md * 3) / 4 : (width - spacing.lg * 2 - spacing.md) / 2 }]}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
            <View style={styles.statIconGradientPurple}>
              <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.statValue}>{getTotalRevenue()}</Text>
          <Text style={styles.statLabel}>Incasso Totale</Text>
        </Card>
        <Card style={[styles.statCard, { width: isLandscape ? (width - spacing.lg * 2 - spacing.md * 3) / 4 : (width - spacing.lg * 2 - spacing.md) / 2 }]}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <View style={styles.statIconGradientGreen}>
              <Ionicons name="ticket-outline" size={24} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.statValue}>{getTicketsSold()}/{getTotalTickets()}</Text>
          <Text style={styles.statLabel}>Biglietti</Text>
        </Card>
        <Card style={[styles.statCard, { width: isLandscape ? (width - spacing.lg * 2 - spacing.md * 3) / 4 : (width - spacing.lg * 2 - spacing.md) / 2 }]}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <View style={styles.statIconGradientBlue}>
              <Ionicons name="people-outline" size={24} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.statValue}>{getGuestsCheckedIn()}</Text>
          <Text style={styles.statLabel}>Check-in</Text>
        </Card>
        <Card style={[styles.statCard, { width: isLandscape ? (width - spacing.lg * 2 - spacing.md * 3) / 4 : (width - spacing.lg * 2 - spacing.md) / 2 }]}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <View style={styles.statIconGradientAmber}>
              <Ionicons name="person-outline" size={24} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.statValue}>{getStaffOnDuty()}</Text>
          <Text style={styles.statLabel}>Staff Attivo</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Azioni Rapide</Text>
        <View style={styles.quickActionsGrid}>
          <Button
            title="Scanner"
            variant="outline"
            onPress={() => navigation.navigate('Scanner', { eventId })}
            icon={<Ionicons name="scan-outline" size={20} color={colors.foreground} />}
            style={styles.quickActionBtn}
          />
          <Button
            title="Check-in Lista"
            variant="outline"
            onPress={() => setActiveTab('lists')}
            icon={<Ionicons name="list-outline" size={20} color={colors.foreground} />}
            style={styles.quickActionBtn}
          />
          <Button
            title="Vendi Biglietto"
            variant="outline"
            onPress={() => navigation.navigate('CashierTicket', { eventId })}
            icon={<Ionicons name="ticket-outline" size={20} color={colors.foreground} />}
            style={styles.quickActionBtn}
          />
          <Button
            title="Report Live"
            variant="outline"
            onPress={() => setActiveTab('revenue')}
            icon={<Ionicons name="bar-chart-outline" size={20} color={colors.foreground} />}
            style={styles.quickActionBtn}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attività Recente</Text>
        {[
          { time: '23:45', action: 'Check-in', detail: 'Marco Rossi + 4 ospiti', icon: 'checkmark-circle' },
          { time: '23:42', action: 'Vendita Biglietto', detail: 'VIP - €50', icon: 'ticket' },
          { time: '23:38', action: 'Check-in', detail: 'Sara Neri + 3 ospiti', icon: 'checkmark-circle' },
          { time: '23:35', action: 'Prenotazione', detail: 'Tavolo 5 - €200', icon: 'restaurant' },
        ].map((activity, index) => (
          <Card key={index} style={styles.activityCard}>
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
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      );
    }

    if (errorTickets) {
      return (
        <Card style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorTickets}</Text>
          <Button
            title="Riprova"
            variant="primary"
            onPress={() => setReloadTickets(prev => prev + 1)}
            style={styles.retryButton}
          />
        </Card>
      );
    }

    const totalSold = ticketTypes.reduce((sum, t) => sum + (t.sold || 0), 0);
    const totalAvailable = ticketTypes.reduce((sum, t) => sum + ((t.total || 0) - (t.sold || 0)), 0);

    return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Riepilogo Biglietti</Text>
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
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{getTotalRevenue()}</Text>
            <Text style={styles.summaryLabel}>Incasso</Text>
          </View>
        </View>
      </Card>

      {ticketTypes.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="ticket-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun tipo di biglietto</Text>
        </Card>
      ) : (
        ticketTypes.map((ticket) => {
          const sold = ticket.sold || ticket.soldCount || 0;
          const total = ticket.total || ticket.totalCount || ticket.capacity || 1;
          const price = typeof ticket.price === 'number' ? `€ ${ticket.price.toLocaleString('it-IT')}` : (ticket.price || '€ 0');
          const revenue = typeof ticket.revenue === 'number' ? `€ ${ticket.revenue.toLocaleString('it-IT')}` : (ticket.revenue || '€ 0');
          
          return (
          <Card key={ticket.id} style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <View>
                <Text style={styles.ticketName}>{ticket.name || ticket.typeName}</Text>
                <Text style={styles.ticketPrice}>{price}</Text>
              </View>
              <Text style={styles.ticketRevenue}>{revenue}</Text>
            </View>
            <View style={styles.ticketProgress}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Venduti: {sold}/{total}</Text>
                <Text style={styles.progressPercentage}>
                  {total > 0 ? Math.round((sold / total) * 100) : 0}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${total > 0 ? (sold / total) * 100 : 0}%`,
                      backgroundColor: sold >= total ? colors.success : colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          </Card>
          );
        })
      )}
    </ScrollView>
  );
  };

  const renderNameChangesTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Cambi Nominativo</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{nameChanges.length}</Text>
            <Text style={styles.summaryLabel}>Totali</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {nameChanges.filter(nc => nc.status === 'completed').length}
            </Text>
            <Text style={styles.summaryLabel}>Completati</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>
              {nameChanges.filter(nc => nc.status === 'pending').length}
            </Text>
            <Text style={styles.summaryLabel}>In Attesa</Text>
          </View>
        </View>
      </Card>

      {loadingNameChanges ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      ) : errorNameChanges ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorNameChanges}</Text>
          <Button
            title="Riprova"
            variant="primary"
            onPress={() => {
              setErrorNameChanges(null);
              setActiveTab('overview');
              setTimeout(() => setActiveTab('name-changes'), 100);
            }}
            style={styles.retryButton}
          />
        </Card>
      ) : nameChanges.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="swap-horizontal-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun cambio nominativo</Text>
        </Card>
      ) : (
        nameChanges.map((nc) => (
          <Card key={nc.id} style={styles.trackingCard}>
            <View style={styles.trackingHeader}>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(nc.status)}20` }]}>
                <Text style={[styles.statusText, { color: getStatusColor(nc.status) }]}>
                  {nc.status === 'completed' ? 'Completato' : nc.status === 'pending' ? 'In Attesa' : nc.status === 'approved' ? 'Approvato' : nc.status === 'rejected' ? 'Rifiutato' : nc.status}
                </Text>
              </View>
              <Text style={styles.trackingDate}>
                {nc.requestedAt ? new Date(nc.requestedAt).toLocaleDateString('it-IT') : '-'}
              </Text>
            </View>
            
            <View style={styles.transferRow}>
              <View style={styles.transferPerson}>
                <Text style={styles.transferLabel}>VECCHIO</Text>
                <Text style={styles.transferName}>{nc.oldFirstName} {nc.oldLastName}</Text>
                {nc.oldFiscalSeal && (
                  <Text style={styles.fiscalSeal}>Sigillo: {nc.oldFiscalSeal}</Text>
                )}
                {nc.oldProgressiveNumber && (
                  <Text style={styles.progressiveNum}>N° {nc.oldProgressiveNumber}</Text>
                )}
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.primary} />
              <View style={styles.transferPerson}>
                <Text style={styles.transferLabel}>NUOVO</Text>
                <Text style={styles.transferName}>{nc.newFirstName} {nc.newLastName}</Text>
                {nc.newFiscalSeal && (
                  <Text style={styles.fiscalSeal}>Sigillo: {nc.newFiscalSeal}</Text>
                )}
                {nc.newProgressiveNumber && (
                  <Text style={styles.progressiveNum}>N° {nc.newProgressiveNumber}</Text>
                )}
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );

  const renderResalesTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Rivendite Biglietti</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{resales.length}</Text>
            <Text style={styles.summaryLabel}>Totali</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {resales.filter(r => r.status === 'completed').length}
            </Text>
            <Text style={styles.summaryLabel}>Completate</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>
              {resales.filter(r => r.status === 'listed').length}
            </Text>
            <Text style={styles.summaryLabel}>In Vendita</Text>
          </View>
        </View>
      </Card>

      {loadingResales ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      ) : errorResales ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorResales}</Text>
          <Button
            title="Riprova"
            variant="primary"
            onPress={() => {
              setErrorResales(null);
              setActiveTab('overview');
              setTimeout(() => setActiveTab('resales'), 100);
            }}
            style={styles.retryButton}
          />
        </Card>
      ) : resales.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="repeat-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuna rivendita</Text>
        </Card>
      ) : (
        resales.map((resale) => (
          <Card key={resale.id} style={styles.trackingCard}>
            <View style={styles.trackingHeader}>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(resale.status)}20` }]}>
                <Text style={[styles.statusText, { color: getStatusColor(resale.status) }]}>
                  {resale.status === 'completed' ? 'Completata' : resale.status === 'listed' ? 'In Vendita' : resale.status === 'reserved' ? 'Riservata' : resale.status === 'cancelled' ? 'Annullata' : resale.status}
                </Text>
              </View>
              <Text style={styles.resalePrice}>€ {resale.resalePrice}</Text>
            </View>
            
            <View style={styles.transferRow}>
              <View style={styles.transferPerson}>
                <Text style={styles.transferLabel}>VENDITORE</Text>
                <Text style={styles.transferName}>{resale.sellerFirstName} {resale.sellerLastName}</Text>
                {resale.oldFiscalSeal && (
                  <Text style={styles.fiscalSeal}>Sigillo: {resale.oldFiscalSeal}</Text>
                )}
                {resale.oldProgressiveNumber && (
                  <Text style={styles.progressiveNum}>N° {resale.oldProgressiveNumber}</Text>
                )}
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.primary} />
              <View style={styles.transferPerson}>
                <Text style={styles.transferLabel}>ACQUIRENTE</Text>
                {resale.buyerFirstName && resale.buyerLastName ? (
                  <>
                    <Text style={styles.transferName}>{resale.buyerFirstName} {resale.buyerLastName}</Text>
                    {resale.newFiscalSeal && (
                      <Text style={styles.fiscalSeal}>Sigillo: {resale.newFiscalSeal}</Text>
                    )}
                    {resale.newProgressiveNumber && (
                      <Text style={styles.progressiveNum}>N° {resale.newProgressiveNumber}</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.transferNamePending}>In attesa...</Text>
                )}
              </View>
            </View>

            <View style={styles.resaleFooter}>
              <Text style={styles.trackingDate}>
                {resale.createdAt ? new Date(resale.createdAt).toLocaleDateString('it-IT') : '-'}
              </Text>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );

  const renderListsTab = () => {
    if (loadingLists) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      );
    }

    if (errorLists) {
      return (
        <Card style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorLists}</Text>
          <Button
            title="Riprova"
            variant="primary"
            onPress={() => setReloadLists(prev => prev + 1)}
            style={styles.retryButton}
          />
        </Card>
      );
    }

    return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Riepilogo Liste</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{guestLists.length}</Text>
            <Text style={styles.summaryLabel}>Prenotazioni</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>
              {guestLists.reduce((sum, g) => sum + g.guests, 0)}
            </Text>
            <Text style={styles.summaryLabel}>Ospiti Totali</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {guestLists.filter((g) => g.status === 'checked-in').length}
            </Text>
            <Text style={styles.summaryLabel}>Check-in</Text>
          </View>
        </View>
      </Card>

      {guestLists.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="list-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuna lista ospiti</Text>
        </Card>
      ) : (
        guestLists.map((entry) => (
          <Card key={entry.id} style={styles.listEntryCard}>
            <View style={styles.listEntryHeader}>
              <View>
                <Text style={styles.listEntryName}>{entry.name}</Text>
                <Text style={styles.listEntryPr}>PR: {entry.prName}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(entry.status)}20` }]}>
                <Text style={[styles.statusText, { color: getStatusColor(entry.status) }]}>
                  {entry.status === 'checked-in' ? 'Entrato' : entry.status === 'confirmed' ? 'Confermato' : 'In attesa'}
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
                  size="sm"
                  onPress={() => {}}
                />
              )}
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
  };

  const renderStaffTab = () => {
    if (loadingStaff) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      );
    }

    if (errorStaff) {
      return (
        <Card style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorStaff}</Text>
          <Button
            title="Riprova"
            variant="primary"
            onPress={() => setReloadStaff(prev => prev + 1)}
            style={styles.retryButton}
          />
        </Card>
      );
    }

    return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.summaryCard}>
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
        <Card style={styles.emptyCard}>
          <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuno staff assegnato</Text>
        </Card>
      ) : (
        staffMembers.map((member) => (
          <Card key={member.id} style={styles.staffCard}>
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
        ))
      )}
    </ScrollView>
  );
  };

  const renderRevenueTab = () => {
    if (loadingRevenue) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      );
    }

    if (errorRevenue) {
      return (
        <Card style={styles.emptyCard}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{errorRevenue}</Text>
          <Button
            title="Riprova"
            variant="primary"
            onPress={() => setReloadRevenue(prev => prev + 1)}
            style={styles.retryButton}
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
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.revenueCard} variant="elevated">
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
          <Card style={styles.emptyCard}>
            <Ionicons name="pie-chart-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun dato disponibile</Text>
          </Card>
        ) : (
          revenueBreakdown.map((item: any, index: number) => (
            <Card key={index} style={styles.breakdownCard}>
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
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Metodi di Pagamento</Text>
        <Card style={styles.paymentCard}>
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
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.placeholderCard}>
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
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.placeholderCard}>
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
    <View style={styles.container}>
      <Header
        title="Centro Controllo"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity data-testid="button-settings">
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

      <View style={[styles.contentContainer, { paddingBottom: insets.bottom + 80 }]}>
        {renderTabContent()}
      </View>
    </View>
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
  ticketCard: {
    marginBottom: spacing.md,
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
  listEntryCard: {
    marginBottom: spacing.md,
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
  staffCard: {
    marginBottom: spacing.md,
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
  trackingCard: {
    marginBottom: spacing.md,
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
    fontStyle: 'italic',
  },
  fiscalSeal: {
    color: colors.primary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  progressiveNum: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.mutedForeground,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.mutedForeground,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.destructive,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
  },
  resalePrice: {
    color: colors.success,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  resaleFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statIconGradientPurple: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  statIconGradientGreen: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  statIconGradientBlue: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  statIconGradientAmber: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  statusTimelineCard: {
    marginBottom: spacing.lg,
  },
  statusTimelineTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  statusTimeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statusTimelineStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  statusTimelineIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    zIndex: 1,
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
    fontWeight: fontWeight.medium,
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
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: colors.muted,
    zIndex: 0,
  },
  statusTimelineLineActive: {
    backgroundColor: colors.success,
  },
  placeholderCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  placeholderTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  placeholderDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  placeholderBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  placeholderBadgeText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  placeholderButton: {
    marginTop: spacing.md,
  },
});
