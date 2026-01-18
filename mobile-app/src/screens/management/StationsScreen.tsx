import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize } from '../../theme';
import { Card, Button, Header } from '../../components';
import { api } from '../../lib/api';

type StationStatus = 'all' | 'active' | 'inactive' | 'low-stock';

interface Station {
  id: string;
  name: string;
  locationName: string;
  type: string;
  status: 'active' | 'inactive';
  stockLevel: 'healthy' | 'medium' | 'critical';
  productsCount: number;
  staffAssigned: number;
}

const filterOptions: { key: StationStatus; label: string; icon: string }[] = [
  { key: 'all', label: 'Tutti', icon: 'apps-outline' },
  { key: 'active', label: 'Attivi', icon: 'checkmark-circle-outline' },
  { key: 'inactive', label: 'Inattivi', icon: 'close-circle-outline' },
  { key: 'low-stock', label: 'Stock Basso', icon: 'warning-outline' },
];

export function StationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [activeFilter, setActiveFilter] = useState<StationStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<any[]>('/api/stations');
      const mapped = data.map((st: any) => ({
        id: st.id?.toString() || '',
        name: st.name || '',
        locationName: st.locationName || st.location?.name || '',
        type: st.type || 'bar',
        status: st.isActive ? 'active' : 'inactive',
        stockLevel: st.stockLevel || 'healthy',
        productsCount: st.productsCount || 0,
        staffAssigned: st.staffAssigned || 0,
      }));
      setStations(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const getStockColor = (level: Station['stockLevel']) => {
    switch (level) {
      case 'healthy': return colors.success;
      case 'medium': return colors.warning;
      case 'critical': return colors.destructive;
    }
  };

  const getStockLabel = (level: Station['stockLevel']) => {
    switch (level) {
      case 'healthy': return 'Stock OK';
      case 'medium': return 'Medio';
      case 'critical': return 'Critico';
    }
  };

  const filteredStations = stations.filter((st) => {
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'active' && st.status === 'active') ||
      (activeFilter === 'inactive' && st.status === 'inactive') ||
      (activeFilter === 'low-stock' && (st.stockLevel === 'medium' || st.stockLevel === 'critical'));
    const matchesSearch =
      searchQuery === '' ||
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.locationName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const renderFilterPill = ({ item }: { item: typeof filterOptions[0] }) => (
    <TouchableOpacity
      style={[styles.filterPill, activeFilter === item.key && styles.filterPillActive]}
      onPress={() => setActiveFilter(item.key)}
      data-testid={`filter-${item.key}`}
    >
      <Ionicons
        name={item.icon as any}
        size={16}
        color={activeFilter === item.key ? colors.primaryForeground : colors.mutedForeground}
      />
      <Text style={[styles.filterPillText, activeFilter === item.key && styles.filterPillTextActive]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderStationCard = ({ item }: { item: Station }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('StationDetail', { stationId: item.id })}
      activeOpacity={0.8}
      data-testid={`card-station-${item.id}`}
      style={isLandscape ? { flex: 0.5, paddingHorizontal: spacing.xs } : undefined}
    >
      <Card style={styles.stationCard} variant="elevated">
        <View style={styles.stationHeader}>
          <View style={styles.stationIcon}>
            <Ionicons name="beer" size={24} color={colors.primary} />
          </View>
          <View style={styles.stationInfo}>
            <Text style={styles.stationName}>{item.name}</Text>
            <View style={styles.stationMeta}>
              <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.stationLocation}>{item.locationName}</Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? colors.success : colors.mutedForeground }]} />
            <View style={[styles.stockBadge, { backgroundColor: `${getStockColor(item.stockLevel)}20` }]}>
              <Text style={[styles.stockText, { color: getStockColor(item.stockLevel) }]}>
                {getStockLabel(item.stockLevel)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.stationStats}>
          <View style={styles.statItem}>
            <Ionicons name="wine-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.statText}>{item.productsCount} prodotti</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.statText}>{item.staffAssigned} staff</Text>
          </View>
        </View>

        <View style={styles.stockIndicator}>
          <View style={styles.stockBarBackground}>
            <View
              style={[
                styles.stockBarFill,
                {
                  width: item.stockLevel === 'healthy' ? '80%' : item.stockLevel === 'medium' ? '40%' : '15%',
                  backgroundColor: getStockColor(item.stockLevel),
                },
              ]}
            />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Stazioni Bar"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateStation')}
            data-testid="button-add-station"
          >
            <Ionicons name="add" size={24} color={colors.primaryForeground} />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca stazioni..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            data-testid="input-search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filterOptions}
        renderItem={renderFilterPill}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Riprova" onPress={loadStations} style={styles.retryButton} />
        </View>
      ) : filteredStations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="beer-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuna stazione trovata</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStations}
          renderItem={renderStationCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          numColumns={isLandscape ? 2 : 1}
          key={isLandscape ? 'landscape' : 'portrait'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  stationCard: {
    marginBottom: spacing.md,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  stationName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
  },
  stationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
    gap: spacing.xs,
  },
  stationLocation: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 8,
  },
  stockText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  stationStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  stockIndicator: {
    marginTop: spacing.md,
  },
  stockBarBackground: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  stockBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.destructive,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.mutedForeground,
  },
  retryButton: {
    marginTop: spacing.lg,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
