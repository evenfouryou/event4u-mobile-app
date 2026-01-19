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

interface Resale {
  id: number;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  isActive: boolean;
  ticketsSold: number;
  commission: number;
  lastSaleAt: string | null;
}

export function SIAEResalesScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resales, setResales] = useState<Resale[]>([]);

  const numColumns = (isTablet || isLandscape) ? 2 : 1;

  const loadResales = async () => {
    try {
      const response = await api.get<any>('/api/siae/resales');
      const data = response.resales || response || [];
      setResales(data);
    } catch (error) {
      console.error('Error loading resales:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadResales();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadResales();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Mai';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderResale = ({ item, index }: { item: Resale; index: number }) => (
    <TouchableOpacity
      style={[
        styles.resaleCard,
        numColumns === 2 && {
          flex: 1,
          marginLeft: index % 2 === 1 ? spacing.sm : 0,
          marginRight: index % 2 === 0 ? spacing.sm : 0,
        }
      ]}
      onPress={() => navigation.navigate('SIAEResaleDetail', { resaleId: item.id })}
      activeOpacity={0.8}
      testID={`card-resale-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.resaleHeader}>
          <View style={[styles.resaleIcon, { backgroundColor: item.isActive ? `${colors.success}20` : `${colors.mutedForeground}20` }]}>
            <Ionicons 
              name="storefront-outline" 
              size={24} 
              color={item.isActive ? colors.success : colors.mutedForeground} 
            />
          </View>
          <View style={styles.resaleInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.resaleName}>{item.name}</Text>
              {!item.isActive && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveText}>Inattivo</Text>
                </View>
              )}
            </View>
            <Text style={styles.resaleCode}>Codice: {item.code}</Text>
          </View>
        </View>
        
        <View style={styles.resaleDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>{item.address}, {item.city}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>{item.phone}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.ticketsSold}</Text>
            <Text style={styles.statLabel}>Biglietti</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.teal }]}>{item.commission}%</Text>
            <Text style={styles.statLabel}>Commissione</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDate(item.lastSaleAt)}</Text>
            <Text style={styles.statLabel}>Ultima Vendita</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Rivendite Autorizzate" showBack onBack={() => navigation.goBack()} />
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
        title="Rivendite Autorizzate"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('SIAEResaleAdd')} testID="button-add-resale">
            <Ionicons name="add-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      
      <FlatList
        key={numColumns}
        data={resales}
        renderItem={renderResale}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary}
            testID="refresh-control"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna rivendita</Text>
            <Text style={styles.emptySubtext}>Aggiungi punti vendita autorizzati</Text>
          </View>
        }
        testID="resales-list"
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
    paddingBottom: spacing.xl,
  },
  resaleCard: {
    marginBottom: spacing.lg,
  },
  resaleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  resaleIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  resaleInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  resaleName: {
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
  resaleCode: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  resaleDetails: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
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

export default SIAEResalesScreen;
