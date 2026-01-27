import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAEReport, SIAEReportStatus } from '@/lib/api';

type TabType = 'rca' | 'rmg' | 'rpm';

interface GestoreSIAEReportsScreenProps {
  onBack: () => void;
}

export function GestoreSIAEReportsScreen({ onBack }: GestoreSIAEReportsScreenProps) {
  const { colors } = useTheme();
  const [reports, setReports] = useState<SIAEReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('rca');

  useEffect(() => {
    loadReports();
  }, [activeTab]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAEReports(activeTab);
      setReports(data);
    } catch (error) {
      console.error('Error loading SIAE reports:', error);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const getStatusBadge = (status: SIAEReportStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'sent':
        return <Badge variant="default">Inviato</Badge>;
      case 'approved':
        return <Badge variant="success">Approvato</Badge>;
      case 'error':
        return <Badge variant="destructive">Errore</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return months[month - 1] || '-';
  };

  const renderRCAReport = ({ item }: { item: SIAEReport }) => (
    <Card style={styles.reportCard} testID={`rca-report-${item.id}`}>
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle} numberOfLines={1}>{item.eventName || 'Evento'}</Text>
          <View style={styles.reportMeta}>
            <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.reportMetaText}>{formatDate(item.date || null)}</Text>
          </View>
        </View>
        {getStatusBadge(item.status)}
      </View>

      <View style={styles.reportDivider} />

      <View style={styles.reportDetails}>
        <View style={styles.reportDetail}>
          <Text style={styles.detailLabel}>Trasmissione</Text>
          <Text style={styles.detailValue}>{formatDate(item.transmissionDate)}</Text>
        </View>
        <View style={styles.reportDetail}>
          <Text style={styles.detailLabel}>Risposta</Text>
          <Text style={styles.detailValue}>{formatDate(item.responseDate)}</Text>
        </View>
        <View style={styles.reportDetail}>
          <Text style={styles.detailLabel}>Protocollo</Text>
          <Text style={styles.detailValue}>{item.protocolNumber || '-'}</Text>
        </View>
      </View>

      {item.errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={16} color={staticColors.destructive} />
          <Text style={styles.errorText} numberOfLines={2}>{item.errorMessage}</Text>
        </View>
      )}
    </Card>
  );

  const renderRMGReport = ({ item }: { item: SIAEReport }) => (
    <Card style={styles.reportCard} testID={`rmg-report-${item.id}`}>
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>Report Giornaliero</Text>
          <View style={styles.reportMeta}>
            <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.reportMetaText}>{formatDate(item.date || null)}</Text>
          </View>
        </View>
        {getStatusBadge(item.status)}
      </View>

      <View style={styles.reportDivider} />

      <View style={styles.reportDetails}>
        <View style={styles.reportDetail}>
          <Text style={styles.detailLabel}>Eventi</Text>
          <Text style={styles.detailValue}>{item.eventsCount ?? '-'}</Text>
        </View>
        <View style={styles.reportDetail}>
          <Text style={styles.detailLabel}>Biglietti</Text>
          <Text style={styles.detailValue}>{item.totalTickets ?? '-'}</Text>
        </View>
        <View style={styles.reportDetail}>
          <Text style={styles.detailLabel}>Trasmesso</Text>
          <Text style={styles.detailValue}>{formatDate(item.transmissionDate)}</Text>
        </View>
      </View>

      {item.errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={16} color={staticColors.destructive} />
          <Text style={styles.errorText} numberOfLines={2}>{item.errorMessage}</Text>
        </View>
      )}
    </Card>
  );

  const renderRPMReport = ({ item }: { item: SIAEReport }) => (
    <Card style={styles.reportCard} testID={`rpm-report-${item.id}`}>
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>
            {item.month ? getMonthName(item.month) : 'Report Mensile'} {item.year || ''}
          </Text>
          <View style={styles.reportMeta}>
            <Ionicons name="stats-chart-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.reportMetaText}>Riepilogo mensile</Text>
          </View>
        </View>
        {getStatusBadge(item.status)}
      </View>

      <View style={styles.reportDivider} />

      <View style={styles.reportDetails}>
        <View style={styles.reportDetail}>
          <Text style={styles.detailLabel}>Biglietti Totali</Text>
          <Text style={styles.detailValue}>{item.totalTickets?.toLocaleString('it-IT') ?? '-'}</Text>
        </View>
        <View style={styles.reportDetail}>
          <Text style={styles.detailLabel}>Incasso Totale</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.totalRevenue)}</Text>
        </View>
        <View style={styles.reportDetail}>
          <Text style={styles.detailLabel}>Trasmesso</Text>
          <Text style={styles.detailValue}>{formatDate(item.transmissionDate)}</Text>
        </View>
      </View>

      {item.protocolNumber && (
        <View style={styles.protocolBanner}>
          <Ionicons name="checkmark-circle" size={16} color={staticColors.success} />
          <Text style={styles.protocolText}>Protocollo: {item.protocolNumber}</Text>
        </View>
      )}

      {item.errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={16} color={staticColors.destructive} />
          <Text style={styles.errorText} numberOfLines={2}>{item.errorMessage}</Text>
        </View>
      )}
    </Card>
  );

  const renderReport = ({ item }: { item: SIAEReport }) => {
    switch (activeTab) {
      case 'rca':
        return renderRCAReport({ item });
      case 'rmg':
        return renderRMGReport({ item });
      case 'rpm':
        return renderRPMReport({ item });
      default:
        return renderRCAReport({ item });
    }
  };

  const tabs: { id: TabType; label: string; description: string }[] = [
    { id: 'rca', label: 'RCA', description: 'Per evento' },
    { id: 'rmg', label: 'RMG', description: 'Giornaliero' },
    { id: 'rpm', label: 'RPM', description: 'Mensile' },
  ];

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-reports"
      />

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Report SIAE</Text>
        <Text style={styles.subtitle}>{reports.length} report</Text>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab(tab.id);
            }}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive,
            ]}
            testID={`tab-${tab.id}`}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
            <Text
              style={[
                styles.tabDescription,
                activeTab === tab.id && styles.tabDescriptionActive,
              ]}
            >
              {tab.description}
            </Text>
          </Pressable>
        ))}
      </View>

      {showLoader ? (
        <Loading text="Caricamento report..." />
      ) : reports.length > 0 ? (
        <FlatList
          data={reports}
          renderItem={renderReport}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessun report trovato</Text>
          <Text style={styles.emptyText}>
            Non ci sono report {activeTab.toUpperCase()} disponibili
          </Text>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: staticColors.primary,
  },
  tabLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.mutedForeground,
  },
  tabLabelActive: {
    color: staticColors.primaryForeground,
  },
  tabDescription: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  tabDescriptionActive: {
    color: `${staticColors.primaryForeground}CC`,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  reportCard: {
    padding: spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reportInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  reportTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  reportMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  reportDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  reportDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportDetail: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: `${staticColors.destructive}10`,
    borderRadius: borderRadius.md,
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.destructive,
  },
  protocolBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: `${staticColors.success}10`,
    borderRadius: borderRadius.md,
  },
  protocolText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.success,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default GestoreSIAEReportsScreen;
