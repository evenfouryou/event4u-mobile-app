import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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

interface CustomerSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  phone: string;
  birthDate: string | null;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Wallet,
  Euro,
  TrendingUp,
  Banknote,
  RefreshCw,
  Lock,
  LogOut,
  User,
  Settings,
  ArrowRightLeft,
  Building,
  ChevronDown,
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { it } from "date-fns/locale";
import type { GuestList, GuestListEntry, Event, EventTable, TableBooking, EventStaffAssignment } from "@shared/schema";

type TabType = 'home' | 'liste' | 'tavoli' | 'wallet' | 'profilo';

interface PrContact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  gender?: 'M' | 'F';
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

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springTransition,
  },
  tap: { scale: 0.98 },
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
          {event.imageUrl ? (
            <img 
              src={event.imageUrl} 
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
  const [, setLocation] = useLocation();
  const { 
    prProfile, 
    isLoading: authLoading, 
    isAuthenticated, 
    logout, 
    isLoggingOut, 
    updateProfile, 
    isUpdatingProfile, 
    changePassword, 
    isChangingPassword,
    myCompanies,
    hasMultipleCompanies,
    switchCompany,
    isSwitchingCompany,
  } = usePrAuth();
  
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
  
  const [customerSearchPhone, setCustomerSearchPhone] = useState("");
  const [customerSearchResult, setCustomerSearchResult] = useState<CustomerSearchResult | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerNotFound, setCustomerNotFound] = useState(false);
  const [showNewCustomerFields, setShowNewCustomerFields] = useState(false);
  
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const debouncedPhone = useDebounce(customerSearchPhone, 500);
  
  const [contacts, setContacts] = useState<PrContact[]>(() => {
    const saved = localStorage.getItem('pr_contacts');
    return saved ? JSON.parse(saved) : [];
  });

  const saveContacts = useCallback((newContacts: PrContact[]) => {
    setContacts(newContacts);
    localStorage.setItem('pr_contacts', JSON.stringify(newContacts));
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery<EventStaffAssignment[]>({
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
      customerId: "",
      birthDate: "",
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
      } catch (error) {
        console.error("Error searching customer:", error);
        setCustomerSearchResult(null);
        setCustomerNotFound(false);
      } finally {
        setIsSearchingCustomer(false);
      }
    };

    searchCustomer();
  }, [debouncedPhone]);

  const handleUseCustomerData = () => {
    if (customerSearchResult) {
      guestForm.setValue("firstName", customerSearchResult.firstName);
      guestForm.setValue("lastName", customerSearchResult.lastName);
      guestForm.setValue("phone", customerSearchResult.phone);
      if (customerSearchResult.gender === 'M' || customerSearchResult.gender === 'F') {
        guestForm.setValue("gender", customerSearchResult.gender);
      }
      guestForm.setValue("customerId", customerSearchResult.id);
      triggerHaptic('success');
      toast({ title: "Dati cliente applicati" });
    }
  };

  const resetCustomerSearch = () => {
    setCustomerSearchPhone("");
    setCustomerSearchResult(null);
    setCustomerNotFound(false);
    setShowNewCustomerFields(false);
  };

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
      let customerId = data.customerId;
      
      if (showNewCustomerFields && !customerId && data.phone && data.firstName && data.lastName) {
        try {
          const customerResponse = await apiRequest("POST", "/api/pr/customers/quick-create", {
            phone: data.phone,
            firstName: data.firstName,
            lastName: data.lastName,
            gender: data.gender,
            birthDate: data.birthDate || null,
          });
          const newCustomer = await customerResponse.json();
          customerId = newCustomer.id;
        } catch (error) {
          console.log("Could not create customer, proceeding without customerId");
        }
      }
      
      const response = await apiRequest("POST", `/api/pr/guest-lists/${selectedListId}/entries`, {
        ...data,
        customerId: customerId || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Ospite aggiunto" });
      setIsAddGuestOpen(false);
      guestForm.reset();
      resetCustomerSearch();
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

  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/pr/payouts");
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({
        title: "Richiesta inviata",
        description: "La tua richiesta di pagamento è stata inviata con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/payouts"] });
      setIsPayoutDialogOpen(false);
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message || "Impossibile inviare la richiesta di pagamento.",
        variant: "destructive",
      });
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
      toast({ title: "Seleziona prima un evento e una lista", variant: "destructive" });
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

  const handleAddEmail = () => {
    if (!newEmail) return;
    triggerHaptic('medium');
    updateProfile({ email: newEmail }, {
      onSuccess: () => {
        toast({
          title: "Email aggiunta",
          description: "La tua email è stata aggiunta con successo.",
        });
        setIsEmailDialogOpen(false);
        setNewEmail("");
      },
      onError: (error: Error) => {
        toast({
          title: "Errore",
          description: error.message || "Impossibile aggiungere l'email.",
          variant: "destructive",
        });
      },
    });
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non corrispondono.",
        variant: "destructive",
      });
      return;
    }
    triggerHaptic('medium');
    try {
      await changePassword({ currentPassword, newPassword });
      toast({
        title: "Password cambiata",
        description: "La tua password è stata cambiata con successo.",
      });
      setIsPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile cambiare la password.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    triggerHaptic('medium');
    logout();
  };

  const handleRequestPayout = () => {
    triggerHaptic('medium');
    setIsPayoutDialogOpen(true);
  };

  const confirmPayout = () => {
    triggerHaptic('medium');
    requestPayoutMutation.mutate();
  };

  const handleRefreshWallet = () => {
    triggerHaptic('medium');
    refetchWallet();
  };

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">In Attesa</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">In Elaborazione</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Completato</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Rifiutato</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const isLoading = loadingAssignments || loadingEvents || authLoading;

  const header = useMemo(() => {
    if (selectedEventId && selectedEvent) {
      return (
        <MobileHeader
          title={selectedEvent.name}
          subtitle={format(new Date(selectedEvent.startDatetime), "d MMM yyyy", { locale: it })}
          showBackButton
          onBack={handleBackToEvents}
        />
      );
    }
    
    const titleMap: Record<TabType, string> = {
      home: "Eventi",
      liste: "Liste",
      tavoli: "Tavoli",
      wallet: "Wallet",
      profilo: "Profilo",
    };
    
    return (
      <MobileHeader
        title={titleMap[activeTab]}
        subtitle={prProfile?.firstName ? `Ciao, ${prProfile.firstName}` : undefined}
        rightAction={
          activeTab === 'wallet' ? (
            <HapticButton
              variant="ghost"
              size="icon"
              onClick={handleRefreshWallet}
              disabled={isRefetchingWallet}
              data-testid="button-refresh-wallet"
            >
              <RefreshCw className={cn("h-5 w-5", isRefetchingWallet && "animate-spin")} />
            </HapticButton>
          ) : undefined
        }
      />
    );
  }, [selectedEventId, selectedEvent, prProfile?.firstName, activeTab, isRefetchingWallet]);

  const bottomNav = (
    <MobileBottomBar>
      <MobileNavItem
        icon={Home}
        label="Home"
        active={activeTab === 'home' || activeTab === 'liste' || activeTab === 'tavoli'}
        onClick={() => {
          if (selectedEventId) handleBackToEvents();
          else handleTabChange('home');
        }}
        data-testid="nav-home"
      />
      <MobileNavItem
        icon={Wallet}
        label="Wallet"
        active={activeTab === 'wallet'}
        onClick={() => handleTabChange('wallet')}
        data-testid="nav-wallet"
      />
      <MobileNavItem
        icon={User}
        label="Profilo"
        active={activeTab === 'profilo'}
        onClick={() => handleTabChange('profilo')}
        data-testid="nav-profilo"
      />
    </MobileBottomBar>
  );

  if (isLoading || authLoading) {
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

  if (!isAuthenticated) {
    return null;
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
            Torna agli Eventi e seleziona un evento
          </p>
          <HapticButton 
            className="mt-4" 
            onClick={handleBackToEvents}
            data-testid="button-go-home"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vai agli Eventi
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
            Torna agli Eventi e seleziona un evento
          </p>
          <HapticButton 
            className="mt-4" 
            onClick={handleBackToEvents}
            data-testid="button-go-home-tables"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vai agli Eventi
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

  const renderWalletTab = () => (
    <div className="py-4 space-y-4 pb-24">
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="w-full"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/30 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Saldo Disponibile</span>
            </div>
            
            <div>
              <p 
                className="text-4xl font-bold text-primary tabular-nums"
                data-testid="text-wallet-balance"
              >
                {formatCurrency(wallet?.availableForPayout || 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-pending-earnings">
                Guadagni in sospeso: {formatCurrency(wallet?.pendingEarnings || 0)}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground">Totale Guadagnato</p>
                <p className="text-lg font-semibold text-foreground" data-testid="text-paid-earnings">
                  {formatCurrency(wallet?.totalEarnings || 0)}
                </p>
              </div>
              <HapticButton
                onClick={handleRequestPayout}
                disabled={!wallet?.availableForPayout || wallet.availableForPayout <= 0}
                className="gap-2"
                hapticType="medium"
                data-testid="button-request-payout"
              >
                <Banknote className="w-4 h-4" />
                Richiedi
              </HapticButton>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card border-white/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {wallet?.thisMonthReservations || 0}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Prenotazioni mese</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
        >
          <Card className="glass-card border-white/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {formatCurrency(wallet?.thisMonthEarnings || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Guadagni mese</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="glass-card border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Ultimi Pagamenti
          </CardTitle>
        </CardHeader>
        <CardContent data-testid="list-payouts">
          {loadingPayouts ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : allPayouts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Banknote className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nessun pagamento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allPayouts.slice(0, 5).map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30"
                  data-testid={`payout-item-${payout.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {formatCurrency(parseFloat(payout.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payout.createdAt), "d MMM yyyy", { locale: it })}
                    </p>
                  </div>
                  {getPayoutStatusBadge(payout.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderProfiloTab = () => (
    <div className="py-4 space-y-4 pb-24">
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Il Mio Profilo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4" data-testid="profile-info">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {prProfile?.firstName} {prProfile?.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Codice PR: {prProfile?.prCode}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <span>{prProfile?.phone || "Non specificato"}</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Mail className="w-5 h-5 text-muted-foreground" />
                {prProfile?.email ? (
                  <span>{prProfile.email}</span>
                ) : (
                  <HapticButton
                    variant="ghost"
                    className="p-0 h-auto text-primary"
                    onClick={() => setIsEmailDialogOpen(true)}
                    data-testid="button-add-email"
                  >
                    Aggiungi email
                  </HapticButton>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.05 }}
      >
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Statistiche Commissioni
            </CardTitle>
          </CardHeader>
          <CardContent data-testid="commission-stats">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-muted/30">
                <p className="text-2xl font-bold text-primary">
                  {wallet?.thisMonthReservations || 0}
                </p>
                <p className="text-xs text-muted-foreground">Prenotazioni mese</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/30">
                <p className="text-2xl font-bold text-green-500">
                  {formatCurrency(wallet?.thisMonthEarnings || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Guadagni mese</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/30">
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(wallet?.totalEarnings || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Totale guadagni</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookUser className="w-5 h-5 text-primary" />
              Rubrica ({contacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent data-testid="rubrica-section">
            {contacts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <BookUser className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Rubrica vuota</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {contacts.slice(0, 10).map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{contact.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
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
                        <HapticButton
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteContact(contact.id)}
                          data-testid={`button-delete-contact-${contact.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </HapticButton>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            <HapticButton
              variant="outline"
              className="w-full mt-4 gap-2"
              onClick={() => { contactForm.reset(); setIsAddContactOpen(true); }}
              data-testid="button-add-contact"
            >
              <Plus className="w-4 h-4" />
              Aggiungi Contatto
            </HapticButton>
          </CardContent>
        </Card>
      </motion.div>

      {hasMultipleCompanies && (
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
        >
          <Card className="glass-card border-white/10" data-testid="card-company-selector">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Aziende
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3" data-testid="company-selector-content">
              <p className="text-sm text-muted-foreground mb-3">
                Stai operando per più aziende. Seleziona l'azienda attiva.
              </p>
              {myCompanies?.profiles.map((profile) => (
                <HapticButton
                  key={profile.id}
                  variant={profile.isCurrent ? "default" : "outline"}
                  className={cn(
                    "w-full justify-between gap-3",
                    profile.isCurrent && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => {
                    if (!profile.isCurrent) {
                      triggerHaptic('medium');
                      switchCompany(profile.id);
                    }
                  }}
                  disabled={isSwitchingCompany || profile.isCurrent}
                  data-testid={`button-switch-company-${profile.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Building className="w-4 h-4" />
                    <div className="text-left">
                      <p className="font-medium">{profile.companyName}</p>
                      <p className={cn(
                        "text-xs",
                        profile.isCurrent ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        Codice: {profile.prCode}
                      </p>
                    </div>
                  </div>
                  {profile.isCurrent ? (
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      Attivo
                    </Badge>
                  ) : isSwitchingCompany ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </HapticButton>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: hasMultipleCompanies ? 0.25 : 0.2 }}
      >
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Impostazioni
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <HapticButton
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => {
                triggerHaptic('medium');
                window.location.href = '/acquista';
              }}
              data-testid="button-switch-to-customer"
            >
              <ArrowRightLeft className="w-4 h-4" />
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
    </div>
  );

  const renderEventTabBar = () => {
    if (!selectedEventId || activeTab === 'wallet' || activeTab === 'profilo') {
      return null;
    }
    return (
      <div className="flex gap-2 py-3 border-b border-border">
        <HapticButton
          variant={activeTab === 'liste' ? "default" : "outline"}
          className="flex-1 gap-2"
          onClick={() => handleTabChange('liste')}
          data-testid="tab-liste"
        >
          <ListChecks className="h-4 w-4" />
          Liste
          {entries.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {entries.length}
            </Badge>
          )}
        </HapticButton>
        <HapticButton
          variant={activeTab === 'tavoli' ? "default" : "outline"}
          className="flex-1 gap-2"
          onClick={() => handleTabChange('tavoli')}
          data-testid="tab-tavoli"
        >
          <Armchair className="h-4 w-4" />
          Tavoli
          {tables.filter(t => t.status === 'available').length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {tables.filter(t => t.status === 'available').length}
            </Badge>
          )}
        </HapticButton>
      </div>
    );
  };

  const renderContent = () => {
    if (!selectedEventId && (activeTab === 'liste' || activeTab === 'tavoli')) {
      if (activeTab === 'liste') return renderListeTab();
      if (activeTab === 'tavoli') return renderTavoliTab();
    }

    switch (activeTab) {
      case 'home':
        if (selectedEventId) {
          return (
            <>
              {renderEventTabBar()}
              <div className="text-center py-8 text-muted-foreground">
                <p>Seleziona Liste o Tavoli per gestire l'evento</p>
              </div>
            </>
          );
        }
        return renderHomeTab();
      case 'liste':
        return (
          <>
            {renderEventTabBar()}
            {renderListeTab()}
          </>
        );
      case 'tavoli':
        return (
          <>
            {renderEventTabBar()}
            {renderTavoliTab()}
          </>
        );
      case 'wallet':
        return renderWalletTab();
      case 'profilo':
        return renderProfiloTab();
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
        onClose={() => { setIsAddGuestOpen(false); resetCustomerSearch(); }}
        title={contactToAdd ? "Aggiungi dalla Rubrica" : "Nuovo Ospite"}
      >
        <Form {...guestForm}>
          <form 
            onSubmit={guestForm.handleSubmit((data) => addGuestMutation.mutate(data))}
            className="p-4 space-y-4"
          >
            <FormField
              control={guestForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        {...field} 
                        type="tel" 
                        className="h-12 pr-10" 
                        data-testid="input-guest-phone"
                        onChange={(e) => {
                          field.onChange(e);
                          setCustomerSearchPhone(e.target.value);
                        }}
                      />
                      {isSearchingCustomer && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {customerSearchResult && (
              <Card className="border-green-500/50 bg-green-500/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-400">
                          Cliente trovato
                        </p>
                        <p className="text-sm text-foreground">
                          {customerSearchResult.firstName} {customerSearchResult.lastName}
                        </p>
                      </div>
                    </div>
                    <HapticButton
                      type="button"
                      size="sm"
                      onClick={handleUseCustomerData}
                      data-testid="button-use-customer-data"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Usa
                    </HapticButton>
                  </div>
                </CardContent>
              </Card>
            )}

            {customerNotFound && customerSearchPhone.length >= 3 && (
              <Card className="border-yellow-500/50 bg-yellow-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-medium text-yellow-700 dark:text-yellow-400">
                        Nuovo cliente
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Completa i dati per registrare
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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

            {showNewCustomerFields && (
              <FormField
                control={guestForm.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data di nascita</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="date" 
                        className="h-12" 
                        data-testid="input-guest-birthdate" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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

      <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
        <DialogContent className="mx-4" data-testid="dialog-payout">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" />
              Richiedi Pagamento
            </DialogTitle>
            <DialogDescription>
              Stai per richiedere un pagamento di {formatCurrency(wallet?.availableForPayout || 0)}.
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <HapticButton
              variant="outline"
              onClick={() => setIsPayoutDialogOpen(false)}
              data-testid="button-cancel-payout"
            >
              Annulla
            </HapticButton>
            <HapticButton
              onClick={confirmPayout}
              disabled={requestPayoutMutation.isPending}
              hapticType="success"
              data-testid="button-confirm-payout"
            >
              {requestPayoutMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Conferma Richiesta
            </HapticButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="mx-4" data-testid="dialog-email">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Aggiungi Email
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nome@esempio.com"
              className="mt-2"
              data-testid="input-new-email"
            />
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <HapticButton
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
            >
              Annulla
            </HapticButton>
            <HapticButton
              onClick={handleAddEmail}
              disabled={isUpdatingProfile || !newEmail}
              hapticType="success"
              data-testid="button-save-email"
            >
              {isUpdatingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Salva
            </HapticButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="mx-4" data-testid="dialog-password">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Cambia Password
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="currentPassword">Password Attuale</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-2"
                data-testid="input-current-password"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">Nuova Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-2"
                data-testid="input-new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2"
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <HapticButton
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
            >
              Annulla
            </HapticButton>
            <HapticButton
              onClick={handleChangePassword}
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              hapticType="success"
              data-testid="button-save-password"
            >
              {isChangingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Cambia Password
            </HapticButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileAppLayout>
  );
}
