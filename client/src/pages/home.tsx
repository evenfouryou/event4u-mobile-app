import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import {
  Wine,
  Calculator,
  Users,
  Database,
  ArrowRight,
  Calendar,
  Plus,
  Building2,
  FileText,
  Receipt,
  TrendingUp,
  Sparkles,
  Clock,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Company, UserFeatures, PrinterAgent } from "@shared/schema";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  gradient: string;
  iconBg: string;
  available?: boolean;
  delay?: number;
}

function ModuleCard({
  title,
  description,
  icon: Icon,
  href,
  gradient,
  iconBg,
  available = true,
  delay = 0,
}: ModuleCardProps) {
  const content = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`glass-card p-4 sm:p-6 h-full transition-all duration-300 group ${
        available 
          ? 'hover:border-primary/30 cursor-pointer' 
          : 'opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold truncate">{title}</h3>
            {!available && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                Soon
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        </div>
        {available && (
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
        )}
      </div>
    </motion.div>
  );

  if (!available) {
    return content;
  }

  return (
    <Link href={href} data-testid={`module-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {content}
    </Link>
  );
}

function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  trend,
  delay = 0 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  trend?: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card p-3 sm:p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {trend && (
          <span className="text-xs text-teal flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
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

  const { data: printerAgents = [] } = useQuery<PrinterAgent[]>({
    queryKey: ['/api/printers/agents'],
    enabled: !isSuperAdmin && !isBartender && !isWarehouse && !isCassiere,
    refetchInterval: 30000,
  });
  
  const onlineAgents = printerAgents.filter(a => a.status === 'online');

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

  // Super Admin Dashboard
  if (isSuperAdmin) {
    return (
      <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
              <span className="text-xs text-teal font-medium">Sistema Attivo</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Ciao, {user?.firstName}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Panoramica del sistema Event4U
            </p>
          </div>
          <Button asChild className="gradient-golden text-black font-semibold" data-testid="button-create-company">
            <Link href="/companies">
              <Plus className="h-4 w-4 mr-2" />
              Nuova Azienda
            </Link>
          </Button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          {companiesLoading ? (
            <>
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </>
          ) : (
            <>
              <StatsCard 
                icon={Building2} 
                label="Aziende Totali" 
                value={companies?.length || 0}
                delay={0.1}
              />
              <StatsCard 
                icon={CheckCircle2} 
                label="Aziende Attive" 
                value={companies?.filter(c => c.active).length || 0}
                trend="+12%"
                delay={0.2}
              />
              <StatsCard 
                icon={Users} 
                label="Utenti Totali" 
                value="--"
                delay={0.3}
              />
              <StatsCard 
                icon={Calendar} 
                label="Eventi Questo Mese" 
                value="--"
                delay={0.4}
              />
            </>
          )}
        </div>

        {/* Companies List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6 border-b border-white/5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Aziende Recenti
            </h2>
          </div>
          <div className="p-4">
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
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center justify-between p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-colors"
                    data-testid={`company-item-${company.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground">{company.taxId || 'P.IVA non specificata'}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      company.active 
                        ? 'bg-teal-500/20 text-teal' 
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
                <Button asChild className="gradient-golden text-black" data-testid="button-create-first-company">
                  <Link href="/companies">
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Prima Azienda
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Gestore/Organizer Dashboard
  const modules = [
    {
      title: "Eventi",
      description: "Crea e gestisci i tuoi eventi. Pianifica date, location e ogni dettaglio.",
      icon: Calendar,
      href: "/events",
      gradient: "from-indigo-500 to-purple-600",
      iconBg: "bg-indigo-500",
      enabled: true,
    },
    {
      title: "Beverage",
      description: "Magazzino, postazioni e consumi. Monitora scorte e inventario.",
      icon: Wine,
      href: "/beverage",
      gradient: "from-amber-500 to-orange-600",
      iconBg: "bg-amber-500",
      enabled: userFeatures?.beverageEnabled !== false,
    },
    {
      title: "Contabilità",
      description: "Costi fissi, extra, manutenzioni e documenti contabili.",
      icon: Calculator,
      href: "/accounting",
      gradient: "from-emerald-500 to-teal-600",
      iconBg: "bg-emerald-500",
      enabled: userFeatures?.contabilitaEnabled === true,
    },
    {
      title: "Personale",
      description: "Anagrafica staff, assegnazioni eventi e gestione pagamenti.",
      icon: Users,
      href: "/personnel",
      gradient: "from-blue-500 to-indigo-600",
      iconBg: "bg-blue-500",
      enabled: userFeatures?.personaleEnabled === true,
    },
    {
      title: "Cassa",
      description: "Settori, postazioni e fondi cassa. Monitora entrate e riconciliazioni.",
      icon: Receipt,
      href: "/cash-register",
      gradient: "from-violet-500 to-purple-600",
      iconBg: "bg-violet-500",
      enabled: userFeatures?.cassaEnabled === true,
    },
    {
      title: "File della Serata",
      description: "Documento completo dell'evento con tutti i dati della serata.",
      icon: FileText,
      href: "/night-file",
      gradient: "from-rose-500 to-pink-600",
      iconBg: "bg-rose-500",
      enabled: userFeatures?.nightFileEnabled === true,
    },
    {
      title: "Analytics",
      description: "Report avanzati, statistiche e insights per il tuo business.",
      icon: Database,
      href: "/analytics",
      gradient: "from-slate-500 to-gray-600",
      iconBg: "bg-slate-500",
      enabled: false,
    },
  ];

  const enabledModules = modules.filter(m => m.enabled);
  const disabledModules = modules.filter(m => !m.enabled && m.title !== "Analytics");

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
      {/* Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 sm:mb-8 md:mb-10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-3 sm:mb-4 glow-golden"
        >
          <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-black" />
        </motion.div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
          Ciao, {user?.firstName || 'Gestore'}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Seleziona un modulo per iniziare
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-3 sm:p-4 mb-4 sm:mb-6 md:mb-8 flex items-center justify-around flex-wrap gap-2"
      >
        <div className="text-center px-4">
          <div className="flex items-center justify-center gap-1 text-teal mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-lg font-bold">0</span>
          </div>
          <p className="text-xs text-muted-foreground">Eventi Oggi</p>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div className="text-center px-4">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-lg font-bold">0</span>
          </div>
          <p className="text-xs text-muted-foreground">Questa Settimana</p>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div className="text-center px-4">
          <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
            <Wine className="h-4 w-4" />
            <span className="text-lg font-bold">0</span>
          </div>
          <p className="text-xs text-muted-foreground">Prodotti</p>
        </div>
        {printerAgents.length > 0 && (
          <>
            <div className="w-px h-10 bg-white/10" />
            <Link href="/printer-settings" className="text-center px-4 cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-printer-status">
              <div className={`flex items-center justify-center gap-1 mb-1 ${onlineAgents.length > 0 ? 'text-teal' : 'text-red-400'}`}>
                <Printer className="h-4 w-4" />
                <span className="text-lg font-bold">{onlineAgents.length}/{printerAgents.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Stampanti</p>
            </Link>
          </>
        )}
      </motion.div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {enabledModules.map((module, index) => (
          <ModuleCard
            key={module.title}
            {...module}
            available={true}
            delay={0.1 + index * 0.1}
          />
        ))}
      </div>

      {/* Coming Soon Section */}
      {disabledModules.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-white/10" />
            Altri moduli disponibili
            <span className="flex-1 h-px bg-white/10" />
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {disabledModules.map((module, index) => (
              <ModuleCard
                key={module.title}
                {...module}
                available={false}
                delay={0.6 + index * 0.1}
              />
            ))}
            <ModuleCard
              title="Analytics"
              description="Report avanzati, statistiche e insights per il tuo business."
              icon={Database}
              href="/analytics"
              gradient="from-slate-500 to-gray-600"
              iconBg="bg-slate-500"
              available={false}
              delay={0.7}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
