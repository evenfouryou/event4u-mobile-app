import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { api } from '../../lib/api';

interface ResaleListing {
  id: string;
  ticketId: string;
  eventTitle: string;
  eventDate: string;
  ticketType: string;
  price: number;
  originalPrice: number;
  createdAt: string;
  status: 'active' | 'sold' | 'cancelled';
  views: number;
}

export function MyResalesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: resales, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['/api/resales/my-listings'],
    queryFn: () => api.get<ResaleListing[]>('/api/resales/my-listings'),
  });

  const cancelListingMutation = useMutation({
    mutationFn: (listingId: string) => api.delete(`/api/resales/${listingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      Alert.alert('Successo', 'Annuncio rimosso con successo');
    },
    onError: (error: Error) => {
      Alert.alert('Errore', error.message || 'Impossibile rimuovere l\'annuncio');
    },
  });

  const handleCancelListing = (listing: ResaleListing) => {
    Alert.alert(
      'Rimuovi annuncio',
      `Vuoi rimuovere il biglietto "${listing.eventTitle}" dalla vendita?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: () => cancelListingMutation.mutate(listing.id),
        },
      ]
    );
  };

  const statusColors = {
    active: colors.success,
    sold: colors.primary,
    cancelled: colors.mutedForeground,
  };

  const statusLabels = {
    active: 'In vendita',
    sold: 'Venduto',
    cancelled: 'Annullato',
  };

  const renderListing = ({ item }: { item: ResaleListing }) => (
    <Card style={styles.listingCard}>
      <View style={styles.listingHeader}>
        <View style={styles.listingInfo}>
          <Text style={styles.eventTitle} numberOfLines={2}>{item.eventTitle}</Text>
          <Text style={styles.ticketType}>{item.ticketType}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
            {statusLabels[item.status]}
          </Text>
        </View>
      </View>

      <View style={styles.listingDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.detailText}>{item.eventDate}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="eye-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.detailText}>{item.views} visualizzazioni</Text>
        </View>
      </View>

      <View style={styles.priceSection}>
        <View style={styles.priceInfo}>
          <Text style={styles.priceLabel}>Prezzo richiesto</Text>
          <Text style={styles.priceValue}>€{item.price.toFixed(2)}</Text>
          <Text style={styles.originalPrice}>
            Originale: €{item.originalPrice.toFixed(2)}
          </Text>
        </View>
        
        {item.status === 'active' && (
          <View style={styles.listingActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('ResaleListing', { ticketId: item.ticketId })}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleCancelListing(item)}
            >
              <Ionicons name="trash-outline" size={20} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.listingFooter}>
        <Text style={styles.createdAt}>
          Pubblicato il {item.createdAt}
        </Text>
      </View>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="pricetags-outline" size={64} color={colors.mutedForeground} />
      <Text style={styles.emptyTitle}>Nessuna rivendita attiva</Text>
      <Text style={styles.emptySubtitle}>
        I tuoi biglietti in vendita appariranno qui
      </Text>
      <Button
        title="Vai ai miei biglietti"
        variant="outline"
        onPress={() => navigation.navigate('MyTickets')}
        style={styles.emptyButton}
      />
    </View>
  );

  const activeCount = resales?.filter(r => r.status === 'active').length || 0;
  const soldCount = resales?.filter(r => r.status === 'sold').length || 0;

  return (
    <View style={styles.container}>
      <Header 
        title="Le mie rivendite" 
        showBack 
        onBack={() => navigation.goBack()} 
      />
      
      {resales && resales.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>In vendita</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{soldCount}</Text>
            <Text style={styles.statLabel}>Venduti</Text>
          </View>
        </View>
      )}

      <FlatList
        data={resales}
        keyExtractor={(item) => item.id}
        renderItem={renderListing}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.lg },
          (!resales || resales.length === 0) && styles.listEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  listEmpty: {
    flex: 1,
  },
  listingCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  eventTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  ticketType: {
    color: colors.primary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  listingDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceInfo: {},
  priceLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceValue: {
    color: colors.success,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  originalPrice: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  listingActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingFooter: {
    marginTop: spacing.md,
  },
  createdAt: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: spacing.lg,
  },
});
