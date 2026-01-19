import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CreditCard,
  Loader2,
  Lock,
  Unlock,
  Plus,
  ChevronRight,
  X,
  CheckCircle,
} from "lucide-react";
import { HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

let stripePromise: ReturnType<typeof loadStripe> | null = null;

async function getStripe() {
  if (!stripePromise) {
    const response = await fetch("/api/public/stripe-key");
    const { publishableKey } = await response.json();
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

interface WalletData {
  id: string;
  balance: string;
  currency: string;
  isActive: boolean;
}

interface Transaction {
  id: string;
  walletId: string;
  customerId: string;
  type: "credit" | "debit" | "hold" | "release" | "refund";
  amount: string;
  balanceAfter: string;
  description: string | null;
  ticketId: string | null;
  transactionId: string | null;
  resaleId: string | null;
  stripePaymentIntentId: string | null;
  status: string;
  metadata: string | null;
  createdAt: string;
}

interface TransactionsResponse {
  transactions: Transaction[];
}

const transactionIcons: Record<string, typeof Wallet> = {
  credit: ArrowDownLeft,
  debit: ArrowUpRight,
  hold: Lock,
  release: Unlock,
  refund: RefreshCw,
};

const getTransactionLabels = (t: (key: string) => string): Record<string, string> => ({
  credit: t("account.walletPage.typeCredit"),
  debit: t("account.walletPage.typeDebit"),
  hold: t("account.walletPage.typeHold"),
  release: t("account.walletPage.typeRelease"),
  refund: t("account.walletPage.typeRefund"),
});

const quickAmounts = [10, 20, 50, 100];

function StripePaymentForm({ 
  amount, 
  paymentIntentId,
  onSuccess, 
  onCancel 
}: { 
  amount: number;
  paymentIntentId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false);

  const confirmMutation = useMutation({
    mutationFn: async (intentId: string) => {
      const res = await apiRequest("POST", "/api/public/account/wallet/topup/confirm", { paymentIntentId: intentId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/wallet/transactions"] });
      triggerHaptic('success');
      toast({ title: t("account.walletPage.topupCompleted"), description: t("account.walletPage.topupCompletedDesc", { amount: amount.toFixed(2) }) });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: t("account.walletPage.error"), description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = async () => {
    if (!stripe || !elements || !isElementReady) return;
    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });

      if (error) {
        toast({ title: t("account.walletPage.paymentFailed"), description: error.message, variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        confirmMutation.mutate(paymentIntent.id);
      } else {
        toast({ title: t("account.walletPage.paymentNotCompleted"), description: t("account.walletPage.retry"), variant: "destructive" });
        setIsProcessing(false);
      }
    } catch (err: any) {
      toast({ title: t("account.walletPage.error"), description: err.message, variant: "destructive" });
      setIsProcessing(false);
    }
  };
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <p className="text-3xl font-bold text-foreground">€{amount.toFixed(2)}</p>
        <p className="text-muted-foreground">{t("account.walletPage.topupWallet")}</p>
      </div>
      
      <div className="p-4 bg-muted/30 rounded-2xl border border-border">
        <PaymentElement 
          options={{ layout: "tabs" }} 
          onReady={() => setIsElementReady(true)} 
        />
      </div>

      <div className="flex gap-3">
        <HapticButton
          variant="outline"
          className="flex-1 h-14 rounded-2xl"
          onClick={onCancel}
          disabled={isProcessing}
          data-testid="button-cancel-payment"
        >
          <X className="w-5 h-5 mr-2" />
          {t("account.walletPage.cancelPayment")}
        </HapticButton>
        <HapticButton
          className="flex-1 h-14 rounded-2xl"
          onClick={handleSubmit}
          disabled={!stripe || !isElementReady || isProcessing}
          hapticType="success"
          data-testid="button-confirm-payment"
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <CreditCard className="w-5 h-5 mr-2" />
          )}
          {isProcessing ? t("account.walletPage.processing") : t("account.walletPage.pay")}
        </HapticButton>
      </div>
    </div>
  );
}

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: springTransition,
  },
};

export default function AccountWallet() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripeLoaded, setStripeLoaded] = useState<Awaited<ReturnType<typeof loadStripe>> | null>(null);
  const { toast } = useToast();

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ["/api/public/account/wallet"],
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery<TransactionsResponse>({
    queryKey: ["/api/public/account/wallet/transactions"],
  });

  const createTopupMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest("POST", "/api/public/account/wallet/topup", { amount });
      return res.json();
    },
    onSuccess: async (data) => {
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      const stripe = await getStripe();
      setStripeLoaded(stripe);
      setShowPaymentDialog(true);
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: t("account.walletPage.error"), description: error.message, variant: "destructive" });
    },
  });
  
  const transactionLabels = getTransactionLabels(t);

  const isLoading = walletLoading || transactionsLoading;

  const handleQuickAmountSelect = (amount: number) => {
    triggerHaptic('medium');
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    const numValue = value.replace(/[^0-9]/g, '');
    setCustomAmount(numValue);
    setSelectedAmount(null);
  };

  const currentAmount = selectedAmount || (customAmount ? parseInt(customAmount) : 0);

  const handleRecharge = () => {
    if (currentAmount < 5) {
      toast({ title: t("account.walletPage.minAmount"), variant: "destructive" });
      return;
    }
    if (currentAmount > 500) {
      toast({ title: t("account.walletPage.maxAmount"), variant: "destructive" });
      return;
    }
    triggerHaptic('medium');
    createTopupMutation.mutate(currentAmount);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    setClientSecret(null);
    setPaymentIntentId(null);
    setSelectedAmount(null);
    setCustomAmount("");
  };

  const handlePaymentCancel = () => {
    setShowPaymentDialog(false);
    setClientSecret(null);
    setPaymentIntentId(null);
  };

  const elementsOptions: StripeElementsOptions | null = clientSecret ? {
    clientSecret,
    appearance: {
      theme: "night",
      variables: {
        colorPrimary: "#f59e0b",
        colorBackground: "#1a1a2e",
        colorText: "#ffffff",
        colorDanger: "#ef4444",
        fontFamily: "system-ui, sans-serif",
        borderRadius: "12px",
      },
    },
  } : null;

  if (isLoading) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center bg-background"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  const balance = parseFloat(wallet?.balance || "0");
  const transactions = transactionsData?.transactions || [];

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-account-wallet">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("account.walletPage.title")}</h1>
            <p className="text-muted-foreground">{t("account.walletPage.subtitle")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                {t("account.walletPage.availableBalance")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary" data-testid="text-balance-desktop">
                €{balance.toFixed(2)}
              </p>
              {wallet?.currency && wallet.currency !== "EUR" && (
                <p className="text-sm text-muted-foreground">{wallet.currency}</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {t("account.walletPage.topupTitle")}
              </CardTitle>
              <CardDescription>{t("account.walletPage.topupSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant={selectedAmount === amount ? "default" : "outline"}
                    onClick={() => handleQuickAmountSelect(amount)}
                    data-testid={`button-amount-desktop-${amount}`}
                  >
                    €{amount}
                  </Button>
                ))}
              </div>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted-foreground">
                    €
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder={t("account.walletPage.customAmount")}
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    className="pl-8"
                    data-testid="input-custom-amount-desktop"
                  />
                </div>
                <Button
                  disabled={currentAmount <= 0 || createTopupMutation.isPending}
                  onClick={handleRecharge}
                  data-testid="button-recharge-desktop"
                >
                  {createTopupMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  {createTopupMutation.isPending ? t("account.walletPage.loading") : `${t("account.walletPage.topupButton")} €${currentAmount > 0 ? currentAmount : "0"}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              {t("account.walletPage.transactionsTitle")}
            </CardTitle>
            <CardDescription>{t("account.walletPage.transactionsSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{t("account.walletPage.noTransactions")}</p>
                <p className="text-muted-foreground">{t("account.walletPage.noTransactionsDesc")}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("account.walletPage.typeLabel")}</TableHead>
                    <TableHead>{t("account.walletPage.description")}</TableHead>
                    <TableHead>{t("account.walletPage.date")}</TableHead>
                    <TableHead className="text-right">{t("account.walletPage.amount")}</TableHead>
                    <TableHead className="text-right">{t("account.walletPage.balance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const Icon = transactionIcons[tx.type] || Wallet;
                    const amount = parseFloat(tx.amount || "0");
                    const isPositive = tx.type === "credit" || tx.type === "release" || tx.type === "refund";
                    const transactionDate = new Date(tx.createdAt);

                    return (
                      <TableRow key={tx.id} data-testid={`transaction-desktop-${tx.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              isPositive ? "bg-green-500/20" : "bg-red-500/20"
                            )}>
                              <Icon className={cn("w-4 h-4", isPositive ? "text-green-500" : "text-red-500")} />
                            </div>
                            <span className="font-medium">{transactionLabels[tx.type] || tx.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tx.description || "-"}
                        </TableCell>
                        <TableCell>
                          {format(transactionDate, "d MMM yyyy, HH:mm", { locale: it })}
                        </TableCell>
                        <TableCell className={cn("text-right font-semibold", isPositive ? "text-green-500" : "text-red-500")}>
                          {isPositive ? "+" : "-"}€{Math.abs(amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          €{parseFloat(tx.balanceAfter || "0").toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {t("account.walletPage.securePayment")}
              </DialogTitle>
            </DialogHeader>
            {elementsOptions && stripeLoaded && paymentIntentId ? (
              <Elements stripe={stripeLoaded} options={elementsOptions}>
                <StripePaymentForm
                  amount={currentAmount}
                  paymentIntentId={paymentIntentId}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                />
              </Elements>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Mobile version
  return (
    <div 
      className="min-h-screen bg-background pb-24"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="px-4 py-6"
      >
        <motion.div variants={fadeInUp} className="mb-8">
          <motion.div
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6"
            whileTap={{ scale: 0.98 }}
            transition={springTransition}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-8 -bottom-8 w-24 h-24 rounded-full bg-white/5 blur-xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Wallet className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-base font-medium">{t("account.walletPage.availableBalance")}</p>
                  {wallet?.currency && wallet.currency !== "EUR" && (
                    <p className="text-white/50 text-sm">{wallet.currency}</p>
                  )}
                </div>
              </div>
              
              <motion.p 
                className="text-5xl font-bold text-white tracking-tight"
                data-testid="text-balance"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...springTransition, delay: 0.2 }}
              >
                €{balance.toFixed(2)}
              </motion.p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div variants={fadeInUp} className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {t("account.walletPage.topupTitle")}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {quickAmounts.map((amount) => (
              <motion.div
                key={amount}
                whileTap={{ scale: 0.95 }}
                transition={springTransition}
              >
                <HapticButton
                  variant={selectedAmount === amount ? "default" : "outline"}
                  className={cn(
                    "w-full h-14 text-lg font-semibold rounded-2xl",
                    selectedAmount === amount 
                      ? "bg-primary text-primary-foreground" 
                      : "border-2 border-border"
                  )}
                  onClick={() => handleQuickAmountSelect(amount)}
                  data-testid={`button-amount-${amount}`}
                >
                  €{amount}
                </HapticButton>
              </motion.div>
            ))}
          </div>

          <div className="relative mb-4">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
              €
            </div>
            <Input
              type="text"
              inputMode="numeric"
              placeholder={t("account.walletPage.customAmount")}
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              className="h-14 pl-10 text-xl font-semibold rounded-2xl border-2 bg-background"
              data-testid="input-custom-amount"
            />
          </div>

          <motion.div
            whileTap={{ scale: 0.98 }}
            transition={springTransition}
          >
            <HapticButton
              className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary/80"
              disabled={currentAmount <= 0 || createTopupMutation.isPending}
              hapticType="success"
              onClick={handleRecharge}
              data-testid="button-recharge"
            >
              {createTopupMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-5 h-5 mr-2" />
              )}
              {createTopupMutation.isPending ? t("account.walletPage.loading") : `${t("account.walletPage.topupButton")} €${currentAmount > 0 ? currentAmount : "0"}`}
            </HapticButton>
          </motion.div>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            {t("account.walletPage.transactionsTitle")}
          </h2>

          {transactions.length === 0 ? (
            <motion.div 
              className="text-center py-16 px-6 bg-muted/30 rounded-3xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springTransition}
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">Nessuna transazione</p>
              <p className="text-base text-muted-foreground mt-2">Le tue transazioni appariranno qui</p>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {transactions.map((tx) => {
                  const Icon = transactionIcons[tx.type] || Wallet;
                  const amount = parseFloat(tx.amount || "0");
                  const isPositive = tx.type === "credit" || tx.type === "release" || tx.type === "refund";
                  const transactionDate = new Date(tx.createdAt);

                  return (
                    <motion.div
                      key={tx.id}
                      variants={fadeInUp}
                      layout
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border min-h-[80px] active:bg-muted/50 transition-colors cursor-pointer"
                      data-testid={`transaction-${tx.id}`}
                      onClick={() => triggerHaptic('light')}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                            isPositive ? "bg-green-500/20" : "bg-red-500/20"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-6 h-6",
                              isPositive ? "text-green-500" : "text-red-500"
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-base text-foreground truncate" data-testid="text-description">
                            {tx.description || transactionLabels[tx.type] || tx.type}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid="text-date">
                            {format(transactionDate, "d MMM yyyy, HH:mm", { locale: it })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p
                            className={cn(
                              "font-bold text-lg",
                              isPositive ? "text-green-500" : "text-red-500"
                            )}
                            data-testid="text-amount"
                          >
                            {isPositive ? "+" : "-"}€{Math.abs(amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            €{parseFloat(tx.balanceAfter || "0").toFixed(2)}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pagamento Sicuro
            </DialogTitle>
          </DialogHeader>
          {elementsOptions && stripeLoaded && paymentIntentId ? (
            <Elements stripe={stripeLoaded} options={elementsOptions}>
              <StripePaymentForm
                amount={currentAmount}
                paymentIntentId={paymentIntentId}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </Elements>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
