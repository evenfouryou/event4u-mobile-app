import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  MapPin, 
  Clock, 
  Calendar, 
  Ticket, 
  ArrowLeft,
  Building2,
  ChevronRight,
  Phone,
  Globe,
  Navigation,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { triggerHaptic } from "@/components/mobile-primitives";

interface Sector {
  id: string;
  name: string;
  price: string;
  priceIntero?: string;
  capacity: number;
  soldCount: number;
}

interface VenueEvent {
  id: string;
  eventId: string;
  eventName: string;
  eventStart: string;
  eventEnd: string;
  ticketingStatus: string;
  totalCapacity: number;
  ticketsSold: number;
  requiresNominative: boolean;
  minPrice: number | null;
  availability: number;
  sectors: Sector[];
}

interface VenueDetail {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  capacity: number | null;
  heroImageUrl: string | null;
  shortDescription: string | null;
  openingHours: string | null;
  upcomingEvents: VenueEvent[];
}

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: springTransition
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: springTransition
  }
};

export default function PublicVenueDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  const { data: venue, isLoading, error } = useQuery<VenueDetail>({
    queryKey: ["/api/public/venues", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/public/venues/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Locale non trovato");
        throw new Error("Errore nel caricamento locale");
      }
      return res.json();
    },
  });

  const handleBack = () => {
    triggerHaptic('light');
    setLocation('/locali');
  };

  const handleOpenMaps = () => {
    if (venue?.address && venue?.city) {
      triggerHaptic('medium');
      const query = encodeURIComponent(`${venue.address}, ${venue.city}`);
      window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col">
        <div className="relative h-[45vh] w-full">
          <Skeleton className="w-full h-full" />
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-4 left-4 z-20 w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center"
            style={{ marginTop: 'env(safe-area-inset-top)' }}
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </motion.button>
        </div>
        <div className="flex-1 px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-6 w-1/3 mt-6" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col">
        <div 
          className="shrink-0 px-4 py-3 flex items-center"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="h-11 w-11 rounded-full"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Locale non trovato</h2>
            <p className="text-muted-foreground mb-8">Il locale richiesto non è disponibile.</p>
            <Button 
              onClick={handleBack}
              className="min-h-[48px] px-8 rounded-full"
              data-testid="button-back-venues"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna ai locali
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Desktop version
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background" data-testid="page-venue-detail-desktop">
        <div className="container mx-auto px-6 py-8 max-w-6xl">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="gap-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Torna ai locali
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="overflow-hidden">
                <div className="relative h-[300px] w-full">
                  {venue.heroImageUrl ? (
                    <img 
                      src={venue.heroImageUrl} 
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 flex items-center justify-center">
                      <Building2 className="w-20 h-20 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    {venue.city && (
                      <Badge className="bg-primary/90 text-primary-foreground border-0 mb-3">
                        <MapPin className="w-3 h-3 mr-1" />
                        {venue.city}
                      </Badge>
                    )}
                    <h1 className="text-3xl font-bold text-foreground" data-testid="text-venue-name">
                      {venue.name}
                    </h1>
                  </div>
                </div>
                
                {venue.shortDescription && (
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground leading-relaxed" data-testid="text-description">
                      {venue.shortDescription}
                    </p>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Prossimi Eventi
                    </CardTitle>
                    <Badge variant="secondary">
                      {venue.upcomingEvents.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {venue.upcomingEvents.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Nessun evento</h3>
                      <p className="text-muted-foreground text-sm">
                        Non ci sono eventi in programma.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {venue.upcomingEvents.map((event) => (
                        <DesktopEventCard key={event.id} event={event} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {venue.address && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-primary" />
                      Indirizzo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-foreground font-medium" data-testid="text-venue-address">{venue.address}</p>
                    {venue.city && (
                      <p className="text-muted-foreground text-sm">{venue.city}</p>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={handleOpenMaps}
                      data-testid="button-open-maps"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Apri in Google Maps
                    </Button>
                  </CardContent>
                </Card>
              )}

              {venue.openingHours && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Orari
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-foreground font-medium" data-testid="text-hours">{venue.openingHours}</p>
                  </CardContent>
                </Card>
              )}

              {venue.capacity && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-primary" />
                      Capacità
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-foreground font-medium">{venue.capacity} posti</p>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <Link href="/acquista">
                    <Button 
                      className="w-full"
                      data-testid="button-all-events"
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      Scopri tutti gli eventi
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile version
  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-[45vh] w-full shrink-0"
      >
        {venue.heroImageUrl ? (
          <motion.img 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            src={venue.heroImageUrl} 
            alt={venue.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 flex items-center justify-center">
            <Building2 className="w-24 h-24 text-primary/40" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springTransition, delay: 0.2 }}
          onClick={handleBack}
          className="absolute top-4 left-4 z-20 w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
          data-testid="button-back"
          aria-label="Torna indietro"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </motion.button>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.3 }}
          className="absolute bottom-0 left-0 right-0 px-4 pb-4"
        >
          {venue.city && (
            <Badge className="bg-primary/90 text-primary-foreground border-0 mb-3">
              <MapPin className="w-3 h-3 mr-1" />
              {venue.city}
            </Badge>
          )}
          
          <h1 className="text-3xl font-bold text-foreground leading-tight" data-testid="text-venue-name">
            {venue.name}
          </h1>
        </motion.div>
      </motion.div>

      <div 
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="px-4 py-5 space-y-6"
        >
          {venue.address && (
            <motion.button
              variants={fadeInUp}
              onClick={handleOpenMaps}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border active:scale-[0.98] transition-transform"
              data-testid="button-open-maps"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Navigation className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Indirizzo</p>
                <p className="text-foreground font-medium" data-testid="text-venue-address">{venue.address}</p>
                {venue.city && (
                  <p className="text-muted-foreground text-sm">{venue.city}</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}

          {venue.shortDescription && (
            <motion.div variants={fadeInUp}>
              <p className="text-muted-foreground leading-relaxed" data-testid="text-description">
                {venue.shortDescription}
              </p>
            </motion.div>
          )}

          {venue.openingHours && (
            <motion.div 
              variants={fadeInUp}
              className="flex items-start gap-4 p-4 rounded-2xl bg-card/50 border border-border"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Orari</p>
                <p className="text-foreground font-medium" data-testid="text-hours">{venue.openingHours}</p>
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeInUp}>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Prossimi Eventi</h2>
              <Badge variant="secondary" className="ml-auto">
                {venue.upcomingEvents.length}
              </Badge>
            </div>
            
            <AnimatePresence mode="wait">
              {venue.upcomingEvents.length === 0 ? (
                <motion.div
                  key="empty"
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="py-12 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Nessun evento</h3>
                  <p className="text-muted-foreground text-sm">
                    Non ci sono eventi in programma.
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  key="list"
                  className="space-y-3"
                >
                  {venue.upcomingEvents.map((event, index) => (
                    <EventCard key={event.id} event={event} index={index} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Link href="/acquista">
              <Button 
                className="w-full min-h-[52px] rounded-2xl text-base font-semibold"
                data-testid="button-all-events"
              >
                <Ticket className="w-5 h-5 mr-2" />
                Scopri tutti gli eventi
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function EventCard({ event, index }: { event: VenueEvent; index: number }) {
  const eventDate = new Date(event.eventStart);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay: index * 0.05 }}
    >
      <Link href={`/acquista/${event.id}`}>
        <motion.div 
          whileTap={{ scale: 0.98 }}
          className="bg-card border border-border rounded-2xl overflow-hidden active:bg-card/80 transition-colors"
          data-testid={`card-event-${event.id}`}
        >
          <div className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex flex-col items-center justify-center shrink-0">
                <span className="text-xl font-bold text-primary leading-none">
                  {format(eventDate, "d")}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  {format(eventDate, "MMM", { locale: it })}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground truncate mb-1" data-testid={`text-event-name-${event.id}`}>
                  {event.eventName}
                </h3>
                <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {format(eventDate, "EEEE • HH:mm", { locale: it })}
                </p>
                
                {event.requiresNominative && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-0 mt-2 text-xs">
                    Nominativo
                  </Badge>
                )}
              </div>
              
              <div className="text-right shrink-0">
                {event.minPrice !== null && (
                  <>
                    <p className="text-[10px] text-muted-foreground uppercase">Da</p>
                    <p className="text-xl font-bold text-primary">
                      €{event.minPrice.toFixed(0)}
                    </p>
                  </>
                )}
              </div>
            </div>
            
            {event.sectors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex flex-wrap gap-1.5">
                  {event.sectors.slice(0, 3).map((sector) => (
                    <Badge 
                      key={sector.id}
                      variant="outline" 
                      className="border-border text-muted-foreground text-[10px] px-2 py-0.5"
                    >
                      {sector.name}
                    </Badge>
                  ))}
                  {event.sectors.length > 3 && (
                    <Badge 
                      variant="outline" 
                      className="border-border text-muted-foreground text-[10px] px-2 py-0.5"
                    >
                      +{event.sectors.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="px-4 py-3 bg-primary/5 border-t border-border flex items-center justify-between">
            <span className="text-sm font-medium text-primary">Acquista biglietti</span>
            <ChevronRight className="w-4 h-4 text-primary" />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

function DesktopEventCard({ event }: { event: VenueEvent }) {
  const eventDate = new Date(event.eventStart);

  return (
    <Link href={`/acquista/${event.id}`}>
      <div 
        className="bg-card border border-border rounded-md overflow-hidden hover-elevate transition-colors cursor-pointer"
        data-testid={`card-event-${event.id}`}
      >
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-md bg-gradient-to-br from-primary/20 to-primary/10 flex flex-col items-center justify-center shrink-0">
              <span className="text-xl font-bold text-primary leading-none">
                {format(eventDate, "d")}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                {format(eventDate, "MMM", { locale: it })}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground truncate mb-1" data-testid={`text-event-name-${event.id}`}>
                {event.eventName}
              </h3>
              <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {format(eventDate, "EEEE d MMMM • HH:mm", { locale: it })}
              </p>
              
              {event.sectors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {event.sectors.slice(0, 4).map((sector) => (
                    <Badge 
                      key={sector.id}
                      variant="outline" 
                      className="border-border text-muted-foreground text-xs"
                    >
                      {sector.name}
                    </Badge>
                  ))}
                  {event.sectors.length > 4 && (
                    <Badge 
                      variant="outline" 
                      className="border-border text-muted-foreground text-xs"
                    >
                      +{event.sectors.length - 4}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="text-right shrink-0 flex flex-col items-end gap-2">
              {event.minPrice !== null && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Da</p>
                  <p className="text-xl font-bold text-primary">
                    €{event.minPrice.toFixed(0)}
                  </p>
                </div>
              )}
              {event.requiresNominative && (
                <Badge className="bg-purple-500/20 text-purple-400 border-0 text-xs">
                  Nominativo
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="px-4 py-3 bg-primary/5 border-t border-border flex items-center justify-between">
          <span className="text-sm font-medium text-primary">Acquista biglietti</span>
          <ChevronRight className="w-4 h-4 text-primary" />
        </div>
      </div>
    </Link>
  );
}
