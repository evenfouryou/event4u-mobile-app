import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, RefreshControl, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [showSortOptions, setShowSortOptions] = useState(false);

  const { data: resales, isLoading, refetch, isRefetching } = useQuery<ResaleTicket[]>({
    queryKey: ['/api/public/resales', { search: searchQuery, sort: sortBy }],
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

  const numColumns = isLandscape || isTablet ? 2 : 1;

  const renderResaleItem = ({ item, index }: { item: ResaleTicket; index: number }) => {
    const discount = getDiscount(item.originalPrice, item.resalePrice);
    const isLastInRow = numColumns === 2 && index % 2 === 1;
    const isFirstInRow = numColumns === 2 && index % 2 === 0;

    return (
      <TouchableOpacity
        style={[
          styles.resaleCard,
          numColumns === 2 && styles.resaleCardGrid,
          numColumns === 2 && isFirstInRow && { marginRight: spacing.xs },
          numColumns === 2 && isLastInRow && { marginLeft: spacing.xs },
        ]}
        onPress={() => handleResalePress(item)}
        activeOpacity={0.8}
        testID={`button-resale-${item.id}`}
      >
        <Image
          source={{ uri: item.eventImageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400' }}
          style={[styles.eventImage, numColumns === 2 && styles.eventImageGrid]}
          testID={`image-resale-event-${item.id}`}
        />
        <View style={styles.resaleContent}>
          <Text style={styles.eventTitle} numberOfLines={1} testID={`text-resale-title-${item.id}`}>{item.eventTitle}</Text>
          <View style={styles.eventInfo}>
            <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
            <Text style={styles.eventDate} testID={`text-resale-date-${item.id}`}>{item.eventDate} • {item.eventTime}</Text>
          </View>
          <View style={styles.ticketTypeRow}>
            <Ionicons name="ticket-outline" size={12} color={colors.primary} />
            <Text style={styles.ticketType} testID={`text-resale-ticket-type-${item.id}`}>{item.ticketType}</Text>
            <Text style={styles.quantity} testID={`text-resale-quantity-${item.id}`}>x{item.quantity}</Text>
          </View>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.resalePrice} testID={`text-resale-price-${item.id}`}>€{item.resalePrice.toFixed(2)}</Text>
              {discount > 0 && (
                <Text style={styles.originalPrice} testID={`text-resale-original-price-${item.id}`}>€{item.originalPrice.toFixed(2)}</Text>
              )}
            </View>
            {discount > 0 && (
              <View style={styles.discountBadge} testID={`badge-resale-discount-${item.id}`}>
                <Text style={styles.discountText}>-{discount.toFixed(0)}%</Text>
              </View>
            )}
          </View>
          <View style={styles.sellerRow}>
            <View style={styles.sellerInfo}>
              <Ionicons name="person-circle-outline" size={16} color={colors.mutedForeground} />
              <Text style={styles.sellerName} testID={`text-resale-seller-${item.id}`}>{item.sellerName}</Text>
            </View>
            {item.sellerRating && (
              <View style={styles.sellerRating} testID={`badge-resale-rating-${item.id}`}>
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']} testID="screen-resales">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} testID="button-back">
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title} testID="text-screen-title">Rivendite</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Cerca biglietti in rivendita..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Ionicons name="search" size={20} color={colors.mutedForeground} />}
          containerStyle={styles.searchInput}
          testID="input-search-resales"
        />
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortOptions(!showSortOptions)}
          testID="button-sort"
        >
          <Ionicons name="swap-vertical" size={18} color={colors.foreground} />
          <Text style={styles.sortButtonText} testID="text-sort-selected">{selectedSort?.label}</Text>
          <Ionicons
            name={showSortOptions ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>

      {showSortOptions && (
        <Card style={styles.sortDropdown} testID="dropdown-sort-options">
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.sortOption,
                sortBy === option.id && styles.sortOptionActive,
              ]}
              onPress={() => handleSortSelect(option.id)}
              testID={`button-sort-${option.id}`}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option.id && styles.sortOptionTextActive,
                ]}
                testID={`text-sort-option-${option.id}`}
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
        key={numColumns}
        data={resalesList}
        renderItem={renderResaleItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.resalesList}
        columnWrapperStyle={numColumns === 2 ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        testID="flatlist-resales"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            testID="refresh-control-resales"
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer} testID="container-loading">
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.skeletonCard} testID={`skeleton-card-${i}`} />
              ))}
            </View>
          ) : (
            <Card style={styles.emptyCard} testID="card-empty-state">
              <Ionicons name="ticket-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle} testID="text-empty-title">Nessun biglietto in vendita</Text>
              <Text style={styles.emptyText} testID="text-empty-description">
                Non ci sono biglietti in rivendita al momento
              </Text>
            </Card>
          )
        }
      />

      <View style={styles.sellBanner} testID="banner-sell-tickets">
        <View style={styles.sellBannerContent}>
          <Ionicons name="pricetag" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sellBannerTitle} testID="text-sell-banner-title">Hai biglietti da vendere?</Text>
            <Text style={styles.sellBannerText} testID="text-sell-banner-description">Mettili in vendita in modo sicuro</Text>
          </View>
        </View>
        <Button
          title="Vendi"
          size="sm"
          onPress={() => navigation.navigate('Account')}
          testID="button-sell-tickets"
        />
      </View>
    </SafeAreaView>
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
    paddingBottom: spacing.xxl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  resaleCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  resaleCardGrid: {
    flex: 1,
    flexDirection: 'column',
    maxWidth: '48%',
  },
  eventImage: {
    width: 100,
    height: 140,
    backgroundColor: colors.muted,
  },
  eventImageGrid: {
    width: '100%',
    height: 100,
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
