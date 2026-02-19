import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api from '@/lib/api';

interface AdminCompanyDetailScreenProps {
  companyId: string;
  onBack: () => void;
  onNavigateEvent?: (eventId: string) => void;
  onNavigateLocation?: (locationId: string) => void;
}

interface CompanyDetail {
  id: string;
  name: string;
  vatNumber?: string;
  fiscalCode?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  status: string;
  siaeEnabled: boolean;
  createdAt: string;
  eventsCount: number;
  locationsCount: number;
  usersCount: number;
  ticketsSold: number;
  revenue: number;
  events?: Array<{
    id: string;
    name: string;
    status: string;
    startDate?: string;
    ticketsSold: number;
  }>;
  locations?: Array<{
    id: string;
    name: string;
    address?: string;
    city?: string;
  }>;
}

type TabType = 'overview' | 'events' | 'locations';

export function AdminCompanyDetailScreen({ companyId, onBack, onNavigateEvent, onNavigateLocation }: AdminCompanyDetailScreenProps) {
  const { colors } = useTheme();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompanyDetail();
  }, [companyId]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadCompanyDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getAdminCompanyDetail(companyId);
      setCompany(data);
    } catch (err) {
      console.error('Error loading company detail:', err);
      setError('Impossibile caricare i dettagli dell\'azienda');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCompanyDetail();
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
    { id: 'events', label: 'Eventi', icon: 'calendar-outline' },
    { id: 'locations', label: 'Location', icon: 'location-outline' },
  ];

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="calendar" size={24} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue}>{company?.eventsCount || 0}</Text>
          <Text style={styles.statLabel}>Eventi</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
            <Ionicons name="ticket" size={24} color={staticColors.teal} />
          </View>
          <Text style={styles.statValue}>{company?.ticketsSold || 0}</Text>
          <Text style={styles.statLabel}>Biglietti</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
            <Ionicons name="cash" size={24} color={staticColors.golden} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(company?.revenue || 0)}</Text>
          <Text style={styles.statLabel}>Fatturato</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.accent}` }]}>
            <Ionicons name="location" size={24} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue}>{company?.locationsCount || 0}</Text>
          <Text style={styles.statLabel}>Location</Text>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informazioni Azienda</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{company?.email || '-'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Telefono</Text>
            <Text style={styles.detailValue}>{company?.phone || '-'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>P.IVA</Text>
            <Text style={styles.detailValue}>{company?.vatNumber || '-'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Indirizzo</Text>
            <Text style={styles.detailValue} numberOfLines={2}>
              {company?.address ? `${company.address}, ${company.city || ''} ${company.province || ''}` : '-'}
            </Text>
          </View>
          {company?.siaeEnabled && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Ionicons name="shield-checkmark-outline" size={20} color={staticColors.primary} />
                <Text style={styles.detailLabel}>SIAE</Text>
                <Badge variant="success">Abilitato</Badge>
              </View>
            </>
          )}
        </Card>
      </View>
    </View>
  );

  const renderEvents = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Eventi dell'Azienda</Text>
      {company?.events && company.events.length > 0 ? (
        company.events.map((event) => (
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
                <Ionicons name="ticket-outline" size={14} color={staticColors.primary} style={{ marginLeft: spacing.md }} />
                <Text style={styles.eventMetaText}>{event.ticketsSold || 0} venduti</Text>
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

  const renderLocations = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Location dell'Azienda</Text>
      {company?.locations && company.locations.length > 0 ? (
        company.locations.map((location) => (
          <Pressable
            key={location.id}
            onPress={() => {
              triggerHaptic('light');
              onNavigateLocation?.(location.id);
            }}
            testID={`location-${location.id}`}
          >
            <Card style={styles.locationCard}>
              <View style={styles.locationContent}>
                <View style={[styles.locationIcon, { backgroundColor: `${staticColors.teal}20` }]}>
                  <Ionicons name="location" size={20} color={staticColors.teal} />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationAddress}>
                    {location.address ? `${location.address}, ${location.city || ''}` : location.city || '-'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
              </View>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="location-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuna location</Text>
        </Card>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'events':
        return renderEvents();
      case 'locations':
        return renderLocations();
      default:
        return null;
    }
  };

  if (showLoader) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-company-detail" />
        <Loading text="Caricamento azienda..." />
      </SafeArea>
    );
  }

  if (error || !company) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-company-detail" />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>{error || 'Azienda non trovata'}</Text>
          <Pressable onPress={loadCompanyDetail} testID="button-retry">
            <Text style={styles.retryText}>Riprova</Text>
          </Pressable>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-company-detail" />

      <View style={styles.companyHeader}>
        <View style={styles.companyHeaderContent}>
          <View style={[styles.companyLogo, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="business" size={28} color={staticColors.primary} />
          </View>
          <View style={styles.companyHeaderInfo}>
            <Text style={styles.companyName} numberOfLines={1}>{company.name}</Text>
            <Text style={styles.companyVat}>{company.vatNumber || '-'}</Text>
          </View>
          {getStatusBadge(company.status)}
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
  companyHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  companyHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  companyLogo: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyHeaderInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  companyVat: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
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
    borderRadius: borderRadius.full,
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
    marginTop: 2,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.sm,
  },
  detailsCard: {
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    width: 80,
  },
  detailValue: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: staticColors.foreground,
    textAlign: 'right',
  },
  detailDivider: {
    height: 1,
    backgroundColor: staticColors.border,
  },
  eventCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  eventName: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginRight: spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  locationCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
  },
  locationAddress: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: 2,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primary,
    marginTop: spacing.md,
  },
});
