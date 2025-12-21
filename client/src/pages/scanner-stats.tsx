import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Users,
  Ticket,
  Armchair,
  Clock,
  CheckCircle2,
  CalendarDays,
  Zap,
  Target,
  Activity,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { MobileAppLayout, MobileHeader, HapticButton, triggerHaptic } from "@/components/mobile-primitives";

interface ScanStats {
  totalLists: number;
  checkedInLists: number;
  totalTables: number;
  checkedInTables: number;
  totalTickets: number;
  checkedInTickets: number;
}

interface TotalStats {
  totalEventsScanned: number;
  totalScans: number;
  todayScans: number;
}

interface Event {
  id: string;
  name: string;
  startDatetime: string;
  status: string;
}

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springTransition,
  },
};

export default function ScannerStatsPage() {
  const { eventId } = useParams<{ eventId?: string }>();
  const { user } = useAuth();

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ScanStats>({
    queryKey: ['/api/e4u/events', eventId, 'scan-stats'],
    enabled: !!eventId,
  });

  const { data: totalStats, isLoading: totalStatsLoading } = useQuery<TotalStats>({
    queryKey: ['/api/e4u/scanner/total-stats'],
    enabled: !eventId,
  });

  const calcProgress = (checked: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((checked / total) * 100);
  };

  const handleRefresh = () => {
    triggerHaptic('medium');
    if (eventId) {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', eventId, 'scan-stats'] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/scanner/total-stats'] });
    }
  };

  if (eventId) {
    const totalAll = (stats?.totalLists || 0) + (stats?.totalTables || 0) + (stats?.totalTickets || 0);
    const checkedAll = (stats?.checkedInLists || 0) + (stats?.checkedInTables || 0) + (stats?.checkedInTickets || 0);
    const overallProgress = calcProgress(checkedAll, totalAll);

    const header = (
      <div className="bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href={`/scanner/scan/${eventId}`}>
              <HapticButton 
                variant="ghost" 
                size="icon" 
                className="h-12 w-12 rounded-2xl" 
                hapticType="light"
                data-testid="button-back"
              >
                <ArrowLeft className="h-6 w-6" />
              </HapticButton>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-title">
                <Activity className="h-6 w-6 text-blue-400" />
                Statistiche
              </h1>
              {event && (
                <p className="text-sm text-muted-foreground truncate">
                  {event.name}
                </p>
              )}
            </div>
          </div>
          <HapticButton 
            variant="outline" 
            size="icon" 
            className="h-12 w-12 rounded-2xl" 
            onClick={handleRefresh}
            hapticType="medium"
            data-testid="button-refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </HapticButton>
        </div>
      </div>
    );

    return (
      <MobileAppLayout header={header} contentClassName="pb-24">
        <motion.div 
          className="py-6 space-y-6"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={staggerItem}>
            <Card className="border-0 bg-gradient-to-br from-blue-500/20 to-blue-600/5 shadow-xl shadow-blue-500/10 overflow-visible" data-testid="card-overview">
              <CardContent className="p-8">
                <div className="text-center">
                  <motion.div 
                    className="w-24 h-24 rounded-3xl bg-blue-500/25 flex items-center justify-center mx-auto mb-6"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ ...springTransition, delay: 0.2 }}
                  >
                    <Target className="w-12 h-12 text-blue-400" />
                  </motion.div>
                  <p className="text-base text-muted-foreground mb-3">Progresso Totale</p>
                  <motion.div 
                    className="flex items-center justify-center gap-2"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ ...springTransition, delay: 0.3 }}
                  >
                    <span className="text-6xl font-bold text-blue-400 tabular-nums" data-testid="text-progress">
                      {overallProgress}
                    </span>
                    <span className="text-3xl font-bold text-blue-400/60">%</span>
                  </motion.div>
                  <p className="text-base text-muted-foreground mt-3">
                    <span className="font-semibold text-foreground">{checkedAll}</span> di {totalAll} ingressi
                  </p>
                </div>
                <div className="mt-8">
                  <Progress value={overallProgress} className="h-4 bg-blue-500/20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {statsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="border-0 bg-muted/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-5">
                      <Skeleton className="h-16 w-16 rounded-2xl" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-3 w-full rounded-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <motion.div variants={staggerItem}>
                <Card className="border-0 bg-gradient-to-r from-purple-500/15 to-purple-600/5 overflow-visible" data-testid="card-lists">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-5">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-purple-500/25 flex items-center justify-center shrink-0"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Users className="w-8 h-8 text-purple-400" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-muted-foreground mb-1">Liste Invitati</p>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-4xl font-bold tabular-nums">{stats?.checkedInLists || 0}</span>
                          <span className="text-lg text-muted-foreground">/ {stats?.totalLists || 0}</span>
                        </div>
                        <Progress 
                          value={calcProgress(stats?.checkedInLists || 0, stats?.totalLists || 0)} 
                          className="h-3 bg-purple-500/20 rounded-full" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="border-0 bg-gradient-to-r from-amber-500/15 to-amber-600/5 overflow-visible" data-testid="card-tables">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-5">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-amber-500/25 flex items-center justify-center shrink-0"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Armchair className="w-8 h-8 text-amber-400" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-muted-foreground mb-1">Tavoli / Prenotazioni</p>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-4xl font-bold tabular-nums">{stats?.checkedInTables || 0}</span>
                          <span className="text-lg text-muted-foreground">/ {stats?.totalTables || 0}</span>
                        </div>
                        <Progress 
                          value={calcProgress(stats?.checkedInTables || 0, stats?.totalTables || 0)} 
                          className="h-3 bg-amber-500/20 rounded-full" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="border-0 bg-gradient-to-r from-emerald-500/15 to-emerald-600/5 overflow-visible" data-testid="card-tickets">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-5">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-emerald-500/25 flex items-center justify-center shrink-0"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Ticket className="w-8 h-8 text-emerald-400" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-muted-foreground mb-1">Biglietti SIAE</p>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-4xl font-bold tabular-nums">{stats?.checkedInTickets || 0}</span>
                          <span className="text-lg text-muted-foreground">/ {stats?.totalTickets || 0}</span>
                        </div>
                        <Progress 
                          value={calcProgress(stats?.checkedInTickets || 0, stats?.totalTickets || 0)} 
                          className="h-3 bg-emerald-500/20 rounded-full" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}

          <motion.div variants={staggerItem}>
            <Link href={`/scanner/scanned/${eventId}`}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                transition={springTransition}
              >
                <Card className="border-0 bg-gradient-to-r from-primary/10 to-primary/5 overflow-visible" data-testid="card-view-list">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold">Vedi Lista Entrati</p>
                          <p className="text-base text-muted-foreground">
                            {checkedAll} persone registrate
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </MobileAppLayout>
    );
  }

  const header = (
    <div className="bg-background/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/scanner">
            <HapticButton 
              variant="ghost" 
              size="icon" 
              className="h-12 w-12 rounded-2xl" 
              hapticType="light"
              data-testid="button-back"
            >
              <ArrowLeft className="h-6 w-6" />
            </HapticButton>
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-3" data-testid="text-title">
            <BarChart3 className="h-6 w-6 text-blue-400" />
            Statistiche Generali
          </h1>
        </div>
        <HapticButton 
          variant="outline" 
          size="icon" 
          className="h-12 w-12 rounded-2xl" 
          onClick={handleRefresh}
          hapticType="medium"
          data-testid="button-refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </HapticButton>
      </div>
    </div>
  );

  return (
    <MobileAppLayout header={header} contentClassName="pb-24">
      <motion.div 
        className="py-6 space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {totalStatsLoading ? (
          <div className="space-y-6">
            <Card className="border-0 bg-muted/30">
              <CardContent className="p-8">
                <div className="flex flex-col items-center">
                  <Skeleton className="h-20 w-20 rounded-3xl mb-4" />
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-14 w-28" />
                </div>
              </CardContent>
            </Card>
            <div className="space-y-4">
              {[1, 2].map(i => (
                <Card key={i} className="border-0 bg-muted/30">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center">
                      <Skeleton className="h-16 w-16 rounded-2xl mb-4" />
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-10 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            <motion.div variants={staggerItem}>
              <Card className="border-0 bg-gradient-to-br from-emerald-500/20 to-green-600/5 shadow-xl shadow-emerald-500/10 overflow-visible" data-testid="card-total-scans">
                <CardContent className="p-8 text-center">
                  <motion.div 
                    className="w-20 h-20 rounded-3xl bg-emerald-500/25 flex items-center justify-center mx-auto mb-6"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ ...springTransition, delay: 0.2 }}
                  >
                    <Zap className="w-10 h-10 text-emerald-400" />
                  </motion.div>
                  <p className="text-base text-muted-foreground mb-2">Scansioni Totali</p>
                  <motion.span 
                    className="text-6xl font-bold text-emerald-400 tabular-nums block"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ ...springTransition, delay: 0.3 }}
                  >
                    {totalStats?.totalScans || 0}
                  </motion.span>
                </CardContent>
              </Card>
            </motion.div>

            <div className="space-y-4">
              <motion.div variants={staggerItem}>
                <Card className="border-0 bg-gradient-to-br from-blue-500/15 to-blue-600/5 overflow-visible" data-testid="card-today-scans">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-5">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-blue-500/25 flex items-center justify-center shrink-0"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Clock className="w-8 h-8 text-blue-400" />
                      </motion.div>
                      <div className="flex-1">
                        <p className="text-base text-muted-foreground mb-1">Scansioni Oggi</p>
                        <span className="text-4xl font-bold tabular-nums">{totalStats?.todayScans || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="border-0 bg-gradient-to-br from-purple-500/15 to-purple-600/5 overflow-visible" data-testid="card-events-count">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-5">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-purple-500/25 flex items-center justify-center shrink-0"
                        whileTap={{ scale: 0.95 }}
                      >
                        <CalendarDays className="w-8 h-8 text-purple-400" />
                      </motion.div>
                      <div className="flex-1">
                        <p className="text-base text-muted-foreground mb-1">Eventi Scansionati</p>
                        <span className="text-4xl font-bold tabular-nums">{totalStats?.totalEventsScanned || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </motion.div>
    </MobileAppLayout>
  );
}
