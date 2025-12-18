import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  BarChart3,
  Download,
  Ticket,
  Euro,
  Percent,
  Building2,
  Calendar,
  Filter,
} from "lucide-react";
import type { Company } from "@shared/schema";

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

export default function AdminBillingReports() {
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: reportData, isLoading: reportLoading } = useQuery<SalesReportData>({
    queryKey: ["/api/admin/billing/reports/sales", dateFrom, dateTo, selectedCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (selectedCompanyId && selectedCompanyId !== "all") params.set("companyId", selectedCompanyId);
      const response = await fetch(`/api/admin/billing/reports/sales?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Errore nel caricamento del report");
      return response.json();
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (selectedCompanyId && selectedCompanyId !== "all") params.set("companyId", selectedCompanyId);
    params.set("format", "csv");
    
    window.open(`/api/admin/billing/reports/sales?${params.toString()}`, "_blank");
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case "online": return "Online";
      case "printed": return "Biglietteria";
      case "pr": return "PR";
      default: return channel;
    }
  };

  const renderSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[200px] w-full" />
    </div>
  );

  return (
    <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6" data-testid="page-admin-billing-reports">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 flex-shrink-0" />
            Report Vendite
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Analisi vendite e commissioni per tutti gli organizzatori
          </p>
        </div>
        <Button onClick={handleExportCSV} className="gap-2" data-testid="button-export-csv">
          <Download className="w-4 h-4" />
          Esporta CSV
        </Button>
      </div>

      <Card data-testid="card-filters">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtri
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
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
            <div>
              <Label htmlFor="company">Azienda</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger id="company" data-testid="select-company">
                  <SelectValue placeholder="Tutte le aziende" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le aziende</SelectItem>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - 1);
                  setDateFrom(date.toISOString().split("T")[0]);
                  setDateTo(new Date().toISOString().split("T")[0]);
                  setSelectedCompanyId("all");
                }}
                data-testid="button-reset-filters"
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            <Card data-testid="card-summary-tickets">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-yellow-500/20 rounded-lg flex-shrink-0">
                    <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Biglietti Venduti</p>
                    <p className="text-lg sm:text-2xl font-bold" data-testid="text-tickets-total">
                      {reportData.summary.ticketsSoldTotal}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-summary-gross">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-green-500/20 rounded-lg flex-shrink-0">
                    <Euro className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Ricavo Lordo</p>
                    <p className="text-lg sm:text-2xl font-bold" data-testid="text-gross-revenue">
                      {formatCurrency(reportData.summary.grossRevenueTotal)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-summary-commissions">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                    <Percent className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Commissioni Totali</p>
                    <p className="text-lg sm:text-2xl font-bold" data-testid="text-commissions-total">
                      {formatCurrency(reportData.summary.commissionTotal)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-summary-net">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-teal-500/20 rounded-lg flex-shrink-0">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Netto Organizzatori</p>
                    <p className="text-lg sm:text-2xl font-bold" data-testid="text-net-organizer">
                      {formatCurrency(reportData.summary.netToOrganizer)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card data-testid="card-tickets-online">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <p className="text-xs sm:text-sm text-muted-foreground">Biglietti Online</p>
                <p className="text-lg sm:text-xl font-semibold" data-testid="text-tickets-online">
                  {reportData.summary.ticketsSoldOnline}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Commissioni: {formatCurrency(reportData.summary.commissionOnline)}
                </p>
              </CardContent>
            </Card>
            <Card data-testid="card-tickets-printed">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <p className="text-xs sm:text-sm text-muted-foreground">Biglietti Biglietteria</p>
                <p className="text-lg sm:text-xl font-semibold" data-testid="text-tickets-printed">
                  {reportData.summary.ticketsSoldPrinted}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Commissioni: {formatCurrency(reportData.summary.commissionPrinted)}
                </p>
              </CardContent>
            </Card>
            <Card data-testid="card-tickets-pr">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <p className="text-xs sm:text-sm text-muted-foreground">Biglietti PR</p>
                <p className="text-lg sm:text-xl font-semibold" data-testid="text-tickets-pr">
                  {reportData.summary.ticketsSoldPr}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Commissioni: {formatCurrency(reportData.summary.commissionPr)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Card data-testid="card-invoices-stats">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Fatture Emesse</p>
                    <p className="text-lg sm:text-xl font-semibold" data-testid="text-invoices-issued">
                      {reportData.summary.invoicesIssued}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Fatture Pagate</p>
                    <p className="text-lg sm:text-xl font-semibold text-green-500" data-testid="text-invoices-paid">
                      {reportData.summary.invoicesPaid}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-wallet-debt">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <p className="text-xs sm:text-sm text-muted-foreground">Debito Wallet Totale</p>
                <p className={`text-lg sm:text-xl font-semibold ${reportData.summary.walletDebt > 0 ? "text-destructive" : ""}`} data-testid="text-wallet-debt">
                  {formatCurrency(reportData.summary.walletDebt)}
                </p>
              </CardContent>
            </Card>
          </div>

          {reportData.byChannel.length > 0 && (
            <Card data-testid="card-by-channel">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Vendite per Canale</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canale</TableHead>
                      <TableHead className="text-right">Biglietti</TableHead>
                      <TableHead className="text-right">Ricavo Lordo</TableHead>
                      <TableHead className="text-right">Commissioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.byChannel.map((channel) => (
                      <TableRow key={channel.channel} data-testid={`row-channel-${channel.channel}`}>
                        <TableCell>
                          <Badge variant="outline">{getChannelLabel(channel.channel)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{channel.ticketsSold}</TableCell>
                        <TableCell className="text-right">{formatCurrency(channel.grossRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(channel.commissions)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {reportData.byEvent.length > 0 && (
            <Card data-testid="card-by-event">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  Vendite per Evento
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Dettaglio vendite e commissioni per ogni evento
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Biglietti</TableHead>
                      <TableHead className="text-right">Ricavo Lordo</TableHead>
                      <TableHead className="text-right">Commissioni</TableHead>
                      <TableHead className="text-right">Ricavo Netto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.byEvent.map((event) => (
                      <TableRow key={event.eventId} data-testid={`row-event-${event.eventId}`}>
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

          {reportData.byEvent.length === 0 && reportData.byChannel.length === 0 && (
            <Card data-testid="card-no-data">
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
    </div>
  );
}
