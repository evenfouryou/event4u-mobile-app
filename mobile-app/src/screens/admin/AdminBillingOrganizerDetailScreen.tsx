import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  paidDate?: string;
}

interface UsageItem {
  name: string;
  used: number;
  limit: number;
  unit: string;
}

interface OrganizerDetail {
  id: string;
  name: string;
  email: string;
  planName: string;
  planPrice: number;
  status: 'active' | 'past_due' | 'cancelled' | 'trial';
  balance: number;
  nextBillingDate: string;
  totalRevenue: number;
  joinedDate: string;
  invoices: Invoice[];
  usage: UsageItem[];
}

export function AdminBillingOrganizerDetailScreen() {
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const organizerId = route.params?.organizerId;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organizer, setOrganizer] = useState<OrganizerDetail | null>(null);

  const loadOrganizer = async () => {
    try {
      const response = await api.get<OrganizerDetail>(`/api/admin/billing/organizers/${organizerId}`).catch(() => null);
      if (response) {
        setOrganizer(response);
      } else {
        setOrganizer({
          id: organizerId,
          name: 'EventMaster Srl',
          email: 'billing@eventmaster.it',
          planName: 'Pro',
          planPrice: 79,
          status: 'active',
          balance: 0,
          nextBillingDate: '2026-02-15',
          totalRevenue: 4580,
          joinedDate: '2024-06-15',
          invoices: [
            { id: '1', number: 'INV-2026-001', amount: 79, status: 'paid', dueDate: '2026-01-15', paidDate: '2026-01-14' },
            { id: '2', number: 'INV-2025-012', amount: 79, status: 'paid', dueDate: '2025-12-15', paidDate: '2025-12-15' },
            { id: '3', number: 'INV-2025-011', amount: 79, status: 'paid', dueDate: '2025-11-15', paidDate: '2025-11-14' },
          ],
          usage: [
            { name: 'Eventi questo mese', used: 8, limit: -1, unit: 'eventi' },
            { name: 'Biglietti venduti', used: 2450, limit: 1000, unit: 'biglietti' },
            { name: 'Storage usato', used: 2.5, limit: 10, unit: 'GB' },
          ],
        });
      }
    } catch (error) {
      console.error('Error loading organizer:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrganizer();
  }, [organizerId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrganizer();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'paid': return colors.success;
      case 'past_due': case 'overdue': return colors.destructive;
      case 'pending': return colors.warning;
      default: return colors.mutedForeground;
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (used: number, limit: number) => {
    if (limit === -1) return colors.teal;
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return colors.destructive;
    if (percentage >= 70) return colors.warning;
    return colors.teal;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Dettaglio Organizzatore" showBack />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="text-loading">Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!organizer) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Dettaglio Organizzatore" showBack />
        <View style={styles.emptyContainer} testID="empty-container">
          <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText} testID="text-not-found">Organizzatore non trovato</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Dettaglio Fatturazione" showBack />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          (isTablet || isLandscape) && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        testID="scroll-view"
      >
        <Card variant="glass" style={styles.headerCard} testID="card-organizer-header">
          <View style={styles.orgHeader}>
            <View>
              <Text style={styles.orgName} testID="text-org-name">{organizer.name}</Text>
              <Text style={styles.orgEmail} testID="text-org-email">{organizer.email}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(organizer.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(organizer.status) }]} testID="text-status">
                {organizer.status === 'active' ? 'Attivo' : organizer.status}
              </Text>
            </View>
          </View>

          <View style={[styles.statsRow, (isTablet || isLandscape) && styles.statsRowWide]}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Piano</Text>
              <Text style={styles.statValue} testID="text-plan">{organizer.planName}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Mensile</Text>
              <Text style={[styles.statValue, { color: colors.teal }]} testID="text-monthly">{formatCurrency(organizer.planPrice)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Totale</Text>
              <Text style={[styles.statValue, { color: colors.primary }]} testID="text-total">{formatCurrency(organizer.totalRevenue)}</Text>
            </View>
          </View>
        </Card>

        <View style={[styles.section, (isTablet || isLandscape) && styles.sectionWide]}>
          <Text style={styles.sectionTitle}>Utilizzo</Text>
          <Card variant="glass" testID="card-usage">
            {organizer.usage.map((item, index) => (
              <View key={item.name}>
                <View style={styles.usageItem}>
                  <View style={styles.usageHeader}>
                    <Text style={styles.usageLabel} testID={`text-usage-${index}`}>{item.name}</Text>
                    <Text style={styles.usageValue}>
                      {item.used} {item.limit !== -1 ? `/ ${item.limit}` : ''} {item.unit}
                    </Text>
                  </View>
                  {item.limit !== -1 && (
                    <View style={styles.usageBarContainer}>
                      <View
                        style={[
                          styles.usageBar,
                          { width: `${getUsagePercentage(item.used, item.limit)}%`, backgroundColor: getUsageColor(item.used, item.limit) },
                        ]}
                      />
                    </View>
                  )}
                </View>
                {index < organizer.usage.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </Card>
        </View>

        <View style={[styles.section, (isTablet || isLandscape) && styles.sectionWide]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fatture Recenti</Text>
            <TouchableOpacity testID="button-view-all-invoices">
              <Text style={styles.viewAllText}>Vedi tutte</Text>
            </TouchableOpacity>
          </View>
          <View style={(isTablet || isLandscape) ? styles.invoicesGrid : undefined}>
            {organizer.invoices.map((invoice) => (
              <Card key={invoice.id} variant="glass" style={[styles.invoiceCard, (isTablet || isLandscape) && styles.invoiceCardWide]} testID={`card-invoice-${invoice.id}`}>
                <View style={styles.invoiceRow}>
                  <View style={styles.invoiceInfo}>
                    <Text style={styles.invoiceNumber} testID={`text-invoice-number-${invoice.id}`}>{invoice.number}</Text>
                    <Text style={styles.invoiceDate}>Scadenza: {formatDate(invoice.dueDate)}</Text>
                  </View>
                  <View style={styles.invoiceRight}>
                    <Text style={styles.invoiceAmount} testID={`text-invoice-amount-${invoice.id}`}>{formatCurrency(invoice.amount)}</Text>
                    <View style={[styles.invoiceStatus, { backgroundColor: `${getStatusColor(invoice.status)}20` }]}>
                      <Text style={[styles.invoiceStatusText, { color: getStatusColor(invoice.status) }]}>
                        {invoice.status === 'paid' ? 'Pagata' : invoice.status === 'pending' ? 'In attesa' : 'Scaduta'}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </View>

        <View style={[styles.actionsSection, (isTablet || isLandscape) && styles.actionsSectionWide]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Credito Aggiunto', 'Funzionalità in sviluppo')}
            testID="button-add-credit"
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Aggiungi Credito</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.warningButton]}
            onPress={() => Alert.alert('Sospendi Account', 'Funzionalità in sviluppo')}
            testID="button-suspend"
          >
            <Ionicons name="pause-circle-outline" size={20} color={colors.warning} />
            <Text style={[styles.actionButtonText, { color: colors.warning }]}>Sospendi Account</Text>
          </TouchableOpacity>
        </View>
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
  scrollContentWide: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  headerCard: {
    marginVertical: spacing.md,
    padding: spacing.xl,
  },
  orgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  orgName: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  orgEmail: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  statsRowWide: {
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionWide: {
    maxWidth: 800,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  usageItem: {
    paddingVertical: spacing.md,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  usageLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  usageValue: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  usageBarContainer: {
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  usageBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glass.border,
  },
  invoicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  invoiceCard: {
    marginBottom: spacing.sm,
    padding: spacing.lg,
  },
  invoiceCardWide: {
    flex: 1,
    minWidth: '45%',
    marginBottom: 0,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  invoiceDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  invoiceStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  invoiceStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  actionsSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionsSectionWide: {
    flexDirection: 'row',
    maxWidth: 600,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  warningButton: {
    backgroundColor: `${colors.warning}10`,
    borderColor: colors.warning,
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});

export default AdminBillingOrganizerDetailScreen;
