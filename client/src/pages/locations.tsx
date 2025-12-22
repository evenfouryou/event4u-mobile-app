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
  MobileAppLayout,
  MobileHeader,
  FloatingActionButton, 
  HapticButton, 
  BottomSheet,
  triggerHaptic 
} from "@/components/mobile-primitives";

const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

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
        staggerChildren: 0.06,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: springConfig,
    },
  };

  const headerContent = (
    <MobileHeader
      title="Locali"
      subtitle="Le sedi dei tuoi eventi"
      showBackButton showMenuButton
    />
  );

  return (
    <MobileAppLayout
      header={headerContent}
      contentClassName="pb-24"
    >
      <div className="py-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springConfig, delay: i * 0.08 }}
              >
                <Skeleton className="h-40 rounded-2xl" />
              </motion.div>
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
              {locations.map((location) => {
                const eventCounts = getLocationEventCount(location.id);
                
                return (
                  <motion.div
                    key={location.id}
                    variants={cardVariants}
                    layout
                    layoutId={location.id}
                  >
                    <Card 
                      className="overflow-hidden rounded-2xl active:scale-[0.98] transition-transform touch-manipulation"
                      data-testid={`location-card-${location.id}`}
                    >
                      <CardContent 
                        className="p-0"
                        onClick={() => handleLocationTap(location)}
                      >
                        <div className="flex items-stretch min-h-[140px]">
                          <div className="w-24 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                            <motion.div
                              whileTap={{ scale: 0.9 }}
                              transition={springConfig}
                            >
                              <MapPin className="h-10 w-10 text-primary" />
                            </motion.div>
                          </div>
                          
                          <div className="flex-1 p-5 flex flex-col justify-center min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <h3 className="font-bold text-xl text-foreground leading-tight line-clamp-2">
                                {location.name}
                              </h3>
                              <motion.div
                                whileTap={{ scale: 0.85, x: 2 }}
                                transition={springConfig}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 -mt-1"
                              >
                                <ChevronRight className="h-6 w-6 text-muted-foreground" />
                              </motion.div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                              {location.city && (
                                <Badge variant="secondary" className="text-sm px-3 py-1">
                                  {location.city}
                                </Badge>
                              )}
                              {location.isPublic && (
                                <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/30 text-sm px-3 py-1">
                                  <Globe className="w-3.5 h-3.5 mr-1.5" />
                                  Pubblico
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-5 text-base text-muted-foreground">
                              {location.capacity && (
                                <div className="flex items-center gap-2 min-h-[44px]">
                                  <Users className="h-5 w-5" />
                                  <span className="font-medium">{location.capacity}</span>
                                </div>
                              )}
                              {eventCounts.active > 0 && (
                                <div className="flex items-center gap-2 min-h-[44px]">
                                  <Calendar className="h-5 w-5 text-teal-500" />
                                  <span className="font-medium text-teal-600">{eventCounts.active} attivi</span>
                                </div>
                              )}
                              {location.openingHours && (
                                <div className="flex items-center gap-2 min-h-[44px]">
                                  <Clock className="h-5 w-5" />
                                  <span className="truncate">{location.openingHours}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springConfig}
          >
            <Card className="rounded-2xl">
              <CardContent className="py-20 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...springConfig, delay: 0.1 }}
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MapPin className="h-12 w-12 text-primary" />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springConfig, delay: 0.2 }}
                >
                  <h3 className="text-xl font-bold mb-3">Nessun locale</h3>
                  <p className="text-muted-foreground text-base mb-8">
                    Aggiungi il primo locale per iniziare
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springConfig, delay: 0.3 }}
                >
                  <HapticButton 
                    onClick={() => setSheetOpen(true)} 
                    data-testid="button-create-first-location"
                    hapticType="medium"
                    className="min-h-[52px] px-8 text-base"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Aggiungi Locale
                  </HapticButton>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <FloatingActionButton
        onClick={() => {
          triggerHaptic('medium');
          setSheetOpen(true);
        }}
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
                  <FormLabel className="text-base font-medium">Nome Locale</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="h-14 text-base rounded-xl"
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
                  <FormLabel className="text-base font-medium">Indirizzo</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ''} 
                      className="min-h-[88px] text-base rounded-xl"
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
                  <FormLabel className="text-base font-medium">Città</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      value={field.value || ''} 
                      placeholder="es. Milano, Roma" 
                      className="h-14 text-base rounded-xl"
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
                  <FormLabel className="text-base font-medium">Capienza (persone)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      inputMode="numeric"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="h-14 text-base rounded-xl"
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
                  <FormLabel className="text-base font-medium">Note</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ''}
                      placeholder="Tipo locale, impianti disponibili, ecc."
                      className="min-h-[88px] text-base rounded-xl"
                      data-testid="input-location-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t border-border pt-6 mt-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                <span className="font-semibold text-lg">Impostazioni SIAE</span>
              </div>

              <FormField
                control={form.control}
                name="siaeLocationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Codice Locale SIAE</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ''} 
                        placeholder="es. 12345678"
                        className="h-14 text-base rounded-xl"
                        data-testid="input-siae-location-code" 
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground mt-2">
                      Codice identificativo del locale rilasciato dalla SIAE
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t border-border pt-6 mt-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-teal-500" />
                </div>
                <span className="font-semibold text-lg">Vetrina Pubblica</span>
              </div>

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-2xl border border-border p-5 mb-5">
                    <div className="flex-1">
                      <FormLabel className="font-semibold text-base">Mostra nella Vetrina</FormLabel>
                      <p className="text-sm text-muted-foreground mt-1">Rendi visibile il locale</p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          triggerHaptic('light');
                          field.onChange(checked);
                        }}
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
                    <FormLabel className="text-base font-medium">URL Immagine di Copertina</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ''} 
                        placeholder="https://esempio.com/immagine.jpg" 
                        className="h-14 text-base rounded-xl"
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
                  <FormItem className="mt-5">
                    <FormLabel className="text-base font-medium">Descrizione Breve</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ''} 
                        placeholder="Una breve descrizione del locale"
                        className="min-h-[88px] text-base rounded-xl"
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
                  <FormItem className="mt-5">
                    <FormLabel className="text-base font-medium">Orari di Apertura</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ''} 
                        placeholder="es. Ven-Sab 23:00-05:00"
                        className="h-14 text-base rounded-xl"
                        data-testid="input-opening-hours" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4 pt-6 pb-6">
              <HapticButton
                type="button"
                variant="outline"
                onClick={handleSheetClose}
                className="flex-1 h-14 text-base rounded-xl"
                hapticType="light"
                data-testid="button-cancel-location"
              >
                Annulla
              </HapticButton>
              <HapticButton
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 h-14 text-base rounded-xl"
                hapticType="medium"
                data-testid="button-submit-location"
              >
                {createMutation.isPending ? "Creazione..." : "Crea Locale"}
              </HapticButton>
            </div>
          </form>
        </Form>
      </BottomSheet>
    </MobileAppLayout>
  );
}
