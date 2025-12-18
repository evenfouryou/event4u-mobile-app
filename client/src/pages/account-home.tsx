import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Wallet,
  Ticket,
  Calendar,
  ArrowRight,
  ShoppingBag,
  QrCode,
  CreditCard,
  Sparkles,
  Loader2,
  MapPin,
} from "lucide-react";

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface WalletData {
  id: string;
  balance: string;
  currency: string;
  isActive: boolean;
}

interface TicketItem {
  id: string;
  ticketCode: string;
  ticketType: string;
  sectorName: string;
  eventName: string;
  eventStart: string;
  locationName: string;
  status: string;
}

interface TicketsResponse {
  upcoming: TicketItem[];
  past: TicketItem[];
  total: number;
}

export default function AccountHome() {
  const { data: customer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ["/api/public/customers/me"],
  });

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ["/api/public/account/wallet"],
  });

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<TicketsResponse>({
    queryKey: ["/api/public/account/tickets"],
  });

  const isLoading = customerLoading || walletLoading || ticketsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const balance = parseFloat(wallet?.balance || "0");
  const upcomingTickets = ticketsData?.upcoming?.slice(0, 3) || [];
  const totalTickets = ticketsData?.total || 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buongiorno";
    if (hour < 18) return "Buon pomeriggio";
    return "Buonasera";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-2xl p-4 sm:p-6 md:p-8 border border-primary/20">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground" data-testid="text-greeting">
              {getGreeting()}, {customer?.firstName}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Benvenuto nel tuo portale Event4U
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <Link href="/acquista">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <span className="font-medium text-xs sm:text-sm text-foreground">Acquista Biglietti</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/account/tickets">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="font-medium text-xs sm:text-sm text-foreground">I Miei QR</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/account/wallet">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium text-xs sm:text-sm text-foreground">Ricarica Wallet</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/account/resales">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
                <Ticket className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="font-medium text-xs sm:text-sm text-foreground">Rivendi Biglietti</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Wallet className="w-5 h-5 text-primary" />
            Il Mio Wallet
          </CardTitle>
          <Link href="/account/wallet">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-wallet">
              Dettagli <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-wallet-balance">
                {balance.toFixed(2)} €
              </p>
              <p className="text-sm text-muted-foreground">Saldo disponibile</p>
            </div>
            <Link href="/account/wallet">
              <Button className="gap-2" data-testid="button-topup">
                <CreditCard className="w-4 h-4" />
                Ricarica
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Ticket className="w-5 h-5 text-primary" />
            Prossimi Eventi
          </CardTitle>
          <Link href="/account/tickets">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-tickets">
              Tutti ({totalTickets}) <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingTickets.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Nessun biglietto in programma</p>
              <Link href="/acquista">
                <Button className="gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Esplora Eventi
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTickets.map((ticket) => (
                <Link key={ticket.id} href={`/account/tickets/${ticket.id}`}>
                  <div 
                    className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    data-testid={`ticket-preview-${ticket.id}`}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{ticket.eventName}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{format(new Date(ticket.eventStart), "d MMM", { locale: it })}</span>
                        <span>•</span>
                        <span className="truncate">{ticket.locationName}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">
                      {ticket.sectorName}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
