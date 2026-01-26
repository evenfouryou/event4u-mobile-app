import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput, Alert, Image, Share, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius, shadows } from '@/lib/theme';
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

type TabType = 'guests' | 'tables' | 'stats';

interface BatchGuest {
  firstName: string;
  lastName: string;
  phone: string;
  gender: 'M' | 'F';
}

export function PREventDashboard({ eventId, onGoBack }: PREventDashboardProps) {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<PrEventDetail | null>(null);
  const [guests, setGuests] = useState<PrGuestListEntry[]>([]);
  const [guestLists, setGuestLists] = useState<PrGuestList[]>([]);
  const [tables, setTables] = useState<PrEventTable[]>([]);
  const [stats, setStats] = useState<PrTicketStats>({ sold: 0, revenue: 0, commission: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('guests');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [newGuest, setNewGuest] = useState({ firstName: '', lastName: '', phone: '' });
  const [adding, setAdding] = useState(false);
  
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, guestsData, listsData, tablesData, statsData] = await Promise.all([
        api.getPrEventDetail(eventId).catch(() => null),
        api.getPrEventGuests(eventId).catch(() => []),
        api.getPrEventGuestLists(eventId).catch(() => []),
        api.getPrEventTables(eventId).catch(() => []),
        api.getPrEventStats(eventId).catch(() => ({ sold: 0, revenue: 0, commission: 0 })),
      ]);
      setEvent(eventData);
      setGuests(guestsData);
      setGuestLists(listsData);
      setTables(tablesData);
      setStats(statsData);
      if (listsData.length > 0 && !selectedListId) {
        setSelectedListId(listsData[0].id);
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    } finally {
      setLoading(false);
    }
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
    try {
      setAdding(true);
      await api.addPrGuest(eventId, newGuest);
      await loadData();
      setNewGuest({ firstName: '', lastName: '', phone: '' });
      setShowAddGuest(false);
      triggerHaptic('success');
      Alert.alert('Successo', 'Ospite aggiunto alla lista');
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile aggiungere ospite');
    } finally {
      setAdding(false);
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

  if (loading) {
    return <Loading text="Caricamento evento..." />;
  }

  if (!event) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
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
            tintColor={colors.primary}
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
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle} numberOfLines={2}>{event.eventName}</Text>
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
              <Ionicons name="link" size={20} color={colors.primary} />
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
                  <Ionicons name="share-social" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Condividi Link</Text>
                </View>
              </Button>
            </View>
          </Card>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="people" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{guests.length}</Text>
            <Text style={styles.statLabel}>Ospiti</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={colors.teal} />
            <Text style={styles.statValue}>{arrivedCount}</Text>
            <Text style={styles.statLabel}>Arrivati</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="cash" size={24} color={colors.golden} />
            <Text style={styles.statValue}>€{(event.earnings || stats.commission || 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>Guadagno</Text>
          </Card>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, activeTab === 'guests' && styles.tabActive]}
            onPress={() => setActiveTab('guests')}
            testID="tab-guests"
          >
            <Ionicons name="people-outline" size={18} color={activeTab === 'guests' ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabText, activeTab === 'guests' && styles.tabTextActive]}>
              Ospiti
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'tables' && styles.tabActive]}
            onPress={() => setActiveTab('tables')}
            testID="tab-tables"
          >
            <Ionicons name="grid-outline" size={18} color={activeTab === 'tables' ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabText, activeTab === 'tables' && styles.tabTextActive]}>
              Tavoli
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
            onPress={() => setActiveTab('stats')}
            testID="tab-stats"
          >
            <Ionicons name="stats-chart-outline" size={18} color={activeTab === 'stats' ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
              Statistiche
            </Text>
          </Pressable>
        </View>

        {/* Guests Tab */}
        {activeTab === 'guests' && (
          <>
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
                  <Ionicons name="person-add" size={18} color={colors.primaryForeground} />
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
                  <Ionicons name="people" size={18} color={colors.primaryForeground} />
                  <Text style={styles.addButtonText}>Multiplo (max 10)</Text>
                </LinearGradient>
              </Pressable>
            </View>

            {showAddGuest && (
              <Card style={styles.addGuestForm}>
                <Text style={styles.formTitle}>Nuovo Ospite</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome *"
                  placeholderTextColor={colors.mutedForeground}
                  value={newGuest.firstName}
                  onChangeText={(text) => setNewGuest({ ...newGuest, firstName: text })}
                  testID="input-first-name"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Cognome *"
                  placeholderTextColor={colors.mutedForeground}
                  value={newGuest.lastName}
                  onChangeText={(text) => setNewGuest({ ...newGuest, lastName: text })}
                  testID="input-last-name"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Telefono (opzionale)"
                  placeholderTextColor={colors.mutedForeground}
                  value={newGuest.phone}
                  onChangeText={(text) => setNewGuest({ ...newGuest, phone: text })}
                  keyboardType="phone-pad"
                  testID="input-phone"
                />
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

            {showBatchAdd && (
              <Card style={styles.addGuestForm}>
                <View style={styles.batchHeader}>
                  <Text style={styles.formTitle}>Aggiungi Multipli</Text>
                  <Badge variant="secondary">
                    <Text style={styles.statusText}>{batchGuests.length}/10</Text>
                  </Badge>
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
                          placeholderTextColor={colors.mutedForeground}
                          value={guest.firstName}
                          onChangeText={(text) => updateBatchGuest(index, 'firstName', text)}
                        />
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="Cognome *"
                          placeholderTextColor={colors.mutedForeground}
                          value={guest.lastName}
                          onChangeText={(text) => updateBatchGuest(index, 'lastName', text)}
                        />
                      </View>
                      <View style={styles.batchInputRow}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="Telefono *"
                          placeholderTextColor={colors.mutedForeground}
                          value={guest.phone}
                          onChangeText={(text) => updateBatchGuest(index, 'phone', text)}
                          keyboardType="phone-pad"
                        />
                        <View style={styles.genderButtons}>
                          <Pressable
                            style={[styles.genderButton, guest.gender === 'M' && styles.genderButtonActive]}
                            onPress={() => updateBatchGuest(index, 'gender', 'M')}
                          >
                            <Ionicons name="male" size={18} color={guest.gender === 'M' ? colors.primaryForeground : colors.primary} />
                          </Pressable>
                          <Pressable
                            style={[styles.genderButton, guest.gender === 'F' && styles.genderButtonActive]}
                            onPress={() => updateBatchGuest(index, 'gender', 'F')}
                          >
                            <Ionicons name="female" size={18} color={guest.gender === 'F' ? colors.primaryForeground : colors.primary} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                    {batchGuests.length > 1 && (
                      <Pressable
                        onPress={() => removeBatchGuest(index)}
                        style={styles.removeGuestButton}
                      >
                        <Ionicons name="close-circle" size={24} color={colors.destructive} />
                      </Pressable>
                    )}
                  </View>
                ))}

                {batchGuests.length < 10 && (
                  <Pressable onPress={addBatchGuest} style={styles.addMoreButton}>
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
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

            {guests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
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
                        <Ionicons name="call-outline" size={14} color={colors.primary} />
                        <Text style={styles.guestPhone}>{guest.phone}</Text>
                      </Pressable>
                    )}
                  </View>
                  {getStatusBadge(guest.status)}
                </Card>
              ))
            )}
          </>
        )}

        {/* Tables Tab */}
        {activeTab === 'tables' && (
          <>
            {availableTables.length > 0 && (
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
                  <Ionicons name="add-circle" size={18} color={colors.primaryForeground} />
                  <Text style={styles.addButtonText}>Prenota Tavolo</Text>
                </LinearGradient>
              </Pressable>
            )}

            {showBookTable && availableTables.length > 0 && (
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
                  placeholderTextColor={colors.mutedForeground}
                  value={tableBooking.customerName}
                  onChangeText={(text) => setTableBooking({ ...tableBooking, customerName: text })}
                  testID="input-customer-name"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Telefono cliente"
                  placeholderTextColor={colors.mutedForeground}
                  value={tableBooking.customerPhone}
                  onChangeText={(text) => setTableBooking({ ...tableBooking, customerPhone: text })}
                  keyboardType="phone-pad"
                  testID="input-customer-phone"
                />
                <View style={styles.batchInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Numero ospiti"
                    placeholderTextColor={colors.mutedForeground}
                    value={tableBooking.guestCount}
                    onChangeText={(text) => setTableBooking({ ...tableBooking, guestCount: text.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                    testID="input-guest-count"
                  />
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    placeholder="Note (opzionale)"
                    placeholderTextColor={colors.mutedForeground}
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

            {tables.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="grid-outline" size={48} color={colors.mutedForeground} />
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
                            <Ionicons name="people" size={14} color={colors.mutedForeground} />
                            <Text style={styles.tableMetaText}>{table.capacity} posti</Text>
                          </View>
                          {table.minSpend && (
                            <View style={styles.tableMetaItem}>
                              <Ionicons name="cash" size={14} color={colors.golden} />
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
                            setShowBookTable(true);
                          }}
                        >
                          <Badge variant="outline">
                            <Text style={[styles.statusText, { color: colors.primary }]}>Prenota</Text>
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
            )}
          </>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <>
            <GlassCard style={styles.statsCard}>
              <View style={styles.statsCardHeader}>
                <Ionicons name="ticket" size={24} color={colors.primary} />
                <Text style={styles.statsCardTitle}>Biglietti Venduti</Text>
              </View>
              <Text style={styles.statsCardValue}>{stats.sold}</Text>
              <Text style={styles.statsCardSubtext}>tramite il tuo link</Text>
            </GlassCard>

            <GlassCard style={styles.statsCard}>
              <View style={styles.statsCardHeader}>
                <Ionicons name="trending-up" size={24} color={colors.teal} />
                <Text style={styles.statsCardTitle}>Ricavo Totale</Text>
              </View>
              <Text style={[styles.statsCardValue, { color: colors.teal }]}>
                €{stats.revenue.toFixed(2)}
              </Text>
              <Text style={styles.statsCardSubtext}>valore biglietti venduti</Text>
            </GlassCard>

            <GlassCard style={styles.statsCard}>
              <View style={styles.statsCardHeader}>
                <Ionicons name="wallet" size={24} color={colors.golden} />
                <Text style={styles.statsCardTitle}>La Tua Commissione</Text>
              </View>
              <Text style={[styles.statsCardValue, { color: colors.golden }]}>
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.foreground,
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
  },
  heroBackButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    gap: spacing.sm,
  },
  heroTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: '#fff',
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
    color: colors.foreground,
  },
  shareLink: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.glass,
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
    color: colors.primary,
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
    color: colors.foreground,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.card,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
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
    color: colors.primaryForeground,
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
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  listSelector: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  listOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  listOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  listOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  listOptionTextActive: {
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  batchGuestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  batchGuestNumber: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  batchGuestNumberText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.primaryForeground,
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
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  genderButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    color: colors.primary,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.foreground,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
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
    color: colors.foreground,
  },
  guestPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  guestPhone: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
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
    color: colors.foreground,
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
    color: colors.mutedForeground,
  },
  tableSectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  tableOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    minWidth: 80,
  },
  tableOptionActive: {
    backgroundColor: colors.golden,
    borderColor: colors.golden,
  },
  tableOptionName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.foreground,
  },
  tableOptionNameActive: {
    color: colors.primaryForeground,
  },
  tableOptionMeta: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  tableOptionMetaActive: {
    color: colors.primaryForeground,
    opacity: 0.8,
  },
  bookingInfo: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bookingName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.foreground,
  },
  bookingGuests: {
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
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
    color: colors.foreground,
  },
  statsCardValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: colors.foreground,
  },
  statsCardSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  statsDetailCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statsDetailTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  statsDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsDetailLabel: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
  },
  statsDetailValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
  },
});
