import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Button, Header } from '../../components';

type TabKey = 'overview' | 'tickets' | 'lists' | 'staff' | 'revenue' | 'name-changes' | 'resales';

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

const { width } = Dimensions.get('window');

const tabs: Tab[] = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline' },
  { key: 'tickets', label: 'Biglietti', icon: 'ticket-outline' },
  { key: 'name-changes', label: 'Cambi Nom.', icon: 'swap-horizontal-outline' },
  { key: 'resales', label: 'Rivendite', icon: 'repeat-outline' },
  { key: 'lists', label: 'Liste', icon: 'list-outline' },
  { key: 'staff', label: 'Staff', icon: 'people-outline' },
  { key: 'revenue', label: 'Incassi', icon: 'wallet-outline' },
];

export function EventHubScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>(route.params?.tab || 'overview');
  const [nameChanges, setNameChanges] = useState<SiaeNameChange[]>([]);
  const [resales, setResales] = useState<SiaeResale[]>([]);
  const [loadingNameChanges, setLoadingNameChanges] = useState(false);
  const [loadingResales, setLoadingResales] = useState(false);
  const [errorNameChanges, setErrorNameChanges] = useState<string | null>(null);
  const [errorResales, setErrorResales] = useState<string | null>(null);

  const eventId = route.params?.eventId || '1';

  // Reset data when eventId changes
  useEffect(() => {
    setNameChanges([]);
    setResales([]);
    setErrorNameChanges(null);
    setErrorResales(null);
  }, [eventId]);

  // Fetch name changes
  useEffect(() => {
    if (activeTab !== 'name-changes') return;
    
    const loadNameChanges = async () => {
      setLoadingNameChanges(true);
      setErrorNameChanges(null);
      try {
        const response = await fetch(`/api/siae/ticketed-events/${eventId}/name-changes`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setNameChanges(data);
        } else {
          setErrorNameChanges('Errore nel caricamento');
        }
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
        const response = await fetch(`/api/siae/ticketed-events/${eventId}/resales`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setResales(data);
        } else {
          setErrorResales('Errore nel caricamento');
        }
      } catch (e) {
        setErrorResales('Errore di connessione');
      }
      setLoadingResales(false);
    };
    loadResales();
  }, [activeTab, eventId]);

  const eventData = {
    id: eventId,
    name: 'Festival Notte d\'Estate',
    date: '14 Gennaio 2026',
    time: '22:00 - 04:00',
    venue: 'Arena Milano',
    status: 'live' as const,
    totalRevenue: '€ 13.500',
    ticketsSold: 450,
    totalTickets: 500,
    guestsCheckedIn: 280,
    staffOnDuty: 12,
  };

  const ticketTypes: TicketType[] = [
    { id: '1', name: 'Standard', price: '€ 25', sold: 280, total: 300, revenue: '€ 7.000' },
    { id: '2', name: 'VIP', price: '€ 50', sold: 120, total: 150, revenue: '€ 6.000' },
    { id: '3', name: 'Tavolo', price: '€ 200', sold: 25, total: 30, revenue: '€ 5.000' },
    { id: '4', name: 'Early Bird', price: '€ 20', sold: 25, total: 20, revenue: '€ 500' },
  ];

  const guestLists: GuestListEntry[] = [
    { id: '1', name: 'Marco Rossi', guests: 4, status: 'checked-in', prName: 'Giulia PR' },
    { id: '2', name: 'Anna Bianchi', guests: 2, status: 'confirmed', prName: 'Giulia PR' },
    { id: '3', name: 'Luca Verdi', guests: 6, status: 'pending', prName: 'Andrea PR' },
    { id: '4', name: 'Sara Neri', guests: 3, status: 'checked-in', prName: 'Marco PR' },
    { id: '5', name: 'Paolo Gialli', guests: 5, status: 'confirmed', prName: 'Andrea PR' },
  ];

  const staffMembers: StaffMember[] = [
    { id: '1', name: 'Giulia Rossi', role: 'PR Manager', status: 'active', checkInTime: '21:45' },
    { id: '2', name: 'Andrea Bianchi', role: 'PR', status: 'active', checkInTime: '21:50' },
    { id: '3', name: 'Marco Verdi', role: 'PR', status: 'active', checkInTime: '21:55' },
    { id: '4', name: 'Laura Neri', role: 'Cassiere', status: 'active', checkInTime: '21:30' },
    { id: '5', name: 'Fabio Gialli', role: 'Scanner', status: 'break', checkInTime: '21:45' },
    { id: '6', name: 'Elena Blu', role: 'Scanner', status: 'active', checkInTime: '21:40' },
  ];

  const revenueBreakdown = [
    { label: 'Biglietti', value: '€ 18.500', percentage: 68, color: colors.primary },
    { label: 'Tavoli', value: '€ 5.000', percentage: 18, color: colors.accent },
    { label: 'Bevande', value: '€ 3.200', percentage: 12, color: colors.success },
    { label: 'Altro', value: '€ 540', percentage: 2, color: colors.warning },
  ];

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

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.eventInfoCard} variant="elevated">
        <View style={styles.eventHeader}>
          <View>
            <Text style={styles.eventName}>{eventData.name}</Text>
            <View style={styles.eventMeta}>
              <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.eventMetaText}>{eventData.date} • {eventData.time}</Text>
            </View>
            <View style={styles.eventMeta}>
              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.eventMetaText}>{eventData.venue}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(eventData.status)}20` }]}>
            <View style={[styles.liveDot, { backgroundColor: getStatusColor(eventData.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(eventData.status) }]}>
              In Corso
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Ionicons name="wallet-outline" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{eventData.totalRevenue}</Text>
          <Text style={styles.statLabel}>Incasso Totale</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="ticket-outline" size={24} color={colors.success} />
          <Text style={styles.statValue}>{eventData.ticketsSold}/{eventData.totalTickets}</Text>
          <Text style={styles.statLabel}>Biglietti</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="people-outline" size={24} color={colors.accent} />
          <Text style={styles.statValue}>{eventData.guestsCheckedIn}</Text>
          <Text style={styles.statLabel}>Check-in</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="person-outline" size={24} color={colors.warning} />
          <Text style={styles.statValue}>{eventData.staffOnDuty}</Text>
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

  const renderTicketsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Riepilogo Biglietti</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{eventData.ticketsSold}</Text>
            <Text style={styles.summaryLabel}>Venduti</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{eventData.totalTickets - eventData.ticketsSold}</Text>
            <Text style={styles.summaryLabel}>Disponibili</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{eventData.totalRevenue}</Text>
            <Text style={styles.summaryLabel}>Incasso</Text>
          </View>
        </View>
      </Card>

      {ticketTypes.map((ticket) => (
        <Card key={ticket.id} style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View>
              <Text style={styles.ticketName}>{ticket.name}</Text>
              <Text style={styles.ticketPrice}>{ticket.price}</Text>
            </View>
            <Text style={styles.ticketRevenue}>{ticket.revenue}</Text>
          </View>
          <View style={styles.ticketProgress}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Venduti: {ticket.sold}/{ticket.total}</Text>
              <Text style={styles.progressPercentage}>
                {Math.round((ticket.sold / ticket.total) * 100)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(ticket.sold / ticket.total) * 100}%`,
                    backgroundColor: ticket.sold >= ticket.total ? colors.success : colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </Card>
      ))}
    </ScrollView>
  );

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

  const renderListsTab = () => (
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

      {guestLists.map((entry) => (
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
      ))}
    </ScrollView>
  );

  const renderStaffTab = () => (
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

      {staffMembers.map((member) => (
        <Card key={member.id} style={styles.staffCard}>
          <View style={styles.staffHeader}>
            <View style={styles.staffAvatar}>
              <Text style={styles.staffInitials}>
                {member.name.split(' ').map((n) => n[0]).join('')}
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
    </ScrollView>
  );

  const renderRevenueTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.revenueCard} variant="elevated">
        <Text style={styles.revenueTotalLabel}>Incasso Totale</Text>
        <Text style={styles.revenueTotalValue}>€ 27.240</Text>
        <View style={styles.revenueTrend}>
          <Ionicons name="trending-up" size={16} color={colors.success} />
          <Text style={styles.revenueTrendText}>+15% rispetto a evento precedente</Text>
        </View>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suddivisione Incassi</Text>
        {revenueBreakdown.map((item, index) => (
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
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Metodi di Pagamento</Text>
        <Card style={styles.paymentCard}>
          <View style={styles.paymentRow}>
            <View style={styles.paymentMethod}>
              <Ionicons name="card-outline" size={20} color={colors.primary} />
              <Text style={styles.paymentLabel}>Carte</Text>
            </View>
            <Text style={styles.paymentValue}>€ 18.450</Text>
          </View>
          <View style={styles.paymentDivider} />
          <View style={styles.paymentRow}>
            <View style={styles.paymentMethod}>
              <Ionicons name="cash-outline" size={20} color={colors.success} />
              <Text style={styles.paymentLabel}>Contanti</Text>
            </View>
            <Text style={styles.paymentValue}>€ 8.790</Text>
          </View>
        </Card>
      </View>
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
      case 'lists':
        return renderListsTab();
      case 'staff':
        return renderStaffTab();
      case 'revenue':
        return renderRevenueTab();
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
    width: (width - spacing.lg * 2 - spacing.md) / 2,
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
    minWidth: (width - spacing.lg * 2 - spacing.md) / 2,
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
});
