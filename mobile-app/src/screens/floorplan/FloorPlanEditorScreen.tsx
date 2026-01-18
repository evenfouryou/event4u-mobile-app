import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Rect, Circle, G, Text as SvgText } from 'react-native-svg';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../lib/theme';
import { Card, Header, Button } from '../../components';
import { api } from '../../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FLOOR_PLAN_SIZE = SCREEN_WIDTH - spacing.lg * 2;

interface Zone {
  id: string;
  name: string;
  type: 'section' | 'table' | 'vip' | 'general' | 'stage' | 'bar';
  status: 'available' | 'reserved' | 'sold';
  capacity: number;
  priceTier?: string;
  priceAmount?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rect' | 'circle';
}

interface EditFormData {
  name: string;
  type: Zone['type'];
  capacity: string;
  priceTier: string;
  priceAmount: string;
  status: Zone['status'];
}

const STATUS_COLORS = {
  available: colors.teal,
  reserved: colors.primary,
  sold: colors.destructive,
};

const ZONE_TYPES: { value: Zone['type']; label: string }[] = [
  { value: 'vip', label: 'VIP' },
  { value: 'section', label: 'Sezione' },
  { value: 'table', label: 'Tavolo' },
  { value: 'general', label: 'Area Generale' },
  { value: 'stage', label: 'Palco' },
  { value: 'bar', label: 'Bar' },
];

const ZONE_STATUSES: { value: Zone['status']; label: string; color: string }[] = [
  { value: 'available', label: 'Disponibile', color: colors.teal },
  { value: 'reserved', label: 'Prenotata', color: colors.primary },
  { value: 'sold', label: 'Venduta', color: colors.destructive },
];

export function FloorPlanEditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { venueId, zoneId, mode } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    type: 'section',
    capacity: '',
    priceTier: '',
    priceAmount: '',
    status: 'available',
  });

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const loadFloorPlan = async () => {
    try {
      setLoading(true);

      const mockZones: Zone[] = [
        { id: '1', name: 'VIP Area', type: 'vip', status: 'reserved', capacity: 50, priceTier: 'VIP', priceAmount: 150, x: 20, y: 20, width: 120, height: 80, shape: 'rect' },
        { id: '2', name: 'Sezione A', type: 'section', status: 'available', capacity: 100, priceTier: 'Standard', priceAmount: 50, x: 160, y: 20, width: 100, height: 80, shape: 'rect' },
        { id: '3', name: 'Sezione B', type: 'section', status: 'sold', capacity: 100, priceTier: 'Standard', priceAmount: 50, x: 20, y: 120, width: 100, height: 80, shape: 'rect' },
        { id: '4', name: 'Palco', type: 'stage', status: 'available', capacity: 0, x: 140, y: 120, width: 120, height: 60, shape: 'rect' },
        { id: '5', name: 'Bar', type: 'bar', status: 'available', capacity: 30, x: 20, y: 220, width: 80, height: 50, shape: 'rect' },
        { id: '6', name: 'Pista', type: 'general', status: 'available', capacity: 200, priceTier: 'Entry', priceAmount: 20, x: 120, y: 200, width: 140, height: 80, shape: 'rect' },
        { id: '7', name: 'Tavolo 1', type: 'table', status: 'reserved', capacity: 8, priceTier: 'Premium', priceAmount: 300, x: 50, y: 310, width: 40, height: 40, shape: 'circle' },
        { id: '8', name: 'Tavolo 2', type: 'table', status: 'available', capacity: 8, priceTier: 'Premium', priceAmount: 300, x: 110, y: 310, width: 40, height: 40, shape: 'circle' },
        { id: '9', name: 'Tavolo 3', type: 'table', status: 'sold', capacity: 8, priceTier: 'Premium', priceAmount: 300, x: 170, y: 310, width: 40, height: 40, shape: 'circle' },
        { id: '10', name: 'Tavolo 4', type: 'table', status: 'available', capacity: 6, priceTier: 'Standard', priceAmount: 200, x: 230, y: 310, width: 35, height: 35, shape: 'circle' },
      ];

      setZones(mockZones);

      if (zoneId) {
        const zone = mockZones.find((z) => z.id === zoneId);
        if (zone) {
          setSelectedZone(zone);
          openEditModal(zone);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFloorPlan();
  }, [venueId, zoneId]);

  const openEditModal = (zone: Zone) => {
    setEditForm({
      name: zone.name,
      type: zone.type,
      capacity: zone.capacity.toString(),
      priceTier: zone.priceTier || '',
      priceAmount: zone.priceAmount?.toString() || '',
      status: zone.status,
    });
    setSelectedZone(zone);
    setShowEditModal(true);
  };

  const handleZonePress = (zone: Zone) => {
    openEditModal(zone);
  };

  const handleSaveZone = async () => {
    if (!selectedZone) return;

    try {
      setSaving(true);

      const updatedZone: Zone = {
        ...selectedZone,
        name: editForm.name,
        type: editForm.type,
        capacity: parseInt(editForm.capacity) || 0,
        priceTier: editForm.priceTier || undefined,
        priceAmount: parseFloat(editForm.priceAmount) || undefined,
        status: editForm.status,
      };

      try {
        await api.put(`/api/floorplan/zones/${selectedZone.id}`, updatedZone);
      } catch (e) {}

      setZones((prev) =>
        prev.map((z) => (z.id === selectedZone.id ? updatedZone : z))
      );

      setHasChanges(true);
      setShowEditModal(false);
      setSelectedZone(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);

      try {
        await api.put(`/api/venues/${venueId}/floorplan`, { zones });
      } catch (e) {}

      Alert.alert('Successo', 'Modifiche salvate con successo', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (hasChanges) {
      Alert.alert(
        'Modifiche non salvate',
        'Sei sicuro di voler uscire senza salvare le modifiche?',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Esci', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
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

  const renderZone = (zone: Zone) => {
    const fillColor = STATUS_COLORS[zone.status] + '40';
    const strokeColor = STATUS_COLORS[zone.status];
    const isSelected = selectedZone?.id === zone.id;
    const scaleRatio = FLOOR_PLAN_SIZE / 300;

    if (zone.shape === 'circle') {
      return (
        <G key={zone.id} onPress={() => handleZonePress(zone)}>
          <Circle
            cx={(zone.x + zone.width / 2) * scaleRatio}
            cy={(zone.y + zone.height / 2) * scaleRatio}
            r={(zone.width / 2) * scaleRatio}
            fill={fillColor}
            stroke={isSelected ? colors.foreground : strokeColor}
            strokeWidth={isSelected ? 3 : 2}
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
          stroke={isSelected ? colors.foreground : strokeColor}
          strokeWidth={isSelected ? 3 : 2}
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
      <View style={styles.container}>
        <Header title="Editor Planimetria" showBack onBack={handleDiscardChanges} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <Header
        title="Editor Planimetria"
        showBack
        onBack={handleDiscardChanges}
        rightAction={
          hasChanges ? (
            <TouchableOpacity onPress={handleSaveAll} data-testid="button-save-all">
              <Text style={styles.saveButtonText}>Salva</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <View style={styles.content}>
        <View style={styles.instructionBanner}>
          <Ionicons name="information-circle-outline" size={20} color={colors.teal} />
          <Text style={styles.instructionText}>
            Tocca una zona per modificare le proprietà
          </Text>
        </View>

        <View style={styles.floorPlanContainer}>
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.svgContainer, animatedStyle]}>
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
                {zones.map(renderZone)}
              </Svg>
            </Animated.View>
          </GestureDetector>
        </View>

        <View style={styles.legendContainer}>
          <Card variant="glass">
            <View style={styles.legendContent}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.teal }]} />
                <Text style={styles.legendText}>Disponibile</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.legendText}>Prenotata</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.destructive }]} />
                <Text style={styles.legendText}>Venduta</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.editorNote}>
          <Card variant="outline">
            <View style={styles.editorNoteContent}>
              <Ionicons name="desktop-outline" size={24} color={colors.mutedForeground} />
              <Text style={styles.editorNoteText}>
                Per disegnare nuove zone, usa l'editor web. La versione mobile consente solo modifiche rapide alle proprietà.
              </Text>
            </View>
          </Card>
        </View>
      </View>

      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditModal(false)}
        >
          <View style={[styles.editPanel, { paddingBottom: insets.bottom + spacing.lg }]}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.editPanelHandle} />

              <Text style={styles.editPanelTitle}>Modifica Zona</Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Nome Zona</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.name}
                    onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                    placeholder="Nome della zona"
                    placeholderTextColor={colors.mutedForeground}
                    data-testid="input-zone-name"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Tipo</Text>
                  <View style={styles.typeGrid}>
                    {ZONE_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.typeButton,
                          editForm.type === type.value && styles.typeButtonActive,
                        ]}
                        onPress={() => setEditForm({ ...editForm, type: type.value })}
                        data-testid={`button-type-${type.value}`}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            editForm.type === type.value && styles.typeButtonTextActive,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Capacità</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.capacity}
                    onChangeText={(text) => setEditForm({ ...editForm, capacity: text })}
                    placeholder="Numero di posti"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    data-testid="input-zone-capacity"
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Tariffa</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editForm.priceTier}
                      onChangeText={(text) => setEditForm({ ...editForm, priceTier: text })}
                      placeholder="es. VIP, Standard"
                      placeholderTextColor={colors.mutedForeground}
                      data-testid="input-zone-price-tier"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Prezzo €</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editForm.priceAmount}
                      onChangeText={(text) => setEditForm({ ...editForm, priceAmount: text })}
                      placeholder="0.00"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="decimal-pad"
                      data-testid="input-zone-price-amount"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Stato</Text>
                  <View style={styles.statusGrid}>
                    {ZONE_STATUSES.map((status) => (
                      <TouchableOpacity
                        key={status.value}
                        style={[
                          styles.statusButton,
                          { borderColor: status.color },
                          editForm.status === status.value && { backgroundColor: `${status.color}20` },
                        ]}
                        onPress={() => setEditForm({ ...editForm, status: status.value })}
                        data-testid={`button-status-${status.value}`}
                      >
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text
                          style={[
                            styles.statusButtonText,
                            editForm.status === status.value && { color: status.color },
                          ]}
                        >
                          {status.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowEditModal(false)}
                    data-testid="button-cancel-edit"
                  >
                    <Text style={styles.cancelButtonText}>Annulla</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveZone}
                    disabled={saving}
                    data-testid="button-save-zone"
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <Text style={styles.saveButtonTextPrimary}>Salva Modifiche</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  saveButtonText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.teal}15`,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${colors.teal}30`,
  },
  instructionText: {
    color: colors.teal,
    fontSize: fontSize.sm,
    flex: 1,
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
  legendContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  legendContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
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
  editorNote: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  editorNoteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  editorNoteText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    flex: 1,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'flex-end',
  },
  editPanel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: '80%',
  },
  editPanelHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  editPanelTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formLabel: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.foreground,
    fontSize: fontSize.base,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  typeButtonTextActive: {
    color: colors.primaryForeground,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  statusButtonText: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  cancelButtonText: {
    color: colors.foreground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  saveButton: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  saveButtonTextPrimary: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

export default FloorPlanEditorScreen;
