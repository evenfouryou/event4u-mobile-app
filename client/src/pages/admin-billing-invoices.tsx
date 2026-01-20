import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Receipt, Search, CheckCircle, Clock, XCircle, Loader2, Eye } from "lucide-react";
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { OrganizerInvoice, Company } from "@shared/schema";

interface InvoiceWithCompany extends OrganizerInvoice {
  company?: Company;
}

export default function AdminBillingInvoices() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceWithCompany | null>(null);

  const { data: invoices, isLoading } = useQuery<OrganizerInvoice[]>({
    queryKey: ["/api/admin/billing/invoices"],
  });

  const { data: organizers } = useQuery<{ company: Company }[]>({
    queryKey: ["/api/admin/billing/organizers"],
  });

  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest("PUT", `/api/admin/billing/invoices/${invoiceId}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/invoices"] });
      toast({ title: t('admin.billing.invoices.paidSuccess'), description: t('admin.billing.invoices.paidSuccessMessage') });
    },
    onError: (error: any) => {
      toast({ title: t('admin.billing.common.error'), description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(parseFloat(value));
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd MMM yyyy", { locale: it });
  };

  const getCompanyName = (companyId: string) => {
    const org = organizers?.find((o) => o.company.id === companyId);
    return org?.company.name || t('admin.billing.common.unknown');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t('admin.billing.status.paid')}
          </Badge>
        );
      case "issued":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            {t('admin.billing.status.issued')}
          </Badge>
        );
      case "void":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            {t('admin.billing.status.void')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{t('admin.billing.status.draft')}</Badge>;
    }
  };

  const filteredInvoices = invoices?.filter((invoice) => {
    const companyName = getCompanyName(invoice.companyId).toLowerCase();
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      companyName.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-admin-billing-invoices">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-admin-billing-invoices">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('admin.billing.invoices.title')}</h1>
            <p className="text-muted-foreground">{t('admin.billing.invoices.subtitle')}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{t('admin.billing.invoices.listTitle')}</CardTitle>
                <CardDescription>
                  {filteredInvoices?.length || 0} {t('admin.billing.invoices.found')}
                </CardDescription>
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('admin.billing.invoices.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search-invoice"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-invoice-status">
                    <SelectValue placeholder={t('admin.billing.invoices.filterByStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.billing.common.all')}</SelectItem>
                    <SelectItem value="draft">{t('admin.billing.status.draft')}</SelectItem>
                    <SelectItem value="issued">{t('admin.billing.status.issued')}</SelectItem>
                    <SelectItem value="paid">{t('admin.billing.status.paid')}</SelectItem>
                    <SelectItem value="void">{t('admin.billing.status.void')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.billing.invoices.tableHeaders.number')}</TableHead>
                  <TableHead>{t('admin.billing.invoices.tableHeaders.company')}</TableHead>
                  <TableHead>{t('admin.billing.invoices.tableHeaders.amount')}</TableHead>
                  <TableHead>{t('admin.billing.invoices.tableHeaders.status')}</TableHead>
                  <TableHead>{t('admin.billing.invoices.tableHeaders.issueDate')}</TableHead>
                  <TableHead>{t('admin.billing.invoices.tableHeaders.dueDate')}</TableHead>
                  <TableHead className="text-right">{t('admin.billing.common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices?.map((invoice) => (
                  <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{getCompanyName(invoice.companyId)}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>{formatDate(invoice.issuedAt)}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingInvoice(invoice)}
                          data-testid={`button-view-invoice-${invoice.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {invoice.status === "issued" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markPaidMutation.mutate(invoice.id)}
                            disabled={markPaidMutation.isPending}
                            data-testid={`button-mark-paid-${invoice.id}`}
                          >
                            {markPaidMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {t('admin.billing.invoices.markPaid')}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredInvoices || filteredInvoices.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {t('admin.billing.invoices.noInvoices')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('admin.billing.invoices.detail.title')}</DialogTitle>
              <DialogDescription>
                {viewingInvoice?.invoiceNumber}
              </DialogDescription>
            </DialogHeader>
            {viewingInvoice && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('admin.billing.invoices.tableHeaders.company')}</p>
                    <p className="font-medium">{getCompanyName(viewingInvoice.companyId)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('admin.billing.invoices.tableHeaders.status')}</p>
                    <div className="mt-1">{getStatusBadge(viewingInvoice.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('admin.billing.invoices.detail.period')}</p>
                    <p className="font-medium">
                      {formatDate(viewingInvoice.periodStart)} - {formatDate(viewingInvoice.periodEnd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('admin.billing.invoices.tableHeaders.amount')}</p>
                    <p className="font-medium text-lg">{formatCurrency(viewingInvoice.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('admin.billing.invoices.tableHeaders.issueDate')}</p>
                    <p className="font-medium">{formatDate(viewingInvoice.issuedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('admin.billing.invoices.tableHeaders.dueDate')}</p>
                    <p className="font-medium">{formatDate(viewingInvoice.dueDate)}</p>
                  </div>
                  {viewingInvoice.paidAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('admin.billing.invoices.detail.paymentDate')}</p>
                      <p className="font-medium">{formatDate(viewingInvoice.paidAt)}</p>
                    </div>
                  )}
                </div>
                {viewingInvoice.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('admin.billing.invoices.detail.notes')}</p>
                    <p className="text-sm">{viewingInvoice.notes}</p>
                  </div>
                )}
                {viewingInvoice.status === "issued" && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      markPaidMutation.mutate(viewingInvoice.id);
                      setViewingInvoice(null);
                    }}
                    disabled={markPaidMutation.isPending}
                    data-testid="button-mark-paid-dialog"
                  >
                    {markPaidMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('admin.billing.invoices.markAsPaid')}
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={<MobileHeader title={t('admin.billing.invoices.title')} showBackButton showMenuButton />}
      contentClassName="pb-24"
    >
      <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6" data-testid="page-admin-billing-invoices">
        <div>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t('admin.billing.invoices.subtitle')}
          </p>
        </div>

        <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>{t('admin.billing.invoices.listTitle')}</CardTitle>
              <CardDescription>
                {filteredInvoices?.length || 0} {t('admin.billing.invoices.found')}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.billing.invoices.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                  data-testid="input-search-invoice"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-invoice-status">
                  <SelectValue placeholder={t('admin.billing.invoices.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.billing.common.all')}</SelectItem>
                  <SelectItem value="draft">{t('admin.billing.status.draft')}</SelectItem>
                  <SelectItem value="issued">{t('admin.billing.status.issued')}</SelectItem>
                  <SelectItem value="paid">{t('admin.billing.status.paid')}</SelectItem>
                  <SelectItem value="void">{t('admin.billing.status.void')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.billing.invoices.tableHeaders.number')}</TableHead>
                <TableHead>{t('admin.billing.invoices.tableHeaders.company')}</TableHead>
                <TableHead>{t('admin.billing.invoices.tableHeaders.amount')}</TableHead>
                <TableHead>{t('admin.billing.invoices.tableHeaders.status')}</TableHead>
                <TableHead>{t('admin.billing.invoices.tableHeaders.issueDate')}</TableHead>
                <TableHead>{t('admin.billing.invoices.tableHeaders.dueDate')}</TableHead>
                <TableHead className="text-right">{t('admin.billing.common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices?.map((invoice) => (
                <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{getCompanyName(invoice.companyId)}</TableCell>
                  <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell>{formatDate(invoice.issuedAt)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewingInvoice(invoice)}
                        data-testid={`button-view-invoice-${invoice.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {invoice.status === "issued" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markPaidMutation.mutate(invoice.id)}
                          disabled={markPaidMutation.isPending}
                          data-testid={`button-mark-paid-${invoice.id}`}
                        >
                          {markPaidMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Pagata
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredInvoices || filteredInvoices.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nessuna fattura trovata
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dettaglio Fattura</DialogTitle>
            <DialogDescription>
              {viewingInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Azienda</p>
                  <p className="font-medium">{getCompanyName(viewingInvoice.companyId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stato</p>
                  <div className="mt-1">{getStatusBadge(viewingInvoice.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Periodo</p>
                  <p className="font-medium">
                    {formatDate(viewingInvoice.periodStart)} - {formatDate(viewingInvoice.periodEnd)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Importo</p>
                  <p className="font-medium text-lg">{formatCurrency(viewingInvoice.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Emissione</p>
                  <p className="font-medium">{formatDate(viewingInvoice.issuedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scadenza</p>
                  <p className="font-medium">{formatDate(viewingInvoice.dueDate)}</p>
                </div>
                {viewingInvoice.paidAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Data Pagamento</p>
                    <p className="font-medium">{formatDate(viewingInvoice.paidAt)}</p>
                  </div>
                )}
              </div>
              {viewingInvoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Note</p>
                  <p className="text-sm">{viewingInvoice.notes}</p>
                </div>
              )}
              {viewingInvoice.status === "issued" && (
                <Button
                  className="w-full"
                  onClick={() => {
                    markPaidMutation.mutate(viewingInvoice.id);
                    setViewingInvoice(null);
                  }}
                  disabled={markPaidMutation.isPending}
                  data-testid="button-mark-paid-dialog"
                >
                  {markPaidMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Segna come Pagata
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </MobileAppLayout>
  );
}
