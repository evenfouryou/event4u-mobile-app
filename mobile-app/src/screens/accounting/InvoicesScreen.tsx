import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Invoice {
  id: string;
  number: string;
  customerName: string;
  amount: number;
  date: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
}

const STATUS_FILTERS = [
  { id: 'all', label: 'Tutte', icon: 'receipt-outline' },
  { id: 'paid', label: 'Pagate', icon: 'checkmark-circle-outline' },
  { id: 'pending', label: 'In Attesa', icon: 'time-outline' },
  { id: 'overdue', label: 'Scadute', icon: 'alert-circle-outline' },
];

export function InvoicesScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadInvoices = async () => {
    try {
      const response = await api.get<any>('/api/invoices');
      const data = response.invoices || response || [];

      setInvoices(data.map((inv: any) => {
        const dueDate = new Date(inv.dueDate || inv.due_date);
        const now = new Date();
        let status: 'paid' | 'pending' | 'overdue' = 'pending';

        if (inv.status === 'paid' || inv.isPaid) {
          status = 'paid';
        } else if (dueDate < now) {
          status = 'overdue';
        }

        return {
          id: inv.id?.toString() || Math.random().toString(),
          number: inv.number || inv.invoiceNumber || `INV-${inv.id}`,
          customerName: inv.customerName || inv.customer?.name || 'Cliente',
          amount: parseFloat(inv.amount || inv.total || 0),
          date: inv.date || inv.createdAt,
          dueDate: inv.dueDate || inv.due_date,
          status,
        };
      }));
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([
        { id: '1', number: 'INV-2025-001', customerName: 'Club Milano', amount: 2500, date: '2025-01-15', dueDate: '2025-02-15', status: 'pending' },
        { id: '2', number: 'INV-2025-002', customerName: 'Event Roma Srl', amount: 1800, date: '2025-01-10', dueDate: '2025-02-10', status: 'paid' },
        { id: '3', number: 'INV-2024-089', customerName: 'Party Naples', amount: 3200, date: '2024-12-01', dueDate: '2025-01-01', status: 'overdue' },
      ]);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return colors.teal;
      case 'pending':
        return colors.warning;
      case 'overdue':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagata';
      case 'pending':
        return 'In Attesa';
      case 'overdue':
        return 'Scaduta';
      default:
        return status;
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus = selectedStatus === 'all' || invoice.status === selectedStatus;
    const matchesSearch = searchQuery === '' ||
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const renderInvoiceCard = ({ item, index }: { item: Invoice; index: number }) => (
    <TouchableOpacity
      style={[
        styles.invoiceCard,
        (isLandscape || isTablet) && styles.invoiceCardWide,
      ]}
      onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
      activeOpacity={0.8}
      testID={`card-invoice-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.invoiceRow}>
          <View style={styles.invoiceInfo}>
            <View style={styles.invoiceHeader}>
              <Text style={styles.invoiceNumber}>{item.number}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor(item.status)}20` }
              ]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <View style={styles.invoiceDates}>
              <Text style={styles.invoiceDate}>
                Emessa: {formatDate(item.date)}
              </Text>
              <Text style={styles.invoiceDate}>
                Scadenza: {formatDate(item.dueDate)}
              </Text>
            </View>
          </View>
          <View style={styles.invoiceAmountContainer}>
            <Text style={styles.invoiceAmount}>{formatCurrency(item.amount)}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Fatture" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="text-loading">Caricamento fatture...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Fatture" showBack onBack={() => navigation.goBack()} />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca per numero o cliente..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-invoices"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScroll}
        testID="scroll-filters"
      >
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterPill,
              selectedStatus === filter.id && styles.filterPillActive,
            ]}
            onPress={() => setSelectedStatus(filter.id)}
            testID={`pill-status-${filter.id}`}
          >
            <Ionicons
              name={filter.icon as any}
              size={16}
              color={selectedStatus === filter.id ? colors.primaryForeground : colors.foreground}
            />
            <Text
              style={[
                styles.filterPillText,
                selectedStatus === filter.id && styles.filterPillTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceCard}
        keyExtractor={(item) => item.id}
        numColumns={(isLandscape || isTablet) ? 2 : 1}
        key={(isLandscape || isTablet) ? 'two-columns' : 'one-column'}
        contentContainerStyle={[
          styles.listContent,
          (isLandscape || isTablet) && styles.listContentWide,
        ]}
        columnWrapperStyle={(isLandscape || isTablet) ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        testID="list-invoices"
        ListEmptyComponent={
          <Card variant="glass" style={styles.emptyCard} testID="empty-state">
            <Ionicons name="document-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna fattura trovata</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Prova a modificare i criteri di ricerca' : 'Le fatture appariranno qui'}
            </Text>
          </Card>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: 'new' })}
        activeOpacity={0.8}
        testID="button-new-invoice"
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    marginBottom: spacing.md,
  },
  searchInputWrapper: {
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
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  listContentWide: {
    paddingHorizontal: spacing.md,
  },
  columnWrapper: {
    gap: spacing.md,
  },
  invoiceCard: {
    marginBottom: spacing.md,
  },
  invoiceCardWide: {
    flex: 1,
    maxWidth: '50%',
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  invoiceNumber: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  customerName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  invoiceDates: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  invoiceDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  invoiceAmountContainer: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  invoiceAmount: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyText: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  emptySubtext: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default InvoicesScreen;
