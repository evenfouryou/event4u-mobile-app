import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  insertSiaeTicketSchema,
  type SiaeTicket,
  type SiaeTicketedEvent,
  type SiaeEventSector,
  type SiaeCustomer,
  type SiaeCancellationReason,
  type SiaeTicketType,
  type Event,
} from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
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
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Ticket,
  Euro,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Scan,
  Search,
  Users,
  Ban,
  Eye,
  Lock,
  Settings,
  ArrowLeft,
  Printer,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { smartCardService, useSmartCardStatus } from "@/lib/smart-card-service";
import { CreditCard, AlertTriangle } from "lucide-react";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

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
  const [, navigate] = useLocation();
  const [, params] = useRoute("/siae/tickets/:eventId");
  const eventId = params?.eventId || "";
  const isMobile = useIsMobile();
  
  const smartCardStatus = useSmartCardStatus();
  const [isEmissionSheetOpen, setIsEmissionSheetOpen] = useState(false);
  const [isCancelSheetOpen, setIsCancelSheetOpen] = useState(false);
  const [isValidateSheetOpen, setIsValidateSheetOpen] = useState(false);
  const [isTicketDetailOpen, setIsTicketDetailOpen] = useState(false);
  const [isEmissionDialogOpen, setIsEmissionDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [isTicketDetailDialogOpen, setIsTicketDetailDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SiaeTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancelReasonCode, setCancelReasonCode] = useState("");
  const [refundOnCancel, setRefundOnCancel] = useState(false);
  const [isGeneratingSeal, setIsGeneratingSeal] = useState(false);

  const companyId = user?.companyId;
  const cardReadiness = smartCardService.isReadyForEmission();

  const { data: ticketedEvent } = useQuery<SiaeTicketedEvent>({
    queryKey: ['/api/siae/ticketed-events', eventId],
    enabled: !!eventId,
  });

  const { data: baseEvent } = useQuery<Event>({
    queryKey: ['/api/events', ticketedEvent?.eventId],
    enabled: !!ticketedEvent?.eventId,
  });

  const { data: ticketedEvents } = useQuery<SiaeTicketedEvent[]>({
    queryKey: ['/api/siae/companies', companyId, 'ticketed-events'],
    enabled: !!companyId,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<SiaeTicket[]>({
    queryKey: ['/api/siae/ticketed-events', eventId, 'tickets'],
    enabled: !!eventId,
  });

  const { data: sectors, isLoading: sectorsLoading } = useQuery<SiaeEventSector[]>({
    queryKey: ['/api/siae/ticketed-events', eventId, 'sectors'],
    enabled: !!eventId,
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
    if (!isEmissionSheetOpen) {
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
  }, [isEmissionSheetOpen, form]);

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
      triggerHaptic('success');
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' });
      setIsEmissionSheetOpen(false);
      toast({
        title: "Biglietto Emesso",
        description: "Il biglietto è stato emesso con successo.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
      triggerHaptic('success');
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' });
      setIsValidateSheetOpen(false);
      setSelectedTicket(null);
      toast({
        title: "Biglietto Validato",
        description: "L'ingresso è stato registrato.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
      triggerHaptic('success');
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' });
      setIsCancelSheetOpen(false);
      setSelectedTicket(null);
      setCancelReasonCode("");
      setRefundOnCancel(false);
      
      const wasRefunded = data.refund?.stripeRefundId || data.ticket?.refundedAt;
      const refundAmount = data.refund?.refundedAmount || data.ticket?.refundAmount;
      
      if (wasRefunded && refundAmount) {
        toast({
          title: "Biglietto Annullato e Rimborsato",
          description: `Rimborsato €${Number(refundAmount).toFixed(2)}`,
        });
      } else {
        toast({
          title: "Biglietto Annullato",
          description: "Il biglietto è stato annullato.",
        });
      }
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
      triggerHaptic('medium');
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' });
      toast({
        title: "Stato vendite aggiornato",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
        triggerHaptic('error');
        toast({
          title: "Dati mancanti",
          description: "Nome e cognome sono obbligatori",
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
    if (ticket.ticketedEventId !== eventId) return false;
    
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

  const handleTicketPress = (ticket: SiaeTicket) => {
    triggerHaptic('light');
    setSelectedTicket(ticket);
    if (isMobile) {
      setIsTicketDetailOpen(true);
    } else {
      setIsTicketDetailDialogOpen(true);
    }
  };

  const emissionFormContent = (
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
                  <SelectTrigger className="h-12" data-testid="select-event">
                    <SelectValue placeholder="Seleziona evento" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ticketedEvents
                    ?.filter(e => e.ticketingStatus === "active")
                    .map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {(event as any).eventName || `Evento #${event.id.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {formSectors && formSectors.length > 1 && (
          <FormField
            control={form.control}
            name="sectorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipologia</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12" data-testid="select-sector">
                      <SelectValue placeholder="Seleziona tipologia" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {formSectors
                      .filter(sector => !(sector as any).salesSuspended)
                      .map((sector) => (
                        <SelectItem key={sector.id} value={sector.id}>
                          {sector.name} - {sector.availableSeats} disp.
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {hasSingleSector && selectedSector && (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">Tipologia</p>
            <p className="font-medium">{selectedSector.name}</p>
            <p className="text-sm text-muted-foreground">{selectedSector.availableSeats} posti disponibili</p>
          </div>
        )}

        <FormField
          control={form.control}
          name="ticketTypeCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo Biglietto</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12" data-testid="select-ticket-type">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <Input {...field} placeholder="Nome" className="h-12" data-testid="input-first-name" />
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
                  <Input {...field} placeholder="Cognome" className="h-12" data-testid="input-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isNominativeRequired && (
          <p className="text-xs text-amber-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Biglietti nominativi obbligatori
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
                  className="h-12"
                  data-testid="input-quantity" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedSector && selectedTicketType && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">Riepilogo</p>
            <div className="flex justify-between text-sm">
              <span>Biglietto:</span>
              <span>€{ticketPrice.toFixed(2)}</span>
            </div>
            {prevenditaPrice > 0 && (
              <div className="flex justify-between text-sm">
                <span>Prevendita:</span>
                <span>€{prevenditaPrice.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[#FFD700] border-t border-border pt-2 mt-2">
              <span>Totale:</span>
              <span>€{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        )}
      </form>
    </Form>
  );

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-tickets">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate(`/events/${ticketedEvent?.eventId}/hub`)} data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Biglietti SIAE</h1>
              <p className="text-muted-foreground">{baseEvent?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              cardReadiness.ready 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              <CreditCard className="w-4 h-4" />
              <span>{cardReadiness.ready ? 'Smart Card OK' : 'Smart Card Non Disponibile'}</span>
            </div>
            <Button 
              onClick={() => setIsEmissionDialogOpen(true)}
              disabled={!ticketedEvents?.some(e => e.ticketingStatus === "active") || !cardReadiness.ready}
              data-testid="button-emit-ticket"
            >
              <Plus className="w-4 h-4 mr-2" />
              Emetti Biglietto
            </Button>
          </div>
        </div>

        {!cardReadiness.ready && (
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-400">Smart Card Non Disponibile</p>
                  <p className="text-sm text-amber-400/80 mt-1">
                    {cardReadiness.error || 'Collega la Smart Card SIAE per emettere biglietti.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-[#FFD700]" data-testid="stat-total">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Totale</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-400" data-testid="stat-valid">{stats.valid}</div>
              <p className="text-sm text-muted-foreground">Validi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-400" data-testid="stat-used">{stats.used}</div>
              <p className="text-sm text-muted-foreground">Utilizzati</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-400" data-testid="stat-cancelled">{stats.cancelled}</div>
              <p className="text-sm text-muted-foreground">Annullati</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cerca biglietto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="select-status-filter">
              <SelectValue placeholder="Filtra per stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="valid">Validi</SelectItem>
              <SelectItem value="used">Utilizzati</SelectItem>
              <SelectItem value="cancelled">Annullati</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {eventId && sectors && sectors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#FFD700]" />
                Tipologie Biglietto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Prezzo Intero</TableHead>
                    <TableHead>Prezzo Ridotto</TableHead>
                    <TableHead>Posti Disponibili</TableHead>
                    <TableHead>Biglietti Emessi</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Sospendi Vendite</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectors.map((sector) => {
                    const hasTickets = hasTicketsForSector(sector.id);
                    const ticketsCount = tickets?.filter(t => t.sectorId === sector.id && t.status !== "cancelled").length || 0;
                    const isSuspended = (sector as any).salesSuspended || false;
                    
                    return (
                      <TableRow key={sector.id} data-testid={`sector-row-${sector.id}`}>
                        <TableCell className="font-medium">{sector.name}</TableCell>
                        <TableCell>€{Number(sector.priceIntero).toFixed(2)}</TableCell>
                        <TableCell>€{Number(sector.priceRidotto || 0).toFixed(2)}</TableCell>
                        <TableCell>{sector.availableSeats}/{sector.capacity}</TableCell>
                        <TableCell>
                          {ticketsCount > 0 ? (
                            <Badge variant="outline">{ticketsCount}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasTickets && (
                            <div className="flex items-center gap-1 text-xs text-amber-500">
                              <Lock className="w-3 h-3" />
                              <span>Prezzo bloccato</span>
                            </div>
                          )}
                          {isSuspended && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Sospeso</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-[#FFD700]" />
              Elenco Biglietti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!eventId ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                  <Ticket className="w-8 h-8 text-[#FFD700]" />
                </div>
                <h3 className="font-semibold mb-2">Seleziona un Evento</h3>
                <p className="text-sm text-muted-foreground">
                  Seleziona un evento per visualizzare i biglietti
                </p>
              </div>
            ) : ticketsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredTickets?.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                  <Ticket className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">Nessun Biglietto</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Non ci sono biglietti per questo evento
                </p>
                <Button onClick={() => setIsEmissionDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Emetti Primo Biglietto
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Tipologia</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nominativo</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>IVA</TableHead>
                    <TableHead>Data Emissione</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets?.map((ticket) => (
                    <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                      <TableCell className="font-mono font-bold">#{ticket.progressiveNumber}</TableCell>
                      <TableCell>{sectors?.find(s => s.id === ticket.sectorId)?.name || ticket.sectorCode}</TableCell>
                      <TableCell>{ticketTypes?.find(t => t.code === ticket.ticketTypeCode)?.description || ticket.ticketTypeCode}</TableCell>
                      <TableCell>
                        {(ticket.participantFirstName || ticket.participantLastName) 
                          ? `${ticket.participantFirstName || ""} ${ticket.participantLastName || ""}`.trim()
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="font-semibold text-[#FFD700]">€{Number(ticket.grossAmount).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">€{Number(ticket.vatAmount || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ticket.emissionDate && format(new Date(ticket.emissionDate), "dd/MM/yyyy HH:mm", { locale: it })}
                      </TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleTicketPress(ticket)}
                            data-testid={`button-view-${ticket.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {(ticket.status === "valid" || ticket.status === "active") && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-emerald-400 hover:text-emerald-300"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setIsValidateDialogOpen(true);
                                }}
                                data-testid={`button-validate-${ticket.id}`}
                              >
                                <Scan className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setIsCancelDialogOpen(true);
                                }}
                                data-testid={`button-cancel-${ticket.id}`}
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isEmissionDialogOpen} onOpenChange={setIsEmissionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Emetti Biglietto</DialogTitle>
              <DialogDescription>Compila i dati per emettere un nuovo biglietto.</DialogDescription>
            </DialogHeader>
            {emissionFormContent}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsEmissionDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={emitTicketMutation.isPending || isGeneratingSeal || !cardReadiness.ready}
                data-testid="button-submit"
              >
                {isGeneratingSeal || emitTicketMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Emetti
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isTicketDetailDialogOpen} onOpenChange={(open) => {
          setIsTicketDetailDialogOpen(open);
          if (!open) setSelectedTicket(null);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Biglietto #{selectedTicket?.progressiveNumber}</DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Stato</span>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tipologia</span>
                    <span className="font-medium">
                      {sectors?.find(s => s.id === selectedTicket.sectorId)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className="font-medium">
                      {ticketTypes?.find(t => t.code === selectedTicket.ticketTypeCode)?.description}
                    </span>
                  </div>
                  {(selectedTicket.participantFirstName || selectedTicket.participantLastName) && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Nominativo</span>
                      <span className="font-medium">
                        {`${selectedTicket.participantFirstName || ""} ${selectedTicket.participantLastName || ""}`.trim()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Importo</span>
                    <span className="font-bold text-[#FFD700]">
                      €{Number(selectedTicket.grossAmount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Emesso</span>
                    <span className="text-sm">
                      {selectedTicket.emissionDate && format(new Date(selectedTicket.emissionDate), "dd/MM/yyyy HH:mm", { locale: it })}
                    </span>
                  </div>
                  {selectedTicket.fiscalSealCode && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground block mb-1">Sigillo Fiscale</span>
                      <span className="font-mono text-xs break-all">{selectedTicket.fiscalSealCode}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizza
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Printer className="w-4 h-4 mr-2" />
                    Stampa
                  </Button>
                </div>

                {(selectedTicket.status === "valid" || selectedTicket.status === "active") && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        setIsTicketDetailDialogOpen(false);
                        setIsValidateDialogOpen(true);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Scan className="w-4 h-4 mr-2" />
                      Valida Ingresso
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setIsTicketDetailDialogOpen(false);
                        setIsCancelDialogOpen(true);
                      }}
                      className="flex-1"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Annulla
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isValidateDialogOpen} onOpenChange={(open) => {
          setIsValidateDialogOpen(open);
          if (!open) setSelectedTicket(null);
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Conferma Validazione</DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Scan className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-muted-foreground">
                Stai per validare il biglietto <strong>#{selectedTicket?.progressiveNumber}</strong>.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Questa azione non può essere annullata.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setIsValidateDialogOpen(false); setSelectedTicket(null); }}>
                Annulla
              </Button>
              <Button
                onClick={() => selectedTicket && validateTicketMutation.mutate(selectedTicket.id)}
                disabled={validateTicketMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-confirm-validate"
              >
                {validateTicketMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Conferma
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCancelDialogOpen} onOpenChange={(open) => {
          setIsCancelDialogOpen(open);
          if (!open) {
            setSelectedTicket(null);
            setCancelReasonCode("");
            setRefundOnCancel(false);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Annulla Biglietto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Ban className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-muted-foreground">
                  Annullamento biglietto <strong>#{selectedTicket?.progressiveNumber}</strong>
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Causale</Label>
                <Select value={cancelReasonCode} onValueChange={setCancelReasonCode}>
                  <SelectTrigger data-testid="select-cancel-reason">
                    <SelectValue placeholder="Seleziona causale" />
                  </SelectTrigger>
                  <SelectContent>
                    {cancellationReasons?.map((reason) => (
                      <SelectItem key={reason.code} value={reason.code}>
                        {reason.code} - {reason.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className={`flex items-center gap-3 p-4 rounded-xl ${
                selectedTicket?.transactionId 
                  ? 'bg-amber-500/10 border border-amber-500/30' 
                  : 'bg-muted/50 border border-border opacity-60'
              }`}>
                <Checkbox 
                  id="refund-checkbox-desktop" 
                  checked={refundOnCancel} 
                  onCheckedChange={(checked) => setRefundOnCancel(checked === true)}
                  disabled={!selectedTicket?.transactionId}
                  data-testid="checkbox-refund"
                />
                <div>
                  <Label htmlFor="refund-checkbox-desktop" className={`font-medium ${selectedTicket?.transactionId ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    Rimborso automatico
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {selectedTicket?.transactionId 
                      ? 'Il cliente riceverà il rimborso via Stripe'
                      : 'Non disponibile - biglietto senza pagamento online'}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setIsCancelDialogOpen(false); setSelectedTicket(null); setCancelReasonCode(""); setRefundOnCancel(false); }}>
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
              >
                {cancelTicketMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Conferma Annullamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const header = (
    <MobileHeader
      title="Biglietti SIAE"
      subtitle={baseEvent?.name}
      showBackButton
      showUserMenu
      onBack={() => navigate(`/events/${ticketedEvent?.eventId}/hub`)}
      rightAction={
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
          cardReadiness.ready 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-amber-500/20 text-amber-400'
        }`}>
          <CreditCard className="w-3 h-3" />
          <span>{cardReadiness.ready ? 'OK' : 'No'}</span>
        </div>
      }
    />
  );

  const footer = (
    <div className="p-4 bg-card/95 backdrop-blur-xl border-t border-border">
      <HapticButton
        onClick={() => setIsEmissionSheetOpen(true)}
        disabled={!ticketedEvents?.some(e => e.ticketingStatus === "active") || !cardReadiness.ready}
        className="w-full h-14 text-base font-semibold"
        hapticType="medium"
        data-testid="button-emit-ticket"
      >
        <Plus className="w-5 h-5 mr-2" />
        Emetti Biglietto
      </HapticButton>
    </div>
  );

  return (
    <MobileAppLayout
      header={header}
      footer={footer}
      contentClassName="pb-24"
      data-testid="page-siae-tickets"
    >
      <div className="space-y-4 py-4">
        {!cardReadiness.ready && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springConfig}
            className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-400">Smart Card Non Disponibile</p>
                <p className="text-sm text-amber-400/80 mt-1">
                  {cardReadiness.error || 'Collega la Smart Card SIAE per emettere biglietti.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Cerca biglietto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base rounded-xl bg-card border-border"
            data-testid="input-search"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {[
            { value: "all", label: "Tutti", count: stats.total },
            { value: "valid", label: "Validi", count: stats.valid },
            { value: "used", label: "Usati", count: stats.used },
            { value: "cancelled", label: "Annullati", count: stats.cancelled },
          ].map((filter) => (
            <HapticButton
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
              className="shrink-0 h-10 px-4 rounded-full"
              hapticType="light"
            >
              {filter.label} ({filter.count})
            </HapticButton>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springConfig}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2"
        >
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <p className="text-2xl font-bold text-[#FFD700]" data-testid="stat-total">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Totale</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <p className="text-2xl font-bold text-emerald-400" data-testid="stat-valid">{stats.valid}</p>
            <p className="text-xs text-muted-foreground mt-1">Validi</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <p className="text-2xl font-bold text-blue-400" data-testid="stat-used">{stats.used}</p>
            <p className="text-xs text-muted-foreground mt-1">Usati</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <p className="text-2xl font-bold text-red-400" data-testid="stat-cancelled">{stats.cancelled}</p>
            <p className="text-xs text-muted-foreground mt-1">Annull.</p>
          </div>
        </motion.div>

        {eventId && sectors && sectors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springConfig, delay: 0.1 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#FFD700]" />
                <h2 className="font-semibold">Tipologie Biglietto</h2>
              </div>
            </div>
            
            <div className="divide-y divide-border">
              {sectors.map((sector) => {
                const hasTickets = hasTicketsForSector(sector.id);
                const ticketsCount = tickets?.filter(t => t.sectorId === sector.id && t.status !== "cancelled").length || 0;
                const isSuspended = (sector as any).salesSuspended || false;
                
                return (
                  <motion.div
                    key={sector.id}
                    className="p-4 active:bg-muted/30"
                    whileTap={{ scale: 0.98 }}
                    transition={springConfig}
                    data-testid={`sector-row-${sector.id}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{sector.name}</span>
                          {hasTickets && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {ticketsCount}
                            </Badge>
                          )}
                          {isSuspended && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs shrink-0">
                              Sospeso
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Euro className="w-3.5 h-3.5" />
                            €{Number(sector.priceIntero).toFixed(2)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {sector.availableSeats}/{sector.capacity}
                          </span>
                        </div>
                        {hasTickets && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-amber-500">
                            <Lock className="w-3 h-3" />
                            <span>Prezzo bloccato</span>
                          </div>
                        )}
                      </div>
                      <Switch
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
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {!eventId ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springConfig}
            className="bg-card rounded-2xl border border-border p-8 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
              <Ticket className="w-8 h-8 text-[#FFD700]" />
            </div>
            <h3 className="font-semibold mb-2">Seleziona un Evento</h3>
            <p className="text-sm text-muted-foreground">
              Seleziona un evento per visualizzare i biglietti
            </p>
          </motion.div>
        ) : ticketsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredTickets?.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springConfig}
            className="bg-card rounded-2xl border border-border p-8 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <Ticket className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Nessun Biglietto</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Non ci sono biglietti per questo evento
            </p>
            <HapticButton
              onClick={() => setIsEmissionSheetOpen(true)}
              hapticType="medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Emetti Primo Biglietto
            </HapticButton>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredTickets?.map((ticket, index) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ ...springConfig, delay: index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTicketPress(ticket)}
                  className="bg-card rounded-2xl border border-border p-4 active:bg-muted/30"
                  data-testid={`card-ticket-${ticket.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-mono font-bold text-lg">#{ticket.progressiveNumber}</span>
                        {getStatusBadge(ticket.status)}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-1">
                        {sectors?.find(s => s.id === ticket.sectorId)?.name || ticket.sectorCode}
                        {' · '}
                        {ticketTypes?.find(t => t.code === ticket.ticketTypeCode)?.description || ticket.ticketTypeCode}
                      </p>
                      
                      {(ticket.participantFirstName || ticket.participantLastName) && (
                        <p className="text-sm font-medium">
                          {`${ticket.participantFirstName || ""} ${ticket.participantLastName || ""}`.trim()}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-3">
                        <span className="flex items-center gap-1 text-sm font-semibold text-[#FFD700]">
                          <Euro className="w-4 h-4" />
                          €{Number(ticket.grossAmount).toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ticket.emissionDate && format(new Date(ticket.emissionDate), "dd/MM HH:mm", { locale: it })}
                        </span>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <BottomSheet
        open={isEmissionSheetOpen}
        onClose={() => setIsEmissionSheetOpen(false)}
        title="Emetti Biglietto"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4" data-testid="form-emission">
            <FormField
              control={form.control}
              name="ticketedEventId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Evento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12" data-testid="select-event">
                        <SelectValue placeholder="Seleziona evento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ticketedEvents
                        ?.filter(e => e.ticketingStatus === "active")
                        .map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {(event as any).eventName || `Evento #${event.id.slice(0, 8)}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formSectors && formSectors.length > 1 && (
              <FormField
                control={form.control}
                name="sectorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipologia</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12" data-testid="select-sector">
                          <SelectValue placeholder="Seleziona tipologia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {formSectors
                          .filter(sector => !(sector as any).salesSuspended)
                          .map((sector) => (
                            <SelectItem key={sector.id} value={sector.id}>
                              {sector.name} - {sector.availableSeats} disp.
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {hasSingleSector && selectedSector && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Tipologia</p>
                <p className="font-medium">{selectedSector.name}</p>
                <p className="text-sm text-muted-foreground">{selectedSector.availableSeats} posti disponibili</p>
              </div>
            )}

            <FormField
              control={form.control}
              name="ticketTypeCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Biglietto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12" data-testid="select-ticket-type">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <Input {...field} placeholder="Nome" className="h-12" data-testid="input-first-name" />
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
                      <Input {...field} placeholder="Cognome" className="h-12" data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isNominativeRequired && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Biglietti nominativi obbligatori
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
                      className="h-12"
                      data-testid="input-quantity" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedSector && selectedTicketType && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">Riepilogo</p>
                <div className="flex justify-between text-sm">
                  <span>Biglietto:</span>
                  <span>€{ticketPrice.toFixed(2)}</span>
                </div>
                {prevenditaPrice > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Prevendita:</span>
                    <span>€{prevenditaPrice.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-[#FFD700] border-t border-border pt-2 mt-2">
                  <span>Totale:</span>
                  <span>€{totalPrice.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <HapticButton
                type="button"
                variant="outline"
                onClick={() => setIsEmissionSheetOpen(false)}
                className="flex-1 h-14"
              >
                Annulla
              </HapticButton>
              <HapticButton
                type="submit"
                disabled={emitTicketMutation.isPending || isGeneratingSeal || !cardReadiness.ready}
                className="flex-1 h-14"
                hapticType="medium"
                data-testid="button-submit"
              >
                {isGeneratingSeal || emitTicketMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Emetti
                  </>
                )}
              </HapticButton>
            </div>
          </form>
        </Form>
      </BottomSheet>

      <BottomSheet
        open={isTicketDetailOpen}
        onClose={() => {
          setIsTicketDetailOpen(false);
          setSelectedTicket(null);
        }}
        title={`Biglietto #${selectedTicket?.progressiveNumber}`}
      >
        {selectedTicket && (
          <div className="p-4 space-y-4">
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Stato</span>
                {getStatusBadge(selectedTicket.status)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tipologia</span>
                <span className="font-medium">
                  {sectors?.find(s => s.id === selectedTicket.sectorId)?.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-medium">
                  {ticketTypes?.find(t => t.code === selectedTicket.ticketTypeCode)?.description}
                </span>
              </div>
              {(selectedTicket.participantFirstName || selectedTicket.participantLastName) && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Nominativo</span>
                  <span className="font-medium">
                    {`${selectedTicket.participantFirstName || ""} ${selectedTicket.participantLastName || ""}`.trim()}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Importo</span>
                <span className="font-bold text-[#FFD700]">
                  €{Number(selectedTicket.grossAmount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Emesso</span>
                <span className="text-sm">
                  {selectedTicket.emissionDate && format(new Date(selectedTicket.emissionDate), "dd/MM/yyyy HH:mm", { locale: it })}
                </span>
              </div>
              {selectedTicket.fiscalSealCode && (
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground block mb-1">Sigillo Fiscale</span>
                  <span className="font-mono text-xs break-all">{selectedTicket.fiscalSealCode}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <HapticButton variant="outline" className="h-14">
                <Eye className="w-5 h-5 mr-2" />
                Visualizza
              </HapticButton>
              <HapticButton variant="outline" className="h-14">
                <Printer className="w-5 h-5 mr-2" />
                Stampa
              </HapticButton>
            </div>

            {(selectedTicket.status === "valid" || selectedTicket.status === "active") && (
              <div className="space-y-3 pt-2">
                <HapticButton
                  onClick={() => {
                    setIsTicketDetailOpen(false);
                    setIsValidateSheetOpen(true);
                  }}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-700"
                  hapticType="medium"
                >
                  <Scan className="w-5 h-5 mr-2" />
                  Valida Ingresso
                </HapticButton>
                <HapticButton
                  variant="destructive"
                  onClick={() => {
                    setIsTicketDetailOpen(false);
                    setIsCancelSheetOpen(true);
                  }}
                  className="w-full h-14"
                  hapticType="medium"
                >
                  <Ban className="w-5 h-5 mr-2" />
                  Annulla Biglietto
                </HapticButton>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={isValidateSheetOpen}
        onClose={() => {
          setIsValidateSheetOpen(false);
          setSelectedTicket(null);
        }}
        title="Conferma Validazione"
      >
        <div className="p-4 space-y-4">
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Scan className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-muted-foreground">
              Stai per validare il biglietto <strong>#{selectedTicket?.progressiveNumber}</strong>.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Questa azione non può essere annullata.
            </p>
          </div>
          
          <div className="flex gap-3">
            <HapticButton
              variant="outline"
              onClick={() => {
                setIsValidateSheetOpen(false);
                setSelectedTicket(null);
              }}
              className="flex-1 h-14"
            >
              Annulla
            </HapticButton>
            <HapticButton
              onClick={() => selectedTicket && validateTicketMutation.mutate(selectedTicket.id)}
              disabled={validateTicketMutation.isPending}
              className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700"
              hapticType="success"
              data-testid="button-confirm-validate"
            >
              {validateTicketMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Conferma
                </>
              )}
            </HapticButton>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isCancelSheetOpen}
        onClose={() => {
          setIsCancelSheetOpen(false);
          setSelectedTicket(null);
          setCancelReasonCode("");
          setRefundOnCancel(false);
        }}
        title="Annulla Biglietto"
      >
        <div className="p-4 space-y-4">
          <div className="text-center py-2">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <Ban className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-muted-foreground">
              Annullamento biglietto <strong>#{selectedTicket?.progressiveNumber}</strong>
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Causale</Label>
            <Select value={cancelReasonCode} onValueChange={setCancelReasonCode}>
              <SelectTrigger className="h-12" data-testid="select-cancel-reason">
                <SelectValue placeholder="Seleziona causale" />
              </SelectTrigger>
              <SelectContent>
                {cancellationReasons?.map((reason) => (
                  <SelectItem key={reason.code} value={reason.code}>
                    {reason.code} - {reason.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className={`flex items-center gap-3 p-4 rounded-xl ${
            selectedTicket?.transactionId 
              ? 'bg-amber-500/10 border border-amber-500/30' 
              : 'bg-muted/50 border border-border opacity-60'
          }`}>
            <Checkbox 
              id="refund-checkbox" 
              checked={refundOnCancel} 
              onCheckedChange={(checked) => setRefundOnCancel(checked === true)}
              disabled={!selectedTicket?.transactionId}
              data-testid="checkbox-refund"
            />
            <div>
              <Label htmlFor="refund-checkbox" className={`font-medium ${selectedTicket?.transactionId ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                Rimborso automatico
              </Label>
              <p className="text-xs text-muted-foreground">
                {selectedTicket?.transactionId 
                  ? 'Il cliente riceverà il rimborso via Stripe'
                  : 'Non disponibile - biglietto senza pagamento online'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <HapticButton
              variant="outline"
              onClick={() => {
                setIsCancelSheetOpen(false);
                setSelectedTicket(null);
                setCancelReasonCode("");
                setRefundOnCancel(false);
              }}
              className="flex-1 h-14"
            >
              Annulla
            </HapticButton>
            <HapticButton
              variant="destructive"
              disabled={!cancelReasonCode || cancelTicketMutation.isPending}
              onClick={() => selectedTicket && cancelTicketMutation.mutate({ 
                ticketId: selectedTicket.id, 
                reasonCode: cancelReasonCode,
                refund: refundOnCancel
              })}
              className="flex-1 h-14"
              hapticType="medium"
              data-testid="button-confirm-cancel"
            >
              {cancelTicketMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-5 h-5 mr-2" />
                  Conferma
                </>
              )}
            </HapticButton>
          </div>
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
