import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Edit, Users, Clock, Globe, Ticket } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLocationSchema, type Location, type InsertLocation, type Event } from "@shared/schema";
import { useLocation } from "wouter";
import { Calendar } from "lucide-react";

export default function Locations() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setLocationPath] = useLocation();
  const { toast } = useToast();

  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  // Count events per location (only active/scheduled events)
  const getLocationEventCount = (locationId: string) => {
    if (!events) return { active: 0, total: 0 };
    const locationEvents = events.filter(e => e.locationId === locationId);
    const activeEvents = locationEvents.filter(e => e.status === 'ongoing' || e.status === 'scheduled');
    return { active: activeEvents.length, total: locationEvents.length };
  };

  const form = useForm<InsertLocation>({
    resolver: zodResolver(insertLocationSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      capacity: undefined,
      notes: '',
      siaeLocationCode: '',
      heroImageUrl: '',
      shortDescription: '',
      openingHours: '',
      isPublic: false,
      companyId: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertLocation) => {
      await apiRequest('POST', '/api/locations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Successo",
        description: "Location creata con successo",
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
        description: "Impossibile creare la location",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertLocation) => {
    createMutation.mutate(data);
  };

  const handleEdit = (location: Location) => {
    setLocationPath(`/locations/${location.id}`);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    form.reset();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Gestione Location</h1>
          <p className="text-muted-foreground">
            Configura le sedi dove si svolgono gli eventi
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-location">
              <Plus className="h-4 w-4 mr-2" />
              Nuova Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuova Location</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Location</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-location-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indirizzo</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} data-testid="input-location-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-location-capacity"
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
                        <Textarea
                          {...field}
                          value={field.value || ''}
                          placeholder="Tipo locale, impianti disponibili, ecc."
                          data-testid="input-location-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium mb-4 text-muted-foreground flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Impostazioni SIAE
                  </p>

                  <FormField
                    control={form.control}
                    name="siaeLocationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codice Locale SIAE</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="es. 12345678"
                            data-testid="input-siae-location-code" 
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Codice identificativo del locale rilasciato dalla SIAE
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium mb-4 text-muted-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Impostazioni Vetrina Pubblica
                  </p>

                  <FormField
                    control={form.control}
                    name="isPublic"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3 mb-4">
                        <div>
                          <FormLabel className="font-medium">Mostra nella Vetrina</FormLabel>
                          <p className="text-xs text-muted-foreground">Rendi visibile il locale nella pagina pubblica</p>
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

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDialogClose}
                    data-testid="button-cancel-location"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-location"
                  >
                    Crea
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : locations && locations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <Card key={location.id} data-testid={`location-card-${location.id}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <CardTitle className="text-lg truncate">{location.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {location.isPublic && (
                    <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/30">
                      <Globe className="w-3 h-3 mr-1" />
                      Pubblico
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(location)}
                    data-testid={`button-edit-location-${location.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {location.city && (
                    <Badge variant="secondary" className="mb-2">
                      {location.city}
                    </Badge>
                  )}
                  {location.address && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Indirizzo</p>
                      <p className="text-sm">{location.address}</p>
                    </div>
                  )}
                  {location.capacity && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Capienza: <span className="font-medium">{location.capacity}</span> persone
                      </span>
                    </div>
                  )}
                  {(() => {
                    const eventCounts = getLocationEventCount(location.id);
                    return eventCounts.total > 0 ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <span className="font-medium">{eventCounts.active}</span> eventi attivi
                          {eventCounts.total > eventCounts.active && (
                            <span className="text-muted-foreground"> ({eventCounts.total} totali)</span>
                          )}
                        </span>
                      </div>
                    ) : null;
                  })()}
                  {location.openingHours && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{location.openingHours}</span>
                    </div>
                  )}
                  {location.shortDescription && (
                    <div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{location.shortDescription}</p>
                    </div>
                  )}
                  {location.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Note</p>
                      <p className="text-sm">{location.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Nessuna location configurata</p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-location">
              <Plus className="h-4 w-4 mr-2" />
              Crea Prima Location
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
