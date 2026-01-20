import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const { t } = useTranslation();
  const isMobile = useIsMobile();
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
            {t('admin.billing.status.active')}
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            {t('admin.billing.status.suspended')}
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            {t('admin.billing.status.expired')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <XCircle className="w-3 h-3 mr-1" />
            {t('admin.billing.common.none')}
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

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-admin-billing-organizers">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('admin.billing.organizers.title')}</h1>
            <p className="text-muted-foreground">
              {t('admin.billing.organizers.subtitle')}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{t('admin.billing.organizers.listTitle')}</CardTitle>
                <CardDescription>
                  {filteredOrganizers?.length || 0} {t('admin.billing.organizers.found')}
                </CardDescription>
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('admin.billing.organizers.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search-organizer"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-status-filter">
                    <SelectValue placeholder={t('admin.billing.invoices.filterByStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.billing.organizers.filters.all')}</SelectItem>
                    <SelectItem value="active">{t('admin.billing.organizers.filters.activeSubscription')}</SelectItem>
                    <SelectItem value="expired">{t('admin.billing.organizers.filters.expired')}</SelectItem>
                    <SelectItem value="suspended">{t('admin.billing.organizers.filters.suspended')}</SelectItem>
                    <SelectItem value="none">{t('admin.billing.organizers.filters.noSubscription')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.billing.organizers.tableHeaders.company')}</TableHead>
                  <TableHead>{t('admin.billing.organizers.tableHeaders.subscriptionStatus')}</TableHead>
                  <TableHead>{t('admin.billing.organizers.tableHeaders.walletBalance')}</TableHead>
                  <TableHead>{t('admin.billing.organizers.tableHeaders.threshold')}</TableHead>
                  <TableHead>{t('admin.billing.organizers.tableHeaders.status')}</TableHead>
                  <TableHead className="text-right">{t('admin.billing.common.actions')}</TableHead>
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
                            {t('admin.billing.organizers.toBill')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/billing/organizers/${org.company.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-view-organizer-${org.company.id}`}>
                            {t('admin.billing.common.details')}
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
                      {t('admin.billing.organizers.noOrganizers')}
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

  return (
    <MobileAppLayout
      header={<MobileHeader title={t('admin.billing.organizers.title')} showBackButton showMenuButton />}
      contentClassName="pb-24"
    >
      <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6" data-testid="page-admin-billing-organizers">
        <div>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t('admin.billing.organizers.subtitle')}
          </p>
        </div>

        <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>{t('admin.billing.organizers.listTitle')}</CardTitle>
              <CardDescription>
                {filteredOrganizers?.length || 0} {t('admin.billing.organizers.found')}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.billing.organizers.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                  data-testid="input-search-organizer"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                  <SelectValue placeholder={t('admin.billing.invoices.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.billing.organizers.filters.all')}</SelectItem>
                  <SelectItem value="active">{t('admin.billing.organizers.filters.activeSubscription')}</SelectItem>
                  <SelectItem value="expired">{t('admin.billing.organizers.filters.expired')}</SelectItem>
                  <SelectItem value="suspended">{t('admin.billing.organizers.filters.suspended')}</SelectItem>
                  <SelectItem value="none">{t('admin.billing.organizers.filters.noSubscription')}</SelectItem>
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
                <TableHead>{t('admin.billing.organizers.tableHeaders.company')}</TableHead>
                <TableHead>{t('admin.billing.organizers.tableHeaders.subscriptionStatus')}</TableHead>
                <TableHead>{t('admin.billing.organizers.tableHeaders.walletBalance')}</TableHead>
                <TableHead>{t('admin.billing.organizers.tableHeaders.threshold')}</TableHead>
                <TableHead>{t('admin.billing.organizers.tableHeaders.status')}</TableHead>
                <TableHead className="text-right">{t('admin.billing.common.actions')}</TableHead>
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
                          {t('admin.billing.organizers.toBill')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/billing/organizers/${org.company.id}`}>
                        <Button variant="ghost" size="sm" data-testid={`button-view-organizer-${org.company.id}`}>
                          {t('admin.billing.common.details')}
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
          </div>
        </CardContent>
      </Card>
      </div>
    </MobileAppLayout>
  );
}
