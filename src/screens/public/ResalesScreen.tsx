import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { triggerHaptic } from '@/lib/haptics';

type TabType = 'marketplace' | 'myResales';

interface ResaleTicket {
  id: string;
  eventName: string;
  eventDate: Date;
  ticketType: string;
  sectorName: string;
  originalPrice: number;
  resalePrice: number;
  sellerName: string;
  listedAt: Date;
  status?: 'listed' | 'sold' | 'expired';
}

interface ResalesScreenProps {
  onBack: () => void;
  onBuyTicket: (ticketId: string) => void;
  onSellTicket: () => void;
  isAuthenticated?: boolean;
}

export function ResalesScreen({
  onBack,
  onBuyTicket,
  onSellTicket,
  isAuthenticated = false,
}: ResalesScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('marketplace');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const marketplaceTickets: ResaleTicket[] = [
    {
      id: '1',
      eventName: 'Saturday Night Fever',
      eventDate: new Date('2026-02-01T23:00:00'),
      ticketType: 'VIP',
      sectorName: 'Zona Privé',
      originalPrice: 50,
      resalePrice: 45,
      sellerName: 'Mario R.',
      listedAt: new Date('2026-01-20T10:00:00'),
    },
    {
      id: '2',
      eventName: 'DJ Set Special',
      eventDate: new Date('2026-02-08T22:00:00'),
      ticketType: 'Standard',
      sectorName: 'Pista',
      originalPrice: 35,
      resalePrice: 35,
      sellerName: 'Giulia M.',
      listedAt: new Date('2026-01-22T14:30:00'),
    },
  ];

  const myResales: ResaleTicket[] = [
    {
      id: '3',
      eventName: 'Latin Night',
      eventDate: new Date('2026-02-14T21:00:00'),
      ticketType: 'Premium',
      sectorName: 'Balconata',
      originalPrice: 40,
      resalePrice: 38,
      sellerName: 'Tu',
      listedAt: new Date('2026-01-18T16:00:00'),
      status: 'listed',
    },
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDiscount = (original: number, resale: number) => {
    const diff = original - resale;
    if (diff <= 0) return null;
    return Math.round((diff / original) * 100);
  };

  const renderMarketplaceTicket = ({ item, index }: { item: ResaleTicket; index: number }) => {
    const discount = getDiscount(item.originalPrice, item.resalePrice);

    return (
      <View>
        <Card style={styles.ticketCard} testID={`resale-${item.id}`}>
          <View style={styles.ticketHeader}>
            <View style={styles.ticketDateBox}>
              <Text style={styles.ticketDay}>{item.eventDate.getDate()}</Text>
              <Text style={styles.ticketMonth}>
                {item.eventDate.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}
              </Text>
            </View>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketEventName} numberOfLines={1}>
                {item.eventName}
              </Text>
              <Text style={styles.ticketMeta}>
                {item.ticketType} • {item.sectorName}
              </Text>
              <Text style={styles.ticketMeta}>
                {formatTime(item.eventDate)}
              </Text>
            </View>
            {discount && (
              <Badge variant="success" style={styles.discountBadge}>
                -{discount}%
              </Badge>
            )}
          </View>

          <View style={styles.ticketDivider} />

          <View style={styles.ticketFooter}>
            <View style={styles.priceSection}>
              {discount ? (
                <>
                  <Text style={styles.originalPrice}>€{item.originalPrice}</Text>
                  <Text style={styles.resalePrice}>€{item.resalePrice}</Text>
                </>
              ) : (
                <Text style={styles.resalePrice}>€{item.resalePrice}</Text>
              )}
              <Text style={styles.sellerInfo}>da {item.sellerName}</Text>
            </View>
            <Button
              variant="golden"
              onPress={() => {
                triggerHaptic('medium');
                onBuyTicket(item.id);
              }}
              testID={`button-buy-${item.id}`}
            >
              Acquista
            </Button>
          </View>
        </Card>
      </View>
    );
  };

  const renderMyResale = ({ item, index }: { item: ResaleTicket; index: number }) => (
    <View>
      <Card style={styles.ticketCard} testID={`my-resale-${item.id}`}>
        <View style={styles.ticketHeader}>
          <View style={styles.ticketDateBox}>
            <Text style={styles.ticketDay}>{item.eventDate.getDate()}</Text>
            <Text style={styles.ticketMonth}>
              {item.eventDate.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}
            </Text>
          </View>
          <View style={styles.ticketInfo}>
            <Text style={styles.ticketEventName} numberOfLines={1}>
              {item.eventName}
            </Text>
            <Text style={styles.ticketMeta}>
              {item.ticketType} • {item.sectorName}
            </Text>
          </View>
          <Badge
            variant={
              item.status === 'sold' ? 'success' : item.status === 'expired' ? 'destructive' : 'secondary'
            }
          >
            {item.status === 'sold' ? 'Venduto' : item.status === 'expired' ? 'Scaduto' : 'In vendita'}
          </Badge>
        </View>

        <View style={styles.ticketDivider} />

        <View style={styles.myResaleFooter}>
          <View style={styles.priceSection}>
            <Text style={styles.resalePrice}>€{item.resalePrice}</Text>
            <Text style={styles.listedDate}>
              In vendita dal {formatDate(item.listedAt)}
            </Text>
          </View>
          {item.status === 'listed' && (
            <Button
              variant="outline"
              onPress={() => triggerHaptic('light')}
              testID={`button-edit-${item.id}`}
            >
              Modifica
            </Button>
          )}
        </View>
      </Card>
    </View>
  );

  const tickets = activeTab === 'marketplace' ? marketplaceTickets : myResales;

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        rightElement={
          isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={onSellTicket}
              testID="button-sell"
            >
              <Ionicons name="add" size={24} color={staticColors.primary} />
            </Button>
          ) : undefined
        }
        testID="header-resales"
      />

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={staticColors.mutedForeground} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cerca biglietti in vendita..."
          placeholderTextColor={staticColors.mutedForeground}
          style={styles.searchInput}
        />
      </View>

      {isAuthenticated && (
        <View style={styles.tabs}>
          <Pressable
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab('marketplace');
            }}
            style={[styles.tab, activeTab === 'marketplace' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'marketplace' && styles.tabTextActive]}>
              Marketplace
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab('myResales');
            }}
            style={[styles.tab, activeTab === 'myResales' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'myResales' && styles.tabTextActive]}>
              I miei annunci
            </Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <Loading text="Caricamento..." />
      ) : (
        <FlatList
          data={tickets}
          renderItem={activeTab === 'marketplace' ? renderMarketplaceTicket : renderMyResale}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="swap-horizontal-outline" size={64} color={staticColors.mutedForeground} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'marketplace'
                  ? 'Nessun biglietto in vendita'
                  : 'Non hai biglietti in vendita'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'marketplace'
                  ? 'I biglietti rivenduti appariranno qui'
                  : 'Metti in vendita i biglietti che non puoi usare'}
              </Text>
              {activeTab === 'myResales' && (
                <Button
                  variant="golden"
                  onPress={onSellTicket}
                  style={styles.emptyButton}
                  testID="button-sell-empty"
                >
                  Vendi un Biglietto
                </Button>
              )}
            </View>
          }
        />
      )}

      <View style={styles.infoFooter}>
        <Ionicons name="shield-checkmark" size={16} color={staticColors.success} />
        <Text style={styles.infoText}>
          Rivendita sicura e conforme alle norme SIAE
        </Text>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: staticColors.foreground,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: staticColors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  tabTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
    gap: spacing.md,
  },
  ticketCard: {
    padding: spacing.md,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  ticketDateBox: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: `${staticColors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketDay: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: staticColors.primary,
  },
  ticketMonth: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.primary,
    marginTop: -2,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketEventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: 2,
  },
  ticketMeta: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  discountBadge: {
    alignSelf: 'flex-start',
  },
  ticketDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceSection: {
    flex: 1,
  },
  originalPrice: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textDecorationLine: 'line-through',
  },
  resalePrice: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.primary,
  },
  sellerInfo: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  myResaleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listedDate: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyButton: {
    marginTop: spacing.lg,
  },
  infoFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: staticColors.card,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
});

export default ResalesScreen;
