import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Event } from "@shared/schema";

interface MyEvent extends Event {
  assignmentType?: string;
  permissions?: {
    canAddToLists?: boolean;
    canProposeTables?: boolean;
    canManageLists?: boolean;
    canManageTables?: boolean;
  };
}

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
  const isMobile = useIsMobile();
  const [activeFilter, setActiveFilter] = useState<FilterType>("upcoming");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Use the unified E4U system which returns events with permissions
  const { data: myEvents = [], isLoading, refetch, isRefetching } = useQuery<MyEvent[]>({
    queryKey: ["/api/e4u/my-events"],
  });

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

  // Get event with permissions from the unified response
  const getEventWithPermissions = (eventId: string): MyEvent | undefined =>
    myEvents.find(e => e.id === eventId);

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

  const EventCard = ({ event, index }: { event: MyEvent; index: number }) => {
    const eventDate = new Date(event.startDatetime);
    const isEventToday = isToday(eventDate);
    const statusConfig = getStatusConfig(event.status);
    const roleConfig = event.assignmentType ? getRoleConfig(event.assignmentType) : null;
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
        <Link href={`/events/${event.id}/panel`}>
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

              {event.permissions && (event.permissions.canAddToLists || event.permissions.canProposeTables || event.permissions.canManageLists || event.permissions.canManageTables) && (
                <div className="flex flex-wrap gap-3">
                  {(event.permissions.canAddToLists || event.permissions.canManageLists) && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 min-h-[44px]">
                      <ListChecks className="w-5 h-5" />
                      <span className="text-base font-semibold">Liste</span>
                    </div>
                  )}
                  {(event.permissions.canProposeTables || event.permissions.canManageTables) && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-500/10 text-blue-400 min-h-[44px]">
                      <Armchair className="w-5 h-5" />
                      <span className="text-base font-semibold">Tavoli</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

  const handleViewEventDetail = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailDialogOpen(true);
  };

  if (isLoading) {
    if (!isMobile) {
      return (
        <div className="container mx-auto p-6 space-y-6" data-testid="page-pr-events">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      );
    }
    return (
      <MobileAppLayout header={header} noPadding>
        <LoadingSkeleton />
      </MobileAppLayout>
    );
  }

  if (!isMobile) {
    const selectedEventData = selectedEvent ? getEventWithPermissions(selectedEvent.id) : null;
    const selectedEventRoleConfig = selectedEventData?.assignmentType ? getRoleConfig(selectedEventData.assignmentType) : null;

    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-pr-events">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">I Miei Eventi</h1>
            <p className="text-muted-foreground">Eventi a cui sei stato assegnato come staff</p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{myEvents.length}</div>
                  <p className="text-sm text-muted-foreground">Totali</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{todayEvents.length}</div>
                  <p className="text-sm text-muted-foreground">Oggi</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">{upcomingEvents.length}</div>
                  <p className="text-sm text-muted-foreground">In Arrivo</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{pastEvents.length}</div>
                  <p className="text-sm text-muted-foreground">Passati</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>Eventi Assegnati</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={activeFilter === "upcoming" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("upcoming")}
                  data-testid="filter-upcoming"
                >
                  <CalendarClock className="w-4 h-4 mr-2" />
                  Prossimi ({upcomingEvents.length})
                </Button>
                <Button
                  variant={activeFilter === "today" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("today")}
                  data-testid="filter-today"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Oggi ({todayEvents.length})
                </Button>
                <Button
                  variant={activeFilter === "past" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("past")}
                  data-testid="filter-past"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Passati ({pastEvents.length})
                </Button>
                <Button
                  variant={activeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("all")}
                  data-testid="filter-all"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Tutti ({myEvents.length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {displayedEvents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nessun evento</h3>
                <p className="text-muted-foreground">
                  {activeFilter === "all" 
                    ? "Non sei stato ancora assegnato a nessun evento."
                    : `Non ci sono eventi ${activeFilter === "upcoming" ? "in arrivo" : activeFilter === "today" ? "oggi" : "passati"}.`}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Orario</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Permessi</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedEvents.map((event) => {
                    const eventDate = new Date(event.startDatetime);
                    const isEventToday = isToday(eventDate);
                    const statusConfig = getStatusConfig(event.status);
                    const roleConfig = event.assignmentType ? getRoleConfig(event.assignmentType) : null;
                    const timeLabel = getTimeLabel(eventDate);

                    return (
                      <TableRow 
                        key={event.id}
                        className={isEventToday ? "bg-primary/5" : ""}
                        data-testid={`row-event-${event.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="font-semibold">{event.name}</div>
                            {timeLabel && (
                              <Badge 
                                className={
                                  isEventToday 
                                    ? 'bg-primary/20 text-primary border-primary/30' 
                                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                }
                              >
                                {isEventToday && <Sparkles className="w-3 h-3 mr-1" />}
                                {timeLabel}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {format(eventDate, "EEE d MMM yyyy", { locale: it })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {format(eventDate, "HH:mm", { locale: it })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {roleConfig && (
                            <Badge className={`${roleConfig.bgClass} ${roleConfig.textClass} ${roleConfig.borderClass}`}>
                              {roleConfig.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig.bgClass} ${statusConfig.textClass} ${statusConfig.borderClass}`}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(event.permissions?.canAddToLists || event.permissions?.canManageLists) && (
                              <Badge variant="secondary" className="text-xs">
                                <ListChecks className="w-3 h-3 mr-1" />
                                Liste
                              </Badge>
                            )}
                            {(event.permissions?.canProposeTables || event.permissions?.canManageTables) && (
                              <Badge variant="secondary" className="text-xs">
                                <Armchair className="w-3 h-3 mr-1" />
                                Tavoli
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewEventDetail(event)}
                              data-testid={`button-view-${event.id}`}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Link href={`/events/${event.id}/panel`}>
                              <Button size="sm" data-testid={`button-open-${event.id}`}>
                                Apri
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedEvent?.name}</DialogTitle>
              <DialogDescription>Dettagli dell'evento e del tuo ruolo</DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Data</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(selectedEvent.startDatetime), "EEEE d MMMM yyyy", { locale: it })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Orario</p>
                    <p className="font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {format(new Date(selectedEvent.startDatetime), "HH:mm", { locale: it })}
                    </p>
                  </div>
                </div>

                {selectedEvent.locationId && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {selectedEvent.locationId}
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Stato Evento</p>
                  <Badge className={`${getStatusConfig(selectedEvent.status).bgClass} ${getStatusConfig(selectedEvent.status).textClass}`}>
                    {getStatusConfig(selectedEvent.status).label}
                  </Badge>
                </div>

                {selectedEventRoleConfig && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Il Tuo Ruolo</p>
                    <Badge className={`${selectedEventRoleConfig.bgClass} ${selectedEventRoleConfig.textClass} ${selectedEventRoleConfig.borderClass}`}>
                      {selectedEventRoleConfig.label}
                    </Badge>
                  </div>
                )}

                {selectedEventData?.permissions && (selectedEventData.permissions.canAddToLists || selectedEventData.permissions.canProposeTables || selectedEventData.permissions.canManageLists || selectedEventData.permissions.canManageTables) && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">I Tuoi Permessi</p>
                    <div className="flex gap-2 flex-wrap">
                      {(selectedEventData.permissions.canAddToLists || selectedEventData.permissions.canManageLists) && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          <ListChecks className="w-3 h-3 mr-1" />
                          Gestione Liste
                        </Badge>
                      )}
                      {(selectedEventData.permissions.canProposeTables || selectedEventData.permissions.canManageTables) && (
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                          <Armchair className="w-3 h-3 mr-1" />
                          Gestione Tavoli
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Link href={`/events/${selectedEvent.id}/panel`}>
                    <Button data-testid="button-open-event">
                      Vai all'Evento
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
