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
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface SystemStatus {
  smartCardConnected: boolean;
  bridgeConnected: boolean;
  lastSync: string | null;
}

interface Transmission {
  id: number;
  type: string;
  status: 'pending' | 'success' | 'error';
  eventName: string;
  createdAt: string;
  errorMessage?: string;
}

interface DashboardStats {
  pendingCount: number;
  successCount: number;
  errorCount: number;
  todayCount: number;
}

export function SIAEHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    pendingCount: 0,
    successCount: 0,
    errorCount: 0,
    todayCount: 0,
  });
  const [recentTransmissions, setRecentTransmissions] = useState<Transmission[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    smartCardConnected: false,
    bridgeConnected: false,
    lastSync: null,
  });

  const loadData = async () => {
    try {
      const [transmissionsRes, statusRes] = await Promise.all([
        api.get<any>('/api/siae/transmissions?limit=5'),
        api.get<any>('/api/siae/status').catch(() => ({
          smartCardConnected: false,
          bridgeConnected: false,
          lastSync: null,
        })),
      ]);

      const transmissions = transmissionsRes.transmissions || transmissionsRes || [];
      
      const pending = transmissions.filter((t: any) => t.status === 'pending').length;
      const success = transmissions.filter((t: any) => t.status === 'success' || t.status === 'completed').length;
      const errors = transmissions.filter((t: any) => t.status === 'error' || t.status === 'failed').length;
      
      const today = new Date().toDateString();
      const todayCount = transmissions.filter((t: any) => 
        new Date(t.createdAt).toDateString() === today
      ).length;

      setStats({
        pendingCount: pending,
        successCount: success,
        errorCount: errors,
        todayCount,
      });

      setRecentTransmissions(transmissions.slice(0, 5).map((t: any) => ({
        id: t.id,
        type: t.type || t.reportType || 'RCA',
        status: t.status === 'completed' ? 'success' : t.status === 'failed' ? 'error' : t.status,
        eventName: t.eventName || t.event?.name || 'Evento',
        createdAt: t.createdAt,
        errorMessage: t.errorMessage,
      })));

      setSystemStatus(statusRes);
    } catch (error) {
      console.error('Error loading SIAE dashboard:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.destructive;
      case 'pending':
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'pending':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return 'Completato';
      case 'error':
        return 'Errore';
      case 'pending':
        return 'In Attesa';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="SIAE Ticketing" />
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
        title="SIAE Ticketing"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('SIAETransmissions')}
            data-testid="button-view-transmissions"
          >
            <Ionicons name="list-outline" size={24} color={colors.foreground} />
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
          <Text style={styles.sectionTitle}>Stato Sistema</Text>
          <Card variant="glass" style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: systemStatus.smartCardConnected ? colors.success : colors.destructive }
                ]} />
                <Text style={styles.statusLabel}>Smart Card</Text>
                <Text style={[
                  styles.statusValue,
                  { color: systemStatus.smartCardConnected ? colors.success : colors.destructive }
                ]}>
                  {systemStatus.smartCardConnected ? 'Connessa' : 'Non connessa'}
                </Text>
              </View>
              <View style={styles.statusDivider} />
              <View style={styles.statusItem}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: systemStatus.bridgeConnected ? colors.success : colors.destructive }
                ]} />
                <Text style={styles.statusLabel}>Bridge</Text>
                <Text style={[
                  styles.statusValue,
                  { color: systemStatus.bridgeConnected ? colors.success : colors.destructive }
                ]}>
                  {systemStatus.bridgeConnected ? 'Attivo' : 'Offline'}
                </Text>
              </View>
            </View>
            {systemStatus.lastSync && (
              <Text style={styles.lastSync}>
                Ultimo sync: {formatDate(systemStatus.lastSync)}
              </Text>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Riepilogo</Text>
          <View style={styles.statsGrid}>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.warning}20` }]}>
                <Ionicons name="time-outline" size={24} color={colors.warning} />
              </View>
              <Text style={styles.statValue}>{stats.pendingCount}</Text>
              <Text style={styles.statLabel}>In Attesa</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.success}20` }]}>
                <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
              </View>
              <Text style={styles.statValue}>{stats.successCount}</Text>
              <Text style={styles.statLabel}>Completati</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.destructive}20` }]}>
                <Ionicons name="close-circle-outline" size={24} color={colors.destructive} />
              </View>
              <Text style={styles.statValue}>{stats.errorCount}</Text>
              <Text style={styles.statLabel}>Errori</Text>
            </Card>
            <Card variant="glass" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="today-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{stats.todayCount}</Text>
              <Text style={styles.statLabel}>Oggi</Text>
            </Card>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Azioni Rapide</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('SIAEReports', { defaultType: 'RCA' })}
              activeOpacity={0.8}
              data-testid="button-rca-report"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="document-text-outline" size={28} color={colors.primaryForeground} />
              </View>
              <Text style={styles.actionLabel}>RCA</Text>
              <Text style={styles.actionDesc}>Riepilogo Controllo Accessi</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('SIAEReports', { defaultType: 'RMG' })}
              activeOpacity={0.8}
              data-testid="button-rmg-report"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.success }]}>
                <Ionicons name="calendar-outline" size={28} color={colors.successForeground} />
              </View>
              <Text style={styles.actionLabel}>RMG</Text>
              <Text style={styles.actionDesc}>Report Mensile Giornaliero</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('SIAEReports', { defaultType: 'RPM' })}
              activeOpacity={0.8}
              data-testid="button-rpm-report"
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
                <Ionicons name="stats-chart-outline" size={28} color={colors.accentForeground} />
              </View>
              <Text style={styles.actionLabel}>RPM</Text>
              <Text style={styles.actionDesc}>Report Periodo Mensile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trasmissioni Recenti</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SIAETransmissions')}
              data-testid="button-view-all-transmissions"
            >
              <Text style={styles.viewAllText}>Vedi tutte</Text>
            </TouchableOpacity>
          </View>
          
          {recentTransmissions.length > 0 ? (
            recentTransmissions.map((transmission) => (
              <TouchableOpacity
                key={transmission.id}
                style={styles.transmissionCard}
                onPress={() => navigation.navigate('SIAETransmissionDetail', { transmissionId: transmission.id })}
                activeOpacity={0.8}
                data-testid={`card-transmission-${transmission.id}`}
              >
                <Card variant="glass">
                  <View style={styles.transmissionRow}>
                    <View style={styles.transmissionInfo}>
                      <View style={styles.transmissionHeader}>
                        <View style={[styles.typeBadge, { backgroundColor: `${colors.primary}20` }]}>
                          <Text style={[styles.typeText, { color: colors.primary }]}>
                            {transmission.type}
                          </Text>
                        </View>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: `${getStatusColor(transmission.status)}20` }
                        ]}>
                          <Ionicons
                            name={getStatusIcon(transmission.status) as any}
                            size={14}
                            color={getStatusColor(transmission.status)}
                          />
                          <Text style={[styles.statusText, { color: getStatusColor(transmission.status) }]}>
                            {getStatusLabel(transmission.status)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.transmissionEvent}>{transmission.eventName}</Text>
                      <Text style={styles.transmissionDate}>{formatDate(transmission.createdAt)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <Card variant="glass" style={styles.emptyCard}>
              <Ionicons name="document-outline" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>Nessuna trasmissione</Text>
              <Button
                title="Genera Report"
                onPress={() => navigation.navigate('SIAEReports')}
                variant="primary"
                size="sm"
              />
            </Card>
          )}
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
  viewAllText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  statusCard: {
    padding: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  statusLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  statusValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  statusDivider: {
    width: 1,
    height: 50,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  lastSync: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
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
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  actionDesc: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  transmissionCard: {
    marginBottom: spacing.md,
  },
  transmissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transmissionInfo: {
    flex: 1,
  },
  transmissionHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  transmissionEvent: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  transmissionDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
});

export default SIAEHomeScreen;
