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

interface Table {
  id: number;
  name: string;
  seats: number;
  section: string;
  status: 'available' | 'occupied' | 'reserved';
}

export function SIAETablesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);

  const loadTables = async () => {
    try {
      const response = await api.get<any>('/api/siae/tables');
      const data = response.tables || response || [];
      setTables(data);
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTables();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return colors.success;
      case 'occupied':
        return colors.destructive;
      case 'reserved':
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponibile';
      case 'occupied':
        return 'Occupato';
      case 'reserved':
        return 'Riservato';
      default:
        return status;
    }
  };

  const renderTable = ({ item }: { item: Table }) => (
    <TouchableOpacity
      style={styles.tableCard}
      onPress={() => navigation.navigate('SIAETableDetail', { tableId: item.id })}
      activeOpacity={0.8}
      data-testid={`card-table-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.tableRow}>
          <View style={[styles.tableIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="grid-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.tableInfo}>
            <Text style={styles.tableName}>{item.name}</Text>
            <View style={styles.tableDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.detailText}>{item.seats} posti</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.detailText}>{item.section}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
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
        <Header title="Gestione Tavoli" showBack onBack={() => navigation.goBack()} />
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
        title="Gestione Tavoli"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('SIAETableAdd')} data-testid="button-add-table">
            <Ionicons name="add-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      
      <FlatList
        data={tables}
        renderItem={renderTable}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="grid-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun tavolo configurato</Text>
            <Text style={styles.emptySubtext}>Aggiungi tavoli per gestire la capienza</Text>
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
  tableCard: {
    marginBottom: spacing.md,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  tableInfo: {
    flex: 1,
  },
  tableName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  tableDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
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

export default SIAETablesScreen;
