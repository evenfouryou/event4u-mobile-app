import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SiaeEventSector, SiaeCashierAllocation, SiaeCashier } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Ticket,
  Loader2,
  Plus,
  Store,
} from "lucide-react";

interface CashierAllocationWithDetails extends SiaeCashierAllocation {
  cashierName?: string;
  cashierUsername?: string;
  sectorName?: string;
  quotaRemaining?: number;
}

const allocationFormSchema = z.object({
  cashierId: z.string().min(1, "Seleziona un cassiere"),
  sectorId: z.string().min(1, "Seleziona un settore"),
  quotaQuantity: z.coerce.number().min(1, "La quota deve essere almeno 1"),
});

type AllocationFormValues = z.infer<typeof allocationFormSchema>;

interface EventCashierAllocationsProps {
  eventId: string;
  siaeEventId?: string;
}

export function EventCashierAllocations({ eventId, siaeEventId }: EventCashierAllocationsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<CashierAllocationWithDetails | null>(null);
  const [allocationToDelete, setAllocationToDelete] = useState<CashierAllocationWithDetails | null>(null);

  const targetEventId = siaeEventId || eventId;

  const { data: allocations, isLoading: allocationsLoading } = useQuery<CashierAllocationWithDetails[]>({
    queryKey: ["/api/events", targetEventId, "cashier-allocations"],
    enabled: !!targetEventId,
  });

  const { data: cashiers } = useQuery<SiaeCashier[]>({
    queryKey: ["/api/cashiers"],
    enabled: !!user?.companyId,
  });

  const { data: sectors } = useQuery<SiaeEventSector[]>({
    queryKey: ["/api/siae/ticketed-events", targetEventId, "sectors"],
    enabled: !!targetEventId,
  });

  const form = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: {
      cashierId: "",
      sectorId: "",
      quotaQuantity: 50,
    },
  });

  const createAllocationMutation = useMutation({
    mutationFn: async (data: AllocationFormValues) => {
      const response = await apiRequest("POST", `/api/events/${targetEventId}/cashier-allocations`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", targetEventId, "cashier-allocations"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Assegnazione Creata",
        description: "Il cassiere è stato assegnato all'evento.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'assegnazione",
        variant: "destructive",
      });
    },
  });

  const updateAllocationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AllocationFormValues> }) => {
      const response = await apiRequest("PATCH", `/api/cashier-allocations/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", targetEventId, "cashier-allocations"] });
      setIsDialogOpen(false);
      setEditingAllocation(null);
      form.reset();
      toast({
        title: "Assegnazione Aggiornata",
        description: "La quota è stata aggiornata.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento",
        variant: "destructive",
      });
    },
  });

  const deleteAllocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/cashier-allocations/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", targetEventId, "cashier-allocations"] });
      setIsDeleteDialogOpen(false);
      setAllocationToDelete(null);
      toast({
        title: "Assegnazione Rimossa",
        description: "L'assegnazione è stata rimossa.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la rimozione",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (allocation?: CashierAllocationWithDetails) => {
    if (allocation) {
      setEditingAllocation(allocation);
      form.reset({
        cashierId: allocation.cashierId,
        sectorId: allocation.sectorId || "",
        quotaQuantity: allocation.quotaQuantity,
      });
    } else {
      setEditingAllocation(null);
      form.reset({
        cashierId: "",
        sectorId: "",
        quotaQuantity: 50,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (values: AllocationFormValues) => {
    if (editingAllocation) {
      updateAllocationMutation.mutate({ 
        id: editingAllocation.id, 
        data: { quotaQuantity: values.quotaQuantity } 
      });
    } else {
      createAllocationMutation.mutate(values);
    }
  };

  const handleDeleteConfirm = () => {
    if (allocationToDelete) {
      deleteAllocationMutation.mutate(allocationToDelete.id);
    }
  };

  const getCashierName = (cashierId: string) => {
    const cashier = cashiers?.find(c => c.id === cashierId);
    return cashier ? cashier.name : "Sconosciuto";
  };

  const getSectorName = (sectorId: string) => {
    const sector = sectors?.find(s => s.id === sectorId);
    return sector?.name || "Settore Sconosciuto";
  };

  const getQuotaPercentage = (used: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  const activeCashiers = cashiers?.filter(c => c.isActive) || [];

  // Shared dialog components for both desktop and mobile
  const allocationDialog = (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-[450px]" data-testid="dialog-allocation-form">
        <DialogHeader>
          <DialogTitle>
            {editingAllocation ? "Modifica Assegnazione" : "Nuova Assegnazione"}
          </DialogTitle>
          <DialogDescription>
            {editingAllocation
              ? "Modifica la quota assegnata al cassiere"
              : "Assegna un cassiere a un settore con una quota biglietti"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {!editingAllocation && (
              <>
                <FormField
                  control={form.control}
                  name="cashierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cassiere</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-cashier">
                            <SelectValue placeholder="Seleziona cassiere..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeCashiers.map((cashier) => (
                            <SelectItem key={cashier.id} value={cashier.id}>
                              {cashier.name} ({cashier.username})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sectorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Settore</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-sector">
                            <SelectValue placeholder="Seleziona settore..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sectors?.map((sector) => (
                            <SelectItem key={sector.id} value={sector.id}>
                              {sector.name} - €{Number(sector.priceIntero || 0).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="quotaQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quota Biglietti</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1"
                      {...field}
                      data-testid="input-quota"
                    />
                  </FormControl>
                  <FormDescription>
                    Numero massimo di biglietti che il cassiere può emettere
                  </FormDescription>
                  <FormMessage />
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
                disabled={createAllocationMutation.isPending || updateAllocationMutation.isPending}
                data-testid="button-save"
              >
                {(createAllocationMutation.isPending || updateAllocationMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingAllocation ? "Salva" : "Assegna"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  const deleteAlertDialog = (
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent data-testid="dialog-delete-allocation">
        <AlertDialogHeader>
          <AlertDialogTitle>Rimuovere questa assegnazione?</AlertDialogTitle>
          <AlertDialogDescription>
            Stai per rimuovere l'assegnazione per{" "}
            <strong>
              {allocationToDelete?.cashierName || "questo cassiere"}
            </strong>.
            L'azione non può essere annullata.
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
            {deleteAllocationMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Rimuovi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto" data-testid="page-cashier-allocations-desktop">
        <Card data-testid="card-cashier-allocations">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#FFD700]" />
                Assegnazioni Cassieri
              </CardTitle>
              <CardDescription>
                Gestisci le quote biglietti assegnate ai cassieri per questo evento
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} data-testid="button-add-allocation">
              <Plus className="w-4 h-4 mr-2" />
              Nuova Assegnazione
            </Button>
          </CardHeader>
          <CardContent>
            {allocationsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-full max-w-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !allocations || allocations.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold">Nessuna Assegnazione</h3>
                <p className="text-muted-foreground mt-2 mb-6 max-w-md mx-auto">
                  Assegna cassieri a questo evento per abilitarli all'emissione biglietti
                </p>
                <Button onClick={() => handleOpenDialog()} data-testid="button-add-allocation-empty">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assegna Cassiere
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cassiere</TableHead>
                    <TableHead>Settore</TableHead>
                    <TableHead>Quota</TableHead>
                    <TableHead>Utilizzo</TableHead>
                    <TableHead>Rimanenti</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((allocation) => {
                    const percentage = getQuotaPercentage(allocation.quotaUsed, allocation.quotaQuantity);
                    const remaining = allocation.quotaQuantity - allocation.quotaUsed;
                    
                    return (
                      <TableRow key={allocation.id} data-testid={`row-allocation-${allocation.id}`}>
                        <TableCell className="font-medium">
                          {allocation.cashierName || getCashierName(allocation.cashierId)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {allocation.sectorName || (allocation.sectorId ? getSectorName(allocation.sectorId) : "Non assegnato")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Ticket className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{allocation.quotaQuantity}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 w-32">
                            <div className="flex items-center justify-between text-sm">
                              <span>{allocation.quotaUsed} / {allocation.quotaQuantity}</span>
                              <span className="text-muted-foreground">{percentage}%</span>
                            </div>
                            <Progress 
                              value={percentage} 
                              className={`h-2 ${percentage > 90 ? "[&>div]:bg-red-500" : percentage > 75 ? "[&>div]:bg-yellow-500" : ""}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={remaining <= 0 ? "destructive" : remaining <= 5 ? "secondary" : "outline"}
                            className={remaining <= 5 && remaining > 0 ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" : ""}
                          >
                            {remaining}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(allocation)}
                              data-testid={`button-edit-allocation-${allocation.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setAllocationToDelete(allocation);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              data-testid={`button-delete-allocation-${allocation.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {allocationDialog}
        {deleteAlertDialog}
      </div>
    );
  }

  // Mobile version
  return (
    <Card className="glass-card" data-testid="card-cashier-allocations">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 md:p-6">
        <div>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Store className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFD700] flex-shrink-0" />
            Assegnazioni Cassieri
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Gestisci le quote biglietti assegnate ai cassieri
          </CardDescription>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-add-allocation" size="sm" className="sm:size-default">
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Nuova </span>Assegnazione
        </Button>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6">
        {allocationsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : !allocations || allocations.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Nessuna Assegnazione</h3>
            <p className="text-muted-foreground mt-2 mb-4">
              Assegna cassieri a questo evento per emettere biglietti
            </p>
            <Button onClick={() => handleOpenDialog()} data-testid="button-add-allocation-empty">
              <UserPlus className="w-4 h-4 mr-2" />
              Assegna Cassiere
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cassiere</TableHead>
                  <TableHead className="hidden sm:table-cell">Settore</TableHead>
                  <TableHead className="hidden md:table-cell">Quota</TableHead>
                  <TableHead>Utilizzo</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((allocation) => {
                  const percentage = getQuotaPercentage(allocation.quotaUsed, allocation.quotaQuantity);
                  const remaining = allocation.quotaQuantity - allocation.quotaUsed;
                  
                  return (
                    <TableRow key={allocation.id} data-testid={`row-allocation-${allocation.id}`}>
                      <TableCell className="font-medium">
                        <div>
                          {allocation.cashierName || getCashierName(allocation.cashierId)}
                          <div className="sm:hidden text-xs text-muted-foreground mt-0.5">
                            {allocation.sectorName || (allocation.sectorId ? getSectorName(allocation.sectorId) : "Non assegnato")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">
                          {allocation.sectorName || (allocation.sectorId ? getSectorName(allocation.sectorId) : "Non assegnato")}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{allocation.quotaQuantity}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[100px]">
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className={remaining <= 5 ? "text-yellow-500" : remaining <= 0 ? "text-red-500" : ""}>
                              {allocation.quotaUsed} / {allocation.quotaQuantity}
                            </span>
                            <span className="text-muted-foreground text-xs hidden sm:inline">
                              ({remaining})
                            </span>
                          </div>
                          <Progress 
                            value={percentage} 
                            className={`h-2 ${percentage > 90 ? "[&>div]:bg-red-500" : percentage > 75 ? "[&>div]:bg-yellow-500" : ""}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(allocation)}
                            data-testid={`button-edit-allocation-${allocation.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setAllocationToDelete(allocation);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            data-testid={`button-delete-allocation-${allocation.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {allocationDialog}
      {deleteAlertDialog}
    </Card>
  );
}

export default EventCashierAllocations;
