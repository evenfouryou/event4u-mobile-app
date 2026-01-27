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

interface ReturnItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  reason: string;
  sourceLocation: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  requestedAt: string;
  requestedBy: string;
  notes?: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'completed' | 'rejected';

const RETURN_REASONS = [
  'Prodotto non utilizzato',
  'Evento annullato',
  'Eccedenza inventario',
  'Prodotto danneggiato',
  'Prodotto scaduto',
  'Altro',
];

interface GestoreReturnToWarehouseScreenProps {
  onBack: () => void;
}

const mockReturns: ReturnItem[] = [
  {
    id: '1',
    productId: 'p1',
    productName: 'Vodka Premium',
    quantity: 5,
    unit: 'bottiglie',
    reason: 'Prodotto non utilizzato',
    sourceLocation: 'Bar Principale',
    status: 'pending',
    requestedAt: '2024-01-27T14:30:00Z',
    requestedBy: 'Marco R.',
  },
  {
    id: '2',
    productId: 'p2',
    productName: 'Gin London Dry',
    quantity: 3,
    unit: 'bottiglie',
    reason: 'Evento annullato',
    sourceLocation: 'VIP Lounge',
    status: 'approved',
    requestedAt: '2024-01-27T12:00:00Z',
    requestedBy: 'Sara L.',
    notes: 'Da ritirare entro domani',
  },
  {
    id: '3',
    productId: 'p3',
    productName: 'Champagne Brut',
    quantity: 2,
    unit: 'bottiglie',
    reason: 'Eccedenza inventario',
    sourceLocation: 'Bar Esterno',
    status: 'completed',
    requestedAt: '2024-01-26T18:00:00Z',
    requestedBy: 'Luca P.',
  },
  {
    id: '4',
    productId: 'p4',
    productName: 'Whisky Single Malt',
    quantity: 1,
    unit: 'bottiglia',
    reason: 'Prodotto danneggiato',
    sourceLocation: 'Bar Principale',
    status: 'rejected',
    requestedAt: '2024-01-26T16:00:00Z',
    requestedBy: 'Anna V.',
    notes: 'Prodotto già aperto, non restituibile',
  },
];

export function GestoreReturnToWarehouseScreen({ onBack }: GestoreReturnToWarehouseScreenProps) {
  const { colors, gradients } = useTheme();
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showNewReturnModal, setShowNewReturnModal] = useState(false);

  useEffect(() => {
    loadReturns();
  }, []);

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
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setReturns(mockReturns);
    } catch (error) {
      console.error('Error loading returns:', error);
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
        r.productName.toLowerCase().includes(query) ||
        r.sourceLocation.toLowerCase().includes(query) ||
        r.requestedBy.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [returns, filterStatus, searchQuery]);

  const pendingCount = useMemo(() => returns.filter(r => r.status === 'pending').length, [returns]);

  const getStatusBadge = (status: ReturnItem['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">In Attesa</Badge>;
      case 'approved':
        return <Badge variant="default">Approvato</Badge>;
      case 'completed':
        return <Badge variant="success">Completato</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rifiutato</Badge>;
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

  const handleApprove = (item: ReturnItem) => {
    triggerHaptic('medium');
    Alert.alert(
      'Approva Reso',
      `Vuoi approvare il reso di ${item.quantity} ${item.unit} di "${item.productName}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Approva',
          onPress: () => {
            setReturns(returns.map(r =>
              r.id === item.id ? { ...r, status: 'approved' as const } : r
            ));
            triggerHaptic('success');
          },
        },
      ]
    );
  };

  const handleReject = (item: ReturnItem) => {
    triggerHaptic('medium');
    Alert.alert(
      'Rifiuta Reso',
      `Vuoi rifiutare il reso di "${item.productName}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rifiuta',
          style: 'destructive',
          onPress: () => {
            setReturns(returns.map(r =>
              r.id === item.id ? { ...r, status: 'rejected' as const } : r
            ));
            triggerHaptic('success');
          },
        },
      ]
    );
  };

  const handleComplete = (item: ReturnItem) => {
    triggerHaptic('medium');
    Alert.alert(
      'Conferma Reso',
      `Confermi che il reso di ${item.quantity} ${item.unit} di "${item.productName}" è stato completato?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: () => {
            setReturns(returns.map(r =>
              r.id === item.id ? { ...r, status: 'completed' as const } : r
            ));
            triggerHaptic('success');
          },
        },
      ]
    );
  };

  const filters: { id: FilterStatus; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'pending', label: 'In Attesa' },
    { id: 'approved', label: 'Approvati' },
    { id: 'completed', label: 'Completati' },
    { id: 'rejected', label: 'Rifiutati' },
  ];

  const renderReturn = ({ item }: { item: ReturnItem }) => (
    <Card style={styles.returnCard} testID={`return-${item.id}`}>
      <View style={styles.returnHeader}>
        <View style={[styles.returnIcon, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="arrow-undo" size={24} color={colors.primary} />
        </View>
        <View style={styles.returnInfo}>
          <Text style={[styles.returnProductName, { color: colors.foreground }]} numberOfLines={1}>
            {item.productName}
          </Text>
          <View style={styles.returnMeta}>
            <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.returnMetaText, { color: colors.mutedForeground }]}>
              {item.sourceLocation}
            </Text>
          </View>
        </View>
        {getStatusBadge(item.status)}
      </View>

      <View style={[styles.returnDivider, { backgroundColor: colors.border }]} />

      <View style={styles.returnDetails}>
        <View style={styles.returnDetail}>
          <Text style={[styles.returnDetailLabel, { color: colors.mutedForeground }]}>Quantità</Text>
          <Text style={[styles.returnDetailValue, { color: colors.foreground }]}>
            {item.quantity} {item.unit}
          </Text>
        </View>
        <View style={styles.returnDetail}>
          <Text style={[styles.returnDetailLabel, { color: colors.mutedForeground }]}>Motivo</Text>
          <Text style={[styles.returnDetailValue, { color: colors.foreground }]} numberOfLines={1}>
            {item.reason}
          </Text>
        </View>
      </View>

      <View style={styles.returnFooter}>
        <View style={styles.returnRequestInfo}>
          <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.returnRequestText, { color: colors.mutedForeground }]}>
            {item.requestedBy} • {formatDate(item.requestedAt)}
          </Text>
        </View>
      </View>

      {item.notes && (
        <View style={[styles.notesContainer, { backgroundColor: `${colors.mutedForeground}10` }]}>
          <Ionicons name="document-text-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.notesText, { color: colors.mutedForeground }]}>{item.notes}</Text>
        </View>
      )}

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: `${staticColors.success}15` }]}
            onPress={() => handleApprove(item)}
            testID={`button-approve-${item.id}`}
          >
            <Ionicons name="checkmark" size={20} color={staticColors.success} />
            <Text style={[styles.actionButtonText, { color: staticColors.success }]}>Approva</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: `${colors.destructive}15` }]}
            onPress={() => handleReject(item)}
            testID={`button-reject-${item.id}`}
          >
            <Ionicons name="close" size={20} color={colors.destructive} />
            <Text style={[styles.actionButtonText, { color: colors.destructive }]}>Rifiuta</Text>
          </Pressable>
        </View>
      )}

      {item.status === 'approved' && (
        <Pressable
          style={[styles.completeButton, { backgroundColor: colors.primary }]}
          onPress={() => handleComplete(item)}
          testID={`button-complete-${item.id}`}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.primaryForeground} />
          <Text style={[styles.completeButtonText, { color: colors.primaryForeground }]}>
            Conferma Reso Completato
          </Text>
        </Pressable>
      )}
    </Card>
  );

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
