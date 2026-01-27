import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Image, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card, GlassCard } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { GestoreLocationDetail } from '@/lib/api';

type TabType = 'panoramica' | 'eventi' | 'planimetria' | 'impostazioni';

interface GestoreLocationDetailScreenProps {
  locationId: string;
  onBack: () => void;
}

export function GestoreLocationDetailScreen({ locationId, onBack }: GestoreLocationDetailScreenProps) {
  const { colors } = useTheme();
  const [location, setLocation] = useState<GestoreLocationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('panoramica');
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    loadLocationDetail();
  }, [locationId]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  useEffect(() => {
    if (location) {
      setIsEnabled(location.status === 'active');
    }
  }, [location]);

  const loadLocationDetail = async () => {
    try {
      setIsLoading(true);
      const data = await api.getGestoreLocationDetail(locationId);
      setLocation(data);
    } catch (error) {
      console.error('Error loading location detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocationDetail();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" testID="badge-status-active">Attivo</Badge>;
      case 'inactive':
        return <Badge variant="secondary" testID="badge-status-inactive">Inattivo</Badge>;
      default:
        return <Badge variant="secondary" testID="badge-status-default">{status}</Badge>;
    }
  };

  const getEventStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">In Corso</Badge>;
      case 'upcoming':
        return <Badge variant="default">Prossimo</Badge>;
      case 'past':
        return <Badge variant="secondary">Passato</Badge>;
      case 'draft':
        return <Badge variant="outline">Bozza</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const tabs: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'panoramica', label: 'Panoramica', icon: 'home-outline' },
    { id: 'eventi', label: 'Eventi', icon: 'calendar-outline' },
    { id: 'planimetria', label: 'Planimetria', icon: 'map-outline' },
    { id: 'impostazioni', label: 'Impostazioni', icon: 'settings-outline' },
  ];

  const renderPanoramica = () => (
    <View style={styles.tabContent} testID="tab-content-panoramica">
      <View style={styles.statsGrid}>
        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.primary}20` }]}>
            <Ionicons name="people" size={24} color={staticColors.primary} />
          </View>
          <Text style={styles.statValue} testID="text-capacity">{location?.capacity || 0}</Text>
          <Text style={styles.statLabel}>Capacità</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.teal}20` }]}>
            <Ionicons name="calendar" size={24} color={staticColors.teal} />
          </View>
          <Text style={styles.statValue} testID="text-events-count">{location?.eventsCount || 0}</Text>
          <Text style={styles.statLabel}>Eventi</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: `${staticColors.golden}20` }]}>
            <Ionicons name="car" size={24} color={staticColors.golden} />
          </View>
          <Text style={styles.statValue} testID="text-parking">{location?.parkingSpots || 0}</Text>
          <Text style={styles.statLabel}>Parcheggi</Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
            <Ionicons name="accessibility" size={24} color="#8B5CF6" />
          </View>
          <Text style={styles.statValue} testID="text-accessibility">{location?.accessibilityFeatures?.length || 0}</Text>
          <Text style={styles.statLabel}>Accessibilità</Text>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informazioni</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Indirizzo</Text>
            <Text style={styles.detailValue} testID="text-address">{location?.address || '-'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Città</Text>
            <Text style={styles.detailValue} testID="text-city">{location?.city || '-'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Telefono</Text>
            <Text style={styles.detailValue} testID="text-phone">{location?.contactPhone || '-'}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue} testID="text-email">{location?.contactEmail || '-'}</Text>
          </View>
        </Card>
      </View>

      {location?.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrizione</Text>
          <Card style={styles.descriptionCard}>
            <Text style={styles.descriptionText} testID="text-description">{location.description}</Text>
          </Card>
        </View>
      )}

      {location?.amenities && location.amenities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servizi</Text>
          <Card style={styles.amenitiesCard}>
            <View style={styles.amenitiesGrid}>
              {location.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityItem} testID={`amenity-${index}`}>
                  <Ionicons name="checkmark-circle" size={16} color={staticColors.success} />
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
      )}

      {location?.accessibilityFeatures && location.accessibilityFeatures.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibilità</Text>
          <Card style={styles.amenitiesCard}>
            <View style={styles.amenitiesGrid}>
              {location.accessibilityFeatures.map((feature, index) => (
                <View key={index} style={styles.amenityItem} testID={`accessibility-${index}`}>
                  <Ionicons name="accessibility" size={16} color="#8B5CF6" />
                  <Text style={styles.amenityText}>{feature}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Azioni Rapide</Text>
        <View style={styles.actionsGrid}>
          <Button variant="outline" style={styles.actionButton} testID="button-edit">
            <Ionicons name="create-outline" size={20} color={colors.foreground} />
            <Text style={styles.actionButtonText}>Modifica</Text>
          </Button>
          <Button variant="outline" style={styles.actionButton} testID="button-share">
            <Ionicons name="share-outline" size={20} color={colors.foreground} />
            <Text style={styles.actionButtonText}>Condividi</Text>
          </Button>
          <Button variant="outline" style={styles.actionButton} testID="button-directions">
            <Ionicons name="navigate-outline" size={20} color={colors.foreground} />
            <Text style={styles.actionButtonText}>Indicazioni</Text>
          </Button>
          <Button variant="outline" style={styles.actionButton} testID="button-qr">
            <Ionicons name="qr-code-outline" size={20} color={colors.foreground} />
            <Text style={styles.actionButtonText}>QR Code</Text>
          </Button>
        </View>
      </View>
    </View>
  );

  const renderEventi = () => (
    <View style={styles.tabContent} testID="tab-content-eventi">
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Riepilogo Eventi</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue} testID="text-total-events">{location?.events?.length || 0}</Text>
            <Text style={styles.summaryLabel}>Totale</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue} testID="text-upcoming-events">
              {location?.events?.filter(e => e.status === 'upcoming' || e.status === 'active').length || 0}
            </Text>
            <Text style={styles.summaryLabel}>Prossimi</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue} testID="text-past-events">
              {location?.events?.filter(e => e.status === 'past').length || 0}
            </Text>
            <Text style={styles.summaryLabel}>Passati</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Eventi in questa Location</Text>
      {location?.events && location.events.length > 0 ? (
        location.events.map((event, index) => (
          <Card key={event.id} style={styles.eventCard} testID={`event-card-${event.id}`}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventName}>{event.name}</Text>
              {getEventStatusBadge(event.status)}
            </View>
            <View style={styles.eventMeta}>
              <Ionicons name="calendar-outline" size={14} color={staticColors.mutedForeground} />
              <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
            </View>
          </Card>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessun evento in questa location</Text>
          <Button variant="outline" style={styles.emptyButton} testID="button-create-event">
            <Text style={styles.emptyButtonText}>Crea Evento</Text>
          </Button>
        </Card>
      )}
    </View>
  );

  const renderPlanimetria = () => (
    <View style={styles.tabContent} testID="tab-content-planimetria">
      <Text style={styles.sectionTitle}>Planimetria Location</Text>
      {location?.floorPlanUrl ? (
        <Card style={styles.floorPlanCard}>
          <Image
            source={{ uri: location.floorPlanUrl }}
            style={styles.floorPlanImage}
            resizeMode="contain"
            testID="image-floor-plan"
          />
          <View style={styles.floorPlanActions}>
            <Button variant="outline" style={styles.floorPlanButton} testID="button-zoom">
              <Ionicons name="expand-outline" size={18} color={colors.foreground} />
              <Text style={styles.floorPlanButtonText}>Ingrandisci</Text>
            </Button>
            <Button variant="outline" style={styles.floorPlanButton} testID="button-download">
              <Ionicons name="download-outline" size={18} color={colors.foreground} />
              <Text style={styles.floorPlanButtonText}>Scarica</Text>
            </Button>
          </View>
        </Card>
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="map-outline" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Nessuna planimetria disponibile</Text>
          <Button variant="outline" style={styles.emptyButton} testID="button-upload-floor-plan">
            <Text style={styles.emptyButtonText}>Carica Planimetria</Text>
          </Button>
        </Card>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informazioni Layout</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="resize-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Capacità Totale</Text>
            <Text style={styles.detailValue}>{location?.capacity || 0} persone</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.detailLabel}>Posti Auto</Text>
            <Text style={styles.detailValue}>{location?.parkingSpots || 0}</Text>
          </View>
        </Card>
      </View>
    </View>
  );

  const renderImpostazioni = () => (
    <View style={styles.tabContent} testID="tab-content-impostazioni">
      <Text style={styles.sectionTitle}>Stato Location</Text>
      <Card style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="power-outline" size={24} color={isEnabled ? staticColors.success : staticColors.mutedForeground} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Location Attiva</Text>
              <Text style={styles.settingDescription}>
                {isEnabled ? 'La location è visibile e può ospitare eventi' : 'La location è nascosta e non disponibile'}
              </Text>
            </View>
          </View>
          <Switch
            value={isEnabled}
            onValueChange={(value) => {
              triggerHaptic('selection');
              setIsEnabled(value);
            }}
            trackColor={{ false: staticColors.border, true: staticColors.success }}
            thumbColor={staticColors.foreground}
            testID="switch-location-enabled"
          />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Configurazione</Text>
      <Card style={styles.settingsCard}>
        <Pressable 
          style={styles.settingRowPressable}
          onPress={() => triggerHaptic('selection')}
          testID="button-edit-info"
        >
          <View style={styles.settingInfo}>
            <Ionicons name="create-outline" size={24} color={colors.mutedForeground} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Modifica Informazioni</Text>
              <Text style={styles.settingDescription}>Nome, indirizzo, contatti</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>
        <View style={styles.settingDivider} />
        <Pressable 
          style={styles.settingRowPressable}
          onPress={() => triggerHaptic('selection')}
          testID="button-edit-capacity"
        >
          <View style={styles.settingInfo}>
            <Ionicons name="people-outline" size={24} color={colors.mutedForeground} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Capacità e Layout</Text>
              <Text style={styles.settingDescription}>Configura la capienza massima</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>
        <View style={styles.settingDivider} />
        <Pressable 
          style={styles.settingRowPressable}
          onPress={() => triggerHaptic('selection')}
          testID="button-edit-amenities"
        >
          <View style={styles.settingInfo}>
            <Ionicons name="list-outline" size={24} color={colors.mutedForeground} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Servizi e Dotazioni</Text>
              <Text style={styles.settingDescription}>Gestisci i servizi disponibili</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>
        <View style={styles.settingDivider} />
        <Pressable 
          style={styles.settingRowPressable}
          onPress={() => triggerHaptic('selection')}
          testID="button-upload-images"
        >
          <View style={styles.settingInfo}>
            <Ionicons name="images-outline" size={24} color={colors.mutedForeground} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Galleria Immagini</Text>
              <Text style={styles.settingDescription}>Carica foto della location</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>
      </Card>

      <Text style={styles.sectionTitle}>Zona Pericolosa</Text>
      <Card style={StyleSheet.flatten([styles.settingsCard, styles.dangerCard])}>
        <Pressable 
          style={styles.settingRowPressable}
          onPress={() => triggerHaptic('error')}
          testID="button-delete-location"
        >
          <View style={styles.settingInfo}>
            <Ionicons name="trash-outline" size={24} color={staticColors.destructive} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: staticColors.destructive }]}>Elimina Location</Text>
              <Text style={styles.settingDescription}>Questa azione non può essere annullata</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={staticColors.destructive} />
        </Pressable>
      </Card>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'panoramica':
        return renderPanoramica();
      case 'eventi':
        return renderEventi();
      case 'planimetria':
        return renderPlanimetria();
      case 'impostazioni':
        return renderImpostazioni();
      default:
        return null;
    }
  };

  if (showLoader) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-location-detail" />
        <Loading text="Caricamento location..." />
      </SafeArea>
    );
  }

  if (!location) {
    return (
      <SafeArea edges={['bottom']} style={styles.container}>
        <Header showLogo showBack onBack={onBack} testID="header-location-detail" />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Location non trovata</Text>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea edges={['bottom']} style={styles.container}>
      <Header showLogo showBack onBack={onBack} testID="header-location-detail" />

      <View style={styles.locationHeader}>
        <View style={styles.locationTitleRow}>
          <Text style={styles.locationTitle} numberOfLines={1} testID="text-location-name">{location.name}</Text>
          {getStatusBadge(location.status)}
        </View>
        <View style={styles.locationMeta}>
          <Ionicons name="location-outline" size={16} color={staticColors.mutedForeground} />
          <Text style={styles.locationMetaText} testID="text-location-address">{location.address}, {location.city}</Text>
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
            testID="refresh-control"
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
  locationHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  locationTitle: {
    flex: 1,
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: staticColors.foreground,
  },
  locationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  locationMetaText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: staticColors.card,
  },
  tabActive: {
    backgroundColor: staticColors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    fontWeight: '500',
  },
  tabTextActive: {
    color: staticColors.primaryForeground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  tabContent: {
    padding: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
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
    borderRadius: borderRadius.md,
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
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
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
    color: staticColors.foreground,
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: '50%',
  },
  detailDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: spacing.md,
  },
  descriptionCard: {
    padding: spacing.md,
  },
  descriptionText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
    lineHeight: 22,
  },
  amenitiesCard: {
    padding: spacing.md,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: staticColors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  amenityText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  summaryCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.foreground,
    marginBottom: spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStat: {
    flex: 1,
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
    marginTop: spacing.xs,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: staticColors.border,
    marginHorizontal: spacing.sm,
  },
  eventCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
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
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  eventDate: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: spacing.md,
  },
  emptyButtonText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
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
  },
  floorPlanCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  floorPlanImage: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.md,
    backgroundColor: staticColors.secondary,
  },
  floorPlanActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  floorPlanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  floorPlanButtonText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.foreground,
  },
  settingsCard: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  settingRowPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: staticColors.foreground,
  },
  settingDescription: {
    fontSize: typography.fontSize.sm,
    color: staticColors.mutedForeground,
    marginTop: spacing.xs,
  },
  settingDivider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginHorizontal: spacing.md,
  },
  dangerCard: {
    borderColor: `${staticColors.destructive}30`,
    borderWidth: 1,
  },
});
