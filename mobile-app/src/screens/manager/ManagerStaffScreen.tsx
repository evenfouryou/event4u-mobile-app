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
import api, { StaffMember } from '@/lib/api';

type FilterType = 'all' | 'scanner' | 'pr' | 'bartender' | 'cashier';

interface ManagerStaffScreenProps {
  onBack: () => void;
}

export function ManagerStaffScreen({ onBack }: ManagerStaffScreenProps) {
  const { colors } = useTheme();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStaff();
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
    filterStaff();
  }, [staff, activeFilter, searchQuery]);

  const loadStaff = async () => {
    try {
      setIsLoading(true);
      const data = await api.getManagerStaff();
      setStaff(data);
    } catch (error) {
      console.error('Error loading staff:', error);
      setStaff([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = [...staff];

    if (activeFilter !== 'all') {
      filtered = filtered.filter(member => member.role === activeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query)
      );
    }

    setFilteredStaff(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStaff();
    setRefreshing(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'scanner':
        return <Badge variant="default">Scanner</Badge>;
      case 'pr':
        return <Badge variant="success">PR</Badge>;
      case 'bartender':
        return <Badge variant="warning">Bartender</Badge>;
      case 'cashier':
        return <Badge variant="secondary">Cassiere</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getRoleIcon = (role: string): keyof typeof Ionicons.glyphMap => {
    switch (role) {
      case 'scanner':
        return 'scan-outline';
      case 'pr':
        return 'people-outline';
      case 'bartender':
        return 'wine-outline';
      case 'cashier':
        return 'cash-outline';
      default:
        return 'person-outline';
    }
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'scanner', label: 'Scanner' },
    { id: 'pr', label: 'PR' },
    { id: 'bartender', label: 'Bartender' },
    { id: 'cashier', label: 'Cassieri' },
  ];

  const renderStaffMember = ({ item }: { item: StaffMember }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
      }}
    >
      <Card style={styles.staffCard} testID={`staff-${item.id}`}>
        <View style={styles.staffContent}>
          <Avatar
            name={item.name}
            size="md"
            testID={`avatar-${item.id}`}
          />
          <View style={styles.staffInfo}>
            <Text style={styles.staffName}>{item.name}</Text>
            <Text style={styles.staffEmail}>{item.email || '-'}</Text>
            <View style={styles.staffMeta}>
              <Ionicons name={getRoleIcon(item.role)} size={14} color={colors.mutedForeground} />
              <Text style={styles.staffMetaText}>{item.eventsCount || 0} eventi assegnati</Text>
            </View>
          </View>
          <View style={styles.staffActions}>
            {getRoleBadge(item.role)}
            <Badge variant={item.isActive ? 'success' : 'secondary'}>
              {item.isActive ? 'Attivo' : 'Inattivo'}
            </Badge>
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
        testID="header-staff"
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca staff..."
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
        <Loading text="Caricamento staff..." />
      ) : filteredStaff.length > 0 ? (
        <FlatList
          data={filteredStaff}
          renderItem={renderStaffMember}
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
          <Text style={styles.emptyTitle}>Nessun membro staff</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'Prova con una ricerca diversa' : 'Aggiungi membri staff dal pannello web'}
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
  staffCard: {
    padding: spacing.md,
  },
  staffContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  staffEmail: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  staffMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  staffMetaText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  staffActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
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

export default ManagerStaffScreen;
