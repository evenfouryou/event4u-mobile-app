import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Wallet,
  Receipt,
  Percent,
  Loader2,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type {
  Company,
  OrganizerPlan,
  OrganizerSubscription,
  OrganizerCommissionProfile,
  OrganizerWallet,
  OrganizerWalletLedger,
  OrganizerInvoice,
} from "@shared/schema";

interface OrganizerDetailData {
  company: Company;
  subscription: OrganizerSubscription | null;
  plan: OrganizerPlan | null;
  wallet: OrganizerWallet;
  commissionProfile: OrganizerCommissionProfile | null;
  invoices: OrganizerInvoice[];
  recentLedgerEntries: OrganizerWalletLedger[];
}

const subscriptionFormSchema = z.object({
  planId: z.string().min(1, "Seleziona un piano"),
  startDate: z.string().min(1, "Data inizio richiesta"),
  billingCycle: z.enum(["monthly", "per_event"]),
});

const commissionFormSchema = z.object({
  channelOnlineType: z.enum(["percent", "fixed"]),
  channelOnlineValue: z.string(),
  channelPrintedType: z.enum(["percent", "fixed"]),
  channelPrintedValue: z.string(),
  channelPrType: z.enum(["percent", "fixed"]),
  channelPrValue: z.string(),
});

const invoiceFormSchema = z.object({
  periodStart: z.string().min(1, "Data inizio richiesta"),
  periodEnd: z.string().min(1, "Data fine richiesta"),
  notes: z.string().optional(),
});

export default function AdminBillingOrganizerDetail() {
  const { companyId } = useParams<{ companyId: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("subscription");
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [thresholdValue, setThresholdValue] = useState("");

  const { data, isLoading } = useQuery<OrganizerDetailData>({
    queryKey: ["/api/admin/billing/organizers", companyId],
  });

  const { data: plans } = useQuery<OrganizerPlan[]>({
    queryKey: ["/api/admin/billing/plans"],
  });

  const subscriptionForm = useForm({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      planId: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      billingCycle: "monthly" as const,
    },
  });

  const commissionForm = useForm({
    resolver: zodResolver(commissionFormSchema),
    defaultValues: {
      channelOnlineType: "percent" as const,
      channelOnlineValue: "0",
      channelPrintedType: "percent" as const,
      channelPrintedValue: "0",
      channelPrType: "percent" as const,
      channelPrValue: "0",
    },
  });

  const invoiceForm = useForm({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      periodStart: "",
      periodEnd: "",
      notes: "",
    },
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof subscriptionFormSchema>) => {
      return apiRequest("POST", `/api/admin/billing/organizers/${companyId}/subscription`, {
        planId: formData.planId,
        startDate: formData.startDate,
        billingCycle: formData.billingCycle,
        status: "active",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/organizers", companyId] });
      setIsSubscriptionDialogOpen(false);
      toast({ title: "Abbonamento Creato", description: "L'abbonamento è stato assegnato con successo." });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateCommissionsMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof commissionFormSchema>) => {
      return apiRequest("PUT", `/api/admin/billing/organizers/${companyId}/commissions`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/organizers", companyId] });
      toast({ title: "Commissioni Aggiornate", description: "Il profilo commissioni è stato salvato." });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateThresholdMutation = useMutation({
    mutationFn: async (amount: string) => {
      return apiRequest("PUT", `/api/admin/billing/organizers/${companyId}/wallet-threshold`, {
        thresholdAmount: parseFloat(amount),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/organizers", companyId] });
      toast({ title: "Soglia Aggiornata", description: "La soglia fatturazione è stata aggiornata." });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof invoiceFormSchema>) => {
      return apiRequest("POST", `/api/admin/billing/organizers/${companyId}/invoices`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/organizers", companyId] });
      setIsInvoiceDialogOpen(false);
      invoiceForm.reset();
      toast({ title: "Fattura Creata", description: "La fattura è stata generata con successo." });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest("PUT", `/api/admin/billing/invoices/${invoiceId}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/organizers", companyId] });
      toast({ title: "Fattura Pagata", description: "La fattura è stata segnata come pagata." });
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(numValue);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd MMM yyyy", { locale: it });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-admin-billing-organizer-detail">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6" data-testid="page-admin-billing-organizer-detail">
        <p className="text-muted-foreground">Organizzatore non trovato</p>
      </div>
    );
  }

  const { company, subscription, plan, wallet, commissionProfile, invoices, recentLedgerEntries } = data;
  const balance = parseFloat(wallet.balance);

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-billing-organizer-detail">
      <div className="flex items-center gap-4">
        <Link href="/admin/billing/organizers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-yellow-500" />
            {company.name}
          </h1>
          <p className="text-muted-foreground">
            Gestione billing e abbonamento
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="subscription" className="gap-2" data-testid="tab-subscription">
            <CreditCard className="w-4 h-4" />
            Abbonamento
          </TabsTrigger>
          <TabsTrigger value="commissions" className="gap-2" data-testid="tab-commissions">
            <Percent className="w-4 h-4" />
            Commissioni
          </TabsTrigger>
          <TabsTrigger value="wallet" className="gap-2" data-testid="tab-wallet">
            <Wallet className="w-4 h-4" />
            Wallet
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2" data-testid="tab-invoices">
            <Receipt className="w-4 h-4" />
            Fatture
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Abbonamento Attuale</CardTitle>
                  <CardDescription>Stato e dettagli dell'abbonamento</CardDescription>
                </div>
                <Button onClick={() => setIsSubscriptionDialogOpen(true)} data-testid="button-assign-plan">
                  <Plus className="w-4 h-4 mr-2" />
                  {subscription ? "Cambia Piano" : "Assegna Piano"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {subscription && plan ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Piano</p>
                    <p className="font-medium">{plan.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <Badge variant={subscription.billingCycle === "monthly" ? "default" : "secondary"}>
                      {subscription.billingCycle === "monthly" ? "Mensile" : "Per Evento"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stato</p>
                    {subscription.status === "active" ? (
                      <Badge className="bg-green-500/20 text-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Attivo
                      </Badge>
                    ) : subscription.status === "suspended" ? (
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        Sospeso
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Scaduto
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Inizio</p>
                    <p className="font-medium">{formatDate(subscription.startDate)}</p>
                  </div>
                  {subscription.endDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Scadenza</p>
                      <p className="font-medium">{formatDate(subscription.endDate)}</p>
                    </div>
                  )}
                  {subscription.billingCycle === "per_event" && (
                    <div>
                      <p className="text-sm text-muted-foreground">Eventi Usati</p>
                      <p className="font-medium">
                        {subscription.eventsUsed} / {plan.eventsIncluded || "∞"}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Prezzo</p>
                    <p className="font-medium">{formatCurrency(plan.price)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nessun abbonamento attivo. Assegna un piano per iniziare.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profilo Commissioni</CardTitle>
              <CardDescription>Configura le commissioni per canale di vendita</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...commissionForm}>
                <form
                  onSubmit={commissionForm.handleSubmit((data) => updateCommissionsMutation.mutate(data))}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4 p-4 rounded-lg border">
                      <h4 className="font-medium">Vendite Online</h4>
                      <FormField
                        control={commissionForm.control}
                        name="channelOnlineType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-online-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percent">Percentuale</SelectItem>
                                <SelectItem value="fixed">Fisso (€)</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={commissionForm.control}
                        name="channelOnlineValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valore</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                data-testid="input-online-value"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4 p-4 rounded-lg border">
                      <h4 className="font-medium">Biglietteria Fisica</h4>
                      <FormField
                        control={commissionForm.control}
                        name="channelPrintedType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-printed-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percent">Percentuale</SelectItem>
                                <SelectItem value="fixed">Fisso (€)</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={commissionForm.control}
                        name="channelPrintedValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valore</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                data-testid="input-printed-value"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4 p-4 rounded-lg border">
                      <h4 className="font-medium">Vendite PR</h4>
                      <FormField
                        control={commissionForm.control}
                        name="channelPrType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-pr-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percent">Percentuale</SelectItem>
                                <SelectItem value="fixed">Fisso (€)</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={commissionForm.control}
                        name="channelPrValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valore</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                data-testid="input-pr-value"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={updateCommissionsMutation.isPending} data-testid="button-save-commissions">
                    {updateCommissionsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salva Commissioni
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Saldo Wallet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-4xl font-bold ${balance < 0 ? "text-destructive" : "text-green-500"}`}>
                  {formatCurrency(balance)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {balance < 0 ? "Debito accumulato" : "Credito disponibile"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Soglia Fatturazione</CardTitle>
                <CardDescription>Importo minimo per generare fattura automatica</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={wallet.thresholdAmount}
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(e.target.value)}
                    data-testid="input-threshold"
                  />
                  <Button
                    onClick={() => updateThresholdMutation.mutate(thresholdValue || wallet.thresholdAmount)}
                    disabled={updateThresholdMutation.isPending}
                    data-testid="button-update-threshold"
                  >
                    {updateThresholdMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Aggiorna
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Attuale: {formatCurrency(wallet.thresholdAmount)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Movimenti Recenti</CardTitle>
              <CardDescription>Ultime transazioni del wallet</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Canale</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Saldo Dopo</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLedgerEntries?.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-ledger-${entry.id}`}>
                      <TableCell>{formatDate(entry.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entry.type === "commission"
                            ? "Commissione"
                            : entry.type === "subscription"
                            ? "Abbonamento"
                            : entry.type === "invoice"
                            ? "Fattura"
                            : entry.type === "payment"
                            ? "Pagamento"
                            : "Rettifica"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entry.channel && (
                          <Badge variant="secondary">
                            {entry.channel === "online"
                              ? "Online"
                              : entry.channel === "printed"
                              ? "Biglietteria"
                              : "PR"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`flex items-center gap-1 ${
                            entry.direction === "debit" ? "text-destructive" : "text-green-500"
                          }`}
                        >
                          {entry.direction === "debit" ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                          {formatCurrency(entry.amount)}
                        </span>
                      </TableCell>
                      <TableCell>{formatCurrency(entry.balanceAfter)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {entry.note || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!recentLedgerEntries || recentLedgerEntries.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nessun movimento registrato
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fatture</CardTitle>
                  <CardDescription>Elenco fatture generate per questo organizzatore</CardDescription>
                </div>
                <Button onClick={() => setIsInvoiceDialogOpen(true)} data-testid="button-create-invoice">
                  <Plus className="w-4 h-4 mr-2" />
                  Genera Fattura
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>
                        {invoice.status === "paid" ? (
                          <Badge className="bg-green-500/20 text-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Pagata
                          </Badge>
                        ) : invoice.status === "issued" ? (
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            Emessa
                          </Badge>
                        ) : invoice.status === "void" ? (
                          <Badge variant="destructive">Annullata</Badge>
                        ) : (
                          <Badge variant="outline">Bozza</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell className="text-right">
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
                                Segna Pagata
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!invoices || invoices.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nessuna fattura generata
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assegna Piano</DialogTitle>
            <DialogDescription>
              Seleziona un piano di abbonamento per questo organizzatore
            </DialogDescription>
          </DialogHeader>
          <Form {...subscriptionForm}>
            <form
              onSubmit={subscriptionForm.handleSubmit((data) => createSubscriptionMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={subscriptionForm.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Piano</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-plan">
                          <SelectValue placeholder="Seleziona piano" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans
                          ?.filter((p) => p.isActive)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} - {formatCurrency(p.price)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subscriptionForm.control}
                name="billingCycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclo Fatturazione</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-billing-cycle">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Mensile</SelectItem>
                        <SelectItem value="per_event">Per Evento</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={subscriptionForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Inizio</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSubscriptionDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={createSubscriptionMutation.isPending} data-testid="button-confirm-subscription">
                  {createSubscriptionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Assegna
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Genera Fattura</DialogTitle>
            <DialogDescription>
              Crea una nuova fattura per il periodo selezionato
            </DialogDescription>
          </DialogHeader>
          <Form {...invoiceForm}>
            <form
              onSubmit={invoiceForm.handleSubmit((data) => createInvoiceMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={invoiceForm.control}
                name="periodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Inizio Periodo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-period-start" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={invoiceForm.control}
                name="periodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Fine Periodo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-period-end" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={invoiceForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (opzionale)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-invoice-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={createInvoiceMutation.isPending} data-testid="button-confirm-invoice">
                  {createInvoiceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Genera
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
