import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
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
} from "lucide-react";

interface WalletData {
  balance: number;
  currency: string;
}

interface Transaction {
  id: number;
  type: "credit" | "debit" | "purchase" | "resale" | "refund" | "bonus";
  description: string;
  amount: number;
  createdAt: string;
}

const transactionIcons: Record<string, typeof Wallet> = {
  credit: ArrowDownLeft,
  debit: ArrowUpRight,
  purchase: ShoppingCart,
  resale: RefreshCw,
  refund: CreditCard,
  bonus: Gift,
};

const transactionLabels: Record<string, string> = {
  credit: "Ricarica",
  debit: "Prelievo",
  purchase: "Acquisto",
  resale: "Rivendita",
  refund: "Rimborso",
  bonus: "Bonus",
};

export default function AccountWallet() {
  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ["/api/public/account/wallet"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/public/account/wallet/transactions"],
  });

  const isLoading = walletLoading || transactionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  const balance = wallet?.balance || 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Wallet</h1>
        <p className="text-slate-400 mt-2">Gestisci il tuo saldo e le transazioni</p>
      </div>

      <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 mb-8">
        <CardContent className="p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Wallet className="w-7 h-7 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Saldo Disponibile</p>
              <p className="text-4xl font-bold text-white" data-testid="text-balance">
                €{(balance / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#151922] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-yellow-400" />
            Storico Transazioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-slate-500" />
              </div>
              <p>Nessuna transazione</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const Icon = transactionIcons[tx.type] || Wallet;
                const isPositive = tx.amount > 0;
                const transactionDate = parseISO(tx.createdAt);

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                    data-testid={`transaction-${tx.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isPositive ? "bg-green-500/20" : "bg-red-500/20"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            isPositive ? "text-green-400" : "text-red-400"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-white" data-testid="text-description">
                          {tx.description}
                        </p>
                        <p className="text-sm text-slate-400" data-testid="text-date">
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
                        {isPositive ? "+" : ""}€{(tx.amount / 100).toFixed(2)}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {transactionLabels[tx.type] || tx.type}
                      </Badge>
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
