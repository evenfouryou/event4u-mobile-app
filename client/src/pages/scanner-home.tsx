import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { format, isAfter, isBefore, isToday, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Calendar,
  QrCode,
  History,
  BarChart3,
  LogOut,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Ticket,
  Armchair,
  ScanLine,
  Zap,
  Sparkles,
  CalendarDays,
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

export default function ScannerHomePage() {
  const { user } = useAuth();

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/e4u/my-events'],
  });

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const now = new Date();
  
  const upcomingEvents = events?.filter(event => {
    const eventDate = parseISO(event.startDatetime);
    return isAfter(eventDate, now) || isToday(eventDate);
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
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between p-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-title">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <ScanLine className="h-5 w-5 text-white" />
              </div>
              Scanner
            </h1>
            {user && (
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-user-name">
                Ciao, {(user as any).firstName}!
              </p>
            )}
          </motion.div>
          <Button 
            variant="outline" 
            size="sm"
            className="rounded-full border-white/10"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <motion.div 
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link href="/scanner/history">
            <Card className="hover-elevate cursor-pointer h-full border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5" data-testid="card-history">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-3">
                  <History className="h-7 w-7 text-purple-400" />
                </div>
                <span className="font-semibold">Eventi Passati</span>
                <span className="text-xs text-muted-foreground mt-1">Storico scansioni</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/scanner/stats">
            <Card className="hover-elevate cursor-pointer h-full border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5" data-testid="card-stats">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-3">
                  <BarChart3 className="h-7 w-7 text-blue-400" />
                </div>
                <span className="font-semibold">Statistiche</span>
                <span className="text-xs text-muted-foreground mt-1">Riepilogo generale</span>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {todayEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold" data-testid="text-today-section">
                Eventi di Oggi
              </h2>
            </div>
            <div className="space-y-3">
              {todayEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Link href={`/scanner/scan/${event.id}`}>
                    <Card className="hover-elevate cursor-pointer border-0 bg-gradient-to-r from-emerald-500/15 to-green-500/10 shadow-lg shadow-emerald-500/5" data-testid={`card-event-today-${event.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-emerald-500 text-white border-0 px-2.5 py-0.5">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Oggi
                              </Badge>
                              <span className="text-sm font-medium text-emerald-400">
                                {format(parseISO(event.startDatetime), "HH:mm", { locale: it })}
                              </span>
                            </div>
                            <h3 className="font-bold text-lg truncate" data-testid="text-event-name">
                              {event.name}
                            </h3>
                            {event.location && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {event.location.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/30 flex items-center justify-center">
                              <QrCode className="h-6 w-6 text-emerald-400" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold" data-testid="text-upcoming-section">
              {todayEvents.length > 0 ? "Prossimi Eventi" : "Seleziona Evento"}
            </h2>
          </div>
          
          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="border-0 bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-2xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : futureEvents.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-480px)] min-h-[180px]">
              <div className="space-y-3 pr-2">
                {futureEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                  >
                    <Link href={`/scanner/scan/${event.id}`}>
                      <Card className="hover-elevate cursor-pointer border-0 bg-muted/30" data-testid={`card-event-${event.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Calendar className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">
                                  {format(parseISO(event.startDatetime), "EEEE d MMMM", { locale: it })}
                                </p>
                                <h3 className="font-semibold truncate" data-testid="text-event-name">
                                  {event.name}
                                </h3>
                                {event.location && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          ) : todayEvents.length === 0 ? (
            <Card className="border-0 bg-muted/30">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground">
                  Nessun evento disponibile
                </p>
              </CardContent>
            </Card>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
