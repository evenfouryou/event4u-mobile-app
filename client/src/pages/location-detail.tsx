import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, Save, MapPin, Globe, Ticket, 
  Map, Plus, Trash2, Edit, Upload, Image,
  Square, Circle, Table2, Users, Star, Loader2
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertLocationSchema, 
  type Location, 
  type InsertLocation,
  type VenueFloorPlan,
  type FloorPlanZone
} from "@shared/schema";
import { useLocation, useRoute } from "wouter";
import { z } from "zod";

const zoneTypeIcons: Record<string, any> = {
  sector: Square,
  table: Table2,
  seat: Users,
  area: Square,
  stage: Star,
  bar: Square,
  entrance: Square,
};

const zoneTypeLabels: Record<string, string> = {
  sector: "Settore",
  table: "Tavolo",
  seat: "Posto",
  area: "Area",
  stage: "Palco",
  bar: "Bar",
  entrance: "Ingresso",
};

export default function LocationDetail() {
  const [, setLocationNav] = useLocation();
  const [, params] = useRoute("/locations/:id");
  const locationId = params?.id;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [floorPlanDialogOpen, setFloorPlanDialogOpen] = useState(false);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<VenueFloorPlan | null>(null);
  const [editingZone, setEditingZone] = useState<FloorPlanZone | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<{x: number, y: number}[]>([]);
  const [isUploadingFloorPlan, setIsUploadingFloorPlan] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const floorPlanFileRef = useRef<HTMLInputElement>(null);

  const { data: location, isLoading } = useQuery<Location>({
    queryKey: ['/api/locations', locationId],
    enabled: !!locationId,
  });

  const { data: floorPlans = [], isLoading: floorPlansLoading } = useQuery<VenueFloorPlan[]>({
    queryKey: ['/api/locations', locationId, 'floor-plans'],
    enabled: !!locationId,
  });

  const { data: floorPlanWithZones } = useQuery<VenueFloorPlan & { zones: FloorPlanZone[] }>({
    queryKey: ['/api/floor-plans', selectedFloorPlan?.id],
    enabled: !!selectedFloorPlan?.id,
  });

  const form = useForm<InsertLocation>({
    resolver: zodResolver(insertLocationSchema),
    values: location ? {
      name: location.name,
      address: location.address || '',
      city: location.city || '',
      capacity: location.capacity || undefined,
      notes: location.notes || '',
      siaeLocationCode: location.siaeLocationCode || '',
      heroImageUrl: location.heroImageUrl || '',
      shortDescription: location.shortDescription || '',
      openingHours: location.openingHours || '',
      isPublic: location.isPublic || false,
      companyId: location.companyId,
    } : undefined,
  });

  const floorPlanForm = useForm({
    defaultValues: {
      name: '',
      description: '',
      imageUrl: '',
      imageWidth: 1920,
      imageHeight: 1080,
      isDefault: false,
    },
  });

  const zoneForm = useForm({
    defaultValues: {
      name: '',
      zoneType: 'sector',
      fillColor: '#3b82f6',
      strokeColor: '#1d4ed8',
      opacity: '0.3',
      capacity: undefined as number | undefined,
      tableNumber: '',
      seatsPerTable: undefined as number | undefined,
      defaultSectorCode: '',
      isSelectable: true,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Location>) => {
      await apiRequest('PATCH', `/api/locations/${locationId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      toast({
        title: "Successo",
        description: "Location aggiornata con successo",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la location",
        variant: "destructive",
      });
    },
  });

  const createFloorPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/locations/${locationId}/floor-plans`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations', locationId, 'floor-plans'] });
      setFloorPlanDialogOpen(false);
      floorPlanForm.reset();
      toast({
        title: "Successo",
        description: "Planimetria creata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile creare la planimetria",
        variant: "destructive",
      });
    },
  });

  const deleteFloorPlanMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/floor-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations', locationId, 'floor-plans'] });
      setSelectedFloorPlan(null);
      toast({
        title: "Successo",
        description: "Planimetria eliminata",
      });
    },
  });

  const createZoneMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/floor-plans/${selectedFloorPlan?.id}/zones`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/floor-plans', selectedFloorPlan?.id] });
      setZoneDialogOpen(false);
      setDrawingPoints([]);
      zoneForm.reset();
      toast({
        title: "Successo",
        description: "Zona creata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile creare la zona",
        variant: "destructive",
      });
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/zones/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/floor-plans', selectedFloorPlan?.id] });
      setZoneDialogOpen(false);
      setEditingZone(null);
      zoneForm.reset();
      toast({
        title: "Successo",
        description: "Zona aggiornata",
      });
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/zones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/floor-plans', selectedFloorPlan?.id] });
      toast({
        title: "Successo",
        description: "Zona eliminata",
      });
    },
  });

  const handleSubmit = (data: InsertLocation) => {
    updateMutation.mutate(data);
  };

  const handleFloorPlanSubmit = (data: any) => {
    createFloorPlanMutation.mutate(data);
  };

  const handleFloorPlanFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFloorPlan(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/floor-plans/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      floorPlanForm.setValue('imageUrl', result.url);
      if (result.width) {
        floorPlanForm.setValue('imageWidth', result.width);
      }
      if (result.height) {
        floorPlanForm.setValue('imageHeight', result.height);
      }

      toast({
        title: "Immagine caricata",
        description: "Planimetria caricata con successo",
      });
    } catch (error) {
      toast({
        title: "Errore upload",
        description: error instanceof Error ? error.message : "Impossibile caricare l'immagine",
        variant: "destructive",
      });
    } finally {
      setIsUploadingFloorPlan(false);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setDrawingPoints(prev => [...prev, { x, y }]);
  };

  const handleZoneSubmit = (data: any) => {
    if (drawingPoints.length < 3 && !editingZone) {
      toast({
        title: "Attenzione",
        description: "Disegna almeno 3 punti per creare una zona",
        variant: "destructive",
      });
      return;
    }

    const zoneData = {
      ...data,
      coordinates: editingZone ? editingZone.coordinates : drawingPoints,
      capacity: data.capacity ? Number(data.capacity) : null,
      seatsPerTable: data.seatsPerTable ? Number(data.seatsPerTable) : null,
    };

    if (editingZone) {
      updateZoneMutation.mutate({ id: editingZone.id, data: zoneData });
    } else {
      createZoneMutation.mutate(zoneData);
    }
  };

  const openZoneEditor = (zone?: FloorPlanZone) => {
    if (zone) {
      setEditingZone(zone);
      zoneForm.reset({
        name: zone.name,
        zoneType: zone.zoneType,
        fillColor: zone.fillColor || '#3b82f6',
        strokeColor: zone.strokeColor || '#1d4ed8',
        opacity: zone.opacity || '0.3',
        capacity: zone.capacity || undefined,
        tableNumber: zone.tableNumber || '',
        seatsPerTable: zone.seatsPerTable || undefined,
        defaultSectorCode: zone.defaultSectorCode || '',
        isSelectable: zone.isSelectable,
      });
    } else {
      setEditingZone(null);
      zoneForm.reset();
    }
    setZoneDialogOpen(true);
  };

  const renderZonePolygon = (zone: FloorPlanZone) => {
    const coords = zone.coordinates as {x: number, y: number}[];
    if (!coords || coords.length < 3) return null;
    
    const points = coords.map(p => `${p.x}%,${p.y}%`).join(' ');
    
    return (
      <svg
        key={zone.id}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <polygon
          points={points.replace(/%/g, '')}
          fill={zone.fillColor || '#3b82f6'}
          stroke={zone.strokeColor || '#1d4ed8'}
          strokeWidth="2"
          opacity={Number(zone.opacity) || 0.3}
          className="cursor-pointer pointer-events-auto hover:opacity-50 transition-opacity"
          onClick={() => openZoneEditor(zone)}
        />
        <text
          x={coords.reduce((sum, p) => sum + p.x, 0) / coords.length}
          y={coords.reduce((sum, p) => sum + p.y, 0) / coords.length}
          fill="white"
          fontSize="12"
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none font-semibold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
        >
          {zone.name}
        </text>
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-8 max-w-5xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="p-3 sm:p-4 md:p-8 max-w-5xl mx-auto">
        <div className="text-center py-8 sm:py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Location non trovata</h2>
          <p className="text-muted-foreground mb-4">La location richiesta non esiste</p>
          <Button onClick={() => setLocationNav('/locations')} data-testid="button-back-to-locations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alle Location
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-5xl mx-auto pb-24 md:pb-8">
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocationNav('/locations')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold" data-testid="text-location-title">
            {location.name}
          </h1>
          <p className="text-muted-foreground text-sm">Configurazione location</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="details" className="gap-2" data-testid="tab-details">
            <MapPin className="h-4 w-4" />
            Dettagli
          </TabsTrigger>
          <TabsTrigger value="floorplan" className="gap-2" data-testid="tab-floorplan">
            <Map className="h-4 w-4" />
            Planimetria
          </TabsTrigger>
        </TabsList>

        {/* TAB DETTAGLI */}
        <TabsContent value="details">
          <div className="glass-card p-4 sm:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Location *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-location-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Città</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="es. Milano, Roma" data-testid="input-location-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capienza (persone)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="es. 500"
                            data-testid="input-location-capacity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indirizzo</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="Via, numero civico" data-testid="input-location-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="siaeLocationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Ticket className="h-4 w-4" />
                          Codice Locale SIAE
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="Codice identificativo SIAE" data-testid="input-siae-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isPublic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Visibile nella Vetrina
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Mostra nella vetrina pubblica
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-public"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ''} 
                          placeholder="Note aggiuntive sulla location"
                          rows={3}
                          data-testid="input-location-notes" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Informazioni Vetrina Pubblica
                  </h3>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="heroImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Immagine di Copertina</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              placeholder="https://esempio.com/immagine.jpg" 
                              data-testid="input-hero-image" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shortDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrizione Breve</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              value={field.value || ''} 
                              placeholder="Una breve descrizione del locale per la vetrina pubblica"
                              rows={3}
                              data-testid="input-short-description" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="openingHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orari di Apertura</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              placeholder="es. Ven-Sab 23:00-05:00"
                              data-testid="input-opening-hours" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocationNav('/locations')}
                    data-testid="button-cancel"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="button-save-location"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </TabsContent>

        {/* TAB PLANIMETRIA */}
        <TabsContent value="floorplan">
          <div className="space-y-6">
            {/* Lista Planimetrie */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    Planimetrie
                  </CardTitle>
                  <CardDescription>
                    Carica e configura le planimetrie della location per la selezione posti
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setFloorPlanDialogOpen(true)}
                  data-testid="button-add-floorplan"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Planimetria
                </Button>
              </CardHeader>
              <CardContent>
                {floorPlansLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : floorPlans.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Image className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-2">Nessuna planimetria configurata</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Carica una planimetria per definire zone e posti selezionabili
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => setFloorPlanDialogOpen(true)}
                      data-testid="button-add-first-floorplan"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Carica Planimetria
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {floorPlans.map((fp) => (
                      <Card 
                        key={fp.id} 
                        className={`cursor-pointer transition-all hover-elevate ${selectedFloorPlan?.id === fp.id ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => setSelectedFloorPlan(fp)}
                        data-testid={`card-floorplan-${fp.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="aspect-video bg-muted rounded-md mb-3 overflow-hidden relative">
                            {fp.imageUrl ? (
                              <img 
                                src={fp.imageUrl} 
                                alt={fp.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Map className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            {fp.isDefault && (
                              <Badge className="absolute top-2 right-2" variant="secondary">
                                Principale
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium truncate">{fp.name}</h4>
                          {fp.description && (
                            <p className="text-sm text-muted-foreground truncate">{fp.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {fp.imageWidth}x{fp.imageHeight}px
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Eliminare questa planimetria?')) {
                                  deleteFloorPlanMutation.mutate(fp.id);
                                }
                              }}
                              data-testid={`button-delete-floorplan-${fp.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Editor Zone */}
            {selectedFloorPlan && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Edit className="h-5 w-5" />
                      Editor Zone - {selectedFloorPlan.name}
                    </CardTitle>
                    <CardDescription>
                      Clicca sulla planimetria per definire i vertici delle zone cliccabili
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {isDrawing ? (
                      <>
                        <Badge variant="secondary">
                          {drawingPoints.length} punti
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsDrawing(false);
                            setDrawingPoints([]);
                          }}
                          data-testid="button-cancel-drawing"
                        >
                          Annulla
                        </Button>
                        <Button
                          size="sm"
                          disabled={drawingPoints.length < 3}
                          onClick={() => openZoneEditor()}
                          data-testid="button-complete-zone"
                        >
                          Completa Zona
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => setIsDrawing(true)}
                        data-testid="button-start-drawing"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nuova Zona
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div 
                    ref={imageRef}
                    className={`relative w-full aspect-video bg-muted rounded-lg overflow-hidden ${isDrawing ? 'cursor-crosshair' : ''}`}
                    onClick={handleImageClick}
                  >
                    {selectedFloorPlan.imageUrl ? (
                      <img 
                        src={selectedFloorPlan.imageUrl} 
                        alt={selectedFloorPlan.name}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Nessuna immagine</p>
                      </div>
                    )}
                    
                    {/* Render zone esistenti */}
                    {floorPlanWithZones?.zones?.map(zone => renderZonePolygon(zone))}
                    
                    {/* Render punti in corso di disegno */}
                    {isDrawing && drawingPoints.map((point, i) => (
                      <div
                        key={i}
                        className="absolute w-3 h-3 bg-primary rounded-full border-2 border-white shadow-lg"
                        style={{
                          left: `${point.x}%`,
                          top: `${point.y}%`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 20,
                        }}
                      />
                    ))}
                    
                    {/* Preview poligono in disegno */}
                    {isDrawing && drawingPoints.length >= 2 && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 15 }}>
                        <polyline
                          points={drawingPoints.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Lista Zone */}
                  {floorPlanWithZones?.zones && floorPlanWithZones.zones.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-3">Zone Configurate</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {floorPlanWithZones.zones.map((zone) => {
                          const Icon = zoneTypeIcons[zone.zoneType] || Square;
                          return (
                            <div 
                              key={zone.id}
                              className="flex items-center gap-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                              onClick={() => openZoneEditor(zone)}
                              data-testid={`zone-item-${zone.id}`}
                            >
                              <div 
                                className="w-8 h-8 rounded flex items-center justify-center"
                                style={{ backgroundColor: zone.fillColor || '#3b82f6' }}
                              >
                                <Icon className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{zone.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {zoneTypeLabels[zone.zoneType] || zone.zoneType}
                                  {zone.capacity && ` • ${zone.capacity} posti`}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Eliminare questa zona?')) {
                                    deleteZoneMutation.mutate(zone.id);
                                  }
                                }}
                                data-testid={`button-delete-zone-${zone.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Nuova Planimetria */}
      <Dialog open={floorPlanDialogOpen} onOpenChange={setFloorPlanDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuova Planimetria</DialogTitle>
          </DialogHeader>
          <Form {...floorPlanForm}>
            <form onSubmit={floorPlanForm.handleSubmit(handleFloorPlanSubmit)} className="space-y-4">
              <FormField
                control={floorPlanForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="es. Piano Terra, Sala Principale" data-testid="input-floorplan-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={floorPlanForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Immagine Planimetria *</FormLabel>
                    <div className="space-y-3">
                      <input
                        ref={floorPlanFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFloorPlanFileChange}
                        className="hidden"
                        data-testid="input-floorplan-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => floorPlanFileRef.current?.click()}
                        disabled={isUploadingFloorPlan}
                        className="w-full"
                        data-testid="button-upload-floorplan"
                      >
                        {isUploadingFloorPlan ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Caricamento...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Carica Immagine
                          </>
                        )}
                      </Button>
                      {field.value && (
                        <div className="relative rounded-lg overflow-hidden border">
                          <img 
                            src={field.value} 
                            alt="Anteprima planimetria" 
                            className="w-full h-40 object-contain bg-muted"
                          />
                          <Badge className="absolute top-2 right-2 bg-green-500/80">
                            Caricata
                          </Badge>
                        </div>
                      )}
                      <FormControl>
                        <Input {...field} type="hidden" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={floorPlanForm.control}
                  name="imageWidth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Larghezza (px)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-floorplan-width" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={floorPlanForm.control}
                  name="imageHeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altezza (px)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-floorplan-height" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={floorPlanForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descrizione opzionale" rows={2} data-testid="input-floorplan-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={floorPlanForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-floorplan-default" />
                    </FormControl>
                    <FormLabel className="!mt-0">Planimetria principale</FormLabel>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFloorPlanDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={createFloorPlanMutation.isPending} data-testid="button-save-floorplan">
                  {createFloorPlanMutation.isPending ? 'Salvataggio...' : 'Crea Planimetria'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog Zona */}
      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Modifica Zona' : 'Nuova Zona'}</DialogTitle>
          </DialogHeader>
          <Form {...zoneForm}>
            <form onSubmit={zoneForm.handleSubmit(handleZoneSubmit)} className="space-y-4">
              <FormField
                control={zoneForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Zona *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="es. Settore A, Tavolo VIP 1" data-testid="input-zone-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={zoneForm.control}
                name="zoneType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Zona</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-zone-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sector">Settore</SelectItem>
                        <SelectItem value="table">Tavolo</SelectItem>
                        <SelectItem value="seat">Posto</SelectItem>
                        <SelectItem value="area">Area Generica</SelectItem>
                        <SelectItem value="stage">Palco</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="entrance">Ingresso</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={zoneForm.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capienza</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="number"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="Numero posti"
                          data-testid="input-zone-capacity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={zoneForm.control}
                  name="defaultSectorCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice Settore SIAE</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="es. 01, 02" maxLength={2} data-testid="input-zone-sector-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {zoneForm.watch('zoneType') === 'table' && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={zoneForm.control}
                    name="tableNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numero Tavolo</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="es. T1, VIP1" data-testid="input-table-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={zoneForm.control}
                    name="seatsPerTable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Posti per Tavolo</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="number"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            data-testid="input-seats-per-table"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={zoneForm.control}
                  name="fillColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colore</FormLabel>
                      <FormControl>
                        <Input {...field} type="color" className="h-10 px-2" data-testid="input-zone-fill-color" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={zoneForm.control}
                  name="strokeColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bordo</FormLabel>
                      <FormControl>
                        <Input {...field} type="color" className="h-10 px-2" data-testid="input-zone-stroke-color" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={zoneForm.control}
                  name="opacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opacità</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.1" min="0" max="1" data-testid="input-zone-opacity" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={zoneForm.control}
                name="isSelectable"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-zone-selectable" />
                    </FormControl>
                    <FormLabel className="!mt-0">Selezionabile per acquisto biglietti</FormLabel>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setZoneDialogOpen(false);
                  setEditingZone(null);
                  setDrawingPoints([]);
                }}>
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={createZoneMutation.isPending || updateZoneMutation.isPending}
                  data-testid="button-save-zone"
                >
                  {(createZoneMutation.isPending || updateZoneMutation.isPending) ? 'Salvataggio...' : (editingZone ? 'Aggiorna' : 'Crea Zona')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
