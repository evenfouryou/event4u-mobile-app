import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { usePrAuth } from "@/hooks/usePrAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  HapticButton, 
  MobileAppLayout, 
  MobileHeader,
  triggerHaptic 
} from "@/components/mobile-primitives";
import {
  Calendar,
  Clock,
  Users,
  ListChecks,
  Armchair,
  Ticket,
  ChevronRight,
  RefreshCw,
  PartyPopper,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Sparkles,
  Eye,
  ArrowRightLeft,
  Loader2,
  User,
  Wallet,
  LogOut,
  Euro,
  TrendingUp,
  Award,
  MoreVertical,
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
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springTransition,
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: springTransition },
};

export default function PrMyEventsPage() {
  const { user } = useAuth();
  const { prProfile } = usePrAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [activeFilter, setActiveFilter] = useState<"upcoming" | "past">("upcoming");
  const [isSwitchingToCustomer, setIsSwitchingToCustomer] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const handleSwitchToCustomer = async () => {
    triggerHaptic('medium');
    setIsSwitchingToCustomer(true);
    try {
      const response = await fetch('/api/pr/switch-to-customer', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: "Successo", description: data.message || "Passaggio a modalità cliente riuscito" });
        window.location.href = data.redirect || '/account';
      } else {
        toast({ title: "Errore", description: data.error || "Impossibile passare a modalità cliente", variant: "destructive" });
        setIsSwitchingToCustomer(false);
      }
    } catch {
      toast({ title: "Errore", description: "Errore di connessione", variant: "destructive" });
      setIsSwitchingToCustomer(false);
    }
  };
  
  const handleLogout = async () => {
    triggerHaptic('medium');
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/login';
    } catch {
      toast({ title: "Errore", description: "Errore durante il logout", variant: "destructive" });
      setIsLoggingOut(false);
    }
  };

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

  const displayedEvents = activeFilter === "upcoming" ? upcomingEvents : pastEvents;

  const handleRefresh = () => {
    triggerHaptic('medium');
    refetch();
  };

  const prName = prProfile?.name || user?.firstName || "PR";
  const prInitials = prName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="text-xs">Bozza</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Programmato</Badge>;
      case 'ongoing':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">In corso</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">Concluso</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const EventCard = ({ event, index }: { event: MyEvent; index: number }) => {
    const eventDate = new Date(event.startDatetime);
    const isEventToday = isToday(eventDate);

    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={index}
        className="group"
      >
        <Card 
          className={`
            overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm
            transition-all duration-300 hover:shadow-xl hover:shadow-primary/5
            ${isEventToday ? 'ring-2 ring-primary shadow-lg shadow-primary/10' : ''}
          `}
          data-testid={`card-event-${event.id}`}
        >
          <div className="relative aspect-[16/9] overflow-hidden">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-purple-500/15 to-blue-500/20 flex items-center justify-center">
                <PartyPopper className="w-16 h-16 text-primary/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
              <div className="flex flex-col gap-1.5">
                {isEventToday && (
                  <Badge className="bg-primary text-primary-foreground font-bold shadow-lg animate-pulse">
                    <Sparkles className="w-3 h-3 mr-1" />
                    OGGI
                  </Badge>
                )}
              </div>
              {getStatusBadge(event.status)}
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-lg font-bold text-white line-clamp-2 mb-2 drop-shadow-lg">
                {event.name}
              </h3>
              <div className="flex items-center gap-4 text-white/90 text-sm">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">
                    {format(eventDate, "EEE d MMM", { locale: it })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">
                    {format(eventDate, "HH:mm")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-4">
            <Link href={`/pr/events/${event.id}`}>
              <Button 
                className="w-full font-semibold"
                onClick={() => triggerHaptic('medium')}
                data-testid={`button-discover-${event.id}`}
              >
                <Eye className="w-4 h-4 mr-2" />
                Scopri di più
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const StatsCard = ({ icon: Icon, value, label, color }: { 
    icon: React.ElementType; 
    value: number; 
    label: string; 
    color: string;
  }) => (
    <motion.div variants={fadeInUp} className="flex-1">
      <Card className="bg-card/60 backdrop-blur-sm border-border/40">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const ProfileHeader = () => (
    <motion.div 
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-blue-500/10 border border-border/40 p-5"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
      
      <div className="relative flex items-center gap-4">
        <Avatar className="w-16 h-16 border-2 border-primary/30">
          <AvatarImage src={prProfile?.profileImage || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
            {prInitials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">Bentornato</p>
          <h2 className="text-xl font-bold text-foreground truncate">{prName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              <Award className="w-3 h-3 mr-1" />
              PR
            </Badge>
            {prProfile?.prCode && (
              <Badge variant="outline" className="text-xs">
                #{prProfile.prCode}
              </Badge>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-profile-menu">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem 
              onClick={handleSwitchToCustomer}
              disabled={isSwitchingToCustomer}
              data-testid="button-switch-to-customer"
            >
              {isSwitchingToCustomer ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-4 h-4 mr-2" />
              )}
              Passa a modalità cliente
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/pr-wallet" className="flex items-center">
                <Wallet className="w-4 h-4 mr-2" />
                Wallet PR
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-destructive"
              data-testid="button-logout"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              Esci
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-4 p-4">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      {[1, 2].map((i) => (
        <Skeleton key={i} className="h-64 w-full rounded-2xl" />
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
          <h3 className="text-xl font-bold text-foreground mb-2">Nessun evento in programma</h3>
          <p className="text-base text-muted-foreground">
            I tuoi prossimi eventi appariranno qui
          </p>
        </>
      )}
      {type === "past" && (
        <>
          <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Nessun evento passato</h3>
          <p className="text-base text-muted-foreground">
            Lo storico dei tuoi eventi apparirà qui
          </p>
        </>
      )}
      {type === "none" && (
        <>
          <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Nessun evento assegnato</h3>
          <p className="text-base text-muted-foreground">
            Quando verrai assegnato a degli eventi, li vedrai qui
          </p>
        </>
      )}
    </motion.div>
  );

  const mobileHeader = (
    <MobileHeader
      title="I Miei Eventi"
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

  if (isLoading) {
    if (isMobile) {
      return (
        <MobileAppLayout header={mobileHeader} noPadding>
          <LoadingSkeleton />
        </MobileAppLayout>
      );
    }
    return (
      <div className="container mx-auto p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileAppLayout header={mobileHeader} noPadding>
        <div className="flex flex-col min-h-full pb-24 px-4 pt-4 space-y-4">
          <ProfileHeader />
          
          <motion.div 
            variants={staggerChildren}
            initial="hidden"
            animate="animate"
            className="grid grid-cols-3 gap-3"
          >
            <StatsCard 
              icon={Calendar} 
              value={myEvents.length} 
              label="Totale" 
              color="bg-primary/10 text-primary" 
            />
            <StatsCard 
              icon={CalendarCheck} 
              value={todayEvents.length} 
              label="Oggi" 
              color="bg-emerald-500/10 text-emerald-400" 
            />
            <StatsCard 
              icon={CalendarClock} 
              value={upcomingEvents.length} 
              label="Prossimi" 
              color="bg-blue-500/10 text-blue-400" 
            />
          </motion.div>

          <motion.div variants={fadeInUp} initial="hidden" animate="visible">
            <div className="flex gap-2 p-1 bg-card/40 rounded-xl border border-border/30">
              <HapticButton
                variant={activeFilter === "upcoming" ? "default" : "ghost"}
                className={`flex-1 rounded-lg font-semibold ${
                  activeFilter === "upcoming" 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground"
                }`}
                onClick={() => setActiveFilter("upcoming")}
                data-testid="filter-upcoming"
              >
                <CalendarClock className="w-4 h-4 mr-2" />
                Prossimi ({upcomingEvents.length})
              </HapticButton>
              <HapticButton
                variant={activeFilter === "past" ? "default" : "ghost"}
                className={`flex-1 rounded-lg font-semibold ${
                  activeFilter === "past" 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground"
                }`}
                onClick={() => setActiveFilter("past")}
                data-testid="filter-past"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Passati ({pastEvents.length})
              </HapticButton>
            </div>
          </motion.div>

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
      </MobileAppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-pr-my-events">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 max-w-md">
            <ProfileHeader />
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              disabled={isRefetching}
              data-testid="button-refresh-desktop"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
          </div>
        </div>

        <motion.div 
          variants={staggerChildren}
          initial="hidden"
          animate="animate"
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <StatsCard 
            icon={Calendar} 
            value={myEvents.length} 
            label="Eventi totali" 
            color="bg-primary/10 text-primary" 
          />
          <StatsCard 
            icon={CalendarCheck} 
            value={todayEvents.length} 
            label="Eventi oggi" 
            color="bg-emerald-500/10 text-emerald-400" 
          />
          <StatsCard 
            icon={CalendarClock} 
            value={upcomingEvents.length} 
            label="Prossimi eventi" 
            color="bg-blue-500/10 text-blue-400" 
          />
          <StatsCard 
            icon={CheckCircle2} 
            value={pastEvents.length} 
            label="Eventi passati" 
            color="bg-purple-500/10 text-purple-400" 
          />
        </motion.div>

        <Card className="bg-card/60 border-border/40">
          <CardContent className="p-4">
            <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
              <TabsList className="w-full max-w-md">
                <TabsTrigger value="upcoming" className="flex-1" data-testid="filter-upcoming-desktop">
                  <CalendarClock className="w-4 h-4 mr-2" />
                  Prossimi ({upcomingEvents.length})
                </TabsTrigger>
                <TabsTrigger value="past" className="flex-1" data-testid="filter-past-desktop">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Passati ({pastEvents.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {displayedEvents.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
