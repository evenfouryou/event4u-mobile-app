import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  Calendar, 
  Ticket, 
  Search,
  ArrowRight,
  Building2,
  User
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

interface VenueEvent {
  id: string;
  eventId: string;
  eventName: string;
  eventStart: string;
  ticketingStatus: string;
  totalCapacity: number;
  ticketsSold: number;
  minPrice: number | null;
  availability: number;
}

interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  capacity: number | null;
  heroImageUrl: string | null;
  shortDescription: string | null;
  openingHours: string | null;
  upcomingEvents: VenueEvent[];
  eventCount: number;
}

const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springTransition,
  },
};

export default function PublicVenues() {
  const [searchCity, setSearchCity] = useState("");
  const { isAuthenticated } = useCustomerAuth();

  const { data: venues, isLoading, error } = useQuery<Venue[]>({
    queryKey: ["/api/public/venues", searchCity],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchCity) params.append("city", searchCity);
      const res = await fetch(`/api/public/venues?${params}`);
      if (!res.ok) throw new Error("Errore nel caricamento locali");
      return res.json();
    },
  });

  return (
    <div 
      className="min-h-screen bg-background flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-4"
        style={{ top: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link href="/">
            <motion.div 
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 cursor-pointer min-h-[44px]"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">
                Event<span className="text-primary">4</span>U
              </span>
            </motion.div>
          </Link>
          
          <div className="flex items-center gap-2">
            <Link href="/acquista">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-11 w-11 rounded-full" 
                data-testid="button-events"
              >
                <Ticket className="w-5 h-5" />
              </Button>
            </Link>
            {isAuthenticated ? (
              <Link href="/account">
                <Avatar className="h-11 w-11 cursor-pointer ring-2 ring-primary/20" data-testid="avatar-user">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Link href="/accedi">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-11 w-11 rounded-full" 
                  data-testid="button-login"
                >
                  <User className="w-5 h-5" />
                </Button>
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Cerca per città..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className="pl-12 h-14 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-2xl text-lg"
            data-testid="input-search-city"
          />
        </motion.div>
      </motion.header>

      <main 
        className="flex-1 px-4 py-6 pb-24"
        style={{ 
          paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
          paddingRight: 'calc(1rem + env(safe-area-inset-right))',
          paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))'
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.15 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-page-title">
            Scopri i <span className="text-primary">Club</span>
          </h1>
          <p className="text-muted-foreground text-base">
            I migliori locali della tua città
          </p>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border-border overflow-hidden">
                <Skeleton className="h-56 w-full" />
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
          >
            <Card className="p-8 text-center bg-red-500/10 border-red-500/20">
              <p className="text-red-400">Errore nel caricamento dei locali</p>
            </Card>
          </motion.div>
        ) : venues?.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
          >
            <Card className="p-10 text-center bg-muted/50 border-border">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Nessun locale trovato</h3>
              <p className="text-muted-foreground">
                {searchCity 
                  ? `Non ci sono locali a "${searchCity}"`
                  : "Non ci sono locali disponibili"}
              </p>
            </Card>
          </motion.div>
        ) : (
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {venues?.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function VenueCard({ venue }: { venue: Venue }) {
  return (
    <motion.div
      variants={cardVariants}
      layout
      layoutId={venue.id}
      whileTap={{ scale: 0.98 }}
      data-testid={`card-venue-${venue.id}`}
    >
      <Card className="bg-card border-border overflow-hidden">
        <div className="relative h-56 overflow-hidden">
          {venue.heroImageUrl ? (
            <motion.img 
              src={venue.heroImageUrl} 
              alt={venue.name}
              className="w-full h-full object-cover"
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/20 flex items-center justify-center">
              <Building2 className="w-20 h-20 text-primary/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
          
          {venue.city && (
            <Badge 
              className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white border-0 h-8 px-3"
              data-testid={`badge-city-${venue.id}`}
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              {venue.city}
            </Badge>
          )}
          
          {venue.eventCount > 0 && (
            <Badge 
              className="absolute top-4 right-4 bg-primary text-primary-foreground border-0 h-8 px-3"
              data-testid={`badge-events-${venue.id}`}
            >
              {venue.eventCount} {venue.eventCount === 1 ? "evento" : "eventi"}
            </Badge>
          )}
          
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg" data-testid={`text-venue-name-${venue.id}`}>
              {venue.name}
            </h3>
            {venue.address && (
              <p className="text-white/80 text-sm flex items-center gap-1.5 drop-shadow-md">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{venue.address}</span>
              </p>
            )}
          </div>
        </div>

        <CardContent className="p-5">
          {venue.shortDescription && (
            <p className="text-muted-foreground text-base mb-4 line-clamp-2">
              {venue.shortDescription}
            </p>
          )}

          {venue.upcomingEvents.length > 0 && (
            <div className="border-t border-border pt-4 mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 font-medium">Prossimi Eventi</p>
              <div className="space-y-2">
                {venue.upcomingEvents.slice(0, 2).map((event) => (
                  <Link key={event.id} href={`/acquista/${event.id}`}>
                    <motion.div 
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/50 cursor-pointer min-h-[56px]"
                      data-testid={`link-event-${event.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium text-base truncate">{event.eventName}</p>
                        <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(event.eventStart), "d MMM yyyy", { locale: it })}
                        </p>
                      </div>
                      {event.minPrice !== null && (
                        <div className="text-right ml-3">
                          <p className="text-primary font-semibold text-base">
                            da €{event.minPrice.toFixed(0)}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Link href={`/locali/${venue.id}`}>
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button 
                className="w-full h-14 text-base font-semibold rounded-xl"
                data-testid={`button-view-venue-${venue.id}`}
              >
                Scopri di più
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
