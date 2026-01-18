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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface C1ReportData {
  date: string;
  eventName: string;
  venueCode: string;
  totalTickets: number;
  totalRevenue: number;
  ticketsByType: {
    type: string;
    quantity: number;
    revenue: number;
  }[];
  status: 'pending' | 'generated' | 'transmitted' | 'error';
  generatedAt: string | null;
  transmittedAt: string | null;
}

export function SIAEReportC1Screen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportData, setReportData] = useState<C1ReportData | null>(null);

  const loadReport = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await api.get<any>(`/api/siae/reports/c1?date=${dateStr}`);
      setReportData(response.report || null);
    } catch (error) {
      console.error('Error loading C1 report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      await api.post('/api/siae/reports/c1/generate', { date: dateStr });
      Alert.alert('Successo', 'Report C1 generato correttamente');
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
      'Vuoi trasmettere il Report C1 (Giornaliero) alla SIAE?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Trasmetti',
          onPress: async () => {
            setTransmitting(true);
            try {
              const dateStr = selectedDate.toISOString().split('T')[0];
              await api.post('/api/siae/reports/c1/transmit', { date: dateStr });
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

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
      setLoading(true);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Report C1 - Giornaliero" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Report C1 - Giornaliero" showBack onBack={() => navigation.goBack()} />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateSelector}>
          <TouchableOpacity
            onPress={() => changeDate(-1)}
            style={styles.dateButton}
            data-testid="button-prev-date"
          >
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>{formatDate(selectedDate.toISOString())}</Text>
          </View>
          <TouchableOpacity
            onPress={() => changeDate(1)}
            style={[styles.dateButton, selectedDate >= new Date() && styles.dateButtonDisabled]}
            disabled={selectedDate >= new Date()}
            data-testid="button-next-date"
          >
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={selectedDate >= new Date() ? colors.mutedForeground : colors.foreground} 
            />
          </TouchableOpacity>
        </View>

        <Card variant="glass" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="document-text-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Report C1 - RCA</Text>
              <Text style={styles.infoDescription}>
                Riepilogo Controllo Accessi giornaliero da trasmettere alla SIAE
              </Text>
            </View>
          </View>
        </Card>

        {reportData ? (
          <>
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

            <Card variant="glass" style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Riepilogo</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Evento</Text>
                <Text style={styles.summaryValue}>{reportData.eventName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Codice Locale</Text>
                <Text style={styles.summaryValue}>{reportData.venueCode}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Biglietti Totali</Text>
                <Text style={styles.summaryValueLarge}>{reportData.totalTickets}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Incasso Totale</Text>
                <Text style={[styles.summaryValueLarge, { color: colors.primary }]}>
                  {formatCurrency(reportData.totalRevenue)}
                </Text>
              </View>
            </Card>

            <Card variant="glass" style={styles.detailCard}>
              <Text style={styles.detailTitle}>Dettaglio per Tipo</Text>
              
              {reportData.ticketsByType.map((item, index) => (
                <View key={index} style={styles.detailRow}>
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailType}>{item.type}</Text>
                    <Text style={styles.detailQuantity}>{item.quantity} biglietti</Text>
                  </View>
                  <Text style={styles.detailRevenue}>{formatCurrency(item.revenue)}</Text>
                </View>
              ))}
            </Card>

            <View style={styles.actionsSection}>
              {reportData.status === 'pending' && (
                <Button
                  onPress={handleGenerate}
                  disabled={generating}
                  style={styles.generateButton}
                  data-testid="button-generate"
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
                  data-testid="button-transmit"
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
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="document-outline" size={64} color={colors.mutedForeground} />
            <Text style={styles.noDataText}>Nessun dato disponibile</Text>
            <Text style={styles.noDataSubtext}>
              Non ci sono eventi o vendite per questa data
            </Text>
          </View>
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
    paddingHorizontal: spacing.lg,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  dateButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateButtonDisabled: {
    opacity: 0.5,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
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
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  summaryValueLarge: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  detailCard: {
    marginBottom: spacing.lg,
  },
  detailTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailInfo: {
    flex: 1,
  },
  detailType: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  detailQuantity: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  detailRevenue: {
    color: colors.primary,
    fontSize: fontSize.lg,
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

export default SIAEReportC1Screen;
