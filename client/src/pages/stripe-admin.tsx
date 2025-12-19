import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  Euro,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  TrendingUp,
  Activity,
  Banknote,
  Globe,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import type { SiaeTransaction } from "@shared/schema";

export default function StripeAdminPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const { data: allTransactions, isLoading } = useQuery<SiaeTransaction[]>({
    queryKey: ['/api/siae/transactions'],
    enabled: !!companyId,
  });

  const isProduction = false;
  const stripeMode = isProduction ? "production" : "sandbox";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Completata</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">In Attesa</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Fallita</Badge>;
      case "refunded":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Rimborsata</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentIcon = (method: string | null) => {
    switch (method) {
      case "card":
        return <CreditCard className="w-4 h-4" />;
      case "cash":
        return <Banknote className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getPaymentLabel = (method: string | null) => {
    switch (method) {
      case "card":
        return "Carta";
      case "cash":
        return "Contanti";
      case "bank_transfer":
        return "Bonifico";
      case "paypal":
        return "PayPal";
      default:
        return method || "-";
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = {
    totalRevenue: allTransactions
      ?.filter(t => t.status === "completed")
      .reduce((sum, t) => sum + Number(t.totalAmount || 0), 0) || 0,
    todayRevenue: allTransactions
      ?.filter(t => {
        if (t.status !== "completed" || !t.createdAt) return false;
        const txDate = new Date(t.createdAt);
        txDate.setHours(0, 0, 0, 0);
        return txDate.getTime() === today.getTime();
      })
      .reduce((sum, t) => sum + Number(t.totalAmount || 0), 0) || 0,
    successfulTransactions: allTransactions?.filter(t => t.status === "completed").length || 0,
    failedTransactions: allTransactions?.filter(t => t.status === "failed").length || 0,
    pendingPayments: allTransactions
      ?.filter(t => t.status === "pending")
      .reduce((sum, t) => sum + Number(t.totalAmount || 0), 0) || 0,
  };

  const recentTransactions = allTransactions
    ?.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 20);

  const openStripeDashboard = () => {
    const dashboardUrl = isProduction
      ? "https://dashboard.stripe.com"
      : "https://dashboard.stripe.com/test";
    window.open(dashboardUrl, "_blank");
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-stripe-admin">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-stripe-admin">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
      >
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3" data-testid="page-title">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-[#FFD700] flex-shrink-0" />
            Pagamenti Stripe
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gestisci le transazioni e monitora i pagamenti
          </p>
        </div>
        <Button
          onClick={openStripeDashboard}
          className="bg-[#635BFF] hover:bg-[#5851DB] text-white"
          data-testid="button-stripe-dashboard"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Apri Dashboard Stripe
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-card" data-testid="card-stripe-status">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isProduction 
                    ? "bg-emerald-500/20" 
                    : "bg-amber-500/20"
                }`}>
                  <CreditCard className={`w-5 h-5 ${
                    isProduction ? "text-emerald-400" : "text-amber-400"
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold">Connessione Stripe</h3>
                  <p className="text-sm text-muted-foreground">
                    Stato attuale della connessione
                  </p>
                </div>
              </div>
              <Badge 
                className={`px-3 py-1.5 ${
                  isProduction 
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                }`}
                data-testid="badge-stripe-mode"
              >
                {isProduction ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Produzione
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Modalità Sandbox
                  </>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card" data-testid="card-total-revenue">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <Euro className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400" />
              </div>
              <div className="text-lg sm:text-2xl font-bold text-[#FFD700]" data-testid="stat-total-revenue">
                €{stats.totalRevenue.toFixed(2)}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Incasso Totale</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="glass-card" data-testid="card-today-revenue">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold" data-testid="stat-today-revenue">
                €{stats.todayRevenue.toFixed(2)}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Incasso Oggi</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card" data-testid="card-successful-transactions">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-emerald-400" data-testid="stat-successful">
                {stats.successfulTransactions}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Transazioni Riuscite</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="glass-card" data-testid="card-failed-transactions">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center flex-shrink-0">
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-destructive" data-testid="stat-failed">
                {stats.failedTransactions}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Transazioni Fallite</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-card" data-testid="card-pending-info">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Pagamenti in Attesa</div>
                <div className="text-xl font-bold text-amber-400" data-testid="stat-pending">
                  €{stats.pendingPayments.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="glass-card" data-testid="card-transactions-table">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#FFD700]" />
              Transazioni Recenti
            </CardTitle>
            <CardDescription>
              Ultimi pagamenti dalla biglietteria SIAE
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!recentTransactions || recentTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nessuna Transazione</h3>
                <p className="text-muted-foreground">
                  Non ci sono transazioni da visualizzare
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Importo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Cliente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((transaction) => (
                      <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                        <TableCell data-testid={`cell-date-${transaction.id}`}>
                          <div className="text-sm">
                            {transaction.createdAt && format(new Date(transaction.createdAt), "dd/MM/yyyy", { locale: it })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {transaction.createdAt && format(new Date(transaction.createdAt), "HH:mm", { locale: it })}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`cell-amount-${transaction.id}`}>
                          <span className="flex items-center gap-1 font-medium text-[#FFD700]">
                            <Euro className="w-3 h-3" />
                            {Number(transaction.totalAmount).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell data-testid={`cell-status-${transaction.id}`}>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                        <TableCell data-testid={`cell-payment-${transaction.id}`}>
                          <span className="flex items-center gap-2">
                            {getPaymentIcon(transaction.paymentMethod)}
                            {getPaymentLabel(transaction.paymentMethod)}
                          </span>
                        </TableCell>
                        <TableCell data-testid={`cell-customer-${transaction.id}`}>
                          <div>
                            <div className="font-mono text-xs">{transaction.customerUniqueCode || "-"}</div>
                            {transaction.customerEmail && (
                              <div className="text-xs text-muted-foreground">{transaction.customerEmail}</div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
