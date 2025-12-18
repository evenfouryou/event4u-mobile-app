import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { type SiaeSubscription, type SiaeCustomer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  CreditCard,
  Plus,
  Calendar,
  Euro,
  User,
  Hash,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  Loader2,
} from "lucide-react";

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
  const [selectedSubscription, setSelectedSubscription] = useState<SiaeSubscription | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const companyId = user?.companyId;

  const { data: subscriptions, isLoading } = useQuery<SiaeSubscription[]>({
    queryKey: ['/api/siae/companies', companyId, 'subscriptions'],
    enabled: !!companyId,
  });

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
    if (!isCreateDialogOpen) {
      form.reset();
    }
  }, [isCreateDialogOpen, form]);

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
      setIsCreateDialogOpen(false);
      toast({
        title: "Abbonamento Creato",
        description: "L'abbonamento è stato creato con successo.",
      });
    },
    onError: (error: Error) => {
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
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Attivo</Badge>;
      case "expired":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Scaduto</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Annullato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredSubscriptions = subscriptions?.filter((sub) => {
    const matchesSearch =
      searchQuery === "" ||
      sub.subscriptionCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.holderFirstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.holderLastName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: subscriptions?.length || 0,
    active: subscriptions?.filter(s => s.status === "active").length || 0,
    expired: subscriptions?.filter(s => s.status === "expired").length || 0,
    totalEvents: subscriptions?.reduce((sum, s) => sum + (s.eventsCount || 0), 0) || 0,
    totalValue: subscriptions?.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0) || 0,
  };

  const onSubmit = (data: SubscriptionFormData) => {
    createSubscriptionMutation.mutate(data);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-siae-subscriptions">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3" data-testid="page-title">
            <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-[#FFD700] flex-shrink-0" />
            Abbonamenti SIAE
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestisci le tessere abbonamento per i tuoi eventi
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create">
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Abbonamento
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-muted-foreground mb-1">Totale</div>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Attivi
            </div>
            <div className="text-2xl font-bold text-emerald-400" data-testid="stat-active">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Scaduti
            </div>
            <div className="text-2xl font-bold text-gray-400" data-testid="stat-expired">{stats.expired}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Eventi Totali
            </div>
            <div className="text-2xl font-bold" data-testid="stat-events">{stats.totalEvents}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Euro className="w-3 h-3" /> Valore
            </div>
            <div className="text-2xl font-bold text-[#FFD700]" data-testid="stat-value">€{stats.totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Cerca per codice o intestatario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="active">Attivi</SelectItem>
                  <SelectItem value="expired">Scaduti</SelectItem>
                  <SelectItem value="cancelled">Annullati</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="glass-card">
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredSubscriptions?.length === 0 ? (
        <Card className="glass-card" data-testid="card-empty-state">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessun Abbonamento</h3>
            <p className="text-muted-foreground mb-4">
              Non ci sono abbonamenti registrati
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crea Primo Abbonamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card" data-testid="card-subscriptions-table">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Codice</TableHead>
                    <TableHead>Intestatario</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Eventi</TableHead>
                    <TableHead>Validità</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions?.map((subscription) => (
                    <TableRow key={subscription.id} data-testid={`row-subscription-${subscription.id}`}>
                      <TableCell className="font-mono" data-testid={`cell-code-${subscription.id}`}>
                        {subscription.subscriptionCode}
                      </TableCell>
                      <TableCell data-testid={`cell-holder-${subscription.id}`}>
                        {subscription.holderFirstName} {subscription.holderLastName}
                      </TableCell>
                      <TableCell data-testid={`cell-type-${subscription.id}`}>
                        {subscription.turnType === "F" ? "Fisso" : "Libero"}
                      </TableCell>
                      <TableCell data-testid={`cell-events-${subscription.id}`}>
                        <span className="flex items-center gap-1">
                          {subscription.eventsUsed}/{subscription.eventsCount}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-validity-${subscription.id}`}>
                        <div className="text-sm">
                          {subscription.validFrom && format(new Date(subscription.validFrom), "dd/MM/yy", { locale: it })}
                          {" - "}
                          {subscription.validTo && format(new Date(subscription.validTo), "dd/MM/yy", { locale: it })}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`cell-amount-${subscription.id}`}>
                        <span className="flex items-center gap-1 text-[#FFD700]">
                          <Euro className="w-3 h-3" />
                          {Number(subscription.totalAmount).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-status-${subscription.id}`}>
                        {getStatusBadge(subscription.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
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
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-create">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#FFD700]" />
              Nuovo Abbonamento
            </DialogTitle>
            <DialogDescription>
              Crea un nuovo abbonamento SIAE
            </DialogDescription>
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
                      <FormLabel>Nome Intestatario</FormLabel>
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
                      <FormLabel>Cognome Intestatario</FormLabel>
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
                      <FormLabel>Numero Eventi</FormLabel>
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
        <DialogContent className="max-w-lg" data-testid="dialog-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#FFD700]" />
              Dettaglio Abbonamento
            </DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Stato</div>
                  {getStatusBadge(selectedSubscription.status)}
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Importo</div>
                  <div className="text-xl font-bold text-[#FFD700]">€{Number(selectedSubscription.totalAmount).toFixed(2)}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Codice</span>
                  <span className="font-mono">{selectedSubscription.subscriptionCode}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Intestatario</span>
                  <span>{selectedSubscription.holderFirstName} {selectedSubscription.holderLastName}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Tipo Turno</span>
                  <span>{selectedSubscription.turnType === "F" ? "Fisso" : "Libero"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Eventi Usati</span>
                  <span>{selectedSubscription.eventsUsed} / {selectedSubscription.eventsCount}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Validità</span>
                  <span>
                    {selectedSubscription.validFrom && format(new Date(selectedSubscription.validFrom), "dd/MM/yyyy", { locale: it })}
                    {" - "}
                    {selectedSubscription.validTo && format(new Date(selectedSubscription.validTo), "dd/MM/yyyy", { locale: it })}
                  </span>
                </div>
                {selectedSubscription.rateoPerEvent && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Rateo per Evento</span>
                    <span>€{Number(selectedSubscription.rateoPerEvent).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
