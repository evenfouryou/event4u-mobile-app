import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';

interface PriceListItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface PriceList {
  id: string;
  name: string;
  eventName?: string;
  itemCount: number;
  isActive: boolean;
  createdAt: string;
  items: PriceListItem[];
}

export function PriceListsScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedList, setExpandedList] = useState<string | null>(null);
  
  const [priceLists, setPriceLists] = useState<PriceList[]>([
    {
      id: '1',
      name: 'Listino Standard',
      eventName: 'Tutti gli eventi',
      itemCount: 24,
      isActive: true,
      createdAt: '2024-01-15',
      items: [
        { id: '1-1', name: 'Ingresso Standard', price: 15, category: 'Ingresso' },
        { id: '1-2', name: 'Ingresso VIP', price: 30, category: 'Ingresso' },
        { id: '1-3', name: 'Tavolo Riservato', price: 100, category: 'Tavoli' },
      ],
    },
    {
      id: '2',
      name: 'Listino Weekend',
      eventName: 'Eventi Weekend',
      itemCount: 18,
      isActive: true,
      createdAt: '2024-01-10',
      items: [
        { id: '2-1', name: 'Ingresso Weekend', price: 20, category: 'Ingresso' },
        { id: '2-2', name: 'Ingresso VIP Weekend', price: 40, category: 'Ingresso' },
      ],
    },
    {
      id: '3',
      name: 'Listino Capodanno',
      eventName: 'Capodanno 2025',
      itemCount: 12,
      isActive: false,
      createdAt: '2023-12-01',
      items: [
        { id: '3-1', name: 'Cena + Party', price: 80, category: 'Pacchetti' },
        { id: '3-2', name: 'Solo Party', price: 40, category: 'Ingresso' },
      ],
    },
  ]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleCreateList = () => {
    Alert.prompt(
      'Nuovo Listino',
      'Inserisci il nome del listino',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Crea',
          onPress: (name) => {
            if (name) {
              const newList: PriceList = {
                id: Date.now().toString(),
                name,
                itemCount: 0,
                isActive: false,
                createdAt: new Date().toISOString(),
                items: [],
              };
              setPriceLists([newList, ...priceLists]);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleToggleActive = (listId: string) => {
    setPriceLists(prev =>
      prev.map(list =>
        list.id === listId ? { ...list, isActive: !list.isActive } : list
      )
    );
  };

  const handleDeleteList = (listId: string) => {
    Alert.alert(
      'Elimina Listino',
      'Sei sicuro di voler eliminare questo listino prezzi?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => {
            setPriceLists(prev => prev.filter(list => list.id !== listId));
          },
        },
      ]
    );
  };

  const handleDuplicateList = (list: PriceList) => {
    const duplicate: PriceList = {
      ...list,
      id: Date.now().toString(),
      name: `${list.name} (Copia)`,
      isActive: false,
      createdAt: new Date().toISOString(),
    };
    setPriceLists([duplicate, ...priceLists]);
  };

  const toggleExpand = (listId: string) => {
    setExpandedList(expandedList === listId ? null : listId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const filteredLists = priceLists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderListCard = (list: PriceList, index: number) => (
    <View
      key={list.id}
      style={[
        styles.listCard,
        (isTablet || isLandscape) && !expandedList && {
          flex: 1,
          marginLeft: index % 2 === 1 ? spacing.md : 0,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.listHeader}
        onPress={() => toggleExpand(list.id)}
        activeOpacity={0.8}
        testID={`list-card-${list.id}`}
      >
        <View style={[styles.listIcon, list.isActive ? styles.listIconActive : styles.listIconInactive]}>
          <Ionicons
            name="pricetag"
            size={24}
            color={list.isActive ? colors.primary : colors.mutedForeground}
          />
        </View>
        <View style={styles.listInfo}>
          <View style={styles.listTitleRow}>
            <Text style={styles.listName}>{list.name}</Text>
            {list.isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Attivo</Text>
              </View>
            )}
          </View>
          {list.eventName && (
            <Text style={styles.listEvent}>{list.eventName}</Text>
          )}
          <Text style={styles.listMeta}>{list.itemCount} articoli</Text>
        </View>
        <Ionicons
          name={expandedList === list.id ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {expandedList === list.id && (
        <View style={styles.expandedContent}>
          <View style={styles.itemsList}>
            {list.items.map(item => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
              </View>
            ))}
            {list.items.length < list.itemCount && (
              <Text style={styles.moreItems}>
                +{list.itemCount - list.items.length} altri articoli
              </Text>
            )}
          </View>

          <View style={styles.listActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleToggleActive(list.id)}
              testID={`button-toggle-${list.id}`}
            >
              <Ionicons
                name={list.isActive ? 'pause-outline' : 'play-outline'}
                size={18}
                color={colors.teal}
              />
              <Text style={[styles.actionBtnText, { color: colors.teal }]}>
                {list.isActive ? 'Disattiva' : 'Attiva'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDuplicateList(list)}
              testID={`button-duplicate-${list.id}`}
            >
              <Ionicons name="copy-outline" size={18} color={colors.foreground} />
              <Text style={styles.actionBtnText}>Duplica</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDeleteList(list.id)}
              testID={`button-delete-${list.id}`}
            >
              <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderListRows = () => {
    if (expandedList || (!isTablet && !isLandscape)) {
      return filteredLists.map((list, index) => renderListCard(list, index));
    }

    const rows = [];
    for (let i = 0; i < filteredLists.length; i += 2) {
      rows.push(
        <View key={i} style={styles.listRow}>
          {renderListCard(filteredLists[i], 0)}
          {filteredLists[i + 1] && renderListCard(filteredLists[i + 1], 1)}
        </View>
      );
    }
    return rows;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="button-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listini Prezzi</Text>
        <TouchableOpacity
          onPress={handleCreateList}
          style={styles.addButton}
          testID="button-create-list"
        >
          <Ionicons name="add" size={24} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, isLandscape && styles.searchContainerLandscape]}>
        <View style={[styles.searchBar, isTablet && styles.searchBarTablet]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca listino..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredLists.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetags-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun listino trovato</Text>
          </View>
        ) : (
          renderListRows()
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLandscape: {
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchContainerLandscape: {
    paddingHorizontal: spacing.xl,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  searchBarTablet: {
    maxWidth: 500,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  scrollContentLandscape: {
    paddingHorizontal: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    marginTop: spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  listIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listIconActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  listIconInactive: {
    backgroundColor: colors.muted,
  },
  listInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  listName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  activeBadge: {
    backgroundColor: 'rgba(0, 206, 209, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  activeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.teal,
  },
  listEvent: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  listMeta: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  itemsList: {
    marginBottom: spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  itemPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  moreItems: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingTop: spacing.md,
  },
  listActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
});
