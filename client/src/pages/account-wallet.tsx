import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingCart,
  RefreshCw,
  Gift,
  CreditCard,
  Loader2,
  Lock,
  Unlock,
} from "lucide-react";

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

export default function AccountWallet() {
  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ["/api/public/account/wallet"],
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery<TransactionsResponse>({
    queryKey: ["/api/public/account/wallet/transactions"],
  });

  const isLoading = walletLoading || transactionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const balance = parseFloat(wallet?.balance || "0");
  const transactions = transactionsData?.transactions || [];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground" data-testid="text-page-title">Wallet</h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Gestisci il tuo saldo e le transazioni</p>
      </div>

      <Card className="bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30 mb-6 sm:mb-8">
        <CardContent className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Saldo Disponibile</p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground" data-testid="text-balance">
                €{balance.toFixed(2)}
              </p>
              {wallet?.currency && wallet.currency !== "EUR" && (
                <p className="text-sm text-muted-foreground">{wallet.currency}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Storico Transazioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-muted-foreground" />
              </div>
              <p>Nessuna transazione</p>
              <p className="text-sm mt-2">Le tue transazioni appariranno qui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const Icon = transactionIcons[tx.type] || Wallet;
                const amount = parseFloat(tx.amount || "0");
                const isPositive = tx.type === "credit" || tx.type === "release" || tx.type === "refund";
                const transactionDate = new Date(tx.createdAt);

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 sm:p-4 bg-muted rounded-lg gap-3"
                    data-testid={`transaction-${tx.id}`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isPositive ? "bg-green-500/20" : "bg-red-500/20"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${
                            isPositive ? "text-green-400" : "text-red-400"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-foreground" data-testid="text-description">
                          {tx.description || transactionLabels[tx.type] || tx.type}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid="text-date">
                          {format(transactionDate, "d MMM yyyy, HH:mm", { locale: it })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          isPositive ? "text-green-400" : "text-red-400"
                        }`}
                        data-testid="text-amount"
                      >
                        {isPositive ? "+" : "-"}€{Math.abs(amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Saldo: €{parseFloat(tx.balanceAfter || "0").toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
