import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Loading, SkeletonList } from '@/components/Loading';
import { SafeArea } from '@/components/SafeArea';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

interface SalesReportData {
  period: { from: string; to: string };
  summary: {
    ticketsSoldTotal: number;
    ticketsSoldOnline: number;
    ticketsSoldPrinted: number;
    ticketsSoldPr: number;
    grossRevenueTotal: number;
    commissionOnline: number;
    commissionPrinted: number;
    commissionPr: number;
    commissionTotal: number;
    netToOrganizer: number;
    walletDebt: number;
    invoicesIssued: number;
    invoicesPaid: number;
  };
  byEvent: Array<{
    eventId: string;
    eventName: string;
    eventDate: string;
    ticketsSold: number;
    grossRevenue: number;
    commissions: number;
    netRevenue: number;
  }>;
  byChannel: Array<{
    channel: 'online' | 'printed' | 'pr';
    ticketsSold: number;
    grossRevenue: number;
    commissions: number;
  }>;
}

interface AdminBillingReportsScreenProps {
  onBack: () => void;
}

export function AdminBillingReportsScreen({ onBack }: AdminBillingReportsScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });

  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadReport();
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

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<SalesReportData>(
        `/api/admin/billing/reports/sales?from=${dateFrom}&to=${dateTo}`
      );
      setReportData(data);
    } catch (error) {
      console.error('Error loading report:', error);
      Alert.alert('Errore', 'Impossibile caricare il report');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  const handleExportCSV = async () => {
    try {
      triggerHaptic('light');
      const csvUrl = `/api/admin/billing/reports/sales?from=${dateFrom}&to=${dateTo}&format=csv`;
      
      try {
        await Share.share({
          url: csvUrl,
          title: 'Esporta Report Fatturazione',
          message: 'Report fatturazione bilancio',
        });
      } catch (error) {
        Alert.alert('Condivisione', 'Link al report CSV copiato');
      }
    } catch (error) {
      Alert.alert('Errore', 'Impossibile esportare il report');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'online':
        return 'Online';
      case 'printed':
        return 'Stampato';
      case 'pr':
        return 'PR';
      default:
        return channel;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'online':
        return 'globe-outline';
      case 'printed':
        return 'print-outline';
      case 'pr':
        return 'megaphone-outline';
      default:
        return 'help-outline';
    }
  };

  const handleDateChange = async (newDateFrom: string, newDateTo: string) => {
    setDateFrom(newDateFrom);
    setDateTo(newDateTo);
    setIsLoading(true);
    try {
      const data = await api.get<SalesReportData>(
        `/api/admin/billing/reports/sales?from=${newDateFrom}&to=${newDateTo}`
      );
      setReportData(data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    triggerHaptic('light');
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    const newFrom = date.toISOString().split('T')[0];
    const newTo = new Date().toISOString().split('T')[0];
    handleDateChange(newFrom, newTo);
  };

  if (showLoader) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          title="Report Fatturazione"
          showBack
          onBack={onBack}
          testID="header-billing-reports"
        />
        <View style={styles.loaderContainer}>
          <Loading text="Caricamento report..." />
        </View>
      </View>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Report Fatturazione"
        showBack
        onBack={onBack}
        testID="header-billing-reports"
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
        <Card style={styles.filterCard} testID="card-filters">
          <View style={styles.filterHeader}>
            <Text style={[styles.filterTitle, { color: colors.foreground }]}>Filtri</Text>
            <Pressable onPress={resetFilters} testID="button-reset-filters">
              <Text style={[styles.resetButton, { color: colors.primary }]}>Ripristina</Text>
            </Pressable>
          </View>

          <View style={styles.dateInputsContainer}>
            <View style={styles.dateInputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Da</Text>
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
                value={dateFrom}
                onChangeText={(text) => {
                  setDateFrom(text);
                }}
                testID="input-date-from"
              />
            </View>

            <View style={styles.dateInputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>A</Text>
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.mutedForeground}
                value={dateTo}
                onChangeText={(text) => {
                  setDateTo(text);
                }}
                testID="input-date-to"
              />
            </View>
          </View>

          <Button
            variant="secondary"
            size="sm"
            onPress={() => handleDateChange(dateFrom, dateTo)}
            testID="button-apply-filters"
          >
            <Ionicons name="search" size={16} color={colors.secondaryForeground} />
            <Text style={{ color: colors.secondaryForeground, fontWeight: '600' }}>Cerca</Text>
          </Button>
        </Card>

        {isLoading || !reportData ? (
          <SkeletonList count={4} />
        ) : (
          <>
            <View style={styles.actionBar}>
              <Button
                variant="default"
                size="sm"
                onPress={handleExportCSV}
                testID="button-export-csv"
              >
                <Ionicons
                  name="download"
                  size={16}
                  color={colors.primaryForeground}
                />
                <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>
                  Esporta CSV
                </Text>
              </Button>
            </View>

            <View style={styles.summaryGrid}>
              <Card style={styles.summaryCard} testID="card-summary-tickets">
                <View style={styles.summaryIconContainer}>
                  <Ionicons
                    name="ticket-outline"
                    size={24}
                    color={staticColors.golden}
                  />
                </View>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  Biglietti venduti
                </Text>
                <Text
                  style={[styles.summaryValue, { color: colors.foreground }]}
                  testID="text-tickets-total"
                >
                  {reportData.summary.ticketsSoldTotal}
                </Text>
              </Card>

              <Card style={styles.summaryCard} testID="card-summary-gross">
                <View style={styles.summaryIconContainer}>
                  <Ionicons
                    name="cash-outline"
                    color={staticColors.success}
                    size={24}
                  />
                </View>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  Ricavato lordo
                </Text>
                <Text
                  style={[styles.summaryValue, { color: colors.foreground }]}
                  testID="text-gross-revenue"
                >
                  {formatCurrency(reportData.summary.grossRevenueTotal)}
                </Text>
              </Card>

              <Card style={styles.summaryCard} testID="card-summary-commissions">
                <View style={styles.summaryIconContainer}>
                  <Ionicons
                    name="percent-outline"
                    color={staticColors.primary}
                    size={24}
                  />
                </View>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  Commissioni
                </Text>
                <Text
                  style={[styles.summaryValue, { color: colors.foreground }]}
                  testID="text-commissions-total"
                >
                  {formatCurrency(reportData.summary.commissionTotal)}
                </Text>
              </Card>

              <Card style={styles.summaryCard} testID="card-summary-net">
                <View style={styles.summaryIconContainer}>
                  <Ionicons
                    name="wallet-outline"
                    color={staticColors.teal}
                    size={24}
                  />
                </View>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  Netto organizzatore
                </Text>
                <Text
                  style={[styles.summaryValue, { color: colors.foreground }]}
                  testID="text-net-organizer"
                >
                  {formatCurrency(reportData.summary.netToOrganizer)}
                </Text>
              </Card>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Analisi per canale
              </Text>
              <View style={styles.channelsContainer}>
                {reportData.byChannel.map((channel) => (
                  <Card
                    key={channel.channel}
                    style={styles.channelCard}
                    testID={`card-channel-${channel.channel}`}
                  >
                    <View style={styles.channelHeader}>
                      <View style={styles.channelIconLabel}>
                        <View
                          style={[
                            styles.channelIconWrapper,
                            {
                              backgroundColor:
                                channel.channel === 'online'
                                  ? `${staticColors.primary}20`
                                  : channel.channel === 'printed'
                                    ? `${staticColors.success}20`
                                    : `${staticColors.teal}20`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={getChannelIcon(channel.channel) as any}
                            size={18}
                            color={
                              channel.channel === 'online'
                                ? staticColors.primary
                                : channel.channel === 'printed'
                                  ? staticColors.success
                                  : staticColors.teal
                            }
                          />
                        </View>
                        <Text style={[styles.channelName, { color: colors.foreground }]}>
                          {getChannelLabel(channel.channel)}
                        </Text>
                      </View>
                      <Badge variant="secondary" size="sm">
                        {channel.ticketsSold}
                      </Badge>
                    </View>

                    <View style={styles.channelStats}>
                      <View style={styles.channelStat}>
                        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                          Ricavato
                        </Text>
                        <Text
                          style={[styles.statValue, { color: colors.foreground }]}
                          testID={`text-${channel.channel}-revenue`}
                        >
                          {formatCurrency(channel.grossRevenue)}
                        </Text>
                      </View>
                      <View style={styles.channelStat}>
                        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                          Commissioni
                        </Text>
                        <Text
                          style={[styles.statValue, { color: colors.foreground }]}
                          testID={`text-${channel.channel}-commission`}
                        >
                          {formatCurrency(channel.commissions)}
                        </Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            </View>

            {reportData.byEvent.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Analisi per evento
                </Text>
                <View style={styles.eventsContainer}>
                  {reportData.byEvent.map((event) => (
                    <Card
                      key={event.eventId}
                      style={styles.eventCard}
                      testID={`card-event-${event.eventId}`}
                    >
                      <View style={styles.eventHeader}>
                        <View style={styles.eventInfo}>
                          <Text
                            style={[styles.eventName, { color: colors.foreground }]}
                            numberOfLines={2}
                          >
                            {event.eventName}
                          </Text>
                          <View style={styles.eventMeta}>
                            <Ionicons
                              name="calendar-outline"
                              size={14}
                              color={colors.mutedForeground}
                            />
                            <Text style={[styles.eventDate, { color: colors.mutedForeground }]}>
                              {new Date(event.eventDate).toLocaleDateString('it-IT')}
                            </Text>
                          </View>
                        </View>
                        <Badge variant="default" size="sm">
                          {event.ticketsSold}
                        </Badge>
                      </View>

                      <View style={styles.eventStats}>
                        <View style={styles.eventStat}>
                          <Text style={[styles.eventStatLabel, { color: colors.mutedForeground }]}>
                            Ricavato
                          </Text>
                          <Text
                            style={[styles.eventStatValue, { color: colors.foreground }]}
                            testID={`text-event-${event.eventId}-revenue`}
                          >
                            {formatCurrency(event.grossRevenue)}
                          </Text>
                        </View>
                        <View style={styles.eventStat}>
                          <Text style={[styles.eventStatLabel, { color: colors.mutedForeground }]}>
                            Commissioni
                          </Text>
                          <Text
                            style={[styles.eventStatValue, { color: colors.foreground }]}
                            testID={`text-event-${event.eventId}-commission`}
                          >
                            {formatCurrency(event.commissions)}
                          </Text>
                        </View>
                        <View style={styles.eventStat}>
                          <Text style={[styles.eventStatLabel, { color: colors.mutedForeground }]}>
                            Netto
                          </Text>
                          <Text
                            style={[styles.eventStatValue, { color: colors.foreground }]}
                            testID={`text-event-${event.eventId}-net`}
                          >
                            {formatCurrency(event.netRevenue)}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.bottomSpacing} />
          </>
        )}
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterCard: {
    marginBottom: spacing.lg,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filterTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  resetButton: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  dateInputsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dateInputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  actionBar: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    width: '48%',
    alignItems: 'center',
    padding: spacing.md,
  },
  summaryIconContainer: {
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  channelsContainer: {
    gap: spacing.md,
  },
  channelCard: {
    marginBottom: spacing.md,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  channelIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  channelIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  channelStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  channelStat: {
    flex: 1,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  eventsContainer: {
    gap: spacing.md,
  },
  eventCard: {
    marginBottom: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventDate: {
    fontSize: typography.fontSize.xs,
  },
  eventStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  eventStat: {
    flex: 1,
  },
  eventStatLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },
  eventStatValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: spacing.xl,
  },
});

export default AdminBillingReportsScreen;
