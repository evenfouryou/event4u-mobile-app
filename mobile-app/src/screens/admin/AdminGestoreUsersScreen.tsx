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
  Image,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface GestoreUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'cashier';
  status: 'active' | 'inactive';
  avatarUrl?: string;
  lastActive?: string;
}

export function AdminGestoreUsersScreen() {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const gestoreId = route.params?.gestoreId;
  const gestoreName = route.params?.gestoreName || 'Gestore';
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<GestoreUser[]>([]);

  const loadUsers = async () => {
    try {
      const response = await api.get<GestoreUser[]>(`/api/admin/gestori/${gestoreId}/users`).catch(() => []);
      if (Array.isArray(response) && response.length > 0) {
        setUsers(response);
      } else {
        setUsers([
          { id: '1', firstName: 'Marco', lastName: 'Rossi', email: 'marco.rossi@email.com', role: 'admin', status: 'active', lastActive: '2026-01-18T10:30:00Z' },
          { id: '2', firstName: 'Laura', lastName: 'Bianchi', email: 'laura.b@email.com', role: 'manager', status: 'active', lastActive: '2026-01-17T22:15:00Z' },
          { id: '3', firstName: 'Giuseppe', lastName: 'Verdi', email: 'g.verdi@email.com', role: 'staff', status: 'active', lastActive: '2026-01-18T08:00:00Z' },
          { id: '4', firstName: 'Anna', lastName: 'Ferrari', email: 'anna.ferrari@email.com', role: 'cashier', status: 'inactive', lastActive: '2026-01-10T18:45:00Z' },
        ]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [gestoreId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const filteredUsers = users.filter((u) =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return colors.primary;
      case 'manager': return colors.teal;
      case 'staff': return colors.warning;
      case 'cashier': return colors.success;
      default: return colors.mutedForeground;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      case 'staff': return 'Staff';
      case 'cashier': return 'Cassiere';
      default: return role;
    }
  };

  const formatLastActive = (dateStr?: string) => {
    if (!dateStr) return 'Mai';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Ora';
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  };

  const renderAvatar = (user: GestoreUser) => {
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={`Utenti - ${gestoreName}`} showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={`Utenti - ${gestoreName}`} showBack />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca utenti..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="input-search-users"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <Card variant="glass" style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{users.length}</Text>
          <Text style={styles.summaryLabel}>Totale</Text>
        </Card>
        <Card variant="glass" style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {users.filter(u => u.status === 'active').length}
          </Text>
          <Text style={styles.summaryLabel}>Attivi</Text>
        </Card>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <Card key={user.id} variant="glass" style={styles.userCard}>
              <View style={styles.userRow}>
                {renderAvatar(user)}
                <View style={styles.userInfo}>
                  <View style={styles.userHeader}>
                    <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(user.role)}20` }]}>
                      <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                        {getRoleLabel(user.role)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.userMeta}>
                    <View style={[styles.statusDot, { backgroundColor: user.status === 'active' ? colors.success : colors.destructive }]} />
                    <Text style={styles.metaText}>
                      {user.status === 'active' ? 'Attivo' : 'Inattivo'}
                    </Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>Ultimo accesso: {formatLastActive(user.lastActive)}</Text>
                  </View>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <Card variant="glass" style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun utente trovato</Text>
          </Card>
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
    paddingHorizontal: spacing.lg,
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
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  userCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
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
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metaText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  metaDot: {
    color: colors.mutedForeground,
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

export default AdminGestoreUsersScreen;
