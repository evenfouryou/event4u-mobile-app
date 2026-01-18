import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'sub_pr' | 'promoter' | 'hostess';
  status: 'active' | 'inactive' | 'pending';
  guestsThisMonth: number;
  totalGuests: number;
  earnings: number;
  joinedAt: string;
  avatar?: string;
}

type FilterRole = 'all' | 'sub_pr' | 'promoter' | 'hostess';

export function PRStaffScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: staff = [], refetch } = useQuery<StaffMember[]>({
    queryKey: ['/api/pr/staff'],
    queryFn: () =>
      api.get<StaffMember[]>('/api/pr/staff').catch(() => [
        {
          id: '1',
          name: 'Luca Bianchi',
          email: 'luca.b@email.com',
          phone: '+39 333 1234567',
          role: 'sub_pr',
          status: 'active',
          guestsThisMonth: 45,
          totalGuests: 234,
          earnings: 580.0,
          joinedAt: '2024-06-15',
        },
        {
          id: '2',
          name: 'Sara Verdi',
          email: 'sara.v@email.com',
          phone: '+39 334 7654321',
          role: 'promoter',
          status: 'active',
          guestsThisMonth: 32,
          totalGuests: 156,
          earnings: 420.0,
          joinedAt: '2024-08-20',
        },
        {
          id: '3',
          name: 'Anna Rossi',
          email: 'anna.r@email.com',
          phone: '+39 335 9876543',
          role: 'hostess',
          status: 'inactive',
          guestsThisMonth: 0,
          totalGuests: 89,
          earnings: 0,
          joinedAt: '2024-10-01',
        },
        {
          id: '4',
          name: 'Marco Ferrari',
          email: 'marco.f@email.com',
          phone: '+39 336 1472583',
          role: 'promoter',
          status: 'pending',
          guestsThisMonth: 0,
          totalGuests: 0,
          earnings: 0,
          joinedAt: '2025-01-10',
        },
      ]),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'sub_pr':
        return 'Sub-PR';
      case 'promoter':
        return 'Promoter';
      case 'hostess':
        return 'Hostess';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'sub_pr':
        return colors.primary;
      case 'promoter':
        return colors.accent;
      case 'hostess':
        return colors.success;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.mutedForeground;
      case 'pending':
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Attivo';
      case 'inactive':
        return 'Inattivo';
      case 'pending':
        return 'In Attesa';
      default:
        return status;
    }
  };

  const handleInviteStaff = () => {
    Alert.alert('Invita Staff', 'Questa funzione sarà disponibile presto.');
  };

  const handleStaffPress = (member: StaffMember) => {
    navigation.navigate('PRStaffDetail', { staffId: member.id });
  };

  const filterOptions: { value: FilterRole; label: string }[] = [
    { value: 'all', label: 'Tutti' },
    { value: 'sub_pr', label: 'Sub-PR' },
    { value: 'promoter', label: 'Promoter' },
    { value: 'hostess', label: 'Hostess' },
  ];

  const activeCount = staff.filter((s) => s.status === 'active').length;
  const totalGuests = staff.reduce((sum, s) => sum + s.guestsThisMonth, 0);

  return (
    <View style={styles.container}>
      <Header
        title="Il Mio Staff"
        showBack
        rightAction={
          <TouchableOpacity onPress={handleInviteStaff} data-testid="button-invite-staff">
            <Ionicons name="person-add" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          <Card variant="glass" style={styles.statCard}>
            <Text style={styles.statValue}>{staff.length}</Text>
            <Text style={styles.statLabel}>Totale Staff</Text>
          </Card>
          <Card variant="glass" style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>{activeCount}</Text>
            <Text style={styles.statLabel}>Attivi</Text>
          </Card>
          <Card variant="glass" style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.accent }]}>{totalGuests}</Text>
            <Text style={styles.statLabel}>Ospiti Mese</Text>
          </Card>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color={colors.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca staff..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              data-testid="input-search-staff"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterPill, filterRole === option.value && styles.filterPillActive]}
              onPress={() => setFilterRole(option.value)}
              data-testid={`filter-${option.value}`}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterRole === option.value && styles.filterPillTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredStaff.length === 0 ? (
          <Card variant="glass" style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>Nessun membro dello staff</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Prova a modificare la ricerca' : 'Invita il tuo primo collaboratore'}
            </Text>
            {!searchQuery && (
              <Button
                title="Invita Staff"
                variant="primary"
                onPress={handleInviteStaff}
                style={styles.inviteButton}
              />
            )}
          </Card>
        ) : (
          <View style={styles.staffList}>
            {filteredStaff.map((member) => (
              <TouchableOpacity
                key={member.id}
                onPress={() => handleStaffPress(member)}
                activeOpacity={0.8}
                data-testid={`staff-item-${member.id}`}
              >
                <Card variant="glass" style={styles.staffCard}>
                  <View style={styles.staffHeader}>
                    <View style={styles.staffInfo}>
                      <View style={[styles.avatar, { backgroundColor: getRoleColor(member.role) + '20' }]}>
                        <Ionicons name="person" size={24} color={getRoleColor(member.role)} />
                      </View>
                      <View style={styles.staffDetails}>
                        <Text style={styles.staffName}>{member.name}</Text>
                        <View style={styles.staffMeta}>
                          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role) + '20' }]}>
                            <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
                              {getRoleLabel(member.role)}
                            </Text>
                          </View>
                          <View style={styles.statusBadge}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.status) }]} />
                            <Text style={[styles.statusText, { color: getStatusColor(member.status) }]}>
                              {getStatusLabel(member.status)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                  </View>

                  <View style={styles.staffStats}>
                    <View style={styles.staffStat}>
                      <Text style={styles.staffStatValue}>{member.guestsThisMonth}</Text>
                      <Text style={styles.staffStatLabel}>Questo mese</Text>
                    </View>
                    <View style={styles.staffStatDivider} />
                    <View style={styles.staffStat}>
                      <Text style={styles.staffStatValue}>{member.totalGuests}</Text>
                      <Text style={styles.staffStatLabel}>Totali</Text>
                    </View>
                    <View style={styles.staffStatDivider} />
                    <View style={styles.staffStat}>
                      <Text style={[styles.staffStatValue, { color: colors.success }]}>
                        € {member.earnings.toFixed(0)}
                      </Text>
                      <Text style={styles.staffStatLabel}>Guadagni</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  filtersContainer: {
    marginBottom: spacing.lg,
  },
  filtersContent: {
    gap: spacing.md,
  },
  filterPill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
    fontWeight: fontWeight.semibold,
  },
  staffList: {
    gap: spacing.md,
  },
  staffCard: {
    padding: spacing.lg,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffDetails: {
    flex: 1,
  },
  staffName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  staffMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  staffStats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  staffStat: {
    flex: 1,
    alignItems: 'center',
  },
  staffStatDivider: {
    width: 1,
    backgroundColor: colors.borderSubtle,
  },
  staffStatValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  staffStatLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xxs,
  },
  emptyCard: {
    padding: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptySubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  inviteButton: {
    marginTop: spacing.md,
  },
});
