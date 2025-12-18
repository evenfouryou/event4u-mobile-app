import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
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
      toast({ title: "Fattura Pagata", description: "La fattura è stata segnata come pagata." });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
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
    return org?.company.name || "Sconosciuto";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pagata
          </Badge>
        );
      case "issued":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Emessa
          </Badge>
        );
      case "void":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Annullata
          </Badge>
        );
      default:
        return <Badge variant="outline">Bozza</Badge>;
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

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-billing-invoices">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="w-6 h-6 text-yellow-500" />
          Fatture
        </h1>
        <p className="text-muted-foreground">
          Gestisci tutte le fatture degli organizzatori
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Elenco Fatture</CardTitle>
              <CardDescription>
                {filteredInvoices?.length || 0} fatture trovate
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per numero o azienda..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                  data-testid="input-search-invoice"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-invoice-status">
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="draft">Bozza</SelectItem>
                  <SelectItem value="issued">Emessa</SelectItem>
                  <SelectItem value="paid">Pagata</SelectItem>
                  <SelectItem value="void">Annullata</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Azienda</TableHead>
                <TableHead>Importo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Data Emissione</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
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
              <div className="grid grid-cols-2 gap-4">
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
  );
}
