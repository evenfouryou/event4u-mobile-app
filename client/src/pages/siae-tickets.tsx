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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isEmissionDialogOpen, setIsEmissionDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SiaeTicket | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancelReasonCode, setCancelReasonCode] = useState("");

  const companyId = user?.companyId;

  const { data: ticketedEvents } = useQuery<SiaeTicketedEvent[]>({
    queryKey: ['/api/siae/companies', companyId, 'ticketed-events'],
    enabled: !!companyId,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<SiaeTicket[]>({
    queryKey: ['/api/siae/ticketed-events', selectedEventId, 'tickets'],
    enabled: !!selectedEventId,
  });

  const { data: sectors } = useQuery<SiaeEventSector[]>({
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

  const { data: formSectors } = useQuery<SiaeEventSector[]>({
    queryKey: ['/api/siae/ticketed-events', selectedEventForForm, 'sectors'],
    enabled: !!selectedEventForForm,
  });

  const selectedSector = formSectors?.find(s => s.id === selectedSectorId);

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

      const ticketData = {
        ticketedEventId: data.ticketedEventId,
        sectorId: data.sectorId,
        ticketTypeCode: data.ticketTypeCode,
        sectorCode: sector.sectorCode,
        customerId: data.customerId || null,
        participantFirstName: data.participantFirstName || null,
        participantLastName: data.participantLastName || null,
        emissionDate: new Date().toISOString(),
        grossAmount: data.ticketTypeCode === "INT" ? sector.priceIntero : 
                     data.ticketTypeCode === "RID" ? (sector.priceRidotto || sector.priceIntero) : "0",
        progressiveNumber: Date.now(),
      };

      const response = await apiRequest("POST", `/api/siae/tickets`, ticketData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' });
      setIsEmissionDialogOpen(false);
      toast({
        title: "Biglietto Emesso",
        description: "Il biglietto è stato emesso con successo.",
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
    mutationFn: async ({ ticketId, reasonCode }: { ticketId: string; reasonCode: string }) => {
      const response = await apiRequest("POST", `/api/siae/tickets/${ticketId}/cancel`, { reasonCode });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' });
      setIsCancelDialogOpen(false);
      setSelectedTicket(null);
      setCancelReasonCode("");
      toast({
        title: "Biglietto Annullato",
        description: "Il biglietto è stato annullato.",
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
    total: tickets?.length || 0,
    valid: tickets?.filter(t => t.status === "valid").length || 0,
    used: tickets?.filter(t => t.status === "used").length || 0,
    cancelled: tickets?.filter(t => t.status === "cancelled").length || 0,
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-siae-tickets">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="page-title">
            <Ticket className="w-8 h-8 text-[#FFD700]" />
            Gestione Biglietti SIAE
          </h1>
          <p className="text-muted-foreground mt-1">
            Emetti, valida e gestisci i biglietti per i tuoi eventi
          </p>
        </div>
        <Button
          onClick={() => setIsEmissionDialogOpen(true)}
          disabled={!ticketedEvents?.some(e => e.ticketingStatus === "active")}
          data-testid="button-emit-ticket"
        >
          <Plus className="w-4 h-4 mr-2" />
          Emetti Biglietto
        </Button>
      </div>

      <Card className="glass-card" data-testid="card-event-selector">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Seleziona Evento</label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger data-testid="select-event-filter">
                  <SelectValue placeholder="Seleziona un evento" />
                </SelectTrigger>
                <SelectContent>
                  {ticketedEvents?.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      Evento #{event.id.slice(0, 8)} - {event.ticketingStatus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEventId && (
              <>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Cerca</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Cerca per codice, nome..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                </div>
                <div className="w-full md:w-48">
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
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedEventId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Totale Emessi</div>
              <div className="text-2xl font-bold text-[#FFD700]" data-testid="stat-total">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Validi</div>
              <div className="text-2xl font-bold text-emerald-400" data-testid="stat-valid">{stats.valid}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Utilizzati</div>
              <div className="text-2xl font-bold text-blue-400" data-testid="stat-used">{stats.used}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Annullati</div>
              <div className="text-2xl font-bold text-destructive" data-testid="stat-cancelled">{stats.cancelled}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedEventId ? (
        <Card className="glass-card" data-testid="card-empty-state">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
              <Ticket className="w-8 h-8 text-[#FFD700]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Seleziona un Evento</h3>
            <p className="text-muted-foreground">
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
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <Ticket className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessun Biglietto</h3>
            <p className="text-muted-foreground mb-4">
              Non ci sono biglietti emessi per questo evento
            </p>
            <Button onClick={() => setIsEmissionDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Emetti Primo Biglietto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card" data-testid="card-tickets-table">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Progressivo</TableHead>
                    <TableHead>Sigillo Fiscale</TableHead>
                    <TableHead>Settore</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nominativo</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Emissione</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets?.map((ticket) => (
                    <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                      <TableCell className="font-mono" data-testid={`cell-progressive-${ticket.id}`}>
                        #{ticket.progressiveNumber}
                      </TableCell>
                      <TableCell className="font-mono text-xs" data-testid={`cell-seal-${ticket.id}`}>
                        {ticket.fiscalSealCode || "-"}
                      </TableCell>
                      <TableCell data-testid={`cell-sector-${ticket.id}`}>
                        {sectors?.find(s => s.id === ticket.sectorId)?.name || ticket.sectorCode}
                      </TableCell>
                      <TableCell data-testid={`cell-type-${ticket.id}`}>
                        {ticketTypes?.find(t => t.code === ticket.ticketTypeCode)?.description || ticket.ticketTypeCode}
                      </TableCell>
                      <TableCell data-testid={`cell-name-${ticket.id}`}>
                        {ticket.participantFirstName || ticket.participantLastName ? (
                          `${ticket.participantFirstName || ""} ${ticket.participantLastName || ""}`.trim()
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`cell-amount-${ticket.id}`}>
                        <span className="flex items-center gap-1">
                          <Euro className="w-3 h-3" />
                          {Number(ticket.grossAmount).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-status-${ticket.id}`}>
                        {getStatusBadge(ticket.status)}
                      </TableCell>
                      <TableCell data-testid={`cell-date-${ticket.id}`}>
                        <div className="text-sm">
                          {ticket.emissionDate && format(new Date(ticket.emissionDate), "dd/MM/yyyy", { locale: it })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {ticket.emissionDate && format(new Date(ticket.emissionDate), "HH:mm", { locale: it })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-menu-${ticket.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem data-testid={`menu-view-${ticket.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizza
                            </DropdownMenuItem>
                            <DropdownMenuItem data-testid={`menu-print-${ticket.id}`}>
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
                                  data-testid={`menu-validate-${ticket.id}`}
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
                                  data-testid={`menu-cancel-${ticket.id}`}
                                >
                                  <Ban className="w-4 h-4 mr-2" />
                                  Annulla
                                </DropdownMenuItem>
                              </>
                            )}
                            {ticket.status === "used" && (
                              <DropdownMenuItem disabled>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Già Utilizzato
                              </DropdownMenuItem>
                            )}
                            {ticket.status === "cancelled" && (
                              <DropdownMenuItem disabled>
                                <XCircle className="w-4 h-4 mr-2" />
                                Annullato
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isEmissionDialogOpen} onOpenChange={setIsEmissionDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-emission">
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
                              Evento #{event.id.slice(0, 8)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sectorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Settore</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!formSectors?.length}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-sector">
                          <SelectValue placeholder="Seleziona settore" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {formSectors?.map((sector) => (
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
                        {selectedSector?.priceRidotto && (
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
                      <FormLabel>Nome Partecipante</FormLabel>
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
                      <FormLabel>Cognome Partecipante</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cognome" data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEmissionDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={emitTicketMutation.isPending} data-testid="button-submit">
                  {emitTicketMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Emissione...
                    </>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4 mr-2" />
                      Emetti Biglietto
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
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTicket && validateTicketMutation.mutate(selectedTicket.id)}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-confirm-validate"
            >
              {validateTicketMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Conferma Ingresso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent data-testid="dialog-cancel">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="w-5 h-5" />
              Annulla Biglietto
            </DialogTitle>
            <DialogDescription>
              Stai per annullare il biglietto #{selectedTicket?.progressiveNumber}.
              Seleziona la causale di annullamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Causale Annullamento (TAB.5)</label>
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReasonCode || cancelTicketMutation.isPending}
              onClick={() => selectedTicket && cancelTicketMutation.mutate({ 
                ticketId: selectedTicket.id, 
                reasonCode: cancelReasonCode 
              })}
              data-testid="button-confirm-cancel"
            >
              {cancelTicketMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
