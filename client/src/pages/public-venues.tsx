import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  Users, 
  Clock, 
  Calendar, 
  Ticket, 
  Search,
  ArrowRight,
  Sparkles,
  Building2
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

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

export default function PublicVenues() {
  const [searchCity, setSearchCity] = useState("");

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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:block">
                Event<span className="text-primary">4</span>U
              </span>
            </div>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link href="/acquista">
              <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10" data-testid="button-events">
                <Ticket className="w-4 h-4 mr-1" />
                Eventi
              </Button>
            </Link>
            <Link href="/accedi">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="button-login">
                Accedi
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border text-sm font-medium mb-6">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">I Migliori Locali</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4" data-testid="text-page-title">
            Scopri i <span className="text-primary">Club</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Esplora i migliori locali della tua città e scopri gli eventi in programma
          </p>
        </div>

        <div className="max-w-xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Cerca per città..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="pl-12 h-14 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl text-lg"
              data-testid="input-search-city"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-card border-border overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-12 text-center bg-red-500/10 border-red-500/20">
            <p className="text-red-400">Errore nel caricamento dei locali</p>
          </Card>
        ) : venues?.length === 0 ? (
          <Card className="p-12 text-center bg-muted/50 border-border">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Nessun locale trovato</h3>
            <p className="text-muted-foreground">
              {searchCity 
                ? `Non ci sono locali disponibili a "${searchCity}"`
                : "Non ci sono locali disponibili al momento"}
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues?.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} Event4U - Tutti i diritti riservati</p>
        </div>
      </footer>
    </div>
  );
}

function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Card 
      className="bg-card border-border overflow-hidden group hover:border-primary/30 transition-all duration-300"
      data-testid={`card-venue-${venue.id}`}
    >
      <div className="relative h-48 overflow-hidden">
        {venue.heroImageUrl ? (
          <img 
            src={venue.heroImageUrl} 
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/20 flex items-center justify-center">
            <Building2 className="w-16 h-16 text-primary/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        
        {venue.city && (
          <Badge 
            className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white border-0"
            data-testid={`badge-city-${venue.id}`}
          >
            <MapPin className="w-3 h-3 mr-1" />
            {venue.city}
          </Badge>
        )}
        
        {venue.eventCount > 0 && (
          <Badge 
            className="absolute top-4 right-4 bg-primary text-primary-foreground border-0"
            data-testid={`badge-events-${venue.id}`}
          >
            {venue.eventCount} {venue.eventCount === 1 ? "evento" : "eventi"}
          </Badge>
        )}
      </div>

      <CardContent className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-2" data-testid={`text-venue-name-${venue.id}`}>
          {venue.name}
        </h3>
        
        {venue.address && (
          <p className="text-muted-foreground text-sm mb-3 flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <span>{venue.address}</span>
          </p>
        )}
        
        {venue.shortDescription && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {venue.shortDescription}
          </p>
        )}

        {venue.openingHours && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
            <Clock className="w-4 h-4" />
            <span>{venue.openingHours}</span>
          </div>
        )}

        {venue.upcomingEvents.length > 0 && (
          <div className="border-t border-border pt-4 mt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Prossimi Eventi</p>
            <div className="space-y-2">
              {venue.upcomingEvents.slice(0, 2).map((event) => (
                <Link key={event.id} href={`/acquista/${event.id}`}>
                  <div 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-primary/10 transition-colors cursor-pointer"
                    data-testid={`link-event-${event.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium text-sm truncate">{event.eventName}</p>
                      <p className="text-muted-foreground text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(event.eventStart), "d MMM yyyy", { locale: it })}
                      </p>
                    </div>
                    {event.minPrice !== null && (
                      <div className="text-right ml-3">
                        <p className="text-primary font-semibold text-sm">
                          da €{event.minPrice.toFixed(0)}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link href={`/locali/${venue.id}`}>
          <Button 
            className="w-full mt-4"
            data-testid={`button-view-venue-${venue.id}`}
          >
            Scopri di più
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
