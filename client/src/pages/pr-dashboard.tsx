import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  Calendar, 
  Users, 
  CheckCircle2, 
  Armchair, 
  ArrowRight,
  Clock,
  MapPin,
  UserPlus,
  QrCode,
  ListChecks,
  TrendingUp,
  ChevronRight,
  Star,
  Target,
  Activity,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { it } from "date-fns/locale";
import type { Event } from "@shared/schema";
import { 
  MobileAppLayout, 
  MobileHeader, 
  HapticButton, 
  triggerHaptic 
} from "@/components/mobile-primitives";
import { cn } from "@/lib/utils";

interface EventWithAssignment extends Event {
  assignmentType: 'owner' | 'staff' | 'pr' | 'scanner';
  permissions: {
    canManageLists?: boolean;
    canManageTables?: boolean;
    canCreatePr?: boolean;
    canApproveTables?: boolean;
    canAddToLists?: boolean;
    canProposeTables?: boolean;
    canScanLists?: boolean;
    canScanTables?: boolean;
    canScanTickets?: boolean;
  };
  staffUserId?: string;
}

interface MyStats {
  entriesCreated: number;
  checkIns: number;
  tablesProposed: number;
  activeEvents: number;
}

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: springConfig,
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { 
    opacity: 1, 
    scale: 1,
    transition: springConfig,
  },
};

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend,
  gradient,
  isLoading,
  testId,
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  trend?: { value: number; isPositive: boolean };
  gradient: string;
  isLoading?: boolean;
  testId: string;
}) {
  return (
    <motion.div 
      variants={scaleIn}
      whileTap={{ scale: 0.97 }}
      className="touch-manipulation"
      onClick={() => triggerHaptic('light')}
    >
      <Card className="glass-card border-white/10 min-h-[140px]">
        <CardContent className="p-5 h-full flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
              <Icon className="h-7 w-7 text-white" />
            </div>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium min-h-[28px]",
                trend.isPositive 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/20 text-red-400"
              )}>
                <TrendingUp className={cn("h-3 w-3", !trend.isPositive && "rotate-180")} />
                {trend.value}%
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-muted-foreground text-base">{label}</p>
            {isLoading ? (
              <Skeleton className="h-10 w-20 mt-1" />
            ) : (
              <p className="text-4xl font-bold tabular-nums mt-1" data-testid={testId}>
                {value}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QuickActionCard({
  icon: Icon,
  label,
  description,
  onClick,
  gradient,
  disabled,
  testId,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick: () => void;
  gradient: string;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <motion.div variants={scaleIn} whileTap={!disabled ? { scale: 0.96 } : undefined}>
      <HapticButton
        variant="ghost"
        className={cn(
          "w-full h-auto flex flex-col items-center gap-3 py-6 px-4",
          "bg-gradient-to-br border-0 rounded-3xl min-h-[130px] shadow-lg",
          gradient,
          disabled && "opacity-50"
        )}
        hapticType="medium"
        onClick={onClick}
        disabled={disabled}
        data-testid={testId}
      >
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div className="text-center">
          <span className="text-base font-semibold text-white block">{label}</span>
          {description && (
            <span className="text-xs text-white/70 mt-0.5 block">{description}</span>
          )}
        </div>
      </HapticButton>
    </motion.div>
  );
}

function EventCard({
  event,
  onNavigate,
  getRoleBadge,
  getEventStatus,
}: {
  event: EventWithAssignment;
  onNavigate: (path: string) => void;
  getRoleBadge: (type: string) => JSX.Element;
  getEventStatus: (event: Event) => { label: string; color: string };
}) {
  const status = getEventStatus(event);
  const eventDate = new Date(event.startDatetime);
  
  const getDateLabel = () => {
    if (isToday(eventDate)) return "Oggi";
    if (isTomorrow(eventDate)) return "Domani";
    return format(eventDate, "EEEE d MMMM", { locale: it });
  };

  return (
    <motion.div variants={scaleIn} whileTap={{ scale: 0.98 }}>
      <Card 
        className="glass-card border-white/10 min-h-[180px] active:scale-[0.98] transition-transform cursor-pointer overflow-hidden"
        onClick={() => {
          triggerHaptic('light');
          onNavigate(`/events/${event.id}/panel`);
        }}
        data-testid={`card-event-${event.id}`}
      >
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold line-clamp-2">{event.name}</h3>
            </div>
            {getRoleBadge(event.assignmentType)}
          </div>
          
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-base text-muted-foreground">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{getDateLabel()}</p>
                <p className="text-sm">{format(eventDate, "HH:mm", { locale: it })}</p>
              </div>
            </div>
            
            {event.locationId && (
              <div className="flex items-center gap-3 text-base text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-teal-400" />
                </div>
                <span className="line-clamp-1">Location assegnata</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Badge className={cn(status.color, "text-base px-4 py-1.5 font-medium")}>
              {status.label}
            </Badge>
            
            <HapticButton 
              variant="default"
              className="min-h-[48px] px-6 rounded-xl text-base font-semibold"
              data-testid={`button-enter-event-${event.id}`}
              hapticType="medium"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(`/events/${event.id}/panel`);
              }}
            >
              <span>Entra</span>
              <ArrowRight className="h-5 w-5 ml-2" />
            </HapticButton>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DashboardHeader({ user, getRoleLabel }: { user: any; getRoleLabel: () => string }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  const getInitials = () => {
    const first = user?.firstName?.charAt(0) || '';
    const last = user?.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfig}
      className="flex items-center justify-between px-4 py-4"
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 border-2 border-primary/20">
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold text-lg">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-base text-muted-foreground">{getGreeting()}</p>
          <h1 className="text-2xl font-bold" data-testid="text-user-name">
            {user?.firstName || user?.email?.split('@')[0] || 'Utente'}
          </h1>
        </div>
      </div>
      <Badge 
        className="text-base px-4 py-2 bg-primary/20 text-primary border-primary/30 font-semibold"
        data-testid="badge-role"
      >
        {getRoleLabel()}
      </Badge>
    </motion.div>
  );
}

export default function PrDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [selectedEvent, setSelectedEvent] = useState<EventWithAssignment | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  const { data: myEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery<EventWithAssignment[]>({
    queryKey: ['/api/e4u/my-events'],
  });

  const { data: myStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<MyStats>({
    queryKey: ['/api/e4u/my-stats'],
  });

  const isStaff = user?.role === 'capo_staff';
  const isPr = user?.role === 'pr';
  const isScanner = user?.role === 'scanner';

  const handleRefresh = async () => {
    triggerHaptic('medium');
    await Promise.all([refetchEvents(), refetchStats()]);
    triggerHaptic('success');
  };

  const getRoleBadge = (assignmentType: string) => {
    switch (assignmentType) {
      case 'staff':
        return <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-sm px-3 py-1">{t('pr.roles.staff')}</Badge>;
      case 'pr':
        return <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30 text-sm px-3 py-1">{t('pr.roles.pr')}</Badge>;
      case 'scanner':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-sm px-3 py-1">{t('pr.roles.scanner')}</Badge>;
      default:
        return <Badge className="text-sm px-3 py-1">{t('pr.roles.owner')}</Badge>;
    }
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const start = new Date(event.startDatetime);
    const end = event.endDatetime ? new Date(event.endDatetime) : null;
    
    if (end && now > end) return { label: t('pr.concluded'), color: 'bg-gray-500/20 text-gray-400' };
    if (now >= start && (!end || now <= end)) return { label: t('pr.ongoing'), color: 'bg-emerald-500/20 text-emerald-400' };
    return { label: t('pr.scheduled'), color: 'bg-blue-500/20 text-blue-400' };
  };

  const getRoleLabel = () => {
    if (isStaff) return t('pr.roles.capo_staff');
    if (isPr) return t('pr.roles.pr');
    if (isScanner) return t('pr.roles.scanner');
    return t('pr.roles.operator');
  };

  const activeEvents = myEvents?.filter(e => {
    const now = new Date();
    const start = new Date(e.startDatetime);
    const end = e.endDatetime ? new Date(e.endDatetime) : null;
    return now < start || (end && now <= end) || (!end && now >= start);
  }) || [];

  const todayEvents = myEvents?.filter(e => isToday(new Date(e.startDatetime))) || [];
  const upcomingEvents = myEvents?.filter(e => {
    const d = new Date(e.startDatetime);
    return !isToday(d) && isThisWeek(d);
  }) || [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('common.goodMorning');
    if (hour < 18) return t('common.goodAfternoon');
    return t('common.goodEvening');
  };

  const getInitials = () => {
    const first = user?.firstName?.charAt(0) || '';
    const last = user?.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return t('pr.today');
    if (isTomorrow(date)) return t('pr.tomorrow');
    return format(date, "EEEE d MMMM", { locale: it });
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-pr-dashboard">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold text-lg">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">{getGreeting()}</p>
              <h1 className="text-2xl font-bold" data-testid="text-user-name">
                {user?.firstName || user?.email?.split('@')[0] || t('common.user')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              className="text-base px-4 py-2 bg-primary/20 text-primary border-primary/30 font-semibold"
              data-testid="badge-role"
            >
              {getRoleLabel()}
            </Badge>
            <Button variant="outline" onClick={() => { refetchEvents(); refetchStats(); }} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('common.refresh')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">{t('pr.activeEvents')}</span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold" data-testid="stat-active-events">{myStats?.activeEvents || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-teal-500/10">
                  <Users className="h-5 w-5 text-teal-500" />
                </div>
                <span className="text-sm text-muted-foreground">{t('pr.peopleAdded')}</span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold" data-testid="stat-entries">{myStats?.entriesCreated || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <span className="text-sm text-muted-foreground">{t('pr.checkIns')}</span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold" data-testid="stat-checkins">{myStats?.checkIns || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-pink-500/10">
                  <Armchair className="h-5 w-5 text-pink-500" />
                </div>
                <span className="text-sm text-muted-foreground">{t('pr.proposedTables')}</span>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold" data-testid="stat-tables">{myStats?.tablesProposed || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {(isStaff || isPr) && (
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => myEvents?.[0] && navigate(`/events/${myEvents[0].id}/panel`)}
              disabled={!myEvents?.length}
              data-testid="button-quick-lists"
            >
              <ListChecks className="h-6 w-6" />
              <span>{t('pr.guestLists')}</span>
            </Button>
          )}
          {(isStaff || isPr) && (
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => myEvents?.[0] && navigate(`/events/${myEvents[0].id}/panel?tab=tables`)}
              disabled={!myEvents?.length}
              data-testid="button-quick-tables"
            >
              <Armchair className="h-6 w-6" />
              <span>{t('pr.tables')}</span>
            </Button>
          )}
          {isStaff && (
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => myEvents?.[0] && navigate(`/events/${myEvents[0].id}/panel?tab=pr`)}
              disabled={!myEvents?.length}
              data-testid="button-quick-pr"
            >
              <UserPlus className="h-6 w-6" />
              <span>{t('pr.prManagement')}</span>
            </Button>
          )}
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={() => navigate('/scanner')}
            data-testid="button-quick-scanner"
          >
            <QrCode className="h-6 w-6" />
            <span>{t('pr.qrScanner')}</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('pr.myEvents')}</CardTitle>
                <CardDescription>{t('pr.allEventsAssigned')}</CardDescription>
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                {myEvents?.length || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                  </div>
                ))}
              </div>
            ) : myEvents && myEvents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.event')}</TableHead>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>{t('common.role')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myEvents.map((event) => {
                    const status = getEventStatus(event);
                    const eventDate = new Date(event.startDatetime);
                    return (
                      <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                        <TableCell className="font-medium">{event.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{getDateLabel(eventDate)}</span>
                            <span className="text-muted-foreground">
                              {format(eventDate, "HH:mm", { locale: it })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(event.assignmentType)}</TableCell>
                        <TableCell>
                          <Badge className={status.color}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedEvent(event);
                                setIsEventDialogOpen(true);
                              }}
                              data-testid={`button-view-event-${event.id}`}
                            >
                              {t('common.details')}
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => navigate(`/events/${event.id}/panel`)}
                              data-testid={`button-enter-event-${event.id}`}
                            >
                              {t('pr.enter')}
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <div className="p-5 rounded-full bg-muted/20 inline-block mb-4">
                  <Calendar className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('pr.noEventsAssigned')}</h3>
                <p className="text-muted-foreground">
                  {t('pr.contactManager')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{selectedEvent?.name}</DialogTitle>
              <DialogDescription>{t('pr.eventDetails')}</DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('common.date')}</p>
                    <p className="font-medium">
                      {getDateLabel(new Date(selectedEvent.startDatetime))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('common.time')}</p>
                    <p className="font-medium">
                      {format(new Date(selectedEvent.startDatetime), "HH:mm", { locale: it })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('common.role')}</p>
                    {getRoleBadge(selectedEvent.assignmentType)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('common.status')}</p>
                    <Badge className={getEventStatus(selectedEvent).color}>
                      {getEventStatus(selectedEvent).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('pr.permissions')}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.permissions?.canAddToLists && (
                      <Badge variant="secondary">{t('pr.addLists')}</Badge>
                    )}
                    {selectedEvent.permissions?.canProposeTables && (
                      <Badge variant="secondary">{t('pr.proposeTables')}</Badge>
                    )}
                    {selectedEvent.permissions?.canScanLists && (
                      <Badge variant="secondary">{t('pr.scanLists')}</Badge>
                    )}
                    {selectedEvent.permissions?.canManageLists && (
                      <Badge variant="secondary">{t('pr.manageLists')}</Badge>
                    )}
                    {selectedEvent.permissions?.canManageTables && (
                      <Badge variant="secondary">{t('pr.manageTables')}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEventDialogOpen(false)}>
                    {t('common.close')}
                  </Button>
                  <Button onClick={() => {
                    navigate(`/events/${selectedEvent.id}/panel`);
                    setIsEventDialogOpen(false);
                  }}>
                    {t('pr.goToEvent')}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={<DashboardHeader user={user} getRoleLabel={getRoleLabel} />}
      contentClassName="pb-24"
    >
      <motion.div 
        className="space-y-6 pt-2 px-0"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeInUp} className="px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">{t('pr.yourStats')}</h2>
            </div>
            <HapticButton
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-xl"
              hapticType="light"
              onClick={handleRefresh}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </HapticButton>
          </div>
        </motion.div>

        <motion.div 
          variants={fadeInUp}
          className="grid grid-cols-2 gap-4 px-4"
        >
          <StatCard 
            icon={Calendar} 
            label={t('pr.activeEvents')} 
            value={myStats?.activeEvents || 0}
            gradient="from-blue-500 to-indigo-600"
            isLoading={statsLoading}
            testId="stat-active-events"
          />
          <StatCard 
            icon={Users} 
            label={t('pr.peopleAdded')} 
            value={myStats?.entriesCreated || 0}
            gradient="from-teal-500 to-emerald-600"
            trend={{ value: 12, isPositive: true }}
            isLoading={statsLoading}
            testId="stat-entries"
          />
          <StatCard 
            icon={CheckCircle2} 
            label={t('pr.checkIns')} 
            value={myStats?.checkIns || 0}
            gradient="from-emerald-500 to-green-600"
            isLoading={statsLoading}
            testId="stat-checkins"
          />
          <StatCard 
            icon={Armchair} 
            label={t('pr.proposedTables')} 
            value={myStats?.tablesProposed || 0}
            gradient="from-pink-500 to-rose-600"
            isLoading={statsLoading}
            testId="stat-tables"
          />
        </motion.div>

        <motion.div variants={fadeInUp} className="space-y-4 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-bold">{t('pr.quickActions')}</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {(isStaff || isPr) && (
              <QuickActionCard
                icon={ListChecks}
                label={t('pr.lists')}
                description={t('pr.manageGuests')}
                onClick={() => myEvents?.[0] && navigate(`/events/${myEvents[0].id}/panel`)}
                gradient="from-violet-500 to-purple-600"
                disabled={!myEvents?.length}
                testId="button-quick-lists"
              />
            )}
            
            {(isStaff || isPr) && (
              <QuickActionCard
                icon={Armchair}
                label={t('pr.tables')}
                description={t('pr.proposeBookings')}
                onClick={() => myEvents?.[0] && navigate(`/events/${myEvents[0].id}/panel?tab=tables`)}
                gradient="from-rose-500 to-pink-600"
                disabled={!myEvents?.length}
                testId="button-quick-tables"
              />
            )}

            {isStaff && (
              <QuickActionCard
                icon={UserPlus}
                label={t('pr.prManagement')}
                description={t('pr.teamPermissions')}
                onClick={() => myEvents?.[0] && navigate(`/events/${myEvents[0].id}/panel?tab=pr`)}
                gradient="from-amber-500 to-orange-600"
                disabled={!myEvents?.length}
                testId="button-quick-pr"
              />
            )}

            <QuickActionCard
              icon={QrCode}
              label={t('pr.qrScanner')}
              description={t('pr.guestCheckIn')}
              onClick={() => navigate('/scanner')}
              gradient="from-primary to-primary/80"
              testId="button-quick-scanner"
            />
          </div>
        </motion.div>

        {todayEvents.length > 0 && (
          <motion.div variants={fadeInUp} className="space-y-4 px-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              <h2 className="text-xl font-bold">{t('pr.todayEvents')}</h2>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 ml-auto">
                {todayEvents.length}
              </Badge>
            </div>
            
            <div className="space-y-4">
              {todayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onNavigate={navigate}
                  getRoleBadge={getRoleBadge}
                  getEventStatus={getEventStatus}
                />
              ))}
            </div>
          </motion.div>
        )}

        <motion.div variants={fadeInUp} className="space-y-4 px-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{t('pr.myEvents')}</h2>
            <Badge className="bg-primary/20 text-primary border-primary/30 ml-auto">
              {myEvents?.length || 0}
            </Badge>
          </div>

          {eventsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="glass-card min-h-[180px]">
                  <CardContent className="p-5 space-y-4">
                    <Skeleton className="h-7 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-2/3" />
                    <div className="flex justify-between pt-2">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-12 w-28 rounded-xl" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : myEvents && myEvents.length > 0 ? (
            <AnimatePresence mode="popLayout">
              <div className="space-y-4">
                {myEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onNavigate={navigate}
                    getRoleBadge={getRoleBadge}
                    getEventStatus={getEventStatus}
                  />
                ))}
              </div>
            </AnimatePresence>
          ) : (
            <motion.div variants={scaleIn}>
              <Card className="glass-card border-white/10 min-h-[220px]">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full">
                  <div className="p-5 rounded-full bg-muted/20 mb-5">
                    <Calendar className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{t('pr.noEventsAssigned')}</h3>
                  <p className="text-base text-muted-foreground">
                    {t('pr.contactManager')}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>

        <div className="h-8" />
      </motion.div>
    </MobileAppLayout>
  );
}
