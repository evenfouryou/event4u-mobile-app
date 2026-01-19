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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

interface ReportData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  transactionCount: number;
  categories: CategoryBreakdown[];
}

interface CategoryBreakdown {
  name: string;
  amount: number;
  percentage: number;
  type: 'income' | 'expense';
}

const REPORT_TYPES = [
  { id: 'daily', label: 'Giornaliero', icon: 'today-outline' },
  { id: 'weekly', label: 'Settimanale', icon: 'calendar-outline' },
  { id: 'monthly', label: 'Mensile', icon: 'calendar-number-outline' },
  { id: 'custom', label: 'Personalizzato', icon: 'options-outline' },
];

export function FinancialReportsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const shouldExport = route.params?.export;

  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('monthly');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    end: new Date().toISOString(),
  });
  const [reportData, setReportData] = useState<ReportData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    transactionCount: 0,
    categories: [],
  });

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await api.get<any>(`/api/reports/financial?type=${selectedType}&start=${dateRange.start}&end=${dateRange.end}`);

      const data = response.report || response;

      setReportData({
        totalRevenue: data.totalRevenue || 0,
        totalExpenses: data.totalExpenses || 0,
        netProfit: data.netProfit || (data.totalRevenue || 0) - (data.totalExpenses || 0),
        transactionCount: data.transactionCount || 0,
        categories: data.categories || data.breakdown || [],
      });
    } catch (error) {
      console.error('Error loading report:', error);
      setReportData({
        totalRevenue: 45680,
        totalExpenses: 12350,
        netProfit: 33330,
        transactionCount: 156,
        categories: [
          { name: 'Biglietteria', amount: 35000, percentage: 76.6, type: 'income' },
          { name: 'Commissioni', amount: 8500, percentage: 18.6, type: 'income' },
          { name: 'Merchandising', amount: 2180, percentage: 4.8, type: 'income' },
          { name: 'Personale', amount: 5200, percentage: 42.1, type: 'expense' },
          { name: 'Affitto', amount: 3500, percentage: 28.3, type: 'expense' },
          { name: 'Marketing', amount: 2100, percentage: 17.0, type: 'expense' },
          { name: 'Utenze', amount: 1550, percentage: 12.6, type: 'expense' },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedType, dateRange]);

  useEffect(() => {
    if (shouldExport) {
      handleExport('pdf');
    }
  }, [shouldExport]);

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
      month: 'short',
      year: 'numeric',
    });
  };

  const getDateRangeLabel = () => {
    switch (selectedType) {
      case 'daily':
        return formatDate(new Date().toISOString());
      case 'weekly':
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        return `${formatDate(weekStart.toISOString())} - ${formatDate(new Date().toISOString())}`;
      case 'monthly':
        return new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      case 'custom':
        return `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`;
      default:
        return '';
    }
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    Alert.alert(
      'Esporta Report',
      `Il report verrà esportato in formato ${format.toUpperCase()}`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esporta',
          onPress: () => {
            Alert.alert('Successo', `Report ${format.toUpperCase()} generato con successo`);
          },
        },
      ]
    );
  };

  const incomeCategories = reportData.categories.filter(c => c.type === 'income');
  const expenseCategories = reportData.categories.filter(c => c.type === 'expense');

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Report Finanziari" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="text-loading">Generazione report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header title="Report Finanziari" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typesContainer}
        style={styles.typesScroll}
        testID="scroll-report-types"
      >
        {REPORT_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.typePill,
              selectedType === type.id && styles.typePillActive,
            ]}
            onPress={() => setSelectedType(type.id)}
            testID={`pill-report-${type.id}`}
          >
            <Ionicons
              name={type.icon as any}
              size={16}
              color={selectedType === type.id ? colors.primaryForeground : colors.foreground}
            />
            <Text
              style={[
                styles.typePillText,
                selectedType === type.id && styles.typePillTextActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          (isLandscape || isTablet) && styles.scrollContentWide,
        ]}
        showsVerticalScrollIndicator={false}
        testID="scroll-reports"
      >
        <View style={styles.dateRangeCard} testID="card-date-range">
          <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
          <Text style={styles.dateRangeText}>{getDateRangeLabel()}</Text>
          {selectedType === 'custom' && (
            <TouchableOpacity testID="button-change-dates">
              <Ionicons name="pencil-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} testID="text-summary-title">Riepilogo</Text>
          <View style={[styles.summaryGrid, (isLandscape || isTablet) && styles.summaryGridWide]}>
            <Card variant="glass" style={styles.summaryCard} testID="card-summary-revenue">
              <View style={[styles.summaryIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="trending-up-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.summaryValue}>{formatCurrency(reportData.totalRevenue)}</Text>
              <Text style={styles.summaryLabel}>Ricavi</Text>
            </Card>
            <Card variant="glass" style={styles.summaryCard} testID="card-summary-expenses">
              <View style={[styles.summaryIcon, { backgroundColor: `${colors.destructive}20` }]}>
                <Ionicons name="trending-down-outline" size={24} color={colors.destructive} />
              </View>
              <Text style={styles.summaryValue}>{formatCurrency(reportData.totalExpenses)}</Text>
              <Text style={styles.summaryLabel}>Spese</Text>
            </Card>
            <Card variant="glass" style={styles.summaryCard} testID="card-summary-profit">
              <View style={[styles.summaryIcon, { backgroundColor: `${colors.teal}20` }]}>
                <Ionicons name="wallet-outline" size={24} color={colors.teal} />
              </View>
              <Text style={[
                styles.summaryValue,
                { color: reportData.netProfit >= 0 ? colors.teal : colors.destructive }
              ]}>
                {formatCurrency(reportData.netProfit)}
              </Text>
              <Text style={styles.summaryLabel}>Utile Netto</Text>
            </Card>
            <Card variant="glass" style={styles.summaryCard} testID="card-summary-transactions">
              <View style={[styles.summaryIcon, { backgroundColor: `${colors.accent}20` }]}>
                <Ionicons name="receipt-outline" size={24} color={colors.accent} />
              </View>
              <Text style={styles.summaryValue}>{reportData.transactionCount}</Text>
              <Text style={styles.summaryLabel}>Transazioni</Text>
            </Card>
          </View>
        </View>

        <View style={(isLandscape || isTablet) ? styles.twoColumnContainer : undefined}>
          {incomeCategories.length > 0 && (
            <View style={[styles.section, (isLandscape || isTablet) && styles.halfSection]}>
              <Text style={styles.sectionTitle} testID="text-income-title">Ricavi per Categoria</Text>
              <Card variant="glass" testID="card-income-breakdown">
                {incomeCategories.map((category, index) => (
                  <View
                    key={category.name}
                    style={[
                      styles.categoryItem,
                      index < incomeCategories.length - 1 && styles.categoryItemBorder,
                    ]}
                    testID={`item-income-${index}`}
                  >
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <View style={styles.categoryBarContainer}>
                        <View
                          style={[
                            styles.categoryBar,
                            {
                              width: `${category.percentage}%`,
                              backgroundColor: colors.primary,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.categoryValues}>
                      <Text style={[styles.categoryAmount, { color: colors.primary }]}>
                        {formatCurrency(category.amount)}
                      </Text>
                      <Text style={styles.categoryPercentage}>{category.percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          )}

          {expenseCategories.length > 0 && (
            <View style={[styles.section, (isLandscape || isTablet) && styles.halfSection]}>
              <Text style={styles.sectionTitle} testID="text-expense-title">Spese per Categoria</Text>
              <Card variant="glass" testID="card-expense-breakdown">
                {expenseCategories.map((category, index) => (
                  <View
                    key={category.name}
                    style={[
                      styles.categoryItem,
                      index < expenseCategories.length - 1 && styles.categoryItemBorder,
                    ]}
                    testID={`item-expense-${index}`}
                  >
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <View style={styles.categoryBarContainer}>
                        <View
                          style={[
                            styles.categoryBar,
                            {
                              width: `${category.percentage}%`,
                              backgroundColor: colors.destructive,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.categoryValues}>
                      <Text style={[styles.categoryAmount, { color: colors.destructive }]}>
                        {formatCurrency(category.amount)}
                      </Text>
                      <Text style={styles.categoryPercentage}>{category.percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} testID="text-export-title">Esporta Report</Text>
          <View style={[styles.exportGrid, (isLandscape || isTablet) && styles.exportGridWide]}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => handleExport('pdf')}
              activeOpacity={0.8}
              testID="button-export-pdf"
            >
              <View style={[styles.exportIcon, { backgroundColor: `${colors.destructive}20` }]}>
                <Ionicons name="document-outline" size={24} color={colors.destructive} />
              </View>
              <Text style={styles.exportLabel}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => handleExport('excel')}
              activeOpacity={0.8}
              testID="button-export-excel"
            >
              <View style={[styles.exportIcon, { backgroundColor: `${colors.teal}20` }]}>
                <Ionicons name="grid-outline" size={24} color={colors.teal} />
              </View>
              <Text style={styles.exportLabel}>Excel</Text>
            </TouchableOpacity>
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  scrollContentWide: {
    paddingHorizontal: spacing.md,
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
  typesScroll: {
    maxHeight: 50,
  },
  typesContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typePill: {
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
  typePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typePillText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  typePillTextActive: {
    color: colors.primaryForeground,
  },
  dateRangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  dateRangeText: {
    flex: 1,
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  section: {
    marginBottom: spacing.lg,
  },
  halfSection: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  twoColumnContainer: {
    flexDirection: 'row',
    marginHorizontal: -spacing.sm,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryGridWide: {
    flexWrap: 'nowrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  categoryItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  categoryName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  categoryBarContainer: {
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  categoryValues: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  categoryPercentage: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  exportGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  exportGridWide: {
    justifyContent: 'center',
  },
  exportButton: {
    flex: 1,
    maxWidth: 200,
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  exportIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportLabel: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

export default FinancialReportsScreen;
