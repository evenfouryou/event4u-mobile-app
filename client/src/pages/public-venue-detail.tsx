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
      <div className="min-h-screen bg-[#0a0e17]">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-80 w-full rounded-2xl mb-8" />
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
      <div className="min-h-screen bg-[#0a0e17]">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="p-12 text-center bg-red-500/10 border-red-500/20">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-xl font-semibold text-white mb-2">Locale non trovato</h3>
            <p className="text-slate-400 mb-6">Il locale richiesto non è disponibile.</p>
            <Link href="/locali">
              <Button className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold">
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
    <div className="min-h-screen bg-[#0a0e17]">
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
            <div className="w-full h-full bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-orange-500/20 flex items-center justify-center">
              <Building2 className="w-32 h-32 text-yellow-500/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-[#0a0e17]/50 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
            <div className="container mx-auto">
              <Link href="/locali">
                <Button variant="ghost" size="sm" className="text-white/70 hover:text-white mb-4" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tutti i locali
                </Button>
              </Link>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {venue.city && (
                  <Badge className="bg-yellow-500 text-black border-0">
                    <MapPin className="w-3 h-3 mr-1" />
                    {venue.city}
                  </Badge>
                )}
                {venue.capacity && (
                  <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                    <Users className="w-3 h-3 mr-1" />
                    {venue.capacity} posti
                  </Badge>
                )}
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" data-testid="text-venue-name">
                {venue.name}
              </h1>
              
              {venue.address && (
                <p className="text-slate-300 text-lg flex items-center gap-2" data-testid="text-venue-address">
                  <MapPin className="w-5 h-5" />
                  {venue.address}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card className="bg-[#151922] border-white/10 sticky top-24">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-yellow-400" />
                    Informazioni
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {venue.shortDescription && (
                    <p className="text-slate-300" data-testid="text-description">
                      {venue.shortDescription}
                    </p>
                  )}
                  
                  {venue.openingHours && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
                      <Clock className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div>
                        <p className="text-slate-400 text-sm">Orari</p>
                        <p className="text-white font-medium" data-testid="text-hours">{venue.openingHours}</p>
                      </div>
                    </div>
                  )}
                  
                  {venue.capacity && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
                      <Users className="w-5 h-5 text-teal-400 mt-0.5" />
                      <div>
                        <p className="text-slate-400 text-sm">Capienza</p>
                        <p className="text-white font-medium">{venue.capacity} persone</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-slate-400 text-sm mb-3">
                      {venue.upcomingEvents.length} eventi in programma
                    </p>
                    <Link href="/acquista">
                      <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold" data-testid="button-all-events">
                        <Ticket className="w-4 h-4 mr-2" />
                        Tutti gli Eventi
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-yellow-400" />
                Prossimi Eventi
              </h2>
              
              {venue.upcomingEvents.length === 0 ? (
                <Card className="p-12 text-center bg-white/5 border-white/10">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <h3 className="text-xl font-semibold text-white mb-2">Nessun evento in programma</h3>
                  <p className="text-slate-400">
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

      <footer className="border-t border-white/10 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Event4U - Tutti i diritti riservati</p>
        </div>
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#0a0e17]/95 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-black" />
            </div>
            <span className="text-xl font-bold text-white hidden sm:block">
              Event<span className="text-yellow-400">4</span>U
            </span>
          </div>
        </Link>
        
        <div className="flex items-center gap-3">
          <Link href="/locali">
            <Button variant="outline" size="sm" className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10" data-testid="button-venues">
              <Building2 className="w-4 h-4 mr-1" />
              Locali
            </Button>
          </Link>
          <Link href="/acquista">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" data-testid="button-events">
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
  const soldPercentage = Math.round((event.ticketsSold / event.totalCapacity) * 100);
  const isAlmostSoldOut = soldPercentage >= 80;

  return (
    <Link href={`/acquista/${event.id}`}>
      <Card 
        className="bg-[#151922] border-white/10 overflow-hidden hover:border-yellow-500/30 transition-all duration-300 cursor-pointer"
        data-testid={`card-event-${event.id}`}
      >
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-yellow-400">
                {format(eventDate, "d")}
              </span>
              <span className="text-sm text-slate-400 uppercase">
                {format(eventDate, "MMM", { locale: it })}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white mb-1" data-testid={`text-event-name-${event.id}`}>
                {event.eventName}
              </h3>
              <p className="text-slate-400 text-sm flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" />
                {format(eventDate, "EEEE d MMMM yyyy • HH:mm", { locale: it })}
              </p>
              
              <div className="flex flex-wrap gap-2">
                {event.requiresNominative && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-0">
                    Nominativo
                  </Badge>
                )}
                {isAlmostSoldOut && (
                  <Badge className="bg-red-500/20 text-red-400 border-0">
                    Ultimi posti!
                  </Badge>
                )}
                <Badge className={`border-0 ${event.availability > 20 ? 'bg-teal-500/20 text-teal-400' : 'bg-orange-500/20 text-orange-400'}`}>
                  {event.availability} disponibili
                </Badge>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {event.minPrice !== null && (
                <div className="text-right">
                  <p className="text-slate-500 text-xs">A partire da</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    €{event.minPrice.toFixed(0)}
                  </p>
                </div>
              )}
              <Button 
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
                data-testid={`button-buy-${event.id}`}
              >
                Acquista
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
          
          {event.sectors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Settori disponibili</p>
              <div className="flex flex-wrap gap-2">
                {event.sectors.map((sector) => (
                  <Badge 
                    key={sector.id}
                    variant="outline" 
                    className="border-white/20 text-slate-300"
                  >
                    {sector.name} - €{parseFloat(sector.price).toFixed(0)}
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
