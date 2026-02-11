import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { SIAEResaleListing } from '@/lib/api';

interface GestoreSIAEResalesScreenProps {
  onBack: () => void;
}

type TabType = 'active' | 'sold' | 'expired';

export function GestoreSIAEResalesScreen({ onBack }: GestoreSIAEResalesScreenProps) {
  const { colors } = useTheme();
  const [listings, setListings] = useState<SIAEResaleListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');

  useEffect(() => {
    loadListings();
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

  const loadListings = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSIAEResaleListings();
      setListings(data);
    } catch (error) {
      console.error('Error loading resale listings:', error);
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadListings();
    setRefreshing(false);
  };

  const handleApprove = async (listing: SIAEResaleListing) => {
    Alert.alert(
      'Approva Rivendita',
      `Approvare la rivendita del biglietto ${listing.ticketCode}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Approva',
          onPress: async () => {
            try {
              await api.approveSIAEResale(listing.id);
              triggerHaptic('success');
              await loadListings();
            } catch (error) {
              console.error('Error approving resale:', error);
              triggerHaptic('error');
              Alert.alert('Errore', 'Impossibile approvare la rivendita');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (listing: SIAEResaleListing) => {
    Alert.alert(
      'Rifiuta Rivendita',
      `Rifiutare la rivendita del biglietto ${listing.ticketCode}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rifiuta',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.rejectSIAEResale(listing.id);
              triggerHaptic('success');
              await loadListings();
            } catch (error) {
              console.error('Error rejecting resale:', error);
              triggerHaptic('error');
              Alert.alert('Errore', 'Impossibile rifiutare la rivendita');
            }
          },
        },
      ]
    );
  };

  const formatPrice = (price: number) => {
    return `€${price.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: SIAEResaleListing['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">In Attesa</Badge>;
      case 'active':
        return <Badge variant="teal">In Vendita</Badge>;
      case 'sold':
        return <Badge variant="success">Venduto</Badge>;
      case 'expired':
        return <Badge variant="secondary">Scaduto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredListings = listings.filter(listing => {
    switch (activeTab) {
      case 'active':
        return listing.status === 'active' || listing.status === 'pending';
      case 'sold':
        return listing.status === 'sold';
      case 'expired':
        return listing.status === 'expired';
      default:
        return true;
    }
  });

  const activeCount = listings.filter(l => l.status === 'active' || l.status === 'pending').length;
  const soldCount = listings.filter(l => l.status === 'sold').length;
  const expiredCount = listings.filter(l => l.status === 'expired').length;
  const totalCommission = listings.filter(l => l.status === 'sold').reduce((sum, l) => sum + l.commission, 0);

  const tabs = [
    { id: 'active' as TabType, label: 'In Vendita', count: activeCount },
    { id: 'sold' as TabType, label: 'Venduti', count: soldCount },
    { id: 'expired' as TabType, label: 'Scaduti', count: expiredCount },
  ];

  const renderListing = ({ item }: { item: SIAEResaleListing }) => (
    <Card style={styles.listingCard} testID={`listing-${item.id}`}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.ticketCode}>{item.ticketCode}</Text>
            {getStatusBadge(item.status)}
          </View>
          <Text style={styles.eventName} numberOfLines={1}>{item.eventName}</Text>
          <Text style={styles.sellerName}>Venditore: {item.sellerName}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.pricesRow}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Prezzo Originale</Text>
          <Text style={styles.originalPrice}>{formatPrice(item.originalPrice)}</Text>
        </View>
        <View style={styles.priceArrow}>
          <Ionicons name="arrow-forward" size={16} color={colors.mutedForeground} />
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Prezzo Rivendita</Text>
          <Text style={styles.resalePrice}>{formatPrice(item.resalePrice)}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Commissione</Text>
          <Text style={styles.commissionPrice}>{formatPrice(item.commission)}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
          <Text style={styles.metaText}>{formatDate(item.listedDate)}</Text>
        </View>
        {item.soldDate && (
          <View style={styles.metaItem}>
            <Ionicons name="checkmark-circle-outline" size={14} color={staticColors.success} />
            <Text style={{...styles.metaText, color: staticColors.success}}>
              Venduto {formatDate(item.soldDate)}
            </Text>
          </View>
        )}
        <Badge variant="outline" size="sm" style={styles.complianceBadge}>
          <View style={styles.complianceContent}>
            <Ionicons name="shield-checkmark" size={12} color={staticColors.success} />
            <Text style={styles.complianceText}>Allegato B</Text>
          </View>
        </Badge>
      </View>

      {item.status === 'pending' && (
        <View style={styles.cardActions}>
          <Button
            variant="outline"
            size="sm"
            onPress={() => handleReject(item)}
            style={styles.actionBtn}
            testID={`reject-${item.id}`}
          >
            <Ionicons name="close" size={16} color={staticColors.destructive} />
            <Text style={{...styles.actionBtnText, color: staticColors.destructive}}>Rifiuta</Text>
          </Button>
          <Button
            variant="default"
            size="sm"
            onPress={() => handleApprove(item)}
            style={styles.actionBtn}
            testID={`approve-${item.id}`}
          >
            <Ionicons name="checkmark" size={16} color={staticColors.primaryForeground} />
            <Text style={styles.actionBtnTextPrimary}>Approva</Text>
          </Button>
        </View>
      )}
    </Card>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-siae-resales"
      />

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Rivendite SIAE</Text>
        <Text style={styles.subtitle}>Gestione marketplace biglietti</Text>
      </View>

      <View style={styles.statsRow}>
        <GlassCard style={styles.statCard} testID="stat-commission">
          <View style={{...styles.statIcon, backgroundColor: `${staticColors.primary}20`}}>
            <Ionicons name="cash" size={18} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue}>{formatPrice(totalCommission)}</Text>
          <Text style={styles.statLabel}>Commissioni</Text>
        </GlassCard>
        <GlassCard style={styles.statCard} testID="stat-sold">
          <View style={{...styles.statIcon, backgroundColor: `${staticColors.success}20`}}>
            <Ionicons name="checkmark-done" size={18} color={staticColors.success} />
          </View>
          <Text style={styles.statValue}>{soldCount}</Text>
          <Text style={styles.statLabel}>Venduti</Text>
        </GlassCard>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab(tab.id);
            }}
            testID={`tab-${tab.id}`}
          >
            <Text style={{
              ...styles.tabText,
              ...(activeTab === tab.id ? styles.tabTextActive : {}),
            }}>
              {tab.label}
            </Text>
            <Badge
              variant={activeTab === tab.id ? 'default' : 'secondary'}
              size="sm"
            >
              {tab.count}
            </Badge>
          </Pressable>
        ))}
      </View>

      {showLoader ? (
        <Loading text="Caricamento rivendite..." />
      ) : filteredListings.length > 0 ? (
        <FlatList
          data={filteredListings}
          renderItem={renderListing}
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
          <Ionicons name="swap-horizontal-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessuna rivendita</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'active' && 'Non ci sono biglietti in vendita'}
            {activeTab === 'sold' && 'Nessun biglietto venduto'}
            {activeTab === 'expired' && 'Nessun biglietto scaduto'}
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: staticColors.secondary,
  },
  tabActive: {
    backgroundColor: `${staticColors.primary}20`,
    borderWidth: 1,
    borderColor: staticColors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  tabTextActive: {
    color: staticColors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 100,
  },
  listingCard: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  ticketCode: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.foreground,
    fontFamily: 'monospace',
  },
  eventName: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
    marginTop: 4,
  },
  sellerName: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  pricesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginBottom: 2,
  },
  originalPrice: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
    textDecorationLine: 'line-through',
  },
  resalePrice: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: staticColors.primary,
  },
  commissionPrice: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.success,
  },
  priceArrow: {
    paddingHorizontal: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  complianceBadge: {
    marginLeft: 'auto',
  },
  complianceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  complianceText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.success,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  actionBtn: {
    flex: 1,
  },
  actionBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionBtnTextPrimary: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
    marginLeft: 4,
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

export default GestoreSIAEResalesScreen;
