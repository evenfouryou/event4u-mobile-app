import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { GreetingHeader } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { ScannerEvent, ScannerStats } from '@/lib/api';

interface ScannerDashboardProps {
  onNavigateEvents: () => void;
  onNavigateScan: (eventId: string) => void;
  onNavigateProfile: () => void;
  onSwitchToClient: () => void;
  onLogout: () => void;
}

export function ScannerDashboard({
  onNavigateEvents,
  onNavigateScan,
  onNavigateProfile,
  onSwitchToClient,
  onLogout,
}: ScannerDashboardProps) {
  const { user, logout } = useAuth();
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<ScannerEvent[]>([]);
  const [stats, setStats] = useState<ScannerStats>({ totalScans: 0, todayScans: 0, eventsAssigned: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, statsData] = await Promise.all([
        api.getScannerEvents(),
        api.getScannerStats(),
      ]);
      setEvents(eventsData.slice(0, 3));
      setStats(statsData);
    } catch (error) {
      console.error('Error loading scanner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleLogout = async () => {
    triggerHaptic('medium');
    await logout();
    onLogout();
  };

  if (loading) {
    return <Loading text="Caricamento..." />;
  }

  return (
    <SafeArea edges={['bottom']} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }])}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <GreetingHeader
          name={user?.firstName || 'Scanner'}
          email="Scanner Dashboard"
        />

        <View style={styles.content}>
          <GlassCard style={styles.statsCard}>
            <LinearGradient
              colors={[...gradients.teal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsGradient}
            >
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.todayScans}</Text>
                  <Text style={styles.statLabel}>Scansioni Oggi</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalScans}</Text>
                  <Text style={styles.statLabel}>Totale Scansioni</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.eventsAssigned}</Text>
                  <Text style={styles.statLabel}>Eventi</Text>
                </View>
              </View>
            </LinearGradient>
          </GlassCard>

          <View style={styles.quickActions}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Azioni Rapide</Text>
            <View style={styles.actionGrid}>
              <Pressable
                style={styles.actionCard}
                onPress={() => events[0] && onNavigateScan(events[0].eventId)}
              >
                <LinearGradient
                  colors={[...gradients.golden]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionGradient}
                >
                  <Ionicons name="scan" size={32} color={staticColors.primaryForeground} />
                  <Text style={styles.actionLabel}>Scansiona</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.actionCard} onPress={onNavigateEvents}>
                <LinearGradient
                  colors={[...gradients.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionGradient}
                >
                  <Ionicons name="calendar" size={32} color={staticColors.primaryForeground} />
                  <Text style={styles.actionLabel}>Eventi</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.actionCard} onPress={onNavigateProfile}>
                <LinearGradient
                  colors={[...gradients.blue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionGradient}
                >
                  <Ionicons name="person" size={32} color={staticColors.primaryForeground} />
                  <Text style={styles.actionLabel}>Profilo</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.actionCard} onPress={onSwitchToClient}>
                <LinearGradient
                  colors={[...gradients.pink]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionGradient}
                >
                  <Ionicons name="swap-horizontal" size={32} color={staticColors.primaryForeground} />
                  <Text style={styles.actionLabel}>Area Cliente</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          {events.length > 0 && (
            <View style={styles.eventsSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Prossimi Eventi</Text>
                <Pressable onPress={onNavigateEvents}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>Vedi tutti</Text>
                </Pressable>
              </View>

              {events.map((event) => (
                <Pressable
                  key={event.id}
                  onPress={() => {
                    triggerHaptic('light');
                    onNavigateScan(event.eventId);
                  }}
                >
                  <Card style={styles.eventCard}>
                    <View style={styles.eventContent}>
                      {event.eventImageUrl ? (
                        <Image source={{ uri: event.eventImageUrl }} style={styles.eventImage} />
                      ) : (
                        <View style={[styles.eventImagePlaceholder, { backgroundColor: colors.secondary }]}>
                          <Ionicons name="calendar" size={24} color={colors.mutedForeground} />
                        </View>
                      )}
                      <View style={styles.eventInfo}>
                        <Text style={[styles.eventName, { color: colors.foreground }]} numberOfLines={1}>
                          {event.eventName}
                        </Text>
                        <View style={styles.eventMeta}>
                          <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                          <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {event.locationName}
                          </Text>
                        </View>
                        <View style={styles.eventMeta}>
                          <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                          <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]}>
                            {formatDate(event.eventStart)} - {formatTime(event.eventStart)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.eventStats}>
                        <Badge variant="success">
                          <Text style={styles.badgeText}>{event.checkedIn}/{event.totalGuests}</Text>
                        </Badge>
                        <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.logoutSection}>
            <Button variant="ghost" onPress={handleLogout} testID="button-logout">
              <Text style={[styles.logoutText, { color: colors.destructive }]}>Esci</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  statsCard: {
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
  },
  statsGradient: {
    padding: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.primaryForeground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  quickActions: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    width: '47%',
    aspectRatio: 1.3,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  actionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  eventsSection: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  eventCard: {
    marginBottom: spacing.sm,
  },
  eventContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
  },
  eventImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  eventName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventMetaText: {
    fontSize: typography.fontSize.xs,
    flex: 1,
  },
  eventStats: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.primaryForeground,
  },
  logoutSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
  },
});
