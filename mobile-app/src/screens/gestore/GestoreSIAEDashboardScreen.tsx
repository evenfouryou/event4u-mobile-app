import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAEDashboardStats, SIAEReportStatus } from '@/lib/api';

interface GestoreSIAEDashboardScreenProps {
  onBack: () => void;
  onNavigateEvents: () => void;
  onNavigateReports: () => void;
  onNavigateCustomers: () => void;
  onNavigateCards: () => void;
}

export function GestoreSIAEDashboardScreen({
  onBack,
  onNavigateEvents,
  onNavigateReports,
  onNavigateCustomers,
  onNavigateCards,
}: GestoreSIAEDashboardScreenProps) {
  const { colors, gradients } = useTheme();
  const [stats, setStats] = useState<SIAEDashboardStats>({
    moduleEnabled: false,
    pendingReportsCount: 0,
    recentActivity: [],
    pendingRCACount: 0,
    monthlyRMGStatus: null,
    annualRPMStatus: null,
    transmissionErrors: [],
    pendingCorrections: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
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

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAEDashboard();
      setStats(data);
    } catch (error) {
      console.error('Error loading SIAE dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const getStatusBadge = (status: SIAEReportStatus | null) => {
    if (!status) return <Badge variant="secondary">-</Badge>;
    switch (status) {
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'sent':
        return <Badge variant="default">Inviato</Badge>;
      case 'approved':
        return <Badge variant="success">Approvato</Badge>;
      case 'error':
        return <Badge variant="destructive">Errore</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const quickActions = [
    { id: 'events', icon: 'calendar' as const, label: 'Eventi SIAE', gradient: gradients.golden, onPress: onNavigateEvents },
    { id: 'reports', icon: 'document-text' as const, label: 'Report', gradient: gradients.teal, onPress: onNavigateReports },
    { id: 'customers', icon: 'people' as const, label: 'Clienti', gradient: gradients.purple, onPress: onNavigateCustomers },
    { id: 'cards', icon: 'card' as const, label: 'Tessere', gradient: gradients.blue, onPress: onNavigateCards },
  ];

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-dashboard"
      />

      {showLoader ? (
        <Loading text="Caricamento modulo SIAE..." />
      ) : (
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
            <Text style={styles.title}>Modulo SIAE</Text>
            <Badge variant={stats.moduleEnabled ? 'success' : 'secondary'}>
              {stats.moduleEnabled ? 'Attivo' : 'Disattivato'}
            </Badge>
          </View>

          {stats.pendingReportsCount > 0 && (
            <Card style={styles.alertCard} testID="card-pending-reports">
              <View style={styles.alertContent}>
                <View style={[styles.alertIcon, { backgroundColor: `${staticColors.warning}20` }]}>
                  <Ionicons name="alert-circle" size={24} color={staticColors.warning} />
                </View>
                <View style={styles.alertText}>
                  <Text style={styles.alertTitle}>{stats.pendingReportsCount} Report in attesa</Text>
                  <Text style={styles.alertSubtext}>Completa l'invio dei report SIAE</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
              </View>
            </Card>
          )}

          <View style={styles.statsGrid}>
            <GlassCard style={styles.statCard} testID="stat-pending-rca">
              <View style={[styles.statIcon, { backgroundColor: `${staticColors.warning}20` }]}>
                <Ionicons name="time" size={20} color={staticColors.warning} />
              </View>
              <Text style={styles.statValue}>{stats.pendingRCACount}</Text>
              <Text style={styles.statLabel}>RCA in attesa</Text>
            </GlassCard>

            <GlassCard style={styles.statCard} testID="stat-rmg-status">
              <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                <Ionicons name="today" size={20} color={staticColors.teal} />
              </View>
              <View style={styles.statBadge}>
                {getStatusBadge(stats.monthlyRMGStatus)}
              </View>
              <Text style={styles.statLabel}>RMG Mensile</Text>
            </GlassCard>

            <GlassCard style={styles.statCard} testID="stat-rpm-status">
              <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                <Ionicons name="calendar" size={20} color={staticColors.primary} />
              </View>
              <View style={styles.statBadge}>
                {getStatusBadge(stats.annualRPMStatus)}
              </View>
              <Text style={styles.statLabel}>RPM Annuale</Text>
            </GlassCard>

            <GlassCard style={styles.statCard} testID="stat-corrections">
              <View style={[styles.statIcon, { backgroundColor: `${staticColors.destructive}20` }]}>
                <Ionicons name="construct" size={20} color={staticColors.destructive} />
              </View>
              <Text style={styles.statValue}>{stats.pendingCorrections}</Text>
              <Text style={styles.statLabel}>Correzioni</Text>
            </GlassCard>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Azioni Rapide</Text>
            <View style={styles.actionsGrid}>
              {quickActions.map((action) => (
                <Pressable
                  key={action.id}
                  onPress={() => {
                    triggerHaptic('light');
                    action.onPress();
                  }}
                  testID={`action-${action.id}`}
                >
                  <LinearGradient
                    colors={action.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionCard}
                  >
                    <Ionicons name={action.icon} size={28} color="#FFFFFF" />
                    <Text style={styles.actionLabel}>{action.label}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          </View>

          {stats.transmissionErrors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Errori di Trasmissione</Text>
              {stats.transmissionErrors.map((error) => (
                <Card key={error.id} style={styles.errorCard} testID={`error-${error.id}`}>
                  <View style={styles.errorContent}>
                    <View style={[styles.errorIcon, { backgroundColor: `${staticColors.destructive}20` }]}>
                      <Ionicons name="warning" size={18} color={staticColors.destructive} />
                    </View>
                    <View style={styles.errorInfo}>
                      <Text style={styles.errorType}>{error.reportType.toUpperCase()}</Text>
                      <Text style={styles.errorMessage} numberOfLines={2}>{error.errorMessage}</Text>
                      <Text style={styles.errorDate}>{formatDate(error.date)}</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {stats.recentActivity.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Attività Recente</Text>
              {stats.recentActivity.slice(0, 5).map((activity) => (
                <Card key={activity.id} style={styles.activityCard} testID={`activity-${activity.id}`}>
                  <View style={styles.activityContent}>
                    <View style={styles.activityInfo}>
                      <Badge variant="outline" style={styles.typeBadge}>
                        {activity.type.toUpperCase()}
                      </Badge>
                      <Text style={styles.activityDescription} numberOfLines={1}>
                        {activity.description}
                      </Text>
                    </View>
                    <View style={styles.activityRight}>
                      {getStatusBadge(activity.status)}
                      <Text style={styles.activityDate}>{formatDate(activity.date)}</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
    paddingBottom: spacing.xl * 2,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  alertCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: `${staticColors.warning}10`,
    borderColor: staticColors.warning,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  alertSubtext: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    padding: spacing.md,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statBadge: {
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    width: 160,
    height: 100,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  errorContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  errorIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorInfo: {
    flex: 1,
  },
  errorType: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.destructive,
    marginBottom: 2,
  },
  errorMessage: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  errorDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 4,
  },
  activityCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  activityContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeBadge: {
    minWidth: 40,
  },
  activityDescription: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
    flex: 1,
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  activityDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
});

export default GestoreSIAEDashboardScreen;
