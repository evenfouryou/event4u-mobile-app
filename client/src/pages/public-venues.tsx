import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  Calendar, 
  Ticket, 
  Search,
  ArrowRight,
  Building2,
  User,
  Clock,
  Users,
  List,
  Map as MapIcon,
  Navigation,
  X
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState, useCallback } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { BrandLogo } from "@/components/brand-logo";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

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
  latitude: string | null;
  longitude: string | null;
  distance: number | null;
}

type ViewMode = 'list' | 'map';

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

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const ITALY_CENTER = { lat: 42.5, lng: 12.5 };

interface MapViewProps {
  venues: Venue[];
  userLocation: { lat: number; lng: number } | null;
  onVenueSelect: (venue: Venue) => void;
  selectedVenue: Venue | null;
  onCloseSelected: () => void;
}

function MapView({ venues, userLocation, onVenueSelect, selectedVenue, onCloseSelected }: MapViewProps) {
  const center = userLocation || ITALY_CENTER;
  const zoom = userLocation ? 12 : 8;

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <Card className="p-8 text-center bg-muted/50 border-border">
        <MapIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Mappa non configurata</h3>
        <p className="text-muted-foreground">
          La visualizzazione mappa non è disponibile. 
          Contatta l'amministratore per configurare Google Maps.
        </p>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          mapId="venues-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full"
        >
          {venues.map((venue) => {
            if (!venue.latitude || !venue.longitude) return null;
            const lat = parseFloat(venue.latitude);
            const lng = parseFloat(venue.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            
            return (
              <AdvancedMarker
                key={venue.id}
                position={{ lat, lng }}
                onClick={() => onVenueSelect(venue)}
                title={venue.name}
              >
                <Pin
                  background={selectedVenue?.id === venue.id ? "#00CED1" : "#FFD700"}
                  borderColor={selectedVenue?.id === venue.id ? "#00A5A8" : "#CC9C00"}
                  glyphColor="#000"
                />
              </AdvancedMarker>
            );
          })}
          
          {userLocation && (
            <AdvancedMarker
              position={userLocation}
              title="La tua posizione"
            >
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
      
      {selectedVenue && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Card className="bg-background/95 backdrop-blur-xl border-border shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  {selectedVenue.heroImageUrl ? (
                    <img 
                      src={selectedVenue.heroImageUrl} 
                      alt={selectedVenue.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-primary/50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-foreground truncate">
                      {selectedVenue.name}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 -mr-2 -mt-1"
                      onClick={onCloseSelected}
                      data-testid="button-close-map-card"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {selectedVenue.city && (
                    <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedVenue.city}
                    </p>
                  )}
                  {selectedVenue.distance !== null && selectedVenue.distance !== undefined && (
                    <p className="text-teal-400 text-sm font-medium mt-1">
                      {formatDistance(selectedVenue.distance)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary" className="text-xs">
                      {selectedVenue.eventCount} {selectedVenue.eventCount === 1 ? "evento" : "eventi"}
                    </Badge>
                    <Link href={`/locali/${selectedVenue.id}`} className="ml-auto">
                      <Button size="sm" className="min-h-[36px]" data-testid={`button-map-view-venue-${selectedVenue.id}`}>
                        Scopri di più
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}

function ViewToggle({ viewMode, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border">
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        className="min-h-[40px] px-4"
        onClick={() => onViewChange('list')}
        data-testid="button-view-list"
      >
        <List className="w-4 h-4 mr-2" />
        Lista
      </Button>
      <Button
        variant={viewMode === 'map' ? 'default' : 'ghost'}
        size="sm"
        className="min-h-[40px] px-4"
        onClick={() => onViewChange('map')}
        data-testid="button-view-map"
      >
        <MapIcon className="w-4 h-4 mr-2" />
        Mappa
      </Button>
    </div>
  );
}

export default function PublicVenues() {
  const [searchCity, setSearchCity] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isVenueDialogOpen, setIsVenueDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [mapSelectedVenue, setMapSelectedVenue] = useState<Venue | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const { isAuthenticated } = useCustomerAuth();
  const isMobile = useIsMobile();

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

  const { data: venues, isLoading, error } = useQuery<Venue[]>({
    queryKey: ["/api/public/venues", searchCity, userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchCity) params.append("city", searchCity);
      if (userLocation) {
        params.append("userLat", userLocation.lat.toString());
        params.append("userLng", userLocation.lng.toString());
      }
      const res = await fetch(`/api/public/venues?${params}`);
      if (!res.ok) throw new Error("Errore nel caricamento locali");
      return res.json();
    },
  });

  const handleVenueClick = (venue: Venue) => {
    setSelectedVenue(venue);
    setIsVenueDialogOpen(true);
  };

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background" data-testid="page-public-venues">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <Link href="/">
                <BrandLogo variant="horizontal" className="h-10 w-auto" />
              </Link>

              <nav className="flex items-center gap-6">
                <Link href="/acquista" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                  Eventi
                </Link>
                <Link href="/rivendite" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                  Rivendite
                </Link>
                <Link href="/locali" className="text-foreground font-medium">
                  Locali
                </Link>
              </nav>

              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per città..."
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="pl-10 h-10"
                    data-testid="input-search-city"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isAuthenticated ? (
                  <Link href="/account">
                    <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-primary/20" data-testid="avatar-user">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ) : (
                  <Link href="/login">
                    <Button variant="outline" data-testid="button-login">
                      <User className="w-4 h-4 mr-2" />
                      Accedi
                    </Button>
                  </Link>
                )}
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
                Scopri i <span className="text-primary">Club</span>
              </h1>
              <p className="text-muted-foreground">
                I migliori locali della tua città
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={springTransition}
                onClick={requestGeolocation}
                className={`
                  flex items-center gap-2 px-5 py-3 rounded-full font-medium text-sm whitespace-nowrap
                  min-h-[48px] transition-colors
                  ${locationEnabled 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                    : 'bg-card text-muted-foreground border border-border'
                  }
                `}
                data-testid="button-nearby"
              >
                <Navigation className={`w-4 h-4 ${locationLoading ? 'animate-pulse' : ''}`} />
                {locationLoading ? "Caricamento..." : "Vicino a te"}
              </motion.button>
              
              <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="p-8 text-center bg-red-500/10 border-red-500/20">
              <p className="text-red-400">Errore nel caricamento dei locali</p>
            </Card>
          ) : venues?.length === 0 ? (
            <Card className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Nessun locale trovato</h3>
              <p className="text-muted-foreground">
                {searchCity 
                  ? `Non ci sono locali a "${searchCity}"`
                  : "Non ci sono locali disponibili"}
              </p>
            </Card>
          ) : viewMode === 'map' ? (
            <MapView
              venues={venues || []}
              userLocation={userLocation}
              onVenueSelect={setMapSelectedVenue}
              selectedVenue={mapSelectedVenue}
              onCloseSelected={() => setMapSelectedVenue(null)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {venues?.map((venue) => (
                <Card 
                  key={venue.id} 
                  className="overflow-hidden hover-elevate cursor-pointer"
                  onClick={() => handleVenueClick(venue)}
                  data-testid={`card-venue-${venue.id}`}
                >
                  <div className="relative h-48 overflow-hidden">
                    {venue.heroImageUrl ? (
                      <img 
                        src={venue.heroImageUrl} 
                        alt={venue.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/20 flex items-center justify-center">
                        <Building2 className="w-16 h-16 text-primary/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                    
                    {venue.city && (
                      <Badge 
                        className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white border-0"
                        data-testid={`badge-city-${venue.id}`}
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        {venue.city}
                      </Badge>
                    )}
                    
                    {venue.eventCount > 0 && (
                      <Badge 
                        className="absolute top-3 right-3 bg-primary text-primary-foreground border-0"
                        data-testid={`badge-events-${venue.id}`}
                      >
                        {venue.eventCount} {venue.eventCount === 1 ? "evento" : "eventi"}
                      </Badge>
                    )}
                    
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-lg font-bold text-white drop-shadow-lg" data-testid={`text-venue-name-${venue.id}`}>
                        {venue.name}
                      </h3>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    {venue.address && (
                      <p className="text-muted-foreground text-sm flex items-center gap-1.5 mb-2">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{venue.address}</span>
                      </p>
                    )}
                    {venue.distance !== null && venue.distance !== undefined && (
                      <p className="text-teal-400 text-sm font-medium mb-2" data-testid={`text-distance-${venue.id}`}>
                        {formatDistance(venue.distance)}
                      </p>
                    )}
                    {venue.shortDescription && (
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {venue.shortDescription}
                      </p>
                    )}
                    {venue.capacity && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
                        <Users className="w-3.5 h-3.5" />
                        <span>Capienza: {venue.capacity}</span>
                      </div>
                    )}
                    {venue.eventCount === 0 && (
                      <p className="text-muted-foreground text-sm mt-2 italic">
                        Nessun evento in programma
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        <Dialog open={isVenueDialogOpen} onOpenChange={setIsVenueDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedVenue && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl">{selectedVenue.name}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {selectedVenue.heroImageUrl && (
                    <div className="relative h-64 rounded-lg overflow-hidden">
                      <img 
                        src={selectedVenue.heroImageUrl} 
                        alt={selectedVenue.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {selectedVenue.city && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{selectedVenue.city}</span>
                      </div>
                    )}
                    {selectedVenue.capacity && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>Capienza: {selectedVenue.capacity}</span>
                      </div>
                    )}
                    {selectedVenue.openingHours && (
                      <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                        <Clock className="w-4 h-4" />
                        <span>{selectedVenue.openingHours}</span>
                      </div>
                    )}
                    {selectedVenue.distance !== null && selectedVenue.distance !== undefined && (
                      <div className="flex items-center gap-2 text-teal-400 font-medium">
                        <Navigation className="w-4 h-4" />
                        <span>{formatDistance(selectedVenue.distance)}</span>
                      </div>
                    )}
                  </div>

                  {selectedVenue.address && (
                    <p className="text-muted-foreground">
                      {selectedVenue.address}
                    </p>
                  )}

                  {selectedVenue.shortDescription && (
                    <p className="text-foreground">
                      {selectedVenue.shortDescription}
                    </p>
                  )}

                  {selectedVenue.upcomingEvents.length > 0 ? (
                    <div className="border-t border-border pt-4">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Prossimi Eventi
                      </h4>
                      <div className="space-y-2">
                        {selectedVenue.upcomingEvents.map((event) => (
                          <Link key={event.id} href={`/acquista/${event.id}`}>
                            <div 
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                              data-testid={`link-event-${event.id}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-foreground font-medium truncate">{event.eventName}</p>
                                <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {format(new Date(event.eventStart), "d MMM yyyy", { locale: it })}
                                </p>
                              </div>
                              {event.minPrice !== null && (
                                <div className="text-right ml-3">
                                  <p className="text-primary font-semibold">
                                    da €{event.minPrice.toFixed(0)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-border pt-4">
                      <p className="text-muted-foreground text-sm italic">
                        Nessun evento in programma
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Link href={`/locali/${selectedVenue.id}`} className="flex-1">
                      <Button className="w-full" data-testid={`button-view-venue-${selectedVenue.id}`}>
                        Scopri di più
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
            <motion.div whileTap={{ scale: 0.95 }}>
              <BrandLogo variant="horizontal" className="h-10 w-auto" />
            </motion.div>
          </Link>
          
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link href="/account">
                <Avatar className="h-11 w-11 cursor-pointer ring-2 ring-primary/20" data-testid="avatar-user">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Link href="/login">
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

        <div className="flex items-center gap-4 text-sm mb-4">
          <Link href="/acquista" className="text-muted-foreground">
            Eventi
          </Link>
          <Link href="/rivendite" className="text-muted-foreground">
            Rivendite
          </Link>
          <Link href="/locali" className="text-foreground font-medium border-b-2 border-primary pb-1">
            Locali
          </Link>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className="relative mb-4"
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

        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
            onClick={requestGeolocation}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm whitespace-nowrap shrink-0
              min-h-[44px] transition-colors
              ${locationEnabled 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                : 'bg-muted/50 text-muted-foreground border border-border'
              }
            `}
            data-testid="button-nearby-mobile"
          >
            <Navigation className={`w-4 h-4 ${locationLoading ? 'animate-pulse' : ''}`} />
            {locationLoading ? "..." : "Vicino a te"}
          </motion.button>
          
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-full border border-border shrink-0">
            <button
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium min-h-[36px] transition-colors ${
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
              onClick={() => setViewMode('list')}
              data-testid="button-view-list-mobile"
            >
              <List className="w-4 h-4" />
              Lista
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium min-h-[36px] transition-colors ${
                viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
              onClick={() => setViewMode('map')}
              data-testid="button-view-map-mobile"
            >
              <MapIcon className="w-4 h-4" />
              Mappa
            </button>
          </div>
        </div>
      </motion.header>

      <main 
        className="flex-1 px-4 py-6 pb-24"
        style={{ 
          paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
          paddingRight: 'calc(1rem + env(safe-area-inset-right))',
          paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))'
        }}
      >
        {viewMode === 'list' && (
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
        )}

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
        ) : viewMode === 'map' ? (
          <div className="h-[calc(100vh-280px)] min-h-[400px]">
            <MapView
              venues={venues || []}
              userLocation={userLocation}
              onVenueSelect={setMapSelectedVenue}
              selectedVenue={mapSelectedVenue}
              onCloseSelected={() => setMapSelectedVenue(null)}
            />
          </div>
        ) : (
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {venues?.map((venue) => (
                <VenueCard key={venue.id} venue={venue} userLocation={userLocation} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function VenueCard({ venue, userLocation }: { venue: Venue; userLocation: { lat: number; lng: number } | null }) {
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
          {venue.distance !== null && venue.distance !== undefined && (
            <p className="text-teal-400 text-sm font-medium mb-3" data-testid={`text-distance-${venue.id}`}>
              <Navigation className="w-4 h-4 inline mr-1.5" />
              {formatDistance(venue.distance)}
            </p>
          )}

          {venue.shortDescription && (
            <p className="text-muted-foreground text-base mb-4 line-clamp-2">
              {venue.shortDescription}
            </p>
          )}

          {venue.upcomingEvents.length > 0 ? (
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
          ) : (
            <div className="border-t border-border pt-4 mb-4">
              <p className="text-muted-foreground text-sm italic">
                Nessun evento in programma
              </p>
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
