import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows, gradients } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { GreetingHeader } from '@/components/Header';
import { ActionCard } from '@/components/ActionCard';
import { useAuth } from '@/contexts/AuthContext';
import { triggerHaptic } from '@/lib/haptics';

interface AccountDashboardProps {
  onNavigateTickets: () => void;
  onNavigateWallet: () => void;
  onNavigateProfile: () => void;
  onNavigateEvents: () => void;
  onNavigateResales: () => void;
  onNavigateSettings: () => void;
  onLogout: () => void;
  onGoBack: () => void;
}

export function AccountDashboard({
  onNavigateTickets,
  onNavigateWallet,
  onNavigateProfile,
  onNavigateEvents,
  onNavigateResales,
  onNavigateSettings,
  onLogout,
  onGoBack,
}: AccountDashboardProps) {
  const { user } = useAuth();

  const walletBalance = 125.0;
  const upcomingTickets = [
    {
      id: '1',
      eventName: 'Saturday Night Fever',
      date: new Date('2026-02-01T23:00:00'),
      location: 'Club XYZ',
      ticketType: 'VIP',
    },
    {
      id: '2',
      eventName: 'DJ Set Special',
      date: new Date('2026-02-08T22:00:00'),
      location: 'Disco Palace',
      ticketType: 'Standard',
    },
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeArea style={styles.container} edges={['top']}>
      <View style={styles.topHeader}>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onGoBack();
          }}
          style={styles.backButton}
          testID="button-back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <Image
          source={require('../../../assets/logo.png')}
          style={[styles.headerLogo, { tintColor: '#FFFFFF' }]}
          resizeMode="contain"
        />
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            onNavigateTickets();
          }}
          style={styles.settingsButton}
          testID="button-my-tickets"
        >
          <Ionicons name="ticket-outline" size={24} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <GreetingHeader
          name={user?.firstName || 'Utente'}
          email={user?.email}
          avatarElement={
            <Avatar
              name={`${user?.firstName || ''} ${user?.lastName || ''}`}
              size="lg"
              testID="avatar-user"
            />
          }
        />

        <View style={styles.content}>
          <View>
            <Text style={styles.sectionTitle}>Azioni Rapide</Text>
            <View style={styles.actionsGrid}>
              <View style={styles.actionRow}>
                <ActionCard
                  icon="ticket-outline"
                  label="Acquista Biglietti"
                  gradient="golden"
                  onPress={onNavigateEvents}
                  testID="action-buy-tickets"
                />
                <ActionCard
                  icon="qr-code-outline"
                  label="I miei QR"
                  gradient="teal"
                  onPress={onNavigateTickets}
                  testID="action-my-qr"
                />
              </View>
              <View style={styles.actionRow}>
                <ActionCard
                  icon="wallet-outline"
                  label="Ricarica Wallet"
                  gradient="purple"
                  onPress={onNavigateWallet}
                  testID="action-wallet"
                />
                <ActionCard
                  icon="swap-horizontal-outline"
                  label="Rivendi Biglietti"
                  gradient="blue"
                  onPress={onNavigateResales}
                  testID="action-resell"
                />
              </View>
            </View>
          </View>

          <View>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                onNavigateWallet();
              }}
            >
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.walletCard}
              >
                <View style={styles.walletHeader}>
                  <View style={styles.walletIcon}>
                    <Ionicons name="wallet" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.walletLabel}>Wallet</Text>
                </View>
                <Text style={styles.walletBalance}>
                  € {walletBalance.toFixed(2)}
                </Text>
                <Text style={styles.walletSubtext}>Saldo disponibile</Text>
                <View style={styles.walletAction}>
                  <Button
                    variant="golden"
                    size="sm"
                    onPress={onNavigateWallet}
                    testID="button-recharge"
                  >
                    Ricarica
                  </Button>
                </View>
              </LinearGradient>
            </Pressable>
          </View>

          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Prossimi Eventi</Text>
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  onNavigateTickets();
                }}
              >
                <Text style={styles.seeAllLink}>Vedi tutti</Text>
              </Pressable>
            </View>

            {upcomingTickets.length > 0 ? (
              <View style={styles.ticketsList}>
                {upcomingTickets.map((ticket, index) => (
                  <Pressable
                    key={ticket.id}
                    onPress={() => {
                      triggerHaptic('light');
                      onNavigateTickets();
                    }}
                  >
                    <Card
                      style={styles.ticketCard}
                      testID={`ticket-card-${ticket.id}`}
                    >
                      <View style={styles.ticketContent}>
                        <View style={styles.ticketDateBox}>
                          <Text style={styles.ticketDay}>
                            {ticket.date.getDate()}
                          </Text>
                          <Text style={styles.ticketMonth}>
                            {ticket.date.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.ticketInfo}>
                          <Text style={styles.ticketName} numberOfLines={1}>
                            {ticket.eventName}
                          </Text>
                          <View style={styles.ticketMeta}>
                            <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                            <Text style={styles.ticketMetaText}>{ticket.location}</Text>
                            <Text style={styles.ticketMetaDot}>•</Text>
                            <Text style={styles.ticketMetaText}>{formatTime(ticket.date)}</Text>
                          </View>
                        </View>
                        <Badge variant={ticket.ticketType === 'VIP' ? 'default' : 'secondary'}>
                          {ticket.ticketType}
                        </Badge>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
                  <Text style={styles.emptyTitle}>Nessun evento in programma</Text>
                  <Text style={styles.emptyText}>
                    Esplora gli eventi disponibili e acquista i tuoi biglietti
                  </Text>
                  <Button
                    variant="golden"
                    onPress={onNavigateEvents}
                    style={styles.emptyButton}
                    testID="button-explore-events"
                  >
                    Esplora Eventi
                  </Button>
                </View>
              </Card>
            )}
          </View>

          <View style={styles.logoutSection}>
            <Button
              variant="outline"
              size="lg"
              onPress={() => {
                triggerHaptic('medium');
                onLogout();
              }}
              style={styles.logoutButton}
              testID="button-logout"
            >
              <Ionicons name="log-out-outline" size={20} color={colors.foreground} />
              <Text style={styles.logoutText}>Esci</Text>
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
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    height: 28,
    width: 100,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  seeAllLink: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  actionsGrid: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  walletCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabel: {
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  walletBalance: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  walletSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  walletAction: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  ticketsList: {
    gap: spacing.md,
  },
  ticketCard: {
    padding: spacing.md,
  },
  ticketContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ticketDateBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketDay: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  ticketMonth: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
    marginTop: -2,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketMetaText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  ticketMetaDot: {
    color: colors.mutedForeground,
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
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    paddingHorizontal: spacing.xl,
  },
  logoutSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.foreground,
  },
});

export default AccountDashboard;
