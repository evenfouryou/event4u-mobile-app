import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Ticket,
  Loader2,
  Calendar,
  Euro,
  Users,
  Tag,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  Settings,
  CheckCircle2,
  XCircle,
  Link2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SiaeEventSector, SiaeTicketedEvent, Event } from "@shared/schema";

const sectorFormSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  sectorCode: z.string().min(1, "Codice settore obbligatorio").max(2, "Max 2 caratteri"),
  capacity: z.coerce.number().min(1, "Capienza minima 1"),
  priceIntero: z.coerce.number().min(0, "Prezzo non valido"),
  priceRidotto: z.coerce.number().min(0).optional().nullable(),
  priceOmaggio: z.coerce.number().min(0).optional().nullable(),
  prevendita: z.coerce.number().min(0).optional().nullable(),
  ivaRate: z.coerce.number().min(0).max(100).optional().nullable(),
  statusLabel: z.enum(["available", "sold_out", "coming_soon", "limited", "custom"]),
  customStatusText: z.string().optional().nullable(),
  availabilityStart: z.string().optional().nullable(),
  availabilityEnd: z.string().optional().nullable(),
  sortOrder: z.coerce.number().optional(),
});

type SectorFormData = z.infer<typeof sectorFormSchema>;

const statusLabelOptions = [
  { value: "available", label: "Disponibile", color: "text-emerald-400" },
  { value: "sold_out", label: "Esaurito", color: "text-rose-400" },
  { value: "coming_soon", label: "In arrivo", color: "text-amber-400" },
  { value: "limited", label: "Ultimi posti", color: "text-orange-400" },
  { value: "custom", label: "Personalizzato", color: "text-blue-400" },
];

export default function SiaeTicketTypes() {
  const { eventId } = useParams<{ eventId: string }>();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<SiaeEventSector | null>(null);
  const [deletingSector, setDeletingSector] = useState<SiaeEventSector | null>(null);

  const { data: ticketedEvent, isLoading: isLoadingEvent } = useQuery<SiaeTicketedEvent>({
    queryKey: ["/api/siae/ticketed-events", eventId],
    enabled: !!eventId,
  });

  const { data: parentEvent } = useQuery<Event>({
    queryKey: ["/api/events", ticketedEvent?.eventId],
    enabled: !!ticketedEvent?.eventId,
  });

  const { data: sectors = [], isLoading: isLoadingSectors } = useQuery<SiaeEventSector[]>({
    queryKey: ["/api/siae/ticketed-events", eventId, "sectors"],
    enabled: !!eventId,
  });

  const createForm = useForm<SectorFormData>({
    resolver: zodResolver(sectorFormSchema),
    defaultValues: {
      name: "",
      sectorCode: "",
      capacity: 100,
      priceIntero: 0,
      priceRidotto: null,
      priceOmaggio: 0,
      prevendita: 0,
      ivaRate: 22,
      statusLabel: "available",
      customStatusText: "",
      availabilityStart: "",
      availabilityEnd: "",
      sortOrder: 0,
    },
  });

  const editForm = useForm<SectorFormData>({
    resolver: zodResolver(sectorFormSchema),
    defaultValues: {
      name: "",
      sectorCode: "",
      capacity: 100,
      priceIntero: 0,
      priceRidotto: null,
      priceOmaggio: 0,
      prevendita: 0,
      ivaRate: 22,
      statusLabel: "available",
      customStatusText: "",
      availabilityStart: "",
      availabilityEnd: "",
      sortOrder: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SectorFormData) => {
      const payload = {
        ...data,
        ticketedEventId: eventId,
        availableSeats: data.capacity,
        priceRidotto: data.priceRidotto ?? null,
        priceOmaggio: data.priceOmaggio ?? 0,
        prevendita: data.prevendita ?? 0,
        ivaRate: data.ivaRate ?? 22,
        availabilityStart: data.availabilityStart ? new Date(data.availabilityStart).toISOString() : null,
        availabilityEnd: data.availabilityEnd ? new Date(data.availabilityEnd).toISOString() : null,
        customStatusText: data.statusLabel === "custom" ? data.customStatusText : null,
      };
      return await apiRequest("POST", "/api/siae/event-sectors", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/siae/ticketed-events", eventId, "sectors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/siae/ticketed-events", eventId] });
      toast({ title: "Tipologia biglietto creata con successo" });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SectorFormData> }) => {
      const payload = {
        ...data,
        priceRidotto: data.priceRidotto ?? null,
        priceOmaggio: data.priceOmaggio ?? 0,
        prevendita: data.prevendita ?? 0,
        ivaRate: data.ivaRate ?? 22,
        availabilityStart: data.availabilityStart ? new Date(data.availabilityStart).toISOString() : null,
        availabilityEnd: data.availabilityEnd ? new Date(data.availabilityEnd).toISOString() : null,
        customStatusText: data.statusLabel === "custom" ? data.customStatusText : null,
      };
      return await apiRequest("PATCH", `/api/siae/event-sectors/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/siae/ticketed-events", eventId, "sectors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/siae/ticketed-events", eventId] });
      toast({ title: "Tipologia biglietto aggiornata con successo" });
      setEditingSector(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/siae/event-sectors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/siae/ticketed-events", eventId, "sectors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/siae/ticketed-events", eventId] });
      toast({ title: "Tipologia biglietto eliminata con successo" });
      setDeletingSector(null);
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return await apiRequest("PATCH", `/api/siae/event-sectors/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/siae/ticketed-events", eventId, "sectors"] });
      toast({ title: "Stato aggiornato" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const toggleEventVisibilityMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      if (!ticketedEvent?.eventId) {
        throw new Error("ID evento non disponibile");
      }
      return await apiRequest("PATCH", `/api/events/${ticketedEvent.eventId}`, { isPublic });
    },
    onSuccess: (_, isPublic) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", ticketedEvent?.eventId] });
      toast({ title: isPublic ? "Evento visibile al pubblico" : "Evento nascosto" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateTicketingStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!eventId) {
        throw new Error("ID evento biglietteria non disponibile");
      }
      return await apiRequest("PATCH", `/api/siae/ticketed-events/${eventId}`, { ticketingStatus: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/siae/ticketed-events", eventId] });
      toast({ title: "Stato biglietteria aggiornato" });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const openEditDialog = (sector: SiaeEventSector) => {
    setEditingSector(sector);
    editForm.reset({
      name: sector.name,
      sectorCode: sector.sectorCode,
      capacity: sector.capacity,
      priceIntero: Number(sector.priceIntero),
      priceRidotto: sector.priceRidotto ? Number(sector.priceRidotto) : null,
      priceOmaggio: sector.priceOmaggio ? Number(sector.priceOmaggio) : 0,
      prevendita: sector.prevendita ? Number(sector.prevendita) : 0,
      ivaRate: sector.ivaRate ? Number(sector.ivaRate) : 22,
      statusLabel: (sector.statusLabel as SectorFormData["statusLabel"]) || "available",
      customStatusText: sector.customStatusText || "",
      availabilityStart: sector.availabilityStart ? format(new Date(sector.availabilityStart), "yyyy-MM-dd'T'HH:mm") : "",
      availabilityEnd: sector.availabilityEnd ? format(new Date(sector.availabilityEnd), "yyyy-MM-dd'T'HH:mm") : "",
      sortOrder: sector.sortOrder || 0,
    });
  };

  const onCreateSubmit = (data: SectorFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: SectorFormData) => {
    if (editingSector) {
      updateMutation.mutate({ id: editingSector.id, data });
    }
  };

  const getStatusBadge = (sector: SiaeEventSector) => {
    const option = statusLabelOptions.find(o => o.value === sector.statusLabel);
    const label = sector.statusLabel === "custom" && sector.customStatusText 
      ? sector.customStatusText 
      : option?.label || "Disponibile";
    return (
      <Badge variant="outline" className={option?.color}>
        {label}
      </Badge>
    );
  };

  const canEditPrices = (sector: SiaeEventSector) => {
    return (sector.ticketsSold || 0) === 0;
  };

  if (isLoadingEvent || isLoadingSectors) {
    return (
      <div className="container mx-auto py-6 px-4 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const SectorFormFields = ({ form, isEdit = false, hasSoldTickets = false }: { form: ReturnType<typeof useForm<SectorFormData>>; isEdit?: boolean; hasSoldTickets?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Tipologia</FormLabel>
              <FormControl>
                <Input placeholder="es. Platea, Tribuna, VIP..." {...field} data-testid="input-sector-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sectorCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codice Settore</FormLabel>
              <FormControl>
                <Input placeholder="es. A, B, VIP" maxLength={2} {...field} disabled={isEdit} data-testid="input-sector-code" />
              </FormControl>
              <FormDescription>Codice univoco (max 2 caratteri)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capienza</FormLabel>
              <FormControl>
                <Input type="number" min={1} {...field} data-testid="input-sector-capacity" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ordine di visualizzazione</FormLabel>
              <FormControl>
                <Input type="number" {...field} data-testid="input-sector-sort-order" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Euro className="h-4 w-4" /> Prezzi
          {isEdit && hasSoldTickets && (
            <Badge variant="secondary" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Non modificabili (biglietti venduti)
            </Badge>
          )}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="priceIntero"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intero (€)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} {...field} disabled={isEdit && hasSoldTickets} data-testid="input-price-intero" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priceRidotto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ridotto (€)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} {...field} value={field.value ?? ""} disabled={isEdit && hasSoldTickets} data-testid="input-price-ridotto" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priceOmaggio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Omaggio (€)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} {...field} value={field.value ?? ""} disabled={isEdit && hasSoldTickets} data-testid="input-price-omaggio" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="prevendita"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prevendita (€)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} {...field} value={field.value ?? ""} disabled={isEdit && hasSoldTickets} data-testid="input-prevendita" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="mt-4">
          <FormField
            control={form.control}
            name="ivaRate"
            render={({ field }) => (
              <FormItem className="max-w-[200px]">
                <FormLabel>Aliquota IVA (%)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} max={100} {...field} value={field.value ?? 22} disabled={isEdit && hasSoldTickets} data-testid="input-iva-rate" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4" /> Stato e Disponibilità
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="statusLabel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Etichetta Stato</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status-label">
                      <SelectValue placeholder="Seleziona stato" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusLabelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} data-testid={`status-option-${option.value}`}>
                        <span className={option.color}>{option.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.watch("statusLabel") === "custom" && (
            <FormField
              control={form.control}
              name="customStatusText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Testo Personalizzato</FormLabel>
                  <FormControl>
                    <Input placeholder="es. Prenotazione obbligatoria" {...field} value={field.value ?? ""} data-testid="input-custom-status" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <FormField
            control={form.control}
            name="availabilityStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inizio Disponibilità</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} value={field.value ?? ""} data-testid="input-availability-start" />
                </FormControl>
                <FormDescription>Quando inizia la vendita online</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="availabilityEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fine Disponibilità</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} value={field.value ?? ""} data-testid="input-availability-end" />
                </FormControl>
                <FormDescription>Quando termina la vendita online</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/event-hub/${ticketedEvent?.eventId}`}>
            <Button variant="ghost" size="icon" data-testid="btn-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Ticket className="h-6 w-6 text-cyan-400" />
              Tipologie Biglietti
            </h1>
            {parentEvent && (
              <p className="text-sm text-muted-foreground">{parentEvent.name}</p>
            )}
          </div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="btn-create-sector">
          <Plus className="h-4 w-4 mr-2" />
          Nuova Tipologia
        </Button>
      </div>

      {/* Impostazioni Vendita */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-400" />
            Impostazioni Vendita
          </CardTitle>
          <CardDescription>
            Controlla la visibilità dell'evento e lo stato della biglietteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Event visibility toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  {parentEvent?.isPublic ? (
                    <Eye className="h-5 w-5 text-purple-400" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="font-medium">Visibilità Evento</div>
                  <div className="text-sm text-muted-foreground">
                    Mostra l'evento nella vetrina pubblica
                  </div>
                </div>
              </div>
              <Switch
                checked={parentEvent?.isPublic ?? false}
                onCheckedChange={(checked) => toggleEventVisibilityMutation.mutate(checked)}
                disabled={toggleEventVisibilityMutation.isPending || !ticketedEvent?.eventId}
                data-testid="toggle-event-visibility"
              />
            </div>

            {/* Ticketing status control */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <div className="font-medium">Vendita Biglietti</div>
                  <div className="text-sm text-muted-foreground">
                    {ticketedEvent?.ticketingStatus === 'active' ? 'Biglietteria attiva' : 
                     ticketedEvent?.ticketingStatus === 'suspended' ? 'Biglietteria sospesa' :
                     ticketedEvent?.ticketingStatus === 'closed' ? 'Biglietteria chiusa' : 'Bozza'}
                  </div>
                </div>
              </div>
              <Select
                value={ticketedEvent?.ticketingStatus ?? 'draft'}
                onValueChange={(value) => updateTicketingStatusMutation.mutate(value)}
                disabled={updateTicketingStatusMutation.isPending || !eventId}
              >
                <SelectTrigger className="w-[140px]" data-testid="select-ticketing-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Bozza</SelectItem>
                  <SelectItem value="active">Attiva</SelectItem>
                  <SelectItem value="suspended">Sospesa</SelectItem>
                  <SelectItem value="closed">Chiusa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Link pubblico */}
          {parentEvent && (
            <div className="p-4 rounded-lg border border-border bg-background/50">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Link Pubblico Biglietti</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2 rounded-lg bg-muted/50 font-mono text-xs break-all">
                  {`${window.location.origin}/e/${parentEvent.id.slice(0, 8)}`}
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/e/${parentEvent.id.slice(0, 8)}`);
                    toast({ title: "Link copiato!" });
                  }}
                  data-testid="btn-copy-event-link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => window.open(`/e/${parentEvent.id.slice(0, 8)}`, '_blank')}
                  data-testid="btn-open-event-link"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Status summary badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {parentEvent?.isPublic ? (
              <Badge className="bg-purple-600"><Eye className="h-3 w-3 mr-1" />Evento Pubblico</Badge>
            ) : (
              <Badge variant="outline"><EyeOff className="h-3 w-3 mr-1" />Evento Nascosto</Badge>
            )}
            {ticketedEvent?.ticketingStatus === 'active' ? (
              <Badge className="bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Vendita Attiva</Badge>
            ) : ticketedEvent?.ticketingStatus === 'suspended' ? (
              <Badge className="bg-amber-600"><AlertCircle className="h-3 w-3 mr-1" />Vendita Sospesa</Badge>
            ) : ticketedEvent?.ticketingStatus === 'closed' ? (
              <Badge className="bg-rose-600"><XCircle className="h-3 w-3 mr-1" />Vendita Chiusa</Badge>
            ) : (
              <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Bozza</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            Elenco Tipologie ({sectors.length})
          </CardTitle>
          <CardDescription>
            Gestisci le tipologie di biglietto per questo evento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sectors.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nessuna tipologia biglietto configurata</p>
              <Button 
                className="mt-4" 
                onClick={() => setIsCreateDialogOpen(true)}
                data-testid="btn-create-sector-empty"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crea la prima tipologia
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Codice</TableHead>
                    <TableHead>Prezzi</TableHead>
                    <TableHead>Capienza</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Disponibilità</TableHead>
                    <TableHead>Attivo</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectors.map((sector) => {
                    const soldCount = sector.capacity - sector.availableSeats;
                    return (
                      <TableRow key={sector.id} data-testid={`row-sector-${sector.id}`}>
                        <TableCell className="font-medium">{sector.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sector.sectorCode}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-0.5">
                            <div>Intero: €{Number(sector.priceIntero).toFixed(2)}</div>
                            {sector.priceRidotto && (
                              <div className="text-muted-foreground">Ridotto: €{Number(sector.priceRidotto).toFixed(2)}</div>
                            )}
                            {sector.prevendita && Number(sector.prevendita) > 0 && (
                              <div className="text-muted-foreground">DDP: €{Number(sector.prevendita).toFixed(2)}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-bold text-blue-400">{soldCount}</span>
                            <span className="text-muted-foreground"> / {sector.capacity}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sector.availableSeats} disponibili
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(sector)}</TableCell>
                        <TableCell>
                          {sector.availabilityStart || sector.availabilityEnd ? (
                            <div className="text-xs space-y-0.5">
                              {sector.availabilityStart && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Da: {format(new Date(sector.availabilityStart), "dd/MM/yy HH:mm", { locale: it })}
                                </div>
                              )}
                              {sector.availabilityEnd && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  A: {format(new Date(sector.availabilityEnd), "dd/MM/yy HH:mm", { locale: it })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sempre</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={sector.active}
                            onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: sector.id, active: checked })}
                            disabled={toggleActiveMutation.isPending}
                            data-testid={`toggle-active-${sector.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(sector)}
                              data-testid={`btn-edit-${sector.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingSector(sector)}
                              disabled={(sector.ticketsSold || 0) > 0}
                              data-testid={`btn-delete-${sector.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-rose-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuova Tipologia Biglietto</DialogTitle>
            <DialogDescription>
              Crea una nuova tipologia di biglietto per questo evento
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <SectorFormFields form={createForm} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="btn-cancel-create">
                  Annulla
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="btn-submit-create">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Crea Tipologia
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSector} onOpenChange={(open) => !open && setEditingSector(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Tipologia Biglietto</DialogTitle>
            <DialogDescription>
              Modifica i dettagli della tipologia "{editingSector?.name}"
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <SectorFormFields form={editForm} isEdit={true} hasSoldTickets={!canEditPrices(editingSector || {} as SiaeEventSector)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingSector(null)} data-testid="btn-cancel-edit">
                  Annulla
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="btn-submit-edit">
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salva Modifiche
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSector} onOpenChange={(open) => !open && setDeletingSector(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Tipologia Biglietto</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la tipologia "{deletingSector?.name}"? 
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSector && deleteMutation.mutate(deletingSector.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="btn-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
