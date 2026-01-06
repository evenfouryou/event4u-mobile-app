import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  FloatingActionButton,
  BottomSheet,
  MobileNavItem,
  MobileBottomBar,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Home,
  ListChecks,
  Armchair,
  BookUser,
  Plus,
  Search,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  UserPlus,
  Clock,
  PartyPopper,
  Calendar,
  MapPin,
  ArrowLeft,
  Users,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { it } from "date-fns/locale";
import type { GuestList, GuestListEntry, Event, EventTable, TableBooking, EventStaffAssignment } from "@shared/schema";

type TabType = 'home' | 'liste' | 'tavoli' | 'rubrica';

interface PrContact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  gender?: 'M' | 'F';
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

type GuestEntryFormData = z.infer<typeof guestEntryFormSchema>;

const bookingFormSchema = z.object({
  customerName: z.string().min(1, "Nome cliente obbligatorio"),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email("Email non valida").optional().or(z.literal("")),
  guestsCount: z.coerce.number().min(1, "Minimo 1 ospite"),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

const contactFormSchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  phone: z.string().min(1, "Telefono obbligatorio"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  gender: z.enum(["M", "F"]).optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: springTransition },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

function GenderToggle({ value, onChange }: { value?: 'M' | 'F'; onChange: (v: 'M' | 'F') => void }) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-border">
      <button
        type="button"
        onClick={() => { triggerHaptic('light'); onChange('M'); }}
        className={cn(
          "flex-1 py-3 px-4 text-center font-medium transition-all",
          value === 'M' 
            ? "bg-blue-500 text-white" 
            : "bg-card text-muted-foreground hover:bg-muted"
        )}
        data-testid="toggle-gender-m"
      >
        M
      </button>
      <button
        type="button"
        onClick={() => { triggerHaptic('light'); onChange('F'); }}
        className={cn(
          "flex-1 py-3 px-4 text-center font-medium transition-all",
          value === 'F' 
            ? "bg-pink-500 text-white" 
            : "bg-card text-muted-foreground hover:bg-muted"
        )}
        data-testid="toggle-gender-f"
      >
        F
      </button>
    </div>
  );
}

function EventCard({ event, onClick, stats }: { 
  event: Event; 
  onClick: () => void;
  stats?: { guests: number; tables: number };
}) {
  const eventDate = new Date(event.startDatetime);
  const dateLabel = isToday(eventDate) 
    ? "Oggi" 
    : isTomorrow(eventDate) 
      ? "Domani" 
      : format(eventDate, "d MMM", { locale: it });

  return (
    <motion.div 
      variants={fadeInUp}
      whileTap={{ scale: 0.98 }}
      onClick={() => { triggerHaptic('medium'); onClick(); }}
      className="cursor-pointer"
    >
      <Card className="overflow-hidden glass-card border-white/10">
        <div className="relative h-40">
          {event.flyerUrl ? (
            <img 
              src={event.flyerUrl} 
              alt={event.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Calendar className="h-12 w-12 text-primary/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-bold text-white truncate">{event.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-white/80">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {dateLabel}
              </span>
              {event.location && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
          <Badge 
            className="absolute top-3 right-3 bg-primary/90 text-primary-foreground border-0"
          >
            {format(eventDate, "HH:mm")}
          </Badge>
        </div>
        {stats && (
          <CardContent className="p-3 flex items-center justify-between bg-card/50">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{stats.guests} ospiti</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Armchair className="h-4 w-4" />
              <span>{stats.tables} tavoli</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}

function GuestCard({ guest, onClick }: { guest: GuestListEntry; onClick: () => void }) {
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

  const statusConfig = getStatusConfig(guest.status);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div 
      variants={fadeInUp}
      whileTap={{ scale: 0.98 }}
      onClick={() => { triggerHaptic('light'); onClick(); }}
      className="cursor-pointer"
    >
      <Card className="glass-card border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold truncate">
                  {guest.firstName} {guest.lastName}
                </h4>
                {guest.gender && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs px-1.5 border-0",
                      guest.gender === 'M' ? "bg-blue-500/20 text-blue-400" : "bg-pink-500/20 text-pink-400"
                    )}
                  >
                    {guest.gender}
                  </Badge>
                )}
                {guest.plusOnes > 0 && (
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-0 text-xs">
                    +{guest.plusOnes}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                {guest.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {guest.phone}
                  </span>
                )}
              </div>
            </div>
            <Badge variant="outline" className={cn("border-0 ml-2", statusConfig.bg, statusConfig.color)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TableCard({ table, booking, onClick }: { 
  table: EventTable; 
  booking?: TableBooking;
  onClick: () => void;
}) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'available':
        return { color: "bg-green-500", textColor: "text-green-400", label: "Disponibile" };
      case 'reserved':
        return { color: "bg-blue-500", textColor: "text-blue-400", label: "Prenotato" };
      case 'occupied':
        return { color: "bg-amber-500", textColor: "text-amber-400", label: "Occupato" };
      case 'blocked':
        return { color: "bg-red-500", textColor: "text-red-400", label: "Bloccato" };
      default:
        return { color: "bg-muted", textColor: "text-muted-foreground", label: status };
    }
  };

  const statusInfo = getStatusInfo(table.status);

  return (
    <motion.div 
      variants={fadeInUp}
      whileTap={{ scale: 0.98 }}
      onClick={() => { triggerHaptic('light'); onClick(); }}
      className="cursor-pointer"
    >
      <Card className="glass-card border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("w-3 h-3 rounded-full", statusInfo.color)} />
              <div>
                <h4 className="font-semibold">{table.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {table.capacity} posti · {table.tableType}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className={cn("border-0 bg-white/5", statusInfo.textColor)}>
                {statusInfo.label}
              </Badge>
              {table.minSpend && (
                <p className="text-xs text-muted-foreground mt-1">
                  Min €{table.minSpend}
                </p>
              )}
            </div>
          </div>
          {booking && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-sm font-medium">{booking.customerName}</p>
              <p className="text-xs text-muted-foreground">{booking.guestsCount} ospiti</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ContactCard({ contact, onAddToList }: { 
  contact: PrContact; 
  onAddToList: () => void;
}) {
  return (
    <motion.div variants={fadeInUp}>
      <Card className="glass-card border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold truncate">
                  {contact.firstName} {contact.lastName}
                </h4>
                {contact.gender && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs px-1.5 border-0",
                      contact.gender === 'M' ? "bg-blue-500/20 text-blue-400" : "bg-pink-500/20 text-pink-400"
                    )}
                  >
                    {contact.gender}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {contact.phone}
                </span>
                {contact.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </span>
                )}
              </div>
            </div>
            <HapticButton
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={(e) => { e.stopPropagation(); onAddToList(); }}
              data-testid={`button-add-contact-${contact.id}`}
            >
              <UserPlus className="h-4 w-4" />
            </HapticButton>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function PrAppPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableTypeFilter, setTableTypeFilter] = useState<string>("");
  
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [isBookTableOpen, setIsBookTableOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isGuestDetailOpen, setIsGuestDetailOpen] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [contactToAdd, setContactToAdd] = useState<PrContact | null>(null);
  
  const [contacts, setContacts] = useState<PrContact[]>(() => {
    const saved = localStorage.getItem('pr_contacts');
    return saved ? JSON.parse(saved) : [];
  });

  const saveContacts = useCallback((newContacts: PrContact[]) => {
    setContacts(newContacts);
    localStorage.setItem('pr_contacts', JSON.stringify(newContacts));
  }, []);

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

  const selectedList = useMemo(() => 
    guestLists.find(l => l.id === selectedListId),
    [guestLists, selectedListId]
  );

  const selectedGuest = useMemo(() =>
    entries.find(e => e.id === selectedGuestId),
    [entries, selectedGuestId]
  );

  const tableTypes = useMemo(() =>
    Array.from(new Set(tables.map(t => t.tableType))).sort(),
    [tables]
  );

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
      const matchesSearch = !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = !tableTypeFilter || t.tableType === tableTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [tables, searchQuery, tableTypeFilter]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(c =>
      c.firstName.toLowerCase().includes(query) ||
      c.lastName.toLowerCase().includes(query) ||
      c.phone.includes(query)
    );
  }, [contacts, searchQuery]);

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

  const contactForm = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      gender: undefined,
    },
  });

  const addGuestMutation = useMutation({
    mutationFn: async (data: GuestEntryFormData) => {
      const response = await apiRequest("POST", `/api/pr/guest-lists/${selectedListId}/entries`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Ospite aggiunto" });
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
      setIsGuestDetailOpen(false);
      setSelectedGuestId(null);
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
      setIsGuestDetailOpen(false);
      setSelectedGuestId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/pr/guest-lists", selectedListId, "entries"] });
      refetchLists();
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
      setSelectedTableId(null);
      refetchTables();
      refetchBookings();
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
    setSelectedListId("");
    setActiveTab('liste');
  };

  const handleBackToEvents = () => {
    triggerHaptic('light');
    setSelectedEventId(null);
    setSelectedListId("");
    setActiveTab('home');
    setSearchQuery("");
  };

  const handleTabChange = (tab: TabType) => {
    triggerHaptic('light');
    setActiveTab(tab);
    setSearchQuery("");
  };

  const handleAddContactToList = (contact: PrContact) => {
    if (!selectedListId) {
      toast({ title: "Seleziona una lista", variant: "destructive" });
      return;
    }
    setContactToAdd(contact);
    guestForm.reset({
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      email: contact.email || "",
      gender: contact.gender,
      plusOnes: 0,
      notes: "",
    });
    setIsAddGuestOpen(true);
  };

  const handleSaveContact = (data: ContactFormData) => {
    const newContact: PrContact = {
      id: Date.now().toString(),
      ...data,
      gender: data.gender as 'M' | 'F' | undefined,
    };
    saveContacts([...contacts, newContact]);
    triggerHaptic('success');
    toast({ title: "Contatto salvato" });
    setIsAddContactOpen(false);
    contactForm.reset();
  };

  const handleDeleteContact = (id: string) => {
    saveContacts(contacts.filter(c => c.id !== id));
    triggerHaptic('success');
    toast({ title: "Contatto eliminato" });
  };

  const isLoading = loadingAssignments || loadingEvents;

  const header = useMemo(() => {
    if (selectedEventId && selectedEvent) {
      return (
        <MobileHeader
          title={selectedEvent.name}
          subtitle={format(new Date(selectedEvent.startDatetime), "d MMM yyyy", { locale: it })}
          showBackButton
          onBack={handleBackToEvents}
          showUserMenu
        />
      );
    }
    return (
      <MobileHeader
        title="PR App"
        subtitle={user?.firstName ? `Ciao, ${user.firstName}` : undefined}
        showUserMenu
      />
    );
  }, [selectedEventId, selectedEvent, user?.firstName]);

  const bottomNav = (
    <MobileBottomBar>
      <MobileNavItem
        icon={Home}
        label="Home"
        active={activeTab === 'home' && !selectedEventId}
        onClick={() => {
          if (selectedEventId) handleBackToEvents();
          else handleTabChange('home');
        }}
        data-testid="nav-home"
      />
      <MobileNavItem
        icon={ListChecks}
        label="Liste"
        active={activeTab === 'liste'}
        onClick={() => handleTabChange('liste')}
        badge={selectedEventId && entries.length > 0 ? entries.length : undefined}
        data-testid="nav-liste"
      />
      <MobileNavItem
        icon={Armchair}
        label="Tavoli"
        active={activeTab === 'tavoli'}
        onClick={() => handleTabChange('tavoli')}
        badge={selectedEventId && tables.filter(t => t.status === 'available').length > 0 
          ? tables.filter(t => t.status === 'available').length 
          : undefined}
        data-testid="nav-tavoli"
      />
      <MobileNavItem
        icon={BookUser}
        label="Rubrica"
        active={activeTab === 'rubrica'}
        onClick={() => handleTabChange('rubrica')}
        badge={contacts.length > 0 ? contacts.length : undefined}
        data-testid="nav-rubrica"
      />
    </MobileBottomBar>
  );

  if (isLoading) {
    return (
      <MobileAppLayout header={header} footer={bottomNav}>
        <div className="py-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      </MobileAppLayout>
    );
  }

  const renderHomeTab = () => (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="py-4 space-y-4 pb-24"
    >
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Nessun evento assegnato</h3>
          <p className="text-muted-foreground">
            Non hai ancora eventi assegnati
          </p>
        </div>
      ) : (
        events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onClick={() => handleEventSelect(event.id)}
            data-testid={`card-event-${event.id}`}
          />
        ))
      )}
    </motion.div>
  );

  const renderListeTab = () => {
    if (!selectedEventId) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ListChecks className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Seleziona un evento</h3>
          <p className="text-muted-foreground">
            Torna alla Home e seleziona un evento
          </p>
          <HapticButton 
            className="mt-4" 
            onClick={handleBackToEvents}
            data-testid="button-go-home"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vai alla Home
          </HapticButton>
        </div>
      );
    }

    return (
      <div className="py-4 space-y-4 pb-24">
        <Select value={selectedListId} onValueChange={setSelectedListId}>
          <SelectTrigger className="w-full h-12" data-testid="select-list">
            <SelectValue placeholder={loadingLists ? "Caricamento..." : "Seleziona lista"} />
          </SelectTrigger>
          <SelectContent>
            {guestLists.map((list) => (
              <SelectItem key={list.id} value={list.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{list.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {list.currentCount}{list.maxGuests ? `/${list.maxGuests}` : ''}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedListId && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca ospite..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
                data-testid="input-search-guest"
              />
            </div>

            {loadingEntries ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "Nessun risultato" : "Lista vuota"}
                </p>
              </div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {filteredEntries.map((guest) => (
                  <GuestCard
                    key={guest.id}
                    guest={guest}
                    onClick={() => {
                      setSelectedGuestId(guest.id);
                      setIsGuestDetailOpen(true);
                    }}
                    data-testid={`card-guest-${guest.id}`}
                  />
                ))}
              </motion.div>
            )}
          </>
        )}

        {selectedListId && selectedList?.isActive && (
          <FloatingActionButton
            onClick={() => { setContactToAdd(null); guestForm.reset(); setIsAddGuestOpen(true); }}
            data-testid="fab-add-guest"
          >
            <Plus className="h-6 w-6" />
          </FloatingActionButton>
        )}
      </div>
    );
  };

  const renderTavoliTab = () => {
    if (!selectedEventId) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Armchair className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Seleziona un evento</h3>
          <p className="text-muted-foreground">
            Torna alla Home e seleziona un evento
          </p>
          <HapticButton 
            className="mt-4" 
            onClick={handleBackToEvents}
            data-testid="button-go-home-tables"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vai alla Home
          </HapticButton>
        </div>
      );
    }

    return (
      <div className="py-4 space-y-4 pb-24">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={!tableTypeFilter ? "default" : "outline"}
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => { triggerHaptic('light'); setTableTypeFilter(""); }}
            data-testid="filter-all"
          >
            Tutti
          </Button>
          {tableTypes.map((type) => (
            <Button
              key={type}
              variant={tableTypeFilter === type ? "default" : "outline"}
              size="sm"
              className="shrink-0 rounded-full"
              onClick={() => { triggerHaptic('light'); setTableTypeFilter(type); }}
              data-testid={`filter-${type}`}
            >
              {type}
            </Button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca tavolo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
            data-testid="input-search-table"
          />
        </div>

        {loadingTables ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="text-center py-12">
            <Armchair className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "Nessun risultato" : "Nessun tavolo"}
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {filteredTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                booking={getTableBooking(table.id)}
                onClick={() => {
                  if (table.status === 'available') {
                    setSelectedTableId(table.id);
                    bookingForm.reset();
                    setIsBookTableOpen(true);
                  }
                }}
                data-testid={`card-table-${table.id}`}
              />
            ))}
          </motion.div>
        )}
      </div>
    );
  };

  const renderRubricaTab = () => (
    <div className="py-4 space-y-4 pb-24">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca contatto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12"
          data-testid="input-search-contact"
        />
      </div>

      {filteredContacts.length === 0 ? (
        <div className="text-center py-12">
          <BookUser className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? "Nessun risultato" : "Rubrica vuota"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Prova a cercare altro" : "Aggiungi il primo contatto"}
          </p>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {filteredContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onAddToList={() => handleAddContactToList(contact)}
            />
          ))}
        </motion.div>
      )}

      <FloatingActionButton
        onClick={() => { contactForm.reset(); setIsAddContactOpen(true); }}
        data-testid="fab-add-contact"
      >
        <Plus className="h-6 w-6" />
      </FloatingActionButton>
    </div>
  );

  const renderContent = () => {
    if (!selectedEventId && activeTab !== 'home' && activeTab !== 'rubrica') {
      return renderHomeTab();
    }

    switch (activeTab) {
      case 'home':
        return renderHomeTab();
      case 'liste':
        return renderListeTab();
      case 'tavoli':
        return renderTavoliTab();
      case 'rubrica':
        return renderRubricaTab();
      default:
        return renderHomeTab();
    }
  };

  return (
    <MobileAppLayout header={header} footer={bottomNav} data-testid="page-pr-app">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + (selectedEventId || '')}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      <BottomSheet
        open={isAddGuestOpen}
        onClose={() => setIsAddGuestOpen(false)}
        title={contactToAdd ? "Aggiungi dalla Rubrica" : "Nuovo Ospite"}
      >
        <Form {...guestForm}>
          <form 
            onSubmit={guestForm.handleSubmit((data) => addGuestMutation.mutate(data))}
            className="p-4 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={guestForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-12" data-testid="input-guest-firstname" />
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
                      <Input {...field} className="h-12" data-testid="input-guest-lastname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={guestForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" className="h-12" data-testid="input-guest-phone" />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" className="h-12" data-testid="input-guest-email" />
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
                    <Input 
                      {...field} 
                      type="number" 
                      min={0}
                      className="h-12" 
                      data-testid="input-guest-plusones" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <HapticButton
              type="submit"
              className="w-full h-12"
              disabled={addGuestMutation.isPending}
              hapticType="success"
              data-testid="button-submit-guest"
            >
              {addGuestMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Aggiungi Ospite"
              )}
            </HapticButton>
          </form>
        </Form>
      </BottomSheet>

      <BottomSheet
        open={isGuestDetailOpen}
        onClose={() => { setIsGuestDetailOpen(false); setSelectedGuestId(null); }}
        title="Dettagli Ospite"
      >
        {selectedGuest && (
          <div className="p-4 space-y-4">
            <div className="text-center py-4">
              <h3 className="text-xl font-bold">
                {selectedGuest.firstName} {selectedGuest.lastName}
              </h3>
              <div className="flex items-center justify-center gap-2 mt-2">
                {selectedGuest.gender && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "border-0",
                      selectedGuest.gender === 'M' ? "bg-blue-500/20 text-blue-400" : "bg-pink-500/20 text-pink-400"
                    )}
                  >
                    {selectedGuest.gender === 'M' ? 'Maschio' : 'Femmina'}
                  </Badge>
                )}
                {selectedGuest.plusOnes > 0 && (
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-0">
                    +{selectedGuest.plusOnes} accompagnatori
                  </Badge>
                )}
              </div>
            </div>

            {selectedGuest.phone && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>{selectedGuest.phone}</span>
              </div>
            )}

            {selectedGuest.email && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span>{selectedGuest.email}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-4">
              <HapticButton
                variant="outline"
                className="h-12"
                onClick={() => updateGuestMutation.mutate({ 
                  id: selectedGuest.id, 
                  data: { status: 'arrived' } 
                })}
                disabled={selectedGuest.status === 'arrived' || updateGuestMutation.isPending}
                data-testid="button-mark-arrived"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Arrivato
              </HapticButton>
              <HapticButton
                variant="destructive"
                className="h-12"
                onClick={() => deleteGuestMutation.mutate(selectedGuest.id)}
                disabled={deleteGuestMutation.isPending}
                hapticType="error"
                data-testid="button-delete-guest"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </HapticButton>
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={isBookTableOpen}
        onClose={() => { setIsBookTableOpen(false); setSelectedTableId(null); }}
        title="Prenota Tavolo"
      >
        <Form {...bookingForm}>
          <form 
            onSubmit={bookingForm.handleSubmit((data) => createBookingMutation.mutate(data))}
            className="p-4 space-y-4"
          >
            <FormField
              control={bookingForm.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Cliente</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-12" data-testid="input-booking-name" />
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
                    <Input {...field} type="tel" className="h-12" data-testid="input-booking-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={bookingForm.control}
              name="customerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" className="h-12" data-testid="input-booking-email" />
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
                    <Input {...field} type="number" min={1} className="h-12" data-testid="input-booking-guests" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <HapticButton
              type="submit"
              className="w-full h-12"
              disabled={createBookingMutation.isPending}
              hapticType="success"
              data-testid="button-submit-booking"
            >
              {createBookingMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Conferma Prenotazione"
              )}
            </HapticButton>
          </form>
        </Form>
      </BottomSheet>

      <BottomSheet
        open={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
        title="Nuovo Contatto"
      >
        <Form {...contactForm}>
          <form 
            onSubmit={contactForm.handleSubmit(handleSaveContact)}
            className="p-4 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={contactForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-12" data-testid="input-contact-firstname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={contactForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cognome</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-12" data-testid="input-contact-lastname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={contactForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" className="h-12" data-testid="input-contact-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={contactForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" className="h-12" data-testid="input-contact-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={contactForm.control}
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

            <HapticButton
              type="submit"
              className="w-full h-12"
              hapticType="success"
              data-testid="button-submit-contact"
            >
              Salva Contatto
            </HapticButton>
          </form>
        </Form>
      </BottomSheet>
    </MobileAppLayout>
  );
}
