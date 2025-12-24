import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { triggerHaptic } from "@/components/mobile-primitives";
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  ChevronLeft,
  Plus,
  Minus,
  Check,
  AlertCircle,
  ShoppingCart,
  Music,
  Zap,
  Map,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";

interface Seat {
  id: string;
  row: string;
  seatNumber: string;
  seatLabel?: string;
  posX?: string | null;
  posY?: string | null;
  status: string;
  isAccessible?: boolean;
}

interface Sector {
  id: string;
  name: string;
  capacity: number;
  availableSeats: number;
  priceIntero: string;
  priceRidotto: string | null;
  isNumbered: boolean;
  sectorCode: string;
  seats: Seat[];
}

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
  eventMapping?: {
    sectorId: string;
    customPrice: string | null;
  } | null;
}

interface FloorPlan {
  id: string;
  name: string;
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  zones: FloorPlanZone[];
}

interface EventDetail {
  id: string;
  eventId: number;
  siaeEventCode: string;
  totalCapacity: number;
  ticketsSold: number;
  ticketingStatus: string;
  saleStartDate: Date;
  saleEndDate: Date;
  maxTicketsPerUser: number;
  requiresNominative: boolean;
  allowsChangeName: boolean;
  eventName: string;
  eventDescription: string | null;
  eventImageUrl: string | null;
  eventStart: Date;
  eventEnd: Date;
  eventNotes: string | null;
  locationId: number;
  locationName: string;
  locationAddress: string;
  locationCapacity: number;
  sectors: Sector[];
}

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: springTransition,
};

function FloorPlanViewer({
  floorPlan,
  sectors,
  selectedZoneId,
  selectedSeatIds,
  onZoneClick,
  onSeatClick,
}: {
  floorPlan: FloorPlan;
  sectors: Sector[];
  selectedZoneId: string | null;
  selectedSeatIds: string[];
  onZoneClick: (zoneId: string, sectorCode: string | null) => void;
  onSeatClick: (seatId: string, seat: Seat) => void;
}) {
  const getSeatColor = (status: string, isSelected: boolean, isAccessible?: boolean) => {
    if (isSelected) return '#22c55e';
    if (isAccessible) return '#3b82f6';
    switch (status) {
      case 'available': return '#10b981';
      case 'sold': return '#ef4444';
      case 'reserved': return '#f59e0b';
      case 'blocked': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const renderSeat = (seat: Seat, sectorCode: string) => {
    if (!seat.posX || !seat.posY) return null;
    
    const x = Number(seat.posX);
    const y = Number(seat.posY);
    const isSelected = selectedSeatIds.includes(seat.id);
    const isAvailable = seat.status === 'available';
    
    return (
      <g key={seat.id} style={{ pointerEvents: 'auto' }}>
        <circle
          cx={x}
          cy={y}
          r={2.5}
          fill={getSeatColor(seat.status, isSelected, seat.isAccessible)}
          stroke={isSelected ? '#16a34a' : 'rgba(255,255,255,0.6)'}
          strokeWidth={isSelected ? 0.6 : 0.3}
          style={{ cursor: isAvailable ? 'pointer' : 'not-allowed', pointerEvents: 'auto' }}
          onClick={(e) => {
            e.stopPropagation();
            if (isAvailable) {
              triggerHaptic('medium');
              onSeatClick(seat.id, seat);
            }
          }}
          data-testid={`seat-${seat.id}`}
        />
        {isSelected && (
          <circle
            cx={x}
            cy={y}
            r={3.5}
            fill="none"
            stroke="#22c55e"
            strokeWidth={0.4}
            className="pointer-events-none animate-pulse"
          />
        )}
      </g>
    );
  };

  const renderZonePolygon = (zone: FloorPlanZone) => {
    const coords = zone.coordinates;
    if (!coords || coords.length < 3) return null;
    
    const points = coords.map(p => `${p.x},${p.y}`).join(' ');
    const isSelected = selectedZoneId === zone.id;
    
    const sectorId = zone.eventMapping?.sectorId;
    const linkedSector = sectorId 
      ? sectors.find(s => s.id === sectorId)
      : sectors.find(s => s.sectorCode === zone.defaultSectorCode);
    const isAvailable = linkedSector ? linkedSector.availableSeats > 0 : false;
    
    const displayPrice = zone.eventMapping?.customPrice 
      ? Number(zone.eventMapping.customPrice) 
      : (linkedSector ? Number(linkedSector.priceIntero) : null);
    
    const centerX = coords.reduce((sum, p) => sum + p.x, 0) / coords.length;
    const centerY = coords.reduce((sum, p) => sum + p.y, 0) / coords.length;
    
    return (
      <g key={zone.id} className="zone-group">
        <polygon
          points={points}
          fill={isSelected ? 'rgba(34, 197, 94, 0.25)' : 'transparent'}
          stroke={isSelected ? '#22c55e' : (isAvailable ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)')}
          strokeWidth={isSelected ? 1.5 : 0.8}
          strokeDasharray={isSelected ? 'none' : '2,1'}
          style={{ 
            cursor: isAvailable && linkedSector ? 'pointer' : 'not-allowed',
            pointerEvents: 'all',
            touchAction: 'manipulation',
            filter: isSelected ? 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.5))' : 'none'
          }}
          className={`transition-all duration-300 ${!isAvailable ? 'opacity-30' : 'hover:stroke-white/60'}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isAvailable && linkedSector) {
              triggerHaptic('medium');
              onZoneClick(zone.id, linkedSector.sectorCode);
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isAvailable && linkedSector) {
              triggerHaptic('medium');
              onZoneClick(zone.id, linkedSector.sectorCode);
            }
          }}
          data-testid={`zone-polygon-${zone.id}`}
        />
        {isSelected && displayPrice !== null && (
          <g className="pointer-events-none">
            <rect
              x={centerX - 18}
              y={centerY - 10}
              width={36}
              height={20}
              rx={4}
              fill="rgba(0,0,0,0.75)"
              stroke="#22c55e"
              strokeWidth={0.5}
            />
            <text
              x={centerX}
              y={centerY + 1}
              fill="#22c55e"
              fontSize="8"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              €{displayPrice.toFixed(0)}
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <motion.div {...fadeInUp} transition={{ ...springTransition, delay: 0.35 }}>
      <div className="bg-card/50 border border-border p-4 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Map className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Mappa della Venue</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Tocca una zona per selezionarla
        </p>
        
        <div className="relative w-full aspect-video bg-muted/30 rounded-xl overflow-hidden">
          {floorPlan.imageUrl ? (
            <img 
              src={floorPlan.imageUrl} 
              alt={floorPlan.name}
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-blue-900/30">
              <Map className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            style={{ zIndex: 10, pointerEvents: 'all', touchAction: 'manipulation' }}
          >
            <g className="zones-layer" style={{ pointerEvents: 'all' }}>
              {floorPlan.zones.map(zone => renderZonePolygon(zone))}
            </g>
            <g className="seats-layer" style={{ pointerEvents: 'all' }}>
              {sectors.filter(s => s.isNumbered && s.seats?.length > 0).map(sector => 
                sector.seats.map(seat => renderSeat(seat, sector.sectorCode))
              )}
            </g>
          </svg>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
            <span>Disponibile</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
            <span>Selezionato</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            <span>Venduto</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TicketTypeCard({
  sector,
  quantity,
  setQuantity,
  ticketType,
  setTicketType,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  requiresNominative,
  selectedSeat,
  onSeatClick,
  mapSelectedSeatIds,
}: {
  sector: Sector;
  quantity: number;
  setQuantity: (q: number) => void;
  ticketType: string;
  setTicketType: (t: string) => void;
  firstName: string;
  setFirstName: (n: string) => void;
  lastName: string;
  setLastName: (n: string) => void;
  requiresNominative: boolean;
  selectedSeat: Seat | null;
  onSeatClick: (seat: Seat) => void;
  mapSelectedSeatIds?: string[];
}) {
  const price = ticketType === "ridotto" && sector.priceRidotto
    ? Number(sector.priceRidotto)
    : Number(sector.priceIntero);

  const isAvailable = sector.availableSeats > 0;

  if (!isAvailable) {
    return (
      <motion.div {...fadeInUp} className="bg-card/50 border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{sector.name}</h3>
            </div>
          </div>
          <Badge variant="destructive" className="text-sm">Esaurito</Badge>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      {...fadeInUp} 
      className="bg-card/50 border border-border rounded-2xl p-4 space-y-4"
      data-testid={`card-sector-${sector.id}`}
      data-sector-code={sector.sectorCode}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Ticket className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground" data-testid={`text-sector-name-${sector.id}`}>
              {sector.name}
            </h3>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent" data-testid={`text-sector-price-${sector.id}`}>
            €{price.toFixed(2)}
          </div>
          {sector.priceRidotto && Number(sector.priceRidotto) > 0 && (
            <p className="text-xs text-muted-foreground">Ridotto: €{Number(sector.priceRidotto).toFixed(2)}</p>
          )}
        </div>
      </div>

      {sector.priceRidotto && Number(sector.priceRidotto) > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium">Tipo Biglietto</Label>
          <RadioGroup value={ticketType} onValueChange={setTicketType} className="flex gap-2">
            <button
              type="button"
              onClick={() => { triggerHaptic('light'); setTicketType("intero"); }}
              className={`flex-1 p-3 rounded-xl border min-h-[56px] transition-all ${
                ticketType === "intero" 
                  ? "border-primary bg-primary/10" 
                  : "border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="intero" id={`intero-${sector.id}`} className="border-primary" />
                <Label htmlFor={`intero-${sector.id}`} className="text-foreground cursor-pointer font-medium">
                  Intero
                </Label>
              </div>
              <p className="text-primary font-bold mt-1">€{Number(sector.priceIntero).toFixed(2)}</p>
            </button>
            <button
              type="button"
              onClick={() => { triggerHaptic('light'); setTicketType("ridotto"); }}
              className={`flex-1 p-3 rounded-xl border min-h-[56px] transition-all ${
                ticketType === "ridotto" 
                  ? "border-primary bg-primary/10" 
                  : "border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ridotto" id={`ridotto-${sector.id}`} className="border-primary" />
                <Label htmlFor={`ridotto-${sector.id}`} className="text-foreground cursor-pointer font-medium">
                  Ridotto
                </Label>
              </div>
              <p className="text-primary font-bold mt-1">€{Number(sector.priceRidotto).toFixed(2)}</p>
            </button>
          </RadioGroup>
        </div>
      )}

      {sector.isNumbered ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium">Seleziona Posto</Label>
          <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto p-3 bg-background/30 rounded-xl">
            {sector.seats.map((seat) => {
              const isMapSelected = mapSelectedSeatIds?.includes(seat.id);
              return (
                <button
                  key={seat.id}
                  onClick={() => { triggerHaptic('light'); onSeatClick(seat); }}
                  disabled={seat.status !== "available"}
                  className={`p-2 min-h-[44px] text-xs rounded-lg font-medium transition-all ${
                    seat.status !== "available"
                      ? "bg-red-500/20 text-red-400 cursor-not-allowed"
                      : isMapSelected || selectedSeat?.id === seat.id
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "bg-muted/50 text-foreground"
                  }`}
                  data-testid={`seat-btn-${seat.id}`}
                >
                  {seat.row}{seat.seatNumber}
                </button>
              );
            })}
          </div>
          {selectedSeat && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
              className="text-sm text-emerald-400 flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Posto: Fila {selectedSeat.row}, Posto {selectedSeat.seatNumber}
            </motion.p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium">Quantità</Label>
          <div className="flex items-center justify-center gap-6 bg-background/30 rounded-xl p-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { triggerHaptic('light'); setQuantity(Math.max(1, quantity - 1)); }}
              className="h-14 w-14 rounded-full text-foreground"
              data-testid={`button-minus-${sector.id}`}
            >
              <Minus className="w-6 h-6" />
            </Button>
            <span className="text-3xl font-bold text-foreground w-12 text-center" data-testid={`text-quantity-${sector.id}`}>
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { triggerHaptic('light'); setQuantity(Math.min(10, quantity + 1)); }}
              className="h-14 w-14 rounded-full text-foreground"
              data-testid={`button-plus-${sector.id}`}
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}

      {requiresNominative && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Nome</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Mario"
              className="bg-background/30 border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12"
              data-testid={`input-firstname-${sector.id}`}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Cognome</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Rossi"
              className="bg-background/30 border-border text-foreground placeholder:text-muted-foreground rounded-xl h-12"
              data-testid={`input-lastname-${sector.id}`}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function PublicEventDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isAdding, setIsAdding] = useState(false);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [highlightedSectorCode, setHighlightedSectorCode] = useState<string | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [ticketType, setTicketType] = useState("intero");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const contentRef = useRef<HTMLDivElement>(null);

  const { data: event, isLoading, error } = useQuery<EventDetail>({
    queryKey: ["/api/public/events", params.id],
  });

  const { data: floorPlan } = useQuery<FloorPlan>({
    queryKey: ["/api/public/locations", event?.locationId, "floor-plan", event?.id],
    queryFn: async () => {
      const res = await fetch(`/api/public/locations/${event?.locationId}/floor-plan?eventId=${event?.id}`, {
        credentials: "include",
      });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try {
          const json = JSON.parse(text);
          message = json.message || text;
        } catch {
        }
        throw new Error(message);
      }
      return res.json();
    },
    enabled: !!event?.locationId && !!event?.id,
    retry: false,
  });

  const selectedSector = event?.sectors.find(s => s.id === selectedSectorId) || event?.sectors[0];
  const selectedSeat = selectedSector?.seats.find(s => selectedSeatIds.includes(s.id)) || null;

  const handleZoneClick = (zoneId: string, sectorCode: string | null) => {
    setSelectedZoneId(zoneId);
    setHighlightedSectorCode(sectorCode);
    
    if (sectorCode && event) {
      const sector = event.sectors.find(s => s.sectorCode === sectorCode);
      if (sector) {
        setSelectedSectorId(sector.id);
      }
      setTimeout(() => {
        const sectorElement = document.querySelector(`[data-sector-code="${sectorCode}"]`);
        if (sectorElement) {
          sectorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handleSeatClick = (seatId: string, seat: Seat) => {
    setSelectedSeatIds(prev => {
      if (prev.includes(seatId)) {
        return prev.filter(id => id !== seatId);
      } else {
        return [seatId];
      }
    });
    
    const sector = event?.sectors.find(s => s.seats.some(st => st.id === seatId));
    if (sector) {
      setSelectedSectorId(sector.id);
      setHighlightedSectorCode(sector.sectorCode);
    }
  };

  const handleSeatClickFromCard = (seat: Seat) => {
    if (selectedSector) {
      handleSeatClick(seat.id, seat);
    }
  };

  const price = selectedSector && (ticketType === "ridotto" && selectedSector.priceRidotto
    ? Number(selectedSector.priceRidotto)
    : Number(selectedSector.priceIntero));

  const totalPrice = price ? price * (selectedSector?.isNumbered ? 1 : quantity) : 0;

  const canPurchase = selectedSector && 
    selectedSector.availableSeats > 0 &&
    (!selectedSector.isNumbered || selectedSeat) &&
    (!event?.requiresNominative || (firstName && lastName));

  const handlePurchase = async () => {
    if (!canPurchase || !selectedSector || !event) return;

    triggerHaptic('medium');
    setIsAdding(true);
    
    try {
      await apiRequest("POST", "/api/public/cart/add", {
        ticketedEventId: event.id,
        sectorId: selectedSector.id,
        seatId: selectedSeat?.id,
        quantity: selectedSector.isNumbered ? 1 : quantity,
        ticketType,
        participantFirstName: firstName,
        participantLastName: lastName,
      });
      
      setCartCount(prev => prev + (selectedSector.isNumbered ? 1 : quantity));
      triggerHaptic('success');
      
      toast({
        title: "Aggiunto al carrello!",
        description: `${selectedSector.isNumbered ? 1 : quantity} biglietto/i aggiunto/i`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/public/cart"] });
      
      navigate("/carrello");
    } catch (error: any) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiungere al carrello.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  if (error) {
    return (
      <div 
        className="fixed inset-0 bg-background flex items-center justify-center p-4"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
        >
          <Card className="p-8 text-center bg-red-500/10 border-red-500/20 backdrop-blur-xl rounded-2xl">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-bold text-foreground mb-2">Evento non trovato</h2>
            <p className="text-muted-foreground mb-6">L'evento richiesto non è disponibile.</p>
            <Link href="/acquista">
              <Button variant="ghost" className="text-foreground min-h-[44px]">
                <ChevronLeft className="w-5 h-5 mr-1" /> Torna agli eventi
              </Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Desktop version
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background" data-testid="page-public-event-detail">
        <div className="container mx-auto px-6 py-8 max-w-6xl">
          {/* Header with back button */}
          <div className="mb-6">
            <Link href="/acquista">
              <Button variant="ghost" data-testid="button-back">
                <ChevronLeft className="w-5 h-5 mr-2" />
                Torna agli eventi
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Skeleton className="h-96 rounded-2xl" />
                </div>
                <div>
                  <Skeleton className="h-64 rounded-2xl" />
                </div>
              </div>
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ) : event ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main content - left side */}
              <div className="lg:col-span-2 space-y-6">
                {/* Hero image */}
                <Card className="overflow-hidden">
                  <div className="relative aspect-video">
                    {event.eventImageUrl ? (
                      <img
                        src={event.eventImageUrl}
                        alt={event.eventName}
                        className="absolute inset-0 w-full h-full object-cover"
                        data-testid="img-event-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-purple-900/50 to-pink-900/40 flex items-center justify-center">
                        <Music className="w-24 h-24 text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {event.ticketingStatus === "active" && (
                          <Badge className="bg-emerald-500/90 text-white border-0">
                            <Zap className="w-3 h-3 mr-1" />
                            In Vendita
                          </Badge>
                        )}
                        {event.requiresNominative && (
                          <Badge className="bg-purple-500/90 text-white border-0">
                            Nominativo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h1 className="text-3xl font-bold text-foreground mb-4" data-testid="text-event-name">
                      {event.eventName}
                    </h1>
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span data-testid="text-event-date">
                          {format(new Date(event.eventStart), "EEEE d MMMM yyyy", { locale: it })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-5 h-5 text-primary" />
                        <span data-testid="text-event-time">
                          {format(new Date(event.eventStart), "HH:mm")} - {format(new Date(event.eventEnd), "HH:mm")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-5 h-5 text-primary" />
                        <span data-testid="text-event-location">{event.locationName}</span>
                      </div>
                    </div>
                    {event.eventDescription && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="text-muted-foreground whitespace-pre-line" data-testid="text-event-description">
                          {event.eventDescription}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Floor plan if available */}
                {floorPlan && floorPlan.zones && floorPlan.zones.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Map className="w-5 h-5 text-primary" />
                        Mappa della Venue
                      </CardTitle>
                      <CardDescription>
                        Clicca una zona per selezionarla
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FloorPlanViewer
                        floorPlan={floorPlan}
                        sectors={event.sectors}
                        selectedZoneId={selectedZoneId}
                        selectedSeatIds={selectedSeatIds}
                        onZoneClick={handleZoneClick}
                        onSeatClick={handleSeatClick}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Sectors list */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-primary" />
                      Biglietti disponibili
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4" data-testid="grid-sectors">
                    {event.sectors.length === 0 ? (
                      <div className="text-center py-8">
                        <Ticket className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">Nessun biglietto</h3>
                        <p className="text-sm text-muted-foreground">
                          I biglietti non sono ancora disponibili.
                        </p>
                      </div>
                    ) : (
                      event.sectors.map((sector) => {
                        const sectorPrice = ticketType === "ridotto" && sector.priceRidotto
                          ? Number(sector.priceRidotto)
                          : Number(sector.priceIntero);
                        const isSelectedSector = selectedSectorId === sector.id;
                        
                        return (
                          <div
                            key={sector.id}
                            onClick={() => {
                              if (sector.availableSeats > 0) {
                                setSelectedSectorId(sector.id);
                              }
                            }}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              isSelectedSector
                                ? "border-primary bg-primary/5 ring-2 ring-primary"
                                : sector.availableSeats > 0
                                ? "border-border hover-elevate"
                                : "border-border opacity-50 cursor-not-allowed"
                            }`}
                            data-testid={`card-sector-${sector.id}`}
                            data-sector-code={sector.sectorCode}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                                  <Ticket className="w-5 h-5 text-black" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-foreground" data-testid={`text-sector-name-${sector.id}`}>
                                    {sector.name}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {sector.availableSeats} posti disponibili
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {sector.availableSeats > 0 ? (
                                  <>
                                    <div className="text-2xl font-bold text-primary" data-testid={`text-sector-price-${sector.id}`}>
                                      €{sectorPrice.toFixed(2)}
                                    </div>
                                    {sector.priceRidotto && Number(sector.priceRidotto) > 0 && (
                                      <p className="text-xs text-muted-foreground">Ridotto: €{Number(sector.priceRidotto).toFixed(2)}</p>
                                    )}
                                  </>
                                ) : (
                                  <Badge variant="destructive">Esaurito</Badge>
                                )}
                              </div>
                            </div>

                            {/* Expanded content when selected */}
                            {isSelectedSector && sector.availableSeats > 0 && (
                              <div className="mt-4 pt-4 border-t border-border space-y-4">
                                {/* Ticket type selection */}
                                {sector.priceRidotto && Number(sector.priceRidotto) > 0 && (
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium">Tipo Biglietto</Label>
                                    <RadioGroup value={ticketType} onValueChange={setTicketType} className="flex gap-3">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setTicketType("intero"); }}
                                        className={`flex-1 p-3 rounded-xl border transition-all ${
                                          ticketType === "intero" ? "border-primary bg-primary/10" : "border-border"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <RadioGroupItem value="intero" id={`desktop-intero-${sector.id}`} />
                                          <Label htmlFor={`desktop-intero-${sector.id}`} className="cursor-pointer font-medium">
                                            Intero
                                          </Label>
                                        </div>
                                        <p className="text-primary font-bold mt-1">€{Number(sector.priceIntero).toFixed(2)}</p>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setTicketType("ridotto"); }}
                                        className={`flex-1 p-3 rounded-xl border transition-all ${
                                          ticketType === "ridotto" ? "border-primary bg-primary/10" : "border-border"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <RadioGroupItem value="ridotto" id={`desktop-ridotto-${sector.id}`} />
                                          <Label htmlFor={`desktop-ridotto-${sector.id}`} className="cursor-pointer font-medium">
                                            Ridotto
                                          </Label>
                                        </div>
                                        <p className="text-primary font-bold mt-1">€{Number(sector.priceRidotto).toFixed(2)}</p>
                                      </button>
                                    </RadioGroup>
                                  </div>
                                )}

                                {/* Quantity or seat selection */}
                                {sector.isNumbered ? (
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium">Seleziona Posto</Label>
                                    <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto p-3 bg-muted/30 rounded-xl">
                                      {sector.seats.map((seat) => {
                                        const isMapSelected = selectedSeatIds.includes(seat.id);
                                        return (
                                          <button
                                            key={seat.id}
                                            onClick={(e) => { 
                                              e.stopPropagation(); 
                                              handleSeatClickFromCard(seat); 
                                            }}
                                            disabled={seat.status !== "available"}
                                            className={`p-2 text-xs rounded-lg font-medium transition-all ${
                                              seat.status !== "available"
                                                ? "bg-red-500/20 text-red-400 cursor-not-allowed"
                                                : isMapSelected || selectedSeat?.id === seat.id
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted/50 text-foreground hover-elevate"
                                            }`}
                                            data-testid={`seat-btn-${seat.id}`}
                                          >
                                            {seat.row}{seat.seatNumber}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {selectedSeat && (
                                      <p className="text-sm text-emerald-500 flex items-center gap-1">
                                        <Check className="w-4 h-4" />
                                        Posto: Fila {selectedSeat.row}, Posto {selectedSeat.seatNumber}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium">Quantità</Label>
                                    <div className="flex items-center gap-4">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); setQuantity(Math.max(1, quantity - 1)); }}
                                        data-testid={`button-minus-${sector.id}`}
                                      >
                                        <Minus className="w-4 h-4" />
                                      </Button>
                                      <span className="text-2xl font-bold w-12 text-center" data-testid={`text-quantity-${sector.id}`}>
                                        {quantity}
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); setQuantity(Math.min(10, quantity + 1)); }}
                                        data-testid={`button-plus-${sector.id}`}
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* Nominative fields */}
                                {event.requiresNominative && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Nome</Label>
                                      <Input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Mario"
                                        onClick={(e) => e.stopPropagation()}
                                        data-testid={`input-firstname-${sector.id}`}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Cognome</Label>
                                      <Input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Rossi"
                                        onClick={(e) => e.stopPropagation()}
                                        data-testid={`input-lastname-${sector.id}`}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - right side */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-4">
                  {/* Nominative warning */}
                  {event.requiresNominative && (
                    <Card className="bg-purple-500/10 border-purple-500/20">
                      <CardContent className="p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-purple-300 text-sm">Biglietti Nominativi</h4>
                          <p className="text-xs text-purple-200/70">
                            Inserisci nome e cognome per ogni partecipante.
                            {event.allowsChangeName && " Il cambio nominativo è consentito."}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Purchase card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Riepilogo ordine</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedSector ? (
                        <>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{selectedSector.name}</span>
                              <span>
                                {selectedSector.isNumbered ? 1 : quantity} x €{price?.toFixed(2)}
                              </span>
                            </div>
                            {selectedSeat && (
                              <div className="text-sm text-muted-foreground">
                                Fila {selectedSeat.row}, Posto {selectedSeat.seatNumber}
                              </div>
                            )}
                          </div>
                          <div className="border-t border-border pt-4">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">Totale</span>
                              <span className="text-2xl font-bold text-primary">
                                €{totalPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <Button
                            className="w-full"
                            size="lg"
                            onClick={handlePurchase}
                            disabled={!canPurchase || isAdding}
                            data-testid="button-purchase"
                          >
                            {isAdding ? (
                              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            ) : (
                              <>
                                <ShoppingCart className="w-5 h-5 mr-2" />
                                Aggiungi al carrello
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <Ticket className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Seleziona un biglietto per continuare
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Cart button */}
                  <Link href="/carrello">
                    <Button variant="outline" className="w-full" data-testid="button-view-cart">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Vai al carrello
                      {cartCount > 0 && (
                        <Badge className="ml-2">{cartCount}</Badge>
                      )}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // Mobile version
  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
      >
        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : event ? (
          <>
            <div className="relative w-full aspect-[3/4]">
              {event.eventImageUrl ? (
                <img
                  src={event.eventImageUrl}
                  alt={event.eventName}
                  className="absolute inset-0 w-full h-full object-cover"
                  data-testid="img-event-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-purple-900/50 to-pink-900/40 flex items-center justify-center">
                  <Music className="w-24 h-24 text-white/20" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              
              <Link href="/acquista">
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={springTransition}
                  className="absolute top-0 left-4 w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center z-10"
                  style={{ marginTop: 'calc(12px + env(safe-area-inset-top))' }}
                  data-testid="button-back"
                  onClick={() => triggerHaptic('light')}
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </motion.button>
              </Link>
              
              <Link href="/carrello">
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={springTransition}
                  className="absolute top-0 right-4 w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center z-10"
                  style={{ marginTop: 'calc(12px + env(safe-area-inset-top))' }}
                  data-testid="button-cart"
                  onClick={() => triggerHaptic('light')}
                >
                  <ShoppingCart className="w-5 h-5 text-white" />
                  <AnimatePresence>
                    {cartCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={springTransition}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center"
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </Link>
              
              <motion.div 
                className="absolute bottom-0 left-0 right-0 p-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: 0.1 }}
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  {event.ticketingStatus === "active" && (
                    <Badge className="bg-emerald-500/90 text-white border-0 px-3 py-1 shadow-lg">
                      <Zap className="w-3 h-3 mr-1" />
                      In Vendita
                    </Badge>
                  )}
                  {event.requiresNominative && (
                    <Badge className="bg-purple-500/90 text-white border-0 px-3 py-1">
                      Nominativo
                    </Badge>
                  )}
                </div>
                
                <h1 
                  className="text-2xl font-black text-white mb-3 leading-tight"
                  data-testid="text-event-name"
                >
                  {event.eventName}
                </h1>
                
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl rounded-xl px-3 py-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-white" data-testid="text-event-date">
                      {format(new Date(event.eventStart), "d MMMM", { locale: it })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl rounded-xl px-3 py-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-white" data-testid="text-event-time">
                      {format(new Date(event.eventStart), "HH:mm")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl rounded-xl px-3 py-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-white truncate max-w-[150px]" data-testid="text-event-location">
                      {event.locationName}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="px-4 py-6 space-y-5 -mt-4 relative z-10">
              {event.eventDescription && (
                <motion.div
                  {...fadeInUp}
                  transition={{ ...springTransition, delay: 0.2 }}
                  className="bg-card/50 border border-border p-4 rounded-2xl backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-primary" />
                    <h3 className="text-base font-semibold text-foreground">Descrizione</h3>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-event-description">
                    {event.eventDescription}
                  </p>
                </motion.div>
              )}

              {event.requiresNominative && (
                <motion.div
                  {...fadeInUp}
                  transition={{ ...springTransition, delay: 0.25 }}
                  className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-300 text-sm">Biglietti Nominativi</h4>
                    <p className="text-xs text-purple-200/70">
                      Inserisci nome e cognome per ogni partecipante.
                      {event.allowsChangeName && " Il cambio nominativo è consentito."}
                    </p>
                  </div>
                </motion.div>
              )}

              {floorPlan && floorPlan.zones && floorPlan.zones.length > 0 && (
                <FloorPlanViewer
                  floorPlan={floorPlan}
                  sectors={event.sectors}
                  selectedZoneId={selectedZoneId}
                  selectedSeatIds={selectedSeatIds}
                  onZoneClick={handleZoneClick}
                  onSeatClick={handleSeatClick}
                />
              )}

              <motion.div
                {...fadeInUp}
                transition={{ ...springTransition, delay: 0.3 }}
              >
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-primary" />
                  Scegli il tuo biglietto
                </h2>
                
                <div className="space-y-4" data-testid="grid-sectors">
                  {event.sectors.map((sector, index) => (
                    <motion.div
                      key={sector.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...springTransition, delay: 0.35 + index * 0.05 }}
                      onClick={() => {
                        if (sector.availableSeats > 0) {
                          triggerHaptic('light');
                          setSelectedSectorId(sector.id);
                        }
                      }}
                      className={`transition-all duration-300 rounded-2xl ${
                        selectedSectorId === sector.id || highlightedSectorCode === sector.sectorCode
                          ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                          : ""
                      }`}
                    >
                      <TicketTypeCard
                        sector={sector}
                        quantity={quantity}
                        setQuantity={setQuantity}
                        ticketType={ticketType}
                        setTicketType={setTicketType}
                        firstName={firstName}
                        setFirstName={setFirstName}
                        lastName={lastName}
                        setLastName={setLastName}
                        requiresNominative={event.requiresNominative}
                        selectedSeat={selectedSectorId === sector.id ? selectedSeat : null}
                        onSeatClick={handleSeatClickFromCard}
                        mapSelectedSeatIds={selectedSectorId === sector.id ? selectedSeatIds : []}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {event.sectors.length === 0 && (
                <motion.div {...fadeInUp}>
                  <div className="p-8 text-center bg-card/50 border border-border rounded-2xl">
                    <Ticket className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Nessun biglietto</h3>
                    <p className="text-sm text-muted-foreground">
                      I biglietti non sono ancora disponibili.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {event && event.sectors.length > 0 && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={springTransition}
          className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Totale</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                €{totalPrice.toFixed(2)}
              </p>
            </div>
            <Button
              onClick={handlePurchase}
              disabled={!canPurchase || isAdding}
              className="h-14 px-8 rounded-xl text-lg font-bold shadow-lg shadow-primary/25 flex-1 max-w-[200px]"
              data-testid="button-purchase"
            >
              {isAdding ? (
                <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Acquista
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
