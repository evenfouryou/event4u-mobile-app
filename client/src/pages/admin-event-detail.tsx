import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  ChevronLeft,
  Ticket,
  Receipt,
  MapPin,
  Clock,
  Users,
  CircleDollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Ban,
  RefreshCw,
  Building2,
  User,
  CreditCard,
  QrCode,
  Info,
  Hash,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
} from "@/components/mobile-primitives";
import type { Event } from "@shared/schema";

interface SiaeTicket {
  id: string;
  progressiveNumber: number;
  sectorId: string;
  sectorName?: string;
  sectorCode?: string;
  ticketTypeCode: string;
  ticketType?: string;
  grossAmount: string;
  status: string;
  emissionDate: string | null;
  emissionChannelCode?: string;
  cardCode?: string;
  fiscalSealCode?: string | null;
  fiscalSealId?: string | null;
  transactionId?: string | null;
  ticketCode?: string;
  participantFirstName?: string;
  participantLastName?: string;
  customerId?: string;
}

interface SiaeTransaction {
  id: string;
  transactionCode: string;
  totalAmount: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
  customerEmail?: string;
  ticketCount?: number;
}

const springTransition = { type: "spring", stiffness: 400, damping: 30 };

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      delay: i * 0.05,
    },
  }),
};

interface SiaeTicketedEvent {
  id: string;
  eventId: string;
  companyId: string;
  ticketingStatus: string;
}

interface Company {
  id: string;
  name: string;
  legalName?: string;
  address?: string;
  city?: string;
  province?: string;
  vatNumber?: string;
  fiscalCode?: string;
}

interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  capacity?: number;
}

export default function AdminEventDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ eventId: string; gestoreId?: string }>();
  const eventId = params.eventId;
  const gestoreId = params.gestoreId;
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const [ticketToCancel, setTicketToCancel] = useState<SiaeTicket | null>(null);
  const [cancelWithRefund, setCancelWithRefund] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SiaeTicket | null>(null);
  const [showTicketDetail, setShowTicketDetail] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  // Get ticketed event by base event ID
  const { data: ticketedEvent } = useQuery<SiaeTicketedEvent>({
    queryKey: ['/api/siae/events', eventId, 'ticketing'],
    enabled: !!eventId,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<SiaeTicket[]>({
    queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'tickets'],
    enabled: !!ticketedEvent?.id,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<SiaeTransaction[]>({
    queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'transactions'],
    enabled: !!ticketedEvent?.id,
  });

  // Query per company (gestore)
  const { data: company } = useQuery<Company>({
    queryKey: ['/api/companies', ticketedEvent?.companyId],
    enabled: !!ticketedEvent?.companyId,
  });

  // Query per location (locale)
  const { data: location } = useQuery<Location>({
    queryKey: ['/api/locations', event?.locationId],
    enabled: !!event?.locationId,
  });

  const stats = useMemo(() => {
    if (!tickets || !transactions) return null;
    
    const soldTickets = tickets.filter(t => t.status === "sold" || t.status === "validated");
    const cancelledTickets = tickets.filter(t => t.status === "cancelled");
    const totalRevenue = transactions
      .filter(t => t.status === "completed")
      .reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);
    
    return {
      totalTickets: tickets.length,
      soldTickets: soldTickets.length,
      cancelledTickets: cancelledTickets.length,
      totalTransactions: transactions.length,
      completedTransactions: transactions.filter(t => t.status === "completed").length,
      totalRevenue,
    };
  }, [tickets, transactions]);

  // Cancel ticket mutation (with optional refund)
  const cancelTicketMutation = useMutation({
    mutationFn: async ({ ticketId, withRefund }: { ticketId: string; withRefund: boolean }) => {
      const response = await apiRequest("PATCH", `/api/siae/tickets/${ticketId}/cancel`, {
        reasonCode: withRefund ? "RIM" : "ANN",
        refund: withRefund,
        refundReason: withRefund ? "Rimborso amministrativo" : undefined
      });
      return response.json();
    },
    onSuccess: (_, { withRefund }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'tickets'] });
      if (withRefund) {
        queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', ticketedEvent?.id, 'transactions'] });
      }
      toast({ 
        title: withRefund ? "Biglietto annullato e rimborsato" : "Biglietto annullato", 
        description: withRefund 
          ? "Il biglietto è stato annullato e il rimborso è stato processato" 
          : "Il biglietto è stato annullato con successo" 
      });
      setTicketToCancel(null);
      setCancelWithRefund(false);
      setShowTicketDetail(false);
      setSelectedTicket(null);
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message || "Impossibile annullare il biglietto", variant: "destructive" });
    }
  });

  // Helper for emission channel display
  const getEmissionChannelLabel = (code: string | undefined) => {
    const channels: Record<string, string> = {
      'BOX': 'Cassa',
      'WEB': 'Online',
      'APP': 'App Mobile',
      'API': 'API',
      'POS': 'POS'
    };
    return code ? (channels[code] || code) : '-';
  };

  // Helper for ticket type display
  const getTicketTypeLabel = (code: string | undefined, type: string | undefined) => {
    if (type) {
      const labels: Record<string, string> = {
        'intero': 'Intero',
        'ridotto': 'Ridotto',
        'omaggio': 'Omaggio'
      };
      return labels[type] || type;
    }
    const codeLabels: Record<string, string> = {
      'INT': 'Intero',
      'RID': 'Ridotto',
      'OMG': 'Omaggio'
    };
    return code ? (codeLabels[code] || code) : '-';
  };

  // Helper for ticket status in Italian
  const getTicketStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'valid': 'Valido',
      'sold': 'Venduto',
      'used': 'Utilizzato',
      'validated': 'Validato',
      'cancelled': 'Annullato',
      'refunded': 'Rimborsato',
      'pending': 'In attesa',
      'available': 'Disponibile'
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sold":
      case "completed":
        return <Badge className="bg-teal-500/20 text-teal-400">Completato</Badge>;
      case "validated":
        return <Badge className="bg-blue-500/20 text-blue-400">Validato</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400">Annullato</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400">In attesa</Badge>;
      case "available":
        return <Badge variant="secondary">Disponibile</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const goBack = () => {
    if (gestoreId) {
      setLocation(`/admin/gestori/${gestoreId}/events`);
    } else {
      setLocation("/admin/gestori");
    }
  };

  const renderStatCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.soldTickets || 0}</p>
                <p className="text-xs text-muted-foreground">Biglietti Venduti</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/10">
                <Receipt className="h-5 w-5 text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.completedTransactions || 0}</p>
                <p className="text-xs text-muted-foreground">Transazioni</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <CircleDollarSign className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{stats?.totalRevenue?.toFixed(2) || "0.00"}</p>
                <p className="text-xs text-muted-foreground">Ricavi Totali</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.cancelledTickets || 0}</p>
                <p className="text-xs text-muted-foreground">Annullati</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  const renderTicketsTable = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Biglietti
        </CardTitle>
        <CardDescription>
          Lista di tutti i biglietti emessi per questo evento
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ticketsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : tickets && tickets.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Prog.</TableHead>
                  <TableHead>Carta Attivazione</TableHead>
                  <TableHead>Sigillo Fiscale</TableHead>
                  <TableHead>Cont. Carta</TableHead>
                  <TableHead>Codice Ordine</TableHead>
                  <TableHead>Tipo Titolo</TableHead>
                  <TableHead>Data/Ora Emissione</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="w-16">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.slice(0, 50).map((ticket) => (
                  <TableRow 
                    key={ticket.id} 
                    data-testid={`row-ticket-${ticket.id}`}
                    className="cursor-pointer hover-elevate"
                    onClick={() => { setSelectedTicket(ticket); setShowTicketDetail(true); }}
                  >
                    <TableCell>
                      <Badge variant="outline">
                        {getEmissionChannelLabel(ticket.emissionChannelCode)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{ticket.progressiveNumber}</TableCell>
                    <TableCell className="font-mono text-xs">{ticket.cardCode || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{ticket.fiscalSealCode || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{(ticket as any).fiscalSealCounter || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{ticket.ticketCode || ticket.transactionId || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getTicketTypeLabel(ticket.ticketTypeCode, ticket.ticketType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ticket.emissionDate
                        ? format(new Date(ticket.emissionDate), "dd/MM/yyyy HH:mm", { locale: it })
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {ticket.status !== 'cancelled' && ticket.status !== 'refunded' ? (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => { e.stopPropagation(); setTicketToCancel(ticket); }}
                          data-testid={`button-cancel-ticket-${ticket.id}`}
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {tickets.length > 50 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Mostrando 50 di {tickets.length} biglietti
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="h-10 w-10 mx-auto mb-2 opacity-50" />
            Nessun biglietto emesso
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderTransactionsTable = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Transazioni
        </CardTitle>
        <CardDescription>
          Lista di tutte le transazioni per questo evento
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 50).map((tx) => (
                  <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                    <TableCell className="font-mono text-xs">{tx.transactionCode}</TableCell>
                    <TableCell className="font-semibold">€{parseFloat(tx.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tx.paymentMethod}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell>
                      {format(new Date(tx.createdAt), "dd/MM/yy HH:mm", { locale: it })}
                    </TableCell>
                    <TableCell className="truncate max-w-32">
                      {tx.customerEmail || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {transactions.length > 50 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Mostrando 50 di {transactions.length} transazioni
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
            Nessuna transazione registrata
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderMobileTicketCard = (ticket: SiaeTicket, index: number) => (
    <motion.div
      key={ticket.id}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <Card 
        className="hover-elevate cursor-pointer" 
        data-testid={`card-ticket-${ticket.id}`}
        onClick={() => { setSelectedTicket(ticket); setShowTicketDetail(true); }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-semibold">#{ticket.progressiveNumber}</span>
                <Badge variant="outline" className="text-xs">
                  {getEmissionChannelLabel(ticket.emissionChannelCode)}
                </Badge>
                {getStatusBadge(ticket.status)}
              </div>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                <p><span className="font-medium">Tipo:</span> {getTicketTypeLabel(ticket.ticketTypeCode, ticket.ticketType)}</p>
                {ticket.cardCode && <p><span className="font-medium">Carta:</span> {ticket.cardCode}</p>}
                {ticket.fiscalSealCode && <p><span className="font-medium">Sigillo:</span> {ticket.fiscalSealCode}</p>}
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <p className="font-semibold text-primary">€{parseFloat(ticket.grossAmount || '0').toFixed(2)}</p>
              {ticket.emissionDate && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(ticket.emissionDate), "dd/MM HH:mm")}
                </p>
              )}
              {ticket.status !== 'cancelled' && ticket.status !== 'refunded' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); setTicketToCancel(ticket); }}
                >
                  <Ban className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderMobileTransactionCard = (tx: SiaeTransaction, index: number) => (
    <motion.div
      key={tx.id}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="hover-elevate" data-testid={`card-transaction-${tx.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{tx.transactionCode}</span>
                {getStatusBadge(tx.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{tx.paymentMethod}</p>
              {tx.customerEmail && (
                <p className="text-sm truncate mt-1">{tx.customerEmail}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-semibold text-primary">€{parseFloat(tx.totalAmount).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(tx.createdAt), "dd/MM HH:mm")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (eventLoading) {
    return isMobile ? (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Caricamento..."
            leftAction={
              <HapticButton variant="ghost" size="icon" onClick={goBack}>
                <ChevronLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="py-4 space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </MobileAppLayout>
    ) : (
      <div className="p-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title={event?.name || "Dettaglio Evento"}
            leftAction={
              <HapticButton variant="ghost" size="icon" onClick={goBack} data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="py-4 space-y-4">
          {event && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      {format(new Date(event.startDatetime), "d MMMM yyyy, HH:mm", { locale: it })}
                    </span>
                  </div>
                  {event.locationId && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">Location ID: {event.locationId}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {renderStatCards()}

          <Tabs defaultValue="tickets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tickets" className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Biglietti
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Transazioni
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="mt-4 space-y-3">
              {ticketsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))
              ) : tickets && tickets.length > 0 ? (
                tickets.slice(0, 30).map((ticket, index) => renderMobileTicketCard(ticket, index))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Nessun biglietto emesso
                </div>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="mt-4 space-y-3">
              {transactionsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))
              ) : transactions && transactions.length > 0 ? (
                transactions.slice(0, 30).map((tx, index) => renderMobileTransactionCard(tx, index))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Nessuna transazione registrata
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Cancel Ticket Dialog - Mobile (with optional refund) */}
        <AlertDialog open={!!ticketToCancel} onOpenChange={(open) => { if (!open) { setTicketToCancel(null); setCancelWithRefund(false); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Annullare questo biglietto?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    Stai per annullare il biglietto #{ticketToCancel?.progressiveNumber} 
                    del valore di €{ticketToCancel?.grossAmount ? parseFloat(ticketToCancel.grossAmount).toFixed(2) : '0.00'}.
                  </p>
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                    <Checkbox 
                      id="cancelWithRefundMobile" 
                      checked={cancelWithRefund} 
                      onCheckedChange={(checked) => setCancelWithRefund(checked === true)}
                    />
                    <Label htmlFor="cancelWithRefundMobile" className="flex items-center gap-2 cursor-pointer">
                      <RefreshCw className="h-4 w-4" />
                      Emetti anche rimborso
                    </Label>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => ticketToCancel && cancelTicketMutation.mutate({ ticketId: ticketToCancel.id, withRefund: cancelWithRefund })}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={cancelTicketMutation.isPending}
              >
                {cancelTicketMutation.isPending 
                  ? (cancelWithRefund ? "Elaborazione..." : "Annullamento...") 
                  : (cancelWithRefund ? "Annulla e Rimborsa" : "Conferma")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Ticket Detail Sheet - Mobile */}
        <Sheet open={showTicketDetail} onOpenChange={setShowTicketDetail}>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                Dettaglio Biglietto
              </SheetTitle>
            </SheetHeader>
            
            {selectedTicket && (
              <div className="space-y-4 mt-4">
                <div className="p-4 rounded-xl bg-muted/50 border text-center">
                  <div className="text-3xl font-mono font-bold text-primary">
                    #{selectedTicket.progressiveNumber}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 font-mono">
                    {selectedTicket.fiscalSealCode || 'Nessun sigillo'}
                  </div>
                  <div className="flex justify-center mt-2">
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Sistema</span>
                    <Badge variant="outline">{getEmissionChannelLabel(selectedTicket.emissionChannelCode)}</Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Tipo</span>
                    <Badge variant="secondary">{getTicketTypeLabel(selectedTicket.ticketTypeCode, selectedTicket.ticketType)}</Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Prezzo</span>
                    <span className="font-bold text-primary">€{parseFloat(selectedTicket.grossAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Carta</span>
                    <span className="font-mono text-xs">{selectedTicket.cardCode || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Contatore</span>
                    <span className="font-mono">{(selectedTicket as any).fiscalSealCounter || '-'}</span>
                  </div>
                </div>

                {company && (
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <p className="text-xs text-muted-foreground mb-1">Gestore</p>
                    <p className="font-medium text-sm">{company.name}</p>
                  </div>
                )}

                {selectedTicket.status !== 'cancelled' && selectedTicket.status !== 'refunded' && (
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => setTicketToCancel(selectedTicket)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Annulla Biglietto
                  </Button>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </MobileAppLayout>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={goBack} data-testid="button-back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{event?.name || "Dettaglio Evento"}</h1>
          {event && (
            <div className="flex items-center gap-4 text-muted-foreground mt-1">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(event.startDatetime), "d MMMM yyyy, HH:mm", { locale: it })}</span>
              </div>
              <Badge variant={event.status === "ongoing" ? "default" : "secondary"}>
                {event.status}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {renderStatCards()}

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Biglietti ({tickets?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Transazioni ({transactions?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-4">
          {renderTicketsTable()}
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          {renderTransactionsTable()}
        </TabsContent>
      </Tabs>

      {/* Cancel Ticket Dialog (with optional refund) */}
      <AlertDialog open={!!ticketToCancel} onOpenChange={(open) => { if (!open) { setTicketToCancel(null); setCancelWithRefund(false); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annullare questo biglietto?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Stai per annullare il biglietto #{ticketToCancel?.progressiveNumber} 
                  del valore di €{ticketToCancel?.grossAmount ? parseFloat(ticketToCancel.grossAmount).toFixed(2) : '0.00'}.
                </p>
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                  <Checkbox 
                    id="cancelWithRefund" 
                    checked={cancelWithRefund} 
                    onCheckedChange={(checked) => setCancelWithRefund(checked === true)}
                  />
                  <Label htmlFor="cancelWithRefund" className="flex items-center gap-2 cursor-pointer">
                    <RefreshCw className="h-4 w-4" />
                    Emetti anche rimborso automatico
                  </Label>
                </div>
                {cancelWithRefund && (
                  <p className="text-sm text-amber-500">
                    Il rimborso verrà processato sulla modalità di pagamento originale.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => ticketToCancel && cancelTicketMutation.mutate({ ticketId: ticketToCancel.id, withRefund: cancelWithRefund })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelTicketMutation.isPending}
            >
              {cancelTicketMutation.isPending 
                ? (cancelWithRefund ? "Annullamento e rimborso..." : "Annullamento...") 
                : (cancelWithRefund ? "Annulla e Rimborsa" : "Conferma Annullamento")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ticket Detail Sheet */}
      <Sheet open={showTicketDetail} onOpenChange={setShowTicketDetail}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "h-[90vh] rounded-t-2xl overflow-y-auto" : "w-[500px] overflow-y-auto"}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Dettaglio Biglietto
            </SheetTitle>
            <SheetDescription>
              Informazioni complete del biglietto
            </SheetDescription>
          </SheetHeader>
          
          {selectedTicket && (
            <div className="space-y-6 mt-6">
              {/* Header con numero e stato */}
              <div className="p-4 rounded-xl bg-muted/50 border text-center">
                <div className="text-4xl font-mono font-bold text-primary">
                  #{selectedTicket.progressiveNumber}
                </div>
                <div className="text-sm text-muted-foreground mt-1 font-mono">
                  {selectedTicket.fiscalSealCode || 'Nessun sigillo'}
                </div>
                <div className="flex justify-center mt-3">
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </div>

              {/* QR Code placeholder */}
              {(selectedTicket as any).qrCode && (
                <div className="p-4 rounded-xl bg-white border flex flex-col items-center">
                  <QrCode className="h-8 w-8 text-muted-foreground mb-2" />
                  <img 
                    src={(selectedTicket as any).qrCode} 
                    alt="QR Code" 
                    className="max-w-[200px]"
                  />
                </div>
              )}

              {/* Info Biglietto */}
              <div className="space-y-1">
                <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground mb-3">
                  <Info className="h-4 w-4" />
                  Dettagli Biglietto
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Sistema</span>
                    <Badge variant="outline">{getEmissionChannelLabel(selectedTicket.emissionChannelCode)}</Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Tipo</span>
                    <Badge variant="secondary">{getTicketTypeLabel(selectedTicket.ticketTypeCode, selectedTicket.ticketType)}</Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Prezzo</span>
                    <span className="font-bold text-primary">€{parseFloat(selectedTicket.grossAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Data Emissione</span>
                    <span>{selectedTicket.emissionDate ? format(new Date(selectedTicket.emissionDate), "dd/MM/yyyy HH:mm", { locale: it }) : '-'}</span>
                  </div>
                  {(selectedTicket.participantFirstName || selectedTicket.participantLastName) && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Partecipante</span>
                      <span className="font-medium">{`${selectedTicket.participantFirstName || ''} ${selectedTicket.participantLastName || ''}`.trim()}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Codice Ordine</span>
                    <span className="font-mono text-xs">{selectedTicket.ticketCode || selectedTicket.transactionId || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Info SIAE */}
              <div className="space-y-1">
                <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground mb-3">
                  <CreditCard className="h-4 w-4" />
                  Dati Fiscali SIAE
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Carta Attivazione</span>
                    <span className="font-mono text-xs">{selectedTicket.cardCode || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Sigillo Fiscale</span>
                    <span className="font-mono text-xs">{selectedTicket.fiscalSealCode || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Contatore Carta</span>
                    <span className="font-mono">{(selectedTicket as any).fiscalSealCounter || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Info Locale */}
              {location && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground mb-3">
                    <MapPin className="h-4 w-4" />
                    Locale
                  </h4>
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <p className="font-medium">{location.name}</p>
                    {location.address && (
                      <p className="text-sm text-muted-foreground">{location.address}</p>
                    )}
                    {(location.city || location.province) && (
                      <p className="text-sm text-muted-foreground">
                        {[location.city, location.province].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Info Gestore */}
              {company && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground mb-3">
                    <Building2 className="h-4 w-4" />
                    Gestore / Titolare Sistema
                  </h4>
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <p className="font-medium">{company.name}</p>
                    {company.legalName && company.legalName !== company.name && (
                      <p className="text-sm text-muted-foreground">{company.legalName}</p>
                    )}
                    {company.vatNumber && (
                      <p className="text-xs text-muted-foreground mt-1">P.IVA: {company.vatNumber}</p>
                    )}
                    {company.fiscalCode && (
                      <p className="text-xs text-muted-foreground">C.F.: {company.fiscalCode}</p>
                    )}
                    {(company.city || company.province) && (
                      <p className="text-xs text-muted-foreground">
                        {[company.city, company.province].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Azioni */}
              {selectedTicket.status !== 'cancelled' && selectedTicket.status !== 'refunded' && (
                <div className="pt-2">
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => { 
                      setTicketToCancel(selectedTicket); 
                    }}
                    data-testid="button-cancel-from-detail"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Annulla Biglietto
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
