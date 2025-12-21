import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { MobileAppLayout, HapticButton, triggerHaptic, BottomSheet, MobileHeader } from "@/components/mobile-primitives";
import { 
  FileText, 
  Calendar, 
  Euro,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Receipt,
  CreditCard,
  Banknote,
  Landmark,
  MapPin,
  Wine,
  Package,
  ArrowDownUp,
  UserPlus,
  ListPlus,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Event, CashSector, CashPosition, CashEntry, CashFund, Staff, Product, ExtraCost, StaffAssignment, Location, FixedCost } from "@shared/schema";

const springTransition = { type: "spring", stiffness: 400, damping: 30 };

interface EndOfNightReport {
  consumption: Array<{
    productId: string;
    productName: string;
    totalConsumed: number;
    totalReturned: number;
    netConsumed: number;
    totalCost: number;
  }>;
  totalCost: number;
  byStation: Record<string, Array<{
    productId: string;
    productName: string;
    consumed: number;
    returned: number;
    net: number;
  }>>;
}

const tabs = [
  { id: "beverage", label: "Beverage", icon: Wine },
  { id: "cassa", label: "Cassa", icon: Wallet },
  { id: "incassi", label: "Incassi", icon: Receipt },
  { id: "personale", label: "Personale", icon: Users },
  { id: "costi", label: "Costi", icon: TrendingDown },
  { id: "riepilogo", label: "Riepilogo", icon: TrendingUp },
];

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  gradient,
  testId,
  delay = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  gradient: string;
  testId: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay }}
      className="glass-card p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && (
          <span className="text-xs text-teal flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mb-1" data-testid={testId}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{title}</p>
    </motion.div>
  );
}

function ScrollableTabs({ 
  activeTab, 
  onTabChange 
}: { 
  activeTab: string; 
  onTabChange: (tab: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  return (
    <div 
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            onClick={() => {
              triggerHaptic('light');
              onTabChange(tab.id);
            }}
            className={`flex items-center gap-2 px-4 py-3 rounded-full whitespace-nowrap min-h-[48px] transition-colors ${
              isActive 
                ? 'bg-primary text-primary-foreground font-semibold' 
                : 'bg-card border border-border text-muted-foreground'
            }`}
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
            data-testid={`tab-${tab.id}`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm">{tab.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function MobileCard({ 
  children, 
  className = "",
  delay = 0,
}: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay }}
      className={`glass-card rounded-2xl overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({
  icon: Icon,
  iconGradient,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  iconGradient: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="p-4 border-b border-white/10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${iconGradient} flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{title}</h3>
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

export default function NightFilePage() {
  const { user } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("beverage");
  const isAdmin = user?.role === "super_admin" || user?.role === "gestore";

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const eventLocation = locations.find(l => l.id === selectedEvent?.locationId);

  const activeEvents = events.filter(e => 
    e.status === 'ongoing' || e.status === 'scheduled' || e.status === 'closed'
  ).sort((a, b) => new Date(b.startDatetime || 0).getTime() - new Date(a.startDatetime || 0).getTime());

  if (eventsLoading) {
    return (
      <MobileAppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-muted-foreground">Caricamento...</div>
        </div>
      </MobileAppLayout>
    );
  }

  if (selectedEventId && selectedEvent) {
    return (
      <MobileAppLayout
        header={
          <div className="flex items-center gap-3 px-4 py-3 bg-background/95 backdrop-blur-xl border-b border-border">
            <HapticButton 
              variant="ghost" 
              size="icon" 
              onClick={() => setSelectedEventId(null)}
              className="rounded-xl h-11 w-11"
              hapticType="light"
              data-testid="button-back-events"
            >
              <ArrowLeft className="h-5 w-5" />
            </HapticButton>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold truncate" data-testid="text-event-file-title">
                {selectedEvent.name}
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {selectedEvent.startDatetime && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(selectedEvent.startDatetime), "dd MMM", { locale: it })}
                  </span>
                )}
                {eventLocation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {eventLocation.name}
                  </span>
                )}
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              selectedEvent.status === 'ongoing' 
                ? 'bg-teal-500/20 text-teal' 
                : selectedEvent.status === 'closed' 
                  ? 'bg-rose-500/20 text-rose-400' 
                  : 'bg-blue-500/20 text-blue-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                selectedEvent.status === 'ongoing' ? 'bg-teal animate-pulse' : 
                selectedEvent.status === 'closed' ? 'bg-rose-400' : 'bg-blue-400'
              }`} />
              {selectedEvent.status === 'ongoing' ? 'In Corso' : selectedEvent.status === 'closed' ? 'Chiuso' : 'Prog.'}
            </span>
          </div>
        }
        contentClassName="pb-24"
      >
        <div className="py-4 space-y-4">
          <ScrollableTabs activeTab={activeTab} onTabChange={setActiveTab} />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springTransition}
            >
              {activeTab === "beverage" && <BeverageSection eventId={selectedEventId} />}
              {activeTab === "cassa" && (
                <div className="space-y-4">
                  <CashPositionsSection eventId={selectedEventId} isAdmin={isAdmin} />
                  <CashFundsSection eventId={selectedEventId} isAdmin={isAdmin} />
                </div>
              )}
              {activeTab === "incassi" && <CashEntriesSection eventId={selectedEventId} isAdmin={isAdmin} />}
              {activeTab === "personale" && <PersonnelSection eventId={selectedEventId} isAdmin={isAdmin} />}
              {activeTab === "costi" && <CostsSection eventId={selectedEventId} isAdmin={isAdmin} />}
              {activeTab === "riepilogo" && <SummarySection eventId={selectedEventId} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout contentClassName="pb-24">
      <div className="py-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="flex items-center gap-4 mb-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center glow-golden flex-shrink-0">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-night-file-title">
              File della Serata
            </h1>
            <p className="text-muted-foreground text-sm">
              Seleziona un evento
            </p>
          </div>
        </motion.div>

        {activeEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.1 }}
            className="glass-card p-8 text-center rounded-2xl"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center mx-auto mb-6">
              <Calendar className="h-10 w-10 text-white/70" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessun Evento</h3>
            <p className="text-muted-foreground">
              Crea prima un evento dalla sezione Eventi
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {activeEvents.map((event, index) => {
              const location = locations.find(l => l.id === event.locationId);
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: index * 0.05 }}
                  className="glass-card overflow-hidden rounded-2xl active:scale-[0.98] transition-transform"
                  onClick={() => {
                    triggerHaptic('medium');
                    setSelectedEventId(event.id);
                  }}
                  data-testid={`card-event-${event.id}`}
                >
                  <div className={`h-1 ${
                    event.status === 'ongoing' ? 'bg-gradient-to-r from-teal-500 to-cyan-500' : 
                    event.status === 'closed' ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
                    'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`} />
                  <div className="p-4">
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <h3 className="text-lg font-semibold truncate">{event.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        event.status === 'ongoing' 
                          ? 'bg-teal-500/20 text-teal' 
                          : event.status === 'closed' 
                            ? 'bg-rose-500/20 text-rose-400' 
                            : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          event.status === 'ongoing' ? 'bg-teal animate-pulse' : 
                          event.status === 'closed' ? 'bg-rose-400' : 'bg-blue-400'
                        }`} />
                        {event.status === 'ongoing' ? 'In Corso' : event.status === 'closed' ? 'Chiuso' : 'Programmato'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {event.startDatetime && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(event.startDatetime), "dd MMMM yyyy", { locale: it })}
                        </div>
                      )}
                      {location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {location.name}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <span className="text-sm text-muted-foreground">Apri file serata</span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </MobileAppLayout>
  );
}

function BeverageSection({ eventId }: { eventId: string }) {
  const { data: report, isLoading } = useQuery<EndOfNightReport>({
    queryKey: ["/api/reports/end-of-night", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/end-of-night/${eventId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch report");
      return res.json();
    },
  });

  const { data: stocks = [] } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "stocks"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/stocks`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch stocks");
      return res.json();
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center rounded-2xl">
        <div className="text-muted-foreground">Caricamento dati beverage...</div>
      </div>
    );
  }

  const enrichedStocks = stocks.map(stock => {
    const product = products.find(p => p.id === stock.productId);
    return { ...stock, product };
  });

  return (
    <div className="space-y-4">
      <MobileCard>
        <SectionHeader
          icon={Package}
          iconGradient="from-violet-500 to-purple-600"
          title="Stock Evento"
          subtitle="Inventario caricato"
        />
        <div className="p-4">
          {enrichedStocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Nessuno stock caricato</p>
              <p className="text-sm">Vai al Magazzino per trasferire prodotti</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enrichedStocks.map((stock, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: idx * 0.03 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5"
                  data-testid={`card-stock-${idx}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{stock.product?.name || "N/D"}</p>
                    <p className="text-sm text-muted-foreground">{stock.product?.code || "-"}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-bold text-xl">{parseFloat(stock.quantity).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{stock.product?.unitOfMeasure || "-"}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </MobileCard>

      <MobileCard delay={0.1}>
        <SectionHeader
          icon={ArrowDownUp}
          iconGradient="from-rose-500 to-pink-600"
          title="Consumi Evento"
          subtitle="Consumazioni e resi"
        />
        <div className="p-4">
          {!report?.consumption || report.consumption.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowDownUp className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Nessun consumo registrato</p>
            </div>
          ) : (
            <div className="space-y-3">
              {report.consumption.map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: idx * 0.03 }}
                  className="p-4 rounded-xl bg-white/5"
                  data-testid={`card-consumption-${idx}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-medium">{item.productName}</p>
                    <p className="font-bold text-rose-400">€{item.totalCost.toFixed(2)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-muted-foreground text-xs mb-1">Consumato</p>
                      <p className="font-medium">{item.totalConsumed.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-muted-foreground text-xs mb-1">Reso</p>
                      <p className="font-medium text-teal">{item.totalReturned.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <p className="text-muted-foreground text-xs mb-1">Netto</p>
                      <p className="font-bold">{item.netConsumed.toFixed(2)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-muted-foreground">Costo totale consumi:</span>
                <span className="text-xl font-bold text-rose-400">€{report.totalCost.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </MobileCard>
    </div>
  );
}

function CashPositionsSection({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<CashPosition | null>(null);

  const { data: positions = [], isLoading } = useQuery<CashPosition[]>({
    queryKey: ["/api/cash-positions"],
  });

  const { data: sectors = [] } = useQuery<CashSector[]>({
    queryKey: ["/api/cash-sectors"],
  });

  const eventPositions = positions.filter(p => p.eventId === eventId);
  const activeSectors = sectors.filter(s => s.active);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cash-positions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-positions"] });
      setIsDialogOpen(false);
      toast({ title: "Postazione creata" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/cash-positions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-positions"] });
      setEditingPosition(null);
      setIsDialogOpen(false);
      toast({ title: "Postazione aggiornata" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/cash-positions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-positions"] });
      toast({ title: "Postazione eliminata" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sectorValue = formData.get("sectorId") as string;
    const data = {
      eventId: eventId,
      name: formData.get("name") as string,
      sectorId: sectorValue === "_none" ? sectors[0]?.id : sectorValue,
    };

    if (editingPosition) {
      updateMutation.mutate({ id: editingPosition.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getSectorName = (sectorId: string | null) => {
    if (!sectorId) return "Generale";
    const s = sectors.find(x => x.id === sectorId);
    return s?.name || "N/D";
  };

  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center rounded-2xl">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return (
    <MobileCard>
      <SectionHeader
        icon={LayoutGrid}
        iconGradient="from-cyan-500 to-blue-600"
        title="Postazioni Cassa"
        subtitle="Punti di incasso evento"
        action={isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingPosition(null);
          }}>
            <DialogTrigger asChild>
              <HapticButton size="icon" className="h-11 w-11 rounded-xl gradient-golden text-black" hapticType="medium" data-testid="button-add-position">
                <Plus className="h-5 w-5" />
              </HapticButton>
            </DialogTrigger>
            <DialogContent className="mx-4 max-h-[85vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle>{editingPosition ? "Modifica Postazione" : "Nuova Postazione"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingPosition?.name || ""}
                    required
                    className="h-12"
                    data-testid="input-position-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sectorId">Settore *</Label>
                  <Select name="sectorId" defaultValue={editingPosition?.sectorId || activeSectors[0]?.id || ""}>
                    <SelectTrigger className="h-12" data-testid="select-position-sector">
                      <SelectValue placeholder="Seleziona settore" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSectors.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <HapticButton type="submit" className="w-full h-12 gradient-golden text-black font-semibold" disabled={createMutation.isPending || updateMutation.isPending} hapticType="success" data-testid="button-save-position">
                    {editingPosition ? "Aggiorna" : "Crea"}
                  </HapticButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />
      <div className="p-4">
        {eventPositions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nessuna postazione configurata</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eventPositions.map((position, idx) => (
              <motion.div 
                key={position.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: idx * 0.03 }}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5"
                data-testid={`card-position-${position.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{position.name}</p>
                  <span className="text-xs text-muted-foreground">{getSectorName(position.sectorId)}</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <HapticButton
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11"
                      onClick={() => {
                        setEditingPosition(position);
                        setIsDialogOpen(true);
                      }}
                      hapticType="light"
                      data-testid={`button-edit-position-${position.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </HapticButton>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <HapticButton size="icon" variant="ghost" className="h-11 w-11" hapticType="light" data-testid={`button-delete-position-${position.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </HapticButton>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="mx-4 rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminare questa postazione?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Questa azione non può essere annullata.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="h-12">Annulla</AlertDialogCancel>
                          <AlertDialogAction className="h-12" onClick={() => deleteMutation.mutate(position.id)}>
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </MobileCard>
  );
}

function CashFundsSection({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<CashFund | null>(null);

  const { data: funds = [], isLoading } = useQuery<CashFund[]>({
    queryKey: ["/api/cash-funds"],
  });

  const { data: positions = [] } = useQuery<CashPosition[]>({
    queryKey: ["/api/cash-positions"],
  });

  const eventPositions = positions.filter(p => p.eventId === eventId);
  const eventFunds = funds.filter(f => f.eventId === eventId);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cash-funds", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-funds"] });
      setIsDialogOpen(false);
      toast({ title: "Fondo registrato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/cash-funds/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-funds"] });
      setEditingFund(null);
      setIsDialogOpen(false);
      toast({ title: "Fondo aggiornato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/cash-funds/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-funds"] });
      toast({ title: "Fondo eliminato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const positionValue = formData.get("positionId") as string;
    const data = {
      eventId: eventId,
      positionId: positionValue === "_none" ? null : positionValue || null,
      type: formData.get("type") as string,
      amount: formData.get("amount") as string,
      notes: formData.get("notes") as string || null,
    };

    if (editingFund) {
      updateMutation.mutate({ id: editingFund.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getPositionName = (positionId: string | null) => {
    if (!positionId) return "Generale";
    const p = positions.find(x => x.id === positionId);
    return p?.name || "N/D";
  };

  const openingTotal = eventFunds.filter(f => f.type === 'opening').reduce((sum, f) => sum + parseFloat(f.amount), 0);
  const closingTotal = eventFunds.filter(f => f.type === 'closing').reduce((sum, f) => sum + parseFloat(f.amount), 0);

  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center rounded-2xl">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return (
    <MobileCard delay={0.1}>
      <SectionHeader
        icon={Wallet}
        iconGradient="from-emerald-500 to-green-600"
        title="Fondi Cassa"
        subtitle="Apertura e chiusura"
        action={isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingFund(null);
          }}>
            <DialogTrigger asChild>
              <HapticButton size="icon" className="h-11 w-11 rounded-xl gradient-golden text-black" hapticType="medium" data-testid="button-add-fund">
                <Plus className="h-5 w-5" />
              </HapticButton>
            </DialogTrigger>
            <DialogContent className="mx-4 max-h-[85vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle>{editingFund ? "Modifica Fondo" : "Registra Fondo"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="positionId">Postazione</Label>
                  <Select name="positionId" defaultValue={editingFund?.positionId || "_none"}>
                    <SelectTrigger className="h-12" data-testid="select-fund-position">
                      <SelectValue placeholder="Seleziona postazione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Generale</SelectItem>
                      {eventPositions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select name="type" defaultValue={editingFund?.type || "opening"}>
                    <SelectTrigger className="h-12" data-testid="select-fund-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opening">Apertura</SelectItem>
                      <SelectItem value="closing">Chiusura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Importo (€) *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    defaultValue={editingFund?.amount || ""}
                    required
                    className="h-12"
                    data-testid="input-fund-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Note</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={editingFund?.notes || ""}
                    data-testid="input-fund-notes"
                  />
                </div>
                <DialogFooter>
                  <HapticButton type="submit" className="w-full h-12 gradient-golden text-black font-semibold" disabled={createMutation.isPending || updateMutation.isPending} hapticType="success" data-testid="button-save-fund">
                    {editingFund ? "Aggiorna" : "Registra"}
                  </HapticButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />
      <div className="p-4">
        {eventFunds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nessun fondo registrato</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {eventFunds.map((fund, idx) => (
                <motion.div 
                  key={fund.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: idx * 0.03 }}
                  className="p-4 rounded-xl bg-white/5"
                  data-testid={`card-fund-${fund.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{getPositionName(fund.positionId)}</p>
                        <Badge variant={fund.type === 'opening' ? 'outline' : 'secondary'} className="text-xs">
                          {fund.type === 'opening' ? 'Apertura' : 'Chiusura'}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold">€{parseFloat(fund.amount).toFixed(2)}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <HapticButton
                          size="icon"
                          variant="ghost"
                          className="h-11 w-11"
                          onClick={() => {
                            setEditingFund(fund);
                            setIsDialogOpen(true);
                          }}
                          hapticType="light"
                          data-testid={`button-edit-fund-${fund.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </HapticButton>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <HapticButton size="icon" variant="ghost" className="h-11 w-11" hapticType="light" data-testid={`button-delete-fund-${fund.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </HapticButton>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="mx-4 rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare questo fondo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Questa azione non può essere annullata.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="h-12">Annulla</AlertDialogCancel>
                              <AlertDialogAction className="h-12" onClick={() => deleteMutation.mutate(fund.id)}>
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                  {(fund.notes || fund.recordedAt) && (
                    <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Data</p>
                        <p className="text-muted-foreground">
                          {fund.recordedAt && format(new Date(fund.recordedAt), "dd/MM HH:mm", { locale: it })}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Note</p>
                        <p className="text-muted-foreground truncate">{fund.notes || "-"}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-xl bg-white/5">
                <p className="text-sm text-muted-foreground">Totale Apertura</p>
                <p className="text-lg font-bold">€{openingTotal.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5">
                <p className="text-sm text-muted-foreground">Totale Chiusura</p>
                <p className="text-lg font-bold">€{closingTotal.toFixed(2)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </MobileCard>
  );
}

function CashEntriesSection({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery<CashEntry[]>({
    queryKey: ["/api/cash-entries"],
  });

  const { data: positions = [] } = useQuery<CashPosition[]>({
    queryKey: ["/api/cash-positions"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const eventPositions = positions.filter(p => p.eventId === eventId);
  const eventEntries = entries.filter(e => e.eventId === eventId);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cash-entries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-entries"] });
      setIsDialogOpen(false);
      toast({ title: "Incasso registrato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/cash-entries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-entries"] });
      setEditingEntry(null);
      setIsDialogOpen(false);
      toast({ title: "Incasso aggiornato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/cash-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-entries"] });
      toast({ title: "Incasso eliminato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productValue = formData.get("productId") as string;
    const data = {
      eventId: eventId,
      positionId: formData.get("positionId") as string,
      entryType: formData.get("entryType") as string,
      productId: productValue === "_none" ? null : productValue || null,
      description: formData.get("description") as string || null,
      quantity: formData.get("quantity") as string || null,
      unitPrice: formData.get("unitPrice") as string || null,
      totalAmount: formData.get("totalAmount") as string,
      paymentMethod: formData.get("paymentMethod") as string,
      notes: formData.get("notes") as string || null,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getPositionName = (positionId: string) => {
    const p = positions.find(x => x.id === positionId);
    return p?.name || "N/D";
  };

  const paymentMethodLabels: Record<string, { label: string; icon: typeof CreditCard }> = {
    cash: { label: "Contanti", icon: Banknote },
    card: { label: "Carta", icon: CreditCard },
    online: { label: "Online", icon: Landmark },
    credits: { label: "Crediti", icon: Wallet },
  };

  const totalEntries = eventEntries.reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  const cashTotal = eventEntries.filter(e => e.paymentMethod === 'cash').reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  const cardTotal = eventEntries.filter(e => e.paymentMethod === 'card').reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);

  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center rounded-2xl">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return (
    <MobileCard>
      <SectionHeader
        icon={Receipt}
        iconGradient="from-amber-500 to-yellow-600"
        title="Registrazione Incassi"
        subtitle="Incassi per postazione"
        action={isAdmin && eventPositions.length > 0 && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingEntry(null);
          }}>
            <DialogTrigger asChild>
              <HapticButton size="icon" className="h-11 w-11 rounded-xl gradient-golden text-black" hapticType="medium" data-testid="button-add-entry">
                <Plus className="h-5 w-5" />
              </HapticButton>
            </DialogTrigger>
            <DialogContent className="mx-4 max-h-[85vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle>{editingEntry ? "Modifica Incasso" : "Nuovo Incasso"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="positionId">Postazione *</Label>
                  <Select name="positionId" defaultValue={editingEntry?.positionId || ""}>
                    <SelectTrigger className="h-12" data-testid="select-entry-position">
                      <SelectValue placeholder="Seleziona postazione" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventPositions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="entryType">Tipo *</Label>
                    <Select name="entryType" defaultValue={editingEntry?.entryType || "monetary"}>
                      <SelectTrigger className="h-12" data-testid="select-entry-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monetary">Monetario</SelectItem>
                        <SelectItem value="quantity">Quantità</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Metodo *</Label>
                    <Select name="paymentMethod" defaultValue={editingEntry?.paymentMethod || "cash"}>
                      <SelectTrigger className="h-12" data-testid="select-entry-payment-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Contanti</SelectItem>
                        <SelectItem value="card">Carta</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="credits">Crediti</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productId">Prodotto</Label>
                  <Select name="productId" defaultValue={editingEntry?.productId || "_none"}>
                    <SelectTrigger className="h-12" data-testid="select-entry-product">
                      <SelectValue placeholder="Seleziona prodotto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Nessuno</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrizione</Label>
                  <Input
                    id="description"
                    name="description"
                    defaultValue={editingEntry?.description || ""}
                    placeholder="es. Ingresso VIP"
                    className="h-12"
                    data-testid="input-entry-description"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Qtà</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      step="0.01"
                      defaultValue={editingEntry?.quantity || ""}
                      className="h-12"
                      data-testid="input-entry-quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">P.Unit</Label>
                    <Input
                      id="unitPrice"
                      name="unitPrice"
                      type="number"
                      step="0.01"
                      defaultValue={editingEntry?.unitPrice || ""}
                      className="h-12"
                      data-testid="input-entry-unit-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Tot. *</Label>
                    <Input
                      id="totalAmount"
                      name="totalAmount"
                      type="number"
                      step="0.01"
                      defaultValue={editingEntry?.totalAmount || ""}
                      required
                      className="h-12"
                      data-testid="input-entry-total"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Note</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={editingEntry?.notes || ""}
                    data-testid="input-entry-notes"
                  />
                </div>
                <DialogFooter>
                  <HapticButton type="submit" className="w-full h-12 gradient-golden text-black font-semibold" disabled={createMutation.isPending || updateMutation.isPending} hapticType="success" data-testid="button-save-entry">
                    {editingEntry ? "Aggiorna" : "Registra"}
                  </HapticButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />
      <div className="p-4">
        {eventPositions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Configura prima le postazioni</p>
            <p className="text-sm">dal tab Cassa</p>
          </div>
        ) : eventEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nessun incasso registrato</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {eventEntries.map((entry, idx) => {
                const PaymentIcon = paymentMethodLabels[entry.paymentMethod]?.icon || CreditCard;
                return (
                  <motion.div 
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springTransition, delay: idx * 0.03 }}
                    className="p-4 rounded-xl bg-white/5"
                    data-testid={`card-entry-${entry.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{getPositionName(entry.positionId)}</p>
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <PaymentIcon className="h-3 w-3" />
                            {paymentMethodLabels[entry.paymentMethod]?.label || entry.paymentMethod}
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold text-primary">€{parseFloat(entry.totalAmount).toFixed(2)}</p>
                        {entry.description && (
                          <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 flex-shrink-0">
                          <HapticButton
                            size="icon"
                            variant="ghost"
                            className="h-11 w-11"
                            onClick={() => {
                              setEditingEntry(entry);
                              setIsDialogOpen(true);
                            }}
                            hapticType="light"
                            data-testid={`button-edit-entry-${entry.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </HapticButton>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <HapticButton size="icon" variant="ghost" className="h-11 w-11" hapticType="light" data-testid={`button-delete-entry-${entry.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </HapticButton>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="mx-4 rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminare questo incasso?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Questa azione non può essere annullata.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="h-12">Annulla</AlertDialogCancel>
                                <AlertDialogAction className="h-12" onClick={() => deleteMutation.mutate(entry.id)}>
                                  Elimina
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Contanti</span>
                  </div>
                  <p className="text-lg font-bold">€{cashTotal.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Carta</span>
                  </div>
                  <p className="text-lg font-bold">€{cardTotal.toFixed(2)}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary/10 text-center">
                <span className="text-sm text-muted-foreground">Totale Incassi</span>
                <p className="text-2xl font-bold text-primary">€{totalEntries.toFixed(2)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </MobileCard>
  );
}

function PersonnelSection({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: assignments = [], isLoading } = useQuery<StaffAssignment[]>({
    queryKey: ["/api/staff-assignments"],
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const eventAssignments = assignments.filter(a => a.eventId === eventId);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/staff-assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-assignments"] });
      setIsDialogOpen(false);
      toast({ title: "Staff assegnato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/staff-assignments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-assignments"] });
      toast({ title: "Assegnazione aggiornata" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/staff-assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-assignments"] });
      toast({ title: "Assegnazione rimossa" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      eventId: eventId,
      staffId: formData.get("staffId") as string,
      role: formData.get("role") as string || null,
      compensationAmount: formData.get("compensationAmount") as string || "0",
      status: "scheduled",
    };
    createMutation.mutate(data);
  };

  const getStaffName = (staffId: string) => {
    const s = staff.find(x => x.id === staffId);
    return s ? `${s.firstName} ${s.lastName}` : "N/D";
  };

  const getStaffRole = (staffId: string) => {
    const s = staff.find(x => x.id === staffId);
    return s?.role || "-";
  };

  const availableStaff = staff.filter(s => 
    s.active && 
    !eventAssignments.some(a => a.staffId === s.id)
  );

  const totalCost = eventAssignments.reduce((sum, a) => {
    return sum + parseFloat(a.compensationAmount || "0") + parseFloat(a.bonus || "0");
  }, 0);

  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center rounded-2xl">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return (
    <MobileCard>
      <SectionHeader
        icon={Users}
        iconGradient="from-indigo-500 to-purple-600"
        title="Personale Evento"
        subtitle="Staff assegnato"
        action={isAdmin && availableStaff.length > 0 && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <HapticButton size="icon" className="h-11 w-11 rounded-xl gradient-golden text-black" hapticType="medium" data-testid="button-add-staff">
                <UserPlus className="h-5 w-5" />
              </HapticButton>
            </DialogTrigger>
            <DialogContent className="mx-4 max-h-[85vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle>Assegna Staff</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="staffId">Membro Staff *</Label>
                  <Select name="staffId" required>
                    <SelectTrigger className="h-12" data-testid="select-staff-member">
                      <SelectValue placeholder="Seleziona staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStaff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} - {s.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Mansione Evento</Label>
                  <Input
                    id="role"
                    name="role"
                    placeholder="es. Barman principale"
                    className="h-12"
                    data-testid="input-staff-role"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compensationAmount">Compenso (€)</Label>
                  <Input
                    id="compensationAmount"
                    name="compensationAmount"
                    type="number"
                    step="0.01"
                    defaultValue="0"
                    className="h-12"
                    data-testid="input-staff-compensation"
                  />
                </div>
                <DialogFooter>
                  <HapticButton type="submit" className="w-full h-12 gradient-golden text-black font-semibold" disabled={createMutation.isPending} hapticType="success" data-testid="button-save-staff">
                    Assegna
                  </HapticButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />
      <div className="p-4">
        {eventAssignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nessuno staff assegnato</p>
            {availableStaff.length === 0 && (
              <p className="text-sm">Aggiungi prima staff dall'anagrafica</p>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {eventAssignments.map((assignment, idx) => (
                <motion.div 
                  key={assignment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: idx * 0.03 }}
                  className="p-4 rounded-xl bg-white/5"
                  data-testid={`card-assignment-${assignment.id}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{getStaffName(assignment.staffId)}</p>
                      <p className="text-sm text-muted-foreground">{getStaffRole(assignment.staffId)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isAdmin ? (
                        <Select 
                          value={assignment.status} 
                          onValueChange={(value) => {
                            triggerHaptic('light');
                            updateMutation.mutate({ 
                              id: assignment.id, 
                              data: { status: value }
                            });
                          }}
                        >
                          <SelectTrigger className="h-10 w-28" data-testid={`select-assignment-status-${assignment.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Programmato</SelectItem>
                            <SelectItem value="confirmed">Confermato</SelectItem>
                            <SelectItem value="present">Presente</SelectItem>
                            <SelectItem value="absent">Assente</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={
                          assignment.status === 'present' ? 'default' :
                          assignment.status === 'confirmed' ? 'secondary' :
                          assignment.status === 'absent' ? 'destructive' : 'outline'
                        }>
                          {assignment.status === 'scheduled' ? 'Programmato' :
                           assignment.status === 'confirmed' ? 'Confermato' :
                           assignment.status === 'present' ? 'Presente' : 'Assente'}
                        </Badge>
                      )}
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <HapticButton size="icon" variant="ghost" className="h-11 w-11" hapticType="light" data-testid={`button-delete-assignment-${assignment.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </HapticButton>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="mx-4 rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Rimuovere questo staff?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Questa azione rimuoverà l'assegnazione dall'evento.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="h-12">Annulla</AlertDialogCancel>
                              <AlertDialogAction className="h-12" onClick={() => deleteMutation.mutate(assignment.id)}>
                                Rimuovi
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  {isAdmin ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Mansione Evento</p>
                        <Input 
                          defaultValue={assignment.role || ""} 
                          placeholder="Mansione..."
                          className="h-12"
                          onBlur={(e) => {
                            if (e.target.value !== (assignment.role || "")) {
                              updateMutation.mutate({ 
                                id: assignment.id, 
                                data: { role: e.target.value || null }
                              });
                            }
                          }}
                          data-testid={`input-assignment-role-${assignment.id}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Compenso (€)</p>
                          <Input 
                            type="number"
                            step="0.01"
                            defaultValue={assignment.compensationAmount || "0"} 
                            className="h-12"
                            onBlur={(e) => {
                              if (e.target.value !== (assignment.compensationAmount || "0")) {
                                updateMutation.mutate({ 
                                  id: assignment.id, 
                                  data: { compensationAmount: e.target.value }
                                });
                              }
                            }}
                            data-testid={`input-assignment-compensation-${assignment.id}`}
                          />
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Bonus (€)</p>
                          <Input 
                            type="number"
                            step="0.01"
                            defaultValue={assignment.bonus || "0"} 
                            className="h-12"
                            onBlur={(e) => {
                              if (e.target.value !== (assignment.bonus || "0")) {
                                updateMutation.mutate({ 
                                  id: assignment.id, 
                                  data: { bonus: e.target.value }
                                });
                              }
                            }}
                            data-testid={`input-assignment-bonus-${assignment.id}`}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 text-sm mt-3 pt-3 border-t border-white/10">
                      <div className="text-center p-2 rounded-lg bg-white/5">
                        <p className="text-muted-foreground text-xs mb-1">Mansione</p>
                        <p className="font-medium truncate">{assignment.role || "-"}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-white/5">
                        <p className="text-muted-foreground text-xs mb-1">Compenso</p>
                        <p className="font-medium">€{parseFloat(assignment.compensationAmount || "0").toFixed(0)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-white/5">
                        <p className="text-muted-foreground text-xs mb-1">Bonus</p>
                        <p className="font-medium">€{parseFloat(assignment.bonus || "0").toFixed(0)}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-muted-foreground">Costo totale personale:</span>
              <span className="text-xl font-bold text-rose-400">€{totalCost.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
    </MobileCard>
  );
}

function CostsSection({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<ExtraCost | null>(null);

  const { data: extraCosts = [], isLoading } = useQuery<ExtraCost[]>({
    queryKey: ["/api/extra-costs"],
  });

  const { data: fixedCosts = [] } = useQuery<FixedCost[]>({
    queryKey: ["/api/fixed-costs"],
  });

  const eventCosts = extraCosts.filter(c => c.eventId === eventId);
  const activeFixedCosts = fixedCosts.filter(c => c.active);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/extra-costs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-costs"] });
      setIsDialogOpen(false);
      toast({ title: "Costo aggiunto" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PATCH", `/api/extra-costs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-costs"] });
      setEditingCost(null);
      setIsDialogOpen(false);
      toast({ title: "Costo aggiornato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/extra-costs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-costs"] });
      toast({ title: "Costo eliminato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      eventId: eventId,
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      amount: formData.get("amount") as string,
      notes: formData.get("notes") as string || null,
    };

    if (editingCost) {
      updateMutation.mutate({ id: editingCost.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const categoryLabels: Record<string, string> = {
    venue: "Location",
    equipment: "Attrezzatura",
    marketing: "Marketing",
    staff: "Personale",
    supplies: "Forniture",
    other: "Altro",
  };

  const totalExtraCosts = eventCosts.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const totalFixedCosts = activeFixedCosts.filter(c => c.frequency === 'per_event').reduce((sum, c) => sum + parseFloat(c.amount), 0);

  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center rounded-2xl">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MobileCard>
        <SectionHeader
          icon={ListPlus}
          iconGradient="from-rose-500 to-red-600"
          title="Costi Extra Evento"
          subtitle="Spese specifiche evento"
          action={isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingCost(null);
            }}>
              <DialogTrigger asChild>
                <HapticButton size="icon" className="h-11 w-11 rounded-xl gradient-golden text-black" hapticType="medium" data-testid="button-add-cost">
                  <Plus className="h-5 w-5" />
                </HapticButton>
              </DialogTrigger>
              <DialogContent className="mx-4 max-h-[85vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle>{editingCost ? "Modifica Costo" : "Nuovo Costo Extra"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Descrizione *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingCost?.name || ""}
                      placeholder="es. Noleggio impianto audio"
                      required
                      className="h-12"
                      data-testid="input-cost-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select name="category" defaultValue={editingCost?.category || "other"}>
                      <SelectTrigger className="h-12" data-testid="select-cost-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="venue">Location</SelectItem>
                        <SelectItem value="equipment">Attrezzatura</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="staff">Personale</SelectItem>
                        <SelectItem value="supplies">Forniture</SelectItem>
                        <SelectItem value="other">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Importo (€) *</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      defaultValue={editingCost?.amount || ""}
                      required
                      className="h-12"
                      data-testid="input-cost-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Note</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingCost?.notes || ""}
                      data-testid="input-cost-notes"
                    />
                  </div>
                  <DialogFooter>
                    <HapticButton type="submit" className="w-full h-12 gradient-golden text-black font-semibold" disabled={createMutation.isPending || updateMutation.isPending} hapticType="success" data-testid="button-save-cost">
                      {editingCost ? "Aggiorna" : "Aggiungi"}
                    </HapticButton>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        />
        <div className="p-4">
          {eventCosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListPlus className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Nessun costo extra registrato</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {eventCosts.map((cost, idx) => (
                  <motion.div 
                    key={cost.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springTransition, delay: idx * 0.03 }}
                    className="p-4 rounded-xl bg-white/5"
                    data-testid={`card-cost-${cost.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{cost.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{categoryLabels[cost.category] || cost.category}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <p className="text-xl font-bold text-rose-400">€{parseFloat(cost.amount).toFixed(2)}</p>
                        {isAdmin && (
                          <>
                            <HapticButton
                              size="icon"
                              variant="ghost"
                              className="h-11 w-11"
                              onClick={() => {
                                setEditingCost(cost);
                                setIsDialogOpen(true);
                              }}
                              hapticType="light"
                              data-testid={`button-edit-cost-${cost.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </HapticButton>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <HapticButton size="icon" variant="ghost" className="h-11 w-11" hapticType="light" data-testid={`button-delete-cost-${cost.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </HapticButton>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="mx-4 rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminare questo costo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Questa azione non può essere annullata.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="h-12">Annulla</AlertDialogCancel>
                                  <AlertDialogAction className="h-12" onClick={() => deleteMutation.mutate(cost.id)}>
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                    {cost.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{cost.notes}</p>
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-muted-foreground">Totale costi extra:</span>
                <span className="text-xl font-bold text-rose-400">€{totalExtraCosts.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </MobileCard>

      {activeFixedCosts.filter(c => c.frequency === 'per_event').length > 0 && (
        <MobileCard delay={0.1}>
          <SectionHeader
            icon={TrendingDown}
            iconGradient="from-orange-500 to-amber-600"
            title="Costi Fissi (per Evento)"
            subtitle="Spese ricorrenti applicabili"
          />
          <div className="p-4">
            <div className="space-y-3">
              {activeFixedCosts.filter(c => c.frequency === 'per_event').map((cost, idx) => (
                <motion.div 
                  key={cost.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: idx * 0.03 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5"
                  data-testid={`card-fixed-cost-${cost.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{cost.name}</p>
                    <Badge variant="outline" className="text-xs mt-1">{categoryLabels[cost.category] || cost.category}</Badge>
                  </div>
                  <p className="text-xl font-bold text-orange-400 flex-shrink-0 ml-4">
                    €{parseFloat(cost.amount).toFixed(2)}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-muted-foreground">Totale costi fissi:</span>
              <span className="text-xl font-bold text-orange-400">€{totalFixedCosts.toFixed(2)}</span>
            </div>
          </div>
        </MobileCard>
      )}
    </div>
  );
}

function SummarySection({ eventId }: { eventId: string }) {
  const { data: entries = [] } = useQuery<CashEntry[]>({
    queryKey: ["/api/cash-entries"],
  });

  const { data: extraCosts = [] } = useQuery<ExtraCost[]>({
    queryKey: ["/api/extra-costs"],
  });

  const { data: fixedCosts = [] } = useQuery<FixedCost[]>({
    queryKey: ["/api/fixed-costs"],
  });

  const { data: assignments = [] } = useQuery<StaffAssignment[]>({
    queryKey: ["/api/staff-assignments"],
  });

  const { data: report } = useQuery<EndOfNightReport>({
    queryKey: ["/api/reports/end-of-night", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/end-of-night/${eventId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch report");
      return res.json();
    },
  });

  const eventEntries = entries.filter(e => e.eventId === eventId);
  const eventCosts = extraCosts.filter(c => c.eventId === eventId);
  const eventAssignments = assignments.filter(a => a.eventId === eventId);
  const activeFixedCosts = fixedCosts.filter(c => c.active && c.frequency === 'per_event');

  const totalRevenue = eventEntries.reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  const cashRevenue = eventEntries.filter(e => e.paymentMethod === 'cash').reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  const cardRevenue = eventEntries.filter(e => e.paymentMethod === 'card').reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  
  const beverageCost = report?.totalCost || 0;
  const staffCost = eventAssignments.reduce((sum, a) => 
    sum + parseFloat(a.compensationAmount || "0") + parseFloat(a.bonus || "0"), 0);
  const extraCostTotal = eventCosts.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const fixedCostTotal = activeFixedCosts.reduce((sum, c) => sum + parseFloat(c.amount), 0);

  const totalCosts = beverageCost + staffCost + extraCostTotal + fixedCostTotal;
  const netProfit = totalRevenue - totalCosts;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          title="Incasso Totale"
          value={`€${totalRevenue.toFixed(0)}`}
          icon={Receipt}
          gradient="from-emerald-500 to-green-600"
          testId="stat-total-revenue"
        />
        <StatsCard
          title="Costi Totali"
          value={`€${totalCosts.toFixed(0)}`}
          icon={TrendingDown}
          gradient="from-rose-500 to-red-600"
          testId="stat-total-costs"
          delay={0.05}
        />
      </div>

      <MobileCard delay={0.1}>
        <div className={`p-6 text-center ${netProfit >= 0 ? 'bg-gradient-to-br from-emerald-500/20 to-green-600/20' : 'bg-gradient-to-br from-rose-500/20 to-red-600/20'}`}>
          <p className="text-sm text-muted-foreground mb-1">Utile Netto</p>
          <p className={`text-4xl font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} data-testid="stat-net-profit">
            €{netProfit.toFixed(2)}
          </p>
        </div>
      </MobileCard>

      <MobileCard delay={0.15}>
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold">Dettaglio Incassi</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <Banknote className="h-5 w-5 text-muted-foreground" />
              <span>Contanti</span>
            </div>
            <span className="font-bold">€{cashRevenue.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <span>Carta</span>
            </div>
            <span className="font-bold">€{cardRevenue.toFixed(2)}</span>
          </div>
        </div>
      </MobileCard>

      <MobileCard delay={0.2}>
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold">Dettaglio Costi</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <Wine className="h-5 w-5 text-muted-foreground" />
              <span>Beverage</span>
            </div>
            <span className="font-bold text-rose-400">€{beverageCost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span>Personale</span>
            </div>
            <span className="font-bold text-rose-400">€{staffCost.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <ListPlus className="h-5 w-5 text-muted-foreground" />
              <span>Extra</span>
            </div>
            <span className="font-bold text-rose-400">€{extraCostTotal.toFixed(2)}</span>
          </div>
          {fixedCostTotal > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-muted-foreground" />
                <span>Fissi</span>
              </div>
              <span className="font-bold text-orange-400">€{fixedCostTotal.toFixed(2)}</span>
            </div>
          )}
        </div>
      </MobileCard>
    </div>
  );
}
