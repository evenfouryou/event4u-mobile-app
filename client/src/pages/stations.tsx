import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Boxes, Edit, Trash2, ArrowLeft, MapPin, Calendar, Users } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import type { Station, User, Event } from "@shared/schema";

const stationFormSchema = z.object({
  name: z.string().min(1, "Nome postazione richiesto"),
  bartenderId: z.string().optional().nullable(),
  stationType: z.enum(['general', 'event']).default('general'),
  eventId: z.string().optional().nullable(),
});

type StationFormData = z.infer<typeof stationFormSchema>;

function StationCard({
  station,
  eventName,
  bartenderNames,
  canEdit,
  onEdit,
  onDelete,
  delay = 0,
}: {
  station: Station;
  eventName: string | null;
  bartenderNames: string;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card p-5 group"
      data-testid={`station-card-${station.id}`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${eventName ? 'from-amber-500 to-orange-600' : 'from-violet-500 to-purple-600'} flex items-center justify-center flex-shrink-0`}>
          <MapPin className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1 truncate">{station.name}</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {eventName ? (
              <Badge variant="secondary" className="text-xs" data-testid={`badge-station-type-${station.id}`}>
                <Calendar className="h-3 w-3 mr-1" />
                {eventName}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-teal border-teal/30" data-testid={`badge-station-type-${station.id}`}>
                <MapPin className="h-3 w-3 mr-1" />
                Generale
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="truncate">{bartenderNames}</span>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-col gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="min-h-[48px] min-w-[48px] md:h-8 md:w-8 md:min-h-0 md:min-w-0"
              data-testid={`button-edit-station-${station.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="min-h-[48px] min-w-[48px] md:h-8 md:w-8 md:min-h-0 md:min-w-0 text-destructive hover:text-destructive"
              data-testid={`button-delete-station-${station.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function StationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [stationType, setStationType] = useState<'general' | 'event'>('general');
  const [deleteStationId, setDeleteStationId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const canCreateStations = user?.role === 'super_admin' || user?.role === 'gestore';

  const { data: stations, isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const bartenders = users?.filter(u => u.role === 'bartender') || [];

  const form = useForm<StationFormData>({
    resolver: zodResolver(stationFormSchema),
    defaultValues: {
      name: '',
      bartenderId: null,
      stationType: 'general',
      eventId: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: StationFormData) => {
      const bartenderIds = data.bartenderId && data.bartenderId !== 'null' 
        ? [data.bartenderId] 
        : [];
      const payload = {
        name: data.name,
        bartenderIds,
        eventId: data.stationType === 'event' ? data.eventId : null,
      };
      await apiRequest('POST', '/api/stations', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Successo",
        description: "Postazione creata con successo",
      });
    },
    onError: (error: any) => {
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
        description: error.message || "Impossibile creare la postazione",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StationFormData> }) => {
      const bartenderIds = data.bartenderId && data.bartenderId !== 'null' 
        ? [data.bartenderId] 
        : [];
      const payload = {
        name: data.name,
        bartenderIds,
        eventId: data.stationType === 'event' ? data.eventId : null,
      };
      await apiRequest('PATCH', `/api/stations/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      setDialogOpen(false);
      setEditingStation(null);
      form.reset();
      toast({
        title: "Successo",
        description: "Postazione aggiornata con successo",
      });
    },
    onError: (error: any) => {
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
        description: error.message || "Impossibile aggiornare la postazione",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/stations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      setDeleteStationId(null);
      toast({
        title: "Successo",
        description: "Postazione eliminata con successo. I dati degli eventi sono stati conservati.",
      });
    },
    onError: (error: any) => {
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
        description: error.message || "Impossibile eliminare la postazione",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: StationFormData) => {
    if (editingStation) {
      updateMutation.mutate({ id: editingStation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (station: Station) => {
    setEditingStation(station);
    const isEventStation = !!station.eventId;
    setStationType(isEventStation ? 'event' : 'general');
    const bartenderId = station.bartenderIds && station.bartenderIds.length > 0 
      ? station.bartenderIds[0] 
      : null;
    form.reset({
      name: station.name,
      bartenderId,
      stationType: isEventStation ? 'event' : 'general',
      eventId: station.eventId,
    });
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingStation(null);
      setStationType('general');
      form.reset({
        name: '',
        bartenderId: null,
        stationType: 'general',
        eventId: null,
      });
    }
  };

  const getEventName = (eventId: string | null) => {
    if (!eventId) return null;
    const event = events?.find(e => e.id === eventId);
    return event?.name || 'Evento sconosciuto';
  };

  const getBartenderNames = (bartenderIds: string[] | null) => {
    if (!bartenderIds || bartenderIds.length === 0) return 'Nessun barista assegnato';
    const names = bartenderIds.map(id => {
      const bartender = users?.find(u => u.id === id);
      if (!bartender) return 'Sconosciuto';
      return `${bartender.firstName} ${bartender.lastName}`;
    });
    return names.join(', ');
  };

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8"
      >
        <Button 
          variant="ghost" 
          size="icon" 
          asChild
          className="rounded-xl"
          data-testid="button-back-beverage"
        >
          <Link href="/beverage">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center glow-golden flex-shrink-0">
              <Boxes className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Gestione Postazioni</h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
            Crea e gestisci le postazioni generali dell'azienda
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex justify-end mb-6"
      >
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!canCreateStations && open) {
            toast({
              title: "Accesso limitato",
              description: "Solo gli admin possono creare postazioni",
              variant: "destructive",
            });
            return;
          }
          handleDialogOpenChange(open);
        }}>
          <DialogTrigger asChild>
            <Button 
              className="gradient-golden text-black font-semibold glow-golden"
              data-testid="button-create-station"
              disabled={!canCreateStations}
              title={!canCreateStations ? "Solo gli admin possono creare postazioni" : ""}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuova Postazione
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto glass-card border-white/10">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {editingStation ? 'Modifica Postazione' : 'Nuova Postazione'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {editingStation 
                  ? 'Modifica i dettagli della postazione.' 
                  : 'Inserisci i dettagli della nuova postazione.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Postazione</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Es. Bar Centrale, Privé 1" data-testid="input-station-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Postazione</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setStationType(value as 'general' | 'event');
                          if (value === 'general') {
                            form.setValue('eventId', null);
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-station-type">
                            <SelectValue placeholder="Seleziona tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-violet-500" />
                              Postazione Generale (Fissa)
                            </div>
                          </SelectItem>
                          <SelectItem value="event">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-amber-500" />
                              Postazione per Evento
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {stationType === 'event' && (
                  <FormField
                    control={form.control}
                    name="eventId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Evento</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-station-event">
                              <SelectValue placeholder="Seleziona evento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {events?.map((event) => (
                              <SelectItem key={event.id} value={event.id}>
                                {event.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="bartenderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barista Assegnato (opzionale)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-station-bartender">
                            <SelectValue placeholder="Seleziona bartender (opzionale)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Nessuno</SelectItem>
                          {bartenders.map((bartender) => (
                            <SelectItem key={bartender.id} value={bartender.id}>
                              {bartender.firstName} {bartender.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[48px]"
                    onClick={() => handleDialogOpenChange(false)}
                    data-testid="button-cancel-station"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    className="gradient-golden text-black font-semibold min-h-[48px]"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-station"
                  >
                    {editingStation ? 'Aggiorna' : 'Crea'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {stationsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : stations && stations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station, index) => (
            <StationCard
              key={station.id}
              station={station}
              eventName={getEventName(station.eventId)}
              bartenderNames={getBartenderNames(station.bartenderIds)}
              canEdit={canCreateStations}
              onEdit={() => handleEdit(station)}
              onDelete={() => setDeleteStationId(station.id)}
              delay={index * 0.05}
            />
          ))}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Boxes className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground mb-4">Nessuna postazione configurata</p>
          {canCreateStations && (
            <Button 
              onClick={() => setDialogOpen(true)} 
              className="gradient-golden text-black font-semibold"
              data-testid="button-create-first-station"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crea Prima Postazione
            </Button>
          )}
        </motion.div>
      )}

      <AlertDialog open={!!deleteStationId} onOpenChange={(open) => !open && setDeleteStationId(null)}>
        <AlertDialogContent className="glass-card border-white/10 max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa postazione? I dati storici degli eventi associati saranno conservati.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="min-h-[48px]" data-testid="button-cancel-delete-station">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStationId && deleteMutation.mutate(deleteStationId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[48px]"
              data-testid="button-confirm-delete-station"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
