import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEventSchema, type Location as LocationType, type EventFormat, type InsertEvent, type SiaeEventGenre, type SiaeSectorCode } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Clock, Repeat, FileText, Save, CheckCircle2, ArrowLeft, ArrowRight, Ticket, Users, Euro, Plus, Trash2, Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";

// Tipo per i biglietti configurati nel wizard
interface TicketConfig {
  id: string;
  name: string;
  ticketType: 'INT' | 'RID' | 'OMA'; // Intero, Ridotto, Omaggio
  price: string;
  ddp: string;
  sectorCode: string; // opzionale
  isNumbered: boolean;
  quantity: number;
}

// Alias per compatibilità
type SectorConfig = TicketConfig;

// Step base sempre visibili
const BASE_STEPS = [
  { id: 1, title: "Informazioni Base", icon: FileText },
  { id: 2, title: "Date e Orari", icon: Calendar },
  { id: 3, title: "Ricorrenza", icon: Repeat },
];

// Step SIAE (mostrati solo se biglietteria abilitata)
const SIAE_STEPS = [
  { id: 4, title: "Biglietteria SIAE", icon: Ticket },
  { id: 5, title: "Biglietti", icon: Euro },
];

// Step finale
const FINAL_STEP = { id: 6, title: "Riepilogo", icon: CheckCircle2 };

// Funzione per generare steps dinamici
function getSteps(siaeEnabled: boolean) {
  if (siaeEnabled) {
    return [...BASE_STEPS, ...SIAE_STEPS, { ...FINAL_STEP, id: 6 }];
  }
  return [...BASE_STEPS, { ...FINAL_STEP, id: 4 }];
}

// Helper function to generate recurring dates preview
function generateRecurringDatesPreview(
  startDate: Date,
  endDate: Date,
  pattern: 'daily' | 'weekly' | 'monthly',
  interval: number,
  count?: number,
  recurrenceEndDate?: Date
): Date[] {
  const dates: Date[] = [];
  const maxGenerateDate = new Date(startDate);
  maxGenerateDate.setDate(maxGenerateDate.getDate() + 90); // 90 days window
  
  let currentDate = new Date(startDate);
  let occurrenceIndex = 0;
  
  while (occurrenceIndex < 50) { // Max 50 occurrences in preview
    if (count !== undefined && occurrenceIndex >= count) break;
    if (recurrenceEndDate && currentDate > recurrenceEndDate) break;
    if (occurrenceIndex > 0 && currentDate > maxGenerateDate) break;
    
    dates.push(new Date(currentDate));
    occurrenceIndex++;
    
    switch (pattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * interval));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + interval);
        break;
    }
  }
  
  return dates;
}

export default function EventWizard() {
  const [, params] = useRoute("/events/wizard/:id?");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState<string | null>(params?.id || null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewDates, setPreviewDates] = useState<Date[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [previewVersion, setPreviewVersion] = useState<string>('');
  const [userEditedSelection, setUserEditedSelection] = useState(false);
  
  // Image upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // SIAE state
  const [siaeEnabled, setSiaeEnabled] = useState(false);
  const [siaeGenreCode, setSiaeGenreCode] = useState<string>('');
  const [siaeTaxType, setSiaeTaxType] = useState<string>('S');
  const [siaeRequiresNominative, setSiaeRequiresNominative] = useState(true);
  const [siaeMaxTicketsPerUser, setSiaeMaxTicketsPerUser] = useState(10);
  const [siaeSubscriptionsEnabled, setSiaeSubscriptionsEnabled] = useState(false);
  const [siaeSubscriptionTurnType, setSiaeSubscriptionTurnType] = useState<'F' | 'L'>('F');
  const [siaeSubscriptionEventsCount, setSiaeSubscriptionEventsCount] = useState(5);
  const [siaeSubscriptionPrice, setSiaeSubscriptionPrice] = useState('100.00');
  const [siaeSectors, setSiaeSectors] = useState<SectorConfig[]>([]);
  
  // Dynamic steps based on SIAE enabled
  const STEPS = getSteps(siaeEnabled);
  
  // Ref to track current draftId for preventing duplicate creations
  const draftIdRef = useRef<string | null>(params?.id || null);
  const isSavingRef = useRef(false);
  const isPublishingRef = useRef(false);

  const { data: locations } = useQuery<LocationType[]>({
    queryKey: ['/api/locations'],
  });

  const { data: formats } = useQuery<EventFormat[]>({
    queryKey: ['/api/event-formats'],
  });

  // Carica generi SIAE (TAB.1)
  const { data: siaeGenres } = useQuery<SiaeEventGenre[]>({
    queryKey: ['/api/siae/event-genres'],
  });

  // Carica codici settore SIAE (TAB.2)
  const { data: siaeSectorCodes } = useQuery<SiaeSectorCode[]>({
    queryKey: ['/api/siae/sector-codes'],
  });

  // Load existing draft if editing - use direct API call to get full event data
  const { data: existingEvent, isLoading: isLoadingEvent } = useQuery<any>({
    queryKey: ['/api/events', draftId],
    enabled: !!draftId,
  });

  // Load existing SIAE ticketing info if editing (includes ticketed event + sectors)
  const { data: existingSiaeData } = useQuery<any>({
    queryKey: ['/api/siae/events', draftId, 'ticketing'],
    enabled: !!draftId,
  });

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      name: '',
      locationId: '',
      startDatetime: undefined,
      endDatetime: undefined,
      status: 'draft',
      isRecurring: false,
      recurrencePattern: 'none',
      recurrenceInterval: 1,
      formatId: undefined,
      capacity: undefined,
      notes: '',
      companyId: '',
      imageUrl: '',
    },
  });

  // Load existing draft data
  useEffect(() => {
    if (existingEvent) {
      form.reset({
        ...existingEvent,
        startDatetime: existingEvent.startDatetime ? new Date(existingEvent.startDatetime) : undefined,
        endDatetime: existingEvent.endDatetime ? new Date(existingEvent.endDatetime) : undefined,
        recurrenceEndDate: existingEvent.recurrenceEndDate ? new Date(existingEvent.recurrenceEndDate) : undefined,
      });
      
      // Restore selected recurring dates if they exist
      if (existingEvent.selectedRecurringDates && Array.isArray(existingEvent.selectedRecurringDates)) {
        const restoredDates = new Set<string>(existingEvent.selectedRecurringDates as string[]);
        setSelectedDates(restoredDates);
        // Set preview version hash to prevent watcher from overwriting
        setPreviewVersion(JSON.stringify(Array.from(restoredDates).sort()));
        // Mark as user edited to preserve manual selections
        setUserEditedSelection(true);
      }
    }
  }, [existingEvent]);

  // Load existing SIAE data when editing an event with ticketing
  useEffect(() => {
    if (existingSiaeData) {
      // Enable SIAE mode
      setSiaeEnabled(true);
      
      // Set ticketed event properties
      setSiaeGenreCode(existingSiaeData.genreCode || '');
      setSiaeTaxType(existingSiaeData.taxType || 'S');
      setSiaeRequiresNominative(existingSiaeData.requiresNominative ?? true);
      setSiaeMaxTicketsPerUser(existingSiaeData.maxTicketsPerUser || 10);
      
      // Convert sectors to wizard format
      if (existingSiaeData.sectors && Array.isArray(existingSiaeData.sectors)) {
        const convertedSectors: SectorConfig[] = existingSiaeData.sectors.map((sector: any) => {
          // Determine ticket type based on prices
          let ticketType: 'INT' | 'RID' | 'OMA' = 'INT';
          let price = '0';
          
          if (parseFloat(sector.priceRidotto || '0') > 0) {
            ticketType = 'RID';
            price = sector.priceRidotto;
          } else if (parseFloat(sector.priceIntero || '0') > 0) {
            ticketType = 'INT';
            price = sector.priceIntero;
          } else {
            ticketType = 'OMA';
            price = '0';
          }
          
          return {
            id: sector.id,
            name: sector.name || '',
            ticketType,
            price,
            ddp: sector.prevendita || '0',
            sectorCode: sector.sectorCode || 'PU',
            isNumbered: sector.isNumbered ?? false,
            quantity: sector.capacity || 0,
          };
        });
        setSiaeSectors(convertedSectors);
      }
    }
  }, [existingSiaeData]);

  // Auto-save disabled - events are only saved when user clicks "Pubblica Evento"
  // This prevents unwanted draft creation during wizard completion

  // Update preview dates when recurring params change
  useEffect(() => {
    const subscription = form.watch((values) => {
      const { isRecurring, recurrencePattern, recurrenceInterval, recurrenceCount, recurrenceEndDate, startDatetime, endDatetime } = values;
      
      if (isRecurring && recurrencePattern && recurrencePattern !== 'none' && startDatetime && endDatetime) {
        const dates = generateRecurringDatesPreview(
          new Date(startDatetime),
          new Date(endDatetime),
          recurrencePattern as 'daily' | 'weekly' | 'monthly',
          recurrenceInterval || 1,
          recurrenceCount ?? undefined,
          recurrenceEndDate ? new Date(recurrenceEndDate) : undefined
        );
        
        // Generate version hash of new preview dates
        const newVersion = JSON.stringify(dates.map(d => d.toISOString()).sort());
        
        // Always update previewDates if empty (for draft loading) or if version changed
        const shouldUpdate = previewDates.length === 0 || newVersion !== previewVersion;
        
        if (shouldUpdate) {
          setPreviewDates(dates);
          
          // Only update version and selections if version actually changed
          if (newVersion !== previewVersion) {
            setPreviewVersion(newVersion);
            
            // Only auto-select all dates if user hasn't made manual selections
            if (!userEditedSelection) {
              const allDatesSet = new Set(dates.map(d => d.toISOString()));
              setSelectedDates(allDatesSet);
            }
            // If user has edited, preserve their selections where possible
            // (merge: keep existing selections that are still valid)
            else {
              const newDateSet = new Set(dates.map(d => d.toISOString()));
              setSelectedDates(prev => {
                const merged = new Set<string>();
                prev.forEach(dateStr => {
                  // Keep only selections that still exist in new preview
                  if (newDateSet.has(dateStr)) {
                    merged.add(dateStr);
                  }
                });
                return merged;
              });
            }
          }
        }
      } else {
        setPreviewDates([]);
        setSelectedDates(new Set());
        setPreviewVersion('');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, previewVersion, userEditedSelection]);

  const saveDraftMutation = useMutation({
    mutationFn: async (data: Partial<InsertEvent>) => {
      // Use ref to get the most current draftId
      const currentDraftId = draftIdRef.current;
      let response;
      if (currentDraftId) {
        response = await apiRequest('PATCH', `/api/events/${currentDraftId}`, { ...data, status: 'draft' });
      } else {
        response = await apiRequest('POST', '/api/events', { ...data, status: 'draft' });
      }
      return response.json();
    },
    onSuccess: (savedEvent: any) => {
      // Only set new draftId if we didn't have one before
      if (!draftIdRef.current && savedEvent?.id) {
        draftIdRef.current = savedEvent.id;
        setDraftId(savedEvent.id);
        navigate(`/events/wizard/${savedEvent.id}`, { replace: true });
      }
      setLastSaved(new Date());
      isSavingRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
    onError: () => {
      isSavingRef.current = false;
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (data: any) => {
      // Prevent duplicate submissions
      if (isPublishingRef.current) {
        throw new Error('Already publishing');
      }
      isPublishingRef.current = true;
      
      // If editing an existing event, update it
      let response;
      if (draftIdRef.current) {
        response = await apiRequest('PATCH', `/api/events/${draftIdRef.current}`, { ...data, status: 'scheduled' });
      } else {
        // Otherwise create new event directly as scheduled (no draft)
        response = await apiRequest('POST', '/api/events', { ...data, status: 'scheduled' });
      }
      return response.json();
    },
    onSuccess: async (savedEvent: any) => {
      isPublishingRef.current = false;
      // If SIAE is enabled, create or update the SIAE ticketed event and sectors
      if (siaeEnabled && savedEvent?.id) {
        try {
          const siaeEventData = {
            eventId: savedEvent.id,
            companyId: user?.companyId,
            genreCode: siaeGenreCode,
            taxType: siaeTaxType,
            totalCapacity: siaeSectors.reduce((sum, s) => sum + s.quantity, 0),
            requiresNominative: siaeRequiresNominative,
            maxTicketsPerUser: siaeMaxTicketsPerUser,
            ticketingStatus: 'draft',
          };
          
          let siaeEvent;
          
          // Check if SIAE ticketed event already exists (editing mode)
          if (existingSiaeData?.id) {
            // Update existing SIAE ticketed event
            const siaeEventResponse = await apiRequest('PATCH', `/api/siae/ticketed-events/${existingSiaeData.id}`, siaeEventData);
            siaeEvent = await siaeEventResponse.json();
            
            // Use the returned siaeEvent.id for all operations
            const ticketedEventId = siaeEvent?.id || existingSiaeData.id;
            
            // Update existing sectors or create new ones
            if (siaeSectors.length > 0) {
              const selectedGenre = siaeGenres?.find(g => g.code === siaeGenreCode);
              const genreVatRate = selectedGenre?.vatRate || '22';
              
              // Track existing sector IDs from the database (normalize to strings for comparison)
              const existingSectorIds = new Set<string>(
                existingSiaeData.sectors?.map((s: any) => String(s.id)) || []
              );
              
              for (const ticket of siaeSectors) {
                const priceValue = ticket.price || '0';
                const sectorData = {
                  ticketedEventId: ticketedEventId,
                  sectorCode: ticket.sectorCode || 'PU',
                  name: ticket.name,
                  capacity: ticket.quantity,
                  availableSeats: ticket.quantity,
                  isNumbered: ticket.isNumbered,
                  priceIntero: ticket.ticketType === 'INT' ? priceValue : '0',
                  priceRidotto: ticket.ticketType === 'RID' ? priceValue : '0',
                  priceOmaggio: ticket.ticketType === 'OMA' ? '0' : '0',
                  prevendita: ticket.ddp || '0',
                  ivaRate: genreVatRate,
                };
                
                // Normalize ticket.id to string for comparison
                const ticketIdStr = ticket.id ? String(ticket.id) : null;
                
                // Check if this sector already exists in the database
                if (ticketIdStr && existingSectorIds.has(ticketIdStr)) {
                  // Update existing sector
                  await apiRequest('PATCH', `/api/siae/event-sectors/${ticket.id}`, sectorData);
                } else {
                  // Create new sector (ticket.id is either missing or a temp ID)
                  await apiRequest('POST', '/api/siae/event-sectors', sectorData);
                }
              }
              
              // Delete sectors that were removed
              // Only delete sectors that existed in database and are no longer in wizard
              const currentSectorIds = new Set<string>(
                siaeSectors
                  .filter(s => s.id && existingSectorIds.has(String(s.id)))
                  .map(s => String(s.id))
              );
              
              if (existingSiaeData.sectors) {
                for (const existingSector of existingSiaeData.sectors) {
                  if (!currentSectorIds.has(String(existingSector.id))) {
                    await apiRequest('DELETE', `/api/siae/event-sectors/${existingSector.id}`);
                  }
                }
              }
            }
            
            toast({
              title: "Successo",
              description: "Evento con biglietteria SIAE aggiornato con successo",
            });
          } else {
            // Create new SIAE ticketed event
            const siaeEventResponse = await apiRequest('POST', '/api/siae/ticketed-events', siaeEventData);
            siaeEvent = await siaeEventResponse.json();
            
            // Create sectors for the new SIAE event
            if (siaeEvent?.id && siaeSectors.length > 0) {
              const selectedGenre = siaeGenres?.find(g => g.code === siaeGenreCode);
              const genreVatRate = selectedGenre?.vatRate || '22';
              
              for (const ticket of siaeSectors) {
                const priceValue = ticket.price || '0';
                await apiRequest('POST', '/api/siae/event-sectors', {
                  ticketedEventId: siaeEvent.id,
                  sectorCode: ticket.sectorCode || 'PU',
                  name: ticket.name,
                  capacity: ticket.quantity,
                  availableSeats: ticket.quantity,
                  isNumbered: ticket.isNumbered,
                  priceIntero: ticket.ticketType === 'INT' ? priceValue : '0',
                  priceRidotto: ticket.ticketType === 'RID' ? priceValue : '0',
                  priceOmaggio: ticket.ticketType === 'OMA' ? '0' : '0',
                  prevendita: ticket.ddp || '0',
                  ivaRate: genreVatRate,
                });
              }
            }
            
            toast({
              title: "Successo",
              description: "Evento con biglietteria SIAE creato con successo",
            });
          }
        } catch (error) {
          console.error('Error saving SIAE ticketed event:', error);
          toast({
            title: "Attenzione",
            description: "Evento salvato ma errore nella configurazione SIAE. Verifica la biglietteria manualmente.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Successo",
          description: draftIdRef.current ? "Evento aggiornato con successo" : "Evento creato con successo",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/events', draftId, 'ticketing'] });
      navigate('/events');
    },
    onError: () => {
      isPublishingRef.current = false;
      toast({
        title: "Errore",
        description: "Impossibile creare l'evento",
        variant: "destructive",
      });
    },
  });

  const saveDraft = useCallback(() => {
    // Prevent concurrent saves to avoid creating multiple drafts
    if (isSavingRef.current || saveDraftMutation.isPending) {
      return;
    }
    
    isSavingRef.current = true;
    
    const values = form.getValues();
    const payload: any = { ...values };
    
    // Serialize Date objects to ISO strings for backend compatibility
    if (payload.startDatetime instanceof Date && !isNaN(payload.startDatetime.getTime())) {
      payload.startDatetime = payload.startDatetime.toISOString();
    }
    if (payload.endDatetime instanceof Date && !isNaN(payload.endDatetime.getTime())) {
      payload.endDatetime = payload.endDatetime.toISOString();
    }
    if (payload.recurrenceEndDate instanceof Date && !isNaN(payload.recurrenceEndDate.getTime())) {
      payload.recurrenceEndDate = payload.recurrenceEndDate.toISOString();
    }
    
    // Include selected recurring dates if applicable
    if (values.isRecurring && selectedDates.size > 0) {
      payload.selectedRecurringDates = Array.from(selectedDates);
    }
    
    saveDraftMutation.mutate(payload);
  }, [form, selectedDates, saveDraftMutation]);

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      // No longer saving draft on step change - only save when user clicks "Pubblica Evento"
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: InsertEvent) => {
    // Prevent duplicate submissions
    if (isPublishingRef.current || publishMutation.isPending) {
      return;
    }
    
    const payload: any = { ...data };
    
    // Serialize Date objects to ISO strings for backend compatibility
    if (payload.startDatetime instanceof Date && !isNaN(payload.startDatetime.getTime())) {
      payload.startDatetime = payload.startDatetime.toISOString();
    }
    if (payload.endDatetime instanceof Date && !isNaN(payload.endDatetime.getTime())) {
      payload.endDatetime = payload.endDatetime.toISOString();
    }
    if (payload.recurrenceEndDate instanceof Date && !isNaN(payload.recurrenceEndDate.getTime())) {
      payload.recurrenceEndDate = payload.recurrenceEndDate.toISOString();
    }
    
    // Validate recurring events have selected dates
    if (data.isRecurring && data.recurrencePattern && data.recurrencePattern !== 'none') {
      if (selectedDates.size === 0) {
        toast({
          title: "Errore",
          description: "Seleziona almeno una data per creare eventi ricorrenti",
          variant: "destructive",
        });
        return;
      }
      
      // Send selected dates to backend (as ISO strings for proper timezone handling)
      payload.selectedRecurringDates = Array.from(selectedDates); // Keep as ISO strings
    }
    
    publishMutation.mutate(payload);
  };

  const progress = (currentStep / STEPS.length) * 100;

  // Show loading state when editing and data is being fetched
  if (draftId && isLoadingEvent) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 max-w-4xl mx-auto">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Caricamento evento...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {draftId ? 'Modifica Evento' : 'Nuovo Evento'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={saveDraft}
            disabled={saveDraftMutation.isPending}
            data-testid="button-save-draft"
          >
            <Save className="h-4 w-4 mr-2" />
            Salva Bozza
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/events')}
            data-testid="button-cancel-wizard"
          >
            Annulla
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div
                key={step.id}
                className={`flex flex-col items-center gap-1 ${
                  isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                }`}
              >
                <div className={`p-2 rounded-full ${
                  isActive ? 'bg-primary/10' : isCompleted ? 'bg-green-100' : 'bg-muted'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Steps */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Base</CardTitle>
                <CardDescription>Inserisci i dettagli fondamentali dell'evento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Evento</FormLabel>
                      <FormControl>
                        <Input placeholder="es. Matrimonio Rossi-Bianchi" {...field} data-testid="input-event-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger data-testid="select-location">
                            <SelectValue placeholder="Seleziona location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations?.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {location.name}
                              </div>
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
                  name="formatId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formato Evento (opzionale)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)} 
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-format">
                            <SelectValue placeholder="Seleziona formato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nessun formato</SelectItem>
                          {formats?.map((format) => (
                            <SelectItem key={format.id} value={format.id}>
                              <div className="flex items-center gap-2">
                                <Badge style={{ backgroundColor: format.color || '#3b82f6' }}>
                                  {format.name}
                                </Badge>
                              </div>
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
                  name="imageUrl"
                  render={({ field }) => {
                    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
                      if (!allowedTypes.includes(file.type)) {
                        toast({
                          title: "Formato non supportato",
                          description: "Carica un'immagine JPG, PNG o WebP",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      if (file.size > 10 * 1024 * 1024) {
                        toast({
                          title: "File troppo grande",
                          description: "L'immagine deve essere inferiore a 10MB",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      setIsUploadingImage(true);
                      setUploadProgress(0);
                      
                      try {
                        const formData = new FormData();
                        formData.append('image', file);
                        
                        const xhr = new XMLHttpRequest();
                        
                        xhr.upload.addEventListener('progress', (event) => {
                          if (event.lengthComputable) {
                            const percentComplete = Math.round((event.loaded / event.total) * 100);
                            setUploadProgress(percentComplete);
                          }
                        });
                        
                        const uploadPromise = new Promise<string>((resolve, reject) => {
                          xhr.onload = () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                              try {
                                const response = JSON.parse(xhr.responseText);
                                resolve(response.url);
                              } catch {
                                reject(new Error('Risposta non valida dal server'));
                              }
                            } else {
                              reject(new Error('Upload fallito'));
                            }
                          };
                          xhr.onerror = () => reject(new Error('Errore di rete'));
                        });
                        
                        xhr.open('POST', '/api/events/upload-image');
                        xhr.send(formData);
                        
                        const imageUrl = await uploadPromise;
                        field.onChange(imageUrl);
                        
                        toast({
                          title: "Immagine caricata",
                          description: "L'immagine è stata caricata con successo",
                        });
                      } catch (error) {
                        toast({
                          title: "Errore upload",
                          description: error instanceof Error ? error.message : "Impossibile caricare l'immagine",
                          variant: "destructive",
                        });
                      } finally {
                        setIsUploadingImage(false);
                        setUploadProgress(0);
                        if (imageInputRef.current) {
                          imageInputRef.current.value = '';
                        }
                      }
                    };
                    
                    const handleRemoveImage = () => {
                      field.onChange('');
                      if (imageInputRef.current) {
                        imageInputRef.current.value = '';
                      }
                    };
                    
                    return (
                      <FormItem>
                        <FormLabel>Immagine Evento (opzionale)</FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            <input
                              ref={imageInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleFileSelect}
                              className="hidden"
                              data-testid="input-image-file"
                            />
                            
                            {!field.value && !isUploadingImage && (
                              <div
                                onClick={() => imageInputRef.current?.click()}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const file = e.dataTransfer.files?.[0];
                                  if (file && imageInputRef.current) {
                                    const dataTransfer = new DataTransfer();
                                    dataTransfer.items.add(file);
                                    imageInputRef.current.files = dataTransfer.files;
                                    imageInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                                  }
                                }}
                                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover-elevate transition-colors"
                                data-testid="dropzone-image"
                              >
                                <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm font-medium">Clicca o trascina un'immagine</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  JPG, PNG o WebP (max 10MB)
                                </p>
                              </div>
                            )}
                            
                            {isUploadingImage && (
                              <div className="border rounded-lg p-4 space-y-3" data-testid="upload-progress-container">
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                  <span className="text-sm">Caricamento in corso...</span>
                                </div>
                                <Progress value={uploadProgress} className="h-2" data-testid="upload-progress" />
                                <p className="text-xs text-muted-foreground text-right">{uploadProgress}%</p>
                              </div>
                            )}
                            
                            {field.value && !isUploadingImage && (
                              <div className="relative inline-block" data-testid="image-preview-container">
                                <div className="w-32 h-32 rounded-lg border overflow-hidden bg-muted">
                                  <img
                                    key={field.value}
                                    src={field.value}
                                    alt="Anteprima evento"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                    data-testid="image-preview"
                                  />
                                </div>
                                <div className="absolute -top-2 -right-2 flex gap-1">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="secondary"
                                    className="h-7 w-7 rounded-full shadow-md"
                                    onClick={() => imageInputRef.current?.click()}
                                    data-testid="button-replace-image"
                                  >
                                    <Upload className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="destructive"
                                    className="h-7 w-7 rounded-full shadow-md"
                                    onClick={handleRemoveImage}
                                    data-testid="button-remove-image"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Immagine che verrà mostrata nella pagina pubblica dell'evento (formato quadrato 1:1)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* SIAE Ticketing Toggle */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between rounded-lg border p-4 bg-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Ticket className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Label className="font-medium">Abilita Biglietteria SIAE</Label>
                        <p className="text-xs text-muted-foreground">
                          Configura settori, prezzi e biglietti con conformità fiscale SIAE
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={siaeEnabled}
                      onCheckedChange={setSiaeEnabled}
                      data-testid="switch-siae-enabled"
                    />
                  </div>
                  {siaeEnabled && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Verranno aggiunti 2 step per configurare genere evento e settori
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Dates */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Date e Orari</CardTitle>
                <CardDescription>Quando si svolgerà l'evento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="startDatetime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data/Ora Inizio</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().slice(0, 16) : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-start-datetime"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDatetime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data/Ora Fine</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().slice(0, 16) : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-end-datetime"
                        />
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
                      <FormLabel>Capienza Stimata (opzionale)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="es. 100"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-capacity"
                        />
                      </FormControl>
                      <FormDescription>Numero massimo di partecipanti previsti</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Recurrence */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Ricorrenza (Opzionale)</CardTitle>
                <CardDescription>Configura se l'evento si ripete</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-recurring"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Evento ricorrente</FormLabel>
                        <FormDescription>
                          Attiva questa opzione se l'evento si ripete periodicamente
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch('isRecurring') && (
                  <>
                    <FormField
                      control={form.control}
                      name="recurrencePattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequenza</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'none'}>
                            <FormControl>
                              <SelectTrigger data-testid="select-recurrence-pattern">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Giornaliero</SelectItem>
                              <SelectItem value="weekly">Settimanale</SelectItem>
                              <SelectItem value="monthly">Mensile</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recurrenceInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ogni quanti giorni/settimane/mesi</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              value={field.value || 1}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-recurrence-interval"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recurrenceCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numero di occorrenze</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="es. 5"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-recurrence-count"
                            />
                          </FormControl>
                          <FormDescription>
                            Lascia vuoto per specificare una data di fine
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Date Preview and Selection */}
                    {previewDates.length > 0 && (
                      <div className="space-y-3 p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            Anteprima Date Ricorrenti ({previewDates.length})
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const allDatesSet = new Set(previewDates.map(d => d.toISOString()));
                                setSelectedDates(allDatesSet);
                                setUserEditedSelection(true);
                              }}
                              data-testid="button-select-all-dates"
                            >
                              Seleziona tutte
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDates(new Set());
                                setUserEditedSelection(true);
                              }}
                              data-testid="button-deselect-all-dates"
                            >
                              Deseleziona tutte
                            </Button>
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2 bg-background">
                          {previewDates.map((date, index) => {
                            const dateKey = date.toISOString();
                            const isSelected = selectedDates.has(dateKey);
                            return (
                              <div 
                                key={dateKey} 
                                className="flex items-center gap-3 p-2 rounded hover-elevate"
                                data-testid={`date-preview-${index}`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const newSet = new Set(selectedDates);
                                    if (checked) {
                                      newSet.add(dateKey);
                                    } else {
                                      newSet.delete(dateKey);
                                    }
                                    setSelectedDates(newSet);
                                    setUserEditedSelection(true);
                                  }}
                                  data-testid={`checkbox-date-${index}`}
                                />
                                <Label className="flex-1 cursor-pointer text-sm">
                                  {date.toLocaleDateString('it-IT', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Label>
                                <Badge variant="outline" className="text-xs">
                                  #{index + 1}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: SIAE Ticketing (only if SIAE enabled or this step) */}
          {currentStep === 4 && siaeEnabled && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Biglietteria SIAE
                </CardTitle>
                <CardDescription>Configura i parametri fiscali per la biglietteria</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Genere Evento (TAB.1 SIAE)</Label>
                    <Select 
                      value={siaeGenreCode} 
                      onValueChange={(code) => {
                        setSiaeGenreCode(code);
                        // Auto-imposta tipo imposta dal genere selezionato
                        const selectedGenre = siaeGenres?.find(g => g.code === code);
                        if (selectedGenre) {
                          setSiaeTaxType(selectedGenre.taxType || 'S');
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-siae-genre">
                        <SelectValue placeholder="Seleziona genere evento" />
                      </SelectTrigger>
                      <SelectContent>
                        {siaeGenres?.filter(g => g.active).map((genre) => (
                          <SelectItem key={genre.id} value={genre.code}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{genre.code}</span>
                              <span>{genre.name}</span>
                              {genre.vatRate !== null && genre.vatRate !== undefined && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  IVA {Number(genre.vatRate)}%
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Categoria fiscale dell'evento secondo la normativa SIAE
                    </p>
                  </div>

                  {/* Mostra IVA del genere selezionato */}
                  {siaeGenreCode && (
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Aliquota IVA Applicata</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Determinata dal genere evento selezionato
                          </p>
                        </div>
                        <Badge variant="default" className="text-lg px-4 py-1" data-testid="badge-vat-rate">
                          {(() => {
                            const rate = siaeGenres?.find(g => g.code === siaeGenreCode)?.vatRate;
                            return rate !== null && rate !== undefined ? `${Number(rate)}%` : 'N/D';
                          })()}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Tipo Imposta</Label>
                    <Select value={siaeTaxType} onValueChange={setSiaeTaxType}>
                      <SelectTrigger data-testid="select-siae-tax-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S">Spettacolo</SelectItem>
                        <SelectItem value="I">Intrattenimento</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {siaeTaxType === 'S' ? 'IVA detraibile per lo spettatore' : 'IVA non detraibile'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label className="font-medium">Biglietti Nominativi</Label>
                      <p className="text-xs text-muted-foreground">
                        Obbligatorio per eventi &gt;5000 partecipanti
                      </p>
                    </div>
                    <Switch
                      checked={siaeRequiresNominative}
                      onCheckedChange={setSiaeRequiresNominative}
                      data-testid="switch-nominative"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max Biglietti per Utente</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={siaeMaxTicketsPerUser}
                      onChange={(e) => setSiaeMaxTicketsPerUser(parseInt(e.target.value) || 10)}
                      data-testid="input-max-tickets"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label className="font-medium">Abilita Vendita Abbonamenti</Label>
                      <p className="text-xs text-muted-foreground">
                        Consenti la vendita di abbonamenti dalla cassa
                      </p>
                    </div>
                    <Switch
                      checked={siaeSubscriptionsEnabled}
                      onCheckedChange={setSiaeSubscriptionsEnabled}
                      data-testid="switch-subscriptions-enabled"
                    />
                  </div>

                  {siaeSubscriptionsEnabled && (
                    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <p className="text-sm text-muted-foreground">
                        Gli abbonamenti per questo evento saranno vendibili dalla cassa. Configura le opzioni predefinite:
                      </p>
                      
                      <div className="space-y-2">
                        <Label>Tipo Turno</Label>
                        <Select 
                          value={siaeSubscriptionTurnType} 
                          onValueChange={(v) => setSiaeSubscriptionTurnType(v as 'F' | 'L')}
                        >
                          <SelectTrigger data-testid="select-subscription-turn-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="F">Fisso (F)</SelectItem>
                            <SelectItem value="L">Libero (L)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {siaeSubscriptionTurnType === 'F' 
                            ? 'Abbonamento per date specifiche fisse' 
                            : 'Abbonamento valido per qualsiasi data nel periodo'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Numero Eventi Inclusi</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={siaeSubscriptionEventsCount}
                          onChange={(e) => setSiaeSubscriptionEventsCount(parseInt(e.target.value) || 5)}
                          data-testid="input-subscription-events-count"
                        />
                        <p className="text-xs text-muted-foreground">
                          Quantità di eventi a cui l'abbonato può partecipare
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Prezzo Abbonamento (€)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={siaeSubscriptionPrice}
                          onChange={(e) => setSiaeSubscriptionPrice(e.target.value)}
                          data-testid="input-subscription-price"
                        />
                        <p className="text-xs text-muted-foreground">
                          Prezzo predefinito per gli abbonamenti venduti dalla cassa
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Sectors and Prices (only if SIAE enabled) */}
          {currentStep === 5 && siaeEnabled && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Biglietti
                </CardTitle>
                <CardDescription>Configura i biglietti per l'evento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {siaeSectors.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">Nessun biglietto configurato</p>
                    <Button
                      type="button"
                      onClick={() => {
                        const newTicket: TicketConfig = {
                          id: Date.now().toString(),
                          name: '',
                          ticketType: 'INT',
                          price: '20.00',
                          ddp: '2.00',
                          sectorCode: '',
                          isNumbered: false,
                          quantity: 100,
                        };
                        setSiaeSectors([...siaeSectors, newTicket]);
                      }}
                      data-testid="button-add-first-sector"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crea Primo Biglietto
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {siaeSectors.map((ticket, index) => (
                      <Card key={ticket.id} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Biglietto {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSiaeSectors(siaeSectors.filter(s => s.id !== ticket.id));
                            }}
                            data-testid={`button-remove-sector-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        
                        {/* 1. Nome Biglietto */}
                        <div className="space-y-2 mb-4">
                          <Label>Nome Biglietto *</Label>
                          <Input
                            value={ticket.name}
                            onChange={(e) => {
                              const updated = siaeSectors.map(s => 
                                s.id === ticket.id ? { ...s, name: e.target.value } : s
                              );
                              setSiaeSectors(updated);
                            }}
                            placeholder="es. Ingresso Standard, VIP, Early Bird"
                            data-testid={`input-ticket-name-${index}`}
                          />
                        </div>

                        {/* 2. Tipologia */}
                        <div className="space-y-2 mb-4">
                          <Label>Tipologia *</Label>
                          <Select 
                            value={ticket.ticketType} 
                            onValueChange={(value: 'INT' | 'RID' | 'OMA') => {
                              const updated = siaeSectors.map(s => 
                                s.id === ticket.id ? { ...s, ticketType: value } : s
                              );
                              setSiaeSectors(updated);
                            }}
                          >
                            <SelectTrigger data-testid={`select-ticket-type-${index}`}>
                              <SelectValue placeholder="Seleziona tipologia" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INT">Intero</SelectItem>
                              <SelectItem value="RID">Ridotto</SelectItem>
                              <SelectItem value="OMA">Omaggio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 3. Prezzo e DDP */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label>Prezzo € *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={ticket.price}
                              onChange={(e) => {
                                const updated = siaeSectors.map(s => 
                                  s.id === ticket.id ? { ...s, price: e.target.value } : s
                                );
                                setSiaeSectors(updated);
                              }}
                              data-testid={`input-price-${index}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>DDP €</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={ticket.ddp}
                              onChange={(e) => {
                                const updated = siaeSectors.map(s => 
                                  s.id === ticket.id ? { ...s, ddp: e.target.value } : s
                                );
                                setSiaeSectors(updated);
                              }}
                              placeholder="0.00"
                              data-testid={`input-ddp-${index}`}
                            />
                          </div>
                        </div>

                        {/* 4. Quantità */}
                        <div className="space-y-2 mb-4">
                          <Label>Quantità *</Label>
                          <Input
                            type="number"
                            value={ticket.quantity}
                            onChange={(e) => {
                              const updated = siaeSectors.map(s => 
                                s.id === ticket.id ? { ...s, quantity: parseInt(e.target.value) || 0 } : s
                              );
                              setSiaeSectors(updated);
                            }}
                            data-testid={`input-quantity-${index}`}
                          />
                        </div>

                        {/* 5. Opzioni avanzate (opzionali) - con toggle */}
                        <div className="border-t pt-4 mt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Checkbox
                              checked={!!ticket.sectorCode}
                              onCheckedChange={(checked) => {
                                const updated = siaeSectors.map(s => 
                                  s.id === ticket.id ? { ...s, sectorCode: checked ? 'PU' : '' } : s
                                );
                                setSiaeSectors(updated);
                              }}
                              data-testid={`checkbox-show-sector-${index}`}
                            />
                            <Label className="text-sm text-muted-foreground">Mostra opzioni settore</Label>
                          </div>
                          
                          {ticket.sectorCode && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Codice Settore SIAE</Label>
                                <Select 
                                  value={ticket.sectorCode} 
                                  onValueChange={(value) => {
                                    const updated = siaeSectors.map(s => 
                                      s.id === ticket.id ? { ...s, sectorCode: value } : s
                                    );
                                    setSiaeSectors(updated);
                                  }}
                                >
                                  <SelectTrigger data-testid={`select-sector-code-${index}`}>
                                    <SelectValue placeholder="Seleziona" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {siaeSectorCodes?.map((code) => (
                                      <SelectItem key={code.id} value={code.code}>
                                        <span className="font-mono mr-2">{code.code}</span>
                                        {code.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex items-center gap-2 pt-6">
                                <Checkbox
                                  checked={ticket.isNumbered}
                                  onCheckedChange={(checked) => {
                                    const updated = siaeSectors.map(s => 
                                      s.id === ticket.id ? { ...s, isNumbered: !!checked } : s
                                    );
                                    setSiaeSectors(updated);
                                  }}
                                  data-testid={`checkbox-numbered-${index}`}
                                />
                                <Label>Posti numerati</Label>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const newTicket: TicketConfig = {
                          id: Date.now().toString(),
                          name: '',
                          ticketType: 'INT',
                          price: '20.00',
                          ddp: '2.00',
                          sectorCode: '',
                          isNumbered: false,
                          quantity: 100,
                        };
                        setSiaeSectors([...siaeSectors, newTicket]);
                      }}
                      className="w-full"
                      data-testid="button-add-sector"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crea Biglietto
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Final Step: Summary (step 4 without SIAE, step 6 with SIAE) */}
          {currentStep === STEPS[STEPS.length - 1].id && (
            <Card>
              <CardHeader>
                <CardTitle>Riepilogo e Note</CardTitle>
                <CardDescription>Rivedi i dettagli e aggiungi eventuali note</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <div>
                    <span className="font-medium">Nome: </span>
                    <span>{form.watch('name')}</span>
                  </div>
                  <div>
                    <span className="font-medium">Location: </span>
                    <span>{locations?.find(l => l.id === form.watch('locationId'))?.name}</span>
                  </div>
                  <div>
                    <span className="font-medium">Inizio: </span>
                    <span>{form.watch('startDatetime')?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium">Fine: </span>
                    <span>{form.watch('endDatetime')?.toLocaleString()}</span>
                  </div>
                  {form.watch('isRecurring') && (
                    <div>
                      <span className="font-medium">Ricorrenza: </span>
                      <span>{form.watch('recurrencePattern')} x{form.watch('recurrenceCount')}</span>
                    </div>
                  )}
                </div>

                {/* SIAE Summary */}
                {siaeEnabled && (
                  <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <h4 className="font-medium flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      Biglietteria SIAE
                    </h4>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-muted-foreground">Genere: </span>
                        <span>{siaeGenres?.find(g => g.code === siaeGenreCode)?.name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tipo Imposta: </span>
                        <span>{siaeTaxType === 'S' ? 'Spettacolo' : 'Intrattenimento'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Aliquota IVA: </span>
                        <Badge variant="secondary" className="ml-1">
                          {(() => {
                            const rate = siaeGenres?.find(g => g.code === siaeGenreCode)?.vatRate;
                            return rate !== null && rate !== undefined ? `${Number(rate)}%` : 'N/D';
                          })()}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nominativi: </span>
                        <span>{siaeRequiresNominative ? 'Sì' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Biglietti: </span>
                        <span>{siaeSectors.length}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quantità Totale: </span>
                        <span>{siaeSectors.reduce((sum, s) => sum + s.quantity, 0)} biglietti</span>
                      </div>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note Aggiuntive (opzionale)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Inserisci eventuali note..."
                          {...field}
                          value={field.value || ''}
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              data-testid="button-prev-step"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Indietro
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={nextStep}
                data-testid="button-next-step"
              >
                Avanti
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={publishMutation.isPending}
                data-testid="button-publish-event"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Pubblica Evento
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
