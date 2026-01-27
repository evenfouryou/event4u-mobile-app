import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { ScannerOperator } from '@/lib/api';

interface ManagerScannerScreenProps {
  onBack: () => void;
}

export function ManagerScannerScreen({ onBack }: ManagerScannerScreenProps) {
  const { colors } = useTheme();
  const [operators, setOperators] = useState<ScannerOperator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOperators();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadOperators = async () => {
    try {
      setIsLoading(true);
      const data = await api.getManagerScannerOperators();
      setOperators(data);
    } catch (error) {
      console.error('Error loading scanner operators:', error);
      setOperators([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOperators();
    setRefreshing(false);
  };

  const activeOperators = operators.filter(op => op.isActive);
  const totalScans = operators.reduce((sum, op) => sum + (op.totalScans || 0), 0);

  const renderOperator = ({ item }: { item: ScannerOperator }) => (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
      }}
    >
      <Card style={styles.operatorCard} testID={`operator-${item.id}`}>
        <View style={styles.operatorContent}>
          <Avatar
            name={item.name}
            size="md"
            testID={`avatar-${item.id}`}
          />
          <View style={styles.operatorInfo}>
            <Text style={styles.operatorName}>{item.name}</Text>
            <Text style={styles.operatorEmail}>{item.email || '-'}</Text>
            <View style={styles.operatorMeta}>
              <Ionicons name="scan-outline" size={14} color={colors.mutedForeground} />
              <Text style={styles.operatorMetaText}>{item.totalScans || 0} scansioni</Text>
            </View>
          </View>
          <View style={styles.operatorActions}>
            <Badge variant={item.isActive ? 'success' : 'secondary'}>
              {item.isActive ? 'Attivo' : 'Inattivo'}
            </Badge>
            <Text style={styles.operatorEvents}>{item.eventsCount || 0} eventi</Text>
          </View>
        </View>

        {item.permissions && item.permissions.length > 0 && (
          <>
            <View style={styles.operatorDivider} />
            <View style={styles.permissionsRow}>
              <Text style={styles.permissionsLabel}>Permessi:</Text>
              <View style={styles.permissionsTags}>
                {item.permissions.slice(0, 3).map((perm, index) => (
                  <Badge key={index} variant="outline" style={styles.permissionTag}>
                    {perm}
                  </Badge>
                ))}
                {item.permissions.length > 3 && (
                  <Text style={styles.morePermissions}>+{item.permissions.length - 3}</Text>
                )}
              </View>
            </View>
          </>
        )}
      </Card>
    </Pressable>
  );

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-scanner"
      />

      <View style={styles.statsContainer}>
        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="people" size={24} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue}>{operators.length}</Text>
          <Text style={styles.statLabel}>Operatori</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.success}20` }]}>
            <Ionicons name="checkmark-circle" size={24} color={staticColors.success} />
          </View>
          <Text style={styles.statValue}>{activeOperators.length}</Text>
          <Text style={styles.statLabel}>Attivi</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
            <Ionicons name="scan" size={24} color={staticColors.teal} />
          </View>
          <Text style={styles.statValue}>{totalScans}</Text>
          <Text style={styles.statLabel}>Scansioni</Text>
        </GlassCard>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Operatori Scanner</Text>
      </View>

      {showLoader ? (
        <Loading text="Caricamento operatori..." />
      ) : operators.length > 0 ? (
        <FlatList
          data={operators}
          renderItem={renderOperator}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="scan-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Nessun operatore scanner</Text>
          <Text style={styles.emptyText}>Aggiungi operatori scanner dal pannello web</Text>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  operatorCard: {
    padding: spacing.md,
  },
  operatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  operatorInfo: {
    flex: 1,
  },
  operatorName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  operatorEmail: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  operatorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  operatorMetaText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  operatorActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  operatorEvents: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  operatorDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  permissionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  permissionsLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  permissionsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
  },
  permissionTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  morePermissions: {
    fontSize: typography.fontSize.xs,
    color: staticColors.primary,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: staticColors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default ManagerScannerScreen;
