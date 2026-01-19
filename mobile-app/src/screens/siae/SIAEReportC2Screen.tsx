import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface C2ReportData {
  month: number;
  year: number;
  venueCode: string;
  totalEvents: number;
  totalTickets: number;
  totalRevenue: number;
  eventsSummary: {
    date: string;
    eventName: string;
    tickets: number;
    revenue: number;
  }[];
  status: 'pending' | 'generated' | 'transmitted' | 'error';
  generatedAt: string | null;
  transmittedAt: string | null;
}

export function SIAEReportC2Screen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<C2ReportData | null>(null);

  const loadReport = async () => {
    try {
      const response = await api.get<any>(`/api/siae/reports/c2?month=${selectedMonth + 1}&year=${selectedYear}`);
      setReportData(response.report || null);
    } catch (error) {
      console.error('Error loading C2 report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedMonth, selectedYear]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post('/api/siae/reports/c2/generate', { 
        month: selectedMonth + 1, 
        year: selectedYear 
      });
      Alert.alert('Successo', 'Report C2 generato correttamente');
      loadReport();
    } catch (error) {
      Alert.alert('Errore', 'Impossibile generare il report');
    } finally {
      setGenerating(false);
    }
  };

  const handleTransmit = async () => {
    if (!reportData) return;
    
    Alert.alert(
      'Conferma Trasmissione',
      'Vuoi trasmettere il Report C2 (Mensile) alla SIAE?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Trasmetti',
          onPress: async () => {
            setTransmitting(true);
            try {
              await api.post('/api/siae/reports/c2/transmit', { 
                month: selectedMonth + 1, 
                year: selectedYear 
              });
              Alert.alert('Successo', 'Report trasmesso correttamente');
              loadReport();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile trasmettere il report');
            } finally {
              setTransmitting(false);
            }
          },
        },
      ]
    );
  };

  const changeMonth = (direction: number) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    
    const today = new Date();
    const selectedDate = new Date(newYear, newMonth);
    
    if (selectedDate <= today) {
      setSelectedMonth(newMonth);
      setSelectedYear(newYear);
      setLoading(true);
    }
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

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
      month: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'generated':
        return colors.teal;
      case 'transmitted':
        return colors.success;
      case 'error':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'In Attesa';
      case 'generated':
        return 'Generato';
      case 'transmitted':
        return 'Trasmesso';
      case 'error':
        return 'Errore';
      default:
        return status;
    }
  };

  const isCurrentOrFutureMonth = () => {
    const today = new Date();
    return selectedYear > today.getFullYear() || 
      (selectedYear === today.getFullYear() && selectedMonth >= today.getMonth());
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Report C2 - Mensile" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Report C2 - Mensile" showBack onBack={() => navigation.goBack()} />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          (isTablet || isLandscape) && styles.scrollContentWide
        ]}
        showsVerticalScrollIndicator={false}
        testID="report-c2-scroll"
      >
        <View style={[
          styles.mainContent,
          (isTablet || isLandscape) && styles.mainContentWide
        ]}>
          <View style={styles.monthSelector}>
            <TouchableOpacity
              onPress={() => changeMonth(-1)}
              style={styles.monthButton}
              testID="button-prev-month"
            >
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <View style={styles.monthDisplay}>
              <Text style={styles.monthText}>{monthNames[selectedMonth]} {selectedYear}</Text>
            </View>
            <TouchableOpacity
              onPress={() => changeMonth(1)}
              style={[styles.monthButton, isCurrentOrFutureMonth() && styles.monthButtonDisabled]}
              disabled={isCurrentOrFutureMonth()}
              testID="button-next-month"
            >
              <Ionicons 
                name="chevron-forward" 
                size={24} 
                color={isCurrentOrFutureMonth() ? colors.mutedForeground : colors.foreground} 
              />
            </TouchableOpacity>
          </View>

          <Card variant="glass" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: `${colors.teal}20` }]}>
                <Ionicons name="calendar-outline" size={24} color={colors.teal} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Report C2 - RPM</Text>
                <Text style={styles.infoDescription}>
                  Report Periodo Mensile - riepilogo mensile eventi e vendite
                </Text>
              </View>
            </View>
          </Card>

          {reportData ? (
            <View style={[
              styles.reportContent,
              (isTablet || isLandscape) && styles.reportContentWide
            ]}>
              <View style={[
                styles.reportColumn,
                (isTablet || isLandscape) && styles.reportColumnHalf
              ]}>
                <Card variant="glass" style={styles.statusCard}>
                  <View style={styles.statusHeader}>
                    <Text style={styles.statusTitle}>Stato Report</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(reportData.status)}20` }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(reportData.status) }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(reportData.status) }]}>
                        {getStatusLabel(reportData.status)}
                      </Text>
                    </View>
                  </View>
                  
                  {reportData.generatedAt && (
                    <Text style={styles.statusTime}>
                      Generato: {new Date(reportData.generatedAt).toLocaleString('it-IT')}
                    </Text>
                  )}
                  {reportData.transmittedAt && (
                    <Text style={styles.statusTime}>
                      Trasmesso: {new Date(reportData.transmittedAt).toLocaleString('it-IT')}
                    </Text>
                  )}
                </Card>

                <View style={[
                  styles.statsGrid,
                  (isTablet || isLandscape) && styles.statsGridWide
                ]}>
                  <Card variant="glass" style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: `${colors.primary}20` }]}>
                      <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.statValue}>{reportData.totalEvents}</Text>
                    <Text style={styles.statLabel}>Eventi</Text>
                  </Card>
                  <Card variant="glass" style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: `${colors.teal}20` }]}>
                      <Ionicons name="ticket-outline" size={24} color={colors.teal} />
                    </View>
                    <Text style={styles.statValue}>{reportData.totalTickets}</Text>
                    <Text style={styles.statLabel}>Biglietti</Text>
                  </Card>
                </View>

                <Card variant="glass" style={styles.revenueCard}>
                  <Text style={styles.revenueLabel}>Incasso Totale Mensile</Text>
                  <Text style={styles.revenueValue}>{formatCurrency(reportData.totalRevenue)}</Text>
                </Card>
              </View>

              <View style={[
                styles.reportColumn,
                (isTablet || isLandscape) && styles.reportColumnHalf
              ]}>
                {reportData.eventsSummary.length > 0 && (
                  <Card variant="glass" style={styles.eventsCard}>
                    <Text style={styles.eventsTitle}>Dettaglio Eventi</Text>
                    
                    {reportData.eventsSummary.map((event, index) => (
                      <View key={index} style={styles.eventRow}>
                        <View style={styles.eventDate}>
                          <Text style={styles.eventDateText}>{formatDate(event.date)}</Text>
                        </View>
                        <View style={styles.eventInfo}>
                          <Text style={styles.eventName} numberOfLines={1}>{event.eventName}</Text>
                          <Text style={styles.eventTickets}>{event.tickets} biglietti</Text>
                        </View>
                        <Text style={styles.eventRevenue}>{formatCurrency(event.revenue)}</Text>
                      </View>
                    ))}
                  </Card>
                )}

                <View style={styles.actionsSection}>
                  {reportData.status === 'pending' && (
                    <Button
                      onPress={handleGenerate}
                      disabled={generating}
                      style={styles.generateButton}
                      testID="button-generate"
                    >
                      {generating ? (
                        <ActivityIndicator size="small" color={colors.primaryForeground} />
                      ) : (
                        <>
                          <Ionicons name="document-outline" size={20} color={colors.primaryForeground} />
                          <Text style={styles.buttonText}>Genera Report</Text>
                        </>
                      )}
                    </Button>
                  )}
                  
                  {reportData.status === 'generated' && (
                    <Button
                      onPress={handleTransmit}
                      disabled={transmitting}
                      style={styles.transmitButton}
                      testID="button-transmit"
                    >
                      {transmitting ? (
                        <ActivityIndicator size="small" color={colors.successForeground} />
                      ) : (
                        <>
                          <Ionicons name="send-outline" size={20} color={colors.successForeground} />
                          <Text style={[styles.buttonText, { color: colors.successForeground }]}>
                            Trasmetti a SIAE
                          </Text>
                        </>
                      )}
                    </Button>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="calendar-outline" size={64} color={colors.mutedForeground} />
              <Text style={styles.noDataText}>Nessun dato disponibile</Text>
              <Text style={styles.noDataSubtext}>
                Non ci sono eventi o vendite per questo mese
              </Text>
            </View>
          )}
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  scrollContentWide: {
    paddingHorizontal: spacing.xl,
  },
  mainContent: {
    flex: 1,
  },
  mainContentWide: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthButtonDisabled: {
    opacity: 0.5,
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  infoDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  reportContent: {
    gap: spacing.lg,
  },
  reportContentWide: {
    flexDirection: 'row',
  },
  reportColumn: {
    flex: 1,
  },
  reportColumnHalf: {
    flex: 1,
  },
  statusCard: {
    marginBottom: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  statusTime: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statsGridWide: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  revenueCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  revenueLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  revenueValue: {
    color: colors.primary,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
  },
  eventsCard: {
    marginBottom: spacing.lg,
  },
  eventsTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.lg,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventDate: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  eventDateText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  eventTickets: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  eventRevenue: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  actionsSection: {
    gap: spacing.md,
  },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  transmitButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  noDataText: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  noDataSubtext: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});

export default SIAEReportC2Screen;
