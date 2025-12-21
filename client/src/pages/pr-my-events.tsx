import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  HapticButton, 
  MobileAppLayout, 
  MobileHeader,
  triggerHaptic 
} from "@/components/mobile-primitives";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ListChecks,
  Armchair,
  QrCode,
  ChevronRight,
  RefreshCw,
  PartyPopper,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { format, isAfter, isBefore, isToday } from "date-fns";
import { it } from "date-fns/locale";
import type { EventStaffAssignment, Event } from "@shared/schema";

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springTransition,
  },
  tap: { scale: 0.98 },
};

export default function PrMyEventsPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<"upcoming" | "past">("upcoming");

  const { data: assignments = [], isLoading: loadingAssignments, refetch, isRefetching } = useQuery<EventStaffAssignment[]>({
    queryKey: ["/api/pr/my-assignments"],
  });

  const { data: allEvents = [], isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const myEvents = useMemo(() => {
    const assignedEventIds = new Set(assignments.filter(a => a.isActive).map(a => a.eventId));
    return allEvents.filter(e => assignedEventIds.has(e.id));
  }, [allEvents, assignments]);

  const upcomingEvents = useMemo(() =>
    myEvents
      .filter(e => isAfter(new Date(e.startDatetime), new Date()) || isToday(new Date(e.startDatetime)))
      .sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()),
    [myEvents]
  );

  const pastEvents = useMemo(() =>
    myEvents
      .filter(e => isBefore(new Date(e.startDatetime), new Date()) && !isToday(new Date(e.startDatetime)))
      .sort((a, b) => new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime()),
    [myEvents]
  );

  const todayEvents = useMemo(() =>
    myEvents.filter(e => isToday(new Date(e.startDatetime))),
    [myEvents]
  );

  const getAssignmentForEvent = (eventId: string) =>
    assignments.find(a => a.eventId === eventId && a.isActive);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="text-sm">Bozza</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-sm">Programmato</Badge>;
      case 'ongoing':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-sm">In Corso</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-sm">Concluso</Badge>;
      default:
        return <Badge variant="outline" className="text-sm">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'gestore_covisione':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-sm font-semibold">Co-Visione</Badge>;
      case 'capo_staff':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-sm font-semibold">Capo Staff</Badge>;
      case 'pr':
        return <Badge className="bg-primary/20 text-primary border-primary/30 text-sm font-semibold">PR</Badge>;
      default:
        return <Badge variant="outline" className="text-sm">{role}</Badge>;
    }
  };

  const isLoading = loadingAssignments || loadingEvents;

  const displayedEvents = activeFilter === "upcoming" ? upcomingEvents : pastEvents;

  const handleRefresh = () => {
    triggerHaptic('medium');
    refetch();
  };

  const EventCard = ({ event, index }: { event: Event; index: number }) => {
    const assignment = getAssignmentForEvent(event.id);
    const eventDate = new Date(event.startDatetime);
    const isEventToday = isToday(eventDate);

    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileTap="tap"
        custom={index}
        className="w-full"
      >
        <Link href={`/pr/staff?event=${event.id}`}>
          <div 
            className={`
              relative min-h-[160px] rounded-2xl overflow-hidden
              bg-card/80 backdrop-blur-sm border border-border/50
              active:scale-[0.98] transition-transform
              ${isEventToday ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : ''}
            `}
            data-testid={`card-event-${event.id}`}
            onClick={() => triggerHaptic('light')}
          >
            {isEventToday && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-transparent" />
            )}

            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-foreground truncate">{event.name}</h3>
                  <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-base font-medium">
                      {format(eventDate, "EEE d MMM", { locale: it })}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end shrink-0">
                  {getStatusBadge(event.status)}
                  {isEventToday && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-sm font-bold animate-pulse">
                      <Sparkles className="w-3 h-3 mr-1" />
                      OGGI
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="text-base">
                    {format(eventDate, "HH:mm", { locale: it })}
                  </span>
                </div>
                {event.locationId && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="text-base truncate">{event.locationId}</span>
                  </div>
                )}
              </div>

              {assignment && (
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ruolo:</span>
                    {getRoleBadge(assignment.role)}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              )}

              {assignment?.permissions && assignment.permissions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {assignment.permissions.includes('gestione_liste') && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      <ListChecks className="w-4 h-4" />
                      <span className="text-sm font-medium">Liste</span>
                    </div>
                  )}
                  {assignment.permissions.includes('gestione_tavoli') && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400">
                      <Armchair className="w-4 h-4" />
                      <span className="text-sm font-medium">Tavoli</span>
                    </div>
                  )}
                  {assignment.permissions.includes('check_in') && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400">
                      <QrCode className="w-4 h-4" />
                      <span className="text-sm font-medium">Check-in</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4 px-4 pt-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[160px] w-full rounded-2xl" />
      ))}
    </div>
  );

  const EmptyState = ({ type }: { type: "upcoming" | "past" | "none" }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springTransition}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {type === "upcoming" && (
        <>
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
            <CalendarClock className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Nessun evento in arrivo</h3>
          <p className="text-base text-muted-foreground">
            Non hai eventi programmati per il futuro
          </p>
        </>
      )}
      {type === "past" && (
        <>
          <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Nessun evento passato</h3>
          <p className="text-base text-muted-foreground">
            Non hai ancora completato nessun evento
          </p>
        </>
      )}
      {type === "none" && (
        <>
          <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Nessun evento assegnato</h3>
          <p className="text-base text-muted-foreground">
            Non sei stato ancora assegnato a nessun evento.
            Contatta il tuo responsabile.
          </p>
        </>
      )}
    </motion.div>
  );

  const header = (
    <MobileHeader
      title="I Miei Eventi"
      leftAction={
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <PartyPopper className="w-5 h-5 text-primary" />
        </div>
      }
      rightAction={
        <HapticButton
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefetching}
          data-testid="button-refresh"
          className="w-11 h-11"
        >
          <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
        </HapticButton>
      }
      className="border-b-0"
    />
  );

  if (isLoading) {
    return (
      <MobileAppLayout header={header} noPadding>
        <LoadingSkeleton />
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout header={header} noPadding>
      <div className="flex flex-col min-h-full pb-24">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="px-4 py-4 space-y-4"
        >
          <div className="grid grid-cols-3 gap-3">
            <motion.div 
              whileTap={{ scale: 0.95 }}
              className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-border/30"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <span className="text-2xl font-bold text-foreground">{myEvents.length}</span>
                <span className="text-xs text-muted-foreground">Totali</span>
              </div>
            </motion.div>

            <motion.div 
              whileTap={{ scale: 0.95 }}
              className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-border/30"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                  <CalendarCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="text-2xl font-bold text-emerald-400">{todayEvents.length}</span>
                <span className="text-xs text-muted-foreground">Oggi</span>
              </div>
            </motion.div>

            <motion.div 
              whileTap={{ scale: 0.95 }}
              className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-border/30"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
                  <CalendarClock className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-2xl font-bold text-blue-400">{upcomingEvents.length}</span>
                <span className="text-xs text-muted-foreground">In arrivo</span>
              </div>
            </motion.div>
          </div>

          <div className="flex gap-2 p-1 bg-card/40 rounded-2xl border border-border/30">
            <HapticButton
              variant={activeFilter === "upcoming" ? "default" : "ghost"}
              className={`flex-1 h-12 rounded-xl text-base font-semibold ${
                activeFilter === "upcoming" 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : "text-muted-foreground"
              }`}
              onClick={() => setActiveFilter("upcoming")}
              data-testid="filter-upcoming"
            >
              <CalendarClock className="w-5 h-5 mr-2" />
              In Arrivo ({upcomingEvents.length})
            </HapticButton>
            <HapticButton
              variant={activeFilter === "past" ? "default" : "ghost"}
              className={`flex-1 h-12 rounded-xl text-base font-semibold ${
                activeFilter === "past" 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : "text-muted-foreground"
              }`}
              onClick={() => setActiveFilter("past")}
              data-testid="filter-past"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Passati ({pastEvents.length})
            </HapticButton>
          </div>
        </motion.div>

        <div className="flex-1 px-4">
          <AnimatePresence mode="wait">
            {myEvents.length === 0 ? (
              <EmptyState type="none" />
            ) : displayedEvents.length === 0 ? (
              <EmptyState type={activeFilter} />
            ) : (
              <motion.div
                key={activeFilter}
                initial="hidden"
                animate="animate"
                variants={staggerChildren}
                className="space-y-4"
              >
                {displayedEvents.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MobileAppLayout>
  );
}
