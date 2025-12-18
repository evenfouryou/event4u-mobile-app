import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
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
  LayoutGrid,
  Receipt,
  CreditCard,
  Banknote,
  Landmark,
  MapPin,
  Wine,
  Package,
  ArrowDownUp,
  Check,
  UserPlus,
  ListPlus,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Event, CashSector, CashPosition, CashEntry, CashFund, Staff, Product, ExtraCost, StaffAssignment, Location, FixedCost } from "@shared/schema";

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
      transition={{ duration: 0.3, delay }}
      className="glass-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
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
      <div className="p-4 md:p-8 pb-24 md:pb-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  if (selectedEventId && selectedEvent) {
    return (
      <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4 mb-8"
        >
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedEventId(null)}
            className="rounded-xl flex-shrink-0"
            data-testid="button-back-events"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold truncate" data-testid="text-event-file-title">
                  {selectedEvent.name}
                </h1>
                <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                  {selectedEvent.startDatetime && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(selectedEvent.startDatetime), "dd MMMM yyyy", { locale: it })}
                    </span>
                  )}
                  {eventLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {eventLocation.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
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
              {selectedEvent.status === 'ongoing' ? 'In Corso' : selectedEvent.status === 'closed' ? 'Chiuso' : 'Programmato'}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="glass-card w-full flex flex-wrap h-auto p-1 gap-1 mb-6">
              <TabsTrigger value="beverage" className="flex-1 min-w-[80px] flex items-center justify-center gap-2 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black" data-testid="tab-beverage">
                <Wine className="h-4 w-4" />
                <span className="hidden sm:inline">Beverage</span>
              </TabsTrigger>
              <TabsTrigger value="cassa" className="flex-1 min-w-[80px] flex items-center justify-center gap-2 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black" data-testid="tab-cassa">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Cassa</span>
              </TabsTrigger>
              <TabsTrigger value="incassi" className="flex-1 min-w-[80px] flex items-center justify-center gap-2 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black" data-testid="tab-incassi">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Incassi</span>
              </TabsTrigger>
              <TabsTrigger value="personale" className="flex-1 min-w-[80px] flex items-center justify-center gap-2 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black" data-testid="tab-personale">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Personale</span>
              </TabsTrigger>
              <TabsTrigger value="costi" className="flex-1 min-w-[80px] flex items-center justify-center gap-2 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black" data-testid="tab-costi">
                <TrendingDown className="h-4 w-4" />
                <span className="hidden sm:inline">Costi</span>
              </TabsTrigger>
              <TabsTrigger value="riepilogo" className="flex-1 min-w-[80px] flex items-center justify-center gap-2 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black" data-testid="tab-riepilogo">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Riepilogo</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="beverage" className="mt-0">
              <BeverageSection eventId={selectedEventId} />
            </TabsContent>

            <TabsContent value="cassa" className="mt-0 space-y-6">
              <CashPositionsSection eventId={selectedEventId} isAdmin={isAdmin} />
              <CashFundsSection eventId={selectedEventId} isAdmin={isAdmin} />
            </TabsContent>

            <TabsContent value="incassi" className="mt-0">
              <CashEntriesSection eventId={selectedEventId} isAdmin={isAdmin} />
            </TabsContent>

            <TabsContent value="personale" className="mt-0">
              <PersonnelSection eventId={selectedEventId} isAdmin={isAdmin} />
            </TabsContent>

            <TabsContent value="costi" className="mt-0">
              <CostsSection eventId={selectedEventId} isAdmin={isAdmin} />
            </TabsContent>

            <TabsContent value="riepilogo" className="mt-0">
              <SummarySection eventId={selectedEventId} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8"
      >
        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center glow-golden flex-shrink-0">
          <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold" data-testid="text-night-file-title">
            File della Serata
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
            Seleziona un evento per compilare il documento
          </p>
        </div>
      </motion.div>

      {activeEvents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-12 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center mx-auto mb-6">
            <Calendar className="h-10 w-10 text-white/70" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nessun Evento</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Crea prima un evento dalla sezione Eventi per poter compilare il file della serata
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeEvents.map((event, index) => {
            const location = locations.find(l => l.id === event.locationId);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card overflow-hidden group cursor-pointer hover:border-primary/30 transition-all"
                onClick={() => setSelectedEventId(event.id)}
                data-testid={`card-event-${event.id}`}
              >
                <div className={`h-1 ${
                  event.status === 'ongoing' ? 'bg-gradient-to-r from-teal-500 to-cyan-500' : 
                  event.status === 'closed' ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
                  'bg-gradient-to-r from-blue-500 to-indigo-500'
                }`} />
                <div className="p-5">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <h3 className="text-lg font-semibold truncate">{event.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
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
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
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
      <div className="glass-card p-8 text-center">
        <div className="text-muted-foreground">Caricamento dati beverage...</div>
      </div>
    );
  }

  const enrichedStocks = stocks.map(stock => {
    const product = products.find(p => p.id === stock.productId);
    return { ...stock, product };
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Stock Evento</h3>
              <p className="text-sm text-muted-foreground">Inventario attuale caricato per l'evento</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          {enrichedStocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessuno stock caricato per questo evento.
              <br />
              <span className="text-sm">Vai al Magazzino per trasferire prodotti all'evento.</span>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prodotto</TableHead>
                      <TableHead>Codice</TableHead>
                      <TableHead className="text-right">Quantità</TableHead>
                      <TableHead>Unità</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedStocks.map((stock, idx) => (
                      <TableRow key={idx} data-testid={`row-stock-${idx}`}>
                        <TableCell className="font-medium">{stock.product?.name || "N/D"}</TableCell>
                        <TableCell className="text-muted-foreground">{stock.product?.code || "-"}</TableCell>
                        <TableCell className="text-right font-medium">{parseFloat(stock.quantity).toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">{stock.product?.unitOfMeasure || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {enrichedStocks.map((stock, idx) => (
                  <div key={idx} className="glass-card p-4" data-testid={`card-stock-${idx}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{stock.product?.name || "N/D"}</p>
                        <p className="text-sm text-muted-foreground">{stock.product?.code || "-"}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-lg">{parseFloat(stock.quantity).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{stock.product?.unitOfMeasure || "-"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <ArrowDownUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Consumi Evento</h3>
              <p className="text-sm text-muted-foreground">Riepilogo consumazioni e resi durante l'evento</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          {!report?.consumption || report.consumption.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun consumo registrato per questo evento
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prodotto</TableHead>
                      <TableHead className="text-right">Consumato</TableHead>
                      <TableHead className="text-right">Reso</TableHead>
                      <TableHead className="text-right">Netto</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.consumption.map((item, idx) => (
                      <TableRow key={idx} data-testid={`row-consumption-${idx}`}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">{item.totalConsumed.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-teal">{item.totalReturned.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">{item.netConsumed.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-rose-400">€{item.totalCost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {report.consumption.map((item, idx) => (
                  <div key={idx} className="glass-card p-4" data-testid={`card-consumption-${idx}`}>
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
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-muted-foreground">Costo totale beverage:</span>
                <span className="text-xl font-bold text-rose-400">€{report.totalCost.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </motion.div>
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

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const eventPositions = positions.filter(p => p.eventId === eventId);

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
    const operatorValue = formData.get("operatorId") as string;
    const data = {
      name: formData.get("name") as string,
      eventId: eventId,
      sectorId: formData.get("sectorId") as string,
      operatorId: operatorValue === "_none" ? null : operatorValue || null,
      notes: formData.get("notes") as string || null,
    };

    if (editingPosition) {
      updateMutation.mutate({ id: editingPosition.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getSectorName = (sectorId: string) => {
    const s = sectors.find(x => x.id === sectorId);
    return s?.name || "N/D";
  };

  const getStaffName = (operatorId: string | null) => {
    if (!operatorId) return "-";
    const s = staffList.find(x => x.id === operatorId);
    return s ? `${s.firstName} ${s.lastName}` : "N/D";
  };

  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-5 border-b border-white/10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Postazioni Cassa</h3>
              <p className="text-sm text-muted-foreground">Postazioni cassa dell'evento</p>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingPosition(null);
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-golden text-black font-semibold" data-testid="button-add-position">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Postazione
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                      placeholder="es. Bar 1"
                      required
                      data-testid="input-position-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sectorId">Settore *</Label>
                    <Select name="sectorId" defaultValue={editingPosition?.sectorId || ""}>
                      <SelectTrigger data-testid="select-position-sector">
                        <SelectValue placeholder="Seleziona settore" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors.filter(s => s.active).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="operatorId">Operatore</Label>
                    <Select name="operatorId" defaultValue={editingPosition?.operatorId || "_none"}>
                      <SelectTrigger data-testid="select-position-operator">
                        <SelectValue placeholder="Seleziona operatore" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Non assegnato</SelectItem>
                        {staffList.filter(s => s.active).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Note</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingPosition?.notes || ""}
                      data-testid="input-position-notes"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="gradient-golden text-black font-semibold" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-position">
                      {editingPosition ? "Aggiorna" : "Crea"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="p-5">
        {eventPositions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessuna postazione cassa per questo evento
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Settore</TableHead>
                    <TableHead>Operatore</TableHead>
                    <TableHead>Note</TableHead>
                    {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventPositions.map((position) => (
                    <TableRow key={position.id} data-testid={`row-position-${position.id}`}>
                      <TableCell className="font-medium">{position.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getSectorName(position.sectorId)}</Badge>
                      </TableCell>
                      <TableCell>{getStaffName(position.operatorId)}</TableCell>
                      <TableCell className="text-muted-foreground">{position.notes || "-"}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingPosition(position);
                                setIsDialogOpen(true);
                              }}
                              data-testid={`button-edit-position-${position.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-delete-position-${position.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminare questa postazione?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Questa azione non può essere annullata.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(position.id)}>
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {eventPositions.map((position) => (
                <div key={position.id} className="glass-card p-4" data-testid={`card-position-${position.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{position.name}</p>
                      <Badge variant="outline" className="mt-1">{getSectorName(position.sectorId)}</Badge>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10"
                          onClick={() => {
                            setEditingPosition(position);
                            setIsDialogOpen(true);
                          }}
                          data-testid={`button-edit-position-mobile-${position.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-10 w-10" data-testid={`button-delete-position-mobile-${position.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare questa postazione?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Questa azione non può essere annullata.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(position.id)}>
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Operatore</p>
                      <p className="font-medium">{getStaffName(position.operatorId)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Note</p>
                      <p className="text-muted-foreground truncate">{position.notes || "-"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
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
    const p = eventPositions.find(x => x.id === positionId);
    return p?.name || "N/D";
  };

  const openingTotal = eventFunds.filter(f => f.type === 'opening').reduce((sum, f) => sum + parseFloat(f.amount), 0);
  const closingTotal = eventFunds.filter(f => f.type === 'closing').reduce((sum, f) => sum + parseFloat(f.amount), 0);

  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-5 border-b border-white/10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Fondi Cassa</h3>
              <p className="text-sm text-muted-foreground">Apertura e chiusura cassa</p>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingFund(null);
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-golden text-black font-semibold" data-testid="button-add-fund">
                  <Plus className="h-4 w-4 mr-2" />
                  Registra Fondo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingFund ? "Modifica Fondo" : "Registra Fondo"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="positionId">Postazione</Label>
                    <Select name="positionId" defaultValue={editingFund?.positionId || "_none"}>
                      <SelectTrigger data-testid="select-fund-position">
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
                      <SelectTrigger data-testid="select-fund-type">
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
                    <Button type="submit" className="gradient-golden text-black font-semibold" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-fund">
                      {editingFund ? "Aggiorna" : "Registra"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="p-5">
        {eventFunds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessun fondo cassa registrato per questo evento
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Postazione</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Data</TableHead>
                    {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventFunds.map((fund) => (
                    <TableRow key={fund.id} data-testid={`row-fund-${fund.id}`}>
                      <TableCell className="font-medium">{getPositionName(fund.positionId)}</TableCell>
                      <TableCell>
                        <Badge variant={fund.type === 'opening' ? 'outline' : 'secondary'}>
                          {fund.type === 'opening' ? 'Apertura' : 'Chiusura'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">€{parseFloat(fund.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{fund.notes || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {fund.recordedAt && format(new Date(fund.recordedAt), "dd/MM HH:mm", { locale: it })}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingFund(fund);
                                setIsDialogOpen(true);
                              }}
                              data-testid={`button-edit-fund-${fund.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-delete-fund-${fund.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminare questo fondo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Questa azione non può essere annullata.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(fund.id)}>
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {eventFunds.map((fund) => (
                <div key={fund.id} className="glass-card p-4" data-testid={`card-fund-${fund.id}`}>
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
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10"
                          onClick={() => {
                            setEditingFund(fund);
                            setIsDialogOpen(true);
                          }}
                          data-testid={`button-edit-fund-mobile-${fund.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-10 w-10" data-testid={`button-delete-fund-mobile-${fund.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare questo fondo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Questa azione non può essere annullata.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(fund.id)}>
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
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
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Totale Apertura</p>
                <p className="text-lg font-bold">€{openingTotal.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Totale Chiusura</p>
                <p className="text-lg font-bold">€{closingTotal.toFixed(2)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
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
      <div className="glass-card p-8 text-center">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-5 border-b border-white/10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Registrazione Incassi</h3>
              <p className="text-sm text-muted-foreground">Registra gli incassi per postazione</p>
            </div>
          </div>
          {isAdmin && eventPositions.length > 0 && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingEntry(null);
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-golden text-black font-semibold" data-testid="button-add-entry">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Incasso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingEntry ? "Modifica Incasso" : "Nuovo Incasso"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="positionId">Postazione *</Label>
                    <Select name="positionId" defaultValue={editingEntry?.positionId || ""}>
                      <SelectTrigger data-testid="select-entry-position">
                        <SelectValue placeholder="Seleziona postazione" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventPositions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="entryType">Tipo *</Label>
                      <Select name="entryType" defaultValue={editingEntry?.entryType || "monetary"}>
                        <SelectTrigger data-testid="select-entry-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monetary">Monetario</SelectItem>
                          <SelectItem value="quantity">Quantità</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Metodo Pagamento *</Label>
                      <Select name="paymentMethod" defaultValue={editingEntry?.paymentMethod || "cash"}>
                        <SelectTrigger data-testid="select-entry-payment-method">
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
                      <SelectTrigger data-testid="select-entry-product">
                        <SelectValue placeholder="Seleziona prodotto (opzionale)" />
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
                      data-testid="input-entry-description"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantità</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        step="0.01"
                        defaultValue={editingEntry?.quantity || ""}
                        data-testid="input-entry-quantity"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unitPrice">Prezzo Unit.</Label>
                      <Input
                        id="unitPrice"
                        name="unitPrice"
                        type="number"
                        step="0.01"
                        defaultValue={editingEntry?.unitPrice || ""}
                        data-testid="input-entry-unit-price"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalAmount">Totale (€) *</Label>
                      <Input
                        id="totalAmount"
                        name="totalAmount"
                        type="number"
                        step="0.01"
                        defaultValue={editingEntry?.totalAmount || ""}
                        required
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
                    <Button type="submit" className="gradient-golden text-black font-semibold" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-entry">
                      {editingEntry ? "Aggiorna" : "Registra"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="p-5">
        {eventPositions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Crea prima delle postazioni cassa per registrare gli incassi
          </div>
        ) : eventEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessun incasso registrato per questo evento
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Postazione</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Metodo</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead>Data</TableHead>
                    {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventEntries.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                      <TableCell className="font-medium">{getPositionName(entry.positionId)}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {paymentMethodLabels[entry.paymentMethod]?.label || entry.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        €{parseFloat(entry.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.entryTime && format(new Date(entry.entryTime), "dd/MM HH:mm", { locale: it })}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingEntry(entry);
                                setIsDialogOpen(true);
                              }}
                              data-testid={`button-edit-entry-${entry.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-delete-entry-${entry.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminare questo incasso?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Questa azione non può essere annullata.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(entry.id)}>
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {eventEntries.map((entry) => (
                <div key={entry.id} className="glass-card p-4" data-testid={`card-entry-${entry.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium">{getPositionName(entry.positionId)}</p>
                        <Badge variant="outline" className="text-xs">
                          {paymentMethodLabels[entry.paymentMethod]?.label || entry.paymentMethod}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-teal">€{parseFloat(entry.totalAmount).toFixed(2)}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10"
                          onClick={() => {
                            setEditingEntry(entry);
                            setIsDialogOpen(true);
                          }}
                          data-testid={`button-edit-entry-mobile-${entry.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-10 w-10" data-testid={`button-delete-entry-mobile-${entry.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare questo incasso?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Questa azione non può essere annullata.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(entry.id)}>
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Descrizione</p>
                      <p className="text-muted-foreground truncate">{entry.description || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Data</p>
                      <p className="text-muted-foreground">
                        {entry.entryTime && format(new Date(entry.entryTime), "dd/MM HH:mm", { locale: it })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Contanti</p>
                <p className="text-lg font-bold text-teal">€{cashTotal.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Carta</p>
                <p className="text-lg font-bold text-blue-400">€{cardTotal.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Totale</p>
                <p className="text-xl font-bold">€{totalEntries.toFixed(2)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function PersonnelSection({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  const { data: assignments = [], isLoading } = useQuery<StaffAssignment[]>({
    queryKey: ["/api/staff-assignments"],
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const eventAssignments = assignments.filter(a => a.eventId === eventId);
  const assignedStaffIds = eventAssignments.map(a => a.staffId);
  const availableStaff = staffList.filter(s => s.active && !assignedStaffIds.includes(s.id));

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/staff-assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Assegnazione rimossa" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const handleAddStaff = () => {
    selectedStaffIds.forEach(staffId => {
      const staff = staffList.find(s => s.id === staffId);
      createMutation.mutate({
        eventId,
        staffId,
        role: staff?.role || null,
        status: 'scheduled',
        compensationType: 'fixed',
        compensationAmount: staff?.defaultPayment || '0',
      });
    });
    setSelectedStaffIds([]);
    setIsAddDialogOpen(false);
  };

  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const getStaffName = (staffId: string) => {
    const s = staffList.find(x => x.id === staffId);
    return s ? `${s.firstName} ${s.lastName}` : "N/D";
  };

  const getStaffRole = (staffId: string) => {
    const s = staffList.find(x => x.id === staffId);
    return s?.role || "-";
  };

  const totalCost = eventAssignments.reduce((sum, a) => {
    const amount = a.compensationAmount ? parseFloat(a.compensationAmount) : 0;
    const bonus = a.bonus ? parseFloat(a.bonus) : 0;
    return sum + amount + bonus;
  }, 0);

  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-5 border-b border-white/10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Personale Assegnato</h3>
              <p className="text-sm text-muted-foreground">Seleziona e gestisci lo staff per questo evento</p>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-golden text-black font-semibold" data-testid="button-add-staff">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Aggiungi Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Seleziona Staff</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {availableStaff.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Tutto lo staff disponibile è già assegnato a questo evento
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {availableStaff.map((staff) => (
                        <div 
                          key={staff.id} 
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            selectedStaffIds.includes(staff.id) ? 'bg-primary/10 border-primary' : 'border-white/10 hover:bg-white/5'
                          }`}
                          onClick={() => toggleStaffSelection(staff.id)}
                          data-testid={`staff-select-${staff.id}`}
                        >
                          <Checkbox 
                            checked={selectedStaffIds.includes(staff.id)}
                            onCheckedChange={() => toggleStaffSelection(staff.id)}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{staff.firstName} {staff.lastName}</p>
                            <p className="text-sm text-muted-foreground">{staff.role || "Nessun ruolo"}</p>
                          </div>
                          {staff.defaultPayment && (
                            <Badge variant="outline">€{parseFloat(staff.defaultPayment).toFixed(0)}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleAddStaff} 
                    className="gradient-golden text-black font-semibold"
                    disabled={selectedStaffIds.length === 0 || createMutation.isPending}
                    data-testid="button-confirm-add-staff"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aggiungi {selectedStaffIds.length > 0 && `(${selectedStaffIds.length})`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="p-5">
        {eventAssignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessun personale assegnato a questo evento.
            <br />
            <span className="text-sm">Clicca "Aggiungi Staff" per selezionare dal registro.</span>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Mansione Evento</TableHead>
                    <TableHead className="text-right">Compenso</TableHead>
                    <TableHead className="text-right">Bonus</TableHead>
                    <TableHead>Stato</TableHead>
                    {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventAssignments.map((assignment) => (
                    <TableRow key={assignment.id} data-testid={`row-assignment-${assignment.id}`}>
                      <TableCell className="font-medium">{getStaffName(assignment.staffId)}</TableCell>
                      <TableCell className="text-muted-foreground">{getStaffRole(assignment.staffId)}</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Input 
                            defaultValue={assignment.role || ""} 
                            placeholder="Mansione..."
                            className="h-8 w-32"
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
                        ) : (
                          assignment.role || "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin ? (
                          <Input 
                            type="number"
                            step="0.01"
                            defaultValue={assignment.compensationAmount || "0"} 
                            className="h-8 w-24 text-right"
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
                        ) : (
                          `€${parseFloat(assignment.compensationAmount || "0").toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin ? (
                          <Input 
                            type="number"
                            step="0.01"
                            defaultValue={assignment.bonus || "0"} 
                            className="h-8 w-24 text-right"
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
                        ) : (
                          `€${parseFloat(assignment.bonus || "0").toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select 
                            value={assignment.status} 
                            onValueChange={(value) => {
                              updateMutation.mutate({ 
                                id: assignment.id, 
                                data: { status: value }
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 w-28" data-testid={`select-assignment-status-${assignment.id}`}>
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
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-delete-assignment-${assignment.id}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Rimuovere questo staff?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Questa azione rimuoverà l'assegnazione dall'evento.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(assignment.id)}>
                                  Rimuovi
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {eventAssignments.map((assignment) => (
                <div key={assignment.id} className="glass-card p-4" data-testid={`card-assignment-${assignment.id}`}>
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
                            updateMutation.mutate({ 
                              id: assignment.id, 
                              data: { status: value }
                            });
                          }}
                        >
                          <SelectTrigger className="h-9 w-28" data-testid={`select-assignment-status-mobile-${assignment.id}`}>
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
                            <Button size="icon" variant="ghost" className="h-10 w-10" data-testid={`button-delete-assignment-mobile-${assignment.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Rimuovere questo staff?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Questa azione rimuoverà l'assegnazione dall'evento.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(assignment.id)}>
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
                          className="h-10"
                          onBlur={(e) => {
                            if (e.target.value !== (assignment.role || "")) {
                              updateMutation.mutate({ 
                                id: assignment.id, 
                                data: { role: e.target.value || null }
                              });
                            }
                          }}
                          data-testid={`input-assignment-role-mobile-${assignment.id}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Compenso (€)</p>
                          <Input 
                            type="number"
                            step="0.01"
                            defaultValue={assignment.compensationAmount || "0"} 
                            className="h-10"
                            onBlur={(e) => {
                              if (e.target.value !== (assignment.compensationAmount || "0")) {
                                updateMutation.mutate({ 
                                  id: assignment.id, 
                                  data: { compensationAmount: e.target.value }
                                });
                              }
                            }}
                            data-testid={`input-assignment-compensation-mobile-${assignment.id}`}
                          />
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Bonus (€)</p>
                          <Input 
                            type="number"
                            step="0.01"
                            defaultValue={assignment.bonus || "0"} 
                            className="h-10"
                            onBlur={(e) => {
                              if (e.target.value !== (assignment.bonus || "0")) {
                                updateMutation.mutate({ 
                                  id: assignment.id, 
                                  data: { bonus: e.target.value }
                                });
                              }
                            }}
                            data-testid={`input-assignment-bonus-mobile-${assignment.id}`}
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
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-muted-foreground">Costo totale personale:</span>
              <span className="text-xl font-bold text-rose-400">€{totalCost.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
    </motion.div>
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
      <div className="glass-card p-8 text-center">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
                <ListPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Costi Extra Evento</h3>
                <p className="text-sm text-muted-foreground">Spese aggiuntive specifiche per questo evento</p>
              </div>
            </div>
            {isAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) setEditingCost(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="gradient-golden text-black font-semibold" data-testid="button-add-cost">
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Costo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                        data-testid="input-cost-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria *</Label>
                      <Select name="category" defaultValue={editingCost?.category || "other"}>
                        <SelectTrigger data-testid="select-cost-category">
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
                      <Button type="submit" className="gradient-golden text-black font-semibold" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-cost">
                        {editingCost ? "Aggiorna" : "Aggiungi"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        <div className="p-5">
          {eventCosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun costo extra registrato per questo evento
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrizione</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Importo</TableHead>
                      <TableHead>Note</TableHead>
                      {isAdmin && <TableHead className="text-right">Azioni</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventCosts.map((cost) => (
                      <TableRow key={cost.id} data-testid={`row-cost-${cost.id}`}>
                        <TableCell className="font-medium">{cost.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{categoryLabels[cost.category] || cost.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-rose-400">
                          €{parseFloat(cost.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{cost.notes || "-"}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingCost(cost);
                                  setIsDialogOpen(true);
                                }}
                                data-testid={`button-edit-cost-${cost.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" data-testid={`button-delete-cost-${cost.id}`}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Eliminare questo costo?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Questa azione non può essere annullata.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(cost.id)}>
                                      Elimina
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {eventCosts.map((cost) => (
                  <div key={cost.id} className="glass-card p-4" data-testid={`card-cost-${cost.id}`}>
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
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-10 w-10"
                              onClick={() => {
                                setEditingCost(cost);
                                setIsDialogOpen(true);
                              }}
                              data-testid={`button-edit-cost-mobile-${cost.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-10 w-10" data-testid={`button-delete-cost-mobile-${cost.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminare questo costo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Questa azione non può essere annullata.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(cost.id)}>
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
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-muted-foreground text-sm">{cost.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-muted-foreground">Totale costi extra:</span>
                <span className="text-xl font-bold text-rose-400">€{totalExtraCosts.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {activeFixedCosts.filter(c => c.frequency === 'per_event').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                <Euro className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Costi Fissi per Evento</h3>
                <p className="text-sm text-muted-foreground">Costi fissi applicati automaticamente ad ogni evento</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeFixedCosts.filter(c => c.frequency === 'per_event').map((cost) => (
                    <TableRow key={cost.id} data-testid={`row-fixed-cost-${cost.id}`}>
                      <TableCell className="font-medium">{cost.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{categoryLabels[cost.category] || cost.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-rose-400">
                        €{parseFloat(cost.amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {activeFixedCosts.filter(c => c.frequency === 'per_event').map((cost) => (
                <div key={cost.id} className="glass-card p-4" data-testid={`card-fixed-cost-${cost.id}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{cost.name}</p>
                      <Badge variant="outline" className="text-xs mt-1">{categoryLabels[cost.category] || cost.category}</Badge>
                    </div>
                    <p className="text-xl font-bold text-rose-400 flex-shrink-0">€{parseFloat(cost.amount).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-muted-foreground">Totale costi fissi:</span>
              <span className="text-xl font-bold text-rose-400">€{totalFixedCosts.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>
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

  const { data: assignments = [] } = useQuery<StaffAssignment[]>({
    queryKey: ["/api/staff-assignments"],
  });

  const { data: funds = [] } = useQuery<CashFund[]>({
    queryKey: ["/api/cash-funds"],
  });

  const { data: fixedCosts = [] } = useQuery<FixedCost[]>({
    queryKey: ["/api/fixed-costs"],
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
  const eventFunds = funds.filter(f => f.eventId === eventId);
  const perEventFixedCosts = fixedCosts.filter(c => c.active && c.frequency === 'per_event');

  const totalRevenue = eventEntries.reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  const cashRevenue = eventEntries.filter(e => e.paymentMethod === 'cash').reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  const cardRevenue = eventEntries.filter(e => e.paymentMethod === 'card').reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
  const onlineRevenue = eventEntries.filter(e => e.paymentMethod === 'online').reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);

  const totalExtraCosts = eventCosts.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const totalStaffCosts = eventAssignments.reduce((sum, a) => {
    const comp = a.compensationAmount ? parseFloat(a.compensationAmount) : 0;
    const bonus = a.bonus ? parseFloat(a.bonus) : 0;
    return sum + comp + bonus;
  }, 0);
  const totalFixedCosts = perEventFixedCosts.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const beverageCost = report?.totalCost || 0;
  const totalCosts = totalExtraCosts + totalStaffCosts + totalFixedCosts + beverageCost;

  const netResult = totalRevenue - totalCosts;

  const openingFunds = eventFunds.filter(f => f.type === 'opening').reduce((sum, f) => sum + parseFloat(f.amount), 0);
  const closingFunds = eventFunds.filter(f => f.type === 'closing').reduce((sum, f) => sum + parseFloat(f.amount), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Totale Incassi"
          value={`€${totalRevenue.toFixed(2)}`}
          icon={TrendingUp}
          gradient="from-emerald-500 to-green-600"
          testId="stat-total-revenue"
          delay={0}
        />
        <StatsCard
          title="Totale Costi"
          value={`€${totalCosts.toFixed(2)}`}
          icon={TrendingDown}
          gradient="from-rose-500 to-red-600"
          testId="stat-total-costs"
          delay={0.1}
        />
        <StatsCard
          title="Risultato Netto"
          value={`${netResult >= 0 ? '+' : ''}€${netResult.toFixed(2)}`}
          icon={Euro}
          gradient={netResult >= 0 ? "from-teal-500 to-cyan-600" : "from-rose-500 to-red-600"}
          testId="stat-net-result"
          delay={0.2}
        />
        <StatsCard
          title="Fondi Chiusura"
          value={`€${closingFunds.toFixed(2)}`}
          icon={Wallet}
          gradient="from-amber-500 to-orange-600"
          testId="stat-closing-funds"
          delay={0.3}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold">Riepilogo Dettagliato</h3>
          </div>
        </div>
        <div className="p-5 space-y-6">
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal" />
              Entrate
            </h4>
            <div className="pl-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Incassi totali ({eventEntries.length} transazioni)</span>
                <span className="font-medium">€{totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Contanti</span>
                <span>€{cashRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Carta</span>
                <span>€{cardRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Online</span>
                <span>€{onlineRevenue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-400" />
              Uscite
            </h4>
            <div className="pl-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costo beverage</span>
                <span className="font-medium">€{beverageCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Personale ({eventAssignments.length} staff)</span>
                <span className="font-medium">€{totalStaffCosts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costi extra ({eventCosts.length} voci)</span>
                <span className="font-medium">€{totalExtraCosts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costi fissi ({perEventFixedCosts.length} voci)</span>
                <span className="font-medium">€{totalFixedCosts.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-400" />
              Fondi Cassa
            </h4>
            <div className="pl-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Apertura</span>
                <span className="font-medium">€{openingFunds.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chiusura</span>
                <span className="font-medium">€{closingFunds.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div className="flex justify-between items-center text-lg font-bold">
            <span>RISULTATO NETTO</span>
            <span className={netResult >= 0 ? 'text-teal' : 'text-rose-400'}>
              {netResult >= 0 ? '+' : ''}€{netResult.toFixed(2)}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
