import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  RefreshControl, 
  ScrollView, 
  TextInput,
  Modal,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
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
import api, { 
  EventHubData, 
  EventHubTicketing, 
  EventHubGuest, 
  EventHubTable, 
  EventHubStaff, 
  EventHubInventory, 
  EventHubFinance,
  EventHubPR,
  EventHubAccess,
  EventHubSale,
  TableReservation,
  TableGuestEntry,
  GuestChangeRequest,
} from '@/lib/api';

type TabType = 'overview' | 'ticketing' | 'guestlists' | 'tables' | 'staff' | 'pr' | 'access' | 'inventory' | 'finance';

interface GestoreEventHubScreenProps {
  onBack: () => void;
  eventId?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function GestoreEventHubScreen({ onBack, eventId }: GestoreEventHubScreenProps) {
  const { colors, gradients } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data, setData] = useState<EventHubData | null>(null);
  const [ticketing, setTicketing] = useState<EventHubTicketing | null>(null);
  const [guests, setGuests] = useState<EventHubGuest[]>([]);
  const [tables, setTables] = useState<EventHubTable[]>([]);
  const [staff, setStaff] = useState<EventHubStaff[]>([]);
  const [prs, setPRs] = useState<EventHubPR[]>([]);
  const [accesses, setAccesses] = useState<EventHubAccess[]>([]);
  const [sales, setSales] = useState<EventHubSale[]>([]);
  const [inventory, setInventory] = useState<EventHubInventory | null>(null);
  const [finance, setFinance] = useState<EventHubFinance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [showBookTableModal, setShowBookTableModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<EventHubTable | null>(null);
  const [guestForm, setGuestForm] = useState({ name: '', email: '', phone: '' });
  const [tableForm, setTableForm] = useState({ customerName: '', guestCount: '2', notes: '' });
  const [tableReservations, setTableReservations] = useState<TableReservation[]>([]);
  const [expandedReservation, setExpandedReservation] = useState<string | null>(null);
  const [reservationGuests, setReservationGuests] = useState<Record<string, TableGuestEntry[]>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [guestChangeRequests, setGuestChangeRequests] = useState<GuestChangeRequest[]>([]);
  const [approvingChangeId, setApprovingChangeId] = useState<string | null>(null);
  const [rejectingChangeId, setRejectingChangeId] = useState<string | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const eventStatusRef = useRef<string | null>(null);

  useEffect(() => {
    eventStatusRef.current = data?.event.status || null;
  }, [data?.event.status]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (eventStatusRef.current === 'live') {
        loadData();
      }
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [eventId]);

  useEffect(() => {
    if (data?.event.status === 'live') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [data?.event.status]);

  useEffect(() => {
    if (eventId && activeTab !== 'overview') {
      loadTabData(activeTab);
    }
  }, [activeTab, eventId]);

  const loadData = async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      setHasError(false);
      const hubData = await api.getEventHubData(eventId);
      setData(hubData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading event hub data:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTabData = async (tab: TabType) => {
    if (!eventId) return;
    try {
      switch (tab) {
        case 'ticketing':
          const [ticketingData, salesData] = await Promise.all([
            api.getEventHubTicketing(eventId),
            api.getEventHubSales(eventId),
          ]);
          setTicketing(ticketingData);
          setSales(salesData);
          break;
        case 'guestlists':
          const guestsData = await api.getEventHubGuests(eventId);
          setGuests(guestsData);
          break;
        case 'tables':
          const [reservationsData, changeRequestsData] = await Promise.all([
            api.getEventReservations(eventId),
            api.getEventGuestChangeRequests(eventId),
          ]);
          setTableReservations(reservationsData);
          setGuestChangeRequests(changeRequestsData);
          break;
        case 'staff':
          const staffData = await api.getEventHubStaff(eventId);
          setStaff(staffData);
          break;
        case 'pr':
          const prData = await api.getEventHubPRs(eventId);
          setPRs(prData);
          break;
        case 'access':
          const accessData = await api.getEventHubAccesses(eventId);
          setAccesses(accessData);
          break;
        case 'inventory':
          const inventoryData = await api.getEventHubInventory(eventId);
          setInventory(inventoryData);
          break;
        case 'finance':
          const financeData = await api.getEventHubFinance(eventId);
          setFinance(financeData);
          break;
      }
    } catch (error) {
      console.error(`Error loading ${tab} data:`, error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (activeTab !== 'overview') {
      await loadTabData(activeTab);
    }
    setRefreshing(false);
  };

  const handleCheckIn = async (guest: EventHubGuest) => {
    if (!eventId || guest.checkedIn) return;
    try {
      await api.checkInGuest(eventId, guest.id);
      triggerHaptic('success');
      setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, checkedIn: true, checkInTime: new Date().toISOString() } : g));
      loadData();
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Errore', 'Impossibile effettuare il check-in');
    }
  };

  const handleAddGuest = async () => {
    if (!eventId || !guestForm.name.trim()) return;
    try {
      await api.addEventGuest(eventId, guestForm);
      triggerHaptic('success');
      setShowAddGuestModal(false);
      setGuestForm({ name: '', email: '', phone: '' });
      loadTabData('guestlists');
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Errore', 'Impossibile aggiungere ospite');
    }
  };

  const handleBookTable = async () => {
    if (!eventId || !selectedTable || !tableForm.customerName.trim()) return;
    try {
      await api.bookEventTable(eventId, {
        tableId: selectedTable.id,
        customerName: tableForm.customerName,
        guestCount: parseInt(tableForm.guestCount) || 2,
        notes: tableForm.notes,
      });
      triggerHaptic('success');
      setShowBookTableModal(false);
      setSelectedTable(null);
      setTableForm({ customerName: '', guestCount: '2', notes: '' });
      loadTabData('tables');
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Errore', 'Impossibile prenotare tavolo');
    }
  };

  const handleReleaseTable = async (table: EventHubTable) => {
    if (!eventId) return;
    Alert.alert('Libera Tavolo', `Liberare ${table.name}?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Libera', style: 'destructive', onPress: async () => {
        try {
          await api.releaseEventTable(eventId, table.id);
          triggerHaptic('success');
          loadTabData('tables');
        } catch {
          triggerHaptic('error');
          Alert.alert('Errore', 'Impossibile liberare tavolo');
        }
      }},
    ]);
  };

  const handleApproveReservation = async (reservationId: string) => {
    try {
      setApprovingId(reservationId);
      await api.approveReservation(reservationId);
      triggerHaptic('success');
      Alert.alert('Successo', 'Prenotazione approvata');
      loadTabData('tables');
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile approvare');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectReservation = async (reservationId: string) => {
    Alert.alert(
      'Rifiuta Prenotazione',
      'Sei sicuro di voler rifiutare questa prenotazione?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rifiuta',
          style: 'destructive',
          onPress: async () => {
            try {
              setRejectingId(reservationId);
              await api.rejectReservation(reservationId);
              triggerHaptic('medium');
              Alert.alert('Fatto', 'Prenotazione rifiutata');
              loadTabData('tables');
            } catch (error: any) {
              Alert.alert('Errore', error.message || 'Impossibile rifiutare');
            } finally {
              setRejectingId(null);
            }
          },
        },
      ]
    );
  };

  const toggleReservationGuests = async (reservationId: string) => {
    if (expandedReservation === reservationId) {
      setExpandedReservation(null);
      return;
    }
    setExpandedReservation(reservationId);
    if (!reservationGuests[reservationId]) {
      try {
        const guests = await api.getReservationGuests(reservationId);
        setReservationGuests(prev => ({ ...prev, [reservationId]: guests }));
      } catch (error) {
        console.error('Error loading guests:', error);
      }
    }
  };

  const handleApproveGuestChange = async (requestId: string) => {
    try {
      setApprovingChangeId(requestId);
      await api.approveGuestChangeRequest(requestId);
      triggerHaptic('success');
      Alert.alert('Successo', 'Richiesta approvata e modifica applicata');
      loadTabData('tables');
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile approvare');
    } finally {
      setApprovingChangeId(null);
    }
  };

  const handleRejectGuestChange = async (requestId: string) => {
    Alert.alert(
      'Rifiuta Richiesta',
      'Sei sicuro di voler rifiutare questa richiesta?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rifiuta',
          style: 'destructive',
          onPress: async () => {
            try {
              setRejectingChangeId(requestId);
              await api.rejectGuestChangeRequest(requestId);
              triggerHaptic('medium');
              Alert.alert('Fatto', 'Richiesta rifiutata');
              loadTabData('tables');
            } catch (error: any) {
              Alert.alert('Errore', error.message || 'Impossibile rifiutare');
            } finally {
              setRejectingChangeId(null);
            }
          },
        },
      ]
    );
  };

  const lowStockCount = inventory?.lowStock?.length || 0;

  const tabs: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: 'grid-outline' },
    { id: 'ticketing', label: 'Biglietti', icon: 'ticket-outline' },
    { id: 'guestlists', label: 'Liste', icon: 'people-outline' },
    { id: 'tables', label: 'Tavoli', icon: 'restaurant-outline' },
    { id: 'staff', label: 'Staff', icon: 'person-outline' },
    { id: 'pr', label: 'PR', icon: 'megaphone-outline' },
    { id: 'access', label: 'Accessi', icon: 'log-in-outline' },
    { id: 'inventory', label: 'Inventario', icon: 'cube-outline', badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'finance', label: 'Finanze', icon: 'wallet-outline' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return staticColors.success;
      case 'upcoming': return staticColors.primary;
      case 'ended': return colors.mutedForeground;
      default: return colors.mutedForeground;
    }
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

  const filteredGuests = guests.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (hasError) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-event-hub" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>Errore di caricamento</Text>
          <Text style={[styles.errorMessage, { color: colors.mutedForeground }]}>
            Impossibile caricare i dati dell'evento
          </Text>
          <Pressable style={[styles.retryButton, { backgroundColor: staticColors.primary }]} onPress={loadData}>
            <Text style={styles.retryText}>Riprova</Text>
          </Pressable>
        </View>
      </SafeArea>
    );
  }

  if (isLoading && !data) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-event-hub" />
        <Loading text="Caricamento Hub Evento..." />
      </SafeArea>
    );
  }

  const renderOverview = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.overviewContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {data?.event.status === 'live' && (
        <LinearGradient colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.05)']} style={styles.liveBanner}>
          <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={[styles.liveText, { color: staticColors.success }]}>EVENTO IN CORSO</Text>
          <Text style={[styles.liveTime, { color: colors.mutedForeground }]}>
            Aggiornato: {lastUpdate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </LinearGradient>
      )}

      <View style={styles.statsGrid}>
        <GlassCard style={styles.statCard} testID="stat-checkedin">
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="enter" size={24} color={staticColors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{data?.overview?.guestsCheckedIn || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Check-in</Text>
        </GlassCard>

        <GlassCard style={styles.statCard} testID="stat-capacity">
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
            <Ionicons name="people" size={24} color={staticColors.teal} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {data?.overview?.guestsCheckedIn || 0}/{data?.overview?.totalCapacity || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Capienza</Text>
        </GlassCard>

        <GlassCard style={styles.statCard} testID="stat-tickets">
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.purple}20` }]}>
            <Ionicons name="ticket" size={24} color={staticColors.purple} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{data?.overview?.ticketsSold || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Biglietti</Text>
        </GlassCard>

        <GlassCard style={styles.statCard} testID="stat-revenue">
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
            <Ionicons name="cash" size={24} color={staticColors.golden} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{formatCurrency(data?.overview?.revenue || 0)}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Incasso</Text>
        </GlassCard>

        <GlassCard style={styles.statCard} testID="stat-tables">
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.pink}20` }]}>
            <Ionicons name="restaurant" size={24} color={staticColors.pink} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{data?.overview?.tablesBooked || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Tavoli</Text>
        </GlassCard>

        <GlassCard style={styles.statCard} testID="stat-staff">
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
            <Ionicons name="person" size={24} color={staticColors.teal} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{data?.overview?.staffOnDuty || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Staff</Text>
        </GlassCard>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Azioni Rapide</Text>
      <View style={styles.quickActions}>
        <Pressable 
          style={[styles.quickAction, { backgroundColor: staticColors.primary }]} 
          onPress={() => { setActiveTab('guestlists'); setShowAddGuestModal(true); }}
          testID="action-add-guest"
        >
          <Ionicons name="person-add" size={24} color="#000" />
          <Text style={styles.quickActionText}>Aggiungi Ospite</Text>
        </Pressable>
        <Pressable 
          style={[styles.quickAction, { backgroundColor: staticColors.teal }]} 
          onPress={() => setActiveTab('tables')}
          testID="action-book-table"
        >
          <Ionicons name="restaurant" size={24} color="#000" />
          <Text style={styles.quickActionText}>Prenota Tavolo</Text>
        </Pressable>
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderTicketing = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Vendite per Tipo</Text>
      {ticketing?.soldByType?.map((item, index) => (
        <Card key={index} style={styles.saleTypeCard} testID={`sale-type-${index}`}>
          <View style={styles.saleTypeInfo}>
            <Text style={[styles.saleTypeName, { color: colors.foreground }]}>{item.type}</Text>
            <Badge variant="secondary" size="sm">{item.count} venduti</Badge>
          </View>
          <Text style={[styles.saleTypeRevenue, { color: staticColors.primary }]}>{formatCurrency(item.revenue)}</Text>
        </Card>
      ))}

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: spacing.lg }]}>Ultime Vendite</Text>
      {sales.slice(0, 10).map((sale) => (
        <Card key={sale.id} style={styles.saleCard} testID={`sale-${sale.id}`}>
          <View style={[styles.saleIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="ticket" size={20} color={staticColors.primary} />
          </View>
          <View style={styles.saleInfo}>
            <Text style={[styles.saleName, { color: colors.foreground }]}>{sale.ticketType}</Text>
            <Text style={[styles.saleTime, { color: colors.mutedForeground }]}>
              {new Date(sale.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.saleRight}>
            <Text style={[styles.saleAmount, { color: staticColors.primary }]}>{formatCurrency(sale.amount)}</Text>
            <Badge variant={sale.status === 'confirmed' ? 'success' : sale.status === 'refunded' ? 'destructive' : 'warning'} size="sm">
              {sale.status === 'confirmed' ? 'Confermato' : sale.status === 'refunded' ? 'Rimborsato' : 'In Attesa'}
            </Badge>
          </View>
        </Card>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderGuestLists = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchText, { color: colors.foreground }]}
            placeholder="Cerca ospiti..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-guests"
          />
        </View>
      </View>

      <View style={styles.guestStats}>
        <Badge variant="success" size="sm">
          {guests.filter(g => g.checkedIn).length} check-in
        </Badge>
        <Badge variant="secondary" size="sm">
          {guests.filter(g => !g.checkedIn).length} in attesa
        </Badge>
      </View>

      <FlatList
        data={filteredGuests}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <Card style={styles.guestCard} testID={`guest-${item.id}`}>
            <View style={styles.guestInfo}>
              <View style={[styles.guestAvatar, { backgroundColor: item.checkedIn ? `${staticColors.success}20` : `${colors.mutedForeground}20` }]}>
                <Ionicons name={item.checkedIn ? 'checkmark-circle' : 'person'} size={24} color={item.checkedIn ? staticColors.success : colors.mutedForeground} />
              </View>
              <View style={styles.guestDetails}>
                <Text style={[styles.guestName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.guestEmail, { color: colors.mutedForeground }]}>{item.email}</Text>
                <Badge variant={item.checkedIn ? 'success' : 'secondary'} size="sm">
                  {item.ticketType}
                </Badge>
              </View>
            </View>
            {!item.checkedIn ? (
              <Pressable 
                style={[styles.checkinButton, { backgroundColor: staticColors.success }]}
                onPress={() => handleCheckIn(item)}
                testID={`checkin-${item.id}`}
              >
                <Ionicons name="checkmark" size={20} color="#FFF" />
                <Text style={styles.checkinButtonText}>Check-in</Text>
              </Pressable>
            ) : (
              <View style={styles.checkedInInfo}>
                <Ionicons name="checkmark-circle" size={24} color={staticColors.success} />
                <Text style={[styles.checkedInTime, { color: colors.mutedForeground }]}>
                  {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
              </View>
            )}
          </Card>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nessun ospite trovato</Text>
          </View>
        }
      />

      <Pressable 
        style={[styles.fab, { backgroundColor: staticColors.primary }]} 
        onPress={() => setShowAddGuestModal(true)}
        testID="button-add-guest"
      >
        <Ionicons name="person-add" size={24} color="#000" />
      </Pressable>
    </View>
  );

  const renderTables = () => {
    const pendingRes = tableReservations.filter(r => r.status === 'pending');
    const approvedRes = tableReservations.filter(r => r.status === 'approved' || r.status === 'confirmed');
    const rejectedRes = tableReservations.filter(r => r.status === 'rejected');

    return (
      <ScrollView 
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.tableStats}>
          <Badge variant="warning" size="sm">{pendingRes.length} in attesa</Badge>
          <Badge variant="success" size="sm">{approvedRes.length} confermate</Badge>
          {rejectedRes.length > 0 && <Badge variant="destructive" size="sm">{rejectedRes.length} rifiutate</Badge>}
        </View>

        {guestChangeRequests.filter(r => r.status === 'pending').length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={[styles.sectionTitle, { color: staticColors.golden }]}>
              Richieste Modifica Ospiti ({guestChangeRequests.filter(r => r.status === 'pending').length})
            </Text>
            {guestChangeRequests.filter(r => r.status === 'pending').map(req => (
              <Card key={req.id} style={{...styles.tableCard, borderColor: req.requestType === 'add' ? `${staticColors.success}40` : `${staticColors.destructive}40`}} testID={`guest-change-${req.id}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm, flexWrap: 'wrap' }}>
                  <Badge 
                    variant={req.requestType === 'add' ? 'success' : 'destructive'} 
                    size="sm"
                  >
                    {req.requestType === 'add' ? 'Aggiunta' : 'Rimozione'}
                  </Badge>
                  <Text style={[styles.tableCapacity, { color: colors.mutedForeground }]}>
                    Tavolo: {req.reservationName || 'N/D'}
                  </Text>
                </View>
                <Text style={[styles.tableName, { color: colors.foreground }]}>
                  {req.requestType === 'add' 
                    ? `${req.firstName} ${req.lastName}`
                    : `${req.guestFirstName || ''} ${req.guestLastName || ''}`
                  }
                </Text>
                {req.requestType === 'add' && req.phone && (
                  <Text style={[styles.tableCapacity, { color: colors.mutedForeground, marginTop: 2 }]}>
                    {req.phone}{req.gender ? ` • ${req.gender}` : ''}
                  </Text>
                )}
                {req.notes && (
                  <Text style={[styles.tableCapacity, { color: colors.mutedForeground, marginTop: 2 }]}>
                    Note: {req.notes}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Button
                    variant="default"
                    size="sm"
                    onPress={() => handleApproveGuestChange(req.id)}
                    loading={approvingChangeId === req.id}
                    style={{ flex: 1 }}
                    testID={`btn-approve-change-${req.id}`}
                  >
                    Approva
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => handleRejectGuestChange(req.id)}
                    loading={rejectingChangeId === req.id}
                    style={{ flex: 1 }}
                    testID={`btn-reject-change-${req.id}`}
                  >
                    Rifiuta
                  </Button>
                </View>
              </Card>
            ))}
          </View>
        )}

        {pendingRes.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={[styles.sectionTitle, { color: staticColors.golden }]}>
              In Attesa di Approvazione ({pendingRes.length})
            </Text>
            {pendingRes.map(reservation => (
              <Card key={reservation.id} style={{...styles.tableCard, borderColor: `${staticColors.golden}40`}} testID={`pending-res-${reservation.id}`}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tableName, { color: colors.foreground }]}>{reservation.reservationName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4, flexWrap: 'wrap' }}>
                      {reservation.tableTypeName && (
                        <Badge variant="outline" size="sm">{reservation.tableTypeName}</Badge>
                      )}
                      {reservation.createdByRole === 'pr' && (
                        <Badge variant="secondary" size="sm">PR</Badge>
                      )}
                    </View>
                    {reservation.reservationPhone && (
                      <Text style={[styles.tableCapacity, { color: colors.mutedForeground, marginTop: 4 }]}>
                        {reservation.reservationPhone}
                      </Text>
                    )}
                    {reservation.notes && (
                      <Text style={[styles.tableCapacity, { color: colors.mutedForeground, marginTop: 2 }]}>
                        Note: {reservation.notes}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Button
                    variant="default"
                    size="sm"
                    onPress={() => handleApproveReservation(reservation.id)}
                    loading={approvingId === reservation.id}
                    style={{ flex: 1 }}
                    testID={`btn-approve-${reservation.id}`}
                  >
                    Approva
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => handleRejectReservation(reservation.id)}
                    loading={rejectingId === reservation.id}
                    style={{ flex: 1 }}
                    testID={`btn-reject-${reservation.id}`}
                  >
                    Rifiuta
                  </Button>
                </View>
              </Card>
            ))}
          </View>
        )}

        {approvedRes.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={[styles.sectionTitle, { color: staticColors.success }]}>
              Prenotazioni Confermate ({approvedRes.length})
            </Text>
            {approvedRes.map(reservation => (
              <Card key={reservation.id} style={{...styles.tableCard, borderColor: `${staticColors.success}30`}} testID={`approved-res-${reservation.id}`}>
                <Pressable onPress={() => toggleReservationGuests(reservation.id)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tableName, { color: colors.foreground }]}>{reservation.reservationName}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4, flexWrap: 'wrap' }}>
                        {reservation.tableTypeName && (
                          <Badge variant="outline" size="sm">{reservation.tableTypeName}</Badge>
                        )}
                        <Badge variant="success" size="sm">Confermata</Badge>
                      </View>
                    </View>
                    <Ionicons 
                      name={expandedReservation === reservation.id ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color={colors.mutedForeground} 
                    />
                  </View>
                </Pressable>
                
                {expandedReservation === reservation.id && (
                  <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: `${colors.mutedForeground}20`, paddingTop: spacing.md }}>
                    <Text style={[styles.tableCapacity, { color: colors.foreground, fontWeight: '600', marginBottom: spacing.sm }]}>
                      Partecipanti
                    </Text>
                    {(reservationGuests[reservation.id] || []).length === 0 ? (
                      <Text style={[styles.tableCapacity, { color: colors.mutedForeground }]}>Nessun partecipante registrato</Text>
                    ) : (
                      (reservationGuests[reservation.id] || []).map(guest => (
                        <View 
                          key={guest.id} 
                          style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            paddingVertical: spacing.sm,
                            borderBottomWidth: 1,
                            borderBottomColor: `${colors.mutedForeground}10`,
                            gap: spacing.sm,
                          }}
                          testID={`guest-${guest.id}`}
                        >
                          <View style={{ 
                            width: 32, height: 32, borderRadius: 16, 
                            backgroundColor: guest.gender === 'F' ? `${staticColors.primary}20` : `${staticColors.golden}20`,
                            justifyContent: 'center', alignItems: 'center' 
                          }}>
                            <Text style={{ color: guest.gender === 'F' ? staticColors.primary : staticColors.golden, fontWeight: '700', fontSize: 12 }}>
                              {guest.gender || '?'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.tableName, { color: colors.foreground, fontSize: 14 }]}>
                              {guest.firstName} {guest.lastName}
                            </Text>
                            {guest.phone && (
                              <Text style={[styles.tableCapacity, { color: colors.mutedForeground, fontSize: 12 }]}>{guest.phone}</Text>
                            )}
                          </View>
                          {guest.qrCode && (
                            <View style={{ alignItems: 'center' }}>
                              <Ionicons name="qr-code" size={24} color={staticColors.primary} />
                              <Text style={{ color: colors.mutedForeground, fontSize: 8, marginTop: 2 }}>{guest.qrCode.substring(0, 12)}</Text>
                            </View>
                          )}
                          {guest.checkedInAt ? (
                            <Badge variant="success" size="sm">Check-in</Badge>
                          ) : (
                            <Badge variant="outline" size="sm">In attesa</Badge>
                          )}
                        </View>
                      ))
                    )}
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}

        {tableReservations.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nessuna prenotazione tavolo</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderStaff = () => (
    <FlatList
      data={staff}
      keyExtractor={item => item.id}
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      renderItem={({ item }) => (
        <Card style={styles.staffCard} testID={`staff-${item.id}`}>
          <View style={[styles.staffAvatar, { backgroundColor: item.status === 'active' ? `${staticColors.success}20` : `${colors.mutedForeground}20` }]}>
            <Ionicons name="person" size={24} color={item.status === 'active' ? staticColors.success : colors.mutedForeground} />
          </View>
          <View style={styles.staffInfo}>
            <Text style={[styles.staffName, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.staffRole, { color: colors.mutedForeground }]}>{item.role}</Text>
            {item.station && <Badge variant="secondary" size="sm">{item.station}</Badge>}
          </View>
          <Badge 
            variant={item.status === 'active' ? 'success' : item.status === 'break' ? 'warning' : 'secondary'} 
            size="sm"
          >
            {item.status === 'active' ? 'Attivo' : item.status === 'break' ? 'Pausa' : 'Offline'}
          </Badge>
        </Card>
      )}
      contentContainerStyle={{ paddingBottom: 100 }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nessuno staff assegnato</Text>
        </View>
      }
    />
  );

  const renderPR = () => (
    <FlatList
      data={prs}
      keyExtractor={item => item.id}
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      renderItem={({ item }) => (
        <Card style={styles.prCard} testID={`pr-${item.id}`}>
          <View style={styles.prHeader}>
            <View style={[styles.prAvatar, { backgroundColor: `${staticColors.primary}20` }]}>
              <Ionicons name="megaphone" size={24} color={staticColors.primary} />
            </View>
            <View style={styles.prInfo}>
              <Text style={[styles.prName, { color: colors.foreground }]}>{item.name}</Text>
              <Badge variant="secondary" size="sm">{item.prCode}</Badge>
            </View>
            <Badge variant={item.status === 'active' ? 'success' : 'secondary'} size="sm">
              {item.status === 'active' ? 'Attivo' : 'Inattivo'}
            </Badge>
          </View>
          <View style={styles.prStats}>
            <View style={styles.prStat}>
              <Text style={[styles.prStatValue, { color: colors.foreground }]}>{item.guestsInvited}</Text>
              <Text style={[styles.prStatLabel, { color: colors.mutedForeground }]}>Invitati</Text>
            </View>
            <View style={styles.prStat}>
              <Text style={[styles.prStatValue, { color: staticColors.success }]}>{item.guestsCheckedIn}</Text>
              <Text style={[styles.prStatLabel, { color: colors.mutedForeground }]}>Check-in</Text>
            </View>
            <View style={styles.prStat}>
              <Text style={[styles.prStatValue, { color: staticColors.golden }]}>{formatCurrency(item.revenue)}</Text>
              <Text style={[styles.prStatLabel, { color: colors.mutedForeground }]}>Incasso</Text>
            </View>
          </View>
        </Card>
      )}
      contentContainerStyle={{ paddingBottom: 100 }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="megaphone-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nessun PR assegnato</Text>
        </View>
      }
    />
  );

  const renderAccess = () => (
    <FlatList
      data={accesses}
      keyExtractor={item => item.id}
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      renderItem={({ item }) => (
        <Card style={styles.accessCard} testID={`access-${item.id}`}>
          <View style={[styles.accessIcon, { backgroundColor: `${staticColors.success}20` }]}>
            <Ionicons name="log-in" size={20} color={staticColors.success} />
          </View>
          <View style={styles.accessInfo}>
            <Text style={[styles.accessName, { color: colors.foreground }]}>{item.guestName}</Text>
            <View style={styles.accessMeta}>
              <Badge variant="secondary" size="sm">{item.ticketType}</Badge>
              <Badge variant={item.method === 'qr' ? 'success' : item.method === 'list' ? 'teal' : 'warning'} size="sm">
                {item.method === 'qr' ? 'QR' : item.method === 'list' ? 'Lista' : 'Manuale'}
              </Badge>
            </View>
          </View>
          <View style={styles.accessTime}>
            <Text style={[styles.accessTimeText, { color: colors.mutedForeground }]}>
              {new Date(item.checkinTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={[styles.accessCheckpoint, { color: colors.mutedForeground }]}>{item.checkpointName}</Text>
          </View>
        </Card>
      )}
      contentContainerStyle={{ paddingBottom: 100 }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="log-in-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nessun accesso registrato</Text>
        </View>
      }
    />
  );

  const renderInventory = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {lowStockCount > 0 && (
        <View style={[styles.alertBanner, { backgroundColor: `${staticColors.destructive}20` }]}>
          <Ionicons name="warning" size={20} color={staticColors.destructive} />
          <Text style={[styles.alertText, { color: staticColors.destructive }]}>
            {lowStockCount} prodotti in esaurimento
          </Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Postazioni</Text>
      {inventory?.stations?.map((station, index) => (
        <Card key={index} style={styles.stationCard} testID={`station-${index}`}>
          <View style={[styles.stationIcon, { backgroundColor: `${staticColors.teal}20` }]}>
            <Ionicons name="storefront" size={24} color={staticColors.teal} />
          </View>
          <View style={styles.stationInfo}>
            <Text style={[styles.stationName, { color: colors.foreground }]}>{station.name}</Text>
            <Text style={[styles.stationSold, { color: colors.mutedForeground }]}>{station.itemsSold} venduti</Text>
          </View>
          <Text style={[styles.stationRevenue, { color: staticColors.primary }]}>{formatCurrency(station.revenue)}</Text>
        </Card>
      ))}

      {inventory?.lowStock && inventory.lowStock.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: spacing.lg }]}>In Esaurimento</Text>
          {inventory.lowStock.map((item, index) => (
            <Card key={index} style={styles.lowStockCard} testID={`lowstock-${index}`}>
              <Ionicons name="alert-circle" size={24} color={staticColors.destructive} />
              <View style={styles.lowStockInfo}>
                <Text style={[styles.lowStockName, { color: colors.foreground }]}>{item.item}</Text>
                <Text style={[styles.lowStockStation, { color: colors.mutedForeground }]}>{item.station}</Text>
              </View>
              <Badge variant="destructive" size="sm">{item.remaining} rimasti</Badge>
            </Card>
          ))}
        </>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderFinance = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <GlassCard style={styles.financeMainCard}>
        <Text style={[styles.financeMainLabel, { color: colors.mutedForeground }]}>Profitto Netto</Text>
        <Text style={[styles.financeMainValue, { color: (finance?.netProfit || 0) >= 0 ? staticColors.success : staticColors.destructive }]}>
          {formatCurrency(finance?.netProfit || 0)}
        </Text>
      </GlassCard>

      <View style={styles.financeGrid}>
        <Card style={styles.financeCard}>
          <Ionicons name="ticket" size={24} color={staticColors.primary} />
          <Text style={[styles.financeValue, { color: colors.foreground }]}>{formatCurrency(finance?.ticketRevenue || 0)}</Text>
          <Text style={[styles.financeLabel, { color: colors.mutedForeground }]}>Biglietti</Text>
        </Card>
        <Card style={styles.financeCard}>
          <Ionicons name="wine" size={24} color={staticColors.teal} />
          <Text style={[styles.financeValue, { color: colors.foreground }]}>{formatCurrency(finance?.barRevenue || 0)}</Text>
          <Text style={[styles.financeLabel, { color: colors.mutedForeground }]}>Bar</Text>
        </Card>
        <Card style={styles.financeCard}>
          <Ionicons name="restaurant" size={24} color={staticColors.golden} />
          <Text style={[styles.financeValue, { color: colors.foreground }]}>{formatCurrency(finance?.tableRevenue || 0)}</Text>
          <Text style={[styles.financeLabel, { color: colors.mutedForeground }]}>Tavoli</Text>
        </Card>
        <Card style={styles.financeCard}>
          <Ionicons name="trending-down" size={24} color={staticColors.destructive} />
          <Text style={[styles.financeValue, { color: colors.foreground }]}>{formatCurrency(finance?.expenses || 0)}</Text>
          <Text style={[styles.financeLabel, { color: colors.mutedForeground }]}>Spese</Text>
        </Card>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: spacing.lg }]}>Metodi di Pagamento</Text>
      {finance?.paymentMethods?.map((method, index) => (
        <Card key={index} style={styles.paymentMethodCard} testID={`payment-${index}`}>
          <Ionicons 
            name={method.method === 'cash' ? 'cash' : method.method === 'card' ? 'card' : 'phone-portrait'} 
            size={24} 
            color={staticColors.primary} 
          />
          <Text style={[styles.paymentMethodName, { color: colors.foreground }]}>
            {method.method === 'cash' ? 'Contanti' : method.method === 'card' ? 'Carta' : method.method}
          </Text>
          <Text style={[styles.paymentMethodAmount, { color: staticColors.primary }]}>{formatCurrency(method.amount)}</Text>
        </Card>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'ticketing': return renderTicketing();
      case 'guestlists': return renderGuestLists();
      case 'tables': return renderTables();
      case 'staff': return renderStaff();
      case 'pr': return renderPR();
      case 'access': return renderAccess();
      case 'inventory': return renderInventory();
      case 'finance': return renderFinance();
      default: return renderOverview();
    }
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-event-hub" />

      <View style={styles.eventHeader}>
        <View style={styles.eventInfo}>
          <Text style={[styles.eventName, { color: colors.foreground }]} numberOfLines={1}>
            {data?.event.name || 'Evento'}
          </Text>
          <View style={styles.eventMeta}>
            <Ionicons name="calendar" size={14} color={colors.mutedForeground} />
            <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]}>
              {data?.event.date ? new Date(data.event.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : ''}
            </Text>
            <Ionicons name="location" size={14} color={colors.mutedForeground} style={{ marginLeft: spacing.sm }} />
            <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {data?.event.location || ''}
            </Text>
          </View>
        </View>
        <Badge 
          variant={data?.event.status === 'live' ? 'success' : data?.event.status === 'upcoming' ? 'default' : 'secondary'}
          size="sm"
        >
          {data?.event.status === 'live' ? 'LIVE' : data?.event.status === 'upcoming' ? 'Prossimo' : 'Concluso'}
        </Badge>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => { triggerHaptic('selection'); setActiveTab(tab.id); }}
            style={[styles.tabPill, activeTab === tab.id && { backgroundColor: staticColors.primary }]}
            testID={`tab-${tab.id}`}
          >
            <Ionicons name={tab.icon} size={18} color={activeTab === tab.id ? '#000' : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: activeTab === tab.id ? '#000' : colors.mutedForeground }]}>
              {tab.label}
            </Text>
            {tab.badge && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {renderTabContent()}

      <Modal visible={showAddGuestModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Aggiungi Ospite</Text>
              <Pressable onPress={() => setShowAddGuestModal(false)} testID="close-guest-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Nome *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={guestForm.name}
                onChangeText={(text) => setGuestForm({ ...guestForm, name: text })}
                placeholder="Nome completo"
                placeholderTextColor={colors.mutedForeground}
                testID="input-guest-name"
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Email</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={guestForm.email}
                onChangeText={(text) => setGuestForm({ ...guestForm, email: text })}
                placeholder="email@esempio.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                testID="input-guest-email"
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Telefono</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={guestForm.phone}
                onChangeText={(text) => setGuestForm({ ...guestForm, phone: text })}
                placeholder="+39 123 456 7890"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                testID="input-guest-phone"
              />
            </View>

            <View style={styles.modalFooter}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => setShowAddGuestModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Annulla</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalBtn, { backgroundColor: staticColors.primary }]} 
                onPress={handleAddGuest}
                testID="button-save-guest"
              >
                <Text style={[styles.modalBtnText, { color: '#000' }]}>Aggiungi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showBookTableModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Prenota {selectedTable?.name}</Text>
              <Pressable onPress={() => { setShowBookTableModal(false); setSelectedTable(null); }} testID="close-table-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Nome Cliente *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={tableForm.customerName}
                onChangeText={(text) => setTableForm({ ...tableForm, customerName: text })}
                placeholder="Nome del cliente"
                placeholderTextColor={colors.mutedForeground}
                testID="input-table-customer"
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Numero Ospiti</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.foreground }]}
                value={tableForm.guestCount}
                onChangeText={(text) => setTableForm({ ...tableForm, guestCount: text })}
                placeholder="2"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                testID="input-table-guests"
              />

              <Text style={[styles.formLabel, { color: colors.foreground }]}>Note</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { backgroundColor: colors.background, color: colors.foreground }]}
                value={tableForm.notes}
                onChangeText={(text) => setTableForm({ ...tableForm, notes: text })}
                placeholder="Note aggiuntive..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                testID="input-table-notes"
              />
            </View>

            <View style={styles.modalFooter}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => { setShowBookTableModal(false); setSelectedTable(null); }}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Annulla</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalBtn, { backgroundColor: staticColors.teal }]} 
                onPress={handleBookTable}
                testID="button-book-table"
              >
                <Text style={[styles.modalBtnText, { color: '#000' }]}>Prenota</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: staticColors.background },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorTitle: { fontSize: typography.fontSize.xl, fontWeight: '700', marginTop: spacing.md },
  errorMessage: { fontSize: typography.fontSize.base, marginTop: spacing.sm, textAlign: 'center' },
  retryButton: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  retryText: { color: '#000', fontWeight: '600', fontSize: typography.fontSize.base },
  
  eventHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  eventInfo: { flex: 1, marginRight: spacing.md },
  eventName: { fontSize: typography.fontSize.lg, fontWeight: '700' },
  eventMeta: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  eventMetaText: { fontSize: typography.fontSize.sm, marginLeft: spacing.xs },
  
  tabsContainer: { maxHeight: 50, marginVertical: spacing.sm },
  tabsContent: { paddingHorizontal: spacing.md, gap: spacing.sm, flexDirection: 'row' },
  tabPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: 'rgba(255,255,255,0.05)' },
  tabText: { fontSize: typography.fontSize.sm, fontWeight: '500' },
  tabBadge: { backgroundColor: staticColors.destructive, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  
  tabContent: { flex: 1, paddingHorizontal: spacing.md },
  overviewContent: { paddingBottom: spacing.xxl },
  
  liveBanner: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.md, gap: spacing.sm },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: staticColors.success },
  liveText: { fontSize: typography.fontSize.base, fontWeight: '700', flex: 1 },
  liveTime: { fontSize: typography.fontSize.sm },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { width: '48%', padding: spacing.md, alignItems: 'center' },
  statIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { fontSize: typography.fontSize.xl, fontWeight: '700' },
  statLabel: { fontSize: typography.fontSize.xs, marginTop: spacing.xs },
  
  sectionTitle: { fontSize: typography.fontSize.lg, fontWeight: '600', marginBottom: spacing.md },
  quickActions: { flexDirection: 'row', gap: spacing.md },
  quickAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg },
  quickActionText: { color: '#000', fontWeight: '600', fontSize: typography.fontSize.base },
  
  saleTypeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, marginBottom: spacing.sm },
  saleTypeInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  saleTypeName: { fontSize: typography.fontSize.base, fontWeight: '500' },
  saleTypeRevenue: { fontSize: typography.fontSize.lg, fontWeight: '700' },
  
  saleCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm },
  saleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  saleInfo: { flex: 1, marginLeft: spacing.md },
  saleName: { fontSize: typography.fontSize.base, fontWeight: '500' },
  saleTime: { fontSize: typography.fontSize.sm, marginTop: 2 },
  saleRight: { alignItems: 'flex-end' },
  saleAmount: { fontSize: typography.fontSize.base, fontWeight: '600', marginBottom: spacing.xs },
  
  searchRow: { marginBottom: spacing.md },
  searchInput: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, gap: spacing.sm },
  searchText: { flex: 1, fontSize: typography.fontSize.base },
  
  guestStats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  guestCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm },
  guestInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  guestAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  guestDetails: { marginLeft: spacing.md, flex: 1 },
  guestName: { fontSize: typography.fontSize.base, fontWeight: '600' },
  guestEmail: { fontSize: typography.fontSize.sm, marginTop: 2, marginBottom: spacing.xs },
  checkinButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  checkinButtonText: { color: '#FFF', fontWeight: '600' },
  checkedInInfo: { alignItems: 'center' },
  checkedInTime: { fontSize: typography.fontSize.xs, marginTop: 2 },
  
  tableStats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tableCard: { padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 2, marginBottom: spacing.sm },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  tableName: { fontSize: typography.fontSize.base, fontWeight: '600' },
  tableInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tableCapacity: { fontSize: typography.fontSize.sm },
  tableReservedBy: { fontSize: typography.fontSize.sm, fontWeight: '500', marginTop: spacing.sm },
  
  staffCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm },
  staffAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  staffInfo: { flex: 1, marginLeft: spacing.md },
  staffName: { fontSize: typography.fontSize.base, fontWeight: '600' },
  staffRole: { fontSize: typography.fontSize.sm, marginTop: 2, marginBottom: spacing.xs },
  
  prCard: { padding: spacing.md, marginBottom: spacing.sm },
  prHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  prAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  prInfo: { flex: 1, marginLeft: spacing.md },
  prName: { fontSize: typography.fontSize.base, fontWeight: '600' },
  prStats: { flexDirection: 'row', justifyContent: 'space-around' },
  prStat: { alignItems: 'center' },
  prStatValue: { fontSize: typography.fontSize.lg, fontWeight: '700' },
  prStatLabel: { fontSize: typography.fontSize.xs, marginTop: 2 },
  
  accessCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm },
  accessIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  accessInfo: { flex: 1, marginLeft: spacing.md },
  accessName: { fontSize: typography.fontSize.base, fontWeight: '500' },
  accessMeta: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  accessTime: { alignItems: 'flex-end' },
  accessTimeText: { fontSize: typography.fontSize.base, fontWeight: '600' },
  accessCheckpoint: { fontSize: typography.fontSize.xs, marginTop: 2 },
  
  alertBanner: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.md, gap: spacing.sm },
  alertText: { fontSize: typography.fontSize.base, fontWeight: '600' },
  
  stationCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm },
  stationIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stationInfo: { flex: 1, marginLeft: spacing.md },
  stationName: { fontSize: typography.fontSize.base, fontWeight: '600' },
  stationSold: { fontSize: typography.fontSize.sm, marginTop: 2 },
  stationRevenue: { fontSize: typography.fontSize.lg, fontWeight: '700' },
  
  lowStockCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm },
  lowStockInfo: { flex: 1, marginLeft: spacing.md },
  lowStockName: { fontSize: typography.fontSize.base, fontWeight: '500' },
  lowStockStation: { fontSize: typography.fontSize.sm, marginTop: 2 },
  
  financeMainCard: { padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md },
  financeMainLabel: { fontSize: typography.fontSize.sm },
  financeMainValue: { fontSize: 36, fontWeight: '700', marginTop: spacing.xs },
  financeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  financeCard: { width: '48%', padding: spacing.md, alignItems: 'center' },
  financeValue: { fontSize: typography.fontSize.lg, fontWeight: '600', marginTop: spacing.sm },
  financeLabel: { fontSize: typography.fontSize.xs, marginTop: spacing.xs },
  
  paymentMethodCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md },
  paymentMethodName: { flex: 1, fontSize: typography.fontSize.base, fontWeight: '500' },
  paymentMethodAmount: { fontSize: typography.fontSize.lg, fontWeight: '700' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: typography.fontSize.base, marginTop: spacing.md },
  
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: typography.fontSize.lg, fontWeight: '600' },
  modalForm: { padding: spacing.lg },
  formLabel: { fontSize: typography.fontSize.sm, fontWeight: '500', marginBottom: spacing.xs, marginTop: spacing.md },
  formInput: { padding: spacing.md, borderRadius: borderRadius.md, fontSize: typography.fontSize.base },
  formTextArea: { height: 80, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', padding: spacing.lg, gap: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  modalBtn: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  modalBtnText: { fontSize: typography.fontSize.base, fontWeight: '600' },
});
