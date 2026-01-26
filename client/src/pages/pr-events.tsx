import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrAuth } from "@/hooks/usePrAuth";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Ticket,
  ChevronRight,
  Sparkles,
  Filter,
  Grid3X3,
  CheckCircle2,
  ArrowUpRight,
  Zap,
} from "lucide-react";

interface PrEvent {
  id: string;
  eventId: string;
  eventName: string;
  eventImageUrl: string | null;
  eventStart: string;
  eventEnd: string;
  locationName: string;
  status?: string;
  stats?: {
    guests: number;
    tables: number;
    tickets: number;
  };
}

type FilterType = "all" | "upcoming" | "past";

export default function PrEvents() {
  const [, navigate] = useLocation();
  const { prProfile, isLoading: isLoadingProfile } = usePrAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>("upcoming");

  const { data: events = [], isLoading: isLoadingEvents } = useQuery<PrEvent[]>({
    queryKey: ["/api/pr/my-events"],
    enabled: !!prProfile,
  });

  const now = new Date();

  const filteredEvents = useMemo(() => {
    switch (activeFilter) {
      case "upcoming":
        return events
          .filter((e) => new Date(e.eventStart) >= now)
          .sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime());
      case "past":
        return events
          .filter((e) => new Date(e.eventStart) < now)
          .sort((a, b) => new Date(b.eventStart).getTime() - new Date(a.eventStart).getTime());
      default:
        return events.sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime());
    }
  }, [events, activeFilter]);

  const upcomingCount = useMemo(
    () => events.filter((e) => new Date(e.eventStart) >= now).length,
    [events]
  );

  const pastCount = useMemo(
    () => events.filter((e) => new Date(e.eventStart) < now).length,
    [events]
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isToday = (dateString: string) => {
    const eventDate = new Date(dateString);
    return eventDate.toDateString() === now.toDateString();
  };

  const isLive = (event: PrEvent) => {
    const start = new Date(event.eventStart);
    const end = new Date(event.eventEnd);
    return now >= start && now <= end;
  };

  const getTimeUntil = (dateString: string) => {
    const eventDate = new Date(dateString);
    const diffMs = eventDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0) return null;
    if (diffHours === 0) {
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffMins} min`;
    }
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}g`;
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">I miei eventi</h1>
              <p className="text-sm text-muted-foreground">
                {events.length} eventi totali
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/pr/dashboard")}
              data-testid="button-back-dashboard"
            >
              <Grid3X3 className="h-5 w-5" />
            </Button>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2">
            <Button
              variant={activeFilter === "upcoming" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("upcoming")}
              data-testid="filter-upcoming"
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Prossimi ({upcomingCount})
            </Button>
            <Button
              variant={activeFilter === "past" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("past")}
              data-testid="filter-past"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Passati ({pastCount})
            </Button>
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              data-testid="filter-all"
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Tutti
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-6">
        {/* Loading State */}
        {isLoadingEvents && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton className="h-40 w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Events Grid */}
        {!isLoadingEvents && (
          <motion.div 
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            layout
          >
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((event, index) => {
                const eventIsToday = isToday(event.eventStart);
                const eventIsLive = isLive(event);
                const isPast = new Date(event.eventStart) < now && !eventIsLive;
                const timeUntil = getTimeUntil(event.eventStart);

                return (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Card
                      className={`overflow-hidden cursor-pointer hover-elevate group ${
                        isPast ? "opacity-75" : ""
                      }`}
                      onClick={() => navigate(`/pr/events/${event.id}`)}
                      data-testid={`event-card-${event.id}`}
                    >
                      {/* Event Image */}
                      <div className="relative aspect-[16/9] overflow-hidden">
                        {event.eventImageUrl ? (
                          <img
                            src={event.eventImageUrl}
                            alt={event.eventName}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                          {eventIsLive && (
                            <Badge className="bg-red-500 text-white animate-pulse shadow-lg">
                              <Zap className="h-3 w-3 mr-1" />
                              LIVE
                            </Badge>
                          )}
                          {eventIsToday && !eventIsLive && (
                            <Badge className="bg-primary text-primary-foreground shadow-lg">
                              <Sparkles className="h-3 w-3 mr-1" />
                              OGGI
                            </Badge>
                          )}
                          {isPast && (
                            <Badge variant="secondary" className="bg-black/60 text-white/80">
                              Passato
                            </Badge>
                          )}
                          {timeUntil && !eventIsToday && !isPast && (
                            <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-sm">
                              <Clock className="h-3 w-3 mr-1" />
                              {timeUntil}
                            </Badge>
                          )}
                        </div>

                        {/* Quick Stats Overlay */}
                        {event.stats && (
                          <div className="absolute bottom-3 left-3 flex gap-2">
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                              <Users className="h-3 w-3" />
                              {event.stats.guests}
                            </div>
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                              <Ticket className="h-3 w-3" />
                              {event.stats.tickets}
                            </div>
                          </div>
                        )}

                        {/* Arrow Indicator */}
                        <div className="absolute bottom-3 right-3">
                          <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      {/* Event Content */}
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {event.eventName}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span>{formatDate(event.eventStart)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-primary" />
                            <span>{formatTime(event.eventStart)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{event.locationName}</span>
                        </div>

                        {/* Action Button */}
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Tocca per gestire
                          </span>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoadingEvents && filteredEvents.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="py-16 text-center">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {activeFilter === "upcoming"
                    ? "Nessun evento in programma"
                    : activeFilter === "past"
                    ? "Nessun evento passato"
                    : "Nessun evento"}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {activeFilter === "upcoming"
                    ? "I tuoi prossimi eventi appariranno qui quando sarai assegnato."
                    : activeFilter === "past"
                    ? "Lo storico dei tuoi eventi passati apparirà qui."
                    : "Non hai ancora eventi assegnati."}
                </p>
                {activeFilter !== "all" && events.length > 0 && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveFilter("all")}
                    data-testid="button-show-all"
                  >
                    Mostra tutti gli eventi
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
