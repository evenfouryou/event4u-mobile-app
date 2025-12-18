import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MapPin, Clock, Users, Search, Ticket, ChevronRight, Star, Sparkles, User } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

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
  minPrice: number;
  totalAvailable: number;
  sectorsCount: number;
}

function EventCard({ event, index }: { event: PublicEvent; index: number }) {
  const eventDate = new Date(event.eventStart);
  const isToday = new Date().toDateString() === eventDate.toDateString();
  const isSoldOut = event.totalAvailable <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link href={`/acquista/${event.id}`}>
        <Card
          className="group relative overflow-hidden rounded-2xl border-0 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-yellow-500/10"
          data-testid={`card-event-${event.id}`}
        >
          <div className="relative aspect-square bg-gradient-to-br from-indigo-900/50 via-purple-900/40 to-pink-900/30">
            {event.eventImageUrl ? (
              <img
                src={event.eventImageUrl}
                alt={event.eventName}
                className="absolute inset-0 w-full h-full object-cover"
                data-testid={`img-event-${event.id}`}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <Sparkles className="w-32 h-32 text-primary" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            {isToday && (
              <Badge
                className="absolute top-4 left-4 bg-emerald-500/90 text-white border-0 px-3 py-1 shadow-lg shadow-emerald-500/25 z-10"
                data-testid={`badge-today-${event.id}`}
              >
                <span className="animate-pulse mr-1">●</span> Stasera
              </Badge>
            )}
            {isSoldOut && (
              <Badge
                variant="destructive"
                className="absolute top-4 right-4 border-0 z-10"
                data-testid={`badge-soldout-${event.id}`}
              >
                Sold Out
              </Badge>
            )}
          </div>
          <CardContent className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/95 to-transparent">
            <h3
              className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors"
              data-testid={`text-eventname-${event.id}`}
            >
              {event.eventName}
            </h3>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                <span data-testid={`text-date-${event.id}`}>
                  {format(eventDate, "EEEE d MMMM yyyy", { locale: it })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <span data-testid={`text-time-${event.id}`}>
                  Ore {format(eventDate, "HH:mm")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-400" />
                <span data-testid={`text-location-${event.id}`} className="line-clamp-1">
                  {event.locationName}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-1">
                <span className="text-primary text-sm font-medium">A partire da</span>
                <span className="text-2xl font-bold text-primary" data-testid={`text-price-${event.id}`}>
                  €{event.minPrice.toFixed(2)}
                </span>
              </div>
              <Button
                size="sm"
                disabled={isSoldOut}
                data-testid={`button-buy-${event.id}`}
              >
                <Ticket className="w-4 h-4 mr-1" />
                {isSoldOut ? "Esaurito" : "Acquista"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border-0">
      <Skeleton className="aspect-square" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex justify-between pt-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </Card>
  );
}

export default function PublicEventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isAuthenticated } = useCustomerAuth();

  const { data: events, isLoading, error } = useQuery<PublicEvent[]>({
    queryKey: ["/api/public/events"],
  });

  const filteredEvents = events?.filter((event) =>
    event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.locationName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-black" />
                </div>
                <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  Event4U
                </span>
              </div>
            </Link>
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Cerca eventi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/carrello">
                <Button variant="outline" size="sm" className="border-border text-foreground" data-testid="button-cart">
                  <Ticket className="w-4 h-4 mr-1" />
                  Carrello
                </Button>
              </Link>
              {isAuthenticated ? (
                <Link href="/account">
                  <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/50 transition-all" data-testid="avatar-user">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Link href="/accedi">
                  <Button size="sm" data-testid="button-login">
                    Accedi
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4" data-testid="text-page-title">
            Scopri gli Eventi
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Acquista i tuoi biglietti per le migliori serate. Pagamenti sicuri, biglietti digitali e accesso garantito.
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-3 mb-8">
          <Badge
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold cursor-pointer"
            data-testid="filter-all"
          >
            Tutti
          </Badge>
          <Badge
            variant="outline"
            className="px-4 py-2 border-border text-muted-foreground cursor-pointer"
            data-testid="filter-tonight"
          >
            <Star className="w-4 h-4 mr-1" /> Stasera
          </Badge>
          <Badge
            variant="outline"
            className="px-4 py-2 border-border text-muted-foreground cursor-pointer"
            data-testid="filter-weekend"
          >
            Weekend
          </Badge>
          <Badge
            variant="outline"
            className="px-4 py-2 border-border text-muted-foreground cursor-pointer"
            data-testid="filter-month"
          >
            Questo Mese
          </Badge>
        </div>

        {error && (
          <Card className="p-8 text-center bg-red-500/10 border-red-500/20">
            <p className="text-red-400">Errore nel caricamento degli eventi. Riprova più tardi.</p>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredEvents && filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="grid-events">
            {filteredEvents.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center bg-muted/50 border-border">
            <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Nessun evento disponibile</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Nessun evento corrisponde alla tua ricerca."
                : "Al momento non ci sono eventi in vendita. Torna presto!"}
            </p>
          </Card>
        )}
      </main>

      <footer className="border-t border-border py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Event4U. Tutti i diritti riservati.
              </span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Termini di Servizio</a>
              <a href="#" className="hover:text-primary transition-colors">Contatti</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
