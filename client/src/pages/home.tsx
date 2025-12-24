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
  Settings,
  Menu,
  Eye,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { motion } from "framer-motion";
import { 
  MobileAppLayout, 
  MobileHeader, 
  HapticButton, 
  triggerHaptic 
} from "@/components/mobile-primitives";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Company, Event, UserFeatures } from "@shared/schema";
import { 
  Users, 
  MapPin, 
  Package, 
  UserPlus,
  GraduationCap,
  Store,
  ScanLine,
} from "lucide-react";

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
      className="glass-card p-5 min-h-[140px] flex flex-col justify-between active:scale-[0.98] transition-transform"
      onClick={() => triggerHaptic('light')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        {trend && (
          <span className="text-xs text-teal flex items-center gap-1 bg-teal/10 px-2 py-1.5 rounded-full min-h-[28px]">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-4xl font-bold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
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
          className={`w-full h-auto flex flex-col items-center gap-3 py-5 px-4 bg-gradient-to-br ${gradient} border-0 rounded-3xl min-h-[120px] shadow-lg`}
          hapticType="medium"
          data-testid={`quick-action-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <Icon className="h-8 w-8 text-white" />
          </div>
          <span className="text-base font-semibold text-white">{label}</span>
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
      <Link href={`/events/${event.id}/hub`}>
        <div 
          className="glass-card p-5 flex items-center gap-4 active:scale-[0.98] transition-transform min-h-[88px]"
          onClick={() => triggerHaptic('light')}
          data-testid={`event-card-${event.id}`}
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            <Calendar className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg truncate">{event.name}</p>
            <p className="text-base text-muted-foreground">{formattedDate}</p>
          </div>
          <div className="w-11 h-11 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
            <ChevronRight className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function UserHeader({ 
  user, 
  getGreeting, 
  getInitials,
  onMenuClick
}: { 
  user: any; 
  getGreeting: () => string; 
  getInitials: (firstName?: string, lastName?: string) => string;
  onMenuClick?: () => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfig}
      className="flex items-center justify-between px-4 py-4"
    >
      <div className="flex items-center gap-3">
        <HapticButton
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-11 w-11"
          hapticType="light"
          data-testid="button-menu"
        >
          <Menu className="h-6 w-6" />
        </HapticButton>
        <Avatar className="h-12 w-12 border-2 border-primary/20">
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold text-base">
            {getInitials(user?.firstName ?? undefined, user?.lastName ?? undefined)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm text-muted-foreground">{getGreeting()}</p>
          <h1 className="text-xl font-bold">{user?.firstName || 'Utente'}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-teal/10 px-3 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          <span className="text-sm text-teal font-medium">Online</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();

  const isSuperAdmin = user?.role === 'super_admin';
  const isBartender = user?.role === 'bartender';
  const isWarehouse = user?.role === 'warehouse';
  const isCassiere = user?.role === 'cassiere';

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: isSuperAdmin,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    enabled: !isSuperAdmin && !isBartender && !isWarehouse && !isCassiere,
  });

  // Fetch user features for quick actions filtering (gestore only)
  const isGestore = user?.role === 'gestore';
  const { data: userFeatures } = useQuery<UserFeatures>({
    queryKey: ['/api/user-features/current/my'],
    enabled: isGestore,
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
    if (!isMobile) {
      return (
        <div className="container mx-auto p-6 space-y-6" data-testid="page-home-desktop">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
                  {getInitials(user?.firstName ?? undefined, user?.lastName ?? undefined)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">{getGreeting()}</p>
                <h1 className="text-2xl font-bold">{user?.firstName || 'Utente'}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-teal/10 px-3 py-2 rounded-full">
                <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                <span className="text-sm text-teal font-medium">Online</span>
              </div>
              <Link href="/companies">
                <Button data-testid="button-create-company">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Azienda
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{companiesLoading ? '--' : companies?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Aziende Totali</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{companiesLoading ? '--' : companies?.filter(c => c.active).length || 0}</p>
                    <p className="text-sm text-muted-foreground">Aziende Attive</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">--</p>
                    <p className="text-sm text-muted-foreground">Eventi Mese</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                    <Euro className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">--</p>
                    <p className="text-sm text-muted-foreground">Incasso Totale</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Aziende
                </CardTitle>
                <CardDescription>Gestisci le aziende registrate</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {companiesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : companies && companies.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>P.IVA</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id} data-testid={`company-row-${company.id}`}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.taxId || 'Non specificata'}</TableCell>
                        <TableCell>
                          <Badge variant={company.active ? "default" : "secondary"}>
                            {company.active ? 'Attiva' : 'Inattiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-view-company-${company.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{company.name}</DialogTitle>
                                <DialogDescription>Dettagli azienda</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">P.IVA</p>
                                  <p className="font-medium">{company.taxId || 'Non specificata'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Stato</p>
                                  <Badge variant={company.active ? "default" : "secondary"}>
                                    {company.active ? 'Attiva' : 'Inattiva'}
                                  </Badge>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground mb-4">Nessuna azienda presente</p>
                  <Link href="/companies">
                    <Button data-testid="button-create-first-company">
                      <Plus className="h-4 w-4 mr-2" />
                      Crea Prima Azienda
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <MobileAppLayout
        header={
          <UserHeader 
            user={user} 
            getGreeting={getGreeting} 
            getInitials={getInitials}
            onMenuClick={toggleSidebar}
          />
        }
        contentClassName="pb-24"
      >
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-2 gap-4">
            {companiesLoading ? (
              <>
                <Skeleton className="h-[140px] rounded-2xl" />
                <Skeleton className="h-[140px] rounded-2xl" />
                <Skeleton className="h-[140px] rounded-2xl" />
                <Skeleton className="h-[140px] rounded-2xl" />
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
          >
            <Link href="/companies">
              <HapticButton
                className="w-full h-16 gradient-golden text-black font-semibold text-lg rounded-2xl"
                hapticType="medium"
                data-testid="button-create-company"
              >
                <Plus className="h-6 w-6 mr-3" />
                Nuova Azienda
              </HapticButton>
            </Link>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springConfig, delay: 0.35 }}
            className="glass-card overflow-hidden rounded-3xl"
          >
            <div className="p-5 border-b border-white/5">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <Building2 className="h-6 w-6 text-primary" />
                Aziende Recenti
              </h2>
            </div>
            <div className="p-4">
              {companiesLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
              ) : companies && companies.length > 0 ? (
                <div className="space-y-3">
                  {companies.slice(0, 5).map((company, index) => (
                    <motion.div
                      key={company.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...springConfig, delay: 0.4 + index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-background/50 active:bg-background/80 transition-colors min-h-[80px]"
                      onClick={() => triggerHaptic('light')}
                      data-testid={`company-item-${company.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">{company.name}</p>
                          <p className="text-base text-muted-foreground">{company.taxId || 'P.IVA non specificata'}</p>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-medium min-h-[36px] flex items-center ${
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
                  <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <Building2 className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-lg text-muted-foreground mb-5">Nessuna azienda presente</p>
                  <Link href="/companies">
                    <HapticButton 
                      className="gradient-golden text-black min-h-[52px] text-base" 
                      hapticType="medium"
                      data-testid="button-create-first-company"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Crea Prima Azienda
                    </HapticButton>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-home-desktop">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
                {getInitials(user?.firstName ?? undefined, user?.lastName ?? undefined)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">{getGreeting()}</p>
              <h1 className="text-2xl font-bold">{user?.firstName || 'Utente'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-teal/10 px-3 py-2 rounded-full">
              <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
              <span className="text-sm text-teal font-medium">Online</span>
            </div>
            <Link href="/events/new">
              <Button data-testid="button-create-event">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Evento
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{events.filter(e => new Date(e.startDatetime) >= new Date()).length}</p>
                  <p className="text-sm text-muted-foreground">Eventi Attivi</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Ticket className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">--</p>
                  <p className="text-sm text-muted-foreground">Biglietti Venduti</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <Euro className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">€0</p>
                  <p className="text-sm text-muted-foreground">Incasso Oggi</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{recentEvents[0] ? new Date(recentEvents[0].startDatetime).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '--'}</p>
                  <p className="text-sm text-muted-foreground">Prossimo Evento</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Link href="/events/new">
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Nuovo Evento</p>
                  <p className="text-sm text-muted-foreground">Crea un evento</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/scanner">
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Scanner</p>
                  <p className="text-sm text-muted-foreground">Scansiona biglietti</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/beverage">
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Wine className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Beverage</p>
                  <p className="text-sm text-muted-foreground">Gestione bevande</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Eventi Recenti
              </CardTitle>
              <CardDescription>I tuoi eventi più recenti</CardDescription>
            </div>
            <Link href="/events">
              <Button variant="outline" data-testid="link-view-all-events">
                Vedi tutti
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
              </div>
            ) : recentEvents.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {recentEvents.map((event) => {
                  const eventDate = new Date(event.startDatetime);
                  const isUpcoming = eventDate >= new Date();
                  return (
                    <Link href={`/events/${event.id}/hub`} key={event.id}>
                      <Card className="hover-elevate cursor-pointer h-full" data-testid={`event-card-${event.id}`}>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                              <Calendar className="h-6 w-6 text-primary" />
                            </div>
                            <Badge variant={isUpcoming ? "default" : "secondary"}>
                              {isUpcoming ? 'In arrivo' : 'Passato'}
                            </Badge>
                          </div>
                          <div>
                            <p className="font-semibold text-lg line-clamp-1">{event.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {eventDate.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground mb-4">Nessun evento recente</p>
                <Link href="/event-wizard">
                  <Button data-testid="button-create-first-event">
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Primo Evento
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={
        <UserHeader 
          user={user} 
          getGreeting={getGreeting} 
          getInitials={getInitials}
          onMenuClick={toggleSidebar}
        />
      }
      contentClassName="pb-24"
    >
      <div className="space-y-6 pt-2">
        <div className="grid grid-cols-2 gap-4">
          <MobileStatsCard 
            icon={Calendar} 
            label="Eventi Attivi" 
            value={events.filter(e => new Date(e.startDatetime) >= new Date()).length}
            gradient="from-indigo-500 to-purple-600"
            delay={0.1}
          />
          {(userFeatures?.beverageEnabled !== false) && (
            <MobileStatsCard 
              icon={Ticket} 
              label="Biglietti Venduti" 
              value="--"
              gradient="from-amber-500 to-orange-600"
              delay={0.15}
            />
          )}
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
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Azioni Rapide
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <div className="flex-shrink-0 w-[110px]">
              <QuickActionButton
                icon={Plus}
                label="Nuovo Evento"
                href="/events/new"
                gradient="from-indigo-500 to-purple-600"
                delay={0.35}
              />
            </div>
            {(userFeatures?.scannerEnabled !== false) && (
              <div className="flex-shrink-0 w-[110px]">
                <QuickActionButton
                  icon={ScanLine}
                  label="Scanner"
                  href="/scanner"
                  gradient="from-teal-500 to-emerald-600"
                  delay={0.4}
                />
              </div>
            )}
            {(userFeatures?.beverageEnabled !== false) && (
              <div className="flex-shrink-0 w-[110px]">
                <QuickActionButton
                  icon={Wine}
                  label="Beverage"
                  href="/beverage"
                  gradient="from-amber-500 to-orange-600"
                  delay={0.45}
                />
              </div>
            )}
            <div className="flex-shrink-0 w-[110px]">
              <QuickActionButton
                icon={Users}
                label="Utenti"
                href="/users"
                gradient="from-blue-500 to-cyan-600"
                delay={0.5}
              />
            </div>
            <div className="flex-shrink-0 w-[110px]">
              <QuickActionButton
                icon={MapPin}
                label="Location"
                href="/locations"
                gradient="from-rose-500 to-pink-600"
                delay={0.55}
              />
            </div>
            <div className="flex-shrink-0 w-[110px]">
              <QuickActionButton
                icon={Building2}
                label="Aziende"
                href="/companies"
                gradient="from-violet-500 to-purple-600"
                delay={0.6}
              />
            </div>
            {(userFeatures?.prEnabled !== false) && (
              <div className="flex-shrink-0 w-[110px]">
                <QuickActionButton
                  icon={UserPlus}
                  label="Gestione PR"
                  href="/pr-management"
                  gradient="from-fuchsia-500 to-pink-600"
                  delay={0.65}
                />
              </div>
            )}
            {(userFeatures?.badgesEnabled !== false) && (
              <div className="flex-shrink-0 w-[110px]">
                <QuickActionButton
                  icon={GraduationCap}
                  label="Badge Scuola"
                  href="/school-badges"
                  gradient="from-sky-500 to-blue-600"
                  delay={0.7}
                />
              </div>
            )}
            {(userFeatures?.cassaBigliettiEnabled !== false) && (
              <div className="flex-shrink-0 w-[110px]">
                <QuickActionButton
                  icon={Store}
                  label="Cassa Biglietti"
                  href="/cassa-biglietti"
                  gradient="from-lime-500 to-green-600"
                  delay={0.75}
                />
              </div>
            )}
            <div className="flex-shrink-0 w-[110px]">
              <QuickActionButton
                icon={Package}
                label="Prodotti"
                href="/products"
                gradient="from-orange-500 to-red-600"
                delay={0.8}
              />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Eventi Recenti
            </h2>
            <Link href="/events">
              <HapticButton 
                variant="ghost"
                className="text-base text-primary font-medium flex items-center gap-1 min-h-[44px] px-3"
                hapticType="light"
                data-testid="link-view-all-events"
              >
                Vedi tutti
                <ChevronRight className="h-5 w-5" />
              </HapticButton>
            </Link>
          </div>
          
          {eventsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[88px] rounded-2xl" />
              <Skeleton className="h-[88px] rounded-2xl" />
              <Skeleton className="h-[88px] rounded-2xl" />
            </div>
          ) : recentEvents.length > 0 ? (
            <div className="space-y-4">
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
              className="glass-card p-10 text-center rounded-3xl"
            >
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Calendar className="h-10 w-10 text-primary" />
              </div>
              <p className="text-lg text-muted-foreground mb-5">Nessun evento creato</p>
              <Link href="/event-wizard">
                <HapticButton 
                  className="gradient-golden text-black min-h-[52px] text-base" 
                  hapticType="medium"
                  data-testid="button-create-first-event"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Crea Primo Evento
                </HapticButton>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </MobileAppLayout>
  );
}
