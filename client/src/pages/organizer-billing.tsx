import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import {
  CreditCard,
  Wallet,
  Receipt,
  Percent,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Eye,
  Filter,
  BarChart3,
  Download,
  Ticket,
  Euro,
} from "lucide-react";
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type {
  OrganizerPlan,
  OrganizerSubscription,
  OrganizerCommissionProfile,
  OrganizerWallet,
  OrganizerWalletLedger,
  OrganizerInvoice,
  OrganizerInvoiceItem,
} from "@shared/schema";

interface SubscriptionData {
  subscription: OrganizerSubscription | null;
  plan: OrganizerPlan | null;
  eventsRemaining: number | null;
  canCreateEvent: boolean;
}

interface WalletData {
  wallet: OrganizerWallet;
  thresholdStatus: {
    exceeded: boolean;
    balance: number;
    threshold: number;
    amountToInvoice: number;
  };
}

interface InvoiceWithItems extends OrganizerInvoice {
  items: OrganizerInvoiceItem[];
}

interface SalesReportData {
  period: { from: string; to: string };
  summary: {
    ticketsSoldTotal: number;
    ticketsSoldOnline: number;
    ticketsSoldPrinted: number;
    ticketsSoldPr: number;
    grossRevenueTotal: number;
    commissionOnline: number;
    commissionPrinted: number;
    commissionPr: number;
    commissionTotal: number;
    netToOrganizer: number;
    walletDebt: number;
    invoicesIssued: number;
    invoicesPaid: number;
  };
  byEvent: Array<{
    eventId: string;
    eventName: string;
    eventDate: string;
    ticketsSold: number;
    grossRevenue: number;
    commissions: number;
    netRevenue: number;
  }>;
  byChannel: Array<{
    channel: 'online' | 'printed' | 'pr';
    ticketsSold: number;
    grossRevenue: number;
    commissions: number;
  }>;
}

export default function OrganizerBilling() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("subscription");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithItems | null>(null);
  const [reportDateFrom, setReportDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [reportDateTo, setReportDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: subscriptionData, isLoading: subscriptionLoading, error: subscriptionError } = useQuery<SubscriptionData>({
    queryKey: ["/api/organizer/billing/subscription"],
  });

  const { data: walletData, isLoading: walletLoading, error: walletError } = useQuery<WalletData>({
    queryKey: ["/api/organizer/billing/wallet"],
  });

  const { data: ledgerEntries, isLoading: ledgerLoading } = useQuery<OrganizerWalletLedger[]>({
    queryKey: ["/api/organizer/billing/ledger", dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const response = await fetch(`/api/organizer/billing/ledger?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Errore nel caricamento");
      return response.json();
    },
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<InvoiceWithItems[]>({
    queryKey: ["/api/organizer/billing/invoices"],
  });

  const { data: reportData, isLoading: reportLoading } = useQuery<SalesReportData>({
    queryKey: ["/api/organizer/billing/reports/sales", reportDateFrom, reportDateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reportDateFrom) params.set("from", reportDateFrom);
      if (reportDateTo) params.set("to", reportDateTo);
      const response = await fetch(`/api/organizer/billing/reports/sales?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Errore nel caricamento del report");
      return response.json();
    },
  });

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (reportDateFrom) params.set("from", reportDateFrom);
    if (reportDateTo) params.set("to", reportDateTo);
    params.set("format", "csv");
    window.open(`/api/organizer/billing/reports/sales?${params.toString()}`, "_blank");
  };

  if (subscriptionError || walletError) {
    toast({
      title: "Errore",
      description: "Impossibile caricare i dati di billing",
      variant: "destructive",
    });
  }

  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "€ 0,00";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(numValue);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    return format(new Date(date), "dd MMM yyyy", { locale: it });
  };

  const formatDateTime = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: it });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/20 text-green-500" data-testid="badge-status-active">
            <CheckCircle className="w-3 h-3 mr-1" />
            Attivo
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="secondary" data-testid="badge-status-suspended">
            <Clock className="w-3 h-3 mr-1" />
            Sospeso
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive" data-testid="badge-status-expired">
            <XCircle className="w-3 h-3 mr-1" />
            Scaduto
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary" data-testid="badge-invoice-draft">Bozza</Badge>;
      case "issued":
        return <Badge className="bg-yellow-500/20 text-yellow-500" data-testid="badge-invoice-issued">Emessa</Badge>;
      case "paid":
        return <Badge className="bg-green-500/20 text-green-500" data-testid="badge-invoice-paid">Pagata</Badge>;
      case "void":
        return <Badge variant="destructive" data-testid="badge-invoice-void">Annullata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChannelLabel = (channel: string | null) => {
    switch (channel) {
      case "online": return "Online";
      case "printed": return "Biglietteria";
      case "pr": return "PR";
      default: return "-";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "commission": return "Commissione";
      case "subscription": return "Abbonamento";
      case "invoice": return "Fattura";
      case "payment": return "Pagamento";
      case "adjustment": return "Rettifica";
      default: return type;
    }
  };

  const renderSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[200px] w-full" />
    </div>
  );

  return (
    <MobileAppLayout
      header={<MobileHeader title="Billing" showBackButton showMenuButton />}
      contentClassName="pb-24"
    >
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-8" data-testid="page-organizer-billing">
        <div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Visualizza abbonamento, costi e fatture
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto p-1 gap-1">
          <TabsTrigger value="subscription" className="gap-2" data-testid="tab-subscription">
            <CreditCard className="w-4 h-4" />
            Abbonamento
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-2" data-testid="tab-costs">
            <Percent className="w-4 h-4" />
            Costi
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2" data-testid="tab-invoices">
            <Receipt className="w-4 h-4" />
            Fatture
          </TabsTrigger>
          <TabsTrigger value="wallet" className="gap-2" data-testid="tab-wallet">
            <Wallet className="w-4 h-4" />
            Wallet
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2" data-testid="tab-report">
            <BarChart3 className="w-4 h-4" />
            Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="mt-6 space-y-4">
          {subscriptionLoading ? (
            renderSkeleton()
          ) : subscriptionData?.subscription && subscriptionData?.plan ? (
            <Card data-testid="card-subscription-details">
              <CardHeader>
                <CardTitle>Dettagli Abbonamento</CardTitle>
                <CardDescription>Stato e informazioni del tuo piano</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Piano</p>
                    <p className="font-semibold text-lg" data-testid="text-plan-name">{subscriptionData.plan.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <Badge variant={subscriptionData.subscription.billingCycle === "monthly" ? "default" : "secondary"} data-testid="badge-billing-cycle">
                      {subscriptionData.subscription.billingCycle === "monthly" ? "Mensile" : "Per Evento"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stato</p>
                    {getStatusBadge(subscriptionData.subscription.status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prezzo</p>
                    <p className="font-semibold" data-testid="text-plan-price">{formatCurrency(subscriptionData.plan.price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Inizio</p>
                    <p className="font-medium flex items-center gap-2" data-testid="text-start-date">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {formatDate(subscriptionData.subscription.startDate)}
                    </p>
                  </div>
                  {subscriptionData.subscription.endDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Scadenza</p>
                      <p className="font-medium flex items-center gap-2" data-testid="text-end-date">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(subscriptionData.subscription.endDate)}
                      </p>
                    </div>
                  )}
                  {subscriptionData.subscription.billingCycle === "monthly" && subscriptionData.subscription.nextBillingDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Prossima Fatturazione</p>
                      <p className="font-medium flex items-center gap-2" data-testid="text-next-billing">
                        <Calendar className="w-4 h-4 text-yellow-500" />
                        {formatDate(subscriptionData.subscription.nextBillingDate)}
                      </p>
                    </div>
                  )}
                  {subscriptionData.subscription.billingCycle === "per_event" && (
                    <div>
                      <p className="text-sm text-muted-foreground">Eventi Utilizzati</p>
                      <p className="font-semibold text-lg" data-testid="text-events-used">
                        {subscriptionData.subscription.eventsUsed} / {subscriptionData.plan.eventsIncluded || "∞"}
                      </p>
                      {subscriptionData.eventsRemaining !== null && subscriptionData.eventsRemaining <= 3 && (
                        <p className="text-xs text-yellow-500 mt-1">
                          Rimangono {subscriptionData.eventsRemaining} eventi
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {subscriptionData.plan.description && (
                  <div className="mt-6 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Descrizione Piano</p>
                    <p className="mt-1">{subscriptionData.plan.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card data-testid="card-no-subscription">
              <CardContent className="py-12 text-center">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nessun abbonamento attivo. Contatta l'amministratore per attivare un piano.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="costs" className="mt-6 space-y-4">
          <Card data-testid="card-ledger-filters">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dateFrom">Da</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    data-testid="input-date-from"
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo">A</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    data-testid="input-date-to"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                    data-testid="button-clear-filters"
                  >
                    Azzera Filtri
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {ledgerLoading ? (
            renderSkeleton()
          ) : (
            <Card data-testid="card-ledger-table">
              <CardHeader>
                <CardTitle>Movimenti Wallet</CardTitle>
                <CardDescription>Storico di tutte le transazioni e commissioni</CardDescription>
              </CardHeader>
              <CardContent>
                {ledgerEntries && ledgerEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Direzione</TableHead>
                          <TableHead>Canale</TableHead>
                          <TableHead className="text-right">Importo</TableHead>
                          <TableHead className="text-right">Saldo Dopo</TableHead>
                          <TableHead>Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledgerEntries.map((entry) => (
                        <TableRow key={entry.id} data-testid={`row-ledger-${entry.id}`}>
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(entry.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getTypeLabel(entry.type)}</Badge>
                          </TableCell>
                          <TableCell>
                            {entry.direction === "debit" ? (
                              <span className="flex items-center gap-1 text-destructive">
                                <ArrowDownRight className="w-4 h-4" />
                                Debito
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-500">
                                <ArrowUpRight className="w-4 h-4" />
                                Credito
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{getChannelLabel(entry.channel)}</TableCell>
                          <TableCell className={`text-right font-medium ${entry.direction === "debit" ? "text-destructive" : "text-green-500"}`}>
                            {entry.direction === "debit" ? "-" : "+"}{formatCurrency(entry.amount)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${parseFloat(entry.balanceAfter) < 0 ? "text-destructive" : ""}`}>
                            {formatCurrency(entry.balanceAfter)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={entry.note || ""}>
                            {entry.note || "-"}
                          </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nessun movimento trovato</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-6 space-y-4">
          {invoicesLoading ? (
            renderSkeleton()
          ) : (
            <Card data-testid="card-invoices-table">
              <CardHeader>
                <CardTitle>Le Mie Fatture</CardTitle>
                <CardDescription>Elenco di tutte le fatture emesse</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices && invoices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Numero</TableHead>
                          <TableHead>Periodo</TableHead>
                          <TableHead className="text-right">Importo</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead>Scadenza</TableHead>
                          <TableHead>Data Emissione</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                        <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                          <TableCell className="font-medium" data-testid={`text-invoice-number-${invoice.id}`}>
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(invoice.amount)}
                          </TableCell>
                          <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                          <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                          <TableCell>{formatDate(invoice.issuedAt)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedInvoice(invoice)}
                              data-testid={`button-view-invoice-${invoice.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nessuna fattura presente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="wallet" className="mt-6 space-y-4">
          {walletLoading ? (
            renderSkeleton()
          ) : walletData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className={parseFloat(walletData.wallet.balance) < 0 ? "border-destructive" : ""}
                  data-testid="card-wallet-balance"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      Saldo Attuale
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className={`text-4xl font-bold ${parseFloat(walletData.wallet.balance) < 0 ? "text-destructive" : "text-green-500"}`}
                      data-testid="text-wallet-balance"
                    >
                      {formatCurrency(walletData.wallet.balance)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {parseFloat(walletData.wallet.balance) < 0 ? "Debito accumulato" : "Credito disponibile"}
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-wallet-threshold">
                  <CardHeader>
                    <CardTitle>Soglia Fatturazione</CardTitle>
                    <CardDescription>Importo minimo per la generazione automatica della fattura</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold" data-testid="text-threshold-amount">
                      {formatCurrency(walletData.wallet.thresholdAmount)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {walletData.thresholdStatus.exceeded && (
                <Card className="border-yellow-500 bg-yellow-500/10" data-testid="card-threshold-warning">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-yellow-500" />
                      <div>
                        <p className="font-semibold text-yellow-500">Da Fatturare</p>
                        <p className="text-sm text-muted-foreground">
                          Il tuo saldo ha superato la soglia di fatturazione.
                          Importo da fatturare: <strong>{formatCurrency(Math.abs(walletData.thresholdStatus.amountToInvoice))}</strong>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card data-testid="card-wallet-info">
                <CardHeader>
                  <CardTitle>Informazioni Wallet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Valuta</p>
                      <p className="font-medium">{walletData.wallet.currency}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stato</p>
                      <Badge variant={walletData.wallet.isActive ? "default" : "secondary"}>
                        {walletData.wallet.isActive ? "Attivo" : "Disattivato"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card data-testid="card-no-wallet">
              <CardContent className="py-12 text-center">
                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Wallet non disponibile. Contatta l'amministratore.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="report" className="mt-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-yellow-500" />
                Report Vendite
              </h2>
              <p className="text-sm text-muted-foreground">
                Analisi vendite e commissioni per i tuoi eventi
              </p>
            </div>
            <Button onClick={handleExportCSV} className="gap-2" data-testid="button-export-csv">
              <Download className="w-4 h-4" />
              Esporta CSV
            </Button>
          </div>

          <Card data-testid="card-report-filters">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="reportDateFrom">Da</Label>
                  <Input
                    id="reportDateFrom"
                    type="date"
                    value={reportDateFrom}
                    onChange={(e) => setReportDateFrom(e.target.value)}
                    data-testid="input-report-date-from"
                  />
                </div>
                <div>
                  <Label htmlFor="reportDateTo">A</Label>
                  <Input
                    id="reportDateTo"
                    type="date"
                    value={reportDateTo}
                    onChange={(e) => setReportDateTo(e.target.value)}
                    data-testid="input-report-date-to"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const date = new Date();
                      date.setMonth(date.getMonth() - 1);
                      setReportDateFrom(date.toISOString().split("T")[0]);
                      setReportDateTo(new Date().toISOString().split("T")[0]);
                    }}
                    data-testid="button-reset-report-filters"
                  >
                    Azzera Filtri
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {reportLoading ? (
            renderSkeleton()
          ) : reportData ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card data-testid="card-report-tickets">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/20 rounded-lg">
                        <Ticket className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Biglietti Venduti</p>
                        <p className="text-2xl font-bold" data-testid="text-report-tickets-total">
                          {reportData.summary.ticketsSoldTotal}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-report-gross">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Euro className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ricavo Lordo</p>
                        <p className="text-2xl font-bold" data-testid="text-report-gross">
                          {formatCurrency(reportData.summary.grossRevenueTotal)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-report-commissions">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Percent className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Commissioni</p>
                        <p className="text-2xl font-bold" data-testid="text-report-commissions">
                          {formatCurrency(reportData.summary.commissionTotal)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-report-net">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-500/20 rounded-lg">
                        <Wallet className="w-5 h-5 text-teal-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Netto</p>
                        <p className="text-2xl font-bold" data-testid="text-report-net">
                          {formatCurrency(reportData.summary.netToOrganizer)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card data-testid="card-report-online">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Online</p>
                    <p className="text-xl font-semibold">{reportData.summary.ticketsSoldOnline} biglietti</p>
                    <p className="text-sm text-muted-foreground">
                      Commissioni: {formatCurrency(reportData.summary.commissionOnline)}
                    </p>
                  </CardContent>
                </Card>
                <Card data-testid="card-report-printed">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Biglietteria</p>
                    <p className="text-xl font-semibold">{reportData.summary.ticketsSoldPrinted} biglietti</p>
                    <p className="text-sm text-muted-foreground">
                      Commissioni: {formatCurrency(reportData.summary.commissionPrinted)}
                    </p>
                  </CardContent>
                </Card>
                <Card data-testid="card-report-pr">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">PR</p>
                    <p className="text-xl font-semibold">{reportData.summary.ticketsSoldPr} biglietti</p>
                    <p className="text-sm text-muted-foreground">
                      Commissioni: {formatCurrency(reportData.summary.commissionPr)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {reportData.byEvent.length > 0 && (
                <Card data-testid="card-report-by-event">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Vendite per Evento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Evento</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Biglietti</TableHead>
                            <TableHead className="text-right">Ricavo Lordo</TableHead>
                            <TableHead className="text-right">Commissioni</TableHead>
                            <TableHead className="text-right">Netto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.byEvent.map((event) => (
                            <TableRow key={event.eventId} data-testid={`row-report-event-${event.eventId}`}>
                              <TableCell className="font-medium">{event.eventName}</TableCell>
                              <TableCell>{event.eventDate}</TableCell>
                              <TableCell className="text-right">{event.ticketsSold}</TableCell>
                              <TableCell className="text-right">{formatCurrency(event.grossRevenue)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(event.commissions)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(event.netRevenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {reportData.byEvent.length === 0 && (
                <Card data-testid="card-no-report-data">
                  <CardContent className="py-12 text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nessun dato disponibile per il periodo selezionato
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-invoice-detail">
          <DialogHeader>
            <DialogTitle>Dettaglio Fattura</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Stato</p>
                  {getInvoiceStatusBadge(selectedInvoice.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Importo Totale</p>
                  <p className="font-semibold text-lg">{formatCurrency(selectedInvoice.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scadenza</p>
                  <p className="font-medium">{formatDate(selectedInvoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pagata il</p>
                  <p className="font-medium">{formatDate(selectedInvoice.paidAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Periodo</p>
                <p className="font-medium">
                  {formatDate(selectedInvoice.periodStart)} - {formatDate(selectedInvoice.periodEnd)}
                </p>
              </div>

              {selectedInvoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Note</p>
                  <p>{selectedInvoice.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Voci Fattura</p>
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrizione</TableHead>
                        <TableHead className="text-center">Qtà</TableHead>
                        <TableHead className="text-right">Prezzo Unit.</TableHead>
                        <TableHead className="text-right">Totale</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item) => (
                        <TableRow key={item.id} data-testid={`row-invoice-item-${item.id}`}>
                          <TableCell>
                            {item.description || getItemTypeLabel(item.itemType)}
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">Nessuna voce disponibile</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </MobileAppLayout>
  );
}

function getItemTypeLabel(itemType: string): string {
  switch (itemType) {
    case "subscription": return "Canone Abbonamento";
    case "commissions_online": return "Commissioni Vendite Online";
    case "commissions_printed": return "Commissioni Biglietteria";
    case "commissions_pr": return "Commissioni PR";
    case "adjustment": return "Rettifica";
    default: return itemType;
  }
}
