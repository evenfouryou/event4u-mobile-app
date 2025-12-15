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
  insertSiaeTicketedEventSchema,
  insertSiaeEventSectorSchema,
  type SiaeTicketedEvent,
  type SiaeEventSector,
  type SiaeEventGenre,
  type SiaeSectorCode,
  type Event,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Ticket,
  Calendar,
  Users,
  Euro,
  Settings,
  Plus,
  MoreHorizontal,
  Loader2,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  MapPin,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const formSchema = insertSiaeTicketedEventSchema.omit({ companyId: true });
type FormData = z.infer<typeof formSchema>;

const sectorFormSchema = insertSiaeEventSectorSchema.omit({ ticketedEventId: true });
type SectorFormData = z.infer<typeof sectorFormSchema>;

export default function SiaeTicketedEventsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSectorDialogOpen, setIsSectorDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SiaeTicketedEvent | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const companyId = user?.companyId;

  const { data: ticketedEvents, isLoading: eventsLoading } = useQuery<SiaeTicketedEvent[]>({
    queryKey: ['/api/siae/companies', companyId, 'ticketed-events'],
    enabled: !!companyId,
  });

  const { data: availableEvents } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    enabled: !!companyId,
  });

  const { data: genres } = useQuery<SiaeEventGenre[]>({
    queryKey: ['/api/siae/genres'],
  });

  const { data: sectorCodes } = useQuery<SiaeSectorCode[]>({
    queryKey: ['/api/siae/sector-codes'],
  });

  const { data: selectedEventSectors, isLoading: sectorsLoading } = useQuery<SiaeEventSector[]>({
    queryKey: ['/api/siae/ticketed-events', expandedEventId, 'sectors'],
    enabled: !!expandedEventId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventId: "",
      genreCode: "",
      taxType: "S",
      ivaPreassolta: "N",
      totalCapacity: 0,
      requiresNominative: true,
      allowsChangeName: false,
      allowsResale: false,
      maxTicketsPerUser: 10,
      ticketingStatus: "draft",
    },
  });

  const sectorForm = useForm<SectorFormData>({
    resolver: zodResolver(sectorFormSchema),
    defaultValues: {
      sectorCode: "",
      name: "",
      capacity: 0,
      availableSeats: 0,
      isNumbered: false,
      priceIntero: "0",
      priceRidotto: null,
      priceOmaggio: "0",
      prevendita: "0",
      ivaRate: "22",
      sortOrder: 0,
      active: true,
    },
  });

  useEffect(() => {
    if (!isCreateDialogOpen) {
      form.reset({
        eventId: "",
        genreCode: "",
        taxType: "S",
        ivaPreassolta: "N",
        totalCapacity: 0,
        requiresNominative: true,
        allowsChangeName: false,
        allowsResale: false,
        maxTicketsPerUser: 10,
        ticketingStatus: "draft",
      });
    }
  }, [isCreateDialogOpen, form]);

  useEffect(() => {
    if (!isSectorDialogOpen) {
      sectorForm.reset({
        sectorCode: "",
        name: "",
        capacity: 0,
        availableSeats: 0,
        isNumbered: false,
        priceIntero: "0",
        priceRidotto: null,
        priceOmaggio: "0",
        prevendita: "0",
        ivaRate: "22",
        sortOrder: 0,
        active: true,
      });
    }
  }, [isSectorDialogOpen, sectorForm]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", `/api/siae/ticketed-events`, { ...data, companyId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/companies' });
      setIsCreateDialogOpen(false);
      toast({
        title: "Biglietteria Attivata",
        description: "L'evento è stato configurato per la biglietteria SIAE.",
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/siae/ticketed-events/${id}`, { ticketingStatus: status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/companies' });
      toast({
        title: "Stato Aggiornato",
        description: "Lo stato dell'evento è stato modificato.",
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

  const createSectorMutation = useMutation({
    mutationFn: async (data: SectorFormData) => {
      const response = await apiRequest("POST", `/api/siae/event-sectors`, { ...data, ticketedEventId: selectedEvent?.id });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' && q.queryKey[2] === 'sectors' 
      });
      setIsSectorDialogOpen(false);
      toast({
        title: "Settore Creato",
        description: "Il nuovo settore è stato aggiunto all'evento.",
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

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const onSubmitSector = (data: SectorFormData) => {
    if (!selectedEvent) return;
    const submitData = {
      ...data,
      availableSeats: data.capacity,
    };
    createSectorMutation.mutate(submitData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Attivo</Badge>;
      case "suspended":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Sospeso</Badge>;
      case "closed":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Chiuso</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Bozza</Badge>;
    }
  };

  const eventsWithoutTicketing = availableEvents?.filter(
    (event) => !ticketedEvents?.some((te) => te.eventId === event.id)
  );

  const getEventInfo = (eventId: string) => {
    return availableEvents?.find((e) => e.id === eventId);
  };

  if (eventsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-siae-ticketed-events">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="page-title">
            <Ticket className="w-8 h-8 text-[#FFD700]" />
            Eventi Biglietteria SIAE
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestisci la biglietteria SIAE per i tuoi eventi
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          disabled={!eventsWithoutTicketing?.length}
          data-testid="button-activate-ticketing"
        >
          <Plus className="w-4 h-4 mr-2" />
          Attiva Biglietteria
        </Button>
      </div>

      {ticketedEvents?.length === 0 ? (
        <Card className="glass-card" data-testid="card-empty-state">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
              <Ticket className="w-8 h-8 text-[#FFD700]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessun Evento con Biglietteria</h3>
            <p className="text-muted-foreground mb-4">
              Attiva la biglietteria SIAE su uno dei tuoi eventi per iniziare a vendere biglietti.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!eventsWithoutTicketing?.length}>
              <Plus className="w-4 h-4 mr-2" />
              Attiva Biglietteria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {ticketedEvents?.map((ticketedEvent) => {
              const eventInfo = getEventInfo(ticketedEvent.eventId);
              const isExpanded = expandedEventId === ticketedEvent.id;

              return (
                <Card
                  key={ticketedEvent.id}
                  className="glass-card overflow-hidden"
                  data-testid={`card-event-${ticketedEvent.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(ticketedEvent.ticketingStatus)}
                          {ticketedEvent.requiresNominative && (
                            <Badge variant="outline" className="text-xs">
                              Nominativo
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl" data-testid={`title-event-${ticketedEvent.id}`}>
                          {eventInfo?.name || "Evento"}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          {eventInfo?.startDatetime && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(eventInfo.startDatetime), "d MMMM yyyy", { locale: it })}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {ticketedEvent.totalCapacity} posti
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            Genere: {genres?.find((g) => g.code === ticketedEvent.genreCode)?.description || ticketedEvent.genreCode}
                          </span>
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-menu-${ticketedEvent.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ticketedEvent.ticketingStatus === "draft" && (
                            <DropdownMenuItem
                              onClick={() => updateStatusMutation.mutate({ id: ticketedEvent.id, status: "active" })}
                              data-testid={`menu-activate-${ticketedEvent.id}`}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Attiva Vendite
                            </DropdownMenuItem>
                          )}
                          {ticketedEvent.ticketingStatus === "active" && (
                            <DropdownMenuItem
                              onClick={() => updateStatusMutation.mutate({ id: ticketedEvent.id, status: "suspended" })}
                              data-testid={`menu-suspend-${ticketedEvent.id}`}
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Sospendi Vendite
                            </DropdownMenuItem>
                          )}
                          {ticketedEvent.ticketingStatus === "suspended" && (
                            <DropdownMenuItem
                              onClick={() => updateStatusMutation.mutate({ id: ticketedEvent.id, status: "active" })}
                              data-testid={`menu-resume-${ticketedEvent.id}`}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Riprendi Vendite
                            </DropdownMenuItem>
                          )}
                          {ticketedEvent.ticketingStatus !== "closed" && (
                            <DropdownMenuItem
                              onClick={() => updateStatusMutation.mutate({ id: ticketedEvent.id, status: "closed" })}
                              className="text-destructive"
                              data-testid={`menu-close-${ticketedEvent.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Chiudi Vendite
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                        <div className="text-xs text-muted-foreground mb-1">Biglietti Venduti</div>
                        <div className="text-2xl font-bold text-[#FFD700]" data-testid={`stat-sold-${ticketedEvent.id}`}>
                          {ticketedEvent.ticketsSold}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                        <div className="text-xs text-muted-foreground mb-1">Disponibili</div>
                        <div className="text-2xl font-bold text-emerald-400" data-testid={`stat-available-${ticketedEvent.id}`}>
                          {ticketedEvent.totalCapacity - ticketedEvent.ticketsSold}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                        <div className="text-xs text-muted-foreground mb-1">Annullati</div>
                        <div className="text-2xl font-bold text-destructive" data-testid={`stat-cancelled-${ticketedEvent.id}`}>
                          {ticketedEvent.ticketsCancelled}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                        <div className="text-xs text-muted-foreground mb-1">Incasso</div>
                        <div className="text-2xl font-bold text-[#FFD700] flex items-center gap-1" data-testid={`stat-revenue-${ticketedEvent.id}`}>
                          <Euro className="w-5 h-5" />
                          {Number(ticketedEvent.totalRevenue || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <Accordion
                      type="single"
                      collapsible
                      value={isExpanded ? ticketedEvent.id : ""}
                      onValueChange={(val) => setExpandedEventId(val || null)}
                    >
                      <AccordionItem value={ticketedEvent.id} className="border-none">
                        <AccordionTrigger className="py-2 text-sm hover:no-underline" data-testid={`accordion-trigger-${ticketedEvent.id}`}>
                          <span className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Biglietti e Prezzi
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">Biglietti Configurati</h4>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedEvent(ticketedEvent);
                                  setIsSectorDialogOpen(true);
                                }}
                                data-testid={`button-add-sector-${ticketedEvent.id}`}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Crea Biglietto
                              </Button>
                            </div>

                            {sectorsLoading && isExpanded ? (
                              <div className="space-y-2">
                                {[1, 2].map((i) => (
                                  <Skeleton key={i} className="h-12 w-full" />
                                ))}
                              </div>
                            ) : selectedEventSectors?.length === 0 ? (
                              <div className="p-4 text-center text-muted-foreground bg-background/50 rounded-lg border border-dashed">
                                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                                Nessun biglietto configurato. Crea almeno un biglietto per iniziare a vendere.
                              </div>
                            ) : (
                              <div className="rounded-lg border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/50">
                                      <TableHead>Biglietto</TableHead>
                                      <TableHead>Quantità</TableHead>
                                      <TableHead>Disponibili</TableHead>
                                      <TableHead>Intero</TableHead>
                                      <TableHead>Ridotto</TableHead>
                                      <TableHead>DDP</TableHead>
                                      <TableHead>Stato</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {selectedEventSectors?.map((sector) => (
                                      <TableRow key={sector.id} data-testid={`row-sector-${sector.id}`}>
                                        <TableCell>
                                          <div>
                                            <div className="font-medium">{sector.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {sectorCodes?.find((s) => s.code === sector.sectorCode)?.description || sector.sectorCode}
                                              {sector.isNumbered && " (Numerato)"}
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell>{sector.capacity}</TableCell>
                                        <TableCell>
                                          <span className={sector.availableSeats < 10 ? "text-amber-500" : ""}>
                                            {sector.availableSeats}
                                          </span>
                                        </TableCell>
                                        <TableCell>€{Number(sector.priceIntero).toFixed(2)}</TableCell>
                                        <TableCell>
                                          {sector.priceRidotto ? `€${Number(sector.priceRidotto).toFixed(2)}` : "-"}
                                        </TableCell>
                                        <TableCell>€{Number(sector.prevendita || 0).toFixed(2)}</TableCell>
                                        <TableCell>
                                          {sector.active ? (
                                            <Badge className="bg-emerald-500/20 text-emerald-400">Attivo</Badge>
                                          ) : (
                                            <Badge variant="secondary">Inattivo</Badge>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-[#FFD700]" />
              Attiva Biglietteria SIAE
            </DialogTitle>
            <DialogDescription>
              Configura la biglietteria SIAE per un evento esistente
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-create">
              <FormField
                control={form.control}
                name="eventId"
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
                        {eventsWithoutTicketing?.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.name} - {event.startDatetime && format(new Date(event.startDatetime), "d MMM yyyy", { locale: it })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="genreCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Genere Evento (TAB.1)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-genre">
                            <SelectValue placeholder="Seleziona genere" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {genres?.map((genre) => (
                            <SelectItem key={genre.code} value={genre.code}>
                              {genre.code} - {genre.description}
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
                  name="taxType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Fiscale</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tax-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="S">Spettacolo</SelectItem>
                          <SelectItem value="I">Intrattenimento</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capienza Totale</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-capacity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxTicketsPerUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Biglietti per Utente</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-max-tickets"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ivaPreassolta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IVA Preassolta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-iva">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="N">No</SelectItem>
                        <SelectItem value="B">Base</SelectItem>
                        <SelectItem value="F">Forfait</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <h4 className="font-medium">Opzioni Nominatività</h4>
                
                <FormField
                  control={form.control}
                  name="requiresNominative"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel className="text-sm">Biglietti Nominativi</FormLabel>
                        <FormDescription className="text-xs">
                          I biglietti saranno associati al nome dell'acquirente
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-nominative"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowsChangeName"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel className="text-sm">Consenti Cambio Nome</FormLabel>
                        <FormDescription className="text-xs">
                          Solo per eventi con capienza {">"} 5000
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-change-name"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowsResale"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel className="text-sm">Consenti Rivendita</FormLabel>
                        <FormDescription className="text-xs">
                          Solo per eventi con capienza {">"} 5000
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-resale"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creazione...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Attiva Biglietteria
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSectorDialogOpen} onOpenChange={setIsSectorDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-sector">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#FFD700]" />
              Crea Nuovo Biglietto
            </DialogTitle>
            <DialogDescription>
              Configura un nuovo tipo di biglietto per l'evento
            </DialogDescription>
          </DialogHeader>

          <Form {...sectorForm}>
            <form onSubmit={sectorForm.handleSubmit(onSubmitSector)} className="space-y-4" data-testid="form-sector">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={sectorForm.control}
                  name="sectorCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice Settore (TAB.2)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-sector-code">
                            <SelectValue placeholder="Seleziona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sectorCodes?.map((code) => (
                            <SelectItem key={code.code} value={code.code}>
                              {code.code} - {code.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sectorForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Biglietto</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="es. Ingresso Standard" data-testid="input-sector-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={sectorForm.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantità</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-sector-capacity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sectorForm.control}
                  name="isNumbered"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between pt-6">
                      <FormLabel className="text-sm">Posti Numerati</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-numbered"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={sectorForm.control}
                  name="priceIntero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo Intero (€)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-price-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sectorForm.control}
                  name="priceRidotto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo Ridotto (€)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          type="number"
                          step="0.01"
                          data-testid="input-price-reduced"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sectorForm.control}
                  name="prevendita"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DDP - Diritto di Prevendita (€)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          type="number"
                          step="0.01"
                          data-testid="input-presale"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={sectorForm.control}
                name="ivaRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aliquota IVA (%)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? "22"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-iva-rate">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="22">22%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="4">4%</SelectItem>
                        <SelectItem value="0">Esente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSectorDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={createSectorMutation.isPending} data-testid="button-submit-sector">
                  {createSectorMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creazione...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Crea Biglietto
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
