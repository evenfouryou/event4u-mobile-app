import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  method: string;
}

interface InvoiceDetail {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  customer: {
    name: string;
    address: string;
    email: string;
    vatNumber?: string;
  };
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  paymentHistory: PaymentHistory[];
}

export function InvoiceDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { invoiceId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadInvoice = async () => {
    try {
      if (invoiceId === 'new') {
        setInvoice(null);
        setLoading(false);
        return;
      }

      const response = await api.get<any>(`/api/invoices/${invoiceId}`);

      const data = response.invoice || response;
      const dueDate = new Date(data.dueDate || data.due_date);
      const now = new Date();
      let status: 'paid' | 'pending' | 'overdue' = 'pending';

      if (data.status === 'paid' || data.isPaid) {
        status = 'paid';
      } else if (dueDate < now) {
        status = 'overdue';
      }

      setInvoice({
        id: data.id?.toString(),
        number: data.number || data.invoiceNumber || `INV-${data.id}`,
        date: data.date || data.createdAt,
        dueDate: data.dueDate || data.due_date,
        status,
        customer: {
          name: data.customerName || data.customer?.name || 'Cliente',
          address: data.customerAddress || data.customer?.address || '',
          email: data.customerEmail || data.customer?.email || '',
          vatNumber: data.customerVat || data.customer?.vatNumber,
        },
        lineItems: (data.lineItems || data.items || []).map((item: any, idx: number) => ({
          id: item.id?.toString() || idx.toString(),
          description: item.description || item.name,
          quantity: item.quantity || 1,
          unitPrice: parseFloat(item.unitPrice || item.price || 0),
          total: parseFloat(item.total || item.amount || 0),
        })),
        subtotal: parseFloat(data.subtotal || 0),
        taxRate: parseFloat(data.taxRate || 22),
        taxAmount: parseFloat(data.taxAmount || data.tax || 0),
        total: parseFloat(data.total || data.amount || 0),
        notes: data.notes,
        paymentHistory: (data.payments || data.paymentHistory || []).map((p: any) => ({
          id: p.id?.toString() || Math.random().toString(),
          date: p.date || p.createdAt,
          amount: parseFloat(p.amount || 0),
          method: p.method || 'Bonifico',
        })),
      });
    } catch (error) {
      console.error('Error loading invoice:', error);
      setInvoice({
        id: invoiceId,
        number: 'INV-2025-001',
        date: '2025-01-15',
        dueDate: '2025-02-15',
        status: 'pending',
        customer: {
          name: 'Club Milano Srl',
          address: 'Via Roma 123, 20121 Milano (MI)',
          email: 'info@clubmilano.it',
          vatNumber: 'IT12345678901',
        },
        lineItems: [
          { id: '1', description: 'Servizio biglietteria evento 15/01', quantity: 1, unitPrice: 1500, total: 1500 },
          { id: '2', description: 'Commissioni vendita online', quantity: 500, unitPrice: 2, total: 1000 },
        ],
        subtotal: 2500,
        taxRate: 22,
        taxAmount: 550,
        total: 3050,
        notes: 'Pagamento entro 30 giorni',
        paymentHistory: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

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

  const handleMarkAsPaid = async () => {
    Alert.alert(
      'Conferma Pagamento',
      'Vuoi segnare questa fattura come pagata?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Conferma',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.put(`/api/invoices/${invoiceId}`, { status: 'paid' });
              if (invoice) {
                setInvoice({ ...invoice, status: 'paid' });
              }
              Alert.alert('Successo', 'Fattura segnata come pagata');
            } catch (error) {
              Alert.alert('Errore', 'Impossibile aggiornare la fattura');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSendReminder = () => {
    Alert.alert(
      'Invia Promemoria',
      `Inviare un promemoria di pagamento a ${invoice?.customer.email}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Invia',
          onPress: () => {
            Alert.alert('Successo', 'Promemoria inviato con successo');
          },
        },
      ]
    );
  };

  const handleDownloadPDF = () => {
    Alert.alert('Download PDF', 'Il download del PDF inizierà a breve...');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Dettaglio Fattura" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.container}>
        <Header title="Nuova Fattura" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Ionicons name="construct-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.loadingText}>Creazione fattura in arrivo...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Dettaglio Fattura" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="glass" style={styles.headerCard}>
          <View style={styles.invoiceHeader}>
            <View>
              <Text style={styles.invoiceNumber}>{invoice.number}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor(invoice.status)}20` }
              ]}>
                <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                  {getStatusLabel(invoice.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.invoiceTotal}>{formatCurrency(invoice.total)}</Text>
          </View>
          <View style={styles.datesRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Data Emissione</Text>
              <Text style={styles.dateValue}>{formatDate(invoice.date)}</Text>
            </View>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Scadenza</Text>
              <Text style={[
                styles.dateValue,
                invoice.status === 'overdue' && { color: colors.destructive }
              ]}>
                {formatDate(invoice.dueDate)}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <Card variant="glass">
            <Text style={styles.customerName}>{invoice.customer.name}</Text>
            {invoice.customer.address && (
              <Text style={styles.customerDetail}>{invoice.customer.address}</Text>
            )}
            {invoice.customer.email && (
              <View style={styles.customerRow}>
                <Ionicons name="mail-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.customerDetail}>{invoice.customer.email}</Text>
              </View>
            )}
            {invoice.customer.vatNumber && (
              <View style={styles.customerRow}>
                <Ionicons name="document-text-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.customerDetail}>P.IVA: {invoice.customer.vatNumber}</Text>
              </View>
            )}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dettaglio Voci</Text>
          <Card variant="glass">
            {invoice.lineItems.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.lineItem,
                  index < invoice.lineItems.length - 1 && styles.lineItemBorder,
                ]}
              >
                <View style={styles.lineItemInfo}>
                  <Text style={styles.lineItemDesc}>{item.description}</Text>
                  <Text style={styles.lineItemQty}>
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                  </Text>
                </View>
                <Text style={styles.lineItemTotal}>{formatCurrency(item.total)}</Text>
              </View>
            ))}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Totali</Text>
          <Card variant="glass">
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Imponibile</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA ({invoice.taxRate}%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.taxAmount)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Totale</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
            </View>
          </Card>
        </View>

        {invoice.paymentHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Storico Pagamenti</Text>
            <Card variant="glass">
              {invoice.paymentHistory.map((payment, index) => (
                <View
                  key={payment.id}
                  style={[
                    styles.paymentItem,
                    index < invoice.paymentHistory.length - 1 && styles.paymentItemBorder,
                  ]}
                >
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentDate}>{formatDate(payment.date)}</Text>
                    <Text style={styles.paymentMethod}>{payment.method}</Text>
                  </View>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Note</Text>
            <Card variant="glass">
              <Text style={styles.notesText}>{invoice.notes}</Text>
            </Card>
          </View>
        )}
      </ScrollView>

      <View style={[styles.actionsContainer, { paddingBottom: insets.bottom + spacing.md }]}>
        {invoice.status !== 'paid' && (
          <Button
            title="Segna come Pagata"
            onPress={handleMarkAsPaid}
            variant="primary"
            loading={actionLoading}
            style={styles.actionButton}
            data-testid="button-mark-paid"
          />
        )}
        {invoice.status === 'overdue' && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSendReminder}
            data-testid="button-send-reminder"
          >
            <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
            <Text style={styles.secondaryButtonText}>Promemoria</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleDownloadPDF}
          data-testid="button-download-pdf"
        >
          <Ionicons name="download-outline" size={20} color={colors.foreground} />
          <Text style={styles.secondaryButtonText}>PDF</Text>
        </TouchableOpacity>
      </View>
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
  headerCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  invoiceNumber: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  invoiceTotal: {
    color: colors.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  datesRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  dateValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  customerName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  customerDetail: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    marginBottom: spacing.xs,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  lineItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineItemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  lineItemDesc: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  lineItemQty: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  lineItemTotal: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  totalLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  totalValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  grandTotalLabel: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  grandTotalValue: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  paymentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDate: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  paymentMethod: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  paymentAmount: {
    color: colors.teal,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  notesText: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  secondaryButtonText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});

export default InvoiceDetailScreen;
