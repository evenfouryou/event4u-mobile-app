import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  type SiaeTransaction,
  type SiaeTicketedEvent,
  type SiaeTicket,
  type Event,
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Receipt,
  Calendar,
  Euro,
  Search,
  CreditCard,
  Banknote,
  Globe,
  Download,
  Eye,
  Ticket,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCcw,
  ArrowLeft,
  Loader2,
  Ban,
} from "lucide-react";
import { motion } from "framer-motion";
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";

export default function SiaeTransactionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/siae/transactions/:eventId");
  const eventId = params?.eventId || "";
  
  const [selectedTransaction, setSelectedTransaction] = useState<SiaeTransaction | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  
  const [cancelTicketDialogOpen, setCancelTicketDialogOpen] = useState(false);
  const [ticketToCancel, setTicketToCancel] = useState<SiaeTicket | null>(null);
  const [cancelReason, setCancelReason] = useState("01");
  const [cancelNote, setCancelNote] = useState("");
  const [ticketsDialogOpen, setTicketsDialogOpen] = useState(false);
  const [transactionForTickets, setTransactionForTickets] = useState<SiaeTransaction | null>(null);

  const { data: ticketedEvent } = useQuery<SiaeTicketedEvent>({
    queryKey: ['/api/siae/ticketed-events', eventId],
    enabled: !!eventId,
  });

  const { data: baseEvent } = useQuery<Event>({
    queryKey: ['/api/events', ticketedEvent?.eventId],
    enabled: !!ticketedEvent?.eventId,
  });

  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery<SiaeTransaction[]>({
    queryKey: ['/api/siae/ticketed-events', eventId, 'transactions'],
    enabled: !!eventId,
  });

  const { data: allTickets = [] } = useQuery<SiaeTicket[]>({
    queryKey: ['/api/siae/ticketed-events', eventId, 'tickets'],
    enabled: !!eventId,
  });

  const cancelTicketMutation = useMutation({
    mutationFn: async ({ ticketId, reason }: { ticketId: string; reason: string }) => {
      return apiRequest('POST', `/api/siae/tickets/${ticketId}/cancel`, { reasonCode: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', eventId, 'tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', eventId, 'transactions'] });
      setCancelTicketDialogOpen(false);
      setTicketToCancel(null);
      setCancelReason("01");
      setCancelNote("");
      toast({ title: "Biglietto Annullato", description: "Il biglietto è stato annullato con successo." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Errore Annullamento", 
        description: error?.message || "Impossibile annullare il biglietto", 
        variant: "destructive" 
      });
    },
  });

  const handleCancelTicket = (ticket: SiaeTicket) => {
    setTicketToCancel(ticket);
    setCancelTicketDialogOpen(true);
  };

  const confirmCancelTicket = () => {
    if (!ticketToCancel) return;
    cancelTicketMutation.mutate({ 
      ticketId: ticketToCancel.id, 
      reason: cancelReason
    });
  };

  const handleViewTickets = (transaction: SiaeTransaction) => {
    setTransactionForTickets(transaction);
    setTicketsDialogOpen(true);
  };

  const getTransactionTickets = (transactionId: string) => {
    return allTickets.filter(t => t.transactionId === transactionId);
  };

  const getTicketStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
      case 'active':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Valido</Badge>;
      case 'used':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Usato</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Annullato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Completata</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">In Attesa</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Fallita</Badge>;
      case "refunded":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Rimborsata</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentIcon = (method: string | null) => {
    switch (method) {
      case "card":
        return <CreditCard className="w-4 h-4" />;
      case "cash":
        return <Banknote className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getPaymentLabel = (method: string | null) => {
    switch (method) {
      case "card":
        return "Carta";
      case "cash":
        return "Contanti";
      case "bank_transfer":
        return "Bonifico";
      case "paypal":
        return "PayPal";
      default:
        return method || "-";
    }
  };

  const filteredTransactions = transactions?.filter((transaction) => {
    const matchesSearch =
      searchQuery === "" ||
      transaction.transactionCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.customerUniqueCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;

    let matchesDate = true;
    if (dateRange !== "all" && transaction.createdAt) {
      const transactionDate = new Date(transaction.createdAt);
      const now = new Date();
      switch (dateRange) {
        case "today":
          matchesDate = transactionDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = transactionDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = transactionDate >= monthAgo;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const stats = {
    total: transactions?.length || 0,
    completed: transactions?.filter(t => t.status === "completed").length || 0,
    pending: transactions?.filter(t => t.status === "pending").length || 0,
    failed: transactions?.filter(t => t.status === "failed").length || 0,
    refunded: transactions?.filter(t => t.status === "refunded").length || 0,
    totalRevenue: transactions
      ?.filter(t => t.status === "completed")
      .reduce((sum, t) => sum + Number(t.totalAmount || 0), 0) || 0,
    totalTickets: transactions
      ?.filter(t => t.status === "completed")
      .reduce((sum, t) => sum + (t.ticketsCount || 0), 0) || 0,
  };

  return (
    <MobileAppLayout
      header={<MobileHeader title="Transazioni" showBackButton showMenuButton />}
      contentClassName="pb-24"
    >
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-siae-transactions">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              {baseEvent?.name || "Caricamento..."}
            </p>
          </div>
          <Button variant="outline" className="w-full sm:w-auto" data-testid="button-export">
          <Download className="w-4 h-4 mr-2" />
          Esporta Report
        </Button>
      </div>

      <Card className="glass-card" data-testid="card-filters">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col md:flex-row gap-2 sm:gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Cerca</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Cerca per codice, cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="w-full md:w-40">
              <label className="text-sm font-medium mb-2 block">Stato</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="completed">Completate</SelectItem>
                  <SelectItem value="pending">In Attesa</SelectItem>
                  <SelectItem value="failed">Fallite</SelectItem>
                  <SelectItem value="refunded">Rimborsate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-40">
              <label className="text-sm font-medium mb-2 block">Periodo</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger data-testid="select-date-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutto</SelectItem>
                  <SelectItem value="today">Oggi</SelectItem>
                  <SelectItem value="week">Ultima settimana</SelectItem>
                  <SelectItem value="month">Ultimo mese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {eventId && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Totale</div>
              <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Completate</div>
              <div className="text-2xl font-bold text-emerald-400" data-testid="stat-completed">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">In Attesa</div>
              <div className="text-2xl font-bold text-amber-400" data-testid="stat-pending">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Fallite</div>
              <div className="text-2xl font-bold text-destructive" data-testid="stat-failed">{stats.failed}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Euro className="w-3 h-3" />
                Incasso
              </div>
              <div className="text-2xl font-bold text-[#FFD700]" data-testid="stat-revenue">
                €{stats.totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Ticket className="w-3 h-3" />
                Biglietti
              </div>
              <div className="text-2xl font-bold" data-testid="stat-tickets">{stats.totalTickets}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {transactionsLoading ? (
        <Card className="glass-card">
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredTransactions?.length === 0 ? (
        <Card className="glass-card" data-testid="card-no-transactions">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessuna Transazione</h3>
            <p className="text-muted-foreground">
              Non ci sono transazioni per questo evento
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card" data-testid="card-transactions-table">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Codice</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Biglietti</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions?.map((transaction) => (
                    <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                      <TableCell className="font-mono text-xs" data-testid={`cell-code-${transaction.id}`}>
                        {transaction.transactionCode}
                      </TableCell>
                      <TableCell data-testid={`cell-customer-${transaction.id}`}>
                        <div>
                          <div className="font-mono text-xs">{transaction.customerUniqueCode}</div>
                          {transaction.customerEmail && (
                            <div className="text-xs text-muted-foreground">{transaction.customerEmail}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`cell-tickets-${transaction.id}`}>
                        <span className="flex items-center gap-1">
                          <Ticket className="w-3 h-3" />
                          {transaction.ticketsCount}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-amount-${transaction.id}`}>
                        <span className="flex items-center gap-1 font-medium text-[#FFD700]">
                          <Euro className="w-3 h-3" />
                          {Number(transaction.totalAmount).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-payment-${transaction.id}`}>
                        <span className="flex items-center gap-2">
                          {getPaymentIcon(transaction.paymentMethod)}
                          {getPaymentLabel(transaction.paymentMethod)}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-status-${transaction.id}`}>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell data-testid={`cell-date-${transaction.id}`}>
                        <div className="text-sm">
                          {transaction.createdAt && format(new Date(transaction.createdAt), "dd/MM/yyyy", { locale: it })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {transaction.createdAt && format(new Date(transaction.createdAt), "HH:mm", { locale: it })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setIsDetailDialogOpen(true);
                            }}
                            title="Dettagli Transazione"
                            data-testid={`button-view-${transaction.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewTickets(transaction)}
                            title="Gestisci Biglietti"
                            data-testid={`button-tickets-${transaction.id}`}
                          >
                            <Ticket className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#FFD700]" />
              Dettaglio Transazione
            </DialogTitle>
            <DialogDescription>
              Codice: {selectedTransaction?.transactionCode}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Stato</div>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Importo Totale</div>
                  <div className="text-xl font-bold text-[#FFD700] flex items-center gap-1">
                    <Euro className="w-4 h-4" />
                    {Number(selectedTransaction.totalAmount).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-mono text-sm">{selectedTransaction.customerUniqueCode}</span>
                </div>
                {selectedTransaction.customerEmail && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-muted-foreground">Email</span>
                    <span className="text-sm">{selectedTransaction.customerEmail}</span>
                  </div>
                )}
                {selectedTransaction.customerPhone && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-muted-foreground">Telefono</span>
                    <span className="text-sm">{selectedTransaction.customerPhone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Numero Biglietti</span>
                  <span className="font-medium">{selectedTransaction.ticketsCount}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Metodo Pagamento</span>
                  <span className="flex items-center gap-2">
                    {getPaymentIcon(selectedTransaction.paymentMethod)}
                    {getPaymentLabel(selectedTransaction.paymentMethod)}
                  </span>
                </div>
                {selectedTransaction.paymentReference && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-muted-foreground">Riferimento</span>
                    <span className="font-mono text-sm">{selectedTransaction.paymentReference}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Canale Emissione</span>
                  <span className="font-mono text-sm">{selectedTransaction.emissionChannelCode}</span>
                </div>
                {selectedTransaction.transactionIp && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-muted-foreground">IP</span>
                    <span className="font-mono text-xs">{selectedTransaction.transactionIp}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Data Creazione</span>
                  <span className="text-sm">
                    {selectedTransaction.createdAt && format(new Date(selectedTransaction.createdAt), "dd/MM/yyyy HH:mm", { locale: it })}
                  </span>
                </div>
                {selectedTransaction.paymentCompletedAt && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-muted-foreground">Pagamento Completato</span>
                    <span className="text-sm">
                      {format(new Date(selectedTransaction.paymentCompletedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                    </span>
                  </div>
                )}
              </div>

              {selectedTransaction.totalVat && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">IVA</div>
                    <div className="font-medium">€{Number(selectedTransaction.totalVat).toFixed(2)}</div>
                  </div>
                  {selectedTransaction.totalPrevendita && (
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground mb-1">Prevendita</div>
                      <div className="font-medium">€{Number(selectedTransaction.totalPrevendita).toFixed(2)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Biglietti della Transazione */}
      <Dialog open={ticketsDialogOpen} onOpenChange={setTicketsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-tickets">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-emerald-400" />
              Biglietti della Transazione
            </DialogTitle>
            <DialogDescription>
              {transactionForTickets && (
                <>Codice: {transactionForTickets.transactionCode} - {transactionForTickets.ticketsCount} bigliett{transactionForTickets.ticketsCount === 1 ? 'o' : 'i'}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {transactionForTickets && (
            <div className="space-y-3">
              {getTransactionTickets(transactionForTickets.id).length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Nessun biglietto trovato per questa transazione
                </div>
              ) : (
                getTransactionTickets(transactionForTickets.id).map((ticket) => (
                  <div 
                    key={ticket.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                    data-testid={`ticket-item-${ticket.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm">
                          {ticket.fiscalSealCode || ticket.progressiveNumber || ticket.id.slice(0, 8)}
                        </span>
                        {getTicketStatusBadge(ticket.status)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {ticket.ticketType || ticket.ticketTypeCode || 'N/D'} - €{Number(ticket.ticketPrice || ticket.grossAmount || 0).toFixed(2)}
                      </div>
                    </div>
                    {(ticket.status === 'valid' || ticket.status === 'active') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelTicket(ticket)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        data-testid={`button-cancel-ticket-${ticket.id}`}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Annulla
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTicketsDialogOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Conferma Annullamento Biglietto */}
      <AlertDialog open={cancelTicketDialogOpen} onOpenChange={setCancelTicketDialogOpen}>
        <AlertDialogContent className="max-w-md" data-testid="dialog-cancel-ticket">
          <AlertDialogHeader>
            <AlertDialogTitle>Annulla Biglietto</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per annullare il biglietto{' '}
              <span className="font-mono font-semibold">
                {ticketToCancel?.fiscalSealCode || ticketToCancel?.progressiveNumber || ticketToCancel?.id.slice(0, 8)}
              </span>.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Causale Annullamento</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger data-testid="select-cancel-reason">
                  <SelectValue placeholder="Seleziona causale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">01 - Richiesta cliente</SelectItem>
                  <SelectItem value="02">02 - Errore emissione</SelectItem>
                  <SelectItem value="03">03 - Evento annullato</SelectItem>
                  <SelectItem value="04">04 - Duplicato</SelectItem>
                  <SelectItem value="99">99 - Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancel-note">Note aggiuntive (opzionale)</Label>
              <Textarea
                id="cancel-note"
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="Descrivi il motivo dell'annullamento..."
                className="resize-none min-h-[80px]"
                data-testid="input-cancel-note"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-close">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelTicket}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelTicketMutation.isPending}
              data-testid="button-confirm-cancel-ticket"
            >
              {cancelTicketMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Annullamento...</>
              ) : (
                'Conferma Annullamento'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </MobileAppLayout>
  );
}
