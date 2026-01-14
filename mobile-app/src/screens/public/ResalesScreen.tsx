import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Input, Card, Button } from '../../components';
import { api } from '../../lib/api';

interface ResaleTicket {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventImageUrl?: string;
  ticketType: string;
  originalPrice: number;
  resalePrice: number;
  sellerName: string;
  sellerRating?: number;
  quantity: number;
  listedAt: string;
}

const SORT_OPTIONS = [
  { id: 'recent', label: 'Più recenti' },
  { id: 'price_asc', label: 'Prezzo: crescente' },
  { id: 'price_desc', label: 'Prezzo: decrescente' },
  { id: 'date', label: 'Data evento' },
];

export function ResalesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [showSortOptions, setShowSortOptions] = useState(false);

  const { data: resales, isLoading, refetch, isRefetching } = useQuery<ResaleTicket[]>({
    queryKey: ['/api/resales', { search: searchQuery, sort: sortBy }],
  });

  const handleResalePress = useCallback((resale: ResaleTicket) => {
    navigation.navigate('ResaleCheckout', { resaleId: resale.id });
  }, [navigation]);

  const handleSortSelect = (sortId: string) => {
    setSortBy(sortId);
    setShowSortOptions(false);
  };

  const getDiscount = (original: number, resale: number) => {
    const discount = ((original - resale) / original) * 100;
    return discount > 0 ? discount : 0;
  };

  const renderResaleItem = ({ item }: { item: ResaleTicket }) => {
    const discount = getDiscount(item.originalPrice, item.resalePrice);

    return (
      <TouchableOpacity
        style={styles.resaleCard}
        onPress={() => handleResalePress(item)}
        activeOpacity={0.8}
        data-testid={`button-resale-${item.id}`}
      >
        <Image
          source={{ uri: item.eventImageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400' }}
          style={styles.eventImage}
        />
        <View style={styles.resaleContent}>
          <Text style={styles.eventTitle} numberOfLines={1}>{item.eventTitle}</Text>
          <View style={styles.eventInfo}>
            <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
            <Text style={styles.eventDate}>{item.eventDate} • {item.eventTime}</Text>
          </View>
          <View style={styles.ticketTypeRow}>
            <Ionicons name="ticket-outline" size={12} color={colors.primary} />
            <Text style={styles.ticketType}>{item.ticketType}</Text>
            <Text style={styles.quantity}>x{item.quantity}</Text>
          </View>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.resalePrice}>€{item.resalePrice.toFixed(2)}</Text>
              {discount > 0 && (
                <Text style={styles.originalPrice}>€{item.originalPrice.toFixed(2)}</Text>
              )}
            </View>
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount.toFixed(0)}%</Text>
              </View>
            )}
          </View>
          <View style={styles.sellerRow}>
            <View style={styles.sellerInfo}>
              <Ionicons name="person-circle-outline" size={16} color={colors.mutedForeground} />
              <Text style={styles.sellerName}>{item.sellerName}</Text>
            </View>
            {item.sellerRating && (
              <View style={styles.sellerRating}>
                <Ionicons name="star" size={12} color={colors.warning} />
                <Text style={styles.ratingText}>{item.sellerRating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const resalesList = (resales || []) as ResaleTicket[];
  const selectedSort = SORT_OPTIONS.find((s) => s.id === sortBy);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="button-back">
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Rivendite</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Cerca biglietti in rivendita..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Ionicons name="search" size={20} color={colors.mutedForeground} />}
          containerStyle={styles.searchInput}
        />
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortOptions(!showSortOptions)}
          data-testid="button-sort"
        >
          <Ionicons name="swap-vertical" size={18} color={colors.foreground} />
          <Text style={styles.sortButtonText}>{selectedSort?.label}</Text>
          <Ionicons
            name={showSortOptions ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>

      {showSortOptions && (
        <Card style={styles.sortDropdown}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.sortOption,
                sortBy === option.id && styles.sortOptionActive,
              ]}
              onPress={() => handleSortSelect(option.id)}
              data-testid={`button-sort-${option.id}`}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option.id && styles.sortOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.id && (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </Card>
      )}

      <FlatList
        data={resalesList}
        renderItem={renderResaleItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.resalesList,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.skeletonCard} />
              ))}
            </View>
          ) : (
            <Card style={styles.emptyCard}>
              <Ionicons name="ticket-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Nessun biglietto in vendita</Text>
              <Text style={styles.emptyText}>
                Non ci sono biglietti in rivendita al momento
              </Text>
            </Card>
          )
        }
      />

      <View style={[styles.sellBanner, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.sellBannerContent}>
          <Ionicons name="pricetag" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sellBannerTitle}>Hai biglietti da vendere?</Text>
            <Text style={styles.sellBannerText}>Mettili in vendita in modo sicuro</Text>
          </View>
        </View>
        <Button
          title="Vendi"
          size="sm"
          onPress={() => navigation.navigate('Account')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchInput: {
    marginBottom: 0,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  sortButtonText: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  sortDropdown: {
    position: 'absolute',
    top: 160,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
    padding: 0,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortOptionActive: {
    backgroundColor: colors.muted,
  },
  sortOptionText: {
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  resalesList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  resaleCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  eventImage: {
    width: 100,
    height: 140,
    backgroundColor: colors.muted,
  },
  resaleContent: {
    flex: 1,
    padding: spacing.md,
  },
  eventTitle: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  eventDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  ticketTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  ticketType: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  quantity: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  resalePrice: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  originalPrice: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    color: colors.successForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sellerName: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  sellerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    color: colors.foreground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  loadingContainer: {
    gap: spacing.md,
  },
  skeletonCard: {
    height: 140,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  sellBanner: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sellBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  sellBannerTitle: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  sellBannerText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
});
