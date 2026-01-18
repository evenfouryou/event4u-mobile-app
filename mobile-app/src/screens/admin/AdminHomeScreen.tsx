import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface DashboardStats {
  totalGestori: number;
  activeCompanies: number;
  totalEvents: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface ActivityLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete' | 'system';
}

export function AdminHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalGestori: 0,
    activeCompanies: 0,
    totalEvents: 0,
    systemHealth: 'healthy',
  });
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);

  const loadData = async () => {
    try {
      const [gestoriRes, companiesRes, eventsRes] = await Promise.all([
        api.get<any[]>('/api/admin/gestori').catch(() => []),
        api.get<any[]>('/api/admin/companies').catch(() => []),
        api.get<any[]>('/api/events').catch(() => []),
      ]);

      setStats({
        totalGestori: Array.isArray(gestoriRes) ? gestoriRes.length : 0,
        activeCompanies: Array.isArray(companiesRes) ? companiesRes.filter((c: any) => c.status === 'active').length : 0,
        totalEvents: Array.isArray(eventsRes) ? eventsRes.length : 0,
        systemHealth: 'healthy',
      });

      setActivityLog([
        {
          id: '1',
          action: 'Nuovo gestore registrato',
          user: 'Sistema',
          timestamp: new Date().toISOString(),
          type: 'create',
        },
        {
          id: '2',
          action: 'Impostazioni SIAE aggiornate',
          user: 'Admin',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          type: 'update',
        },
        {
          id: '3',
          action: 'Azienda disattivata',
          user: 'Admin',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          type: 'system',
        },
      ]);
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'critical':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getHealthLabel = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'Operativo';
      case 'warning':
        return 'Attenzione';
      case 'critical':
        return 'Critico';
      default:
        return health;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'create':
        return 'add-circle';
      case 'update':
        return 'create';
      case 'delete':
        return 'trash';
      case 'system':
        return 'settings';
      default:
        return 'information-circle';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'create':
        return colors.success;
      case 'update':
        return colors.primary;
      case 'delete':
        return colors.destructive;
      case 'system':
        return colors.accent;
      default:
        return colors.mutedForeground;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) {
      return `${diffMins} min fa`;
    } else if (diffHours < 24) {
      return `${diffHours} ore fa`;
    }
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Admin Dashboard" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Admin Dashboard"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('SystemSettings')}
            data-testid="button-system-settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Panoramica Sistema</Text>
          <View style={styles.statsGrid}>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="people-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{stats.totalGestori}</Text>
              <Text style={styles.statLabel}>Gestori Totali</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.success}20` }]}>
                <Ionicons name="business-outline" size={24} color={colors.success} />
              </View>
              <Text style={styles.statValue}>{stats.activeCompanies}</Text>
              <Text style={styles.statLabel}>Aziende Attive</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.accent}20` }]}>
                <Ionicons name="calendar-outline" size={24} color={colors.accent} />
              </View>
              <Text style={styles.statValue}>{stats.totalEvents}</Text>
              <Text style={styles.statLabel}>Eventi Totali</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${getHealthColor(stats.systemHealth)}20` }]}>
                <Ionicons name="pulse-outline" size={24} color={getHealthColor(stats.systemHealth)} />
              </View>
              <Text style={[styles.statValue, { color: getHealthColor(stats.systemHealth) }]}>
                {getHealthLabel(stats.systemHealth)}
              </Text>
              <Text style={styles.statLabel}>Stato Sistema</Text>
            </Card>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('GestoreDetail', { mode: 'create' })}
              activeOpacity={0.8}
              data-testid="button-add-gestore"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="person-add-outline" size={28} color={colors.primaryForeground} />
              </View>
              <Text style={styles.actionLabel}>Aggiungi Gestore</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('GestoriList')}
              activeOpacity={0.8}
              data-testid="button-manage-gestori"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.success }]}>
                <Ionicons name="people-outline" size={28} color={colors.successForeground} />
              </View>
              <Text style={styles.actionLabel}>Gestisci Gestori</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Companies')}
              activeOpacity={0.8}
              data-testid="button-manage-companies"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
                <Ionicons name="business-outline" size={28} color={colors.accentForeground} />
              </View>
              <Text style={styles.actionLabel}>Aziende</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('SystemSettings')}
              activeOpacity={0.8}
              data-testid="button-settings"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.warning }]}>
                <Ionicons name="settings-outline" size={28} color={colors.warningForeground} />
              </View>
              <Text style={styles.actionLabel}>Impostazioni</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attività Recenti</Text>
          </View>
          
          {activityLog.map((activity) => (
            <Card key={activity.id} variant="glass" style={styles.activityCard}>
              <View style={styles.activityRow}>
                <View style={[styles.activityIcon, { backgroundColor: `${getActivityColor(activity.type)}20` }]}>
                  <Ionicons
                    name={getActivityIcon(activity.type) as any}
                    size={18}
                    color={getActivityColor(activity.type)}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityAction}>{activity.action}</Text>
                  <View style={styles.activityMeta}>
                    <Text style={styles.activityUser}>{activity.user}</Text>
                    <Text style={styles.activityDot}>•</Text>
                    <Text style={styles.activityTime}>{formatDate(activity.timestamp)}</Text>
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </View>
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
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionLabel: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  activityCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activityUser: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  activityDot: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  activityTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
});

export default AdminHomeScreen;
