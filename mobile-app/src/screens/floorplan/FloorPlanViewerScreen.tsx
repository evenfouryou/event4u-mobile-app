import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Rect, G, Text as SvgText, Circle } from 'react-native-svg';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import { Card, Header } from '../../components';
import { api } from '../../lib/api';

interface Zone {
  id: string;
  name: string;
  type: 'section' | 'table' | 'vip' | 'general' | 'stage' | 'bar';
  status: 'available' | 'reserved' | 'sold';
  capacity: number;
  currentOccupancy: number;
  priceTier?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rect' | 'circle' | 'polygon';
  points?: string;
}

interface FloorPlanData {
  id: string;
  venueId: string;
  venueName: string;
  width: number;
  height: number;
  zones: Zone[];
  lastUpdated: string;
}

const STATUS_COLORS = {
  available: colors.teal,
  reserved: colors.primary,
  sold: colors.destructive,
};

export function FloorPlanViewerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const { venueId, venueName } = route.params || {};

  const FLOOR_PLAN_SIZE = isLandscape ? Math.min(height - 200, width * 0.5) : width - spacing.lg * 2;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [showZonePanel, setShowZonePanel] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const loadFloorPlan = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<any>(`/api/venues/${venueId}/floorplan`);
      
      const mockZones: Zone[] = [
        { id: '1', name: 'VIP Area', type: 'vip', status: 'reserved', capacity: 50, currentOccupancy: 35, priceTier: 'VIP', x: 20, y: 20, width: 120, height: 80, shape: 'rect' },
        { id: '2', name: 'Sezione A', type: 'section', status: 'available', capacity: 100, currentOccupancy: 0, priceTier: 'Standard', x: 160, y: 20, width: 100, height: 80, shape: 'rect' },
        { id: '3', name: 'Sezione B', type: 'section', status: 'sold', capacity: 100, currentOccupancy: 100, priceTier: 'Standard', x: 20, y: 120, width: 100, height: 80, shape: 'rect' },
        { id: '4', name: 'Palco', type: 'stage', status: 'available', capacity: 0, currentOccupancy: 0, x: 140, y: 120, width: 120, height: 60, shape: 'rect' },
        { id: '5', name: 'Bar', type: 'bar', status: 'available', capacity: 30, currentOccupancy: 15, x: 20, y: 220, width: 80, height: 50, shape: 'rect' },
        { id: '6', name: 'Pista', type: 'general', status: 'available', capacity: 200, currentOccupancy: 50, priceTier: 'Entry', x: 120, y: 200, width: 140, height: 80, shape: 'rect' },
        { id: '7', name: 'Tavolo 1', type: 'table', status: 'reserved', capacity: 8, currentOccupancy: 6, priceTier: 'Premium', x: 50, y: 310, width: 40, height: 40, shape: 'circle' },
        { id: '8', name: 'Tavolo 2', type: 'table', status: 'available', capacity: 8, currentOccupancy: 0, priceTier: 'Premium', x: 110, y: 310, width: 40, height: 40, shape: 'circle' },
        { id: '9', name: 'Tavolo 3', type: 'table', status: 'sold', capacity: 8, currentOccupancy: 8, priceTier: 'Premium', x: 170, y: 310, width: 40, height: 40, shape: 'circle' },
        { id: '10', name: 'Tavolo 4', type: 'table', status: 'available', capacity: 6, currentOccupancy: 0, priceTier: 'Standard', x: 230, y: 310, width: 35, height: 35, shape: 'circle' },
      ];

      setFloorPlan({
        id: response?.id?.toString() || venueId,
        venueId,
        venueName: venueName || response?.name || 'Venue',
        width: 300,
        height: 380,
        zones: response?.zones || mockZones,
        lastUpdated: new Date().toLocaleDateString('it-IT'),
      });
    } catch (e) {
      const mockZones: Zone[] = [
        { id: '1', name: 'VIP Area', type: 'vip', status: 'reserved', capacity: 50, currentOccupancy: 35, priceTier: 'VIP', x: 20, y: 20, width: 120, height: 80, shape: 'rect' },
        { id: '2', name: 'Sezione A', type: 'section', status: 'available', capacity: 100, currentOccupancy: 0, priceTier: 'Standard', x: 160, y: 20, width: 100, height: 80, shape: 'rect' },
        { id: '3', name: 'Sezione B', type: 'section', status: 'sold', capacity: 100, currentOccupancy: 100, priceTier: 'Standard', x: 20, y: 120, width: 100, height: 80, shape: 'rect' },
        { id: '4', name: 'Palco', type: 'stage', status: 'available', capacity: 0, currentOccupancy: 0, x: 140, y: 120, width: 120, height: 60, shape: 'rect' },
        { id: '5', name: 'Bar', type: 'bar', status: 'available', capacity: 30, currentOccupancy: 15, x: 20, y: 220, width: 80, height: 50, shape: 'rect' },
        { id: '6', name: 'Pista', type: 'general', status: 'available', capacity: 200, currentOccupancy: 50, priceTier: 'Entry', x: 120, y: 200, width: 140, height: 80, shape: 'rect' },
        { id: '7', name: 'Tavolo 1', type: 'table', status: 'reserved', capacity: 8, currentOccupancy: 6, priceTier: 'Premium', x: 50, y: 310, width: 40, height: 40, shape: 'circle' },
        { id: '8', name: 'Tavolo 2', type: 'table', status: 'available', capacity: 8, currentOccupancy: 0, priceTier: 'Premium', x: 110, y: 310, width: 40, height: 40, shape: 'circle' },
        { id: '9', name: 'Tavolo 3', type: 'table', status: 'sold', capacity: 8, currentOccupancy: 8, priceTier: 'Premium', x: 170, y: 310, width: 40, height: 40, shape: 'circle' },
        { id: '10', name: 'Tavolo 4', type: 'table', status: 'available', capacity: 6, currentOccupancy: 0, priceTier: 'Standard', x: 230, y: 310, width: 35, height: 35, shape: 'circle' },
      ];
      
      setFloorPlan({
        id: venueId,
        venueId,
        venueName: venueName || 'Venue',
        width: 300,
        height: 380,
        zones: mockZones,
        lastUpdated: new Date().toLocaleDateString('it-IT'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFloorPlan();
  }, [venueId]);

  const handleZonePress = (zone: Zone) => {
    setSelectedZone(zone);
    setShowZonePanel(true);
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = Math.min(Math.max(scale.value, 0.5), 3);
      scale.value = withSpring(savedScale.value);
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const resetView = () => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const getZoneTypeIcon = (type: Zone['type']) => {
    switch (type) {
      case 'vip': return 'star';
      case 'table': return 'restaurant';
      case 'stage': return 'musical-notes';
      case 'bar': return 'wine';
      case 'general': return 'people';
      default: return 'grid';
    }
  };

  const getZoneTypeLabel = (type: Zone['type']) => {
    switch (type) {
      case 'vip': return 'VIP';
      case 'table': return 'Tavolo';
      case 'section': return 'Sezione';
      case 'stage': return 'Palco';
      case 'bar': return 'Bar';
      case 'general': return 'Area Generale';
      default: return type;
    }
  };

  const renderZone = (zone: Zone) => {
    const fillColor = STATUS_COLORS[zone.status] + '40';
    const strokeColor = STATUS_COLORS[zone.status];
    const scaleRatio = FLOOR_PLAN_SIZE / 300;

    if (zone.shape === 'circle') {
      return (
        <G key={zone.id} onPress={() => handleZonePress(zone)}>
          <Circle
            cx={(zone.x + zone.width / 2) * scaleRatio}
            cy={(zone.y + zone.height / 2) * scaleRatio}
            r={(zone.width / 2) * scaleRatio}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2}
          />
          <SvgText
            x={(zone.x + zone.width / 2) * scaleRatio}
            y={(zone.y + zone.height / 2 + 4) * scaleRatio}
            fill={colors.foreground}
            fontSize={10 * scaleRatio}
            fontWeight="600"
            textAnchor="middle"
          >
            {zone.name.substring(0, 8)}
          </SvgText>
        </G>
      );
    }

    return (
      <G key={zone.id} onPress={() => handleZonePress(zone)}>
        <Rect
          x={zone.x * scaleRatio}
          y={zone.y * scaleRatio}
          width={zone.width * scaleRatio}
          height={zone.height * scaleRatio}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2}
          rx={8}
        />
        <SvgText
          x={(zone.x + zone.width / 2) * scaleRatio}
          y={(zone.y + zone.height / 2 + 4) * scaleRatio}
          fill={colors.foreground}
          fontSize={11 * scaleRatio}
          fontWeight="600"
          textAnchor="middle"
        >
          {zone.name}
        </SvgText>
      </G>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title={venueName || 'Planimetria'} showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer} testID="loading-container">
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
          <Text style={styles.loadingText} testID="loading-text">Caricamento planimetria...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header title={venueName || 'Planimetria'} showBack onBack={() => navigation.goBack()} />
        <View style={styles.errorContainer} testID="error-container">
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={styles.errorText} testID="error-text">{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadFloorPlan} testID="button-retry">
            <Ionicons name="refresh-outline" size={20} color={colors.primaryForeground} />
            <Text style={styles.retryButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <Header
          title={floorPlan?.venueName || 'Planimetria'}
          showBack
          onBack={() => navigation.goBack()}
          rightAction={
            <TouchableOpacity
              onPress={() => navigation.navigate('FloorPlanEditor', { venueId })}
              testID="button-edit-floorplan"
            >
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          }
        />

        <View style={[styles.content, isLandscape && styles.contentLandscape]}>
          <View style={[styles.floorPlanSection, isLandscape && styles.floorPlanSectionLandscape]}>
            <View style={styles.toolbar}>
              <TouchableOpacity style={styles.toolButton} onPress={resetView} testID="button-reset-view">
                <Ionicons name="scan-outline" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <View style={styles.zoomIndicator} testID="zoom-indicator">
                <Text style={styles.zoomText}>Pizzica per zoom</Text>
              </View>
            </View>

            <View style={styles.floorPlanContainer}>
              <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.svgContainer, animatedStyle]} testID="floor-plan-svg">
                  <Svg
                    width={FLOOR_PLAN_SIZE}
                    height={FLOOR_PLAN_SIZE * 1.27}
                    viewBox={`0 0 ${FLOOR_PLAN_SIZE} ${FLOOR_PLAN_SIZE * 1.27}`}
                  >
                    <Rect
                      x={0}
                      y={0}
                      width={FLOOR_PLAN_SIZE}
                      height={FLOOR_PLAN_SIZE * 1.27}
                      fill={colors.surface}
                      stroke={colors.border}
                      strokeWidth={2}
                      rx={12}
                    />
                    {floorPlan?.zones.map(renderZone)}
                  </Svg>
                </Animated.View>
              </GestureDetector>
            </View>
          </View>

          <View style={[styles.legendSection, isLandscape && styles.legendSectionLandscape]}>
            <Card variant="glass" testID="card-legend">
              <View style={[styles.legendContent, isLandscape && styles.legendContentLandscape]}>
                <View style={styles.legendItem} testID="legend-available">
                  <View style={[styles.legendDot, { backgroundColor: colors.teal }]} />
                  <Text style={styles.legendText}>Disponibile</Text>
                </View>
                <View style={styles.legendItem} testID="legend-reserved">
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>Prenotata</Text>
                </View>
                <View style={styles.legendItem} testID="legend-sold">
                  <View style={[styles.legendDot, { backgroundColor: colors.destructive }]} />
                  <Text style={styles.legendText}>Venduta</Text>
                </View>
              </View>
            </Card>
          </View>
        </View>

        <Modal
          visible={showZonePanel}
          animationType="slide"
          transparent
          onRequestClose={() => setShowZonePanel(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowZonePanel(false)}
            testID="modal-overlay"
          >
            <View style={styles.zonePanel}>
              <TouchableOpacity activeOpacity={1}>
                <View style={styles.zonePanelHandle} />
                
                {selectedZone && (
                  <>
                    <View style={styles.zonePanelHeader}>
                      <View style={[styles.zoneTypeIcon, { backgroundColor: `${STATUS_COLORS[selectedZone.status]}20` }]}>
                        <Ionicons
                          name={getZoneTypeIcon(selectedZone.type) as any}
                          size={24}
                          color={STATUS_COLORS[selectedZone.status]}
                        />
                      </View>
                      <View style={styles.zonePanelInfo}>
                        <Text style={styles.zoneName} testID="text-zone-name">{selectedZone.name}</Text>
                        <Text style={styles.zoneType} testID="text-zone-type">{getZoneTypeLabel(selectedZone.type)}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[selectedZone.status]}20` }]} testID="badge-zone-status">
                        <Text style={[styles.statusText, { color: STATUS_COLORS[selectedZone.status] }]}>
                          {selectedZone.status === 'available' ? 'Disponibile' : selectedZone.status === 'reserved' ? 'Prenotata' : 'Venduta'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.zoneStats}>
                      <View style={styles.zoneStat}>
                        <Text style={styles.zoneStatValue} testID="text-zone-capacity">{selectedZone.capacity}</Text>
                        <Text style={styles.zoneStatLabel}>Capacità</Text>
                      </View>
                      <View style={styles.zoneStatDivider} />
                      <View style={styles.zoneStat}>
                        <Text style={styles.zoneStatValue} testID="text-zone-occupancy">{selectedZone.currentOccupancy}</Text>
                        <Text style={styles.zoneStatLabel}>Occupazione</Text>
                      </View>
                      {selectedZone.priceTier && (
                        <>
                          <View style={styles.zoneStatDivider} />
                          <View style={styles.zoneStat}>
                            <Text style={styles.zoneStatValue} testID="text-zone-price">{selectedZone.priceTier}</Text>
                            <Text style={styles.zoneStatLabel}>Tariffa</Text>
                          </View>
                        </>
                      )}
                    </View>

                    <View style={styles.zoneActions}>
                      <TouchableOpacity
                        style={styles.zoneActionButton}
                        onPress={() => {
                          setShowZonePanel(false);
                          navigation.navigate('ZoneDetail', { zoneId: selectedZone.id, zoneName: selectedZone.name });
                        }}
                        testID="button-view-zone-detail"
                      >
                        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                        <Text style={styles.zoneActionText}>Dettagli</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.zoneActionButton}
                        onPress={() => {
                          setShowZonePanel(false);
                          navigation.navigate('FloorPlanEditor', { venueId, zoneId: selectedZone.id });
                        }}
                        testID="button-edit-zone"
                      >
                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                        <Text style={styles.zoneActionText}>Modifica</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  contentLandscape: {
    flexDirection: 'row',
  },
  floorPlanSection: {
    flex: 1,
  },
  floorPlanSectionLandscape: {
    flex: 2,
  },
  legendSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  legendSectionLandscape: {
    flex: 1,
    justifyContent: 'center',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  toolButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoomIndicator: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoomText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
  },
  floorPlanContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  svgContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  legendContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  legendContentLandscape: {
    flexDirection: 'column',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
  },
  legendText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'flex-end',
  },
  zonePanel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  zonePanelHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  zonePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  zoneTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zonePanelInfo: {
    flex: 1,
  },
  zoneName: {
    color: colors.foreground,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  zoneType: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  zoneStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  zoneStat: {
    flex: 1,
    alignItems: 'center',
  },
  zoneStatValue: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  zoneStatLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  zoneStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  zoneActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  zoneActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoneActionText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});

export default FloorPlanViewerScreen;
