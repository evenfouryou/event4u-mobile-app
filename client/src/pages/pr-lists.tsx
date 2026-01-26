import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PrLayout, PrPageContainer } from "@/components/pr-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePrAuth } from "@/hooks/usePrAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Users,
  Plus,
  Search,
  Calendar,
  MapPin,
  Clock,
  UserPlus,
  Armchair,
  Phone,
  Mail,
  Trash2,
  Edit,
  ChevronRight,
  CheckCircle,
  XCircle,
  Filter,
} from "lucide-react";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { it } from "date-fns/locale";

interface PrEvent {
  id: string;
  eventId: string;
  eventName: string;
  eventStart: string;
  eventEnd: string | null;
  locationName: string;
  status: string;
}

interface GuestEntry {
  id: string;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  guestCount: number;
  listType: string;
  status: string;
  notes?: string;
  createdAt: string;
}

interface TableReservation {
  id: string;
  tableName: string;
  customerName: string;
  customerPhone?: string;
  guestCount: number;
  status: string;
  minimumSpend?: string;
  notes?: string;
  createdAt: string;
}

const guestFormSchema = z.object({
  eventId: z.string().min(1, "Seleziona un evento"),
  guestName: z.string().min(2, "Nome richiesto"),
  guestPhone: z.string().optional(),
  guestEmail: z.string().email("Email non valida").optional().or(z.literal("")),
  guestCount: z.coerce.number().min(1, "Almeno 1 ospite"),
  listType: z.string().default("standard"),
  notes: z.string().optional(),
});

type GuestFormData = z.infer<typeof guestFormSchema>;

export default function PrLists() {
  const { prProfile, isLoading: isLoadingProfile } = usePrAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"guests" | "tables">("guests");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddGuestDialog, setShowAddGuestDialog] = useState(false);

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      guestCount: 1,
      listType: "standard",
    },
  });

  // Fetch PR events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery<PrEvent[]>({
    queryKey: ["/api/pr/my-events"],
    enabled: !!prProfile,
  });

  // Fetch guests for selected event
  const { data: guests = [], isLoading: isLoadingGuests } = useQuery<GuestEntry[]>({
    queryKey: ["/api/pr/events", selectedEventId, "guests"],
    enabled: !!selectedEventId,
  });

  // Fetch table reservations for selected event
  const { data: tables = [], isLoading: isLoadingTables } = useQuery<TableReservation[]>({
    queryKey: ["/api/pr/events", selectedEventId, "tables"],
    enabled: !!selectedEventId,
  });

  // Add guest mutation
  const addGuestMutation = useMutation({
    mutationFn: async (data: GuestFormData) => {
      return apiRequest(`/api/pr/events/${data.eventId}/guests`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Ospite aggiunto!", description: "L'ospite è stato aggiunto alla lista." });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/stats"] });
      setShowAddGuestDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Errore", 
        description: error.message || "Impossibile aggiungere l'ospite.",
        variant: "destructive",
      });
    },
  });

  // Filter upcoming events
  const upcomingEvents = useMemo(() => {
    return events.filter(e => !isPast(new Date(e.eventEnd || e.eventStart)));
  }, [events]);

  // Filter guests by search
  const filteredGuests = useMemo(() => {
    if (!searchQuery) return guests;
    const query = searchQuery.toLowerCase();
    return guests.filter(g => 
      g.guestName.toLowerCase().includes(query) ||
      g.guestPhone?.includes(query) ||
      g.guestEmail?.toLowerCase().includes(query)
    );
  }, [guests, searchQuery]);

  // Filter tables by search
  const filteredTables = useMemo(() => {
    if (!searchQuery) return tables;
    const query = searchQuery.toLowerCase();
    return tables.filter(t => 
      t.customerName.toLowerCase().includes(query) ||
      t.tableName.toLowerCase().includes(query) ||
      t.customerPhone?.includes(query)
    );
  }, [tables, searchQuery]);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Oggi";
    if (isTomorrow(date)) return "Domani";
    return format(date, "EEE d MMM", { locale: it });
  };

  const onSubmitGuest = (data: GuestFormData) => {
    addGuestMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
      case "entered":
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Confermato</Badge>;
      case "pending":
        return <Badge variant="secondary">In attesa</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Annullato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoadingProfile) {
    return (
      <PrLayout>
        <PrPageContainer>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </PrPageContainer>
      </PrLayout>
    );
  }

  return (
    <PrLayout>
      <PrPageContainer>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Liste & Tavoli</h1>
          <p className="text-muted-foreground">Gestisci ospiti e prenotazioni tavoli</p>
        </div>

        {/* Event Selector */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <label className="text-sm font-medium mb-2 block">Seleziona Evento</label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger data-testid="select-event">
                <SelectValue placeholder="Scegli un evento..." />
              </SelectTrigger>
              <SelectContent>
                {upcomingEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{event.eventName}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {formatEventDate(event.eventStart)}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
                {upcomingEvents.length === 0 && (
                  <SelectItem value="none" disabled>
                    Nessun evento disponibile
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedEventId && (
          <>
            {/* Selected Event Info */}
            {selectedEvent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{selectedEvent.eventName}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatEventDate(selectedEvent.eventStart)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(selectedEvent.eventStart), "HH:mm")}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {selectedEvent.locationName}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {guests.reduce((acc, g) => acc + g.guestCount, 0)} ospiti
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Armchair className="h-3 w-3" />
                          {tables.length} tavoli
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Search and Add */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome, telefono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Button
                onClick={() => {
                  form.setValue("eventId", selectedEventId);
                  setShowAddGuestDialog(true);
                }}
                className="gap-2"
                data-testid="button-add-guest"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Aggiungi</span>
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "guests" | "tables")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="guests" className="gap-2" data-testid="tab-guests">
                  <Users className="h-4 w-4" />
                  Ospiti ({filteredGuests.length})
                </TabsTrigger>
                <TabsTrigger value="tables" className="gap-2" data-testid="tab-tables">
                  <Armchair className="h-4 w-4" />
                  Tavoli ({filteredTables.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="guests">
                <AnimatePresence mode="popLayout">
                  {isLoadingGuests ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : filteredGuests.length > 0 ? (
                    <div className="space-y-3">
                      {filteredGuests.map((guest, index) => (
                        <motion.div
                          key={guest.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="hover:border-primary/50 transition-colors">
                            <CardContent className="py-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{guest.guestName}</span>
                                    <Badge variant="outline" className="text-xs">
                                      +{guest.guestCount}
                                    </Badge>
                                    {getStatusBadge(guest.status)}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    {guest.guestPhone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {guest.guestPhone}
                                      </span>
                                    )}
                                    {guest.guestEmail && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {guest.guestEmail}
                                      </span>
                                    )}
                                    <Badge variant="secondary" className="text-xs capitalize">
                                      {guest.listType}
                                    </Badge>
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-12 text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <h3 className="font-medium mb-1">Nessun ospite</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Aggiungi il primo ospite alla lista
                        </p>
                        <Button
                          onClick={() => {
                            form.setValue("eventId", selectedEventId);
                            setShowAddGuestDialog(true);
                          }}
                          className="gap-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          Aggiungi Ospite
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="tables">
                <AnimatePresence mode="popLayout">
                  {isLoadingTables ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : filteredTables.length > 0 ? (
                    <div className="space-y-3">
                      {filteredTables.map((table, index) => (
                        <motion.div
                          key={table.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="hover:border-primary/50 transition-colors">
                            <CardContent className="py-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                                      {table.tableName}
                                    </Badge>
                                    <span className="font-medium">{table.customerName}</span>
                                    {getStatusBadge(table.status)}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {table.guestCount} persone
                                    </span>
                                    {table.customerPhone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {table.customerPhone}
                                      </span>
                                    )}
                                    {table.minimumSpend && (
                                      <span className="text-primary font-medium">
                                        Min. €{table.minimumSpend}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-12 text-center">
                        <Armchair className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <h3 className="font-medium mb-1">Nessun tavolo prenotato</h3>
                        <p className="text-sm text-muted-foreground">
                          Le prenotazioni tavoli appariranno qui
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </>
        )}

        {!selectedEventId && upcomingEvents.length > 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium mb-1">Seleziona un evento</h3>
              <p className="text-sm text-muted-foreground">
                Scegli un evento per gestire le liste ospiti e i tavoli
              </p>
            </CardContent>
          </Card>
        )}

        {!selectedEventId && upcomingEvents.length === 0 && !isLoadingEvents && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium mb-1">Nessun evento disponibile</h3>
              <p className="text-sm text-muted-foreground">
                Non hai eventi assegnati al momento
              </p>
            </CardContent>
          </Card>
        )}

        {/* Add Guest Dialog */}
        <Dialog open={showAddGuestDialog} onOpenChange={setShowAddGuestDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Ospite</DialogTitle>
              <DialogDescription>
                Inserisci i dati dell'ospite da aggiungere alla lista
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitGuest)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="guestName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome e Cognome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Mario Rossi" {...field} data-testid="input-guest-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="guestPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input placeholder="+39 333..." {...field} data-testid="input-guest-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guestCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numero ospiti *</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} data-testid="input-guest-count" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="guestEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@esempio.com" {...field} data-testid="input-guest-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="listType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Lista</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-list-type">
                            <SelectValue placeholder="Seleziona tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="vip">VIP</SelectItem>
                          <SelectItem value="backstage">Backstage</SelectItem>
                          <SelectItem value="press">Press</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Input placeholder="Note opzionali..." {...field} data-testid="input-guest-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddGuestDialog(false)}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={addGuestMutation.isPending}
                    data-testid="button-submit-guest"
                  >
                    {addGuestMutation.isPending ? "Salvataggio..." : "Aggiungi Ospite"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </PrPageContainer>
    </PrLayout>
  );
}
