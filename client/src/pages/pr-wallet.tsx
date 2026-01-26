import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePrAuth } from "@/hooks/usePrAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Banknote,
  Receipt,
  Gift,
  Send,
  History,
  DollarSign,
  Star,
  Sparkles,
} from "lucide-react";

interface WalletInfo {
  id: string;
  balance: string;
  pendingPayout: string;
  totalEarned: string;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  description: string;
  status: string;
  createdAt: string;
  reference?: string;
}

interface PayoutRequest {
  id: string;
  amount: string;
  status: string;
  requestedAt: string;
  processedAt?: string;
}

export default function PrWallet() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { prProfile } = usePrAuth();
  const [activeTab, setActiveTab] = useState("transazioni");

  const { data: wallet, isLoading: isLoadingWallet } = useQuery<WalletInfo>({
    queryKey: ["/api/pr/wallet"],
    enabled: !!prProfile,
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/pr/wallet/transactions"],
    enabled: !!prProfile,
  });

  const { data: payoutRequests = [], isLoading: isLoadingPayouts } = useQuery<PayoutRequest[]>({
    queryKey: ["/api/pr/wallet/payout-requests"],
    enabled: !!prProfile,
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/pr/wallet/request-payout");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Richiesta inviata!", description: "La tua richiesta di pagamento è stata inviata." });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pr/wallet/payout-requests"] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile inviare la richiesta.", variant: "destructive" });
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "commission":
      case "earning":
        return <TrendingUp className="h-5 w-5 text-emerald-500" />;
      case "payout":
      case "withdrawal":
        return <Send className="h-5 w-5 text-blue-500" />;
      case "bonus":
      case "reward":
        return <Gift className="h-5 w-5 text-amber-500" />;
      case "refund":
        return <ArrowDownLeft className="h-5 w-5 text-orange-500" />;
      default:
        return <Receipt className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "commission":
      case "earning":
      case "bonus":
      case "reward":
        return "text-emerald-500";
      case "payout":
      case "withdrawal":
        return "text-blue-500";
      case "refund":
        return "text-orange-500";
      default:
        return "text-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Completato</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">In attesa</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">In elaborazione</Badge>;
      case "rejected":
      case "failed":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Rifiutato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const balance = parseFloat(wallet?.balance || "0");
  const pendingPayout = parseFloat(wallet?.pendingPayout || "0");
  const totalEarned = parseFloat(wallet?.totalEarned || "0");
  const canRequestPayout = balance >= 50;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/pr/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Wallet</h1>
              <p className="text-sm text-muted-foreground">Gestisci i tuoi guadagni</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-6 space-y-6">
        {/* Balance Card - Credit Card Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden">
            <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 md:p-8">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-6 w-6 text-white/80" />
                    <span className="text-white/80 font-medium">PR Wallet</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <span className="text-white/80 text-sm">{prProfile?.prCode}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-white/60 text-sm mb-1">Saldo disponibile</p>
                  <div className="flex items-baseline gap-2">
                    {isLoadingWallet ? (
                      <Skeleton className="h-12 w-32 bg-white/20" />
                    ) : (
                      <span className="text-5xl font-bold text-white">
                        €{balance.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-white/60 text-xs mb-1">In attesa</p>
                    <p className="text-white font-semibold">€{pendingPayout.toFixed(2)}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-white/60 text-xs mb-1">Totale guadagnato</p>
                    <p className="text-white font-semibold">€{totalEarned.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Request Payout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Button
            className="w-full"
            size="lg"
            disabled={!canRequestPayout || requestPayoutMutation.isPending}
            onClick={() => requestPayoutMutation.mutate()}
            data-testid="button-request-payout"
          >
            <Send className="h-5 w-5 mr-2" />
            {requestPayoutMutation.isPending ? "Invio in corso..." : "Richiedi Pagamento"}
          </Button>
          {!canRequestPayout && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              Saldo minimo per il prelievo: €50.00
            </p>
          )}
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3"
        >
          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">
                {transactions.filter(t => t.type === "commission" || t.type === "earning").length}
              </p>
              <p className="text-xs text-muted-foreground">Commissioni</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-4 text-center">
              <Gift className="h-6 w-6 text-amber-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">
                {transactions.filter(t => t.type === "bonus" || t.type === "reward").length}
              </p>
              <p className="text-xs text-muted-foreground">Bonus</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4 text-center">
              <Send className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">
                {payoutRequests.filter(p => p.status === "completed" || p.status === "paid").length}
              </p>
              <p className="text-xs text-muted-foreground">Prelievi</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="transazioni" data-testid="tab-transactions">
                <History className="h-4 w-4 mr-2" />
                Transazioni
              </TabsTrigger>
              <TabsTrigger value="prelievi" data-testid="tab-payouts">
                <Banknote className="h-4 w-4 mr-2" />
                Prelievi
              </TabsTrigger>
            </TabsList>

            {/* Transactions Tab */}
            <TabsContent value="transazioni" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Storico Transazioni
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingTransactions ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : transactions.length > 0 ? (
                    <div className="space-y-3">
                      {transactions.map((transaction, index) => (
                        <motion.div
                          key={transaction.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-background">
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">
                                {transaction.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(transaction.createdAt)} • {formatTime(transaction.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                              {transaction.type === "payout" || transaction.type === "withdrawal" ? "-" : "+"}
                              €{parseFloat(transaction.amount).toFixed(2)}
                            </p>
                            {getStatusBadge(transaction.status)}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="font-medium text-foreground">Nessuna transazione</p>
                      <p className="text-sm text-muted-foreground">Le tue transazioni appariranno qui</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payouts Tab */}
            <TabsContent value="prelievi" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary" />
                    Richieste di Prelievo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingPayouts ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : payoutRequests.length > 0 ? (
                    <div className="space-y-3">
                      {payoutRequests.map((payout, index) => (
                        <motion.div
                          key={payout.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              payout.status === "completed" || payout.status === "paid"
                                ? "bg-emerald-500/10"
                                : payout.status === "pending"
                                ? "bg-amber-500/10"
                                : "bg-muted"
                            }`}>
                              {payout.status === "completed" || payout.status === "paid" ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              ) : payout.status === "pending" ? (
                                <Clock className="h-5 w-5 text-amber-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-destructive" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                €{parseFloat(payout.amount).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Richiesto il {formatDate(payout.requestedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(payout.status)}
                            {payout.processedAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Processato il {formatDate(payout.processedAt)}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="font-medium text-foreground">Nessuna richiesta</p>
                      <p className="text-sm text-muted-foreground">
                        Le tue richieste di prelievo appariranno qui
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
