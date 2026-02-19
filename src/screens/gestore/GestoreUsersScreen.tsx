import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput } from 'react-native';
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
import api, { CompanyUser } from '@/lib/api';

type RoleFilter = 'all' | 'admin' | 'manager' | 'staff' | 'scanner' | 'cashier' | 'pr';

interface GestoreUsersScreenProps {
  onBack: () => void;
}

export function GestoreUsersScreen({ onBack }: GestoreUsersScreenProps) {
  const { colors } = useTheme();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
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

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await api.getGestoreCompanyUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const filters: { id: RoleFilter; label: string }[] = [
    { id: 'all', label: 'Tutti' },
    { id: 'admin', label: 'Admin' },
    { id: 'manager', label: 'Gestore' },
    { id: 'staff', label: 'Staff' },
    { id: 'scanner', label: 'Scanner' },
    { id: 'cashier', label: 'Cassieri' },
    { id: 'pr', label: 'PR' },
  ];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Amministratore';
      case 'manager':
        return 'Gestore';
      case 'staff':
        return 'Staff';
      case 'scanner':
        return 'Scanner';
      case 'cashier':
        return 'Cassiere';
      case 'pr':
        return 'PR';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return staticColors.destructive;
      case 'manager':
        return staticColors.primary;
      case 'staff':
        return staticColors.teal;
      case 'scanner':
        return staticColors.success;
      case 'cashier':
        return staticColors.golden;
      case 'pr':
        return '#8B5CF6';
      default:
        return staticColors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Attivo';
      case 'inactive':
        return 'Inattivo';
      case 'pending':
        return 'In attesa';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): 'success' | 'secondary' | 'warning' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'secondary';
      case 'pending':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const formatLastLogin = (lastLoginAt?: string) => {
    if (!lastLoginAt) return 'Mai effettuato';
    const date = new Date(lastLoginAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return 'Online';
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays < 7) return `${diffDays} giorni fa`;

    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
    });
  };

  const filteredUsers = useMemo(() => {
    let result = users;

    if (activeFilter !== 'all') {
      result = result.filter(u => u.role === activeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(u =>
        u.firstName.toLowerCase().includes(query) ||
        u.lastName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    }

    return result;
  }, [users, activeFilter, searchQuery]);

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-users"
      />

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
        <View style={styles.headerSection}>
          <Text style={styles.title}>Utenti Azienda</Text>
          <Text style={styles.subtitle}>{filteredUsers.length} utenti</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={staticColors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca per nome o email..."
            placeholderTextColor={staticColors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-input"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              testID="clear-search"
            >
              <Ionicons name="close-circle" size={20} color={staticColors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {filters.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => {
                triggerHaptic('selection');
                setActiveFilter(filter.id);
              }}
              style={[
                styles.filterChip,
                activeFilter === filter.id && styles.filterChipActive,
              ]}
              testID={`filter-${filter.id}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === filter.id && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {showLoader ? (
          <Loading text="Caricamento utenti..." />
        ) : (
          <View style={styles.usersList}>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Card key={user.id} style={styles.userCard} testID={`user-${user.id}`}>
                  <View style={styles.userContent}>
                    <Avatar
                      name={`${user.firstName} ${user.lastName}`}
                      source={user.avatarUrl}
                      size="lg"
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {user.firstName} {user.lastName}
                      </Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      <View style={styles.badgesRow}>
                        <Badge
                          variant="outline"
                          style={{ borderColor: getRoleColor(user.role) }}
                        >
                          <Text style={[styles.roleBadgeText, { color: getRoleColor(user.role) }]}>
                            {getRoleLabel(user.role)}
                          </Text>
                        </Badge>
                        <Badge variant={getStatusVariant(user.status)}>
                          <Text style={styles.statusBadgeText}>
                            {getStatusLabel(user.status)}
                          </Text>
                        </Badge>
                      </View>
                      <View style={styles.lastLoginRow}>
                        <Ionicons name="time-outline" size={12} color={staticColors.mutedForeground} />
                        <Text style={styles.lastLoginText}>
                          Ultimo accesso: {formatLastLogin(user.lastLoginAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.actionsRow}>
                    <Pressable
                      onPress={() => {
                        triggerHaptic('light');
                      }}
                      style={styles.actionButton}
                      testID={`edit-${user.id}`}
                    >
                      <Ionicons name="create-outline" size={18} color={staticColors.primary} />
                      <Text style={[styles.actionText, { color: staticColors.primary }]}>
                        Modifica
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        triggerHaptic('light');
                      }}
                      style={styles.actionButton}
                      testID={`permissions-${user.id}`}
                    >
                      <Ionicons name="key-outline" size={18} color={staticColors.teal} />
                      <Text style={[styles.actionText, { color: staticColors.teal }]}>
                        Permessi
                      </Text>
                    </Pressable>
                    {user.status === 'active' ? (
                      <Pressable
                        onPress={() => {
                          triggerHaptic('light');
                        }}
                        style={styles.actionButton}
                        testID={`deactivate-${user.id}`}
                      >
                        <Ionicons name="close-circle-outline" size={18} color={staticColors.destructive} />
                        <Text style={[styles.actionText, { color: staticColors.destructive }]}>
                          Disattiva
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => {
                          triggerHaptic('light');
                        }}
                        style={styles.actionButton}
                        testID={`activate-${user.id}`}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color={staticColors.success} />
                        <Text style={[styles.actionText, { color: staticColors.success }]}>
                          Attiva
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </Card>
              ))
            ) : (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
                  <Text style={styles.emptyTitle}>Nessun utente trovato</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? 'Prova a modificare i criteri di ricerca'
                      : 'Non ci sono utenti in questa categoria'}
                  </Text>
                </View>
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    marginRight: spacing.sm,
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
  usersList: {
    paddingHorizontal: spacing.lg,
  },
  userCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  userContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  roleBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
  },
  lastLoginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  lastLoginText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  emptyCard: {
    padding: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
});

export default GestoreUsersScreen;
