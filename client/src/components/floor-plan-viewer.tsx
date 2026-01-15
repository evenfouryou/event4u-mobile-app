import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid3X3,
  Layers,
  Link2,
  Unlink,
  AlertCircle,
} from "lucide-react";
import { useState, useRef, useCallback, useMemo } from "react";

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

interface FloorPlan {
  id: string;
  name: string;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  locationId: string;
  isDefault: boolean;
  isActive: boolean;
}

interface SiaeSector {
  id: string;
  name: string;
  sectorCode: string;
  capacity: number;
  ticketType: string;
  isNumbered: boolean;
  floorPlanZoneId: string | null;
}

interface SiaeSeat {
  id: string;
  sectorId: string;
  rowNumber: string;
  seatNumber: number;
  category: string | null;
  status: 'available' | 'sold' | 'reserved' | 'blocked';
  posX: string | null;
  posY: string | null;
}

interface FloorPlanData {
  floorPlan: FloorPlan | null;
  zones: FloorPlanZone[];
  sectors: SiaeSector[];
  seats: SiaeSeat[];
}

interface FloorPlanViewerProps {
  eventId: string;
  ticketedEventId: string;
  sectors: SiaeSector[];
  onSectorLinked?: (sectorId: string, zoneId: string | null) => void;
}

const SEAT_STATUS_COLORS = {
  available: '#22c55e',
  sold: '#3b82f6',
  reserved: '#f59e0b',
  blocked: '#6b7280',
};

const SEAT_STATUS_LABELS = {
  available: 'Disponibile',
  sold: 'Venduto',
  reserved: 'Prenotato',
  blocked: 'Bloccato',
};

export function FloorPlanViewer({
  eventId,
  ticketedEventId,
  sectors: propSectors,
  onSectorLinked,
}: FloorPlanViewerProps) {
  const { toast } = useToast();
  
  const [showGrid, setShowGrid] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const translateRef = useRef({ x: 0, y: 0 });
  
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 4;
  const DEFAULT_WIDTH = 800;
  const DEFAULT_HEIGHT = 600;

  const { data: floorPlanData, isLoading } = useQuery<FloorPlanData>({
    queryKey: ['/api/siae/events', ticketedEventId, 'floor-plan-data'],
  });

  const linkSectorMutation = useMutation({
    mutationFn: async ({ sectorId, zoneId }: { sectorId: string; zoneId: string | null }) => {
      const res = await apiRequest('PATCH', `/api/siae/sectors/${sectorId}/link-zone`, {
        floorPlanZoneId: zoneId,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/events', ticketedEventId, 'floor-plan-data'] });
      toast({ 
        title: variables.zoneId ? "Settore collegato" : "Settore scollegato", 
        description: variables.zoneId 
          ? "Il settore è stato collegato alla zona" 
          : "Il settore è stato scollegato dalla zona"
      });
      onSectorLinked?.(variables.sectorId, variables.zoneId);
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile aggiornare il collegamento", 
        variant: "destructive" 
      });
    },
  });

  const floorPlan = floorPlanData?.floorPlan;
  const zones = floorPlanData?.zones || [];
  const seats = floorPlanData?.seats || [];
  const sectors = floorPlanData?.sectors || propSectors;

  const clampTranslate = useCallback((tx: number, ty: number, currentScale: number) => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    const containerWidth = containerRef.current?.clientWidth || DEFAULT_WIDTH;
    const containerHeight = containerRef.current?.clientHeight || DEFAULT_HEIGHT;
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
    if (scale > 1) {
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

  const handleZoneClick = (e: React.MouseEvent, zoneId: string) => {
    e.stopPropagation();
    setSelectedZoneId(prev => prev === zoneId ? null : zoneId);
  };

  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId]);
  
  const sectorsByZone = useMemo(() => {
    const map = new Map<string, SiaeSector[]>();
    sectors.forEach(sector => {
      if (sector.floorPlanZoneId) {
        const existing = map.get(sector.floorPlanZoneId) || [];
        existing.push(sector);
        map.set(sector.floorPlanZoneId, existing);
      }
    });
    return map;
  }, [sectors]);

  const seatsByZone = useMemo(() => {
    const sectorZoneMap = new Map<string, string>();
    sectors.forEach(sector => {
      if (sector.floorPlanZoneId) {
        sectorZoneMap.set(sector.id, sector.floorPlanZoneId);
      }
    });
    
    const map = new Map<string, SiaeSeat[]>();
    seats.forEach(seat => {
      const zoneId = sectorZoneMap.get(seat.sectorId);
      if (zoneId) {
        const existing = map.get(zoneId) || [];
        existing.push(seat);
        map.set(zoneId, existing);
      }
    });
    return map;
  }, [sectors, seats]);

  const getSeatColor = (status: string) => {
    return SEAT_STATUS_COLORS[status as keyof typeof SEAT_STATUS_COLORS] || SEAT_STATUS_COLORS.available;
  };

  const getZoneCenter = (coordinates: { x: number; y: number }[]) => {
    const centerX = coordinates.reduce((sum, c) => sum + c.x, 0) / coordinates.length;
    const centerY = coordinates.reduce((sum, c) => sum + c.y, 0) / coordinates.length;
    return { x: centerX, y: centerY };
  };

  const getZoneBounds = (coordinates: { x: number; y: number }[]) => {
    const minX = Math.min(...coordinates.map(c => c.x));
    const maxX = Math.max(...coordinates.map(c => c.x));
    const minY = Math.min(...coordinates.map(c => c.y));
    const maxY = Math.max(...coordinates.map(c => c.y));
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="floor-plan-viewer">
      <div className="flex items-center justify-between gap-4 p-3 border-b border-border bg-card/30">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {floorPlan ? floorPlan.name : 'Planimetria'}
          </span>
          {zones.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {zones.length} zone
            </Badge>
          )}
          {seats.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {seats.length} posti
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={showGrid ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            data-testid="button-toggle-grid"
          >
            <Grid3X3 className="w-4 h-4 mr-1" />
            Griglia
          </Button>
          
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
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-black/20 relative"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default' }}
          data-testid="floor-plan-canvas"
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
              viewBox={`0 0 100 ${(DEFAULT_HEIGHT / DEFAULT_WIDTH) * 100}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {floorPlan?.imageUrl ? (
                <image
                  href={floorPlan.imageUrl}
                  x="0"
                  y="0"
                  width="100"
                  height={`${(DEFAULT_HEIGHT / DEFAULT_WIDTH) * 100}`}
                  preserveAspectRatio="xMidYMid meet"
                />
              ) : (
                <rect
                  x="0"
                  y="0"
                  width="100"
                  height={`${(DEFAULT_HEIGHT / DEFAULT_WIDTH) * 100}`}
                  fill="#1a1a2e"
                />
              )}

              {showGrid && (
                <g className="pointer-events-none" opacity="0.2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <line
                      key={`v-${i}`}
                      x1={`${(i + 1) * 10}`}
                      y1="0"
                      x2={`${(i + 1) * 10}`}
                      y2={`${(DEFAULT_HEIGHT / DEFAULT_WIDTH) * 100}`}
                      stroke="white"
                      strokeWidth="0.1"
                      strokeDasharray="1,1"
                    />
                  ))}
                  {Array.from({ length: Math.floor((DEFAULT_HEIGHT / DEFAULT_WIDTH) * 10) }).map((_, i) => (
                    <line
                      key={`h-${i}`}
                      x1="0"
                      y1={`${(i + 1) * 10}`}
                      x2="100"
                      y2={`${(i + 1) * 10}`}
                      stroke="white"
                      strokeWidth="0.1"
                      strokeDasharray="1,1"
                    />
                  ))}
                </g>
              )}

              {zones.map((zone) => {
                const linkedSectors = sectorsByZone.get(zone.id) || [];
                const zoneSeats = seatsByZone.get(zone.id) || [];
                const center = getZoneCenter(zone.coordinates);
                const isSelected = selectedZoneId === zone.id;
                
                return (
                  <g key={zone.id}>
                    <polygon
                      points={zone.coordinates.map(c => `${c.x},${c.y}`).join(' ')}
                      fill={zone.fillColor || '#3b82f6'}
                      fillOpacity={Number(zone.opacity) || 0.4}
                      stroke={isSelected ? '#fbbf24' : zone.strokeColor || '#1d4ed8'}
                      strokeWidth={isSelected ? 0.4 : 0.2}
                      className="cursor-pointer transition-opacity hover:opacity-70"
                      onClick={(e) => handleZoneClick(e, zone.id)}
                      data-testid={`zone-polygon-${zone.id}`}
                    />
                    
                    <text
                      x={center.x}
                      y={center.y}
                      fill="white"
                      fontSize="2"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="pointer-events-none font-medium"
                      style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' }}
                    >
                      {zone.name}
                    </text>
                    
                    {linkedSectors.length > 0 && (
                      <text
                        x={center.x}
                        y={center.y + 2.5}
                        fill="rgba(255,255,255,0.7)"
                        fontSize="1.5"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="pointer-events-none"
                      >
                        {linkedSectors.map(s => s.name).join(', ')}
                      </text>
                    )}
                  </g>
                );
              })}

              {zones.map((zone) => {
                const zoneSeats = seatsByZone.get(zone.id) || [];
                if (zoneSeats.length === 0) return null;
                
                const bounds = getZoneBounds(zone.coordinates);
                
                return (
                  <g key={`seats-${zone.id}`}>
                    {zoneSeats.map((seat) => {
                      const posX = seat.posX ? parseFloat(seat.posX) : 50;
                      const posY = seat.posY ? parseFloat(seat.posY) : 50;
                      const seatX = bounds.minX + (posX / 100) * bounds.width;
                      const seatY = bounds.minY + (posY / 100) * bounds.height;
                      const isHovered = hoveredSeatId === seat.id;
                      
                      return (
                        <g key={seat.id}>
                          <circle
                            cx={seatX}
                            cy={seatY}
                            r={isHovered ? 0.8 : 0.5}
                            fill={getSeatColor(seat.status)}
                            stroke="white"
                            strokeWidth="0.08"
                            className="cursor-pointer transition-all"
                            onMouseEnter={() => setHoveredSeatId(seat.id)}
                            onMouseLeave={() => setHoveredSeatId(null)}
                            data-testid={`seat-${seat.id}`}
                          />
                          {isHovered && (
                            <g className="pointer-events-none">
                              <rect
                                x={seatX - 4}
                                y={seatY - 3}
                                width="8"
                                height="2.5"
                                rx="0.3"
                                fill="rgba(0,0,0,0.9)"
                              />
                              <text
                                x={seatX}
                                y={seatY - 1.5}
                                fill="white"
                                fontSize="1.2"
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                {seat.rowNumber}{seat.seatNumber}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border" data-testid="seat-legend">
            <div className="text-xs font-medium mb-2">Stato Posti</div>
            <div className="space-y-1.5">
              {Object.entries(SEAT_STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border border-white/30"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {SEAT_STATUS_LABELS[status as keyof typeof SEAT_STATUS_LABELS]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="w-72 border-l border-border bg-card/30 flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Collega Settori a Zone
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {sectors.length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nessun settore configurato
                  </p>
                </div>
              ) : (
                sectors.map((sector) => (
                  <div 
                    key={sector.id} 
                    className="p-3 rounded-lg border border-border bg-card/50"
                    data-testid={`sector-link-${sector.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium">{sector.name}</span>
                        {sector.isNumbered && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            Numerato
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {sector.capacity} posti
                      </Badge>
                    </div>
                    
                    <Select
                      value={sector.floorPlanZoneId || "none"}
                      onValueChange={(value) => {
                        linkSectorMutation.mutate({
                          sectorId: sector.id,
                          zoneId: value === "none" ? null : value,
                        });
                      }}
                      disabled={linkSectorMutation.isPending}
                    >
                      <SelectTrigger 
                        className="h-8 text-xs"
                        data-testid={`select-zone-${sector.id}`}
                      >
                        <SelectValue placeholder="Seleziona zona..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="flex items-center gap-2">
                            <Unlink className="w-3 h-3" />
                            Nessuna zona
                          </span>
                        </SelectItem>
                        {zones.map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            <span className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: zone.fillColor || '#3b82f6' }}
                              />
                              {zone.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))
              )}
              
              {zones.length === 0 && sectors.length > 0 && (
                <div className="text-center py-4 px-2">
                  <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Nessuna zona disponibile. Crea delle zone nella planimetria della location per poter collegare i settori.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}

export default FloorPlanViewer;
