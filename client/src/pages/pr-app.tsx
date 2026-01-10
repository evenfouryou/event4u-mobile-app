import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePrAuth } from "@/hooks/usePrAuth";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

import {
  HapticButton,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Home,
  Plus,
  Search,
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  UserPlus,
  PartyPopper,
  Calendar,
  MapPin,
  ArrowLeft,
  Users,
  Trash2,
  ChevronRight,
  Wallet,
  Euro,
  TrendingUp,
  Banknote,
  RefreshCw,
  Lock,
  LogOut,
  User,
  ArrowRightLeft,
  Building,
  ListChecks,
  Armchair,
  Clock,
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { it } from "date-fns/locale";
import type { GuestList, GuestListEntry, Event, EventTable, TableBooking, EventStaffAssignment } from "@shared/schema";
import { BrandLogo } from "@/components/brand-logo";

type MainTab = 'home' | 'wallet' | 'profilo';
type EventSubTab = 'liste' | 'tavoli';

interface CustomerSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  phone: string;
  birthDate: string | null;
}

interface WalletData {
  pendingEarnings: number;
  paidEarnings: number;
  totalEarnings: number;
  availableForPayout: number;
  thisMonthReservations: number;
  thisMonthEarnings: number;
  recentPayouts: Payout[];
}

interface Payout {
  id: string;
  amount: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  notes?: string;
  reservationCount?: number;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const guestEntryFormSchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  gender: z.enum(["M", "F"]).optional(),
  plusOnes: z.coerce.number().min(0, "Non può essere negativo").default(0),
  notes: z.string().optional(),
  customerId: z.string().optional(),
  birthDate: z.string().optional(),
});

type GuestEntryFormData = z.infer<typeof guestEntryFormSchema>;

const bookingFormSchema = z.object({
  customerName: z.string().min(1, "Nome cliente obbligatorio"),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email("Email non valida").optional().or(z.literal("")),
  guestsCount: z.coerce.number().min(1, "Minimo 1 ospite"),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export default function PrAppPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { 
    prProfile, 
    isLoading: authLoading, 
    isAuthenticated, 
    logout, 
    isLoggingOut, 
    changePassword, 
    isChangingPassword,
    myCompanies,
    hasMultipleCompanies,
    switchCompany,
    isSwitchingCompany,
  } = usePrAuth();
  
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventSubTab, setEventSubTab] = useState<EventSubTab>('liste');
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableTypeFilter, setTableTypeFilter] = useState<string>("");
  
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [isBookTableOpen, setIsBookTableOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  const [customerSearchPhone, setCustomerSearchPhone] = useState("");
  const [customerSearchResult, setCustomerSearchResult] = useState<CustomerSearchResult | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerNotFound, setCustomerNotFound] = useState(false);
  const [showNewCustomerFields, setShowNewCustomerFields] = useState(false);
  
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSwitchingToCustomer, setIsSwitchingToCustomer] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const debouncedPhone = useDebounce(customerSearchPhone, 500);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: assignments = [] } = useQuery<EventStaffAssignment[]>({
    queryKey: ["/api/pr/my-assignments"],
    enabled: isAuthenticated,
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: isAuthenticated,
    select: (data: Event[]) => {
      const assignedEventIds = assignments.map(a => a.eventId);
      return data.filter(e => assignedEventIds.includes(e.id));
    },
  });

  const { data: guestLists = [], isLoading: loadingLists, refetch: refetchLists } = useQuery<GuestList[]>({
    queryKey: ["/api/pr/events", selectedEventId, "guest-lists"],
    enabled: !!selectedEventId && isAuthenticated,
  });

  const { data: entries = [], isLoading: loadingEntries, refetch: refetchEntries } = useQuery<GuestListEntry[]>({
    queryKey: ["/api/pr/guest-lists", selectedListId, "entries"],
    enabled: !!selectedListId && isAuthenticated,
  });

  const { data: tables = [], isLoading: loadingTables, refetch: refetchTables } = useQuery<EventTable[]>({
    queryKey: ["/api/pr/events", selectedEventId, "tables"],
    enabled: !!selectedEventId && isAuthenticated,
  });

  const { data: bookings = [], refetch: refetchBookings } = useQuery<TableBooking[]>({
    queryKey: ["/api/pr/events", selectedEventId, "bookings"],
    enabled: !!selectedEventId && isAuthenticated,
  });

  const { data: wallet, isLoading: loadingWallet, refetch: refetchWallet, isRefetching: isRefetchingWallet } = useQuery<WalletData>({
    queryKey: ["/api/pr/wallet"],
    enabled: isAuthenticated,
  });

  const { data: allPayouts = [], isLoading: loadingPayouts } = useQuery<Payout[]>({
    queryKey: ["/api/pr/payouts"],
    enabled: isAuthenticated,
  });

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);
  const selectedList = useMemo(() => guestLists.find(l => l.id === selectedListId), [guestLists, selectedListId]);

  const tableTypes = useMemo(() => Array.from(new Set(tables.map(t => t.tableType))).sort(), [tables]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(e =>
      e.firstName.toLowerCase().includes(query) ||
      e.lastName.toLowerCase().includes(query) ||
      (e.phone && e.phone.includes(query))
    );
  }, [entries, searchQuery]);

  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !tableTypeFilter || t.tableType === tableTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [tables, searchQuery, tableTypeFilter]);

  const getTableBooking = (tableId: string) =>
    bookings.find(b => b.tableId === tableId && b.status !== 'cancelled');

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
      customerId: "",
      birthDate: "",
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

  useEffect(() => {
    const searchCustomer = async () => {
      if (debouncedPhone.length < 3) {
        setCustomerSearchResult(null);
        setCustomerNotFound(false);
        setShowNewCustomerFields(false);
        return;
      }
      setIsSearchingCustomer(true);
      try {
        const response = await fetch(`/api/pr/customers/search?phone=${encodeURIComponent(debouncedPhone)}`);
        const data = await response.json();
        if (data.found && data.customer) {
          setCustomerSearchResult(data.customer);
          setCustomerNotFound(false);
          setShowNewCustomerFields(false);
        } else {
          setCustomerSearchResult(null);
          setCustomerNotFound(true);
          setShowNewCustomerFields(true);
        }
      } catch {
        setCustomerSearchResult(null);
        setCustomerNotFound(false);
      } finally {
        setIsSearchingCustomer(false);
      }
    };
    searchCustomer();
  }, [debouncedPhone]);

  const addGuestMutation = useMutation({
    mutationFn: async (data: GuestEntryFormData) => {
      const response = await apiRequest("POST", `/api/pr/guest-lists/${selectedListId}/entries`, data);
      return response.json();
    },
    onSuccess: () => {
      refetchEntries();
      refetchLists();
      setIsAddGuestOpen(false);
      guestForm.reset();
      setCustomerSearchPhone("");
      setCustomerSearchResult(null);
      toast({ title: "Ospite aggiunto", description: "L'ospite è stato aggiunto alla lista" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteGuestMutation = useMutation({
    mutationFn: async (entryId: string) => {
      await apiRequest("DELETE", `/api/pr/guest-list-entries/${entryId}`);
    },
    onSuccess: () => {
      refetchEntries();
      refetchLists();
      toast({ title: "Ospite rimosso", description: "L'ospite è stato rimosso dalla lista" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const response = await apiRequest("POST", `/api/pr/tables/${selectedTableId}/book`, data);
      return response.json();
    },
    onSuccess: () => {
      refetchTables();
      refetchBookings();
      setIsBookTableOpen(false);
      setSelectedTableId(null);
      bookingForm.reset();
      toast({ title: "Prenotazione effettuata", description: "Il tavolo è stato prenotato con successo" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/pr/request-payout");
      return response.json();
    },
    onSuccess: () => {
      refetchWallet();
      queryClient.invalidateQueries({ queryKey: ["/api/pr/payouts"] });
      setIsPayoutDialogOpen(false);
      toast({ title: "Richiesta inviata", description: "La richiesta di pagamento è stata inviata" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const handleLogout = () => {
    triggerHaptic('error');
    logout();
  };

  const handleSwitchToCustomer = async () => {
    triggerHaptic('medium');
    setIsSwitchingToCustomer(true);
    try {
      const response = await fetch('/api/pr/switch-to-customer', {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.redirect || '/acquista';
      } else {
        toast({ title: "Errore", description: "Impossibile passare a modalità cliente", variant: "destructive" });
      }
    } catch {
      toast({ title: "Errore", description: "Errore di connessione", variant: "destructive" });
    } finally {
      setIsSwitchingToCustomer(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Errore", description: "Le password non corrispondono", variant: "destructive" });
      return;
    }
    try {
      await changePassword({ currentPassword, newPassword });
      toast({ title: "Password aggiornata", description: "La password è stata cambiata con successo" });
      setIsPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  };

  const formatEventDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isToday(d)) return "Oggi";
    if (isTomorrow(d)) return "Domani";
    return format(d, "EEE d MMM", { locale: it });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderHomeTab = () => {
    if (selectedEventId && selectedEvent) {
      return (
        <motion.div
          key="event-detail"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex flex-col h-full"
        >
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <HapticButton
              size="icon"
              variant="ghost"
              onClick={() => {
                setSelectedEventId(null);
                setSelectedListId("");
                setSearchQuery("");
              }}
              data-testid="button-back-to-events"
            >
              <ArrowLeft className="w-5 h-5" />
            </HapticButton>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg truncate">{selectedEvent.name}</h2>
              <p className="text-sm text-muted-foreground">
                {formatEventDate(selectedEvent.startDatetime)}
              </p>
            </div>
          </div>

          <div className="flex border-b border-white/10">
            <button
              onClick={() => { setEventSubTab('liste'); setSearchQuery(""); }}
              className={cn(
                "flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                eventSubTab === 'liste' 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="tab-liste"
            >
              <ListChecks className="w-4 h-4" />
              Liste
            </button>
            <button
              onClick={() => { setEventSubTab('tavoli'); setSearchQuery(""); setTableTypeFilter(""); }}
              className={cn(
                "flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                eventSubTab === 'tavoli' 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="tab-tavoli"
            >
              <Armchair className="w-4 h-4" />
              Tavoli
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {eventSubTab === 'liste' ? renderListeContent() : renderTavoliContent()}
            </div>
          </ScrollArea>
        </motion.div>
      );
    }

    return (
      <motion.div
        key="events-list"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">I Miei Eventi</h1>
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            {events.length}
          </Badge>
        </div>

        {loadingEvents ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardContent className="py-12 text-center">
              <PartyPopper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nessun evento assegnato</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="bg-card/50 backdrop-blur border-white/10 cursor-pointer hover:bg-card/70 transition-colors"
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedEventId(event.id);
                    setEventSubTab('liste');
                  }}
                  data-testid={`card-event-${event.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{event.name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{formatEventDate(event.startDatetime)}</span>
                        </div>
                        {(event as any).locationName && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{(event as any).locationName}</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const renderListeContent = () => {
    if (selectedListId && selectedList) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <HapticButton
              size="icon"
              variant="ghost"
              onClick={() => { setSelectedListId(""); setSearchQuery(""); }}
              data-testid="button-back-to-lists"
            >
              <ArrowLeft className="w-5 h-5" />
            </HapticButton>
            <div className="flex-1">
              <h3 className="font-semibold">{selectedList.name}</h3>
              <p className="text-sm text-muted-foreground">{entries.length} ospiti</p>
            </div>
            <HapticButton
              size="sm"
              onClick={() => setIsAddGuestOpen(true)}
              data-testid="button-add-guest"
            >
              <Plus className="w-4 h-4 mr-1" />
              Aggiungi
            </HapticButton>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca ospite..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
              data-testid="input-search-guests"
            />
          </div>

          {loadingEntries ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Nessun ospite trovato</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map(entry => (
                <Card key={entry.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {entry.firstName} {entry.lastName}
                        </p>
                        {entry.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {entry.phone}
                          </p>
                        )}
                        {entry.plusOnes > 0 && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            +{entry.plusOnes} accompagnatori
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.qrScannedAt ? (
                          <Badge className="bg-green-500/20 text-green-400">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Entrato
                          </Badge>
                        ) : (
                          <Badge variant="secondary">In attesa</Badge>
                        )}
                        <HapticButton
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteGuestMutation.mutate(entry.id)}
                          hapticType="error"
                          data-testid={`button-delete-guest-${entry.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </HapticButton>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {loadingLists ? (
          [1, 2].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))
        ) : guestLists.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Nessuna lista disponibile</p>
          </div>
        ) : (
          guestLists.map(list => (
            <Card
              key={list.id}
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => {
                triggerHaptic('light');
                setSelectedListId(list.id);
              }}
              data-testid={`card-list-${list.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{list.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {list.currentCount || 0} / {list.maxGuests || '∞'} ospiti
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  const renderTavoliContent = () => {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca tavolo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
              data-testid="input-search-tables"
            />
          </div>
          {tableTypes.length > 0 && (
            <Select value={tableTypeFilter} onValueChange={setTableTypeFilter}>
              <SelectTrigger className="w-32 bg-white/5 border-white/10" data-testid="select-table-type">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tutti</SelectItem>
                {tableTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {loadingTables ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Armchair className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Nessun tavolo disponibile</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTables.map(table => {
              const booking = getTableBooking(table.id);
              const isBooked = !!booking;
              
              return (
                <Card key={table.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{table.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {table.tableType}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {table.capacity} persone{table.minSpend ? ` • €${table.minSpend}` : ''}
                        </p>
                        {isBooked && booking && (
                          <p className="text-sm text-amber-400 mt-1">
                            Prenotato: {booking.customerName}
                          </p>
                        )}
                      </div>
                      {isBooked ? (
                        <Badge className="bg-amber-500/20 text-amber-400">
                          Prenotato
                        </Badge>
                      ) : (
                        <HapticButton
                          size="sm"
                          onClick={() => {
                            setSelectedTableId(table.id);
                            setIsBookTableOpen(true);
                          }}
                          data-testid={`button-book-table-${table.id}`}
                        >
                          Prenota
                        </HapticButton>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderWalletTab = () => (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <HapticButton
          size="icon"
          variant="ghost"
          onClick={() => refetchWallet()}
          disabled={isRefetchingWallet}
          data-testid="button-refresh-wallet"
        >
          <RefreshCw className={cn("w-5 h-5", isRefetchingWallet && "animate-spin")} />
        </HapticButton>
      </div>

      {loadingWallet ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : wallet ? (
        <>
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Saldo Disponibile</p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(wallet.availableForPayout)}
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-muted-foreground">In attesa</p>
                  <p className="text-lg font-semibold text-amber-400">
                    {formatCurrency(wallet.pendingEarnings)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Totale guadagnato</p>
                  <p className="text-lg font-semibold text-green-400">
                    {formatCurrency(wallet.totalEarnings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <HapticButton
            className="w-full"
            size="lg"
            onClick={() => setIsPayoutDialogOpen(true)}
            disabled={wallet.availableForPayout <= 0}
            data-testid="button-request-payout"
          >
            <Banknote className="w-5 h-5 mr-2" />
            Richiedi Pagamento
          </HapticButton>

          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Questo Mese
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">{wallet.thisMonthReservations}</p>
                <p className="text-sm text-muted-foreground">Prenotazioni</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(wallet.thisMonthEarnings)}
                </p>
                <p className="text-sm text-muted-foreground">Guadagni</p>
              </div>
            </CardContent>
          </Card>

          {allPayouts.length > 0 && (
            <Card className="bg-card/50 backdrop-blur border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Storico Pagamenti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {allPayouts.slice(0, 5).map(payout => (
                  <div key={payout.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="font-medium">{formatCurrency(parseFloat(payout.amount))}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payout.createdAt), "d MMM yyyy", { locale: it })}
                      </p>
                    </div>
                    <Badge
                      variant={payout.status === 'paid' ? 'default' : 'secondary'}
                      className={payout.status === 'paid' ? 'bg-green-500/20 text-green-400' : ''}
                    >
                      {payout.status === 'paid' ? 'Pagato' : payout.status === 'pending' ? 'In attesa' : payout.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardContent className="py-12 text-center">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Impossibile caricare i dati del wallet</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );

  const renderProfiloTab = () => (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profilo</h1>
        <BrandLogo variant="horizontal" className="h-8" />
      </div>

      <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/30 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">
                {prProfile?.displayName || `${prProfile?.firstName} ${prProfile?.lastName}`}
              </h2>
              <p className="text-sm text-muted-foreground">{prProfile?.phone}</p>
              {prProfile?.email && (
                <p className="text-sm text-muted-foreground truncate">{prProfile.email}</p>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <Badge className="bg-primary/30 text-primary">
              Codice PR: {prProfile?.prCode}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="w-4 h-4 text-primary" />
            Statistiche Commissioni
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400">
              {formatCurrency(wallet?.pendingEarnings || 0)}
            </p>
            <p className="text-xs text-muted-foreground">In attesa</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(wallet?.paidEarnings || 0)}
            </p>
            <p className="text-xs text-muted-foreground">Pagati</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(wallet?.totalEarnings || 0)}
            </p>
            <p className="text-xs text-muted-foreground">Totale</p>
          </div>
        </CardContent>
      </Card>

      {hasMultipleCompanies && myCompanies && (
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              Le Mie Aziende
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myCompanies.profiles.map(profile => (
              <HapticButton
                key={profile.id}
                variant={profile.isCurrent ? "default" : "outline"}
                className="w-full justify-between"
                disabled={isSwitchingCompany || profile.isCurrent}
                onClick={() => {
                  if (!profile.isCurrent) {
                    switchCompany(profile.id);
                  }
                }}
                data-testid={`button-switch-company-${profile.id}`}
              >
                <span className="truncate">{profile.companyName}</span>
                {profile.isCurrent ? (
                  <Badge variant="secondary" className="bg-white/20">Attivo</Badge>
                ) : isSwitchingCompany ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </HapticButton>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Impostazioni</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <HapticButton
            variant="outline"
            className="w-full justify-start gap-3"
            disabled={isSwitchingToCustomer}
            onClick={handleSwitchToCustomer}
            data-testid="button-switch-to-customer"
          >
            {isSwitchingToCustomer ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="w-4 h-4" />
            )}
            Passa a modalità cliente
          </HapticButton>
          
          <HapticButton
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => setIsPasswordDialogOpen(true)}
            data-testid="button-change-password"
          >
            <Lock className="w-4 h-4" />
            Cambia Password
          </HapticButton>
          
          <HapticButton
            variant="destructive"
            className="w-full justify-start gap-3"
            onClick={handleLogout}
            disabled={isLoggingOut}
            hapticType="error"
            data-testid="button-logout"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Esci
          </HapticButton>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <ScrollArea className="flex-1 pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && renderHomeTab()}
          {activeTab === 'wallet' && renderWalletTab()}
          {activeTab === 'profilo' && renderProfiloTab()}
        </AnimatePresence>
      </ScrollArea>

      <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-white/10 safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => { setActiveTab('home'); setSelectedEventId(null); }}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-6 transition-colors",
              activeTab === 'home' ? "text-primary" : "text-muted-foreground"
            )}
            data-testid="nav-home"
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-6 transition-colors",
              activeTab === 'wallet' ? "text-primary" : "text-muted-foreground"
            )}
            data-testid="nav-wallet"
          >
            <Wallet className="w-6 h-6" />
            <span className="text-xs font-medium">Wallet</span>
          </button>
          <button
            onClick={() => setActiveTab('profilo')}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-6 transition-colors",
              activeTab === 'profilo' ? "text-primary" : "text-muted-foreground"
            )}
            data-testid="nav-profilo"
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">Profilo</span>
          </button>
        </div>
      </nav>

      <Dialog open={isAddGuestOpen} onOpenChange={setIsAddGuestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aggiungi Ospite</DialogTitle>
            <DialogDescription>
              Aggiungi un nuovo ospite alla lista "{selectedList?.name}"
            </DialogDescription>
          </DialogHeader>
          <Form {...guestForm}>
            <form onSubmit={guestForm.handleSubmit((data) => addGuestMutation.mutate(data))} className="space-y-4">
              <div className="space-y-2">
                <FormLabel>Cerca per telefono</FormLabel>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="+39..."
                    value={customerSearchPhone}
                    onChange={(e) => setCustomerSearchPhone(e.target.value)}
                    className="pl-10"
                    data-testid="input-customer-phone"
                  />
                  {isSearchingCustomer && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                  )}
                </div>
                {customerSearchResult && (
                  <Card className="bg-green-500/10 border-green-500/20">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm">
                          Cliente trovato: {customerSearchResult.firstName} {customerSearchResult.lastName}
                        </span>
                      </div>
                      <HapticButton
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={() => {
                          guestForm.setValue('firstName', customerSearchResult.firstName);
                          guestForm.setValue('lastName', customerSearchResult.lastName);
                          guestForm.setValue('phone', customerSearchResult.phone);
                          guestForm.setValue('customerId', customerSearchResult.id);
                          if (customerSearchResult.gender) {
                            guestForm.setValue('gender', customerSearchResult.gender as 'M' | 'F');
                          }
                        }}
                        data-testid="button-use-customer"
                      >
                        Usa questi dati
                      </HapticButton>
                    </CardContent>
                  </Card>
                )}
                {customerNotFound && (
                  <div className="flex items-center gap-2 text-sm text-amber-500">
                    <XCircle className="w-4 h-4" />
                    Cliente non trovato - inserisci i dati manualmente
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={guestForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-first-name" />
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
                        <Input {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={guestForm.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sesso</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue placeholder="Seleziona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Maschio</SelectItem>
                        <SelectItem value="F">Femmina</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={guestForm.control}
                name="plusOnes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accompagnatori</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} data-testid="input-plus-ones" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <HapticButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddGuestOpen(false);
                    guestForm.reset();
                    setCustomerSearchPhone("");
                    setCustomerSearchResult(null);
                  }}
                >
                  Annulla
                </HapticButton>
                <HapticButton type="submit" disabled={addGuestMutation.isPending} data-testid="button-submit-guest">
                  {addGuestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Aggiungi
                </HapticButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isBookTableOpen} onOpenChange={setIsBookTableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prenota Tavolo</DialogTitle>
            <DialogDescription>
              Inserisci i dati per la prenotazione
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
                      <Input {...field} data-testid="input-booking-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bookingForm.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-booking-phone" />
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
                      <Input type="number" min="1" {...field} data-testid="input-guests-count" />
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
                      <Input {...field} data-testid="input-booking-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <HapticButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsBookTableOpen(false);
                    setSelectedTableId(null);
                    bookingForm.reset();
                  }}
                >
                  Annulla
                </HapticButton>
                <HapticButton type="submit" disabled={createBookingMutation.isPending} data-testid="button-submit-booking">
                  {createBookingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Prenota
                </HapticButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Richiedi Pagamento</DialogTitle>
            <DialogDescription>
              Richiedi il pagamento delle commissioni maturate
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Importo disponibile</p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(wallet?.availableForPayout || 0)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <HapticButton variant="outline" onClick={() => setIsPayoutDialogOpen(false)}>
              Annulla
            </HapticButton>
            <HapticButton
              onClick={() => requestPayoutMutation.mutate()}
              disabled={requestPayoutMutation.isPending || (wallet?.availableForPayout || 0) <= 0}
              data-testid="button-confirm-payout"
            >
              {requestPayoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Conferma Richiesta
            </HapticButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambia Password</DialogTitle>
            <DialogDescription>
              Inserisci la password attuale e la nuova password
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <FormLabel>Password Attuale</FormLabel>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <FormLabel>Nuova Password</FormLabel>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <FormLabel>Conferma Password</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          <DialogFooter>
            <HapticButton
              variant="outline"
              onClick={() => {
                setIsPasswordDialogOpen(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              Annulla
            </HapticButton>
            <HapticButton
              onClick={handleChangePassword}
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              data-testid="button-confirm-password"
            >
              {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Cambia Password
            </HapticButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
