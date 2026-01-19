import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'organizer' | 'staff' | 'user';
  status: 'active' | 'inactive' | 'suspended';
  avatarUrl?: string;
  createdAt: string;
}

type RoleFilter = 'all' | 'admin' | 'organizer' | 'staff' | 'user';

export function UsersScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [users, setUsers] = useState<User[]>([]);

  const loadUsers = async () => {
    try {
      const response = await api.get<any[]>('/api/admin/users').catch(() => []);
      const data = Array.isArray(response) ? response : [];
      setUsers(data.map((u: any) => ({
        id: u.id?.toString() || '',
        firstName: u.firstName || u.name?.split(' ')[0] || '',
        lastName: u.lastName || u.name?.split(' ').slice(1).join(' ') || '',
        email: u.email || '',
        role: u.role || 'user',
        status: u.status || 'active',
        avatarUrl: u.avatarUrl || u.avatar,
        createdAt: u.createdAt,
      })));
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const toggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'suspended' ? 'disabilitare' : 'abilitare';
    
    Alert.alert(
      'Conferma',
      `Vuoi ${action} l'utente ${user.firstName} ${user.lastName}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          style: newStatus === 'suspended' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.put(`/api/admin/users/${user.id}/status`, { status: newStatus });
              setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
            } catch (error) {
              Alert.alert('Errore', 'Impossibile aggiornare lo stato utente');
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return colors.primary;
      case 'organizer': return colors.teal;
      case 'staff': return colors.warning;
      default: return colors.mutedForeground;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'organizer': return 'Organizzatore';
      case 'staff': return 'Staff';
      default: return 'Utente';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'inactive': return colors.mutedForeground;
      case 'suspended': return colors.destructive;
      default: return colors.mutedForeground;
    }
  };

  const renderAvatar = (user: User) => {
    if (user.avatarUrl) {
      return <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />;
    }
    const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    return (
      <View style={[styles.avatar, styles.avatarPlaceholder]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    );
  };

  const roleFilters: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: 'Tutti' },
    { key: 'admin', label: 'Admin' },
    { key: 'organizer', label: 'Organizzatori' },
    { key: 'staff', label: 'Staff' },
    { key: 'user', label: 'Utenti' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Utenti" showBack />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="loading-text">Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Gestione Utenti" showBack />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca utenti..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-users"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {roleFilters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[styles.filterChip, roleFilter === filter.key && styles.filterChipActive]}
            onPress={() => setRoleFilter(filter.key)}
            testID={`filter-${filter.key}`}
          >
            <Text style={[styles.filterChipText, roleFilter === filter.key && styles.filterChipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          (isTablet || isLandscape) && styles.scrollContentLandscape
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        testID="scroll-view-users"
      >
        {filteredUsers.length > 0 ? (
          <View style={[
            styles.listContainer,
            (isTablet || isLandscape) && styles.listContainerLandscape
          ]}>
            {filteredUsers.map((user) => (
              <View 
                key={user.id}
                style={[
                  styles.userCardWrapper,
                  (isTablet || isLandscape) && styles.userCardWrapperLandscape
                ]}
              >
                <Card variant="glass" style={styles.userCard} testID={`card-user-${user.id}`}>
                  <View style={styles.userRow}>
                    {renderAvatar(user)}
                    <View style={styles.userInfo}>
                      <View style={styles.userHeader}>
                        <Text style={styles.userName} testID={`text-user-name-${user.id}`}>{user.firstName} {user.lastName}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(user.role)}20` }]}>
                          <Text style={[styles.roleText, { color: getRoleColor(user.role) }]} testID={`text-user-role-${user.id}`}>
                            {getRoleLabel(user.role)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.userEmail} testID={`text-user-email-${user.id}`}>{user.email}</Text>
                      <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(user.status) }]} />
                        <Text style={styles.statusText} testID={`text-user-status-${user.id}`}>
                          {user.status === 'active' ? 'Attivo' : user.status === 'suspended' ? 'Sospeso' : 'Inattivo'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggleButton, user.status === 'suspended' && styles.toggleButtonActive]}
                      onPress={() => toggleUserStatus(user)}
                      testID={`button-toggle-${user.id}`}
                    >
                      <Ionicons
                        name={user.status === 'active' ? 'ban-outline' : 'checkmark-circle-outline'}
                        size={22}
                        color={user.status === 'active' ? colors.destructive : colors.success}
                      />
                    </TouchableOpacity>
                  </View>
                </Card>
              </View>
            ))}
          </View>
        ) : (
          <Card variant="glass" style={styles.emptyCard} testID="card-empty-state">
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText} testID="text-empty-message">
              {searchQuery || roleFilter !== 'all' ? 'Nessun utente trovato' : 'Nessun utente registrato'}
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentLandscape: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  filtersScroll: {
    maxHeight: 50,
    marginBottom: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterChipTextActive: {
    color: colors.primaryForeground,
  },
  listContainer: {
    flex: 1,
  },
  listContainerLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  userCardWrapper: {
    marginBottom: spacing.md,
  },
  userCardWrapperLandscape: {
    width: '48.5%',
    marginBottom: 0,
  },
  userCard: {
    padding: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  userName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  userEmail: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: `${colors.success}20`,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});

export default UsersScreen;
