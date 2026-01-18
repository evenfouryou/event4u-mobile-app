import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface TicketType {
  id: number;
  name: string;
  code: string;
  price: number;
  category: 'intero' | 'ridotto' | 'omaggio' | 'abbonamento';
  description: string;
  isActive: boolean;
  ticketsSold: number;
}

export function SIAETicketTypesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

  const loadTicketTypes = async () => {
    try {
      const response = await api.get<any>('/api/siae/ticket-types');
      const data = response.ticketTypes || response || [];
      setTicketTypes(data);
    } catch (error) {
      console.error('Error loading ticket types:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTicketTypes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTicketTypes();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'intero':
        return colors.primary;
      case 'ridotto':
        return colors.teal;
      case 'omaggio':
        return colors.success;
      case 'abbonamento':
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'intero':
        return 'Intero';
      case 'ridotto':
        return 'Ridotto';
      case 'omaggio':
        return 'Omaggio';
      case 'abbonamento':
        return 'Abbonamento';
      default:
        return category;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const renderTicketType = ({ item }: { item: TicketType }) => (
    <TouchableOpacity
      style={styles.typeCard}
      onPress={() => navigation.navigate('SIAETicketTypeDetail', { typeId: item.id })}
      activeOpacity={0.8}
      data-testid={`card-type-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.typeRow}>
          <View style={[styles.typeIcon, { backgroundColor: `${getCategoryColor(item.category)}20` }]}>
            <Ionicons 
              name={item.category === 'omaggio' ? 'gift-outline' : 'ticket-outline'} 
              size={24} 
              color={getCategoryColor(item.category)} 
            />
          </View>
          <View style={styles.typeInfo}>
            <View style={styles.typeHeader}>
              <Text style={styles.typeName}>{item.name}</Text>
              {!item.isActive && (
                <View style={[styles.inactiveBadge]}>
                  <Text style={styles.inactiveText}>Inattivo</Text>
                </View>
              )}
            </View>
            <Text style={styles.typeCode}>Codice: {item.code}</Text>
            <Text style={styles.typeDescription} numberOfLines={1}>{item.description}</Text>
            <View style={styles.typeFooter}>
              <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(item.category)}20` }]}>
                <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
                  {getCategoryLabel(item.category)}
                </Text>
              </View>
              <Text style={styles.soldCount}>{item.ticketsSold} venduti</Text>
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatCurrency(item.price)}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Tipi Biglietto" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Tipi Biglietto"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('SIAETicketTypeAdd')} data-testid="button-add-type">
            <Ionicons name="add-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      
      <FlatList
        data={ticketTypes}
        renderItem={renderTicketType}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetags-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun tipo biglietto</Text>
            <Text style={styles.emptySubtext}>Configura i tipi di biglietto per la vendita</Text>
          </View>
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  typeCard: {
    marginBottom: spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  typeInfo: {
    flex: 1,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  typeName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  inactiveBadge: {
    backgroundColor: `${colors.destructive}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  inactiveText: {
    color: colors.destructive,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  typeCode: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  typeDescription: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
  },
  typeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  soldCount: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  emptyText: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  emptySubtext: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});

export default SIAETicketTypesScreen;
