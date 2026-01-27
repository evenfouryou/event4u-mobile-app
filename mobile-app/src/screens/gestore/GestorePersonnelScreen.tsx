import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { Personnel } from '@/lib/api';

type RoleFilter = 'all' | 'bartender' | 'security' | 'promoter';

interface GestorePersonnelScreenProps {
  onBack: () => void;
}

export function GestorePersonnelScreen({ onBack }: GestorePersonnelScreenProps) {
  const { colors } = useTheme();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<RoleFilter>('all');

  useEffect(() => {
    loadPersonnel();
  }, [activeFilter]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadPersonnel = async () => {
    try {
      setIsLoading(true);
      const data = await api.getGestorePersonnel(activeFilter);
      setPersonnel(data);
    } catch (error) {
      console.error('Error loading personnel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPersonnel();
    setRefreshing(false);
  };

  const handleCall = (phone?: string) => {
    if (phone) {
      triggerHaptic('light');
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleMessage = (phone?: string) => {
    if (phone) {
      triggerHaptic('light');
      Linking.openURL(`sms:${phone}`);
    }
  };

  const filters: { id: RoleFilter; label: string }[] = [
    { id: 'all', label: 'Tutto il Personale' },
    { id: 'bartender', label: 'Baristi' },
    { id: 'security', label: 'Sicurezza' },
    { id: 'promoter', label: 'Promoter' },
  ];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'bartender':
        return 'Barista';
      case 'security':
        return 'Sicurezza';
      case 'promoter':
        return 'Promoter';
      case 'scanner':
        return 'Scanner';
      case 'cashier':
        return 'Cassiere';
      default:
        return 'Staff';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'bartender':
        return staticColors.teal;
      case 'security':
        return staticColors.destructive;
      case 'promoter':
        return staticColors.primary;
      case 'scanner':
        return staticColors.success;
      case 'cashier':
        return staticColors.golden;
      default:
        return staticColors.mutedForeground;
    }
  };

  const renderRatingBadge = (rating?: number) => {
    if (!rating) return null;
    return (
      <View style={styles.ratingBadge}>
        <Ionicons name="star" size={12} color={staticColors.golden} />
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  const filteredPersonnel = activeFilter === 'all'
    ? personnel
    : personnel.filter(p => p.role === activeFilter);

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-personnel"
      />

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
        <View style={styles.headerSection}>
          <Text style={styles.title}>Gestione Personale</Text>
          <Text style={styles.subtitle}>{filteredPersonnel.length} membri del personale</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {filters.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => {
                triggerHaptic('selection');
                setActiveFilter(filter.id);
              }}
              style={[
                styles.filterChip,
                activeFilter === filter.id && styles.filterChipActive,
              ]}
              testID={`filter-${filter.id}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === filter.id && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {showLoader ? (
          <Loading text="Caricamento personale..." />
        ) : (
          <View style={styles.personnelList}>
            {filteredPersonnel.length > 0 ? (
              filteredPersonnel.map((person) => (
                <Card key={person.id} style={styles.personnelCard} testID={`personnel-${person.id}`}>
                  <View style={styles.personnelContent}>
                    <Avatar
                      name={person.name}
                      source={person.avatarUrl}
                      size="lg"
                    />
                    <View style={styles.personnelInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.personnelName}>{person.name}</Text>
                        {renderRatingBadge(person.rating)}
                      </View>
                      <View style={styles.roleRow}>
                        <Badge
                          variant="outline"
                          style={{ borderColor: getRoleColor(person.role) }}
                        >
                          <Text style={[styles.roleBadgeText, { color: getRoleColor(person.role) }]}>
                            {getRoleLabel(person.role)}
                          </Text>
                        </Badge>
                        {person.status === 'active' ? (
                          <Badge variant="success">
                            <Text style={styles.statusBadgeText}>Attivo</Text>
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Text style={styles.statusBadgeText}>Inattivo</Text>
                          </Badge>
                        )}
                      </View>
                      <View style={styles.detailsRow}>
                        {person.phone && (
                          <Text style={styles.phoneText}>
                            <Ionicons name="call-outline" size={12} color={staticColors.mutedForeground} />
                            {' '}{person.phone}
                          </Text>
                        )}
                        <Text style={styles.eventsText}>
                          <Ionicons name="calendar-outline" size={12} color={staticColors.mutedForeground} />
                          {' '}{person.eventsAssigned} eventi
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.actionsRow}>
                    <Pressable
                      onPress={() => handleCall(person.phone)}
                      style={[styles.actionButton, !person.phone && styles.actionButtonDisabled]}
                      testID={`call-${person.id}`}
                      disabled={!person.phone}
                    >
                      <Ionicons
                        name="call"
                        size={18}
                        color={person.phone ? staticColors.success : staticColors.mutedForeground}
                      />
                      <Text style={[styles.actionText, { color: person.phone ? staticColors.success : staticColors.mutedForeground }]}>
                        Chiama
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleMessage(person.phone)}
                      style={[styles.actionButton, !person.phone && styles.actionButtonDisabled]}
                      testID={`message-${person.id}`}
                      disabled={!person.phone}
                    >
                      <Ionicons
                        name="chatbubble"
                        size={18}
                        color={person.phone ? staticColors.teal : staticColors.mutedForeground}
                      />
                      <Text style={[styles.actionText, { color: person.phone ? staticColors.teal : staticColors.mutedForeground }]}>
                        Messaggio
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        triggerHaptic('light');
                      }}
                      style={styles.actionButton}
                      testID={`assign-${person.id}`}
                    >
                      <Ionicons name="add-circle" size={18} color={staticColors.primary} />
                      <Text style={[styles.actionText, { color: staticColors.primary }]}>
                        Assegna
                      </Text>
                    </Pressable>
                  </View>
                </Card>
              ))
            ) : (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
                  <Text style={styles.emptyTitle}>Nessun personale trovato</Text>
                  <Text style={styles.emptyText}>
                    Non ci sono membri del personale in questa categoria
                  </Text>
                </View>
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: staticColors.primary,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  filterChipTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  personnelList: {
    paddingHorizontal: spacing.lg,
  },
  personnelCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  personnelContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  personnelInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  personnelName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${staticColors.golden}20`,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  ratingText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: staticColors.golden,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  roleBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  phoneText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  eventsText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  emptyCard: {
    padding: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
});

export default GestorePersonnelScreen;
