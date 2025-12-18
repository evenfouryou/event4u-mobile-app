import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  MoreHorizontal,
  Calendar,
  Loader2,
  RefreshCw,
  Armchair,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  DollarSign,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { EventTable, TableBooking, Event } from "@shared/schema";

const tableFormSchema = z.object({
  name: z.string().min(1, "Nome tavolo obbligatorio"),
  tableType: z.string().min(1, "Tipo tavolo obbligatorio").default("standard"),
  capacity: z.coerce.number().min(1, "Minimo 1 posto"),
  minSpend: z.coerce.number().min(0, "Non può essere negativo").optional(),
  notes: z.string().optional(),
});

type TableFormData = z.infer<typeof tableFormSchema>;

const bookingFormSchema = z.object({
  customerName: z.string().min(1, "Nome cliente obbligatorio"),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email("Email non valida").optional().or(z.literal("")),
  guestsCount: z.coerce.number().min(1, "Minimo 1 ospite"),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export default function PrTablesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isBookTableOpen, setIsBookTableOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("");

  // Fetch events
  const { data: events = [], isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Fetch tables for selected event
  const { data: tables = [], isLoading: loadingTables, refetch: refetchTables } = useQuery<EventTable[]>({
    queryKey: ["/api/pr/events", selectedEventId, "tables"],
    enabled: !!selectedEventId,
  });

  // Fetch bookings for selected event
  const { data: bookings = [], isLoading: loadingBookings, refetch: refetchBookings } = useQuery<TableBooking[]>({
    queryKey: ["/api/pr/events", selectedEventId, "bookings"],
    enabled: !!selectedEventId,
  });

  // Get selected event
  const selectedEvent = useMemo(() =>
    events.find(e => e.id === selectedEventId),
    [events, selectedEventId]
  );

  // Get unique table types
  const tableTypes = useMemo(() =>
    Array.from(new Set(tables.map(t => t.tableType))).sort(),
    [tables]
  );

  // Filter tables
  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      const matchesSearch = !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tableType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesZone = !zoneFilter || t.tableType === zoneFilter;
      return matchesSearch && matchesZone;
    });
  }, [tables, searchQuery, zoneFilter]);

  // Get booking for a table
  const getTableBooking = (tableId: string) =>
    bookings.find(b => b.tableId === tableId && b.status !== 'cancelled');

  // Forms
  const tableForm = useForm<TableFormData>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      name: "",
      tableType: "standard",
      capacity: 4,
      minSpend: undefined,
      notes: "",
    },
  });

  const bookingForm = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      guestsCount: 1,
      notes: "",
    },
  });

  // Mutations
  const createTableMutation = useMutation({
    mutationFn: async (data: TableFormData) => {
      const response = await apiRequest("POST", `/api/pr/events/${selectedEventId}/tables`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Tavolo creato" });
      setIsAddTableOpen(false);
      tableForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "tables"] });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EventTable> }) => {
      const response = await apiRequest("PATCH", `/api/pr/tables/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Tavolo aggiornato" });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "tables"] });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pr/tables/${id}`, undefined);
    },
    onSuccess: () => {
      toast({ title: "Tavolo eliminato" });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "tables"] });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const response = await apiRequest("POST", `/api/pr/events/${selectedEventId}/bookings`, {
        ...data,
        tableId: selectedTableId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Prenotazione creata" });
      setIsBookTableOpen(false);
      bookingForm.reset();
      setSelectedTableId("");
      refetchTables();
      refetchBookings();
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TableBooking> }) => {
      const response = await apiRequest("PATCH", `/api/pr/bookings/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Prenotazione aggiornata" });
      refetchTables();
      refetchBookings();
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pr/bookings/${id}`, undefined);
    },
    onSuccess: () => {
      toast({ title: "Prenotazione cancellata" });
      refetchTables();
      refetchBookings();
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Disponibile</Badge>;
      case 'reserved':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500"><Clock className="w-3 h-3 mr-1" />Prenotato</Badge>;
      case 'occupied':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500"><Users className="w-3 h-3 mr-1" />Occupato</Badge>;
      case 'blocked':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500"><XCircle className="w-3 h-3 mr-1" />Bloccato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loadingEvents) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Armchair className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
            Gestione Tavoli
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Configura e gestisci i tavoli degli eventi
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              refetchTables();
              refetchBookings();
            }}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Event Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleziona Evento</label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger data-testid="select-event">
                  <SelectValue placeholder="Scegli un evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} - {format(new Date(event.startDatetime), "d MMM yyyy", { locale: it })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Filtra per Tipo</label>
              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger data-testid="select-zone">
                  <SelectValue placeholder="Tutti i tipi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tutti i tipi</SelectItem>
                  {tableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === 'standard' ? 'Standard' : type === 'vip' ? 'VIP' : type === 'prive' ? 'Privé' : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cerca</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca tavolo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {selectedEventId && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Totale Tavoli</p>
                  <p className="text-2xl font-bold">{tables.length}</p>
                </div>
                <Armchair className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Disponibili</p>
                  <p className="text-2xl font-bold text-green-500">
                    {tables.filter(t => t.status === 'available').length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Prenotati</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {tables.filter(t => t.status === 'reserved').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Capacità Totale</p>
                  <p className="text-2xl font-bold text-purple-500">
                    {tables.reduce((sum, t) => sum + t.capacity, 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tables Grid / List */}
      {selectedEventId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Tavoli - {selectedEvent?.name}</CardTitle>
                <CardDescription>
                  {selectedEvent && format(new Date(selectedEvent.startDatetime), "d MMMM yyyy", { locale: it })}
                </CardDescription>
              </div>
              <Dialog open={isAddTableOpen} onOpenChange={setIsAddTableOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-table">
                    <Plus className="w-4 h-4 mr-2" />
                    Aggiungi Tavolo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Aggiungi Tavolo</DialogTitle>
                    <DialogDescription>
                      Crea un nuovo tavolo per l'evento
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...tableForm}>
                    <form onSubmit={tableForm.handleSubmit((data) => createTableMutation.mutate(data))} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={tableForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Tavolo</FormLabel>
                              <FormControl>
                                <Input placeholder="Es: Tavolo 1, VIP-1" {...field} data-testid="input-table-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tableForm.control}
                          name="tableType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo Tavolo</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="input-table-type">
                                    <SelectValue placeholder="Seleziona tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="vip">VIP</SelectItem>
                                  <SelectItem value="prive">Privé</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={tableForm.control}
                          name="capacity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Posti</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" {...field} data-testid="input-capacity" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tableForm.control}
                          name="minSpend"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minima Spesa (€)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" placeholder="Opzionale" {...field} data-testid="input-minspend" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={tableForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Note</FormLabel>
                            <FormControl>
                              <Input placeholder="Note aggiuntive" {...field} data-testid="input-notes" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={createTableMutation.isPending} data-testid="button-submit-table">
                          {createTableMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Crea Tavolo
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="grid" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="grid">Griglia</TabsTrigger>
                <TabsTrigger value="list">Lista</TabsTrigger>
              </TabsList>
              
              <TabsContent value="grid">
                {loadingTables ? (
                  <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-40" />
                    ))}
                  </div>
                ) : filteredTables.length === 0 ? (
                  <div className="text-center py-12">
                    <Armchair className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Nessun tavolo</h3>
                    <p className="text-muted-foreground">
                      Aggiungi il primo tavolo per l'evento
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {filteredTables.map((table) => {
                      const booking = getTableBooking(table.id);
                      return (
                        <Card key={table.id} className="relative" data-testid={`card-table-${table.id}`}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{table.name}</CardTitle>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-menu-${table.id}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {table.status === 'available' && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedTableId(table.id);
                                        setIsBookTableOpen(true);
                                      }}
                                      data-testid={`action-book-${table.id}`}
                                    >
                                      <Clock className="w-4 h-4 mr-2" />
                                      Prenota
                                    </DropdownMenuItem>
                                  )}
                                  {table.status === 'available' && (
                                    <DropdownMenuItem
                                      onClick={() => updateTableMutation.mutate({ id: table.id, data: { status: 'blocked' } })}
                                      data-testid={`action-block-${table.id}`}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Blocca
                                    </DropdownMenuItem>
                                  )}
                                  {table.status === 'blocked' && (
                                    <DropdownMenuItem
                                      onClick={() => updateTableMutation.mutate({ id: table.id, data: { status: 'available' } })}
                                      data-testid={`action-unblock-${table.id}`}
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Sblocca
                                    </DropdownMenuItem>
                                  )}
                                  {table.status === 'reserved' && booking && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => updateBookingMutation.mutate({ id: booking.id, data: { status: 'arrived' } })}
                                        data-testid={`action-arrived-${table.id}`}
                                      >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Arrivato
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => deleteBookingMutation.mutate(booking.id)}
                                        className="text-red-600"
                                        data-testid={`action-cancel-booking-${table.id}`}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Cancella Prenotazione
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => deleteTableMutation.mutate(table.id)}
                                    className="text-destructive"
                                    data-testid={`action-delete-${table.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Elimina Tavolo
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {table.tableType === 'standard' ? 'Standard' : table.tableType === 'vip' ? 'VIP' : table.tableType === 'prive' ? 'Privé' : table.tableType}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="w-3 h-3" />
                              {table.capacity} posti
                            </div>
                            {table.minSpend && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <DollarSign className="w-3 h-3" />
                                Min. €{table.minSpend}
                              </div>
                            )}
                            <div className="pt-2">
                              {getStatusBadge(table.status)}
                            </div>
                            {booking && (
                              <div className="pt-2 text-sm border-t">
                                <p className="font-medium">{booking.customerName}</p>
                                <p className="text-muted-foreground">{booking.guestsCount} ospiti</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="list">
                {loadingTables ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : filteredTables.length === 0 ? (
                  <div className="text-center py-12">
                    <Armchair className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Nessun tavolo</h3>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tavolo</TableHead>
                          <TableHead>Zona</TableHead>
                          <TableHead className="text-center">Posti</TableHead>
                          <TableHead className="text-center">Min. Spesa</TableHead>
                          <TableHead className="text-center">Stato</TableHead>
                          <TableHead>Prenotazione</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTables.map((table) => {
                          const booking = getTableBooking(table.id);
                          return (
                            <TableRow key={table.id} data-testid={`row-table-${table.id}`}>
                              <TableCell className="font-medium">{table.name}</TableCell>
                              <TableCell>{table.tableType === 'standard' ? 'Standard' : table.tableType === 'vip' ? 'VIP' : table.tableType === 'prive' ? 'Privé' : table.tableType}</TableCell>
                              <TableCell className="text-center">{table.capacity}</TableCell>
                              <TableCell className="text-center">
                                {table.minSpend ? `€${table.minSpend}` : '-'}
                              </TableCell>
                              <TableCell className="text-center">{getStatusBadge(table.status)}</TableCell>
                              <TableCell>
                                {booking ? (
                                  <div>
                                    <p className="font-medium">{booking.customerName}</p>
                                    <p className="text-xs text-muted-foreground">{booking.guestsCount} ospiti</p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {table.status === 'available' && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedTableId(table.id);
                                          setIsBookTableOpen(true);
                                        }}
                                      >
                                        Prenota
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => deleteTableMutation.mutate(table.id)}
                                      className="text-destructive"
                                    >
                                      Elimina
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* No Event Selected */}
      {!selectedEventId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Seleziona un evento</h3>
              <p className="text-muted-foreground">
                Scegli un evento per gestire i tavoli
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Book Table Dialog */}
      <Dialog open={isBookTableOpen} onOpenChange={(open) => {
        setIsBookTableOpen(open);
        if (!open) setSelectedTableId("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prenota Tavolo</DialogTitle>
            <DialogDescription>
              Inserisci i dati del cliente per la prenotazione
            </DialogDescription>
          </DialogHeader>
          <Form {...bookingForm}>
            <form onSubmit={bookingForm.handleSubmit((data) => createBookingMutation.mutate(data))} className="space-y-4">
              <FormField
                control={bookingForm.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} data-testid="input-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={bookingForm.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input placeholder="+39 333 1234567" {...field} data-testid="input-customer-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bookingForm.control}
                  name="guestsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero Ospiti</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} data-testid="input-guest-count" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={bookingForm.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (opzionale)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} data-testid="input-customer-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bookingForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Input placeholder="Note aggiuntive" {...field} data-testid="input-booking-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createBookingMutation.isPending} data-testid="button-submit-booking">
                  {createBookingMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Crea Prenotazione
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
