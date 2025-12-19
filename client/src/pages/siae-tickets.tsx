import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  insertSiaeTicketSchema,
  type SiaeTicket,
  type SiaeTicketedEvent,
  type SiaeEventSector,
  type SiaeCustomer,
  type SiaeCancellationReason,
  type SiaeTicketType,
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Ticket,
  Calendar,
  Users,
  Euro,
  Plus,
  MoreHorizontal,
  Loader2,
  CheckCircle2,
  XCircle,
  Scan,
  Search,
  Filter,
  QrCode,
  Printer,
  UserCheck,
  Ban,
  Eye,
  Clock,
  Pause,
  Play,
  Lock,
  Settings,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { smartCardService, useSmartCardStatus } from "@/lib/smart-card-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreditCard, AlertTriangle } from "lucide-react";

const emissionFormSchema = z.object({
  ticketedEventId: z.string().min(1, "Seleziona un evento"),
  sectorId: z.string().min(1, "Seleziona un settore"),
  ticketTypeCode: z.string().min(1, "Seleziona il tipo"),
  customerId: z.string().optional(),
  participantFirstName: z.string().optional(),
  participantLastName: z.string().optional(),
  quantity: z.coerce.number().min(1).max(10).default(1),
});

type EmissionFormData = z.infer<typeof emissionFormSchema>;

export default function SiaeTicketsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const smartCardStatus = useSmartCardStatus();
  const [isEmissionDialogOpen, setIsEmissionDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SiaeTicket | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancelReasonCode, setCancelReasonCode] = useState("");
  const [refundOnCancel, setRefundOnCancel] = useState(false);
  const [isGeneratingSeal, setIsGeneratingSeal] = useState(false);

  const companyId = user?.companyId;
  
  const cardReadiness = smartCardService.isReadyForEmission();

  const { data: ticketedEvents } = useQuery<SiaeTicketedEvent[]>({
    queryKey: ['/api/siae/companies', companyId, 'ticketed-events'],
    enabled: !!companyId,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<SiaeTicket[]>({
    queryKey: ['/api/siae/ticketed-events', selectedEventId, 'tickets'],
    enabled: !!selectedEventId,
  });

  const { data: sectors, isLoading: sectorsLoading } = useQuery<SiaeEventSector[]>({
    queryKey: ['/api/siae/ticketed-events', selectedEventId, 'sectors'],
    enabled: !!selectedEventId,
  });

  const { data: customers } = useQuery<SiaeCustomer[]>({
    queryKey: ['/api/siae/customers'],
    enabled: !!companyId,
  });

  const { data: ticketTypes } = useQuery<SiaeTicketType[]>({
    queryKey: ['/api/siae/ticket-types'],
  });

  const { data: cancellationReasons } = useQuery<SiaeCancellationReason[]>({
    queryKey: ['/api/siae/cancellation-reasons'],
  });

  const form = useForm<EmissionFormData>({
    resolver: zodResolver(emissionFormSchema),
    defaultValues: {
      ticketedEventId: "",
      sectorId: "",
      ticketTypeCode: "",
      customerId: "",
      participantFirstName: "",
      participantLastName: "",
      quantity: 1,
    },
  });

  const selectedEventForForm = form.watch("ticketedEventId");
  const selectedSectorId = form.watch("sectorId");
  const selectedTicketType = form.watch("ticketTypeCode");
  const selectedQuantity = form.watch("quantity");

  const { data: formSectors } = useQuery<SiaeEventSector[]>({
    queryKey: ['/api/siae/ticketed-events', selectedEventForForm, 'sectors'],
    enabled: !!selectedEventForForm,
  });

  const selectedSector = formSectors?.find(s => s.id === selectedSectorId);
  
  const hasSingleSector = formSectors?.length === 1;
  
  const selectedEventDetails = ticketedEvents?.find(e => e.id === selectedEventForForm);
  const isNominativeRequired = selectedEventDetails?.requiresNominative || false;
  
  const currentEventDetails = ticketedEvents?.find(e => e.id === selectedEventId);
  
  useEffect(() => {
    if (hasSingleSector && formSectors && formSectors[0]) {
      const currentSectorId = form.getValues("sectorId");
      if (currentSectorId !== formSectors[0].id) {
        form.setValue("sectorId", formSectors[0].id);
      }
    }
  }, [hasSingleSector, formSectors, form]);
  
  const getTicketPrice = () => {
    if (!selectedSector || !selectedTicketType) return 0;
    switch (selectedTicketType) {
      case 'INT': return Number(selectedSector.priceIntero) || 0;
      case 'RID': return Number(selectedSector.priceRidotto) || 0;
      case 'OMA': return 0;
      default: return 0;
    }
  };
  
  const ticketPrice = getTicketPrice();
  const prevenditaPrice = selectedSector ? Number(selectedSector.prevendita) || 0 : 0;
  const totalPerTicket = ticketPrice + prevenditaPrice;
  const totalPrice = totalPerTicket * (selectedQuantity || 1);

  useEffect(() => {
    if (!isEmissionDialogOpen) {
      form.reset({
        ticketedEventId: "",
        sectorId: "",
        ticketTypeCode: "",
        customerId: "",
        participantFirstName: "",
        participantLastName: "",
        quantity: 1,
      });
    }
  }, [isEmissionDialogOpen, form]);

  const emitTicketMutation = useMutation({
    mutationFn: async (data: EmissionFormData) => {
      const sector = formSectors?.find(s => s.id === data.sectorId);
      if (!sector) throw new Error("Settore non trovato");

      setIsGeneratingSeal(true);

      const now = new Date();
      const emissionDateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const emissionTimeStr = now.toTimeString().slice(0, 5).replace(':', '');

      const ticketData = {
        ticketedEventId: data.ticketedEventId,
        sectorId: data.sectorId,
        ticketTypeCode: data.ticketTypeCode,
        sectorCode: sector.sectorCode,
        customerId: data.customerId || null,
        participantFirstName: data.participantFirstName || null,
        participantLastName: data.participantLastName || null,
        emissionDate: now.toISOString(),
        emissionDateStr,
        emissionTimeStr,
      };

      try {
        const response = await apiRequest("POST", `/api/siae/tickets`, ticketData);
        return response.json();
      } finally {
        setIsGeneratingSeal(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' });
      setIsEmissionDialogOpen(false);
      toast({
        title: "Biglietto Emesso con Sigillo Fiscale",
        description: "Il biglietto è stato emesso con successo e sigillato.",
      });
    },
    onError: (error: Error) => {
      setIsGeneratingSeal(false);
      toast({
        title: "Errore Emissione",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const response = await apiRequest("POST", `/api/siae/tickets/${ticketId}/validate`, { scannerId: "manual" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' });
      setIsValidateDialogOpen(false);
      setSelectedTicket(null);
      toast({
        title: "Biglietto Validato",
        description: "L'ingresso è stato registrato.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelTicketMutation = useMutation({
    mutationFn: async ({ ticketId, reasonCode, refund }: { ticketId: string; reasonCode: string; refund: boolean }) => {
      const response = await apiRequest("POST", `/api/siae/tickets/${ticketId}/cancel`, { 
        reasonCode, 
        refund,
        refundReason: refund ? `Annullamento biglietto - Causale: ${reasonCode}` : undefined
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' });
      setIsCancelDialogOpen(false);
      setSelectedTicket(null);
      setCancelReasonCode("");
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
          description: "Il biglietto è stato annullato.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleSectorSalesMutation = useMutation({
    mutationFn: async ({ sectorId, salesSuspended }: { sectorId: string; salesSuspended: boolean }) => {
      const response = await apiRequest("PATCH", `/api/siae/event-sectors/${sectorId}`, { salesSuspended });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' });
      toast({
        title: "Stato vendite aggiornato",
        description: "Lo stato delle vendite per la tipologia è stato aggiornato.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmissionFormData) => {
    if (isNominativeRequired) {
      if (!data.participantFirstName?.trim() || !data.participantLastName?.trim()) {
        toast({
          title: "Dati mancanti",
          description: "Nome e cognome del partecipante sono obbligatori per questo evento",
          variant: "destructive",
        });
        return;
      }
    }
    emitTicketMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Valido</Badge>;
      case "used":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Utilizzato</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Annullato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredTickets = tickets?.filter((ticket) => {
    if (ticket.ticketedEventId !== selectedEventId) return false;
    
    const matchesSearch =
      searchQuery === "" ||
      ticket.fiscalSealCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.participantFirstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.participantLastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.progressiveNumber?.toString().includes(searchQuery);

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: filteredTickets?.length || 0,
    valid: filteredTickets?.filter(t => t.status === "valid").length || 0,
    used: filteredTickets?.filter(t => t.status === "used").length || 0,
    cancelled: filteredTickets?.filter(t => t.status === "cancelled").length || 0,
  };

  const hasTicketsForSector = (sectorId: string) => {
    return tickets?.some(t => t.sectorId === sectorId && t.status !== "cancelled") || false;
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6" data-testid="page-siae-tickets">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3" data-testid="page-title">
            <Ticket className="w-6 h-6 sm:w-8 sm:h-8 text-[#FFD700] flex-shrink-0" />
            <span className="truncate">Gestione Biglietti SIAE</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Emetti, valida e gestisci i biglietti per i tuoi eventi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            cardReadiness.ready 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`} data-testid="smart-card-status">
            <CreditCard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{cardReadiness.ready ? 'Carta Pronta' : 'Carta Non Pronta'}</span>
            <span className="sm:hidden">{cardReadiness.ready ? 'OK' : 'No'}</span>
          </div>
          <Button
            onClick={() => setIsEmissionDialogOpen(true)}
            disabled={!ticketedEvents?.some(e => e.ticketingStatus === "active") || !cardReadiness.ready}
            data-testid="button-emit-ticket"
            className="flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Emetti Biglietto</span>
            <span className="sm:hidden">Emetti</span>
          </Button>
        </div>
      </div>

      {!cardReadiness.ready && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm sm:text-base">Smart Card SIAE Non Disponibile</AlertTitle>
          <AlertDescription className="text-xs sm:text-sm">
            {cardReadiness.error || 'Smart Card non pronta'}. 
            L'emissione biglietti richiede la Smart Card SIAE collegata.
          </AlertDescription>
        </Alert>
      )}

      <Card className="glass-card" data-testid="card-event-selector">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3">
            <div className="w-full">
              <label className="text-sm font-medium mb-2 block">Seleziona Evento</label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger data-testid="select-event-filter">
                  <SelectValue placeholder="Seleziona un evento" />
                </SelectTrigger>
                <SelectContent>
                  {ticketedEvents?.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">
                          {(event as any).eventName || `Evento #${event.id.slice(0, 8)}`}
                        </span>
                        {(event as any).eventDate && (
                          <span className="text-muted-foreground text-xs">
                            {format(new Date((event as any).eventDate), "dd/MM/yyyy", { locale: it })}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEventId && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Cerca</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Cerca..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-40">
                  <label className="text-sm font-medium mb-2 block">Stato</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="valid">Validi</SelectItem>
                      <SelectItem value="used">Utilizzati</SelectItem>
                      <SelectItem value="cancelled">Annullati</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedEventId && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <Card className="glass-card">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Totale</div>
                <div className="text-xl sm:text-2xl font-bold text-[#FFD700]" data-testid="stat-total">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Validi</div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-400" data-testid="stat-valid">{stats.valid}</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Utilizzati</div>
                <div className="text-xl sm:text-2xl font-bold text-blue-400" data-testid="stat-used">{stats.used}</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Annullati</div>
                <div className="text-xl sm:text-2xl font-bold text-destructive" data-testid="stat-cancelled">{stats.cancelled}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card" data-testid="card-sectors">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#FFD700]" />
                Tipologie Biglietto
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Gestisci le tipologie e i prezzi dei biglietti
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-4 sm:pt-0">
              {sectorsLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : sectors?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm">Nessuna tipologia biglietto configurata</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {sectors?.map((sector) => {
                    const hasTickets = hasTicketsForSector(sector.id);
                    const ticketsCount = tickets?.filter(t => t.sectorId === sector.id && t.status !== "cancelled").length || 0;
                    const isSuspended = (sector as any).salesSuspended || false;
                    
                    return (
                      <div 
                        key={sector.id} 
                        className="p-3 sm:p-4"
                        data-testid={`sector-row-${sector.id}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm sm:text-base truncate">{sector.name}</span>
                              {hasTickets && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {ticketsCount} emessi
                                </Badge>
                              )}
                              {isSuspended && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs shrink-0">
                                  Sospeso
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Euro className="w-3 h-3" />
                                Intero: €{Number(sector.priceIntero).toFixed(2)}
                              </span>
                              {sector.priceRidotto && Number(sector.priceRidotto) > 0 && (
                                <span className="flex items-center gap-1">
                                  Ridotto: €{Number(sector.priceRidotto).toFixed(2)}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {sector.availableSeats}/{sector.capacity}
                              </span>
                            </div>
                            {hasTickets && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-amber-500">
                                <Lock className="w-3 h-3" />
                                <span>Prezzo bloccato (biglietti emessi). Crea una nuova tipologia per prezzi diversi.</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`suspend-${sector.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                {isSuspended ? 'Riprendi' : 'Sospendi'}
                              </Label>
                              <Switch
                                id={`suspend-${sector.id}`}
                                checked={isSuspended}
                                onCheckedChange={(checked) => {
                                  toggleSectorSalesMutation.mutate({ 
                                    sectorId: sector.id, 
                                    salesSuspended: checked 
                                  });
                                }}
                                disabled={toggleSectorSalesMutation.isPending}
                                data-testid={`switch-suspend-${sector.id}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedEventId ? (
        <Card className="glass-card" data-testid="card-empty-state">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
              <Ticket className="w-6 h-6 sm:w-8 sm:h-8 text-[#FFD700]" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">Seleziona un Evento</h3>
            <p className="text-muted-foreground text-sm">
              Seleziona un evento dalla lista per visualizzare i biglietti emessi
            </p>
          </CardContent>
        </Card>
      ) : ticketsLoading ? (
        <Card className="glass-card">
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredTickets?.length === 0 ? (
        <Card className="glass-card" data-testid="card-no-tickets">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <Ticket className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">Nessun Biglietto</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Non ci sono biglietti emessi per questo evento
            </p>
            <Button onClick={() => setIsEmissionDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Emetti Primo Biglietto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card" data-testid="card-tickets-table">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-base sm:text-lg">Biglietti Emessi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Prog.</TableHead>
                    <TableHead>Sigillo</TableHead>
                    <TableHead>Tipologia</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nominativo</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets?.map((ticket) => (
                    <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                      <TableCell className="font-mono text-sm">
                        #{ticket.progressiveNumber}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {ticket.fiscalSealCode ? ticket.fiscalSealCode.slice(0, 8) + "..." : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {sectors?.find(s => s.id === ticket.sectorId)?.name || ticket.sectorCode}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ticketTypes?.find(t => t.code === ticket.ticketTypeCode)?.description || ticket.ticketTypeCode}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ticket.participantFirstName || ticket.participantLastName ? (
                          `${ticket.participantFirstName || ""} ${ticket.participantLastName || ""}`.trim()
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <Euro className="w-3 h-3" />
                          {Number(ticket.grossAmount).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(ticket.status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ticket.emissionDate && format(new Date(ticket.emissionDate), "dd/MM HH:mm", { locale: it })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizza
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="w-4 h-4 mr-2" />
                              Stampa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {ticket.status === "valid" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTicket(ticket);
                                    setIsValidateDialogOpen(true);
                                  }}
                                >
                                  <Scan className="w-4 h-4 mr-2" />
                                  Valida Ingresso
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTicket(ticket);
                                    setIsCancelDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Ban className="w-4 h-4 mr-2" />
                                  Annulla
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="md:hidden divide-y divide-border/50">
              {filteredTickets?.map((ticket) => (
                <div key={ticket.id} className="p-3" data-testid={`mobile-ticket-${ticket.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-medium">#{ticket.progressiveNumber}</span>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {sectors?.find(s => s.id === ticket.sectorId)?.name || ticket.sectorCode}
                      </div>
                      {(ticket.participantFirstName || ticket.participantLastName) && (
                        <div className="text-sm mt-1">
                          {`${ticket.participantFirstName || ""} ${ticket.participantLastName || ""}`.trim()}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Euro className="w-3 h-3" />
                          €{Number(ticket.grossAmount).toFixed(2)}
                        </span>
                        <span>
                          {ticket.emissionDate && format(new Date(ticket.emissionDate), "dd/MM HH:mm", { locale: it })}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizza
                        </DropdownMenuItem>
                        {ticket.status === "valid" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setIsValidateDialogOpen(true);
                              }}
                            >
                              <Scan className="w-4 h-4 mr-2" />
                              Valida
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setIsCancelDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Annulla
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isEmissionDialogOpen} onOpenChange={setIsEmissionDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-emission">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-[#FFD700]" />
              Emetti Biglietto
            </DialogTitle>
            <DialogDescription>
              Compila i dati per emettere un nuovo biglietto
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-emission">
              <FormField
                control={form.control}
                name="ticketedEventId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-event">
                          <SelectValue placeholder="Seleziona evento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ticketedEvents
                          ?.filter(e => e.ticketingStatus === "active")
                          .map((event) => (
                            <SelectItem key={event.id} value={event.id}>
                              {(event as any).eventName || `Evento #${event.id.slice(0, 8)}`}
                              {(event as any).eventDate && ` - ${format(new Date((event as any).eventDate), "dd/MM/yyyy", { locale: it })}`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {formSectors && formSectors.length > 1 ? (
                <FormField
                  control={form.control}
                  name="sectorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipologia</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-sector">
                            <SelectValue placeholder="Seleziona tipologia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {formSectors
                            .filter(sector => !(sector as any).salesSuspended)
                            .map((sector) => (
                              <SelectItem key={sector.id} value={sector.id}>
                                {sector.name} - {sector.availableSeats} disponibili
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : hasSingleSector && selectedSector ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Tipologia</p>
                  <p className="text-sm font-medium">{selectedSector.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedSector.availableSeats} posti disponibili</p>
                </div>
              ) : null}

              <FormField
                control={form.control}
                name="ticketTypeCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Biglietto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-ticket-type">
                          <SelectValue placeholder="Seleziona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INT">
                          Intero - €{selectedSector ? Number(selectedSector.priceIntero).toFixed(2) : "0.00"}
                        </SelectItem>
                        {selectedSector?.priceRidotto && Number(selectedSector.priceRidotto) > 0 && (
                          <SelectItem value="RID">
                            Ridotto - €{Number(selectedSector.priceRidotto).toFixed(2)}
                          </SelectItem>
                        )}
                        <SelectItem value="OMA">
                          Omaggio - €0.00
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="participantFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nome
                        {isNominativeRequired && <span className="text-destructive ml-1">*</span>}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome" data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="participantLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Cognome
                        {isNominativeRequired && <span className="text-destructive ml-1">*</span>}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cognome" data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isNominativeRequired && (
                <p className="text-xs text-amber-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Questo evento richiede biglietti nominativi
                </p>
              )}

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantità</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={10}
                        value={field.value || 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          field.onChange(isNaN(val) || val < 1 ? 1 : Math.min(val, 10));
                        }}
                        data-testid="input-quantity" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedSector && selectedTicketType && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Riepilogo Prezzo</p>
                  <div className="flex justify-between text-sm">
                    <span>Prezzo biglietto:</span>
                    <span>€{ticketPrice.toFixed(2)}</span>
                  </div>
                  {prevenditaPrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Diritto di prevendita (DDP):</span>
                      <span>€{prevenditaPrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-white/10 pt-2 mt-2">
                    <span>Totale per biglietto:</span>
                    <span className="font-medium">€{totalPerTicket.toFixed(2)}</span>
                  </div>
                  {(selectedQuantity || 1) > 1 && (
                    <div className="flex justify-between text-sm font-bold text-[#FFD700]">
                      <span>Totale ({selectedQuantity} biglietti):</span>
                      <span>€{totalPrice.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEmissionDialogOpen(false)} className="w-full sm:w-auto">
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={emitTicketMutation.isPending || isGeneratingSeal || !cardReadiness.ready} 
                  data-testid="button-submit"
                  className="w-full sm:w-auto"
                >
                  {isGeneratingSeal ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sigillo...
                    </>
                  ) : emitTicketMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Emissione...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Emetti
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isValidateDialogOpen} onOpenChange={setIsValidateDialogOpen}>
        <AlertDialogContent data-testid="dialog-validate">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-emerald-500" />
              Conferma Validazione
            </AlertDialogTitle>
            <AlertDialogDescription>
              Stai per validare l'ingresso del biglietto #{selectedTicket?.progressiveNumber}.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTicket && validateTicketMutation.mutate(selectedTicket.id)}
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
              data-testid="button-confirm-validate"
            >
              {validateTicketMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent data-testid="dialog-cancel" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="w-5 h-5" />
              Annulla Biglietto
            </DialogTitle>
            <DialogDescription>
              Stai per annullare il biglietto #{selectedTicket?.progressiveNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Causale Annullamento</label>
              <Select value={cancelReasonCode} onValueChange={setCancelReasonCode}>
                <SelectTrigger data-testid="select-cancel-reason">
                  <SelectValue placeholder="Seleziona causale" />
                </SelectTrigger>
                <SelectContent>
                  {cancellationReasons?.map((reason) => (
                    <SelectItem key={reason.code} value={reason.code}>
                      {reason.code} - {reason.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedTicket?.transactionId && (
              <div className="flex items-center space-x-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Checkbox 
                  id="refund-checkbox" 
                  checked={refundOnCancel} 
                  onCheckedChange={(checked) => setRefundOnCancel(checked === true)}
                  data-testid="checkbox-refund"
                />
                <div className="flex flex-col">
                  <Label htmlFor="refund-checkbox" className="text-sm font-medium cursor-pointer">
                    Rimborsa via Stripe
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Il cliente riceverà il rimborso
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCancelDialogOpen(false)} className="w-full sm:w-auto">
              Annulla
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReasonCode || cancelTicketMutation.isPending}
              onClick={() => selectedTicket && cancelTicketMutation.mutate({ 
                ticketId: selectedTicket.id, 
                reasonCode: cancelReasonCode,
                refund: refundOnCancel
              })}
              data-testid="button-confirm-cancel"
              className="w-full sm:w-auto"
            >
              {cancelTicketMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
