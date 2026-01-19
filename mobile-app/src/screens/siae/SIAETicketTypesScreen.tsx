import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

  const numColumns = (isTablet || isLandscape) ? 2 : 1;

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

  const renderTicketType = ({ item, index }: { item: TicketType; index: number }) => (
    <TouchableOpacity
      style={[
        styles.typeCard,
        numColumns === 2 && {
          width: '48%',
          marginRight: index % 2 === 0 ? '4%' : 0,
        },
      ]}
      onPress={() => navigation.navigate('SIAETicketTypeDetail', { typeId: item.id })}
      activeOpacity={0.8}
      testID={`card-type-${item.id}`}
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
              <Text style={styles.typeName} testID={`text-type-name-${item.id}`}>{item.name}</Text>
              {!item.isActive && (
                <View style={[styles.inactiveBadge]}>
                  <Text style={styles.inactiveText}>Inattivo</Text>
                </View>
              )}
            </View>
            <Text style={styles.typeCode} testID={`text-type-code-${item.id}`}>Codice: {item.code}</Text>
            <Text style={styles.typeDescription} numberOfLines={1}>{item.description}</Text>
            <View style={styles.typeFooter}>
              <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(item.category)}20` }]}>
                <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]} testID={`text-category-${item.id}`}>
                  {getCategoryLabel(item.category)}
                </Text>
              </View>
              <Text style={styles.soldCount} testID={`text-sold-count-${item.id}`}>{item.ticketsSold} venduti</Text>
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price} testID={`text-price-${item.id}`}>{formatCurrency(item.price)}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Tipi Biglietto" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Header
        title="Tipi Biglietto"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('SIAETicketTypeAdd')} testID="button-add-type">
            <Ionicons name="add-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      
      <FlatList
        data={ticketTypes}
        renderItem={renderTicketType}
        keyExtractor={(item) => item.id.toString()}
        key={numColumns}
        numColumns={numColumns}
        contentContainerStyle={[
          styles.listContent,
          (isTablet || isLandscape) && styles.listContentLandscape,
        ]}
        columnWrapperStyle={numColumns === 2 ? styles.columnWrapper : undefined}
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
        testID="list-ticket-types"
      />
    </SafeAreaView>
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
    paddingBottom: 100,
  },
  listContentLandscape: {
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
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
    flexWrap: 'wrap',
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
    flexWrap: 'wrap',
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
