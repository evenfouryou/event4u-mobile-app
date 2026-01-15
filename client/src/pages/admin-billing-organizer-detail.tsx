import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";
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
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
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
  feePayer: z.enum(["customer", "organizer"]), // Who pays: 'customer' adds to cart, 'organizer' deducts from payout
});

const invoiceFormSchema = z.object({
  periodStart: z.string().min(1, "Data inizio richiesta"),
  periodEnd: z.string().min(1, "Data fine richiesta"),
  notes: z.string().optional(),
});

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

const tabItems = [
  { id: "subscription", icon: CreditCard, label: "Abbonamento" },
  { id: "commissions", icon: Percent, label: "Commissioni" },
  { id: "wallet", icon: Wallet, label: "Wallet" },
  { id: "invoices", icon: Receipt, label: "Fatture" },
];

export default function AdminBillingOrganizerDetail() {
  const { companyId } = useParams<{ companyId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("subscription");
  const [isSubscriptionSheetOpen, setIsSubscriptionSheetOpen] = useState(false);
  const [isInvoiceSheetOpen, setIsInvoiceSheetOpen] = useState(false);
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
      feePayer: "organizer" as const,
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
      triggerHaptic("success");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/organizers", companyId] });
      setIsSubscriptionSheetOpen(false);
      toast({ title: "Abbonamento Creato", description: "L'abbonamento è stato assegnato con successo." });
    },
    onError: (error: any) => {
      triggerHaptic("error");
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateCommissionsMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof commissionFormSchema>) => {
      return apiRequest("PUT", `/api/admin/billing/organizers/${companyId}/commissions`, formData);
    },
    onSuccess: () => {
      triggerHaptic("success");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/organizers", companyId] });
      toast({ title: "Commissioni Aggiornate", description: "Il profilo commissioni è stato salvato." });
    },
    onError: (error: any) => {
      triggerHaptic("error");
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
      triggerHaptic("success");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/organizers", companyId] });
      toast({ title: "Soglia Aggiornata", description: "La soglia fatturazione è stata aggiornata." });
    },
    onError: (error: any) => {
      triggerHaptic("error");
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof invoiceFormSchema>) => {
      return apiRequest("POST", `/api/admin/billing/organizers/${companyId}/invoices`, formData);
    },
    onSuccess: () => {
      triggerHaptic("success");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/organizers", companyId] });
      setIsInvoiceSheetOpen(false);
      invoiceForm.reset();
      toast({ title: "Fattura Creata", description: "La fattura è stata generata con successo." });
    },
    onError: (error: any) => {
      triggerHaptic("error");
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return apiRequest("PUT", `/api/admin/billing/invoices/${invoiceId}/mark-paid`);
    },
    onSuccess: () => {
      triggerHaptic("success");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/organizers", companyId] });
      toast({ title: "Fattura Pagata", description: "La fattura è stata segnata come pagata." });
    },
    onError: (error: any) => {
      triggerHaptic("error");
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

  const handleBack = () => {
    triggerHaptic("light");
    navigate("/admin/billing/organizers");
  };

  if (isLoading) {
    if (!isMobile) {
      return (
        <div className="container mx-auto p-6 space-y-6" data-testid="page-admin-billing-organizer-detail">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Caricamento..."
            leftAction={
              <HapticButton variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="w-5 h-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="py-4 space-y-4 pb-24" data-testid="page-admin-billing-organizer-detail">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </MobileAppLayout>
    );
  }

  if (!data) {
    if (!isMobile) {
      return (
        <div className="container mx-auto p-6" data-testid="page-admin-billing-organizer-detail">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Organizzatore non trovato</h1>
          </div>
          <p className="text-muted-foreground">L'organizzatore richiesto non esiste o non è accessibile.</p>
        </div>
      );
    }
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Non trovato"
            leftAction={
              <HapticButton variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="w-5 h-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="flex items-center justify-center h-full pb-24" data-testid="page-admin-billing-organizer-detail">
          <p className="text-muted-foreground">Organizzatore non trovato</p>
        </div>
      </MobileAppLayout>
    );
  }

  const { company, subscription, plan, wallet, commissionProfile, invoices, recentLedgerEntries } = data;
  const balance = parseFloat(wallet.balance);

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-admin-billing-organizer-detail">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{company.name}</h1>
                <p className="text-muted-foreground text-sm">Gestione billing organizzatore</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {tabItems.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2" data-testid={`tab-${tab.id}`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="subscription" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Abbonamento</CardTitle>
                  <CardDescription>Stato attuale dell'abbonamento</CardDescription>
                </div>
                <Button onClick={() => setIsSubscriptionDialogOpen(true)} data-testid="button-assign-plan">
                  <Plus className="w-4 h-4 mr-2" />
                  {subscription ? "Cambia Piano" : "Assegna Piano"}
                </Button>
              </CardHeader>
              <CardContent>
                {subscription && plan ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Piano</p>
                      <p className="font-semibold">{plan.name}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Tipo Fatturazione</p>
                      <Badge variant={subscription.billingCycle === "monthly" ? "default" : "secondary"}>
                        {subscription.billingCycle === "monthly" ? "Mensile" : "Per Evento"}
                      </Badge>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Stato</p>
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
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Data Inizio</p>
                      <p className="font-semibold">{formatDate(subscription.startDate)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 col-span-2 lg:col-span-4">
                      <p className="text-sm text-muted-foreground mb-1">Prezzo</p>
                      <p className="text-3xl font-bold text-primary">{formatCurrency(plan.price)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Nessun abbonamento attivo</p>
                    <p className="text-sm text-muted-foreground/70">Assegna un piano per iniziare</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profilo Commissioni</CardTitle>
                <CardDescription>Configura le commissioni per ogni canale di vendita</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...commissionForm}>
                  <form
                    onSubmit={commissionForm.handleSubmit((data) => updateCommissionsMutation.mutate(data))}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="p-4 rounded-lg border space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <CreditCard className="w-4 h-4 text-blue-500" />
                          </div>
                          Vendite Online
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                  <Input type="number" step="0.01" {...field} data-testid="input-online-value" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-lg border space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <Receipt className="w-4 h-4 text-green-500" />
                          </div>
                          Biglietteria Fisica
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                  <Input type="number" step="0.01" {...field} data-testid="input-printed-value" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-lg border space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Percent className="w-4 h-4 text-purple-500" />
                          </div>
                          Vendite PR
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                  <Input type="number" step="0.01" {...field} data-testid="input-pr-value" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                          <Wallet className="w-4 h-4 text-amber-500" />
                        </div>
                        Chi paga le commissioni?
                      </h4>
                      <FormField
                        control={commissionForm.control}
                        name="feePayer"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-fee-payer">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="organizer">
                                  Gestore - Commissioni detratte dal bonifico
                                </SelectItem>
                                <SelectItem value="customer">
                                  Cliente - Commissioni aggiunte al carrello
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-2">
                              {field.value === "customer" 
                                ? "Le commissioni verranno aggiunte al totale del carrello del cliente"
                                : "Le commissioni verranno detratte dall'importo che verrà bonificato al gestore"}
                            </p>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={updateCommissionsMutation.isPending}
                      data-testid="button-save-commissions"
                    >
                      {updateCommissionsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Salva Commissioni
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardContent className="pt-6">
                  <div className={`p-6 rounded-lg ${balance < 0 ? "bg-destructive/10" : "bg-green-500/10"}`}>
                    <p className="text-sm text-muted-foreground mb-1">Saldo Wallet</p>
                    <p className={`text-4xl font-bold ${balance < 0 ? "text-destructive" : "text-green-500"}`}>
                      {formatCurrency(balance)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {balance < 0 ? "Debito accumulato" : "Credito disponibile"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Soglia Fatturazione</CardTitle>
                  <CardDescription>Importo minimo per fattura automatica</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={wallet.thresholdAmount}
                      value={thresholdValue}
                      onChange={(e) => setThresholdValue(e.target.value)}
                      className="flex-1"
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
              </CardHeader>
              <CardContent>
                {recentLedgerEntries?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrizione</TableHead>
                        <TableHead className="text-right">Importo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLedgerEntries.map((entry) => (
                        <TableRow key={entry.id} data-testid={`row-ledger-${entry.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                entry.direction === "debit" ? "bg-destructive/20" : "bg-green-500/20"
                              }`}>
                                {entry.direction === "debit" ? (
                                  <ArrowDownRight className="w-4 h-4 text-destructive" />
                                ) : (
                                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                              {entry.type === "commission"
                                ? "Commissione"
                                : entry.type === "subscription"
                                ? "Abbonamento"
                                : entry.type === "invoice"
                                ? "Fattura"
                                : entry.type === "payment"
                                ? "Pagamento"
                                : "Rettifica"}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(entry.createdAt)}</TableCell>
                          <TableCell className="text-muted-foreground">{entry.note || "-"}</TableCell>
                          <TableCell className={`text-right font-semibold ${
                            entry.direction === "debit" ? "text-destructive" : "text-green-500"
                          }`}>
                            {entry.direction === "debit" ? "-" : "+"}
                            {formatCurrency(entry.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center">
                    <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Nessun movimento</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Fatture</CardTitle>
                  <CardDescription>Elenco fatture generate</CardDescription>
                </div>
                <Button onClick={() => setIsInvoiceDialogOpen(true)} data-testid="button-create-invoice">
                  <Plus className="w-4 h-4 mr-2" />
                  Genera Fattura
                </Button>
              </CardHeader>
              <CardContent>
                {invoices?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numero</TableHead>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Scadenza</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="text-right">Importo</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>
                            {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                          </TableCell>
                          <TableCell>{formatDate(invoice.dueDate)}</TableCell>
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
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(invoice.amount)}
                          </TableCell>
                          <TableCell>
                            {invoice.status === "issued" && (
                              <Button
                                variant="outline"
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
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center">
                    <Receipt className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Nessuna fattura</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assegna Piano</DialogTitle>
              <DialogDescription>Seleziona un piano e configura l'abbonamento</DialogDescription>
            </DialogHeader>
            <Form {...subscriptionForm}>
              <form
                onSubmit={subscriptionForm.handleSubmit((data) => {
                  createSubscriptionMutation.mutate(data, {
                    onSuccess: () => setIsSubscriptionDialogOpen(false),
                  });
                })}
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSubscriptionDialogOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSubscriptionMutation.isPending}
                    data-testid="button-confirm-subscription"
                  >
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
              <DialogDescription>Seleziona il periodo per la fattura</DialogDescription>
            </DialogHeader>
            <Form {...invoiceForm}>
              <form
                onSubmit={invoiceForm.handleSubmit((data) => {
                  createInvoiceMutation.mutate(data, {
                    onSuccess: () => {
                      setIsInvoiceDialogOpen(false);
                      invoiceForm.reset();
                    },
                  });
                })}
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsInvoiceDialogOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={createInvoiceMutation.isPending}
                    data-testid="button-confirm-invoice"
                  >
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

  // Mobile version
  return (
    <MobileAppLayout
      header={
        <MobileHeader
          leftAction={
            <HapticButton variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </HapticButton>
          }
        />
      }
    >
      <div className="py-4 space-y-4 pb-24" data-testid="page-admin-billing-organizer-detail">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springConfig}
          className="flex items-center gap-3"
        >
          <div className="h-14 w-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-yellow-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{company.name}</h1>
            <p className="text-muted-foreground text-sm">Gestione billing</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.05 }}
          className="flex gap-2 overflow-x-auto py-1 -mx-4 px-4"
        >
          {tabItems.map((tab) => (
            <HapticButton
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              className="flex-shrink-0 gap-2 rounded-full"
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </HapticButton>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === "subscription" && (
            <motion.div
              key="subscription"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springConfig}
              className="space-y-4"
            >
              <Card className="rounded-2xl">
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">Abbonamento</CardTitle>
                      <CardDescription className="text-sm">Stato attuale</CardDescription>
                    </div>
                    <HapticButton
                      onClick={() => setIsSubscriptionSheetOpen(true)}
                      data-testid="button-assign-plan"
                      className="rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {subscription ? "Cambia" : "Assegna"}
                    </HapticButton>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {subscription && plan ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ ...springConfig, delay: 0.1 }}
                          className="p-4 rounded-xl bg-muted/50"
                        >
                          <p className="text-xs text-muted-foreground mb-1">Piano</p>
                          <p className="font-semibold">{plan.name}</p>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ ...springConfig, delay: 0.15 }}
                          className="p-4 rounded-xl bg-muted/50"
                        >
                          <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                          <Badge variant={subscription.billingCycle === "monthly" ? "default" : "secondary"}>
                            {subscription.billingCycle === "monthly" ? "Mensile" : "Per Evento"}
                          </Badge>
                        </motion.div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ ...springConfig, delay: 0.2 }}
                          className="p-4 rounded-xl bg-muted/50"
                        >
                          <p className="text-xs text-muted-foreground mb-1">Stato</p>
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
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ ...springConfig, delay: 0.25 }}
                          className="p-4 rounded-xl bg-muted/50"
                        >
                          <p className="text-xs text-muted-foreground mb-1">Data Inizio</p>
                          <p className="font-semibold">{formatDate(subscription.startDate)}</p>
                        </motion.div>
                      </div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ ...springConfig, delay: 0.3 }}
                        className="p-4 rounded-xl bg-primary/10 border border-primary/20"
                      >
                        <p className="text-xs text-muted-foreground mb-1">Prezzo</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(plan.price)}</p>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">Nessun abbonamento attivo</p>
                      <p className="text-sm text-muted-foreground/70">Assegna un piano per iniziare</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "commissions" && (
            <motion.div
              key="commissions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springConfig}
            >
              <Card className="rounded-2xl">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Profilo Commissioni</CardTitle>
                  <CardDescription className="text-sm">Configura per canale</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Form {...commissionForm}>
                    <form
                      onSubmit={commissionForm.handleSubmit((data) => updateCommissionsMutation.mutate(data))}
                      className="space-y-4"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...springConfig, delay: 0.1 }}
                        className="p-4 rounded-xl border space-y-4"
                      >
                        <h4 className="font-medium flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <CreditCard className="w-4 h-4 text-blue-500" />
                          </div>
                          Vendite Online
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField
                            control={commissionForm.control}
                            name="channelOnlineType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Tipo</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12" data-testid="select-online-type">
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
                                <FormLabel className="text-xs">Valore</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-12"
                                    {...field}
                                    data-testid="input-online-value"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...springConfig, delay: 0.15 }}
                        className="p-4 rounded-xl border space-y-4"
                      >
                        <h4 className="font-medium flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <Receipt className="w-4 h-4 text-green-500" />
                          </div>
                          Biglietteria Fisica
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField
                            control={commissionForm.control}
                            name="channelPrintedType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Tipo</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12" data-testid="select-printed-type">
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
                                <FormLabel className="text-xs">Valore</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-12"
                                    {...field}
                                    data-testid="input-printed-value"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...springConfig, delay: 0.2 }}
                        className="p-4 rounded-xl border space-y-4"
                      >
                        <h4 className="font-medium flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Percent className="w-4 h-4 text-purple-500" />
                          </div>
                          Vendite PR
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField
                            control={commissionForm.control}
                            name="channelPrType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Tipo</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12" data-testid="select-pr-type">
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
                                <FormLabel className="text-xs">Valore</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-12"
                                    {...field}
                                    data-testid="input-pr-value"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </motion.div>

                      <HapticButton
                        type="submit"
                        className="w-full h-12 rounded-xl"
                        disabled={updateCommissionsMutation.isPending}
                        data-testid="button-save-commissions"
                        hapticType="medium"
                      >
                        {updateCommissionsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Salva Commissioni
                      </HapticButton>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "wallet" && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springConfig}
              className="space-y-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springConfig, delay: 0.1 }}
              >
                <Card className="rounded-2xl overflow-hidden">
                  <div className={`p-6 ${balance < 0 ? "bg-destructive/10" : "bg-green-500/10"}`}>
                    <p className="text-sm text-muted-foreground mb-1">Saldo Wallet</p>
                    <p className={`text-4xl font-bold ${balance < 0 ? "text-destructive" : "text-green-500"}`}>
                      {formatCurrency(balance)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {balance < 0 ? "Debito accumulato" : "Credito disponibile"}
                    </p>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springConfig, delay: 0.15 }}
              >
                <Card className="rounded-2xl">
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg">Soglia Fatturazione</CardTitle>
                    <CardDescription className="text-sm">Importo minimo per fattura automatica</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={wallet.thresholdAmount}
                        value={thresholdValue}
                        onChange={(e) => setThresholdValue(e.target.value)}
                        className="h-12 flex-1"
                        data-testid="input-threshold"
                      />
                      <HapticButton
                        onClick={() => updateThresholdMutation.mutate(thresholdValue || wallet.thresholdAmount)}
                        disabled={updateThresholdMutation.isPending}
                        className="h-12 px-6 rounded-xl"
                        data-testid="button-update-threshold"
                        hapticType="medium"
                      >
                        {updateThresholdMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Aggiorna
                      </HapticButton>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Attuale: {formatCurrency(wallet.thresholdAmount)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springConfig, delay: 0.2 }}
              >
                <Card className="rounded-2xl">
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg">Movimenti Recenti</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recentLedgerEntries?.length > 0 ? (
                      <div className="divide-y divide-border">
                        {recentLedgerEntries.map((entry, index) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ ...springConfig, delay: 0.05 * index }}
                            className="flex items-center gap-3 p-4"
                            data-testid={`row-ledger-${entry.id}`}
                          >
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              entry.direction === "debit" ? "bg-destructive/20" : "bg-green-500/20"
                            }`}>
                              {entry.direction === "debit" ? (
                                <ArrowDownRight className="w-5 h-5 text-destructive" />
                              ) : (
                                <ArrowUpRight className="w-5 h-5 text-green-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">
                                {entry.type === "commission"
                                  ? "Commissione"
                                  : entry.type === "subscription"
                                  ? "Abbonamento"
                                  : entry.type === "invoice"
                                  ? "Fattura"
                                  : entry.type === "payment"
                                  ? "Pagamento"
                                  : "Rettifica"}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
                            </div>
                            <p className={`font-semibold ${
                              entry.direction === "debit" ? "text-destructive" : "text-green-500"
                            }`}>
                              {entry.direction === "debit" ? "-" : "+"}
                              {formatCurrency(entry.amount)}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">Nessun movimento</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "invoices" && (
            <motion.div
              key="invoices"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springConfig}
            >
              <Card className="rounded-2xl">
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">Fatture</CardTitle>
                      <CardDescription className="text-sm">Elenco fatture</CardDescription>
                    </div>
                    <HapticButton
                      onClick={() => setIsInvoiceSheetOpen(true)}
                      data-testid="button-create-invoice"
                      className="rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Genera
                    </HapticButton>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {invoices?.length > 0 ? (
                    <div className="divide-y divide-border">
                      {invoices.map((invoice, index) => (
                        <motion.div
                          key={invoice.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ ...springConfig, delay: 0.05 * index }}
                          className="p-4"
                          data-testid={`row-invoice-${invoice.id}`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="font-semibold">{invoice.invoiceNumber}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                              </p>
                            </div>
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
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xl font-bold">{formatCurrency(invoice.amount)}</p>
                            {invoice.status === "issued" && (
                              <HapticButton
                                variant="outline"
                                size="sm"
                                onClick={() => markPaidMutation.mutate(invoice.id)}
                                disabled={markPaidMutation.isPending}
                                data-testid={`button-mark-paid-${invoice.id}`}
                                className="h-10 rounded-lg"
                              >
                                {markPaidMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Pagata
                                  </>
                                )}
                              </HapticButton>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Scadenza: {formatDate(invoice.dueDate)}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <Receipt className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">Nessuna fattura</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomSheet
        open={isSubscriptionSheetOpen}
        onClose={() => setIsSubscriptionSheetOpen(false)}
        title="Assegna Piano"
      >
        <div className="p-4">
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
                        <SelectTrigger className="h-12" data-testid="select-plan">
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
                        <SelectTrigger className="h-12" data-testid="select-billing-cycle">
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
                      <Input type="date" className="h-12" {...field} data-testid="input-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3 pt-4">
                <HapticButton
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => setIsSubscriptionSheetOpen(false)}
                >
                  Annulla
                </HapticButton>
                <HapticButton
                  type="submit"
                  className="flex-1 h-12 rounded-xl"
                  disabled={createSubscriptionMutation.isPending}
                  data-testid="button-confirm-subscription"
                  hapticType="medium"
                >
                  {createSubscriptionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Assegna
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isInvoiceSheetOpen}
        onClose={() => setIsInvoiceSheetOpen(false)}
        title="Genera Fattura"
      >
        <div className="p-4">
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
                      <Input type="date" className="h-12" {...field} data-testid="input-period-start" />
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
                      <Input type="date" className="h-12" {...field} data-testid="input-period-end" />
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
                      <Input className="h-12" {...field} data-testid="input-invoice-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3 pt-4">
                <HapticButton
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => setIsInvoiceSheetOpen(false)}
                >
                  Annulla
                </HapticButton>
                <HapticButton
                  type="submit"
                  className="flex-1 h-12 rounded-xl"
                  disabled={createInvoiceMutation.isPending}
                  data-testid="button-confirm-invoice"
                  hapticType="medium"
                >
                  {createInvoiceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Genera
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
