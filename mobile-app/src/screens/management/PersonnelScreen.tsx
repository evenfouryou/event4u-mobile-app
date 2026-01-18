import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

type PersonnelFilter = 'all' | 'bartender' | 'security' | 'promoter' | 'manager';

interface Personnel {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive';
  eventsWorked: number;
  rating: number;
  avatar: string | null;
}

const filterOptions: { key: PersonnelFilter; label: string }[] = [
  { key: 'all', label: 'Tutti' },
  { key: 'bartender', label: 'Baristi' },
  { key: 'security', label: 'Security' },
  { key: 'promoter', label: 'PR' },
  { key: 'manager', label: 'Manager' },
];

const roleColors: Record<string, string> = {
  bartender: colors.teal,
  security: colors.warning,
  promoter: colors.primary,
  manager: colors.success,
  default: colors.mutedForeground,
};

export function PersonnelScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [activeFilter, setActiveFilter] = useState<PersonnelFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPersonnel();
  }, []);

  const loadPersonnel = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<any[]>('/api/personnel');
      setPersonnel(data.map((p: any) => ({
        id: p.id?.toString() || '',
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        email: p.email || '',
        phone: p.phone || '',
        role: p.role || 'bartender',
        status: p.isActive ? 'active' : 'inactive',
        eventsWorked: p.eventsWorked || 0,
        rating: p.rating || 0,
        avatar: p.avatar || null,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => roleColors[role.toLowerCase()] || roleColors.default;

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      bartender: 'Barista',
      security: 'Security',
      promoter: 'PR',
      manager: 'Manager',
    };
    return labels[role.toLowerCase()] || role;
  };

  const filteredPersonnel = personnel.filter((p) => {
    const matchesFilter = activeFilter === 'all' || p.role.toLowerCase() === activeFilter;
    const matchesSearch =
      searchQuery === '' ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const renderFilterPill = ({ item }: { item: typeof filterOptions[0] }) => (
    <TouchableOpacity
      style={[styles.filterPill, activeFilter === item.key && styles.filterPillActive]}
      onPress={() => setActiveFilter(item.key)}
      data-testid={`filter-${item.key}`}
    >
      <Text style={[styles.filterPillText, activeFilter === item.key && styles.filterPillTextActive]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderPersonCard = ({ item }: { item: Personnel }) => {
    const roleColor = getRoleColor(item.role);
    const initials = `${item.firstName.charAt(0)}${item.lastName.charAt(0)}`.toUpperCase();

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('PersonnelDetail', { personnelId: item.id })}
        activeOpacity={0.8}
        data-testid={`card-personnel-${item.id}`}
        style={isLandscape ? { flex: 0.5, paddingHorizontal: spacing.xs } : undefined}
      >
        <Card style={styles.personCard} variant="elevated">
          <View style={styles.personHeader}>
            <View style={[styles.avatar, { borderColor: roleColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.personInfo}>
              <Text style={styles.personName}>{item.firstName} {item.lastName}</Text>
              <View style={[styles.roleBadge, { backgroundColor: `${roleColor}20` }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>{getRoleLabel(item.role)}</Text>
              </View>
            </View>
            <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? colors.success : colors.mutedForeground }]} />
          </View>

          <View style={styles.personDetails}>
            {item.phone && (
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.detailText}>{item.phone}</Text>
              </View>
            )}
            {item.email && (
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.detailText} numberOfLines={1}>{item.email}</Text>
              </View>
            )}
          </View>

          <View style={styles.personStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.eventsWorked}</Text>
              <Text style={styles.statLabel}>Eventi</Text>
            </View>
            {item.rating > 0 && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color={colors.primary} />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Personale"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreatePersonnel')}
            data-testid="button-add-personnel"
          >
            <Ionicons name="person-add" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca personale..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="input-search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filterOptions}
        renderItem={renderFilterPill}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Riprova" onPress={loadPersonnel} style={styles.retryButton} />
        </View>
      ) : filteredPersonnel.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun personale trovato</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPersonnel}
          renderItem={renderPersonCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          numColumns={isLandscape ? 2 : 1}
          key={isLandscape ? 'landscape' : 'portrait'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  personCard: {
    marginBottom: spacing.md,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  personInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  personName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 8,
    marginTop: spacing.xxs,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  personDetails: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  personStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  ratingText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.destructive,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  retryButton: {
    marginTop: spacing.lg,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
