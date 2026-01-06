import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SmartAssistModal } from "@/components/smart-assist-modal";
import {
  ArrowLeft,
  Plus,
  MousePointer2,
  Trash2,
  Grid3X3,
  Save,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Eye,
  Layers,
  Undo,
  Redo,
  Settings,
  Check,
  X,
  Flame,
  Sparkles,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";

interface FloorPlanZone {
  id: string;
  name: string;
  zoneType: string;
  coordinates: { x: number; y: number }[];
  fillColor: string | null;
  strokeColor: string | null;
  opacity: string | null;
  capacity: number | null;
  defaultSectorCode: string | null;
  isSelectable: boolean;
}

interface FloorPlanSeat {
  id: string;
  zoneId: string;
  seatLabel: string;
  row: string | null;
  seatNumber: number | null;
  posX: string;
  posY: string;
  isAccessible: boolean;
  isBlocked: boolean;
  isActive: boolean;
  sortOrder: number | null;
}

interface FloorPlan {
  id: string;
  name: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  locationId: string;
  isDefault: boolean;
  isActive: boolean;
}

interface FloorPlanVersion {
  id: string;
  floorPlanId: string;
  version: number;
  status: string;
  zonesSnapshot: FloorPlanZone[];
  seatsSnapshot: any[];
  notes: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface HeatmapZone {
  zoneId: string;
  zoneName?: string;
  totalCapacity?: number;
  totalSeats?: number;
  available?: number;
  soldSeats?: number;
  held?: number;
  sold?: number;
  blocked?: number;
  occupancyPercent: number;
  popularityScore?: number;
  color: string;
}

type EditorTool = 'select' | 'draw' | 'delete';

const ZONE_TYPES = [
  { value: 'sector', label: 'Settore' },
  { value: 'table', label: 'Tavolo' },
  { value: 'area', label: 'Area' },
  { value: 'stage', label: 'Palco' },
  { value: 'bar', label: 'Bar' },
  { value: 'entrance', label: 'Ingresso' },
];

const ZONE_COLORS = [
  '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

export default function FloorPlanEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  
  const searchParams = new URLSearchParams(searchString);
  const eventId = searchParams.get('eventId');
  
  const [currentTool, setCurrentTool] = useState<EditorTool>('select');
  const [showGrid, setShowGrid] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zones, setZones] = useState<FloorPlanZone[]>([]);
  const [draftVersionId, setDraftVersionId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showNewZoneDialog, setShowNewZoneDialog] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState('sector');
  const [newZoneColor, setNewZoneColor] = useState('#3b82f6');
  
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSmartAssist, setShowSmartAssist] = useState(false);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  
  const [zoneSeats, setZoneSeats] = useState<FloorPlanSeat[]>([]);
  const [seatRows, setSeatRows] = useState(5);
  const [seatsPerRow, setSeatsPerRow] = useState(10);
  const [showSeatEditDialog, setShowSeatEditDialog] = useState(false);
  const [editingSeat, setEditingSeat] = useState<FloorPlanSeat | null>(null);
  
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const translateRef = useRef({ x: 0, y: 0 });
  
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 4;

  const { data: floorPlan, isLoading: loadingPlan } = useQuery<FloorPlan & { zones: FloorPlanZone[] }>({
    queryKey: ['/api/floor-plans', id],
    enabled: !!id,
  });

  const { data: versions } = useQuery<FloorPlanVersion[]>({
    queryKey: ['/api/floor-plans', id, 'versions'],
    enabled: !!id,
  });

  const { data: heatmapData, isLoading: loadingHeatmap } = useQuery<{ heatmap: HeatmapZone[] }>({
    queryKey: ['/api/events', eventId, 'heatmap'],
    enabled: !!eventId && showHeatmap,
    refetchInterval: showHeatmap ? 30000 : false,
  });

  const heatmapZones = useMemo(() => {
    if (!heatmapData?.heatmap) return new Map<string, HeatmapZone>();
    const map = new Map<string, HeatmapZone>();
    heatmapData.heatmap.forEach(hz => map.set(hz.zoneId, hz));
    return map;
  }, [heatmapData]);

  const { data: seatsData, refetch: refetchSeats } = useQuery<FloorPlanSeat[]>({
    queryKey: ['/api/admin/zones', selectedZoneId, 'seats'],
    enabled: !!selectedZoneId,
  });

  useEffect(() => {
    if (seatsData) {
      setZoneSeats(seatsData);
    } else {
      setZoneSeats([]);
    }
  }, [seatsData]);

  const generateSeatsMutation = useMutation({
    mutationFn: async ({ zoneId, rows, seatsPerRow }: { zoneId: string; rows: number; seatsPerRow: number }) => {
      const res = await apiRequest('POST', `/api/admin/zones/${zoneId}/seats/generate`, {
        rows,
        seatsPerRow,
        startRow: 'A',
        labelFormat: '{row}{seat}',
      });
      return res.json();
    },
    onSuccess: (data) => {
      setZoneSeats(data.seats);
      toast({ title: "Posti generati", description: `${data.count} posti creati con successo` });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile generare i posti", variant: "destructive" });
    },
  });

  const updateSeatMutation = useMutation({
    mutationFn: async ({ seatId, updates }: { seatId: string; updates: Partial<FloorPlanSeat> }) => {
      const res = await apiRequest('PATCH', `/api/admin/seats/${seatId}`, updates);
      return res.json();
    },
    onSuccess: (updated) => {
      setZoneSeats(prev => prev.map(s => s.id === updated.id ? updated : s));
      setShowSeatEditDialog(false);
      setEditingSeat(null);
      toast({ title: "Posto aggiornato", description: `${updated.seatLabel} modificato con successo` });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare il posto", variant: "destructive" });
    },
  });

  const deleteSeatsMutation = useMutation({
    mutationFn: async (zoneId: string) => {
      const res = await apiRequest('DELETE', `/api/admin/zones/${zoneId}/seats`);
      return res.json();
    },
    onSuccess: () => {
      setZoneSeats([]);
      toast({ title: "Posti eliminati", description: "Tutti i posti sono stati rimossi" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare i posti", variant: "destructive" });
    },
  });

  const getZoneFillColor = useCallback((zone: FloorPlanZone) => {
    if (showHeatmap && heatmapZones.has(zone.id)) {
      return heatmapZones.get(zone.id)!.color;
    }
    return zone.fillColor || '#3b82f6';
  }, [showHeatmap, heatmapZones]);

  const getZoneOpacity = useCallback((zone: FloorPlanZone) => {
    if (showHeatmap && heatmapZones.has(zone.id)) {
      return 0.6;
    }
    return Number(zone.opacity) || 0.4;
  }, [showHeatmap, heatmapZones]);

  const createDraftMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/floor-plans/${id}/versions`);
      return res.json();
    },
    onSuccess: (data: FloorPlanVersion) => {
      setDraftVersionId(data.id);
      setZones(data.zonesSnapshot || []);
      toast({ title: "Bozza creata", description: `Versione ${data.version} pronta per la modifica` });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile creare la bozza", variant: "destructive" });
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!draftVersionId) throw new Error("No draft version");
      const res = await apiRequest('PATCH', `/api/floor-plan-versions/${draftVersionId}`, {
        zonesSnapshot: zones,
      });
      return res.json();
    },
    onSuccess: () => {
      setHasChanges(false);
      toast({ title: "Salvato", description: "Bozza salvata con successo" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile salvare la bozza", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!draftVersionId) throw new Error("No draft version");
      const res = await apiRequest('POST', `/api/floor-plan-versions/${draftVersionId}/publish`);
      return res.json();
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/floor-plans', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/floor-plans', id, 'versions'] });
      toast({ title: "Pubblicato", description: "La planimetria è ora attiva" });
      setLocation(`/locations/${floorPlan?.locationId}`);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile pubblicare", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (floorPlan?.zones && !draftVersionId) {
      setZones(floorPlan.zones);
    }
  }, [floorPlan?.zones, draftVersionId]);

  useEffect(() => {
    if (versions) {
      const existingDraft = versions.find(v => v.status === 'draft');
      if (existingDraft) {
        setDraftVersionId(existingDraft.id);
        setZones(existingDraft.zonesSnapshot || []);
      }
    }
  }, [versions]);

  const clampTranslate = useCallback((tx: number, ty: number, currentScale: number) => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    const containerWidth = containerRef.current?.clientWidth || 600;
    const containerHeight = containerRef.current?.clientHeight || 400;
    const maxX = 0;
    const minX = containerWidth - (containerWidth * currentScale);
    const maxY = 0;
    const minY = containerHeight - (containerHeight * currentScale);
    return {
      x: Math.min(maxX, Math.max(minX, tx)),
      y: Math.min(maxY, Math.max(minY, ty)),
    };
  }, []);

  const handleZoomIn = () => {
    setScale(prev => {
      const newScale = Math.min(MAX_SCALE, prev * 1.3);
      const clamped = clampTranslate(translate.x, translate.y, newScale);
      setTranslate(clamped);
      translateRef.current = clamped;
      return newScale;
    });
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(MIN_SCALE, prev / 1.3);
      if (newScale <= 1) {
        setTranslate({ x: 0, y: 0 });
        translateRef.current = { x: 0, y: 0 };
      } else {
        const clamped = clampTranslate(translate.x, translate.y, newScale);
        setTranslate(clamped);
        translateRef.current = clamped;
      }
      return newScale;
    });
  };

  const handleReset = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    translateRef.current = { x: 0, y: 0 };
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    
    setScale(prev => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev * delta));
      if (newScale <= 1) {
        setTranslate({ x: 0, y: 0 });
        translateRef.current = { x: 0, y: 0 };
      } else {
        const pointXInContent = (mouseX - translate.x) / prev;
        const pointYInContent = (mouseY - translate.y) / prev;
        const newTranslateX = mouseX - pointXInContent * newScale;
        const newTranslateY = mouseY - pointYInContent * newScale;
        const clamped = clampTranslate(newTranslateX, newTranslateY, newScale);
        setTranslate(clamped);
        translateRef.current = clamped;
      }
      return newScale;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (currentTool === 'select' && scale > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      const clamped = clampTranslate(newX, newY, scale);
      translateRef.current = clamped;
      setTranslate(clamped);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getSvgCoordinates = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = ((e.clientX - rect.left - translate.x) / scale / rect.width) * 100;
    const y = ((e.clientY - rect.top - translate.y) / scale / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (currentTool === 'draw') {
      const coords = getSvgCoordinates(e);
      if (!isDrawing) {
        setIsDrawing(true);
        setDrawingPoints([coords]);
      } else {
        const newPoints = [...drawingPoints, coords];
        setDrawingPoints(newPoints);
        
        if (newPoints.length >= 3) {
          const firstPoint = newPoints[0];
          const distance = Math.sqrt(
            Math.pow(coords.x - firstPoint.x, 2) + Math.pow(coords.y - firstPoint.y, 2)
          );
          if (distance < 3) {
            setDrawingPoints(newPoints.slice(0, -1));
            setShowNewZoneDialog(true);
          }
        }
      }
    } else if (currentTool === 'select') {
      setSelectedZoneId(null);
    }
  };

  const handleZoneClick = (e: React.MouseEvent, zoneId: string) => {
    e.stopPropagation();
    if (currentTool === 'select') {
      setSelectedZoneId(zoneId);
    } else if (currentTool === 'delete') {
      setZones(prev => prev.filter(z => z.id !== zoneId));
      setHasChanges(true);
      if (selectedZoneId === zoneId) setSelectedZoneId(null);
    }
  };

  const createNewZone = () => {
    if (!newZoneName.trim() || drawingPoints.length < 3) return;
    
    const newZone: FloorPlanZone = {
      id: `zone-${Date.now()}`,
      name: newZoneName,
      zoneType: newZoneType,
      coordinates: drawingPoints,
      fillColor: newZoneColor,
      strokeColor: newZoneColor,
      opacity: '0.4',
      capacity: null,
      defaultSectorCode: null,
      isSelectable: true,
    };
    
    setZones(prev => [...prev, newZone]);
    setHasChanges(true);
    setDrawingPoints([]);
    setIsDrawing(false);
    setShowNewZoneDialog(false);
    setNewZoneName('');
    setNewZoneType('sector');
    setSelectedZoneId(newZone.id);
    setCurrentTool('select');
    
    toast({ title: "Zona creata", description: `"${newZoneName}" aggiunta alla planimetria` });
  };

  const cancelDrawing = () => {
    setDrawingPoints([]);
    setIsDrawing(false);
    setShowNewZoneDialog(false);
    setNewZoneName('');
  };

  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId]);

  const updateZone = (updates: Partial<FloorPlanZone>) => {
    if (!selectedZoneId) return;
    setZones(prev => prev.map(z => z.id === selectedZoneId ? { ...z, ...updates } : z));
    setHasChanges(true);
  };

  const handleStartEditing = () => {
    if (!draftVersionId) {
      createDraftMutation.mutate();
    }
  };

  const getPolygonPoints = (coords: { x: number; y: number }[]) => {
    return coords.map(c => `${c.x}%,${c.y}%`).join(' ');
  };

  if (loadingPlan) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!floorPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardTitle className="mb-4">Planimetria non trovata</CardTitle>
          <Button onClick={() => setLocation('/locations')} data-testid="button-back-locations">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alle location
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-4 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/locations/${floorPlan.locationId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">{floorPlan.name}</h1>
            <p className="text-xs text-muted-foreground">Editor Planimetria</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {draftVersionId ? (
            <Badge variant="outline" className="text-amber-500 border-amber-500/50">
              Bozza non salvata
            </Badge>
          ) : (
            <Badge variant="outline" className="text-green-500 border-green-500/50">
              Pubblicato
            </Badge>
          )}
          
          <div className="flex items-center gap-1 border-l pl-2 ml-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              data-testid="button-zoom-in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              data-testid="button-zoom-reset"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!draftVersionId ? (
            <Button onClick={handleStartEditing} data-testid="button-start-editing">
              <Settings className="w-4 h-4 mr-2" />
              Inizia Modifica
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => saveDraftMutation.mutate()}
                disabled={!hasChanges || saveDraftMutation.isPending}
                data-testid="button-save-draft"
              >
                <Save className="w-4 h-4 mr-2" />
                Salva Bozza
              </Button>
              <Button
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                data-testid="button-publish"
              >
                <Upload className="w-4 h-4 mr-2" />
                Pubblica
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-border bg-card/30 flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Zone ({zones.length})
            </h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`w-full text-left p-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    selectedZoneId === zone.id
                      ? 'bg-primary/20 border border-primary/50'
                      : 'hover:bg-muted'
                  }`}
                  data-testid={`zone-item-${zone.id}`}
                >
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: zone.fillColor || '#3b82f6' }}
                  />
                  <span className="truncate">{zone.name}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">
                    {zone.zoneType}
                  </Badge>
                </button>
              ))}
              {zones.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nessuna zona. Usa lo strumento Disegna per crearne una.
                </p>
              )}
            </div>
          </ScrollArea>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="h-12 border-b border-border bg-card/30 flex items-center justify-center gap-1 px-4 shrink-0">
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                variant={currentTool === 'select' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentTool('select')}
                disabled={!draftVersionId}
                data-testid="tool-select"
              >
                <MousePointer2 className="w-4 h-4 mr-1" />
                Seleziona
              </Button>
              <Button
                variant={currentTool === 'draw' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setCurrentTool('draw');
                  setSelectedZoneId(null);
                }}
                disabled={!draftVersionId}
                data-testid="tool-draw"
              >
                <Plus className="w-4 h-4 mr-1" />
                Disegna
              </Button>
              <Button
                variant={currentTool === 'delete' ? 'destructive' : 'ghost'}
                size="sm"
                onClick={() => setCurrentTool('delete')}
                disabled={!draftVersionId}
                data-testid="tool-delete"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Elimina
              </Button>
            </div>
            
            <div className="w-px h-6 bg-border mx-2" />
            
            <Button
              variant={showGrid ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
              data-testid="toggle-grid"
            >
              <Grid3X3 className="w-4 h-4 mr-1" />
              Griglia
            </Button>
            
            {eventId && (
              <>
                <div className="w-px h-6 bg-border mx-2" />
                <Button
                  variant={showHeatmap ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  disabled={loadingHeatmap}
                  data-testid="toggle-heatmap"
                >
                  <Flame className="w-4 h-4 mr-1" />
                  Heatmap
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSmartAssist(true)}
                  data-testid="button-smart-assist"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  Smart Assist
                </Button>
              </>
            )}
            
            {isDrawing && (
              <>
                <div className="w-px h-6 bg-border mx-2" />
                <Badge variant="secondary" className="animate-pulse">
                  Disegno: {drawingPoints.length} punti
                </Badge>
                <Button variant="ghost" size="sm" onClick={cancelDrawing} data-testid="button-cancel-draw">
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          <div
            ref={containerRef}
            className="flex-1 overflow-hidden bg-black/20 relative"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? 'grabbing' : currentTool === 'draw' ? 'crosshair' : 'default' }}
          >
            <div
              className="absolute inset-0 origin-top-left"
              style={{
                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <svg
                className="w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
                onClick={handleCanvasClick}
              >
                {floorPlan.imageUrl && (
                  <image
                    href={floorPlan.imageUrl}
                    x="0"
                    y="0"
                    width="100"
                    height="100"
                    preserveAspectRatio="xMidYMid meet"
                  />
                )}

                {showGrid && (
                  <g className="pointer-events-none" opacity="0.3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <line
                        key={`v-${i}`}
                        x1={`${(i + 1) * 10}%`}
                        y1="0%"
                        x2={`${(i + 1) * 10}%`}
                        y2="100%"
                        stroke="white"
                        strokeWidth="0.1"
                        strokeDasharray="1,1"
                      />
                    ))}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <line
                        key={`h-${i}`}
                        x1="0%"
                        y1={`${(i + 1) * 10}%`}
                        x2="100%"
                        y2={`${(i + 1) * 10}%`}
                        stroke="white"
                        strokeWidth="0.1"
                        strokeDasharray="1,1"
                      />
                    ))}
                  </g>
                )}

                {zones.map((zone) => {
                  const heatmapZone = heatmapZones.get(zone.id);
                  const centerX = zone.coordinates.reduce((sum, c) => sum + c.x, 0) / zone.coordinates.length;
                  const centerY = zone.coordinates.reduce((sum, c) => sum + c.y, 0) / zone.coordinates.length;
                  
                  return (
                    <g key={zone.id}>
                      <polygon
                        points={zone.coordinates.map(c => `${c.x},${c.y}`).join(' ')}
                        fill={getZoneFillColor(zone)}
                        fillOpacity={getZoneOpacity(zone)}
                        stroke={selectedZoneId === zone.id ? '#fbbf24' : zone.strokeColor || '#1d4ed8'}
                        strokeWidth={selectedZoneId === zone.id ? 0.4 : 0.2}
                        className="cursor-pointer transition-opacity"
                        onClick={(e) => handleZoneClick(e, zone.id)}
                        onMouseEnter={() => setHoveredZoneId(zone.id)}
                        onMouseLeave={() => setHoveredZoneId(null)}
                        data-testid={`zone-polygon-${zone.id}`}
                      />
                      {showHeatmap && heatmapZone && hoveredZoneId === zone.id && (
                        <g className="pointer-events-none">
                          <rect
                            x={centerX - 8}
                            y={centerY - 4}
                            width="16"
                            height="8"
                            rx="1"
                            fill="rgba(0,0,0,0.85)"
                          />
                          <text
                            x={centerX}
                            y={centerY + 1}
                            fill="white"
                            fontSize="3"
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            {heatmapZone.occupancyPercent.toFixed(0)}%
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {selectedZoneId && selectedZone && (
                  <g className="pointer-events-none">
                    {selectedZone.coordinates.map((coord, i) => (
                      <circle
                        key={i}
                        cx={coord.x}
                        cy={coord.y}
                        r={0.8}
                        fill="#fbbf24"
                        stroke="white"
                        strokeWidth="0.15"
                      />
                    ))}
                  </g>
                )}

                {selectedZoneId && selectedZone && zoneSeats.length > 0 && (
                  <g>
                    {zoneSeats.map((seat) => {
                      const minX = Math.min(...selectedZone.coordinates.map(c => c.x));
                      const maxX = Math.max(...selectedZone.coordinates.map(c => c.x));
                      const minY = Math.min(...selectedZone.coordinates.map(c => c.y));
                      const maxY = Math.max(...selectedZone.coordinates.map(c => c.y));
                      const zoneWidth = maxX - minX;
                      const zoneHeight = maxY - minY;
                      const seatX = minX + (parseFloat(seat.posX) / 100) * zoneWidth;
                      const seatY = minY + (parseFloat(seat.posY) / 100) * zoneHeight;
                      
                      let fillColor = '#22c55e';
                      if (seat.isBlocked) fillColor = '#ef4444';
                      else if (seat.isAccessible) fillColor = '#3b82f6';
                      
                      return (
                        <circle
                          key={seat.id}
                          cx={seatX}
                          cy={seatY}
                          r={0.6}
                          fill={fillColor}
                          stroke="white"
                          strokeWidth="0.1"
                          className="cursor-pointer transition-all hover:r-[0.8]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSeat(seat);
                            setShowSeatEditDialog(true);
                          }}
                          data-testid={`seat-${seat.id}`}
                        >
                          <title>{seat.seatLabel}</title>
                        </circle>
                      );
                    })}
                  </g>
                )}

                {isDrawing && drawingPoints.length > 0 && (
                  <g>
                    <polyline
                      points={drawingPoints.map(c => `${c.x},${c.y}`).join(' ')}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="0.2"
                      strokeDasharray="0.5,0.3"
                    />
                    {drawingPoints.map((point, i) => (
                      <circle
                        key={i}
                        cx={point.x}
                        cy={point.y}
                        r={0.6}
                        fill={i === 0 ? '#22c55e' : '#fbbf24'}
                        stroke="white"
                        strokeWidth="0.1"
                      />
                    ))}
                    {drawingPoints.length >= 3 && (
                      <text
                        x={drawingPoints[0].x}
                        y={drawingPoints[0].y - 2}
                        fill="#22c55e"
                        fontSize="2"
                        textAnchor="middle"
                      >
                        Clicca per chiudere
                      </text>
                    )}
                  </g>
                )}
              </svg>
            </div>
            
            {showHeatmap && (
              <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border" data-testid="heatmap-legend">
                <div className="text-xs font-medium mb-2">Occupazione</div>
                <div className="flex items-center gap-1">
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-green-500" />
                    <span>Bassa (&lt;30%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-yellow-500" />
                    <span>Media (30-70%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-red-500" />
                    <span>Alta (&gt;70%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {selectedZone && (
          <aside className="w-72 border-l border-border bg-card/30 flex flex-col shrink-0">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm">Proprietà Zona</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedZoneId(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="zone-name">Nome</Label>
                  <Input
                    id="zone-name"
                    value={selectedZone.name}
                    onChange={(e) => updateZone({ name: e.target.value })}
                    disabled={!draftVersionId}
                    data-testid="input-zone-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="zone-type">Tipo</Label>
                  <Select
                    value={selectedZone.zoneType}
                    onValueChange={(v) => updateZone({ zoneType: v })}
                    disabled={!draftVersionId}
                  >
                    <SelectTrigger id="zone-type" data-testid="select-zone-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Colore</Label>
                  <div className="flex flex-wrap gap-2">
                    {ZONE_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => updateZone({ fillColor: color, strokeColor: color })}
                        disabled={!draftVersionId}
                        className={`w-7 h-7 rounded-md border-2 transition-all ${
                          selectedZone.fillColor === color ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        data-testid={`color-${color}`}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="zone-capacity">Capienza</Label>
                  <Input
                    id="zone-capacity"
                    type="number"
                    value={selectedZone.capacity || ''}
                    onChange={(e) => updateZone({ capacity: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Es: 100"
                    disabled={!draftVersionId}
                    data-testid="input-zone-capacity"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="zone-sector">Codice Settore (SIAE)</Label>
                  <Input
                    id="zone-sector"
                    value={selectedZone.defaultSectorCode || ''}
                    onChange={(e) => updateZone({ defaultSectorCode: e.target.value || null })}
                    placeholder="Es: A1"
                    maxLength={2}
                    disabled={!draftVersionId}
                    data-testid="input-zone-sector"
                  />
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <Label className="text-sm font-semibold">Gestione Posti</Label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="seat-rows" className="text-xs text-muted-foreground">File</Label>
                      <Input
                        id="seat-rows"
                        type="number"
                        min={1}
                        max={26}
                        value={seatRows}
                        onChange={(e) => setSeatRows(Math.max(1, parseInt(e.target.value) || 1))}
                        data-testid="input-seat-rows"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="seats-per-row" className="text-xs text-muted-foreground">Posti/fila</Label>
                      <Input
                        id="seats-per-row"
                        type="number"
                        min={1}
                        max={50}
                        value={seatsPerRow}
                        onChange={(e) => setSeatsPerRow(Math.max(1, parseInt(e.target.value) || 1))}
                        data-testid="input-seats-per-row"
                      />
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (selectedZoneId) {
                        generateSeatsMutation.mutate({ zoneId: selectedZoneId, rows: seatRows, seatsPerRow });
                      }
                    }}
                    disabled={generateSeatsMutation.isPending}
                    data-testid="button-generate-seats"
                  >
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    {generateSeatsMutation.isPending ? 'Generazione...' : `Genera ${seatRows * seatsPerRow} Posti`}
                  </Button>
                  
                  {zoneSeats.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{zoneSeats.length} posti</span>
                        <div className="flex gap-2">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500" /> Attivo
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500" /> Accessibile
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" /> Bloccato
                          </span>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-destructive"
                        onClick={() => {
                          if (selectedZoneId && confirm('Eliminare tutti i posti di questa zona?')) {
                            deleteSeatsMutation.mutate(selectedZoneId);
                          }
                        }}
                        disabled={deleteSeatsMutation.isPending}
                        data-testid="button-delete-seats"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Elimina tutti i posti
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => updateZone({ isSelectable: !selectedZone.isSelectable })}
                    disabled={!draftVersionId}
                    data-testid="toggle-selectable"
                  >
                    {selectedZone.isSelectable ? (
                      <>
                        <Check className="w-4 h-4 mr-1 text-green-500" />
                        Selezionabile
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-1 text-red-500" />
                        Non selezionabile
                      </>
                    )}
                  </Button>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setZones(prev => prev.filter(z => z.id !== selectedZoneId));
                      setHasChanges(true);
                      setSelectedZoneId(null);
                    }}
                    disabled={!draftVersionId}
                    data-testid="button-delete-zone"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Elimina Zona
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </aside>
        )}
      </div>

      <Dialog open={showNewZoneDialog} onOpenChange={setShowNewZoneDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuova Zona</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-zone-name">Nome zona</Label>
              <Input
                id="new-zone-name"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="Es: Settore A, Tavolo VIP..."
                autoFocus
                data-testid="input-new-zone-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={newZoneType} onValueChange={setNewZoneType}>
                <SelectTrigger data-testid="select-new-zone-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZONE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Colore</Label>
              <div className="flex flex-wrap gap-2">
                {ZONE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewZoneColor(color)}
                    className={`w-8 h-8 rounded-md border-2 transition-all ${
                      newZoneColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelDrawing} data-testid="button-cancel-new-zone">
              Annulla
            </Button>
            <Button onClick={createNewZone} disabled={!newZoneName.trim()} data-testid="button-create-zone">
              Crea Zona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {eventId && (
        <SmartAssistModal
          open={showSmartAssist}
          onOpenChange={setShowSmartAssist}
          eventId={eventId}
          zones={zones.map(z => ({ id: z.id, name: z.name, zoneType: z.zoneType }))}
          onSelectZone={(zoneId) => {
            setSelectedZoneId(zoneId);
            toast({ title: "Zona selezionata", description: "La zona consigliata è stata selezionata" });
          }}
        />
      )}

      <Dialog open={showSeatEditDialog} onOpenChange={(open) => {
        setShowSeatEditDialog(open);
        if (!open) setEditingSeat(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica Posto</DialogTitle>
          </DialogHeader>
          {editingSeat && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="seat-label">Etichetta</Label>
                <Input
                  id="seat-label"
                  value={editingSeat.seatLabel}
                  onChange={(e) => setEditingSeat({ ...editingSeat, seatLabel: e.target.value })}
                  data-testid="input-seat-label"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seat-row">Fila</Label>
                  <Input
                    id="seat-row"
                    value={editingSeat.row || ''}
                    onChange={(e) => setEditingSeat({ ...editingSeat, row: e.target.value || null })}
                    data-testid="input-seat-row"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seat-number">Numero</Label>
                  <Input
                    id="seat-number"
                    type="number"
                    value={editingSeat.seatNumber || ''}
                    onChange={(e) => setEditingSeat({ ...editingSeat, seatNumber: e.target.value ? parseInt(e.target.value) : null })}
                    data-testid="input-seat-number"
                  />
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="seat-accessible"
                    checked={editingSeat.isAccessible}
                    onChange={(e) => setEditingSeat({ ...editingSeat, isAccessible: e.target.checked })}
                    className="w-4 h-4 rounded border-border"
                    data-testid="checkbox-seat-accessible"
                  />
                  <Label htmlFor="seat-accessible" className="text-sm">Posto accessibile (disabili)</Label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="seat-blocked"
                    checked={editingSeat.isBlocked}
                    onChange={(e) => setEditingSeat({ ...editingSeat, isBlocked: e.target.checked })}
                    className="w-4 h-4 rounded border-border"
                    data-testid="checkbox-seat-blocked"
                  />
                  <Label htmlFor="seat-blocked" className="text-sm">Posto bloccato (non vendibile)</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSeatEditDialog(false)} data-testid="button-cancel-seat-edit">
              Annulla
            </Button>
            <Button 
              onClick={() => {
                if (editingSeat) {
                  updateSeatMutation.mutate({
                    seatId: editingSeat.id,
                    updates: {
                      seatLabel: editingSeat.seatLabel,
                      row: editingSeat.row,
                      seatNumber: editingSeat.seatNumber,
                      isAccessible: editingSeat.isAccessible,
                      isBlocked: editingSeat.isBlocked,
                    },
                  });
                }
              }}
              disabled={updateSeatMutation.isPending}
              data-testid="button-save-seat"
            >
              {updateSeatMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
