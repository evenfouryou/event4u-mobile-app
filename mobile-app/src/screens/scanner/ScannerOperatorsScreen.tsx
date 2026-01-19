import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Header, Card } from '../../components';

interface ScannerOperator {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'online' | 'offline';
  isActive: boolean;
  assignedEvents: { id: string; title: string }[];
  permissions: {
    scanEntry: boolean;
    scanExit: boolean;
    manualCheckIn: boolean;
  };
  scansToday: number;
  lastActive?: string;
}

export function ScannerOperatorsScreen() {
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const [searchQuery, setSearchQuery] = useState('');

  const numColumns = (isTablet || isLandscape) ? 2 : 1;
  const contentMaxWidth = isTablet ? 1200 : undefined;

  const { data: operators, isLoading, refetch, isRefetching } = useQuery<ScannerOperator[]>({
    queryKey: ['/api/scanners'],
  });

  const handleAddOperator = useCallback(() => {
    navigation.navigate('OperatorDetail', { mode: 'create' });
  }, [navigation]);

  const handleOperatorPress = useCallback((operator: ScannerOperator) => {
    navigation.navigate('OperatorDetail', { operatorId: operator.id, mode: 'edit' });
  }, [navigation]);

  const getStatusColor = (status: string) => {
    return status === 'online' ? colors.success : colors.mutedForeground;
  };

  const filteredOperators = (operators || []).filter(op =>
    op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    op.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = (operators || []).filter(op => op.status === 'online').length;
  const totalCount = (operators || []).length;

  const renderOperatorItem = useCallback(({ item, index }: { item: ScannerOperator; index: number }) => (
    <TouchableOpacity
      style={[
        styles.operatorCard,
        numColumns === 2 && {
          flex: 1,
          marginLeft: index % 2 === 1 ? spacing.sm : 0,
          marginRight: index % 2 === 0 ? spacing.sm : 0,
        },
      ]}
      onPress={() => handleOperatorPress(item)}
      activeOpacity={0.7}
      testID={`button-operator-${item.id}`}
    >
      <View style={styles.operatorHeader}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.emerald + '20' }]}>
            <Text style={styles.avatarText}>
              {item.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
        </View>
        
        <View style={styles.operatorInfo}>
          <View style={styles.operatorNameRow}>
            <Text style={styles.operatorName}>{item.name}</Text>
            {!item.isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inattivo</Text>
              </View>
            )}
          </View>
          <Text style={styles.operatorEmail}>{item.email}</Text>
          <View style={styles.operatorStats}>
            <View style={styles.statItem}>
              <Ionicons name="scan-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.statText}>{item.scansToday} oggi</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.statText}>{item.assignedEvents.length} eventi</Text>
            </View>
          </View>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
      </View>
      
      {item.assignedEvents.length > 0 && (
        <View style={styles.eventsContainer}>
          {item.assignedEvents.slice(0, 3).map((event) => (
            <View key={event.id} style={styles.eventTag}>
              <Text style={styles.eventTagText} numberOfLines={1}>{event.title}</Text>
            </View>
          ))}
          {item.assignedEvents.length > 3 && (
            <View style={[styles.eventTag, styles.eventTagMore]}>
              <Text style={styles.eventTagText}>+{item.assignedEvents.length - 3}</Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.permissionsRow}>
        {item.permissions.scanEntry && (
          <View style={[styles.permissionBadge, styles.permissionEnabled]}>
            <Ionicons name="enter-outline" size={12} color={colors.teal} />
            <Text style={[styles.permissionText, { color: colors.teal }]}>Entrata</Text>
          </View>
        )}
        {item.permissions.scanExit && (
          <View style={[styles.permissionBadge, styles.permissionEnabled]}>
            <Ionicons name="exit-outline" size={12} color={colors.teal} />
            <Text style={[styles.permissionText, { color: colors.teal }]}>Uscita</Text>
          </View>
        )}
        {item.permissions.manualCheckIn && (
          <View style={[styles.permissionBadge, styles.permissionEnabled]}>
            <Ionicons name="create-outline" size={12} color={colors.teal} />
            <Text style={[styles.permissionText, { color: colors.teal }]}>Manuale</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), [handleOperatorPress, numColumns]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.contentWrapper, contentMaxWidth && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <Header
          title="Operatori Scanner"
          showBack
          onBack={() => navigation.goBack()}
          rightAction={
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddOperator}
              testID="button-add-operator"
            >
              <Ionicons name="add" size={24} color={colors.emeraldForeground} />
            </TouchableOpacity>
          }
        />

        <View style={[styles.statsBar, isLandscape && styles.statsBarLandscape]}>
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="radio-button-on" size={16} color={colors.success} />
            </View>
            <Text style={styles.statValue} testID="text-online-count">{onlineCount}</Text>
            <Text style={styles.statLabel}>Online</Text>
          </Card>
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.emerald + '20' }]}>
              <Ionicons name="people" size={16} color={colors.emerald} />
            </View>
            <Text style={styles.statValue} testID="text-total-count">{totalCount}</Text>
            <Text style={styles.statLabel}>Totali</Text>
          </Card>
        </View>

        <FlatList
          key={numColumns}
          data={filteredOperators}
          renderItem={renderOperatorItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.emerald}
              testID="refresh-control"
            />
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.loadingContainer}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={styles.skeletonCard} />
                ))}
              </View>
            ) : (
              <Card style={styles.emptyCard}>
                <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
                <Text style={styles.emptyTitle}>Nessun operatore</Text>
                <Text style={styles.emptyText}>
                  Aggiungi operatori per gestire la scansione dei biglietti
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={handleAddOperator}
                  testID="button-add-operator-empty"
                >
                  <Ionicons name="add" size={20} color={colors.emeraldForeground} />
                  <Text style={styles.emptyButtonText}>Aggiungi Operatore</Text>
                </TouchableOpacity>
              </Card>
            )
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          testID="list-operators"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentWrapper: {
    flex: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  statsBarLandscape: {
    paddingHorizontal: spacing.xl,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  list: {
    padding: spacing.lg,
  },
  operatorCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  operatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.emerald,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.card,
  },
  operatorInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  operatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  operatorName: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  inactiveBadge: {
    backgroundColor: colors.destructive + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  inactiveBadgeText: {
    color: colors.destructive,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  operatorEmail: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
  },
  operatorStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  statText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  eventsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  eventTag: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    maxWidth: 120,
  },
  eventTagMore: {
    backgroundColor: colors.emerald + '20',
  },
  eventTagText: {
    color: colors.foreground,
    fontSize: fontSize.xs,
  },
  permissionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
  },
  permissionEnabled: {
    backgroundColor: colors.teal + '15',
  },
  permissionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  separator: {
    height: spacing.md,
  },
  loadingContainer: {
    gap: spacing.md,
  },
  skeletonCard: {
    height: 160,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    marginTop: spacing.xl,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.emerald,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  emptyButtonText: {
    color: colors.emeraldForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
