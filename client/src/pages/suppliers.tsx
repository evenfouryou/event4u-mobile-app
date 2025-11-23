import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Truck, Edit, Trash2, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema, type Supplier, type InsertSupplier } from "@shared/schema";

export default function Suppliers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const form = useForm<InsertSupplier>({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: '',
      vatNumber: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      active: true,
      companyId: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      await apiRequest('POST', '/api/suppliers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Successo",
        description: "Fornitore creato con successo",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Impossibile creare il fornitore",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Supplier> }) => {
      await apiRequest('PATCH', `/api/suppliers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setDialogOpen(false);
      setEditingSupplier(null);
      form.reset();
      toast({
        title: "Successo",
        description: "Fornitore aggiornato con successo",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il fornitore",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setDeletingSupplier(null);
      toast({
        title: "Successo",
        description: "Fornitore eliminato con successo",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Impossibile eliminare il fornitore",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      form.reset({
        name: supplier.name,
        vatNumber: supplier.vatNumber ?? '',
        email: supplier.email ?? '',
        phone: supplier.phone ?? '',
        address: supplier.address ?? '',
        notes: supplier.notes ?? '',
        active: supplier.active,
        companyId: supplier.companyId,
      });
    } else {
      setEditingSupplier(null);
      form.reset({
        name: '',
        vatNumber: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        active: true,
        companyId: '',
      });
    }
    setDialogOpen(true);
  };

  const onSubmit = (data: InsertSupplier) => {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];
    
    return suppliers.filter(supplier => {
      const matchesSearch = !searchQuery || 
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (supplier.vatNumber && supplier.vatNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    });
  }, [suppliers, searchQuery]);

  const activeSuppliers = filteredSuppliers.filter(s => s.active);
  const inactiveSuppliers = filteredSuppliers.filter(s => !s.active);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Fornitori</h1>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-create-supplier">
          <Plus className="h-4 w-4" />
          Nuovo Fornitore
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome o partita IVA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-suppliers"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {searchQuery ? "Nessun fornitore trovato" : "Nessun fornitore configurato"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeSuppliers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">Fornitori Attivi</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>P.IVA</TableHead>
                        <TableHead>Contatti</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeSuppliers.map((supplier) => (
                        <TableRow key={supplier.id} data-testid={`row-supplier-${supplier.id}`}>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {supplier.vatNumber || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="space-y-0.5">
                              {supplier.email && (
                                <div className="text-muted-foreground">{supplier.email}</div>
                              )}
                              {supplier.phone && (
                                <div className="text-muted-foreground">{supplier.phone}</div>
                              )}
                              {!supplier.email && !supplier.phone && '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" className="text-xs">Attivo</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(supplier)}
                                data-testid={`button-edit-supplier-${supplier.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingSupplier(supplier)}
                                data-testid={`button-delete-supplier-${supplier.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {inactiveSuppliers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">Fornitori Disattivati</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>P.IVA</TableHead>
                        <TableHead>Contatti</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inactiveSuppliers.map((supplier) => (
                        <TableRow key={supplier.id} data-testid={`row-supplier-${supplier.id}`}>
                          <TableCell className="font-medium opacity-60">{supplier.name}</TableCell>
                          <TableCell className="text-muted-foreground opacity-60">
                            {supplier.vatNumber || '-'}
                          </TableCell>
                          <TableCell className="text-sm opacity-60">
                            <div className="space-y-0.5">
                              {supplier.email && (
                                <div className="text-muted-foreground">{supplier.email}</div>
                              )}
                              {supplier.phone && (
                                <div className="text-muted-foreground">{supplier.phone}</div>
                              )}
                              {!supplier.email && !supplier.phone && '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">Disattivo</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(supplier)}
                                data-testid={`button-edit-supplier-${supplier.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingSupplier(supplier)}
                                data-testid={`button-delete-supplier-${supplier.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Modifica Fornitore' : 'Nuovo Fornitore'}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier ? 'Modifica i dati del fornitore' : 'Inserisci i dati del nuovo fornitore'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome fornitore" data-testid="input-supplier-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partita IVA</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="IT12345678901" data-testid="input-supplier-vat" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} type="email" placeholder="info@fornitore.it" data-testid="input-supplier-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="+39 02 1234567" data-testid="input-supplier-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ''} placeholder="Via, Città, CAP" rows={2} data-testid="input-supplier-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ''} placeholder="Note aggiuntive..." rows={3} data-testid="input-supplier-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                        data-testid="checkbox-supplier-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Fornitore attivo</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-supplier"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-supplier"
                >
                  {editingSupplier ? 'Aggiorna' : 'Crea'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSupplier} onOpenChange={() => setDeletingSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il fornitore <strong>{deletingSupplier?.name}</strong>?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-supplier">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSupplier && deleteMutation.mutate(deletingSupplier.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-supplier"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
