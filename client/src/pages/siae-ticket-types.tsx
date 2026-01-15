import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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
  ChevronRight,
} from "lucide-react";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";
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
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<SiaeEventSector | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [deletingSector, setDeletingSector] = useState<SiaeEventSector | null>(null);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);

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

  const openMobileEditSheet = (sector: SiaeEventSector) => {
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
    setIsEditSheetOpen(true);
  };

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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto py-6 px-4 space-y-6" data-testid="page-siae-ticket-types">
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
              {t('siae.ticketTypesPage.title')}
            </h1>
            {parentEvent && (
              <p className="text-sm text-muted-foreground">{parentEvent.name}</p>
            )}
          </div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="btn-create-sector">
          <Plus className="h-4 w-4 mr-2" />
          {t('siae.ticketTypesPage.newType')}
        </Button>
      </div>

      {/* Impostazioni Vendita */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-400" />
            {t('siae.ticketTypesPage.saleSettings')}
          </CardTitle>
          <CardDescription>
            {t('siae.ticketTypesPage.saleSettingsDesc')}
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
                  <div className="font-medium">{t('siae.ticketTypesPage.eventVisibility')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('siae.ticketTypesPage.showInPublic')}
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
                  <div className="font-medium">{t('siae.ticketTypesPage.ticketSales')}</div>
                  <div className="text-sm text-muted-foreground">
                    {ticketedEvent?.ticketingStatus === 'active' ? t('siae.ticketTypesPage.ticketingActive') : 
                     ticketedEvent?.ticketingStatus === 'suspended' ? t('siae.ticketTypesPage.ticketingSuspended') :
                     ticketedEvent?.ticketingStatus === 'closed' ? t('siae.ticketTypesPage.ticketingClosed') : t('siae.ticketTypesPage.draft')}
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
                  <SelectItem value="draft">{t('siae.ticketTypesPage.draft')}</SelectItem>
                  <SelectItem value="active">{t('siae.ticketTypesPage.statusActive')}</SelectItem>
                  <SelectItem value="suspended">{t('siae.ticketTypesPage.statusSuspended')}</SelectItem>
                  <SelectItem value="closed">{t('siae.ticketTypesPage.statusClosed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Link pubblico */}
          {parentEvent && (
            <div className="p-4 rounded-lg border border-border bg-background/50">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{t('siae.ticketTypesPage.publicTicketLink')}</span>
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
                    toast({ title: t('siae.ticketTypesPage.linkCopied') });
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
              <Badge className="bg-purple-600"><Eye className="h-3 w-3 mr-1" />{t('siae.ticketTypesPage.publicEvent')}</Badge>
            ) : (
              <Badge variant="outline"><EyeOff className="h-3 w-3 mr-1" />{t('siae.ticketTypesPage.hiddenEvent')}</Badge>
            )}
            {ticketedEvent?.ticketingStatus === 'active' ? (
              <Badge className="bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />{t('siae.ticketTypesPage.saleActive')}</Badge>
            ) : ticketedEvent?.ticketingStatus === 'suspended' ? (
              <Badge className="bg-amber-600"><AlertCircle className="h-3 w-3 mr-1" />{t('siae.ticketTypesPage.saleSuspended')}</Badge>
            ) : ticketedEvent?.ticketingStatus === 'closed' ? (
              <Badge className="bg-rose-600"><XCircle className="h-3 w-3 mr-1" />{t('siae.ticketTypesPage.saleClosed')}</Badge>
            ) : (
              <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t('siae.ticketTypesPage.draft')}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            {t('siae.ticketTypesPage.typesList')} ({sectors.length})
          </CardTitle>
          <CardDescription>
            {t('siae.ticketTypesPage.typesListDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sectors.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">{t('siae.ticketTypesPage.noTypes')}</p>
              <Button 
                className="mt-4" 
                onClick={() => setIsCreateDialogOpen(true)}
                data-testid="btn-create-sector-empty"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('siae.ticketTypesPage.createFirstType')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('siae.ticketTypesPage.code')}</TableHead>
                    <TableHead>{t('siae.ticketTypesPage.prices')}</TableHead>
                    <TableHead>{t('siae.ticketTypesPage.capacity')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('siae.ticketTypesPage.availability')}</TableHead>
                    <TableHead>{t('siae.ticketTypesPage.active')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
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
                            <div>{t('siae.ticketTypesPage.fullPrice')}: €{Number(sector.priceIntero).toFixed(2)}</div>
                            {sector.priceRidotto && (
                              <div className="text-muted-foreground">{t('siae.ticketTypesPage.reducedPrice')}: €{Number(sector.priceRidotto).toFixed(2)}</div>
                            )}
                            {sector.prevendita && Number(sector.prevendita) > 0 && (
                              <div className="text-muted-foreground">{t('siae.ticketTypesPage.presale')}: €{Number(sector.prevendita).toFixed(2)}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-bold text-blue-400">{soldCount}</span>
                            <span className="text-muted-foreground"> / {sector.capacity}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sector.availableSeats} {t('siae.ticketTypesPage.available')}
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
                            <span className="text-xs text-muted-foreground">{t('siae.ticketTypesPage.always')}</span>
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
            <DialogTitle>{t('siae.ticketTypesPage.newTicketType')}</DialogTitle>
            <DialogDescription>
              {t('siae.ticketTypesPage.createTypeDesc')}
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <SectorFormFields form={createForm} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="btn-cancel-create">
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="btn-submit-create">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('siae.ticketTypesPage.createType')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSector} onOpenChange={(open) => !open && setEditingSector(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('siae.ticketTypesPage.editTicketType')}</DialogTitle>
            <DialogDescription>
              {t('siae.ticketTypesPage.editTypeDesc', { name: editingSector?.name })}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <SectorFormFields form={editForm} isEdit={true} hasSoldTickets={!canEditPrices(editingSector || {} as SiaeEventSector)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingSector(null)} data-testid="btn-cancel-edit">
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="btn-submit-edit">
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('common.saveChanges')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSector} onOpenChange={(open) => !open && setDeletingSector(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('siae.ticketTypesPage.deleteTicketType')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('siae.ticketTypesPage.deleteTypeConfirm', { name: deletingSector?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSector && deleteMutation.mutate(deletingSector.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="btn-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    );
  }

  // Mobile version
  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title="Tipologie Biglietti"
          subtitle={parentEvent?.name}
          leftAction={
            <Link href={`/event-hub/${ticketedEvent?.eventId}`}>
              <HapticButton variant="ghost" size="icon" data-testid="btn-back-mobile">
                <ArrowLeft className="h-5 w-5" />
              </HapticButton>
            </Link>
          }
          rightAction={
            <HapticButton 
              size="icon" 
              onClick={() => {
                triggerHaptic('light');
                setIsCreateSheetOpen(true);
              }}
              data-testid="btn-create-sector-mobile"
            >
              <Plus className="h-5 w-5" />
            </HapticButton>
          }
        />
      }
    >
      <div className="p-4 space-y-4" data-testid="page-siae-ticket-types-mobile">
        {/* Event Settings Card */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings className="h-4 w-4 text-amber-400" />
            Impostazioni Vendita
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {parentEvent?.isPublic ? (
                  <Eye className="h-4 w-4 text-purple-400" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">Visibilità Evento</span>
              </div>
              <Switch
                checked={parentEvent?.isPublic ?? false}
                onCheckedChange={(checked) => {
                  triggerHaptic('light');
                  toggleEventVisibilityMutation.mutate(checked);
                }}
                disabled={toggleEventVisibilityMutation.isPending || !ticketedEvent?.eventId}
                data-testid="toggle-event-visibility-mobile"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-emerald-400" />
                <span className="text-sm">Vendita Biglietti</span>
              </div>
              <Select
                value={ticketedEvent?.ticketingStatus ?? 'draft'}
                onValueChange={(value) => {
                  triggerHaptic('light');
                  updateTicketingStatusMutation.mutate(value);
                }}
                disabled={updateTicketingStatusMutation.isPending || !eventId}
              >
                <SelectTrigger className="w-[120px] h-8" data-testid="select-ticketing-status-mobile">
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
          
          {parentEvent && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              <span className="font-mono text-xs flex-1 truncate">
                {`${window.location.origin}/e/${parentEvent.id.slice(0, 8)}`}
              </span>
              <HapticButton 
                variant="ghost" 
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  triggerHaptic('success');
                  navigator.clipboard.writeText(`${window.location.origin}/e/${parentEvent.id.slice(0, 8)}`);
                  toast({ title: "Link copiato!" });
                }}
                data-testid="btn-copy-event-link-mobile"
              >
                <Copy className="h-3.5 w-3.5" />
              </HapticButton>
            </div>
          )}
          
          <div className="flex flex-wrap gap-1.5">
            {parentEvent?.isPublic ? (
              <Badge className="bg-purple-600 text-xs"><Eye className="h-3 w-3 mr-1" />Pubblico</Badge>
            ) : (
              <Badge variant="outline" className="text-xs"><EyeOff className="h-3 w-3 mr-1" />Nascosto</Badge>
            )}
            {ticketedEvent?.ticketingStatus === 'active' ? (
              <Badge className="bg-emerald-600 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Attiva</Badge>
            ) : ticketedEvent?.ticketingStatus === 'suspended' ? (
              <Badge className="bg-amber-600 text-xs"><AlertCircle className="h-3 w-3 mr-1" />Sospesa</Badge>
            ) : ticketedEvent?.ticketingStatus === 'closed' ? (
              <Badge className="bg-rose-600 text-xs"><XCircle className="h-3 w-3 mr-1" />Chiusa</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Bozza</Badge>
            )}
          </div>
        </div>

        {/* Sectors List */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium px-1">
            <Users className="h-4 w-4 text-blue-400" />
            Tipologie ({sectors.length})
          </div>
          
          {sectors.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border">
              <Ticket className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">Nessuna tipologia configurata</p>
              <HapticButton 
                onClick={() => {
                  triggerHaptic('light');
                  setIsCreateSheetOpen(true);
                }}
                data-testid="btn-create-sector-empty-mobile"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crea tipologia
              </HapticButton>
            </div>
          ) : (
            <div className="space-y-2">
              {sectors.map((sector) => {
                const soldCount = sector.capacity - sector.availableSeats;
                return (
                  <div 
                    key={sector.id}
                    className="rounded-xl border border-border bg-card p-4 active:bg-muted/50 transition-colors"
                    onClick={() => {
                      triggerHaptic('light');
                      openMobileEditSheet(sector);
                    }}
                    data-testid={`card-sector-${sector.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{sector.name}</span>
                          <Badge variant="outline" className="text-xs">{sector.sectorCode}</Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            <span>€{Number(sector.priceIntero).toFixed(2)}</span>
                            {sector.priceRidotto && (
                              <span className="text-xs">/ Rid. €{Number(sector.priceRidotto).toFixed(2)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span className="text-blue-400 font-medium">{soldCount}</span>
                            <span>/ {sector.capacity}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {getStatusBadge(sector)}
                          {!sector.active && (
                            <Badge variant="secondary" className="text-xs">Disattivo</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={sector.active}
                          onCheckedChange={(checked) => {
                            triggerHaptic('light');
                            toggleActiveMutation.mutate({ id: sector.id, active: checked });
                          }}
                          disabled={toggleActiveMutation.isPending}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`toggle-active-mobile-${sector.id}`}
                        />
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Bottom Sheet */}
      <BottomSheet
        open={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        title="Nuova Tipologia"
      >
        <div className="p-4 pb-8 max-h-[70vh] overflow-y-auto">
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => {
              triggerHaptic('success');
              createMutation.mutate(data);
              setIsCreateSheetOpen(false);
              createForm.reset();
            })} className="space-y-4">
              <SectorFormFields form={createForm} />
              <div className="flex gap-3 pt-4">
                <HapticButton 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsCreateSheetOpen(false)}
                  data-testid="btn-cancel-create-mobile"
                >
                  Annulla
                </HapticButton>
                <HapticButton 
                  type="submit" 
                  className="flex-1"
                  disabled={createMutation.isPending}
                  data-testid="btn-submit-create-mobile"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Crea
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>

      {/* Edit Bottom Sheet */}
      <BottomSheet
        open={isEditSheetOpen}
        onClose={() => {
          setIsEditSheetOpen(false);
          setEditingSector(null);
        }}
        title={`Modifica ${editingSector?.name || ''}`}
      >
        <div className="p-4 pb-8 max-h-[70vh] overflow-y-auto">
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => {
              if (editingSector) {
                triggerHaptic('success');
                updateMutation.mutate({ id: editingSector.id, data });
                setIsEditSheetOpen(false);
                setEditingSector(null);
              }
            })} className="space-y-4">
              <SectorFormFields form={editForm} isEdit={true} hasSoldTickets={!canEditPrices(editingSector || {} as SiaeEventSector)} />
              <div className="flex gap-3 pt-4">
                <HapticButton 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setIsEditSheetOpen(false);
                    setEditingSector(null);
                  }}
                  data-testid="btn-cancel-edit-mobile"
                >
                  Annulla
                </HapticButton>
                <HapticButton 
                  type="submit" 
                  className="flex-1"
                  disabled={updateMutation.isPending}
                  data-testid="btn-submit-edit-mobile"
                >
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salva
                </HapticButton>
              </div>
              {editingSector && (editingSector.ticketsSold || 0) === 0 && (
                <HapticButton
                  type="button"
                  variant="destructive"
                  className="w-full mt-2"
                  onClick={() => {
                    triggerHaptic('heavy');
                    setIsDeleteSheetOpen(true);
                  }}
                  data-testid="btn-delete-sector-mobile"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina Tipologia
                </HapticButton>
              )}
            </form>
          </Form>
        </div>
      </BottomSheet>

      {/* Delete Confirmation Sheet */}
      <BottomSheet
        open={isDeleteSheetOpen}
        onClose={() => setIsDeleteSheetOpen(false)}
        title="Conferma Eliminazione"
      >
        <div className="p-4 pb-8 space-y-4">
          <p className="text-sm text-muted-foreground">
            Sei sicuro di voler eliminare la tipologia "{editingSector?.name}"? 
            Questa azione non può essere annullata.
          </p>
          <div className="flex gap-3">
            <HapticButton 
              variant="outline" 
              className="flex-1"
              onClick={() => setIsDeleteSheetOpen(false)}
              data-testid="btn-cancel-delete-mobile"
            >
              Annulla
            </HapticButton>
            <HapticButton
              variant="destructive"
              className="flex-1"
              onClick={() => {
                if (editingSector) {
                  triggerHaptic('error');
                  deleteMutation.mutate(editingSector.id);
                  setIsDeleteSheetOpen(false);
                  setIsEditSheetOpen(false);
                  setEditingSector(null);
                }
              }}
              disabled={deleteMutation.isPending}
              data-testid="btn-confirm-delete-mobile"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Elimina
            </HapticButton>
          </div>
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
