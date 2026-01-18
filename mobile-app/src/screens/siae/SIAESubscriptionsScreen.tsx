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

interface Subscription {
  id: number;
  code: string;
  holderName: string;
  holderFiscalCode: string;
  type: string;
  eventsIncluded: number;
  eventsUsed: number;
  validFrom: string;
  validUntil: string;
  price: number;
  status: 'active' | 'expired' | 'suspended';
}

export function SIAESubscriptionsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const loadSubscriptions = async () => {
    try {
      const response = await api.get<any>('/api/siae/subscriptions');
      const data = response.subscriptions || response || [];
      setSubscriptions(data);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSubscriptions();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'expired':
        return colors.destructive;
      case 'suspended':
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Attivo';
      case 'expired':
        return 'Scaduto';
      case 'suspended':
        return 'Sospeso';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const renderSubscription = ({ item }: { item: Subscription }) => (
    <TouchableOpacity
      style={styles.subscriptionCard}
      onPress={() => navigation.navigate('SIAESubscriptionDetail', { subscriptionId: item.id })}
      activeOpacity={0.8}
      data-testid={`card-subscription-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.subscriptionHeader}>
          <View style={styles.codeContainer}>
            <Ionicons name="card-outline" size={20} color={colors.primary} />
            <Text style={styles.subscriptionCode}>{item.code}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.holderName}>{item.holderName}</Text>
        <Text style={styles.holderFiscalCode}>{item.holderFiscalCode}</Text>
        
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.type}</Text>
        </View>
        
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Eventi utilizzati</Text>
            <Text style={styles.progressValue}>{item.eventsUsed}/{item.eventsIncluded}</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(item.eventsUsed / item.eventsIncluded) * 100}%` }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.subscriptionFooter}>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Valido dal</Text>
            <Text style={styles.dateValue}>{formatDate(item.validFrom)}</Text>
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>Scade il</Text>
            <Text style={styles.dateValue}>{formatDate(item.validUntil)}</Text>
          </View>
          <View style={styles.priceInfo}>
            <Text style={styles.priceLabel}>Prezzo</Text>
            <Text style={styles.priceValue}>{formatCurrency(item.price)}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Abbonamenti SIAE" showBack onBack={() => navigation.goBack()} />
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
        title="Abbonamenti SIAE"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('SIAESubscriptionAdd')} data-testid="button-add-subscription">
            <Ionicons name="add-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      
      <FlatList
        data={subscriptions}
        renderItem={renderSubscription}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun abbonamento</Text>
            <Text style={styles.emptySubtext}>Gli abbonamenti venduti appariranno qui</Text>
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
  subscriptionCard: {
    marginBottom: spacing.lg,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subscriptionCode: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
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
  holderName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  holderFiscalCode: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.teal}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  typeText: {
    color: colors.teal,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  progressSection: {
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  progressValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  subscriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInfo: {
    alignItems: 'flex-start',
  },
  dateLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  dateValue: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  priceValue: {
    color: colors.primary,
    fontSize: fontSize.lg,
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

export default SIAESubscriptionsScreen;
