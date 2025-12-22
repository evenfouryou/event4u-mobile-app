import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Event } from "@shared/schema";
import { HapticButton, SafeArea, MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";

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

const springTransition = {
  type: "spring",
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

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: springTransition,
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { 
    opacity: 1, 
    scale: 1,
    transition: springTransition,
  },
};

export default function StaffPrHome() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: myEvents, isLoading: eventsLoading } = useQuery<EventWithAssignment[]>({
    queryKey: ['/api/e4u/my-events'],
  });

  const { data: myStats, isLoading: statsLoading } = useQuery<MyStats>({
    queryKey: ['/api/e4u/my-stats'],
  });

  const isStaff = user?.role === 'capo_staff';
  const isPr = user?.role === 'pr';
  const isScanner = user?.role === 'scanner';

  const getRoleBadge = (assignmentType: string) => {
    switch (assignmentType) {
      case 'staff':
        return <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-base px-4 py-1.5">Staff</Badge>;
      case 'pr':
        return <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30 text-base px-4 py-1.5">PR</Badge>;
      case 'scanner':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-base px-4 py-1.5">Scanner</Badge>;
      default:
        return <Badge className="text-base px-4 py-1.5">Gestore</Badge>;
    }
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const start = new Date(event.startDatetime);
    const end = event.endDatetime ? new Date(event.endDatetime) : null;
    
    if (end && now > end) return { label: 'Concluso', color: 'bg-gray-500/20 text-gray-400' };
    if (now >= start && (!end || now <= end)) return { label: 'In corso', color: 'bg-green-500/20 text-green-400' };
    return { label: 'Programmato', color: 'bg-blue-500/20 text-blue-400' };
  };

  const getRoleLabel = () => {
    if (isStaff) return "Capo Staff";
    if (isPr) return "PR";
    if (isScanner) return "Scanner";
    return "Operatore";
  };

  const getRoleDescription = () => {
    if (isStaff) return "Gestisci i tuoi eventi";
    if (isPr) return "Aggiungi ospiti e tavoli";
    if (isScanner) return "Scansiona QR code";
    return "Pannello operatore";
  };

  return (
    <MobileAppLayout
      header={<MobileHeader title="Dashboard Staff" showBackButton showMenuButton />}
      contentClassName="pb-24"
    >
      <motion.div 
        className="px-4 py-6 space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Header con saluto e badge ruolo */}
        <motion.div variants={fadeInUp} className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-welcome">
                Ciao, {user?.firstName || user?.email?.split('@')[0] || 'Utente'}!
              </h1>
              <p className="text-base text-muted-foreground mt-1">
                {getRoleDescription()}
              </p>
            </div>
            <Badge 
              className="text-base px-4 py-2 shrink-0 bg-primary/20 text-primary border-primary/30" 
              data-testid="badge-role"
            >
              {getRoleLabel()}
            </Badge>
          </div>
        </motion.div>

        {/* Stats Grid 2x2 - Cards grandi touch-friendly */}
        <motion.div 
          variants={fadeInUp}
          className="grid grid-cols-2 gap-4"
        >
          <motion.div variants={scaleIn} whileTap={{ scale: 0.97 }}>
            <Card className="glass-card border-white/10 min-h-[140px]">
              <CardContent className="p-5 h-full flex flex-col justify-between">
                <div className="p-3 rounded-2xl bg-blue-500/20 w-fit">
                  <Calendar className="h-7 w-7 text-blue-400" />
                </div>
                <div className="mt-4">
                  <p className="text-base text-muted-foreground">Eventi Attivi</p>
                  <p className="text-4xl font-bold mt-1" data-testid="stat-active-events">
                    {statsLoading ? <Skeleton className="h-10 w-14" /> : myStats?.activeEvents || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={scaleIn} whileTap={{ scale: 0.97 }}>
            <Card className="glass-card border-white/10 min-h-[140px]">
              <CardContent className="p-5 h-full flex flex-col justify-between">
                <div className="p-3 rounded-2xl bg-teal-500/20 w-fit">
                  <Users className="h-7 w-7 text-teal-400" />
                </div>
                <div className="mt-4">
                  <p className="text-base text-muted-foreground">Persone Aggiunte</p>
                  <p className="text-4xl font-bold mt-1" data-testid="stat-entries">
                    {statsLoading ? <Skeleton className="h-10 w-14" /> : myStats?.entriesCreated || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={scaleIn} whileTap={{ scale: 0.97 }}>
            <Card className="glass-card border-white/10 min-h-[140px]">
              <CardContent className="p-5 h-full flex flex-col justify-between">
                <div className="p-3 rounded-2xl bg-green-500/20 w-fit">
                  <CheckCircle2 className="h-7 w-7 text-green-400" />
                </div>
                <div className="mt-4">
                  <p className="text-base text-muted-foreground">Check-in</p>
                  <p className="text-4xl font-bold mt-1" data-testid="stat-checkins">
                    {statsLoading ? <Skeleton className="h-10 w-14" /> : myStats?.checkIns || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={scaleIn} whileTap={{ scale: 0.97 }}>
            <Card className="glass-card border-white/10 min-h-[140px]">
              <CardContent className="p-5 h-full flex flex-col justify-between">
                <div className="p-3 rounded-2xl bg-pink-500/20 w-fit">
                  <Armchair className="h-7 w-7 text-pink-400" />
                </div>
                <div className="mt-4">
                  <p className="text-base text-muted-foreground">Tavoli Proposti</p>
                  <p className="text-4xl font-bold mt-1" data-testid="stat-tables">
                    {statsLoading ? <Skeleton className="h-10 w-14" /> : myStats?.tablesProposed || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Quick Actions - Inline */}
        <motion.div variants={fadeInUp} className="space-y-4">
          <h2 className="text-xl font-semibold">Azioni Rapide</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {(isStaff || isPr) && (
              <motion.div variants={scaleIn} whileTap={{ scale: 0.95 }}>
                <HapticButton 
                  variant="outline" 
                  className="w-full min-h-[88px] flex-col gap-3 text-lg rounded-2xl border-2"
                  onClick={() => myEvents?.[0] && navigate(`/events/${myEvents[0].id}/panel`)}
                  disabled={!myEvents?.length}
                  data-testid="button-quick-lists"
                  hapticType="medium"
                >
                  <ListChecks className="h-7 w-7" />
                  <span>Liste</span>
                </HapticButton>
              </motion.div>
            )}
            
            {isPr && (
              <motion.div variants={scaleIn} whileTap={{ scale: 0.95 }}>
                <HapticButton 
                  variant="outline" 
                  className="w-full min-h-[88px] flex-col gap-3 text-lg rounded-2xl border-2"
                  onClick={() => myEvents?.[0] && navigate(`/events/${myEvents[0].id}/panel?tab=tables`)}
                  disabled={!myEvents?.length}
                  data-testid="button-quick-tables"
                  hapticType="medium"
                >
                  <Armchair className="h-7 w-7" />
                  <span>Tavoli</span>
                </HapticButton>
              </motion.div>
            )}

            {isStaff && (
              <motion.div variants={scaleIn} whileTap={{ scale: 0.95 }}>
                <HapticButton 
                  variant="outline" 
                  className="w-full min-h-[88px] flex-col gap-3 text-lg rounded-2xl border-2"
                  onClick={() => myEvents?.[0] && navigate(`/events/${myEvents[0].id}/panel?tab=pr`)}
                  disabled={!myEvents?.length}
                  data-testid="button-quick-pr"
                  hapticType="medium"
                >
                  <UserPlus className="h-7 w-7" />
                  <span>Gestione PR</span>
                </HapticButton>
              </motion.div>
            )}

            <motion.div variants={scaleIn} whileTap={{ scale: 0.95 }}>
              <HapticButton 
                variant="outline" 
                className="w-full min-h-[88px] flex-col gap-3 text-lg rounded-2xl border-2 bg-primary/10 border-primary/30"
                onClick={() => navigate('/scanner')}
                data-testid="button-quick-scanner"
                hapticType="medium"
              >
                <QrCode className="h-7 w-7 text-primary" />
                <span>Scanner QR</span>
              </HapticButton>
            </motion.div>
          </div>
        </motion.div>

        {/* Eventi Assegnati - Cards grandi tap-friendly */}
        <motion.div variants={fadeInUp} className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            I Miei Eventi
          </h2>

          {eventsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="glass-card min-h-[160px]">
                  <CardContent className="p-5 space-y-4">
                    <Skeleton className="h-7 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : myEvents && myEvents.length > 0 ? (
            <div className="space-y-4">
              {myEvents.map((event, index) => {
                const status = getEventStatus(event);
                return (
                  <motion.div
                    key={event.id}
                    variants={scaleIn}
                    custom={index}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className="glass-card border-white/10 min-h-[160px] active:scale-[0.98] transition-transform cursor-pointer"
                      onClick={() => navigate(`/events/${event.id}/panel`)}
                      data-testid={`card-event-${event.id}`}
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-xl font-semibold line-clamp-2 flex-1">
                            {event.name}
                          </h3>
                          {getRoleBadge(event.assignmentType)}
                        </div>
                        
                        <div className="flex items-center gap-3 text-base text-muted-foreground">
                          <Clock className="h-5 w-5 shrink-0" />
                          <span>
                            {format(new Date(event.startDatetime), "d MMMM yyyy, HH:mm", { locale: it })}
                          </span>
                        </div>
                        
                        {event.locationId && (
                          <div className="flex items-center gap-3 text-base text-muted-foreground">
                            <MapPin className="h-5 w-5 shrink-0" />
                            <span className="line-clamp-1">Location assegnata</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <Badge className={`${status.color} text-base px-4 py-1.5`}>
                            {status.label}
                          </Badge>
                          
                          <HapticButton 
                            variant="default"
                            className="min-h-[48px] px-5 rounded-xl text-base"
                            data-testid={`button-enter-event-${event.id}`}
                            hapticType="light"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/events/${event.id}/panel`);
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
              })}
            </div>
          ) : (
            <motion.div variants={scaleIn}>
              <Card className="glass-card border-white/10 min-h-[220px]">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full">
                  <div className="p-5 rounded-full bg-muted/20 mb-5">
                    <Calendar className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-3">Nessun evento assegnato</h3>
                  <p className="text-base text-muted-foreground">
                    Contatta il tuo responsabile per essere aggiunto a un evento.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </MobileAppLayout>
  );
}
