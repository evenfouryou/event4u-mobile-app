import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
} from "@/components/mobile-primitives";
import type { Event } from "@shared/schema";

interface SiaeTicket {
  id: string;
  progressiveNumber: number;
  eventSectorId: string;
  sectorName?: string;
  unitPrice: string;
  status: string;
  purchasedAt: string | null;
  customerName?: string;
  customerEmail?: string;
  fiscalSealId?: string | null;
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

export default function AdminEventDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ eventId: string; gestoreId?: string }>();
  const eventId = params.eventId;
  const gestoreId = params.gestoreId;
  const isMobile = useIsMobile();

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<SiaeTicket[]>({
    queryKey: [`/api/siae/ticketed-events/${eventId}/tickets`],
    enabled: !!eventId,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<SiaeTransaction[]>({
    queryKey: [`/api/siae/ticketed-events/${eventId}/transactions`],
    enabled: !!eventId,
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
                  <TableHead>N. Prog.</TableHead>
                  <TableHead>Settore</TableHead>
                  <TableHead>Prezzo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Data Acquisto</TableHead>
                  <TableHead>Cliente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.slice(0, 50).map((ticket) => (
                  <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                    <TableCell className="font-mono">{ticket.progressiveNumber}</TableCell>
                    <TableCell>{ticket.sectorName || "-"}</TableCell>
                    <TableCell>€{parseFloat(ticket.unitPrice).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>
                      {ticket.purchasedAt
                        ? format(new Date(ticket.purchasedAt), "dd/MM/yy HH:mm", { locale: it })
                        : "-"}
                    </TableCell>
                    <TableCell className="truncate max-w-32">
                      {ticket.customerName || ticket.customerEmail || "-"}
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
      <Card className="hover-elevate" data-testid={`card-ticket-${ticket.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">#{ticket.progressiveNumber}</span>
                {getStatusBadge(ticket.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{ticket.sectorName}</p>
              {ticket.customerName && (
                <p className="text-sm truncate mt-1">{ticket.customerName}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-semibold text-primary">€{parseFloat(ticket.unitPrice).toFixed(2)}</p>
              {ticket.purchasedAt && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(ticket.purchasedAt), "dd/MM HH:mm")}
                </p>
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
    </div>
  );
}
