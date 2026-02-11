import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Dimensions } from 'react-native';
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
import api, { SIAEC2Report } from '@/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PeriodType = 'weekly' | 'monthly';

interface GestoreSIAEReportC2ScreenProps {
  onBack: () => void;
}

export function GestoreSIAEReportC2Screen({ onBack }: GestoreSIAEReportC2ScreenProps) {
  const { colors, gradients } = useTheme();
  const [report, setReport] = useState<SIAEC2Report | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingXML, setIsExportingXML] = useState(false);

  useEffect(() => {
    loadReport();
  }, [periodType]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAEC2Report(periodType);
      setReport(data);
    } catch (error) {
      console.error('Error loading C2 report:', error);
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

  const handleValidate = async () => {
    if (!report) return;
    try {
      setIsValidating(true);
      triggerHaptic('medium');
      await api.validateSIAEC2Report(report.id);
      await loadReport();
    } catch (error) {
      console.error('Error validating C2 report:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!report) return;
    try {
      setIsExportingPDF(true);
      triggerHaptic('light');
      await api.exportSIAEC2ReportPDF(report.id);
    } catch (error) {
      console.error('Error exporting C2 report PDF:', error);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportXML = async () => {
    if (!report) return;
    try {
      setIsExportingXML(true);
      triggerHaptic('light');
      await api.exportSIAEC2ReportXML(report.id);
    } catch (error) {
      console.error('Error exporting C2 report XML:', error);
    } finally {
      setIsExportingXML(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getValidationStatusBadge = (status: 'valid' | 'invalid' | 'pending') => {
    switch (status) {
      case 'valid':
        return <Badge variant="success">Valido</Badge>;
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'invalid':
        return <Badge variant="destructive">Non valido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMaxRevenue = () => {
    if (!report?.revenueByDay || report.revenueByDay.length === 0) return 1;
    return Math.max(...report.revenueByDay.map(d => d.amount));
  };

  const renderRevenueChart = () => {
    if (!report?.revenueByDay || report.revenueByDay.length === 0) return null;

    const maxRevenue = getMaxRevenue();
    const chartHeight = 150;
    const barWidth = Math.min(32, (SCREEN_WIDTH - spacing.lg * 4) / report.revenueByDay.length - 8);

    return (
      <Card style={styles.chartCard} testID="card-revenue-chart">
        <Text style={styles.chartTitle}>Trend Incassi</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartBars}>
            {report.revenueByDay.map((day, index) => {
              const barHeight = maxRevenue > 0 ? (day.amount / maxRevenue) * chartHeight : 0;
              return (
                <View key={day.date} style={styles.chartBarWrapper}>
                  <View style={[styles.chartBar, { height: chartHeight }]}>
                    <LinearGradient
                      colors={gradients.golden}
                      start={{ x: 0, y: 1 }}
                      end={{ x: 0, y: 0 }}
                      style={[
                        styles.chartBarFill,
                        { height: barHeight, width: barWidth },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartBarLabel}>{formatShortDate(day.date)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </Card>
    );
  };

  const renderTicketsChart = () => {
    if (!report?.ticketsByCategory || report.ticketsByCategory.length === 0) return null;

    const totalCount = report.ticketsByCategory.reduce((sum, cat) => sum + cat.count, 0);
    const categoryColors = [staticColors.primary, staticColors.teal, staticColors.purple, staticColors.pink, staticColors.warning];

    return (
      <Card style={styles.chartCard} testID="card-tickets-chart">
        <Text style={styles.chartTitle}>Biglietti per Categoria</Text>
        <View style={styles.ticketsChartContainer}>
          {report.ticketsByCategory.map((cat, index) => {
            const percentage = totalCount > 0 ? (cat.count / totalCount) * 100 : 0;
            const color = categoryColors[index % categoryColors.length];
            return (
              <View key={cat.category} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.categoryDot, { backgroundColor: color }]} />
                  <Text style={styles.categoryName} numberOfLines={1}>{cat.category}</Text>
                </View>
                <View style={styles.categoryBarContainer}>
                  <View style={styles.categoryBarBg}>
                    <View
                      style={[styles.categoryBarFill, { width: `${percentage}%`, backgroundColor: color }]}
                    />
                  </View>
                  <Text style={styles.categoryCount}>{cat.count}</Text>
                </View>
                <Text style={styles.categoryRevenue}>{formatCurrency(cat.revenue)}</Text>
              </View>
            );
          })}
        </View>
      </Card>
    );
  };

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-report-c2"
      />

      {showLoader ? (
        <Loading text="Caricamento Report C2..." />
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
            <Text style={styles.title}>Report C2</Text>
            <Text style={styles.subtitle}>Riepilogo Periodico Fiscale</Text>
          </View>

          <View style={styles.periodTabs}>
            <Pressable
              style={[styles.periodTab, periodType === 'weekly' && styles.periodTabActive]}
              onPress={() => {
                triggerHaptic('selection');
                setPeriodType('weekly');
              }}
              testID="tab-weekly"
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={periodType === 'weekly' ? staticColors.primaryForeground : staticColors.mutedForeground}
              />
              <Text
                style={[
                  styles.periodTabText,
                  periodType === 'weekly' && styles.periodTabTextActive,
                ]}
              >
                Settimana
              </Text>
            </Pressable>
            <Pressable
              style={[styles.periodTab, periodType === 'monthly' && styles.periodTabActive]}
              onPress={() => {
                triggerHaptic('selection');
                setPeriodType('monthly');
              }}
              testID="tab-monthly"
            >
              <Ionicons
                name="calendar"
                size={18}
                color={periodType === 'monthly' ? staticColors.primaryForeground : staticColors.mutedForeground}
              />
              <Text
                style={[
                  styles.periodTabText,
                  periodType === 'monthly' && styles.periodTabTextActive,
                ]}
              >
                Mese
              </Text>
            </Pressable>
          </View>

          {report ? (
            <>
              <Card style={styles.dateRangeCard} testID="card-date-range">
                <View style={styles.dateRangeRow}>
                  <View style={styles.dateRangeItem}>
                    <Text style={styles.dateRangeLabel}>Periodo</Text>
                    <Text style={styles.dateRangeValue}>
                      {formatDate(report.startDate)} - {formatDate(report.endDate)}
                    </Text>
                  </View>
                  <View style={styles.validationStatus}>
                    <Text style={styles.validationLabel}>Stato</Text>
                    {getValidationStatusBadge(report.validationStatus)}
                  </View>
                </View>
              </Card>

              {report.validationStatus === 'invalid' && report.validationErrors && (
                <Card style={styles.errorsCard} testID="card-validation-errors">
                  <View style={styles.errorsHeader}>
                    <Ionicons name="warning" size={20} color={staticColors.destructive} />
                    <Text style={styles.errorsTitle}>Errori di Validazione</Text>
                  </View>
                  {report.validationErrors.map((error, index) => (
                    <View key={index} style={styles.errorItem}>
                      <View style={styles.errorDot} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ))}
                </Card>
              )}

              <View style={styles.statsGrid}>
                <Card style={styles.statCard} testID="stat-events">
                  <Ionicons name="calendar" size={24} color={staticColors.primary} />
                  <Text style={styles.statValue}>{report.totalEvents}</Text>
                  <Text style={styles.statLabel}>Eventi</Text>
                </Card>
                <Card style={styles.statCard} testID="stat-tickets">
                  <Ionicons name="ticket" size={24} color={staticColors.teal} />
                  <Text style={styles.statValue}>{report.totalTickets.toLocaleString('it-IT')}</Text>
                  <Text style={styles.statLabel}>Biglietti</Text>
                </Card>
                <Card style={styles.statCard} testID="stat-revenue">
                  <Ionicons name="cash" size={24} color={staticColors.success} />
                  <Text style={styles.statValue}>{formatCurrency(report.totalRevenue)}</Text>
                  <Text style={styles.statLabel}>Incasso Totale</Text>
                </Card>
                <Card style={styles.statCard} testID="stat-refunds">
                  <Ionicons name="return-down-back" size={24} color={staticColors.destructive} />
                  <Text style={styles.statValue}>{formatCurrency(report.totalRefunds)}</Text>
                  <Text style={styles.statLabel}>Rimborsi</Text>
                </Card>
              </View>

              {renderRevenueChart()}
              {renderTicketsChart()}

              <View style={styles.actionsSection}>
                <Pressable
                  style={[styles.validateButton, isValidating && styles.buttonDisabled]}
                  onPress={handleValidate}
                  disabled={isValidating}
                  testID="button-validate"
                >
                  <LinearGradient
                    colors={gradients.teal}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.buttonLabel}>
                      {isValidating ? 'Validazione...' : 'Valida'}
                    </Text>
                  </LinearGradient>
                </Pressable>

                <View style={styles.exportButtons}>
                  <Pressable
                    style={[styles.exportButton, isExportingPDF && styles.buttonDisabled]}
                    onPress={handleExportPDF}
                    disabled={isExportingPDF}
                    testID="button-export-pdf"
                  >
                    <LinearGradient
                      colors={gradients.golden}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonGradient}
                    >
                      <Ionicons name="document-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.buttonLabel}>
                        {isExportingPDF ? 'Esporto...' : 'Esporta PDF'}
                      </Text>
                    </LinearGradient>
                  </Pressable>

                  <Pressable
                    style={[styles.exportButton, isExportingXML && styles.buttonDisabled]}
                    onPress={handleExportXML}
                    disabled={isExportingXML}
                    testID="button-export-xml"
                  >
                    <View style={styles.xmlButton}>
                      <Ionicons name="code-slash-outline" size={20} color={staticColors.foreground} />
                      <Text style={styles.xmlButtonLabel}>
                        {isExportingXML ? 'Esporto...' : 'Esporta XML'}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={64} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Nessun Report Disponibile</Text>
              <Text style={styles.emptyText}>
                Non ci sono dati sufficienti per generare un report C2 per questo periodo
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
  periodTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  periodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
  },
  periodTabActive: {
    backgroundColor: staticColors.primary,
  },
  periodTabText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.mutedForeground,
  },
  periodTabTextActive: {
    color: staticColors.primaryForeground,
  },
  dateRangeCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dateRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRangeItem: {
    flex: 1,
  },
  dateRangeLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: spacing.xs,
  },
  dateRangeValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  validationStatus: {
    alignItems: 'flex-end',
  },
  validationLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: spacing.xs,
  },
  errorsCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: `${staticColors.destructive}10`,
    borderColor: staticColors.destructive,
  },
  errorsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.destructive,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: staticColors.destructive,
    marginTop: 6,
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.destructive,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.foreground,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  chartCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  chartBarWrapper: {
    alignItems: 'center',
  },
  chartBar: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBarFill: {
    borderRadius: borderRadius.sm,
  },
  chartBarLabel: {
    fontSize: typography.fontSize.xs - 2,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  ticketsChartContainer: {
    gap: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: 100,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
    flex: 1,
  },
  categoryBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  categoryCount: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.mutedForeground,
    width: 40,
    textAlign: 'right',
  },
  categoryRevenue: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.success,
    width: 70,
    textAlign: 'right',
  },
  actionsSection: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  validateButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  buttonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exportButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  exportButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  xmlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  xmlButtonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
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
});

export default GestoreSIAEReportC2Screen;
