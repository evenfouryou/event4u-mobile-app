import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput, Alert, Image, Share, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { PrEventDetail, PrGuestListEntry, PrGuestList, PrEventTable, PrTicketStats } from '@/lib/api';

interface PREventDashboardProps {
  eventId: string;
  onGoBack: () => void;
}

type TabType = 'guests' | 'tables' | 'stats' | 'prizes' | 'links';

interface BatchGuest {
  firstName: string;
  lastName: string;
  phone: string;
  gender: 'M' | 'F';
}

interface SearchResult {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface Prize {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  claimed: number;
}

interface EventLink {
  id: string;
  title: string;
  url: string;
  type: 'website' | 'instagram' | 'facebook' | 'tiktok' | 'spotify' | 'other';
}

export function PREventDashboard({ eventId, onGoBack }: PREventDashboardProps) {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<PrEventDetail | null>(null);
  const [guests, setGuests] = useState<PrGuestListEntry[]>([]);
  const [guestLists, setGuestLists] = useState<PrGuestList[]>([]);
  const [tables, setTables] = useState<PrEventTable[]>([]);
  const [stats, setStats] = useState<PrTicketStats>({ sold: 0, revenue: 0, commission: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('guests');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [listViewMode, setListViewMode] = useState<'list' | 'add'>('list');
  const [tableViewMode, setTableViewMode] = useState<'list' | 'add'>('list');
  const [newGuest, setNewGuest] = useState({ firstName: '', lastName: '', phone: '', gender: 'M' as 'M' | 'F', listId: '' });
  const [adding, setAdding] = useState(false);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [batchSearchResults, setBatchSearchResults] = useState<SearchResult[]>([]);
  const [batchSearching, setBatchSearching] = useState(false);
  
  // Prizes and Links states
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [eventLinks, setEventLinks] = useState<EventLink[]>([]);
  
  const [batchGuests, setBatchGuests] = useState<BatchGuest[]>([
    { firstName: '', lastName: '', phone: '', gender: 'M' }
  ]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [batchAdding, setBatchAdding] = useState(false);
  
  const [showBookTable, setShowBookTable] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [tableBooking, setTableBooking] = useState({ customerName: '', customerPhone: '', guestCount: '2', notes: '' });
  const [bookingTable, setBookingTable] = useState(false);

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [eventData, guestsData, listsData, tablesData, statsData, prizesData, linksData] = await Promise.all([
        api.getPrEventDetail(eventId).catch(() => null),
        api.getPrEventGuests(eventId).catch(() => []),
        api.getPrEventGuestLists(eventId).catch(() => []),
        api.getPrEventTables(eventId).catch(() => []),
        api.getPrEventStats(eventId).catch(() => ({ sold: 0, revenue: 0, commission: 0 })),
        api.getPrEventPrizes(eventId).catch(() => []),
        api.getPrEventLinks(eventId).catch(() => []),
      ]);
      setEvent(eventData);
      setGuests(guestsData);
      setGuestLists(listsData);
      setTables(tablesData);
      setStats(statsData);
      setPrizes(prizesData || []);
      setEventLinks(linksData || []);
      if (listsData.length > 0 && !selectedListId) {
        setSelectedListId(listsData[0].id);
      }
      if (listsData.length > 0 && !newGuest.listId) {
        setNewGuest(prev => ({ ...prev, listId: listsData[0].id }));
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Search registered users
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const results = await api.searchRegisteredUsers(query).catch(() => []);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };
  
  const handleBatchSearch = async (query: string) => {
    setBatchSearchQuery(query);
    if (query.length < 2) {
      setBatchSearchResults([]);
      return;
    }
    try {
      setBatchSearching(true);
      const results = await api.searchRegisteredUsers(query).catch(() => []);
      setBatchSearchResults(results || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setBatchSearchResults([]);
    } finally {
      setBatchSearching(false);
    }
  };
  
  const selectSearchResult = (result: SearchResult) => {
    setNewGuest({
      ...newGuest,
      firstName: result.firstName,
      lastName: result.lastName,
      phone: result.phone || '',
    });
    setSearchQuery('');
    setSearchResults([]);
    triggerHaptic('light');
  };
  
  const handleOpenLink = async (url: string) => {
    try {
      // Validate URL has valid scheme
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        Alert.alert('Errore', 'Link non valido');
        return;
      }
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Errore', 'Impossibile aprire questo link');
      }
    } catch (error) {
      Alert.alert('Errore', 'Impossibile aprire il link');
    }
  };
  
  const selectBatchSearchResult = (result: SearchResult, index: number) => {
    const updated = [...batchGuests];
    updated[index] = {
      ...updated[index],
      firstName: result.firstName,
      lastName: result.lastName,
      phone: result.phone || '',
    };
    setBatchGuests(updated);
    setBatchSearchQuery('');
    setBatchSearchResults([]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddGuest = async () => {
    if (!newGuest.firstName || !newGuest.lastName) {
      Alert.alert('Errore', 'Nome e cognome sono obbligatori');
      return;
    }
    // Only require listId if lists are available and none selected
    if (guestLists.length > 0 && !newGuest.listId) {
      // Auto-select first list if available
      setNewGuest(prev => ({ ...prev, listId: guestLists[0].id }));
    }
    try {
      setAdding(true);
      await api.addPrGuest(eventId, {
        firstName: newGuest.firstName,
        lastName: newGuest.lastName,
        phone: newGuest.phone,
        gender: newGuest.gender,
        listId: newGuest.listId || undefined,
      });
      await loadData();
      setNewGuest({ firstName: '', lastName: '', phone: '', gender: 'M', listId: guestLists[0]?.id || '' });
      setShowAddGuest(false);
      triggerHaptic('success');
      Alert.alert('Successo', 'Ospite aggiunto alla lista');
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile aggiungere ospite');
    } finally {
      setAdding(false);
    }
  };
  
  const getLinkIcon = (type: EventLink['type']) => {
    switch (type) {
      case 'instagram': return 'logo-instagram';
      case 'facebook': return 'logo-facebook';
      case 'tiktok': return 'logo-tiktok';
      case 'spotify': return 'musical-notes';
      case 'website': return 'globe-outline';
      default: return 'link-outline';
    }
  };

  const handleBatchAdd = async () => {
    const validGuests = batchGuests.filter(g => g.firstName && g.lastName && g.phone);
    if (validGuests.length === 0) {
      Alert.alert('Errore', 'Inserisci almeno un ospite completo');
      return;
    }
    if (!selectedListId) {
      Alert.alert('Errore', 'Seleziona una lista');
      return;
    }
    try {
      setBatchAdding(true);
      const result = await api.addPrGuestsBatch(selectedListId, eventId, validGuests);
      await loadData();
      setBatchGuests([{ firstName: '', lastName: '', phone: '', gender: 'M' }]);
      setShowBatchAdd(false);
      triggerHaptic('success');
      Alert.alert('Successo', `${result.created?.length || validGuests.length} ospiti aggiunti`);
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile aggiungere ospiti');
    } finally {
      setBatchAdding(false);
    }
  };

  const addBatchGuest = () => {
    if (batchGuests.length < 10) {
      setBatchGuests([...batchGuests, { firstName: '', lastName: '', phone: '', gender: 'M' }]);
    }
  };

  const removeBatchGuest = (index: number) => {
    if (batchGuests.length > 1) {
      setBatchGuests(batchGuests.filter((_, i) => i !== index));
    }
  };

  const updateBatchGuest = (index: number, field: keyof BatchGuest, value: string) => {
    const updated = [...batchGuests];
    updated[index] = { ...updated[index], [field]: value };
    setBatchGuests(updated);
  };

  const handleBookTable = async () => {
    if (!tableBooking.customerName) {
      Alert.alert('Errore', 'Nome cliente richiesto');
      return;
    }
    if (!selectedTableId) {
      Alert.alert('Errore', 'Seleziona un tavolo');
      return;
    }
    try {
      setBookingTable(true);
      await api.bookPrTable(eventId, {
        tableId: selectedTableId,
        customerName: tableBooking.customerName,
        customerPhone: tableBooking.customerPhone || undefined,
        guestCount: parseInt(tableBooking.guestCount) || 2,
        notes: tableBooking.notes || undefined,
      });
      await loadData();
      setTableBooking({ customerName: '', customerPhone: '', guestCount: '2', notes: '' });
      setSelectedTableId('');
      setShowBookTable(false);
      triggerHaptic('success');
      Alert.alert('Successo', 'Tavolo prenotato con successo');
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile prenotare il tavolo');
    } finally {
      setBookingTable(false);
    }
  };

  const availableTables = useMemo(() => tables.filter(t => !t.isBooked), [tables]);

  const prLink = useMemo(() => {
    if (!event || !event.prCode) return null;
    return `https://manage.eventfouryou.com/e/${event.eventId}?pr=${event.prCode}`;
  }, [event]);

  const handleShareLink = async () => {
    if (!prLink || !event) return;
    try {
      await Share.share({
        message: `${event.eventName}\n\nAcquista il tuo biglietto con il mio link:\n${prLink}`,
        title: event.eventName,
      });
      triggerHaptic('medium');
    } catch (err) {
      console.log('Share cancelled');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'arrived':
        return <Badge variant="success" size="sm"><Text style={styles.statusText}>Arrivato</Text></Badge>;
      case 'confirmed':
        return <Badge variant="golden" size="sm"><Text style={styles.statusText}>Confermato</Text></Badge>;
      case 'cancelled':
        return <Badge variant="destructive" size="sm"><Text style={styles.statusText}>Annullato</Text></Badge>;
      default:
        return <Badge variant="secondary" size="sm"><Text style={styles.statusText}>In attesa</Text></Badge>;
    }
  };

  const arrivedCount = guests.filter(g => g.status === 'arrived').length;

  if (showLoader) {
    return <Loading text="Caricamento evento..." />;
  }

  if (!event) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={staticColors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>Evento non trovato</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={staticColors.primary}
          />
        }
      >
        {/* Hero Image Section */}
        <View style={[styles.heroContainer, { paddingTop: insets.top }]}>
          {event.eventImageUrl ? (
            <Image
              source={{ uri: event.eventImageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={gradients.purple}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroImage}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.heroOverlay}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroTop}>
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  onGoBack();
                }}
                style={styles.heroBackButton}
                testID="button-back"
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.heroCenter}>
              <Text style={styles.heroTitle} numberOfLines={2}>{event.eventName}</Text>
            </View>
            <View style={styles.heroInfo}>
              <View style={styles.heroMeta}>
                <View style={styles.heroMetaItem}>
                  <Ionicons name="calendar" size={16} color="#fff" />
                  <Text style={styles.heroMetaText}>{formatDate(event.eventStart)}</Text>
                </View>
                <View style={styles.heroMetaItem}>
                  <Ionicons name="time" size={16} color="#fff" />
                  <Text style={styles.heroMetaText}>{formatTime(event.eventStart)}</Text>
                </View>
              </View>
              <View style={styles.heroMetaItem}>
                <Ionicons name="location" size={16} color="#fff" />
                <Text style={styles.heroMetaText}>{event.locationName}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Share Link Card */}
        {prLink && (
          <Card style={styles.shareCard}>
            <View style={styles.shareHeader}>
              <Ionicons name="link" size={20} color={staticColors.primary} />
              <Text style={styles.shareTitle}>Il tuo link personale</Text>
            </View>
            <Text style={styles.shareLink} numberOfLines={1}>{prLink}</Text>
            <View style={styles.shareButtons}>
              <Button
                variant="default"
                onPress={handleShareLink}
                style={{ flex: 1 }}
                testID="button-share-link"
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="share-social" size={18} color={staticColors.primaryForeground} />
                  <Text style={[styles.buttonText, { color: staticColors.primaryForeground }]}>Condividi Link</Text>
                </View>
              </Button>
            </View>
          </Card>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="people" size={24} color={staticColors.primary} />
            <Text style={styles.statValue}>{guests.length}</Text>
            <Text style={styles.statLabel}>Ospiti</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={staticColors.teal} />
            <Text style={styles.statValue}>{arrivedCount}</Text>
            <Text style={styles.statLabel}>Arrivati</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="cash" size={24} color={staticColors.golden} />
            <Text style={styles.statValue}>€{(event.earnings || stats.commission || 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>Guadagno</Text>
          </Card>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollView}>
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tab, activeTab === 'guests' && styles.tabActive]}
              onPress={() => setActiveTab('guests')}
              testID="tab-guests"
            >
              <Ionicons name="list-outline" size={18} color={activeTab === 'guests' ? staticColors.primary : staticColors.mutedForeground} />
              <Text style={[styles.tabText, activeTab === 'guests' && styles.tabTextActive]}>
                Liste
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'tables' && styles.tabActive]}
              onPress={() => setActiveTab('tables')}
              testID="tab-tables"
            >
              <Ionicons name="grid-outline" size={18} color={activeTab === 'tables' ? staticColors.primary : staticColors.mutedForeground} />
              <Text style={[styles.tabText, activeTab === 'tables' && styles.tabTextActive]}>
                Tavoli
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'prizes' && styles.tabActive]}
              onPress={() => setActiveTab('prizes')}
              testID="tab-prizes"
            >
              <Ionicons name="gift-outline" size={18} color={activeTab === 'prizes' ? staticColors.primary : staticColors.mutedForeground} />
              <Text style={[styles.tabText, activeTab === 'prizes' && styles.tabTextActive]}>
                Premi
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'links' && styles.tabActive]}
              onPress={() => setActiveTab('links')}
              testID="tab-links"
            >
              <Ionicons name="link-outline" size={18} color={activeTab === 'links' ? staticColors.primary : staticColors.mutedForeground} />
              <Text style={[styles.tabText, activeTab === 'links' && styles.tabTextActive]}>
                Link
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
              onPress={() => setActiveTab('stats')}
              testID="tab-stats"
            >
              <Ionicons name="stats-chart-outline" size={18} color={activeTab === 'stats' ? staticColors.primary : staticColors.mutedForeground} />
              <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
                Statistiche
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Guests Tab */}
        {activeTab === 'guests' && (
          <>
            {/* Mode Toggle: Vedi Lista / Aggiungi */}
            <View style={styles.modeToggleRow}>
              <Pressable
                onPress={() => {
                  setListViewMode('list');
                  setShowAddGuest(false);
                  setShowBatchAdd(false);
                  triggerHaptic('light');
                }}
                style={[styles.modeButton, listViewMode === 'list' && styles.modeButtonActive]}
                testID="button-view-list"
              >
                <Ionicons 
                  name="eye-outline" 
                  size={20} 
                  color={listViewMode === 'list' ? staticColors.primary : staticColors.mutedForeground} 
                />
                <Text style={[styles.modeButtonText, listViewMode === 'list' && styles.modeButtonTextActive]}>
                  Vedi Lista
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setListViewMode('add');
                  triggerHaptic('light');
                }}
                style={[styles.modeButton, listViewMode === 'add' && styles.modeButtonActive]}
                testID="button-add-mode"
              >
                <Ionicons 
                  name="add-circle-outline" 
                  size={20} 
                  color={listViewMode === 'add' ? staticColors.primary : staticColors.mutedForeground} 
                />
                <Text style={[styles.modeButtonText, listViewMode === 'add' && styles.modeButtonTextActive]}>
                  Aggiungi
                </Text>
              </Pressable>
            </View>

            {/* Add Mode: Show Singolo/Multiplo buttons */}
            {listViewMode === 'add' && (
              <View style={styles.actionButtonsRow}>
                <Pressable
                  onPress={() => {
                    setShowAddGuest(!showAddGuest);
                    setShowBatchAdd(false);
                  }}
                  style={[styles.addButton, { flex: 1 }]}
                  testID="button-add-guest"
                >
                  <LinearGradient
                    colors={gradients.golden}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.addButtonGradient}
                  >
                    <Ionicons name="person-add" size={18} color={staticColors.primaryForeground} />
                    <Text style={styles.addButtonText}>Singolo</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowBatchAdd(!showBatchAdd);
                    setShowAddGuest(false);
                  }}
                  style={[styles.addButton, { flex: 1 }]}
                  testID="button-batch-add"
                >
                  <LinearGradient
                    colors={gradients.purple}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.addButtonGradient}
                  >
                    <Ionicons name="people" size={18} color={staticColors.primaryForeground} />
                    <Text style={styles.addButtonText}>Multiplo (max 10)</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {listViewMode === 'add' && showAddGuest && (
              <Card style={styles.addGuestForm}>
                <Text style={styles.formTitle}>Nuovo Ospite</Text>
                
                {/* Search for registered users */}
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={18} color={staticColors.mutedForeground} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Cerca utente registrato..."
                      placeholderTextColor={staticColors.mutedForeground}
                      value={searchQuery}
                      onChangeText={handleSearch}
                      testID="input-search-user"
                    />
                    {searching && (
                      <Ionicons name="sync" size={16} color={staticColors.primary} />
                    )}
                  </View>
                  {searchResults.length > 0 && (
                    <View style={styles.searchResults}>
                      {searchResults.slice(0, 5).map((result) => (
                        <Pressable
                          key={result.id}
                          style={styles.searchResultItem}
                          onPress={() => selectSearchResult(result)}
                        >
                          <Ionicons name="person" size={16} color={staticColors.primary} />
                          <Text style={styles.searchResultText}>
                            {result.firstName} {result.lastName}
                          </Text>
                          {result.phone && (
                            <Text style={styles.searchResultPhone}>{result.phone}</Text>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
                
                {/* List selector */}
                {guestLists.length > 0 && (
                  <View style={styles.listSelector}>
                    <Text style={styles.inputLabel}>Lista:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {guestLists.map(list => (
                        <Pressable
                          key={list.id}
                          style={[
                            styles.listOption,
                            newGuest.listId === list.id && styles.listOptionActive
                          ]}
                          onPress={() => setNewGuest({ ...newGuest, listId: list.id })}
                        >
                          <Text style={[
                            styles.listOptionText,
                            newGuest.listId === list.id && styles.listOptionTextActive
                          ]}>{list.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                <TextInput
                  style={styles.input}
                  placeholder="Nome *"
                  placeholderTextColor={staticColors.mutedForeground}
                  value={newGuest.firstName}
                  onChangeText={(text) => setNewGuest({ ...newGuest, firstName: text })}
                  testID="input-first-name"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Cognome *"
                  placeholderTextColor={staticColors.mutedForeground}
                  value={newGuest.lastName}
                  onChangeText={(text) => setNewGuest({ ...newGuest, lastName: text })}
                  testID="input-last-name"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Telefono (opzionale)"
                  placeholderTextColor={staticColors.mutedForeground}
                  value={newGuest.phone}
                  onChangeText={(text) => setNewGuest({ ...newGuest, phone: text })}
                  keyboardType="phone-pad"
                  testID="input-phone"
                />
                
                {/* Gender selector */}
                <View style={styles.genderSelector}>
                  <Text style={styles.inputLabel}>Sesso:</Text>
                  <View style={styles.genderButtons}>
                    <Pressable
                      style={[styles.genderButton, newGuest.gender === 'M' && styles.genderButtonActive]}
                      onPress={() => setNewGuest({ ...newGuest, gender: 'M' })}
                    >
                      <Ionicons name="male" size={18} color={newGuest.gender === 'M' ? staticColors.primaryForeground : staticColors.primary} />
                      <Text style={[styles.genderButtonText, newGuest.gender === 'M' && styles.genderButtonTextActive]}>M</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.genderButton, newGuest.gender === 'F' && styles.genderButtonActive]}
                      onPress={() => setNewGuest({ ...newGuest, gender: 'F' })}
                    >
                      <Ionicons name="female" size={18} color={newGuest.gender === 'F' ? staticColors.primaryForeground : staticColors.primary} />
                      <Text style={[styles.genderButtonText, newGuest.gender === 'F' && styles.genderButtonTextActive]}>F</Text>
                    </Pressable>
                  </View>
                </View>
                
                <View style={styles.formButtons}>
                  <Button
                    variant="ghost"
                    onPress={() => setShowAddGuest(false)}
                    style={{ flex: 1 }}
                  >
                    Annulla
                  </Button>
                  <Button
                    variant="golden"
                    onPress={handleAddGuest}
                    loading={adding}
                    style={{ flex: 1 }}
                    testID="button-confirm-add"
                  >
                    Aggiungi
                  </Button>
                </View>
              </Card>
            )}

            {listViewMode === 'add' && showBatchAdd && (
              <Card style={styles.addGuestForm}>
                <View style={styles.batchHeader}>
                  <Text style={styles.formTitle}>Aggiungi Multipli</Text>
                  <Badge variant="secondary">
                    <Text style={styles.statusText}>{batchGuests.length}/10</Text>
                  </Badge>
                </View>
                
                {/* Search for registered users */}
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={18} color={staticColors.mutedForeground} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Cerca utente registrato..."
                      placeholderTextColor={staticColors.mutedForeground}
                      value={batchSearchQuery}
                      onChangeText={handleBatchSearch}
                      testID="input-batch-search-user"
                    />
                    {batchSearching && (
                      <Ionicons name="sync" size={16} color={staticColors.primary} />
                    )}
                  </View>
                  {batchSearchResults.length > 0 && (
                    <View style={styles.searchResults}>
                      {batchSearchResults.slice(0, 5).map((result) => (
                        <Pressable
                          key={result.id}
                          style={styles.searchResultItem}
                          onPress={() => {
                            const emptyIndex = batchGuests.findIndex(g => !g.firstName && !g.lastName);
                            selectBatchSearchResult(result, emptyIndex >= 0 ? emptyIndex : batchGuests.length - 1);
                          }}
                        >
                          <Ionicons name="person" size={16} color={staticColors.primary} />
                          <Text style={styles.searchResultText}>
                            {result.firstName} {result.lastName}
                          </Text>
                          {result.phone && (
                            <Text style={styles.searchResultPhone}>{result.phone}</Text>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
                
                {guestLists.length > 0 && (
                  <View style={styles.listSelector}>
                    <Text style={styles.inputLabel}>Lista:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {guestLists.map(list => (
                        <Pressable
                          key={list.id}
                          style={[
                            styles.listOption,
                            selectedListId === list.id && styles.listOptionActive
                          ]}
                          onPress={() => setSelectedListId(list.id)}
                        >
                          <Text style={[
                            styles.listOptionText,
                            selectedListId === list.id && styles.listOptionTextActive
                          ]}>{list.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {batchGuests.map((guest, index) => (
                  <View key={index} style={styles.batchGuestRow}>
                    <View style={styles.batchGuestNumber}>
                      <Text style={styles.batchGuestNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.batchGuestInputs}>
                      <View style={styles.batchInputRow}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="Nome *"
                          placeholderTextColor={staticColors.mutedForeground}
                          value={guest.firstName}
                          onChangeText={(text) => updateBatchGuest(index, 'firstName', text)}
                        />
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="Cognome *"
                          placeholderTextColor={staticColors.mutedForeground}
                          value={guest.lastName}
                          onChangeText={(text) => updateBatchGuest(index, 'lastName', text)}
                        />
                      </View>
                      <View style={styles.batchInputRow}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="Telefono *"
                          placeholderTextColor={staticColors.mutedForeground}
                          value={guest.phone}
                          onChangeText={(text) => updateBatchGuest(index, 'phone', text)}
                          keyboardType="phone-pad"
                        />
                        <View style={styles.genderButtons}>
                          <Pressable
                            style={[styles.genderButton, guest.gender === 'M' && styles.genderButtonActive]}
                            onPress={() => updateBatchGuest(index, 'gender', 'M')}
                          >
                            <Ionicons name="male" size={18} color={guest.gender === 'M' ? staticColors.primaryForeground : staticColors.primary} />
                          </Pressable>
                          <Pressable
                            style={[styles.genderButton, guest.gender === 'F' && styles.genderButtonActive]}
                            onPress={() => updateBatchGuest(index, 'gender', 'F')}
                          >
                            <Ionicons name="female" size={18} color={guest.gender === 'F' ? staticColors.primaryForeground : staticColors.primary} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                    {batchGuests.length > 1 && (
                      <Pressable
                        onPress={() => removeBatchGuest(index)}
                        style={styles.removeGuestButton}
                      >
                        <Ionicons name="close-circle" size={24} color={staticColors.destructive} />
                      </Pressable>
                    )}
                  </View>
                ))}

                {batchGuests.length < 10 && (
                  <Pressable onPress={addBatchGuest} style={styles.addMoreButton}>
                    <Ionicons name="add-circle-outline" size={20} color={staticColors.primary} />
                    <Text style={styles.addMoreText}>Aggiungi altro ospite</Text>
                  </Pressable>
                )}

                <View style={styles.formButtons}>
                  <Button
                    variant="ghost"
                    onPress={() => setShowBatchAdd(false)}
                    style={{ flex: 1 }}
                  >
                    Annulla
                  </Button>
                  <Button
                    variant="default"
                    onPress={handleBatchAdd}
                    loading={batchAdding}
                    style={{ flex: 1 }}
                    testID="button-confirm-batch"
                  >
                    Aggiungi Tutti
                  </Button>
                </View>
              </Card>
            )}

            {/* Guest List - only show in list mode */}
            {listViewMode === 'list' && (
              guests.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={staticColors.mutedForeground} />
                  <Text style={styles.emptyText}>Nessun ospite nella lista</Text>
                  <Text style={styles.emptySubtext}>Aggiungi ospiti per iniziare</Text>
                </View>
              ) : (
                guests.map((guest) => (
                  <Card key={guest.id} style={styles.guestCard}>
                    <View style={styles.guestInfo}>
                      <Text style={styles.guestName}>{guest.firstName} {guest.lastName}</Text>
                      {guest.phone && (
                        <Pressable 
                          onPress={() => Linking.openURL(`tel:${guest.phone}`)}
                          style={styles.guestPhoneRow}
                        >
                          <Ionicons name="call-outline" size={14} color={staticColors.primary} />
                          <Text style={styles.guestPhone}>{guest.phone}</Text>
                        </Pressable>
                      )}
                    </View>
                    {getStatusBadge(guest.status)}
                  </Card>
                ))
              )
            )}
          </>
        )}

        {/* Tables Tab */}
        {activeTab === 'tables' && (
          <>
            {/* Mode Toggle: Vedi Tavoli / Prenota */}
            <View style={styles.modeToggleRow}>
              <Pressable
                onPress={() => {
                  setTableViewMode('list');
                  setShowBookTable(false);
                  triggerHaptic('light');
                }}
                style={[styles.modeButton, tableViewMode === 'list' && styles.modeButtonActive]}
                testID="button-view-tables"
              >
                <Ionicons 
                  name="eye-outline" 
                  size={20} 
                  color={tableViewMode === 'list' ? staticColors.primary : staticColors.mutedForeground} 
                />
                <Text style={[styles.modeButtonText, tableViewMode === 'list' && styles.modeButtonTextActive]}>
                  Vedi Tavoli
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setTableViewMode('add');
                  triggerHaptic('light');
                }}
                style={[styles.modeButton, tableViewMode === 'add' && styles.modeButtonActive]}
                testID="button-add-table"
              >
                <Ionicons 
                  name="add-circle-outline" 
                  size={20} 
                  color={tableViewMode === 'add' ? staticColors.primary : staticColors.mutedForeground} 
                />
                <Text style={[styles.modeButtonText, tableViewMode === 'add' && styles.modeButtonTextActive]}>
                  Prenota
                </Text>
              </Pressable>
            </View>

            {/* Add Mode: Show booking button */}
            {tableViewMode === 'add' && availableTables.length > 0 && (
              <Pressable
                onPress={() => setShowBookTable(!showBookTable)}
                style={styles.addButton}
                testID="button-book-table"
              >
                <LinearGradient
                  colors={gradients.golden}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addButtonGradient}
                >
                  <Ionicons name="add-circle" size={18} color={staticColors.primaryForeground} />
                  <Text style={styles.addButtonText}>Prenota Tavolo</Text>
                </LinearGradient>
              </Pressable>
            )}

            {tableViewMode === 'add' && showBookTable && availableTables.length > 0 && (
              <Card style={styles.addGuestForm}>
                <Text style={styles.formTitle}>Nuova Prenotazione</Text>
                
                <Text style={styles.inputLabel}>Seleziona tavolo:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  {availableTables.map(table => (
                    <Pressable
                      key={table.id}
                      style={[
                        styles.tableOption,
                        selectedTableId === table.id && styles.tableOptionActive
                      ]}
                      onPress={() => setSelectedTableId(table.id)}
                    >
                      <Text style={[
                        styles.tableOptionName,
                        selectedTableId === table.id && styles.tableOptionNameActive
                      ]}>{table.name}</Text>
                      <Text style={[
                        styles.tableOptionMeta,
                        selectedTableId === table.id && styles.tableOptionMetaActive
                      ]}>{table.capacity} posti</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <TextInput
                  style={styles.input}
                  placeholder="Nome cliente *"
                  placeholderTextColor={staticColors.mutedForeground}
                  value={tableBooking.customerName}
                  onChangeText={(text) => setTableBooking({ ...tableBooking, customerName: text })}
                  testID="input-customer-name"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Telefono cliente"
                  placeholderTextColor={staticColors.mutedForeground}
                  value={tableBooking.customerPhone}
                  onChangeText={(text) => setTableBooking({ ...tableBooking, customerPhone: text })}
                  keyboardType="phone-pad"
                  testID="input-customer-phone"
                />
                <View style={styles.batchInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Numero ospiti"
                    placeholderTextColor={staticColors.mutedForeground}
                    value={tableBooking.guestCount}
                    onChangeText={(text) => setTableBooking({ ...tableBooking, guestCount: text.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                    testID="input-guest-count"
                  />
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    placeholder="Note (opzionale)"
                    placeholderTextColor={staticColors.mutedForeground}
                    value={tableBooking.notes}
                    onChangeText={(text) => setTableBooking({ ...tableBooking, notes: text })}
                    testID="input-notes"
                  />
                </View>
                <View style={styles.formButtons}>
                  <Button
                    variant="ghost"
                    onPress={() => setShowBookTable(false)}
                    style={{ flex: 1 }}
                  >
                    Annulla
                  </Button>
                  <Button
                    variant="golden"
                    onPress={handleBookTable}
                    loading={bookingTable}
                    style={{ flex: 1 }}
                    testID="button-confirm-booking"
                  >
                    Prenota
                  </Button>
                </View>
              </Card>
            )}

            {/* Tables List - only show in list mode */}
            {tableViewMode === 'list' && (
              tables.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="grid-outline" size={48} color={staticColors.mutedForeground} />
                  <Text style={styles.emptyText}>Nessun tavolo disponibile</Text>
                  <Text style={styles.emptySubtext}>I tavoli verranno mostrati qui</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.tableSectionTitle}>Tavoli Evento</Text>
                  {tables.map((table) => (
                    <Card key={table.id} style={styles.tableCard}>
                      <View style={styles.tableHeader}>
                        <View style={styles.tableInfo}>
                          <Text style={styles.tableName}>{table.name}</Text>
                          <View style={styles.tableMetaRow}>
                            <View style={styles.tableMetaItem}>
                              <Ionicons name="people" size={14} color={staticColors.mutedForeground} />
                              <Text style={styles.tableMetaText}>{table.capacity} posti</Text>
                            </View>
                            {table.minSpend && (
                              <View style={styles.tableMetaItem}>
                                <Ionicons name="cash" size={14} color={staticColors.golden} />
                                <Text style={styles.tableMetaText}>Min €{table.minSpend}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        {table.isBooked ? (
                          <Badge variant="success">
                            <Text style={styles.statusText}>Prenotato</Text>
                          </Badge>
                        ) : (
                          <Pressable
                            onPress={() => {
                              setSelectedTableId(table.id);
                              setTableViewMode('add');
                              setShowBookTable(true);
                            }}
                          >
                            <Badge variant="outline">
                              <Text style={[styles.statusText, { color: staticColors.primary }]}>Prenota</Text>
                            </Badge>
                          </Pressable>
                        )}
                      </View>
                      {table.booking && (
                        <View style={styles.bookingInfo}>
                          <Text style={styles.bookingName}>{table.booking.guestName}</Text>
                          <Text style={styles.bookingGuests}>{table.booking.guestCount} ospiti</Text>
                        </View>
                      )}
                    </Card>
                  ))}
                </>
              )
            )}
          </>
        )}

        {/* Prizes Tab */}
        {activeTab === 'prizes' && (
          <>
            {prizes.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="gift-outline" size={48} color={staticColors.mutedForeground} />
                <Text style={styles.emptyText}>Nessun premio disponibile</Text>
                <Text style={styles.emptySubtext}>I premi dell'evento verranno mostrati qui</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Premi Evento</Text>
                {prizes.map((prize) => (
                  <Card key={prize.id} style={styles.prizeCard}>
                    <View style={styles.prizeHeader}>
                      <View style={styles.prizeInfo}>
                        <Ionicons name="gift" size={24} color={staticColors.golden} />
                        <View style={styles.prizeDetails}>
                          <Text style={styles.prizeName}>{prize.name}</Text>
                          {prize.description && (
                            <Text style={styles.prizeDescription}>{prize.description}</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.prizeStats}>
                        <Text style={styles.prizeQuantity}>{prize.claimed}/{prize.quantity}</Text>
                        <Text style={styles.prizeLabel}>assegnati</Text>
                      </View>
                    </View>
                    <View style={styles.prizeProgressBar}>
                      <View 
                        style={[
                          styles.prizeProgressFill, 
                          { width: `${Math.min((prize.claimed / prize.quantity) * 100, 100)}%` }
                        ]} 
                      />
                    </View>
                  </Card>
                ))}
              </>
            )}
          </>
        )}

        {/* Links Tab */}
        {activeTab === 'links' && (
          <>
            {eventLinks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="link-outline" size={48} color={staticColors.mutedForeground} />
                <Text style={styles.emptyText}>Nessun link disponibile</Text>
                <Text style={styles.emptySubtext}>I link dell'evento verranno mostrati qui</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Link Evento</Text>
                {eventLinks.map((link) => (
                  <Pressable 
                    key={link.id} 
                    onPress={() => handleOpenLink(link.url)}
                    style={styles.linkCard}
                  >
                    <Card style={styles.linkCardInner}>
                      <View style={styles.linkContent}>
                        <View style={[styles.linkIconContainer, { backgroundColor: `${staticColors.primary}20` }]}>
                          <Ionicons 
                            name={getLinkIcon(link.type) as any} 
                            size={24} 
                            color={staticColors.primary} 
                          />
                        </View>
                        <View style={styles.linkInfo}>
                          <Text style={styles.linkTitle}>{link.title}</Text>
                          <Text style={styles.linkUrl} numberOfLines={1}>{link.url}</Text>
                        </View>
                        <Ionicons name="open-outline" size={20} color={staticColors.mutedForeground} />
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </>
            )}
          </>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <>
            <GlassCard style={styles.statsCard}>
              <View style={styles.statsCardHeader}>
                <Ionicons name="ticket" size={24} color={staticColors.primary} />
                <Text style={styles.statsCardTitle}>Biglietti Venduti</Text>
              </View>
              <Text style={styles.statsCardValue}>{stats.sold}</Text>
              <Text style={styles.statsCardSubtext}>tramite il tuo link</Text>
            </GlassCard>

            <GlassCard style={styles.statsCard}>
              <View style={styles.statsCardHeader}>
                <Ionicons name="trending-up" size={24} color={staticColors.teal} />
                <Text style={styles.statsCardTitle}>Ricavo Totale</Text>
              </View>
              <Text style={[styles.statsCardValue, { color: staticColors.teal }]}>
                €{stats.revenue.toFixed(2)}
              </Text>
              <Text style={styles.statsCardSubtext}>valore biglietti venduti</Text>
            </GlassCard>

            <GlassCard style={styles.statsCard}>
              <View style={styles.statsCardHeader}>
                <Ionicons name="wallet" size={24} color={staticColors.golden} />
                <Text style={styles.statsCardTitle}>La Tua Commissione</Text>
              </View>
              <Text style={[styles.statsCardValue, { color: staticColors.golden }]}>
                €{stats.commission.toFixed(2)}
              </Text>
              <Text style={styles.statsCardSubtext}>guadagno dalle vendite</Text>
            </GlassCard>

            <Card style={styles.statsDetailCard}>
              <Text style={styles.statsDetailTitle}>Riepilogo Performance</Text>
              <View style={styles.statsDetailRow}>
                <Text style={styles.statsDetailLabel}>Ospiti in lista</Text>
                <Text style={styles.statsDetailValue}>{guests.length}</Text>
              </View>
              <View style={styles.statsDetailRow}>
                <Text style={styles.statsDetailLabel}>Ospiti arrivati</Text>
                <Text style={styles.statsDetailValue}>{arrivedCount}</Text>
              </View>
              <View style={styles.statsDetailRow}>
                <Text style={styles.statsDetailLabel}>Tasso conversione</Text>
                <Text style={styles.statsDetailValue}>
                  {guests.length > 0 ? Math.round((arrivedCount / guests.length) * 100) : 0}%
                </Text>
              </View>
              <View style={styles.statsDetailRow}>
                <Text style={styles.statsDetailLabel}>Tavoli prenotati</Text>
                <Text style={styles.statsDetailValue}>{tables.filter(t => t.isBooked).length}</Text>
              </View>
            </Card>
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  heroContainer: {
    height: 280,
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.lg,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroBackButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  heroInfo: {
    gap: spacing.sm,
  },
  heroTitle: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroMetaText: {
    fontSize: typography.fontSize.sm,
    color: '#fff',
    opacity: 0.9,
  },
  shareCard: {
    margin: spacing.lg,
    marginBottom: spacing.md,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  shareTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  shareLink: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: staticColors.glass,
    borderRadius: borderRadius.md,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  buttonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: staticColors.glass,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  tabActive: {
    backgroundColor: staticColors.card,
    borderColor: staticColors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    fontWeight: '500',
  },
  tabTextActive: {
    color: staticColors.primary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  addButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  addGuestForm: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  formTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  listSelector: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginBottom: spacing.xs,
  },
  listOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: staticColors.glass,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  listOptionActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  listOptionText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  listOptionTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  batchGuestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  batchGuestNumber: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  batchGuestNumberText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  batchGuestInputs: {
    flex: 1,
    gap: spacing.sm,
  },
  batchInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  genderButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: staticColors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  genderButtonActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  removeGuestButton: {
    padding: spacing.xs,
    marginTop: spacing.sm,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  addMoreText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
    fontWeight: '500',
  },
  input: {
    backgroundColor: staticColors.glass,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  guestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  guestPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  guestPhone: {
    fontSize: typography.fontSize.sm,
    color: staticColors.primary,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  tableCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tableInfo: {
    flex: 1,
  },
  tableName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.xs,
  },
  tableMetaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tableMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tableMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  tableSectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  tableOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: staticColors.glass,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    minWidth: 80,
  },
  tableOptionActive: {
    backgroundColor: staticColors.golden,
    borderColor: staticColors.golden,
  },
  tableOptionName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  tableOptionNameActive: {
    color: staticColors.primaryForeground,
  },
  tableOptionMeta: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  tableOptionMetaActive: {
    color: staticColors.primaryForeground,
    opacity: 0.8,
  },
  bookingInfo: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  bookingName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  bookingGuests: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  statsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statsCardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  statsCardValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statsCardSubtext: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  statsDetailCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statsDetailTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  statsDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  statsDetailLabel: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
  },
  statsDetailValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  // Search styles
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.glass,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: staticColors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  searchResults: {
    marginTop: spacing.xs,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: staticColors.border,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  searchResultText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  searchResultPhone: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  // Gender selector styles
  genderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  genderButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.primary,
    marginLeft: spacing.xs,
  },
  genderButtonTextActive: {
    color: staticColors.primaryForeground,
  },
  // Tab scroll view
  tabScrollView: {
    marginBottom: spacing.md,
  },
  // Section title
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  // Prize styles
  prizeCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  prizeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  prizeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  prizeDetails: {
    flex: 1,
  },
  prizeName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  prizeDescription: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  prizeStats: {
    alignItems: 'flex-end',
  },
  prizeQuantity: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.golden,
  },
  prizeLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  prizeProgressBar: {
    height: 4,
    backgroundColor: staticColors.glass,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  prizeProgressFill: {
    height: '100%',
    backgroundColor: staticColors.golden,
    borderRadius: borderRadius.full,
  },
  // Link styles
  linkCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  linkCardInner: {
    padding: 0,
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  linkIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  linkUrl: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: staticColors.border,
    backgroundColor: staticColors.card,
  },
  modeButtonActive: {
    borderColor: staticColors.primary,
    backgroundColor: `${staticColors.primary}15`,
  },
  modeButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.mutedForeground,
  },
  modeButtonTextActive: {
    color: staticColors.primary,
  },
});
