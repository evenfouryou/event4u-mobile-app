import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { SkeletonList } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { BillingOrganizer } from '@/lib/api';

interface Organizer {
  id: string;
  name: string;
  companyName: string;
  email: string;
  planName: string;
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled' | 'suspended';
  nextBillingDate: string;
  monthlyAmount: number;
  invoicesCount: number;
  pendingAmount: number;
}

interface AdminBillingOrganizersScreenProps {
  onBack: () => void;
}

export function AdminBillingOrganizersScreen({ onBack }: AdminBillingOrganizersScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizers();
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

  const loadOrganizers = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminBillingOrganizers();
      setOrganizers(data.map(org => ({
        id: org.id,
        name: org.companyName,
        companyName: org.companyName,
        email: '',
        planName: org.planName || 'Nessun piano',
        subscriptionStatus: org.status === 'suspended' ? 'expired' : org.status,
        nextBillingDate: org.lastPayment || '-',
        monthlyAmount: org.monthlyRevenue,
        invoicesCount: 0,
        pendingAmount: 0,
      })));
    } catch (error) {
      console.error('Error loading organizers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrganizers();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (dateString === '-') return '-';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: Organizer['subscriptionStatus']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attivo</Badge>;
      case 'trial':
        return <Badge variant="teal">Prova</Badge>;
      case 'expired':
        return <Badge variant="destructive">Scaduto</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancellato</Badge>;
    }
  };

  const handleViewOrganizer = (organizer: Organizer) => {
    triggerHaptic('medium');
  };

  const filteredOrganizers = organizers.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterStatus || org.subscriptionStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusFilters = [
    { id: null, label: 'Tutti' },
    { id: 'active', label: 'Attivi' },
    { id: 'trial', label: 'Prova' },
    { id: 'expired', label: 'Scaduti' },
    { id: 'cancelled', label: 'Cancellati' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Gestori / Billing"
        showBack
        onBack={onBack}
        testID="header-billing-organizers"
      />

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca gestore..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-organizer"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContainer}
      >
        {statusFilters.map((filter) => (
          <Pressable
            key={filter.id ?? 'all'}
            onPress={() => {
              triggerHaptic('light');
              setFilterStatus(filter.id);
            }}
            style={[
              styles.filterChip,
              { backgroundColor: filterStatus === filter.id ? colors.primary : colors.card, borderColor: colors.border },
            ]}
            testID={`filter-${filter.id ?? 'all'}`}
          >
            <Text style={[
              styles.filterChipText,
              { color: filterStatus === filter.id ? colors.primaryForeground : colors.foreground },
            ]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {showLoader ? (
        <View style={styles.loaderContainer}>
          <SkeletonList count={4} />
        </View>
      ) : (
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
          {filteredOrganizers.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Nessun gestore trovato
              </Text>
            </Card>
          ) : (
            filteredOrganizers.map((organizer) => (
              <Card 
                key={organizer.id} 
                style={styles.organizerCard}
                onPress={() => handleViewOrganizer(organizer)}
                testID={`card-organizer-${organizer.id}`}
              >
                <View style={styles.organizerHeader}>
                  <View style={styles.organizerInfo}>
                    <Text style={[styles.organizerName, { color: colors.foreground }]}>{organizer.name}</Text>
                    <Text style={[styles.companyName, { color: colors.mutedForeground }]}>{organizer.companyName}</Text>
                  </View>
                  {getStatusBadge(organizer.subscriptionStatus)}
                </View>

                <View style={styles.planRow}>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planLabel, { color: colors.mutedForeground }]}>Piano</Text>
                    <Text style={[styles.planValue, { color: colors.foreground }]}>{organizer.planName}</Text>
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planLabel, { color: colors.mutedForeground }]}>Importo</Text>
                    <Text style={[styles.planValue, { color: colors.primary }]}>
                      {organizer.monthlyAmount > 0 ? `${formatCurrency(organizer.monthlyAmount)}/mese` : '-'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.organizerFooter, { borderTopColor: colors.border }]}>
                  <View style={styles.footerItem}>
                    <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
                      Prossima: {formatDate(organizer.nextBillingDate)}
                    </Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Ionicons name="receipt-outline" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
                      {organizer.invoicesCount} fatture
                    </Text>
                  </View>
                  {organizer.pendingAmount > 0 && (
                    <Badge variant="destructive" size="sm">
                      {formatCurrency(organizer.pendingAmount)} in sospeso
                    </Badge>
                  )}
                </View>
              </Card>
            ))
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },
  filtersScroll: {
    maxHeight: 44,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  loaderContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
  },
  organizerCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  organizerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  organizerInfo: {
    flex: 1,
  },
  organizerName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  companyName: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  planRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.xl,
  },
  planInfo: {
    flex: 1,
  },
  planLabel: {
    fontSize: typography.fontSize.xs,
  },
  planValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginTop: 2,
  },
  organizerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    fontSize: typography.fontSize.xs,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});

export default AdminBillingOrganizersScreen;
