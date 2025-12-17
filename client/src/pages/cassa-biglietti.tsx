import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { type SiaeTicketedEvent, type SiaeEventSector, type SiaeTicket, type SiaeCashierAllocation, type SiaeSubscription, type SiaeCustomer } from "@shared/schema";
import { useSmartCardStatus } from "@/lib/smart-card-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CashierEventAllocation {
  allocationId: string;
  eventId: string;
  eventName: string;
  eventDate: string | null;
  eventTime: string | null;
  venueName: string | null;
  sectorId: string | null;
  sectorName: string;
  quotaQuantity: number;
  quotaUsed: number;
  quotaRemaining: number;
  isActive: boolean;
}
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Ticket,
  Store,
  Euro,
  Clock,
  AlertCircle,
  Loader2,
  CreditCard,
  Banknote,
  XCircle,
  FileText,
  User,
  Users,
  Plus,
  CheckCircle2,
  Wifi,
  WifiOff,
  Radio,
} from "lucide-react";

export default function CassaBigliettiPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const smartCardStatus = useSmartCardStatus();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedSectorId, setSelectedSectorId] = useState<string>("");
  const [ticketType, setTicketType] = useState<string>("intero");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [participantFirstName, setParticipantFirstName] = useState<string>("");
  const [participantLastName, setParticipantLastName] = useState<string>("");
  const [participantPhone, setParticipantPhone] = useState<string>("");
  const [participantEmail, setParticipantEmail] = useState<string>("");
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [ticketToCancel, setTicketToCancel] = useState<SiaeTicket | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [isC1DialogOpen, setIsC1DialogOpen] = useState(false);
  const [isNominative, setIsNominative] = useState<boolean>(false);
  const [ticketQuantity, setTicketQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>("biglietti");
  
  // Subscription form state
  const [subCustomerId, setSubCustomerId] = useState<string>("");
  const [subFirstName, setSubFirstName] = useState<string>("");
  const [subLastName, setSubLastName] = useState<string>("");
  const [subSectorId, setSubSectorId] = useState<string>("");
  const [subPrice, setSubPrice] = useState<string>("");
  const [subTurnType, setSubTurnType] = useState<'F' | 'L'>('F');
  const [subEventsCount, setSubEventsCount] = useState<number>(5);
  const [createNewCustomer, setCreateNewCustomer] = useState<boolean>(false);

  const companyId = user?.companyId;
  const isGestore = user?.role === "gestore" || user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";
  const isCassiere = user?.role === "cassiere";
  
  // Bridge status for fiscal seal emission
  // IMPORTANTE: cardInserted deve essere true, non solo readerDetected
  const bridgeConnected = smartCardStatus.bridgeConnected;
  const cardInserted = smartCardStatus.cardInserted === true;
  const readerDetected = smartCardStatus.readerDetected === true;
  const cardReady = cardInserted && readerDetected;
  const canEmitTickets = bridgeConnected && cardReady;

  // Per cassieri: recupera le allocazioni assegnate
  const { data: myAllocations, isLoading: myAllocationsLoading } = useQuery<CashierEventAllocation[]>({
    queryKey: ["/api/cashier/my-events"],
    enabled: isCassiere,
  });

  const { data: events, isLoading: eventsLoading } = useQuery<SiaeTicketedEvent[]>({
    queryKey: ["/api/siae/ticketed-events"],
    enabled: !!companyId && !isCassiere, // Gestori vedono tutti gli eventi
  });

  // Include eventi in corso, programmati e bozze - escludi solo quelli chiusi
  const activeEvents = events?.filter(e => 
    e.status === "ongoing" || e.status === "scheduled" || e.status === "draft" || e.status === "active"
  ) || [];

  // Auto-select event and sector for cashiers
  useEffect(() => {
    if (isCassiere && myAllocations && myAllocations.length > 0 && !selectedEventId) {
      // Se c'è una sola allocazione, selezionala automaticamente
      const firstAllocation = myAllocations[0];
      setSelectedEventId(firstAllocation.eventId);
      if (firstAllocation.sectorId) {
        setSelectedSectorId(firstAllocation.sectorId);
      }
    }
  }, [isCassiere, myAllocations, selectedEventId]);

  // Get current allocation for selected event
  const currentAllocation = myAllocations?.find(a => a.eventId === selectedEventId);

  const { data: allocation, isLoading: allocationLoading } = useQuery<SiaeCashierAllocation>({
    queryKey: ["/api/cashiers/events", selectedEventId, "allocation"],
    enabled: !!selectedEventId && !!user?.id,
  });

  const { data: sectors } = useQuery<SiaeEventSector[]>({
    queryKey: ["/api/siae/ticketed-events", selectedEventId, "sectors"],
    enabled: !!selectedEventId,
  });

  // Auto-select sector from allocation when sectors are loaded
  useEffect(() => {
    if (isCassiere && currentAllocation?.sectorId && sectors && sectors.length > 0 && !selectedSectorId) {
      setSelectedSectorId(currentAllocation.sectorId);
    } else if (sectors && sectors.length === 1 && !selectedSectorId) {
      // Se c'è un solo settore, selezionalo automaticamente
      setSelectedSectorId(sectors[0].id);
    }
  }, [isCassiere, currentAllocation, sectors, selectedSectorId]);

  const { data: todayTickets, isLoading: ticketsLoading } = useQuery<SiaeTicket[]>({
    queryKey: ["/api/cashiers/events", selectedEventId, "today-tickets"],
    enabled: !!selectedEventId && !!user?.id,
  });

  const { data: c1Report, isLoading: c1Loading } = useQuery<any>({
    queryKey: ["/api/siae/events", selectedEventId, "report-c1"],
    enabled: !!selectedEventId && isGestore && isC1DialogOpen,
  });

  // Subscriptions for this event
  const { data: eventSubscriptions, isLoading: subscriptionsLoading } = useQuery<SiaeSubscription[]>({
    queryKey: ["/api/siae/ticketed-events", selectedEventId, "subscriptions"],
    enabled: !!selectedEventId,
  });

  // Customers for subscription selection
  const { data: customers } = useQuery<SiaeCustomer[]>({
    queryKey: ["/api/siae/companies", companyId, "customers"],
    enabled: !!companyId && activeTab === "abbonamenti",
  });

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/siae/ticketed-events/${selectedEventId}/subscriptions`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/siae/ticketed-events", selectedEventId, "subscriptions"] });
      setSubFirstName("");
      setSubLastName("");
      setSubCustomerId("");
      setSubSectorId("");
      setSubPrice("");
      setSubEventsCount(5);
      setCreateNewCustomer(false);
      toast({
        title: "Abbonamento Creato",
        description: "L'abbonamento è stato creato con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione dell'abbonamento",
        variant: "destructive",
      });
    },
  });

  // Print ticket mutation
  const printTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const response = await apiRequest("POST", `/api/siae/tickets/${ticketId}/print`, {
        skipBackground: true // Use pre-printed paper
      });
      return response.json();
    },
    onSuccess: () => {
      // Silent success - printing started
    },
    onError: (error: any) => {
      console.warn('[Print] Error:', error.message);
      // Non-blocking error - ticket was already emitted
    },
  });

  const emitTicketMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/cashiers/events/${selectedEventId}/tickets`, data);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashiers/events", selectedEventId] });
      setParticipantFirstName("");
      setParticipantLastName("");
      setParticipantPhone("");
      setParticipantEmail("");
      setCustomPrice("");
      setTicketQuantity(1);
      
      const emittedCount = Array.isArray(result) ? result.length : 1;
      
      // Auto-print the emitted ticket(s)
      if (Array.isArray(result)) {
        result.forEach((ticket: any) => {
          if (ticket.id) {
            printTicketMutation.mutate(ticket.id);
          }
        });
      } else if (result.id) {
        printTicketMutation.mutate(result.id);
      }
      
      toast({
        title: emittedCount > 1 ? `${emittedCount} Biglietti Emessi` : "Biglietto Emesso",
        description: emittedCount > 1 
          ? `${emittedCount} biglietti emessi con successo.`
          : `Biglietto ${result.ticketCode || ''} emesso con successo.`,
      });
    },
    onError: (error: any) => {
      let title = "Errore Emissione";
      let description = error.message || "Errore durante l'emissione del biglietto";
      
      if (error.message?.includes("BRIDGE_NOT_CONNECTED") || error.message?.includes("Bridge SIAE non connesso")) {
        title = "Bridge SIAE Non Connesso";
        description = "Avviare l'applicazione desktop Event4U per emettere biglietti con sigillo fiscale.";
      } else if (error.message?.includes("CARD_NOT_READY") || error.message?.includes("Smart Card")) {
        title = "Smart Card Non Pronta";
        description = "Verificare che la Smart Card SIAE sia inserita correttamente nel lettore.";
      } else if (error.message?.includes("SEAL_GENERATION_FAILED") || error.message?.includes("sigillo fiscale")) {
        title = "Errore Sigillo Fiscale";
        description = "Impossibile ottenere il sigillo fiscale. Verificare la connessione con il bridge.";
      } else if (error.message?.includes("QUOTA_EXCEEDED") || error.message?.includes("quota")) {
        title = "Quota Esaurita";
        description = "La tua quota biglietti è esaurita. Contatta il gestore per aumentarla.";
      } else if (error.message?.includes("NO_ACTIVE_SESSION") || error.message?.includes("sessione cassa")) {
        title = "Sessione Cassa Non Attiva";
        description = "Apri una sessione cassa prima di emettere biglietti.";
      } else if (error.message?.includes("NO_SEATS_AVAILABLE") || error.message?.includes("posti")) {
        title = "Posti Esauriti";
        description = "Non ci sono più posti disponibili per questo settore.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const cancelTicketMutation = useMutation({
    mutationFn: async ({ ticketId, reason }: { ticketId: string; reason: string }) => {
      const response = await apiRequest("PATCH", `/api/siae/tickets/${ticketId}/cancel`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashiers/events", selectedEventId] });
      setIsCancelDialogOpen(false);
      setTicketToCancel(null);
      setCancelReason("");
      toast({
        title: "Biglietto Annullato",
        description: "Il biglietto è stato annullato con successo.",
      });
    },
    onError: (error: any) => {
      let title = "Errore Annullamento";
      let description = error.message || "Errore durante l'annullamento del biglietto";
      
      if (error.message?.includes("ALREADY_CANCELLED") || error.message?.includes("già annullato")) {
        title = "Già Annullato";
        description = "Questo biglietto è già stato annullato.";
      } else if (error.message?.includes("UNAUTHORIZED") || error.message?.includes("autorizzato")) {
        title = "Non Autorizzato";
        description = "Non hai i permessi per annullare questo biglietto.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canEmitTickets && !isSuperAdmin) {
      toast({
        title: "Bridge non disponibile",
        description: !bridgeConnected 
          ? "Connetti il bridge SIAE per emettere biglietti"
          : "Inserisci la Smart Card SIAE nel lettore",
        variant: "destructive",
      });
      return;
    }
    
    handleEmitTicket();
  };

  const handleEmitTicket = () => {
    if (!selectedEventId) {
      toast({
        title: "Errore",
        description: "Seleziona un evento",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedSectorId) {
      toast({
        title: "Errore",
        description: "Seleziona un settore",
        variant: "destructive",
      });
      return;
    }
    
    const qty = isNominative ? 1 : ticketQuantity;
    
    if (quotaRemaining < qty) {
      toast({
        title: "Quota Insufficiente",
        description: `Hai solo ${quotaRemaining} biglietti disponibili, ma stai cercando di emetterne ${qty}.`,
        variant: "destructive",
      });
      return;
    }

    if (isNominative && (!participantFirstName.trim() || !participantLastName.trim())) {
      toast({
        title: "Dati Mancanti",
        description: "Nome e cognome sono obbligatori per biglietti nominativi.",
        variant: "destructive",
      });
      return;
    }

    const sector = sectors?.find(s => s.id === selectedSectorId);
    const price = customPrice ? parseFloat(customPrice) : (sector ? Number(sector.priceIntero) : 0);

    emitTicketMutation.mutate({
      sectorId: selectedSectorId || undefined,
      ticketType,
      price: ticketType === "omaggio" ? 0 : price,
      participantFirstName: isNominative ? participantFirstName : undefined,
      participantLastName: isNominative ? participantLastName : undefined,
      participantPhone: isNominative ? participantPhone : undefined,
      participantEmail: isNominative ? participantEmail : undefined,
      paymentMethod,
      quantity: qty,
    });
  };

  const quotaRemaining = allocation ? allocation.quotaQuantity - allocation.quotaUsed : 0;
  const quotaPercentage = allocation ? (allocation.quotaUsed / allocation.quotaQuantity) * 100 : 0;

  const todayStats = {
    count: todayTickets?.length || 0,
    revenue: todayTickets?.filter(t => t.status !== "cancelled").reduce((sum, t) => sum + (Number(t.ticketPrice) || 0), 0) || 0,
    cancelled: todayTickets?.filter(t => t.status === "cancelled").length || 0,
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-cassa-biglietti">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="page-title">
            <Store className="w-8 h-8 text-[#FFD700]" />
            Cassa Biglietti
          </h1>
          <p className="text-muted-foreground mt-1">
            Emissione rapida biglietti e gestione vendite
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Bridge SIAE Status Indicator */}
          <div 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${
              canEmitTickets 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : bridgeConnected 
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
            data-testid="bridge-status-indicator"
          >
            {canEmitTickets ? (
              <>
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-medium">Bridge Connesso</span>
              </>
            ) : bridgeConnected ? (
              <>
                <Radio className="w-4 h-4" />
                <span className="text-sm font-medium">Inserire Smart Card</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">Bridge Non Connesso</span>
              </>
            )}
          </div>

          {/* Per cassieri mostra le loro allocazioni, per gestori tutti gli eventi */}
          {isCassiere ? (
            myAllocations && myAllocations.length === 1 ? (
              // Se c'è una sola allocazione, mostra solo il nome evento senza dropdown
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-md border">
                <Ticket className="w-4 h-4 text-[#FFD700]" />
                <span className="font-medium">{myAllocations[0].eventName}</span>
                {myAllocations[0].eventDate && (
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(myAllocations[0].eventDate), "dd/MM/yyyy", { locale: it })}
                  </Badge>
                )}
              </div>
            ) : (
              <Select value={selectedEventId} onValueChange={(value) => {
                setSelectedEventId(value);
                // Reset sector when changing event
                const alloc = myAllocations?.find(a => a.eventId === value);
                if (alloc?.sectorId) {
                  setSelectedSectorId(alloc.sectorId);
                } else {
                  setSelectedSectorId("");
                }
              }}>
                <SelectTrigger className="w-[280px]" data-testid="select-event">
                  <SelectValue placeholder="Seleziona evento..." />
                </SelectTrigger>
                <SelectContent>
                  {myAllocations?.map((alloc) => (
                    <SelectItem key={alloc.eventId} value={alloc.eventId}>
                      {alloc.eventName} - {alloc.eventDate ? format(new Date(alloc.eventDate), "dd/MM/yyyy", { locale: it }) : 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          ) : (
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-[280px]" data-testid="select-event">
                <SelectValue placeholder="Seleziona evento..." />
              </SelectTrigger>
              <SelectContent>
                {activeEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.eventName} - {format(new Date(event.eventDate), "dd/MM/yyyy", { locale: it })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {isGestore && selectedEventId && (
            <Button variant="outline" onClick={() => setIsC1DialogOpen(true)} data-testid="button-c1-report">
              <FileText className="w-4 h-4 mr-2" />
              Report C1
            </Button>
          )}
        </div>
      </div>

      {!selectedEventId ? (
        <Card className="glass-card" data-testid="card-select-event">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <Ticket className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Seleziona un Evento</h3>
            <p className="text-muted-foreground">
              Scegli un evento attivo per iniziare a emettere biglietti
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Cassiere
                </div>
                <div className="text-lg font-semibold truncate" data-testid="text-cashier-name">
                  {user?.fullName || user?.email || "N/A"}
                </div>
              </CardContent>
            </Card>

            <Card className={`glass-card ${quotaRemaining <= 5 ? "border-yellow-500/50" : ""} ${quotaRemaining <= 0 ? "border-red-500/50" : ""}`}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Ticket className="w-3 h-3" /> Quota Residua
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-2xl font-bold ${quotaRemaining <= 0 ? "text-red-500" : quotaRemaining <= 5 ? "text-yellow-500" : "text-emerald-400"}`} data-testid="text-quota-remaining">
                    {allocationLoading ? "-" : quotaRemaining}
                  </div>
                  {allocation && (
                    <span className="text-sm text-muted-foreground">/ {allocation.quotaQuantity}</span>
                  )}
                </div>
                {allocation && (
                  <div className="mt-2 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${quotaPercentage > 90 ? "bg-red-500" : quotaPercentage > 75 ? "bg-yellow-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Emessi Oggi
                </div>
                <div className="text-2xl font-bold" data-testid="text-today-count">
                  {todayStats.count}
                </div>
                <div className="text-xs text-muted-foreground">
                  {todayStats.cancelled > 0 && `(${todayStats.cancelled} annullati)`}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Euro className="w-3 h-3" /> Incasso Oggi
                </div>
                <div className="text-2xl font-bold text-[#FFD700]" data-testid="text-today-revenue">
                  €{todayStats.revenue.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2" data-testid="tabs-list">
              <TabsTrigger value="biglietti" data-testid="tab-biglietti">
                <Ticket className="w-4 h-4 mr-2" />
                Biglietti
              </TabsTrigger>
              <TabsTrigger value="abbonamenti" data-testid="tab-abbonamenti">
                <Users className="w-4 h-4 mr-2" />
                Abbonamenti
              </TabsTrigger>
            </TabsList>

            <TabsContent value="biglietti" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass-card lg:col-span-1" data-testid="card-emit-ticket">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#FFD700]" />
                  Emissione Biglietto
                </CardTitle>
              </CardHeader>
              <form onSubmit={handleFormSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Settore</Label>
                  {/* Se cassiere ha settore assegnato o c'è un solo settore, mostra info statica */}
                  {(isCassiere && currentAllocation?.sectorId && sectors?.length === 1) || (!isCassiere && sectors?.length === 1) ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-md border text-sm">
                      <Store className="w-4 h-4 text-[#FFD700]" />
                      <span className="font-medium">
                        {sectors?.[0]?.name || currentAllocation?.sectorName}
                      </span>
                      {sectors?.[0] && (
                        <Badge variant="outline" className="ml-auto">
                          €{Number(sectors[0].priceIntero).toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Select value={selectedSectorId} onValueChange={setSelectedSectorId}>
                      <SelectTrigger data-testid="select-sector">
                        <SelectValue placeholder="Seleziona settore..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors?.map((sector) => (
                          <SelectItem key={sector.id} value={sector.id}>
                            {sector.name} - €{Number(sector.priceIntero).toFixed(2)} ({sector.availableSeats} disp.)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tipo Biglietto</Label>
                  <Select value={ticketType} onValueChange={setTicketType}>
                    <SelectTrigger data-testid="select-ticket-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intero">Intero</SelectItem>
                      <SelectItem value="ridotto">Ridotto</SelectItem>
                      <SelectItem value="omaggio">Omaggio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Metodo Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger data-testid="select-payment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center gap-2">
                          <Banknote className="w-4 h-4" /> Contanti
                        </div>
                      </SelectItem>
                      <SelectItem value="card">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" /> Carta
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {ticketType === "ridotto" && (
                  <div className="space-y-2">
                    <Label>Prezzo Personalizzato (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Lascia vuoto per prezzo standard"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      data-testid="input-custom-price"
                    />
                  </div>
                )}

                <div className="border-t pt-4 mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <Label className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Biglietto Nominativo
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isNominative ? "Con dati partecipante" : "Senza dati (emissione rapida)"}
                      </p>
                    </div>
                    <Switch 
                      checked={isNominative} 
                      onCheckedChange={(checked) => {
                        setIsNominative(checked);
                        if (!checked) {
                          setParticipantFirstName("");
                          setParticipantLastName("");
                          setParticipantPhone("");
                          setParticipantEmail("");
                        }
                      }}
                      data-testid="switch-nominative"
                    />
                  </div>

                  {!isNominative && (
                    <div className="space-y-2">
                      <Label>Quantità Biglietti</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                          disabled={ticketQuantity <= 1}
                          data-testid="button-quantity-minus"
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max={Math.min(quotaRemaining, 50)}
                          value={ticketQuantity}
                          onChange={(e) => setTicketQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                          className="w-20 text-center"
                          data-testid="input-quantity"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setTicketQuantity(Math.min(quotaRemaining, 50, ticketQuantity + 1))}
                          disabled={ticketQuantity >= Math.min(quotaRemaining, 50)}
                          data-testid="button-quantity-plus"
                        >
                          +
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Max {Math.min(quotaRemaining, 50)} biglietti per emissione
                      </p>
                    </div>
                  )}

                  {isNominative && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">Dati Partecipante</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Nome *"
                          value={participantFirstName}
                          onChange={(e) => setParticipantFirstName(e.target.value)}
                          data-testid="input-first-name"
                        />
                        <Input
                          placeholder="Cognome *"
                          value={participantLastName}
                          onChange={(e) => setParticipantLastName(e.target.value)}
                          data-testid="input-last-name"
                        />
                      </div>
                      <Input
                        placeholder="Telefono"
                        value={participantPhone}
                        onChange={(e) => setParticipantPhone(e.target.value)}
                        data-testid="input-phone"
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={participantEmail}
                        onChange={(e) => setParticipantEmail(e.target.value)}
                        data-testid="input-email"
                      />
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={emitTicketMutation.isPending || quotaRemaining <= 0 || !selectedSectorId || (!canEmitTickets && !isSuperAdmin)}
                  data-testid="button-emit-ticket"
                >
                  {emitTicketMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Emissione in corso...
                    </>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4 mr-2" />
                      {isNominative 
                        ? "Emetti Biglietto Nominativo" 
                        : ticketQuantity > 1 
                          ? `Emetti ${ticketQuantity} Biglietti`
                          : "Emetti Biglietto"
                      }
                    </>
                  )}
                </Button>

                {!canEmitTickets && !isSuperAdmin && (
                  <div className="flex items-center gap-2 text-sm text-yellow-500 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30">
                    <WifiOff className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {!bridgeConnected 
                        ? "Avviare l'app desktop Event4U per emettere biglietti fiscali."
                        : "Inserire la Smart Card SIAE nel lettore."}
                    </span>
                  </div>
                )}

                {quotaRemaining <= 0 && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    Quota esaurita. Contatta il gestore.
                  </div>
                )}
              </CardContent>
              </form>
            </Card>

            <Card className="glass-card lg:col-span-2" data-testid="card-today-tickets">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#FFD700]" />
                  Biglietti Emessi Oggi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ticketsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : todayTickets?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nessun biglietto emesso oggi</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Codice</TableHead>
                          <TableHead>Ora</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Prezzo</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {todayTickets?.map((ticket) => (
                          <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                            <TableCell className="font-mono text-xs" data-testid={`cell-code-${ticket.id}`}>
                              {ticket.ticketCode}
                            </TableCell>
                            <TableCell>
                              {ticket.emissionDate && format(new Date(ticket.emissionDate), "HH:mm", { locale: it })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {ticket.ticketType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              €{Number(ticket.ticketPrice || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {ticket.status === "cancelled" ? (
                                <Badge variant="destructive">Annullato</Badge>
                              ) : (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Valido</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {ticket.status !== "cancelled" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                  onClick={() => {
                                    setTicketToCancel(ticket);
                                    setIsCancelDialogOpen(true);
                                  }}
                                  data-testid={`button-cancel-${ticket.id}`}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
            </TabsContent>

            <TabsContent value="abbonamenti" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="glass-card lg:col-span-1" data-testid="card-create-subscription">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5 text-[#FFD700]" />
                      Nuovo Abbonamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Settore</Label>
                      <Select value={subSectorId} onValueChange={setSubSectorId}>
                        <SelectTrigger data-testid="select-sub-sector">
                          <SelectValue placeholder="Seleziona settore..." />
                        </SelectTrigger>
                        <SelectContent>
                          {sectors?.map((sector) => (
                            <SelectItem key={sector.id} value={sector.id}>
                              {sector.name} - €{Number(sector.priceIntero).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label>Nuovo Cliente</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {createNewCustomer ? "Inserisci dati nuovo cliente" : "Seleziona cliente esistente"}
                        </p>
                      </div>
                      <Switch 
                        checked={createNewCustomer} 
                        onCheckedChange={setCreateNewCustomer}
                        data-testid="switch-new-customer"
                      />
                    </div>

                    {createNewCustomer ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Nome *"
                            value={subFirstName}
                            onChange={(e) => setSubFirstName(e.target.value)}
                            data-testid="input-sub-firstname"
                          />
                          <Input
                            placeholder="Cognome *"
                            value={subLastName}
                            onChange={(e) => setSubLastName(e.target.value)}
                            data-testid="input-sub-lastname"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Seleziona Cliente</Label>
                        <Select value={subCustomerId} onValueChange={setSubCustomerId}>
                          <SelectTrigger data-testid="select-customer">
                            <SelectValue placeholder="Seleziona cliente..." />
                          </SelectTrigger>
                          <SelectContent>
                            {customers?.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.firstName} {customer.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Tipo Turno</Label>
                      <Select value={subTurnType} onValueChange={(v) => setSubTurnType(v as 'F' | 'L')}>
                        <SelectTrigger data-testid="select-sub-turn-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="F">Fisso (F)</SelectItem>
                          <SelectItem value="L">Libero (L)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Numero Eventi</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={subEventsCount}
                        onChange={(e) => setSubEventsCount(parseInt(e.target.value) || 5)}
                        data-testid="input-sub-events-count"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Prezzo (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={sectors?.find(s => s.id === subSectorId) ? `€${Number(sectors.find(s => s.id === subSectorId)?.priceIntero || 0).toFixed(2)} x ${subEventsCount}` : "Prezzo"}
                        value={subPrice}
                        onChange={(e) => setSubPrice(e.target.value)}
                        data-testid="input-sub-price"
                      />
                      <p className="text-xs text-muted-foreground">
                        Lascia vuoto per calcolo automatico dal settore
                      </p>
                    </div>

                    <Button
                      type="button"
                      className="w-full bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
                      disabled={
                        createSubscriptionMutation.isPending ||
                        !subSectorId ||
                        (createNewCustomer ? !subFirstName || !subLastName : !subCustomerId)
                      }
                      onClick={() => {
                        const sector = sectors?.find(s => s.id === subSectorId);
                        const calculatedPrice = subPrice || (sector ? String(Number(sector.priceIntero) * subEventsCount) : '0');
                        
                        createSubscriptionMutation.mutate({
                          customerId: createNewCustomer ? undefined : subCustomerId,
                          sectorId: subSectorId,
                          turnType: subTurnType,
                          eventsCount: subEventsCount,
                          totalAmount: calculatedPrice,
                          holderFirstName: createNewCustomer ? subFirstName : customers?.find(c => c.id === subCustomerId)?.firstName || '',
                          holderLastName: createNewCustomer ? subLastName : customers?.find(c => c.id === subCustomerId)?.lastName || '',
                          validFrom: new Date().toISOString(),
                          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                          subscriptionCode: `ABB-${Date.now()}`,
                          progressiveNumber: 1,
                        });
                      }}
                      data-testid="button-create-subscription"
                    >
                      {createSubscriptionMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creazione...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Crea Abbonamento
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="glass-card lg:col-span-2" data-testid="card-subscriptions-list">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#FFD700]" />
                      Abbonamenti Evento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subscriptionsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : !eventSubscriptions || eventSubscriptions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nessun abbonamento per questo evento</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Codice</TableHead>
                              <TableHead>Intestatario</TableHead>
                              <TableHead>Turno</TableHead>
                              <TableHead>Eventi</TableHead>
                              <TableHead>Importo</TableHead>
                              <TableHead>Stato</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {eventSubscriptions.map((sub) => (
                              <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`}>
                                <TableCell className="font-mono text-xs">
                                  {sub.subscriptionCode}
                                </TableCell>
                                <TableCell>
                                  {sub.holderFirstName} {sub.holderLastName}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    {sub.turnType === 'F' ? 'Fisso' : 'Libero'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {sub.eventsUsed}/{sub.eventsCount}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  €{Number(sub.totalAmount || 0).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  {sub.status === "active" ? (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Attivo</Badge>
                                  ) : sub.status === "expired" ? (
                                    <Badge variant="secondary">Scaduto</Badge>
                                  ) : (
                                    <Badge variant="destructive">Annullato</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annulla Biglietto</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per annullare il biglietto <strong>{ticketToCancel?.ticketCode}</strong>.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Motivo dell'annullamento *</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Inserisci il motivo dell'annullamento..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2"
              data-testid="input-cancel-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-cancel">Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              disabled={!cancelReason.trim() || cancelTicketMutation.isPending}
              onClick={() => {
                if (ticketToCancel && cancelReason.trim()) {
                  cancelTicketMutation.mutate({
                    ticketId: ticketToCancel.id,
                    reason: cancelReason.trim(),
                  });
                }
              }}
              data-testid="button-confirm-cancel"
            >
              {cancelTicketMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Annullamento...
                </>
              ) : (
                "Conferma Annullamento"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isC1DialogOpen} onOpenChange={setIsC1DialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#FFD700]" />
              Report C1 - Riepilogo Fiscale
            </DialogTitle>
            <DialogDescription>
              Report aggregato per trasmissione SIAE
            </DialogDescription>
          </DialogHeader>

          {c1Loading ? (
            <div className="space-y-4 py-8">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : c1Report ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">Biglietti Venduti</div>
                    <div className="text-2xl font-bold">{c1Report.summary.totalTicketsSold}</div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">Biglietti Annullati</div>
                    <div className="text-2xl font-bold text-red-400">{c1Report.summary.totalTicketsCancelled}</div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">Incasso Totale</div>
                    <div className="text-2xl font-bold text-[#FFD700]">€{c1Report.summary.totalRevenue.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">IVA ({c1Report.summary.vatRate}%)</div>
                    <div className="text-2xl font-bold">€{c1Report.summary.vatAmount.toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Riepilogo per Settore</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Settore</TableHead>
                      <TableHead>Interi</TableHead>
                      <TableHead>Ridotti</TableHead>
                      <TableHead>Omaggi</TableHead>
                      <TableHead>Annullati</TableHead>
                      <TableHead className="text-right">Totale €</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c1Report.sectors.map((sector: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{sector.sectorName}</TableCell>
                        <TableCell>{sector.interoCount}</TableCell>
                        <TableCell>{sector.ridottoCount}</TableCell>
                        <TableCell>{sector.omaggioCount}</TableCell>
                        <TableCell className="text-red-400">{sector.cancelledCount}</TableCell>
                        <TableCell className="text-right font-semibold">
                          €{(sector.interoAmount + sector.ridottoAmount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Riepilogo per Tipo</h4>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="glass-card">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Interi</div>
                      <div className="font-bold">{c1Report.ticketTypes.intero.count} biglietti</div>
                      <div className="text-sm text-[#FFD700]">€{c1Report.ticketTypes.intero.amount.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Ridotti</div>
                      <div className="font-bold">{c1Report.ticketTypes.ridotto.count} biglietti</div>
                      <div className="text-sm text-[#FFD700]">€{c1Report.ticketTypes.ridotto.amount.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Omaggi</div>
                      <div className="font-bold">{c1Report.ticketTypes.omaggio.count} biglietti</div>
                      <div className="text-sm text-muted-foreground">€0.00</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                Report generato il {format(new Date(c1Report.generatedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                {" - "}da {c1Report.generatedBy}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Impossibile caricare il report C1</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsC1DialogOpen(false)} data-testid="button-close-c1-dialog">
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
