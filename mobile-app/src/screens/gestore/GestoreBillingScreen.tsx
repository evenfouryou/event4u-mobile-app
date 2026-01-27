import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { Invoice } from '@/lib/api';

type InvoiceStatus = 'paid' | 'pending' | 'overdue';
type FilterStatus = 'all' | InvoiceStatus;

interface GestoreBillingScreenProps {
  onBack: () => void;
}

export function GestoreBillingScreen({ onBack }: GestoreBillingScreenProps) {
  const { colors } = useTheme();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customerName: '',
    amount: '',
    eventName: '',
  });

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
      const data = await api.getInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleExport = () => {
    triggerHaptic('light');
    Alert.alert(
      'Esporta Fatture',
      'Seleziona il formato di esportazione',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'CSV', onPress: () => Alert.alert('Successo', 'Esportazione CSV avviata') },
        { text: 'PDF', onPress: () => Alert.alert('Successo', 'Esportazione PDF avviata') },
        { text: 'Excel', onPress: () => Alert.alert('Successo', 'Esportazione Excel avviata') },
      ]
    );
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.customerName.trim() || !newInvoice.amount.trim()) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }

    triggerHaptic('medium');
    try {
      await api.createInvoice({
        customerName: newInvoice.customerName,
        amount: parseFloat(newInvoice.amount),
        eventName: newInvoice.eventName || undefined,
      });
      setShowCreateModal(false);
      setNewInvoice({ customerName: '', amount: '', eventName: '' });
      Alert.alert('Successo', 'Fattura creata con successo');
      loadInvoices();
    } catch (error) {
      Alert.alert('Errore', 'Impossibile creare la fattura');
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    triggerHaptic('light');
    Alert.alert('Scarica Fattura', `Download della fattura ${invoice.number}...`);
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    triggerHaptic('medium');
    Alert.alert(
      'Segna come Pagata',
      `Confermi di aver ricevuto il pagamento per la fattura ${invoice.number}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Conferma', 
          onPress: async () => {
            try {
              await api.updateInvoiceStatus(invoice.id, 'paid');
              setInvoices(invoices.map(inv => 
                inv.id === invoice.id ? { ...inv, status: 'paid' } : inv
              ));
              Alert.alert('Successo', 'Fattura aggiornata');
            } catch (error) {
              Alert.alert('Errore', 'Impossibile aggiornare la fattura');
            }
          }
        },
      ]
    );
  };

  const getStatusLabel = (status: InvoiceStatus): string => {
    switch (status) {
      case 'paid': return 'Pagata';
      case 'pending': return 'In Attesa';
      case 'overdue': return 'Scaduta';
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">{getStatusLabel(status)}</Badge>;
      case 'pending':
        return <Badge variant="warning">{getStatusLabel(status)}</Badge>;
      case 'overdue':
        return <Badge variant="destructive">{getStatusLabel(status)}</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const pendingAmount = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);
  const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0);

  const filters: { id: FilterStatus; label: string }[] = [
    { id: 'all', label: 'Tutte' },
    { id: 'paid', label: 'Pagate' },
    { id: 'pending', label: 'In Attesa' },
    { id: 'overdue', label: 'Scadute' },
  ];

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-billing"
      />

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
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Fatturazione</Text>
              <Text style={styles.subtitle}>Gestisci fatture e pagamenti</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleExport}
                style={styles.exportButton}
                testID="button-export"
              >
                <Ionicons name="download-outline" size={18} color={staticColors.primary} />
              </Pressable>
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  setShowCreateModal(true);
                }}
                style={styles.createButton}
                testID="button-create-invoice"
              >
                <Ionicons name="add" size={18} color={staticColors.primaryForeground} />
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryContainer}
        >
          <GlassCard style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: `${staticColors.success}20` }]}>
              <Ionicons name="checkmark-circle" size={20} color={staticColors.success} />
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
            <Text style={styles.summaryLabel}>Incassato</Text>
          </GlassCard>

          <GlassCard style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: `${staticColors.warning}20` }]}>
              <Ionicons name="time" size={20} color={staticColors.warning} />
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(pendingAmount)}</Text>
            <Text style={styles.summaryLabel}>In Attesa</Text>
          </GlassCard>

          <GlassCard style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: `${staticColors.destructive}20` }]}>
              <Ionicons name="alert-circle" size={20} color={staticColors.destructive} />
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(overdueAmount)}</Text>
            <Text style={styles.summaryLabel}>Scadute</Text>
          </GlassCard>
        </ScrollView>

        <View style={styles.section}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={staticColors.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cerca fatture..."
              placeholderTextColor={staticColors.mutedForeground}
              testID="input-search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={staticColors.mutedForeground} />
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {filters.map((filter) => (
              <Pressable
                key={filter.id}
                onPress={() => {
                  triggerHaptic('selection');
                  setFilterStatus(filter.id);
                }}
                style={[
                  styles.filterChip,
                  filterStatus === filter.id && styles.filterChipActive,
                ]}
                testID={`filter-${filter.id}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterStatus === filter.id && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fatture ({filteredInvoices.length})</Text>

          {showLoader ? (
            <Loading text="Caricamento fatture..." />
          ) : filteredInvoices.length > 0 ? (
            filteredInvoices.map((invoice) => (
              <Card key={invoice.id} style={styles.invoiceCard} testID={`invoice-${invoice.id}`}>
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceInfo}>
                    <Text style={styles.invoiceNumber}>{invoice.number}</Text>
                    <Text style={styles.invoiceCustomer}>{invoice.customerName}</Text>
                    {invoice.eventName && (
                      <Text style={styles.invoiceEvent}>{invoice.eventName}</Text>
                    )}
                  </View>
                  <View style={styles.invoiceRight}>
                    <Text style={styles.invoiceAmount}>{formatCurrency(invoice.amount)}</Text>
                    {getStatusBadge(invoice.status as InvoiceStatus)}
                  </View>
                </View>

                <View style={styles.invoiceDates}>
                  <View style={styles.invoiceDate}>
                    <Ionicons name="calendar-outline" size={14} color={staticColors.mutedForeground} />
                    <Text style={styles.invoiceDateText}>Emessa: {formatDate(invoice.issueDate)}</Text>
                  </View>
                  <View style={styles.invoiceDate}>
                    <Ionicons name="time-outline" size={14} color={invoice.status === 'overdue' ? staticColors.destructive : staticColors.mutedForeground} />
                    <Text style={[
                      styles.invoiceDateText,
                      invoice.status === 'overdue' && { color: staticColors.destructive },
                    ]}>
                      Scadenza: {formatDate(invoice.dueDate)}
                    </Text>
                  </View>
                </View>

                <View style={styles.invoiceActions}>
                  <Pressable
                    style={styles.invoiceActionButton}
                    onPress={() => handleDownloadInvoice(invoice)}
                    testID={`button-download-${invoice.id}`}
                  >
                    <Ionicons name="download-outline" size={16} color={staticColors.foreground} />
                    <Text style={styles.invoiceActionText}>Scarica</Text>
                  </Pressable>

                  {invoice.status !== 'paid' && (
                    <Pressable
                      style={styles.invoiceActionButtonPrimary}
                      onPress={() => handleMarkAsPaid(invoice)}
                      testID={`button-paid-${invoice.id}`}
                    >
                      <Ionicons name="checkmark" size={16} color={staticColors.primaryForeground} />
                      <Text style={styles.invoiceActionTextPrimary}>Segna Pagata</Text>
                    </Pressable>
                  )}
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={40} color={staticColors.mutedForeground} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Nessuna fattura trovata' : 'Nessuna fattura'}
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeArea style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nuova Fattura</Text>
            <Pressable onPress={() => setShowCreateModal(false)} style={styles.modalClose}>
              <Ionicons name="close" size={24} color={staticColors.foreground} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Cliente *</Text>
              <TextInput
                style={styles.formInput}
                value={newInvoice.customerName}
                onChangeText={(text) => setNewInvoice({ ...newInvoice, customerName: text })}
                placeholder="Nome cliente o azienda"
                placeholderTextColor={staticColors.mutedForeground}
                testID="input-customer"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Importo (EUR) *</Text>
              <TextInput
                style={styles.formInput}
                value={newInvoice.amount}
                onChangeText={(text) => setNewInvoice({ ...newInvoice, amount: text })}
                placeholder="0.00"
                placeholderTextColor={staticColors.mutedForeground}
                keyboardType="decimal-pad"
                testID="input-amount"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Evento (opzionale)</Text>
              <TextInput
                style={styles.formInput}
                value={newInvoice.eventName}
                onChangeText={(text) => setNewInvoice({ ...newInvoice, eventName: text })}
                placeholder="Nome evento associato"
                placeholderTextColor={staticColors.mutedForeground}
                testID="input-event"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Annulla</Text>
            </Pressable>
            <Pressable
              style={styles.modalConfirmButton}
              onPress={handleCreateInvoice}
              testID="button-save-invoice"
            >
              <Ionicons name="add" size={18} color={staticColors.primaryForeground} />
              <Text style={styles.modalConfirmButtonText}>Crea Fattura</Text>
            </Pressable>
          </View>
        </SafeArea>
      </Modal>
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
    paddingBottom: spacing.xxl,
  },
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: staticColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  summaryCard: {
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 120,
    marginRight: spacing.sm,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  filtersContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  filterChipTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  invoiceCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
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
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primary,
  },
  invoiceCustomer: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: 2,
  },
  invoiceEvent: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  invoiceAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  invoiceDates: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  invoiceDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  invoiceDateText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  invoiceActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
  },
  invoiceActionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  invoiceActionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: staticColors.primary,
    borderRadius: borderRadius.md,
  },
  invoiceActionTextPrimary: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  modalClose: {
    padding: spacing.xs,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: staticColors.card,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: borderRadius.md,
  },
  modalCancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.mutedForeground,
  },
  modalConfirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: staticColors.primary,
    borderRadius: borderRadius.md,
  },
  modalConfirmButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
});

export default GestoreBillingScreen;
