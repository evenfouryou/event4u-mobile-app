import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Boxes, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Station, User, Event } from "@shared/schema";

const stationFormSchema = z.object({
  name: z.string().min(1, "Nome postazione richiesto"),
  assignedUserId: z.string().optional().nullable(),
});

type StationFormData = z.infer<typeof stationFormSchema>;

export default function StationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
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
      assignedUserId: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: StationFormData) => {
      await apiRequest('POST', '/api/stations', data);
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
      await apiRequest('PATCH', `/api/stations/${id}`, data);
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

  const handleSubmit = (data: StationFormData) => {
    if (editingStation) {
      updateMutation.mutate({ id: editingStation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (station: Station) => {
    setEditingStation(station);
    form.reset({
      name: station.name,
      assignedUserId: station.assignedUserId,
    });
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingStation(null);
      form.reset({
        name: '',
        assignedUserId: null,
      });
    }
  };

  const getEventName = (eventId: string | null) => {
    if (!eventId) return null;
    const event = events?.find(e => e.id === eventId);
    return event?.name || 'Evento sconosciuto';
  };

  const getBartenderName = (userId: string | null) => {
    if (!userId) return 'Nessuno';
    const bartender = users?.find(u => u.id === userId);
    if (!bartender) return 'Sconosciuto';
    return `${bartender.firstName} ${bartender.lastName}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Gestione Postazioni</h1>
          <p className="text-muted-foreground">
            Crea e gestisci le postazioni generali dell'azienda
          </p>
        </div>
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
              data-testid="button-create-station"
              disabled={!canCreateStations}
              title={!canCreateStations ? "Solo gli admin possono creare postazioni" : ""}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuova Postazione
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingStation ? 'Modifica Postazione' : 'Nuova Postazione'}
              </DialogTitle>
              <DialogDescription>
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
                        <Input {...field} data-testid="input-station-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assignedUserId"
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
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogOpenChange(false)}
                    data-testid="button-cancel-station"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
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
      </div>

      {stationsLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96" />
          </CardContent>
        </Card>
      ) : stations && stations.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Barista Assegnato</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stations.map((station) => {
                  const eventName = getEventName(station.eventId);
                  return (
                    <TableRow key={station.id} data-testid={`station-row-${station.id}`}>
                      <TableCell className="font-medium">{station.name}</TableCell>
                      <TableCell>
                        {eventName ? (
                          <Badge variant="secondary" data-testid={`badge-station-type-${station.id}`}>
                            🎪 {eventName}
                          </Badge>
                        ) : (
                          <Badge variant="outline" data-testid={`badge-station-type-${station.id}`}>
                            📍 Generale
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getBartenderName(station.assignedUserId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(station)}
                          disabled={!canCreateStations}
                          data-testid={`button-edit-station-${station.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Boxes className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Nessuna postazione configurata</p>
            {canCreateStations && (
              <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-station">
                <Plus className="h-4 w-4 mr-2" />
                Crea Prima Postazione
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
