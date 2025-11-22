import { useState } from "react";
import { useParams, Link } from "wouter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Users, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStationSchema, type Event, type Station, type InsertStation, type User } from "@shared/schema";

export default function EventDetail() {
  const { id } = useParams();
  const [stationDialogOpen, setStationDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', id],
  });

  const { data: stations, isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['/api/events', id, 'stations'],
    enabled: !!id,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const form = useForm<InsertStation>({
    resolver: zodResolver(insertStationSchema),
    defaultValues: {
      name: '',
      assignedUserId: '',
      eventId: id,
    },
  });

  const createStationMutation = useMutation({
    mutationFn: async (data: InsertStation) => {
      await apiRequest('POST', `/api/events/${id}/stations`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'stations'] });
      setStationDialogOpen(false);
      form.reset();
      toast({
        title: "Successo",
        description: "Postazione creata con successo",
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
        description: "Impossibile creare la postazione",
        variant: "destructive",
      });
    },
  });

  const bartenders = users?.filter(u => u.role === 'bartender') || [];

  if (eventLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Evento non trovato</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: 'Bozza', variant: 'outline' },
    scheduled: { label: 'Programmato', variant: 'secondary' },
    ongoing: { label: 'In Corso', variant: 'default' },
    closed: { label: 'Chiuso', variant: 'destructive' },
  };
  const statusInfo = statusLabels[event.status] || statusLabels.draft;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <Button asChild variant="ghost" className="mb-6" data-testid="button-back">
        <Link href="/events">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna agli Eventi
        </Link>
      </Button>

      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold mb-2">{event.name}</h1>
            <div className="flex items-center gap-3">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(event.startDatetime).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" data-testid="button-view-report">
              <Link href={`/events/${id}/report`}>
                Report
              </Link>
            </Button>
          </div>
        </div>

        {event.notes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Note</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{event.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Postazioni</h2>
          <Dialog open={stationDialogOpen} onOpenChange={setStationDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-station">
                <Plus className="h-4 w-4 mr-2" />
                Nuova Postazione
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuova Postazione</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createStationMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Postazione</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Es. Bar Centrale, Privé 1, ecc." data-testid="input-station-name" />
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
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-station-bartender">
                              <SelectValue placeholder="Seleziona barista" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Nessuno</SelectItem>
                            {bartenders.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
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
                      onClick={() => setStationDialogOpen(false)}
                      data-testid="button-cancel-station"
                    >
                      Annulla
                    </Button>
                    <Button type="submit" disabled={createStationMutation.isPending} data-testid="button-submit-station">
                      Crea Postazione
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {stationsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : stations && stations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stations.map((station) => {
              const assignedUser = users?.find(u => u.id === station.assignedUserId);
              return (
                <Card key={station.id} data-testid={`station-card-${station.id}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{station.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {assignedUser
                          ? `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() || assignedUser.email
                          : 'Nessun barista assegnato'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Nessuna postazione creata</p>
              <Button onClick={() => setStationDialogOpen(true)} data-testid="button-create-first-station">
                <Plus className="h-4 w-4 mr-2" />
                Crea Prima Postazione
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
