import React, { useState, useEffect, useMemo } from 'react';
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

type LogLevel = 'all' | 'info' | 'warning' | 'error';

interface AuditLog {
  id: number;
  action: string;
  level: 'info' | 'warning' | 'error';
  description: string;
  userId: number | null;
  userName: string | null;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export function SIAEAuditLogsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel>('all');

  const loadLogs = async () => {
    try {
      const response = await api.get<any>('/api/siae/audit-logs');
      const data = response.logs || response || [];
      setLogs(data);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  const filteredLogs = useMemo(() => {
    if (filterLevel === 'all') return logs;
    return logs.filter(log => log.level === filterLevel);
  }, [logs, filterLevel]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info':
        return colors.teal;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info':
        return 'information-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'alert-circle';
      default:
        return 'help-circle';
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
      second: '2-digit',
    });
  };

  const levelFilters: LogLevel[] = ['all', 'info', 'warning', 'error'];

  const renderFilterPill = (value: LogLevel, label: string, isActive: boolean) => (
    <TouchableOpacity
      key={value}
      style={[styles.filterPill, isActive && styles.filterPillActive]}
      onPress={() => setFilterLevel(value)}
      activeOpacity={0.8}
      data-testid={`filter-${value}`}
    >
      <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderLog = ({ item }: { item: AuditLog }) => (
    <TouchableOpacity
      style={styles.logCard}
      onPress={() => navigation.navigate('SIAEAuditLogDetail', { logId: item.id })}
      activeOpacity={0.8}
      data-testid={`card-log-${item.id}`}
    >
      <Card variant="glass">
        <View style={styles.logRow}>
          <View style={[styles.levelIndicator, { backgroundColor: getLevelColor(item.level) }]} />
          <View style={styles.logInfo}>
            <View style={styles.logHeader}>
              <View style={styles.headerLeft}>
                <Ionicons 
                  name={getLevelIcon(item.level) as any} 
                  size={18} 
                  color={getLevelColor(item.level)} 
                />
                <Text style={styles.action}>{item.action}</Text>
              </View>
              <View style={[styles.levelBadge, { backgroundColor: `${getLevelColor(item.level)}20` }]}>
                <Text style={[styles.levelText, { color: getLevelColor(item.level) }]}>
                  {item.level.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            
            <View style={styles.logMeta}>
              {item.userName && (
                <View style={styles.metaItem}>
                  <Ionicons name="person-outline" size={12} color={colors.mutedForeground} />
                  <Text style={styles.metaText}>{item.userName}</Text>
                </View>
              )}
              <View style={styles.metaItem}>
                <Ionicons name="globe-outline" size={12} color={colors.mutedForeground} />
                <Text style={styles.metaText}>{item.ipAddress}</Text>
              </View>
            </View>
            
            <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Log Operazioni" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Log Operazioni" showBack onBack={() => navigation.goBack()} />
      
      <View style={styles.filtersSection}>
        <View style={styles.filterRow}>
          {renderFilterPill('all', 'Tutti', filterLevel === 'all')}
          {renderFilterPill('info', 'Info', filterLevel === 'info')}
          {renderFilterPill('warning', 'Warning', filterLevel === 'warning')}
          {renderFilterPill('error', 'Errori', filterLevel === 'error')}
        </View>
      </View>
      
      <FlatList
        data={filteredLogs}
        renderItem={renderLog}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun log</Text>
            <Text style={styles.emptySubtext}>Le operazioni verranno registrate qui</Text>
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
  filtersSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterPillTextActive: {
    color: colors.primaryForeground,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  logCard: {
    marginBottom: spacing.md,
  },
  logRow: {
    flexDirection: 'row',
  },
  levelIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  logInfo: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  action: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  levelText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  description: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  logMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  timestamp: {
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

export default SIAEAuditLogsScreen;
