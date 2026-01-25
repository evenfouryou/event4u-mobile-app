import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Eye,
} from "lucide-react";
import { format, isAfter, isBefore, isToday } from "date-fns";
import { it } from "date-fns/locale";
import type { Event } from "@shared/schema";

interface MyEvent extends Event {
  assignmentType?: string;
  permissions?: {
    canAddToLists?: boolean;
    canProposeTables?: boolean;
    canManageLists?: boolean;
    canManageTables?: boolean;
    canCreatePr?: boolean;
    canApproveTables?: boolean;
  };
}

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
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [activeFilter, setActiveFilter] = useState<"upcoming" | "past">("upcoming");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="text-sm">{t('pr.status.draft')}</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-sm">{t('pr.status.scheduled')}</Badge>;
      case 'ongoing':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-sm">{t('pr.status.ongoing')}</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-sm">{t('pr.status.closed')}</Badge>;
      default:
        return <Badge variant="outline" className="text-sm">{status}</Badge>;
    }
  };

  const getAssignmentTypeBadge = (type?: string) => {
    switch (type) {
      case 'owner':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-sm font-semibold">{t('pr.roles.owner')}</Badge>;
      case 'staff':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-sm font-semibold">{t('pr.roles.staff')}</Badge>;
      case 'pr':
        return <Badge className="bg-primary/20 text-primary border-primary/30 text-sm font-semibold">{t('pr.roles.pr')}</Badge>;
      default:
        return type ? <Badge variant="outline" className="text-sm">{type}</Badge> : null;
    }
  };

  const displayedEvents = activeFilter === "upcoming" ? upcomingEvents : pastEvents;

  const handleRefresh = () => {
    triggerHaptic('medium');
    refetch();
  };

  const EventCard = ({ event, index }: { event: MyEvent; index: number }) => {
    const eventDate = new Date(event.startDatetime);
    const isEventToday = isToday(eventDate);
    const hasPermissions = event.permissions && (event.permissions.canManageLists || event.permissions.canManageTables || event.permissions.canAddToLists);

    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileTap="tap"
        custom={index}
        className="w-full"
      >
        <Link href={`/pr/events/${event.id}`}>
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
                      {t('pr.today').toUpperCase()}
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

              {event.assignmentType && (
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t('pr.tableHeaders.role')}:</span>
                    {getAssignmentTypeBadge(event.assignmentType)}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              )}

              {hasPermissions && (
                <div className="flex flex-wrap gap-2">
                  {event.permissions?.canManageLists && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      <ListChecks className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('pr.lists')}</span>
                    </div>
                  )}
                  {event.permissions?.canManageTables && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400">
                      <Armchair className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('pr.tables')}</span>
                    </div>
                  )}
                  {event.permissions?.canAddToLists && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400">
                      <ListChecks className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('pr.addLists')}</span>
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
          <h3 className="text-xl font-bold text-foreground mb-2">{t('pr.noUpcomingEventsTitle')}</h3>
          <p className="text-base text-muted-foreground">
            {t('pr.noUpcomingEventsDescription')}
          </p>
        </>
      )}
      {type === "past" && (
        <>
          <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{t('pr.noPastEventsTitle')}</h3>
          <p className="text-base text-muted-foreground">
            {t('pr.noPastEventsDescription')}
          </p>
        </>
      )}
      {type === "none" && (
        <>
          <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{t('pr.noEventsTitle')}</h3>
          <p className="text-base text-muted-foreground">
            {t('pr.noAssignedEventsMessage')}
          </p>
        </>
      )}
    </motion.div>
  );

  const header = (
    <MobileHeader
      title={t('pr.myEvents')}
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

  const openEventDetail = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailDialogOpen(true);
  };

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-pr-my-events">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('pr.myEvents')}</h1>
            <p className="text-muted-foreground">{t('pr.eventsAssignedAsPr')}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => refetch()} 
            disabled={isRefetching}
            data-testid="button-refresh-desktop"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{myEvents.length}</div>
                  <p className="text-sm text-muted-foreground">{t('pr.stats.total')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CalendarCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{todayEvents.length}</div>
                  <p className="text-sm text-muted-foreground">{t('pr.stats.today')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <CalendarClock className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">{upcomingEvents.length}</div>
                  <p className="text-sm text-muted-foreground">{t('pr.stats.upcoming')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{pastEvents.length}</div>
                  <p className="text-sm text-muted-foreground">{t('pr.stats.past')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <Button
            variant={activeFilter === "upcoming" ? "default" : "outline"}
            onClick={() => setActiveFilter("upcoming")}
            data-testid="filter-upcoming-desktop"
          >
            <CalendarClock className="w-4 h-4 mr-2" />
            {t('pr.stats.upcoming')} ({upcomingEvents.length})
          </Button>
          <Button
            variant={activeFilter === "past" ? "default" : "outline"}
            onClick={() => setActiveFilter("past")}
            data-testid="filter-past-desktop"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {t('pr.stats.past')} ({pastEvents.length})
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {activeFilter === "upcoming" ? t('pr.upcomingEventsTitle') : t('pr.pastEventsTitle')}
            </CardTitle>
            <CardDescription>
              {activeFilter === "upcoming" 
                ? t('pr.upcomingEventsDescription') 
                : t('pr.pastEventsDescription')
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : displayedEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {myEvents.length === 0 
                  ? t('pr.noAssignedEventsMessage')
                  : activeFilter === "upcoming" 
                    ? t('pr.noUpcomingEventsTitle')
                    : t('pr.noPastEventsTitle')
                }
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('pr.tableHeaders.event')}</TableHead>
                    <TableHead>{t('pr.tableHeaders.date')}</TableHead>
                    <TableHead>{t('pr.tableHeaders.time')}</TableHead>
                    <TableHead>{t('pr.tableHeaders.status')}</TableHead>
                    <TableHead>{t('pr.tableHeaders.role')}</TableHead>
                    <TableHead>{t('pr.tableHeaders.permissions')}</TableHead>
                    <TableHead className="text-right">{t('pr.tableHeaders.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedEvents.map((event: MyEvent) => {
                    const eventDate = new Date(event.startDatetime);
                    const isEventToday = isToday(eventDate);
                    
                    return (
                      <TableRow 
                        key={event.id} 
                        className={isEventToday ? "bg-primary/5" : ""}
                        data-testid={`row-event-${event.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{event.name}</span>
                            {isEventToday && (
                              <Badge className="bg-primary/20 text-primary border-primary/30">
                                <Sparkles className="w-3 h-3 mr-1" />
                                {t('pr.today').toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(eventDate, "EEE d MMM yyyy", { locale: it })}
                        </TableCell>
                        <TableCell>{format(eventDate, "HH:mm", { locale: it })}</TableCell>
                        <TableCell>{getStatusBadge(event.status)}</TableCell>
                        <TableCell>{event.assignmentType && getAssignmentTypeBadge(event.assignmentType)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {event.permissions?.canManageLists && (
                              <Badge variant="outline" className="text-xs">
                                <ListChecks className="w-3 h-3 mr-1" />
                                {t('pr.lists')}
                              </Badge>
                            )}
                            {event.permissions?.canManageTables && (
                              <Badge variant="outline" className="text-xs">
                                <Armchair className="w-3 h-3 mr-1" />
                                {t('pr.tables')}
                              </Badge>
                            )}
                            {event.permissions?.canAddToLists && (
                              <Badge variant="outline" className="text-xs">
                                <ListChecks className="w-3 h-3 mr-1" />
                                {t('pr.addPermission')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => openEventDetail(event)}
                              data-testid={`button-view-${event.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Link href={`/events/${event.id}/panel`}>
                              <Button size="sm" data-testid={`button-open-${event.id}`}>
                                {t('pr.open')}
                                <ChevronRight className="w-4 h-4 ml-1" />
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
              <DialogDescription>{t('pr.eventDetails')}</DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pr.tableHeaders.date')}</p>
                    <p className="font-medium">
                      {format(new Date(selectedEvent.startDatetime), "EEEE d MMMM yyyy", { locale: it })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pr.tableHeaders.time')}</p>
                    <p className="font-medium">
                      {format(new Date(selectedEvent.startDatetime), "HH:mm", { locale: it })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pr.tableHeaders.status')}</p>
                    <div className="mt-1">{getStatusBadge(selectedEvent.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pr.tableHeaders.role')}</p>
                    <div className="mt-1">
                      {(selectedEvent as MyEvent).assignmentType && getAssignmentTypeBadge((selectedEvent as MyEvent).assignmentType)}
                    </div>
                  </div>
                </div>
                
                {(selectedEvent as MyEvent).permissions && (
                  (selectedEvent as MyEvent).permissions!.canManageLists || 
                  (selectedEvent as MyEvent).permissions!.canManageTables || 
                  (selectedEvent as MyEvent).permissions!.canAddToLists
                ) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t('pr.permissions')}</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedEvent as MyEvent).permissions?.canManageLists && (
                        <Badge variant="outline">
                          <ListChecks className="w-3 h-3 mr-1" />{t('pr.manageLists')}
                        </Badge>
                      )}
                      {(selectedEvent as MyEvent).permissions?.canManageTables && (
                        <Badge variant="outline">
                          <Armchair className="w-3 h-3 mr-1" />{t('pr.manageTables')}
                        </Badge>
                      )}
                      {(selectedEvent as MyEvent).permissions?.canAddToLists && (
                        <Badge variant="outline">
                          <ListChecks className="w-3 h-3 mr-1" />{t('pr.addLists')}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t flex gap-2">
                  <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                    {t('common.close')}
                  </Button>
                  <Link href={`/events/${selectedEvent.id}/panel`}>
                    <Button>
                      {t('pr.openEvent')}
                      <ChevronRight className="w-4 h-4 ml-1" />
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <motion.div 
              whileTap={{ scale: 0.95 }}
              className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-border/30"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <span className="text-2xl font-bold text-foreground">{myEvents.length}</span>
                <span className="text-xs text-muted-foreground">{t('pr.stats.total')}</span>
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
                <span className="text-xs text-muted-foreground">{t('pr.stats.today')}</span>
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
                <span className="text-xs text-muted-foreground">{t('pr.stats.upcoming')}</span>
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
              {t('pr.stats.upcoming')} ({upcomingEvents.length})
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
              {t('pr.stats.past')} ({pastEvents.length})
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
