import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAECard } from '@/lib/api';

type TabType = 'active' | 'pending' | 'expired';

interface GestoreSIAECardsScreenProps {
  onBack: () => void;
}

export function GestoreSIAECardsScreen({ onBack }: GestoreSIAECardsScreenProps) {
  const { colors } = useTheme();
  const [cards, setCards] = useState<SIAECard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
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

  const loadCards = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getSIAECards();
      setCards(data);
    } catch (err) {
      console.error('Error loading SIAE cards:', err);
      setError('Errore nel caricamento delle tessere SIAE');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCards();
    setRefreshing(false);
  };

  const filteredCards = useMemo(() => {
    return cards.filter(card => card.status === activeTab);
  }, [cards, activeTab]);

  const countByStatus = useMemo(() => ({
    active: cards.filter(c => c.status === 'active').length,
    pending: cards.filter(c => c.status === 'pending').length,
    expired: cards.filter(c => c.status === 'expired').length,
  }), [cards]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: SIAECard['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attiva</Badge>;
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'expired':
        return <Badge variant="destructive">Scaduta</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewDetails = (card: SIAECard) => {
    triggerHaptic('selection');
    Alert.alert(
      `Tessera ${card.cardNumber}`,
      `Cliente: ${card.customerName}\nAttivazione: ${formatDate(card.activationDate)}\nScadenza: ${formatDate(card.expiryDate)}\nStato: ${card.status === 'active' ? 'Attiva' : card.status === 'pending' ? 'In attesa' : 'Scaduta'}`,
      [{ text: 'Chiudi', style: 'cancel' }]
    );
  };

  const handleDeactivate = (card: SIAECard) => {
    if (card.status !== 'active') return;
    triggerHaptic('medium');
    Alert.alert(
      'Disattiva Tessera',
      `Sei sicuro di voler disattivare la tessera ${card.cardNumber}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Disattiva', style: 'destructive', onPress: () => Alert.alert('Info', 'Usa il pannello web per disattivare le tessere') },
      ]
    );
  };

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'active', label: 'Attive', count: countByStatus.active },
    { id: 'pending', label: 'In attesa', count: countByStatus.pending },
    { id: 'expired', label: 'Scadute', count: countByStatus.expired },
  ];

  const renderCard = ({ item }: { item: SIAECard }) => (
    <Card style={styles.cardItem} testID={`siae-card-${item.id}`}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="card" size={24} color={colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardNumber, { color: colors.foreground }]}>{item.cardNumber}</Text>
          <Text style={[styles.customerName, { color: colors.mutedForeground }]}>{item.customerName}</Text>
        </View>
        {getStatusBadge(item.status)}
      </View>

      <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

      <View style={styles.cardDates}>
        <View style={styles.dateItem}>
          <Ionicons name="calendar-outline" size={14} color={staticColors.success} />
          <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>Attivazione</Text>
          <Text style={[styles.dateValue, { color: colors.foreground }]}>{formatDate(item.activationDate)}</Text>
        </View>
        <View style={styles.dateItem}>
          <Ionicons name="time-outline" size={14} color={item.status === 'expired' ? staticColors.destructive : colors.mutedForeground} />
          <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>Scadenza</Text>
          <Text style={[styles.dateValue, { color: item.status === 'expired' ? staticColors.destructive : colors.foreground }]}>
            {formatDate(item.expiryDate)}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: `${colors.primary}15` }]}
          onPress={() => handleViewDetails(item)}
          testID={`button-view-card-${item.id}`}
        >
          <Ionicons name="eye" size={16} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.primary }]}>Dettagli</Text>
        </Pressable>
        {item.status === 'active' && (
          <Pressable
            style={[styles.actionButton, { backgroundColor: `${colors.destructive}15` }]}
            onPress={() => handleDeactivate(item)}
            testID={`button-deactivate-card-${item.id}`}
          >
            <Ionicons name="close-circle" size={16} color={colors.destructive} />
            <Text style={[styles.actionButtonText, { color: colors.destructive }]}>Disattiva</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="card-outline" size={64} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        Nessuna tessera {activeTab === 'active' ? 'attiva' : activeTab === 'pending' ? 'in attesa' : 'scaduta'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        Non ci sono tessere SIAE in questa categoria
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Errore</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{error}</Text>
      <Pressable
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={loadCards}
        testID="button-retry"
      >
        <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>Riprova</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeArea edges={['bottom']} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as ViewStyle}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-cards"
      />

      <View style={styles.titleContainer}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Tessere SIAE</Text>
        <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
          {cards.length} tessere totali
        </Text>
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
              { backgroundColor: activeTab === tab.id ? colors.primary : colors.secondary },
            ]}
            testID={`tab-${tab.id}`}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.id ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {tab.label} ({tab.count})
            </Text>
          </Pressable>
        ))}
      </View>

      {showLoader ? (
        <Loading text="Caricamento tessere SIAE..." />
      ) : error ? (
        renderError()
      ) : filteredCards.length > 0 ? (
        <FlatList
          data={filteredCards}
          renderItem={renderCard}
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
        renderEmptyState()
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  screenTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  cardItem: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardNumber: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  customerName: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  cardDates: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  dateItem: {
    alignItems: 'center',
    gap: 4,
  },
  dateLabel: {
    fontSize: typography.fontSize.xs,
  },
  dateValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
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
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});

export default GestoreSIAECardsScreen;
