import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isPast } from "date-fns";
import { it } from "date-fns/locale";
import {
  Ticket,
  Calendar,
  ChevronRight,
  Loader2,
  TicketX,
  MapPin,
  QrCode,
  Eye,
  Euro,
  CreditCard,
  CalendarCheck,
  User,
  Hash,
  Shield,
  Clock,
} from "lucide-react";
import { triggerHaptic } from "@/components/mobile-primitives";
import { useIsMobile } from "@/hooks/use-mobile";
import { DigitalSubscriptionCard, SubscriptionDetail } from "@/components/DigitalSubscriptionCard";

interface TicketItem {
  id: string;
  ticketCode: string;
  ticketType: string;
  ticketPrice: string;
  participantFirstName: string | null;
  participantLastName: string | null;
  status: string;
  emittedAt: string;
  qrCode: string | null;
  sectorName: string;
  eventName: string;
  eventStart: string;
  eventEnd: string;
  locationName: string;
  ticketedEventId: string;
}

interface TicketsResponse {
  upcoming: TicketItem[];
  past: TicketItem[];
  cancelled: TicketItem[];
  total: number;
}

interface SubscriptionItem {
  id: string;
  subscriptionCode: string;
  qrCode: string | null;
  holderFirstName: string;
  holderLastName: string;
  status: string;
  eventsCount: number;
  eventsUsed: number;
  validFrom: string;
  validTo: string;
  fiscalSealCode: string | null;
  subscriptionTypeName: string | null;
  eventName: string | null;
  eventStart: string | null;
  locationName: string | null;
  progressiveNumber: number | null;
  cardCode: string | null;
  fiscalSealCounter: number | null;
  emissionDate: string | null;
}

interface SubscriptionsResponse {
  upcoming: SubscriptionItem[];
  past: SubscriptionItem[];
  total: number;
}

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  tap: { scale: 0.98 },
};

function getTicketStatusVariant(status: string) {
  switch (status) {
    case "emitted":
      return "default";
    case "validated":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function getTicketStatusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case "emitted":
      return t('account.status.valid');
    case "validated":
      return t('account.status.used');
    case "cancelled":
      return t('account.status.cancelled');
    default:
      return status;
  }
}

function getSubscriptionStatusVariant(status: string) {
  switch (status) {
    case "active":
      return "default";
    case "expired":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function getSubscriptionStatusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case "active":
      return t('account.status.active');
    case "expired":
      return t('account.status.expired');
    case "cancelled":
      return t('account.status.cancelled');
    default:
      return status;
  }
}

function MobileTicketCard({ ticket, index, t }: { ticket: TicketItem; index: number; t: (key: string) => string }) {
  const eventDate = new Date(ticket.eventStart);
  const isExpired = isPast(eventDate);

  return (
    <Link href={`/account/tickets/${ticket.id}`}>
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        whileTap="tap"
        transition={{ ...springTransition, delay: index * 0.05 }}
        onClick={() => triggerHaptic('light')}
        className={`min-h-[120px] bg-card border border-border rounded-2xl p-4 active:bg-card/80 ${
          isExpired ? "opacity-60" : ""
        }`}
        data-testid={`card-ticket-${ticket.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant={getTicketStatusVariant(ticket.status)} className="text-sm">
                {getTicketStatusLabel(ticket.status, t)}
              </Badge>
              {ticket.qrCode && (
                <div className="flex items-center gap-1 text-primary">
                  <QrCode className="w-4 h-4" />
                </div>
              )}
            </div>
            
            <h3 className="font-semibold text-foreground text-lg leading-tight mb-3" data-testid="text-event-name">
              {ticket.eventName}
            </h3>
            
            <div className="flex flex-col gap-2 text-base text-muted-foreground">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 flex-shrink-0" />
                <span data-testid="text-event-date">
                  {format(eventDate, "EEE d MMM, HH:mm", { locale: it })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Ticket className="w-5 h-5 flex-shrink-0" />
                <span data-testid="text-sector" className="truncate">{ticket.sectorName}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{ticket.locationName}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/50">
            <ChevronRight className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function MobileSubscriptionCard({ subscription, index, onClick, t }: { subscription: SubscriptionItem; index: number; onClick: () => void; t: (key: string) => string }) {
  const validTo = subscription.validTo ? new Date(subscription.validTo) : null;
  const isExpired = validTo ? isPast(validTo) : false;

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileTap="tap"
      transition={{ ...springTransition, delay: index * 0.05 }}
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      className={`min-h-[120px] bg-card border border-border rounded-2xl p-4 active:bg-card/80 cursor-pointer ${
        isExpired || subscription.status !== 'active' ? "opacity-60" : ""
      }`}
      data-testid={`card-subscription-${subscription.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant={getSubscriptionStatusVariant(subscription.status)} className="text-sm">
              {getSubscriptionStatusLabel(subscription.status, t)}
            </Badge>
            {subscription.qrCode && (
              <div className="flex items-center gap-1 text-primary">
                <QrCode className="w-4 h-4" />
              </div>
            )}
          </div>
          
          <h3 className="font-semibold text-foreground text-lg leading-tight mb-3" data-testid="text-subscription-name">
            {subscription.subscriptionTypeName || subscription.eventName || t('account.subscriptions.subscription')}
          </h3>
          
          <div className="flex flex-col gap-2 text-base text-muted-foreground">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 flex-shrink-0" />
              <span data-testid="text-holder-name">
                {subscription.holderFirstName} {subscription.holderLastName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CalendarCheck className="w-5 h-5 flex-shrink-0" />
              <span data-testid="text-events-used">
                {subscription.eventsUsed}/{subscription.eventsCount} {t('account.subscriptions.eventsUsed')}
              </span>
            </div>
            {validTo && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 flex-shrink-0" />
                <span data-testid="text-valid-to">
                  {t('account.subscriptions.validUntil')} {format(validTo, "d MMM yyyy", { locale: it })}
                </span>
              </div>
            )}
            {subscription.locationName && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{subscription.locationName}</span>
              </div>
            )}
            {(subscription.fiscalSealCode || subscription.progressiveNumber || subscription.cardCode) && (
              <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
                {subscription.fiscalSealCode && (
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 flex-shrink-0 text-primary" />
                    <span className="font-mono text-xs truncate" data-testid="text-fiscal-seal">
                      {subscription.fiscalSealCode}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {subscription.progressiveNumber !== null && (
                    <span className="font-mono" data-testid="text-progressive">
                      {t('account.subscriptions.prog')}: {subscription.progressiveNumber}
                    </span>
                  )}
                  {subscription.cardCode && (
                    <span className="font-mono" data-testid="text-card-code">
                      {t('account.subscriptions.card')}: {subscription.cardCode}
                    </span>
                  )}
                  {subscription.fiscalSealCounter !== null && (
                    <span className="font-mono" data-testid="text-seal-counter">
                      {t('account.subscriptions.counter')}: {subscription.fiscalSealCounter}
                    </span>
                  )}
                </div>
                {subscription.emissionDate && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 flex-shrink-0" />
                    <span data-testid="text-emission-date">
                      {t('account.subscriptions.emitted')}: {format(new Date(subscription.emissionDate), "d MMM yyyy, HH:mm", { locale: it })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-muted/50">
          <ChevronRight className="w-6 h-6 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
}

function TicketEmptyState({ type, t }: { type: 'upcoming' | 'past'; t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springTransition}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...springTransition, delay: 0.1 }}
        className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-6"
      >
        <TicketX className="w-12 h-12 text-muted-foreground" />
      </motion.div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2 text-center">
        {type === 'upcoming' ? t('account.tickets.noTickets') : t('account.tickets.noPastEvents')}
      </h3>
      <p className="text-base text-muted-foreground text-center mb-6">
        {type === 'upcoming' 
          ? t('account.tickets.noFutureTickets')
          : t('account.tickets.noParticipatedEvents')
        }
      </p>
      
      {type === 'upcoming' && (
        <Link href="/acquista">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerHaptic('medium')}
            className="min-h-[48px] px-6 bg-primary text-primary-foreground rounded-xl font-semibold text-base"
          >
            {t('account.actions.discoverEvents')}
          </motion.button>
        </Link>
      )}
    </motion.div>
  );
}

function SubscriptionEmptyState({ type, t }: { type: 'upcoming' | 'past'; t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springTransition}
      className="flex flex-col items-center justify-center py-16 px-6"
      data-testid="subscription-empty-state"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...springTransition, delay: 0.1 }}
        className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-6"
      >
        <CreditCard className="w-12 h-12 text-muted-foreground" />
      </motion.div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2 text-center">
        {type === 'upcoming' ? t('account.subscriptions.noActiveSubscriptions') : t('account.subscriptions.noExpiredSubscriptions')}
      </h3>
      <p className="text-base text-muted-foreground text-center mb-6">
        {type === 'upcoming' 
          ? t('account.subscriptions.noActiveDescription')
          : t('account.subscriptions.noExpiredDescription')
        }
      </p>
      
      {type === 'upcoming' && (
        <Link href="/acquista">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => triggerHaptic('medium')}
            className="min-h-[48px] px-6 bg-primary text-primary-foreground rounded-xl font-semibold text-base"
          >
            {t('account.actions.discoverEvents')}
          </motion.button>
        </Link>
      )}
    </motion.div>
  );
}

function TabButton({ 
  active, 
  onClick, 
  children,
  count,
  testId,
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  count: number;
  testId: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      className={`flex-1 min-h-[52px] rounded-xl font-semibold text-lg transition-colors ${
        active 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted/50 text-muted-foreground'
      }`}
      data-testid={testId}
    >
      {children} ({count})
    </motion.button>
  );
}

function TopLevelTabButton({ 
  active, 
  onClick, 
  children,
  testId,
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      className={`flex-1 min-h-[44px] rounded-lg font-medium text-base transition-colors ${
        active 
          ? 'bg-card text-foreground shadow-sm border border-border' 
          : 'text-muted-foreground'
      }`}
      data-testid={testId}
    >
      {children}
    </motion.button>
  );
}

function SubscriptionDetailDialog({ subscription, open, onClose, t }: { subscription: SubscriptionItem | null; open: boolean; onClose: () => void; t: (key: string) => string }) {
  if (!subscription) return null;

  const subscriptionDetail: SubscriptionDetail = {
    id: subscription.id,
    subscriptionCode: subscription.subscriptionCode,
    subscriptionTypeName: subscription.subscriptionTypeName,
    holderFirstName: subscription.holderFirstName,
    holderLastName: subscription.holderLastName,
    status: subscription.status,
    eventsCount: subscription.eventsCount,
    eventsUsed: subscription.eventsUsed,
    validFrom: subscription.validFrom,
    validTo: subscription.validTo,
    qrCode: subscription.qrCode,
    fiscalSealCode: subscription.fiscalSealCode,
    cardCode: subscription.cardCode,
    progressiveNumber: subscription.progressiveNumber,
    fiscalSealCounter: subscription.fiscalSealCounter,
    locationName: subscription.locationName,
    eventName: subscription.eventName,
    emissionDate: subscription.emissionDate,
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-subscription-detail-title">
            {subscription.subscriptionTypeName || subscription.eventName || t('account.subscriptions.subscription')}
          </DialogTitle>
          <DialogDescription>
            {t('account.subscriptions.details')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <DigitalSubscriptionCard subscription={subscriptionDetail} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AccountTickets() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [mainTab, setMainTab] = useState<'biglietti' | 'abbonamenti'>('biglietti');
  const [ticketTimeTab, setTicketTimeTab] = useState<'upcoming' | 'past'>('upcoming');
  const [subscriptionTimeTab, setSubscriptionTimeTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<TicketsResponse>({
    queryKey: ["/api/public/account/tickets"],
  });

  const { data: subscriptionsData, isLoading: subscriptionsLoading } = useQuery<SubscriptionsResponse>({
    queryKey: ["/api/public/account/subscriptions"],
  });

  const upcomingTickets = ticketsData?.upcoming || [];
  const pastTickets = ticketsData?.past || [];
  const upcomingSubscriptions = subscriptionsData?.upcoming || [];
  const pastSubscriptions = subscriptionsData?.past || [];
  
  const displayedTickets = ticketTimeTab === 'upcoming' ? upcomingTickets : pastTickets;
  const displayedSubscriptions = subscriptionTimeTab === 'upcoming' ? upcomingSubscriptions : pastSubscriptions;

  const ticketStats = {
    total: (upcomingTickets.length || 0) + (pastTickets.length || 0),
    upcoming: upcomingTickets.length || 0,
    past: pastTickets.length || 0,
  };

  const subscriptionStats = {
    total: (upcomingSubscriptions.length || 0) + (pastSubscriptions.length || 0),
    upcoming: upcomingSubscriptions.length || 0,
    past: pastSubscriptions.length || 0,
  };

  const isLoading = ticketsLoading || subscriptionsLoading;

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-account-tickets">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('account.nav.ticketsSubscriptions')}</h1>
            <p className="text-muted-foreground">{t('account.tickets.manageTicketsAndSubscriptions')}</p>
          </div>
          <Link href="/acquista">
            <Button data-testid="button-discover-events">
              <Ticket className="w-4 h-4 mr-2" />
              {t('account.actions.discoverEvents')}
            </Button>
          </Link>
        </div>

        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'biglietti' | 'abbonamenti')}>
          <TabsList className="mb-6">
            <TabsTrigger value="biglietti" data-testid="tab-biglietti-desktop">
              <Ticket className="w-4 h-4 mr-2" />
              {t('account.tickets.tickets')} ({ticketStats.total})
            </TabsTrigger>
            <TabsTrigger value="abbonamenti" data-testid="tab-abbonamenti-desktop">
              <CreditCard className="w-4 h-4 mr-2" />
              {t('account.subscriptions.title')} ({subscriptionStats.total})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="biglietti">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{ticketStats.total}</div>
                      <p className="text-sm text-muted-foreground">{t('account.tickets.totalTickets')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-500">{ticketStats.upcoming}</div>
                      <p className="text-sm text-muted-foreground">{t('account.tickets.upcomingEvents')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-muted-foreground">{ticketStats.past}</div>
                      <p className="text-sm text-muted-foreground">{t('account.tickets.pastEvents')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('account.tickets.ticketList')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={ticketTimeTab} onValueChange={(v) => setTicketTimeTab(v as 'upcoming' | 'past')}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="upcoming" data-testid="tab-tickets-upcoming-desktop">
                      {t('account.tickets.upcoming')} ({upcomingTickets.length})
                    </TabsTrigger>
                    <TabsTrigger value="past" data-testid="tab-tickets-past-desktop">
                      {t('account.tickets.past')} ({pastTickets.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upcoming">
                    {ticketsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : upcomingTickets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <TicketX className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">{t('account.tickets.noTickets')}</h3>
                        <p className="text-muted-foreground mb-4">{t('account.tickets.noFutureTickets')}</p>
                        <Link href="/acquista">
                          <Button>{t('account.actions.discoverEvents')}</Button>
                        </Link>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('account.tickets.event')}</TableHead>
                            <TableHead>{t('account.tickets.date')}</TableHead>
                            <TableHead>{t('account.tickets.location')}</TableHead>
                            <TableHead>{t('account.tickets.sector')}</TableHead>
                            <TableHead>{t('account.tickets.status')}</TableHead>
                            <TableHead>{t('account.tickets.price')}</TableHead>
                            <TableHead className="text-right">{t('account.tickets.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {upcomingTickets.map((ticket) => (
                            <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                              <TableCell className="font-medium">{ticket.eventName}</TableCell>
                              <TableCell>
                                {format(new Date(ticket.eventStart), "dd/MM/yyyy HH:mm", { locale: it })}
                              </TableCell>
                              <TableCell>{ticket.locationName}</TableCell>
                              <TableCell>{ticket.sectorName}</TableCell>
                              <TableCell>
                                <Badge variant={getTicketStatusVariant(ticket.status)}>
                                  {getTicketStatusLabel(ticket.status, t)}
                                </Badge>
                              </TableCell>
                              <TableCell>€{Number(ticket.ticketPrice || 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedTicket(ticket);
                                      setIsDetailDialogOpen(true);
                                    }}
                                    data-testid={`button-view-${ticket.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Link href={`/account/tickets/${ticket.id}`}>
                                    <Button variant="ghost" size="icon" data-testid={`button-details-${ticket.id}`}>
                                      <ChevronRight className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="past">
                    {ticketsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : pastTickets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <TicketX className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">{t('account.tickets.noPastEvents')}</h3>
                        <p className="text-muted-foreground">{t('account.tickets.noParticipatedEvents')}</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('account.tickets.event')}</TableHead>
                            <TableHead>{t('account.tickets.date')}</TableHead>
                            <TableHead>{t('account.tickets.location')}</TableHead>
                            <TableHead>{t('account.tickets.sector')}</TableHead>
                            <TableHead>{t('account.tickets.status')}</TableHead>
                            <TableHead>{t('account.tickets.price')}</TableHead>
                            <TableHead className="text-right">{t('account.tickets.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pastTickets.map((ticket) => (
                            <TableRow key={ticket.id} className="opacity-70" data-testid={`row-ticket-${ticket.id}`}>
                              <TableCell className="font-medium">{ticket.eventName}</TableCell>
                              <TableCell>
                                {format(new Date(ticket.eventStart), "dd/MM/yyyy HH:mm", { locale: it })}
                              </TableCell>
                              <TableCell>{ticket.locationName}</TableCell>
                              <TableCell>{ticket.sectorName}</TableCell>
                              <TableCell>
                                <Badge variant={getTicketStatusVariant(ticket.status)}>
                                  {getTicketStatusLabel(ticket.status, t)}
                                </Badge>
                              </TableCell>
                              <TableCell>€{Number(ticket.ticketPrice || 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedTicket(ticket);
                                      setIsDetailDialogOpen(true);
                                    }}
                                    data-testid={`button-view-${ticket.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Link href={`/account/tickets/${ticket.id}`}>
                                    <Button variant="ghost" size="icon" data-testid={`button-details-${ticket.id}`}>
                                      <ChevronRight className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="abbonamenti">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{subscriptionStats.total}</div>
                      <p className="text-sm text-muted-foreground">{t('account.subscriptions.totalSubscriptions')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CalendarCheck className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-500">{subscriptionStats.upcoming}</div>
                      <p className="text-sm text-muted-foreground">{t('account.tickets.active')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-muted-foreground">{subscriptionStats.past}</div>
                      <p className="text-sm text-muted-foreground">{t('account.status.expired')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('account.subscriptions.subscriptionList')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={subscriptionTimeTab} onValueChange={(v) => setSubscriptionTimeTab(v as 'upcoming' | 'past')}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="upcoming" data-testid="tab-subscriptions-upcoming-desktop">
                      {t('account.tickets.active')} ({upcomingSubscriptions.length})
                    </TabsTrigger>
                    <TabsTrigger value="past" data-testid="tab-subscriptions-past-desktop">
                      {t('account.tickets.past')} ({pastSubscriptions.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upcoming">
                    {subscriptionsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : upcomingSubscriptions.length === 0 ? (
                      <SubscriptionEmptyState type="upcoming" t={t} />
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {upcomingSubscriptions.map((subscription) => (
                          <Card
                            key={subscription.id}
                            className="cursor-pointer transition-all hover-elevate"
                            onClick={() => setSelectedSubscription(subscription)}
                            data-testid={`card-subscription-${subscription.id}`}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant={getSubscriptionStatusVariant(subscription.status)}>
                                  {getSubscriptionStatusLabel(subscription.status, t)}
                                </Badge>
                                {subscription.qrCode && <QrCode className="w-4 h-4 text-primary" />}
                              </div>
                              <CardTitle className="text-lg" data-testid="text-subscription-name">
                                {subscription.subscriptionTypeName || subscription.eventName || t('account.subscriptions.subscription')}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="w-4 h-4" />
                                <span>{subscription.holderFirstName} {subscription.holderLastName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarCheck className="w-4 h-4" />
                                <span>{subscription.eventsUsed}/{subscription.eventsCount} {t('account.subscriptions.eventsUsed')}</span>
                              </div>
                              {subscription.validTo && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="w-4 h-4" />
                                  <span>{t('account.subscriptions.validUntil')} {format(new Date(subscription.validTo), "d MMM yyyy", { locale: it })}</span>
                                </div>
                              )}
                              {subscription.locationName && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="w-4 h-4" />
                                  <span className="truncate">{subscription.locationName}</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="past">
                    {subscriptionsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : pastSubscriptions.length === 0 ? (
                      <SubscriptionEmptyState type="past" t={t} />
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pastSubscriptions.map((subscription) => (
                          <Card
                            key={subscription.id}
                            className="cursor-pointer transition-all hover-elevate opacity-70"
                            onClick={() => setSelectedSubscription(subscription)}
                            data-testid={`card-subscription-${subscription.id}`}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant={getSubscriptionStatusVariant(subscription.status)}>
                                  {getSubscriptionStatusLabel(subscription.status, t)}
                                </Badge>
                                {subscription.qrCode && <QrCode className="w-4 h-4 text-primary" />}
                              </div>
                              <CardTitle className="text-lg" data-testid="text-subscription-name">
                                {subscription.subscriptionTypeName || subscription.eventName || t('account.subscriptions.subscription')}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="w-4 h-4" />
                                <span>{subscription.holderFirstName} {subscription.holderLastName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarCheck className="w-4 h-4" />
                                <span>{subscription.eventsUsed}/{subscription.eventsCount} {t('account.subscriptions.eventsUsed')}</span>
                              </div>
                              {subscription.validTo && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="w-4 h-4" />
                                  <span>{t('account.subscriptions.validUntil')} {format(new Date(subscription.validTo), "d MMM yyyy", { locale: it })}</span>
                                </div>
                              )}
                              {subscription.locationName && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="w-4 h-4" />
                                  <span className="truncate">{subscription.locationName}</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('account.tickets.ticketDetails')}</DialogTitle>
              <DialogDescription>
                {t('account.tickets.ticketInfo')}
              </DialogDescription>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('account.tickets.event')}</span>
                  <span className="font-medium">{selectedTicket.eventName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('account.tickets.date')}</span>
                  <span className="font-medium">
                    {format(new Date(selectedTicket.eventStart), "dd MMMM yyyy, HH:mm", { locale: it })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('account.tickets.location')}</span>
                  <span className="font-medium">{selectedTicket.locationName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('account.tickets.sector')}</span>
                  <span className="font-medium">{selectedTicket.sectorName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('account.tickets.type')}</span>
                  <span className="font-medium">{selectedTicket.ticketType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('account.tickets.code')}</span>
                  <span className="font-mono text-sm">{selectedTicket.ticketCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('account.tickets.status')}</span>
                  <Badge variant={getTicketStatusVariant(selectedTicket.status)}>
                    {getTicketStatusLabel(selectedTicket.status)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('account.tickets.price')}</span>
                  <span className="font-medium text-lg">€{Number(selectedTicket.ticketPrice || 0).toFixed(2)}</span>
                </div>
                {selectedTicket.participantFirstName && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('account.tickets.participant')}</span>
                    <span className="font-medium">
                      {selectedTicket.participantFirstName} {selectedTicket.participantLastName}
                    </span>
                  </div>
                )}
                <div className="pt-4 flex gap-2">
                  <Link href={`/account/tickets/${selectedTicket.id}`} className="flex-1">
                    <Button className="w-full" data-testid="button-view-full-details">
                      <Eye className="w-4 h-4 mr-2" />
                      {t('account.tickets.viewTicket')}
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <SubscriptionDetailDialog
          subscription={selectedSubscription}
          open={!!selectedSubscription}
          onClose={() => setSelectedSubscription(null)}
          t={t}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div 
        className="fixed inset-0 flex flex-col bg-background"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-10 h-10 text-primary" />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-background pb-24"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      data-testid="page-account-tickets"
    >
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="px-4 pt-4 pb-2"
      >
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
          {t('account.nav.ticketsSubscriptions')}
        </h1>
      </motion.header>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.05 }}
        className="px-4 py-3"
      >
        <div className="flex gap-2 p-1 bg-muted/30 rounded-xl">
          <TopLevelTabButton 
            active={mainTab === 'biglietti'} 
            onClick={() => setMainTab('biglietti')}
            testId="tab-biglietti"
          >
            {t('account.tickets.tickets')}
          </TopLevelTabButton>
          <TopLevelTabButton 
            active={mainTab === 'abbonamenti'} 
            onClick={() => setMainTab('abbonamenti')}
            testId="tab-abbonamenti"
          >
            {t('account.subscriptions.title')}
          </TopLevelTabButton>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {mainTab === 'biglietti' ? (
          <motion.div
            key="biglietti"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={springTransition}
          >
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.1 }}
              className="px-4 py-2"
            >
              <div className="flex gap-3 p-1.5 bg-muted/30 rounded-2xl">
                <TabButton 
                  active={ticketTimeTab === 'upcoming'} 
                  onClick={() => setTicketTimeTab('upcoming')}
                  count={upcomingTickets.length}
                  testId="tab-tickets-upcoming"
                >
                  Prossimi
                </TabButton>
                <TabButton 
                  active={ticketTimeTab === 'past'} 
                  onClick={() => setTicketTimeTab('past')}
                  count={pastTickets.length}
                  testId="tab-tickets-past"
                >
                  Passati
                </TabButton>
              </div>
            </motion.div>

            <div className="px-4 py-4">
              <AnimatePresence mode="wait">
                {displayedTickets.length === 0 ? (
                  <TicketEmptyState type={ticketTimeTab} />
                ) : (
                  <motion.div
                    key={ticketTimeTab}
                    initial={{ opacity: 0, x: ticketTimeTab === 'upcoming' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: ticketTimeTab === 'upcoming' ? 20 : -20 }}
                    transition={springTransition}
                    className="space-y-4"
                  >
                    {displayedTickets.map((ticket, index) => (
                      <MobileTicketCard key={ticket.id} ticket={ticket} index={index} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="abbonamenti"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={springTransition}
          >
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.1 }}
              className="px-4 py-2"
            >
              <div className="flex gap-3 p-1.5 bg-muted/30 rounded-2xl">
                <TabButton 
                  active={subscriptionTimeTab === 'upcoming'} 
                  onClick={() => setSubscriptionTimeTab('upcoming')}
                  count={upcomingSubscriptions.length}
                  testId="tab-subscriptions-upcoming"
                >
                  Attivi
                </TabButton>
                <TabButton 
                  active={subscriptionTimeTab === 'past'} 
                  onClick={() => setSubscriptionTimeTab('past')}
                  count={pastSubscriptions.length}
                  testId="tab-subscriptions-past"
                >
                  Passati
                </TabButton>
              </div>
            </motion.div>

            <div className="px-4 py-4">
              <AnimatePresence mode="wait">
                {displayedSubscriptions.length === 0 ? (
                  <SubscriptionEmptyState type={subscriptionTimeTab} />
                ) : (
                  <motion.div
                    key={subscriptionTimeTab}
                    initial={{ opacity: 0, x: subscriptionTimeTab === 'upcoming' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: subscriptionTimeTab === 'upcoming' ? 20 : -20 }}
                    transition={springTransition}
                    className="space-y-4"
                  >
                    {displayedSubscriptions.map((subscription, index) => (
                      <MobileSubscriptionCard 
                        key={subscription.id} 
                        subscription={subscription} 
                        index={index}
                        onClick={() => setSelectedSubscription(subscription)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SubscriptionDetailDialog
        subscription={selectedSubscription}
        open={!!selectedSubscription}
        onClose={() => setSelectedSubscription(null)}
      />
    </div>
  );
}
