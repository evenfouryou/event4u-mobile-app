import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, MapPin, Users, Clock, Globe, Ticket, ChevronRight, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLocationSchema, type Location, type InsertLocation, type Event } from "@shared/schema";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FloatingActionButton, 
  HapticButton, 
  BottomSheet,
  triggerHaptic 
} from "@/components/mobile-primitives";

export default function Locations() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [, setLocationPath] = useLocation();
  const { toast } = useToast();

  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

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
      setSheetOpen(false);
      form.reset();
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Location creata con successo",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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

  const handleLocationTap = (location: Location) => {
    triggerHaptic('light');
    setLocationPath(`/locations/${location.id}`);
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    form.reset();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
      },
    },
  };

  return (
    <div 
      className="min-h-screen bg-background pb-24"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="px-4 pt-6 pb-4"
      >
        <h1 className="text-2xl font-bold text-foreground">Locali</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Le sedi dei tuoi eventi
        </p>
      </motion.div>

      <div className="px-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : locations && locations.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {locations.map((location, index) => (
                <motion.div
                  key={location.id}
                  variants={cardVariants}
                  layout
                  layoutId={location.id}
                >
                  <Card 
                    className="overflow-hidden active:scale-[0.98] transition-transform touch-manipulation"
                    data-testid={`location-card-${location.id}`}
                  >
                    <CardContent 
                      className="p-0"
                      onClick={() => handleLocationTap(location)}
                    >
                      <div className="flex items-stretch min-h-[120px]">
                        <div className="w-20 bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-8 w-8 text-primary" />
                        </div>
                        
                        <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-lg text-foreground truncate">
                              {location.name}
                            </h3>
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {location.city && (
                              <Badge variant="secondary" className="text-xs">
                                {location.city}
                              </Badge>
                            )}
                            {location.isPublic && (
                              <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/30 text-xs">
                                <Globe className="w-3 h-3 mr-1" />
                                Pubblico
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {location.capacity && (
                              <div className="flex items-center gap-1.5">
                                <Users className="h-4 w-4" />
                                <span>{location.capacity}</span>
                              </div>
                            )}
                            {(() => {
                              const eventCounts = getLocationEventCount(location.id);
                              return eventCounts.active > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-4 w-4" />
                                  <span>{eventCounts.active} attivi</span>
                                </div>
                              ) : null;
                            })()}
                            {location.openingHours && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                <span className="truncate max-w-[120px]">{location.openingHours}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Card className="rounded-2xl">
              <CardContent className="py-16 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                >
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="h-10 w-10 text-primary" />
                  </div>
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">Nessun locale</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Aggiungi il primo locale per iniziare
                </p>
                <HapticButton 
                  onClick={() => setSheetOpen(true)} 
                  data-testid="button-create-first-location"
                  hapticType="medium"
                  className="min-h-[48px] px-6"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Aggiungi Locale
                </HapticButton>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <FloatingActionButton
        onClick={() => setSheetOpen(true)}
        data-testid="button-create-location"
        position="bottom-right"
      >
        <Plus className="h-6 w-6" />
      </FloatingActionButton>

      <BottomSheet
        open={sheetOpen}
        onClose={handleSheetClose}
        title="Nuovo Locale"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-4 space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Nome Locale</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="h-12 text-base"
                      data-testid="input-location-name" 
                    />
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
                  <FormLabel className="text-base">Indirizzo</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ''} 
                      className="min-h-[80px] text-base"
                      data-testid="input-location-address" 
                    />
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
                  <FormLabel className="text-base">Città</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      value={field.value || ''} 
                      placeholder="es. Milano, Roma" 
                      className="h-12 text-base"
                      data-testid="input-location-city" 
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
                  <FormLabel className="text-base">Capienza (persone)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      inputMode="numeric"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="h-12 text-base"
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
                  <FormLabel className="text-base">Note</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ''}
                      placeholder="Tipo locale, impianti disponibili, ecc."
                      className="min-h-[80px] text-base"
                      data-testid="input-location-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t border-border pt-5 mt-5">
              <div className="flex items-center gap-2 mb-4">
                <Ticket className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Impostazioni SIAE</span>
              </div>

              <FormField
                control={form.control}
                name="siaeLocationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Codice Locale SIAE</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ''} 
                        placeholder="es. 12345678"
                        className="h-12 text-base"
                        data-testid="input-siae-location-code" 
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Codice identificativo del locale rilasciato dalla SIAE
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t border-border pt-5 mt-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Vetrina Pubblica</span>
              </div>

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border border-border p-4 mb-4">
                    <div className="flex-1">
                      <FormLabel className="font-medium text-base">Mostra nella Vetrina</FormLabel>
                      <p className="text-sm text-muted-foreground">Rendi visibile il locale</p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="ml-4"
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
                    <FormLabel className="text-base">URL Immagine di Copertina</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ''} 
                        placeholder="https://esempio.com/immagine.jpg" 
                        className="h-12 text-base"
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
                  <FormItem className="mt-4">
                    <FormLabel className="text-base">Descrizione Breve</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''} 
                        placeholder="Una breve descrizione del locale"
                        className="min-h-[80px] text-base"
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
                  <FormItem className="mt-4">
                    <FormLabel className="text-base">Orari di Apertura</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ''} 
                        placeholder="es. Ven-Sab 23:00-05:00"
                        className="h-12 text-base"
                        data-testid="input-opening-hours" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4 pb-4">
              <HapticButton
                type="button"
                variant="outline"
                onClick={handleSheetClose}
                className="flex-1 h-14 text-base"
                hapticType="light"
                data-testid="button-cancel-location"
              >
                Annulla
              </HapticButton>
              <HapticButton
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 h-14 text-base"
                hapticType="medium"
                data-testid="button-submit-location"
              >
                {createMutation.isPending ? "Creazione..." : "Crea Locale"}
              </HapticButton>
            </div>
          </form>
        </Form>
      </BottomSheet>
    </div>
  );
}
