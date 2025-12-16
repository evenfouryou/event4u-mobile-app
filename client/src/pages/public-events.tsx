import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, Users, Search, Ticket, ChevronRight, Star, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";

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
                <Sparkles className="w-32 h-32 text-yellow-500" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-[#0a0e17]/40 to-transparent" />
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
                className="absolute top-4 right-4 bg-red-500/90 text-white border-0 z-10"
                data-testid={`badge-soldout-${event.id}`}
              >
                Sold Out
              </Badge>
            )}
          </div>
          <CardContent className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0a0e17] via-[#0a0e17]/95 to-transparent">
            <h3
              className="text-2xl font-bold text-white mb-3 group-hover:text-yellow-400 transition-colors"
              data-testid={`text-eventname-${event.id}`}
            >
              {event.eventName}
            </h3>
            <div className="flex flex-col gap-2 text-sm text-slate-300">
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
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-1">
                <span className="text-yellow-400 text-sm font-medium">A partire da</span>
                <span className="text-2xl font-bold text-yellow-400" data-testid={`text-price-${event.id}`}>
                  €{event.minPrice.toFixed(2)}
                </span>
              </div>
              <Button
                size="sm"
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
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

  const { data: events, isLoading, error } = useQuery<PublicEvent[]>({
    queryKey: ["/api/public/events"],
  });

  const filteredEvents = events?.filter((event) =>
    event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.locationName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0e17]">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0e17]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-black" />
                </div>
                <span className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                  Event4U
                </span>
              </div>
            </Link>
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Cerca eventi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-yellow-500 focus:ring-yellow-500/20"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/carrello">
                <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/10" data-testid="button-cart">
                  <Ticket className="w-4 h-4 mr-1" />
                  Carrello
                </Button>
              </Link>
              <Link href="/login-acquisto">
                <Button size="sm" className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold" data-testid="button-login">
                  Accedi
                </Button>
              </Link>
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
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" data-testid="text-page-title">
            Scopri gli Eventi
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Acquista i tuoi biglietti per le migliori serate. Pagamenti sicuri, biglietti digitali e accesso garantito.
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-3 mb-8">
          <Badge
            className="px-4 py-2 bg-yellow-500 text-black font-semibold cursor-pointer"
            data-testid="filter-all"
          >
            Tutti
          </Badge>
          <Badge
            variant="outline"
            className="px-4 py-2 border-white/20 text-slate-300 cursor-pointer hover:border-yellow-500/50"
            data-testid="filter-tonight"
          >
            <Star className="w-4 h-4 mr-1" /> Stasera
          </Badge>
          <Badge
            variant="outline"
            className="px-4 py-2 border-white/20 text-slate-300 cursor-pointer hover:border-yellow-500/50"
            data-testid="filter-weekend"
          >
            Weekend
          </Badge>
          <Badge
            variant="outline"
            className="px-4 py-2 border-white/20 text-slate-300 cursor-pointer hover:border-yellow-500/50"
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
          <Card className="p-12 text-center bg-white/5 border-white/10">
            <Ticket className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-semibold text-white mb-2">Nessun evento disponibile</h3>
            <p className="text-slate-400">
              {searchQuery
                ? "Nessun evento corrisponde alla tua ricerca."
                : "Al momento non ci sono eventi in vendita. Torna presto!"}
            </p>
          </Card>
        )}
      </main>

      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-slate-400">
                © {new Date().getFullYear()} Event4U. Tutti i diritti riservati.
              </span>
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-yellow-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-yellow-400 transition-colors">Termini di Servizio</a>
              <a href="#" className="hover:text-yellow-400 transition-colors">Contatti</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
