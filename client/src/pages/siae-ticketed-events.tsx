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
import { Textarea } from "@/components/ui/textarea";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  ArrowLeft,
  Gift,
  Tag,
  ExternalLink,
  Copy,
  Image,
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const formSchema = insertSiaeTicketedEventSchema.omit({ companyId: true });
type FormData = z.infer<typeof formSchema>;

// New sector form schema matching wizard style
const sectorFormSchema = z.object({
  name: z.string().min(1, "Nome biglietto richiesto"),
  sectorCode: z.string().min(1, "Codice settore richiesto"),
  capacity: z.number().min(1, "Quantità richiesta"),
  isNumbered: z.boolean().default(false),
  ticketType: z.enum(['INT', 'RID', 'OMA']),
  price: z.string().default("0"),
  ddp: z.string().default("0"),
  ivaRate: z.string().default("22"),
  sortOrder: z.number().default(0),
  active: z.boolean().default(true),
});
type SectorFormData = z.infer<typeof sectorFormSchema>;

export default function SiaeTicketedEventsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSectorDialogOpen, setIsSectorDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SiaeTicketedEvent | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [publicInfoImageUrl, setPublicInfoImageUrl] = useState("");
  const [publicInfoDescription, setPublicInfoDescription] = useState("");

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

  const { data: publicInfoData } = useQuery<{ description: string | null; imageUrl: string | null }>({
    queryKey: ['/api/siae/ticketed-events', expandedEventId, 'public-info'],
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
      isNumbered: false,
      ticketType: "INT",
      price: "0",
      ddp: "0",
      ivaRate: "22",
      sortOrder: 0,
      active: true,
    },
  });

  // Watch ticket type to control price field
  const watchedTicketType = sectorForm.watch("ticketType");

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
        isNumbered: false,
        ticketType: "INT",
        price: "0",
        ddp: "0",
        ivaRate: "22",
        sortOrder: 0,
        active: true,
      });
    }
  }, [isSectorDialogOpen, sectorForm]);

  // Auto-set price to 0 when Omaggio is selected
  useEffect(() => {
    if (watchedTicketType === 'OMA') {
      sectorForm.setValue('price', '0');
    }
  }, [watchedTicketType, sectorForm]);

  // Initialize public info fields from query data
  useEffect(() => {
    if (publicInfoData) {
      setPublicInfoImageUrl(publicInfoData.imageUrl || "");
      setPublicInfoDescription(publicInfoData.description || "");
    }
  }, [publicInfoData]);

  // Reset public info fields when accordion closes
  useEffect(() => {
    if (!expandedEventId) {
      setPublicInfoImageUrl("");
      setPublicInfoDescription("");
    }
  }, [expandedEventId]);

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

  const updatePublicInfoMutation = useMutation({
    mutationFn: async ({ id, description, imageUrl }: { id: string; description: string; imageUrl: string }) => {
      const response = await apiRequest("PATCH", `/api/siae/ticketed-events/${id}/public-info`, { description, imageUrl });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' && q.queryKey[2] === 'public-info' 
      });
      toast({
        title: "Informazioni Salvate",
        description: "Le informazioni pubbliche sono state aggiornate.",
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
    
    // Map new ticket format to backend sector format
    // Note: Omaggio tickets have price 0, others use the entered price
    const priceValue = data.ticketType === 'OMA' ? '0' : (data.price || '0');
    const submitData = {
      sectorCode: data.sectorCode,
      name: data.name,
      capacity: data.capacity,
      availableSeats: data.capacity,
      isNumbered: data.isNumbered,
      // Map price based on ticket type - only one field gets the price, others are 0
      priceIntero: data.ticketType === 'INT' ? priceValue : '0',
      priceRidotto: data.ticketType === 'RID' ? priceValue : '0',
      priceOmaggio: '0', // Omaggio is always free
      prevendita: data.ddp || '0',
      ivaRate: data.ivaRate,
      sortOrder: data.sortOrder,
      active: data.active,
    };
    createSectorMutation.mutate(submitData as any);
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
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-siae-events">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="page-title">
              <Ticket className="w-8 h-8 text-[#FFD700]" />
              Eventi Biglietteria SIAE
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestisci la biglietteria SIAE per i tuoi eventi
            </p>
          </div>
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

                    {/* Link Pubblico Acquisto */}
                    {ticketedEvent.ticketingStatus === "active" && (
                      <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <ExternalLink className="w-4 h-4 text-emerald-400" />
                            <span className="text-muted-foreground">Link Pubblico:</span>
                            <code className="px-2 py-1 rounded bg-background/50 text-emerald-400 text-xs">
                              {window.location.origin}/acquista/{ticketedEvent.eventId}
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/acquista/${ticketedEvent.eventId}`);
                                toast({
                                  title: "Link Copiato",
                                  description: "Il link è stato copiato negli appunti.",
                                });
                              }}
                              data-testid={`button-copy-link-${ticketedEvent.id}`}
                            >
                              <Copy className="w-4 h-4 mr-1" />
                              Copia
                            </Button>
                            <a
                              href={`/acquista/${ticketedEvent.eventId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="outline" data-testid={`button-open-link-${ticketedEvent.id}`}>
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Apri
                              </Button>
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

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

                            {/* Informazioni Pubbliche */}
                            <div className="mt-6 p-4 rounded-lg bg-background/50 border border-border/50" data-testid={`section-public-info-${ticketedEvent.id}`}>
                              <h4 className="font-medium mb-4 flex items-center gap-2">
                                <Image className="w-4 h-4" />
                                Informazioni Pubbliche
                              </h4>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`image-url-${ticketedEvent.id}`}>URL Immagine</Label>
                                  <Input
                                    id={`image-url-${ticketedEvent.id}`}
                                    placeholder="https://esempio.com/immagine.jpg"
                                    value={publicInfoImageUrl}
                                    onChange={(e) => setPublicInfoImageUrl(e.target.value)}
                                    data-testid={`input-image-url-${ticketedEvent.id}`}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`description-${ticketedEvent.id}`}>Descrizione</Label>
                                  <Textarea
                                    id={`description-${ticketedEvent.id}`}
                                    placeholder="Descrizione dell'evento..."
                                    value={publicInfoDescription}
                                    onChange={(e) => setPublicInfoDescription(e.target.value)}
                                    rows={3}
                                    data-testid={`input-description-${ticketedEvent.id}`}
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    updatePublicInfoMutation.mutate({
                                      id: ticketedEvent.id,
                                      description: publicInfoDescription,
                                      imageUrl: publicInfoImageUrl,
                                    });
                                  }}
                                  disabled={updatePublicInfoMutation.isPending}
                                  data-testid={`button-save-public-info-${ticketedEvent.id}`}
                                >
                                  {updatePublicInfoMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Salvataggio...
                                    </>
                                  ) : (
                                    "Salva"
                                  )}
                                </Button>
                              </div>
                            </div>
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
        <DialogContent className="max-w-xl" data-testid="dialog-sector">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#FFD700]/20 flex items-center justify-center">
                <Ticket className="w-4 h-4 text-[#FFD700]" />
              </div>
              Nuovo Biglietto
            </DialogTitle>
            <DialogDescription>
              Configura un nuovo tipo di biglietto per l'evento
            </DialogDescription>
          </DialogHeader>

          <Form {...sectorForm}>
            <form onSubmit={sectorForm.handleSubmit(onSubmitSector)} className="space-y-5" data-testid="form-sector">
              <div className="p-4 rounded-lg bg-background/50 border border-border/50 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Settings className="w-4 h-4" />
                  Informazioni Base
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                  <FormField
                    control={sectorForm.control}
                    name="sectorCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codice Settore SIAE</FormLabel>
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={sectorForm.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantità Disponibile</FormLabel>
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
                      <FormItem className="flex items-center justify-between pt-7">
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
              </div>

              <div className="p-4 rounded-lg bg-background/50 border border-border/50 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Ticket className="w-4 h-4" />
                  Tipo Biglietto
                </div>
                <FormField
                  control={sectorForm.control}
                  name="ticketType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-3 gap-3">
                          <div
                            onClick={() => field.onChange('INT')}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              field.value === 'INT'
                                ? 'border-[#FFD700] bg-[#FFD700]/10'
                                : 'border-border hover:border-[#FFD700]/50'
                            }`}
                            data-testid="option-ticket-intero"
                          >
                            <div className="text-center">
                              <Badge className={`mb-2 ${field.value === 'INT' ? 'bg-[#FFD700] text-black' : 'bg-muted'}`}>INT</Badge>
                              <div className="font-medium text-sm">Intero</div>
                              <div className="text-xs text-muted-foreground">Prezzo pieno</div>
                            </div>
                          </div>
                          <div
                            onClick={() => field.onChange('RID')}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              field.value === 'RID'
                                ? 'border-blue-400 bg-blue-400/10'
                                : 'border-border hover:border-blue-400/50'
                            }`}
                            data-testid="option-ticket-ridotto"
                          >
                            <div className="text-center">
                              <Badge className={`mb-2 ${field.value === 'RID' ? 'bg-blue-400 text-white' : 'bg-muted'}`}>RID</Badge>
                              <div className="font-medium text-sm">Ridotto</div>
                              <div className="text-xs text-muted-foreground">Prezzo ridotto</div>
                            </div>
                          </div>
                          <div
                            onClick={() => field.onChange('OMA')}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              field.value === 'OMA'
                                ? 'border-emerald-400 bg-emerald-400/10'
                                : 'border-border hover:border-emerald-400/50'
                            }`}
                            data-testid="option-ticket-omaggio"
                          >
                            <div className="text-center">
                              <Badge className={`mb-2 ${field.value === 'OMA' ? 'bg-emerald-400 text-white' : 'bg-muted'}`}>OMA</Badge>
                              <div className="font-medium text-sm">Omaggio</div>
                              <div className="text-xs text-muted-foreground">Gratuito</div>
                            </div>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="p-4 rounded-lg bg-background/50 border border-border/50 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Euro className="w-4 h-4" />
                  Prezzo e IVA
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={sectorForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prezzo Biglietto</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              className="pl-9"
                              disabled={watchedTicketType === 'OMA'}
                              data-testid="input-price"
                            />
                          </div>
                        </FormControl>
                        {watchedTicketType === 'OMA' && (
                          <p className="text-xs text-muted-foreground">Biglietto omaggio - prezzo gratuito</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={sectorForm.control}
                    name="ddp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          DDP
                          <Badge variant="secondary" className="text-xs">Prevendita</Badge>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              type="number"
                              step="0.01"
                              className="pl-9"
                              data-testid="input-ddp"
                            />
                          </div>
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
                      <FormLabel>Aliquota IVA</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "22"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-iva-rate" className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="22">22% - Standard</SelectItem>
                          <SelectItem value="10">10% - Ridotta (Teatro/Circo)</SelectItem>
                          <SelectItem value="4">4% - Super Ridotta</SelectItem>
                          <SelectItem value="0">Esente IVA</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="gap-2">
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
