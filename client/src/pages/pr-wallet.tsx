import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { usePrAuth } from "@/hooks/usePrAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  HapticButton, 
  MobileAppLayout, 
  MobileHeader,
  triggerHaptic 
} from "@/components/mobile-primitives";
import {
  Wallet,
  Euro,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowUpRight,
  Calendar,
  CreditCard,
  Users,
  ChevronRight,
  AlertCircle,
  Banknote,
  Mail,
  Lock,
  LogOut,
  User,
  Settings,
  ListPlus,
  Table2,
  BarChart3,
  BookUser,
  QrCode,
  Plus,
  Trash2,
  Phone,
  UserPlus,
  Check,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
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

interface Event {
  id: string;
  name: string;
  startDatetime: string;
  endDatetime?: string;
  locationName?: string;
  status?: string;
}

interface ListEntry {
  id: string;
  eventId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  gender?: string;
  notes?: string;
  status: string;
  qrCode?: string;
  checkedInAt?: string;
  createdAt: string;
}

interface TableReservation {
  id: string;
  eventId: string;
  tableTypeId: string;
  reservationName: string;
  reservationPhone?: string;
  notes?: string;
  status: string;
  createdAt: string;
}

interface PrStats {
  lists: {
    total: number;
    pending: number;
    confirmed: number;
    checkedIn: number;
    cancelled: number;
  };
  tables: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  paidReservations: {
    total: number;
    totalAmount: number;
    totalCommission: number;
  };
}

interface Contact {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  gender?: string;
  lastSeen: string;
  entryCount: number;
}

interface CustomerStats {
  totalEntries: number;
  checkedIn: number;
  noShow: number;
  cancelled: number;
  history: {
    eventName: string;
    eventDate: string;
    status: string;
    checkedIn: boolean;
    createdAt: string;
  }[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const listEntrySchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  phone: z.string().min(5, "Telefono obbligatorio"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  gender: z.string().optional(),
  notes: z.string().optional(),
});

const tableReservationSchema = z.object({
  reservationName: z.string().min(1, "Nome obbligatorio"),
  reservationPhone: z.string().optional(),
  tableTypeId: z.string().min(1, "Tipo tavolo obbligatorio"),
  notes: z.string().optional(),
});

export default function PrWalletPage() {
  const [, setLocation] = useLocation();
  const { prProfile, isLoading: authLoading, isAuthenticated, logout, isLoggingOut, updateProfile, isUpdatingProfile, changePassword, isChangingPassword } = usePrAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const listForm = useForm<z.infer<typeof listEntrySchema>>({
    resolver: zodResolver(listEntrySchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      gender: "",
      notes: "",
    },
  });

  const tableForm = useForm<z.infer<typeof tableReservationSchema>>({
    resolver: zodResolver(tableReservationSchema),
    defaultValues: {
      reservationName: "",
      reservationPhone: "",
      tableTypeId: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

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

  const { data: wallet, isLoading, refetch, isRefetching } = useQuery<WalletData>({
    queryKey: ["/api/pr/wallet"],
    enabled: isAuthenticated,
  });

  const { data: allPayouts = [], isLoading: loadingPayouts } = useQuery<Payout[]>({
    queryKey: ["/api/pr/payouts"],
    enabled: isAuthenticated,
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/pr-session/events"],
    enabled: isAuthenticated,
  });

  const { data: listEntries = [], isLoading: loadingListEntries, refetch: refetchListEntries } = useQuery<ListEntry[]>({
    queryKey: ["/api/pr-session/events", selectedEventId, "list-entries"],
    enabled: isAuthenticated && !!selectedEventId,
  });

  const { data: tableReservations = [], isLoading: loadingTableReservations, refetch: refetchTableReservations } = useQuery<TableReservation[]>({
    queryKey: ["/api/pr-session/events", selectedEventId, "table-reservations"],
    enabled: isAuthenticated && !!selectedEventId,
  });

  const { data: prStats, isLoading: loadingStats } = useQuery<PrStats>({
    queryKey: ["/api/pr-session/stats"],
    enabled: isAuthenticated,
  });

  const { data: contacts = [], isLoading: loadingContacts } = useQuery<Contact[]>({
    queryKey: ["/api/pr-session/contacts"],
    enabled: isAuthenticated,
  });

  const { data: customerStats, isLoading: loadingCustomerStats } = useQuery<CustomerStats>({
    queryKey: ["/api/pr-session/customer-stats", selectedContact?.phone],
    enabled: isAuthenticated && !!selectedContact?.phone,
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

  const addListEntryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof listEntrySchema>) => {
      const response = await apiRequest("POST", `/api/pr-session/events/${selectedEventId}/list-entries`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Ospite aggiunto", description: "L'ospite è stato aggiunto alla lista." });
      listForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/pr-session/events", selectedEventId, "list-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pr-session/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pr-session/contacts"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteListEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/pr-session/list-entries/${id}`);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Ospite rimosso", description: "L'ospite è stato rimosso dalla lista." });
      queryClient.invalidateQueries({ queryKey: ["/api/pr-session/events", selectedEventId, "list-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pr-session/stats"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const addTableReservationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tableReservationSchema>) => {
      const response = await apiRequest("POST", `/api/pr-session/events/${selectedEventId}/table-reservations`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Prenotazione aggiunta", description: "La prenotazione tavolo è stata aggiunta." });
      tableForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/pr-session/events", selectedEventId, "table-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pr-session/stats"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const deleteTableReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/pr-session/table-reservations/${id}`);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: "Prenotazione rimossa", description: "La prenotazione è stata rimossa." });
      queryClient.invalidateQueries({ queryKey: ["/api/pr-session/events", selectedEventId, "table-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pr-session/stats"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleRefresh = () => {
    triggerHaptic('medium');
    refetch();
  };

  const handleRequestPayout = () => {
    triggerHaptic('medium');
    setIsPayoutDialogOpen(true);
  };

  const confirmPayout = () => {
    triggerHaptic('medium');
    requestPayoutMutation.mutate();
  };

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-sm">In Attesa</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-sm">In Elaborazione</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-sm">Completato</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-sm">Rifiutato</Badge>;
      default:
        return <Badge variant="outline" className="text-sm">{status}</Badge>;
    }
  };

  const getListEntryStatusBadge = (status: string, checkedIn?: string) => {
    if (checkedIn) {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Entrato</Badge>;
    }
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">In Attesa</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Confermato</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Annullato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTableStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">In Attesa</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Approvato</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rifiutato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4 px-4 pt-4">
      <Skeleton className="h-[180px] w-full rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-[100px] rounded-2xl" />
        <Skeleton className="h-[100px] rounded-2xl" />
      </div>
      <Skeleton className="h-[200px] w-full rounded-2xl" />
    </div>
  );

  const EventSelector = () => (
    <div className="space-y-2">
      <Label>Seleziona Evento</Label>
      <Select value={selectedEventId} onValueChange={setSelectedEventId}>
        <SelectTrigger data-testid="select-event">
          <SelectValue placeholder="Seleziona un evento..." />
        </SelectTrigger>
        <SelectContent>
          {loadingEvents ? (
            <div className="p-4 text-center text-muted-foreground">Caricamento eventi...</div>
          ) : events.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">Nessun evento disponibile</div>
          ) : (
            events.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                <div className="flex flex-col">
                  <span>{event.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.startDatetime), "d MMM yyyy", { locale: it })}
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );

  const WalletBalanceCard = () => (
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
              Richiedi Pagamento
            </HapticButton>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const StatsCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {wallet?.thisMonthReservations || 0}
                </p>
                <p className="text-xs text-muted-foreground truncate">Prenotazioni questo mese</p>
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
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {formatCurrency(wallet?.thisMonthEarnings || 0)}
                </p>
                <p className="text-xs text-muted-foreground truncate">Guadagni questo mese</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  const ProfileCard = () => (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0.25 }}
    >
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Profilo e Impostazioni
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground" data-testid="text-pr-name">
                  {prProfile?.firstName} {prProfile?.lastName}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="text-pr-phone">
                  {prProfile?.phone}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-foreground">Email</p>
                <p className="text-xs text-muted-foreground" data-testid="text-pr-email">
                  {prProfile?.email || "Non impostata"}
                </p>
              </div>
            </div>
            {!prProfile?.email && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEmailDialogOpen(true)}
                data-testid="button-add-email"
              >
                Aggiungi
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setIsPasswordDialogOpen(true)}
            data-testid="button-change-password"
          >
            <Lock className="w-4 h-4" />
            Cambia Password
          </Button>

          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handleLogout}
            disabled={isLoggingOut}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? "Disconnessione..." : "Esci"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  const PayoutsList = ({ payouts }: { payouts: Payout[] }) => (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0.2 }}
    >
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Storico Pagamenti
          </CardTitle>
        </CardHeader>
        <CardContent data-testid="list-payouts">
          {payouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nessun pagamento ancora richiesto</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30"
                  data-testid={`payout-item-${payout.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground tabular-nums">
                        {formatCurrency(parseFloat(payout.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payout.createdAt), "d MMM yyyy", { locale: it })}
                        {payout.reservationCount && ` · ${payout.reservationCount} prenotazioni`}
                      </p>
                    </div>
                  </div>
                  {getPayoutStatusBadge(payout.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const DashboardTab = () => (
    <div className="space-y-4">
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <WalletBalanceCard />
          <StatsCards />
          <ProfileCard />
          <PayoutsList payouts={allPayouts} />
        </>
      )}
    </div>
  );

  const ListeTab = () => (
    <div className="space-y-4">
      <EventSelector />
      
      {selectedEventId && (
        <>
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Aggiungi Ospite
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...listForm}>
                <form onSubmit={listForm.handleSubmit((data) => addListEntryMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={listForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nome" data-testid="input-guest-firstname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={listForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cognome *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Cognome" data-testid="input-guest-lastname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={listForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+39 123 456 7890" data-testid="input-guest-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={listForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="email@esempio.com" data-testid="input-guest-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={listForm.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Genere</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-guest-gender">
                                <SelectValue placeholder="Seleziona..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="M">Uomo</SelectItem>
                              <SelectItem value="F">Donna</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={listForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Note aggiuntive..." data-testid="input-guest-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <HapticButton 
                    type="submit" 
                    className="w-full gap-2" 
                    disabled={addListEntryMutation.isPending}
                    data-testid="button-add-guest"
                  >
                    {addListEntryMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Aggiungi Ospite
                  </HapticButton>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-primary" />
                Ospiti in Lista ({listEntries.length})
              </CardTitle>
            </CardHeader>
            <CardContent data-testid="list-guests">
              {loadingListEntries ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : listEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nessun ospite in lista</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {listEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30"
                      data-testid={`guest-item-${entry.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {entry.firstName} {entry.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {entry.phone}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getListEntryStatusBadge(entry.status, entry.checkedInAt)}
                        {entry.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteListEntryMutation.mutate(entry.id)}
                            disabled={deleteListEntryMutation.isPending}
                            data-testid={`button-delete-guest-${entry.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedEventId && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Seleziona un evento per gestire la lista ospiti</p>
        </div>
      )}
    </div>
  );

  const TavoliTab = () => (
    <div className="space-y-4">
      <EventSelector />
      
      {selectedEventId && (
        <>
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Table2 className="w-5 h-5 text-primary" />
                Nuova Prenotazione Tavolo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...tableForm}>
                <form onSubmit={tableForm.handleSubmit((data) => addTableReservationMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={tableForm.control}
                    name="reservationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Prenotazione *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome del cliente" data-testid="input-table-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tableForm.control}
                    name="reservationPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+39 123 456 7890" data-testid="input-table-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tableForm.control}
                    name="tableTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Tavolo *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-table-type">
                              <SelectValue placeholder="Seleziona tipo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">Tavolo Standard</SelectItem>
                            <SelectItem value="vip">Tavolo VIP</SelectItem>
                            <SelectItem value="prive">Privé</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tableForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Richieste speciali..." data-testid="input-table-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <HapticButton 
                    type="submit" 
                    className="w-full gap-2" 
                    disabled={addTableReservationMutation.isPending}
                    data-testid="button-add-table"
                  >
                    {addTableReservationMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Aggiungi Prenotazione
                  </HapticButton>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Table2 className="w-5 h-5 text-primary" />
                Prenotazioni Tavoli ({tableReservations.length})
              </CardTitle>
            </CardHeader>
            <CardContent data-testid="list-table-reservations">
              {loadingTableReservations ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : tableReservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Table2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nessuna prenotazione tavolo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tableReservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30"
                      data-testid={`table-item-${reservation.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {reservation.reservationName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reservation.tableTypeId} · {format(new Date(reservation.createdAt), "d MMM", { locale: it })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTableStatusBadge(reservation.status)}
                        {reservation.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTableReservationMutation.mutate(reservation.id)}
                            disabled={deleteTableReservationMutation.isPending}
                            data-testid={`button-delete-table-${reservation.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedEventId && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Seleziona un evento per gestire le prenotazioni tavoli</p>
        </div>
      )}
    </div>
  );

  const StatisticheTab = () => (
    <div className="space-y-4">
      {loadingStats ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : prStats ? (
        <>
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-primary" />
                Statistiche Liste
              </CardTitle>
            </CardHeader>
            <CardContent data-testid="stats-lists">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                  <p className="text-2xl font-bold text-foreground">{prStats.lists.total}</p>
                  <p className="text-xs text-muted-foreground">Totale Inseriti</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{prStats.lists.checkedIn}</p>
                  <p className="text-xs text-muted-foreground">Entrati</p>
                </div>
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
                  <p className="text-2xl font-bold text-yellow-400">{prStats.lists.pending}</p>
                  <p className="text-xs text-muted-foreground">In Attesa</p>
                </div>
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
                  <p className="text-2xl font-bold text-red-400">{prStats.lists.cancelled}</p>
                  <p className="text-xs text-muted-foreground">Annullati</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Table2 className="w-5 h-5 text-primary" />
                Statistiche Tavoli
              </CardTitle>
            </CardHeader>
            <CardContent data-testid="stats-tables">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                  <p className="text-2xl font-bold text-foreground">{prStats.tables.total}</p>
                  <p className="text-xs text-muted-foreground">Totale Richiesti</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{prStats.tables.approved}</p>
                  <p className="text-xs text-muted-foreground">Approvati</p>
                </div>
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
                  <p className="text-2xl font-bold text-yellow-400">{prStats.tables.pending}</p>
                  <p className="text-xs text-muted-foreground">In Attesa</p>
                </div>
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
                  <p className="text-2xl font-bold text-red-400">{prStats.tables.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rifiutati</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Euro className="w-5 h-5 text-primary" />
                Prenotazioni a Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent data-testid="stats-paid">
              <div className="grid grid-cols-1 gap-4">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-center">
                  <p className="text-2xl font-bold text-primary">{prStats.paidReservations.total}</p>
                  <p className="text-xs text-muted-foreground">Prenotazioni Pagate</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                    <p className="text-lg font-bold text-foreground tabular-nums">
                      {formatCurrency(prStats.paidReservations.totalAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">Volume Totale</p>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <p className="text-lg font-bold text-emerald-400 tabular-nums">
                      {formatCurrency(prStats.paidReservations.totalCommission)}
                    </p>
                    <p className="text-xs text-muted-foreground">Commissioni</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Nessuna statistica disponibile</p>
        </div>
      )}
    </div>
  );

  const ClientiTab = () => (
    <div className="space-y-4">
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookUser className="w-5 h-5 text-primary" />
            Rubrica Contatti ({contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent data-testid="list-contacts">
          {loadingContacts ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookUser className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nessun contatto in rubrica</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact, index) => (
                <div
                  key={`${contact.phone}-${index}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30 cursor-pointer hover-elevate"
                  onClick={() => setSelectedContact(contact)}
                  data-testid={`contact-item-${index}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {contact.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {contact.entryCount} {contact.entryCount === 1 ? 'presenza' : 'presenze'}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <DialogContent className="mx-4" data-testid="dialog-customer-stats">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {selectedContact?.firstName} {selectedContact?.lastName}
            </DialogTitle>
            <DialogDescription>
              {selectedContact?.phone}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingCustomerStats ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ) : customerStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <p className="text-lg font-bold">{customerStats.totalEntries}</p>
                    <p className="text-xs text-muted-foreground">Totale</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-center">
                    <p className="text-lg font-bold text-emerald-400">{customerStats.checkedIn}</p>
                    <p className="text-xs text-muted-foreground">Entrati</p>
                  </div>
                  <div className="p-2 rounded-lg bg-yellow-500/10 text-center">
                    <p className="text-lg font-bold text-yellow-400">{customerStats.noShow}</p>
                    <p className="text-xs text-muted-foreground">No Show</p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/10 text-center">
                    <p className="text-lg font-bold text-red-400">{customerStats.cancelled}</p>
                    <p className="text-xs text-muted-foreground">Annullati</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Storico Presenze</h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {customerStats.history.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                          <div>
                            <p className="text-sm font-medium">{item.eventName || 'Evento'}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.eventDate ? format(new Date(item.eventDate), "d MMM yyyy", { locale: it }) : '-'}
                            </p>
                          </div>
                          {item.checkedIn ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400">Entrato</Badge>
                          ) : item.status === 'cancelled' ? (
                            <Badge className="bg-red-500/20 text-red-400">Annullato</Badge>
                          ) : (
                            <Badge className="bg-yellow-500/20 text-yellow-400">No Show</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">Nessuna statistica disponibile</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const PrenotazioniTab = () => (
    <div className="space-y-4">
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Prenotazioni a Pagamento
          </CardTitle>
          <CardDescription>
            Prenotazioni con pagamento effettuato
          </CardDescription>
        </CardHeader>
        <CardContent data-testid="list-paid-reservations">
          {loadingStats ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          ) : prStats?.paidReservations.total === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <QrCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nessuna prenotazione a pagamento</p>
              <p className="text-xs mt-1">Le prenotazioni con pagamento appariranno qui</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-center">
                <p className="text-3xl font-bold text-primary">{prStats?.paidReservations.total}</p>
                <p className="text-sm text-muted-foreground mt-1">Prenotazioni Completate</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    {formatCurrency(prStats?.paidReservations.totalAmount || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Volume Generato</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <p className="text-lg font-bold text-emerald-400 tabular-nums">
                    {formatCurrency(prStats?.paidReservations.totalCommission || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Tue Commissioni</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const MobileTabList = () => (
    <ScrollArea className="w-full whitespace-nowrap">
      <TabsList className="inline-flex w-max gap-1 p-1 bg-muted/50">
        <TabsTrigger value="dashboard" className="gap-1 px-3" data-testid="tab-dashboard">
          <Wallet className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </TabsTrigger>
        <TabsTrigger value="liste" className="gap-1 px-3" data-testid="tab-liste">
          <ListPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Liste</span>
        </TabsTrigger>
        <TabsTrigger value="tavoli" className="gap-1 px-3" data-testid="tab-tavoli">
          <Table2 className="w-4 h-4" />
          <span className="hidden sm:inline">Tavoli</span>
        </TabsTrigger>
        <TabsTrigger value="statistiche" className="gap-1 px-3" data-testid="tab-statistiche">
          <BarChart3 className="w-4 h-4" />
          <span className="hidden sm:inline">Stats</span>
        </TabsTrigger>
        <TabsTrigger value="clienti" className="gap-1 px-3" data-testid="tab-clienti">
          <BookUser className="w-4 h-4" />
          <span className="hidden sm:inline">Clienti</span>
        </TabsTrigger>
        <TabsTrigger value="prenotazioni" className="gap-1 px-3" data-testid="tab-prenotazioni">
          <QrCode className="w-4 h-4" />
          <span className="hidden sm:inline">QR</span>
        </TabsTrigger>
      </TabsList>
    </ScrollArea>
  );

  const header = (
    <MobileHeader
      title="PR Wallet"
      leftAction={
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
      }
      rightAction={
        <HapticButton
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefetching}
          data-testid="button-refresh"
          className="w-11 h-11"
        >
          <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
        </HapticButton>
      }
      className="border-b-0"
    />
  );

  const dialogs = (
    <>
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="mx-4" data-testid="dialog-add-email">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Aggiungi Email
            </DialogTitle>
            <DialogDescription>
              Aggiungi un indirizzo email al tuo profilo PR.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tua@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                data-testid="input-new-email"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
              disabled={isUpdatingProfile}
            >
              Annulla
            </Button>
            <Button
              onClick={handleAddEmail}
              disabled={isUpdatingProfile || !newEmail}
            >
              {isUpdatingProfile ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="mx-4" data-testid="dialog-change-password">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Cambia Password
            </DialogTitle>
            <DialogDescription>
              Inserisci la password attuale e la nuova password.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Password Attuale</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nuova Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
              disabled={isChangingPassword}
            >
              Annulla
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {isChangingPassword ? "Salvataggio..." : "Cambia Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
        <DialogContent className="mx-4" data-testid="dialog-request-payout">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" />
              Richiedi Pagamento
            </DialogTitle>
            <DialogDescription>
              Confermi di voler richiedere il pagamento del saldo disponibile?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Importo</span>
                <span className="font-bold text-lg text-primary tabular-nums">
                  {formatCurrency(wallet?.availableForPayout || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Una volta confermata, la richiesta verrà elaborata dal team amministrativo.
                I tempi di elaborazione sono di circa 3-5 giorni lavorativi.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPayoutDialogOpen(false)}
              disabled={requestPayoutMutation.isPending}
            >
              Annulla
            </Button>
            <Button
              onClick={confirmPayout}
              disabled={requestPayoutMutation.isPending}
            >
              {requestPayoutMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Invio...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Conferma
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (isMobile) {
    return (
      <MobileAppLayout
        header={header}
        contentClassName="py-4"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 pb-4">
            <MobileTabList />
          </div>
          
          <div className="px-4">
            <TabsContent value="dashboard" className="mt-0">
              <DashboardTab />
            </TabsContent>
            <TabsContent value="liste" className="mt-0">
              <ListeTab />
            </TabsContent>
            <TabsContent value="tavoli" className="mt-0">
              <TavoliTab />
            </TabsContent>
            <TabsContent value="statistiche" className="mt-0">
              <StatisticheTab />
            </TabsContent>
            <TabsContent value="clienti" className="mt-0">
              <ClientiTab />
            </TabsContent>
            <TabsContent value="prenotazioni" className="mt-0">
              <PrenotazioniTab />
            </TabsContent>
          </div>
        </Tabs>

        {dialogs}
      </MobileAppLayout>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-pr-wallet">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PR Wallet</h1>
          <p className="text-muted-foreground">Gestisci liste, tavoli, guadagni e clienti</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()} 
          disabled={isRefetching}
          data-testid="button-refresh-desktop"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start gap-1 mb-6">
          <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-dashboard-desktop">
            <Wallet className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="liste" className="gap-2" data-testid="tab-liste-desktop">
            <ListPlus className="w-4 h-4" />
            Liste
          </TabsTrigger>
          <TabsTrigger value="tavoli" className="gap-2" data-testid="tab-tavoli-desktop">
            <Table2 className="w-4 h-4" />
            Tavoli
          </TabsTrigger>
          <TabsTrigger value="statistiche" className="gap-2" data-testid="tab-statistiche-desktop">
            <BarChart3 className="w-4 h-4" />
            Statistiche
          </TabsTrigger>
          <TabsTrigger value="clienti" className="gap-2" data-testid="tab-clienti-desktop">
            <BookUser className="w-4 h-4" />
            Clienti
          </TabsTrigger>
          <TabsTrigger value="prenotazioni" className="gap-2" data-testid="tab-prenotazioni-desktop">
            <QrCode className="w-4 h-4" />
            Prenotazioni
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[120px] rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="col-span-2 bg-gradient-to-br from-primary/10 to-background border-primary/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <Wallet className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Saldo Disponibile</p>
                          <div className="text-3xl font-bold text-primary tabular-nums" data-testid="text-wallet-balance-desktop">
                            {formatCurrency(wallet?.availableForPayout || 0)}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleRequestPayout}
                        disabled={!wallet?.availableForPayout || wallet.availableForPayout <= 0}
                        className="gap-2"
                        data-testid="button-request-payout-desktop"
                      >
                        <Banknote className="w-4 h-4" />
                        Richiedi Pagamento
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold tabular-nums" data-testid="text-pending-earnings-desktop">
                          {formatCurrency(wallet?.pendingEarnings || 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">Guadagni in Sospeso</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-emerald-400 tabular-nums" data-testid="text-paid-earnings-desktop">
                          {formatCurrency(wallet?.paidEarnings || 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">Guadagni Pagati</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-400">{wallet?.thisMonthReservations || 0}</div>
                        <p className="text-sm text-muted-foreground">Prenotazioni Questo Mese</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-400 tabular-nums">
                          {formatCurrency(wallet?.thisMonthEarnings || 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">Guadagni Questo Mese</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate" data-testid="text-pr-name-desktop">
                          {prProfile?.firstName} {prProfile?.lastName}
                        </div>
                        <p className="text-sm text-muted-foreground truncate" data-testid="text-pr-phone-desktop">
                          {prProfile?.phone}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsPasswordDialogOpen(true)}
                          data-testid="button-change-password-desktop"
                        >
                          <Lock className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          data-testid="button-logout-desktop"
                        >
                          <LogOut className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Storico Pagamenti
                  </CardTitle>
                  <CardDescription>
                    Lista di tutte le tue richieste di pagamento
                  </CardDescription>
                </CardHeader>
                <CardContent data-testid="list-payouts-desktop">
                  {loadingPayouts ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : allPayouts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Wallet className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Nessun pagamento ancora richiesto</p>
                      <p className="text-sm">I tuoi pagamenti appariranno qui dopo la prima richiesta</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data Richiesta</TableHead>
                          <TableHead>Importo</TableHead>
                          <TableHead>Prenotazioni</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead>Data Elaborazione</TableHead>
                          <TableHead>Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allPayouts.map((payout) => (
                          <TableRow key={payout.id} data-testid={`row-payout-${payout.id}`}>
                            <TableCell>
                              {format(new Date(payout.createdAt), "d MMM yyyy HH:mm", { locale: it })}
                            </TableCell>
                            <TableCell className="font-semibold tabular-nums">
                              {formatCurrency(parseFloat(payout.amount))}
                            </TableCell>
                            <TableCell>{payout.reservationCount || '-'}</TableCell>
                            <TableCell>{getPayoutStatusBadge(payout.status)}</TableCell>
                            <TableCell>
                              {payout.processedAt 
                                ? format(new Date(payout.processedAt), "d MMM yyyy", { locale: it })
                                : '-'
                              }
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {payout.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="liste" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="col-span-1">
              <EventSelector />
            </div>
          </div>
          {selectedEventId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" />
                    Aggiungi Ospite
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...listForm}>
                    <form onSubmit={listForm.handleSubmit((data) => addListEntryMutation.mutate(data))} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={listForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Nome" data-testid="input-guest-firstname-desktop" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={listForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cognome *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Cognome" data-testid="input-guest-lastname-desktop" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={listForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefono *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="+39 123 456 7890" data-testid="input-guest-phone-desktop" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={listForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="email@esempio.com" data-testid="input-guest-email-desktop" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={listForm.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Genere</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-guest-gender-desktop">
                                  <SelectValue placeholder="Seleziona..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="M">Uomo</SelectItem>
                                <SelectItem value="F">Donna</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={listForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Note</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Note aggiuntive..." data-testid="input-guest-notes-desktop" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full gap-2" 
                        disabled={addListEntryMutation.isPending}
                        data-testid="button-add-guest-desktop"
                      >
                        {addListEntryMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        Aggiungi Ospite
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListPlus className="w-5 h-5 text-primary" />
                    Ospiti in Lista ({listEntries.length})
                  </CardTitle>
                </CardHeader>
                <CardContent data-testid="list-guests-desktop">
                  {loadingListEntries ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : listEntries.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Nessun ospite in lista</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Telefono</TableHead>
                            <TableHead>Stato</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {listEntries.map((entry) => (
                            <TableRow key={entry.id} data-testid={`row-guest-${entry.id}`}>
                              <TableCell className="font-medium">
                                {entry.firstName} {entry.lastName}
                              </TableCell>
                              <TableCell>{entry.phone}</TableCell>
                              <TableCell>{getListEntryStatusBadge(entry.status, entry.checkedInAt)}</TableCell>
                              <TableCell>
                                {entry.status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteListEntryMutation.mutate(entry.id)}
                                    disabled={deleteListEntryMutation.isPending}
                                    data-testid={`button-delete-guest-desktop-${entry.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          {!selectedEventId && (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Seleziona un evento per gestire la lista ospiti</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tavoli" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="col-span-1">
              <EventSelector />
            </div>
          </div>
          {selectedEventId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Table2 className="w-5 h-5 text-primary" />
                    Nuova Prenotazione
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...tableForm}>
                    <form onSubmit={tableForm.handleSubmit((data) => addTableReservationMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={tableForm.control}
                        name="reservationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Prenotazione *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nome del cliente" data-testid="input-table-name-desktop" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tableForm.control}
                        name="reservationPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefono</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="+39 123 456 7890" data-testid="input-table-phone-desktop" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tableForm.control}
                        name="tableTypeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo Tavolo *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-table-type-desktop">
                                  <SelectValue placeholder="Seleziona tipo..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="standard">Tavolo Standard</SelectItem>
                                <SelectItem value="vip">Tavolo VIP</SelectItem>
                                <SelectItem value="prive">Privé</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={tableForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Note</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Richieste speciali..." data-testid="input-table-notes-desktop" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full gap-2" 
                        disabled={addTableReservationMutation.isPending}
                        data-testid="button-add-table-desktop"
                      >
                        {addTableReservationMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        Aggiungi Prenotazione
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Table2 className="w-5 h-5 text-primary" />
                    Prenotazioni ({tableReservations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent data-testid="list-table-reservations-desktop">
                  {loadingTableReservations ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : tableReservations.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Table2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Nessuna prenotazione tavolo</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Stato</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableReservations.map((reservation) => (
                            <TableRow key={reservation.id} data-testid={`row-table-${reservation.id}`}>
                              <TableCell className="font-medium">
                                {reservation.reservationName}
                              </TableCell>
                              <TableCell>{reservation.tableTypeId}</TableCell>
                              <TableCell>{getTableStatusBadge(reservation.status)}</TableCell>
                              <TableCell>
                                {reservation.status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteTableReservationMutation.mutate(reservation.id)}
                                    disabled={deleteTableReservationMutation.isPending}
                                    data-testid={`button-delete-table-desktop-${reservation.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          {!selectedEventId && (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Seleziona un evento per gestire le prenotazioni tavoli</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="statistiche" className="mt-0">
          <StatisticheTab />
        </TabsContent>

        <TabsContent value="clienti" className="mt-0">
          <ClientiTab />
        </TabsContent>

        <TabsContent value="prenotazioni" className="mt-0">
          <PrenotazioniTab />
        </TabsContent>
      </Tabs>

      {dialogs}
    </div>
  );
}
