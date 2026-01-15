import { useState, useMemo, useEffect } from "react";
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
  MobileBottomBar,
  MobileNavItem,
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Home,
  Plus,
  Users,
  Armchair,
  Wallet,
  User,
  Loader2,
  Calendar,
  ChevronRight,
  Euro,
  TrendingUp,
  RefreshCw,
  Lock,
  LogOut,
  ArrowRightLeft,
  Building,
  CheckCircle2,
  XCircle,
  Phone,
  UserPlus,
  Percent,
  Clock,
  MapPin,
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { it } from "date-fns/locale";
import { BrandLogo } from "@/components/brand-logo";

type MainTab = 'home' | 'subordinates' | 'proposals' | 'wallet' | 'profilo';

interface StaffProfile {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  phone: string;
  phonePrefix?: string;
  email?: string | null;
  prCode: string;
  displayName?: string | null;
  isStaff: boolean;
  staffCommissionPercentage?: string | null;
  commissionPercentage?: string | null;
  isActive: boolean;
  company?: {
    id: string;
    name: string;
  };
}

interface Subordinate {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  phonePrefix?: string;
  email?: string | null;
  prCode: string;
  displayName?: string | null;
  profileImageUrl?: string | null;
  commissionPercentage?: string;
  commissionFixedPerPerson?: string;
  isActive: boolean;
  createdAt: string;
}

interface StaffStats {
  subordinates: { total: number; active: number };
  guests: { total: number; checkedIn: number };
  tables: { total: number; pending: number; confirmed: number };
  pendingApprovals: number;
  earnings: { total: number; pending: number };
}

interface StaffEvent {
  id: string;
  eventId: string;
  eventName: string;
  eventStartDatetime: string;
  eventStatus: string;
  canAddToLists: boolean;
  canProposeTables: boolean;
  isActive: boolean;
}

interface TableProposal {
  id: string;
  tableId: string;
  eventId: string;
  bookedByUserId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  guestsCount: number;
  status: string;
  notes?: string;
  createdAt: string;
  eventName: string;
  eventStartDatetime: string;
  bookedBy?: {
    firstName: string;
    lastName: string;
    displayName?: string | null;
  };
}

interface StaffWallet {
  commissionRate: string;
  balance: {
    total: number;
    paid: number;
    pending: number;
    available: number;
  };
  subordinateEarnings: number;
  recentPayouts: Payout[];
}

interface Payout {
  id: string;
  amount: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  notes?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const createPrFormSchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  phonePrefix: z.string().min(2).max(6).default('+39'),
  phone: z.string().min(9, "Telefono non valido").max(15),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  commissionPercentage: z.string().default('0'),
  commissionFixedPerPerson: z.string().default('0'),
});

type CreatePrFormData = z.infer<typeof createPrFormSchema>;

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export default function StaffAppPage() {
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
  
  const [isCreatePrOpen, setIsCreatePrOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSwitchingToCustomer, setIsSwitchingToCustomer] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Honor saved mode preference - redirect to PR app if mode is "pr"
  useEffect(() => {
    if (isAuthenticated && prProfile) {
      const sessionKey = `pr_account_mode_${prProfile.id}`;
      const savedMode = sessionStorage.getItem(sessionKey);
      if (savedMode === 'pr') {
        window.location.href = '/pr';
      }
    }
  }, [isAuthenticated, prProfile]);

  const { data: staffProfile, isLoading: loadingProfile } = useQuery<StaffProfile>({
    queryKey: ["/api/staff/my-profile"],
    enabled: isAuthenticated,
  });

  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery<StaffStats>({
    queryKey: ["/api/staff/stats"],
    enabled: isAuthenticated,
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery<StaffEvent[]>({
    queryKey: ["/api/staff/events"],
    enabled: isAuthenticated,
  });

  const { data: subordinates = [], isLoading: loadingSubordinates, refetch: refetchSubordinates } = useQuery<Subordinate[]>({
    queryKey: ["/api/staff/subordinates"],
    enabled: isAuthenticated,
  });

  const { data: proposals = [], isLoading: loadingProposals, refetch: refetchProposals } = useQuery<TableProposal[]>({
    queryKey: ["/api/staff/table-proposals"],
    enabled: isAuthenticated,
  });

  const { data: wallet, isLoading: loadingWallet, refetch: refetchWallet, isRefetching: isRefetchingWallet } = useQuery<StaffWallet>({
    queryKey: ["/api/staff/wallet"],
    enabled: isAuthenticated,
  });

  const pendingProposalsCount = useMemo(() => 
    proposals.filter(p => p.status === 'pending').length, 
    [proposals]
  );

  const createPrForm = useForm<CreatePrFormData>({
    resolver: zodResolver(createPrFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phonePrefix: "+39",
      phone: "",
      email: "",
      commissionPercentage: "0",
      commissionFixedPerPerson: "0",
    },
  });

  const createPrMutation = useMutation({
    mutationFn: async (data: CreatePrFormData) => {
      const response = await apiRequest("POST", "/api/staff/subordinates", data);
      return response.json();
    },
    onSuccess: () => {
      refetchSubordinates();
      refetchStats();
      setIsCreatePrOpen(false);
      createPrForm.reset();
      toast({ title: "PR creato", description: "Il nuovo PR è stato creato con successo" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const togglePrActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (isActive) {
        await apiRequest("DELETE", `/api/staff/subordinates/${id}`);
      } else {
        const response = await apiRequest("PATCH", `/api/staff/subordinates/${id}`, { isActive: true });
        return response.json();
      }
    },
    onSuccess: () => {
      refetchSubordinates();
      refetchStats();
      toast({ title: "Aggiornato", description: "Stato PR aggiornato" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const approveProposalMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/staff/table-proposals/${id}/approve`);
      return response.json();
    },
    onSuccess: () => {
      refetchProposals();
      refetchStats();
      toast({ title: "Approvato", description: "La proposta tavolo è stata approvata" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await apiRequest("PATCH", `/api/staff/table-proposals/${id}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      refetchProposals();
      refetchStats();
      setIsRejectDialogOpen(false);
      setSelectedProposalId(null);
      setRejectReason("");
      toast({ title: "Rifiutato", description: "La proposta tavolo è stata rifiutata" });
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

  const renderHomeTab = () => (
    <motion.div
      key="home"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Ciao, {staffProfile?.displayName || staffProfile?.firstName || 'Staff'}
          </h1>
          <p className="text-sm text-muted-foreground">Pannello Staff</p>
        </div>
        <Badge variant="secondary" className="bg-primary/20 text-primary">
          Staff
        </Badge>
      </div>

      {loadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20">
              <CardContent className="p-4">
                <Users className="w-6 h-6 text-blue-400 mb-2" />
                <p className="text-2xl font-bold">{stats?.subordinates.active || 0}</p>
                <p className="text-xs text-muted-foreground">I Miei PR</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.15 }}>
            <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/20">
              <CardContent className="p-4">
                <UserPlus className="w-6 h-6 text-green-400 mb-2" />
                <p className="text-2xl font-bold">{stats?.guests.total || 0}</p>
                <p className="text-xs text-muted-foreground">Ospiti del Team</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/20">
              <CardContent className="p-4">
                <Armchair className="w-6 h-6 text-amber-400 mb-2" />
                <p className="text-2xl font-bold">{stats?.tables.pending || 0}</p>
                <p className="text-xs text-muted-foreground">Tavoli da Approvare</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.25 }}>
            <Card className="bg-gradient-to-br from-primary/20 to-primary/10 border-primary/20">
              <CardContent className="p-4">
                <Euro className="w-6 h-6 text-primary mb-2" />
                <p className="text-2xl font-bold">{formatCurrency(stats?.earnings.total || 0)}</p>
                <p className="text-xs text-muted-foreground">Guadagni</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            I Miei Eventi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEvents ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Nessun evento assegnato</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 5).map((event, index) => (
                <motion.div
                  key={event.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: index * 0.05 }}
                >
                  <div
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    data-testid={`event-card-${event.eventId}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{event.eventName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatEventDate(event.eventStartDatetime)}</span>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        event.eventStatus === 'published' ? 'bg-green-500/20 text-green-400' :
                        event.eventStatus === 'draft' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-muted text-muted-foreground'
                      )}
                    >
                      {event.eventStatus === 'published' ? 'Attivo' : 
                       event.eventStatus === 'draft' ? 'Bozza' : event.eventStatus}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderSubordinatesTab = () => (
    <motion.div
      key="subordinates"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">I Miei PR</h1>
        <HapticButton
          size="sm"
          onClick={() => setIsCreatePrOpen(true)}
          data-testid="button-create-pr"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nuovo PR
        </HapticButton>
      </div>

      {loadingSubordinates ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : subordinates.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Nessun PR nel tuo team</p>
            <HapticButton onClick={() => setIsCreatePrOpen(true)} data-testid="button-create-pr-empty">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi il primo PR
            </HapticButton>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subordinates.map((pr, index) => (
            <motion.div
              key={pr.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className={cn(
                  "bg-card/50 backdrop-blur border-white/10 transition-colors",
                  !pr.isActive && "opacity-60"
                )}
                data-testid={`card-pr-${pr.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {pr.displayName || `${pr.firstName} ${pr.lastName}`}
                        </h3>
                        {!pr.isActive && (
                          <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                            Inattivo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span>{pr.phonePrefix || '+39'} {pr.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {pr.prCode}
                        </Badge>
                        {pr.commissionPercentage && parseFloat(pr.commissionPercentage) > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Percent className="w-3 h-3" />
                            <span>{pr.commissionPercentage}%</span>
                          </div>
                        )}
                        {pr.commissionFixedPerPerson && parseFloat(pr.commissionFixedPerPerson) > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Euro className="w-3 h-3" />
                            <span>{pr.commissionFixedPerPerson}/persona</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Switch
                        checked={pr.isActive}
                        onCheckedChange={() => togglePrActiveMutation.mutate({ id: pr.id, isActive: pr.isActive })}
                        disabled={togglePrActiveMutation.isPending}
                        data-testid={`switch-pr-active-${pr.id}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );

  const renderProposalsTab = () => (
    <motion.div
      key="proposals"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prenotazioni</h1>
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
          {pendingProposalsCount} in attesa
        </Badge>
      </div>

      {loadingProposals ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur border-white/10">
          <CardContent className="py-12 text-center">
            <Armchair className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nessuna prenotazione da approvare</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal, index) => (
            <motion.div
              key={proposal.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-card/50 backdrop-blur border-white/10" data-testid={`card-proposal-${proposal.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{proposal.customerName}</h3>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            proposal.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                            proposal.status === 'staff_approved' ? 'bg-blue-500/20 text-blue-400' :
                            proposal.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                            'bg-red-500/20 text-red-400'
                          )}
                        >
                          {proposal.status === 'pending' ? 'In attesa' :
                           proposal.status === 'staff_approved' ? 'Approvato' :
                           proposal.status === 'confirmed' ? 'Confermato' : 'Rifiutato'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Evento: {proposal.eventName}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{proposal.guestsCount} ospiti</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatEventDate(proposal.eventStartDatetime)}</span>
                        </div>
                      </div>
                      {proposal.bookedBy && (
                        <p className="text-xs text-muted-foreground mt-2">
                          PR: {proposal.bookedBy.displayName || `${proposal.bookedBy.firstName} ${proposal.bookedBy.lastName}`}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {proposal.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <HapticButton
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => {
                          setSelectedProposalId(proposal.id);
                          setIsRejectDialogOpen(true);
                        }}
                        disabled={rejectProposalMutation.isPending}
                        data-testid={`button-reject-${proposal.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Rifiuta
                      </HapticButton>
                      <HapticButton
                        size="sm"
                        className="flex-1"
                        onClick={() => approveProposalMutation.mutate(proposal.id)}
                        disabled={approveProposalMutation.isPending}
                        hapticType="success"
                        data-testid={`button-approve-${proposal.id}`}
                      >
                        {approveProposalMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                        )}
                        Approva
                      </HapticButton>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );

  const renderWalletTab = () => (
    <motion.div
      key="wallet"
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
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <Card className="bg-gradient-to-br from-primary/30 to-primary/10 border-primary/20">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Saldo Totale</p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(wallet?.balance.total || 0)}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div>
                  <p className="text-lg font-semibold text-amber-400">
                    {formatCurrency(wallet?.balance.pending || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">In attesa</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-green-400">
                    {formatCurrency(wallet?.balance.paid || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Pagato</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-blue-400">
                    {formatCurrency(wallet?.balance.available || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Disponibile</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="w-4 h-4 text-primary" />
                Commissione Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{wallet?.commissionRate || '0'}%</p>
              <p className="text-sm text-muted-foreground mt-1">
                Guadagni dai tuoi PR: {formatCurrency(wallet?.subordinateEarnings || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Ultimi Pagamenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!wallet?.recentPayouts || wallet.recentPayouts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Euro className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nessun pagamento recente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {wallet.recentPayouts.slice(0, 5).map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div>
                        <p className="font-medium">{formatCurrency(parseFloat(payout.amount))}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payout.createdAt), "d MMM yyyy", { locale: it })}
                        </p>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          payout.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                          payout.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-muted text-muted-foreground'
                        )}
                      >
                        {payout.status === 'paid' ? 'Pagato' : 
                         payout.status === 'pending' ? 'In attesa' : payout.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );

  const renderProfiloTab = () => (
    <motion.div
      key="profilo"
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
                {staffProfile?.displayName || `${staffProfile?.firstName} ${staffProfile?.lastName}`}
              </h2>
              <p className="text-sm text-muted-foreground">{staffProfile?.phone}</p>
              {staffProfile?.email && (
                <p className="text-sm text-muted-foreground truncate">{staffProfile.email}</p>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
            <Badge className="bg-primary/30 text-primary">
              Codice PR: {staffProfile?.prCode}
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-400">
              Staff
            </Badge>
          </div>
          {staffProfile?.company && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Building className="w-4 h-4" />
              <span>{staffProfile.company.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="w-4 h-4 text-primary" />
            Statistiche
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">
              {stats?.subordinates.active || 0}
            </p>
            <p className="text-xs text-muted-foreground">PR Attivi</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">
              {stats?.guests.total || 0}
            </p>
            <p className="text-xs text-muted-foreground">Ospiti Team</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(stats?.earnings.total || 0)}
            </p>
            <p className="text-xs text-muted-foreground">Guadagni</p>
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
            disabled={!prProfile}
            onClick={() => {
              if (prProfile) {
                const sessionKey = `pr_account_mode_${prProfile.id}`;
                sessionStorage.setItem(sessionKey, 'pr');
                window.location.href = '/pr';
              }
            }}
            data-testid="button-switch-to-pr"
          >
            <User className="w-4 h-4" />
            Passa a modalità PR
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
    <div 
      className="fixed inset-0 flex flex-col bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <header className="shrink-0 flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur-xl border-b border-border z-30">
        <BrandLogo variant="horizontal" className="h-9 w-auto" />
        
        <div className="flex items-center gap-2">
          {staffProfile && (
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 cursor-pointer"
              onClick={() => setActiveTab('profilo')}
              data-testid="header-profile"
            >
              <User className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{staffProfile.firstName}</span>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-xs">Staff</Badge>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && renderHomeTab()}
          {activeTab === 'subordinates' && renderSubordinatesTab()}
          {activeTab === 'proposals' && renderProposalsTab()}
          {activeTab === 'wallet' && renderWalletTab()}
          {activeTab === 'profilo' && renderProfiloTab()}
        </AnimatePresence>
      </main>

      <MobileBottomBar className="shrink-0 z-30">
        <MobileNavItem
          icon={Home}
          label="Home"
          active={activeTab === 'home'}
          onClick={() => setActiveTab('home')}
          data-testid="nav-home"
        />
        <MobileNavItem
          icon={Users}
          label="I Miei PR"
          active={activeTab === 'subordinates'}
          onClick={() => setActiveTab('subordinates')}
          data-testid="nav-subordinates"
        />
        <MobileNavItem
          icon={Armchair}
          label="Prenotazioni"
          active={activeTab === 'proposals'}
          onClick={() => setActiveTab('proposals')}
          badge={pendingProposalsCount > 0 ? pendingProposalsCount : undefined}
          data-testid="nav-proposals"
        />
        <MobileNavItem
          icon={Wallet}
          label="Wallet"
          active={activeTab === 'wallet'}
          onClick={() => setActiveTab('wallet')}
          data-testid="nav-wallet"
        />
        <MobileNavItem
          icon={User}
          label="Profilo"
          active={activeTab === 'profilo'}
          onClick={() => setActiveTab('profilo')}
          data-testid="nav-profilo"
        />
      </MobileBottomBar>

      <Dialog open={isCreatePrOpen} onOpenChange={setIsCreatePrOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo PR</DialogTitle>
            <DialogDescription>
              Aggiungi un nuovo PR al tuo team
            </DialogDescription>
          </DialogHeader>
          <Form {...createPrForm}>
            <form onSubmit={createPrForm.handleSubmit((data) => createPrMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={createPrForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-pr-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createPrForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cognome</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-pr-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <FormField
                  control={createPrForm.control}
                  name="phonePrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prefisso</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+39" data-testid="input-pr-phone-prefix" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createPrForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-pr-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createPrForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (opzionale)</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" data-testid="input-pr-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={createPrForm.control}
                  name="commissionPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commissione %</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" max="100" step="0.1" data-testid="input-pr-commission-percent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createPrForm.control}
                  name="commissionFixedPerPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fisso/Persona</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" step="0.01" data-testid="input-pr-commission-fixed" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <HapticButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreatePrOpen(false);
                    createPrForm.reset();
                  }}
                >
                  Annulla
                </HapticButton>
                <HapticButton type="submit" disabled={createPrMutation.isPending} data-testid="button-submit-pr">
                  {createPrMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Crea PR
                </HapticButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rifiuta Prenotazione</DialogTitle>
            <DialogDescription>
              Inserisci un motivo per il rifiuto (opzionale)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Motivo del rifiuto..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              data-testid="input-reject-reason"
            />
          </div>
          <DialogFooter>
            <HapticButton
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setSelectedProposalId(null);
                setRejectReason("");
              }}
            >
              Annulla
            </HapticButton>
            <HapticButton
              variant="destructive"
              onClick={() => {
                if (selectedProposalId) {
                  rejectProposalMutation.mutate({ id: selectedProposalId, reason: rejectReason });
                }
              }}
              disabled={rejectProposalMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectProposalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Rifiuta
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
