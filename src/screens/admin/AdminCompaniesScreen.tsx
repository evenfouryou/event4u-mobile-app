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
import api, { AdminCompany } from '@/lib/api';

type FilterType = 'all' | 'active' | 'inactive' | 'pending';

interface AdminCompaniesScreenProps {
  onBack: () => void;
  onItemPress: (id: string) => void;
}

export function AdminCompaniesScreen({ onBack, onItemPress }: AdminCompaniesScreenProps) {
  const { colors } = useTheme();
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<AdminCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCompanies();
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
    filterCompanies();
  }, [companies, activeFilter, searchQuery]);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterCompanies = () => {
    let filtered = [...companies];

    if (activeFilter !== 'all') {
      filtered = filtered.filter(c => c.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.gestoreName?.toLowerCase().includes(query) ||
        c.vatNumber?.toLowerCase().includes(query)
      );
    }

    setFilteredCompanies(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCompanies();
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

  const renderCompany = ({ item }: { item: AdminCompany }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onItemPress(item.id);
      }}
      testID={`company-item-${item.id}`}
    >
      <Card style={styles.companyCard} testID={`company-card-${item.id}`}>
        <View style={styles.companyContent}>
          <View style={styles.companyIcon}>
            <Ionicons name="business" size={24} color={staticColors.primary} />
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{item.name}</Text>
            {item.gestoreName && (
              <View style={styles.companyMeta}>
                <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.companyMetaText}>{item.gestoreName}</Text>
              </View>
            )}
            {item.vatNumber && (
              <Text style={styles.companyVat}>P.IVA: {item.vatNumber}</Text>
            )}
          </View>
          <View style={styles.companyActions}>
            {getStatusBadge(item.status)}
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </View>
        </View>

        <View style={styles.companyDivider} />

        <View style={styles.companyStats}>
          <View style={styles.companyStat}>
            <Ionicons name="calendar-outline" size={16} color={staticColors.primary} />
            <Text style={styles.companyStatValue}>{item.eventsCount || 0}</Text>
            <Text style={styles.companyStatLabel}>Eventi</Text>
          </View>
          <View style={styles.companyStat}>
            <Ionicons name="location-outline" size={16} color={staticColors.teal} />
            <Text style={styles.companyStatValue}>{item.locationsCount || 0}</Text>
            <Text style={styles.companyStatLabel}>Location</Text>
          </View>
          {item.siaeEnabled && (
            <View style={styles.companyStat}>
              <Ionicons name="checkmark-circle" size={16} color={staticColors.golden} />
              <Text style={styles.companyStatValue}>SIAE</Text>
              <Text style={styles.companyStatLabel}>Abilitato</Text>
            </View>
          )}
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
        testID="header-companies"
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca aziende..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-companies"
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
              testID={`filter-companies-${item.id}`}
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
        <Loading text="Caricamento aziende..." />
      ) : filteredCompanies.length > 0 ? (
        <FlatList
          data={filteredCompanies}
          renderItem={renderCompany}
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
          testID="list-companies"
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessuna azienda trovata</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'Prova con una ricerca diversa' : 'Le aziende appariranno qui'}
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
  companyCard: {
    padding: spacing.md,
  },
  companyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  companyIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  companyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  companyMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  companyVat: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  companyActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  companyDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  companyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  companyStat: {
    alignItems: 'center',
    gap: 2,
  },
  companyStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  companyStatLabel: {
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

export default AdminCompaniesScreen;
