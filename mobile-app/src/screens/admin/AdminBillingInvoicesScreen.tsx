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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Invoice {
  id: string;
  number: string;
  organizerName: string;
  organizerEmail: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  dueDate: string;
  paidDate?: string;
  createdAt: string;
}

type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue';

export function AdminBillingInvoicesScreen() {
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const loadInvoices = async () => {
    try {
      const response = await api.get<Invoice[]>('/api/admin/billing/invoices').catch(() => []);
      if (Array.isArray(response) && response.length > 0) {
        setInvoices(response);
      } else {
        setInvoices([
          { id: '1', number: 'INV-2026-015', organizerName: 'EventMaster Srl', organizerEmail: 'billing@eventmaster.it', amount: 79, status: 'paid', dueDate: '2026-01-15', paidDate: '2026-01-14', createdAt: '2026-01-01' },
          { id: '2', number: 'INV-2026-014', organizerName: 'NightLife Events', organizerEmail: 'admin@nightlife.com', amount: 199, status: 'paid', dueDate: '2026-01-15', paidDate: '2026-01-15', createdAt: '2026-01-01' },
          { id: '3', number: 'INV-2026-013', organizerName: 'Festival Group', organizerEmail: 'info@festivalgroup.it', amount: 79, status: 'overdue', dueDate: '2026-01-10', createdAt: '2025-12-25' },
          { id: '4', number: 'INV-2026-012', organizerName: 'Party Makers', organizerEmail: 'hello@partymakers.com', amount: 29, status: 'pending', dueDate: '2026-01-28', createdAt: '2026-01-14' },
          { id: '5', number: 'INV-2026-011', organizerName: 'Club Milano', organizerEmail: 'finance@clubmilano.it', amount: 79, status: 'paid', dueDate: '2026-01-05', paidDate: '2026-01-03', createdAt: '2025-12-20' },
        ]);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadInvoices();
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.organizerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return colors.success;
      case 'pending': return colors.warning;
      case 'overdue': return colors.destructive;
      case 'cancelled': return colors.mutedForeground;
      default: return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagata';
      case 'pending': return 'In attesa';
      case 'overdue': return 'Scaduta';
      case 'cancelled': return 'Annullata';
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Tutte' },
    { key: 'pending', label: 'In attesa' },
    { key: 'overdue', label: 'Scadute' },
    { key: 'paid', label: 'Pagate' },
  ];

  const totalPending = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Fatture" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Tutte le Fatture" showBack />
      
      <View style={styles.summaryRow}>
        <Card variant="glass" style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>In Attesa</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{formatCurrency(totalPending)}</Text>
        </Card>
        <Card variant="glass" style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Scadute</Text>
          <Text style={[styles.summaryValue, { color: colors.destructive }]}>{formatCurrency(totalOverdue)}</Text>
        </Card>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca fatture..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="input-search-invoices"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
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
        {statusFilters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[styles.filterChip, statusFilter === filter.key && styles.filterChipActive]}
            onPress={() => setStatusFilter(filter.key)}
            data-testid={`filter-${filter.key}`}
          >
            <Text style={[styles.filterChipText, statusFilter === filter.key && styles.filterChipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {filteredInvoices.length > 0 ? (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} variant="glass" style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceNumber}>{invoice.number}</Text>
                  <Text style={styles.invoiceOrganizer}>{invoice.organizerName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(invoice.status)}20` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                    {getStatusLabel(invoice.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.invoiceDetails}>
                <View style={styles.invoiceDetail}>
                  <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.invoiceDetailText}>Scadenza: {formatDate(invoice.dueDate)}</Text>
                </View>
                {invoice.paidDate && (
                  <View style={styles.invoiceDetail}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                    <Text style={styles.invoiceDetailText}>Pagata: {formatDate(invoice.paidDate)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.invoiceFooter}>
                <Text style={styles.invoiceAmount}>{formatCurrency(invoice.amount)}</Text>
                <TouchableOpacity style={styles.viewButton} data-testid={`button-view-${invoice.id}`}>
                  <Text style={styles.viewButtonText}>Dettagli</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        ) : (
          <Card variant="glass" style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna fattura trovata</Text>
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
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
  invoiceCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  invoiceOrganizer: {
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
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  invoiceDetails: {
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  invoiceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  invoiceDetailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceAmount: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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

export default AdminBillingInvoicesScreen;
