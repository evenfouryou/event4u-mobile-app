import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius, shadows, gradients } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Loading } from '@/components/Loading';
import { triggerHaptic } from '@/lib/haptics';
import api, { PrEventDetail, PrGuestListEntry } from '@/lib/api';

interface PREventDashboardProps {
  eventId: string;
  onGoBack: () => void;
}

export function PREventDashboard({ eventId, onGoBack }: PREventDashboardProps) {
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<PrEventDetail | null>(null);
  const [guests, setGuests] = useState<PrGuestListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'guests' | 'tables'>('guests');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuest, setNewGuest] = useState({ firstName: '', lastName: '', phone: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, guestsData] = await Promise.all([
        api.getPrEventDetail(eventId).catch(() => null),
        api.getPrEventGuests(eventId).catch(() => []),
      ]);
      setEvent(eventData);
      setGuests(guestsData);
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onGoBack();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.eventName}</Text>
        <View style={{ width: 40 }} />
      </View>

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
        <GlassCard style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <View style={styles.dateBox}>
              <Text style={styles.dateDay}>{new Date(event.eventStart).getDate()}</Text>
              <Text style={styles.dateMonth}>
                {new Date(event.eventStart).toLocaleDateString('it-IT', { month: 'short' })}
              </Text>
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTime}>{formatTime(event.eventStart)}</Text>
              <View style={styles.eventMeta}>
                <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.eventMetaText}>{event.locationName}</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="people" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{guests.length}</Text>
            <Text style={styles.statLabel}>Ospiti</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={colors.teal} />
            <Text style={styles.statValue}>
              {guests.filter(g => g.status === 'arrived').length}
            </Text>
            <Text style={styles.statLabel}>Arrivati</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="cash" size={24} color={colors.golden} />
            <Text style={styles.statValue}>€{(event.earnings || 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>Guadagno</Text>
          </Card>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, activeTab === 'guests' && styles.tabActive]}
            onPress={() => setActiveTab('guests')}
          >
            <Text style={[styles.tabText, activeTab === 'guests' && styles.tabTextActive]}>
              Lista Ospiti
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'tables' && styles.tabActive]}
            onPress={() => setActiveTab('tables')}
          >
            <Text style={[styles.tabText, activeTab === 'tables' && styles.tabTextActive]}>
              Tavoli
            </Text>
          </Pressable>
        </View>

        {activeTab === 'guests' && (
          <>
            <Pressable
              onPress={() => setShowAddGuest(!showAddGuest)}
              style={styles.addButton}
            >
              <LinearGradient
                colors={gradients.golden}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addButtonGradient}
              >
                <Ionicons name="add" size={20} color={colors.primaryForeground} />
                <Text style={styles.addButtonText}>Aggiungi Ospite</Text>
              </LinearGradient>
            </Pressable>

            {showAddGuest && (
              <Card style={styles.addGuestForm}>
                <Text style={styles.formTitle}>Nuovo Ospite</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome *"
                  placeholderTextColor={colors.mutedForeground}
                  value={newGuest.firstName}
                  onChangeText={(text) => setNewGuest({ ...newGuest, firstName: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Cognome *"
                  placeholderTextColor={colors.mutedForeground}
                  value={newGuest.lastName}
                  onChangeText={(text) => setNewGuest({ ...newGuest, lastName: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Telefono (opzionale)"
                  placeholderTextColor={colors.mutedForeground}
                  value={newGuest.phone}
                  onChangeText={(text) => setNewGuest({ ...newGuest, phone: text })}
                  keyboardType="phone-pad"
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
                  >
                    Aggiungi
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
                      <Text style={styles.guestPhone}>{guest.phone}</Text>
                    )}
                  </View>
                  {getStatusBadge(guest.status)}
                </Card>
              ))
            )}
          </>
        )}

        {activeTab === 'tables' && (
          <View style={styles.emptyState}>
            <Ionicons name="grid-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun tavolo prenotato</Text>
            <Text style={styles.emptySubtext}>Le prenotazioni tavoli appariranno qui</Text>
          </View>
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
    padding: spacing.lg,
  },
  eventCard: {
    marginBottom: spacing.lg,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateBox: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.primaryForeground,
  },
  dateMonth: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.primaryForeground,
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
  },
  eventTime: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventMetaText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
    marginTop: spacing.xs,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
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
  },
  addButton: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  addButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  addGuestForm: {
    marginBottom: spacing.lg,
  },
  formTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.foreground,
    marginTop: spacing.md,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
  guestPhone: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
});
