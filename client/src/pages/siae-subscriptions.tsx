import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { type SiaeSubscription, type SiaeCustomer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  CreditCard,
  Plus,
  Calendar,
  Euro,
  CheckCircle2,
  Clock,
  Eye,
  Search,
  Loader2,
  ChevronRight,
  X,
  ArrowLeft,
} from "lucide-react";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const subscriptionFormSchema = z.object({
  customerId: z.string().min(1, "Seleziona un cliente"),
  turnType: z.enum(["F", "L"]),
  eventsCount: z.coerce.number().min(1),
  validFrom: z.string().min(1, "Data inizio richiesta"),
  validTo: z.string().min(1, "Data fine richiesta"),
  totalAmount: z.coerce.number().min(0),
  holderFirstName: z.string().min(1, "Nome richiesto"),
  holderLastName: z.string().min(1, "Cognome richiesto"),
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

export default function SiaeSubscriptionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedSubscription, setSelectedSubscription] = useState<SiaeSubscription | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const companyId = user?.companyId;
  const isSuperAdmin = user?.role === 'super_admin';

  // Admin subscriptions with company details
  interface AdminSubscription extends SiaeSubscription {
    companyName: string | null;
    customerFirstName: string | null;
    customerLastName: string | null;
  }

  const { data: adminSubscriptions, isLoading: isLoadingAdmin } = useQuery<AdminSubscription[]>({
    queryKey: ['/api/siae/admin/subscriptions'],
    enabled: isSuperAdmin || !!companyId,
  });

  const { data: subscriptions, isLoading, refetch } = useQuery<SiaeSubscription[]>({
    queryKey: ['/api/siae/companies', companyId, 'subscriptions'],
    enabled: !!companyId && !isSuperAdmin,
  });

  // Use admin subscriptions when available
  const currentSubscriptions = isSuperAdmin ? adminSubscriptions : (adminSubscriptions || subscriptions);
  const currentLoading = isSuperAdmin ? isLoadingAdmin : (isLoadingAdmin || isLoading);

  const { data: customers } = useQuery<SiaeCustomer[]>({
    queryKey: ['/api/siae/customers'],
    enabled: !!companyId,
  });

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      customerId: "",
      turnType: "F",
      eventsCount: 10,
      validFrom: "",
      validTo: "",
      totalAmount: 0,
      holderFirstName: "",
      holderLastName: "",
    },
  });

  useEffect(() => {
    if (!isCreateSheetOpen) {
      form.reset();
    }
  }, [isCreateSheetOpen, form]);

  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: SubscriptionFormData) => {
      const response = await apiRequest("POST", `/api/siae/subscriptions`, {
        ...data,
        companyId,
        validFrom: new Date(data.validFrom).toISOString(),
        validTo: new Date(data.validTo).toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('subscriptions') || false });
      setIsCreateSheetOpen(false);
      triggerHaptic('success');
      toast({
        title: "Abbonamento Creato",
        description: "L'abbonamento è stato creato con successo.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 min-h-[28px] px-3">Attivo</Badge>;
      case "expired":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 min-h-[28px] px-3">Scaduto</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 min-h-[28px] px-3">Annullato</Badge>;
      default:
        return <Badge variant="secondary" className="min-h-[28px] px-3">{status}</Badge>;
    }
  };

  const filteredSubscriptions = currentSubscriptions?.filter((sub) => {
    const matchesSearch =
      searchQuery === "" ||
      sub.subscriptionCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.holderFirstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.holderLastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ('companyName' in sub && sub.companyName?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: currentSubscriptions?.length || 0,
    active: currentSubscriptions?.filter(s => s.status === "active").length || 0,
    expired: currentSubscriptions?.filter(s => s.status === "expired").length || 0,
    totalEvents: currentSubscriptions?.reduce((sum, s) => sum + (s.eventsCount || 0), 0) || 0,
    totalValue: currentSubscriptions?.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0) || 0,
  };

  const onSubmit = (data: SubscriptionFormData) => {
    createSubscriptionMutation.mutate(data);
  };

  const handleCardPress = (subscription: SiaeSubscription) => {
    triggerHaptic('light');
    setSelectedSubscription(subscription);
    setIsDetailSheetOpen(true);
  };

  const StatusFilterPill = ({ value, label, count }: { value: string; label: string; count?: number }) => (
    <HapticButton
      variant={statusFilter === value ? "default" : "outline"}
      className={`rounded-full min-h-[44px] px-4 ${statusFilter === value ? "bg-[#FFD700] text-black" : ""}`}
      onClick={() => setStatusFilter(value)}
      hapticType="light"
      data-testid={`filter-${value}`}
    >
      {label}
      {count !== undefined && <span className="ml-1.5 opacity-70">({count})</span>}
    </HapticButton>
  );

  const header = (
    <MobileHeader
      title="Abbonamenti SIAE"
      showBackButton
      showUserMenu
      rightAction={
        <HapticButton
          size="icon"
          variant="ghost"
          onClick={() => setIsCreateSheetOpen(true)}
          className="min-h-[44px] min-w-[44px]"
          hapticType="medium"
          data-testid="button-create"
        >
          <Plus className="w-5 h-5" />
        </HapticButton>
      }
    />
  );

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-subscriptions">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Abbonamenti SIAE</h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? "Visualizzazione abbonamenti di tutti i gestori" : "Gestione abbonamenti clienti"}
            </p>
            {isSuperAdmin && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mt-2">
                Modalità Amministratore
              </Badge>
            )}
          </div>
          {!isSuperAdmin && (
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Abbonamento
            </Button>
          )}
        </div>

        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Totale</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-500">{stats.active}</div>
              <p className="text-sm text-muted-foreground">Attivi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-500">{stats.expired}</div>
              <p className="text-sm text-muted-foreground">Scaduti</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-sm text-muted-foreground">Eventi Totali</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-[#FFD700]">€{stats.totalValue.toFixed(0)}</div>
              <p className="text-sm text-muted-foreground">Valore Totale</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Elenco Abbonamenti</CardTitle>
                <CardDescription>Gestisci tutti gli abbonamenti registrati</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Cerca..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="filter-status">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="active">Attivi</SelectItem>
                    <SelectItem value="expired">Scaduti</SelectItem>
                    <SelectItem value="cancelled">Annullati</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {currentLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredSubscriptions?.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nessun Abbonamento</h3>
                <p className="text-muted-foreground mb-4">Non ci sono abbonamenti registrati</p>
                {!isSuperAdmin && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crea Abbonamento
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice</TableHead>
                    {isSuperAdmin && <TableHead>Azienda</TableHead>}
                    <TableHead>Intestatario</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Eventi</TableHead>
                    <TableHead>Validità</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-[100px]">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions?.map((subscription) => (
                    <TableRow key={subscription.id} data-testid={`row-subscription-${subscription.id}`}>
                      <TableCell className="font-mono">{subscription.subscriptionCode}</TableCell>
                      {isSuperAdmin && (
                        <TableCell className="font-medium">
                          {'companyName' in subscription ? subscription.companyName : '-'}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        {subscription.holderFirstName} {subscription.holderLastName}
                      </TableCell>
                      <TableCell>{subscription.turnType === "F" ? "Fisso" : "Libero"}</TableCell>
                      <TableCell>{subscription.eventsUsed}/{subscription.eventsCount}</TableCell>
                      <TableCell>
                        {subscription.validFrom && format(new Date(subscription.validFrom), "dd/MM/yy", { locale: it })} - {subscription.validTo && format(new Date(subscription.validTo), "dd/MM/yy", { locale: it })}
                      </TableCell>
                      <TableCell className="text-[#FFD700] font-semibold">€{Number(subscription.totalAmount).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedSubscription(subscription);
                            setIsDetailDialogOpen(true);
                          }}
                          data-testid={`button-view-${subscription.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuovo Abbonamento</DialogTitle>
              <DialogDescription>Crea un nuovo abbonamento SIAE</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-customer">
                            <SelectValue placeholder="Seleziona cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.uniqueCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="holderFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="holderLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cognome</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="turnType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Turno</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-turn-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="F">Fisso</SelectItem>
                            <SelectItem value="L">Libero</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="eventsCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>N. Eventi</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-events-count" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="validFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Inizio</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-valid-from" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="validTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Fine</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-valid-to" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Importo Totale (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={createSubscriptionMutation.isPending} data-testid="button-submit">
                    {createSubscriptionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Crea Abbonamento
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Dettaglio Abbonamento</DialogTitle>
              <DialogDescription>Informazioni complete sull'abbonamento</DialogDescription>
            </DialogHeader>
            {selectedSubscription && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Codice</span>
                  <span className="font-mono font-medium">{selectedSubscription.subscriptionCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Intestatario</span>
                  <span className="font-medium">{selectedSubscription.holderFirstName} {selectedSubscription.holderLastName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tipo Turno</span>
                  <span>{selectedSubscription.turnType === "F" ? "Fisso" : "Libero"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Eventi</span>
                  <span>{selectedSubscription.eventsUsed}/{selectedSubscription.eventsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Validità</span>
                  <span>
                    {selectedSubscription.validFrom && format(new Date(selectedSubscription.validFrom), "dd/MM/yyyy", { locale: it })} - {selectedSubscription.validTo && format(new Date(selectedSubscription.validTo), "dd/MM/yyyy", { locale: it })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Importo</span>
                  <span className="text-[#FFD700] font-semibold">€{Number(selectedSubscription.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stato</span>
                  {getStatusBadge(selectedSubscription.status)}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Chiudi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={header}
      className="bg-background"
      data-testid="page-siae-subscriptions"
    >
      <div className="space-y-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="grid grid-cols-2 gap-3 pt-4"
        >
          <motion.div
            whileTap={{ scale: 0.98 }}
            transition={springTransition}
          >
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Attivi
                </div>
                <div className="text-3xl font-bold text-emerald-400" data-testid="stat-active">{stats.active}</div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            whileTap={{ scale: 0.98 }}
            transition={springTransition}
          >
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Euro className="w-3 h-3" /> Valore Totale
                </div>
                <div className="text-3xl font-bold text-[#FFD700]" data-testid="stat-value">€{stats.totalValue.toFixed(0)}</div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          <Card className="glass-card">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Totale</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-gray-400" data-testid="stat-expired">{stats.expired}</div>
              <div className="text-xs text-muted-foreground">Scaduti</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold" data-testid="stat-events">{stats.totalEvents}</div>
              <div className="text-xs text-muted-foreground">Eventi</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.15 }}
          className="space-y-3"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Cerca abbonamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-card border-border/50"
              data-testid="input-search"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            <StatusFilterPill value="all" label="Tutti" count={stats.total} />
            <StatusFilterPill value="active" label="Attivi" count={stats.active} />
            <StatusFilterPill value="expired" label="Scaduti" count={stats.expired} />
            <StatusFilterPill value="cancelled" label="Annullati" />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: i * 0.1 }}
              >
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-32 mb-3" />
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : filteredSubscriptions?.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
          >
            <Card className="glass-card" data-testid="card-empty-state">
              <CardContent className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...springTransition, delay: 0.1 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center"
                >
                  <CreditCard className="w-10 h-10 text-muted-foreground" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">Nessun Abbonamento</h3>
                <p className="text-muted-foreground mb-6">
                  Non ci sono abbonamenti registrati
                </p>
                <HapticButton
                  onClick={() => setIsCreateSheetOpen(true)}
                  className="min-h-[48px] px-6 bg-[#FFD700] text-black"
                  hapticType="medium"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Crea Primo Abbonamento
                </HapticButton>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredSubscriptions?.map((subscription, index) => (
                <motion.div
                  key={subscription.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ ...springTransition, delay: index * 0.05 }}
                  layout
                >
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    transition={springTransition}
                  >
                    <Card
                      className="glass-card overflow-hidden cursor-pointer active:bg-muted/50"
                      onClick={() => handleCardPress(subscription)}
                      data-testid={`card-subscription-${subscription.id}`}
                    >
                      <CardContent className="p-0">
                        <div className="p-4 flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-7 h-7 text-[#FFD700]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-lg truncate">
                                {subscription.holderFirstName} {subscription.holderLastName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                              <span className="font-mono">{subscription.subscriptionCode}</span>
                              <span className="text-muted-foreground/50">•</span>
                              <span>{subscription.turnType === "F" ? "Fisso" : "Libero"}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(subscription.status)}
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="px-4 pb-4 pt-0 flex items-center justify-between border-t border-border/30 mt-0 pt-3">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {subscription.eventsUsed}/{subscription.eventsCount} eventi
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {subscription.validTo && format(new Date(subscription.validTo), "dd/MM/yy", { locale: it })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[#FFD700] font-semibold">
                            <Euro className="w-4 h-4" />
                            <span>{Number(subscription.totalAmount).toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <BottomSheet
        open={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        title="Nuovo Abbonamento"
      >
        <div className="p-4 pb-8" data-testid="sheet-create">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12" data-testid="select-customer">
                          <SelectValue placeholder="Seleziona cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.uniqueCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="holderFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12" data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="holderLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cognome</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-12" data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="turnType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Turno</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12" data-testid="select-turn-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="F">Fisso</SelectItem>
                          <SelectItem value="L">Libero</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eventsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>N. Eventi</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-12" data-testid="input-events-count" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Inizio</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-12" data-testid="input-valid-from" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="validTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Fine</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-12" data-testid="input-valid-to" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importo Totale (€)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} className="h-12" data-testid="input-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3 pt-4">
                <HapticButton
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateSheetOpen(false)}
                  className="flex-1 min-h-[48px]"
                  hapticType="light"
                >
                  Annulla
                </HapticButton>
                <HapticButton
                  type="submit"
                  disabled={createSubscriptionMutation.isPending}
                  className="flex-1 min-h-[48px] bg-[#FFD700] text-black"
                  hapticType="medium"
                  data-testid="button-submit"
                >
                  {createSubscriptionMutation.isPending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                  Crea
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isDetailSheetOpen}
        onClose={() => setIsDetailSheetOpen(false)}
        title="Dettaglio Abbonamento"
      >
        {selectedSubscription && (
          <div className="p-4 pb-8 space-y-4" data-testid="sheet-detail">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
              className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-[#FFD700]/10 to-transparent border border-[#FFD700]/20"
            >
              <div className="w-16 h-16 rounded-xl bg-[#FFD700]/20 flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-[#FFD700]" />
              </div>
              <div className="flex-1">
                <div className="text-xl font-bold">
                  {selectedSubscription.holderFirstName} {selectedSubscription.holderLastName}
                </div>
                <div className="text-sm text-muted-foreground font-mono">
                  {selectedSubscription.subscriptionCode}
                </div>
              </div>
              {getStatusBadge(selectedSubscription.status)}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.1 }}
              className="grid grid-cols-2 gap-3"
            >
              <Card className="glass-card">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-[#FFD700]">
                    €{Number(selectedSubscription.totalAmount).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Importo</div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">
                    {selectedSubscription.eventsUsed}/{selectedSubscription.eventsCount}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Eventi Usati</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.15 }}
              className="space-y-1"
            >
              <Card className="glass-card">
                <CardContent className="p-0 divide-y divide-border/50">
                  <div className="flex justify-between items-center p-4 min-h-[52px]">
                    <span className="text-muted-foreground">Tipo Turno</span>
                    <span className="font-medium">{selectedSubscription.turnType === "F" ? "Fisso" : "Libero"}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 min-h-[52px]">
                    <span className="text-muted-foreground">Data Inizio</span>
                    <span className="font-medium">
                      {selectedSubscription.validFrom && format(new Date(selectedSubscription.validFrom), "dd MMMM yyyy", { locale: it })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 min-h-[52px]">
                    <span className="text-muted-foreground">Data Fine</span>
                    <span className="font-medium">
                      {selectedSubscription.validTo && format(new Date(selectedSubscription.validTo), "dd MMMM yyyy", { locale: it })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 min-h-[52px]">
                    <span className="text-muted-foreground">Creato il</span>
                    <span className="font-medium">
                      {selectedSubscription.createdAt && format(new Date(selectedSubscription.createdAt), "dd/MM/yyyy HH:mm", { locale: it })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.2 }}
            >
              <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(selectedSubscription.eventsUsed / selectedSubscription.eventsCount) * 100}%` }}
                  transition={{ ...springTransition, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-[#FFD700] to-emerald-500 rounded-full"
                />
              </div>
              <div className="text-center text-xs text-muted-foreground mt-2">
                {selectedSubscription.eventsCount - selectedSubscription.eventsUsed} eventi rimanenti
              </div>
            </motion.div>
          </div>
        )}
      </BottomSheet>
    </MobileAppLayout>
  );
}
