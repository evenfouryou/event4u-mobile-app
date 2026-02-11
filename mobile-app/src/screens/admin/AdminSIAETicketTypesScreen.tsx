import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAETicketType } from '@/lib/api';

interface AdminSIAETicketTypesScreenProps {
  onBack: () => void;
}

type FilterType = 'all' | 'active' | 'inactive';

export function AdminSIAETicketTypesScreen({ onBack }: AdminSIAETicketTypesScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [ticketTypes, setTicketTypes] = useState<(SIAETicketType & { companyId?: string })[]>([]);

  useEffect(() => {
    loadTicketTypes();
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

  const loadTicketTypes = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminSIAETicketTypes();
      setTicketTypes(data);
    } catch (error) {
      console.error('Error loading SIAE ticket types:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTicketTypes();
    setRefreshing(false);
  };

  const filteredTicketTypes = ticketTypes.filter(ticketType => {
    const matchesSearch = ticketType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticketType.siaeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticketType.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' ||
      (activeFilter === 'active' && ticketType.isActive) ||
      (activeFilter === 'inactive' && !ticketType.isActive);
    
    return matchesSearch && matchesFilter;
  });

  // Group by company if available
  const groupedTicketTypes: Record<string, (SIAETicketType & { companyId?: string })[]> = {};
  filteredTicketTypes.forEach(ticketType => {
    const company = ticketType.companyId || 'Generale';
    if (!groupedTicketTypes[company]) {
      groupedTicketTypes[company] = [];
    }
    groupedTicketTypes[company].push(ticketType);
  });

  const handleToggleStatus = (ticketType: SIAETicketType) => {
    triggerHaptic('medium');
    Alert.alert(
      ticketType.isActive ? 'Disattiva Tipologia' : 'Attiva Tipologia',
      `Vuoi ${ticketType.isActive ? 'disattivare' : 'attivare'} la tipologia "${ticketType.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: () => {
            setTicketTypes(prev => prev.map(t =>
              t.id === ticketType.id ? { ...t, isActive: !t.isActive } : t
            ));
          },
        },
      ]
    );
  };

  const handleEditTicketType = (ticketType: SIAETicketType) => {
    triggerHaptic('light');
    Alert.alert('Modifica', `Modifica tipologia ${ticketType.name} - funzionalità in sviluppo`);
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutte' },
    { id: 'active', label: 'Attive' },
    { id: 'inactive', label: 'Inattive' },
  ];

  const renderTicketType = ({ item }: { item: SIAETicketType & { companyId?: string } }) => (
    <Card style={styles.ticketTypeCard} testID={`ticket-type-${item.id}`}>
      <View style={styles.ticketTypeHeader}>
        <View style={styles.ticketTypeInfo}>
          <View style={styles.ticketTypeCodeRow}>
            <Badge variant="outline" testID={`badge-code-${item.id}`}>{item.siaeCode}</Badge>
            <Badge variant={item.isActive ? 'success' : 'secondary'} testID={`badge-status-${item.id}`}>
              {item.isActive ? 'Attiva' : 'Inattiva'}
            </Badge>
          </View>
          <Text style={styles.ticketTypeName}>{item.name}</Text>
          <Text style={styles.ticketTypeCategory}>{item.category}</Text>
        </View>
      </View>

      <View style={styles.ticketTypeDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Prezzo</Text>
          <Text style={styles.detailValue}>€ {Number(item.price).toFixed(2)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Disponibili</Text>
          <Text style={styles.detailValue}>{item.available}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Venduti</Text>
          <Text style={styles.detailValue}>{item.sold}</Text>
        </View>
      </View>

      <View style={styles.ticketTypeActions}>
        <Button
          variant="outline"
          size="sm"
          onPress={() => handleEditTicketType(item)}
          testID={`button-edit-${item.id}`}
        >
          <Ionicons name="create-outline" size={16} color={staticColors.foreground} />
          <Text style={styles.actionButtonText}>Modifica</Text>
        </Button>
        <Button
          variant={item.isActive ? 'secondary' : 'default'}
          size="sm"
          onPress={() => handleToggleStatus(item)}
          testID={`button-toggle-${item.id}`}
        >
          <Ionicons
            name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
            size={16}
            color={item.isActive ? staticColors.foreground : staticColors.primaryForeground}
          />
          <Text style={[styles.actionButtonText, { color: item.isActive ? staticColors.foreground : staticColors.primaryForeground }]}>
            {item.isActive ? 'Disattiva' : 'Attiva'}
          </Text>
        </Button>
      </View>
    </Card>
  );

  const renderGroupedContent = () => {
    if (filteredTicketTypes.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="ticket-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessuna tipologia trovata</Text>
          <Text style={styles.emptyText}>
            Prova a modificare i filtri o la ricerca
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={Object.keys(groupedTicketTypes).flatMap(company => [
          { type: 'header', company },
          ...groupedTicketTypes[company].map(t => ({ type: 'item', data: t })),
        ])}
        renderItem={({ item }: any) => {
          if (item.type === 'header') {
            return (
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{item.company}</Text>
              </View>
            );
          }
          return renderTicketType({ item: item.data });
        }}
        keyExtractor={(item: any, index) => 
          item.type === 'header' ? `header-${item.company}` : `ticket-${item.data.id}`
        }
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
    );
  };

  if (showLoader) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header showLogo showBack onBack={onBack} testID="header-ticket-types" />
        <Loading text="Caricamento tipologie SIAE..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header showLogo showBack onBack={onBack} testID="header-ticket-types" />

      <View style={styles.statsSection}>
        <Text style={styles.title}>Tipologie SIAE</Text>
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard} testID="stat-total">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
              <Ionicons name="ticket" size={20} color={staticColors.primary} />
            </View>
            <Text style={styles.statValue}>{ticketTypes.length}</Text>
            <Text style={styles.statLabel}>Totali</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-active">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
              <Ionicons name="checkmark-circle" size={20} color={staticColors.success} />
            </View>
            <Text style={styles.statValue}>{ticketTypes.filter(t => t.isActive).length}</Text>
            <Text style={styles.statLabel}>Attive</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-inactive">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.mutedForeground}20` }]}>
              <Ionicons name="pause-circle" size={20} color={staticColors.mutedForeground} />
            </View>
            <Text style={styles.statValue}>{ticketTypes.filter(t => !t.isActive).length}</Text>
            <Text style={styles.statLabel}>Inattive</Text>
          </GlassCard>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca tipologia..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search"
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

      {renderGroupedContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  statsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
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
    paddingHorizontal: spacing.md,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filtersList: {
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
    borderColor: staticColors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  filterChipTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  groupHeader: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
  },
  groupTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.primary,
  },
  ticketTypeCard: {
    marginBottom: spacing.md,
  },
  ticketTypeHeader: {
    marginBottom: spacing.md,
  },
  ticketTypeInfo: {
    gap: spacing.sm,
  },
  ticketTypeCodeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  ticketTypeName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  ticketTypeCategory: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  ticketTypeDetails: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: staticColors.border,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  ticketTypeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButtonText: {
    marginLeft: spacing.xs,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
});
