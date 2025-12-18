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
  CardFooter,
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
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  UserPlus,
  QrCode,
  ListChecks,
  Trash2,
  Edit,
  Clock,
  UserMinus,
  PartyPopper,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { GuestList, GuestListEntry, Event, EventStaffAssignment } from "@shared/schema";

const guestEntryFormSchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  plusOnes: z.coerce.number().min(0, "Non può essere negativo").default(0),
  notes: z.string().optional(),
});

type GuestEntryFormData = z.infer<typeof guestEntryFormSchema>;

const guestListFormSchema = z.object({
  name: z.string().min(1, "Nome lista obbligatorio"),
  maxGuests: z.coerce.number().min(1, "Minimo 1 ospite").optional(),
  description: z.string().optional(),
});

type GuestListFormData = z.infer<typeof guestListFormSchema>;

export default function PrGuestListsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showQrFor, setShowQrFor] = useState<string | null>(null);

  // Fetch PR assignments to get events they can work on
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery<EventStaffAssignment[]>({
    queryKey: ["/api/pr/my-assignments"],
  });

  // Fetch events for assigned events
  const { data: events = [], isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    select: (data: Event[]) => {
      // Filter events that user is assigned to or all if gestore
      if (user?.role === 'gestore' || user?.role === 'super_admin') {
        return data;
      }
      const assignedEventIds = assignments.map(a => a.eventId);
      return data.filter(e => assignedEventIds.includes(e.id));
    },
  });

  // Fetch guest lists for selected event
  const { data: guestLists = [], isLoading: loadingLists, refetch: refetchLists } = useQuery<GuestList[]>({
    queryKey: ["/api/pr/events", selectedEventId, "guest-lists"],
    enabled: !!selectedEventId,
  });

  // Fetch entries for selected list
  const { data: entries = [], isLoading: loadingEntries, refetch: refetchEntries } = useQuery<GuestListEntry[]>({
    queryKey: ["/api/pr/guest-lists", selectedListId, "entries"],
    enabled: !!selectedListId,
  });

  // Get selected list details
  const selectedList = useMemo(() => 
    guestLists.find(l => l.id === selectedListId),
    [guestLists, selectedListId]
  );

  // Get selected event details
  const selectedEvent = useMemo(() =>
    events.find(e => e.id === selectedEventId),
    [events, selectedEventId]
  );

  // Filter entries by search
  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(e =>
      e.firstName.toLowerCase().includes(query) ||
      e.lastName.toLowerCase().includes(query) ||
      (e.email && e.email.toLowerCase().includes(query)) ||
      (e.phone && e.phone.includes(query))
    );
  }, [entries, searchQuery]);

  // Forms
  const guestForm = useForm<GuestEntryFormData>({
    resolver: zodResolver(guestEntryFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      plusOnes: 0,
      notes: "",
    },
  });

  const listForm = useForm<GuestListFormData>({
    resolver: zodResolver(guestListFormSchema),
    defaultValues: {
      name: "",
      maxGuests: undefined,
      description: "",
    },
  });

  // Mutations
  const createListMutation = useMutation({
    mutationFn: async (data: GuestListFormData) => {
      const response = await apiRequest("POST", `/api/pr/events/${selectedEventId}/guest-lists`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Lista creata", description: "La nuova lista è stata creata" });
      setIsCreateListOpen(false);
      listForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "guest-lists"] });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const addGuestMutation = useMutation({
    mutationFn: async (data: GuestEntryFormData) => {
      const response = await apiRequest("POST", `/api/pr/guest-lists/${selectedListId}/entries`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Ospite aggiunto", description: "L'ospite è stato aggiunto alla lista" });
      setIsAddGuestOpen(false);
      guestForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/pr/guest-lists", selectedListId, "entries"] });
      refetchLists();
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateGuestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GuestEntryFormData> & { status?: string } }) => {
      const response = await apiRequest("PATCH", `/api/pr/guest-entries/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Ospite aggiornato" });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/guest-lists", selectedListId, "entries"] });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteGuestMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pr/guest-entries/${id}`, undefined);
    },
    onSuccess: () => {
      toast({ title: "Ospite rimosso" });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/guest-lists", selectedListId, "entries"] });
      refetchLists();
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500"><Clock className="w-3 h-3 mr-1" />In Attesa</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500"><CheckCircle2 className="w-3 h-3 mr-1" />Confermato</Badge>;
      case 'arrived':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500"><PartyPopper className="w-3 h-3 mr-1" />Arrivato</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500"><XCircle className="w-3 h-3 mr-1" />Cancellato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loadingAssignments || loadingEvents) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
            Liste Ospiti
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gestisci le liste ospiti per i tuoi eventi
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              refetchLists();
              refetchEntries();
            }}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Event and List Selection */}
      <Card>
        <CardContent className="p-3 sm:p-4 md:pt-6">
          <div className="grid gap-2 sm:gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleziona Evento</label>
              <Select value={selectedEventId} onValueChange={(val) => {
                setSelectedEventId(val);
                setSelectedListId("");
              }}>
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
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Seleziona Lista</label>
                {selectedEventId && (
                  <Dialog open={isCreateListOpen} onOpenChange={setIsCreateListOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid="button-create-list">
                        <Plus className="w-4 h-4 mr-1" />
                        Nuova
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crea Nuova Lista</DialogTitle>
                        <DialogDescription>
                          Crea una nuova lista ospiti per l'evento
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...listForm}>
                        <form onSubmit={listForm.handleSubmit((data) => createListMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={listForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome Lista</FormLabel>
                                <FormControl>
                                  <Input placeholder="Es: VIP, Friends & Family" {...field} data-testid="input-list-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={listForm.control}
                            name="maxGuests"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Limite Ospiti (opzionale)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="Nessun limite" {...field} data-testid="input-max-guests" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={listForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Descrizione (opzionale)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Note sulla lista" {...field} data-testid="input-list-description" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button type="submit" disabled={createListMutation.isPending} data-testid="button-submit-list">
                              {createListMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                              Crea Lista
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <Select value={selectedListId} onValueChange={setSelectedListId} disabled={!selectedEventId}>
                <SelectTrigger data-testid="select-list">
                  <SelectValue placeholder={selectedEventId ? "Scegli una lista" : "Prima seleziona un evento"} />
                </SelectTrigger>
                <SelectContent>
                  {loadingLists ? (
                    <div className="p-2 text-center text-muted-foreground">Caricamento...</div>
                  ) : guestLists.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">Nessuna lista trovata</div>
                  ) : (
                    guestLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name} ({list.currentCount}{list.maxGuests ? `/${list.maxGuests}` : ''})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List Stats */}
      {selectedList && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ospiti Totali</p>
                  <p className="text-2xl font-bold">{selectedList.currentCount}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              {selectedList.maxGuests && (
                <Progress value={(selectedList.currentCount / selectedList.maxGuests) * 100} className="mt-2" />
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Confermati</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {entries.filter(e => e.status === 'confirmed').length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Arrivati</p>
                  <p className="text-2xl font-bold text-green-500">
                    {entries.filter(e => e.status === 'arrived').length}
                  </p>
                </div>
                <PartyPopper className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">+1 Totali</p>
                  <p className="text-2xl font-bold text-purple-500">
                    {entries.reduce((sum, e) => sum + e.plusOnes, 0)}
                  </p>
                </div>
                <UserPlus className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Guest List Table */}
      {selectedListId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>{selectedList?.name}</CardTitle>
                <CardDescription>
                  {selectedEvent?.name} - {selectedEvent && format(new Date(selectedEvent.startDatetime), "d MMMM yyyy", { locale: it })}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca ospite..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full md:w-64"
                    data-testid="input-search-guest"
                  />
                </div>
                <Dialog open={isAddGuestOpen} onOpenChange={setIsAddGuestOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!selectedList?.isActive} data-testid="button-add-guest">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Aggiungi Ospite
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Aggiungi Ospite</DialogTitle>
                      <DialogDescription>
                        Aggiungi un nuovo ospite alla lista {selectedList?.name}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...guestForm}>
                      <form onSubmit={guestForm.handleSubmit((data) => addGuestMutation.mutate(data))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={guestForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome</FormLabel>
                                <FormControl>
                                  <Input placeholder="Nome" {...field} data-testid="input-guest-firstname" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={guestForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cognome</FormLabel>
                                <FormControl>
                                  <Input placeholder="Cognome" {...field} data-testid="input-guest-lastname" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={guestForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email (opzionale)</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="email@example.com" {...field} data-testid="input-guest-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={guestForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefono (opzionale)</FormLabel>
                              <FormControl>
                                <Input placeholder="+39 333 1234567" {...field} data-testid="input-guest-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={guestForm.control}
                          name="plusOnes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Accompagnatori (+1)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} data-testid="input-guest-plusones" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={guestForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Note (opzionale)</FormLabel>
                              <FormControl>
                                <Input placeholder="Note aggiuntive" {...field} data-testid="input-guest-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={addGuestMutation.isPending} data-testid="button-submit-guest">
                            {addGuestMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Aggiungi Ospite
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingEntries ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nessun ospite</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Nessun risultato per la ricerca" : "Aggiungi il primo ospite alla lista"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ospite</TableHead>
                      <TableHead className="hidden md:table-cell">Contatto</TableHead>
                      <TableHead className="text-center">+1</TableHead>
                      <TableHead className="text-center">Stato</TableHead>
                      <TableHead className="text-center">QR</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id} data-testid={`row-guest-${entry.id}`}>
                        <TableCell>
                          <div className="font-medium">{entry.firstName} {entry.lastName}</div>
                          {entry.notes && (
                            <div className="text-xs text-muted-foreground">{entry.notes}</div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm space-y-1">
                            {entry.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                {entry.email}
                              </div>
                            )}
                            {entry.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {entry.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.plusOnes > 0 ? (
                            <Badge variant="secondary">+{entry.plusOnes}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(entry.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.qrCode && (
                            <Dialog open={showQrFor === entry.id} onOpenChange={(open) => setShowQrFor(open ? entry.id : null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-show-qr-${entry.id}`}>
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>QR Code - {entry.firstName} {entry.lastName}</DialogTitle>
                                  <DialogDescription>
                                    Mostra questo QR all'ingresso per il check-in
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col items-center space-y-4 p-6">
                                  <div className="bg-white p-4 rounded-lg">
                                    {/* QR Code placeholder - in production use a QR library */}
                                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                                      <div className="text-center">
                                        <QrCode className="w-24 h-24 mx-auto text-gray-600" />
                                        <p className="text-xs mt-2 font-mono break-all">{entry.qrCode}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <p className="font-semibold">{entry.firstName} {entry.lastName}</p>
                                    {entry.plusOnes > 0 && (
                                      <p className="text-sm text-muted-foreground">+{entry.plusOnes} accompagnatori</p>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-menu-${entry.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => updateGuestMutation.mutate({ id: entry.id, data: { status: 'confirmed' } })}
                                data-testid={`action-confirm-${entry.id}`}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Conferma
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateGuestMutation.mutate({ id: entry.id, data: { status: 'cancelled' } })}
                                className="text-red-600"
                                data-testid={`action-cancel-${entry.id}`}
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Cancella
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteGuestMutation.mutate(entry.id)}
                                className="text-destructive"
                                data-testid={`action-delete-${entry.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          {!selectedList?.isActive && (
            <CardFooter>
              <div className="w-full bg-yellow-500/10 border border-yellow-500/20 rounded-md p-4 text-center">
                <XCircle className="w-5 h-5 inline-block mr-2 text-yellow-500" />
                <span className="text-yellow-500 font-medium">Lista chiusa - Non è possibile aggiungere nuovi ospiti</span>
              </div>
            </CardFooter>
          )}
        </Card>
      )}

      {/* No Event Selected Message */}
      {!selectedEventId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Seleziona un evento</h3>
              <p className="text-muted-foreground">
                Scegli un evento dal menu sopra per gestire le liste ospiti
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No List Selected Message */}
      {selectedEventId && !selectedListId && guestLists.length > 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Seleziona una lista</h3>
              <p className="text-muted-foreground">
                Scegli una lista ospiti per visualizzare e gestire gli invitati
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
