import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DollarSign, Plus, Edit, Trash2, Check, X, Package, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { PriceList, PriceListItem, Product, Supplier } from "@shared/schema";

const priceListSchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  supplierId: z.string().min(1, "Fornitore richiesto"),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  active: z.boolean().default(true),
});

type PriceListFormValues = z.infer<typeof priceListSchema>;

const priceListItemSchema = z.object({
  productId: z.string().min(1, "Prodotto richiesto"),
  salePrice: z.coerce.number().positive("Il prezzo deve essere maggiore di zero"),
});

type PriceListItemFormValues = z.infer<typeof priceListItemSchema>;

export default function PriceLists() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [priceListToDelete, setPriceListToDelete] = useState<string | null>(null);
  
  const canCreatePriceLists = user?.role === 'super_admin' || user?.role === 'gestore';

  const { data: priceLists = [], isLoading: priceListsLoading } = useQuery<PriceList[]>({
    queryKey: ['/api/price-lists'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<PriceListItem[]>({
    queryKey: ['/api/price-lists', selectedPriceList?.id, 'items'],
    enabled: !!selectedPriceList,
  });

  const createForm = useForm<PriceListFormValues>({
    resolver: zodResolver(priceListSchema),
    defaultValues: {
      name: "",
      supplierId: "",
      validFrom: "",
      validTo: "",
      active: true,
    },
  });

  const editForm = useForm<PriceListFormValues>({
    resolver: zodResolver(priceListSchema),
    defaultValues: {
      name: "",
      supplierId: "",
      validFrom: "",
      validTo: "",
      active: true,
    },
  });

  const itemForm = useForm<PriceListItemFormValues>({
    resolver: zodResolver(priceListItemSchema),
    defaultValues: {
      productId: "",
      salePrice: 0,
    },
  });

  useEffect(() => {
    if (selectedPriceList && isEditDialogOpen) {
      editForm.reset({
        name: selectedPriceList.name,
        supplierId: selectedPriceList.supplierId,
        validFrom: selectedPriceList.validFrom ? format(new Date(selectedPriceList.validFrom), 'yyyy-MM-dd') : "",
        validTo: selectedPriceList.validTo ? format(new Date(selectedPriceList.validTo), 'yyyy-MM-dd') : "",
        active: selectedPriceList.active,
      });
    }
  }, [selectedPriceList, isEditDialogOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: PriceListFormValues) => {
      return await apiRequest('POST', '/api/price-lists', {
        name: data.name,
        supplierId: data.supplierId,
        validFrom: data.validFrom || null,
        validTo: data.validTo || null,
        active: data.active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/price-lists'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Listino creato",
        description: "Il listino prezzi è stato creato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile creare il listino",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PriceListFormValues }) => {
      return await apiRequest('PATCH', `/api/price-lists/${id}`, {
        name: data.name,
        validFrom: data.validFrom || null,
        validTo: data.validTo || null,
        active: data.active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/price-lists'] });
      setIsEditDialogOpen(false);
      setSelectedPriceList(null);
      toast({
        title: "Listino aggiornato",
        description: "Il listino prezzi è stato aggiornato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il listino",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/price-lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/price-lists'] });
      setDeleteDialogOpen(false);
      setPriceListToDelete(null);
      if (selectedPriceList?.id === priceListToDelete) {
        setSelectedPriceList(null);
      }
      toast({
        title: "Listino eliminato",
        description: "Il listino prezzi è stato eliminato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il listino",
        variant: "destructive",
      });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: PriceListItemFormValues) => {
      if (!selectedPriceList) throw new Error("No price list selected");
      return await apiRequest('POST', `/api/price-lists/${selectedPriceList.id}/items`, {
        productId: data.productId,
        salePrice: data.salePrice,
      });
    },
    onSuccess: () => {
      if (selectedPriceList) {
        queryClient.invalidateQueries({ queryKey: ['/api/price-lists', selectedPriceList.id, 'items'] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/price-lists'] });
      setIsItemDialogOpen(false);
      itemForm.reset();
      toast({
        title: "Prodotto aggiunto",
        description: "Il prodotto è stato aggiunto al listino",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiungere il prodotto",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest('DELETE', `/api/price-list-items/${itemId}`);
    },
    onSuccess: () => {
      if (selectedPriceList) {
        queryClient.invalidateQueries({ queryKey: ['/api/price-lists', selectedPriceList.id, 'items'] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/price-lists'] });
      toast({
        title: "Prodotto rimosso",
        description: "Il prodotto è stato rimosso dal listino",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile rimuovere il prodotto",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/beverage">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">Listini Prezzi</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1 hidden sm:block">
            {canCreatePriceLists ? 'Gestisci i listini prezzi per i tuoi prodotti' : 'Visualizza i listini prezzi'}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          if (!canCreatePriceLists && open) {
            toast({
              title: "Accesso limitato",
              description: "Solo gli admin possono creare listini prezzi",
              variant: "destructive",
            });
            return;
          }
          setIsCreateDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button 
              data-testid="button-create-price-list"
              disabled={!canCreatePriceLists}
              title={!canCreatePriceLists ? "Solo gli admin possono creare listini prezzi" : ""}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Listino
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea Nuovo Listino</DialogTitle>
              <DialogDescription>
                Inserisci i dettagli del nuovo listino prezzi
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Listino *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Listino Estate 2024" data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornitore *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                          data-testid="select-supplier"
                        >
                          <option value="">Seleziona fornitore</option>
                          {suppliers.filter(s => s.active).map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="validFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valido Da</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-valid-from" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="validTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valido Fino</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-valid-to" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                    {createMutation.isPending ? "Creazione..." : "Crea Listino"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Listini</CardTitle>
            <CardDescription>Seleziona un listino per vedere i prezzi</CardDescription>
          </CardHeader>
          <CardContent>
            {priceListsLoading ? (
              <p className="text-sm text-muted-foreground">Caricamento...</p>
            ) : priceLists.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun listino creato</p>
            ) : (
              <div className="space-y-2">
                {priceLists.map((priceList) => (
                  <div
                    key={priceList.id}
                    className={`p-3 rounded-md border cursor-pointer hover-elevate ${
                      selectedPriceList?.id === priceList.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedPriceList(priceList)}
                    data-testid={`card-price-list-${priceList.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{priceList.name}</p>
                        {priceList.validFrom && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Dal {format(new Date(priceList.validFrom), 'dd/MM/yyyy', { locale: it })}
                            {priceList.validTo && ` al ${format(new Date(priceList.validTo), 'dd/MM/yyyy', { locale: it })}`}
                          </p>
                        )}
                      </div>
                      <Badge variant={priceList.active ? "default" : "secondary"}>
                        {priceList.active ? "Attivo" : "Inattivo"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedPriceList ? selectedPriceList.name : "Seleziona un listino"}
                </CardTitle>
                <CardDescription>
                  {selectedPriceList ? "Gestisci i prezzi dei prodotti" : "Nessun listino selezionato"}
                </CardDescription>
              </div>
              {selectedPriceList && (
                <div className="flex gap-2">
                  <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-item">
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Prodotto
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Aggiungi Prodotto al Listino</DialogTitle>
                        <DialogDescription>
                          Seleziona un prodotto e imposta il prezzo di vendita
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...itemForm}>
                        <form onSubmit={itemForm.handleSubmit((data) => createItemMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={itemForm.control}
                            name="productId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Prodotto *</FormLabel>
                                <FormControl>
                                  <select
                                    {...field}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    data-testid="select-product"
                                  >
                                    <option value="">Seleziona prodotto</option>
                                    {products.filter(p => !items.some(i => i.productId === p.id)).map((product) => (
                                      <option key={product.id} value={product.id}>
                                        {product.name} ({product.code})
                                      </option>
                                    ))}
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={itemForm.control}
                            name="salePrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Prezzo di Vendita *</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" step="0.01" placeholder="10.00" data-testid="input-sale-price" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end gap-3 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsItemDialogOpen(false)}
                            >
                              Annulla
                            </Button>
                            <Button type="submit" disabled={createItemMutation.isPending} data-testid="button-submit-item">
                              {createItemMutation.isPending ? "Aggiunta..." : "Aggiungi"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(true)}
                    data-testid="button-edit-price-list"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifica
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setPriceListToDelete(selectedPriceList.id);
                      setDeleteDialogOpen(true);
                    }}
                    data-testid="button-delete-price-list"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedPriceList ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Seleziona un listino dalla lista per visualizzare i prezzi
                </p>
              </div>
            ) : itemsLoading ? (
              <p className="text-sm text-muted-foreground">Caricamento...</p>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nessun prodotto in questo listino
                </p>
                <Button onClick={() => setIsItemDialogOpen(true)} data-testid="button-add-first-item">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Primo Prodotto
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice</TableHead>
                    <TableHead>Prodotto</TableHead>
                    <TableHead>Prezzo Costo</TableHead>
                    <TableHead>Prezzo Vendita</TableHead>
                    <TableHead>Margine</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const product = products.find(p => p.id === item.productId);
                    if (!product) return null;
                    
                    const costPrice = parseFloat(product.costPrice);
                    const salePrice = parseFloat(item.salePrice);
                    const margin = salePrice - costPrice;
                    const marginPercent = (margin / costPrice) * 100;

                    return (
                      <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                        <TableCell className="font-mono text-sm">{product.code}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>€ {costPrice.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">€ {salePrice.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                            € {margin.toFixed(2)} ({marginPercent.toFixed(1)}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            disabled={deleteItemMutation.isPending}
                            data-testid={`button-delete-item-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Listino</DialogTitle>
            <DialogDescription>
              Modifica i dettagli del listino prezzi
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => {
              if (selectedPriceList) {
                updateMutation.mutate({ id: selectedPriceList.id, data });
              }
            })} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Listino *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Listino Estate 2024" data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valido Da</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-edit-valid-from" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="validTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valido Fino</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-edit-valid-to" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  {updateMutation.isPending ? "Salvataggio..." : "Salva Modifiche"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo listino? Questa azione è irreversibile e eliminerà anche tutti i prezzi associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (priceListToDelete) {
                  deleteMutation.mutate(priceListToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
