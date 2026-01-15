import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  FloatingActionButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  UserPlus,
  ListChecks,
  Trash2,
  Clock,
  PartyPopper,
  Calendar,
  ChevronRight,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { GuestList, GuestListEntry, Event } from "@shared/schema";

interface MyEvent extends Event {
  assignmentType?: string;
  permissions?: {
    canAddToLists?: boolean;
    canProposeTables?: boolean;
    canManageLists?: boolean;
    canManageTables?: boolean;
    canCreatePr?: boolean;
    canApproveTables?: boolean;
  };
}

const guestEntryFormSchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  gender: z.enum(["M", "F"]).optional(),
  plusOnes: z.coerce.number().min(0, "Non può essere negativo").default(0),
  notes: z.string().optional(),
});

function GenderToggle({ value, onChange }: { value?: 'M' | 'F'; onChange: (v: 'M' | 'F') => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-border">
      <button
        type="button"
        className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
          value === 'M' ? 'bg-blue-600 text-white' : 'bg-transparent text-muted-foreground hover:bg-muted'
        }`}
        onClick={() => onChange('M')}
        data-testid="toggle-gender-m"
      >
        M
      </button>
      <button
        type="button"
        className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
          value === 'F' ? 'bg-pink-600 text-white' : 'bg-transparent text-muted-foreground hover:bg-muted'
        }`}
        onClick={() => onChange('F')}
        data-testid="toggle-gender-f"
      >
        F
      </button>
    </div>
  );
}

type GuestEntryFormData = z.infer<typeof guestEntryFormSchema>;

const guestListFormSchema = z.object({
  name: z.string().min(1, "Nome lista obbligatorio"),
  maxGuests: z.coerce.number().min(1, "Minimo 1 ospite").optional(),
  description: z.string().optional(),
});

type GuestListFormData = z.infer<typeof guestListFormSchema>;

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const listItemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      delay: i * 0.05,
    },
  }),
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};

export default function PrGuestListsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<GuestListEntry | null>(null);
  const [isAddGuestDialogOpen, setIsAddGuestDialogOpen] = useState(false);
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const [isGuestDetailDialogOpen, setIsGuestDetailDialogOpen] = useState(false);

  const { data: events = [], isLoading } = useQuery<MyEvent[]>({
    queryKey: ["/api/e4u/my-events"],
  });

  const { data: guestLists = [], isLoading: loadingLists, refetch: refetchLists } = useQuery<GuestList[]>({
    queryKey: ["/api/pr/events", selectedEventId, "guest-lists"],
    enabled: !!selectedEventId,
  });

  const { data: entries = [], isLoading: loadingEntries, refetch: refetchEntries } = useQuery<GuestListEntry[]>({
    queryKey: ["/api/pr/guest-lists", selectedListId, "entries"],
    enabled: !!selectedListId,
  });

  const selectedList = useMemo(() => 
    guestLists.find(l => l.id === selectedListId),
    [guestLists, selectedListId]
  );

  const selectedEvent = useMemo(() =>
    events.find(e => e.id === selectedEventId),
    [events, selectedEventId]
  );

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

  const stats = useMemo(() => ({
    total: entries.length,
    confirmed: entries.filter(e => e.status === 'confirmed').length,
    arrived: entries.filter(e => e.status === 'arrived').length,
    pending: entries.filter(e => e.status === 'pending').length,
    plusOnes: entries.reduce((sum, e) => sum + e.plusOnes, 0),
  }), [entries]);

  const guestForm = useForm<GuestEntryFormData>({
    resolver: zodResolver(guestEntryFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: undefined,
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

  const createListMutation = useMutation({
    mutationFn: async (data: GuestListFormData) => {
      const response = await apiRequest("POST", `/api/pr/events/${selectedEventId}/guest-lists`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Lista creata", description: "La nuova lista è stata creata" });
      setIsCreateListOpen(false);
      listForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "guest-lists"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const addGuestMutation = useMutation({
    mutationFn: async (data: GuestEntryFormData) => {
      const response = await apiRequest("POST", `/api/pr/guest-lists/${selectedListId}/entries`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Ospite aggiunto", description: "L'ospite è stato aggiunto alla lista" });
      setIsAddGuestOpen(false);
      guestForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/pr/guest-lists", selectedListId, "entries"] });
      refetchLists();
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateGuestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GuestEntryFormData> & { status?: string } }) => {
      const response = await apiRequest("PATCH", `/api/pr/guest-entries/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Ospite aggiornato" });
      setSelectedGuest(null);
      queryClient.invalidateQueries({ queryKey: ["/api/pr/guest-lists", selectedListId, "entries"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteGuestMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pr/guest-entries/${id}`, undefined);
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Ospite rimosso" });
      setSelectedGuest(null);
      queryClient.invalidateQueries({ queryKey: ["/api/pr/guest-lists", selectedListId, "entries"] });
      refetchLists();
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "In Attesa" };
      case 'confirmed':
        return { icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10", label: "Confermato" };
      case 'arrived':
        return { icon: PartyPopper, color: "text-green-500", bg: "bg-green-500/10", label: "Arrivato" };
      case 'cancelled':
        return { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Cancellato" };
      default:
        return { icon: Clock, color: "text-muted-foreground", bg: "bg-muted", label: status };
    }
  };

  if (isLoading) {
    if (!isMobile) {
      return (
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      );
    }
    return (
      <MobileAppLayout>
        <div className="p-4 space-y-4 pb-24">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </MobileAppLayout>
    );
  }

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-pr-guest-lists">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Liste Ospiti</h1>
            <p className="text-muted-foreground">Gestione ospiti per eventi PR</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                refetchLists();
                refetchEntries();
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Aggiorna
            </Button>
            {selectedEventId && (
              <Button onClick={() => setIsCreateListDialogOpen(true)} data-testid="button-create-list">
                <Plus className="w-4 h-4 mr-2" />
                Nuova Lista
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Evento</label>
            <Select value={selectedEventId} onValueChange={(val) => {
              setSelectedEventId(val);
              setSelectedListId("");
            }}>
              <SelectTrigger data-testid="select-event">
                <SelectValue placeholder="Seleziona evento" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    <div>
                      <div className="font-semibold">{event.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(event.startDatetime), "d MMM yyyy", { locale: it })}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Lista</label>
            <Select value={selectedListId} onValueChange={setSelectedListId} disabled={!selectedEventId}>
              <SelectTrigger data-testid="select-list">
                <SelectValue placeholder={selectedEventId ? "Seleziona lista" : "Prima scegli evento"} />
              </SelectTrigger>
              <SelectContent>
                {loadingLists ? (
                  <div className="p-4 text-center text-muted-foreground">Caricamento...</div>
                ) : guestLists.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">Nessuna lista</div>
                ) : (
                  guestLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      <div>
                        <div className="font-semibold">{list.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {list.currentCount}{list.maxGuests ? `/${list.maxGuests}` : ''} ospiti
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedList && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">{stats.total}</div>
                      <p className="text-sm text-muted-foreground">Totali</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <PartyPopper className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold text-green-500">{stats.arrived}</div>
                      <p className="text-sm text-muted-foreground">Arrivati</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold text-blue-500">{stats.confirmed}</div>
                      <p className="text-sm text-muted-foreground">Confermati</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
                      <p className="text-sm text-muted-foreground">In Attesa</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <UserPlus className="h-5 w-5 text-purple-500" />
                    <div>
                      <div className="text-2xl font-bold text-purple-500">{stats.plusOnes}</div>
                      <p className="text-sm text-muted-foreground">+1</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {selectedList.maxGuests && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Capienza Lista</span>
                    <span className="text-sm text-muted-foreground">
                      {selectedList.currentCount}/{selectedList.maxGuests}
                    </span>
                  </div>
                  <Progress value={(selectedList.currentCount / selectedList.maxGuests) * 100} />
                </CardContent>
              </Card>
            )}
          </>
        )}

        {selectedListId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle>Ospiti</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca ospite..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                    data-testid="input-search-guest"
                  />
                </div>
                {selectedList?.isActive && (
                  <Button onClick={() => setIsAddGuestDialogOpen(true)} data-testid="button-add-guest">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Aggiungi Ospite
                  </Button>
                )}
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
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    {searchQuery ? "Nessun risultato" : "Lista vuota"}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "Prova a cercare qualcos'altro" : "Aggiungi il primo ospite alla lista"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contatto</TableHead>
                      <TableHead>+1</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((guest) => {
                      const statusConfig = getStatusConfig(guest.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <TableRow key={guest.id} data-testid={`row-guest-${guest.id}`}>
                          <TableCell>
                            <div className="font-medium">{guest.firstName} {guest.lastName}</div>
                            {guest.notes && (
                              <div className="text-sm text-muted-foreground">{guest.notes}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {guest.phone && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3" />
                                  {guest.phone}
                                </div>
                              )}
                              {guest.email && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3" />
                                  {guest.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {guest.plusOnes > 0 ? (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-0">
                                +{guest.plusOnes}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedGuest(guest);
                                setIsGuestDetailDialogOpen(true);
                              }}
                              data-testid={`button-view-${guest.id}`}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedListId && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Seleziona una Lista</h3>
                <p className="text-muted-foreground">Scegli un evento e una lista per vedere gli ospiti</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={isCreateListDialogOpen} onOpenChange={setIsCreateListDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea Nuova Lista</DialogTitle>
              <DialogDescription>Crea una nuova lista ospiti per l'evento selezionato</DialogDescription>
            </DialogHeader>
            <Form {...listForm}>
              <form onSubmit={listForm.handleSubmit((data) => {
                createListMutation.mutate(data);
                setIsCreateListDialogOpen(false);
              })} className="space-y-4">
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
                  <Button type="button" variant="outline" onClick={() => setIsCreateListDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={createListMutation.isPending} data-testid="button-submit-list">
                    {createListMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Crea Lista
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddGuestDialogOpen} onOpenChange={setIsAddGuestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Ospite</DialogTitle>
              <DialogDescription>Aggiungi un nuovo ospite alla lista</DialogDescription>
            </DialogHeader>
            <Form {...guestForm}>
              <form onSubmit={guestForm.handleSubmit((data) => {
                addGuestMutation.mutate(data);
                setIsAddGuestDialogOpen(false);
              })} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sesso</FormLabel>
                      <FormControl>
                        <GenderToggle
                          value={field.value}
                          onChange={(v) => field.onChange(v)}
                        />
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
                        <Input type="number" min={0} {...field} data-testid="input-guest-plusones" />
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
                  <Button type="button" variant="outline" onClick={() => setIsAddGuestDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={addGuestMutation.isPending} data-testid="button-submit-guest">
                    {addGuestMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Aggiungi Ospite
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isGuestDetailDialogOpen} onOpenChange={setIsGuestDetailDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Dettagli Ospite</DialogTitle>
            </DialogHeader>
            {selectedGuest && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedGuest.firstName} {selectedGuest.lastName}</h3>
                    <Badge variant="outline" className={`${getStatusConfig(selectedGuest.status).bg} ${getStatusConfig(selectedGuest.status).color} border-0 mt-1`}>
                      {getStatusConfig(selectedGuest.status).label}
                    </Badge>
                  </div>
                </div>

                {(selectedGuest.email || selectedGuest.phone) && (
                  <div className="space-y-2">
                    {selectedGuest.phone && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedGuest.phone}</span>
                      </div>
                    )}
                    {selectedGuest.email && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedGuest.email}</span>
                      </div>
                    )}
                  </div>
                )}

                {selectedGuest.plusOnes > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg">
                    <UserPlus className="h-4 w-4 text-purple-500" />
                    <span>{selectedGuest.plusOnes} accompagnatori</span>
                  </div>
                )}

                {selectedGuest.notes && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Note</p>
                    <p>{selectedGuest.notes}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Cambia Stato</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {['pending', 'confirmed', 'arrived', 'cancelled'].map((status) => {
                      const config = getStatusConfig(status);
                      const Icon = config.icon;
                      const isActive = selectedGuest.status === status;
                      return (
                        <Button
                          key={status}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          className="justify-start gap-2"
                          onClick={() => updateGuestMutation.mutate({
                            id: selectedGuest.id,
                            data: { status }
                          })}
                          disabled={updateGuestMutation.isPending}
                          data-testid={`button-status-${status}`}
                        >
                          <Icon className={`h-4 w-4 ${isActive ? '' : config.color}`} />
                          {config.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full text-red-500 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => {
                    if (confirm("Rimuovere questo ospite dalla lista?")) {
                      deleteGuestMutation.mutate(selectedGuest.id);
                      setIsGuestDetailDialogOpen(false);
                    }
                  }}
                  disabled={deleteGuestMutation.isPending}
                  data-testid="button-delete-guest"
                >
                  {deleteGuestMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Rimuovi Ospite
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const headerContent = (
    <div className="px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springTransition}
            className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0"
          >
            <ListChecks className="h-6 w-6 text-primary" />
          </motion.div>
          <div className="min-w-0">
            <h1 className="font-bold text-xl truncate">Liste Ospiti</h1>
            {selectedEvent && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {selectedEvent.name}
              </p>
            )}
          </div>
        </div>
        <HapticButton
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-2xl"
          onClick={() => {
            refetchLists();
            refetchEntries();
          }}
          data-testid="button-refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </HapticButton>
      </div>
    </div>
  );

  return (
    <MobileAppLayout header={headerContent} noPadding>
      <div className="flex flex-col h-full pb-24">
        <div className="p-4 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springTransition}
            className="space-y-3"
          >
            <Select value={selectedEventId} onValueChange={(val) => {
              triggerHaptic('light');
              setSelectedEventId(val);
              setSelectedListId("");
            }}>
              <SelectTrigger className="h-16 rounded-2xl text-base bg-card/50 backdrop-blur-sm border-border/50" data-testid="select-event">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <SelectValue placeholder="Seleziona evento" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id} className="min-h-[52px]">
                    <div className="py-2">
                      <div className="font-semibold">{event.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(event.startDatetime), "d MMM yyyy", { locale: it })}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-3">
              <Select value={selectedListId} onValueChange={(val) => {
                triggerHaptic('light');
                setSelectedListId(val);
              }} disabled={!selectedEventId}>
                <SelectTrigger className="h-16 rounded-2xl text-base flex-1 bg-card/50 backdrop-blur-sm border-border/50" data-testid="select-list">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-500" />
                    </div>
                    <SelectValue placeholder={selectedEventId ? "Seleziona lista" : "Prima scegli evento"} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {loadingLists ? (
                    <div className="p-4 text-center text-muted-foreground">Caricamento...</div>
                  ) : guestLists.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">Nessuna lista</div>
                  ) : (
                    guestLists.map((list) => (
                      <SelectItem key={list.id} value={list.id} className="min-h-[52px]">
                        <div className="py-2">
                          <div className="font-semibold">{list.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {list.currentCount}{list.maxGuests ? `/${list.maxGuests}` : ''} ospiti
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {selectedEventId && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={springTransition}
                >
                  <HapticButton
                    variant="outline"
                    size="icon"
                    className="h-16 w-16 rounded-2xl flex-shrink-0 bg-card/50 backdrop-blur-sm border-border/50"
                    onClick={() => setIsCreateListOpen(true)}
                    hapticType="medium"
                    data-testid="button-create-list"
                  >
                    <Plus className="h-7 w-7" />
                  </HapticButton>
                </motion.div>
              )}
            </div>
          </motion.div>

          {selectedList && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springTransition}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: 0 }}
                  className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border/30"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center">
                      <Users className="h-5 w-5 text-foreground" />
                    </div>
                    <p className="text-3xl font-bold">{stats.total}</p>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Totali</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: 0.05 }}
                  className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border/30"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <PartyPopper className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-green-500">{stats.arrived}</p>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Arrivati</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: 0.1 }}
                  className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border/30"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-blue-500">{stats.confirmed}</p>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Confermati</p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: 0.15 }}
                  className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border/30"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-purple-500">{stats.plusOnes}</p>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">+1</p>
                </motion.div>
              </div>

              {selectedList.maxGuests && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: 0.2 }}
                  className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border/30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Capienza</span>
                    <span className="text-sm text-muted-foreground">
                      {selectedList.currentCount}/{selectedList.maxGuests}
                    </span>
                  </div>
                  <Progress 
                    value={(selectedList.currentCount / selectedList.maxGuests) * 100} 
                    className="h-3 rounded-full" 
                  />
                </motion.div>
              )}
            </motion.div>
          )}

          {selectedListId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
              className="relative"
            >
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Cerca ospite..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-14 pr-4 rounded-2xl text-base bg-card/50 backdrop-blur-sm border-border/50"
                data-testid="input-search-guest"
              />
            </motion.div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
          {loadingEntries ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          ) : !selectedListId ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springTransition}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ ...springTransition, delay: 0.1 }}
                className="h-24 w-24 rounded-3xl bg-card/80 backdrop-blur-sm flex items-center justify-center mb-6 border border-border/30"
              >
                <ListChecks className="h-12 w-12 text-muted-foreground" />
              </motion.div>
              <h3 className="font-bold text-xl mb-2">Seleziona una Lista</h3>
              <p className="text-muted-foreground text-base px-8">
                Scegli un evento e una lista per vedere gli ospiti
              </p>
            </motion.div>
          ) : filteredEntries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springTransition}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ ...springTransition, delay: 0.1 }}
                className="h-24 w-24 rounded-3xl bg-card/80 backdrop-blur-sm flex items-center justify-center mb-6 border border-border/30"
              >
                <Users className="h-12 w-12 text-muted-foreground" />
              </motion.div>
              <h3 className="font-bold text-xl mb-2">
                {searchQuery ? "Nessun risultato" : "Lista vuota"}
              </h3>
              <p className="text-muted-foreground text-base px-8">
                {searchQuery ? "Prova a cercare qualcos'altro" : "Aggiungi il primo ospite alla lista"}
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredEntries.map((guest, index) => {
                const statusConfig = getStatusConfig(guest.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <motion.div
                    key={guest.id}
                    custom={index}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedGuest(guest);
                    }}
                    className="bg-card/80 backdrop-blur-sm rounded-2xl p-5 border border-border/30 cursor-pointer"
                    data-testid={`card-guest-${guest.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                        <User className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">
                          {guest.firstName} {guest.lastName}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className={`${statusConfig.bg} ${statusConfig.color} border-0 text-xs px-3 py-1`}
                          >
                            <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                            {statusConfig.label}
                          </Badge>
                          {guest.plusOnes > 0 && (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-0 text-xs px-3 py-1">
                              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                              +{guest.plusOnes}
                            </Badge>
                          )}
                        </div>
                        
                        {(guest.email || guest.phone) && (
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            {guest.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-4 w-4" />
                                <span className="truncate">{guest.phone}</span>
                              </div>
                            )}
                            {guest.email && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Mail className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{guest.email}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-6 w-6 text-muted-foreground/50 flex-shrink-0" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {selectedListId && selectedList?.isActive && (
        <FloatingActionButton
          onClick={() => setIsAddGuestOpen(true)}
          data-testid="fab-add-guest"
        >
          <Plus className="h-7 w-7" />
        </FloatingActionButton>
      )}

      <BottomSheet
        open={isAddGuestOpen}
        onClose={() => setIsAddGuestOpen(false)}
        title="Aggiungi Ospite"
      >
        <div className="p-5 space-y-5 pb-8">
          <Form {...guestForm}>
            <form onSubmit={guestForm.handleSubmit((data) => addGuestMutation.mutate(data))} className="space-y-5">
              <FormField
                control={guestForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Nome</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nome" 
                        className="h-14 rounded-2xl text-base" 
                        {...field} 
                        data-testid="input-guest-firstname" 
                      />
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
                    <FormLabel className="text-base">Cognome</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Cognome" 
                        className="h-14 rounded-2xl text-base" 
                        {...field} 
                        data-testid="input-guest-lastname" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={guestForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Email (opzionale)</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="email@example.com" 
                        className="h-14 rounded-2xl text-base" 
                        {...field} 
                        data-testid="input-guest-email" 
                      />
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
                    <FormLabel className="text-base">Telefono (opzionale)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+39 333 1234567" 
                        className="h-14 rounded-2xl text-base" 
                        {...field} 
                        data-testid="input-guest-phone" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={guestForm.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Sesso</FormLabel>
                    <FormControl>
                      <GenderToggle
                        value={field.value}
                        onChange={(v) => field.onChange(v)}
                      />
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
                    <FormLabel className="text-base">Accompagnatori (+1)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        className="h-14 rounded-2xl text-base" 
                        {...field} 
                        data-testid="input-guest-plusones" 
                      />
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
                    <FormLabel className="text-base">Note (opzionale)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Note aggiuntive" 
                        className="h-14 rounded-2xl text-base" 
                        {...field} 
                        data-testid="input-guest-notes" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <HapticButton 
                type="submit" 
                className="w-full h-14 rounded-2xl text-base font-semibold mt-6"
                disabled={addGuestMutation.isPending}
                hapticType="medium"
                data-testid="button-submit-guest"
              >
                {addGuestMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-5 h-5 mr-2" />
                )}
                Aggiungi Ospite
              </HapticButton>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isCreateListOpen}
        onClose={() => setIsCreateListOpen(false)}
        title="Crea Nuova Lista"
      >
        <div className="p-5 space-y-5 pb-8">
          <Form {...listForm}>
            <form onSubmit={listForm.handleSubmit((data) => createListMutation.mutate(data))} className="space-y-5">
              <FormField
                control={listForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Nome Lista</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Es: VIP, Friends & Family" 
                        className="h-14 rounded-2xl text-base" 
                        {...field} 
                        data-testid="input-list-name" 
                      />
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
                    <FormLabel className="text-base">Limite Ospiti (opzionale)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Nessun limite" 
                        className="h-14 rounded-2xl text-base" 
                        {...field} 
                        data-testid="input-max-guests" 
                      />
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
                    <FormLabel className="text-base">Descrizione (opzionale)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Note sulla lista" 
                        className="h-14 rounded-2xl text-base" 
                        {...field} 
                        data-testid="input-list-description" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <HapticButton 
                type="submit" 
                className="w-full h-14 rounded-2xl text-base font-semibold mt-6"
                disabled={createListMutation.isPending}
                hapticType="medium"
                data-testid="button-submit-list"
              >
                {createListMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5 mr-2" />
                )}
                Crea Lista
              </HapticButton>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={!!selectedGuest}
        onClose={() => setSelectedGuest(null)}
        title="Dettagli Ospite"
      >
        {selectedGuest && (
          <div className="p-5 space-y-6 pb-8">
            <div className="flex items-center gap-4">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springTransition}
                className="h-18 w-18 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
              >
                <User className="h-10 w-10 text-primary" />
              </motion.div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">
                  {selectedGuest.firstName} {selectedGuest.lastName}
                </h2>
                <div className="mt-2">
                  {(() => {
                    const config = getStatusConfig(selectedGuest.status);
                    const Icon = config.icon;
                    return (
                      <Badge variant="outline" className={`${config.bg} ${config.color} border-0 px-3 py-1`}>
                        <Icon className="w-4 h-4 mr-1.5" />
                        {config.label}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            </div>

            {(selectedGuest.email || selectedGuest.phone) && (
              <div className="space-y-3">
                {selectedGuest.phone && (
                  <motion.a 
                    href={`tel:${selectedGuest.phone}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...springTransition, delay: 0.1 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-4 p-4 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/30"
                    onClick={() => triggerHaptic('light')}
                  >
                    <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Phone className="h-6 w-6 text-green-500" />
                    </div>
                    <span className="font-semibold text-lg">{selectedGuest.phone}</span>
                  </motion.a>
                )}
                {selectedGuest.email && (
                  <motion.a 
                    href={`mailto:${selectedGuest.email}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...springTransition, delay: 0.15 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-4 p-4 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/30"
                    onClick={() => triggerHaptic('light')}
                  >
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Mail className="h-6 w-6 text-blue-500" />
                    </div>
                    <span className="font-semibold text-base truncate">{selectedGuest.email}</span>
                  </motion.a>
                )}
              </div>
            )}

            {selectedGuest.plusOnes > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: 0.2 }}
                className="flex items-center gap-4 p-4 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/30"
              >
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-purple-500" />
                </div>
                <span className="font-semibold text-lg">{selectedGuest.plusOnes} accompagnatori</span>
              </motion.div>
            )}

            {selectedGuest.notes && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: 0.25 }}
                className="p-4 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/30"
              >
                <p className="text-sm text-muted-foreground mb-2">Note</p>
                <p className="font-medium text-base">{selectedGuest.notes}</p>
              </motion.div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cambia Stato</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['pending', 'confirmed', 'arrived', 'cancelled'].map((status, idx) => {
                  const config = getStatusConfig(status);
                  const Icon = config.icon;
                  const isActive = selectedGuest.status === status;
                  
                  return (
                    <motion.div
                      key={status}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...springTransition, delay: 0.3 + idx * 0.05 }}
                    >
                      <HapticButton
                        variant={isActive ? "default" : "outline"}
                        className={`h-14 w-full rounded-2xl justify-start gap-3 ${isActive ? '' : 'bg-card/50 backdrop-blur-sm border-border/50'}`}
                        onClick={() => updateGuestMutation.mutate({ 
                          id: selectedGuest.id, 
                          data: { status } 
                        })}
                        disabled={updateGuestMutation.isPending}
                        hapticType="medium"
                        data-testid={`button-status-${status}`}
                      >
                        <Icon className={`h-5 w-5 ${isActive ? '' : config.color}`} />
                        <span className="font-semibold">{config.label}</span>
                      </HapticButton>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.5 }}
            >
              <HapticButton
                variant="outline"
                className="w-full h-14 rounded-2xl text-red-500 border-red-500/30 hover:bg-red-500/10"
                onClick={() => {
                  if (confirm("Rimuovere questo ospite dalla lista?")) {
                    deleteGuestMutation.mutate(selectedGuest.id);
                  }
                }}
                disabled={deleteGuestMutation.isPending}
                hapticType="heavy"
                data-testid="button-delete-guest"
              >
                {deleteGuestMutation.isPending ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5 mr-2" />
                )}
                Rimuovi Ospite
              </HapticButton>
            </motion.div>
          </div>
        )}
      </BottomSheet>
    </MobileAppLayout>
  );
}
