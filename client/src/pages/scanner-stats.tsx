import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Users,
  Ticket,
  Armchair,
  TrendingUp,
  Clock,
  CheckCircle2,
  CalendarDays,
  Zap,
  Target,
  Activity,
  RefreshCw,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";

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

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24">
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Link href={`/scanner/scan/${eventId}`}>
                <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold flex items-center gap-2" data-testid="text-title">
                  <Activity className="h-5 w-5 text-blue-400" />
                  Statistiche Evento
                </h1>
                {event && (
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {event.name}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="icon" className="rounded-full" onClick={handleRefresh} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 bg-gradient-to-br from-blue-500/15 to-blue-600/5 shadow-lg shadow-blue-500/5" data-testid="card-overview">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-3xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                    <Target className="w-10 h-10 text-blue-400" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Progresso Totale</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-5xl font-bold text-blue-400" data-testid="text-progress">
                      {overallProgress}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {checkedAll} di {totalAll} ingressi
                  </p>
                </div>
                <Progress value={overallProgress} className="h-3 bg-blue-500/20" />
              </CardContent>
            </Card>
          </motion.div>

          {statsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="border-0 bg-muted/30">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-14 w-14 rounded-2xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-0 bg-gradient-to-r from-purple-500/10 to-purple-600/5" data-testid="card-lists">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                        <Users className="w-7 h-7 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Liste Invitati</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">{stats?.checkedInLists || 0}</span>
                          <span className="text-muted-foreground">/ {stats?.totalLists || 0}</span>
                        </div>
                        <Progress 
                          value={calcProgress(stats?.checkedInLists || 0, stats?.totalLists || 0)} 
                          className="h-2 mt-2 bg-purple-500/20" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 bg-gradient-to-r from-amber-500/10 to-amber-600/5" data-testid="card-tables">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                        <Armchair className="w-7 h-7 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Tavoli / Prenotazioni</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">{stats?.checkedInTables || 0}</span>
                          <span className="text-muted-foreground">/ {stats?.totalTables || 0}</span>
                        </div>
                        <Progress 
                          value={calcProgress(stats?.checkedInTables || 0, stats?.totalTables || 0)} 
                          className="h-2 mt-2 bg-amber-500/20" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-0 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5" data-testid="card-tickets">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                        <Ticket className="w-7 h-7 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Biglietti SIAE</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">{stats?.checkedInTickets || 0}</span>
                          <span className="text-muted-foreground">/ {stats?.totalTickets || 0}</span>
                        </div>
                        <Progress 
                          value={calcProgress(stats?.checkedInTickets || 0, stats?.totalTickets || 0)} 
                          className="h-2 mt-2 bg-emerald-500/20" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link href={`/scanner/scanned/${eventId}`}>
              <Card className="hover-elevate cursor-pointer border-0 bg-muted/30" data-testid="card-view-list">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Vedi Lista Entrati</p>
                        <p className="text-sm text-muted-foreground">
                          {checkedAll} persone registrate
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 pb-24">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/scanner">
              <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold flex items-center gap-2" data-testid="text-title">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Statistiche Generali
            </h1>
          </div>
          <Button variant="outline" size="icon" className="rounded-full" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {totalStatsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-0 bg-muted/30">
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-0 bg-gradient-to-br from-emerald-500/15 to-green-600/5 shadow-lg shadow-emerald-500/5" data-testid="card-total-scans">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Scansioni Totali</p>
                  <span className="text-5xl font-bold text-emerald-400">
                    {totalStats?.totalScans || 0}
                  </span>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 h-full" data-testid="card-today-scans">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-blue-400" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Oggi</p>
                    <span className="text-3xl font-bold">{totalStats?.todayScans || 0}</span>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 h-full" data-testid="card-events-count">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                      <CalendarDays className="w-6 h-6 text-purple-400" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Eventi</p>
                    <span className="text-3xl font-bold">{totalStats?.totalEventsScanned || 0}</span>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
