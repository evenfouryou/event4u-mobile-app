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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

export default function PrWalletPage() {
  const [, setLocation] = useLocation();
  const { prProfile, isLoading: authLoading, isAuthenticated, logout, isLoggingOut, updateProfile, isUpdatingProfile, changePassword, isChangingPassword } = usePrAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/pr/login");
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

  const getPayoutStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4 px-4 pt-4">
      <Skeleton className="h-[180px] w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-[100px] rounded-2xl" />
        <Skeleton className="h-[100px] rounded-2xl" />
      </div>
      <Skeleton className="h-[200px] w-full rounded-2xl" />
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
    <div className="grid grid-cols-2 gap-4">
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
                    {getPayoutStatusIcon(payout.status)}
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

  const header = (
    <MobileHeader
      title="Portafoglio"
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

  // Mobile version
  if (isMobile) {
    return (
      <MobileAppLayout
        header={header}
        contentClassName="space-y-4 py-4"
      >
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

        <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen} data-testid="dialog-request-payout">
          <DialogContent className="mx-4">
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
      </MobileAppLayout>
    );
  }

  // Desktop version
  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-pr-wallet">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portafoglio</h1>
          <p className="text-muted-foreground">Gestisci i tuoi guadagni e richiedi i pagamenti</p>
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

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card className="col-span-2 bg-gradient-to-br from-primary/10 to-background border-primary/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo Disponibile</p>
                      <div className="text-3xl font-bold text-primary tabular-nums" data-testid="text-wallet-balance">
                        {formatCurrency(wallet?.availableForPayout || 0)}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleRequestPayout}
                    disabled={!wallet?.availableForPayout || wallet.availableForPayout <= 0}
                    className="gap-2"
                    data-testid="button-request-payout"
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
                    <div className="text-2xl font-bold tabular-nums" data-testid="text-pending-earnings">
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
                    <div className="text-2xl font-bold text-emerald-400 tabular-nums" data-testid="text-paid-earnings">
                      {formatCurrency(wallet?.paidEarnings || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Guadagni Pagati</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Storico Pagamenti
              </CardTitle>
              <CardDescription>
                Lista di tutte le tue richieste di pagamento
              </CardDescription>
            </CardHeader>
            <CardContent data-testid="list-payouts">
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

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent data-testid="dialog-add-email-desktop">
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
              <Label htmlFor="email-desktop">Email</Label>
              <Input
                id="email-desktop"
                type="email"
                placeholder="tua@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                data-testid="input-new-email-desktop"
              />
            </div>
          </div>
          <DialogFooter>
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
        <DialogContent data-testid="dialog-change-password-desktop">
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
              <Label htmlFor="currentPassword-desktop">Password Attuale</Label>
              <Input
                id="currentPassword-desktop"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="input-current-password-desktop"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword-desktop">Nuova Password</Label>
              <Input
                id="newPassword-desktop"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password-desktop"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword-desktop">Conferma Password</Label>
              <Input
                id="confirmPassword-desktop"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-confirm-password-desktop"
              />
            </div>
          </div>
          <DialogFooter>
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
        <DialogContent data-testid="dialog-request-payout">
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
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Importo richiesto</span>
                <span className="font-bold text-2xl text-primary tabular-nums">
                  {formatCurrency(wallet?.availableForPayout || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Una volta confermata, la richiesta verrà elaborata dal team amministrativo.
                I tempi di elaborazione sono di circa 3-5 giorni lavorativi.
              </p>
            </div>
          </div>
          <DialogFooter>
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
                  Invio in corso...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Conferma Richiesta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
