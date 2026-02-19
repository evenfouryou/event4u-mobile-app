import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { WarehouseReturn } from '@/lib/api';

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed';

interface GestoreReturnToWarehouseScreenProps {
  onBack: () => void;
  eventId?: string;
}

export function GestoreReturnToWarehouseScreen({ onBack, eventId }: GestoreReturnToWarehouseScreenProps) {
  const { colors, gradients } = useTheme();
  const [returns, setReturns] = useState<WarehouseReturn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadReturns();
    } else {
      setIsLoading(false);
    }
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

  const loadReturns = async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await api.getWarehouseReturns(eventId);
      setReturns(data);
    } catch (error) {
      console.error('Error loading returns:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReturns();
    setRefreshing(false);
  };

  const filteredReturns = useMemo(() => {
    let filtered = returns;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.eventName.toLowerCase().includes(query) ||
        r.items.some(item => item.productName.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [returns, filterStatus, searchQuery]);

  const pendingCount = useMemo(() => returns.filter(r => r.status === 'pending').length, [returns]);

  const getStatusBadge = (status: WarehouseReturn['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">In Attesa</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Corso</Badge>;
      case 'completed':
        return <Badge variant="success">Completato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStartProcessing = (item: WarehouseReturn) => {
    triggerHaptic('medium');
    Alert.alert(
      'Funzionalità non disponibile',
      'L\'elaborazione dei resi sarà disponibile in una prossima versione. Contatta l\'assistenza per maggiori informazioni.',
      [{ text: 'OK' }]
    );
  };

  const handleComplete = (item: WarehouseReturn) => {
    triggerHaptic('medium');
    Alert.alert(
      'Funzionalità non disponibile',
      'Il completamento dei resi sarà disponibile in una prossima versione. Contatta l\'assistenza per maggiori informazioni.',
      [{ text: 'OK' }]
    );
  };

  const filters: { id: FilterStatus; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'pending', label: 'In Attesa' },
    { id: 'in_progress', label: 'In Corso' },
    { id: 'completed', label: 'Completati' },
  ];

  const renderReturn = ({ item }: { item: WarehouseReturn }) => {
    const totalReturned = item.items.reduce((sum, i) => sum + i.quantityReturned, 0);
    return (
    <Card style={styles.returnCard} testID={`return-${item.id}`}>
      <View style={styles.returnHeader}>
        <View style={[styles.returnIcon, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="arrow-undo" size={24} color={colors.primary} />
        </View>
        <View style={styles.returnInfo}>
          <Text style={[styles.returnProductName, { color: colors.foreground }]} numberOfLines={1}>
            {item.eventName}
          </Text>
          <View style={styles.returnMeta}>
            <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.returnMetaText, { color: colors.mutedForeground }]}>
              {formatDate(item.returnDate)}
            </Text>
          </View>
        </View>
        {getStatusBadge(item.status)}
      </View>

      <View style={[styles.returnDivider, { backgroundColor: colors.border }]} />

      <View style={styles.returnDetails}>
        <View style={styles.returnDetail}>
          <Text style={[styles.returnDetailLabel, { color: colors.mutedForeground }]}>Prodotti</Text>
          <Text style={[styles.returnDetailValue, { color: colors.foreground }]}>
            {item.items.length}
          </Text>
        </View>
        <View style={styles.returnDetail}>
          <Text style={[styles.returnDetailLabel, { color: colors.mutedForeground }]}>Da Restituire</Text>
          <Text style={[styles.returnDetailValue, { color: colors.foreground }]}>
            {totalReturned} unità
          </Text>
        </View>
      </View>

      {item.items.length > 0 && (
        <View style={[styles.itemsList, { borderTopColor: colors.border }]}>
          {item.items.slice(0, 3).map((product, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                {product.productName}
              </Text>
              <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>
                {product.quantityReturned} da {product.stationName}
              </Text>
            </View>
          ))}
          {item.items.length > 3 && (
            <Text style={[styles.moreItems, { color: colors.primary }]}>
              +{item.items.length - 3} altri prodotti
            </Text>
          )}
        </View>
      )}

      {item.processedBy && (
        <View style={styles.returnFooter}>
          <View style={styles.returnRequestInfo}>
            <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.returnRequestText, { color: colors.mutedForeground }]}>
              Elaborato da: {item.processedBy}
            </Text>
          </View>
        </View>
      )}

      {item.notes && (
        <View style={[styles.notesContainer, { backgroundColor: `${colors.mutedForeground}10` }]}>
          <Ionicons name="document-text-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.notesText, { color: colors.mutedForeground }]}>{item.notes}</Text>
        </View>
      )}

      {item.status === 'pending' && (
        <Pressable
          style={[styles.completeButton, { backgroundColor: colors.primary }]}
          onPress={() => handleStartProcessing(item)}
          testID={`button-start-${item.id}`}
        >
          <Ionicons name="play" size={20} color={colors.primaryForeground} />
          <Text style={[styles.completeButtonText, { color: colors.primaryForeground }]}>
            Avvia Elaborazione
          </Text>
        </Pressable>
      )}

      {item.status === 'in_progress' && (
        <Pressable
          style={[styles.completeButton, { backgroundColor: staticColors.success }]}
          onPress={() => handleComplete(item)}
          testID={`button-complete-${item.id}`}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={[styles.completeButtonText, { color: '#FFFFFF' }]}>
            Conferma Reso Completato
          </Text>
        </Pressable>
      )}
    </Card>
  );
  };

  if (hasError || !eventId) {
    return (
      <SafeArea edges={['bottom']} style={{...styles.container, backgroundColor: colors.background}}>
        <Header showLogo showBack onBack={onBack} testID="header-return-warehouse" />
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>
            {!eventId ? 'Evento non selezionato' : 'Errore di caricamento'}
          </Text>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            {!eventId ? 'Seleziona un evento per visualizzare i resi.' : 'Impossibile caricare i resi. Riprova.'}
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={eventId ? loadReturns : onBack}
            testID="button-retry"
          >
            <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>
              {eventId ? 'Riprova' : 'Torna indietro'}
            </Text>
          </Pressable>
        </View>
      </SafeArea>
    );
  }

  if (showLoader) {
    return (
      <SafeArea edges={['bottom']} style={{...styles.container, backgroundColor: colors.background}}>
        <Header showLogo showBack onBack={onBack} testID="header-return-warehouse" />
        <Loading text="Caricamento resi..." />
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={{...styles.container, backgroundColor: colors.background}}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-return-warehouse"
      />

      <View style={styles.titleContainer}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Resi a Magazzino</Text>
        <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
          {returns.length} richieste • {pendingCount} in attesa
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.secondary }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca resi..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-returns"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                setFilterStatus(item.id);
              }}
              style={[
                styles.filterChip,
                { backgroundColor: filterStatus === item.id ? colors.primary : colors.secondary },
              ]}
              testID={`filter-${item.id}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: filterStatus === item.id ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {showLoader ? (
        <Loading text="Caricamento resi..." />
      ) : filteredReturns.length > 0 ? (
        <FlatList
          data={filteredReturns}
          renderItem={renderReturn}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="arrow-undo-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {searchQuery || filterStatus !== 'all' ? 'Nessun reso trovato' : 'Nessun reso registrato'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {searchQuery ? 'Prova con una ricerca diversa' : 'I resi appariranno qui'}
          </Text>
        </View>
      )}

      <View style={styles.fabContainer}>
        <Pressable
          onPress={() => {
            triggerHaptic('medium');
            Alert.alert(
              'Nuovo Reso',
              'La creazione di nuovi resi è disponibile dal pannello web.',
              [{ text: 'OK' }]
            );
          }}
          testID="button-new-return"
        >
          <LinearGradient
            colors={gradients.golden}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color={staticColors.primaryForeground} />
          </LinearGradient>
        </Pressable>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  screenTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },
  filtersContainer: {
    paddingBottom: spacing.sm,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  returnCard: {
    padding: spacing.md,
  },
  returnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  returnIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnInfo: {
    flex: 1,
    gap: 4,
  },
  returnProductName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  returnMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  returnMetaText: {
    fontSize: typography.fontSize.sm,
  },
  returnDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  returnDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  returnDetail: {
    flex: 1,
    gap: 4,
  },
  returnDetailLabel: {
    fontSize: typography.fontSize.xs,
  },
  returnDetailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  itemsList: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    flex: 1,
  },
  itemQty: {
    fontSize: typography.fontSize.xs,
    marginLeft: spacing.sm,
  },
  moreItems: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  returnFooter: {
    marginTop: spacing.md,
  },
  returnRequestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  returnRequestText: {
    fontSize: typography.fontSize.xs,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  notesText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  completeButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
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
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  errorText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default GestoreReturnToWarehouseScreen;
