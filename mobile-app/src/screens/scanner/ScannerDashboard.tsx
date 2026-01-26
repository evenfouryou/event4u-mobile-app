import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors as staticColors, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ActionCard } from '@/components/ActionCard';
import { Loading } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { ScannerEvent, ScannerStats } from '@/lib/api';

interface ScannerDashboardProps {
  onNavigateEvents: () => void;
  onNavigateScan: (eventId: string) => void;
  onNavigateProfile: () => void;
  onLogout: () => void;
}

export function ScannerDashboard({
  onNavigateEvents,
  onNavigateScan,
  onNavigateProfile,
  onLogout,
}: ScannerDashboardProps) {
  const { user, logout } = useAuth();
  const { colors, gradients, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<ScannerEvent[]>([]);
  const [stats, setStats] = useState<ScannerStats>({ totalScans: 0, todayScans: 0, eventsAssigned: 0 });
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [eventsData, statsData] = await Promise.all([
        api.getScannerEvents(),
        api.getScannerStats(),
      ]);
      setEvents(eventsData.slice(0, 3));
      setStats(statsData);
    } catch (error) {
      console.error('Error loading scanner data:', error);
    } finally {
      setIsLoading(false);
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

  if (showLoader) {
    return <Loading text="Caricamento..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Badge variant="teal" style={styles.scannerBadge}>
            <Text style={styles.scannerBadgeText}>SCANNER</Text>
          </Badge>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Dashboard</Text>
        </View>
        <Pressable
          onPress={onNavigateProfile}
          style={[styles.profileButton, { backgroundColor: colors.card }]}
          testID="button-profile"
        >
          <Ionicons name="person" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: colors.mutedForeground }]}>Ciao,</Text>
          <Text style={[styles.userName, { color: colors.foreground }]}>{user?.firstName || 'Scanner'}</Text>
        </View>

        <View style={styles.statsCard}>
          <LinearGradient
            colors={[...gradients.teal]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsGradient}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.todayScans}</Text>
                <Text style={styles.statLabel}>Oggi</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalScans}</Text>
                <Text style={styles.statLabel}>Totali</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.eventsAssigned}</Text>
                <Text style={styles.statLabel}>Eventi</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Azioni Rapide</Text>
          <View style={styles.actionRow}>
            <ActionCard
              icon="scan"
              label="Scansiona"
              gradient="golden"
              onPress={() => {
                if (events.length === 0) {
                  Alert.alert('Nessun Evento', 'Non hai eventi assegnati. Contatta il gestore per essere assegnato a un evento.');
                } else if (events.length === 1) {
                  onNavigateScan(events[0].eventId);
                } else {
                  onNavigateEvents();
                }
              }}
              testID="action-scan"
            />
            <ActionCard
              icon="calendar"
              label="Eventi"
              gradient="purple"
              onPress={onNavigateEvents}
              testID="action-events"
            />
          </View>
          <View style={styles.actionRow}>
            <ActionCard
              icon="person"
              label="Profilo"
              gradient="blue"
              onPress={onNavigateProfile}
              testID="action-profile"
            />
            <ActionCard
              icon="log-out"
              label="Esci"
              gradient="pink"
              onPress={handleLogout}
              testID="action-logout"
            />
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
                testID={`event-${event.id}`}
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

        {events.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Nessun evento assegnato
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Contatta il gestore per essere assegnato a un evento
            </Text>
          </View>
        )}

        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scannerBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  scannerBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: staticColors.primaryForeground,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  welcomeSection: {
    gap: spacing.xs,
  },
  welcomeText: {
    fontSize: typography.fontSize.sm,
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
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
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: staticColors.primaryForeground,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  actionsSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
