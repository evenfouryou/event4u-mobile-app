import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { SkeletonList } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';

interface Invoice {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  paymentMethod?: string;
}

interface AdminBillingInvoicesScreenProps {
  onBack: () => void;
}

export function AdminBillingInvoicesScreen({ onBack }: AdminBillingInvoicesScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
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

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setInvoices([
        {
          id: '1',
          number: 'INV-2026-0001',
          clientName: 'Event Club Milano',
          clientEmail: 'marco@eventclub.it',
          date: '2026-01-15',
          dueDate: '2026-01-30',
          amount: 79,
          status: 'paid',
          paymentMethod: 'Carta di credito',
        },
        {
          id: '2',
          number: 'INV-2026-0002',
          clientName: 'Party Roma Srl',
          clientEmail: 'laura@partyroma.it',
          date: '2026-01-18',
          dueDate: '2026-02-02',
          amount: 199,
          status: 'paid',
          paymentMethod: 'Bonifico',
        },
        {
          id: '3',
          number: 'INV-2026-0003',
          clientName: 'Night Life Napoli',
          clientEmail: 'giuseppe@nightlife.it',
          date: '2026-01-20',
          dueDate: '2026-02-04',
          amount: 29,
          status: 'pending',
        },
        {
          id: '4',
          number: 'INV-2026-0004',
          clientName: 'Disco Torino',
          clientEmail: 'anna@discotorino.it',
          date: '2026-01-05',
          dueDate: '2026-01-20',
          amount: 79,
          status: 'overdue',
        },
        {
          id: '5',
          number: 'INV-2026-0005',
          clientName: 'Disco Torino',
          clientEmail: 'anna@discotorino.it',
          date: '2025-12-15',
          dueDate: '2025-12-30',
          amount: 79,
          status: 'overdue',
        },
        {
          id: '6',
          number: 'INV-2025-0156',
          clientName: 'Festival Firenze',
          clientEmail: 'luca@festivalfirenze.it',
          date: '2025-11-01',
          dueDate: '2025-11-15',
          amount: 29,
          status: 'cancelled',
        },
      ]);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
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

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Pagata</Badge>;
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Scaduta</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Annullata</Badge>;
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    triggerHaptic('medium');
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    triggerHaptic('medium');
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterStatus || inv.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusFilters = [
    { id: null, label: 'Tutte' },
    { id: 'paid', label: 'Pagate' },
    { id: 'pending', label: 'In attesa' },
    { id: 'overdue', label: 'Scadute' },
    { id: 'cancelled', label: 'Annullate' },
  ];

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = filteredInvoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Fatture Emesse"
        showBack
        onBack={onBack}
        testID="header-billing-invoices"
      />

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca fattura o cliente..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-invoice"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContainer}
      >
        {statusFilters.map((filter) => (
          <Pressable
            key={filter.id ?? 'all'}
            onPress={() => {
              triggerHaptic('light');
              setFilterStatus(filter.id);
            }}
            style={[
              styles.filterChip,
              { backgroundColor: filterStatus === filter.id ? colors.primary : colors.card, borderColor: colors.border },
            ]}
            testID={`filter-${filter.id ?? 'all'}`}
          >
            <Text style={[
              styles.filterChipText,
              { color: filterStatus === filter.id ? colors.primaryForeground : colors.foreground },
            ]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {showLoader ? (
        <View style={styles.loaderContainer}>
          <SkeletonList count={4} />
        </View>
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
          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Totale</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{formatCurrency(totalAmount)}</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Incassato</Text>
              <Text style={[styles.statValue, { color: staticColors.success }]}>{formatCurrency(paidAmount)}</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Da incassare</Text>
              <Text style={[styles.statValue, { color: staticColors.warning }]}>{formatCurrency(pendingAmount)}</Text>
            </GlassCard>
          </View>

          {filteredInvoices.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Nessuna fattura trovata
              </Text>
            </Card>
          ) : (
            filteredInvoices.map((invoice) => (
              <Card 
                key={invoice.id} 
                style={styles.invoiceCard}
                onPress={() => handleViewInvoice(invoice)}
                testID={`card-invoice-${invoice.id}`}
              >
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceInfo}>
                    <Text style={[styles.invoiceNumber, { color: colors.foreground }]}>{invoice.number}</Text>
                    <Text style={[styles.clientName, { color: colors.mutedForeground }]}>{invoice.clientName}</Text>
                  </View>
                  {getStatusBadge(invoice.status)}
                </View>

                <View style={styles.invoiceDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Data emissione</Text>
                      <Text style={[styles.detailValue, { color: colors.foreground }]}>{formatDate(invoice.date)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Scadenza</Text>
                      <Text style={[styles.detailValue, { color: invoice.status === 'overdue' ? staticColors.destructive : colors.foreground }]}>
                        {formatDate(invoice.dueDate)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.invoiceFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.invoiceAmount, { color: colors.primary }]}>{formatCurrency(invoice.amount)}</Text>
                  <View style={styles.invoiceActions}>
                    {invoice.paymentMethod && (
                      <Text style={[styles.paymentMethod, { color: colors.mutedForeground }]}>{invoice.paymentMethod}</Text>
                    )}
                    <Pressable
                      onPress={() => handleDownloadInvoice(invoice)}
                      style={styles.downloadButton}
                      testID={`button-download-invoice-${invoice.id}`}
                    >
                      <Ionicons name="download-outline" size={20} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },
  filtersScroll: {
    maxHeight: 44,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  loaderContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
  },
  statValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
  },
  invoiceCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
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
  },
  clientName: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  invoiceDetails: {
    marginTop: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    marginTop: 2,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  invoiceAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  invoiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  paymentMethod: {
    fontSize: typography.fontSize.xs,
  },
  downloadButton: {
    padding: spacing.xs,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});

export default AdminBillingInvoicesScreen;
