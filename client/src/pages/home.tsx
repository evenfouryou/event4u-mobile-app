import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useLocation } from "wouter";
import {
  Wine,
  Calendar,
  Plus,
  Building2,
  TrendingUp,
  Ticket,
  Euro,
  QrCode,
  ChevronRight,
  Sparkles,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import type { Company, UserFeatures, Event } from "@shared/schema";

const springConfig = { type: "spring", stiffness: 400, damping: 30 };

function MobileStatsCard({ 
  icon: Icon, 
  label, 
  value, 
  trend,
  gradient,
  delay = 0 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  trend?: string;
  gradient: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...springConfig, delay }}
      className="glass-card p-4 min-h-[120px] flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend && (
          <span className="text-xs text-teal flex items-center gap-1 bg-teal/10 px-2 py-1 rounded-full">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </motion.div>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  href,
  gradient,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  gradient: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springConfig, delay }}
    >
      <Link href={href}>
        <HapticButton
          variant="ghost"
          className={`w-full h-auto flex flex-col items-center gap-2 py-4 px-3 bg-gradient-to-br ${gradient} border-0 rounded-2xl`}
          hapticType="medium"
          data-testid={`quick-action-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Icon className="h-7 w-7 text-white" />
          </div>
          <span className="text-sm font-medium text-white">{label}</span>
        </HapticButton>
      </Link>
    </motion.div>
  );
}

function RecentEventCard({
  event,
  delay = 0,
}: {
  event: Event;
  delay?: number;
}) {
  const eventDate = new Date(event.startDatetime);
  const formattedDate = eventDate.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...springConfig, delay }}
    >
      <Link href={`/events/${event.id}`}>
        <div 
          className="glass-card p-4 flex items-center gap-4 active:scale-[0.98] transition-transform min-h-[72px]"
          onClick={() => triggerHaptic('light')}
          data-testid={`event-card-${event.id}`}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{event.name}</p>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </Link>
    </motion.div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const isSuperAdmin = user?.role === 'super_admin';
  const isBartender = user?.role === 'bartender';
  const isWarehouse = user?.role === 'warehouse';
  const isCassiere = user?.role === 'cassiere';

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: isSuperAdmin,
  });

  const { data: userFeatures } = useQuery<UserFeatures>({
    queryKey: ['/api/user-features/current/my'],
    enabled: !isSuperAdmin && !isBartender && !isWarehouse && !isCassiere,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    enabled: !isSuperAdmin && !isBartender && !isWarehouse && !isCassiere,
  });

  const recentEvents = events.slice(0, 3);

  useEffect(() => {
    if (isBartender || isWarehouse) {
      setLocation('/beverage');
    }
    if (isCassiere) {
      setLocation('/cassa-biglietti');
    }
  }, [isBartender, isWarehouse, isCassiere, setLocation]);

  if (isBartender || isWarehouse || isCassiere) {
    return null;
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  if (isSuperAdmin) {
    return (
      <div 
        className="min-h-screen px-4 pt-2 pb-24"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springConfig}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
                {getInitials(user?.firstName ?? undefined, user?.lastName ?? undefined)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">{getGreeting()}</p>
              <h1 className="text-xl font-bold">{user?.firstName || 'Admin'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            <span className="text-xs text-teal font-medium">Online</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {companiesLoading ? (
            <>
              <Skeleton className="h-[120px] rounded-2xl" />
              <Skeleton className="h-[120px] rounded-2xl" />
              <Skeleton className="h-[120px] rounded-2xl" />
              <Skeleton className="h-[120px] rounded-2xl" />
            </>
          ) : (
            <>
              <MobileStatsCard 
                icon={Building2} 
                label="Aziende Totali" 
                value={companies?.length || 0}
                gradient="from-indigo-500 to-purple-600"
                delay={0.1}
              />
              <MobileStatsCard 
                icon={Sparkles} 
                label="Aziende Attive" 
                value={companies?.filter(c => c.active).length || 0}
                gradient="from-teal-500 to-emerald-600"
                trend="+12%"
                delay={0.15}
              />
              <MobileStatsCard 
                icon={Calendar} 
                label="Eventi Mese" 
                value="--"
                gradient="from-amber-500 to-orange-600"
                delay={0.2}
              />
              <MobileStatsCard 
                icon={Euro} 
                label="Incasso Totale" 
                value="--"
                gradient="from-rose-500 to-pink-600"
                delay={0.25}
              />
            </>
          )}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.3 }}
          className="mb-6"
        >
          <Link href="/companies">
            <HapticButton
              className="w-full h-14 gradient-golden text-black font-semibold text-base rounded-2xl"
              hapticType="medium"
              data-testid="button-create-company"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nuova Azienda
            </HapticButton>
          </Link>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.35 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-4 border-b border-white/5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Aziende Recenti
            </h2>
          </div>
          <div className="p-3">
            {companiesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : companies && companies.length > 0 ? (
              <div className="space-y-2">
                {companies.slice(0, 5).map((company, index) => (
                  <motion.div
                    key={company.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...springConfig, delay: 0.4 + index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-background/50 active:bg-background/80 transition-colors min-h-[64px]"
                    onClick={() => triggerHaptic('light')}
                    data-testid={`company-item-${company.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">{company.taxId || 'P.IVA non specificata'}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      company.active 
                        ? 'bg-teal/20 text-teal' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {company.active ? 'Attiva' : 'Inattiva'}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground mb-4">Nessuna azienda presente</p>
                <Link href="/companies">
                  <HapticButton 
                    className="gradient-golden text-black min-h-[48px]" 
                    hapticType="medium"
                    data-testid="button-create-first-company"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Prima Azienda
                  </HapticButton>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen px-4 pt-2 pb-24"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
    >
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springConfig}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
              {getInitials(user?.firstName ?? undefined, user?.lastName ?? undefined)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">{getGreeting()}</p>
            <h1 className="text-xl font-bold">{user?.firstName || 'Gestore'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          <span className="text-xs text-teal font-medium">Online</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <MobileStatsCard 
          icon={Calendar} 
          label="Eventi Attivi" 
          value={events.filter(e => new Date(e.startDatetime) >= new Date()).length}
          gradient="from-indigo-500 to-purple-600"
          delay={0.1}
        />
        <MobileStatsCard 
          icon={Ticket} 
          label="Biglietti Venduti" 
          value="--"
          gradient="from-amber-500 to-orange-600"
          delay={0.15}
        />
        <MobileStatsCard 
          icon={Euro} 
          label="Incasso Oggi" 
          value="€0"
          gradient="from-teal-500 to-emerald-600"
          trend="+0%"
          delay={0.2}
        />
        <MobileStatsCard 
          icon={Clock} 
          label="Prossimo Evento" 
          value={recentEvents[0] ? new Date(recentEvents[0].startDatetime).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '--'}
          gradient="from-rose-500 to-pink-600"
          delay={0.25}
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springConfig, delay: 0.3 }}
        className="mb-6"
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Azioni Rapide
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <QuickActionButton
            icon={Plus}
            label="Nuovo Evento"
            href="/event-wizard"
            gradient="from-indigo-500 to-purple-600"
            delay={0.35}
          />
          <QuickActionButton
            icon={QrCode}
            label="Scanner"
            href="/e4u-scanner"
            gradient="from-teal-500 to-emerald-600"
            delay={0.4}
          />
          <QuickActionButton
            icon={Wine}
            label="Beverage"
            href="/beverage"
            gradient="from-amber-500 to-orange-600"
            delay={0.45}
          />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springConfig, delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Eventi Recenti
          </h2>
          <Link href="/events">
            <span 
              className="text-sm text-primary font-medium flex items-center gap-1"
              onClick={() => triggerHaptic('light')}
            >
              Vedi tutti
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
        
        {eventsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[72px] rounded-2xl" />
            <Skeleton className="h-[72px] rounded-2xl" />
            <Skeleton className="h-[72px] rounded-2xl" />
          </div>
        ) : recentEvents.length > 0 ? (
          <div className="space-y-3">
            {recentEvents.map((event, index) => (
              <RecentEventCard
                key={event.id}
                event={event}
                delay={0.55 + index * 0.05}
              />
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springConfig, delay: 0.55 }}
            className="glass-card p-8 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-4">Nessun evento creato</p>
            <Link href="/event-wizard">
              <HapticButton 
                className="gradient-golden text-black min-h-[48px]" 
                hapticType="medium"
                data-testid="button-create-first-event"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crea Primo Evento
              </HapticButton>
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
