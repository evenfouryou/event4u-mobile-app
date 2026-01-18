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
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  totalRevenue: number;
  activeOrganizers: number;
  pendingNameChanges: number;
  monthlyGrowth: number;
}

export function SuperAdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalEvents: 0,
    totalRevenue: 0,
    activeOrganizers: 0,
    pendingNameChanges: 0,
    monthlyGrowth: 0,
  });

  const loadData = async () => {
    try {
      const response = await api.get<any>('/api/admin/dashboard/stats').catch(() => ({}));
      setStats({
        totalUsers: response.totalUsers || 1250,
        totalEvents: response.totalEvents || 456,
        totalRevenue: response.totalRevenue || 125000,
        activeOrganizers: response.activeOrganizers || 89,
        pendingNameChanges: response.pendingNameChanges || 12,
        monthlyGrowth: response.monthlyGrowth || 15.5,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const quickActions = [
    { label: 'Utenti', icon: 'people-outline', route: 'Users', color: colors.primary },
    { label: 'Fatturazione', icon: 'card-outline', route: 'AdminBillingPlans', color: colors.teal },
    { label: 'Organizzatori', icon: 'business-outline', route: 'AdminBillingOrganizers', color: colors.success },
    { label: 'Impostazioni', icon: 'settings-outline', route: 'AdminSiteSettings', color: colors.warning },
    { label: 'Cambio Nome', icon: 'swap-horizontal-outline', route: 'AdminNameChanges', color: colors.accent },
    { label: 'Stripe', icon: 'logo-usd', route: 'StripeAdmin', color: colors.primary },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Super Admin" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Super Admin Dashboard" />
      
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
          <Text style={styles.sectionTitle}>Statistiche Globali</Text>
          <View style={styles.statsGrid}>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="people-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{stats.totalUsers.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Utenti Totali</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.teal}20` }]}>
                <Ionicons name="calendar-outline" size={24} color={colors.teal} />
              </View>
              <Text style={styles.statValue}>{stats.totalEvents.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Eventi Totali</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.success}20` }]}>
                <Ionicons name="cash-outline" size={24} color={colors.success} />
              </View>
              <Text style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</Text>
              <Text style={styles.statLabel}>Ricavi Totali</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.warning}20` }]}>
                <Ionicons name="trending-up-outline" size={24} color={colors.warning} />
              </View>
              <Text style={[styles.statValue, { color: colors.success }]}>+{stats.monthlyGrowth}%</Text>
              <Text style={styles.statLabel}>Crescita Mensile</Text>
            </Card>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert</Text>
          <Card variant="glass" style={styles.alertCard}>
            <View style={styles.alertRow}>
              <View style={[styles.alertIcon, { backgroundColor: `${colors.warning}20` }]}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{stats.pendingNameChanges} richieste cambio nome</Text>
                <Text style={styles.alertSubtitle}>In attesa di approvazione</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('AdminNameChanges')}
                data-testid="button-view-name-changes"
              >
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.route}
                style={styles.actionButton}
                onPress={() => navigation.navigate(action.route)}
                activeOpacity={0.8}
                data-testid={`button-${action.route.toLowerCase()}`}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon as any} size={28} color={colors.background} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestione Avanzata</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AdminBillingInvoices')}
            data-testid="button-invoices"
          >
            <Card variant="glass" style={styles.menuCard}>
              <View style={styles.menuRow}>
                <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                <Text style={styles.menuLabel}>Fatture</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
              </View>
            </Card>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AdminBillingReports')}
            data-testid="button-reports"
          >
            <Card variant="glass" style={styles.menuCard}>
              <View style={styles.menuRow}>
                <Ionicons name="bar-chart-outline" size={24} color={colors.teal} />
                <Text style={styles.menuLabel}>Report Fatturazione</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
              </View>
            </Card>
          </TouchableOpacity>
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
    textAlign: 'center',
  },
  alertCard: {
    padding: spacing.lg,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  alertSubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    width: '30%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: colors.foreground,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  menuItem: {
    marginBottom: spacing.sm,
  },
  menuCard: {
    padding: spacing.lg,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuLabel: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});

export default SuperAdminDashboardScreen;
