import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MapPin, Clock, Search, Ticket, Star, Sparkles, User, ShoppingBag, Music, Utensils, Wine, Mic, Palette, Theater, Film, Gamepad2, Heart, PartyPopper, Globe, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState, useRef, useCallback } from "react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { BrandLogo } from "@/components/brand-logo";

interface PublicEvent {
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
  eventName: string;
  eventStart: Date;
  eventEnd: Date;
  eventImageUrl: string | null;
  locationId: number;
  locationName: string;
  locationAddress: string;
  locationLatitude: string | null;
  locationLongitude: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  minPrice: number;
  totalAvailable: number;
  sectorsCount: number;
  distance: number | null;
}

interface EventCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string;
  displayOrder: number;
}

const iconMap: Record<string, LucideIcon> = {
  Music, Utensils, Wine, Mic, Palette, Theater, Film, Gamepad2, Heart, PartyPopper, Globe, Calendar, Star, Ticket, Sparkles,
};

function DynamicIcon({ name, className }: { name: string | null; className?: string }) {
  const IconComponent = name && iconMap[name] ? iconMap[name] : Sparkles;
  return <IconComponent className={className} />;
}

type FilterType = 'all' | 'today' | 'weekend' | 'month';

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
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springTransition,
  },
};

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

function EventCard({ event, userLocation }: { event: PublicEvent; userLocation: { lat: number; lng: number } | null }) {
  const eventDate = new Date(event.eventStart);
  const isToday = new Date().toDateString() === eventDate.toDateString();
  const isSoldOut = event.totalAvailable <= 0;

  return (
    <motion.div
      variants={cardVariants}
      whileTap={{ scale: 0.98 }}
      transition={springTransition}
    >
      <Link href={`/acquista/${event.id}`}>
        <Card
          className="relative overflow-hidden rounded-2xl border-0 cursor-pointer bg-card"
          data-testid={`card-event-${event.id}`}
        >
          <div className="relative aspect-video bg-gradient-to-br from-indigo-900/50 via-purple-900/40 to-pink-900/30">
            {event.eventImageUrl ? (
              <img
                src={event.eventImageUrl}
                alt={event.eventName}
                className="absolute inset-0 w-full h-full object-cover"
                data-testid={`img-event-${event.id}`}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <Sparkles className="w-20 h-20 text-primary" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
              <div className="flex gap-2 flex-wrap">
                {isToday && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={springTransition}
                    className="bg-emerald-500/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
                    data-testid={`badge-today-${event.id}`}
                  >
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Stasera
                  </motion.div>
                )}
                {event.categoryName && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={springTransition}
                    className="text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"
                    style={{ 
                      backgroundColor: `${event.categoryColor || '#00CED1'}CC`,
                      boxShadow: `0 10px 15px -3px ${event.categoryColor || '#00CED1'}40`
                    }}
                    data-testid={`badge-category-${event.id}`}
                  >
                    <DynamicIcon name={event.categoryIcon} className="w-3 h-3" />
                    {event.categoryName}
                  </motion.div>
                )}
              </div>
              {isSoldOut && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={springTransition}
                  className="bg-red-500/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full ml-auto"
                  data-testid={`badge-soldout-${event.id}`}
                >
                  Sold Out
                </motion.div>
              )}
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            <h3
              className="text-xl font-bold text-foreground line-clamp-2"
              data-testid={`text-eventname-${event.id}`}
            >
              {event.eventName}
            </h3>
            
            <div className="flex flex-col gap-2 text-muted-foreground">
              <div className="flex items-center gap-2.5 min-h-[44px]">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground" data-testid={`text-date-${event.id}`}>
                    {format(eventDate, "EEEE d MMMM", { locale: it })}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-time-${event.id}`}>
                    Ore {format(eventDate, "HH:mm")}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5 min-h-[44px]">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground line-clamp-1" data-testid={`text-location-${event.id}`}>
                    {event.locationName}
                  </p>
                  {event.distance != null && !isNaN(event.distance) && (
                    <p className="text-xs text-teal-400 font-medium" data-testid={`text-distance-${event.id}`}>
                      {formatDistance(event.distance)}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t border-border gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">A partire da</span>
                <span className="text-2xl font-bold text-primary" data-testid={`text-price-${event.id}`}>
                  €{event.minPrice.toFixed(2)}
                </span>
              </div>
              <Button
                className="min-h-[48px] px-6 rounded-xl font-semibold"
                disabled={isSoldOut}
                data-testid={`button-buy-${event.id}`}
              >
                <Ticket className="w-5 h-5 mr-2" />
                {isSoldOut ? "Esaurito" : "Acquista"}
              </Button>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border-0">
      <Skeleton className="aspect-video" />
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex justify-between pt-3 border-t border-border">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-12 w-28 rounded-xl" />
        </div>
      </div>
    </Card>
  );
}

interface FilterPillProps {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
  testId: string;
}

function FilterPill({ label, icon, active, onClick, testId }: FilterPillProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={springTransition}
      onClick={onClick}
      className={`
        flex items-center gap-2 px-5 py-3 rounded-full font-medium text-sm whitespace-nowrap shrink-0
        min-h-[48px] min-w-[48px] transition-colors
        ${active 
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
          : 'bg-card text-muted-foreground border border-border'
        }
      `}
      data-testid={testId}
    >
      {icon}
      {label}
    </motion.button>
  );
}

export default function PublicEventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const { isAuthenticated } = useCustomerAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const { data: categories, isLoading: categoriesLoading } = useQuery<EventCategory[]>({
    queryKey: ["/api/public/event-categories"],
  });

  const eventsQueryKey = [
    "/api/public/events",
    activeCategory,
    userLocation?.lat,
    userLocation?.lng,
  ];

  const { data: events, isLoading, error } = useQuery<PublicEvent[]>({
    queryKey: eventsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCategory) {
        params.set("categoryId", activeCategory);
      }
      if (userLocation) {
        params.set("userLat", userLocation.lat.toString());
        params.set("userLng", userLocation.lng.toString());
      }
      const url = `/api/public/events${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  const requestGeolocation = useCallback(() => {
    if (locationLoading) return;
    
    if (locationEnabled && userLocation) {
      setLocationEnabled(false);
      setUserLocation(null);
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationEnabled(true);
        setLocationLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [locationLoading, locationEnabled, userLocation]);

  const filterEvents = (events: PublicEvent[], filter: FilterType) => {
    const now = new Date();
    const today = now.toDateString();
    
    switch (filter) {
      case 'today':
        return events.filter(e => new Date(e.eventStart).toDateString() === today);
      case 'weekend': {
        const dayOfWeek = now.getDay();
        const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
        const saturday = new Date(now);
        saturday.setDate(now.getDate() + daysUntilSaturday);
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);
        
        return events.filter(e => {
          const eventDate = new Date(e.eventStart);
          return eventDate.toDateString() === saturday.toDateString() ||
                 eventDate.toDateString() === sunday.toDateString();
        });
      }
      case 'month': {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        return events.filter(e => {
          const eventDate = new Date(e.eventStart);
          return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
        });
      }
      default:
        return events;
    }
  };

  const filteredEvents = events
    ?.filter((event) =>
      event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.locationName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((event) => filterEvents([event], activeFilter).length > 0);

  // Desktop version
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background" data-testid="page-public-events-desktop">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-6">
              <Link href="/">
                <BrandLogo variant="horizontal" className="h-10 w-auto" />
              </Link>

              <nav className="flex items-center gap-6">
                <Link href="/acquista" className="text-foreground font-medium">
                  Eventi
                </Link>
                <Link href="/rivendite" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                  Rivendite
                </Link>
                <Link href="/locali" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                  Locali
                </Link>
              </nav>

              <div className="flex-1 max-w-xl">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Cerca eventi, luoghi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 text-base rounded-xl"
                    data-testid="input-search-desktop"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/carrello">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-10 h-10 rounded-xl border-border"
                    data-testid="button-cart-desktop"
                  >
                    <ShoppingBag className="w-5 h-5" />
                  </Button>
                </Link>
                {isAuthenticated ? (
                  <Link href="/account">
                    <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-primary/20" data-testid="avatar-user-desktop">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ) : (
                  <Link href="/login">
                    <Button className="h-10 px-5 rounded-xl font-semibold" data-testid="button-login-desktop">
                      Accedi
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Eventi in Programma</h1>
            <p className="text-muted-foreground">Scopri gli eventi e acquista i tuoi biglietti</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex flex-wrap gap-3">
              <FilterPill
                label="Tutti"
                active={activeFilter === 'all'}
                onClick={() => setActiveFilter('all')}
                testId="filter-all-desktop"
              />
              <FilterPill
                label="Stasera"
                icon={<Star className="w-4 h-4" />}
                active={activeFilter === 'today'}
                onClick={() => setActiveFilter('today')}
                testId="filter-tonight-desktop"
              />
              <FilterPill
                label="Weekend"
                active={activeFilter === 'weekend'}
                onClick={() => setActiveFilter('weekend')}
                testId="filter-weekend-desktop"
              />
              <FilterPill
                label="Questo Mese"
                icon={<Calendar className="w-4 h-4" />}
                active={activeFilter === 'month'}
                onClick={() => setActiveFilter('month')}
                testId="filter-month-desktop"
              />
              <div className="w-px h-8 bg-border self-center mx-1" />
              <FilterPill
                label={locationLoading ? "Caricamento..." : "Vicino a te"}
                icon={<MapPin className={`w-4 h-4 ${locationLoading ? 'animate-pulse' : ''}`} />}
                active={locationEnabled}
                onClick={requestGeolocation}
                testId="filter-nearby-desktop"
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <FilterPill
                label="Tutti"
                icon={<Globe className="w-4 h-4" />}
                active={activeCategory === null}
                onClick={() => setActiveCategory(null)}
                testId="filter-category-all-desktop"
              />
              {categoriesLoading ? (
                <div className="flex gap-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-24 rounded-full" />
                  ))}
                </div>
              ) : (
                categories?.map((category) => (
                  <FilterPill
                    key={category.id}
                    label={category.name}
                    icon={<DynamicIcon name={category.icon} className="w-4 h-4" />}
                    active={activeCategory === category.id}
                    onClick={() => setActiveCategory(category.id)}
                    testId={`filter-category-${category.slug}-desktop`}
                  />
                ))
              )}
            </div>
          </div>

          {error && (
            <Card className="p-6 text-center bg-red-500/10 border-red-500/20 rounded-2xl mb-6">
              <p className="text-red-400">Errore nel caricamento degli eventi. Riprova più tardi.</p>
            </Card>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredEvents && filteredEvents.length > 0 ? (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              data-testid="grid-events-desktop"
            >
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} userLocation={userLocation} />
              ))}
            </motion.div>
          ) : (
            <Card className="p-12 text-center bg-muted/50 border-border rounded-2xl">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Ticket className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Nessun evento</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? "Nessun evento corrisponde alla tua ricerca."
                  : activeFilter !== 'all'
                  ? "Nessun evento per questo periodo."
                  : "Al momento non ci sono eventi in vendita."}
              </p>
            </Card>
          )}
        </main>

        <footer className="border-t border-border py-8 px-6 bg-background mt-auto">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Event4U. Tutti i diritti riservati.
              </span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Termini</a>
              <a href="#" className="hover:text-foreground transition-colors">Contatti</a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Mobile version
  return (
    <div 
      className="min-h-screen bg-background flex flex-col"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={springTransition}
        className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/">
              <BrandLogo variant="horizontal" className="h-10 w-auto" />
            </Link>
            
            <div className="flex items-center gap-2">
              <Link href="/carrello">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-12 h-12 rounded-xl border-border" 
                  data-testid="button-cart"
                >
                  <ShoppingBag className="w-5 h-5" />
                </Button>
              </Link>
              {isAuthenticated ? (
                <Link href="/account">
                  <Avatar className="h-12 w-12 cursor-pointer ring-2 ring-primary/20" data-testid="avatar-user">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Link href="/login">
                  <Button className="h-12 px-5 rounded-xl font-semibold" data-testid="button-login">
                    Accedi
                  </Button>
                </Link>
              )}
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Cerca eventi, luoghi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 text-base rounded-xl"
              data-testid="input-search"
            />
          </div>
          
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/acquista" className="text-foreground font-medium border-b-2 border-primary pb-1">
              Eventi
            </Link>
            <Link href="/rivendite" className="text-muted-foreground">
              Rivendite
            </Link>
            <Link href="/locali" className="text-muted-foreground">
              Locali
            </Link>
          </nav>
        </div>
      </motion.header>

      <main className="flex-1 px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
          ref={scrollRef}
          className="flex gap-3 py-4 overflow-x-auto scrollbar-none -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <FilterPill
            label="Tutti"
            active={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
            testId="filter-all"
          />
          <FilterPill
            label="Stasera"
            icon={<Star className="w-4 h-4" />}
            active={activeFilter === 'today'}
            onClick={() => setActiveFilter('today')}
            testId="filter-tonight"
          />
          <FilterPill
            label="Weekend"
            active={activeFilter === 'weekend'}
            onClick={() => setActiveFilter('weekend')}
            testId="filter-weekend"
          />
          <FilterPill
            label="Questo Mese"
            icon={<Calendar className="w-4 h-4" />}
            active={activeFilter === 'month'}
            onClick={() => setActiveFilter('month')}
            testId="filter-month"
          />
          <FilterPill
            label={locationLoading ? "Caricamento..." : "Vicino a te"}
            icon={<MapPin className={`w-4 h-4 ${locationLoading ? 'animate-pulse' : ''}`} />}
            active={locationEnabled}
            onClick={requestGeolocation}
            testId="filter-nearby"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springTransition, delay: 0.15 }}
          className="flex gap-3 pb-4 overflow-x-auto scrollbar-none -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <FilterPill
            label="Tutti"
            icon={<Globe className="w-4 h-4" />}
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
            testId="filter-category-all"
          />
          {categoriesLoading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-20 rounded-full shrink-0" />
              ))}
            </>
          ) : (
            categories?.map((category) => (
              <FilterPill
                key={category.id}
                label={category.name}
                icon={<DynamicIcon name={category.icon} className="w-4 h-4" />}
                active={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
                testId={`filter-category-${category.slug}`}
              />
            ))
          )}
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
          >
            <Card className="p-6 text-center bg-red-500/10 border-red-500/20 rounded-2xl">
              <p className="text-red-400">Errore nel caricamento degli eventi. Riprova più tardi.</p>
            </Card>
          </motion.div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredEvents && filteredEvents.length > 0 ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-4"
            data-testid="grid-events"
          >
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} userLocation={userLocation} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springTransition}
          >
            <Card className="p-8 text-center bg-muted/50 border-border rounded-2xl">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Ticket className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Nessun evento</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? "Nessun evento corrisponde alla tua ricerca."
                  : activeFilter !== 'all'
                  ? "Nessun evento per questo periodo."
                  : "Al momento non ci sono eventi in vendita."}
              </p>
            </Card>
          </motion.div>
        )}
      </main>

      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="border-t border-border py-6 px-4 bg-background"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Event4U
            </span>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="min-h-[44px] flex items-center">Privacy</a>
            <a href="#" className="min-h-[44px] flex items-center">Termini</a>
            <a href="#" className="min-h-[44px] flex items-center">Contatti</a>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
