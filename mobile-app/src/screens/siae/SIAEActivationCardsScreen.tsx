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

interface ActivationCard {
  id: number;
  cardNumber: string;
  status: 'active' | 'inactive' | 'expired' | 'blocked';
  activatedAt: string | null;
  expiresAt: string | null;
  assignedTo: string | null;
}

export function SIAEActivationCardsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cards, setCards] = useState<ActivationCard[]>([]);

  const loadCards = async () => {
    try {
      const response = await api.get<any>('/api/siae/activation-cards');
      const data = response.cards || response || [];
      setCards(data);
    } catch (error) {
      console.error('Error loading activation cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCards();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.mutedForeground;
      case 'expired':
        return colors.warning;
      case 'blocked':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Attiva';
      case 'inactive':
        return 'Inattiva';
      case 'expired':
        return 'Scaduta';
      case 'blocked':
        return 'Bloccata';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderCard = ({ item }: { item: ActivationCard }) => (
    <TouchableOpacity
      style={styles.cardItem}
      onPress={() => navigation.navigate('SIAEActivationCardDetail', { cardId: item.id })}
      activeOpacity={0.8}
      data-testid={`card-activation-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.cardRow}>
          <View style={[styles.cardIcon, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Ionicons name="card-outline" size={24} color={getStatusColor(item.status)} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardNumber}>{item.cardNumber}</Text>
            {item.assignedTo && (
              <Text style={styles.assignedTo}>{item.assignedTo}</Text>
            )}
            <View style={styles.cardDetails}>
              {item.activatedAt && (
                <Text style={styles.detailText}>Attivata: {formatDate(item.activatedAt)}</Text>
              )}
              {item.expiresAt && (
                <Text style={styles.detailText}>Scade: {formatDate(item.expiresAt)}</Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Tessere SIAE" showBack onBack={() => navigation.goBack()} />
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
        title="Tessere SIAE"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('SIAEActivationCardAdd')} data-testid="button-add-card">
            <Ionicons name="add-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      
      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna tessera configurata</Text>
            <Text style={styles.emptySubtext}>Aggiungi tessere SIAE per la gestione</Text>
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
  cardItem: {
    marginBottom: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  cardInfo: {
    flex: 1,
  },
  cardNumber: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  assignedTo: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  cardDetails: {
    gap: spacing.xs,
  },
  detailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
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

export default SIAEActivationCardsScreen;
