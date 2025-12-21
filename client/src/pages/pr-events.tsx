import { useState, useMemo, useCallback } from "react";
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
  triggerHaptic,
  BottomSheet,
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
  Filter,
  X,
  Star,
  Ticket,
} from "lucide-react";
import { format, isAfter, isBefore, isToday, isTomorrow, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import type { EventStaffAssignment, Event } from "@shared/schema";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.92 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springTransition,
  },
  tap: { scale: 0.97 },
};

const fadeSlide = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: springTransition },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

type FilterType = "all" | "upcoming" | "today" | "past";

export default function PrEventsPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>("upcoming");
  const [showFilterSheet, setShowFilterSheet] = useState(false);

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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return { label: 'Bozza', bgClass: 'bg-muted/30', textClass: 'text-muted-foreground', borderClass: 'border-muted' };
      case 'scheduled':
        return { label: 'Programmato', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400', borderClass: 'border-blue-500/30' };
      case 'ongoing':
        return { label: 'In Corso', bgClass: 'bg-emerald-500/20', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/30' };
      case 'closed':
        return { label: 'Concluso', bgClass: 'bg-gray-500/20', textClass: 'text-gray-400', borderClass: 'border-gray-500/30' };
      default:
        return { label: status, bgClass: 'bg-muted/30', textClass: 'text-muted-foreground', borderClass: 'border-muted' };
    }
  };

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'gestore_covisione':
        return { label: 'Co-Visione', bgClass: 'bg-purple-500/20', textClass: 'text-purple-400', borderClass: 'border-purple-500/30' };
      case 'capo_staff':
        return { label: 'Capo Staff', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400', borderClass: 'border-blue-500/30' };
      case 'pr':
        return { label: 'PR', bgClass: 'bg-primary/20', textClass: 'text-primary', borderClass: 'border-primary/30' };
      default:
        return { label: role, bgClass: 'bg-muted/30', textClass: 'text-muted-foreground', borderClass: 'border-muted' };
    }
  };

  const getTimeLabel = (date: Date) => {
    if (isToday(date)) return 'Oggi';
    if (isTomorrow(date)) return 'Domani';
    const days = differenceInDays(date, new Date());
    if (days > 0 && days <= 7) return `Tra ${days} giorni`;
    return null;
  };

  const isLoading = loadingAssignments || loadingEvents;

  const displayedEvents = useMemo(() => {
    switch (activeFilter) {
      case "today":
        return todayEvents;
      case "upcoming":
        return upcomingEvents;
      case "past":
        return pastEvents;
      case "all":
      default:
        return myEvents;
    }
  }, [activeFilter, todayEvents, upcomingEvents, pastEvents, myEvents]);

  const handleRefresh = useCallback(() => {
    triggerHaptic('medium');
    refetch();
  }, [refetch]);

  const handleFilterChange = useCallback((filter: FilterType) => {
    triggerHaptic('light');
    setActiveFilter(filter);
    setShowFilterSheet(false);
  }, []);

  const EventCard = ({ event, index }: { event: Event; index: number }) => {
    const assignment = getAssignmentForEvent(event.id);
    const eventDate = new Date(event.startDatetime);
    const isEventToday = isToday(eventDate);
    const statusConfig = getStatusConfig(event.status);
    const roleConfig = assignment ? getRoleConfig(assignment.role) : null;
    const timeLabel = getTimeLabel(eventDate);

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
              relative rounded-3xl overflow-hidden
              bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-xl
              border border-white/10
              active:scale-[0.97] transition-transform
              ${isEventToday ? 'ring-2 ring-primary shadow-2xl shadow-primary/30' : 'shadow-xl'}
            `}
            data-testid={`card-event-${event.id}`}
            onClick={() => triggerHaptic('light')}
          >
            {isEventToday && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary/80 to-transparent" 
              />
            )}

            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-bold text-foreground leading-tight line-clamp-2">{event.name}</h3>
                  
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-lg font-semibold text-foreground">
                        {format(eventDate, "EEE d MMM", { locale: it })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 items-end shrink-0">
                  <Badge 
                    className={`${statusConfig.bgClass} ${statusConfig.textClass} ${statusConfig.borderClass} text-sm px-3 py-1.5 font-semibold`}
                  >
                    {statusConfig.label}
                  </Badge>
                  
                  {timeLabel && (
                    <Badge 
                      className={`
                        ${isEventToday 
                          ? 'bg-primary/20 text-primary border-primary/30' 
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        } text-sm px-3 py-1.5 font-bold
                      `}
                    >
                      {isEventToday && <Sparkles className="w-3 h-3 mr-1.5" />}
                      {timeLabel}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2 text-muted-foreground min-h-[44px]">
                  <Clock className="w-5 h-5 shrink-0" />
                  <span className="text-lg font-medium">
                    {format(eventDate, "HH:mm", { locale: it })}
                  </span>
                </div>
                {event.locationId && (
                  <div className="flex items-center gap-2 text-muted-foreground min-h-[44px]">
                    <MapPin className="w-5 h-5 shrink-0" />
                    <span className="text-lg font-medium truncate">{event.locationId}</span>
                  </div>
                )}
              </div>

              {roleConfig && (
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-3 min-h-[44px]">
                    <span className="text-base text-muted-foreground">Ruolo:</span>
                    <Badge 
                      className={`${roleConfig.bgClass} ${roleConfig.textClass} ${roleConfig.borderClass} text-base px-4 py-2 font-bold`}
                    >
                      {roleConfig.label}
                    </Badge>
                  </div>
                  <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center">
                    <ChevronRight className="w-6 h-6 text-muted-foreground" />
                  </div>
                </div>
              )}

              {assignment?.permissions && assignment.permissions.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {assignment.permissions.includes('gestione_liste') && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 min-h-[44px]">
                      <ListChecks className="w-5 h-5" />
                      <span className="text-base font-semibold">Liste</span>
                    </div>
                  )}
                  {assignment.permissions.includes('gestione_tavoli') && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-500/10 text-blue-400 min-h-[44px]">
                      <Armchair className="w-5 h-5" />
                      <span className="text-base font-semibold">Tavoli</span>
                    </div>
                  )}
                  {assignment.permissions.includes('check_in') && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-500/10 text-purple-400 min-h-[44px]">
                      <QrCode className="w-5 h-5" />
                      <span className="text-base font-semibold">Check-in</span>
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

  const StatsCard = ({ 
    icon: Icon, 
    value, 
    label, 
    iconBg, 
    iconColor, 
    valueColor = 'text-foreground' 
  }: { 
    icon: React.ElementType; 
    value: number; 
    label: string; 
    iconBg: string; 
    iconColor: string;
    valueColor?: string;
  }) => (
    <motion.div 
      whileTap={{ scale: 0.95 }}
      transition={springTransition}
      className="bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-xl rounded-3xl p-5 border border-white/10 shadow-lg"
    >
      <div className="flex flex-col items-center text-center gap-3">
        <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-7 h-7 ${iconColor}`} />
        </div>
        <div className="space-y-1">
          <span className={`text-3xl font-bold ${valueColor}`}>{value}</span>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
        </div>
      </div>
    </motion.div>
  );

  const FilterPill = ({ 
    filter, 
    label, 
    count,
    icon: Icon 
  }: { 
    filter: FilterType; 
    label: string; 
    count: number;
    icon: React.ElementType;
  }) => {
    const isActive = activeFilter === filter;
    return (
      <HapticButton
        variant={isActive ? "default" : "ghost"}
        onClick={() => handleFilterChange(filter)}
        className={`
          flex-1 h-14 rounded-2xl text-base font-bold gap-2
          ${isActive 
            ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/30' 
            : 'bg-card/40 text-muted-foreground border border-white/10'
          }
        `}
        data-testid={`filter-${filter}`}
      >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
        <Badge 
          variant="secondary" 
          className={`ml-1 ${isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}
        >
          {count}
        </Badge>
      </HapticButton>
    );
  };

  const LoadingSkeleton = () => (
    <div className="space-y-5 px-4 pt-4">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-3xl" />
        ))}
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-14 flex-1 rounded-2xl" />
        <Skeleton className="h-14 flex-1 rounded-2xl" />
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-48 w-full rounded-3xl" />
      ))}
    </div>
  );

  const EmptyState = ({ type }: { type: FilterType }) => {
    const configs = {
      all: {
        icon: Users,
        iconBg: 'bg-muted/20',
        iconColor: 'text-muted-foreground',
        title: 'Nessun evento assegnato',
        description: 'Non sei stato ancora assegnato a nessun evento. Contatta il tuo responsabile.',
      },
      upcoming: {
        icon: CalendarClock,
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-400',
        title: 'Nessun evento in arrivo',
        description: 'Non hai eventi programmati per il futuro.',
      },
      today: {
        icon: Sparkles,
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
        title: 'Nessun evento oggi',
        description: 'Non hai eventi programmati per oggi.',
      },
      past: {
        icon: CheckCircle2,
        iconBg: 'bg-purple-500/10',
        iconColor: 'text-purple-400',
        title: 'Nessun evento passato',
        description: 'Non hai ancora completato nessun evento.',
      },
    };

    const config = configs[type];

    return (
      <motion.div
        {...fadeSlide}
        className="flex flex-col items-center justify-center py-20 px-8 text-center"
      >
        <div className={`w-24 h-24 rounded-3xl ${config.iconBg} flex items-center justify-center mb-8`}>
          <config.icon className={`w-12 h-12 ${config.iconColor}`} />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-3">{config.title}</h3>
        <p className="text-lg text-muted-foreground max-w-xs">{config.description}</p>
      </motion.div>
    );
  };

  const header = (
    <MobileHeader
      title="I Miei Eventi"
      leftAction={
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
          <PartyPopper className="w-6 h-6 text-primary" />
        </div>
      }
      rightAction={
        <HapticButton
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefetching}
          data-testid="button-refresh"
          className="w-11 h-11 rounded-2xl"
        >
          <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
        </HapticButton>
      }
      className="border-b-0 bg-transparent"
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
          className="px-4 py-4 space-y-5"
        >
          <div className="grid grid-cols-3 gap-4">
            <StatsCard
              icon={Calendar}
              value={myEvents.length}
              label="Totali"
              iconBg="bg-primary/10"
              iconColor="text-primary"
            />
            <StatsCard
              icon={Sparkles}
              value={todayEvents.length}
              label="Oggi"
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-400"
              valueColor="text-emerald-400"
            />
            <StatsCard
              icon={CalendarClock}
              value={upcomingEvents.length}
              label="In Arrivo"
              iconBg="bg-blue-500/10"
              iconColor="text-blue-400"
              valueColor="text-blue-400"
            />
          </div>

          <div className="flex gap-3">
            <FilterPill 
              filter="upcoming" 
              label="Prossimi" 
              count={upcomingEvents.length}
              icon={CalendarClock}
            />
            <FilterPill 
              filter="past" 
              label="Passati" 
              count={pastEvents.length}
              icon={CheckCircle2}
            />
          </div>
        </motion.div>

        <div className="flex-1 px-4">
          <AnimatePresence mode="wait">
            {myEvents.length === 0 ? (
              <EmptyState type="all" />
            ) : displayedEvents.length === 0 ? (
              <EmptyState type={activeFilter} />
            ) : (
              <motion.div
                key={activeFilter}
                initial="hidden"
                animate="animate"
                variants={staggerChildren}
                className="space-y-5"
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
