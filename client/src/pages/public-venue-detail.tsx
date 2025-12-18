import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  Users, 
  Clock, 
  Calendar, 
  Ticket, 
  ArrowLeft,
  Sparkles,
  Building2,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ThemeToggle } from "@/components/theme-toggle";

interface Sector {
  id: string;
  name: string;
  price: string;
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

export default function PublicVenueDetail() {
  const params = useParams<{ id: string }>();

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <Skeleton className="h-60 sm:h-80 w-full rounded-2xl mb-4 sm:mb-8" />
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-8" />
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="p-12 text-center bg-red-500/10 border-red-500/20">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Locale non trovato</h3>
            <p className="text-muted-foreground mb-6">Il locale richiesto non è disponibile.</p>
            <Link href="/locali">
              <Button data-testid="button-back-venues">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna ai locali
              </Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        <div className="relative h-80 md:h-96 overflow-hidden">
          {venue.heroImageUrl ? (
            <img 
              src={venue.heroImageUrl} 
              alt={venue.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/20 flex items-center justify-center">
              <Building2 className="w-32 h-32 text-primary/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-12">
            <div className="container mx-auto">
              <Link href="/locali">
                <Button variant="ghost" size="sm" className="text-foreground/70 hover:text-foreground mb-3 sm:mb-4 h-10" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tutti i locali
                </Button>
              </Link>
              
              {venue.city && (
                <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                  <Badge className="bg-primary text-primary-foreground border-0">
                    <MapPin className="w-3 h-3 mr-1" />
                    {venue.city}
                  </Badge>
                </div>
              )}
              
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 sm:mb-3" data-testid="text-venue-name">
                {venue.name}
              </h1>
              
              {venue.address && (
                <p className="text-muted-foreground text-lg flex items-center gap-2" data-testid="text-venue-address">
                  <MapPin className="w-5 h-5" />
                  {venue.address}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 md:py-12">
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
            <div className="lg:col-span-1">
              <Card className="bg-card border-border sticky top-24">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Informazioni
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {venue.shortDescription && (
                    <p className="text-muted-foreground" data-testid="text-description">
                      {venue.shortDescription}
                    </p>
                  )}
                  
                  {venue.openingHours && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                      <Clock className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-muted-foreground text-sm">Orari</p>
                        <p className="text-foreground font-medium" data-testid="text-hours">{venue.openingHours}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-border">
                    <p className="text-muted-foreground text-sm mb-3">
                      {venue.upcomingEvents.length} eventi in programma
                    </p>
                    <Link href="/acquista">
                      <Button className="w-full" data-testid="button-all-events">
                        <Ticket className="w-4 h-4 mr-2" />
                        Tutti gli Eventi
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                Prossimi Eventi
              </h2>
              
              {venue.upcomingEvents.length === 0 ? (
                <Card className="p-12 text-center bg-muted/50 border-border">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">Nessun evento in programma</h3>
                  <p className="text-muted-foreground">
                    Al momento non ci sono eventi disponibili per questo locale.
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {venue.upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} Event4U - Tutti i diritti riservati</p>
        </div>
      </footer>
    </div>
  );
}

function Header() {
  return (
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
          <Link href="/locali">
            <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10" data-testid="button-venues">
              <Building2 className="w-4 h-4 mr-1" />
              Locali
            </Button>
          </Link>
          <Link href="/acquista">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="button-events">
              <Ticket className="w-4 h-4 mr-1" />
              Eventi
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function EventCard({ event }: { event: VenueEvent }) {
  const eventDate = new Date(event.eventStart);

  return (
    <Link href={`/acquista/${event.id}`}>
      <Card 
        className="bg-card border-border overflow-hidden hover:border-primary/30 transition-all duration-300 cursor-pointer"
        data-testid={`card-event-${event.id}`}
      >
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {format(eventDate, "d")}
              </span>
              <span className="text-sm text-muted-foreground uppercase">
                {format(eventDate, "MMM", { locale: it })}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-foreground mb-1" data-testid={`text-event-name-${event.id}`}>
                {event.eventName}
              </h3>
              <p className="text-muted-foreground text-sm flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" />
                {format(eventDate, "EEEE d MMMM yyyy • HH:mm", { locale: it })}
              </p>
              
              {event.requiresNominative && (
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-purple-500/20 text-purple-400 border-0">
                    Nominativo
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {event.minPrice !== null && (
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">A partire da</p>
                  <p className="text-2xl font-bold text-primary">
                    €{event.minPrice.toFixed(0)}
                  </p>
                </div>
              )}
              <Button data-testid={`button-buy-${event.id}`}>
                Acquista
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
          
          {event.sectors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Settori disponibili</p>
              <div className="flex flex-wrap gap-2">
                {event.sectors.map((sector) => (
                  <Badge 
                    key={sector.id}
                    variant="outline" 
                    className="border-border text-muted-foreground"
                  >
                    {sector.name} - €{parseFloat(sector.priceIntero || '0').toFixed(0)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
