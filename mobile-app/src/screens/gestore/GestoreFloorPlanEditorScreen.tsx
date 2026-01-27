import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Dimensions, PanResponder, GestureResponderEvent, PanResponderGestureState, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors, spacing, typography, borderRadius } from '@/lib/theme';
import { Card } from '@/components/Card';
import { SafeArea } from '@/components/SafeArea';
import { Header } from '@/components/Header';
import { Loading } from '@/components/Loading';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/lib/haptics';
import api, { FloorPlanEditorData, FloorPlanEditorZone, FloorPlanEditorTable, FloorPlanEditorStage } from '@/lib/api';

interface GestoreFloorPlanEditorScreenProps {
  locationId: string;
  onBack: () => void;
  onSave?: (data: FloorPlanEditorData) => void;
}

type ToolType = 'select' | 'draw_zone' | 'add_table' | 'add_stage' | 'eraser';
type ZoneType = 'dance_floor' | 'vip' | 'bar' | 'stage' | 'entrance' | 'exit' | 'restroom';

interface HistoryState {
  zones: FloorPlanEditorZone[];
  tables: FloorPlanEditorTable[];
  stages: FloorPlanEditorStage[];
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const GRID_SIZE = 20;

const ZONE_COLORS: Record<ZoneType, string> = {
  dance_floor: '#8B5CF6',
  vip: '#FFD700',
  bar: '#3B82F6',
  stage: '#EC4899',
  entrance: '#22C55E',
  exit: '#EF4444',
  restroom: '#6B7280',
};

const ZONE_LABELS: Record<ZoneType, string> = {
  dance_floor: 'Pista',
  vip: 'VIP',
  bar: 'Bar',
  stage: 'Palco',
  entrance: 'Ingresso',
  exit: 'Uscita',
  restroom: 'Bagni',
};

const TOOL_LABELS: Record<ToolType, string> = {
  select: 'Seleziona',
  draw_zone: 'Disegna Zona',
  add_table: 'Aggiungi Tavolo',
  add_stage: 'Aggiungi Palco',
  eraser: 'Cancella',
};

const TOOL_ICONS: Record<ToolType, keyof typeof Ionicons.glyphMap> = {
  select: 'hand-left-outline',
  draw_zone: 'square-outline',
  add_table: 'ellipse-outline',
  add_stage: 'stop-outline',
  eraser: 'trash-outline',
};

export function GestoreFloorPlanEditorScreen({ locationId, onBack, onSave }: GestoreFloorPlanEditorScreenProps) {
  const { colors } = useTheme();
  const [floorPlan, setFloorPlan] = useState<FloorPlanEditorData | null>(null);
  const [zones, setZones] = useState<FloorPlanEditorZone[]>([]);
  const [tables, setTables] = useState<FloorPlanEditorTable[]>([]);
  const [stages, setStages] = useState<FloorPlanEditorStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedZoneType, setSelectedZoneType] = useState<ZoneType>('vip');
  const [selectedElement, setSelectedElement] = useState<{ type: 'zone' | 'table' | 'stage'; id: string } | null>(null);
  
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [floorPlanName, setFloorPlanName] = useState('');
  
  const [propertyName, setPropertyName] = useState('');
  const [propertyCapacity, setPropertyCapacity] = useState('');
  const [propertyColor, setPropertyColor] = useState('');
  const [propertySeats, setPropertySeats] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadFloorPlan();
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
    if (selectedElement) {
      if (selectedElement.type === 'zone') {
        const zone = zones.find(z => z.id === selectedElement.id);
        if (zone) {
          setPropertyName(zone.name);
          setPropertyCapacity(zone.capacity.toString());
          setPropertyColor(zone.color);
        }
      } else if (selectedElement.type === 'table') {
        const table = tables.find(t => t.id === selectedElement.id);
        if (table) {
          setPropertyName(table.name);
          setPropertySeats(table.seats.toString());
        }
      } else if (selectedElement.type === 'stage') {
        const stage = stages.find(s => s.id === selectedElement.id);
        if (stage) {
          setPropertyName(stage.name);
        }
      }
    } else {
      setPropertyName('');
      setPropertyCapacity('');
      setPropertyColor('');
      setPropertySeats('');
    }
  }, [selectedElement, zones, tables, stages]);

  const saveToHistory = useCallback(() => {
    const newState: HistoryState = {
      zones: [...zones],
      tables: [...tables],
      stages: [...stages],
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [zones, tables, stages, history, historyIndex]);

  const loadFloorPlan = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getFloorPlanEditor(locationId);
      setFloorPlan(data);
      setFloorPlanName(data.name || '');
      setZones(data.zones || []);
      setTables(data.tables || []);
      setStages(data.stages || []);
      const initialState: HistoryState = {
        zones: data.zones || [],
        tables: data.tables || [],
        stages: data.stages || [],
      };
      setHistory([initialState]);
      setHistoryIndex(0);
    } catch (err) {
      console.error('Error loading floor plan:', err);
      setFloorPlan({
        id: '',
        locationId,
        name: '',
        zones: [],
        tables: [],
        stages: [],
      });
      const initialState: HistoryState = { zones: [], tables: [], stages: [] };
      setHistory([initialState]);
      setHistoryIndex(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      triggerHaptic('light');
      const prevIndex = historyIndex - 1;
      const prevState = history[prevIndex];
      setZones(prevState.zones);
      setTables(prevState.tables);
      setStages(prevState.stages);
      setHistoryIndex(prevIndex);
      setSelectedElement(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      triggerHaptic('light');
      const nextIndex = historyIndex + 1;
      const nextState = history[nextIndex];
      setZones(nextState.zones);
      setTables(nextState.tables);
      setStages(nextState.stages);
      setHistoryIndex(nextIndex);
      setSelectedElement(null);
    }
  };

  const handleToolSelect = (tool: ToolType) => {
    triggerHaptic('light');
    setActiveTool(tool);
    setSelectedElement(null);
    setDrawingPoints([]);
    setIsDrawing(false);
  };

  const handleZoneTypeSelect = (type: ZoneType) => {
    triggerHaptic('light');
    setSelectedZoneType(type);
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

  const handleToggleGrid = () => {
    triggerHaptic('light');
    setShowGrid(prev => !prev);
  };

  const snapToGrid = (value: number): number => {
    if (!showGrid) return value;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleCanvasPress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const x = snapToGrid(locationX / scale);
    const y = snapToGrid(locationY / scale);

    if (activeTool === 'add_table') {
      triggerHaptic('medium');
      const newTable: FloorPlanEditorTable = {
        id: generateId(),
        name: `Tavolo ${tables.length + 1}`,
        x,
        y,
        seats: 4,
        shape: 'round',
      };
      setTables(prev => [...prev, newTable]);
      saveToHistory();
    } else if (activeTool === 'add_stage') {
      triggerHaptic('medium');
      const newStage: FloorPlanEditorStage = {
        id: generateId(),
        name: `Palco ${stages.length + 1}`,
        x,
        y,
        width: 100,
        height: 60,
      };
      setStages(prev => [...prev, newStage]);
      saveToHistory();
    } else if (activeTool === 'draw_zone') {
      if (!isDrawing) {
        setIsDrawing(true);
        setDrawingPoints([{ x, y }]);
      } else {
        const newPoints = [...drawingPoints, { x, y }];
        setDrawingPoints(newPoints);
        if (newPoints.length >= 3) {
          const firstPoint = newPoints[0];
          const distance = Math.sqrt(Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2));
          if (distance < 30) {
            triggerHaptic('success');
            const newZone: FloorPlanEditorZone = {
              id: generateId(),
              type: selectedZoneType,
              name: `${ZONE_LABELS[selectedZoneType]} ${zones.length + 1}`,
              points: newPoints.slice(0, -1),
              color: ZONE_COLORS[selectedZoneType],
              capacity: 50,
            };
            setZones(prev => [...prev, newZone]);
            setDrawingPoints([]);
            setIsDrawing(false);
            saveToHistory();
          }
        }
      }
    } else if (activeTool === 'select') {
      setSelectedElement(null);
    }
  };

  const handleElementPress = (type: 'zone' | 'table' | 'stage', id: string) => {
    triggerHaptic('light');
    if (activeTool === 'eraser') {
      triggerHaptic('medium');
      if (type === 'zone') {
        setZones(prev => prev.filter(z => z.id !== id));
      } else if (type === 'table') {
        setTables(prev => prev.filter(t => t.id !== id));
      } else if (type === 'stage') {
        setStages(prev => prev.filter(s => s.id !== id));
      }
      saveToHistory();
    } else if (activeTool === 'select') {
      setSelectedElement({ type, id });
    }
  };

  const handlePropertyUpdate = () => {
    if (!selectedElement) return;
    triggerHaptic('light');

    if (selectedElement.type === 'zone') {
      setZones(prev => prev.map(z => {
        if (z.id === selectedElement.id) {
          return {
            ...z,
            name: propertyName || z.name,
            capacity: parseInt(propertyCapacity) || z.capacity,
            color: propertyColor || z.color,
          };
        }
        return z;
      }));
    } else if (selectedElement.type === 'table') {
      setTables(prev => prev.map(t => {
        if (t.id === selectedElement.id) {
          return {
            ...t,
            name: propertyName || t.name,
            seats: parseInt(propertySeats) || t.seats,
          };
        }
        return t;
      }));
    } else if (selectedElement.type === 'stage') {
      setStages(prev => prev.map(s => {
        if (s.id === selectedElement.id) {
          return {
            ...s,
            name: propertyName || s.name,
          };
        }
        return s;
      }));
    }
    saveToHistory();
  };

  const handleSave = async () => {
    try {
      triggerHaptic('medium');
      setIsSaving(true);
      const data: FloorPlanEditorData = {
        id: floorPlan?.id || generateId(),
        locationId,
        name: floorPlanName || 'Planimetria',
        zones,
        tables,
        stages,
      };
      await api.saveFloorPlan(data);
      triggerHaptic('success');
      Alert.alert('Successo', 'Planimetria salvata con successo!');
      onSave?.(data);
    } catch (err) {
      console.error('Error saving floor plan:', err);
      triggerHaptic('error');
      Alert.alert('Errore', 'Impossibile salvare la planimetria');
    } finally {
      setIsSaving(false);
    }
  };

  const renderGrid = () => {
    if (!showGrid) return null;
    const gridLines = [];
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      gridLines.push(
        <View
          key={`v-${x}`}
          style={[
            styles.gridLine,
            styles.gridLineVertical,
            { left: x * scale, height: CANVAS_HEIGHT * scale, backgroundColor: colors.border },
          ]}
        />
      );
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      gridLines.push(
        <View
          key={`h-${y}`}
          style={[
            styles.gridLine,
            styles.gridLineHorizontal,
            { top: y * scale, width: CANVAS_WIDTH * scale, backgroundColor: colors.border },
          ]}
        />
      );
    }
    return gridLines;
  };

  const renderZones = () => {
    return zones.map(zone => {
      const isSelected = selectedElement?.type === 'zone' && selectedElement.id === zone.id;
      const points = zone.points.map(p => `${p.x * scale},${p.y * scale}`).join(' ');
      const minX = Math.min(...zone.points.map(p => p.x));
      const minY = Math.min(...zone.points.map(p => p.y));
      const maxX = Math.max(...zone.points.map(p => p.x));
      const maxY = Math.max(...zone.points.map(p => p.y));
      const width = (maxX - minX) * scale;
      const height = (maxY - minY) * scale;
      const centerX = ((minX + maxX) / 2) * scale;
      const centerY = ((minY + maxY) / 2) * scale;

      return (
        <Pressable
          key={zone.id}
          onPress={() => handleElementPress('zone', zone.id)}
          style={[
            styles.zoneContainer,
            {
              left: minX * scale,
              top: minY * scale,
              width,
              height,
              backgroundColor: `${zone.color}40`,
              borderColor: isSelected ? colors.primary : zone.color,
              borderWidth: isSelected ? 3 : 2,
            },
          ]}
          testID={`zone-${zone.id}`}
        >
          <Text style={[styles.zoneName, { color: zone.color }]} numberOfLines={1}>
            {zone.name}
          </Text>
          <Text style={[styles.zoneCapacity, { color: zone.color }]}>
            {zone.capacity} posti
          </Text>
        </Pressable>
      );
    });
  };

  const renderTables = () => {
    return tables.map(table => {
      const isSelected = selectedElement?.type === 'table' && selectedElement.id === table.id;
      const size = 40 * scale;

      return (
        <Pressable
          key={table.id}
          onPress={() => handleElementPress('table', table.id)}
          style={[
            styles.tableContainer,
            {
              left: (table.x - 20) * scale,
              top: (table.y - 20) * scale,
              width: size,
              height: size,
              borderRadius: table.shape === 'round' ? size / 2 : borderRadius.sm,
              backgroundColor: isSelected ? colors.primary : colors.card,
              borderColor: isSelected ? colors.primary : colors.border,
            },
          ]}
          testID={`table-${table.id}`}
        >
          <Text style={[styles.tableName, { color: isSelected ? colors.primaryForeground : colors.foreground }]} numberOfLines={1}>
            {table.seats}
          </Text>
        </Pressable>
      );
    });
  };

  const renderStages = () => {
    return stages.map(stage => {
      const isSelected = selectedElement?.type === 'stage' && selectedElement.id === stage.id;

      return (
        <Pressable
          key={stage.id}
          onPress={() => handleElementPress('stage', stage.id)}
          style={[
            styles.stageContainer,
            {
              left: stage.x * scale,
              top: stage.y * scale,
              width: stage.width * scale,
              height: stage.height * scale,
              backgroundColor: isSelected ? staticColors.pink : `${staticColors.pink}60`,
              borderColor: isSelected ? colors.primary : staticColors.pink,
            },
          ]}
          testID={`stage-${stage.id}`}
        >
          <Text style={[styles.stageName, { color: '#fff' }]} numberOfLines={1}>
            {stage.name}
          </Text>
        </Pressable>
      );
    });
  };

  const renderDrawingPreview = () => {
    if (!isDrawing || drawingPoints.length === 0) return null;

    return drawingPoints.map((point, index) => (
      <View
        key={index}
        style={[
          styles.drawingPoint,
          {
            left: point.x * scale - 6,
            top: point.y * scale - 6,
            backgroundColor: ZONE_COLORS[selectedZoneType],
          },
        ]}
      />
    ));
  };

  const renderToolbar = () => (
    <View style={[styles.toolbar, { backgroundColor: colors.card }]}>
      <Text style={[styles.toolbarTitle, { color: colors.foreground }]}>Strumenti</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsRow}>
        {(Object.keys(TOOL_LABELS) as ToolType[]).map(tool => (
          <Pressable
            key={tool}
            onPress={() => handleToolSelect(tool)}
            style={[
              styles.toolButton,
              {
                backgroundColor: activeTool === tool ? colors.primary : colors.secondary,
              },
            ]}
            testID={`tool-${tool}`}
          >
            <Ionicons
              name={TOOL_ICONS[tool]}
              size={20}
              color={activeTool === tool ? colors.primaryForeground : colors.foreground}
            />
            <Text
              style={[
                styles.toolLabel,
                { color: activeTool === tool ? colors.primaryForeground : colors.foreground },
              ]}
              numberOfLines={1}
            >
              {TOOL_LABELS[tool]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderZoneTypes = () => {
    if (activeTool !== 'draw_zone') return null;

    return (
      <View style={[styles.zoneTypesContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.zoneTypesTitle, { color: colors.foreground }]}>Tipo Zona</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zoneTypesRow}>
          {(Object.keys(ZONE_LABELS) as ZoneType[]).map(type => (
            <Pressable
              key={type}
              onPress={() => handleZoneTypeSelect(type)}
              style={[
                styles.zoneTypeButton,
                {
                  backgroundColor: selectedZoneType === type ? ZONE_COLORS[type] : colors.secondary,
                  borderColor: ZONE_COLORS[type],
                },
              ]}
              testID={`zone-type-${type}`}
            >
              <Text
                style={[
                  styles.zoneTypeLabel,
                  { color: selectedZoneType === type ? '#fff' : colors.foreground },
                ]}
              >
                {ZONE_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderPropertiesPanel = () => {
    if (!selectedElement) return null;

    const elementType = selectedElement.type === 'zone' ? 'Zona' : selectedElement.type === 'table' ? 'Tavolo' : 'Palco';

    return (
      <Card style={styles.propertiesCard} testID="properties-panel">
        <View style={styles.propertiesHeader}>
          <Text style={[styles.propertiesTitle, { color: colors.foreground }]}>
            Proprietà {elementType}
          </Text>
          <Pressable onPress={() => setSelectedElement(null)} testID="button-close-properties">
            <Ionicons name="close" size={24} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={styles.propertiesForm}>
          <View style={styles.propertyRow}>
            <Text style={[styles.propertyLabel, { color: colors.mutedForeground }]}>Nome</Text>
            <Input
              value={propertyName}
              onChangeText={setPropertyName}
              placeholder="Nome elemento"
              style={styles.propertyInput}
              testID="input-property-name"
            />
          </View>

          {selectedElement.type === 'zone' && (
            <>
              <View style={styles.propertyRow}>
                <Text style={[styles.propertyLabel, { color: colors.mutedForeground }]}>Capacità</Text>
                <Input
                  value={propertyCapacity}
                  onChangeText={setPropertyCapacity}
                  placeholder="Capacità"
                  keyboardType="numeric"
                  style={styles.propertyInput}
                  testID="input-property-capacity"
                />
              </View>
              <View style={styles.propertyRow}>
                <Text style={[styles.propertyLabel, { color: colors.mutedForeground }]}>Colore</Text>
                <View style={styles.colorPicker}>
                  {Object.values(ZONE_COLORS).map(color => (
                    <Pressable
                      key={color}
                      onPress={() => setPropertyColor(color)}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color, borderColor: propertyColor === color ? colors.primary : 'transparent' },
                      ]}
                      testID={`color-${color}`}
                    />
                  ))}
                </View>
              </View>
            </>
          )}

          {selectedElement.type === 'table' && (
            <View style={styles.propertyRow}>
              <Text style={[styles.propertyLabel, { color: colors.mutedForeground }]}>Posti</Text>
              <Input
                value={propertySeats}
                onChangeText={setPropertySeats}
                placeholder="Numero posti"
                keyboardType="numeric"
                style={styles.propertyInput}
                testID="input-property-seats"
              />
            </View>
          )}

          <Button
            onPress={handlePropertyUpdate}
            style={styles.applyButton}
            testID="button-apply-properties"
          >
            Applica
          </Button>
        </View>
      </Card>
    );
  };

  const renderControls = () => (
    <View style={styles.controlsContainer}>
      <View style={styles.controlsRow}>
        <View style={styles.zoomControls}>
          <Pressable
            style={[styles.controlButton, { backgroundColor: colors.secondary }]}
            onPress={handleZoomOut}
            testID="button-zoom-out"
          >
            <Ionicons name="remove" size={20} color={colors.foreground} />
          </Pressable>
          <Pressable
            style={[styles.controlButton, { backgroundColor: colors.secondary }]}
            onPress={handleResetZoom}
            testID="button-zoom-reset"
          >
            <Text style={[styles.zoomText, { color: colors.foreground }]}>{Math.round(scale * 100)}%</Text>
          </Pressable>
          <Pressable
            style={[styles.controlButton, { backgroundColor: colors.secondary }]}
            onPress={handleZoomIn}
            testID="button-zoom-in"
          >
            <Ionicons name="add" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        <Pressable
          style={[styles.controlButton, { backgroundColor: showGrid ? colors.primary : colors.secondary }]}
          onPress={handleToggleGrid}
          testID="button-toggle-grid"
        >
          <Ionicons name="grid-outline" size={20} color={showGrid ? colors.primaryForeground : colors.foreground} />
        </Pressable>

        <View style={styles.historyControls}>
          <Pressable
            style={[styles.controlButton, { backgroundColor: colors.secondary, opacity: historyIndex <= 0 ? 0.5 : 1 }]}
            onPress={handleUndo}
            disabled={historyIndex <= 0}
            testID="button-undo"
          >
            <Ionicons name="arrow-undo" size={20} color={colors.foreground} />
          </Pressable>
          <Pressable
            style={[styles.controlButton, { backgroundColor: colors.secondary, opacity: historyIndex >= history.length - 1 ? 0.5 : 1 }]}
            onPress={handleRedo}
            disabled={historyIndex >= history.length - 1}
            testID="button-redo"
          >
            <Ionicons name="arrow-redo" size={20} color={colors.foreground} />
          </Pressable>
        </View>
      </View>
    </View>
  );

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

  return (
    <SafeArea edges={['bottom']} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }]) as ViewStyle}>
      <Header
        showLogo
        showBack
        onBack={onBack}
        testID="header-floor-plan-editor"
      />

      <View style={styles.titleContainer}>
        <View style={styles.titleRow}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Editor Planimetria</Text>
          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={isSaving}
            testID="button-save"
          >
            {isSaving ? (
              <Loading size="small" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color={colors.primaryForeground} />
                <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>Salva</Text>
              </>
            )}
          </Pressable>
        </View>
        <Input
          value={floorPlanName}
          onChangeText={setFloorPlanName}
          placeholder="Nome planimetria..."
          style={styles.nameInput}
          testID="input-floorplan-name"
        />
      </View>

      {showLoader ? (
        <Loading text="Caricamento editor..." />
      ) : error ? (
        renderError()
      ) : (
        <View style={styles.content}>
          {renderToolbar()}
          {renderZoneTypes()}
          {renderControls()}

          <ScrollView
            ref={scrollViewRef}
            style={styles.canvasScrollView}
            contentContainerStyle={styles.canvasScrollContent}
            horizontal
            showsHorizontalScrollIndicator
            showsVerticalScrollIndicator
            maximumZoomScale={3}
            minimumZoomScale={0.5}
          >
            <ScrollView nestedScrollEnabled contentContainerStyle={styles.canvasScrollContent}>
              <Pressable
                style={[
                  styles.canvas,
                  {
                    width: CANVAS_WIDTH * scale,
                    height: CANVAS_HEIGHT * scale,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleCanvasPress}
                testID="canvas"
              >
                {renderGrid()}
                {renderZones()}
                {renderStages()}
                {renderTables()}
                {renderDrawingPreview()}
              </Pressable>
            </ScrollView>
          </ScrollView>

          {isDrawing && (
            <View style={[styles.drawingHint, { backgroundColor: colors.card }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.drawingHintText, { color: colors.foreground }]}>
                Tocca per aggiungere punti. Torna vicino al primo punto per chiudere la zona.
              </Text>
            </View>
          )}

          {renderPropertiesPanel()}
        </View>
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
    paddingBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  screenTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  nameInput: {
    marginTop: spacing.xs,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  saveButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  toolbar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  toolbarTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  toolLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  zoneTypesContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  zoneTypesTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  zoneTypesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  zoneTypeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
  },
  zoneTypeLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  controlsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  zoomControls: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  historyControls: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  canvasScrollView: {
    flex: 1,
  },
  canvasScrollContent: {
    padding: spacing.lg,
  },
  canvas: {
    position: 'relative',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    opacity: 0.3,
  },
  gridLineVertical: {
    width: 1,
  },
  gridLineHorizontal: {
    height: 1,
  },
  zoneContainer: {
    position: 'absolute',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  zoneName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  zoneCapacity: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  tableContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  tableName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  stageContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: borderRadius.sm,
  },
  stageName: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  drawingPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  drawingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
  },
  drawingHintText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  propertiesCard: {
    position: 'absolute',
    bottom: 24,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
  },
  propertiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  propertiesTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  propertiesForm: {
    gap: spacing.sm,
  },
  propertyRow: {
    gap: spacing.xs,
  },
  propertyLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  propertyInput: {
    marginTop: 4,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
  },
  applyButton: {
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

export default GestoreFloorPlanEditorScreen;
