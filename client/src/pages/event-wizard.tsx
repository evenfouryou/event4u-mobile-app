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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, Clock, Repeat, FileText, Save, CheckCircle2, ArrowLeft, ArrowRight, Ticket, Users, Euro, Plus, Trash2, Upload, X, ImageIcon, Loader2, ChevronLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { MobileAppLayout, MobileHeader, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import { cn } from "@/lib/utils";

interface TicketConfig {
  id: string;
  name: string;
  ticketType: 'INT' | 'RID' | 'OMA';
  price: string;
  ddp: string;
  sectorCode: string;
  isNumbered: boolean;
  quantity: number;
}

type SectorConfig = TicketConfig;

const BASE_STEPS = [
  { id: 1, title: "Info", icon: FileText, fullTitle: "Informazioni Base" },
  { id: 2, title: "Date", icon: Calendar, fullTitle: "Date e Orari" },
  { id: 3, title: "Ricorrenza", icon: Repeat, fullTitle: "Ricorrenza" },
];

const SIAE_STEPS = [
  { id: 4, title: "SIAE", icon: Ticket, fullTitle: "Biglietteria SIAE" },
  { id: 5, title: "Biglietti", icon: Euro, fullTitle: "Biglietti" },
];

const FINAL_STEP = { id: 6, title: "Riepilogo", icon: CheckCircle2, fullTitle: "Riepilogo" };

function getSteps(siaeEnabled: boolean) {
  if (siaeEnabled) {
    return [...BASE_STEPS, ...SIAE_STEPS, { ...FINAL_STEP, id: 6 }];
  }
  return [...BASE_STEPS, { ...FINAL_STEP, id: 4 }];
}

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
  maxGenerateDate.setDate(maxGenerateDate.getDate() + 90);
  
  let currentDate = new Date(startDate);
  let occurrenceIndex = 0;
  
  while (occurrenceIndex < 50) {
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

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
  }),
};

export default function EventWizard() {
  const [, params] = useRoute("/events/wizard/:id?");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(params?.id || null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewDates, setPreviewDates] = useState<Date[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [previewVersion, setPreviewVersion] = useState<string>('');
  const [userEditedSelection, setUserEditedSelection] = useState(false);
  
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
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
  
  const STEPS = getSteps(siaeEnabled);
  
  const draftIdRef = useRef<string | null>(params?.id || null);
  const isSavingRef = useRef(false);
  const isPublishingRef = useRef(false);

  const { data: locations } = useQuery<LocationType[]>({
    queryKey: ['/api/locations'],
  });

  const { data: formats } = useQuery<EventFormat[]>({
    queryKey: ['/api/event-formats'],
  });

  const { data: siaeGenres } = useQuery<SiaeEventGenre[]>({
    queryKey: ['/api/siae/event-genres'],
  });

  const { data: siaeSectorCodes } = useQuery<SiaeSectorCode[]>({
    queryKey: ['/api/siae/sector-codes'],
  });

  const { data: existingEvent, isLoading: isLoadingEvent } = useQuery<any>({
    queryKey: ['/api/events', draftId],
    enabled: !!draftId,
  });

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

  useEffect(() => {
    if (existingEvent) {
      form.reset({
        ...existingEvent,
        startDatetime: existingEvent.startDatetime ? new Date(existingEvent.startDatetime) : undefined,
        endDatetime: existingEvent.endDatetime ? new Date(existingEvent.endDatetime) : undefined,
        recurrenceEndDate: existingEvent.recurrenceEndDate ? new Date(existingEvent.recurrenceEndDate) : undefined,
      });
      
      if (existingEvent.selectedRecurringDates && Array.isArray(existingEvent.selectedRecurringDates)) {
        const restoredDates = new Set<string>(existingEvent.selectedRecurringDates as string[]);
        setSelectedDates(restoredDates);
        setPreviewVersion(JSON.stringify(Array.from(restoredDates).sort()));
        setUserEditedSelection(true);
      }
    }
  }, [existingEvent]);

  useEffect(() => {
    if (existingSiaeData) {
      setSiaeEnabled(true);
      setSiaeGenreCode(existingSiaeData.genreCode || '');
      setSiaeTaxType(existingSiaeData.taxType || 'S');
      setSiaeRequiresNominative(existingSiaeData.requiresNominative ?? true);
      setSiaeMaxTicketsPerUser(existingSiaeData.maxTicketsPerUser || 10);
      
      if (existingSiaeData.sectors && Array.isArray(existingSiaeData.sectors)) {
        const convertedSectors: SectorConfig[] = existingSiaeData.sectors.map((sector: any) => {
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
        
        const newVersion = JSON.stringify(dates.map(d => d.toISOString()).sort());
        const shouldUpdate = previewDates.length === 0 || newVersion !== previewVersion;
        
        if (shouldUpdate) {
          setPreviewDates(dates);
          
          if (newVersion !== previewVersion) {
            setPreviewVersion(newVersion);
            
            if (!userEditedSelection) {
              const allDatesSet = new Set(dates.map(d => d.toISOString()));
              setSelectedDates(allDatesSet);
            } else {
              const newDateSet = new Set(dates.map(d => d.toISOString()));
              setSelectedDates(prev => {
                const merged = new Set<string>();
                prev.forEach(dateStr => {
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
      if (isPublishingRef.current) {
        throw new Error('Already publishing');
      }
      isPublishingRef.current = true;
      
      let response;
      if (draftIdRef.current) {
        const currentStatus = existingEvent?.status;
        const updateData = { ...data };
        if (!currentStatus || currentStatus === 'draft') {
          updateData.status = 'scheduled';
        }
        response = await apiRequest('PATCH', `/api/events/${draftIdRef.current}`, updateData);
      } else {
        response = await apiRequest('POST', '/api/events', { ...data, status: 'scheduled' });
      }
      return response.json();
    },
    onSuccess: async (savedEvent: any) => {
      isPublishingRef.current = false;
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
          
          if (existingSiaeData?.id) {
            const { companyId, ...patchData } = siaeEventData;
            const siaeEventResponse = await apiRequest('PATCH', `/api/siae/ticketed-events/${existingSiaeData.id}`, patchData);
            siaeEvent = await siaeEventResponse.json();
            
            const ticketedEventId = siaeEvent?.id || existingSiaeData.id;
            
            if (siaeSectors.length > 0) {
              const selectedGenre = siaeGenres?.find(g => g.code === siaeGenreCode);
              const genreVatRate = selectedGenre?.vatRate || '22';
              
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
                
                const ticketIdStr = ticket.id ? String(ticket.id) : null;
                
                if (ticketIdStr && existingSectorIds.has(ticketIdStr)) {
                  await apiRequest('PATCH', `/api/siae/event-sectors/${ticket.id}`, sectorData);
                } else {
                  await apiRequest('POST', '/api/siae/event-sectors', sectorData);
                }
              }
              
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
            const siaeEventResponse = await apiRequest('POST', '/api/siae/ticketed-events', siaeEventData);
            siaeEvent = await siaeEventResponse.json();
            
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
    if (isSavingRef.current || saveDraftMutation.isPending) {
      return;
    }
    
    isSavingRef.current = true;
    
    const values = form.getValues();
    const payload: any = { ...values };
    
    if (payload.startDatetime instanceof Date && !isNaN(payload.startDatetime.getTime())) {
      payload.startDatetime = payload.startDatetime.toISOString();
    }
    if (payload.endDatetime instanceof Date && !isNaN(payload.endDatetime.getTime())) {
      payload.endDatetime = payload.endDatetime.toISOString();
    }
    if (payload.recurrenceEndDate instanceof Date && !isNaN(payload.recurrenceEndDate.getTime())) {
      payload.recurrenceEndDate = payload.recurrenceEndDate.toISOString();
    }
    
    if (values.isRecurring && selectedDates.size > 0) {
      payload.selectedRecurringDates = Array.from(selectedDates);
    }
    
    saveDraftMutation.mutate(payload);
  }, [form, selectedDates, saveDraftMutation]);

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      triggerHaptic('light');
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      triggerHaptic('light');
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: InsertEvent) => {
    if (isPublishingRef.current || publishMutation.isPending) {
      return;
    }
    
    const payload: any = { ...data };
    
    if (payload.startDatetime instanceof Date && !isNaN(payload.startDatetime.getTime())) {
      payload.startDatetime = payload.startDatetime.toISOString();
    }
    if (payload.endDatetime instanceof Date && !isNaN(payload.endDatetime.getTime())) {
      payload.endDatetime = payload.endDatetime.toISOString();
    }
    if (payload.recurrenceEndDate instanceof Date && !isNaN(payload.recurrenceEndDate.getTime())) {
      payload.recurrenceEndDate = payload.recurrenceEndDate.toISOString();
    }
    
    if (data.isRecurring && data.recurrencePattern && data.recurrencePattern !== 'none') {
      if (selectedDates.size === 0) {
        toast({
          title: "Errore",
          description: "Seleziona almeno una data per creare eventi ricorrenti",
          variant: "destructive",
        });
        return;
      }
      
      payload.selectedRecurringDates = Array.from(selectedDates);
    }
    
    triggerHaptic('success');
    publishMutation.mutate(payload);
  };

  const progress = (currentStep / STEPS.length) * 100;
  const currentStepData = STEPS.find(s => s.id === currentStep);

  if (draftId && isLoadingEvent) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader title="Caricamento..." />
        }
      >
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-10 w-10 text-primary" />
          </motion.div>
          <p className="text-muted-foreground">Caricamento evento...</p>
        </div>
      </MobileAppLayout>
    );
  }

  const renderStepContent = () => {
    return (
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={springTransition}
          className="w-full"
        >
          {currentStep === 1 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Nome Evento</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          placeholder="es. Matrimonio Rossi-Bianchi" 
                          {...field} 
                          className="h-14 text-base pl-12 pr-4"
                          data-testid="input-event-name" 
                        />
                      </div>
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
                    <FormLabel className="text-base font-medium">Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger className="h-14 text-base px-4" data-testid="select-location">
                          <SelectValue placeholder="Seleziona location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations?.map((location) => (
                          <SelectItem key={location.id} value={location.id} className="py-3">
                            <div className="flex items-center gap-3">
                              <MapPin className="h-5 w-5 text-muted-foreground" />
                              <span className="text-base">{location.name}</span>
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
                    <FormLabel className="text-base font-medium">Formato Evento (opzionale)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)} 
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger className="h-14 text-base px-4" data-testid="select-format">
                          <SelectValue placeholder="Seleziona formato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none" className="py-3">Nessun formato</SelectItem>
                        {formats?.map((format) => (
                          <SelectItem key={format.id} value={format.id} className="py-3">
                            <div className="flex items-center gap-3">
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
                      triggerHaptic('success');
                      
                      toast({
                        title: "Immagine caricata",
                        description: "L'immagine è stata caricata con successo",
                      });
                    } catch (error) {
                      triggerHaptic('error');
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
                      <FormLabel className="text-base font-medium">Immagine Evento (opzionale)</FormLabel>
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
                            <motion.div
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                triggerHaptic('light');
                                imageInputRef.current?.click();
                              }}
                              className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer active:bg-muted/50 transition-colors"
                              data-testid="dropzone-image"
                            >
                              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                              <p className="text-base font-medium">Tocca per caricare</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                JPG, PNG o WebP (max 10MB)
                              </p>
                            </motion.div>
                          )}
                          
                          {isUploadingImage && (
                            <div className="border rounded-2xl p-6 space-y-4" data-testid="upload-progress-container">
                              <div className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                <span className="text-base">Caricamento...</span>
                              </div>
                              <Progress value={uploadProgress} className="h-2" data-testid="upload-progress" />
                              <p className="text-sm text-muted-foreground text-right">{uploadProgress}%</p>
                            </div>
                          )}
                          
                          {field.value && !isUploadingImage && (
                            <div className="relative" data-testid="image-preview-container">
                              <div className="w-full aspect-video rounded-2xl border overflow-hidden bg-muted">
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
                              <div className="absolute top-3 right-3 flex gap-2">
                                <HapticButton
                                  type="button"
                                  size="icon"
                                  variant="secondary"
                                  className="h-11 w-11 rounded-full shadow-lg"
                                  onClick={() => imageInputRef.current?.click()}
                                  data-testid="button-replace-image"
                                >
                                  <Upload className="h-5 w-5" />
                                </HapticButton>
                                <HapticButton
                                  type="button"
                                  size="icon"
                                  variant="destructive"
                                  className="h-11 w-11 rounded-full shadow-lg"
                                  onClick={handleRemoveImage}
                                  hapticType="medium"
                                  data-testid="button-remove-image"
                                >
                                  <X className="h-5 w-5" />
                                </HapticButton>
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription className="text-sm">
                        Immagine che verrà mostrata nella pagina pubblica
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <motion.div 
                className="pt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-between rounded-2xl border-2 p-5 bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Ticket className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <Label className="text-base font-medium">Biglietteria SIAE</Label>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Configura prezzi e biglietti
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={siaeEnabled}
                    onCheckedChange={(checked) => {
                      triggerHaptic('medium');
                      setSiaeEnabled(checked);
                    }}
                    className="scale-125"
                    data-testid="switch-siae-enabled"
                  />
                </div>
                {siaeEnabled && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-sm text-muted-foreground mt-3 flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Verranno aggiunti 2 step per la configurazione
                  </motion.p>
                )}
              </motion.div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="startDatetime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Data/Ora Inizio</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input
                          type="datetime-local"
                          className="h-14 text-base pl-12 pr-4"
                          value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().slice(0, 16) : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-start-datetime"
                        />
                      </div>
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
                    <FormLabel className="text-base font-medium">Data/Ora Fine</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input
                          type="datetime-local"
                          className="h-14 text-base pl-12 pr-4"
                          value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().slice(0, 16) : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-end-datetime"
                        />
                      </div>
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
                    <FormLabel className="text-base font-medium">Capienza Stimata (opzionale)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input
                          type="number"
                          placeholder="es. 100"
                          className="h-14 text-base pl-12 pr-4"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-capacity"
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-sm">Numero massimo di partecipanti previsti</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-2xl border-2 p-5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-muted">
                          <Repeat className="h-6 w-6" />
                        </div>
                        <div>
                          <FormLabel className="text-base font-medium">Evento ricorrente</FormLabel>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            L'evento si ripete periodicamente
                          </p>
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            triggerHaptic('light');
                            field.onChange(checked);
                          }}
                          className="scale-125"
                          data-testid="checkbox-recurring"
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              <AnimatePresence>
                {form.watch('isRecurring') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={springTransition}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="recurrencePattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Frequenza</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'none'}>
                            <FormControl>
                              <SelectTrigger className="h-14 text-base px-4" data-testid="select-recurrence-pattern">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily" className="py-3 text-base">Giornaliero</SelectItem>
                              <SelectItem value="weekly" className="py-3 text-base">Settimanale</SelectItem>
                              <SelectItem value="monthly" className="py-3 text-base">Mensile</SelectItem>
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
                          <FormLabel className="text-base font-medium">Intervallo</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Repeat className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                              <Input
                                type="number"
                                min="1"
                                className="h-14 text-base pl-12 pr-4"
                                value={field.value || 1}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-recurrence-interval"
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-sm">Ogni quanti giorni/settimane/mesi</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recurrenceCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Numero di occorrenze</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                              <Input
                                type="number"
                                min="1"
                                placeholder="es. 5"
                                className="h-14 text-base pl-12 pr-4"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                data-testid="input-recurrence-count"
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-sm">
                            Lascia vuoto per specificare una data di fine
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {previewDates.length > 0 && (
                      <div className="space-y-4 p-4 bg-muted rounded-2xl">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium">
                            Date Ricorrenti ({previewDates.length})
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10"
                              onClick={() => {
                                triggerHaptic('light');
                                const allDatesSet = new Set(previewDates.map(d => d.toISOString()));
                                setSelectedDates(allDatesSet);
                                setUserEditedSelection(true);
                              }}
                              data-testid="button-select-all-dates"
                            >
                              Tutte
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10"
                              onClick={() => {
                                triggerHaptic('light');
                                setSelectedDates(new Set());
                                setUserEditedSelection(true);
                              }}
                              data-testid="button-deselect-all-dates"
                            >
                              Nessuna
                            </Button>
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {previewDates.map((date, index) => {
                            const dateKey = date.toISOString();
                            const isSelected = selectedDates.has(dateKey);
                            return (
                              <motion.div 
                                key={dateKey} 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className={cn(
                                  "flex items-center gap-4 p-4 rounded-xl bg-background border-2 transition-colors",
                                  isSelected ? "border-primary" : "border-transparent"
                                )}
                                onClick={() => {
                                  triggerHaptic('light');
                                  const newSet = new Set(selectedDates);
                                  if (isSelected) {
                                    newSet.delete(dateKey);
                                  } else {
                                    newSet.add(dateKey);
                                  }
                                  setSelectedDates(newSet);
                                  setUserEditedSelection(true);
                                }}
                                data-testid={`date-preview-${index}`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  className="h-6 w-6"
                                  data-testid={`checkbox-date-${index}`}
                                />
                                <span className="flex-1 text-base">
                                  {date.toLocaleDateString('it-IT', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'long',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                <Badge variant="outline">#{index + 1}</Badge>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {currentStep === 4 && siaeEnabled && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Genere Evento (TAB.1 SIAE)</Label>
                <Select 
                  value={siaeGenreCode} 
                  onValueChange={(code) => {
                    setSiaeGenreCode(code);
                    const selectedGenre = siaeGenres?.find(g => g.code === code);
                    if (selectedGenre) {
                      setSiaeTaxType(selectedGenre.taxType || 'S');
                    }
                  }}
                >
                  <SelectTrigger className="h-14 text-base px-4" data-testid="select-siae-genre">
                    <SelectValue placeholder="Seleziona genere evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {siaeGenres?.filter(g => g.active).map((genre) => (
                      <SelectItem key={genre.id} value={genre.code} className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-base">{genre.code}</span>
                          <span className="text-base">{genre.name}</span>
                          {genre.vatRate !== null && genre.vatRate !== undefined && (
                            <Badge variant="outline">IVA {Number(genre.vatRate)}%</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {siaeGenreCode && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border bg-muted/30 p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Aliquota IVA</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Determinata dal genere selezionato
                      </p>
                    </div>
                    <Badge className="text-xl px-5 py-2" data-testid="badge-vat-rate">
                      {(() => {
                        const rate = siaeGenres?.find(g => g.code === siaeGenreCode)?.vatRate;
                        return rate !== null && rate !== undefined ? `${Number(rate)}%` : 'N/D';
                      })()}
                    </Badge>
                  </div>
                </motion.div>
              )}

              <div className="space-y-3">
                <Label className="text-base font-medium">Tipo Imposta</Label>
                <Select value={siaeTaxType} onValueChange={setSiaeTaxType}>
                  <SelectTrigger className="h-14 text-base px-4" data-testid="select-siae-tax-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S" className="py-3 text-base">Spettacolo</SelectItem>
                    <SelectItem value="I" className="py-3 text-base">Intrattenimento</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {siaeTaxType === 'S' ? 'IVA detraibile per lo spettatore' : 'IVA non detraibile'}
                </p>
              </div>

              <div className="flex items-center justify-between rounded-2xl border-2 p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-muted">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">Biglietti Nominativi</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Obbligatorio per eventi &gt;5000
                    </p>
                  </div>
                </div>
                <Switch
                  checked={siaeRequiresNominative}
                  onCheckedChange={(checked) => {
                    triggerHaptic('light');
                    setSiaeRequiresNominative(checked);
                  }}
                  className="scale-125"
                  data-testid="switch-nominative"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Max Biglietti per Utente</Label>
                <div className="relative">
                  <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    className="h-14 text-base pl-12 pr-4"
                    value={siaeMaxTicketsPerUser}
                    onChange={(e) => setSiaeMaxTicketsPerUser(parseInt(e.target.value) || 10)}
                    data-testid="input-max-tickets"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border-2 p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-muted">
                    <Ticket className="h-6 w-6" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">Vendita Abbonamenti</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Dalla cassa
                    </p>
                  </div>
                </div>
                <Switch
                  checked={siaeSubscriptionsEnabled}
                  onCheckedChange={(checked) => {
                    triggerHaptic('light');
                    setSiaeSubscriptionsEnabled(checked);
                  }}
                  className="scale-125"
                  data-testid="switch-subscriptions-enabled"
                />
              </div>

              <AnimatePresence>
                {siaeSubscriptionsEnabled && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={springTransition}
                    className="space-y-5 rounded-2xl border bg-muted/30 p-5"
                  >
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Tipo Turno</Label>
                      <Select 
                        value={siaeSubscriptionTurnType} 
                        onValueChange={(v) => setSiaeSubscriptionTurnType(v as 'F' | 'L')}
                      >
                        <SelectTrigger className="h-14 text-base px-4" data-testid="select-subscription-turn-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="F" className="py-3 text-base">Fisso (F)</SelectItem>
                          <SelectItem value="L" className="py-3 text-base">Libero (L)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-medium">Numero Eventi Inclusi</Label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          className="h-14 text-base pl-12 pr-4"
                          value={siaeSubscriptionEventsCount}
                          onChange={(e) => setSiaeSubscriptionEventsCount(parseInt(e.target.value) || 5)}
                          data-testid="input-subscription-events-count"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-medium">Prezzo Abbonamento (€)</Label>
                      <div className="relative">
                        <Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="h-14 text-base pl-12 pr-4"
                          value={siaeSubscriptionPrice}
                          onChange={(e) => setSiaeSubscriptionPrice(e.target.value)}
                          data-testid="input-subscription-price"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {currentStep === 5 && siaeEnabled && (
            <div className="space-y-6">
              {siaeSectors.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 border-2 border-dashed rounded-2xl"
                >
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground mb-6">Nessun biglietto configurato</p>
                  <HapticButton
                    type="button"
                    size="lg"
                    className="h-14 px-8 text-base"
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
                    <Plus className="h-5 w-5 mr-2" />
                    Crea Primo Biglietto
                  </HapticButton>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {siaeSectors.map((ticket, index) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="p-5">
                        <div className="flex items-center justify-between mb-5">
                          <h4 className="text-lg font-semibold">Biglietto {index + 1}</h4>
                          <HapticButton
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11"
                            hapticType="medium"
                            onClick={() => {
                              setSiaeSectors(siaeSectors.filter(s => s.id !== ticket.id));
                            }}
                            data-testid={`button-remove-sector-${index}`}
                          >
                            <Trash2 className="h-5 w-5 text-destructive" />
                          </HapticButton>
                        </div>
                        
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <Label className="text-base">Nome Biglietto *</Label>
                            <div className="relative">
                              <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                              <Input
                                value={ticket.name}
                                className="h-14 text-base pl-12 pr-4"
                                onChange={(e) => {
                                  const updated = siaeSectors.map(s => 
                                    s.id === ticket.id ? { ...s, name: e.target.value } : s
                                  );
                                  setSiaeSectors(updated);
                                }}
                                placeholder="es. Ingresso Standard, VIP"
                                data-testid={`input-ticket-name-${index}`}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-base">Tipologia *</Label>
                            <Select 
                              value={ticket.ticketType} 
                              onValueChange={(value: 'INT' | 'RID' | 'OMA') => {
                                const updated = siaeSectors.map(s => 
                                  s.id === ticket.id ? { ...s, ticketType: value } : s
                                );
                                setSiaeSectors(updated);
                              }}
                            >
                              <SelectTrigger className="h-14 text-base px-4" data-testid={`select-ticket-type-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INT" className="py-3 text-base">Intero</SelectItem>
                                <SelectItem value="RID" className="py-3 text-base">Ridotto</SelectItem>
                                <SelectItem value="OMA" className="py-3 text-base">Omaggio</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-base">Prezzo € *</Label>
                              <div className="relative">
                                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-14 text-base pl-12 pr-4"
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
                            </div>
                            <div className="space-y-2">
                              <Label className="text-base">DDP €</Label>
                              <div className="relative">
                                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-14 text-base pl-12 pr-4"
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
                          </div>

                          <div className="space-y-2">
                            <Label className="text-base">Quantità *</Label>
                            <div className="relative">
                              <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                              <Input
                                type="number"
                                className="h-14 text-base pl-12 pr-4"
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
                          </div>

                          <div className="border-t pt-4">
                            <div 
                              className="flex items-center gap-3 min-h-[44px]"
                              onClick={() => {
                                triggerHaptic('light');
                                const updated = siaeSectors.map(s => 
                                  s.id === ticket.id ? { ...s, sectorCode: s.sectorCode ? '' : 'PU' } : s
                                );
                                setSiaeSectors(updated);
                              }}
                            >
                              <Checkbox
                                checked={!!ticket.sectorCode}
                                className="h-6 w-6"
                                data-testid={`checkbox-show-sector-${index}`}
                              />
                              <Label className="text-base text-muted-foreground">Opzioni settore avanzate</Label>
                            </div>
                            
                            <AnimatePresence>
                              {ticket.sectorCode && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={springTransition}
                                  className="mt-4 space-y-5"
                                >
                                  <div className="space-y-2">
                                    <Label className="text-base">Codice Settore SIAE</Label>
                                    <Select 
                                      value={ticket.sectorCode} 
                                      onValueChange={(value) => {
                                        const updated = siaeSectors.map(s => 
                                          s.id === ticket.id ? { ...s, sectorCode: value } : s
                                        );
                                        setSiaeSectors(updated);
                                      }}
                                    >
                                      <SelectTrigger className="h-14 text-base px-4" data-testid={`select-sector-code-${index}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {siaeSectorCodes?.map((code) => (
                                          <SelectItem key={code.id} value={code.code} className="py-3">
                                            <span className="font-mono mr-2">{code.code}</span>
                                            {code.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div 
                                    className="flex items-center gap-3 min-h-[44px]"
                                    onClick={() => {
                                      triggerHaptic('light');
                                      const updated = siaeSectors.map(s => 
                                        s.id === ticket.id ? { ...s, isNumbered: !s.isNumbered } : s
                                      );
                                      setSiaeSectors(updated);
                                    }}
                                  >
                                    <Checkbox
                                      checked={ticket.isNumbered}
                                      className="h-6 w-6"
                                      data-testid={`checkbox-numbered-${index}`}
                                    />
                                    <Label className="text-base">Posti numerati</Label>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}

                  <HapticButton
                    type="button"
                    variant="outline"
                    className="w-full h-14 text-base"
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
                    data-testid="button-add-sector"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Aggiungi Biglietto
                  </HapticButton>
                </div>
              )}
            </div>
          )}

          {currentStep === STEPS[STEPS.length - 1].id && (
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 p-5 bg-muted rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base font-medium w-24">Nome:</span>
                  <span className="text-base">{form.watch('name') || '-'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-medium w-24">Location:</span>
                  <span className="text-base">{locations?.find(l => l.id === form.watch('locationId'))?.name || '-'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-medium w-24">Inizio:</span>
                  <span className="text-base">{form.watch('startDatetime')?.toLocaleString('it-IT') || '-'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-medium w-24">Fine:</span>
                  <span className="text-base">{form.watch('endDatetime')?.toLocaleString('it-IT') || '-'}</span>
                </div>
                {form.watch('isRecurring') && (
                  <div className="flex items-center gap-3">
                    <span className="text-base font-medium w-24">Ricorrenza:</span>
                    <span className="text-base">{form.watch('recurrencePattern')} x{form.watch('recurrenceCount')}</span>
                  </div>
                )}
              </motion.div>

              {siaeEnabled && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4 p-5 bg-primary/5 border border-primary/20 rounded-2xl"
                >
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    Biglietteria SIAE
                  </h4>
                  <div className="space-y-3 text-base">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Genere:</span>
                      <span>{siaeGenres?.find(g => g.code === siaeGenreCode)?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo Imposta:</span>
                      <span>{siaeTaxType === 'S' ? 'Spettacolo' : 'Intrattenimento'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Aliquota IVA:</span>
                      <Badge variant="secondary">
                        {(() => {
                          const rate = siaeGenres?.find(g => g.code === siaeGenreCode)?.vatRate;
                          return rate !== null && rate !== undefined ? `${Number(rate)}%` : 'N/D';
                        })()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nominativi:</span>
                      <span>{siaeRequiresNominative ? 'Sì' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Biglietti:</span>
                      <span>{siaeSectors.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantità Totale:</span>
                      <span className="font-semibold">{siaeSectors.reduce((sum, s) => sum + s.quantity, 0)} biglietti</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Note (opzionale)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Inserisci eventuali note..."
                        className="min-h-[120px] text-base p-4"
                        {...field}
                        value={field.value || ''}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title={currentStepData?.fullTitle || 'Nuovo Evento'}
          subtitle={`Step ${currentStep} di ${STEPS.length}`}
          leftAction={
            <HapticButton
              variant="ghost"
              size="icon"
              onClick={() => navigate('/events')}
              data-testid="button-cancel-wizard"
            >
              <ChevronLeft className="h-6 w-6" />
            </HapticButton>
          }
          rightAction={
            <HapticButton
              variant="ghost"
              size="icon"
              onClick={saveDraft}
              disabled={saveDraftMutation.isPending}
              data-testid="button-save-draft"
            >
              <Save className="h-5 w-5" />
            </HapticButton>
          }
        />
      }
      footer={
        <div className="border-t bg-background/95 backdrop-blur-sm p-4">
          <div className="flex gap-3">
            <HapticButton
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 h-14 text-base"
              onClick={prevStep}
              disabled={currentStep === 1}
              data-testid="button-prev-step"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Indietro
            </HapticButton>

            {currentStep < STEPS.length ? (
              <HapticButton
                type="button"
                size="lg"
                className="flex-1 h-14 text-base"
                onClick={nextStep}
                data-testid="button-next-step"
              >
                Avanti
                <ArrowRight className="h-5 w-5 ml-2" />
              </HapticButton>
            ) : (
              <HapticButton
                type="button"
                size="lg"
                className="flex-1 h-14 text-base"
                hapticType="success"
                disabled={publishMutation.isPending}
                onClick={form.handleSubmit(onSubmit)}
                data-testid="button-publish-event"
              >
                {publishMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                )}
                Pubblica
              </HapticButton>
            )}
          </div>
        </div>
      }
      contentClassName="py-4 pb-24"
    >
      <div className="mb-6">
        <div className="flex items-center justify-around mb-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <motion.button
                key={step.id}
                type="button"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05, ...springTransition }}
                className="flex flex-col items-center gap-2 min-w-[56px] min-h-[56px] py-1"
                onClick={() => {
                  if (isCompleted || isActive) {
                    triggerHaptic('light');
                    setDirection(step.id > currentStep ? 1 : -1);
                    setCurrentStep(step.id);
                  }
                }}
                data-testid={`step-indicator-${step.id}`}
              >
                <motion.div 
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm",
                    isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                    isCompleted && "bg-green-600 text-white",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}
                  animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ duration: 0.4, ...springTransition }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </motion.div>
                <span className={cn(
                  "text-xs font-semibold text-center",
                  isActive && "text-primary",
                  isCompleted && "text-green-600",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}>
                  {step.title}
                </span>
              </motion.button>
            );
          })}
        </div>
        <Progress value={progress} className="h-2 rounded-full" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {renderStepContent()}
        </form>
      </Form>
    </MobileAppLayout>
  );
}
