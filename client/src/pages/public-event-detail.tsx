import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
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
  Flame,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Shield,
  Lock,
  Unlock,
  X,
  RefreshCw,
  Eye,
  Timer,
  Users,
  Ban,
  CheckCircle,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { PublicReservationSection } from "@/components/public-reservation-section";
import { useSeatHolds, type SeatStatusUpdate } from "@/hooks/use-ticketing-websocket";
import { HoldCountdownTimer } from "@/components/hold-countdown-timer";

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

interface SubscriptionType {
  id: string;
  name: string;
  description: string | null;
  price: string;
  eventsCount: number;
  turnType: string;
  maxQuantity: number | null;
  soldCount: number;
  validFrom: Date | null;
  validTo: Date | null;
  availableQuantity: number | null;
  isAvailable: boolean;
}

interface PageConfig {
  config: {
    heroVideoUrl?: string;
    heroImageUrl?: string;
    heroOverlayOpacity?: number;
    showLiveViewers?: boolean;
    showRemainingTickets?: boolean;
    urgencyThreshold?: number;
    earlyBirdEndDate?: string;
    earlyBirdLabel?: string;
    themeKey?: string;
    dressCode?: string;
    minAge?: number;
    parkingInfo?: string;
  } | null;
  blocks: Array<{
    id: string;
    blockType: string;
    position: number;
    title?: string;
    config?: any;
  }>;
  artists: Array<{
    id: string;
    name: string;
    role?: string;
    photoUrl?: string;
    setTime?: string;
    socialLinks?: { instagram?: string; spotify?: string };
  }>;
  timeline: Array<{
    id: string;
    time: string;
    label: string;
    description?: string;
    icon?: string;
  }>;
  faq: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
}

function EarlyBirdCountdown({ endDate, label }: { endDate: string; label?: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endDate).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };
    
    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      if (newTimeLeft.days === 0 && newTimeLeft.hours === 0 && newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        clearInterval(timer);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [endDate]);
  
  if (new Date(endDate).getTime() <= Date.now()) {
    return null;
  }
  
  return (
    <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-lg p-3" data-testid="early-bird-countdown">
      <div className="text-xs text-amber-400 mb-1">{label || "Prezzo Early Bird termina tra:"}</div>
      <div className="flex gap-2 text-center">
        <div><span className="text-xl font-bold text-white">{timeLeft.days}</span><span className="text-xs text-gray-400 block">giorni</span></div>
        <span className="text-amber-500">:</span>
        <div><span className="text-xl font-bold text-white">{timeLeft.hours}</span><span className="text-xs text-gray-400 block">ore</span></div>
        <span className="text-amber-500">:</span>
        <div><span className="text-xl font-bold text-white">{timeLeft.minutes}</span><span className="text-xs text-gray-400 block">min</span></div>
        <span className="text-amber-500">:</span>
        <div><span className="text-xl font-bold text-white">{timeLeft.seconds}</span><span className="text-xs text-gray-400 block">sec</span></div>
      </div>
    </div>
  );
}

function LineupBlock({ artists }: { artists: Array<any> }) {
  if (!artists?.length) return null;
  return (
    <section className="py-8" data-testid="lineup-section">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Music className="w-6 h-6 text-amber-400" />
        Line-Up
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {artists.map((artist) => (
          <Card key={artist.id} className="bg-black/40 border-white/10 overflow-hidden group" data-testid={`artist-card-${artist.id}`}>
            <div className="aspect-square relative">
              {artist.photoUrl ? (
                <img src={artist.photoUrl} alt={artist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                  <Music className="w-12 h-12 text-white/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="font-bold text-white">{artist.name}</div>
                {artist.role && <div className="text-xs text-amber-400">{artist.role}</div>}
                {artist.setTime && <div className="text-xs text-gray-400 mt-1">{artist.setTime}</div>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function TimelineBlock({ items }: { items: Array<any> }) {
  if (!items?.length) return null;
  return (
    <section className="py-8" data-testid="timeline-section">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Clock className="w-6 h-6 text-amber-400" />
        Programma
      </h2>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500 via-purple-500 to-teal-500" />
        <div className="space-y-6">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 ml-4" data-testid={`timeline-item-${item.id}`}>
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-black -ml-[7px]" />
              </div>
              <div className="flex-1 pb-2">
                <div className="text-amber-400 font-bold text-lg">{item.time}</div>
                <div className="text-white font-medium">{item.label}</div>
                {item.description && <div className="text-gray-400 text-sm mt-1">{item.description}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickInfoBlock({ config }: { config: any }) {
  const infoItems = [
    config?.dressCode && { icon: "shirt", label: "Dress Code", value: config.dressCode },
    config?.minAge && { icon: "user", label: "Età Minima", value: `${config.minAge}+` },
    config?.parkingInfo && { icon: "car", label: "Parcheggio", value: config.parkingInfo },
  ].filter(Boolean);
  
  if (!infoItems.length) return null;
  
  return (
    <section className="py-8" data-testid="quick-info-section">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Info className="w-6 h-6 text-amber-400" />
        Info Utili
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {infoItems.map((item: any, i) => (
          <Card key={i} className="bg-black/40 border-white/10 p-4" data-testid={`quick-info-item-${i}`}>
            <div className="text-gray-400 text-sm">{item.label}</div>
            <div className="text-white font-medium mt-1">{item.value}</div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function FaqBlock({ items }: { items: Array<any> }) {
  if (!items?.length) return null;
  return (
    <section className="py-8" data-testid="faq-section">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <HelpCircle className="w-6 h-6 text-amber-400" />
        Domande Frequenti
      </h2>
      <Accordion type="single" collapsible className="space-y-2">
        {items.map((item) => (
          <AccordionItem key={item.id} value={item.id} className="bg-black/40 border border-white/10 rounded-lg px-4" data-testid={`faq-item-${item.id}`}>
            <AccordionTrigger className="text-white hover:text-amber-400 text-left">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-gray-400">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function ModularBlocksRenderer({ pageConfig }: { pageConfig: PageConfig | undefined }) {
  if (!pageConfig) return null;
  
  return (
    <div className="mt-8 space-y-4">
      {pageConfig.blocks?.length > 0 ? (
        pageConfig.blocks
          .sort((a, b) => a.position - b.position)
          .map((block) => {
            switch (block.blockType) {
              case 'lineup':
                return <LineupBlock key={block.id} artists={pageConfig.artists} />;
              case 'timeline':
                return <TimelineBlock key={block.id} items={pageConfig.timeline} />;
              case 'info':
                return <QuickInfoBlock key={block.id} config={pageConfig.config} />;
              case 'faq':
                return <FaqBlock key={block.id} items={pageConfig.faq} />;
              default:
                return null;
            }
          })
      ) : (
        <>
          {pageConfig.artists && pageConfig.artists.length > 0 && <LineupBlock artists={pageConfig.artists} />}
          {pageConfig.timeline && pageConfig.timeline.length > 0 && <TimelineBlock items={pageConfig.timeline} />}
          {pageConfig.config && <QuickInfoBlock config={pageConfig.config} />}
          {pageConfig.faq && pageConfig.faq.length > 0 && <FaqBlock items={pageConfig.faq} />}
        </>
      )}
    </div>
  );
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

interface SeatHoldInfo {
  seatId?: string;
  zoneId?: string;
  status: 'available' | 'held' | 'sold' | 'blocked';
  holdId?: string;
  expiresAt?: string;
  sessionId?: string;
}

interface OperationalStats {
  totalSeats: number;
  available: number;
  held: number;
  sold: number;
  blocked: number;
  expiredHolds: number;
  activeHolds: number;
}

interface SeatDetails {
  seat: {
    id: string;
    row: string;
    seatNumber: string;
    seatLabel?: string;
    isAccessible?: boolean;
  };
  status: string;
  currentHold: {
    id: string;
    sessionId: string;
    holdType: string;
    expiresAt: string;
    createdAt: string;
    customerId?: string;
    userId?: string;
    quantity?: number;
    priceSnapshot?: string;
    extendedCount?: number;
  } | null;
  holdHistory: Array<{
    id: string;
    status: string;
    holdType: string;
    createdAt: string;
    expiresAt: string;
    sessionId: string;
  }>;
}

function OperationalStatsBar({ 
  eventId, 
  stats, 
  isRefreshing, 
  onRefresh 
}: { 
  eventId: string; 
  stats: OperationalStats | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  if (!stats) return null;
  
  return (
    <div 
      className="sticky top-0 z-40 bg-orange-950/95 backdrop-blur-xl border-b border-orange-500/30 shadow-lg"
      data-testid="operational-toolbar"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-400" />
            <span className="font-bold text-orange-100">Staff Mode</span>
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
              Operational View
            </Badge>
          </div>
          
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5" data-testid="stat-total">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">Total:</span>
                <span className="font-bold text-white">{stats.totalSeats}</span>
              </div>
              <div className="flex items-center gap-1.5" data-testid="stat-available">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">Available:</span>
                <span className="font-bold text-green-400">{stats.available}</span>
              </div>
              <div className="flex items-center gap-1.5" data-testid="stat-held">
                <Timer className="w-4 h-4 text-amber-400" />
                <span className="text-gray-300">Held:</span>
                <span className="font-bold text-amber-400">{stats.held}</span>
              </div>
              <div className="flex items-center gap-1.5" data-testid="stat-sold">
                <Ticket className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300">Sold:</span>
                <span className="font-bold text-blue-400">{stats.sold}</span>
              </div>
              <div className="flex items-center gap-1.5" data-testid="stat-blocked">
                <Ban className="w-4 h-4 text-red-400" />
                <span className="text-gray-300">Blocked:</span>
                <span className="font-bold text-red-400">{stats.blocked}</span>
              </div>
              <div className="flex items-center gap-1.5" data-testid="stat-expired">
                <AlertCircle className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">Expired:</span>
                <span className="font-bold text-gray-400">{stats.expiredHolds}</span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="text-orange-300 hover:text-orange-100"
              data-testid="button-refresh-stats"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeatInfoPanel({
  isOpen,
  onClose,
  seatId,
  eventId,
  onActionComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  seatId: string | null;
  eventId: string;
  onActionComplete: () => void;
}) {
  const { toast } = useToast();
  
  const { data: seatDetails, isLoading, refetch } = useQuery<{ success: boolean; seat: SeatDetails['seat']; status: string; currentHold: SeatDetails['currentHold']; holdHistory: SeatDetails['holdHistory'] }>({
    queryKey: ['/api/events', eventId, 'seats', seatId, 'details'],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/seats/${seatId}/details`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch seat details');
      return res.json();
    },
    enabled: isOpen && !!seatId && !!eventId,
  });
  
  const blockMutation = useMutation({
    mutationFn: async ({ blocked, reason }: { blocked: boolean; reason?: string }) => {
      return apiRequest('POST', `/api/events/${eventId}/seats/${seatId}/block`, { blocked, reason });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.blocked ? 'Seat Blocked' : 'Seat Unblocked',
        description: `Seat has been ${variables.blocked ? 'blocked' : 'unblocked'} successfully.`,
      });
      refetch();
      onActionComplete();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update seat status',
        variant: 'destructive',
      });
    },
  });
  
  const forceReleaseMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/events/${eventId}/seats/force-release`, { seatId, force: true });
    },
    onSuccess: () => {
      toast({
        title: 'Hold Released',
        description: 'The hold has been forcefully released.',
      });
      refetch();
      onActionComplete();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to release hold',
        variant: 'destructive',
      });
    },
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Available</Badge>;
      case 'held':
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Held</Badge>;
      case 'sold':
        return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Sold</Badge>;
      case 'blocked':
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Blocked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="bg-background/95 backdrop-blur-xl border-border w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Seat Details
          </SheetTitle>
          <SheetDescription>
            View and manage seat information
          </SheetDescription>
        </SheetHeader>
        
        {isLoading ? (
          <div className="py-8 space-y-4">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : seatDetails ? (
          <ScrollArea className="h-[calc(100vh-120px)] pr-4 mt-4">
            <div className="space-y-6">
              <div className="bg-card/50 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">Seat Information</h3>
                  {getStatusBadge(seatDetails.status)}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Row:</span>
                    <span className="ml-2 font-medium text-foreground">{seatDetails.seat.row}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Seat:</span>
                    <span className="ml-2 font-medium text-foreground">{seatDetails.seat.seatNumber}</span>
                  </div>
                  {seatDetails.seat.seatLabel && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Label:</span>
                      <span className="ml-2 font-medium text-foreground">{seatDetails.seat.seatLabel}</span>
                    </div>
                  )}
                  {seatDetails.seat.isAccessible && (
                    <div className="col-span-2">
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Accessible</Badge>
                    </div>
                  )}
                </div>
              </div>
              
              {seatDetails.currentHold && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Timer className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-amber-100">Current Hold</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hold ID:</span>
                      <span className="font-mono text-xs text-foreground truncate max-w-[200px]">{seatDetails.currentHold.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Session:</span>
                      <span className="font-mono text-xs text-foreground truncate max-w-[200px]">{seatDetails.currentHold.sessionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline" className="text-xs">{seatDetails.currentHold.holdType}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="text-foreground">{format(new Date(seatDetails.currentHold.createdAt), 'dd/MM HH:mm:ss')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="text-foreground">{format(new Date(seatDetails.currentHold.expiresAt), 'dd/MM HH:mm:ss')}</span>
                    </div>
                    {seatDetails.currentHold.extendedCount !== undefined && seatDetails.currentHold.extendedCount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Extended:</span>
                        <span className="text-foreground">{seatDetails.currentHold.extendedCount}x</span>
                      </div>
                    )}
                    {seatDetails.currentHold.priceSnapshot && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="text-foreground">€{seatDetails.currentHold.priceSnapshot}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Quick Actions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {seatDetails.status === 'blocked' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => blockMutation.mutate({ blocked: false })}
                      disabled={blockMutation.isPending}
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                      data-testid="button-unblock-seat"
                    >
                      <Unlock className="w-4 h-4 mr-1" />
                      Unblock Seat
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => blockMutation.mutate({ blocked: true })}
                      disabled={blockMutation.isPending || seatDetails.status === 'sold'}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      data-testid="button-block-seat"
                    >
                      <Lock className="w-4 h-4 mr-1" />
                      Block Seat
                    </Button>
                  )}
                  
                  {seatDetails.currentHold && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => forceReleaseMutation.mutate()}
                      disabled={forceReleaseMutation.isPending}
                      className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      data-testid="button-force-release"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Force Release
                    </Button>
                  )}
                </div>
              </div>
              
              {seatDetails.holdHistory && seatDetails.holdHistory.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <History className="w-4 h-4 text-muted-foreground" />
                    Hold History
                  </h3>
                  <div className="space-y-2">
                    {seatDetails.holdHistory.map((hold, index) => (
                      <div 
                        key={hold.id} 
                        className="bg-muted/30 rounded-lg p-3 text-sm"
                        data-testid={`hold-history-${index}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">{hold.holdType}</Badge>
                          <Badge 
                            className={`text-xs ${
                              hold.status === 'active' ? 'bg-green-500/20 text-green-300' :
                              hold.status === 'expired' ? 'bg-gray-500/20 text-gray-300' :
                              hold.status === 'released' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-purple-500/20 text-purple-300'
                            }`}
                          >
                            {hold.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(hold.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No seat selected
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FloorPlanViewer({
  floorPlan,
  sectors,
  selectedZoneId,
  selectedSeatIds,
  onZoneClick,
  onSeatClick,
  seatStatuses,
  mySessionId,
}: {
  floorPlan: FloorPlan;
  sectors: Sector[];
  selectedZoneId: string | null;
  selectedSeatIds: string[];
  onZoneClick: (zoneId: string, sectorCode: string | null) => void;
  onSeatClick: (seatId: string, seat: Seat) => void;
  seatStatuses?: Map<string, SeatHoldInfo>;
  mySessionId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<FloorPlanZone | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
  const dragStartRef = useRef({ x: 0, y: 0 });
  const translateRef = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef<number | null>(null);
  const throttleRef = useRef<number>(0);
  const isMobile = useIsMobile();
  
  const MIN_SCALE = 1;
  const MAX_SCALE = 4;

  const clampTranslate = (tx: number, ty: number, currentScale: number) => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    const containerWidth = containerRef.current?.clientWidth || 300;
    const containerHeight = containerRef.current?.clientHeight || 200;
    const maxX = 0;
    const minX = containerWidth - (containerWidth * currentScale);
    const maxY = 0;
    const minY = containerHeight - (containerHeight * currentScale);
    return {
      x: Math.min(maxX, Math.max(minX, tx)),
      y: Math.min(maxY, Math.max(minY, ty)),
    };
  };

  const handleZoomIn = () => {
    setScale(prev => {
      const newScale = Math.min(MAX_SCALE, prev * 1.3);
      const clamped = clampTranslate(translate.x, translate.y, newScale);
      setTranslate(clamped);
      translateRef.current = clamped;
      return newScale;
    });
    triggerHaptic('light');
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(MIN_SCALE, prev / 1.3);
      if (newScale === MIN_SCALE) {
        setTranslate({ x: 0, y: 0 });
        translateRef.current = { x: 0, y: 0 };
      } else {
        const clamped = clampTranslate(translate.x, translate.y, newScale);
        setTranslate(clamped);
        translateRef.current = clamped;
      }
      return newScale;
    });
    triggerHaptic('light');
  };

  const handleReset = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    translateRef.current = { x: 0, y: 0 };
    triggerHaptic('medium');
  };

  const zoomToZone = (zone: FloorPlanZone) => {
    const coords = zone.coordinates;
    if (!coords || coords.length < 3) return;
    
    const centerX = coords.reduce((sum, p) => sum + p.x, 0) / coords.length;
    const centerY = coords.reduce((sum, p) => sum + p.y, 0) / coords.length;
    
    const newScale = 2.5;
    const containerWidth = containerRef.current?.clientWidth || 300;
    const containerHeight = containerRef.current?.clientHeight || 200;
    
    let newTranslateX = (containerWidth / 2) - (centerX / 100 * containerWidth * newScale);
    let newTranslateY = (containerHeight / 2) - (centerY / 100 * containerHeight * newScale);
    
    const clamped = clampTranslate(newTranslateX, newTranslateY, newScale);
    
    setScale(newScale);
    setTranslate(clamped);
    translateRef.current = clamped;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    
    setScale(prev => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev * delta));
      
      if (newScale === MIN_SCALE) {
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
      const now = Date.now();
      if (now - throttleRef.current < 16) return;
      throttleRef.current = now;
      
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

  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = distance;
      
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        lastPinchCenter.current = {
          x: ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left,
          y: ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top,
        };
      }
    } else if (e.touches.length === 1 && scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - translate.x,
        y: e.touches[0].clientY - translate.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current && lastPinchCenter.current) {
      e.preventDefault();
      
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = distance / lastTouchDistance.current;
      
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const centerX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
      const centerY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
      
      setScale(prev => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev * scaleFactor));
        
        if (newScale === MIN_SCALE) {
          setTranslate({ x: 0, y: 0 });
          translateRef.current = { x: 0, y: 0 };
        } else {
          const pointXInContent = (centerX - translate.x) / prev;
          const pointYInContent = (centerY - translate.y) / prev;
          
          const newTranslateX = centerX - pointXInContent * newScale;
          const newTranslateY = centerY - pointYInContent * newScale;
          
          const clamped = clampTranslate(newTranslateX, newTranslateY, newScale);
          setTranslate(clamped);
          translateRef.current = clamped;
        }
        return newScale;
      });
      
      lastTouchDistance.current = distance;
      lastPinchCenter.current = { x: centerX, y: centerY };
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      e.preventDefault();
      
      const now = Date.now();
      if (now - throttleRef.current < 16) return;
      throttleRef.current = now;
      
      const newX = e.touches[0].clientX - dragStartRef.current.x;
      const newY = e.touches[0].clientY - dragStartRef.current.y;
      const clamped = clampTranslate(newX, newY, scale);
      translateRef.current = clamped;
      setTranslate(clamped);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    lastTouchDistance.current = null;
    lastPinchCenter.current = null;
    setIsDragging(false);
    if (scale <= MIN_SCALE) {
      setTranslate({ x: 0, y: 0 });
      translateRef.current = { x: 0, y: 0 };
    }
  };

  const getSeatColor = (status: string, isSelected: boolean, isAccessible?: boolean, isMyHold?: boolean) => {
    if (isSelected) return '#22c55e';
    if (isMyHold) return '#3b82f6'; // Blue pulsante per i miei hold
    if (isAccessible && status === 'available') return '#60a5fa';
    switch (status) {
      case 'available': return '#10b981';
      case 'held': return '#f97316'; // Arancione per hold di altri
      case 'sold': return '#ef4444';
      case 'reserved': return '#f59e0b';
      case 'blocked': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const getRealtimeStatus = (seatId: string, originalStatus: string): { status: string; isMyHold: boolean } => {
    const holdInfo = seatStatuses?.get(seatId);
    if (holdInfo) {
      const isMyHold = holdInfo.sessionId === mySessionId;
      return { status: holdInfo.status, isMyHold };
    }
    return { status: originalStatus, isMyHold: false };
  };

  const getZoneColor = (linkedSector: Sector | undefined, isAvailable: boolean) => {
    if (!linkedSector || !isAvailable) return 'rgba(100, 100, 100, 0.2)';
    const price = Number(linkedSector.priceIntero);
    if (price >= 50) return 'rgba(168, 85, 247, 0.35)';
    if (price >= 30) return 'rgba(59, 130, 246, 0.35)';
    if (price >= 15) return 'rgba(34, 197, 94, 0.35)';
    return 'rgba(251, 191, 36, 0.35)';
  };

  const renderSeat = (seat: Seat, sectorCode: string) => {
    if (!seat.posX || !seat.posY) return null;
    
    const x = Number(seat.posX);
    const y = Number(seat.posY);
    const isSelected = selectedSeatIds.includes(seat.id);
    const { status: realtimeStatus, isMyHold } = getRealtimeStatus(seat.id, seat.status);
    const isAvailable = realtimeStatus === 'available';
    const canSelect = isAvailable || isMyHold;
    const seatRadius = scale > 2 ? 3.5 : 2.5;
    
    return (
      <g key={seat.id} style={{ pointerEvents: 'auto' }}>
        <circle
          cx={x}
          cy={y}
          r={seatRadius}
          fill={getSeatColor(realtimeStatus, isSelected, seat.isAccessible, isMyHold)}
          stroke={isSelected ? '#16a34a' : isMyHold ? '#3b82f6' : 'rgba(255,255,255,0.6)'}
          strokeWidth={isSelected ? 0.6 : isMyHold ? 0.5 : 0.3}
          style={{ cursor: canSelect ? 'pointer' : 'not-allowed', pointerEvents: 'auto' }}
          onClick={(e) => {
            e.stopPropagation();
            if (canSelect) {
              triggerHaptic('medium');
              onSeatClick(seat.id, seat);
            }
          }}
          data-testid={`seat-${seat.id}`}
        />
        {isMyHold && !isSelected && (
          <circle
            cx={x}
            cy={y}
            r={seatRadius + 1.2}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={0.3}
            className="pointer-events-none animate-pulse"
          />
        )}
        {isSelected && (
          <circle
            cx={x}
            cy={y}
            r={seatRadius + 1.5}
            fill="none"
            stroke="#22c55e"
            strokeWidth={0.4}
            className="pointer-events-none animate-pulse"
          />
        )}
        {scale > 2.5 && canSelect && (
          <text
            x={x}
            y={y + 0.5}
            fill="white"
            fontSize="1.8"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            className="pointer-events-none"
          >
            {seat.seatNumber}
          </text>
        )}
      </g>
    );
  };

  const renderZonePolygon = (zone: FloorPlanZone) => {
    const coords = zone.coordinates;
    if (!coords || coords.length < 3) return null;
    
    const points = coords.map(p => `${p.x},${p.y}`).join(' ');
    const isSelected = selectedZoneId === zone.id;
    const isHovered = hoveredZone?.id === zone.id;
    
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
    
    const baseColor = getZoneColor(linkedSector, isAvailable);
    const fillColor = isSelected 
      ? 'rgba(34, 197, 94, 0.4)' 
      : isHovered 
        ? 'rgba(255, 255, 255, 0.25)' 
        : baseColor;
    
    return (
      <g key={zone.id} className="zone-group">
        <polygon
          points={points}
          fill={fillColor}
          stroke={isSelected ? '#22c55e' : isHovered ? '#ffffff' : (isAvailable ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)')}
          strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 1}
          style={{ 
            cursor: isAvailable && linkedSector ? 'pointer' : 'not-allowed',
            pointerEvents: isDragging ? 'none' : 'painted',
            touchAction: 'manipulation',
            filter: isSelected ? 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.7))' : isHovered ? 'drop-shadow(0 0 4px rgba(255,255,255,0.4))' : 'none',
            transition: 'all 0.2s ease'
          }}
          className={`${!isAvailable ? 'opacity-30' : ''}`}
          onClick={(e) => {
            if (isDragging) return;
            e.preventDefault();
            e.stopPropagation();
            if (isAvailable && linkedSector) {
              triggerHaptic('medium');
              onZoneClick(zone.id, linkedSector.sectorCode);
              if (linkedSector.isNumbered) {
                zoomToZone(zone);
              }
            }
          }}
          onMouseEnter={(e) => {
            if (!isMobile && isAvailable) {
              setHoveredZone(zone);
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) {
                setTooltipPos({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top - 60,
                });
              }
            }
          }}
          onMouseMove={(e) => {
            if (!isMobile && hoveredZone?.id === zone.id) {
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) {
                setTooltipPos({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top - 60,
                });
              }
            }
          }}
          onMouseLeave={() => {
            setHoveredZone(null);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            if (isDragging) return;
            e.preventDefault();
            e.stopPropagation();
            if (isAvailable && linkedSector) {
              triggerHaptic('medium');
              onZoneClick(zone.id, linkedSector.sectorCode);
              if (linkedSector.isNumbered) {
                zoomToZone(zone);
              }
            }
          }}
          data-testid={`zone-polygon-${zone.id}`}
        />
        {displayPrice !== null && scale < 2 && (
          <g className="pointer-events-none">
            <rect
              x={centerX - 14}
              y={centerY - 8}
              width={28}
              height={16}
              rx={3}
              fill="rgba(0,0,0,0.8)"
              stroke={isAvailable ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'}
              strokeWidth={0.5}
            />
            <text
              x={centerX}
              y={centerY + 1}
              fill={isAvailable ? '#ffffff' : '#666666'}
              fontSize="7"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              €{displayPrice.toFixed(0)}
            </text>
          </g>
        )}
        {isSelected && (
          <g className="pointer-events-none">
            <rect
              x={centerX - 20}
              y={centerY - 10}
              width={40}
              height={20}
              rx={4}
              fill="rgba(34, 197, 94, 0.9)"
            />
            <text
              x={centerX}
              y={centerY + 1}
              fill="#ffffff"
              fontSize="8"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              €{displayPrice?.toFixed(0) || '0'}
            </text>
          </g>
        )}
      </g>
    );
  };

  const hoveredSector = hoveredZone ? (
    hoveredZone.eventMapping?.sectorId 
      ? sectors.find(s => s.id === hoveredZone.eventMapping?.sectorId)
      : sectors.find(s => s.sectorCode === hoveredZone.defaultSectorCode)
  ) : null;

  return (
    <motion.div {...fadeInUp} transition={{ ...springTransition, delay: 0.35 }}>
      <div className="bg-card/50 border border-border p-4 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Mappa Interattiva</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={scale <= MIN_SCALE}
              className="h-8 w-8"
              data-testid="button-zoom-out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={scale >= MAX_SCALE}
              className="h-8 w-8"
              data-testid="button-zoom-in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              disabled={scale === 1 && translate.x === 0 && translate.y === 0}
              className="h-8 w-8"
              data-testid="button-reset-zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-3">
          {isMobile ? 'Pizzica per zoomare • Tocca una zona' : 'Scroll per zoomare • Clicca una zona • Trascina per muoverti'}
        </p>
        
        <div 
          ref={containerRef}
          className="relative w-full aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden select-none"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            touchAction: 'none',
          }}
        >
          <div
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              width: '100%',
              height: '100%',
            }}
          >
            {floorPlan.imageUrl ? (
              <img 
                src={floorPlan.imageUrl} 
                alt={floorPlan.name}
                className="absolute inset-0 w-full h-full object-contain"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Map className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
            
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              style={{ zIndex: 10, pointerEvents: isDragging ? 'none' : 'all' }}
            >
              <g className="zones-layer">
                {floorPlan.zones.map(zone => renderZonePolygon(zone))}
              </g>
              <g className="seats-layer" style={{ opacity: scale > 1.5 ? 1 : 0.3, transition: 'opacity 0.3s' }}>
                {sectors.filter(s => s.isNumbered && s.seats?.length > 0).map(sector => 
                  sector.seats.map(seat => renderSeat(seat, sector.sectorCode))
                )}
              </g>
            </svg>
          </div>

          {hoveredZone && hoveredSector && !isMobile && (
            <div
              className="absolute z-50 pointer-events-none"
              style={{
                left: tooltipPos.x,
                top: tooltipPos.y,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="bg-background/95 backdrop-blur-md border border-border rounded-lg px-3 py-2 shadow-xl">
                <p className="font-semibold text-sm text-foreground">{hoveredZone.name || hoveredSector.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-primary font-bold">€{Number(hoveredSector.priceIntero).toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">
                    {hoveredSector.availableSeats} disponibili
                  </span>
                </div>
                {hoveredSector.isNumbered && (
                  <p className="text-xs text-muted-foreground mt-1">Clicca per scegliere il posto</p>
                )}
              </div>
            </div>
          )}

          {scale > 1 && (
            <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-muted-foreground flex items-center gap-1">
              <Move className="w-3 h-3" />
              Trascina per muoverti
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(251, 191, 36, 0.6)' }} />
            <span className="text-xs text-muted-foreground">&lt;€15</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.6)' }} />
            <span className="text-xs text-muted-foreground">€15-30</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.6)' }} />
            <span className="text-xs text-muted-foreground">€30-50</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(168, 85, 247, 0.6)' }} />
            <span className="text-xs text-muted-foreground">&gt;€50</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
            <span className="text-xs text-muted-foreground">Selezionato</span>
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

  const getScarcityBadge = () => {
    if (sector.availableSeats < 10) {
      return (
        <Badge 
          className="bg-red-500/90 text-white border-0 text-xs px-2 py-0.5"
          data-testid={`badge-scarcity-critical-${sector.id}`}
        >
          <Flame className="w-3 h-3 mr-1" />
          Ultimi {sector.availableSeats}!
        </Badge>
      );
    }
    if (sector.availableSeats < 30) {
      return (
        <Badge 
          className="bg-orange-500/90 text-white border-0 text-xs px-2 py-0.5"
          data-testid={`badge-scarcity-warning-${sector.id}`}
        >
          <Flame className="w-3 h-3 mr-1" />
          Quasi esauriti
        </Badge>
      );
    }
    return null;
  };

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
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground" data-testid={`text-available-seats-${sector.id}`}>
                {sector.availableSeats} posti disponibili
              </span>
              {getScarcityBadge()}
            </div>
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
              onClick={() => { triggerHaptic('light'); setQuantity(Math.max(0, quantity - 1)); }}
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

function SubscriptionTypeCard({
  subscription,
  onAddToCart,
  isAdding,
}: {
  subscription: SubscriptionType;
  onAddToCart: (subscription: SubscriptionType) => void;
  isAdding: boolean;
}) {
  const price = Number(subscription.price);

  return (
    <motion.div 
      {...fadeInUp} 
      className="bg-card/50 border border-purple-500/30 rounded-2xl p-4 space-y-4"
      data-testid={`card-subscription-${subscription.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground" data-testid={`text-subscription-name-${subscription.id}`}>
              {subscription.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                Abbonamento
              </Badge>
              <span className="text-xs text-muted-foreground">
                {subscription.eventsCount} eventi
              </span>
              {subscription.availableQuantity !== null && (
                <span className="text-xs text-muted-foreground">
                  • {subscription.availableQuantity} disponibili
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent" data-testid={`text-subscription-price-${subscription.id}`}>
            €{price.toFixed(2)}
          </div>
        </div>
      </div>

      {subscription.description && (
        <p className="text-sm text-muted-foreground">
          {subscription.description}
        </p>
      )}

      <Button
        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold h-12 rounded-xl"
        onClick={() => onAddToCart(subscription)}
        disabled={isAdding}
        data-testid={`button-add-subscription-${subscription.id}`}
      >
        {isAdding ? (
          <span className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Aggiungendo...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Aggiungi al Carrello
          </span>
        )}
      </Button>
    </motion.div>
  );
}

export default function PublicEventDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isAuthenticated: isCustomerAuthenticated } = useCustomerAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [highlightedSectorCode, setHighlightedSectorCode] = useState<string | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [sectorQuantities, setSectorQuantities] = useState<Record<string, number>>({});
  const [sectorTicketTypes, setSectorTicketTypes] = useState<Record<string, string>>({});
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Hold system state - tracks hold info for each selected seat
  const [holdInfo, setHoldInfo] = useState<Record<string, { holdId: string; expiresAt: string }>>({});
  
  // Operational Mode State
  const isOperationalMode = useMemo(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('mode') === 'operational';
    }
    return false;
  }, []);
  
  const [operationalSeatId, setOperationalSeatId] = useState<string | null>(null);
  const [isSeatPanelOpen, setIsSeatPanelOpen] = useState(false);
  
  // Helper functions for per-sector quantity/type
  const getQuantity = (sectorId: string) => sectorQuantities[sectorId] ?? 0;
  const setQuantity = (sectorId: string, q: number) => setSectorQuantities(prev => ({ ...prev, [sectorId]: q }));
  const getTicketType = (sectorId: string) => sectorTicketTypes[sectorId] ?? "intero";
  const setTicketType = (sectorId: string, t: string) => setSectorTicketTypes(prev => ({ ...prev, [sectorId]: t }));

  const contentRef = useRef<HTMLDivElement>(null);

  const { data: event, isLoading, error } = useQuery<EventDetail>({
    queryKey: ["/api/public/events", params.id],
  });

  const { data: subscriptionTypes } = useQuery<SubscriptionType[]>({
    queryKey: ["/api/public/events", event?.eventId, "subscriptions"],
    queryFn: async () => {
      const res = await fetch(`/api/public/events/${event?.eventId}/subscriptions`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!event?.eventId,
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

  const { data: pageConfig } = useQuery<PageConfig>({
    queryKey: ['/api/public/ticketed-events', params.id, 'page-config'],
    queryFn: async () => {
      const res = await fetch(`/api/public/ticketed-events/${params.id}/page-config`, {
        credentials: "include",
      });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        return null;
      }
      return res.json();
    },
    enabled: !!params.id,
    retry: false,
  });

  // Operational Mode Stats Query
  const { data: operationalStatsData, isLoading: isLoadingStats, refetch: refetchStats } = useQuery<{ success: boolean; stats: OperationalStats }>({
    queryKey: ['/api/events', event?.id, 'operational-stats'],
    queryFn: async () => {
      const res = await fetch(`/api/events/${event?.id}/operational-stats`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: isOperationalMode && !!event?.id,
    refetchInterval: isOperationalMode ? 10000 : false,
  });

  const operationalStats = operationalStatsData?.stats || null;

  const handleOperationalRefresh = useCallback(() => {
    refetchStats();
    queryClient.invalidateQueries({ queryKey: ['/api/events', event?.id, 'operational-stats'] });
  }, [event?.id, refetchStats]);

  const liveViewersCount = useMemo(() => Math.floor(Math.random() * 50) + 30, [params.id]);

  const { seatStatuses, clientId: mySessionId, isConnected: wsConnected } = useSeatHolds(event?.id || '');

  const seatStatusMap = useMemo(() => {
    const statusMap = new globalThis.Map<string, SeatHoldInfo>();
    seatStatuses.forEach((update, key) => {
      statusMap.set(key, {
        seatId: update.seatId,
        zoneId: update.zoneId,
        status: update.status,
        holdId: update.holdId,
        expiresAt: update.expiresAt,
        sessionId: update.sessionId,
      });
    });
    return statusMap;
  }, [seatStatuses]);

  // Hold System Mutations
  const createHoldMutation = useMutation({
    mutationFn: async (seatId: string) => {
      const res = await apiRequest("POST", `/api/public/events/${event?.id}/seats/${seatId}/hold`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/events", params.id] });
    },
  });

  const releaseHoldMutation = useMutation({
    mutationFn: async (seatId: string) => {
      await apiRequest("DELETE", `/api/public/events/${event?.id}/seats/${seatId}/hold`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/events", params.id] });
    },
  });

  const extendHoldsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/public/events/${event?.id}/holds/extend`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.holds) {
        const newHoldInfo: Record<string, { holdId: string; expiresAt: string }> = {};
        data.holds.forEach((hold: any) => {
          if (hold.seatId) {
            newHoldInfo[hold.seatId] = { holdId: hold.id, expiresAt: hold.expiresAt };
          }
        });
        setHoldInfo(prev => ({ ...prev, ...newHoldInfo }));
      }
      toast({
        title: "Tempo esteso",
        description: "Hai altri 10 minuti per completare l'acquisto.",
      });
    },
    onError: () => {
      toast({
        title: "Impossibile estendere",
        description: "Non è stato possibile estendere il tempo.",
        variant: "destructive",
      });
    },
  });

  // Handle hold expiration
  const handleHoldExpire = useCallback((seatId: string) => {
    setSelectedSeatIds(prev => prev.filter(id => id !== seatId));
    setHoldInfo(prev => {
      const newInfo = { ...prev };
      delete newInfo[seatId];
      return newInfo;
    });
    toast({
      title: "Opzione scaduta",
      description: "Il tempo per il posto selezionato è scaduto.",
      variant: "destructive",
    });
  }, [toast]);

  // Handle manual release
  const handleReleaseHold = useCallback(async (seatId: string) => {
    try {
      await releaseHoldMutation.mutateAsync(seatId);
      setSelectedSeatIds(prev => prev.filter(id => id !== seatId));
      setHoldInfo(prev => {
        const newInfo = { ...prev };
        delete newInfo[seatId];
        return newInfo;
      });
    } catch (error) {
      console.error('Failed to release hold:', error);
    }
  }, [releaseHoldMutation]);

  // Get the earliest expiring hold for countdown display
  const earliestHoldExpiry = useMemo(() => {
    const holdTimes = Object.values(holdInfo).map(h => new Date(h.expiresAt).getTime());
    if (holdTimes.length === 0) return null;
    return new Date(Math.min(...holdTimes)).toISOString();
  }, [holdInfo]);

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

  const handleSeatClick = async (seatId: string, seat: Seat) => {
    // In operational mode, open the seat info panel instead of selecting
    if (isOperationalMode) {
      setOperationalSeatId(seatId);
      setIsSeatPanelOpen(true);
      return;
    }

    const isSelected = selectedSeatIds.includes(seatId);
    
    if (isSelected) {
      // Release hold when deselecting
      try {
        await releaseHoldMutation.mutateAsync(seatId);
        setSelectedSeatIds(prev => prev.filter(id => id !== seatId));
        setHoldInfo(prev => {
          const newInfo = { ...prev };
          delete newInfo[seatId];
          return newInfo;
        });
        triggerHaptic('light');
      } catch (error: any) {
        console.error('Failed to release hold:', error);
        // Still allow local deselection even if release fails
        setSelectedSeatIds(prev => prev.filter(id => id !== seatId));
        setHoldInfo(prev => {
          const newInfo = { ...prev };
          delete newInfo[seatId];
          return newInfo;
        });
      }
    } else {
      // Create hold when selecting
      try {
        const result = await createHoldMutation.mutateAsync(seatId);
        setSelectedSeatIds(prev => [...prev, seatId]);
        // Save hold info for timer
        if (result?.hold) {
          setHoldInfo(prev => ({ 
            ...prev, 
            [seatId]: { 
              holdId: result.hold.id, 
              expiresAt: result.hold.expiresAt 
            } 
          }));
        }
        triggerHaptic('success');
        
        toast({
          title: "Posto riservato",
          description: "Hai 10 minuti per completare l'acquisto.",
        });
      } catch (error: any) {
        triggerHaptic('error');
        const errorMessage = error?.message || "Posto non disponibile";
        toast({
          title: "Impossibile selezionare",
          description: errorMessage.includes('already held') 
            ? "Questo posto è già stato selezionato da un altro utente." 
            : errorMessage,
          variant: "destructive",
        });
        return;
      }
    }
    
    // Update sector selection
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

  const selectedTicketType = selectedSector ? getTicketType(selectedSector.id) : "intero";
  const selectedQuantity = selectedSector ? getQuantity(selectedSector.id) : 0;
  
  const price = selectedSector && (selectedTicketType === "ridotto" && selectedSector.priceRidotto
    ? Number(selectedSector.priceRidotto)
    : Number(selectedSector.priceIntero));

  const totalPrice = price ? price * (selectedSector?.isNumbered ? 1 : selectedQuantity) : 0;

  const canPurchase = selectedSector && 
    selectedSector.availableSeats > 0 &&
    (!selectedSector.isNumbered || selectedSeat) &&
    (selectedSector.isNumbered || selectedQuantity > 0) &&
    (!event?.requiresNominative || (firstName && lastName));

  const handlePurchase = async () => {
    if (!canPurchase || !selectedSector || !event || isAdding) return;

    triggerHaptic('medium');
    setIsAdding(true);
    
    try {
      await apiRequest("POST", "/api/public/cart/add", {
        ticketedEventId: event.id,
        sectorId: selectedSector.id,
        seatId: selectedSeat?.id,
        quantity: selectedSector.isNumbered ? 1 : selectedQuantity,
        ticketType: selectedTicketType,
        participantFirstName: firstName,
        participantLastName: lastName,
      });
      
      setCartCount(prev => prev + (selectedSector.isNumbered ? 1 : selectedQuantity));
      triggerHaptic('success');
      
      toast({
        title: "Aggiunto al carrello!",
        description: `${selectedSector.isNumbered ? 1 : selectedQuantity} biglietto/i aggiunto/i`,
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

  const [addingSubscriptionId, setAddingSubscriptionId] = useState<string | null>(null);

  const handleAddSubscriptionToCart = async (subscription: SubscriptionType) => {
    if (!event || addingSubscriptionId) return;

    triggerHaptic('medium');
    setAddingSubscriptionId(subscription.id);
    
    try {
      await apiRequest("POST", "/api/public/cart/add", {
        ticketedEventId: event.id,
        subscriptionTypeId: subscription.id,
        quantity: 1,
        participantFirstName: firstName,
        participantLastName: lastName,
      });
      
      setCartCount(prev => prev + 1);
      triggerHaptic('success');
      
      toast({
        title: "Abbonamento aggiunto!",
        description: `${subscription.name} aggiunto al carrello`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/public/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/events", event.eventId, "subscriptions"] });
      
      navigate("/carrello");
    } catch (error: any) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiungere al carrello.",
        variant: "destructive",
      });
    } finally {
      setAddingSubscriptionId(null);
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
        {/* Operational Mode Toolbar */}
        {isOperationalMode && event && (
          <OperationalStatsBar
            eventId={event.id}
            stats={operationalStats}
            isRefreshing={isLoadingStats}
            onRefresh={handleOperationalRefresh}
          />
        )}
        
        {/* Operational Mode Seat Info Panel */}
        {isOperationalMode && event && (
          <SeatInfoPanel
            isOpen={isSeatPanelOpen}
            onClose={() => {
              setIsSeatPanelOpen(false);
              setOperationalSeatId(null);
            }}
            seatId={operationalSeatId}
            eventId={event.id}
            onActionComplete={handleOperationalRefresh}
          />
        )}
        
        <div className="container mx-auto px-6 py-8 max-w-6xl">
          {/* Header with back button */}
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
            <Link href="/acquista">
              <Button variant="ghost" data-testid="button-back">
                <ChevronLeft className="w-5 h-5 mr-2" />
                Torna agli eventi
              </Button>
            </Link>
            {isOperationalMode && (
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                <Shield className="w-3 h-3 mr-1" />
                Operational Mode Active - Click seats to view details
              </Badge>
            )}
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
                {/* Hero image/video */}
                <Card className="overflow-hidden">
                  <div className="relative aspect-video">
                    {pageConfig?.config?.heroVideoUrl ? (
                      <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                        data-testid="video-hero-background-desktop"
                      >
                        <source src={pageConfig.config.heroVideoUrl} type="video/mp4" />
                      </video>
                    ) : event.eventImageUrl ? (
                      <img
                        src={pageConfig?.config?.heroImageUrl || event.eventImageUrl}
                        alt={event.eventName}
                        className="absolute inset-0 w-full h-full object-cover"
                        data-testid="img-event-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-purple-900/50 to-pink-900/40 flex items-center justify-center">
                        <Music className="w-24 h-24 text-white/20" />
                      </div>
                    )}
                    <div 
                      className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent"
                      style={{ opacity: pageConfig?.config?.heroOverlayOpacity ?? 1 }}
                    />
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
                        {pageConfig?.config?.showLiveViewers && (
                          <Badge className="bg-amber-500/90 text-white border-0 flex items-center gap-1" data-testid="badge-live-viewers-desktop">
                            <span className="animate-pulse w-2 h-2 bg-white rounded-full" />
                            {liveViewersCount} stanno guardando
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
                      {(() => {
                        const availableSectors = event.sectors.filter(s => s.availableSeats > 0);
                        if (availableSectors.length === 0) return null;
                        const minPrice = Math.min(...availableSectors.map(s => Number(s.priceIntero)));
                        return (
                          <div 
                            className="flex items-center gap-2 text-primary font-semibold"
                            data-testid="pill-min-price-desktop"
                          >
                            <Ticket className="w-5 h-5" />
                            <span>Da €{minPrice.toFixed(0)}</span>
                          </div>
                        );
                      })()}
                      {(() => {
                        const remaining = event.totalCapacity - event.ticketsSold;
                        if (remaining < 20 && remaining > 0) {
                          return (
                            <Badge 
                              className="bg-orange-500/90 text-white border-0"
                              data-testid="badge-global-scarcity-desktop"
                            >
                              <Flame className="w-3 h-3 mr-1" />
                              Solo {remaining} biglietti rimasti!
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    {event.eventDescription && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="text-muted-foreground whitespace-pre-line" data-testid="text-event-description">
                          {event.eventDescription}
                        </p>
                      </div>
                    )}

                    {pageConfig?.config?.earlyBirdEndDate && (
                      <div className="mt-4">
                        <EarlyBirdCountdown 
                          endDate={pageConfig.config.earlyBirdEndDate} 
                          label={pageConfig.config.earlyBirdLabel}
                        />
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
                        seatStatuses={seatStatusMap}
                        mySessionId={mySessionId}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Tickets Section */}
                <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Ticket className="w-5 h-5 text-primary" />
                          Acquista Biglietti
                        </CardTitle>
                        <Link href="/rivendite">
                          <Button variant="outline" size="sm" className="flex items-center gap-2" data-testid="link-resales">
                            <RefreshCw className="w-4 h-4" />
                            Vedi Rivendite
                          </Button>
                        </Link>
                      </div>
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
                        const thisSectorTicketType = getTicketType(sector.id);
                        const thisSectorQuantity = getQuantity(sector.id);
                        const sectorPrice = thisSectorTicketType === "ridotto" && sector.priceRidotto
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
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm text-muted-foreground" data-testid={`text-available-seats-desktop-${sector.id}`}>
                                      {sector.availableSeats} posti disponibili
                                    </p>
                                    {sector.availableSeats < 10 && sector.availableSeats > 0 && (
                                      <Badge 
                                        className="bg-red-500/90 text-white border-0 text-xs px-2 py-0.5"
                                        data-testid={`badge-scarcity-critical-desktop-${sector.id}`}
                                      >
                                        <Flame className="w-3 h-3 mr-1" />
                                        Ultimi {sector.availableSeats}!
                                      </Badge>
                                    )}
                                    {sector.availableSeats >= 10 && sector.availableSeats < 30 && (
                                      <Badge 
                                        className="bg-orange-500/90 text-white border-0 text-xs px-2 py-0.5"
                                        data-testid={`badge-scarcity-warning-desktop-${sector.id}`}
                                      >
                                        <Flame className="w-3 h-3 mr-1" />
                                        Quasi esauriti
                                      </Badge>
                                    )}
                                  </div>
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
                                    <RadioGroup value={thisSectorTicketType} onValueChange={(t) => setTicketType(sector.id, t)} className="flex gap-3">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setTicketType(sector.id, "intero"); }}
                                        className={`flex-1 p-3 rounded-xl border transition-all ${
                                          thisSectorTicketType === "intero" ? "border-primary bg-primary/10" : "border-border"
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
                                        onClick={(e) => { e.stopPropagation(); setTicketType(sector.id, "ridotto"); }}
                                        className={`flex-1 p-3 rounded-xl border transition-all ${
                                          thisSectorTicketType === "ridotto" ? "border-primary bg-primary/10" : "border-border"
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
                                        onClick={(e) => { e.stopPropagation(); setQuantity(sector.id, Math.max(0, thisSectorQuantity - 1)); }}
                                        data-testid={`button-minus-${sector.id}`}
                                      >
                                        <Minus className="w-4 h-4" />
                                      </Button>
                                      <span className="text-2xl font-bold w-12 text-center" data-testid={`text-quantity-${sector.id}`}>
                                        {thisSectorQuantity}
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); setQuantity(sector.id, Math.min(10, thisSectorQuantity + 1)); }}
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

                {/* Subscriptions section - Desktop */}
                {subscriptionTypes && subscriptionTypes.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-purple-400" />
                        Abbonamenti
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4" data-testid="grid-subscriptions-desktop">
                      {subscriptionTypes.map((subscription) => (
                        <SubscriptionTypeCard
                          key={subscription.id}
                          subscription={subscription}
                          onAddToCart={handleAddSubscriptionToCart}
                          isAdding={addingSubscriptionId === subscription.id}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}

                {event && (
                  <PublicReservationSection eventId={event.id} />
                )}

                {/* Blocchi Modulari Event Page 3.0 */}
                <ModularBlocksRenderer pageConfig={pageConfig} />
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
                                {selectedSector.isNumbered ? 1 : selectedQuantity} x €{price?.toFixed(2)}
                              </span>
                            </div>
                            {selectedSeat && (
                              <div className="text-sm text-muted-foreground">
                                Fila {selectedSeat.row}, Posto {selectedSeat.seatNumber}
                              </div>
                            )}
                            {selectedSeat && (() => {
                              const holdInfo = seatStatusMap.get(selectedSeat.id);
                              if (holdInfo && holdInfo.status === 'held' && holdInfo.sessionId === mySessionId && holdInfo.expiresAt) {
                                return (
                                  <HoldCountdownTimer
                                    expiresAt={holdInfo.expiresAt}
                                    compact
                                    className="mt-2"
                                  />
                                );
                              }
                              return null;
                            })()}
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
      {/* Operational Mode Toolbar - Mobile */}
      {isOperationalMode && event && (
        <OperationalStatsBar
          eventId={event.id}
          stats={operationalStats}
          isRefreshing={isLoadingStats}
          onRefresh={handleOperationalRefresh}
        />
      )}
      
      {/* Operational Mode Seat Info Panel - Mobile */}
      {isOperationalMode && event && (
        <SeatInfoPanel
          isOpen={isSeatPanelOpen}
          onClose={() => {
            setIsSeatPanelOpen(false);
            setOperationalSeatId(null);
          }}
          seatId={operationalSeatId}
          eventId={event.id}
          onActionComplete={handleOperationalRefresh}
        />
      )}
      
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
              {pageConfig?.config?.heroVideoUrl ? (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  data-testid="video-hero-background"
                >
                  <source src={pageConfig.config.heroVideoUrl} type="video/mp4" />
                </video>
              ) : event.eventImageUrl ? (
                <img
                  src={pageConfig?.config?.heroImageUrl || event.eventImageUrl}
                  alt={event.eventName}
                  className="absolute inset-0 w-full h-full object-cover"
                  data-testid="img-event-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-purple-900/50 to-pink-900/40 flex items-center justify-center">
                  <Music className="w-24 h-24 text-white/20" />
                </div>
              )}
              
              <div 
                className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"
                style={{ opacity: pageConfig?.config?.heroOverlayOpacity ?? 1 }}
              />
              
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
                  {pageConfig?.config?.showLiveViewers && (
                    <Badge className="bg-amber-500/90 text-white border-0 px-3 py-1 flex items-center gap-1" data-testid="badge-live-viewers">
                      <span className="animate-pulse w-2 h-2 bg-white rounded-full" />
                      {liveViewersCount} stanno guardando
                    </Badge>
                  )}
                  {isOperationalMode && (
                    <Badge className="bg-orange-500/90 text-white border-0 px-3 py-1 flex items-center gap-1" data-testid="badge-operational-mode">
                      <Shield className="w-3 h-3" />
                      Staff Mode
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
                  {(() => {
                    const availableSectors = event.sectors.filter(s => s.availableSeats > 0);
                    if (availableSectors.length === 0) return null;
                    const minPrice = Math.min(...availableSectors.map(s => Number(s.priceIntero)));
                    return (
                      <div 
                        className="flex items-center gap-2 bg-black/40 backdrop-blur-xl rounded-xl px-3 py-2"
                        data-testid="pill-min-price-mobile"
                      >
                        <Ticket className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-white">
                          Da €{minPrice.toFixed(0)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>

            <div className="px-4 py-6 space-y-5 -mt-4 relative z-10">
              {pageConfig?.config?.earlyBirdEndDate && (
                <motion.div
                  {...fadeInUp}
                  transition={{ ...springTransition, delay: 0.15 }}
                >
                  <EarlyBirdCountdown 
                    endDate={pageConfig.config.earlyBirdEndDate} 
                    label={pageConfig.config.earlyBirdLabel}
                  />
                </motion.div>
              )}

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
                  seatStatuses={seatStatusMap}
                  mySessionId={mySessionId}
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
                        quantity={getQuantity(sector.id)}
                        setQuantity={(q) => setQuantity(sector.id, q)}
                        ticketType={getTicketType(sector.id)}
                        setTicketType={(t) => setTicketType(sector.id, t)}
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

              {subscriptionTypes && subscriptionTypes.length > 0 && (
                <motion.div
                  {...fadeInUp}
                  transition={{ ...springTransition, delay: 0.4 }}
                >
                  <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-purple-400" />
                    Abbonamenti
                  </h2>
                  
                  <div className="space-y-4" data-testid="grid-subscriptions">
                    {subscriptionTypes.map((subscription, index) => (
                      <motion.div
                        key={subscription.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...springTransition, delay: 0.45 + index * 0.05 }}
                      >
                        <SubscriptionTypeCard
                          subscription={subscription}
                          onAddToCart={handleAddSubscriptionToCart}
                          isAdding={addingSubscriptionId === subscription.id}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {event && (
                <PublicReservationSection eventId={event.id} />
              )}

              {/* Blocchi Modulari Event Page 3.0 */}
              <ModularBlocksRenderer pageConfig={pageConfig} />
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
          data-testid="sticky-cta-mobile"
        >
          {/* Hold countdown timer bar - shown when there are selected seats with holds */}
          {selectedSeatIds.length > 0 && earliestHoldExpiry && (
            <div className="px-4 pt-3 pb-1">
              <HoldCountdownTimer
                expiresAt={earliestHoldExpiry}
                onExpire={() => {
                  selectedSeatIds.forEach(seatId => handleHoldExpire(seatId));
                }}
                onExtend={() => extendHoldsMutation.mutate()}
                onRelease={() => {
                  selectedSeatIds.forEach(seatId => handleReleaseHold(seatId));
                }}
                canExtend={!extendHoldsMutation.isPending}
                data-testid="hold-countdown-timer"
              />
            </div>
          )}
          
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex-1 min-w-0">
              {selectedSector ? (
                <>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider truncate" data-testid="text-selected-sector-name">
                    {selectedSector.name}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent" data-testid="text-cta-total">
                      €{totalPrice.toFixed(2)}
                    </p>
                    {selectedSeat && holdInfo[selectedSeat.id] && (
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                        <Timer className="w-3 h-3 mr-1" />
                        In opzione
                      </Badge>
                    )}
                    {(() => {
                      const remaining = event.totalCapacity - event.ticketsSold;
                      if (remaining < 20 && !selectedSeat) {
                        return (
                          <span 
                            className="text-xs font-semibold text-orange-400 flex items-center gap-1"
                            data-testid="badge-global-scarcity"
                          >
                            <Flame className="w-3 h-3" />
                            Solo {remaining} rimasti!
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="text-no-selection">
                  Seleziona un biglietto
                </p>
              )}
            </div>
            <Button
              onClick={handlePurchase}
              disabled={!canPurchase || isAdding || createHoldMutation.isPending}
              className="h-14 px-8 rounded-xl text-lg font-bold shadow-lg shadow-primary/25 shrink-0"
              data-testid="button-purchase"
            >
              {isAdding || createHoldMutation.isPending ? (
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
