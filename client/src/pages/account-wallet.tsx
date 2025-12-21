import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

const transactionLabels: Record<string, string> = {
  credit: "Ricarica",
  debit: "Spesa",
  hold: "Fondi Bloccati",
  release: "Fondi Sbloccati",
  refund: "Rimborso",
};

const quickAmounts = [10, 20, 50, 100];

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
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ["/api/public/account/wallet"],
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery<TransactionsResponse>({
    queryKey: ["/api/public/account/wallet/transactions"],
  });

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
                  <p className="text-white/70 text-base font-medium">Saldo Disponibile</p>
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
            Ricarica Wallet
          </h2>
          
          <div className="grid grid-cols-4 gap-3 mb-4">
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
              placeholder="Altro importo"
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
              disabled={currentAmount <= 0}
              hapticType="success"
              data-testid="button-recharge"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Ricarica €{currentAmount > 0 ? currentAmount : "0"}
            </HapticButton>
          </motion.div>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Storico Transazioni
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
    </div>
  );
}
