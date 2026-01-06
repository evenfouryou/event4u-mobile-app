import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Accessibility,
  Timer
} from "lucide-react";

interface Seat {
  id: string;
  seatLabel: string;
  row: string | null;
  seatNumber: number | null;
  posX: string;
  posY: string;
  status: 'available' | 'held' | 'sold' | 'blocked';
  isMyHold: boolean;
  isAccessible: boolean;
  holdExpiresAt: string | null;
}

interface Zone {
  id: string;
  name: string;
  zoneType: string;
  coordinates: any;
  fillColor: string;
  strokeColor: string;
  opacity: string;
  capacity: number | null;
  sectorId: string | null;
  sectorName: string | null;
  price: string | null;
  seats: Seat[];
}

interface FloorPlan {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
}

interface Sector {
  id: string;
  name: string;
  sectorCode: string;
  priceIntero: string | null;
  priceRidotto: string | null;
  ticketType: string;
}

interface SeatsResponse {
  floorPlan: FloorPlan | null;
  zones: Zone[];
  sectors: Sector[];
  message?: string;
}

export interface SelectedSeat {
  id: string;
  seatLabel: string;
  zoneName: string;
  price: string | null;
  holdExpiresAt: string | null;
}

interface SeatSelectorProps {
  eventId: string;
  onSelectionChange: (seats: SelectedSeat[]) => void;
}

const SEAT_COLORS = {
  available: '#22c55e',
  held: '#eab308',
  myHold: '#3b82f6',
  sold: '#6b7280',
  blocked: '#ef4444',
} as const;

export function SeatSelector({ eventId, onSelectionChange }: SeatSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const { data: seatsData, isLoading, error, refetch } = useQuery<SeatsResponse>({
    queryKey: ['/api/public/events', eventId, 'seats'],
    refetchInterval: 30000,
  });

  const holdMutation = useMutation({
    mutationFn: async (seatId: string) => {
      const res = await apiRequest('POST', `/api/public/events/${eventId}/seats/${seatId}/hold`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/public/events', eventId, 'seats'] });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (seatId: string) => {
      const res = await apiRequest('DELETE', `/api/public/events/${eventId}/seats/${seatId}/hold`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/public/events', eventId, 'seats'] });
    },
  });

  const extendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/public/events/${eventId}/holds/extend`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/public/events', eventId, 'seats'] });
    },
  });

  const selectedSeats = seatsData?.zones.flatMap(zone =>
    zone.seats
      .filter(seat => seat.isMyHold)
      .map(seat => ({
        id: seat.id,
        seatLabel: seat.seatLabel,
        zoneName: zone.name,
        price: zone.price,
        holdExpiresAt: seat.holdExpiresAt,
      }))
  ) || [];

  useEffect(() => {
    onSelectionChange(selectedSeats);
  }, [selectedSeats.length]);

  const earliestExpiry = selectedSeats
    .map(s => s.holdExpiresAt)
    .filter((exp): exp is string => exp !== null)
    .sort()[0];

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!earliestExpiry) {
      setRemainingSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.floor((new Date(earliestExpiry).getTime() - Date.now()) / 1000));
      setRemainingSeconds(remaining);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [earliestExpiry]);

  const handleSeatClick = useCallback((seat: Seat, zone: Zone) => {
    if (seat.status === 'sold' || seat.status === 'blocked') return;
    
    if (seat.isMyHold) {
      releaseMutation.mutate(seat.id);
    } else if (seat.status === 'available') {
      holdMutation.mutate(seat.id);
    }
  }, [holdMutation, releaseMutation]);

  const handleZoom = (direction: 'in' | 'out') => {
    setScale(prev => {
      const newScale = direction === 'in' ? prev * 1.2 : prev / 1.2;
      return Math.max(0.5, Math.min(3, newScale));
    });
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !hoveredSeat) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 'in' : 'out';
    handleZoom(direction);
  };

  const getSeatColor = (seat: Seat): string => {
    if (seat.status === 'blocked') return SEAT_COLORS.blocked;
    if (seat.status === 'sold') return SEAT_COLORS.sold;
    if (seat.isMyHold) return SEAT_COLORS.myHold;
    if (seat.status === 'held') return SEAT_COLORS.held;
    return SEAT_COLORS.available;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-[500px] bg-card/50 backdrop-blur">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Caricamento planimetria...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex items-center justify-center h-[500px] bg-card/50 backdrop-blur">
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertCircle className="w-8 h-8" />
          <p>Errore nel caricamento della planimetria</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Riprova
          </Button>
        </div>
      </Card>
    );
  }

  if (!seatsData?.floorPlan) {
    return (
      <Card className="flex items-center justify-center h-[500px] bg-card/50 backdrop-blur">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <AlertCircle className="w-8 h-8" />
          <p>Nessuna planimetria disponibile per questo evento</p>
        </div>
      </Card>
    );
  }

  const { floorPlan, zones } = seatsData;

  return (
    <div className="flex flex-col gap-4">
      {selectedSeats.length > 0 && (
        <Card className="p-4 bg-card/80 backdrop-blur border-primary/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {selectedSeats.length} post{selectedSeats.length === 1 ? 'o' : 'i'} selezionat{selectedSeats.length === 1 ? 'o' : 'i'}
                </p>
                {remainingSeconds > 0 && (
                  <p className={cn(
                    "text-xs",
                    remainingSeconds < 120 ? "text-destructive font-medium" : "text-muted-foreground"
                  )}>
                    Tempo rimanente: {formatTime(remainingSeconds)}
                  </p>
                )}
              </div>
            </div>
            {remainingSeconds > 0 && remainingSeconds < 120 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => extendMutation.mutate()}
                disabled={extendMutation.isPending}
                data-testid="button-extend-hold"
              >
                <Clock className="w-4 h-4 mr-2" />
                Estendi tempo
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card className="relative overflow-hidden bg-card/50 backdrop-blur">
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleZoom('in')}
            className="bg-background/80 backdrop-blur"
            data-testid="button-zoom-in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleZoom('out')}
            className="bg-background/80 backdrop-blur"
            data-testid="button-zoom-out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleReset}
            className="bg-background/80 backdrop-blur"
            data-testid="button-reset-zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <div
          ref={containerRef}
          className="relative h-[500px] cursor-grab active:cursor-grabbing overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          data-testid="seat-map-container"
        >
          <div
            className="absolute"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <div className="relative">
              <img
                src={floorPlan.imageUrl}
                alt={floorPlan.name}
                className="max-w-none select-none"
                style={{ width: floorPlan.width, height: floorPlan.height }}
                draggable={false}
              />

              {zones.map(zone => (
                <div key={zone.id}>
                  {zone.seats.map(seat => {
                    const color = getSeatColor(seat);
                    const isClickable = seat.status === 'available' || seat.isMyHold;
                    const posX = parseFloat(seat.posX);
                    const posY = parseFloat(seat.posY);
                    
                    return (
                      <div
                        key={seat.id}
                        className={cn(
                          "absolute w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold transition-all duration-150",
                          isClickable ? "cursor-pointer hover:scale-125" : "cursor-not-allowed",
                          seat.isMyHold && "ring-2 ring-white ring-offset-1 ring-offset-background"
                        )}
                        style={{
                          left: `${posX}%`,
                          top: `${posY}%`,
                          backgroundColor: color,
                          transform: 'translate(-50%, -50%)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSeatClick(seat, zone);
                        }}
                        onMouseEnter={() => setHoveredSeat(seat)}
                        onMouseLeave={() => setHoveredSeat(null)}
                        data-testid={`seat-${seat.id}`}
                      >
                        {seat.isAccessible && (
                          <Accessibility className="w-3 h-3 text-white" />
                        )}
                        {seat.status === 'blocked' && (
                          <XCircle className="w-3 h-3 text-white" />
                        )}
                        {seat.isMyHold && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {hoveredSeat && (
            <div
              className="fixed z-50 pointer-events-none"
              style={{
                left: tooltipPosition.x + 10,
                top: tooltipPosition.y - 60,
              }}
            >
              <Card className="p-2 bg-popover/95 backdrop-blur border shadow-lg">
                <p className="font-semibold text-sm">{hoveredSeat.seatLabel}</p>
                {hoveredSeat.row && (
                  <p className="text-xs text-muted-foreground">Fila {hoveredSeat.row}</p>
                )}
                <Badge 
                  variant={hoveredSeat.status === 'available' ? 'default' : 'secondary'}
                  className="mt-1 text-xs"
                >
                  {hoveredSeat.status === 'available' && 'Disponibile'}
                  {hoveredSeat.status === 'held' && (hoveredSeat.isMyHold ? 'Selezionato' : 'Riservato')}
                  {hoveredSeat.status === 'sold' && 'Venduto'}
                  {hoveredSeat.status === 'blocked' && 'Non disponibile'}
                </Badge>
              </Card>
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-4 z-20">
          <Card className="p-3 bg-background/90 backdrop-blur">
            <p className="text-xs font-semibold mb-2">Legenda</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SEAT_COLORS.available }} />
                <span>Disponibile</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full ring-2 ring-white" style={{ backgroundColor: SEAT_COLORS.myHold }} />
                <span>Selezionato</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SEAT_COLORS.held }} />
                <span>Riservato</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SEAT_COLORS.sold }} />
                <span>Venduto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SEAT_COLORS.blocked }} />
                <span>Non disponibile</span>
              </div>
            </div>
          </Card>
        </div>
      </Card>

      {selectedSeats.length > 0 && (
        <Card className="p-4 bg-card/80 backdrop-blur">
          <h4 className="font-semibold mb-3">Posti selezionati</h4>
          <div className="flex flex-wrap gap-2">
            {selectedSeats.map(seat => (
              <Badge 
                key={seat.id} 
                variant="secondary"
                className="flex items-center gap-2 px-3 py-1.5"
              >
                <span className="font-medium">{seat.seatLabel}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs">{seat.zoneName}</span>
                {seat.price && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs font-medium">€{parseFloat(seat.price).toFixed(2)}</span>
                  </>
                )}
                <button
                  className="ml-1 hover:text-destructive transition-colors"
                  onClick={() => releaseMutation.mutate(seat.id)}
                  data-testid={`button-remove-seat-${seat.id}`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </Badge>
            ))}
          </div>
          {selectedSeats.some(s => s.price) && (
            <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Totale</span>
              <span className="font-bold text-lg">
                €{selectedSeats.reduce((sum, s) => sum + (s.price ? parseFloat(s.price) : 0), 0).toFixed(2)}
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
