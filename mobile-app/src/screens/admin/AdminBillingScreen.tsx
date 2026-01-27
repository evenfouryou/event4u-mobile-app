import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { BillingStats, Invoice } from '@/lib/api';

type TabType = 'overview' | 'invoices' | 'plans';

interface AdminBillingScreenProps {
  onBack: () => void;
}

export function AdminBillingScreen({ onBack }: AdminBillingScreenProps) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<BillingStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeSubscriptions: 0,
    pendingInvoices: 0,
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    loadBilling();
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

  const loadBilling = async () => {
    try {
      setIsLoading(true);
      const [statsData, invoicesData] = await Promise.all([
        api.getAdminBillingStats(),
        api.getAdminInvoices(),
      ]);
      setStats(statsData);
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading billing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBilling();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Pagata</Badge>;
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Scaduta</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'invoices', label: 'Fatture' },
    { id: 'plans', label: 'Piani' },
  ];

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
            <Ionicons name="cash" size={24} color={staticColors.golden} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</Text>
          <Text style={styles.statLabel}>Fatturato Totale</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="trending-up" size={24} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(stats.monthlyRevenue)}</Text>
          <Text style={styles.statLabel}>Mese Corrente</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
            <Ionicons name="checkmark-circle" size={24} color={staticColors.success} />
          </View>
          <Text style={styles.statValue}>{stats.activeSubscriptions}</Text>
          <Text style={styles.statLabel}>Abbonamenti</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.warning}20` }]}>
            <Ionicons name="time" size={24} color={staticColors.warning} />
          </View>
          <Text style={styles.statValue}>{stats.pendingInvoices}</Text>
          <Text style={styles.statLabel}>In Attesa</Text>
        </GlassCard>
      </View>

      <Text style={styles.sectionTitle}>Ultime Fatture</Text>
      {invoices.slice(0, 5).map((invoice) => (
        <Card key={invoice.id} style={styles.invoiceCard}>
          <View style={styles.invoiceHeader}>
            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceNumber}>{invoice.number}</Text>
              <Text style={styles.invoiceClient}>{invoice.clientName}</Text>
            </View>
            {getInvoiceStatusBadge(invoice.status)}
          </View>
          <View style={styles.invoiceFooter}>
            <Text style={styles.invoiceDate}>{formatDate(invoice.date)}</Text>
            <Text style={styles.invoiceAmount}>{formatCurrency(invoice.amount)}</Text>
          </View>
        </Card>
      ))}
    </View>
  );

  const renderInvoices = () => (
    <View style={styles.tabContent}>
      {invoices.length > 0 ? (
        invoices.map((invoice) => (
          <Card key={invoice.id} style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <View style={styles.invoiceInfo}>
                <Text style={styles.invoiceNumber}>{invoice.number}</Text>
                <Text style={styles.invoiceClient}>{invoice.clientName}</Text>
              </View>
              {getInvoiceStatusBadge(invoice.status)}
            </View>
            <View style={styles.invoiceFooter}>
              <Text style={styles.invoiceDate}>{formatDate(invoice.date)}</Text>
              <Text style={styles.invoiceAmount}>{formatCurrency(invoice.amount)}</Text>
            </View>
          </Card>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuna fattura</Text>
        </Card>
      )}
    </View>
  );

  const renderPlans = () => (
    <View style={styles.tabContent}>
      <Card style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planName}>Piano Base</Text>
          <Badge variant="secondary">Starter</Badge>
        </View>
        <Text style={styles.planPrice}>{formatCurrency(29)}/mese</Text>
        <View style={styles.planFeatures}>
          <Text style={styles.planFeature}>Fino a 5 eventi/mese</Text>
          <Text style={styles.planFeature}>500 biglietti/evento</Text>
          <Text style={styles.planFeature}>Supporto email</Text>
        </View>
      </Card>

      <Card style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planName}>Piano Pro</Text>
          <Badge variant="default">Popolare</Badge>
        </View>
        <Text style={styles.planPrice}>{formatCurrency(79)}/mese</Text>
        <View style={styles.planFeatures}>
          <Text style={styles.planFeature}>Eventi illimitati</Text>
          <Text style={styles.planFeature}>Biglietti illimitati</Text>
          <Text style={styles.planFeature}>Supporto prioritario</Text>
          <Text style={styles.planFeature}>SIAE incluso</Text>
        </View>
      </Card>

      <Card style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planName}>Piano Enterprise</Text>
          <Badge variant="success">Premium</Badge>
        </View>
        <Text style={styles.planPrice}>Custom</Text>
        <View style={styles.planFeatures}>
          <Text style={styles.planFeature}>Tutto incluso in Pro</Text>
          <Text style={styles.planFeature}>API dedicate</Text>
          <Text style={styles.planFeature}>Gestore dedicato</Text>
          <Text style={styles.planFeature}>SLA garantito</Text>
        </View>
      </Card>
    </View>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-billing"
      />

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab(tab.id);
            }}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            testID={`tab-${tab.id}`}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {showLoader ? (
        <Loading text="Caricamento billing..." />
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
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'invoices' && renderInvoices()}
          {activeTab === 'plans' && renderPlans()}
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: staticColors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  tabTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  tabContent: {
    paddingHorizontal: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '48%',
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  invoiceCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  invoiceClient: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  invoiceDate: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  invoiceAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  planCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  planPrice: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.primary,
    marginBottom: spacing.md,
  },
  planFeatures: {
    gap: spacing.xs,
  },
  planFeature: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.md,
  },
});

export default AdminBillingScreen;
