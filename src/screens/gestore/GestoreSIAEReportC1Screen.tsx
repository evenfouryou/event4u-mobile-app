import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAEC1Report, SIAEEvent } from '@/lib/api';

interface GestoreSIAEReportC1ScreenProps {
  onBack: () => void;
}

export function GestoreSIAEReportC1Screen({ onBack }: GestoreSIAEReportC1ScreenProps) {
  const { colors, gradients } = useTheme();
  const [report, setReport] = useState<SIAEC1Report | null>(null);
  const [events, setEvents] = useState<SIAEEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId && selectedDate) {
      loadReport();
    }
  }, [selectedEventId, selectedDate]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadEvents = async () => {
    try {
      const data = await api.getSIAEEvents();
      setEvents(data);
      if (data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading SIAE events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAEC1Report(selectedEventId, selectedDate);
      setReport(data);
    } catch (error) {
      console.error('Error loading C1 report:', error);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  const handleGenerateReport = async () => {
    if (!selectedEventId) return;
    try {
      setIsGenerating(true);
      triggerHaptic('medium');
      await api.generateSIAEC1Report(selectedEventId, selectedDate);
      await loadReport();
    } catch (error) {
      console.error('Error generating C1 report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTransmitReport = async () => {
    if (!report) return;
    try {
      setIsTransmitting(true);
      triggerHaptic('medium');
      await api.transmitSIAEC1Report(report.id);
      await loadReport();
    } catch (error) {
      console.error('Error transmitting C1 report:', error);
    } finally {
      setIsTransmitting(false);
    }
  };

  const handleViewPDF = async () => {
    if (!report) return;
    triggerHaptic('light');
    await api.previewSIAEC1ReportPDF(report.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getSignatureStatusBadge = (status: 'pending' | 'signed' | 'error') => {
    switch (status) {
      case 'signed':
        return <Badge variant="success">Firmato</Badge>;
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'error':
        return <Badge variant="destructive">Errore</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTransmissionStatusBadge = (status: 'draft' | 'sent' | 'confirmed' | 'error') => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confermato</Badge>;
      case 'sent':
        return <Badge variant="default">Inviato</Badge>;
      case 'draft':
        return <Badge variant="secondary">Bozza</Badge>;
      case 'error':
        return <Badge variant="destructive">Errore</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-report-c1"
      />

      {showLoader ? (
        <Loading text="Caricamento Report C1..." />
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
            <Text style={styles.title}>Report C1</Text>
            <Text style={styles.subtitle}>Riepilogo Giornaliero Fiscale</Text>
          </View>

          <Card style={styles.selectorCard} testID="card-event-selector">
            <Text style={styles.selectorLabel}>Seleziona Evento</Text>
            <Pressable
              style={styles.selectorButton}
              onPress={() => {
                triggerHaptic('light');
                setShowEventPicker(!showEventPicker);
              }}
              testID="button-event-selector"
            >
              <Text style={styles.selectorValue} numberOfLines={1}>
                {selectedEvent?.eventName || 'Seleziona un evento'}
              </Text>
              <Ionicons
                name={showEventPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>

            {showEventPicker && (
              <View style={styles.eventPickerList}>
                {events.map((event) => (
                  <Pressable
                    key={event.id}
                    style={[
                      styles.eventPickerItem,
                      event.id === selectedEventId && styles.eventPickerItemSelected,
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSelectedEventId(event.id);
                      setShowEventPicker(false);
                    }}
                    testID={`event-option-${event.id}`}
                  >
                    <Text
                      style={[
                        styles.eventPickerItemText,
                        event.id === selectedEventId && styles.eventPickerItemTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {event.eventName}
                    </Text>
                    <Text style={styles.eventPickerItemDate}>
                      {formatDate(event.eventDate)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.dateSelectorRow}>
              <Text style={styles.selectorLabel}>Data Report</Text>
              <Pressable
                style={styles.dateButton}
                onPress={() => triggerHaptic('light')}
                testID="button-date-selector"
              >
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={styles.dateButtonText}>{formatDate(selectedDate)}</Text>
              </Pressable>
            </View>
          </Card>

          {report ? (
            <>
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Firma Digitale</Text>
                  {getSignatureStatusBadge(report.signatureStatus)}
                </View>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Trasmissione</Text>
                  {getTransmissionStatusBadge(report.transmissionStatus)}
                </View>
              </View>

              <Card style={styles.sectionCard} testID="card-apertura">
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: `${staticColors.success}20` }]}>
                    <Ionicons name="log-in-outline" size={20} color={staticColors.success} />
                  </View>
                  <Text style={styles.sectionTitle}>Apertura</Text>
                </View>
                <View style={styles.sectionContent}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>Orario Apertura</Text>
                    <Text style={styles.sectionValue}>{formatTime(report.openTime)}</Text>
                  </View>
                </View>
              </Card>

              <Card style={styles.sectionCard} testID="card-chiusura">
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: `${staticColors.destructive}20` }]}>
                    <Ionicons name="log-out-outline" size={20} color={staticColors.destructive} />
                  </View>
                  <Text style={styles.sectionTitle}>Chiusura</Text>
                </View>
                <View style={styles.sectionContent}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>Orario Chiusura</Text>
                    <Text style={styles.sectionValue}>{formatTime(report.closeTime)}</Text>
                  </View>
                </View>
              </Card>

              <Card style={styles.sectionCard} testID="card-riepilogo">
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: `${staticColors.primary}20` }]}>
                    <Ionicons name="stats-chart" size={20} color={staticColors.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>Riepilogo</Text>
                </View>
                <View style={styles.sectionContent}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>Biglietti Venduti</Text>
                    <Text style={styles.sectionValue}>{report.ticketsSold.toLocaleString('it-IT')}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>Importo Totale</Text>
                    <Text style={[styles.sectionValue, styles.currencyValue]}>
                      {formatCurrency(report.totalRevenue)}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>Rimborsi ({report.refunds})</Text>
                    <Text style={[styles.sectionValue, styles.refundValue]}>
                      -{formatCurrency(report.refundAmount)}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>Annullamenti ({report.cancellations})</Text>
                    <Text style={[styles.sectionValue, styles.refundValue]}>
                      -{formatCurrency(report.cancellationAmount)}
                    </Text>
                  </View>
                </View>
              </Card>

              <View style={styles.actionsSection}>
                <Pressable
                  style={styles.actionButton}
                  onPress={handleViewPDF}
                  testID="button-view-pdf"
                >
                  <View style={[styles.actionButtonIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                    <Ionicons name="document-text-outline" size={22} color={staticColors.teal} />
                  </View>
                  <Text style={styles.actionButtonLabel}>Anteprima PDF</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionButton, isGenerating && styles.actionButtonDisabled]}
                  onPress={handleGenerateReport}
                  disabled={isGenerating}
                  testID="button-generate"
                >
                  <LinearGradient
                    colors={gradients.golden}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons name="create-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.actionButtonGradientLabel}>
                      {isGenerating ? 'Generazione...' : 'Genera'}
                    </Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  style={[
                    styles.actionButton,
                    (isTransmitting || report.signatureStatus !== 'signed') && styles.actionButtonDisabled,
                  ]}
                  onPress={handleTransmitReport}
                  disabled={isTransmitting || report.signatureStatus !== 'signed'}
                  testID="button-transmit"
                >
                  <LinearGradient
                    colors={gradients.teal}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons name="send-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.actionButtonGradientLabel}>
                      {isTransmitting ? 'Invio...' : 'Trasmetti'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          ) : selectedEventId ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Nessun Report Trovato</Text>
              <Text style={styles.emptyText}>
                Non esiste ancora un report C1 per questa data
              </Text>
              <Pressable
                style={styles.generateButton}
                onPress={handleGenerateReport}
                testID="button-generate-new"
              >
                <LinearGradient
                  colors={gradients.golden}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.generateButtonGradient}
                >
                  <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.generateButtonLabel}>Genera Report C1</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Seleziona un Evento</Text>
              <Text style={styles.emptyText}>
                Scegli un evento per visualizzare o generare il report C1
              </Text>
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
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  selectorCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  selectorLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.mutedForeground,
    marginBottom: spacing.sm,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
  },
  selectorValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
    flex: 1,
  },
  eventPickerList: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    paddingTop: spacing.sm,
  },
  eventPickerItem: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  eventPickerItemSelected: {
    backgroundColor: `${staticColors.primary}15`,
  },
  eventPickerItemText: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  eventPickerItemTextSelected: {
    fontWeight: '600',
    color: staticColors.primary,
  },
  eventPickerItemDate: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  dateSelectorRow: {
    marginTop: spacing.md,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
  },
  dateButtonText: {
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: staticColors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  statusLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  sectionContent: {
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  sectionValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  currencyValue: {
    color: staticColors.success,
  },
  refundValue: {
    color: staticColors.destructive,
  },
  divider: {
    height: 1,
    backgroundColor: staticColors.border,
  },
  actionsSection: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  actionButtonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  actionButtonGradientLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  generateButton: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  generateButtonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default GestoreSIAEReportC1Screen;
