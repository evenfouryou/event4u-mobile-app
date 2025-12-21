import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
  ChevronDown,
  User,
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

const springTransition = {
  type: "spring",
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
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<GuestListEntry | null>(null);

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery<EventStaffAssignment[]>({
    queryKey: ["/api/pr/my-assignments"],
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    select: (data: Event[]) => {
      if (user?.role === 'gestore' || user?.role === 'super_admin') {
        return data;
      }
      const assignedEventIds = assignments.map(a => a.eventId);
      return data.filter(e => assignedEventIds.includes(e.id));
    },
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

  if (loadingAssignments || loadingEvents) {
    return (
      <MobileAppLayout>
        <div className="p-4 space-y-4 pb-24">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </MobileAppLayout>
    );
  }

  const headerContent = (
    <div className="px-4 py-3 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ListChecks className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-lg truncate">Liste Ospiti</h1>
            {selectedEvent && (
              <p className="text-xs text-muted-foreground truncate">
                {selectedEvent.name}
              </p>
            )}
          </div>
        </div>
        <HapticButton
          variant="ghost"
          size="icon"
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
              <SelectTrigger className="h-14 rounded-2xl text-base" data-testid="select-event">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <SelectValue placeholder="Seleziona evento" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id} className="min-h-[44px]">
                    <div className="py-1">
                      <div className="font-medium">{event.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(event.startDatetime), "d MMM yyyy", { locale: it })}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Select value={selectedListId} onValueChange={(val) => {
                triggerHaptic('light');
                setSelectedListId(val);
              }} disabled={!selectedEventId}>
                <SelectTrigger className="h-14 rounded-2xl text-base flex-1" data-testid="select-list">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
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
                      <SelectItem key={list.id} value={list.id} className="min-h-[44px]">
                        <div className="py-1">
                          <div className="font-medium">{list.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {list.currentCount}{list.maxGuests ? `/${list.maxGuests}` : ''} ospiti
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {selectedEventId && (
                <HapticButton
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 rounded-2xl flex-shrink-0"
                  onClick={() => setIsCreateListOpen(true)}
                  hapticType="medium"
                  data-testid="button-create-list"
                >
                  <Plus className="h-6 w-6" />
                </HapticButton>
              )}
            </div>
          </motion.div>

          {selectedList && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springTransition}
              className="grid grid-cols-4 gap-2"
            >
              <div className="bg-card rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Totali</p>
              </div>
              <div className="bg-card rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-500">{stats.confirmed}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Conf.</p>
              </div>
              <div className="bg-card rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-green-500">{stats.arrived}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Arriv.</p>
              </div>
              <div className="bg-card rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-purple-500">{stats.plusOnes}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">+1</p>
              </div>
              {selectedList.maxGuests && (
                <div className="col-span-4">
                  <Progress 
                    value={(selectedList.currentCount / selectedList.maxGuests) * 100} 
                    className="h-2 rounded-full" 
                  />
                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                    {selectedList.currentCount}/{selectedList.maxGuests} posti
                  </p>
                </div>
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Cerca ospite..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-12 pr-4 rounded-2xl text-base bg-card border-0"
                data-testid="input-search-guest"
              />
            </motion.div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-3">
          {loadingEntries ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : !selectedListId ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <ListChecks className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Seleziona una Lista</h3>
              <p className="text-muted-foreground text-sm">
                Scegli un evento e una lista per vedere gli ospiti
              </p>
            </motion.div>
          ) : filteredEntries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                {searchQuery ? "Nessun risultato" : "Lista vuota"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? "Prova a cercare qualcos'altro" : "Aggiungi il primo ospite"}
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
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedGuest(guest);
                    }}
                    className="bg-card rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
                    data-testid={`card-guest-${guest.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-base truncate">
                              {guest.firstName} {guest.lastName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge 
                                variant="outline" 
                                className={`${statusConfig.bg} ${statusConfig.color} border-0 text-xs`}
                              >
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                              {guest.plusOnes > 0 && (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-0 text-xs">
                                  <UserPlus className="w-3 h-3 mr-1" />
                                  +{guest.plusOnes}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ChevronDown className="h-5 w-5 text-muted-foreground rotate-[-90deg] flex-shrink-0" />
                        </div>
                        
                        {(guest.email || guest.phone) && (
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {guest.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                <span className="truncate">{guest.phone}</span>
                              </div>
                            )}
                            {guest.email && (
                              <div className="flex items-center gap-1 min-w-0">
                                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{guest.email}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
          <Plus className="h-6 w-6" />
        </FloatingActionButton>
      )}

      <BottomSheet
        open={isAddGuestOpen}
        onClose={() => setIsAddGuestOpen(false)}
        title="Aggiungi Ospite"
      >
        <div className="p-4 space-y-4">
          <Form {...guestForm}>
            <form onSubmit={guestForm.handleSubmit((data) => addGuestMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={guestForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome" 
                          className="h-12 rounded-xl" 
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
                      <FormLabel>Cognome</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Cognome" 
                          className="h-12 rounded-xl" 
                          {...field} 
                          data-testid="input-guest-lastname" 
                        />
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
                      <Input 
                        type="email" 
                        placeholder="email@example.com" 
                        className="h-12 rounded-xl" 
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
                    <FormLabel>Telefono (opzionale)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+39 333 1234567" 
                        className="h-12 rounded-xl" 
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
                name="plusOnes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accompagnatori (+1)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        className="h-12 rounded-xl" 
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
                    <FormLabel>Note (opzionale)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Note aggiuntive" 
                        className="h-12 rounded-xl" 
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
                className="w-full h-14 rounded-2xl text-base font-semibold"
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
        <div className="p-4 space-y-4">
          <Form {...listForm}>
            <form onSubmit={listForm.handleSubmit((data) => createListMutation.mutate(data))} className="space-y-4">
              <FormField
                control={listForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Lista</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Es: VIP, Friends & Family" 
                        className="h-12 rounded-xl" 
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
                    <FormLabel>Limite Ospiti (opzionale)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Nessun limite" 
                        className="h-12 rounded-xl" 
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
                    <FormLabel>Descrizione (opzionale)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Note sulla lista" 
                        className="h-12 rounded-xl" 
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
                className="w-full h-14 rounded-2xl text-base font-semibold"
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
          <div className="p-4 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">
                  {selectedGuest.firstName} {selectedGuest.lastName}
                </h2>
                <div className="mt-1">
                  {(() => {
                    const config = getStatusConfig(selectedGuest.status);
                    const Icon = config.icon;
                    return (
                      <Badge variant="outline" className={`${config.bg} ${config.color} border-0`}>
                        <Icon className="w-3 h-3 mr-1" />
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
                  <a 
                    href={`tel:${selectedGuest.phone}`}
                    className="flex items-center gap-3 p-4 bg-card rounded-2xl active:scale-[0.98] transition-transform"
                    onClick={() => triggerHaptic('light')}
                  >
                    <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-green-500" />
                    </div>
                    <span className="font-medium">{selectedGuest.phone}</span>
                  </a>
                )}
                {selectedGuest.email && (
                  <a 
                    href={`mailto:${selectedGuest.email}`}
                    className="flex items-center gap-3 p-4 bg-card rounded-2xl active:scale-[0.98] transition-transform"
                    onClick={() => triggerHaptic('light')}
                  >
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-500" />
                    </div>
                    <span className="font-medium truncate">{selectedGuest.email}</span>
                  </a>
                )}
              </div>
            )}

            {selectedGuest.plusOnes > 0 && (
              <div className="flex items-center gap-3 p-4 bg-card rounded-2xl">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-purple-500" />
                </div>
                <span className="font-medium">{selectedGuest.plusOnes} accompagnatori</span>
              </div>
            )}

            {selectedGuest.notes && (
              <div className="p-4 bg-card rounded-2xl">
                <p className="text-sm text-muted-foreground mb-1">Note</p>
                <p className="font-medium">{selectedGuest.notes}</p>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Cambia Stato</p>
              <div className="grid grid-cols-2 gap-2">
                {['pending', 'confirmed', 'arrived', 'cancelled'].map((status) => {
                  const config = getStatusConfig(status);
                  const Icon = config.icon;
                  const isActive = selectedGuest.status === status;
                  
                  return (
                    <HapticButton
                      key={status}
                      variant={isActive ? "default" : "outline"}
                      className={`h-14 rounded-2xl justify-start gap-2 ${isActive ? '' : 'bg-card'}`}
                      onClick={() => updateGuestMutation.mutate({ 
                        id: selectedGuest.id, 
                        data: { status } 
                      })}
                      disabled={updateGuestMutation.isPending}
                      hapticType="medium"
                      data-testid={`button-status-${status}`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? '' : config.color}`} />
                      <span className="font-medium">{config.label}</span>
                    </HapticButton>
                  );
                })}
              </div>
            </div>

            <HapticButton
              variant="outline"
              className="w-full h-14 rounded-2xl text-red-500 border-red-500/20 hover:bg-red-500/10"
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
          </div>
        )}
      </BottomSheet>
    </MobileAppLayout>
  );
}
