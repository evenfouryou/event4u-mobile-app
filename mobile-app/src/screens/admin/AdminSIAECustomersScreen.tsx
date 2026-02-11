import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAECustomer } from '@/lib/api';

interface AdminSIAECustomersScreenProps {
  onBack: () => void;
}

type FilterType = 'all' | 'active' | 'suspended' | 'expired';

export function AdminSIAECustomersScreen({ onBack }: AdminSIAECustomersScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [customers, setCustomers] = useState<SIAECustomer[]>([]);

  useEffect(() => {
    loadCustomers();
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

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAECustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading SIAE customers:', error);
      Alert.alert('Errore', 'Impossibile caricare i clienti SIAE');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const getStatusBadge = (status: SIAECustomer['status']) => {
    const config = {
      active: { variant: 'success' as const, label: 'Attivo' },
      suspended: { variant: 'warning' as const, label: 'Sospeso' },
      expired: { variant: 'destructive' as const, label: 'Scaduto' },
    };
    return config[status] || config.active;
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (customer.fiscalCode?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    return matchesSearch && customer.status === activeFilter;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Tutti' },
    { key: 'active', label: 'Attivi' },
    { key: 'suspended', label: 'Sospesi' },
    { key: 'expired', label: 'Scaduti' },
  ];

  const renderCustomerCard = ({ item }: { item: SIAECustomer }) => {
    const statusConfig = getStatusBadge(item.status);
    
    return (
      <Card style={styles.customerCard}>
        <View style={styles.customerHeader}>
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: colors.foreground }]}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={[styles.customerEmail, { color: colors.mutedForeground }]}>
              {item.email || 'Email non disponibile'}
            </Text>
          </View>
          <Badge variant={statusConfig.variant} size="sm">
            {statusConfig.label}
          </Badge>
        </View>

        <View style={styles.customerDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              CF: {item.fiscalCode || 'N/D'}
            </Text>
          </View>
          {item.cardNumber && (
            <View style={styles.detailRow}>
              <Ionicons name="id-card-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
                Tessera: {item.cardNumber}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
              {item.phone || 'N/D'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Registrato</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {item.registrationDate ? new Date(item.registrationDate).toLocaleDateString('it-IT') : 'N/D'}
            </Text>
          </View>
          {item.documentType && (
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Documento</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {item.documentType}
              </Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const styles = createStyles(colors, insets);

  if (showLoader) {
    return <Loading text="Caricamento clienti..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Clienti SIAE"
        onBack={onBack}
        testID="header-admin-siae-customers"
      />

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca cliente..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-customers"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        {filters.map(filter => (
          <Pressable
            key={filter.key}
            style={[
              styles.filterChip,
              { 
                backgroundColor: activeFilter === filter.key ? staticColors.primary : colors.card,
                borderColor: activeFilter === filter.key ? staticColors.primary : colors.border,
              }
            ]}
            onPress={() => {
              triggerHaptic('light');
              setActiveFilter(filter.key);
            }}
            testID={`filter-${filter.key}`}
          >
            <Text style={[
              styles.filterText,
              { color: activeFilter === filter.key ? '#000000' : colors.mutedForeground }
            ]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.statsHeader}>
        <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
          {filteredCustomers.length} clienti trovati
        </Text>
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={staticColors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessun Cliente</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Non ci sono clienti che corrispondono alla ricerca
            </Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: insets.bottom + spacing.xl,
  },
  customerCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  customerInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 13,
  },
  customerDetails: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
