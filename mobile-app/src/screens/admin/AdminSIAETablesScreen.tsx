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

interface AdminSIAETablesScreenProps {
  onBack: () => void;
}

interface SIAETable {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  ivaRate: number;
  siaePercentage: number;
  isActive: boolean;
  lastUpdated: string;
}

type FilterType = 'all' | 'active' | 'inactive';

export function AdminSIAETablesScreen({ onBack }: AdminSIAETablesScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [tables, setTables] = useState<SIAETable[]>([]);

  useEffect(() => {
    loadTables();
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

  const loadTables = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setTables([
        { id: '1', code: 'T01', name: 'Concerti Musica Leggera', description: 'Eventi musicali pop/rock', category: 'Musica', ivaRate: 10, siaePercentage: 8.5, isActive: true, lastUpdated: '2024-01-15' },
        { id: '2', code: 'T02', name: 'Concerti Musica Classica', description: 'Concerti orchestra e musica classica', category: 'Musica', ivaRate: 10, siaePercentage: 6.0, isActive: true, lastUpdated: '2024-01-15' },
        { id: '3', code: 'T03', name: 'Teatro Prosa', description: 'Spettacoli teatrali di prosa', category: 'Teatro', ivaRate: 10, siaePercentage: 5.0, isActive: true, lastUpdated: '2024-01-10' },
        { id: '4', code: 'T04', name: 'Teatro Musicale', description: 'Musical e operette', category: 'Teatro', ivaRate: 10, siaePercentage: 7.0, isActive: true, lastUpdated: '2024-01-10' },
        { id: '5', code: 'T05', name: 'Danza e Balletto', description: 'Spettacoli di danza', category: 'Danza', ivaRate: 10, siaePercentage: 4.5, isActive: true, lastUpdated: '2024-01-08' },
        { id: '6', code: 'T06', name: 'Discoteche', description: 'Locali da ballo e discoteche', category: 'Intrattenimento', ivaRate: 22, siaePercentage: 10.0, isActive: true, lastUpdated: '2024-01-05' },
        { id: '7', code: 'T07', name: 'Cinema', description: 'Proiezioni cinematografiche', category: 'Cinema', ivaRate: 10, siaePercentage: 3.0, isActive: false, lastUpdated: '2023-12-20' },
        { id: '8', code: 'T08', name: 'Feste Private', description: 'Eventi privati con musica', category: 'Privato', ivaRate: 22, siaePercentage: 5.0, isActive: true, lastUpdated: '2024-01-12' },
      ]);
    } catch (error) {
      console.error('Error loading SIAE tables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTables();
    setRefreshing(false);
  };

  const filteredTables = tables.filter(table => {
    const matchesSearch = table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' ||
      (activeFilter === 'active' && table.isActive) ||
      (activeFilter === 'inactive' && !table.isActive);
    
    return matchesSearch && matchesFilter;
  });

  const handleToggleStatus = (table: SIAETable) => {
    triggerHaptic('medium');
    Alert.alert(
      table.isActive ? 'Disattiva Tabella' : 'Attiva Tabella',
      `Vuoi ${table.isActive ? 'disattivare' : 'attivare'} la tabella "${table.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: () => {
            setTables(prev => prev.map(t =>
              t.id === table.id ? { ...t, isActive: !t.isActive } : t
            ));
          },
        },
      ]
    );
  };

  const handleEditTable = (table: SIAETable) => {
    triggerHaptic('light');
    Alert.alert('Modifica', `Modifica tabella ${table.name} - funzionalità in sviluppo`);
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutte' },
    { id: 'active', label: 'Attive' },
    { id: 'inactive', label: 'Inattive' },
  ];

  const renderTable = ({ item }: { item: SIAETable }) => (
    <Card style={styles.tableCard} testID={`table-${item.id}`}>
      <View style={styles.tableHeader}>
        <View style={styles.tableInfo}>
          <View style={styles.tableCodeRow}>
            <Badge variant="outline" testID={`badge-code-${item.id}`}>{item.code}</Badge>
            <Badge variant={item.isActive ? 'success' : 'secondary'} testID={`badge-status-${item.id}`}>
              {item.isActive ? 'Attiva' : 'Inattiva'}
            </Badge>
          </View>
          <Text style={styles.tableName}>{item.name}</Text>
          <Text style={styles.tableDescription}>{item.description}</Text>
        </View>
      </View>

      <View style={styles.tableDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Categoria</Text>
          <Text style={styles.detailValue}>{item.category}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>IVA</Text>
          <Text style={styles.detailValue}>{item.ivaRate}%</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>SIAE</Text>
          <Text style={styles.detailValue}>{item.siaePercentage}%</Text>
        </View>
      </View>

      <View style={styles.tableActions}>
        <Button
          variant="outline"
          size="sm"
          onPress={() => handleEditTable(item)}
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

  if (showLoader) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header showLogo showBack onBack={onBack} testID="header-siae-tables" />
        <Loading text="Caricamento tabelle SIAE..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header showLogo showBack onBack={onBack} testID="header-siae-tables" />

      <View style={styles.statsSection}>
        <Text style={styles.title}>Tabelle SIAE</Text>
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard} testID="stat-total">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
              <Ionicons name="grid" size={20} color={staticColors.primary} />
            </View>
            <Text style={styles.statValue}>{tables.length}</Text>
            <Text style={styles.statLabel}>Totali</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-active">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
              <Ionicons name="checkmark-circle" size={20} color={staticColors.success} />
            </View>
            <Text style={styles.statValue}>{tables.filter(t => t.isActive).length}</Text>
            <Text style={styles.statLabel}>Attive</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} testID="stat-inactive">
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.mutedForeground}20` }]}>
              <Ionicons name="pause-circle" size={20} color={staticColors.mutedForeground} />
            </View>
            <Text style={styles.statValue}>{tables.filter(t => !t.isActive).length}</Text>
            <Text style={styles.statLabel}>Inattive</Text>
          </GlassCard>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca tabella..."
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

      {filteredTables.length > 0 ? (
        <FlatList
          data={filteredTables}
          renderItem={renderTable}
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
          <Ionicons name="grid-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessuna tabella trovata</Text>
          <Text style={styles.emptyText}>
            Prova a modificare i filtri o la ricerca
          </Text>
        </View>
      )}
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
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: staticColors.border,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  filtersContainer: {
    marginTop: spacing.md,
  },
  filtersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.card,
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
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  tableCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  tableInfo: {
    flex: 1,
  },
  tableCodeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  tableName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.xs,
  },
  tableDescription: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  tableDetails: {
    flexDirection: 'row',
    backgroundColor: staticColors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  detailValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: 2,
  },
  tableActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
    marginLeft: spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
