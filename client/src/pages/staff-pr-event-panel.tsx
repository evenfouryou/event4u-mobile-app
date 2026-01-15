import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  ArrowLeft,
  Calendar, 
  Users, 
  CheckCircle2, 
  ListChecks, 
  Armchair, 
  Plus,
  Clock,
  UserPlus,
  QrCode,
  TrendingUp,
  Phone,
  Mail,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Event, EventList, ListEntry, TableType, TableReservation } from "@shared/schema";

interface EventWithAssignment extends Event {
  assignmentType: 'owner' | 'staff' | 'pr' | 'scanner';
  permissions: {
    canManageLists?: boolean;
    canManageTables?: boolean;
    canCreatePr?: boolean;
    canApproveTables?: boolean;
    canAddToLists?: boolean;
    canProposeTables?: boolean;
    canScanLists?: boolean;
    canScanTables?: boolean;
    canScanTickets?: boolean;
  };
  staffUserId?: string;
}

const addPersonSchema = z.object({
  listId: z.string().min(1, "Seleziona una lista"),
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  numberOfGuests: z.coerce.number().min(1).max(20).default(1),
  notes: z.string().optional(),
});

type AddPersonForm = z.infer<typeof addPersonSchema>;

export default function StaffPrEventPanel() {
  const { id: eventId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("lists");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Get URL params for initial tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  }, []);

  // Get event with assignment info
  const { data: myEvents, isLoading: eventsLoading } = useQuery<EventWithAssignment[]>({
    queryKey: ['/api/e4u/my-events'],
  });

  const currentEvent = myEvents?.find(e => e.id === eventId);
  const permissions = currentEvent?.permissions || {};

  // Get lists for this event
  const { data: lists, isLoading: listsLoading } = useQuery<EventList[]>({
    queryKey: ['/api/e4u/events', eventId, 'lists'],
    enabled: !!eventId,
  });

  // Get table types for this event
  const { data: tableTypes, isLoading: tablesLoading } = useQuery<TableType[]>({
    queryKey: ['/api/e4u/events', eventId, 'tables'],
    enabled: !!eventId && (permissions.canManageTables || permissions.canProposeTables),
  });

  // Get reservations
  const { data: reservations } = useQuery<TableReservation[]>({
    queryKey: ['/api/e4u/events', eventId, 'reservations'],
    enabled: !!eventId && (permissions.canManageTables || permissions.canProposeTables),
  });

  const form = useForm<AddPersonForm>({
    resolver: zodResolver(addPersonSchema),
    defaultValues: {
      listId: '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      numberOfGuests: 1,
      notes: '',
    },
  });

  const addPersonMutation = useMutation({
    mutationFn: async (data: AddPersonForm) => {
      return await apiRequest('POST', `/api/e4u/lists/${data.listId}/entries`, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        email: data.email || null,
        numberOfGuests: data.numberOfGuests,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/lists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', eventId, 'lists'] });
      setAddDialogOpen(false);
      form.reset();
      toast({
        title: "Aggiunto",
        description: "Persona aggiunta alla lista con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiungere alla lista",
        variant: "destructive",
      });
    },
  });

  const handleAddPerson = (data: AddPersonForm) => {
    addPersonMutation.mutate(data);
  };

  if (eventsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Evento non trovato</h3>
              <p className="text-muted-foreground mb-4">
                Non hai accesso a questo evento o non esiste.
              </p>
              <Button onClick={() => navigate('/staff-pr-home')} data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna alla Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isStaff = currentEvent.assignmentType === 'staff';
  const isPr = currentEvent.assignmentType === 'pr';

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-staff-pr-event-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/staff-pr-home')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-event-name">{currentEvent.name}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{format(new Date(currentEvent.startDatetime), "d MMM yyyy, HH:mm", { locale: it })}</span>
                </div>
                <Badge className={isStaff ? "bg-teal-500/20 text-teal-400" : "bg-pink-500/20 text-pink-400"}>
                  {isStaff ? "Staff" : isPr ? "PR" : "Scanner"}
                </Badge>
              </div>
            </div>
          </div>
          {(permissions.canManageLists || permissions.canAddToLists) && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-person">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Persona
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aggiungi alla Lista</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAddPerson)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="listId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lista</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-list">
                                <SelectValue placeholder="Seleziona lista" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {lists?.map((list) => (
                                <SelectItem key={list.id} value={list.id}>
                                  {list.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-firstname" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cognome</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-lastname" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefono</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="numberOfGuests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numero Ospiti</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} max={20} {...field} data-testid="input-guests" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={addPersonMutation.isPending} data-testid="button-submit-add">
                        {addPersonMutation.isPending ? "Aggiunta..." : "Aggiungi"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-teal-500/20">
                  <Users className="h-6 w-6 text-teal-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Persone Aggiunte</p>
                  <p className="text-2xl font-bold" data-testid="stat-my-entries">-</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="text-2xl font-bold" data-testid="stat-my-checkins">-</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-pink-500/20">
                  <Armchair className="h-6 w-6 text-pink-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tavoli</p>
                  <p className="text-2xl font-bold" data-testid="stat-my-tables">-</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/20">
                  <ListChecks className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Liste</p>
                  <p className="text-2xl font-bold" data-testid="stat-lists-count">{lists?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            {(permissions.canManageLists || permissions.canAddToLists) && (
              <TabsTrigger value="lists" data-testid="tab-lists">
                <ListChecks className="h-4 w-4 mr-2" />
                Liste
              </TabsTrigger>
            )}
            {(permissions.canManageTables || permissions.canProposeTables) && (
              <TabsTrigger value="tables" data-testid="tab-tables">
                <Armchair className="h-4 w-4 mr-2" />
                Tavoli
              </TabsTrigger>
            )}
            {permissions.canCreatePr && (
              <TabsTrigger value="pr" data-testid="tab-pr">
                <UserPlus className="h-4 w-4 mr-2" />
                PR Team
              </TabsTrigger>
            )}
            <TabsTrigger value="stats" data-testid="tab-stats">
              <TrendingUp className="h-4 w-4 mr-2" />
              Statistiche
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lists" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Liste Evento</CardTitle>
                <CardDescription>Gestisci le liste e i partecipanti dell'evento</CardDescription>
              </CardHeader>
              <CardContent>
                {listsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : lists && lists.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome Lista</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Capacità</TableHead>
                        <TableHead>Prezzo</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lists.map((list) => (
                        <DesktopListRow key={list.id} list={list} />
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nessuna lista</h3>
                    <p className="text-muted-foreground">Non ci sono ancora liste per questo evento.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tables" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tavoli Evento</CardTitle>
                    <CardDescription>Gestisci prenotazioni tavoli</CardDescription>
                  </div>
                  {permissions.canProposeTables && (
                    <Button data-testid="button-propose-table">
                      <Plus className="h-4 w-4 mr-2" />
                      Proponi Tavolo
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {tablesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : tableTypes && tableTypes.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo Tavolo</TableHead>
                        <TableHead>Max Ospiti</TableHead>
                        <TableHead>Prezzo</TableHead>
                        <TableHead>Disponibili</TableHead>
                        <TableHead>Prenotazioni</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableTypes.map((table) => (
                        <TableRow key={table.id} data-testid={`row-table-${table.id}`}>
                          <TableCell className="font-medium">{table.name}</TableCell>
                          <TableCell>{table.maxGuests}</TableCell>
                          <TableCell>€{table.price}</TableCell>
                          <TableCell>{table.totalQuantity}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {reservations?.filter(r => r.tableTypeId === table.id).length || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" data-testid={`button-view-table-${table.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Armchair className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nessun tipo tavolo</h3>
                    <p className="text-muted-foreground">Non ci sono tipi di tavolo configurati per questo evento.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pr" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Il Tuo Team PR</CardTitle>
                    <CardDescription>Gestisci i tuoi PR e monitora le performance</CardDescription>
                  </div>
                  {permissions.canCreatePr && (
                    <Button data-testid="button-add-pr">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Aggiungi PR
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Gestione PR</h3>
                  <p className="text-muted-foreground">Qui potrai gestire i tuoi PR e visualizzare le loro performance.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Le Tue Statistiche</CardTitle>
                <CardDescription>Riepilogo delle tue performance per questo evento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="text-center p-6 rounded-lg bg-teal-500/10">
                    <Users className="h-8 w-8 text-teal-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold" data-testid="stat-desktop-entries">-</p>
                    <p className="text-sm text-muted-foreground">Persone Aggiunte</p>
                  </div>
                  <div className="text-center p-6 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold" data-testid="stat-desktop-checkins">-</p>
                    <p className="text-sm text-muted-foreground">Check-in</p>
                  </div>
                  <div className="text-center p-6 rounded-lg bg-pink-500/10">
                    <Armchair className="h-8 w-8 text-pink-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold" data-testid="stat-desktop-tables">-</p>
                    <p className="text-sm text-muted-foreground">Tavoli</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Mobile version
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-3 sm:p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="glass-card p-3 sm:p-4 md:p-6 rounded-xl">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/staff-pr-home')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate" data-testid="text-event-name">
                {currentEvent.name}
              </h1>
              <div className="flex items-center gap-2 sm:gap-4 mt-1 text-muted-foreground text-xs sm:text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{format(new Date(currentEvent.startDatetime), "d MMM yyyy, HH:mm", { locale: it })}</span>
                </div>
              </div>
            </div>
            <Badge className={`text-xs sm:text-sm ${isStaff ? "bg-teal-500/20 text-teal-400" : "bg-pink-500/20 text-pink-400"}`}>
              {isStaff ? "Staff" : isPr ? "PR" : "Scanner"}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="glass-card p-1 w-full grid grid-cols-2 sm:grid-cols-4 h-auto">
            {(permissions.canManageLists || permissions.canAddToLists) && (
              <TabsTrigger value="lists" className="text-xs sm:text-sm py-2 sm:py-1.5" data-testid="tab-lists">
                <ListChecks className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Liste</span>
                <span className="sm:hidden">Liste</span>
              </TabsTrigger>
            )}
            {(permissions.canManageTables || permissions.canProposeTables) && (
              <TabsTrigger value="tables" className="text-xs sm:text-sm py-2 sm:py-1.5" data-testid="tab-tables">
                <Armchair className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Tavoli</span>
                <span className="sm:hidden">Tavoli</span>
              </TabsTrigger>
            )}
            {permissions.canCreatePr && (
              <TabsTrigger value="pr" className="text-xs sm:text-sm py-2 sm:py-1.5" data-testid="tab-pr">
                <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">PR Team</span>
                <span className="sm:hidden">PR</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="stats" className="text-xs sm:text-sm py-2 sm:py-1.5" data-testid="tab-stats">
              <TrendingUp className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Statistiche</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

          {/* Lists Tab */}
          <TabsContent value="lists" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-semibold">Liste Evento</h2>
              {(permissions.canManageLists || permissions.canAddToLists) && (
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto h-12 sm:h-10" data-testid="button-add-person">
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Persona
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Aggiungi alla Lista</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleAddPerson)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="listId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lista</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-list">
                                    <SelectValue placeholder="Seleziona lista" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {lists?.map((list) => (
                                    <SelectItem key={list.id} value={list.id}>
                                      {list.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-firstname" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cognome</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid="input-lastname" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefono</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="numberOfGuests"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Numero Ospiti</FormLabel>
                              <FormControl>
                                <Input type="number" min={1} max={20} {...field} data-testid="input-guests" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={addPersonMutation.isPending} data-testid="button-submit-add">
                            {addPersonMutation.isPending ? "Aggiunta..." : "Aggiungi"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {listsLoading ? (
              <div className="grid gap-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="glass-card">
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-1/3 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : lists && lists.length > 0 ? (
              <div className="grid gap-4">
                {lists.map((list) => (
                  <ListCard key={list.id} list={list} eventId={eventId!} permissions={permissions} />
                ))}
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="p-12 text-center">
                  <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nessuna lista</h3>
                  <p className="text-muted-foreground">
                    Non ci sono ancora liste per questo evento.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-semibold">Tavoli Evento</h2>
              {permissions.canProposeTables && (
                <Button className="w-full sm:w-auto h-12 sm:h-10" data-testid="button-propose-table">
                  <Plus className="h-4 w-4 mr-2" />
                  Proponi Tavolo
                </Button>
              )}
            </div>

            {tablesLoading ? (
              <div className="grid gap-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="glass-card">
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-1/3 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : tableTypes && tableTypes.length > 0 ? (
              <div className="grid gap-4">
                {tableTypes.map((table) => (
                  <Card key={table.id} className="glass-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{table.name}</CardTitle>
                        <Badge variant="outline">
                          Max {table.maxGuests} ospiti
                        </Badge>
                      </div>
                      <CardDescription>
                        Prezzo: €{table.price} | Disponibili: {table.totalQuantity}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        {reservations?.filter(r => r.tableTypeId === table.id).length || 0} prenotazioni
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="p-12 text-center">
                  <Armchair className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nessun tipo tavolo</h3>
                  <p className="text-muted-foreground">
                    Non ci sono tipi di tavolo configurati per questo evento.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PR Tab */}
          <TabsContent value="pr" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-semibold">Il Tuo Team PR</h2>
              {permissions.canCreatePr && (
                <Button className="w-full sm:w-auto h-12 sm:h-10" data-testid="button-add-pr">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Aggiungi PR
                </Button>
              )}
            </div>

            <Card className="glass-card">
              <CardContent className="p-12 text-center">
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Gestione PR</h3>
                <p className="text-muted-foreground">
                  Qui potrai gestire i tuoi PR e visualizzare le loro performance.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">Le Tue Statistiche</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 rounded-full bg-teal-500/20">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-teal-400" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Persone Aggiunte</p>
                      <p className="text-xl sm:text-2xl font-bold" data-testid="stat-my-entries">-</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 rounded-full bg-green-500/20">
                      <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Check-in</p>
                      <p className="text-xl sm:text-2xl font-bold" data-testid="stat-my-checkins">-</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 rounded-full bg-pink-500/20">
                      <Armchair className="h-5 w-5 sm:h-6 sm:w-6 text-pink-400" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Tavoli</p>
                      <p className="text-xl sm:text-2xl font-bold" data-testid="stat-my-tables">-</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// List Card Component
function ListCard({ list, eventId, permissions }: { 
  list: EventList; 
  eventId: string;
  permissions: EventWithAssignment['permissions'];
}) {
  const { data: entries } = useQuery<ListEntry[]>({
    queryKey: ['/api/e4u/lists', list.id, 'entries'],
  });

  const checkedIn = entries?.filter(e => e.status === 'checked_in').length || 0;
  const total = entries?.length || 0;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{list.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/20 text-green-400">
              {checkedIn}/{total} check-in
            </Badge>
            {list.isActive ? (
              <Badge className="bg-green-500/20 text-green-400">Attiva</Badge>
            ) : (
              <Badge variant="secondary">Inattiva</Badge>
            )}
          </div>
        </div>
        </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {list.maxCapacity && `Max: ${list.maxCapacity} persone`}
            {list.price && ` | Ingresso: €${list.price}`}
          </div>
          <Button variant="outline" size="sm" data-testid={`button-view-list-${list.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            Visualizza
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Desktop List Row Component
function DesktopListRow({ list }: { list: EventList }) {
  const { data: entries } = useQuery<ListEntry[]>({
    queryKey: ['/api/e4u/lists', list.id, 'entries'],
  });

  const checkedIn = entries?.filter(e => e.status === 'checked_in').length || 0;
  const total = entries?.length || 0;

  return (
    <TableRow data-testid={`row-list-${list.id}`}>
      <TableCell className="font-medium">{list.name}</TableCell>
      <TableCell>
        {list.isActive ? (
          <Badge className="bg-green-500/20 text-green-400">Attiva</Badge>
        ) : (
          <Badge variant="secondary">Inattiva</Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="bg-green-500/20 text-green-400">
          {checkedIn}/{total}
        </Badge>
      </TableCell>
      <TableCell>{list.maxCapacity || '-'}</TableCell>
      <TableCell>{list.price ? `€${list.price}` : 'Gratis'}</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" data-testid={`button-view-list-${list.id}`}>
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
