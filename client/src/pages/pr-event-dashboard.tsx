import { useState, useMemo } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { usePrAuth } from "@/hooks/usePrAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  HapticButton,
  MobileAppLayout,
  MobileHeader,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Users,
  ListChecks,
  Armchair,
  Ticket,
  Link as LinkIcon,
  Copy,
  Check,
  TrendingUp,
  Euro,
  Award,
  History,
  XCircle,
  ChevronRight,
  Plus,
  UserPlus,
  Share2,
  QrCode,
  Gift,
  Target,
  Trophy,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Eye,
  Ban,
  Timer,
} from "lucide-react";
import { format, isToday, isTomorrow, isPast, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import type { Event, GuestList, GuestListEntry, EventTable, TableBooking, PrReward, PrRewardProgress, PrActivityLog } from "@shared/schema";

interface EventStats {
  totalGuests: number;
  totalTables: number;
  ticketsSold: number;
  ticketRevenue: number;
  commissionEarned: number;
}

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: springTransition },
};

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export default function PrEventDashboard() {
  const [, params] = useRoute("/pr/events/:eventId");
  const eventId = params?.eventId;
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { prProfile, isAuthenticated } = usePrAuth();
  const [activeTab, setActiveTab] = useState<"liste" | "biglietti" | "cancellazioni" | "premi">("liste");
  const [copiedLink, setCopiedLink] = useState(false);
  
  const handleBack = () => setLocation("/pr");

  const { data: event, isLoading: loadingEvent, refetch } = useQuery<Event>({
    queryKey: ["/api/e4u/events", eventId],
    enabled: !!eventId && isAuthenticated,
  });

  const { data: guestLists = [], isLoading: loadingLists } = useQuery<GuestList[]>({
    queryKey: ["/api/pr/events", eventId, "guest-lists"],
    enabled: !!eventId && isAuthenticated,
  });

  const { data: tables = [], isLoading: loadingTables } = useQuery<EventTable[]>({
    queryKey: ["/api/pr/events", eventId, "tables"],
    enabled: !!eventId && isAuthenticated,
  });

  const { data: bookings = [] } = useQuery<TableBooking[]>({
    queryKey: ["/api/pr/events", eventId, "bookings"],
    enabled: !!eventId && isAuthenticated,
  });

  const { data: ticketStats } = useQuery<{ sold: number; revenue: number; commission: number }>({
    queryKey: ["/api/pr/events", eventId, "ticket-stats"],
    enabled: !!eventId && isAuthenticated,
  });

  const { data: rewards = [] } = useQuery<(PrReward & { progress?: PrRewardProgress })[]>({
    queryKey: ["/api/pr/events", eventId, "rewards"],
    enabled: !!eventId && isAuthenticated,
  });

  const { data: activityLogs = [] } = useQuery<PrActivityLog[]>({
    queryKey: ["/api/pr/events", eventId, "activity-logs"],
    enabled: !!eventId && isAuthenticated,
  });

  const prLink = useMemo(() => {
    if (!event || !prProfile?.prCode) return null;
    const baseUrl = window.location.origin;
    return {
      url: `${baseUrl}/e/${event.id}?pr=${prProfile.prCode}`,
      prCode: prProfile.prCode,
      clicks: 0,
      conversions: ticketStats?.sold || 0,
    };
  }, [event, prProfile, ticketStats]);

  const stats = useMemo<EventStats>(() => {
    const totalGuests = guestLists.reduce((acc, list) => acc + (list.currentCount || 0), 0);
    const totalTables = bookings.filter(b => b.status === 'confirmed' || b.status === 'approved').length;
    return {
      totalGuests,
      totalTables,
      ticketsSold: ticketStats?.sold || 0,
      ticketRevenue: ticketStats?.revenue || 0,
      commissionEarned: ticketStats?.commission || 0,
    };
  }, [guestLists, bookings, ticketStats]);

  const cancellations = useMemo(() => {
    return activityLogs.filter(log => 
      log.activityType === 'list_entry_cancelled' || 
      log.activityType === 'table_cancelled' ||
      log.activityType === 'ticket_cancelled'
    );
  }, [activityLogs]);

  const handleCopyLink = async () => {
    if (!prLink) return;
    try {
      await navigator.clipboard.writeText(prLink.url);
      setCopiedLink(true);
      triggerHaptic('light');
      toast({ title: "Link copiato!", description: "Ora puoi condividerlo con i tuoi clienti" });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast({ title: "Errore", description: "Non è stato possibile copiare il link", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!prLink || !event) return;
    triggerHaptic('medium');
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Acquista il tuo biglietto per ${event.name}!`,
          url: prLink.url,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const StatCard = ({ icon: Icon, value, label, color, subValue }: {
    icon: React.ElementType;
    value: string | number;
    label: string;
    color: string;
    subValue?: string;
  }) => (
    <motion.div variants={fadeInUp} className="flex-1 min-w-0">
      <Card className={`${color} border-0`}>
        <CardContent className="p-3 text-center">
          <Icon className="w-5 h-5 mx-auto mb-1 opacity-80" />
          <p className="text-lg font-bold">{value}</p>
          <p className="text-xs opacity-70 truncate">{label}</p>
          {subValue && <p className="text-[10px] opacity-50 mt-0.5">{subValue}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loadingEvent) {
    return isMobile ? (
      <MobileAppLayout>
        <MobileHeader title="Caricamento..." showBackButton onBack={handleBack} />
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="grid grid-cols-4 gap-2">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </MobileAppLayout>
    ) : (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!event) {
    return isMobile ? (
      <MobileAppLayout>
        <MobileHeader title="Evento non trovato" showBackButton onBack={handleBack} />
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-bold mb-2">Evento non trovato</h3>
          <p className="text-muted-foreground mb-6">L'evento potrebbe essere stato rimosso.</p>
          <Link href="/pr">
            <Button data-testid="button-back-pr">Torna agli eventi</Button>
          </Link>
        </div>
      </MobileAppLayout>
    ) : (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto text-center p-8">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Evento non trovato</h3>
          <p className="text-muted-foreground mb-6">L'evento potrebbe essere stato rimosso.</p>
          <Link href="/pr">
            <Button>Torna agli eventi</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const eventDate = new Date(event.startDatetime);
  const isEventToday = isToday(eventDate);
  const isEventPast = isPast(eventDate);

  const EventHeader = () => (
    <div className="relative overflow-hidden">
      <div className="relative h-52 md:h-64">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-purple-500/20 to-blue-500/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {isEventToday && (
            <Badge className="bg-primary text-primary-foreground font-bold animate-pulse shadow-lg">
              <Sparkles className="w-3 h-3 mr-1" />
              OGGI
            </Badge>
          )}
          {isEventPast && (
            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
              Concluso
            </Badge>
          )}
        </div>
        
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground drop-shadow-lg mb-2">
            {event.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/80">
            <div className="flex items-center gap-1.5 bg-background/30 backdrop-blur-sm rounded-full px-3 py-1">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{format(eventDate, "EEE d MMMM yyyy", { locale: it })}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-background/30 backdrop-blur-sm rounded-full px-3 py-1">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{format(eventDate, "HH:mm")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const StatsRow = () => (
    <motion.div 
      variants={staggerChildren}
      initial="hidden"
      animate="animate"
      className="grid grid-cols-4 gap-2 md:gap-4"
    >
      <StatCard 
        icon={Users} 
        value={stats.totalGuests} 
        label="Ospiti" 
        color="bg-emerald-500/10 text-emerald-400"
      />
      <StatCard 
        icon={Armchair} 
        value={stats.totalTables} 
        label="Tavoli" 
        color="bg-blue-500/10 text-blue-400"
      />
      <StatCard 
        icon={Ticket} 
        value={stats.ticketsSold} 
        label="Biglietti" 
        color="bg-purple-500/10 text-purple-400"
      />
      <StatCard 
        icon={Euro} 
        value={`€${stats.commissionEarned.toFixed(0)}`} 
        label="Guadagno" 
        color="bg-primary/10 text-primary"
      />
    </motion.div>
  );

  const ListeSection = () => (
    <motion.div 
      variants={staggerChildren}
      initial="hidden"
      animate="animate"
      className="space-y-4"
    >
      <motion.div variants={fadeInUp}>
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ListChecks className="w-4 h-4 text-emerald-400" />
              </div>
              Liste & Tavoli
            </CardTitle>
            <CardDescription>Gestisci liste ospiti e prenotazioni tavoli per questo evento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/events/${eventId}/panel`}>
              <Button className="w-full justify-between" variant="outline" data-testid="button-manage-lists">
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  Aggiungi ospiti alle liste
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/events/${eventId}/panel`}>
              <Button className="w-full justify-between" variant="outline" data-testid="button-manage-tables">
                <span className="flex items-center gap-2">
                  <Armchair className="w-4 h-4 text-blue-400" />
                  Gestisci prenotazioni tavoli
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {guestLists.length > 0 && (
        <motion.div variants={fadeInUp}>
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Le tue liste ({guestLists.length})</span>
                <Badge variant="outline">{stats.totalGuests} ospiti</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {guestLists.map((list) => (
                  <div 
                    key={list.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <ListChecks className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium">{list.name}</p>
                        <p className="text-sm text-muted-foreground">{list.currentCount || 0} ospiti inseriti</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">{list.listType}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tables.length > 0 && (
        <motion.div variants={fadeInUp}>
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Tavoli ({tables.length})</span>
                <Badge variant="outline">{stats.totalTables} prenotati</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {tables.slice(0, 6).map((table) => {
                  const tableBookings = bookings.filter(b => b.tableId === table.id);
                  const isBooked = tableBookings.some(b => b.status === 'confirmed' || b.status === 'approved');
                  return (
                    <div 
                      key={table.id}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-colors",
                        isBooked 
                          ? "bg-emerald-500/10 border-emerald-500/30" 
                          : "bg-muted/20 border-border/30"
                      )}
                    >
                      <Armchair className={cn("w-5 h-5 mx-auto mb-1", isBooked ? "text-emerald-400" : "text-muted-foreground")} />
                      <p className="font-bold text-sm">{table.name}</p>
                      <p className="text-xs text-muted-foreground">{table.capacity} posti</p>
                      {isBooked && (
                        <Badge className="mt-1.5 bg-emerald-500/20 text-emerald-400 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" />
                          Prenotato
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              {tables.length > 6 && (
                <Button variant="ghost" className="w-full mt-3 text-muted-foreground">
                  Vedi tutti ({tables.length})
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );

  const BigliettiSection = () => (
    <motion.div 
      variants={staggerChildren}
      initial="hidden"
      animate="animate"
      className="space-y-4"
    >
      <motion.div variants={fadeInUp}>
        <Card className="bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-primary/5 border-purple-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <LinkIcon className="w-4 h-4 text-purple-400" />
              </div>
              Il tuo Link Personale
            </CardTitle>
            <CardDescription>Condividi questo link per tracciare automaticamente le tue vendite</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prLink ? (
              <>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-background/50 border border-border/50">
                  <div className="flex-1 overflow-hidden">
                    <Input
                      value={prLink.url}
                      readOnly
                      className="bg-transparent border-0 text-sm font-mono p-0 h-auto focus-visible:ring-0"
                      data-testid="input-pr-link"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCopyLink}
                    className="shrink-0"
                    data-testid="button-copy-link"
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleShare} data-testid="button-share-link">
                    <Share2 className="w-4 h-4 mr-2" />
                    Condividi
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={prLink.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Anteprima
                    </a>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-4 rounded-xl bg-purple-500/10 text-center">
                    <p className="text-2xl font-bold text-purple-400">{prLink.conversions}</p>
                    <p className="text-xs text-muted-foreground mt-1">Biglietti venduti</p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/10 text-center">
                    <p className="text-2xl font-bold text-primary">€{stats.commissionEarned.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Commissione totale</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Link non disponibile</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              Storico Vendite
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.ticketsSold > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium">Biglietti venduti</p>
                      <p className="text-sm text-muted-foreground">Tramite il tuo link</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-lg px-3">{stats.ticketsSold}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Euro className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Revenue generato</p>
                      <p className="text-sm text-muted-foreground">Incasso totale</p>
                    </div>
                  </div>
                  <span className="font-bold text-primary text-lg">€{stats.ticketRevenue.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                  <Ticket className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium">Nessun biglietto venduto ancora</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Condividi il tuo link per iniziare!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );

  const CancellazioniSection = () => (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <History className="w-4 h-4 text-amber-400" />
            </div>
            Storico Cancellazioni
          </CardTitle>
          <CardDescription>Tracciamento di tutte le cancellazioni e modifiche</CardDescription>
        </CardHeader>
        <CardContent>
          {cancellations.length > 0 ? (
            <div className="space-y-3">
              {cancellations.map((log) => {
                const data = log.entityData ? JSON.parse(log.entityData) : {};
                const getIcon = () => {
                  switch (log.activityType) {
                    case 'list_entry_cancelled': return <Users className="w-4 h-4" />;
                    case 'table_cancelled': return <Armchair className="w-4 h-4" />;
                    case 'ticket_cancelled': return <Ticket className="w-4 h-4" />;
                    default: return <Ban className="w-4 h-4" />;
                  }
                };
                const getColor = () => {
                  switch (log.activityType) {
                    case 'list_entry_cancelled': return "bg-red-500/10 text-red-400 border-red-500/20";
                    case 'table_cancelled': return "bg-amber-500/10 text-amber-400 border-amber-500/20";
                    case 'ticket_cancelled': return "bg-purple-500/10 text-purple-400 border-purple-500/20";
                    default: return "bg-muted/20 text-muted-foreground border-border/30";
                  }
                };
                const getLabel = () => {
                  switch (log.activityType) {
                    case 'list_entry_cancelled': return 'Ospite rimosso dalla lista';
                    case 'table_cancelled': return 'Prenotazione tavolo annullata';
                    case 'ticket_cancelled': return 'Biglietto annullato';
                    default: return 'Cancellazione';
                  }
                };
                
                return (
                  <div 
                    key={log.id}
                    className={cn("flex items-start gap-3 p-4 rounded-xl border", getColor())}
                  >
                    <div className="w-10 h-10 rounded-lg bg-current/10 flex items-center justify-center shrink-0">
                      {getIcon()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{getLabel()}</p>
                      {data.name && (
                        <p className="text-sm opacity-70 truncate">{data.name}</p>
                      )}
                      {log.reason && (
                        <p className="text-xs opacity-50 mt-1">Motivo: {log.reason}</p>
                      )}
                      <div className="flex items-center gap-1 mt-2 text-xs opacity-50">
                        <Timer className="w-3 h-3" />
                        {formatDistanceToNow(new Date(log.createdAt!), { addSuffix: true, locale: it })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400/50" />
              </div>
              <p className="text-muted-foreground font-medium">Nessuna cancellazione</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Tutto in ordine!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const PremiSection = () => (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <Card className="bg-gradient-to-br from-primary/10 via-amber-500/5 to-purple-500/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            Obiettivi & Premi
          </CardTitle>
          <CardDescription>Raggiungi gli obiettivi per sbloccare bonus e premi</CardDescription>
        </CardHeader>
        <CardContent>
          {rewards.length > 0 ? (
            <div className="space-y-4">
              {rewards.map((reward) => {
                const progress = reward.progress;
                const percentage = progress 
                  ? Math.min((progress.currentValue / progress.targetValue) * 100, 100)
                  : 0;
                const isCompleted = progress?.isCompleted;

                return (
                  <div 
                    key={reward.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all",
                      isCompleted 
                        ? "bg-emerald-500/10 border-emerald-500/30" 
                        : "bg-muted/20 border-border/30"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          isCompleted ? "bg-emerald-500/20" : "bg-primary/20"
                        )}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <Target className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold">{reward.name}</p>
                          {reward.description && (
                            <p className="text-sm text-muted-foreground">{reward.description}</p>
                          )}
                        </div>
                      </div>
                      <Badge 
                        className={cn(
                          "shrink-0",
                          isCompleted 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-primary/20 text-primary"
                        )}
                      >
                        {reward.rewardType === 'bonus_cash' && `+€${reward.rewardValue}`}
                        {reward.rewardType === 'percentage_bonus' && `+${reward.rewardValue}%`}
                        {reward.rewardType === 'gift' && 'Premio'}
                        {reward.rewardType === 'badge' && 'Badge'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {reward.targetType === 'tickets_sold' && 'Biglietti venduti'}
                          {reward.targetType === 'guests_added' && 'Ospiti in lista'}
                          {reward.targetType === 'tables_booked' && 'Tavoli prenotati'}
                          {reward.targetType === 'revenue' && 'Revenue generato'}
                        </span>
                        <span className="font-medium">
                          {progress?.currentValue || 0} / {reward.targetValue}
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>

                    {isCompleted && !progress?.rewardClaimed && (
                      <Button 
                        className="w-full mt-4" 
                        size="sm"
                        data-testid={`button-claim-${reward.id}`}
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        Riscuoti Premio
                      </Button>
                    )}
                    {progress?.rewardClaimed && (
                      <div className="flex items-center justify-center gap-2 mt-4 text-emerald-400 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        Premio già riscosso
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">Nessun premio attivo</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Gli obiettivi saranno disponibili a breve</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const tabContent = {
    liste: <ListeSection />,
    biglietti: <BigliettiSection />,
    cancellazioni: <CancellazioniSection />,
    premi: <PremiSection />,
  };

  if (isMobile) {
    return (
      <MobileAppLayout>
        <MobileHeader 
          title="" 
          showBackButton
          onBack={handleBack}
          className="absolute top-0 left-0 right-0 z-10 bg-transparent"
          rightAction={
            <Button size="icon" variant="ghost" onClick={() => refetch()} className="bg-background/30 backdrop-blur-sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          }
        />
        
        <div className="pb-24">
          <EventHeader />
          
          <div className="px-4 pt-4 space-y-4">
            <StatsRow />
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="grid w-full grid-cols-4 h-12">
                <TabsTrigger value="liste" className="text-xs px-1" data-testid="tab-liste">
                  <ListChecks className="w-4 h-4 md:mr-1" />
                  <span className="hidden sm:inline">Liste</span>
                </TabsTrigger>
                <TabsTrigger value="biglietti" className="text-xs px-1" data-testid="tab-biglietti">
                  <Ticket className="w-4 h-4 md:mr-1" />
                  <span className="hidden sm:inline">Biglietti</span>
                </TabsTrigger>
                <TabsTrigger value="cancellazioni" className="text-xs px-1" data-testid="tab-cancellazioni">
                  <History className="w-4 h-4 md:mr-1" />
                  <span className="hidden sm:inline">Storico</span>
                </TabsTrigger>
                <TabsTrigger value="premi" className="text-xs px-1" data-testid="tab-premi">
                  <Trophy className="w-4 h-4 md:mr-1" />
                  <span className="hidden sm:inline">Premi</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={springTransition}
              >
                {tabContent[activeTab]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <p className="text-muted-foreground">
              {format(eventDate, "EEEE d MMMM yyyy 'alle' HH:mm", { locale: it })}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="overflow-hidden">
              <div className="aspect-video relative">
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-500/20" />
                )}
                {isEventToday && (
                  <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground animate-pulse">
                    OGGI
                  </Badge>
                )}
              </div>
            </Card>
            
            <div className="mt-4">
              <StatsRow />
            </div>
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-card/60 border-border/40">
              <CardContent className="p-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="liste" className="flex-1" data-testid="tab-liste-desktop">
                      <ListChecks className="w-4 h-4 mr-2" />
                      Liste & Tavoli
                    </TabsTrigger>
                    <TabsTrigger value="biglietti" className="flex-1" data-testid="tab-biglietti-desktop">
                      <Ticket className="w-4 h-4 mr-2" />
                      Biglietti
                    </TabsTrigger>
                    <TabsTrigger value="cancellazioni" className="flex-1" data-testid="tab-cancellazioni-desktop">
                      <History className="w-4 h-4 mr-2" />
                      Cancellazioni
                    </TabsTrigger>
                    <TabsTrigger value="premi" className="flex-1" data-testid="tab-premi-desktop">
                      <Trophy className="w-4 h-4 mr-2" />
                      Premi
                    </TabsTrigger>
                  </TabsList>

                  <ScrollArea className="h-[600px] pr-4">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={springTransition}
                      >
                        {tabContent[activeTab]}
                      </motion.div>
                    </AnimatePresence>
                  </ScrollArea>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
