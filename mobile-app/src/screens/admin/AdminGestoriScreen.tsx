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
import api, { AdminGestore } from '@/lib/api';

type FilterType = 'all' | 'active' | 'inactive' | 'pending';

interface AdminGestoriScreenProps {
  onBack: () => void;
  onGestorePress: (gestoreId: string) => void;
}

export function AdminGestoriScreen({ onBack, onGestorePress }: AdminGestoriScreenProps) {
  const { colors } = useTheme();
  const [gestori, setGestori] = useState<AdminGestore[]>([]);
  const [filteredGestori, setFilteredGestori] = useState<AdminGestore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadGestori();
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
    filterGestori();
  }, [gestori, activeFilter, searchQuery]);

  const loadGestori = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminGestori();
      setGestori(data);
    } catch (error) {
      console.error('Error loading gestori:', error);
      setGestori([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterGestori = () => {
    let filtered = [...gestori];

    if (activeFilter !== 'all') {
      filtered = filtered.filter(g => g.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.name.toLowerCase().includes(query) ||
        g.email?.toLowerCase().includes(query) ||
        g.companyName?.toLowerCase().includes(query)
      );
    }

    setFilteredGestori(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGestori();
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

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'active', label: 'Attivi' },
    { id: 'inactive', label: 'Inattivi' },
    { id: 'pending', label: 'In attesa' },
  ];

  const renderGestore = ({ item }: { item: AdminGestore }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onGestorePress(item.id);
      }}
    >
      <Card style={styles.gestoreCard} testID={`gestore-${item.id}`}>
        <View style={styles.gestoreContent}>
          <Avatar name={item.name} size="lg" testID={`avatar-${item.id}`} />
          <View style={styles.gestoreInfo}>
            <Text style={styles.gestoreName}>{item.name}</Text>
            <Text style={styles.gestoreEmail}>{item.email}</Text>
            {item.companyName && (
              <View style={styles.gestoreMeta}>
                <Ionicons name="business-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.gestoreMetaText}>{item.companyName}</Text>
              </View>
            )}
          </View>
          <View style={styles.gestoreActions}>
            {getStatusBadge(item.status)}
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </View>
        </View>

        <View style={styles.gestoreDivider} />

        <View style={styles.gestoreStats}>
          <View style={styles.gestoreStat}>
            <Ionicons name="calendar-outline" size={16} color={staticColors.primary} />
            <Text style={styles.gestoreStatValue}>{item.eventsCount || 0}</Text>
            <Text style={styles.gestoreStatLabel}>Eventi</Text>
          </View>
          <View style={styles.gestoreStat}>
            <Ionicons name="ticket-outline" size={16} color={staticColors.teal} />
            <Text style={styles.gestoreStatValue}>{item.ticketsSold || 0}</Text>
            <Text style={styles.gestoreStatLabel}>Biglietti</Text>
          </View>
          <View style={styles.gestoreStat}>
            <Ionicons name="cash-outline" size={16} color={staticColors.golden} />
            <Text style={styles.gestoreStatValue}>€{(item.revenue || 0).toFixed(0)}</Text>
            <Text style={styles.gestoreStatLabel}>Fatturato</Text>
          </View>
        </View>

        {item.siaeEnabled && (
          <View style={styles.siaeBadge}>
            <Badge variant="default">SIAE Abilitato</Badge>
          </View>
        )}
      </Card>
    </Pressable>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-gestori"
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca gestori..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
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
        <Loading text="Caricamento gestori..." />
      ) : filteredGestori.length > 0 ? (
        <FlatList
          data={filteredGestori}
          renderItem={renderGestore}
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
          <Ionicons name="people-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessun gestore trovato</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'Prova con una ricerca diversa' : 'I gestori appariranno qui'}
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
  gestoreCard: {
    padding: spacing.md,
  },
  gestoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gestoreInfo: {
    flex: 1,
  },
  gestoreName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  gestoreEmail: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  gestoreMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  gestoreMetaText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  gestoreActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  gestoreDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  gestoreStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gestoreStat: {
    alignItems: 'center',
    gap: 2,
  },
  gestoreStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  gestoreStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  siaeBadge: {
    marginTop: spacing.md,
    alignItems: 'center',
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

export default AdminGestoriScreen;
