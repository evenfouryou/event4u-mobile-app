import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, FlatList } from 'react-native';
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
import api, { AdminGestoreDetail, AdminGestoreCompany, AdminGestoreEvent, AdminGestoreUser } from '@/lib/api';

type TabType = 'overview' | 'companies' | 'events' | 'users';

interface AdminGestoreDetailScreenProps {
  gestoreId: string;
  onBack: () => void;
  onNavigateCompany?: (companyId: string) => void;
  onNavigateEvent?: (eventId: string) => void;
  onNavigateUser?: (userId: string) => void;
}

export function AdminGestoreDetailScreen({ gestoreId, onBack, onNavigateCompany, onNavigateEvent, onNavigateUser }: AdminGestoreDetailScreenProps) {
  const { colors } = useTheme();
  const [gestore, setGestore] = useState<AdminGestoreDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGestoreDetail();
  }, [gestoreId]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadGestoreDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getAdminGestoreDetail(gestoreId);
      setGestore(data);
    } catch (err) {
      console.error('Error loading gestore detail:', err);
      setError('Impossibile caricare i dettagli del gestore');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGestoreDetail();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Attivo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inattivo</Badge>;
      case 'pending':
        return <Badge variant="warning">In attesa</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Sospeso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const tabs: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'overview', label: 'Panoramica', icon: 'home-outline' },
    { id: 'companies', label: 'Aziende', icon: 'business-outline' },
    { id: 'events', label: 'Eventi', icon: 'calendar-outline' },
    { id: 'users', label: 'Utenti', icon: 'people-outline' },
  ];

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="calendar" size={24} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue}>{gestore?.eventsCount || 0}</Text>
          <Text style={styles.statLabel}>Eventi Totali</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
            <Ionicons name="ticket" size={24} color={staticColors.teal} />
          </View>
          <Text style={styles.statValue}>{gestore?.ticketsSold || 0}</Text>
          <Text style={styles.statLabel}>Biglietti Venduti</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
            <Ionicons name="cash" size={24} color={staticColors.golden} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(gestore?.revenue || 0)}</Text>
          <Text style={styles.statLabel}>Fatturato Totale</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.accent}` }]}>
            <Ionicons name="business" size={24} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue}>{gestore?.companiesCount || 0}</Text>
          <Text style={styles.statLabel}>Aziende</Text>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informazioni Gestore</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{gestore?.email || '-'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Telefono</Text>
            <Text style={styles.detailValue}>{gestore?.phone || '-'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Registrato</Text>
            <Text style={styles.detailValue}>
              {gestore?.createdAt ? formatDate(gestore.createdAt) : '-'}
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>SIAE</Text>
            <Text style={styles.detailValue}>
              {gestore?.siaeEnabled ? 'Abilitato' : 'Non abilitato'}
            </Text>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Piano Abbonamento</Text>
        <Card style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{gestore?.subscriptionPlan || 'Nessun piano'}</Text>
            <Badge variant={gestore?.subscriptionStatus === 'active' ? 'success' : 'secondary'}>
              {gestore?.subscriptionStatus === 'active' ? 'Attivo' : 'Inattivo'}
            </Badge>
          </View>
          {gestore?.subscriptionExpiresAt && (
            <Text style={styles.planExpiry}>
              Scadenza: {formatDate(gestore.subscriptionExpiresAt)}
            </Text>
          )}
        </Card>
      </View>
    </View>
  );

  const renderCompanies = () => (
    <View style={styles.tabContent}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Riepilogo Aziende</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{gestore?.companiesCount || 0}</Text>
            <Text style={styles.summaryLabel}>Totale</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>
              {gestore?.companies?.filter(c => c.status === 'active').length || 0}
            </Text>
            <Text style={styles.summaryLabel}>Attive</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>
              {gestore?.companies?.filter(c => c.siaeEnabled).length || 0}
            </Text>
            <Text style={styles.summaryLabel}>SIAE</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Lista Aziende</Text>
      {gestore?.companies && gestore.companies.length > 0 ? (
        gestore.companies.map((company) => (
          <Pressable 
            key={company.id} 
            onPress={() => {
              triggerHaptic('light');
              onNavigateCompany?.(company.id);
            }}
            testID={`company-${company.id}`}
          >
            <Card style={styles.companyCard}>
              <View style={styles.companyHeader}>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{company.name}</Text>
                <Text style={styles.companyVat}>{company.vatNumber || '-'}</Text>
              </View>
              {getStatusBadge(company.status)}
            </View>
            <View style={styles.companyStats}>
              <View style={styles.companyStat}>
                <Ionicons name="calendar-outline" size={16} color={staticColors.primary} />
                <Text style={styles.companyStatValue}>{company.eventsCount || 0}</Text>
                <Text style={styles.companyStatLabel}>Eventi</Text>
              </View>
              <View style={styles.companyStat}>
                <Ionicons name="location-outline" size={16} color={staticColors.teal} />
                <Text style={styles.companyStatValue}>{company.locationsCount || 0}</Text>
                <Text style={styles.companyStatLabel}>Location</Text>
              </View>
              {company.siaeEnabled && (
                <Badge variant="default" style={styles.siaeBadge}>SIAE</Badge>
              )}
            </View>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="business-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuna azienda associata</Text>
        </Card>
      )}
    </View>
  );

  const renderEvents = () => (
    <View style={styles.tabContent}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Riepilogo Eventi</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{gestore?.eventsCount || 0}</Text>
            <Text style={styles.summaryLabel}>Totale</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>
              {gestore?.events?.filter(e => e.status === 'active' || e.status === 'upcoming').length || 0}
            </Text>
            <Text style={styles.summaryLabel}>Attivi</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{gestore?.ticketsSold || 0}</Text>
            <Text style={styles.summaryLabel}>Biglietti</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Eventi Recenti</Text>
      {gestore?.events && gestore.events.length > 0 ? (
        gestore.events.map((event) => (
          <Pressable
            key={event.id}
            onPress={() => {
              triggerHaptic('light');
              onNavigateEvent?.(event.id);
            }}
            testID={`event-${event.id}`}
          >
            <Card style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
                {getStatusBadge(event.status)}
              </View>
              <View style={styles.eventMeta}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={styles.eventMetaText}>
                  {event.startDate ? formatDate(event.startDate) : '-'}
                </Text>
                <Ionicons name="location-outline" size={14} color={colors.mutedForeground} style={{ marginLeft: spacing.md }} />
                <Text style={styles.eventMetaText}>{event.locationName || '-'}</Text>
              </View>
              <View style={styles.eventStats}>
                <View style={styles.eventStat}>
                  <Ionicons name="ticket-outline" size={14} color={staticColors.primary} />
                  <Text style={styles.eventStatText}>{event.ticketsSold || 0} venduti</Text>
                </View>
                <View style={styles.eventStat}>
                  <Ionicons name="cash-outline" size={14} color={staticColors.golden} />
                  <Text style={styles.eventStatText}>{formatCurrency(event.revenue || 0)}</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun evento</Text>
        </Card>
      )}
    </View>
  );

  const renderUsers = () => (
    <View style={styles.tabContent}>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Riepilogo Utenti</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{gestore?.usersCount || 0}</Text>
            <Text style={styles.summaryLabel}>Totale</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>
              {gestore?.users?.filter(u => u.role === 'admin').length || 0}
            </Text>
            <Text style={styles.summaryLabel}>Admin</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>
              {gestore?.users?.filter(u => u.status === 'active').length || 0}
            </Text>
            <Text style={styles.summaryLabel}>Attivi</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Utenti Associati</Text>
      {gestore?.users && gestore.users.length > 0 ? (
        gestore.users.map((user) => (
          <Pressable
            key={user.id}
            onPress={() => {
              triggerHaptic('light');
              onNavigateUser?.(user.id);
            }}
            testID={`user-${user.id}`}
          >
            <Card style={styles.userCard}>
              <View style={styles.userContent}>
                <Avatar name={`${user.firstName} ${user.lastName}`} size="md" testID={`avatar-user-${user.id}`} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View style={styles.userActions}>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : user.role}
                  </Badge>
                  {getStatusBadge(user.status)}
                </View>
              </View>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun utente associato</Text>
        </Card>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'companies':
        return renderCompanies();
      case 'events':
        return renderEvents();
      case 'users':
        return renderUsers();
      default:
        return null;
    }
  };

  if (showLoader) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-gestore-detail" />
        <Loading text="Caricamento gestore..." />
      </SafeArea>
    );
  }

  if (error || !gestore) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-gestore-detail" />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>{error || 'Gestore non trovato'}</Text>
          <Pressable onPress={loadGestoreDetail} testID="button-retry">
            <Text style={styles.retryText}>Riprova</Text>
          </Pressable>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-gestore-detail" />

      <View style={styles.gestoreHeader}>
        <View style={styles.gestoreHeaderContent}>
          <Avatar name={gestore.name} size="lg" testID="avatar-gestore" />
          <View style={styles.gestoreHeaderInfo}>
            <Text style={styles.gestoreName} numberOfLines={1}>{gestore.name}</Text>
            <Text style={styles.gestoreEmail}>{gestore.email || '-'}</Text>
            {gestore.companyName && (
              <Text style={styles.gestoreCompany}>{gestore.companyName}</Text>
            )}
          </View>
          {getStatusBadge(gestore.status)}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => {
              triggerHaptic('selection');
              setActiveTab(tab.id);
            }}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            testID={`tab-${tab.id}`}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.id ? staticColors.primaryForeground : staticColors.mutedForeground}
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

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
        {renderTabContent()}
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.background,
  },
  gestoreHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  gestoreHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gestoreHeaderInfo: {
    flex: 1,
  },
  gestoreName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  gestoreEmail: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  gestoreCompany: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.secondary,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: staticColors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.mutedForeground,
  },
  tabTextActive: {
    color: staticColors.primaryForeground,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  tabContent: {
    gap: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    textAlign: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  detailsCard: {
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  detailDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.sm,
  },
  planCard: {
    padding: spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  planExpiry: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  summaryCard: {
    padding: spacing.md,
  },
  summaryTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.foreground,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: staticColors.border,
  },
  companyCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  companyVat: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  companyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  companyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  companyStatValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  companyStatLabel: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  siaeBadge: {
    marginLeft: 'auto',
  },
  eventCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  eventName: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  eventMetaText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
    marginLeft: spacing.xs,
  },
  eventStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  eventStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventStatText: {
    fontSize: typography.fontSize.xs,
    color: staticColors.mutedForeground,
  },
  userCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  userActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    textAlign: 'center',
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
  retryText: {
    fontSize: typography.fontSize.base,
    color: staticColors.primary,
    marginTop: spacing.md,
    fontWeight: '600',
  },
});

export default AdminGestoreDetailScreen;
