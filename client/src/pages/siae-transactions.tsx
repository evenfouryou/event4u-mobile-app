import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import {
  type SiaeTransaction,
  type SiaeTicketedEvent,
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { motion } from "framer-motion";

export default function SiaeTransactionsPage() {
  const { user } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedTransaction, setSelectedTransaction] = useState<SiaeTransaction | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");

  const companyId = user?.companyId;

  const { data: ticketedEvents } = useQuery<SiaeTicketedEvent[]>({
    queryKey: ['/api/siae/companies', companyId, 'ticketed-events'],
    enabled: !!companyId,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<SiaeTransaction[]>({
    queryKey: ['/api/siae/ticketed-events', selectedEventId, 'transactions'],
    enabled: !!selectedEventId,
  });

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
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-siae-transactions">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3" data-testid="page-title">
            <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-[#FFD700] flex-shrink-0" />
            Transazioni SIAE
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Monitora le transazioni di acquisto biglietti
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
              <label className="text-sm font-medium mb-2 block">Seleziona Evento</label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger data-testid="select-event-filter">
                  <SelectValue placeholder="Seleziona un evento" />
                </SelectTrigger>
                <SelectContent>
                  {ticketedEvents?.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      Evento #{event.id.slice(0, 8)} - {event.ticketingStatus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEventId && (
              <>
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
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedEventId && (
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

      {!selectedEventId ? (
        <Card className="glass-card" data-testid="card-empty-state">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
              <Receipt className="w-8 h-8 text-[#FFD700]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Seleziona un Evento</h3>
            <p className="text-muted-foreground">
              Seleziona un evento per visualizzare le transazioni
            </p>
          </CardContent>
        </Card>
      ) : transactionsLoading ? (
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setIsDetailDialogOpen(true);
                          }}
                          data-testid={`button-view-${transaction.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
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
    </div>
  );
}
