import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { type SiaeTicketedEvent, type SiaeEventSector, type SiaeTicket, type SiaeCashierAllocation, type SiaeSubscription, type SiaeCustomer, type SiaeCancellationReason } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  Printer,
} from "lucide-react";
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";

export default function CassaBigliettiPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const smartCardStatus = useSmartCardStatus();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedSectorId, setSelectedSectorId] = useState<string>("");
  const [ticketType, setTicketType] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [participantFirstName, setParticipantFirstName] = useState<string>("");
  const [participantLastName, setParticipantLastName] = useState<string>("");
  const [participantPhone, setParticipantPhone] = useState<string>("");
  const [participantEmail, setParticipantEmail] = useState<string>("");
  const [customText, setCustomText] = useState<string>("");
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [ticketToCancel, setTicketToCancel] = useState<SiaeTicket | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [refundOnCancel, setRefundOnCancel] = useState(false);
  const [isC1DialogOpen, setIsC1DialogOpen] = useState(false);
  const [isNominative, setIsNominative] = useState<boolean>(false);
  const [ticketQuantity, setTicketQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>("biglietti");
  
  // Print status tracking
  const [printStatuses, setPrintStatuses] = useState<Record<string, 'idle' | 'printing' | 'success' | 'error'>>({});
  const [printProgress, setPrintProgress] = useState<{current: number, total: number} | null>(null);
  
  // Printer selection state
  const [isPrinterSelectOpen, setIsPrinterSelectOpen] = useState(false);
  const [selectedPrintAgentId, setSelectedPrintAgentId] = useState<string>("");
  const [pendingPrintTicketIds, setPendingPrintTicketIds] = useState<string[]>([]);
  
  // Enhanced cancellation state
  const [cancelReasonCode, setCancelReasonCode] = useState<string>("");
  const [cancelNote, setCancelNote] = useState<string>("");
  const [isRangeCancelDialogOpen, setIsRangeCancelDialogOpen] = useState(false);
  const [rangeFromNumber, setRangeFromNumber] = useState<string>("");
  const [rangeToNumber, setRangeToNumber] = useState<string>("");
  
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

  // Get available ticket types for the selected sector
  const selectedSector = sectors?.find(s => s.id === selectedSectorId);
  const availableTicketTypes = (() => {
    if (!selectedSector) return [];
    const types: { value: string; label: string; price: number; icon: typeof Ticket }[] = [];
    
    // Intero is always available
    types.push({
      value: "intero",
      label: "Intero",
      price: Number(selectedSector.priceIntero) || 0,
      icon: Ticket,
    });
    
    // Ridotto only if priceRidotto is set and > 0
    if (selectedSector.priceRidotto && Number(selectedSector.priceRidotto) > 0) {
      types.push({
        value: "ridotto",
        label: "Ridotto",
        price: Number(selectedSector.priceRidotto),
        icon: Users,
      });
    }
    
    // Omaggio is always available (free)
    types.push({
      value: "omaggio",
      label: "Omaggio",
      price: 0,
      icon: CheckCircle2,
    });
    
    return types;
  })();

  // Auto-select ticket type when sector changes or on initial load
  useEffect(() => {
    if (availableTicketTypes.length > 0 && selectedSectorId) {
      // Always select first available type when sector changes or type is empty/invalid
      const currentTypeAvailable = ticketType && availableTicketTypes.some(t => t.value === ticketType);
      if (!currentTypeAvailable) {
        setTicketType(availableTicketTypes[0].value);
      }
    }
  }, [selectedSectorId, availableTicketTypes.length]);

  const { data: todayTickets, isLoading: ticketsLoading } = useQuery<SiaeTicket[]>({
    queryKey: ["/api/cashiers/events", selectedEventId, "today-tickets"],
    enabled: !!selectedEventId && !!user?.id,
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

  // Cancellation reasons for SIAE
  const { data: cancellationReasons } = useQuery<SiaeCancellationReason[]>({
    queryKey: ["/api/siae/cancellation-reasons"],
    enabled: isCancelDialogOpen || isRangeCancelDialogOpen,
  });

  // Connected print agents (real-time)
  const { data: connectedAgents = [], refetch: refetchAgents } = useQuery<{ agentId: string; deviceName: string }[]>({
    queryKey: ["/api/printers/agents/connected"],
    refetchInterval: 10000, // Refresh every 10 seconds
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

  // Print ticket mutation with status tracking
  const printTicketMutation = useMutation({
    mutationFn: async ({ ticketId, agentId }: { ticketId: string; agentId?: string }) => {
      setPrintStatuses(prev => ({ ...prev, [ticketId]: 'printing' }));
      const response = await apiRequest("POST", `/api/siae/tickets/${ticketId}/print`, {
        skipBackground: true, // Use pre-printed paper
        agentId: agentId || undefined
      });
      return { ticketId, result: await response.json() };
    },
    onSuccess: ({ ticketId }) => {
      setPrintStatuses(prev => ({ ...prev, [ticketId]: 'success' }));
      // Update progress if multi-ticket printing
      if (printProgress) {
        const newCurrent = printProgress.current + 1;
        if (newCurrent >= printProgress.total) {
          setPrintProgress(null);
        } else {
          setPrintProgress({ current: newCurrent, total: printProgress.total });
        }
      }
    },
    onError: (error: any, variables: { ticketId: string; agentId?: string }) => {
      console.warn('[Print] Error:', error.message);
      setPrintStatuses(prev => ({ ...prev, [variables.ticketId]: 'error' }));
      // Update progress even on error
      if (printProgress) {
        const newCurrent = printProgress.current + 1;
        if (newCurrent >= printProgress.total) {
          setPrintProgress(null);
        } else {
          setPrintProgress({ current: newCurrent, total: printProgress.total });
        }
      }
    },
  });

  // Function to print tickets with agent selection popup if multiple agents connected
  const printTicketsWithAgentSelection = async (ticketIds: string[]) => {
    // Refresh connected agents before printing
    await refetchAgents();
    
    if (connectedAgents.length === 0) {
      toast({
        title: "Nessuna Stampante",
        description: "Nessun Print Agent connesso. Avviare l'applicazione desktop.",
        variant: "destructive",
      });
      return;
    }
    
    if (connectedAgents.length === 1) {
      // Only one agent - use it automatically
      const agentId = connectedAgents[0].agentId;
      if (ticketIds.length > 1) {
        setPrintProgress({ current: 0, total: ticketIds.length });
      }
      ticketIds.forEach(ticketId => {
        setPrintStatuses(prev => ({ ...prev, [ticketId]: 'idle' }));
        printTicketMutation.mutate({ ticketId, agentId });
      });
    } else {
      // Multiple agents - show selection popup
      setPendingPrintTicketIds(ticketIds);
      setSelectedPrintAgentId("");
      setIsPrinterSelectOpen(true);
    }
  };

  // Handle printer selection confirmation
  const handlePrinterSelected = () => {
    if (!selectedPrintAgentId || pendingPrintTicketIds.length === 0) return;
    
    if (pendingPrintTicketIds.length > 1) {
      setPrintProgress({ current: 0, total: pendingPrintTicketIds.length });
    }
    pendingPrintTicketIds.forEach(ticketId => {
      setPrintStatuses(prev => ({ ...prev, [ticketId]: 'idle' }));
      printTicketMutation.mutate({ ticketId, agentId: selectedPrintAgentId });
    });
    
    setIsPrinterSelectOpen(false);
    setPendingPrintTicketIds([]);
    setSelectedPrintAgentId("");
  };

  // Range cancellation mutation
  const rangeCancelMutation = useMutation({
    mutationFn: async (data: { ticketedEventId: string; fromNumber: number; toNumber: number; reasonCode: string; note?: string }) => {
      const response = await apiRequest("POST", `/api/siae/tickets/cancel-range`, data);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashiers/events", selectedEventId] });
      setIsRangeCancelDialogOpen(false);
      setRangeFromNumber("");
      setRangeToNumber("");
      setCancelReasonCode("");
      setCancelNote("");
      toast({
        title: "Annullamento Completato",
        description: `${result.cancelledCount || 0} biglietti annullati con successo.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore Annullamento Range",
        description: error.message || "Errore durante l'annullamento dei biglietti",
        variant: "destructive",
      });
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
      setCustomText("");
      setTicketQuantity(1);
      
      const emittedCount = Array.isArray(result) ? result.length : 1;
      
      // Auto-print the emitted ticket(s) with printer selection if needed
      const ticketIds: string[] = [];
      if (Array.isArray(result)) {
        result.forEach((ticket: any) => {
          if (ticket.id) ticketIds.push(ticket.id);
        });
      } else if (result.id) {
        ticketIds.push(result.id);
      }
      
      if (ticketIds.length > 0) {
        printTicketsWithAgentSelection(ticketIds);
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
    mutationFn: async ({ ticketId, reasonCode, note, refund }: { ticketId: string; reasonCode: string; note?: string; refund?: boolean }) => {
      const response = await apiRequest("POST", `/api/siae/tickets/${ticketId}/cancel`, { 
        reasonCode, 
        note,
        refund,
        refundReason: refund ? `Annullamento biglietto - Causale: ${reasonCode}` : undefined
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashiers/events", selectedEventId] });
      setIsCancelDialogOpen(false);
      setTicketToCancel(null);
      setCancelReason("");
      setRefundOnCancel(false);
      
      // Check for refund - backend returns { ticket, refund } where refund has stripeRefundId/refundedAmount
      const wasRefunded = data.refund?.stripeRefundId || data.ticket?.refundedAt;
      const refundAmount = data.refund?.refundedAmount || data.ticket?.refundAmount;
      
      if (wasRefunded && refundAmount) {
        toast({
          title: "Biglietto Annullato e Rimborsato",
          description: `Il biglietto è stato annullato e rimborsato €${Number(refundAmount).toFixed(2)}`,
        });
      } else {
        toast({
          title: "Biglietto Annullato",
          description: "Il biglietto è stato annullato con successo.",
        });
      }
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
      customText: customText || undefined,
    });
  };

  const quotaRemaining = allocation ? allocation.quotaQuantity - allocation.quotaUsed : 0;
  const quotaPercentage = allocation ? (allocation.quotaUsed / allocation.quotaQuantity) * 100 : 0;

  const todayStats = {
    count: todayTickets?.length || 0,
    revenue: todayTickets?.filter(t => t.status !== "cancelled").reduce((sum, t) => sum + (Number(t.ticketPrice) || 0), 0) || 0,
    cancelled: todayTickets?.filter(t => t.status === "cancelled").length || 0,
  };

  // Shared dialogs component for both mobile and desktop
  const renderDialogs = () => (
    <>
      <AlertDialog open={isCancelDialogOpen} onOpenChange={(open) => {
        setIsCancelDialogOpen(open);
        if (!open) {
          setCancelReasonCode("");
          setCancelNote("");
          setRefundOnCancel(false);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annulla Biglietto</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per annullare il biglietto <strong>{ticketToCancel?.ticketCode}</strong>.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason-code">Motivo SIAE *</Label>
              <Select value={cancelReasonCode} onValueChange={setCancelReasonCode}>
                <SelectTrigger data-testid="select-cancel-reason">
                  <SelectValue placeholder="Seleziona motivo annullamento..." />
                </SelectTrigger>
                <SelectContent>
                  {cancellationReasons && cancellationReasons.length > 0 ? (
                    cancellationReasons.map((reason) => (
                      <SelectItem key={reason.id} value={reason.code}>
                        {reason.code} - {reason.name}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="01">01 - Annullamento evento</SelectItem>
                      <SelectItem value="02">02 - Rinvio evento</SelectItem>
                      <SelectItem value="03">03 - Modifica evento</SelectItem>
                      <SelectItem value="04">04 - Richiesta cliente - rimborso</SelectItem>
                      <SelectItem value="05">05 - Richiesta cliente - cambio data</SelectItem>
                      <SelectItem value="06">06 - Errore emissione</SelectItem>
                      <SelectItem value="07">07 - Duplicato</SelectItem>
                      <SelectItem value="08">08 - Frode accertata</SelectItem>
                      <SelectItem value="09">09 - Mancato pagamento</SelectItem>
                      <SelectItem value="10">10 - Cambio nominativo</SelectItem>
                      <SelectItem value="11">11 - Rimessa in vendita</SelectItem>
                      <SelectItem value="12">12 - Revoca per forza maggiore</SelectItem>
                      <SelectItem value="99">99 - Altra causale</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancel-note">Note aggiuntive (opzionale)</Label>
              <Textarea
                id="cancel-note"
                placeholder="Inserisci eventuali note aggiuntive..."
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                data-testid="input-cancel-note"
              />
            </div>
            
            {ticketToCancel?.transactionId && (
              <div className="flex items-center space-x-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Checkbox 
                  id="refund-checkbox-cassa" 
                  checked={refundOnCancel} 
                  onCheckedChange={(checked) => setRefundOnCancel(checked === true)}
                  data-testid="checkbox-refund"
                />
                <div className="flex flex-col">
                  <Label htmlFor="refund-checkbox-cassa" className="text-sm font-medium cursor-pointer">
                    Rimborsa via Stripe
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Il cliente riceverà il rimborso automaticamente
                  </span>
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-cancel">Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              disabled={!cancelReasonCode || cancelTicketMutation.isPending}
              onClick={() => {
                if (ticketToCancel && cancelReasonCode) {
                  cancelTicketMutation.mutate({
                    ticketId: ticketToCancel.id,
                    reasonCode: cancelReasonCode,
                    note: cancelNote?.trim() || undefined,
                    refund: refundOnCancel,
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

      <Dialog open={isPrinterSelectOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPrinterSelectOpen(false);
          setPendingPrintTicketIds([]);
          setSelectedPrintAgentId("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#FFD700]" />
              Seleziona Stampante
            </DialogTitle>
            <DialogDescription>
              Sono presenti {connectedAgents.length} stampanti connesse. Seleziona quale utilizzare per stampare {pendingPrintTicketIds.length} bigliett{pendingPrintTicketIds.length === 1 ? 'o' : 'i'}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {connectedAgents.map((agent) => (
              <div
                key={agent.agentId}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPrintAgentId === agent.agentId
                    ? 'border-[#FFD700] bg-[#FFD700]/10'
                    : 'border-border hover-elevate'
                }`}
                onClick={() => setSelectedPrintAgentId(agent.agentId)}
                data-testid={`printer-option-${agent.agentId}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${selectedPrintAgentId === agent.agentId ? 'bg-[#FFD700]' : 'bg-green-500'}`} />
                  <div className="flex-1">
                    <p className="font-medium">{agent.deviceName || 'Stampante'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{agent.agentId.slice(0, 8)}...</p>
                  </div>
                  {selectedPrintAgentId === agent.agentId && (
                    <CheckCircle2 className="w-5 h-5 text-[#FFD700]" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPrinterSelectOpen(false);
                setPendingPrintTicketIds([]);
              }}
              data-testid="button-cancel-printer-select"
            >
              Annulla
            </Button>
            <Button
              className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-black"
              disabled={!selectedPrintAgentId}
              onClick={handlePrinterSelected}
              data-testid="button-confirm-printer-select"
            >
              Stampa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRangeCancelDialogOpen} onOpenChange={(open) => {
        setIsRangeCancelDialogOpen(open);
        if (!open) {
          setRangeFromNumber("");
          setRangeToNumber("");
          setCancelReasonCode("");
          setCancelNote("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Annulla Range Biglietti
            </DialogTitle>
            <DialogDescription>
              Annulla tutti i biglietti compresi nell'intervallo specificato.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="range-from">Da Numero Progressivo</Label>
                <Input
                  id="range-from"
                  type="number"
                  placeholder="Es: 1"
                  value={rangeFromNumber}
                  onChange={(e) => setRangeFromNumber(e.target.value)}
                  data-testid="input-range-from"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="range-to">A Numero Progressivo</Label>
                <Input
                  id="range-to"
                  type="number"
                  placeholder="Es: 100"
                  value={rangeToNumber}
                  onChange={(e) => setRangeToNumber(e.target.value)}
                  data-testid="input-range-to"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="range-cancel-reason">Motivo SIAE *</Label>
              <Select value={cancelReasonCode} onValueChange={setCancelReasonCode}>
                <SelectTrigger data-testid="select-range-cancel-reason">
                  <SelectValue placeholder="Seleziona motivo annullamento..." />
                </SelectTrigger>
                <SelectContent>
                  {cancellationReasons && cancellationReasons.length > 0 ? (
                    cancellationReasons.map((reason) => (
                      <SelectItem key={reason.id} value={reason.code}>
                        {reason.code} - {reason.name}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="01">01 - Annullamento evento</SelectItem>
                      <SelectItem value="02">02 - Rinvio evento</SelectItem>
                      <SelectItem value="03">03 - Modifica evento</SelectItem>
                      <SelectItem value="04">04 - Richiesta cliente - rimborso</SelectItem>
                      <SelectItem value="05">05 - Richiesta cliente - cambio data</SelectItem>
                      <SelectItem value="06">06 - Errore emissione</SelectItem>
                      <SelectItem value="07">07 - Duplicato</SelectItem>
                      <SelectItem value="08">08 - Frode accertata</SelectItem>
                      <SelectItem value="09">09 - Mancato pagamento</SelectItem>
                      <SelectItem value="10">10 - Cambio nominativo</SelectItem>
                      <SelectItem value="11">11 - Rimessa in vendita</SelectItem>
                      <SelectItem value="12">12 - Revoca per forza maggiore</SelectItem>
                      <SelectItem value="99">99 - Altra causale</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="range-cancel-note">Note aggiuntive (opzionale)</Label>
              <Textarea
                id="range-cancel-note"
                placeholder="Inserisci eventuali note aggiuntive..."
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                data-testid="input-range-cancel-note"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRangeCancelDialogOpen(false)} data-testid="button-range-cancel-close">
              Annulla
            </Button>
            <Button
              variant="destructive"
              disabled={!rangeFromNumber || !rangeToNumber || !cancelReasonCode || rangeCancelMutation.isPending}
              onClick={() => {
                const fromNum = parseInt(rangeFromNumber);
                const toNum = parseInt(rangeToNumber);
                if (selectedEventId && fromNum && toNum && cancelReasonCode) {
                  rangeCancelMutation.mutate({
                    ticketedEventId: selectedEventId,
                    fromNumber: fromNum,
                    toNumber: toNum,
                    reasonCode: cancelReasonCode,
                    note: cancelNote || undefined,
                  });
                }
              }}
              data-testid="button-range-cancel-confirm"
            >
              {rangeCancelMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Annullamento...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Annulla Range
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isC1DialogOpen} onOpenChange={setIsC1DialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#FFD700]" />
              Report C1 SIAE
            </DialogTitle>
            <DialogDescription>
              Seleziona il tipo di report da generare
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <Button
              variant="outline"
              className="w-full h-20 flex flex-col items-center justify-center gap-2 hover-elevate"
              onClick={() => {
                setIsC1DialogOpen(false);
                window.location.href = `/siae/reports/c1/${selectedEventId}?type=giornaliero`;
              }}
              data-testid="button-c1-giornaliero"
            >
              <Clock className="w-6 h-6 text-[#FFD700]" />
              <div>
                <div className="font-semibold">C1 Giornaliero</div>
                <div className="text-xs text-muted-foreground">Riepilogo vendite del giorno</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-20 flex flex-col items-center justify-center gap-2 hover-elevate"
              onClick={() => {
                setIsC1DialogOpen(false);
                window.location.href = `/siae/reports/c1/${selectedEventId}?type=mensile`;
              }}
              data-testid="button-c1-mensile"
            >
              <FileText className="w-6 h-6 text-[#FFD700]" />
              <div>
                <div className="font-semibold">C1 Mensile</div>
                <div className="text-xs text-muted-foreground">Riepilogo vendite del mese</div>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsC1DialogOpen(false)} data-testid="button-close-c1-dialog">
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-cassa-biglietti">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Cassa Biglietti</h1>
            <p className="text-muted-foreground">Emissione biglietti SIAE</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
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

            {isCassiere ? (
              myAllocations && myAllocations.length === 1 ? (
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

            {(isGestore || isCassiere) && selectedEventId && (
              <>
                <Button variant="outline" onClick={() => setIsC1DialogOpen(true)} data-testid="button-c1-report">
                  <FileText className="w-4 h-4 mr-2" />
                  Report C1
                </Button>
                <Button variant="outline" onClick={() => setIsRangeCancelDialogOpen(true)} data-testid="button-range-cancel">
                  <XCircle className="w-4 h-4 mr-2" />
                  Annulla Range
                </Button>
              </>
            )}
          </div>
        </div>

        {!selectedEventId ? (
          <Card data-testid="card-select-event">
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
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Cassiere
                  </div>
                  <div className="text-lg font-semibold truncate" data-testid="text-cashier-name">
                    {user?.fullName || user?.email || "N/A"}
                  </div>
                </CardContent>
              </Card>

              <Card className={`${quotaRemaining <= 5 ? "border-yellow-500/50" : ""} ${quotaRemaining <= 0 ? "border-red-500/50" : ""}`}>
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

              <Card>
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

              <Card>
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
                <div className="grid grid-cols-3 gap-6">
                  <Card data-testid="card-emit-ticket">
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
                          {availableTicketTypes.length === 0 ? (
                            <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md text-center">
                              Seleziona prima un settore
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2" data-testid="ticket-type-buttons">
                              {availableTicketTypes.map((type) => {
                                const isSelected = ticketType === type.value;
                                const IconComponent = type.icon;
                                return (
                                  <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setTicketType(type.value)}
                                    className={`
                                      flex items-center justify-between p-3 rounded-lg border-2 transition-all
                                      ${isSelected 
                                        ? 'bg-[#FFD700]/10 border-[#FFD700]' 
                                        : 'bg-muted/30 border-border hover-elevate'}
                                    `}
                                    data-testid={`button-ticket-type-${type.value}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <IconComponent className={`w-4 h-4 ${isSelected ? 'text-[#FFD700]' : 'text-muted-foreground'}`} />
                                      <span className={`font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {type.label}
                                      </span>
                                    </div>
                                    <span className={`font-bold ${isSelected ? 'text-[#FFD700]' : 'text-muted-foreground'}`}>
                                      {type.price === 0 ? 'Gratis' : `€${type.price.toFixed(2)}`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
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

                        <div className="space-y-2">
                          <Label>Testo Libero</Label>
                          <Input
                            type="text"
                            maxLength={255}
                            placeholder="Testo personalizzato"
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            data-testid="input-custom-text"
                          />
                        </div>

                        <div className="border-t pt-4 mt-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <Label className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Biglietto Nominativo
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                {isNominative ? "Con dati partecipante" : "Senza dati"}
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
                            </div>
                          )}

                          {isNominative && (
                            <div className="space-y-2">
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

                        {printProgress && (
                          <div className="space-y-2 p-3 rounded-md bg-muted/30 border border-[#FFD700]/30" data-testid="print-progress-container">
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <Printer className="w-4 h-4 text-[#FFD700]" />
                                <span>Stampa {printProgress.current}/{printProgress.total} biglietti...</span>
                              </span>
                              <span className="text-muted-foreground">{Math.round((printProgress.current / printProgress.total) * 100)}%</span>
                            </div>
                            <Progress value={(printProgress.current / printProgress.total) * 100} className="h-2" data-testid="progress-print" />
                          </div>
                        )}

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
                      </CardContent>
                    </form>
                  </Card>

                  <Card className="col-span-2" data-testid="card-today-tickets">
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
                                <TableHead className="w-12">N°</TableHead>
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
                                  <TableCell className="font-mono text-sm font-bold text-[#FFD700]" data-testid={`cell-progressive-${ticket.id}`}>
                                    {ticket.progressiveNumber || '-'}
                                  </TableCell>
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
                                    <div className="flex items-center gap-2">
                                      {ticket.status === "cancelled" ? (
                                        <Badge variant="destructive">Annullato</Badge>
                                      ) : (
                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Valido</Badge>
                                      )}
                                      {printStatuses[ticket.id] === 'printing' && (
                                        <Loader2 className="w-4 h-4 animate-spin text-[#FFD700]" />
                                      )}
                                      {printStatuses[ticket.id] === 'success' && (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                      )}
                                      {printStatuses[ticket.id] === 'error' && (
                                        <XCircle className="w-4 h-4 text-red-400" />
                                      )}
                                    </div>
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
                <div className="grid grid-cols-3 gap-6">
                  <Card data-testid="card-create-subscription">
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

                  <Card className="col-span-2" data-testid="card-subscriptions-list">
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

        {renderDialogs()}
      </div>
    );
  }

  // Mobile version
  return (
    <MobileAppLayout
      header={<MobileHeader title="Cassa Biglietti" showBackButton showMenuButton />}
      contentClassName="pb-24"
    >
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-cassa-biglietti">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
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

          {(isGestore || isCassiere) && selectedEventId && (
            <Button variant="outline" onClick={() => setIsC1DialogOpen(true)} data-testid="button-c1-report">
              <FileText className="w-4 h-4 mr-2" />
              Report C1
            </Button>
          )}

          {(isGestore || isCassiere) && selectedEventId && (
            <Button variant="outline" onClick={() => setIsRangeCancelDialogOpen(true)} data-testid="button-range-cancel">
              <XCircle className="w-4 h-4 mr-2" />
              Annulla Range
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

                {/* Ticket Type Selection - Large Touch-Friendly Buttons */}
                <div className="space-y-2">
                  <Label>Tipo Biglietto</Label>
                  {availableTicketTypes.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md text-center">
                      Seleziona prima un settore
                    </div>
                  ) : availableTicketTypes.length === 1 ? (
                    // Single type available - show as info only (auto-selected)
                    <div 
                      className="flex items-center justify-between p-4 rounded-lg bg-[#FFD700]/10 border-2 border-[#FFD700]"
                      data-testid="ticket-type-single"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFD700]/20 flex items-center justify-center">
                          <Ticket className="w-5 h-5 text-[#FFD700]" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{availableTicketTypes[0].label}</div>
                          <div className="text-sm text-muted-foreground">Tipo unico disponibile</div>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-[#FFD700]">
                        €{availableTicketTypes[0].price.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    // Multiple types - show as large selectable cards
                    <div className="grid grid-cols-1 gap-2" data-testid="ticket-type-buttons">
                      {availableTicketTypes.map((type) => {
                        const isSelected = ticketType === type.value;
                        const IconComponent = type.icon;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setTicketType(type.value)}
                            className={`
                              flex items-center justify-between p-4 rounded-lg border-2 transition-all
                              min-h-[64px] touch-manipulation
                              ${isSelected 
                                ? 'bg-[#FFD700]/10 border-[#FFD700] shadow-lg shadow-[#FFD700]/20' 
                                : 'bg-muted/30 border-border hover-elevate active-elevate-2'}
                            `}
                            data-testid={`button-ticket-type-${type.value}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center
                                ${isSelected ? 'bg-[#FFD700]/20' : 'bg-muted/50'}
                              `}>
                                <IconComponent className={`w-5 h-5 ${isSelected ? 'text-[#FFD700]' : 'text-muted-foreground'}`} />
                              </div>
                              <div className="text-left">
                                <div className={`font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {type.label}
                                </div>
                                {type.value === "omaggio" && (
                                  <div className="text-xs text-muted-foreground">Gratuito</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`text-lg font-bold ${isSelected ? 'text-[#FFD700]' : 'text-muted-foreground'}`}>
                                {type.price === 0 ? 'Gratis' : `€${type.price.toFixed(2)}`}
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-[#FFD700]" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
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

                <div className="space-y-2">
                  <Label>Testo Libero</Label>
                  <Input
                    type="text"
                    maxLength={255}
                    placeholder="Testo personalizzato da stampare sul biglietto"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    data-testid="input-custom-text"
                  />
                  <p className="text-xs text-muted-foreground">
                    Opzionale - verrà stampato sul biglietto se presente nel template
                  </p>
                </div>

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

                {/* Print Progress Bar */}
                {printProgress && (
                  <div className="space-y-2 p-3 rounded-md bg-muted/30 border border-[#FFD700]/30" data-testid="print-progress-container">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-[#FFD700]" />
                        <span>Stampa {printProgress.current}/{printProgress.total} biglietti...</span>
                      </span>
                      <span className="text-muted-foreground">{Math.round((printProgress.current / printProgress.total) * 100)}%</span>
                    </div>
                    <Progress value={(printProgress.current / printProgress.total) * 100} className="h-2" data-testid="progress-print" />
                  </div>
                )}

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
                          <TableHead className="w-12">N°</TableHead>
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
                            <TableCell className="font-mono text-sm font-bold text-[#FFD700]" data-testid={`cell-progressive-${ticket.id}`}>
                              {ticket.progressiveNumber || '-'}
                            </TableCell>
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
                              <div className="flex items-center gap-2">
                                {ticket.status === "cancelled" ? (
                                  <Badge variant="destructive">Annullato</Badge>
                                ) : (
                                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Valido</Badge>
                                )}
                                {/* Print status icon */}
                                {printStatuses[ticket.id] === 'printing' && (
                                  <Loader2 className="w-4 h-4 animate-spin text-[#FFD700]" data-testid={`icon-printing-${ticket.id}`} />
                                )}
                                {printStatuses[ticket.id] === 'success' && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" data-testid={`icon-print-success-${ticket.id}`} />
                                )}
                                {printStatuses[ticket.id] === 'error' && (
                                  <XCircle className="w-4 h-4 text-red-400" data-testid={`icon-print-error-${ticket.id}`} />
                                )}
                                {printStatuses[ticket.id] === 'idle' && (
                                  <Printer className="w-4 h-4 text-muted-foreground" data-testid={`icon-print-idle-${ticket.id}`} />
                                )}
                              </div>
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

      {renderDialogs()}
      </div>
    </MobileAppLayout>
  );
}
