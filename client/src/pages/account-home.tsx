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
import { HapticButton, triggerHaptic } from "@/components/mobile-primitives";

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
  type: "spring" as const,
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
        >
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
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
      className="px-4 py-6 space-y-6 pb-24"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div 
        className="bg-card rounded-3xl p-6"
        variants={fadeInUp}
      >
        <div className="flex items-center gap-5">
          <Avatar className="w-20 h-20 border-3 border-primary/30">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-2xl font-bold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-greeting">
              {getGreeting()},
            </h1>
            <p className="text-2xl font-bold text-foreground truncate">
              {customer?.firstName}!
            </p>
            <p className="text-muted-foreground text-base mt-1 truncate">
              {customer?.email}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="grid grid-cols-2 gap-4"
        variants={fadeInUp}
      >
        <Link href="/acquista">
          <motion.div 
            className="bg-card rounded-2xl p-5 min-h-[130px] flex flex-col items-center justify-center gap-3"
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
            onClick={() => triggerHaptic('light')}
            data-testid="button-buy-tickets"
          >
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-primary" />
            </div>
            <span className="font-semibold text-base text-foreground text-center">Acquista Biglietti</span>
          </motion.div>
        </Link>
        
        <Link href="/account/tickets">
          <motion.div 
            className="bg-card rounded-2xl p-5 min-h-[130px] flex flex-col items-center justify-center gap-3"
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
            onClick={() => triggerHaptic('light')}
            data-testid="button-my-qr"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <QrCode className="w-8 h-8 text-emerald-500" />
            </div>
            <span className="font-semibold text-base text-foreground text-center">I Miei QR</span>
          </motion.div>
        </Link>
        
        <Link href="/account/wallet">
          <motion.div 
            className="bg-card rounded-2xl p-5 min-h-[130px] flex flex-col items-center justify-center gap-3"
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
            onClick={() => triggerHaptic('light')}
            data-testid="button-topup-wallet"
          >
            <div className="w-16 h-16 rounded-full bg-blue-500/15 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-blue-500" />
            </div>
            <span className="font-semibold text-base text-foreground text-center">Ricarica Wallet</span>
          </motion.div>
        </Link>
        
        <Link href="/account/resales">
          <motion.div 
            className="bg-card rounded-2xl p-5 min-h-[130px] flex flex-col items-center justify-center gap-3"
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
            onClick={() => triggerHaptic('light')}
            data-testid="button-resell"
          >
            <div className="w-16 h-16 rounded-full bg-purple-500/15 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-purple-500" />
            </div>
            <span className="font-semibold text-base text-foreground text-center">Rivendi Biglietti</span>
          </motion.div>
        </Link>
      </motion.div>

      <motion.div variants={scaleIn}>
        <Link href="/account/wallet">
          <motion.div 
            className="bg-gradient-to-br from-primary/20 via-primary/10 to-card rounded-3xl p-6 border border-primary/20"
            whileTap={{ scale: 0.98 }}
            transition={springTransition}
            onClick={() => triggerHaptic('light')}
          >
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                  <Wallet className="w-7 h-7 text-primary" />
                </div>
                <span className="text-xl font-semibold text-foreground">Il Mio Wallet</span>
              </div>
              <ChevronRight className="w-6 h-6 text-muted-foreground" />
            </div>
            
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-5xl font-bold text-foreground tabular-nums" data-testid="text-wallet-balance">
                  {balance.toFixed(2)} €
                </p>
                <p className="text-lg text-muted-foreground mt-2">Saldo disponibile</p>
              </div>
              <HapticButton 
                className="min-h-[48px] gap-2 rounded-xl px-5"
                hapticType="medium"
                onClick={(e) => {
                  e.preventDefault();
                }}
                data-testid="button-topup"
              >
                <Plus className="w-5 h-5" />
                Ricarica
              </HapticButton>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
            <Ticket className="w-6 h-6 text-primary" />
            Prossimi Eventi
          </h2>
          <Link href="/account/tickets">
            <HapticButton 
              variant="ghost" 
              className="min-h-[44px] gap-1 text-base"
              hapticType="light"
              data-testid="button-view-tickets"
            >
              Tutti ({totalTickets})
              <ChevronRight className="w-5 h-5" />
            </HapticButton>
          </Link>
        </div>
        
        {upcomingTickets.length === 0 ? (
          <motion.div 
            className="bg-card rounded-3xl p-8 text-center"
            variants={scaleIn}
          >
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-5">
              <Ticket className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-xl text-muted-foreground mb-6">Nessun biglietto in programma</p>
            <Link href="/acquista">
              <HapticButton 
                className="min-h-[52px] gap-2 text-base rounded-xl px-8"
                hapticType="medium"
              >
                <ShoppingBag className="w-5 h-5" />
                Esplora Eventi
              </HapticButton>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {upcomingTickets.map((ticket, index) => (
              <Link key={ticket.id} href={`/account/tickets/${ticket.id}`}>
                <motion.div 
                  className="bg-card rounded-2xl p-5 flex items-center gap-4"
                  variants={fadeInUp}
                  custom={index}
                  whileTap={{ scale: 0.98 }}
                  transition={springTransition}
                  onClick={() => triggerHaptic('light')}
                  data-testid={`ticket-preview-${ticket.id}`}
                >
                  <div className="w-16 h-16 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-lg text-foreground truncate">{ticket.eventName}</h4>
                    <div className="flex items-center gap-2 text-base text-muted-foreground mt-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>{format(new Date(ticket.eventStart), "d MMM yyyy", { locale: it })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-base text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{ticket.locationName}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {ticket.sectorName}
                    </Badge>
                    <ChevronRight className="w-6 h-6 text-muted-foreground" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
