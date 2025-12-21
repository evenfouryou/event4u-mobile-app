import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, isBefore } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  History,
  Calendar,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Users,
  Ticket,
  Armchair,
  Clock,
} from "lucide-react";

interface Event {
  id: string;
  name: string;
  startDatetime: string;
  endDatetime?: string;
  status: string;
  location?: {
    name: string;
  };
}

export default function ScannerHistoryPage() {
  const { user } = useAuth();

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const now = new Date();
  
  const pastEvents = events?.filter(event => {
    const eventDate = parseISO(event.startDatetime);
    return isBefore(eventDate, now) && event.status === 'closed';
  }).sort((a, b) => 
    new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime()
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3 p-4">
          <Link href="/scanner">
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2" data-testid="text-title">
              <History className="h-5 w-5 text-purple-400" />
              Eventi Passati
            </h1>
            <p className="text-xs text-muted-foreground">
              Storico degli eventi scansionati
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
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
        ) : pastEvents.length > 0 ? (
          <ScrollArea className="h-[calc(100vh-150px)]">
            <div className="space-y-3 pr-2">
              {pastEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/scanner/stats/${event.id}`}>
                    <Card className="hover-elevate cursor-pointer border-0 bg-muted/30" data-testid={`card-event-${event.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center shrink-0">
                              <Calendar className="h-5 w-5 text-purple-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs px-2 py-0.5">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Concluso
                                </Badge>
                              </div>
                              <h3 className="font-semibold truncate" data-testid="text-event-name">
                                {event.name}
                              </h3>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(parseISO(event.startDatetime), "d MMM yyyy", { locale: it })}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="h-3 w-3" />
                                    {event.location.name}
                                  </span>
                                )}
                              </div>
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
        ) : (
          <Card className="border-0 bg-muted/30">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <History className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground">
                Nessun evento passato trovato
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
