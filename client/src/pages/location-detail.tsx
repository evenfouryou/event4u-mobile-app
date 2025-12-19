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
import { ArrowLeft, Save, MapPin, Globe, Ticket } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLocationSchema, type Location, type InsertLocation } from "@shared/schema";
import { useLocation, useRoute } from "wouter";

export default function LocationDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/locations/:id");
  const locationId = params?.id;
  const { toast } = useToast();

  const { data: location, isLoading } = useQuery<Location>({
    queryKey: ['/api/locations', locationId],
    enabled: !!locationId,
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
      setLocation('/locations');
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

  const handleSubmit = (data: InsertLocation) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto">
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
      <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto">
        <div className="text-center py-8 sm:py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Location non trovata</h2>
          <p className="text-muted-foreground mb-4">La location richiesta non esiste</p>
          <Button onClick={() => setLocation('/locations')} data-testid="button-back-to-locations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alle Location
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation('/locations')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold" data-testid="text-location-title">
            Modifica Location
          </h1>
          <p className="text-muted-foreground">{location.name}</p>
        </div>
      </div>

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
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                    <Textarea {...field} value={field.value || ''} rows={2} data-testid="input-location-address" />
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
                      rows={3}
                      data-testid="input-location-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Ticket className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">Impostazioni SIAE</h3>
              </div>

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

            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">Impostazioni Vetrina Pubblica</h3>
              </div>

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4 mb-4">
                    <div>
                      <FormLabel className="font-medium">Mostra nella Vetrina</FormLabel>
                      <p className="text-sm text-muted-foreground">Rendi visibile il locale nella pagina pubblica</p>
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
                onClick={() => setLocation('/locations')}
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
    </div>
  );
}
