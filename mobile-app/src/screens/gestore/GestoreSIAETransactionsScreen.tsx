import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAETransaction } from '@/lib/api';

type TabType = 'all' | 'sale' | 'refund' | 'cancellation';

interface GestoreSIAETransactionsScreenProps {
  onBack: () => void;
}

export function GestoreSIAETransactionsScreen({ onBack }: GestoreSIAETransactionsScreenProps) {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState<SIAETransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadTransactions();
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

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAETransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading SIAE transactions:', error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleExportXML = async () => {
    try {
      setIsExporting(true);
      triggerHaptic('success');
      await api.exportSIAETransactionsXML();
    } catch (error) {
      console.error('Error exporting XML:', error);
      triggerHaptic('error');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (activeTab !== 'all') {
      filtered = filtered.filter(t => t.type === activeTab);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(query) ||
        t.fiscalSeal.toLowerCase().includes(query) ||
        t.ticketCode.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [transactions, activeTab, searchQuery]);

  const getTypeBadge = (type: SIAETransaction['type']) => {
    switch (type) {
      case 'sale':
        return <Badge variant="success">Vendita</Badge>;
      case 'refund':
        return <Badge variant="warning">Rimborso</Badge>;
      case 'cancellation':
        return <Badge variant="destructive">Annullamento</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const renderTransaction = ({ item }: { item: SIAETransaction }) => (
    <Card style={styles.transactionCard} testID={`transaction-${item.id}`}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionId, { color: colors.foreground }]} numberOfLines={1}>
            #{item.id.slice(0, 8).toUpperCase()}
          </Text>
          <View style={styles.transactionMeta}>
            <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.transactionMetaText, { color: colors.mutedForeground }]}>
              {formatDate(item.transactionDate)}
            </Text>
          </View>
        </View>
        {getTypeBadge(item.type)}
      </View>

      <View style={[styles.transactionDivider, { backgroundColor: colors.border }]} />

      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Importo</Text>
          <Text style={[styles.detailValue, styles.amountValue, { color: item.type === 'refund' || item.type === 'cancellation' ? staticColors.destructive : staticColors.success }]}>
            {item.type === 'refund' || item.type === 'cancellation' ? '-' : '+'}{formatCurrency(Math.abs(item.amount))}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Sigillo Fiscale</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.fiscalSeal}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Codice Biglietto</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.ticketCode}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Evento</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]} numberOfLines={1}>{item.eventName}</Text>
        </View>
      </View>
    </Card>
  );

  const tabs: { id: TabType; label: string }[] = [
    { id: 'all', label: 'Tutte' },
    { id: 'sale', label: 'Vendite' },
    { id: 'refund', label: 'Rimborsi' },
    { id: 'cancellation', label: 'Annullamenti' },
  ];

  return (
    <SafeArea edges={['bottom']} style={{ ...styles.container, backgroundColor: colors.background }}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-transactions"
      />

      <View style={styles.titleContainer}>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Transazioni Fiscali</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {filteredTransactions.length} transazioni
            </Text>
          </View>
          <Button
            variant="outline"
            size="sm"
            onPress={handleExportXML}
            disabled={isExporting}
            testID="button-export-xml"
          >
            <View style={styles.exportButton}>
              <Ionicons name="download-outline" size={16} color={colors.foreground} />
              <Text style={[styles.exportButtonText, { color: colors.foreground }]}>XML</Text>
            </View>
          </Button>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Cerca per ID o Sigillo Fiscale..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="input-search-transactions"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} testID="button-clear-search">
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
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
              { backgroundColor: colors.secondary },
              activeTab === tab.id && { backgroundColor: colors.primary },
            ]}
            testID={`tab-${tab.id}`}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: colors.mutedForeground },
                activeTab === tab.id && { color: staticColors.primaryForeground },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {showLoader ? (
        <Loading text="Caricamento transazioni..." />
      ) : filteredTransactions.length > 0 ? (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransaction}
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
          <Ionicons name="receipt-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna transazione trovata</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {searchQuery ? 'Prova a modificare la ricerca' : 'Non ci sono transazioni fiscali disponibili'}
          </Text>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  exportButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.xs,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  transactionCard: {
    padding: spacing.md,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  transactionId: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  transactionMetaText: {
    fontSize: typography.fontSize.sm,
  },
  transactionDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  transactionDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  amountValue: {
    fontWeight: '700',
    fontSize: typography.fontSize.base,
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
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default GestoreSIAETransactionsScreen;
