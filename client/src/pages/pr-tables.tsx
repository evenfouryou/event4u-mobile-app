import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  MobileAppLayout,
  MobileHeader,
  BottomSheet,
  HapticButton,
  FloatingActionButton,
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
import {
  Plus,
  Search,
  Calendar,
  Loader2,
  RefreshCw,
  Armchair,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  DollarSign,
  MapPin,
  ChevronDown,
  Edit,
  Phone,
  Mail,
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

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export default function PrTablesPage() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isBookTableOpen, setIsBookTableOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("");
  const [isEventSelectorOpen, setIsEventSelectorOpen] = useState(false);

  const { data: events = [], isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: tables = [], isLoading: loadingTables, refetch: refetchTables } = useQuery<EventTable[]>({
    queryKey: ["/api/pr/events", selectedEventId, "tables"],
    enabled: !!selectedEventId,
  });

  const { data: bookings = [], refetch: refetchBookings } = useQuery<TableBooking[]>({
    queryKey: ["/api/pr/events", selectedEventId, "bookings"],
    enabled: !!selectedEventId,
  });

  const selectedEvent = useMemo(() =>
    events.find(e => e.id === selectedEventId),
    [events, selectedEventId]
  );

  const selectedTable = useMemo(() =>
    tables.find(t => t.id === selectedTableId),
    [tables, selectedTableId]
  );

  const tableTypes = useMemo(() =>
    Array.from(new Set(tables.map(t => t.tableType))).sort(),
    [tables]
  );

  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      const matchesSearch = !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tableType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesZone = !zoneFilter || t.tableType === zoneFilter;
      return matchesSearch && matchesZone;
    });
  }, [tables, searchQuery, zoneFilter]);

  const getTableBooking = (tableId: string) =>
    bookings.find(b => b.tableId === tableId && b.status !== 'cancelled');

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

  const createTableMutation = useMutation({
    mutationFn: async (data: TableFormData) => {
      const response = await apiRequest("POST", `/api/pr/events/${selectedEventId}/tables`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Tavolo creato" });
      setIsAddTableOpen(false);
      tableForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "tables"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EventTable> }) => {
      const response = await apiRequest("PATCH", `/api/pr/tables/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Tavolo aggiornato" });
      setIsActionsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "tables"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pr/tables/${id}`, undefined);
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Tavolo eliminato" });
      setIsActionsOpen(false);
      setSelectedTableId("");
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "tables"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
      triggerHaptic('success');
      toast({ title: "Prenotazione creata" });
      setIsBookTableOpen(false);
      bookingForm.reset();
      setSelectedTableId("");
      refetchTables();
      refetchBookings();
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TableBooking> }) => {
      const response = await apiRequest("PATCH", `/api/pr/bookings/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Prenotazione aggiornata" });
      setIsActionsOpen(false);
      refetchTables();
      refetchBookings();
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pr/bookings/${id}`, undefined);
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Prenotazione cancellata" });
      setIsActionsOpen(false);
      refetchTables();
      refetchBookings();
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'available':
        return { color: "bg-green-500", textColor: "text-green-500", label: "Disponibile", icon: CheckCircle2 };
      case 'reserved':
        return { color: "bg-blue-500", textColor: "text-blue-500", label: "Prenotato", icon: Clock };
      case 'occupied':
        return { color: "bg-amber-500", textColor: "text-amber-500", label: "Occupato", icon: Users };
      case 'blocked':
        return { color: "bg-red-500", textColor: "text-red-500", label: "Bloccato", icon: XCircle };
      default:
        return { color: "bg-muted", textColor: "text-muted-foreground", label: status, icon: Armchair };
    }
  };

  const getTableTypeLabel = (type: string) => {
    switch (type) {
      case 'standard': return 'Standard';
      case 'vip': return 'VIP';
      case 'prive': return 'Privé';
      default: return type;
    }
  };

  const stats = useMemo(() => ({
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    capacity: tables.reduce((sum, t) => sum + t.capacity, 0),
  }), [tables]);

  const handleTablePress = (table: EventTable) => {
    triggerHaptic('light');
    setSelectedTableId(table.id);
    setIsActionsOpen(true);
  };

  if (loadingEvents) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader title="Gestione Tavoli" />
        }
      >
        <div className="space-y-4 py-4 pb-24">
          <Skeleton className="h-16 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title="Gestione Tavoli"
          subtitle={selectedEvent ? format(new Date(selectedEvent.startDatetime), "d MMM yyyy", { locale: it }) : undefined}
          rightAction={
            <HapticButton
              variant="ghost"
              size="icon"
              onClick={() => {
                refetchTables();
                refetchBookings();
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </HapticButton>
          }
        />
      }
    >
      <div className="space-y-4 py-4 pb-24">
        <motion.button
          onClick={() => {
            triggerHaptic('light');
            setIsEventSelectorOpen(true);
          }}
          className="w-full flex items-center justify-between p-5 bg-card rounded-3xl border border-border min-h-[80px]"
          whileTap={{ scale: 0.97 }}
          transition={springTransition}
          data-testid="button-select-event"
        >
          <div className="flex items-center gap-4">
            <motion.div 
              className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              transition={springTransition}
            >
              <Calendar className="w-7 h-7 text-primary" />
            </motion.div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Evento Selezionato</p>
              <p className="font-bold text-lg">
                {selectedEvent ? selectedEvent.name : "Seleziona evento"}
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isEventSelectorOpen ? 180 : 0 }}
            transition={springTransition}
          >
            <ChevronDown className="w-6 h-6 text-muted-foreground" />
          </motion.div>
        </motion.button>

        {selectedEventId && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { label: "Totale", value: stats.total, color: "text-foreground", bgColor: "bg-muted/50" },
                { label: "Liberi", value: stats.available, color: "text-green-500", bgColor: "bg-green-500/10" },
                { label: "Prenotati", value: stats.reserved, color: "text-blue-500", bgColor: "bg-blue-500/10" },
                { label: "Posti Totali", value: stats.capacity, color: "text-purple-500", bgColor: "bg-purple-500/10" },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...springTransition, delay: idx * 0.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`${stat.bgColor} rounded-2xl p-4 text-center border border-border min-h-[80px] flex flex-col justify-center`}
                >
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>

            <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={springTransition}
                onClick={() => {
                  triggerHaptic('light');
                  setZoneFilter("");
                }}
                className={`flex-shrink-0 px-5 py-3 rounded-full text-base font-medium transition-colors min-h-[48px] ${
                  !zoneFilter 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                Tutti
              </motion.button>
              {tableTypes.map((type) => (
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.95 }}
                  transition={springTransition}
                  onClick={() => {
                    triggerHaptic('light');
                    setZoneFilter(type);
                  }}
                  className={`flex-shrink-0 px-5 py-3 rounded-full text-base font-medium transition-colors min-h-[48px] ${
                    zoneFilter === type
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-card border border-border text-muted-foreground"
                  }`}
                >
                  {getTableTypeLabel(type)}
                </motion.button>
              ))}
            </div>

            <motion.div 
              className="relative"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Cerca tavolo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 rounded-2xl bg-card border-border text-base"
                data-testid="input-search"
              />
            </motion.div>

            {loadingTables ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 rounded-3xl" />
                ))}
              </div>
            ) : filteredTables.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springTransition}
                className="text-center py-20"
              >
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={springTransition}
                  className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center"
                >
                  <Armchair className="h-12 w-12 text-muted-foreground" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">Nessun tavolo</h3>
                <p className="text-muted-foreground">
                  Aggiungi il primo tavolo per questo evento
                </p>
              </motion.div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {filteredTables.map((table) => {
                  const booking = getTableBooking(table.id);
                  const statusInfo = getStatusInfo(table.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <motion.div
                      key={table.id}
                      variants={cardVariants}
                      transition={springTransition}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleTablePress(table)}
                      className="bg-card rounded-3xl p-5 border border-border active:bg-muted/50 cursor-pointer min-h-[120px]"
                      data-testid={`card-table-${table.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <motion.div 
                          className={`w-16 h-16 rounded-2xl ${statusInfo.color}/10 flex items-center justify-center flex-shrink-0`}
                          whileHover={{ scale: 1.05 }}
                          transition={springTransition}
                        >
                          <Armchair className={`w-8 h-8 ${statusInfo.textColor}`} />
                        </motion.div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <h3 className="font-bold text-xl truncate">{table.name}</h3>
                            <Badge 
                              variant="outline" 
                              className={`${statusInfo.color}/10 ${statusInfo.textColor} border-0 flex-shrink-0 px-3 py-1.5`}
                            >
                              <StatusIcon className="w-4 h-4 mr-1.5" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-base text-muted-foreground mb-3">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {getTableTypeLabel(table.tableType)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Users className="w-4 h-4" />
                              {table.capacity} posti
                            </span>
                            {table.minSpend && (
                              <span className="flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4" />
                                Min €{table.minSpend}
                              </span>
                            )}
                          </div>
                          
                          {booking && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              transition={springTransition}
                              className="pt-3 border-t border-border"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Users className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold">{booking.customerName}</p>
                                  <p className="text-sm text-muted-foreground">{booking.guestsCount} ospiti</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </>
        )}

        {!selectedEventId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Seleziona un evento</h3>
            <p className="text-muted-foreground mb-6">
              Scegli un evento per gestire i tavoli
            </p>
            <HapticButton
              onClick={() => setIsEventSelectorOpen(true)}
              className="min-h-[48px] px-6"
              data-testid="button-select-event-cta"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Seleziona Evento
            </HapticButton>
          </motion.div>
        )}
      </div>

      {selectedEventId && (
        <FloatingActionButton
          onClick={() => setIsAddTableOpen(true)}
          data-testid="button-add-table-fab"
        >
          <Plus className="w-6 h-6" />
        </FloatingActionButton>
      )}

      <BottomSheet
        open={isEventSelectorOpen}
        onClose={() => setIsEventSelectorOpen(false)}
        title="Seleziona Evento"
      >
        <div className="p-4 space-y-3 pb-8">
          <AnimatePresence>
            {events.map((event, idx) => (
              <motion.button
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: idx * 0.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  triggerHaptic('medium');
                  setSelectedEventId(event.id);
                  setIsEventSelectorOpen(false);
                }}
                className={`w-full p-5 rounded-2xl text-left transition-colors min-h-[80px] ${
                  selectedEventId === event.id
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-card border border-border active:bg-muted"
                }`}
                data-testid={`button-event-${event.id}`}
              >
                <div className="flex items-center gap-4">
                  <motion.div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      selectedEventId === event.id ? "bg-primary/20" : "bg-muted"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    transition={springTransition}
                  >
                    <Calendar className={`w-7 h-7 ${selectedEventId === event.id ? "text-primary" : "text-muted-foreground"}`} />
                  </motion.div>
                  <div className="flex-1">
                    <p className="font-bold text-lg">{event.name}</p>
                    <p className="text-base text-muted-foreground">
                      {format(new Date(event.startDatetime), "d MMMM yyyy", { locale: it })}
                    </p>
                  </div>
                  {selectedEventId === event.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={springTransition}
                    >
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isAddTableOpen}
        onClose={() => setIsAddTableOpen(false)}
        title="Nuovo Tavolo"
      >
        <Form {...tableForm}>
          <form onSubmit={tableForm.handleSubmit((data) => createTableMutation.mutate(data))} className="p-4 space-y-4">
            <FormField
              control={tableForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Tavolo</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Es: Tavolo 1, VIP-1" 
                      {...field} 
                      className="h-12 rounded-xl text-base"
                      data-testid="input-table-name" 
                    />
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
                      <SelectTrigger className="h-12 rounded-xl" data-testid="input-table-type">
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
            
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={tableForm.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posti</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        className="h-12 rounded-xl text-base"
                        data-testid="input-capacity" 
                      />
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
                    <FormLabel>Min. Spesa (€)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        placeholder="Opzionale" 
                        {...field} 
                        className="h-12 rounded-xl text-base"
                        data-testid="input-minspend" 
                      />
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
                    <Input 
                      placeholder="Note aggiuntive" 
                      {...field} 
                      className="h-12 rounded-xl text-base"
                      data-testid="input-notes" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <HapticButton 
              type="submit" 
              disabled={createTableMutation.isPending}
              className="w-full h-14 rounded-xl text-base font-semibold"
              hapticType="success"
              data-testid="button-submit-table"
            >
              {createTableMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Crea Tavolo
                </>
              )}
            </HapticButton>
          </form>
        </Form>
      </BottomSheet>

      <BottomSheet
        open={isActionsOpen}
        onClose={() => {
          setIsActionsOpen(false);
          setSelectedTableId("");
        }}
        title={selectedTable?.name || "Azioni Tavolo"}
      >
        {selectedTable && (() => {
          const booking = getTableBooking(selectedTable.id);
          const statusInfo = getStatusInfo(selectedTable.status);

          return (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-2xl">
                <div className={`w-16 h-16 rounded-xl ${statusInfo.color}/10 flex items-center justify-center`}>
                  <Armchair className={`w-8 h-8 ${statusInfo.textColor}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedTable.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{getTableTypeLabel(selectedTable.tableType)}</span>
                    <span>•</span>
                    <span>{selectedTable.capacity} posti</span>
                  </div>
                  <Badge variant="outline" className={`mt-2 ${statusInfo.color}/10 ${statusInfo.textColor} border-0`}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>

              {booking && (
                <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
                  <h4 className="font-semibold">Prenotazione</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{booking.customerName}</p>
                        <p className="text-sm text-muted-foreground">{booking.guestsCount} ospiti</p>
                      </div>
                    </div>
                    {booking.customerPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-muted-foreground" />
                        <p className="text-sm">{booking.customerPhone}</p>
                      </div>
                    )}
                    {booking.customerEmail && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <p className="text-sm">{booking.customerEmail}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {selectedTable.status === 'available' && (
                  <>
                    <HapticButton
                      onClick={() => {
                        setIsActionsOpen(false);
                        setIsBookTableOpen(true);
                      }}
                      className="w-full h-14 rounded-xl justify-start text-base"
                      variant="outline"
                      hapticType="medium"
                      data-testid={`action-book-${selectedTable.id}`}
                    >
                      <Clock className="w-5 h-5 mr-3" />
                      Proponi Tavolo / Prenota
                    </HapticButton>
                    <HapticButton
                      onClick={() => updateTableMutation.mutate({ id: selectedTable.id, data: { status: 'blocked' } })}
                      className="w-full h-14 rounded-xl justify-start text-base"
                      variant="outline"
                      hapticType="medium"
                      data-testid={`action-block-${selectedTable.id}`}
                    >
                      <XCircle className="w-5 h-5 mr-3" />
                      Blocca Tavolo
                    </HapticButton>
                  </>
                )}

                {selectedTable.status === 'blocked' && (
                  <HapticButton
                    onClick={() => updateTableMutation.mutate({ id: selectedTable.id, data: { status: 'available' } })}
                    className="w-full h-14 rounded-xl justify-start text-base"
                    variant="outline"
                    hapticType="medium"
                    data-testid={`action-unblock-${selectedTable.id}`}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />
                    Sblocca Tavolo
                  </HapticButton>
                )}

                {selectedTable.status === 'reserved' && booking && (
                  <>
                    <HapticButton
                      onClick={() => updateBookingMutation.mutate({ id: booking.id, data: { status: 'arrived' } })}
                      className="w-full h-14 rounded-xl justify-start text-base bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                      variant="outline"
                      hapticType="success"
                      data-testid={`action-arrived-${selectedTable.id}`}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-3" />
                      Cliente Arrivato
                    </HapticButton>
                    <HapticButton
                      onClick={() => deleteBookingMutation.mutate(booking.id)}
                      className="w-full h-14 rounded-xl justify-start text-base text-red-500"
                      variant="outline"
                      hapticType="error"
                      data-testid={`action-cancel-booking-${selectedTable.id}`}
                    >
                      <Trash2 className="w-5 h-5 mr-3" />
                      Cancella Prenotazione
                    </HapticButton>
                  </>
                )}

                <HapticButton
                  onClick={() => {}}
                  className="w-full h-14 rounded-xl justify-start text-base"
                  variant="outline"
                  hapticType="light"
                >
                  <Edit className="w-5 h-5 mr-3" />
                  Modifica Tavolo
                </HapticButton>

                <HapticButton
                  onClick={() => deleteTableMutation.mutate(selectedTable.id)}
                  className="w-full h-14 rounded-xl justify-start text-base text-red-500"
                  variant="outline"
                  hapticType="error"
                  data-testid={`action-delete-${selectedTable.id}`}
                >
                  <Trash2 className="w-5 h-5 mr-3" />
                  Elimina Tavolo
                </HapticButton>
              </div>
            </div>
          );
        })()}
      </BottomSheet>

      <BottomSheet
        open={isBookTableOpen}
        onClose={() => {
          setIsBookTableOpen(false);
          setSelectedTableId("");
        }}
        title="Prenota Tavolo"
      >
        <Form {...bookingForm}>
          <form onSubmit={bookingForm.handleSubmit((data) => createBookingMutation.mutate(data))} className="p-4 space-y-4">
            <FormField
              control={bookingForm.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Cliente</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Nome completo" 
                      {...field} 
                      className="h-12 rounded-xl text-base"
                      data-testid="input-customer-name" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={bookingForm.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+39 333..." 
                        {...field} 
                        className="h-12 rounded-xl text-base"
                        data-testid="input-customer-phone" 
                      />
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
                    <FormLabel>Ospiti</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        className="h-12 rounded-xl text-base"
                        data-testid="input-guest-count" 
                      />
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
                    <Input 
                      type="email" 
                      placeholder="email@esempio.com" 
                      {...field} 
                      className="h-12 rounded-xl text-base"
                      data-testid="input-customer-email" 
                    />
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
                    <Input 
                      placeholder="Note aggiuntive" 
                      {...field} 
                      className="h-12 rounded-xl text-base"
                      data-testid="input-booking-notes" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <HapticButton 
              type="submit" 
              disabled={createBookingMutation.isPending}
              className="w-full h-14 rounded-xl text-base font-semibold"
              hapticType="success"
              data-testid="button-submit-booking"
            >
              {createBookingMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Conferma Prenotazione
                </>
              )}
            </HapticButton>
          </form>
        </Form>
      </BottomSheet>
    </MobileAppLayout>
  );
}
