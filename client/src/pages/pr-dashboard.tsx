import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrAuth } from "@/hooks/usePrAuth";
import { PrLayout, PrPageContainer } from "@/components/pr-layout";
import {
  Users,
  Ticket,
  Calendar,
  Wallet,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Clock,
  MapPin,
  Star,
  Gift,
  Trophy,
  ArrowUpRight,
  Target,
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
}

interface PrStats {
  totalGuests: number;
  totalTables: number;
  ticketsSold: number;
  totalRevenue: number;
  commissionEarned: number;
  activeEvents: number;
}

interface WalletInfo {
  balance: string;
  pendingPayout: string;
  currency: string;
}

export default function PrDashboard() {
  const [, navigate] = useLocation();
  const { prProfile, isLoading: isLoadingProfile } = usePrAuth();
  const [animatedStats, setAnimatedStats] = useState<PrStats>({
    totalGuests: 0,
    totalTables: 0,
    ticketsSold: 0,
    totalRevenue: 0,
    commissionEarned: 0,
    activeEvents: 0,
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery<PrEvent[]>({
    queryKey: ["/api/pr/my-events"],
    enabled: !!prProfile,
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery<PrStats>({
    queryKey: ["/api/pr/stats"],
    enabled: !!prProfile,
  });

  const { data: wallet, isLoading: isLoadingWallet } = useQuery<WalletInfo>({
    queryKey: ["/api/pr/wallet"],
    enabled: !!prProfile,
  });

  // Animate stats on load
  useEffect(() => {
    if (stats) {
      const duration = 1000;
      const steps = 30;
      const interval = duration / steps;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        setAnimatedStats({
          totalGuests: Math.floor(stats.totalGuests * progress),
          totalTables: Math.floor(stats.totalTables * progress),
          ticketsSold: Math.floor(stats.ticketsSold * progress),
          totalRevenue: Math.floor(stats.totalRevenue * progress),
          commissionEarned: Math.floor(stats.commissionEarned * progress),
          activeEvents: Math.floor(stats.activeEvents * progress),
        });
        if (step >= steps) clearInterval(timer);
      }, interval);

      return () => clearInterval(timer);
    }
  }, [stats]);

  const now = new Date();
  
  // Find today's event or next upcoming event
  const todayEvent = events.find((e) => {
    const eventDate = new Date(e.eventStart);
    return eventDate.toDateString() === now.toDateString();
  });

  const upcomingEvent = !todayEvent
    ? events
        .filter((e) => new Date(e.eventStart) > now)
        .sort((a, b) => new Date(a.eventStart).getTime() - new Date(b.eventStart).getTime())[0]
    : null;

  const featuredEvent = todayEvent || upcomingEvent;

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

  const getCountdown = (dateString: string) => {
    const eventDate = new Date(dateString);
    const diffMs = eventDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours < 0) return "In corso";
    if (diffHours === 0) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h ${diffMins}m`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} giorni`;
  };

  const getInitials = () => {
    if (prProfile?.firstName && prProfile?.lastName) {
      return `${prProfile.firstName[0]}${prProfile.lastName[0]}`.toUpperCase();
    }
    return "PR";
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <PrLayout>
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-purple-500/10 to-blue-500/10 border-b border-border/50">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGM5Ljk0MSAwIDE4LTguMDU5IDE4LTE4cy04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNHMxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative px-4 md:px-6 py-6 md:py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Avatar className="h-16 w-16 md:h-20 md:w-20 ring-4 ring-primary/20 shadow-xl">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-amber-500 text-primary-foreground text-xl md:text-2xl font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <div>
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-muted-foreground text-sm"
                >
                  Bentornato,
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl md:text-3xl font-bold text-foreground"
                >
                  {prProfile?.firstName || "Promoter"}
                </motion.h1>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 mt-1"
                >
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <Star className="h-3 w-3 mr-1 fill-primary" />
                    {prProfile?.prCode || "PR"}
                  </Badge>
                </motion.div>
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/pr/wallet")}
              data-testid="button-wallet"
            >
              <Wallet className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-6 space-y-6">
        {/* Wallet Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card 
            className="overflow-hidden cursor-pointer hover-elevate"
            onClick={() => navigate("/pr/wallet")}
            data-testid="card-wallet"
          >
            <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/80 text-sm font-medium">Il tuo saldo</span>
                  <Wallet className="h-5 w-5 text-white/60" />
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-white">
                    €{isLoadingWallet ? "---" : (parseFloat(wallet?.balance || "0")).toFixed(2)}
                  </span>
                </div>
                {wallet?.pendingPayout && parseFloat(wallet.pendingPayout) > 0 && (
                  <p className="text-white/70 text-sm">
                    €{parseFloat(wallet.pendingPayout).toFixed(2)} in attesa di pagamento
                  </p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/20">
                  <Users className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoadingStats ? <Skeleton className="h-7 w-12" /> : animatedStats.totalGuests}
                  </p>
                  <p className="text-xs text-muted-foreground">Ospiti</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Ticket className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoadingStats ? <Skeleton className="h-7 w-12" /> : animatedStats.ticketsSold}
                  </p>
                  <p className="text-xs text-muted-foreground">Biglietti</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <TrendingUp className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoadingStats ? <Skeleton className="h-7 w-16" /> : `€${animatedStats.commissionEarned}`}
                  </p>
                  <p className="text-xs text-muted-foreground">Guadagnato</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Calendar className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {isLoadingStats ? <Skeleton className="h-7 w-8" /> : animatedStats.activeEvents}
                  </p>
                  <p className="text-xs text-muted-foreground">Eventi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Featured Event Card */}
        {featuredEvent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card 
              className="overflow-hidden cursor-pointer hover-elevate group"
              onClick={() => navigate(`/pr/events/${featuredEvent.id}`)}
              data-testid={`card-event-${featuredEvent.id}`}
            >
              <div className="relative h-48 md:h-56">
                {featuredEvent.eventImageUrl ? (
                  <img
                    src={featuredEvent.eventImageUrl}
                    alt={featuredEvent.eventName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                
                {/* Badge */}
                <div className="absolute top-4 left-4">
                  {todayEvent ? (
                    <Badge className="bg-primary text-primary-foreground shadow-lg animate-pulse">
                      <Sparkles className="h-3 w-3 mr-1" />
                      OGGI
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                      <Clock className="h-3 w-3 mr-1" />
                      {getCountdown(featuredEvent.eventStart)}
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                    {featuredEvent.eventName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-white/80 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(featuredEvent.eventStart)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(featuredEvent.eventStart)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate max-w-[150px]">{featuredEvent.locationName}</span>
                    </div>
                  </div>
                </div>

                {/* Action indicator */}
                <div className="absolute bottom-4 right-4">
                  <div className="p-2 rounded-full bg-primary text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-3">Azioni rapide</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card 
              className="cursor-pointer hover-elevate"
              onClick={() => navigate("/pr/events")}
              data-testid="action-events"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-violet-500/10">
                  <Calendar className="h-6 w-6 text-violet-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">I miei eventi</p>
                  <p className="text-xs text-muted-foreground">Gestisci liste e tavoli</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover-elevate"
              onClick={() => navigate("/pr/wallet")}
              data-testid="action-wallet"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <Wallet className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Wallet</p>
                  <p className="text-xs text-muted-foreground">Saldo e transazioni</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover-elevate"
              onClick={() => navigate("/pr/profile")}
              data-testid="action-profile"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Profilo</p>
                  <p className="text-xs text-muted-foreground">Impostazioni account</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover-elevate"
              onClick={() => navigate("/pr/rewards")}
              data-testid="action-rewards"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Trophy className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Premi</p>
                  <p className="text-xs text-muted-foreground">Obiettivi e bonus</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Recent Events Preview */}
        {events.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">I tuoi eventi</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/pr/events")}
                data-testid="button-see-all-events"
              >
                Vedi tutti
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            <div className="space-y-3">
              {events.slice(0, 3).map((event, index) => {
                const isToday = new Date(event.eventStart).toDateString() === now.toDateString();
                const isPast = new Date(event.eventStart) < now;
                
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <Card 
                      className="cursor-pointer hover-elevate"
                      onClick={() => navigate(`/pr/events/${event.id}`)}
                      data-testid={`event-row-${event.id}`}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                          {event.eventImageUrl ? (
                            <img
                              src={event.eventImageUrl}
                              alt={event.eventName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-violet-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground truncate">
                              {event.eventName}
                            </h4>
                            {isToday && (
                              <Badge className="bg-primary/10 text-primary text-xs">
                                Oggi
                              </Badge>
                            )}
                            {isPast && !isToday && (
                              <Badge variant="secondary" className="text-xs">
                                Passato
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(event.eventStart)} • {formatTime(event.eventStart)}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoadingEvents && events.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nessun evento assegnato
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Al momento non hai eventi assegnati. Contatta il tuo organizzatore per essere aggiunto agli eventi.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </PrLayout>
  );
}
