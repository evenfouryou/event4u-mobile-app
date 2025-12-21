import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { format, isAfter, isToday, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { SafeArea, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import {
  Calendar,
  QrCode,
  History,
  BarChart3,
  LogOut,
  ChevronRight,
  MapPin,
  ScanLine,
  Zap,
  Sparkles,
  CalendarDays,
  Clock,
} from "lucide-react";

interface Event {
  id: string;
  name: string;
  startDatetime: string;
  endDatetime?: string;
  status: string;
  locationId?: string;
  location?: {
    name: string;
  };
}

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
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

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: springTransition,
  },
};

export default function ScannerHomePage() {
  const { user } = useAuth();

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/e4u/my-events'],
  });

  const handleLogout = async () => {
    triggerHaptic('medium');
    try {
      await apiRequest('POST', '/api/auth/logout');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const now = new Date();
  
  const upcomingEvents = events?.filter(event => {
    const startDate = parseISO(event.startDatetime);
    const endDate = event.endDatetime ? parseISO(event.endDatetime) : null;
    
    if (isAfter(startDate, now) || isToday(startDate)) {
      return true;
    }
    
    if (endDate && (isAfter(endDate, now) || isToday(endDate))) {
      return true;
    }
    
    if (event.status === 'ongoing' || event.status === 'scheduled') {
      return true;
    }
    
    return false;
  }).sort((a, b) => 
    new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
  ) || [];

  const todayEvents = upcomingEvents.filter(event => 
    isToday(parseISO(event.startDatetime))
  );

  const futureEvents = upcomingEvents.filter(event => 
    !isToday(parseISO(event.startDatetime))
  );

  return (
    <SafeArea className="min-h-screen bg-background flex flex-col">
      <motion.header 
        className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20"
              whileTap={{ scale: 0.95 }}
              transition={springTransition}
            >
              <ScanLine className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold" data-testid="text-title">
                Scanner
              </h1>
              {user && (
                <p className="text-sm text-muted-foreground" data-testid="text-user-name">
                  Ciao, {(user as any).firstName || (user as any).username}!
                </p>
              )}
            </div>
          </div>
          <HapticButton 
            variant="ghost" 
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={handleLogout}
            hapticType="medium"
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5" />
          </HapticButton>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <motion.div 
          className="px-4 py-6 space-y-6 pb-24"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div 
            className="grid grid-cols-2 gap-4"
            variants={staggerItem}
          >
            <Link href="/scanner/history">
              <motion.div
                whileTap={{ scale: 0.97 }}
                transition={springTransition}
                onClick={() => triggerHaptic('light')}
              >
                <Card 
                  className="hover-elevate cursor-pointer h-full border-0 bg-gradient-to-br from-purple-500/15 to-purple-600/5 min-h-[120px]" 
                  data-testid="card-history"
                >
                  <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-3">
                      <History className="h-7 w-7 text-purple-400" />
                    </div>
                    <span className="font-semibold text-base">Eventi Passati</span>
                    <span className="text-xs text-muted-foreground mt-1">Storico scansioni</span>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
            <Link href="/scanner/stats">
              <motion.div
                whileTap={{ scale: 0.97 }}
                transition={springTransition}
                onClick={() => triggerHaptic('light')}
              >
                <Card 
                  className="hover-elevate cursor-pointer h-full border-0 bg-gradient-to-br from-blue-500/15 to-blue-600/5 min-h-[120px]" 
                  data-testid="card-stats"
                >
                  <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-3">
                      <BarChart3 className="h-7 w-7 text-blue-400" />
                    </div>
                    <span className="font-semibold text-base">Statistiche</span>
                    <span className="text-xs text-muted-foreground mt-1">Riepilogo generale</span>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          </motion.div>

          {todayEvents.length > 0 && (
            <motion.section variants={staggerItem}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-emerald-400" />
                </div>
                <h2 className="text-lg font-bold" data-testid="text-today-section">
                  Eventi di Oggi
                </h2>
              </div>
              <div className="space-y-4">
                {todayEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...springTransition, delay: index * 0.1 }}
                  >
                    <Link href={`/scanner/scan/${event.id}`}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        transition={springTransition}
                        onClick={() => triggerHaptic('light')}
                      >
                        <Card 
                          className="hover-elevate cursor-pointer border-0 bg-gradient-to-r from-emerald-500/20 to-green-500/10 shadow-lg shadow-emerald-500/10 min-h-[140px]" 
                          data-testid={`card-event-today-${event.id}`}
                        >
                          <CardContent className="p-5 flex items-center gap-4 h-full">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-3">
                                <Badge className="bg-emerald-500 text-white border-0 px-3 py-1">
                                  <Sparkles className="h-3 w-3 mr-1.5" />
                                  Oggi
                                </Badge>
                              </div>
                              <h3 className="font-bold text-lg leading-tight mb-2" data-testid="text-event-name">
                                {event.name}
                              </h3>
                              <div className="flex flex-col gap-1.5">
                                <p className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {format(parseISO(event.startDatetime), "HH:mm", { locale: it })}
                                </p>
                                {event.location && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {event.location.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/30 flex items-center justify-center shrink-0">
                              <QrCode className="h-8 w-8 text-emerald-400" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          <motion.section variants={staggerItem}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold" data-testid="text-upcoming-section">
                {todayEvents.length > 0 ? "Prossimi Eventi" : "Seleziona Evento"}
              </h2>
            </div>
            
            {eventsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="border-0 bg-muted/30 min-h-[100px]">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-14 w-14 rounded-2xl" />
                        <div className="flex-1 space-y-3">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : futureEvents.length > 0 ? (
              <div className="space-y-3">
                {futureEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springTransition, delay: index * 0.05 }}
                  >
                    <Link href={`/scanner/scan/${event.id}`}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        transition={springTransition}
                        onClick={() => triggerHaptic('light')}
                      >
                        <Card 
                          className="hover-elevate cursor-pointer border-0 bg-muted/30 min-h-[100px]" 
                          data-testid={`card-event-${event.id}`}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Calendar className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-1 font-medium">
                                  {format(parseISO(event.startDatetime), "EEEE d MMMM", { locale: it })}
                                </p>
                                <h3 className="font-semibold text-base truncate mb-1" data-testid="text-event-name">
                                  {event.name}
                                </h3>
                                {event.location && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {event.location.name}
                                  </p>
                                )}
                              </div>
                              <div className="w-11 h-11 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : todayEvents.length === 0 ? (
              <Card className="border-0 bg-muted/30 min-h-[180px]">
                <CardContent className="p-8 flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-4">
                    <Calendar className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                  <p className="text-muted-foreground text-base">
                    Nessun evento disponibile
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </motion.section>
        </motion.div>
      </div>
    </SafeArea>
  );
}
