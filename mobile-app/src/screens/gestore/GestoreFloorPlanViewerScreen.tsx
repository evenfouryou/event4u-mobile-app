import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, ViewStyle, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { FloorPlanZone, FloorPlanData } from '@/lib/api';

interface GestoreFloorPlanViewerScreenProps {
  eventId: string;
  onBack: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function GestoreFloorPlanViewerScreen({ eventId, onBack }: GestoreFloorPlanViewerScreenProps) {
  const { colors } = useTheme();
  const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(null);
  const [zones, setZones] = useState<FloorPlanZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedZone, setSelectedZone] = useState<FloorPlanZone | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadFloorPlan();
  }, [eventId]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const loadFloorPlan = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getFloorPlan(eventId);
      setFloorPlan(data);
      setZones(data.zones);
    } catch (err) {
      console.error('Error loading floor plan:', err);
      setError('Errore nel caricamento della piantina');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFloorPlan();
    setRefreshing(false);
  };

  const getZoneColor = (status: FloorPlanZone['status']) => {
    switch (status) {
      case 'available':
        return staticColors.success;
      case 'occupied':
        return staticColors.destructive;
      case 'selected':
        return staticColors.warning;
      case 'reserved':
        return staticColors.primary;
      default:
        return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: FloorPlanZone['status']) => {
    switch (status) {
      case 'available':
        return 'Disponibile';
      case 'occupied':
        return 'Occupato';
      case 'selected':
        return 'Selezionato';
      case 'reserved':
        return 'Riservato';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleZonePress = (zone: FloorPlanZone) => {
    triggerHaptic('light');
    setSelectedZone(zone);
  };

  const handleZoomIn = () => {
    triggerHaptic('light');
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    triggerHaptic('light');
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    triggerHaptic('light');
    setScale(1);
  };

  const renderZone = (zone: FloorPlanZone) => {
    const zoneColor = getZoneColor(zone.status);
    const isSelected = selectedZone?.id === zone.id;
    
    return (
      <Pressable
        key={zone.id}
        onPress={() => handleZonePress(zone)}
        style={[
          styles.zone,
          {
            left: zone.x * scale,
            top: zone.y * scale,
            width: zone.width * scale,
            height: zone.height * scale,
            backgroundColor: `${zoneColor}30`,
            borderColor: isSelected ? colors.primary : zoneColor,
            borderWidth: isSelected ? 3 : 2,
          },
        ]}
        testID={`zone-${zone.id}`}
      >
        <Text 
          style={[
            styles.zoneName, 
            { color: zoneColor, fontSize: Math.max(10, 12 * scale) }
          ]}
          numberOfLines={1}
        >
          {zone.name}
        </Text>
        <Text 
          style={[
            styles.zoneSeats, 
            { color: zoneColor, fontSize: Math.max(8, 10 * scale) }
          ]}
        >
          {zone.availableSeats}/{zone.totalSeats}
        </Text>
      </Pressable>
    );
  };

  const renderLegend = () => (
    <View style={styles.legendContainer}>
      <Text style={[styles.legendTitle, { color: colors.foreground }]}>Legenda</Text>
      <View style={styles.legendItems}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: staticColors.success }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Disponibile</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: staticColors.destructive }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Occupato</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: staticColors.warning }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Selezionato</Text>
        </View>
      </View>
    </View>
  );

  const renderZoneDetails = () => {
    if (!selectedZone) return null;

    return (
      <Card style={styles.detailsCard} testID="zone-details">
        <View style={styles.detailsHeader}>
          <View style={styles.detailsInfo}>
            <Text style={[styles.detailsName, { color: colors.foreground }]}>{selectedZone.name}</Text>
            <Badge variant={selectedZone.status === 'available' ? 'success' : selectedZone.status === 'occupied' ? 'destructive' : 'warning'}>
              {getStatusLabel(selectedZone.status)}
            </Badge>
          </View>
          <Pressable onPress={() => setSelectedZone(null)} testID="button-close-details">
            <Ionicons name="close" size={24} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <View style={[styles.detailsDivider, { backgroundColor: colors.border }]} />
        <View style={styles.detailsContent}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Posti disponibili</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>
                {selectedZone.availableSeats} / {selectedZone.totalSeats}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="pricetag-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Prezzo</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>
                {formatCurrency(selectedZone.price)}
              </Text>
            </View>
          </View>
          {selectedZone.description && (
            <Text style={[styles.detailDescription, { color: colors.mutedForeground }]}>
              {selectedZone.description}
            </Text>
          )}
        </View>
      </Card>
    );
  };

  const renderError = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Errore</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{error}</Text>
      <Pressable
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        onPress={loadFloorPlan}
        testID="button-retry"
      >
        <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>Riprova</Text>
      </Pressable>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="map-outline" size={64} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna piantina</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        Non è disponibile una piantina per questo evento
      </Text>
    </View>
  );

  return (
    <SafeArea edges={['bottom']} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as ViewStyle}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-floor-plan"
      />

      <View style={styles.titleContainer}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Piantina Evento</Text>
        {floorPlan && (
          <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
            {floorPlan.eventName}
          </Text>
        )}
      </View>

      {showLoader ? (
        <Loading text="Caricamento piantina..." />
      ) : error ? (
        renderError()
      ) : !floorPlan || zones.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <View style={styles.zoomControls}>
            <Pressable
              style={[styles.zoomButton, { backgroundColor: colors.secondary }]}
              onPress={handleZoomOut}
              testID="button-zoom-out"
            >
              <Ionicons name="remove" size={20} color={colors.foreground} />
            </Pressable>
            <Pressable
              style={[styles.zoomButton, { backgroundColor: colors.secondary }]}
              onPress={handleResetZoom}
              testID="button-zoom-reset"
            >
              <Text style={[styles.zoomText, { color: colors.foreground }]}>{Math.round(scale * 100)}%</Text>
            </Pressable>
            <Pressable
              style={[styles.zoomButton, { backgroundColor: colors.secondary }]}
              onPress={handleZoomIn}
              testID="button-zoom-in"
            >
              <Ionicons name="add" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {renderLegend()}

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            horizontal
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            maximumZoomScale={3}
            minimumZoomScale={0.5}
            bouncesZoom
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            <ScrollView
              nestedScrollEnabled
              contentContainerStyle={[
                styles.floorPlanContainer,
                {
                  width: (floorPlan.width || 400) * scale,
                  height: (floorPlan.height || 300) * scale,
                },
              ]}
            >
              {floorPlan.imageUrl && (
                <Image
                  source={{ uri: floorPlan.imageUrl }}
                  style={[
                    styles.floorPlanImage,
                    {
                      width: (floorPlan.width || 400) * scale,
                      height: (floorPlan.height || 300) * scale,
                    },
                  ]}
                  resizeMode="contain"
                />
              )}
              {zones.map(renderZone)}
            </ScrollView>
          </ScrollView>

          {renderZoneDetails()}
        </>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  screenTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  zoomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  legendContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  legendTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  legendItems: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  floorPlanContainer: {
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: borderRadius.lg,
  },
  floorPlanImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.5,
  },
  zone: {
    position: 'absolute',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  zoneName: {
    fontWeight: '600',
    textAlign: 'center',
  },
  zoneSeats: {
    marginTop: 2,
  },
  detailsCard: {
    position: 'absolute',
    bottom: 24,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailsName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  detailsDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  detailsContent: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
  },
  detailValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  detailDescription: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
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
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});

export default GestoreFloorPlanViewerScreen;
