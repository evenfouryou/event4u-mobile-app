import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { PRList } from '@/lib/api';

type TabType = 'active' | 'past' | 'all';

interface GestorePRListsScreenProps {
  onBack: () => void;
}

export function GestorePRListsScreen({ onBack }: GestorePRListsScreenProps) {
  const { colors } = useTheme();
  const [lists, setLists] = useState<PRList[]>([]);
  const [filteredLists, setFilteredLists] = useState<PRList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLists();
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

  useEffect(() => {
    filterLists();
  }, [lists, activeTab, searchQuery]);

  const loadLists = async () => {
    try {
      setIsLoading(true);
      const data = await api.getGestorePRLists();
      setLists(data);
    } catch (error) {
      console.error('Error loading PR lists:', error);
      setLists([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterLists = () => {
    let filtered = [...lists];

    if (activeTab === 'active') {
      filtered = filtered.filter(list => list.status === 'active');
    } else if (activeTab === 'past') {
      filtered = filtered.filter(list => list.status === 'closed');
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(list =>
        list.eventName.toLowerCase().includes(query) ||
        list.prName.toLowerCase().includes(query)
      );
    }

    setFilteredLists(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLists();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'active', label: 'Attive' },
    { id: 'past', label: 'Passate' },
    { id: 'all', label: 'Tutte' },
  ];

  const renderListItem = ({ item }: { item: PRList }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
      }}
      testID={`list-item-${item.id}`}
    >
      <Card style={styles.listCard} testID={`list-card-${item.id}`}>
        <View style={styles.listHeader}>
          <View style={styles.eventInfo}>
            <Text style={styles.eventName} numberOfLines={1}>{item.eventName}</Text>
            <Text style={styles.eventDate}>{formatDate(item.eventDate)}</Text>
          </View>
          <Badge variant={item.status === 'active' ? 'success' : 'secondary'}>
            {item.status === 'active' ? 'Attiva' : 'Chiusa'}
          </Badge>
        </View>

        <View style={styles.prRow}>
          <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.prName}>{item.prName}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="people" size={14} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.statValue}>{item.guestsCount}</Text>
              <Text style={styles.statLabel}>Ospiti</Text>
            </View>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.success || '#22c55e'}20` }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success || '#22c55e'} />
            </View>
            <View>
              <Text style={styles.statValue}>{item.confirmedCount}</Text>
              <Text style={styles.statLabel}>Confermati</Text>
            </View>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.warning || '#f59e0b'}20` }]}>
              <Ionicons name="stats-chart" size={14} color={colors.warning || '#f59e0b'} />
            </View>
            <View>
              <Text style={styles.statValue}>
                {item.guestsCount > 0 ? Math.round((item.confirmedCount / item.guestsCount) * 100) : 0}%
              </Text>
              <Text style={styles.statLabel}>Tasso</Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-pr-lists"
      />

      <View style={styles.titleSection}>
        <Text style={styles.screenTitle}>Liste PR</Text>
        <Text style={styles.screenSubtitle}>Gestisci le liste ospiti dei PR</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca per evento o PR..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-lists"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab(tab.id);
            }}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive,
            ]}
            testID={`tab-${tab.id}`}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {showLoader ? (
        <Loading text="Caricamento liste..." />
      ) : filteredLists.length > 0 ? (
        <FlatList
          data={filteredLists}
          renderItem={renderListItem}
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
          <Ionicons name="list-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessuna lista trovata</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'Prova con una ricerca diversa' : 'Le liste PR appariranno qui'}
          </Text>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  titleSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  screenTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  screenSubtitle: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: staticColors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  tabTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  listCard: {
    padding: spacing.md,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  eventInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  eventDate: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  prName: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
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
    color: staticColors.foreground,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default GestorePRListsScreen;
