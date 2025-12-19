import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SiaeCashier } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  FormDescription,
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Printer,
  Mail,
  Loader2,
  CheckCircle2,
  XCircle,
  Store,
} from "lucide-react";

interface PrinterAgent {
  id: string;
  name: string;
  status: string;
  lastSeen?: string;
}

const cashierFormSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  username: z.string().min(1, "Username obbligatorio"),
  password: z.string().optional(),
  defaultPrinterAgentId: z.string().optional(),
  isActive: z.boolean().default(true),
});

type CashierFormValues = z.infer<typeof cashierFormSchema>;

const createCashierFormSchema = cashierFormSchema.extend({
  password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
});

export default function CashierManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCashier, setEditingCashier] = useState<SiaeCashier | null>(null);
  const [cashierToDelete, setCashierToDelete] = useState<SiaeCashier | null>(null);

  const isGestore = user?.role === "gestore" || user?.role === "super_admin";

  const { data: cashiers, isLoading: cashiersLoading } = useQuery<SiaeCashier[]>({
    queryKey: ["/api/cashiers"],
    enabled: !!user?.companyId && isGestore,
  });

  const { data: printerAgents } = useQuery<PrinterAgent[]>({
    queryKey: ["/api/printers/agents"],
    enabled: !!user?.companyId && isGestore,
  });

  const form = useForm<CashierFormValues>({
    resolver: zodResolver(editingCashier ? cashierFormSchema : createCashierFormSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      defaultPrinterAgentId: "none",
      isActive: true,
    },
  });

  const createCashierMutation = useMutation({
    mutationFn: async (data: CashierFormValues) => {
      const response = await apiRequest("POST", "/api/cashiers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashiers"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Cassiere Creato",
        description: "Il nuovo cassiere è stato creato con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione del cassiere",
        variant: "destructive",
      });
    },
  });

  const updateCashierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CashierFormValues> }) => {
      const response = await apiRequest("PATCH", `/api/cashiers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashiers"] });
      setIsDialogOpen(false);
      setEditingCashier(null);
      form.reset();
      toast({
        title: "Cassiere Aggiornato",
        description: "Le informazioni del cassiere sono state aggiornate.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento del cassiere",
        variant: "destructive",
      });
    },
  });

  const deleteCashierMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/cashiers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashiers"] });
      setIsDeleteDialogOpen(false);
      setCashierToDelete(null);
      toast({
        title: "Cassiere Disattivato",
        description: "Il cassiere è stato disattivato con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la disattivazione del cassiere",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (cashier?: SiaeCashier) => {
    if (cashier) {
      setEditingCashier(cashier);
      form.reset({
        name: cashier.name || "",
        username: cashier.username || "",
        password: "",
        defaultPrinterAgentId: cashier.defaultPrinterAgentId || "none",
        isActive: cashier.isActive,
      });
    } else {
      setEditingCashier(null);
      form.reset({
        name: "",
        username: "",
        password: "",
        defaultPrinterAgentId: "none",
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (values: CashierFormValues) => {
    const processedValues = {
      ...values,
      defaultPrinterAgentId: values.defaultPrinterAgentId === "none" ? null : values.defaultPrinterAgentId,
    };
    
    if (editingCashier) {
      const updateData: Partial<CashierFormValues> = { ...processedValues };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateCashierMutation.mutate({ id: editingCashier.id, data: updateData });
    } else {
      createCashierMutation.mutate(processedValues);
    }
  };

  const handleDeleteConfirm = () => {
    if (cashierToDelete) {
      deleteCashierMutation.mutate(cashierToDelete.id);
    }
  };

  const getPrinterName = (agentId: string | null) => {
    if (!agentId) return "Non assegnata";
    const agent = printerAgents?.find(a => a.id === agentId);
    return agent?.name || "Sconosciuta";
  };

  if (!isGestore) {
    return (
      <div className="p-6">
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold">Accesso Negato</h3>
            <p className="text-muted-foreground mt-2">
              Non hai i permessi per accedere a questa pagina.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-8" data-testid="page-cashier-management">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3" data-testid="page-title">
            <Store className="w-6 h-6 sm:w-8 sm:h-8 text-[#FFD700] flex-shrink-0" />
            Gestione Cassieri
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gestisci i cassieri della tua azienda
          </p>
        </div>

        <Button onClick={() => handleOpenDialog()} data-testid="button-add-cashier">
          <UserPlus className="w-4 h-4 mr-2" />
          Nuovo Cassiere
        </Button>
      </div>

      <Card className="glass-card" data-testid="card-cashiers-list">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Cassieri
          </CardTitle>
          <CardDescription>
            {cashiers?.length || 0} cassieri registrati
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cashiersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : !cashiers || cashiers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Nessun Cassiere</h3>
              <p className="text-muted-foreground mt-2">
                Non hai ancora creato nessun cassiere.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => handleOpenDialog()}
                data-testid="button-add-cashier-empty"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Aggiungi il primo cassiere
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Username</TableHead>
                    <TableHead className="hidden md:table-cell">Stampante</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashiers.map((cashier) => (
                    <TableRow key={cashier.id} data-testid={`row-cashier-${cashier.id}`}>
                      <TableCell className="font-medium">
                        <div>
                          {cashier.name}
                          <div className="sm:hidden text-xs text-muted-foreground">{cashier.username}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {cashier.username}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Printer className="w-4 h-4 text-muted-foreground" />
                          {getPrinterName(cashier.defaultPrinterAgentId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cashier.isActive ? (
                          <Badge variant="default" className="bg-emerald-500/20 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Attivo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                            <XCircle className="w-3 h-3 mr-1" />
                            Disattivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(cashier)}
                            data-testid={`button-edit-cashier-${cashier.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCashierToDelete(cashier);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            data-testid={`button-delete-cashier-${cashier.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-cashier-form">
          <DialogHeader>
            <DialogTitle>
              {editingCashier ? "Modifica Cassiere" : "Nuovo Cassiere"}
            </DialogTitle>
            <DialogDescription>
              {editingCashier
                ? "Modifica le informazioni del cassiere"
                : "Inserisci i dati per creare un nuovo cassiere"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Mario Rossi" 
                        {...field} 
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="cassiere1" 
                        {...field} 
                        disabled={!!editingCashier}
                        data-testid="input-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Password {editingCashier && "(lascia vuoto per non modificare)"}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={editingCashier ? "••••••••" : "Minimo 6 caratteri"} 
                        {...field} 
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultPrinterAgentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stampante Predefinita</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-printer">
                          <SelectValue placeholder="Seleziona stampante..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nessuna stampante</SelectItem>
                        {printerAgents?.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            <div className="flex items-center gap-2">
                              <Printer className="w-4 h-4" />
                              {agent.name}
                              {agent.status === "online" && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Stampante per l'emissione dei biglietti
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Attivo</FormLabel>
                      <FormDescription>
                        Il cassiere può accedere al sistema
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={createCashierMutation.isPending || updateCashierMutation.isPending}
                  data-testid="button-save"
                >
                  {(createCashierMutation.isPending || updateCashierMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingCashier ? "Salva Modifiche" : "Crea Cassiere"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Disattivare questo cassiere?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per disattivare il cassiere{" "}
              <strong>{cashierToDelete?.name}</strong>.
              Il cassiere non potrà più accedere al sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-delete"
            >
              {deleteCashierMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Disattiva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
