import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Wallet,
  Ticket,
  Calendar,
  ChevronRight,
  ShoppingBag,
  QrCode,
  CreditCard,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
} from "lucide-react";
import { triggerHaptic } from "@/components/mobile-primitives";

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

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: springTransition,
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { 
    opacity: 1, 
    scale: 1,
    transition: springTransition,
  },
};

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
      <div 
        className="flex items-center justify-center min-h-screen bg-background"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
        >
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </motion.div>
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

  const getInitials = () => {
    if (!customer) return "U";
    return `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <motion.div 
      className="min-h-screen bg-background pb-24"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <div className="px-4 py-6 space-y-6">
        <motion.div 
          className="flex items-center gap-4"
          variants={fadeInUp}
        >
          <Avatar className="w-16 h-16 border-2 border-primary/30">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xl font-bold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-greeting">
              {getGreeting()},
            </h1>
            <p className="text-xl font-semibold text-foreground">
              {customer?.firstName}!
            </p>
          </div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-2 gap-4"
          variants={fadeInUp}
        >
          <Link href="/acquista">
            <motion.div 
              className="bg-card rounded-2xl p-5 min-h-[120px] flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
              whileTap={{ scale: 0.95 }}
              onClick={() => triggerHaptic('light')}
              data-testid="button-buy-tickets"
            >
              <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-primary" />
              </div>
              <span className="font-semibold text-base text-foreground text-center">Acquista Biglietti</span>
            </motion.div>
          </Link>
          
          <Link href="/account/tickets">
            <motion.div 
              className="bg-card rounded-2xl p-5 min-h-[120px] flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
              whileTap={{ scale: 0.95 }}
              onClick={() => triggerHaptic('light')}
              data-testid="button-my-qr"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <QrCode className="w-7 h-7 text-emerald-500" />
              </div>
              <span className="font-semibold text-base text-foreground text-center">I Miei QR</span>
            </motion.div>
          </Link>
          
          <Link href="/account/wallet">
            <motion.div 
              className="bg-card rounded-2xl p-5 min-h-[120px] flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
              whileTap={{ scale: 0.95 }}
              onClick={() => triggerHaptic('light')}
              data-testid="button-topup-wallet"
            >
              <div className="w-14 h-14 rounded-full bg-blue-500/15 flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-blue-500" />
              </div>
              <span className="font-semibold text-base text-foreground text-center">Ricarica Wallet</span>
            </motion.div>
          </Link>
          
          <Link href="/account/resales">
            <motion.div 
              className="bg-card rounded-2xl p-5 min-h-[120px] flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
              whileTap={{ scale: 0.95 }}
              onClick={() => triggerHaptic('light')}
              data-testid="button-resell"
            >
              <div className="w-14 h-14 rounded-full bg-purple-500/15 flex items-center justify-center">
                <RefreshCw className="w-7 h-7 text-purple-500" />
              </div>
              <span className="font-semibold text-base text-foreground text-center">Rivendi Biglietti</span>
            </motion.div>
          </Link>
        </motion.div>

        <motion.div variants={scaleIn}>
          <Link href="/account/wallet">
            <motion.div 
              className="bg-gradient-to-br from-primary/20 via-primary/10 to-card rounded-2xl p-6 border border-primary/20 active:scale-98 transition-transform"
              whileTap={{ scale: 0.98 }}
              onClick={() => triggerHaptic('light')}
            >
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-lg font-semibold text-foreground">Il Mio Wallet</span>
                </div>
                <ChevronRight className="w-6 h-6 text-muted-foreground" />
              </div>
              
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-bold text-foreground tabular-nums" data-testid="text-wallet-balance">
                    {balance.toFixed(2)} €
                  </p>
                  <p className="text-base text-muted-foreground mt-1">Saldo disponibile</p>
                </div>
                <Button 
                  className="min-h-[44px] gap-2 rounded-xl"
                  onClick={(e) => {
                    e.preventDefault();
                    triggerHaptic('medium');
                  }}
                  data-testid="button-topup"
                >
                  <Plus className="w-5 h-5" />
                  Ricarica
                </Button>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Ticket className="w-6 h-6 text-primary" />
              Prossimi Eventi
            </h2>
            <Link href="/account/tickets">
              <Button 
                variant="ghost" 
                className="min-h-[44px] gap-1 text-base"
                onClick={() => triggerHaptic('light')}
                data-testid="button-view-tickets"
              >
                Tutti ({totalTickets})
                <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
          
          {upcomingTickets.length === 0 ? (
            <motion.div 
              className="bg-card rounded-2xl p-8 text-center"
              variants={scaleIn}
            >
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg text-muted-foreground mb-5">Nessun biglietto in programma</p>
              <Link href="/acquista">
                <Button 
                  className="min-h-[48px] gap-2 text-base rounded-xl px-6"
                  onClick={() => triggerHaptic('medium')}
                >
                  <ShoppingBag className="w-5 h-5" />
                  Esplora Eventi
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {upcomingTickets.map((ticket, index) => (
                <Link key={ticket.id} href={`/account/tickets/${ticket.id}`}>
                  <motion.div 
                    className="bg-card rounded-2xl p-4 flex items-center gap-4 active:scale-98 transition-transform"
                    variants={fadeInUp}
                    custom={index}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => triggerHaptic('light')}
                    data-testid={`ticket-preview-${ticket.id}`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-lg text-foreground truncate">{ticket.eventName}</h4>
                      <div className="flex items-center gap-2 text-base text-muted-foreground mt-1">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(ticket.eventStart), "d MMM yyyy", { locale: it })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-base text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{ticket.locationName}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-sm">
                        {ticket.sectorName}
                      </Badge>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
