import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { PriceList } from '@/lib/api';

interface GestorePriceListsScreenProps {
  onBack: () => void;
}

export function GestorePriceListsScreen({ onBack }: GestorePriceListsScreenProps) {
  const { colors } = useTheme();
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getGestorePriceLists();
      setPriceLists(data);
    } catch (err) {
      console.error('Error loading price lists:', err);
      setError('Errore nel caricamento dei listini');
      setPriceLists([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredPriceLists = priceLists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: PriceList['status'], isDefault?: boolean) => {
    if (isDefault) {
      return <Badge variant="default">Predefinito</Badge>;
    }
    switch (status) {
      case 'active':
        return <Badge variant="success">Attivo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inattivo</Badge>;
      case 'draft':
        return <Badge variant="warning">Bozza</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: PriceList['status']) => {
    switch (status) {
      case 'active':
        return 'checkmark-circle';
      case 'inactive':
        return 'pause-circle';
      case 'draft':
        return 'document-text';
      default:
        return 'pricetag';
    }
  };

  const handlePriceListPress = (priceList: PriceList) => {
    triggerHaptic('selection');
    Alert.alert(
      priceList.name,
      `${priceList.description || 'Nessuna descrizione'}\n\nProdotti: ${priceList.productsCount}\nStato: ${priceList.status === 'active' ? 'Attivo' : priceList.status === 'inactive' ? 'Inattivo' : 'Bozza'}`,
      [
        { text: 'Chiudi', style: 'cancel' },
        { text: 'Visualizza Dettagli', onPress: () => Alert.alert('Dettagli', 'Usa il pannello web per vedere i dettagli completi') },
      ]
    );
  };

  const handleEditPriceList = (priceList: PriceList) => {
    triggerHaptic('selection');
    Alert.alert('Modifica Listino', 'Usa il pannello web per modificare i listini prezzi');
  };

  const handleToggleStatus = (priceList: PriceList) => {
    triggerHaptic('selection');
    const newStatus = priceList.status === 'active' ? 'Disattivare' : 'Attivare';
    Alert.alert(
      `${newStatus} Listino`,
      `Vuoi ${newStatus.toLowerCase()} il listino "${priceList.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Conferma', onPress: () => Alert.alert('Info', 'Usa il pannello web per modificare lo stato dei listini') },
      ]
    );
  };

  const renderPriceList = ({ item }: { item: PriceList }) => (
    <Pressable onPress={() => handlePriceListPress(item)} testID={`pricelist-item-${item.id}`}>
      <Card style={styles.priceListCard}>
        <View style={styles.priceListHeader}>
          <View style={[styles.priceListIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name={getStatusIcon(item.status)} size={24} color={colors.primary} />
          </View>
          <View style={styles.priceListInfo}>
            <View style={styles.priceListTitleRow}>
              <Text style={[styles.priceListName, { color: colors.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.isDefault && (
                <Ionicons name="star" size={16} color={colors.warning} style={styles.defaultIcon} />
              )}
            </View>
            {item.description && (
              <Text style={[styles.priceListDescription, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.description}
              </Text>
            )}
          </View>
          {getStatusBadge(item.status, item.isDefault)}
        </View>
        
        <View style={[styles.priceListDivider, { backgroundColor: colors.border }]} />
        
        <View style={styles.priceListStats}>
          <View style={styles.priceListStat}>
            <Ionicons name="cube-outline" size={20} color={colors.mutedForeground} />
            <Text style={[styles.priceListStatValue, { color: colors.foreground }]}>
              {item.productsCount}
            </Text>
            <Text style={[styles.priceListStatLabel, { color: colors.mutedForeground }]}>
              Prodotti
            </Text>
          </View>
          <View style={styles.priceListStat}>
            <Ionicons 
              name={item.status === 'active' ? 'checkmark-circle-outline' : 'pause-circle-outline'} 
              size={20} 
              color={item.status === 'active' ? colors.success : colors.mutedForeground} 
            />
            <Text style={[styles.priceListStatValue, { color: colors.foreground }]}>
              {item.status === 'active' ? 'Attivo' : item.status === 'inactive' ? 'Inattivo' : 'Bozza'}
            </Text>
            <Text style={[styles.priceListStatLabel, { color: colors.mutedForeground }]}>
              Stato
            </Text>
          </View>
        </View>

        <View style={styles.priceListActions}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: `${colors.primary}15` }]}
            onPress={() => handlePriceListPress(item)}
            testID={`button-view-pricelist-${item.id}`}
          >
            <Ionicons name="eye" size={16} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Dettagli</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: `${colors.secondary}` }]}
            onPress={() => handleEditPriceList(item)}
            testID={`button-edit-pricelist-${item.id}`}
          >
            <Ionicons name="pencil" size={16} color={colors.foreground} />
            <Text style={[styles.actionButtonText, { color: colors.foreground }]}>Modifica</Text>
          </Pressable>
          <Pressable
            style={[
              styles.actionButton, 
              { backgroundColor: item.status === 'active' ? `${colors.warning}15` : `${colors.success}15` }
            ]}
            onPress={() => handleToggleStatus(item)}
            testID={`button-toggle-pricelist-${item.id}`}
          >
            <Ionicons 
              name={item.status === 'active' ? 'pause' : 'play'} 
              size={16} 
              color={item.status === 'active' ? colors.warning : colors.success} 
            />
            <Text 
              style={[
                styles.actionButtonText, 
                { color: item.status === 'active' ? colors.warning : colors.success }
              ]}
            >
              {item.status === 'active' ? 'Disattiva' : 'Attiva'}
            </Text>
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="pricetags-outline" size={64} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {searchQuery ? 'Nessun listino trovato' : 'Nessun listino prezzi'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {searchQuery ? 'Prova con una ricerca diversa' : 'Crea listini prezzi dal pannello web'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Errore</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{error}</Text>
      <Pressable
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={loadData}
        testID="button-retry"
      >
        <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>Riprova</Text>
      </Pressable>
    </View>
  );

  const renderSummary = () => {
    const activeCount = priceLists.filter(p => p.status === 'active').length;
    const totalProducts = priceLists.reduce((sum, p) => sum + p.productsCount, 0);
    
    return (
      <View style={styles.summaryContainer}>
        <Card style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: `${colors.primary}10` }]) as ViewStyle}>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{priceLists.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Listini Totali</Text>
        </Card>
        <Card style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: `${colors.success}10` }]) as ViewStyle}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{activeCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Attivi</Text>
        </Card>
        <Card style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: `${colors.warning}10` }]) as ViewStyle}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{totalProducts}</Text>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Prodotti</Text>
        </Card>
      </View>
    );
  };

  return (
    <SafeArea edges={['bottom']} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as ViewStyle}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-pricelists"
      />

      <View style={styles.titleContainer}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Listini Prezzi</Text>
        <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
          Gestisci i listini della tua attività
        </Text>
      </View>

      {!isLoading && !error && priceLists.length > 0 && renderSummary()}

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.secondary }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca listini..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-pricelists"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {showLoader ? (
        <Loading text="Caricamento listini..." />
      ) : error ? (
        renderError()
      ) : filteredPriceLists.length > 0 ? (
        <FlatList
          data={filteredPriceLists}
          renderItem={renderPriceList}
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
        renderEmptyState()
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          triggerHaptic('selection');
          Alert.alert('Nuovo Listino', 'Usa il pannello web per creare nuovi listini prezzi');
        }}
        testID="button-add-pricelist"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </Pressable>
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
    paddingBottom: spacing.xs,
  },
  screenTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  priceListCard: {
    padding: spacing.md,
  },
  priceListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  priceListIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceListInfo: {
    flex: 1,
  },
  priceListTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceListName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    flex: 1,
  },
  defaultIcon: {
    marginLeft: spacing.xs,
  },
  priceListDescription: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  priceListDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  priceListStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  priceListStat: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceListStatValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  priceListStatLabel: {
    fontSize: typography.fontSize.xs,
  },
  priceListActions: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default GestorePriceListsScreen;
