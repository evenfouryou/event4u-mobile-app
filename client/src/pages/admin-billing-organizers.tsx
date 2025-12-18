import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { Building2, Search, ExternalLink, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import type { Company, OrganizerSubscription, OrganizerWallet, OrganizerCommissionProfile } from "@shared/schema";

interface OrganizerBillingData {
  company: Company;
  subscription: OrganizerSubscription | null;
  wallet: {
    id: string;
    balance: string;
    thresholdAmount: string;
    currency: string;
  };
  commissionProfile: OrganizerCommissionProfile | null;
}

export default function AdminBillingOrganizers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: organizers, isLoading } = useQuery<OrganizerBillingData[]>({
    queryKey: ["/api/admin/billing/organizers"],
  });

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(parseFloat(value));
  };

  const getSubscriptionStatus = (subscription: OrganizerSubscription | null) => {
    if (!subscription) return "none";
    if (subscription.status !== "active") return subscription.status;
    if (subscription.endDate && new Date(subscription.endDate) < new Date()) return "expired";
    return "active";
  };

  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Attivo
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Sospeso
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Scaduto
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <XCircle className="w-3 h-3 mr-1" />
            Nessuno
          </Badge>
        );
    }
  };

  const needsInvoicing = (wallet: { balance: string; thresholdAmount: string }) => {
    const balance = parseFloat(wallet.balance);
    const threshold = parseFloat(wallet.thresholdAmount);
    return balance < 0 && Math.abs(balance) >= threshold;
  };

  const filteredOrganizers = organizers?.filter((org) => {
    const matchesSearch = org.company.name.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getSubscriptionStatus(org.subscription);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-admin-billing-organizers">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-billing-organizers">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-yellow-500" />
          Billing Organizzatori
        </h1>
        <p className="text-muted-foreground">
          Gestisci abbonamenti, commissioni e fatturazione per gli organizzatori
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Elenco Organizzatori</CardTitle>
              <CardDescription>
                {filteredOrganizers?.length || 0} organizzatori trovati
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca organizzatore..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                  data-testid="input-search-organizer"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="active">Abbonamento Attivo</SelectItem>
                  <SelectItem value="expired">Scaduto</SelectItem>
                  <SelectItem value="suspended">Sospeso</SelectItem>
                  <SelectItem value="none">Senza Abbonamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Azienda</TableHead>
                <TableHead>Stato Abbonamento</TableHead>
                <TableHead>Saldo Wallet</TableHead>
                <TableHead>Soglia</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizers?.map((org) => {
                const status = getSubscriptionStatus(org.subscription);
                const invoiceNeeded = needsInvoicing(org.wallet);
                const balance = parseFloat(org.wallet.balance);

                return (
                  <TableRow key={org.company.id} data-testid={`row-organizer-${org.company.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{org.company.name}</p>
                        {org.company.taxId && (
                          <p className="text-sm text-muted-foreground">{org.company.taxId}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getSubscriptionBadge(status)}</TableCell>
                    <TableCell>
                      <span className={balance < 0 ? "text-destructive font-medium" : "text-green-500"}>
                        {formatCurrency(org.wallet.balance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(org.wallet.thresholdAmount)}
                    </TableCell>
                    <TableCell>
                      {invoiceNeeded && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Da Fatturare
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/billing/organizers/${org.company.id}`}>
                        <Button variant="ghost" size="sm" data-testid={`button-view-organizer-${org.company.id}`}>
                          Dettagli
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!filteredOrganizers || filteredOrganizers.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nessun organizzatore trovato
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
