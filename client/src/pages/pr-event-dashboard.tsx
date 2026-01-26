import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePrAuth } from "@/hooks/usePrAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Ticket,
  Copy,
  Share2,
  Check,
  Gift,
  Trophy,
  Target,
  TrendingUp,
  Grid3X3,
  ListChecks,
  History,
  Award,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock4,
  UserPlus,
  Table2,
  Sparkles,
  Zap,
} from "lucide-react";

interface EventDetail {
  id: string;
  eventId: string;
  eventName: string;
  eventImageUrl: string | null;
  eventStart: string;
  eventEnd: string;
  locationName: string;
  locationAddress?: string;
}

interface GuestList {
  id: string;
  name: string;
  listType: string;
  currentCount: number;
  maxCapacity: number | null;
  guests?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    status: string;
  }>;
}

interface EventTable {
  id: string;
  name: string;
  capacity: number;
  minSpend: number | null;
  isBooked: boolean;
  booking?: {
    guestName: string;
    guestCount: number;
    status: string;
  };
}

interface TicketStats {
  sold: number;
  revenue: number;
  commission: number;
  conversionRate?: number;
}

interface Reward {
  id: string;
  name: string;
  description: string | null;
  targetType: string;
  targetValue: number;
  rewardType: string;
  rewardValue: number;
  progress: {
    currentValue: number;
    targetValue: number;
    isCompleted: boolean;
    rewardClaimed: boolean;
  };
}

interface ActivityLog {
  id: string;
  activityType: string;
  entityData: string | null;
  reason: string | null;
  createdAt: string;
}

export default function PrEventDashboard() {
  const { eventId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { prProfile } = usePrAuth();
  const [activeTab, setActiveTab] = useState("liste");
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: event, isLoading: isLoadingEvent } = useQuery<EventDetail>({
    queryKey: ["/api/pr/events", eventId],
    enabled: !!eventId && !!prProfile,
  });

  const { data: guestLists = [], isLoading: isLoadingLists } = useQuery<GuestList[]>({
    queryKey: ["/api/pr/events", eventId, "guest-lists"],
    enabled: !!eventId && !!prProfile,
  });

  const { data: tables = [], isLoading: isLoadingTables } = useQuery<EventTable[]>({
    queryKey: ["/api/pr/events", eventId, "tables"],
    enabled: !!eventId && !!prProfile,
  });

  const { data: ticketStats, isLoading: isLoadingStats } = useQuery<TicketStats>({
    queryKey: ["/api/pr/events", eventId, "ticket-stats"],
    enabled: !!eventId && !!prProfile,
  });

  const { data: rewards = [], isLoading: isLoadingRewards } = useQuery<Reward[]>({
    queryKey: ["/api/pr/events", eventId, "rewards"],
    enabled: !!eventId && !!prProfile,
  });

  const { data: activityLogs = [], isLoading: isLoadingLogs } = useQuery<ActivityLog[]>({
    queryKey: ["/api/pr/events", eventId, "activity-logs"],
    enabled: !!eventId && !!prProfile,
  });

  const prLink = useMemo(() => {
    if (!event || !prProfile?.prCode) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/e/${event.eventId || event.id}?pr=${prProfile.prCode}`;
  }, [event, prProfile]);

  const stats = useMemo(() => ({
    totalGuests: guestLists.reduce((acc, list) => acc + (list.currentCount || 0), 0),
    totalTables: tables.filter(t => t.isBooked).length,
    ticketsSold: ticketStats?.sold || 0,
    commission: ticketStats?.commission || 0,
  }), [guestLists, tables, ticketStats]);

  const cancellations = useMemo(() => 
    activityLogs.filter(log => 
      log.activityType.includes('cancelled') || log.activityType.includes('removed')
    ),
    [activityLogs]
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    return `${diffDays} giorni fa`;
  };

  const isToday = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  };

  const handleCopyLink = async () => {
    if (!prLink) return;
    try {
      await navigator.clipboard.writeText(prLink);
      setLinkCopied(true);
      toast({ title: "Link copiato!", description: "Il tuo link è stato copiato negli appunti." });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast({ title: "Errore", description: "Impossibile copiare il link.", variant: "destructive" });
    }
  };

  const handleShareLink = async () => {
    if (!prLink || !event) return;
    try {
      await navigator.share({
        title: event.eventName,
        text: `Acquista il tuo biglietto per ${event.eventName}!`,
        url: prLink,
      });
    } catch (err) {
      handleCopyLink();
    }
  };

  if (isLoadingEvent) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-64 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Evento non trovato</h3>
            <p className="text-muted-foreground mb-4">L'evento richiesto non esiste o non sei autorizzato.</p>
            <Button onClick={() => navigate("/pr/events")} data-testid="button-back-events">
              Torna agli eventi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const eventIsToday = event ? isToday(event.eventStart) : false;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="relative h-56 md:h-72 overflow-hidden">
          {event.eventImageUrl ? (
            <img
              src={event.eventImageUrl}
              alt={event.eventName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-background/50 backdrop-blur-sm"
          onClick={() => navigate("/pr/events")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Today Badge */}
        {eventIsToday && (
          <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground shadow-lg">
            <Sparkles className="h-3 w-3 mr-1" />
            OGGI
          </Badge>
        )}

        {/* Event Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold text-foreground mb-2"
          >
            {event.eventName}
          </motion.h1>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{formatDate(event.eventStart)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" />
              <span>{formatTime(event.eventStart)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate max-w-[200px]">{event.locationName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-4 md:px-6 -mt-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-2 md:gap-3"
        >
          <Card className="bg-violet-500/10 border-violet-500/20">
            <CardContent className="p-3 text-center">
              <Users className="h-5 w-5 text-violet-500 mx-auto mb-1" />
              <p className="text-lg md:text-xl font-bold text-foreground">{stats.totalGuests}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Ospiti</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-3 text-center">
              <Grid3X3 className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-lg md:text-xl font-bold text-foreground">{stats.totalTables}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Tavoli</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-3 text-center">
              <Ticket className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-lg md:text-xl font-bold text-foreground">{stats.ticketsSold}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Biglietti</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-lg md:text-xl font-bold text-foreground">€{stats.commission}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Guadagno</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-6 mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-muted/50">
            <TabsTrigger value="liste" className="text-xs md:text-sm py-2.5 data-[state=active]:bg-background" data-testid="tab-liste">
              <ListChecks className="h-4 w-4 md:mr-1.5" />
              <span className="hidden md:inline">Liste</span>
            </TabsTrigger>
            <TabsTrigger value="biglietti" className="text-xs md:text-sm py-2.5 data-[state=active]:bg-background" data-testid="tab-biglietti">
              <Ticket className="h-4 w-4 md:mr-1.5" />
              <span className="hidden md:inline">Biglietti</span>
            </TabsTrigger>
            <TabsTrigger value="storico" className="text-xs md:text-sm py-2.5 data-[state=active]:bg-background" data-testid="tab-storico">
              <History className="h-4 w-4 md:mr-1.5" />
              <span className="hidden md:inline">Storico</span>
            </TabsTrigger>
            <TabsTrigger value="premi" className="text-xs md:text-sm py-2.5 data-[state=active]:bg-background" data-testid="tab-premi">
              <Trophy className="h-4 w-4 md:mr-1.5" />
              <span className="hidden md:inline">Premi</span>
            </TabsTrigger>
          </TabsList>

          {/* Liste Tab */}
          <TabsContent value="liste" className="mt-4 space-y-4">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="h-5 w-5 text-emerald-500" />
                  Liste Ospiti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingLists ? (
                  <Skeleton className="h-16 w-full" />
                ) : guestLists.length > 0 ? (
                  guestLists.map(list => (
                    <div key={list.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                          <Users className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{list.name}</p>
                          <p className="text-sm text-muted-foreground">{list.currentCount || 0} ospiti</p>
                        </div>
                      </div>
                      <Badge variant="outline">{list.listType}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">Nessuna lista disponibile</p>
                )}

                <Button className="w-full" variant="outline" data-testid="button-add-guest">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Aggiungi ospite
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Table2 className="h-5 w-5 text-blue-500" />
                  Prenotazioni Tavoli
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTables ? (
                  <Skeleton className="h-24 w-full" />
                ) : tables.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {tables.map(table => (
                      <div
                        key={table.id}
                        className={`p-3 rounded-lg border text-center ${
                          table.isBooked
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-muted/30 border-border/50"
                        }`}
                      >
                        <Grid3X3 className={`h-5 w-5 mx-auto mb-1 ${table.isBooked ? "text-emerald-500" : "text-muted-foreground"}`} />
                        <p className="font-medium text-sm text-foreground">{table.name}</p>
                        <p className="text-xs text-muted-foreground">{table.capacity} posti</p>
                        {table.isBooked && (
                          <Badge variant="secondary" className="mt-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-0.5" />
                            Prenotato
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Nessun tavolo disponibile</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Biglietti Tab */}
          <TabsContent value="biglietti" className="mt-4 space-y-4">
            <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 border-violet-500/20 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ExternalLink className="h-5 w-5 text-violet-500" />
                  Il tuo Link Personale
                </CardTitle>
                <p className="text-sm text-muted-foreground">Condividi per tracciare le tue vendite</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {prLink && (
                  <>
                    <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/50">
                      <Input
                        value={prLink}
                        readOnly
                        className="bg-transparent border-0 text-sm font-mono focus-visible:ring-0"
                        data-testid="input-pr-link"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyLink}
                        data-testid="button-copy-link"
                      >
                        {linkCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={handleCopyLink} variant="outline" data-testid="button-copy">
                        <Copy className="h-4 w-4 mr-2" />
                        Copia link
                      </Button>
                      <Button onClick={handleShareLink} data-testid="button-share">
                        <Share2 className="h-4 w-4 mr-2" />
                        Condividi
                      </Button>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/50">
                  <div className="text-center p-4 bg-emerald-500/10 rounded-lg">
                    <p className="text-3xl font-bold text-emerald-500">{ticketStats?.sold || 0}</p>
                    <p className="text-sm text-muted-foreground">Biglietti venduti</p>
                  </div>
                  <div className="text-center p-4 bg-amber-500/10 rounded-lg">
                    <p className="text-3xl font-bold text-amber-500">€{ticketStats?.commission || 0}</p>
                    <p className="text-sm text-muted-foreground">Commissione</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Storico Tab */}
          <TabsContent value="storico" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5 text-amber-500" />
                  Storico Cancellazioni
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <Skeleton className="h-24 w-full" />
                ) : cancellations.length > 0 ? (
                  <div className="space-y-3">
                    {cancellations.map(log => {
                      const data = log.entityData ? JSON.parse(log.entityData) : {};
                      return (
                        <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border-l-2 border-destructive/50">
                          <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm">
                              {log.activityType.includes("guest") ? "Ospite rimosso" : 
                               log.activityType.includes("table") ? "Prenotazione annullata" :
                               log.activityType.includes("ticket") ? "Biglietto cancellato" : "Cancellazione"}
                            </p>
                            {data.name && <p className="text-sm text-muted-foreground">{data.name}</p>}
                            {log.reason && <p className="text-xs text-muted-foreground mt-1">Motivo: {log.reason}</p>}
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock4 className="h-3 w-3" />
                              {formatTimeAgo(log.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                    <p className="font-medium text-foreground">Nessuna cancellazione</p>
                    <p className="text-sm text-muted-foreground">Tutto in ordine!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Premi Tab */}
          <TabsContent value="premi" className="mt-4">
            <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Obiettivi & Premi
                </CardTitle>
                <p className="text-sm text-muted-foreground">Raggiungi gli obiettivi per sbloccare bonus</p>
              </CardHeader>
              <CardContent>
                {isLoadingRewards ? (
                  <Skeleton className="h-32 w-full" />
                ) : rewards.length > 0 ? (
                  <div className="space-y-4">
                    {rewards.map(reward => {
                      const percentage = Math.min((reward.progress.currentValue / reward.progress.targetValue) * 100, 100);
                      const isCompleted = reward.progress.isCompleted;
                      
                      return (
                        <div
                          key={reward.id}
                          className={`p-4 rounded-lg border ${
                            isCompleted
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : "bg-background/50 border-border/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${isCompleted ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : (
                                  <Target className="h-5 w-5 text-amber-500" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{reward.name}</p>
                                {reward.description && (
                                  <p className="text-sm text-muted-foreground">{reward.description}</p>
                                )}
                              </div>
                            </div>
                            <Badge variant={isCompleted ? "default" : "secondary"} className={isCompleted ? "bg-emerald-500" : ""}>
                              {reward.rewardType === "bonus_cash" && `+€${reward.rewardValue}`}
                              {reward.rewardType === "percentage_bonus" && `+${reward.rewardValue}%`}
                              {reward.rewardType === "gift" && "Premio"}
                              {reward.rewardType === "badge" && "Badge"}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {reward.targetType === "tickets_sold" && "Biglietti venduti"}
                                {reward.targetType === "guests_added" && "Ospiti in lista"}
                                {reward.targetType === "tables_booked" && "Tavoli prenotati"}
                                {reward.targetType === "revenue" && "Revenue generato"}
                              </span>
                              <span className="font-medium text-foreground">
                                {reward.progress.currentValue} / {reward.targetValue}
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${isCompleted ? "bg-emerald-500" : "bg-amber-500"}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                              />
                            </div>
                          </div>

                          {isCompleted && !reward.progress.rewardClaimed && (
                            <Button className="w-full mt-3" size="sm" data-testid={`button-claim-${reward.id}`}>
                              <Gift className="h-4 w-4 mr-2" />
                              Riscuoti Premio
                            </Button>
                          )}
                          {reward.progress.rewardClaimed && (
                            <div className="flex items-center justify-center gap-2 mt-3 text-emerald-500 text-sm">
                              <CheckCircle2 className="h-4 w-4" />
                              Premio già riscosso
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium text-foreground">Nessun premio attivo</p>
                    <p className="text-sm text-muted-foreground">Gli obiettivi saranno disponibili a breve</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
