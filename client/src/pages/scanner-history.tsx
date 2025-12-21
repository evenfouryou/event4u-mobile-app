import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isBefore, subMonths, isAfter } from "date-fns";
import { it } from "date-fns/locale";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { MobileAppLayout, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import {
  ArrowLeft,
  History,
  Calendar,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Clock,
  Filter,
  CalendarDays,
  CalendarRange,
  Sparkles,
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

type FilterType = 'all' | 'week' | 'month' | '3months';

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const filters: { id: FilterType; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Tutti', icon: Sparkles },
  { id: 'week', label: 'Settimana', icon: CalendarDays },
  { id: 'month', label: 'Mese', icon: Calendar },
  { id: '3months', label: '3 Mesi', icon: CalendarRange },
];

export default function ScannerHistoryPage() {
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const now = new Date();
  
  const pastEvents = events?.filter(event => {
    const eventDate = parseISO(event.startDatetime);
    if (!isBefore(eventDate, now) || event.status !== 'closed') return false;
    
    switch (activeFilter) {
      case 'week':
        return isAfter(eventDate, subMonths(now, 0.25));
      case 'month':
        return isAfter(eventDate, subMonths(now, 1));
      case '3months':
        return isAfter(eventDate, subMonths(now, 3));
      default:
        return true;
    }
  }).sort((a, b) => 
    new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime()
  ) || [];

  const handleFilterChange = (filter: FilterType) => {
    triggerHaptic('light');
    setActiveFilter(filter);
  };

  const handleEventClick = (eventId: string) => {
    triggerHaptic('medium');
    setLocation(`/scanner/stats/${eventId}`);
  };

  const header = (
    <div className="bg-background/90 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-4 px-4 py-4">
        <Link href="/scanner">
          <HapticButton 
            variant="ghost" 
            size="icon" 
            className="h-11 w-11 rounded-full bg-muted/30"
            hapticType="light"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </HapticButton>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-title">
            <History className="h-6 w-6 text-purple-400" />
            Eventi Passati
          </h1>
          <p className="text-sm text-muted-foreground">
            Storico degli eventi scansionati
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;
            return (
              <motion.button
                key={filter.id}
                onClick={() => handleFilterChange(filter.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-full shrink-0
                  min-h-[44px] min-w-[44px] font-medium text-sm
                  transition-colors
                  ${isActive 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-muted/30 text-muted-foreground'
                  }
                `}
                whileTap={{ scale: 0.95 }}
                transition={springTransition}
                data-testid={`filter-${filter.id}`}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <MobileAppLayout
      header={header}
      className="bg-gradient-to-b from-background to-background/95"
      contentClassName="pb-24"
    >
      <div className="py-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="border-0 bg-muted/20 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-6 w-40" />
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pastEvents.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {pastEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{
                    ...springTransition,
                    delay: index * 0.05,
                  }}
                  layout
                >
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    transition={springTransition}
                  >
                    <Card 
                      className="border-0 bg-muted/20 overflow-hidden cursor-pointer active:bg-muted/30 transition-colors"
                      onClick={() => handleEventClick(event.id)}
                      data-testid={`card-event-${event.id}`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <motion.div 
                              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-purple-600/20 flex items-center justify-center shrink-0"
                              whileHover={{ rotate: 5 }}
                              transition={springTransition}
                            >
                              <Calendar className="h-7 w-7 text-purple-400" />
                            </motion.div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs px-3 py-1">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                Concluso
                              </Badge>
                              <h3 className="text-lg font-semibold leading-tight" data-testid="text-event-name">
                                {event.name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-4 w-4" />
                                  {format(parseISO(event.startDatetime), "d MMM yyyy", { locale: it })}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1.5 truncate">
                                    <MapPin className="h-4 w-4" />
                                    {event.location.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-center h-11 w-11 rounded-full bg-muted/30 shrink-0">
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
          >
            <Card className="border-0 bg-muted/20">
              <CardContent className="py-16 text-center">
                <motion.div 
                  className="w-20 h-20 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-6"
                  animate={{ 
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <History className="h-10 w-10 text-muted-foreground/40" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">Nessun evento trovato</h3>
                <p className="text-muted-foreground text-sm">
                  {activeFilter === 'all' 
                    ? "Non ci sono eventi passati nel tuo storico"
                    : "Prova a selezionare un periodo diverso"
                  }
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </MobileAppLayout>
  );
}
