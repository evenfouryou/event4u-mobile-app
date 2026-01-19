import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, parseISO, isBefore, subMonths, isAfter } from "date-fns";
import { it } from "date-fns/locale";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { MobileAppLayout, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Eye,
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

export default function ScannerHistoryPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const filters: { id: FilterType; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: t('scanner.history.all'), icon: Sparkles },
    { id: 'week', label: t('scanner.history.week'), icon: CalendarDays },
    { id: 'month', label: t('scanner.history.month'), icon: Calendar },
    { id: '3months', label: t('scanner.history.threeMonths'), icon: CalendarRange },
  ];

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

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailDialogOpen(true);
  };

  const handleGoToStats = (eventId: string) => {
    setIsDetailDialogOpen(false);
    setLocation(`/scanner/stats/${eventId}`);
  };

  const stats = {
    total: pastEvents.length,
    thisWeek: pastEvents.filter(e => isAfter(parseISO(e.startDatetime), subMonths(new Date(), 0.25))).length,
    thisMonth: pastEvents.filter(e => isAfter(parseISO(e.startDatetime), subMonths(new Date(), 1))).length,
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-scanner-history">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-title">
              <History className="h-8 w-8 text-purple-400" />
              {t('scanner.history.title')}
            </h1>
            <p className="text-muted-foreground">{t('scanner.history.subtitle')}</p>
          </div>
          <Link href="/scanner">
            <Button variant="outline" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('scanner.history.backToScanner')}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">{t('scanner.history.totalEvents')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-500">{stats.thisWeek}</div>
              <p className="text-sm text-muted-foreground">{t('scanner.history.thisWeek')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-500">{stats.thisMonth}</div>
              <p className="text-sm text-muted-foreground">{t('scanner.history.thisMonth')}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{t('scanner.history.eventList')}</CardTitle>
                <CardDescription>{t('scanner.history.eventListDescription')}</CardDescription>
              </div>
              <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterType)}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter">
                  <SelectValue placeholder={t('scanner.history.period')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('scanner.history.all')}</SelectItem>
                  <SelectItem value="week">{t('scanner.history.lastWeek')}</SelectItem>
                  <SelectItem value="month">{t('scanner.history.lastMonth')}</SelectItem>
                  <SelectItem value="3months">{t('scanner.history.lastThreeMonths')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : pastEvents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('scanner.history.event')}</TableHead>
                    <TableHead>{t('scanner.history.date')}</TableHead>
                    <TableHead>{t('scanner.history.location')}</TableHead>
                    <TableHead>{t('scanner.history.status')}</TableHead>
                    <TableHead className="text-right">{t('scanner.history.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastEvents.map((event) => (
                    <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>
                        {format(parseISO(event.startDatetime), "d MMM yyyy", { locale: it })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.location?.name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t('scanner.history.concluded')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(event)}
                            data-testid={`button-view-${event.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGoToStats(event.id)}
                            data-testid={`button-stats-${event.id}`}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('scanner.history.noEventsFound')}</h3>
                <p className="text-muted-foreground text-sm">
                  {activeFilter === 'all' 
                    ? t('scanner.history.noEventsInHistory')
                    : t('scanner.history.tryDifferentPeriod')
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEvent?.name}</DialogTitle>
              <DialogDescription>{t('scanner.history.eventDetails')}</DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('scanner.history.date')}</p>
                    <p className="font-medium">
                      {format(parseISO(selectedEvent.startDatetime), "d MMMM yyyy", { locale: it })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('scanner.history.time')}</p>
                    <p className="font-medium">
                      {format(parseISO(selectedEvent.startDatetime), "HH:mm", { locale: it })}
                    </p>
                  </div>
                  {selectedEvent.location && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">{t('scanner.history.location')}</p>
                      <p className="font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {selectedEvent.location.name}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                    {t('scanner.history.close')}
                  </Button>
                  <Button onClick={() => handleGoToStats(selectedEvent.id)} data-testid="button-go-stats">
                    {t('scanner.history.viewStats')}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
            {t('scanner.history.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('scanner.history.subtitle')}
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
                                {t('scanner.history.concluded')}
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
                <h3 className="text-lg font-semibold mb-2">{t('scanner.history.noEventsFound')}</h3>
                <p className="text-muted-foreground text-sm">
                  {activeFilter === 'all' 
                    ? t('scanner.history.noEventsInHistory')
                    : t('scanner.history.tryDifferentPeriod')
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
