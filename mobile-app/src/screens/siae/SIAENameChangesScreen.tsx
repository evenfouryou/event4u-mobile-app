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

interface NameChange {
  id: number;
  ticketNumber: string;
  eventName: string;
  previousHolder: {
    name: string;
    fiscalCode: string;
  };
  newHolder: {
    name: string;
    fiscalCode: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt: string | null;
  processedBy: string | null;
}

export function SIAENameChangesScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nameChanges, setNameChanges] = useState<NameChange[]>([]);

  const numColumns = (isTablet || isLandscape) ? 2 : 1;

  const loadNameChanges = async () => {
    try {
      const response = await api.get<any>('/api/siae/name-changes');
      const data = response.nameChanges || response || [];
      setNameChanges(data);
    } catch (error) {
      console.error('Error loading name changes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNameChanges();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadNameChanges();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'approved':
        return colors.success;
      case 'rejected':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'In Attesa';
      case 'approved':
        return 'Approvato';
      case 'rejected':
        return 'Rifiutato';
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderNameChange = ({ item, index }: { item: NameChange; index: number }) => (
    <TouchableOpacity
      style={[
        styles.changeCard,
        numColumns === 2 && {
          width: '48%',
          marginRight: index % 2 === 0 ? '4%' : 0,
        },
      ]}
      onPress={() => navigation.navigate('SIAENameChangeDetail', { changeId: item.id })}
      activeOpacity={0.8}
      testID={`card-change-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.changeHeader}>
          <View style={styles.ticketBadge}>
            <Ionicons name="ticket-outline" size={16} color={colors.primary} />
            <Text style={styles.ticketNumber} testID={`text-ticket-number-${item.id}`}>{item.ticketNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]} testID={`text-status-${item.id}`}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.eventName} testID={`text-event-name-${item.id}`}>{item.eventName}</Text>
        
        <View style={styles.changeDetails}>
          <View style={styles.holderCard}>
            <Text style={styles.holderLabel}>Da</Text>
            <Text style={styles.holderName} testID={`text-prev-holder-${item.id}`}>{item.previousHolder.name}</Text>
            <Text style={styles.holderFiscalCode}>{item.previousHolder.fiscalCode}</Text>
          </View>
          
          <View style={styles.arrowContainer}>
            <Ionicons name="arrow-forward" size={24} color={colors.primary} />
          </View>
          
          <View style={styles.holderCard}>
            <Text style={styles.holderLabel}>A</Text>
            <Text style={styles.holderName} testID={`text-new-holder-${item.id}`}>{item.newHolder.name}</Text>
            <Text style={styles.holderFiscalCode}>{item.newHolder.fiscalCode}</Text>
          </View>
        </View>
        
        <View style={styles.changeFooter}>
          <Text style={styles.requestDate}>Richiesto: {formatDate(item.requestedAt)}</Text>
          {item.processedAt && (
            <Text style={styles.processedDate}>
              Elaborato: {formatDate(item.processedAt)}
            </Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title="Cambio Nominativo" showBack onBack={() => navigation.goBack()} />
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
        title="Cambio Nominativo"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('SIAENameChangeAdd')} testID="button-add-change">
            <Ionicons name="add-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      
      <FlatList
        data={nameChanges}
        renderItem={renderNameChange}
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
            <Ionicons name="swap-horizontal-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun cambio nominativo</Text>
            <Text style={styles.emptySubtext}>Le richieste di cambio appariranno qui</Text>
          </View>
        }
        testID="list-name-changes"
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
  changeCard: {
    marginBottom: spacing.lg,
  },
  changeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  ticketNumber: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  eventName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.lg,
  },
  changeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  holderCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  arrowContainer: {
    paddingHorizontal: spacing.md,
  },
  holderLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  holderName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  holderFiscalCode: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  changeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  requestDate: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  processedDate: {
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

export default SIAENameChangesScreen;
