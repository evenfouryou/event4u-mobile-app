import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Plus, Calendar as CalendarIcon, MapPin, Users, Eye, Search, Warehouse, Repeat } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEventSchema, type Event, type InsertEvent, type Location, type Station, type EventFormat } from "@shared/schema";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: 'Bozza', variant: 'outline' },
  scheduled: { label: 'Programmato', variant: 'secondary' },
  ongoing: { label: 'In Corso', variant: 'default' },
  closed: { label: 'Chiuso', variant: 'destructive' },
};

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
  const eventDuration = endDate.getTime() - startDate.getTime();
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

export default function Events() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [previewDates, setPreviewDates] = useState<Date[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useAuth();
  
  const canCreateEvents = user?.role === 'super_admin' || user?.role === 'gestore';

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: locations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  const { data: formats, isLoading: formatsLoading } = useQuery<EventFormat[]>({
    queryKey: ['/api/event-formats'],
  });

  const { data: stations } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      name: '',
      locationId: '',
      formatId: undefined,
      startDatetime: new Date(),
      endDatetime: new Date(),
      capacity: undefined,
      status: 'draft',
      notes: '',
      companyId: '',
      isRecurring: false,
      recurrencePattern: 'none',
      recurrenceInterval: 1,
      recurrenceCount: undefined,
      recurrenceEndDate: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEvent) => {
      return await apiRequest('POST', '/api/events', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setDialogOpen(false);
      form.reset({
        name: '',
        locationId: '',
        formatId: undefined,
        startDatetime: new Date(),
        endDatetime: new Date(),
        capacity: undefined,
        status: 'draft',
        notes: '',
        companyId: '',
        isRecurring: false,
        recurrencePattern: 'none',
        recurrenceInterval: 1,
        recurrenceCount: undefined,
        recurrenceEndDate: undefined,
      });
      
      const isRecurring = response?.events && Array.isArray(response.events);
      toast({
        title: "Successo",
        description: isRecurring 
          ? `Serie di ${response.count} eventi creata con successo`
          : "Evento creato con successo",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Impossibile creare l'evento",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertEvent) => {
    createMutation.mutate(data);
  };

  const formatsMap = useMemo(() => {
    if (!formats) return new Map<string, EventFormat>();
    return new Map(formats.map(f => [f.id, f]));
  }, [formats]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    
    return events.filter((event) => {
      const matchesSearch = searchQuery === "" || 
        event.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || event.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  // Update preview dates when recurring params change
  useEffect(() => {
    const isRecurring = form.watch('isRecurring');
    const pattern = form.watch('recurrencePattern');
    const interval = form.watch('recurrenceInterval');
    const count = form.watch('recurrenceCount');
    const endDate = form.watch('recurrenceEndDate');
    const startDatetime = form.watch('startDatetime');
    const endDatetime = form.watch('endDatetime');
    
    if (isRecurring && pattern && pattern !== 'none' && startDatetime && endDatetime) {
      const dates = generateRecurringDatesPreview(
        new Date(startDatetime),
        new Date(endDatetime),
        pattern as 'daily' | 'weekly' | 'monthly',
        interval || 1,
        count,
        endDate ? new Date(endDate) : undefined
      );
      setPreviewDates(dates);
      
      // Initialize all dates as selected
      const allDatesSet = new Set(dates.map(d => d.toISOString()));
      setSelectedDates(allDatesSet);
    } else {
      setPreviewDates([]);
      setSelectedDates(new Set());
    }
  }, [
    form.watch('isRecurring'),
    form.watch('recurrencePattern'),
    form.watch('recurrenceInterval'),
    form.watch('recurrenceCount'),
    form.watch('recurrenceEndDate'),
    form.watch('startDatetime'),
    form.watch('endDatetime'),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Gestione Eventi</h1>
          <p className="text-muted-foreground">
            {canCreateEvents ? 'Crea e organizza i tuoi eventi' : 'Visualizza gli eventi'}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!canCreateEvents && open) {
            toast({
              title: "Accesso limitato",
              description: "Solo gli admin possono creare eventi",
              variant: "destructive",
            });
            return;
          }
          setDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-create-event"
              disabled={!canCreateEvents}
              title={!canCreateEvents ? "Solo gli admin possono creare eventi" : ""}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuovo Evento</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Evento</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-event-name" />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-event-location">
                            <SelectValue placeholder="Seleziona location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locationsLoading ? (
                            <SelectItem value="loading" disabled>Caricamento...</SelectItem>
                          ) : locations && locations.length > 0 ? (
                            locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>Nessuna location disponibile</SelectItem>
                          )}
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
                      <FormLabel>Format Evento (opzionale)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                        value={field.value ?? "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-event-format">
                            <SelectValue placeholder="Seleziona format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nessun format</SelectItem>
                          {formatsLoading ? (
                            <SelectItem value="loading" disabled>Caricamento...</SelectItem>
                          ) : formats && formats.length > 0 ? (
                            formats.map((format) => (
                              <SelectItem key={format.id} value={format.id}>
                                {format.name}
                              </SelectItem>
                            ))
                          ) : null}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDatetime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data/Ora Inizio</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="datetime-local"
                            value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-event-start"
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
                            {...field}
                            type="datetime-local"
                            value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-event-end"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capienza Stimata (opzionale)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-event-capacity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ''} placeholder="Tipo evento, DJ, ecc." data-testid="input-event-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Recurring Events Section */}
                <div className="border-t pt-4">
                  <FormField
                    control={form.control}
                    name="isRecurring"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-recurring"
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer font-normal flex items-center gap-2">
                          <Repeat className="h-4 w-4" />
                          Evento Ricorrente
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {form.watch('isRecurring') && (
                    <div className="mt-4 space-y-4 p-4 bg-muted/50 rounded-lg">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="recurrencePattern"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Frequenza</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || 'none'}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-recurrence-pattern">
                                    <SelectValue placeholder="Seleziona frequenza" />
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
                              <FormLabel>Ogni</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min={1}
                                  value={field.value || 1}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  data-testid="input-recurrence-interval"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="recurrenceEndDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Termina il (opzionale)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="date"
                                value={field.value instanceof Date ? field.value.toISOString().slice(0, 10) : field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                data-testid="input-recurrence-end-date"
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
                            <FormLabel>Oppure numero occorrenze (opzionale)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min={1}
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                data-testid="input-recurrence-count"
                                placeholder="Es. 10 occorrenze"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Preview Dates Section */}
                      {previewDates.length > 0 && (
                        <div className="border-t pt-4 mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm font-medium">
                              Anteprima Date Generate ({selectedDates.size}/{previewDates.length} selezionate)
                            </Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const allDates = new Set(previewDates.map(d => d.toISOString()));
                                  setSelectedDates(allDates);
                                }}
                                data-testid="button-select-all-dates"
                              >
                                Seleziona tutte
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedDates(new Set())}
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
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel-event"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-event"
                  >
                    Crea Evento
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca eventi per nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-events"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-status">
            <SelectValue placeholder="Filtra per stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="draft">Bozza</SelectItem>
            <SelectItem value="scheduled">Programmato</SelectItem>
            <SelectItem value="ongoing">In Corso</SelectItem>
            <SelectItem value="closed">Chiuso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {eventsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : filteredEvents && filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const statusInfo = statusLabels[event.status] || statusLabels.draft;
            const eventStations = stations?.filter(s => s.eventId === event.id) || [];
            const eventFormat = event.formatId ? formatsMap.get(event.formatId) : undefined;
            return (
              <Card key={event.id} className="hover-elevate" data-testid={`event-card-${event.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-lg flex-1">{event.name}</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      {eventFormat && (
                        <Badge 
                          style={{ 
                            backgroundColor: eventFormat.color ?? '#3b82f6',
                            color: '#ffffff'
                          }}
                        >
                          {eventFormat.name}
                        </Badge>
                      )}
                      {event.seriesId && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Repeat className="h-3 w-3" />
                          Ricorrente
                        </Badge>
                      )}
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="font-medium">
                        {new Date(event.startDatetime).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(event.startDatetime).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {' - '}
                        {new Date(event.endDatetime).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {event.capacity && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Capienza: <span className="font-medium text-foreground">{event.capacity}</span>
                      </span>
                    </div>
                  )}

                  {eventStations.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Warehouse className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Postazioni: <span className="font-medium text-foreground">{eventStations.length}</span>
                      </span>
                    </div>
                  )}

                  <Button asChild className="w-full mt-4" variant="outline">
                    <Link href={`/events/${event.id}`} data-testid={`button-view-event-${event.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Dettagli
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Nessun evento creato</p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-event">
              <Plus className="h-4 w-4 mr-2" />
              Crea Primo Evento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
