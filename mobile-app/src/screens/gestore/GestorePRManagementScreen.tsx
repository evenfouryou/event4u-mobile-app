import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { GestorePR } from '@/lib/api';

type FilterType = 'all' | 'active' | 'top';

interface GestorePRManagementScreenProps {
  onBack: () => void;
}

export function GestorePRManagementScreen({ onBack }: GestorePRManagementScreenProps) {
  const { colors } = useTheme();
  const [prs, setPrs] = useState<GestorePR[]>([]);
  const [filteredPrs, setFilteredPrs] = useState<GestorePR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPrs();
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
    filterPrs();
  }, [prs, activeFilter, searchQuery]);

  const loadPrs = async () => {
    try {
      setIsLoading(true);
      const data = await api.getGestorePRs();
      setPrs(data);
    } catch (error) {
      console.error('Error loading PRs:', error);
      setPrs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPrs = () => {
    let filtered = [...prs];

    if (activeFilter === 'active') {
      filtered = filtered.filter(pr => pr.status === 'active');
    } else if (activeFilter === 'top') {
      filtered = filtered
        .filter(pr => pr.status === 'active')
        .sort((a, b) => (b.earnings || 0) - (a.earnings || 0))
        .slice(0, 10);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pr =>
        pr.name.toLowerCase().includes(query) ||
        pr.email?.toLowerCase().includes(query) ||
        pr.prCode?.toLowerCase().includes(query)
      );
    }

    setFilteredPrs(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrs();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attivo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inattivo</Badge>;
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutti i PR' },
    { id: 'active', label: 'Attivi' },
    { id: 'top', label: 'Top Performer' },
  ];

  const renderPrMember = ({ item }: { item: GestorePR }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
      }}
      testID={`pr-item-${item.id}`}
    >
      <Card style={styles.prCard} testID={`pr-card-${item.id}`}>
        <View style={styles.prContent}>
          <Avatar
            name={item.name}
            size="md"
            testID={`avatar-${item.id}`}
          />
          <View style={styles.prInfo}>
            <Text style={styles.prName}>{item.name}</Text>
            <Text style={styles.prEmail}>{item.email || item.prCode || '-'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.statText}>{item.invites || 0} inviti</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.statText}>{item.conversions || 0} conversioni</Text>
              </View>
            </View>
          </View>
          <View style={styles.prActions}>
            {getStatusBadge(item.status)}
            <Text style={styles.earningsText}>{formatCurrency(item.earnings || 0)}</Text>
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
        testID="header-pr-management"
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca PR..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-pr"
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
                setActiveFilter(item.id);
              }}
              style={[
                styles.filterChip,
                activeFilter === item.id && styles.filterChipActive,
              ]}
              testID={`filter-${item.id}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {showLoader ? (
        <Loading text="Caricamento PR..." />
      ) : filteredPrs.length > 0 ? (
        <FlatList
          data={filteredPrs}
          renderItem={renderPrMember}
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
          <Ionicons name="megaphone-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessun PR trovato</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'Prova con una ricerca diversa' : 'Aggiungi PR dal pannello web'}
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
    backgroundColor: staticColors.secondary,
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  filterChipTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  prCard: {
    padding: spacing.md,
  },
  prContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  prInfo: {
    flex: 1,
  },
  prName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  prEmail: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  prActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  earningsText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primary,
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

export default GestorePRManagementScreen;
