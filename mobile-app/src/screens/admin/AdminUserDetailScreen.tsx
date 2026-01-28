import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import api from '@/lib/api';

interface AdminUserDetailScreenProps {
  userId: string;
  onBack: () => void;
}

interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  phone?: string;
  createdAt: string;
  lastLoginAt?: string;
  emailVerified: boolean;
  companyId?: string;
  companyName?: string;
  eventsCount: number;
  ticketsPurchased: number;
}

export function AdminUserDetailScreen({ userId, onBack }: AdminUserDetailScreenProps) {
  const { colors } = useTheme();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserDetail();
  }, [userId]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadUserDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getAdminUserDetail(userId);
      setUser(data);
    } catch (err) {
      console.error('Error loading user detail:', err);
      setError('Impossibile caricare i dettagli dell\'utente');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserDetail();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attivo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inattivo</Badge>;
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Sospeso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const roleLabels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      gestore: 'Gestore',
      organizer: 'Organizzatore',
      warehouse: 'Magazzino',
      bartender: 'Bartender',
      user: 'Utente',
    };
    return <Badge variant="default">{roleLabels[role] || role}</Badge>;
  };

  if (showLoader) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-user-detail" />
        <Loading text="Caricamento utente..." />
      </SafeArea>
    );
  }

  if (error || !user) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-user-detail" />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>{error || 'Utente non trovato'}</Text>
          <Pressable onPress={loadUserDetail} testID="button-retry">
            <Text style={styles.retryText}>Riprova</Text>
          </Pressable>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-user-detail" />

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
        <View style={styles.userHeader}>
          <Avatar name={`${user.firstName} ${user.lastName}`} size="xl" testID="avatar-user" />
          <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.badgesRow}>
            {getRoleBadge(user.role)}
            {getStatusBadge(user.status)}
          </View>
        </View>

        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
              <Ionicons name="calendar" size={24} color={staticColors.primary} />
            </View>
            <Text style={styles.statValue}>{user.eventsCount || 0}</Text>
            <Text style={styles.statLabel}>Eventi</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
              <Ionicons name="ticket" size={24} color={staticColors.teal} />
            </View>
            <Text style={styles.statValue}>{user.ticketsPurchased || 0}</Text>
            <Text style={styles.statLabel}>Biglietti</Text>
          </GlassCard>
        </View>

        <Text style={styles.sectionTitle}>Informazioni</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Email</Text>
            <View style={styles.detailValueRow}>
              <Text style={styles.detailValue}>{user.email}</Text>
              {user.emailVerified && (
                <Ionicons name="checkmark-circle" size={16} color={staticColors.success} />
              )}
            </View>
          </View>
          <View style={styles.detailDivider} />
          
          {user.phone && (
            <>
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={20} color={colors.mutedForeground} />
                <Text style={styles.detailLabel}>Telefono</Text>
                <Text style={styles.detailValue}>{user.phone}</Text>
              </View>
              <View style={styles.detailDivider} />
            </>
          )}
          
          {user.companyName && (
            <>
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={20} color={colors.mutedForeground} />
                <Text style={styles.detailLabel}>Azienda</Text>
                <Text style={styles.detailValue}>{user.companyName}</Text>
              </View>
              <View style={styles.detailDivider} />
            </>
          )}
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Registrato</Text>
            <Text style={styles.detailValue}>{formatDate(user.createdAt)}</Text>
          </View>
          
          {user.lastLoginAt && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={20} color={colors.mutedForeground} />
                <Text style={styles.detailLabel}>Ultimo accesso</Text>
                <Text style={styles.detailValue}>{formatDateTime(user.lastLoginAt)}</Text>
              </View>
            </>
          )}
        </Card>
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
    padding: spacing.lg,
  },
  userHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
    marginTop: spacing.md,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
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
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
  },
  detailsCard: {
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    width: 100,
  },
  detailValue: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
    textAlign: 'right',
  },
  detailValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  detailDivider: {
    height: 1,
    backgroundColor: staticColors.border,
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
    textAlign: 'center',
  },
  retryText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primary,
    marginTop: spacing.md,
  },
});

export default AdminUserDetailScreen;
