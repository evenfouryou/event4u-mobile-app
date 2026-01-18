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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Sector {
  id: number;
  name: string;
  code: string;
  rows: number;
  seatsPerRow: number;
  totalSeats: number;
  availableSeats: number;
  priceCategory: string;
}

interface Seat {
  id: number;
  sectorId: number;
  sectorName: string;
  row: string;
  number: number;
  status: 'available' | 'reserved' | 'sold' | 'blocked';
  ticketId: number | null;
  holderName: string | null;
}

export function SIAENumberedSeatsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  
  const eventId = route.params?.eventId;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);

  const loadSectors = async () => {
    try {
      const endpoint = eventId 
        ? `/api/siae/events/${eventId}/sectors`
        : '/api/siae/sectors';
      const response = await api.get<any>(endpoint);
      const data = response.sectors || response || [];
      setSectors(data);
    } catch (error) {
      console.error('Error loading sectors:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSeats = async (sectorId: number) => {
    try {
      const response = await api.get<any>(`/api/siae/sectors/${sectorId}/seats`);
      const data = response.seats || response || [];
      setSeats(data);
    } catch (error) {
      console.error('Error loading seats:', error);
    }
  };

  useEffect(() => {
    loadSectors();
  }, [eventId]);

  useEffect(() => {
    if (selectedSector) {
      loadSeats(selectedSector.id);
    }
  }, [selectedSector]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSectors();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return colors.success;
      case 'reserved':
        return colors.warning;
      case 'sold':
        return colors.primary;
      case 'blocked':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponibile';
      case 'reserved':
        return 'Riservato';
      case 'sold':
        return 'Venduto';
      case 'blocked':
        return 'Bloccato';
      default:
        return status;
    }
  };

  const renderSector = ({ item }: { item: Sector }) => (
    <TouchableOpacity
      style={styles.sectorCard}
      onPress={() => setSelectedSector(item)}
      activeOpacity={0.8}
      data-testid={`card-sector-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.sectorHeader}>
          <View style={styles.sectorInfo}>
            <Text style={styles.sectorName}>{item.name}</Text>
            <Text style={styles.sectorCode}>Codice: {item.code}</Text>
          </View>
          <View style={styles.sectorStats}>
            <Text style={styles.availableCount}>{item.availableSeats}</Text>
            <Text style={styles.totalCount}>/ {item.totalSeats}</Text>
          </View>
        </View>
        
        <View style={styles.sectorDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="grid-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>{item.rows} file</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="resize-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>{item.seatsPerRow} posti/fila</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="pricetag-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.detailText}>{item.priceCategory}</Text>
          </View>
        </View>
        
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${((item.totalSeats - item.availableSeats) / item.totalSeats) * 100}%`,
                backgroundColor: item.availableSeats > 0 ? colors.primary : colors.destructive
              }
            ]} 
          />
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderSeat = ({ item }: { item: Seat }) => (
    <TouchableOpacity
      style={[
        styles.seatItem,
        { backgroundColor: `${getStatusColor(item.status)}30` }
      ]}
      onPress={() => {
        if (item.status === 'available') {
          navigation.navigate('SIAESeatSelect', { seatId: item.id, eventId });
        } else if (item.ticketId) {
          navigation.navigate('SIAETicketDetail', { ticketId: item.ticketId });
        }
      }}
      activeOpacity={0.8}
      data-testid={`seat-${item.id}`}
    >
      <Text style={[styles.seatNumber, { color: getStatusColor(item.status) }]}>
        {item.row}{item.number}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Posti Numerati" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  if (selectedSector) {
    return (
      <View style={styles.container}>
        <Header 
          title={selectedSector.name} 
          showBack 
          onBack={() => {
            setSelectedSector(null);
            setSeats([]);
          }} 
        />
        
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Disponibile</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.legendText}>Riservato</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Venduto</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.destructive }]} />
            <Text style={styles.legendText}>Bloccato</Text>
          </View>
        </View>
        
        <FlatList
          data={seats}
          renderItem={renderSeat}
          keyExtractor={(item) => item.id.toString()}
          numColumns={10}
          contentContainerStyle={[styles.seatsGrid, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="grid-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>Nessun posto configurato</Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Posti Numerati"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('SIAESectorAdd', { eventId })} data-testid="button-add-sector">
            <Ionicons name="add-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      
      <FlatList
        data={sectors}
        renderItem={renderSector}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="grid-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun settore configurato</Text>
            <Text style={styles.emptySubtext}>Configura i settori per i posti numerati</Text>
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
  sectorCard: {
    marginBottom: spacing.lg,
  },
  sectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sectorInfo: {
    flex: 1,
  },
  sectorName: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  sectorCode: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  sectorStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  availableCount: {
    color: colors.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  totalCount: {
    color: colors.mutedForeground,
    fontSize: fontSize.lg,
  },
  sectorDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
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
  progressBar: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  seatsGrid: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  seatItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: '10%',
  },
  seatNumber: {
    fontSize: fontSize.xs,
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

export default SIAENumberedSeatsScreen;
